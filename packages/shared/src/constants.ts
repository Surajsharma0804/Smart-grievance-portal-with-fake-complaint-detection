/**
 * Default configuration values derived from .env.example.
 * Used as fallback defaults in the Zod-validated env loader.
 */

export const Defaults = {
  NODE_ENV: 'development',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  API_BASE_URL: 'http://localhost:4000',
  CLIENT_ORIGIN: 'http://localhost:3000',

  MONGO_URI: 'mongodb://localhost:27017/nagrik-setu?replicaSet=rs0',
  REDIS_URL: 'redis://localhost:6379',

  STORAGE_DRIVER: 'local' as const,
  STORAGE_PATH: './uploads',

  AI_PROVIDER: 'mock' as const,
  EMBEDDING_PROVIDER: 'mock' as const,

  RUN_WORKER: true,

  /** Duplicate detection */
  DUP_RADIUS_M: 150,
  DUP_WINDOW_DAYS: 30,
  DUP_HIGH: 0.82,
  DUP_GREY: 0.65,

  /** Trust scoring */
  TRUST_PASS: 70,
  TRUST_REVIEW: 40,

  /** Resolution */
  RESOLVE_RADIUS_M: 200,
} as const;
