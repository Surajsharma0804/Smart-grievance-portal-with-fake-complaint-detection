import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { Ward } from '@nagrik-setu/domain';

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

// Seed one ward covering central Chandigarh for geo tests
async function seedWard() {
  await Ward.create({
    code: 'TEST-01',
    name: 'Test Ward',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [76.775, 30.740],
        [76.795, 30.740],
        [76.795, 30.755],
        [76.775, 30.755],
        [76.775, 30.740],
      ]],
    },
  });
  await Ward.ensureIndexes();
}

async function registerAndGetCookies(
  appInst: ReturnType<typeof createApp>,
  email = 'citizen@example.com',
): Promise<string[]> {
  const res = await request(appInst)
    .post('/auth/register')
    .send({ name: 'Citizen', email, password: 'password123' });
  return res.headers['set-cookie'] as string[];
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
  const collections = await mongoose.connection.db!.collections();
  for (const col of collections) {
    await col.deleteMany({});
  }
  await seedWard();
});

const VALID_COMPLAINT = {
  title: 'Broken streetlight on main road',
  description: 'The streetlight near sector 17 market has been out for a week.',
  location: {
    type: 'Point',
    coordinates: [76.785, 30.745], // inside TEST-01 ward
  },
  mediaKeys: ['photo-abc-123.jpg'],
  idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
};

describe('POST /complaints', () => {
  it('creates a complaint and returns an owner DTO', async () => {
    const cookies = await registerAndGetCookies(app);
    const res = await request(app)
      .post('/complaints')
      .set('Cookie', cookies)
      .send(VALID_COMPLAINT);

    expect(res.status).toBe(201);
    expect(res.body.complaint.publicId).toMatch(/^NS-[A-F0-9]{8}$/);
    expect(res.body.complaint.title).toBe(VALID_COMPLAINT.title);
    expect(res.body.complaint.status).toBe('SUBMITTED');
    expect(res.body.complaint.wardId).toBeDefined();
  });

  it('returns the same complaint for a repeated idempotency key', async () => {
    const cookies = await registerAndGetCookies(app);
    const res1 = await request(app).post('/complaints').set('Cookie', cookies).send(VALID_COMPLAINT);
    const res2 = await request(app).post('/complaints').set('Cookie', cookies).send(VALID_COMPLAINT);

    expect(res1.body.complaint.publicId).toBe(res2.body.complaint.publicId);
  });

  it('rejects without auth', async () => {
    const res = await request(app).post('/complaints').send(VALID_COMPLAINT);
    expect(res.status).toBe(401);
  });

  it('rejects invalid input (title too short)', async () => {
    const cookies = await registerAndGetCookies(app);
    const res = await request(app)
      .post('/complaints')
      .set('Cookie', cookies)
      .send({ ...VALID_COMPLAINT, title: 'Hi', idempotencyKey: '550e8400-e29b-41d4-a716-446655440001' });
    expect(res.status).toBe(422);
  });

  it('rejects more than 4 media keys', async () => {
    const cookies = await registerAndGetCookies(app);
    const res = await request(app)
      .post('/complaints')
      .set('Cookie', cookies)
      .send({
        ...VALID_COMPLAINT,
        mediaKeys: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg'],
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440002',
      });
    expect(res.status).toBe(422);
  });

  it('rejects zero media keys', async () => {
    const cookies = await registerAndGetCookies(app);
    const res = await request(app)
      .post('/complaints')
      .set('Cookie', cookies)
      .send({
        ...VALID_COMPLAINT,
        mediaKeys: [],
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440003',
      });
    expect(res.status).toBe(422);
  });
});

describe('GET /complaints/mine', () => {
  it('returns only the authenticated user complaints', async () => {
    const cookies1 = await registerAndGetCookies(app, 'user1@example.com');
    const cookies2 = await registerAndGetCookies(app, 'user2@example.com');

    await request(app).post('/complaints').set('Cookie', cookies1).send(VALID_COMPLAINT);
    await request(app).post('/complaints').set('Cookie', cookies2).send({
      ...VALID_COMPLAINT,
      title: 'Different complaint by user 2',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440099',
    });

    const res = await request(app).get('/complaints/mine').set('Cookie', cookies1);
    expect(res.status).toBe(200);
    expect(res.body.complaints).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
  });
});

describe('GET /complaints/:publicId', () => {
  it('returns the complaint', async () => {
    const cookies = await registerAndGetCookies(app);
    const createRes = await request(app).post('/complaints').set('Cookie', cookies).send(VALID_COMPLAINT);
    const publicId = createRes.body.complaint.publicId;

    const res = await request(app).get(`/complaints/${publicId}`).set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.complaint.publicId).toBe(publicId);
  });

  it('returns 404 for non-existent complaint', async () => {
    const cookies = await registerAndGetCookies(app);
    const res = await request(app).get('/complaints/NS-NOTFOUND').set('Cookie', cookies);
    expect(res.status).toBe(404);
  });

  it('hides reporter details for anonymous complaints viewed by others', async () => {
    const cookies1 = await registerAndGetCookies(app, 'anon@example.com');
    const cookies2 = await registerAndGetCookies(app, 'viewer@example.com');

    const createRes = await request(app)
      .post('/complaints')
      .set('Cookie', cookies1)
      .send({
        ...VALID_COMPLAINT,
        anonymous: true,
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440055',
      });
    const publicId = createRes.body.complaint.publicId;

    const res = await request(app).get(`/complaints/${publicId}`).set('Cookie', cookies2);
    expect(res.status).toBe(200);
    // Public DTO must not contain reporter-identifying fields
    expect(res.body.complaint).not.toHaveProperty('reporterId');
    expect(res.body.complaint).not.toHaveProperty('anonymous');
  });
});

describe('DTO privacy', () => {
  it('public DTO does not contain private fields', async () => {
    const cookies = await registerAndGetCookies(app, 'privacy@example.com');
    const cookies2 = await registerAndGetCookies(app, 'other@example.com');

    const createRes = await request(app).post('/complaints').set('Cookie', cookies).send({
      ...VALID_COMPLAINT,
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440077',
    });
    const publicId = createRes.body.complaint.publicId;

    const res = await request(app).get(`/complaints/${publicId}`).set('Cookie', cookies2);
    const dto = res.body.complaint;

    // None of these internal fields should appear
    expect(dto).not.toHaveProperty('reporterId');
    expect(dto).not.toHaveProperty('idempotencyKey');
    expect(dto).not.toHaveProperty('media[0].sha256');
    expect(dto).not.toHaveProperty('media[0].embedding');
    expect(dto).not.toHaveProperty('media[0].key');
    expect(dto).not.toHaveProperty('analysis');
  });

  it('coordinates are rounded in public DTO', async () => {
    const cookies = await registerAndGetCookies(app, 'coord@example.com');
    const cookies2 = await registerAndGetCookies(app, 'viewer2@example.com');

    await request(app).post('/complaints').set('Cookie', cookies).send({
      ...VALID_COMPLAINT,
      location: { type: 'Point', coordinates: [76.78512345, 30.74523456] },
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440088',
    });

    const mineRes = await request(app).get('/complaints/mine').set('Cookie', cookies);
    const publicId = mineRes.body.complaints[0].publicId;

    const res = await request(app).get(`/complaints/${publicId}`).set('Cookie', cookies2);
    const [lng, lat] = res.body.complaint.location.coordinates;
    // Rounded to 3 decimal places
    expect(lng).toBe(76.785);
    expect(lat).toBe(30.745);
  });
});

describe('Complaint interactions (upvote, feedback, reopen, appeal)', () => {
  it('toggles upvote for other users and prevents upvoting own complaint', async () => {
    const ownerCookies = await registerAndGetCookies(app, 'owner@example.com');
    const voterCookies = await registerAndGetCookies(app, 'voter@example.com');

    const createRes = await request(app).post('/complaints').set('Cookie', ownerCookies).send({
      title: 'Broken street lamp on main road',
      location: { type: 'Point', coordinates: [76.785, 30.745] },
      mediaKeys: ['photo1.jpg'],
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440099',
    });
    const publicId = createRes.body.complaint.publicId;

    // Cannot upvote own complaint
    const selfVote = await request(app).post(`/complaints/${publicId}/upvote`).set('Cookie', ownerCookies);
    expect(selfVote.status).toBe(400);

    // Voter upvotes
    const vote1 = await request(app).post(`/complaints/${publicId}/upvote`).set('Cookie', voterCookies);
    expect(vote1.status).toBe(200);
    expect(vote1.body.upvoted).toBe(true);
    expect(vote1.body.upvotes).toBe(1);

    // Voter toggles upvote off
    const vote2 = await request(app).post(`/complaints/${publicId}/upvote`).set('Cookie', voterCookies);
    expect(vote2.status).toBe(200);
    expect(vote2.body.upvoted).toBe(false);
    expect(vote2.body.upvotes).toBe(0);
  });

  it('allows reporter to submit feedback on resolved complaint', async () => {
    const ownerCookies = await registerAndGetCookies(app, 'feedback_owner@example.com');
    const createRes = await request(app).post('/complaints').set('Cookie', ownerCookies).send({
      title: 'Water pipe leaking on 5th avenue',
      location: { type: 'Point', coordinates: [76.785, 30.745] },
      mediaKeys: ['photo1.jpg'],
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440101',
    });
    const publicId = createRes.body.complaint.publicId;

    // Reject feedback while still submitted
    const earlyFeedback = await request(app)
      .post(`/complaints/${publicId}/feedback`)
      .set('Cookie', ownerCookies)
      .send({ rating: 5, comment: 'Great job' });
    expect(earlyFeedback.status).toBe(400);

    // Simulate resolved complaint in DB
    const { Complaint } = await import('@nagrik-setu/domain');
    const { ComplaintStatus } = await import('@nagrik-setu/shared');
    await Complaint.updateOne(
      { publicId },
      {
        $set: { status: ComplaintStatus.RESOLVED },
        $push: { statusHistory: { from: ComplaintStatus.IN_PROGRESS, to: ComplaintStatus.RESOLVED, at: new Date() } },
      },
    );

    // Reporter submits feedback
    const feedbackRes = await request(app)
      .post(`/complaints/${publicId}/feedback`)
      .set('Cookie', ownerCookies)
      .send({ rating: 5, comment: 'Pothole was patched promptly, thank you!' });
    expect(feedbackRes.status).toBe(200);
    expect(feedbackRes.body.success).toBe(true);

    // Reporter can reopen resolved complaint within 7 days
    const reopenRes = await request(app)
      .post(`/complaints/${publicId}/reopen`)
      .set('Cookie', ownerCookies)
      .send({ reason: 'The patch already came off after rain today' });
    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.complaint.status).toBe(ComplaintStatus.REOPENED);
  });
});
