import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/nagrik-setu'),
  API_BASE_URL: z.string().min(1).default('http://localhost:4000'),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nagrik-setu',
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:4000',
});
