import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    testTimeout: 30000,
    hookTimeout: 120000, // MongoMemoryServer downloads the binary on first run
  },
});
