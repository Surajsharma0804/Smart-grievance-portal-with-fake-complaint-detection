import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Types } from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { User, Complaint } from '@nagrik-setu/domain';
import { Role, ComplaintStatus } from '@nagrik-setu/shared';

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

async function loginAsOfficer(email = 'officer@test.com'): Promise<{ cookies: string[]; user: any }> {
  const user = await User.create({
    name: 'Officer One',
    email,
    passwordHash: '$argon2id$fake',
    role: Role.OFFICER,
  });

  const accessToken = jwt.sign(
    { sub: user._id.toString(), role: user.role, jti: randomUUID() },
    TEST_ENV.JWT_ACCESS_SECRET,
    { expiresIn: 900 },
  );

  const cookies = [`accessToken=${accessToken}; Path=/; HttpOnly; SameSite=Lax`];
  return { cookies, user };
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

describe('Officer endpoints', () => {
  it('GET /officer/queue returns complaints assigned to officer', async () => {
    const { cookies, user } = await loginAsOfficer();

    await Complaint.create({
      publicId: 'NS-11111111',
      reporterId: new Types.ObjectId(),
      title: 'Pothole on 17A',
      location: { type: 'Point', coordinates: [76.7794, 30.7333] },
      status: ComplaintStatus.ASSIGNED,
      assigneeId: user._id,
      priority: 2,
      idempotencyKey: 'k1',
    });

    const res = await request(app)
      .get('/officer/queue')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.complaints).toHaveLength(1);
    expect(res.body.complaints[0].publicId).toBe('NS-11111111');
  });

  it('POST /complaints/:id/status updates status when assigned', async () => {
    const { cookies, user } = await loginAsOfficer();

    const complaint = await Complaint.create({
      publicId: 'NS-22222222',
      reporterId: new Types.ObjectId(),
      title: 'Street light broken',
      location: { type: 'Point', coordinates: [76.7794, 30.7333] },
      status: ComplaintStatus.ASSIGNED,
      assigneeId: user._id,
      idempotencyKey: 'k2',
    });

    const res = await request(app)
      .post(`/complaints/${complaint._id}/status`)
      .set('Cookie', cookies)
      .send({ status: ComplaintStatus.IN_PROGRESS, note: 'Under inspection' });

    expect(res.status).toBe(200);
    expect(res.body.complaint.status).toBe(ComplaintStatus.IN_PROGRESS);
  });

  it('POST /complaints/:id/resolve checks geographic proximity of resolution photo', async () => {
    const { cookies, user } = await loginAsOfficer();

    const complaint = await Complaint.create({
      publicId: 'NS-33333333',
      reporterId: new Types.ObjectId(),
      title: 'Garbage dump',
      location: { type: 'Point', coordinates: [76.7794, 30.7333] },
      status: ComplaintStatus.IN_PROGRESS,
      assigneeId: user._id,
      idempotencyKey: 'k3',
    });

    // Too far (Delhi coords)
    const farRes = await request(app)
      .post(`/complaints/${complaint._id}/resolve`)
      .set('Cookie', cookies)
      .send({
        mediaKey: 'res-photo.jpg',
        location: { lat: 28.6139, lng: 77.2090 },
        note: 'Cleaned',
      });

    expect(farRes.status).toBe(422);
    expect(farRes.body.error.code).toBe('RESOLUTION_GEO_MISMATCH');

    // Nearby (50m)
    const nearRes = await request(app)
      .post(`/complaints/${complaint._id}/resolve`)
      .set('Cookie', cookies)
      .send({
        mediaKey: 'res-photo.jpg',
        location: { lat: 30.7335, lng: 76.7796 },
        note: 'Cleaned',
      });

    expect(nearRes.status).toBe(200);
    expect(nearRes.body.complaint.status).toBe(ComplaintStatus.RESOLVED);
  });
});
