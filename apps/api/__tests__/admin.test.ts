import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { User, AuditLog, Department } from '@nagrik-setu/domain';
import { Role } from '@nagrik-setu/shared';

let mongod: MongoMemoryServer;
let app: ReturnType<typeof createApp>;

const TEST_ENV = {
  NODE_ENV: 'test',
  MONGO_URI: '',
  JWT_ACCESS_SECRET: 'test-access-secret-12345678',
  JWT_REFRESH_SECRET: 'test-refresh-secret-12345678',
  SESSION_VERIFY_SECRET: 'test-session-secret-12345678',
  SSE_TICKET_SECRET: 'test-sse-ticket-secret-12345678',
};

async function loginAsRole(userRole: Role, email: string): Promise<string[]> {
  const user = await User.create({
    name: 'Test ' + userRole,
    email,
    passwordHash: '$argon2id$fake',
    role: userRole,
  });

  const accessToken = jwt.sign(
    { sub: user._id.toString(), role: user.role, jti: randomUUID() },
    TEST_ENV.JWT_ACCESS_SECRET,
    { expiresIn: 900 },
  );

  return [`accessToken=${accessToken}; Path=/; HttpOnly; SameSite=Lax`];
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  TEST_ENV.MONGO_URI = mongod.getUri();
  loadConfig(TEST_ENV);
  await mongoose.connect(TEST_ENV.MONGO_URI);
  app = createApp({ clientOrigin: 'http://localhost:3000', logLevel: 'silent' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});

describe('Admin CRUD API', () => {
  it('denies CITIZEN role with 403', async () => {
    const cookies = await loginAsRole(Role.CITIZEN, 'citizen@test.com');
    const res = await request(app)
      .get('/admin/departments')
      .set('Cookie', cookies);

    expect(res.status).toBe(403);
  });

  it('allows DEPT_ADMIN to create and list departments with audit logging', async () => {
    const cookies = await loginAsRole(Role.DEPT_ADMIN, 'admin@test.com');

    // Create
    const createRes = await request(app)
      .post('/admin/departments')
      .set('Cookie', cookies)
      .send({
        code: 'SANITATION',
        name: 'Public Health & Sanitation',
        categories: ['GARBAGE', 'SEWAGE'],
        defaultSlaHours: 24,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.department.code).toBe('SANITATION');

    // List
    const listRes = await request(app)
      .get('/admin/departments')
      .set('Cookie', cookies);

    expect(listRes.status).toBe(200);
    expect(listRes.body.departments).toHaveLength(1);

    // Verify audit log
    const auditLogs = await AuditLog.find({ entity: 'Department' });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]!.action).toBe('CREATE');
  });

  it('allows DEPT_ADMIN to update and delete a department with audit logs', async () => {
    const cookies = await loginAsRole(Role.DEPT_ADMIN, 'admin2@test.com');

    const dept = await Department.create({
      code: 'ROADS',
      name: 'Roads & Infrastructure',
      defaultSlaHours: 48,
    });

    // Update
    const updateRes = await request(app)
      .put(`/admin/departments/${dept._id}`)
      .set('Cookie', cookies)
      .send({ defaultSlaHours: 72 });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.department.defaultSlaHours).toBe(72);

    // Delete
    const deleteRes = await request(app)
      .delete(`/admin/departments/${dept._id}`)
      .set('Cookie', cookies);

    expect(deleteRes.status).toBe(200);

    const check = await Department.findById(dept._id);
    expect(check).toBeNull();

    // Verify audit logs for both UPDATE and DELETE
    const auditLogs = await AuditLog.find({ entity: 'Department' }).sort({ at: 1 });
    expect(auditLogs).toHaveLength(2);
    expect(auditLogs[0]!.action).toBe('UPDATE');
    expect(auditLogs[1]!.action).toBe('DELETE');
  });

  it('provides analytics summary and CSV export to admins', async () => {
    const cookies = await loginAsRole(Role.DEPT_ADMIN, 'analytics_admin@test.com');
    const { Complaint, Ward } = await import('@nagrik-setu/domain');

    const ward = await Ward.create({
      code: 'WARD-99',
      name: 'North Ward',
      geometry: { type: 'Polygon', coordinates: [[[76.7, 30.7], [76.8, 30.7], [76.8, 30.8], [76.7, 30.8], [76.7, 30.7]]] },
    });

    await Complaint.create({
      publicId: 'NS-ANALYTICS-1',
      reporterId: new mongoose.Types.ObjectId(),
      title: 'Major water leakage in north block',
      location: { type: 'Point', coordinates: [76.75, 30.75] },
      category: 'WATER',
      status: 'SUBMITTED',
      wardId: ward._id,
      media: [{ kind: 'complaint', key: 'leak.jpg', source: 'CAMERA' }],
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440201',
    });

    // Analytics summary
    const summaryRes = await request(app)
      .get('/admin/analytics/summary')
      .set('Cookie', cookies);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.summary.totalComplaints).toBeGreaterThanOrEqual(1);
    expect(summaryRes.body.summary.categoryCounts).toHaveProperty('WATER');

    // CSV export
    const csvRes = await request(app)
      .get('/admin/export/complaints.csv')
      .set('Cookie', cookies);

    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain('NS-ANALYTICS-1');
    expect(csvRes.text).toContain('WATER');
  });
});
