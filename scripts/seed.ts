import 'dotenv/config';
import mongoose from 'mongoose';
import { seed } from '@nagrik-setu/domain';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nagrik-setu';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const result = await seed();
  console.log('Seed complete:', result);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
