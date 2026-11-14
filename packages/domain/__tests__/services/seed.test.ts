import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { seed, findWardForPoint, Department, Category, Ward } from '../../src/index.js';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
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

describe('seed', () => {
  it('creates departments, categories, and wards', async () => {
    const result = await seed();
    expect(result.departments).toBe(8);
    expect(result.categories).toBe(11);
    expect(result.wards).toBe(3);

    expect(await Department.countDocuments()).toBe(8);
    expect(await Category.countDocuments()).toBe(11);
    expect(await Ward.countDocuments()).toBe(3);
  });

  it('is idempotent (running twice produces the same counts)', async () => {
    await seed();
    await seed();
    expect(await Department.countDocuments()).toBe(8);
  });

  it('categories reference valid departments', async () => {
    await seed();
    const cats = await Category.find().populate('departmentId');
    for (const cat of cats) {
      expect(cat.departmentId).toBeDefined();
    }
  });

  it('categories have bilingual labels', async () => {
    await seed();
    const cat = await Category.findOne({ code: 'SANITATION' });
    expect(cat!.label.en).toBe('Sanitation');
    expect(cat!.label.hi).toBe('स्वच्छता');
  });
});

describe('findWardForPoint', () => {
  beforeEach(async () => {
    await seed();
  });

  it('returns the correct ward for a point inside CHD-01', async () => {
    const ward = await findWardForPoint(76.785, 30.747);
    expect(ward).not.toBeNull();
    expect(ward!.code).toBe('CHD-01');
  });

  it('returns the correct ward for a point inside CHD-02', async () => {
    const ward = await findWardForPoint(76.770, 30.725);
    expect(ward).not.toBeNull();
    expect(ward!.code).toBe('CHD-02');
  });

  it('returns null for a point outside all wards', async () => {
    const ward = await findWardForPoint(77.21, 28.63);
    expect(ward).toBeNull();
  });

  it('uses GeoJSON [lng, lat] order (catches swapped coordinates)', async () => {
    // Swapped coords: latitude in longitude position should land nowhere near Chandigarh
    const ward = await findWardForPoint(30.747, 76.785);
    expect(ward).toBeNull();
  });
});
