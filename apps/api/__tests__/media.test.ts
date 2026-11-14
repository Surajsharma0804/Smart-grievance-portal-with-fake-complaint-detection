import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { User } from '@nagrik-setu/domain';
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

async function getAuthCookies(email = `uploader-${randomUUID()}@test.com`): Promise<string[]> {
  const user = await User.create({
    name: 'Citizen Uploader',
    email,
    passwordHash: '$argon2id$fake',
    role: Role.CITIZEN,
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

describe('Media intake endpoints', () => {
  it('POST /uploads/presign generates presigned URLs for authenticated citizens', async () => {
    const cookies = await getAuthCookies();

    const res = await request(app)
      .post('/uploads/presign')
      .set('Cookie', cookies)
      .send({
        files: [
          { contentType: 'image/jpeg', fileSize: 1024 * 500 },
          { contentType: 'image/png', fileSize: 1024 * 800 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.uploads).toHaveLength(2);
    expect(res.body.uploads[0].key).toBeDefined();
    expect(res.body.uploads[0].url).toContain('/storage/upload');
  });

  it('rejects unauthenticated presign requests', async () => {
    const res = await request(app)
      .post('/uploads/presign')
      .send({
        files: [{ contentType: 'image/jpeg', fileSize: 1024 }],
      });

    expect(res.status).toBe(401);
  });

  it('rejects invalid file types or excessive counts', async () => {
    const cookies = await getAuthCookies();

    const res = await request(app)
      .post('/uploads/presign')
      .set('Cookie', cookies)
      .send({
        files: [
          { contentType: 'application/x-sh', fileSize: 1024 },
        ],
      });

    expect(res.status).toBe(400);
  });
});
