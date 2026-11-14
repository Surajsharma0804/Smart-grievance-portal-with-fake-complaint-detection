import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

let mongod: MongoMemoryServer;
let app: ReturnType<typeof createApp>;

const TEST_ENV = {
  NODE_ENV: 'test',
  MONGO_URI: '', // set in beforeAll
  JWT_ACCESS_SECRET: 'test-access-secret-12345678',
  JWT_REFRESH_SECRET: 'test-refresh-secret-12345678',
  SESSION_VERIFY_SECRET: 'test-session-secret-12345678',
  SSE_TICKET_SECRET: 'test-sse-ticket-secret-12345678',
};

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
  const collections = await mongoose.connection.db!.collections();
  for (const col of collections) {
    await col.deleteMany({});
  }
});

const VALID_USER = { name: 'Test User', email: 'test@example.com', password: 'password123' };

describe('POST /auth/register', () => {
  it('registers a new user and sets cookies', async () => {
    const res = await request(app).post('/auth/register').send(VALID_USER);
    expect(res.status).toBe(201);
    expect(res.body.user.name).toBe('Test User');
    expect(res.body.user.role).toBe('CITIZEN');
    expect(res.body.user.email).toBe('test@example.com');

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
    expect(cookieStr).toContain('accessToken=');
    expect(cookieStr).toContain('HttpOnly');
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/auth/register').send(VALID_USER);
    const res = await request(app).post('/auth/register').send(VALID_USER);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects invalid input', async () => {
    const res = await request(app).post('/auth/register').send({ name: 'A', email: 'bad' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION');
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/auth/register').send(VALID_USER);
  });

  it('returns tokens for correct credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('test@example.com');
    const cookieStr = (res.headers['set-cookie'] as string[]).join('; ');
    expect(cookieStr).toContain('accessToken=');
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });
});

describe('GET /auth/me', () => {
  it('returns user info with valid cookie', async () => {
    const regRes = await request(app).post('/auth/register').send(VALID_USER);
    const cookies = regRes.headers['set-cookie'];

    const res = await request(app).get('/auth/me').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('test@example.com');
  });

  it('returns 401 without cookie', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('clears cookies', async () => {
    const regRes = await request(app).post('/auth/register').send(VALID_USER);
    const cookies = regRes.headers['set-cookie'];

    const res = await request(app).post('/auth/logout').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('POST /auth/refresh', () => {
  it('issues new tokens', async () => {
    const regRes = await request(app).post('/auth/register').send(VALID_USER);
    const cookies = regRes.headers['set-cookie'];

    const res = await request(app).post('/auth/refresh').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('test@example.com');
  });

  it('rejects without refresh cookie', async () => {
    const res = await request(app).post('/auth/refresh');
    expect(res.status).toBe(401);
  });
});
