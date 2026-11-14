import mongoose from 'mongoose';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

async function main() {
  const config = loadConfig();

  await mongoose.connect(config.MONGO_URI);
  console.log('Connected to MongoDB');

  const app = createApp({ clientOrigin: config.CLIENT_ORIGIN });
  const port = config.PORT ?? 4000;

  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
