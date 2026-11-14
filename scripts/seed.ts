import 'dotenv/config';
import mongoose from 'mongoose';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { seed, User, Department, Ward, Complaint } from '@nagrik-setu/domain';
import { Role, ComplaintStatus } from '@nagrik-setu/shared';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nagrik-setu';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB at', MONGO_URI);

  // 1. Seed Departments, Categories, and Wards
  const masterData = await seed();
  console.log('Master data seeded:', masterData);

  // 2. Seed Demo Accounts for each Role
  const passwordHash = await argon2.hash('password123', { type: argon2.argon2id });
  const roadsDept = await Department.findOne({ code: 'ROADS' });
  const sanitationDept = await Department.findOne({ code: 'SANITATION' });
  const centralWard = await Ward.findOne({ code: 'CHD-01' });

  const demoUsers = [
    {
      name: 'Aarav Sharma (Citizen)',
      email: 'citizen@test.com',
      passwordHash,
      role: Role.CITIZEN,
      refreshTokenFamily: randomUUID(),
    },
    {
      name: 'Inspector Rajesh Verma (Officer)',
      email: 'officer@test.com',
      passwordHash,
      role: Role.OFFICER,
      departmentId: roadsDept?._id,
      wardIds: centralWard ? [centralWard._id] : [],
      refreshTokenFamily: randomUUID(),
    },
    {
      name: 'Sunita Patel (Dept Admin)',
      email: 'admin@test.com',
      passwordHash,
      role: Role.DEPT_ADMIN,
      departmentId: sanitationDept?._id,
      refreshTokenFamily: randomUUID(),
    },
    {
      name: 'Vikram Mehta (Reviewer)',
      email: 'reviewer@test.com',
      passwordHash,
      role: Role.REVIEWER,
      refreshTokenFamily: randomUUID(),
    },
  ];

  const userDocs = new Map<string, mongoose.Types.ObjectId>();

  for (const u of demoUsers) {
    const existing = await User.findOne({ email: u.email });
    if (!existing) {
      const created = await User.create(u);
      userDocs.set(u.role, created._id);
      console.log(`Created demo user: ${u.email} (${u.role})`);
    } else {
      userDocs.set(u.role, existing._id);
      console.log(`Demo user exists: ${u.email} (${u.role})`);
    }
  }

  // 3. Seed Sample Grievances across statuses
  const citizenId = userDocs.get(Role.CITIZEN);
  const officerId = userDocs.get(Role.OFFICER);

  if (citizenId && centralWard) {
    const sampleComplaints = [
      {
        publicId: 'NS-DEMO-001',
        reporterId: citizenId,
        title: 'Deep pothole causing accidents near Sector 17 Plaza',
        description: 'Large pothole on the main market access road. Water accumulation makes it invisible at night.',
        location: { type: 'Point' as const, coordinates: [76.7845, 30.7421] as [number, number] },
        category: 'ROADS',
        status: ComplaintStatus.IN_PROGRESS,
        wardId: centralWard._id,
        departmentId: roadsDept?._id,
        assigneeId: officerId,
        priority: 4,
        upvotes: 12,
        slaDueAt: new Date(Date.now() + 48 * 3600 * 1000),
        media: [{ kind: 'complaint', key: 'demo-pothole-1.jpg', source: 'CAMERA' }],
        idempotencyKey: 'demo-key-001',
        statusHistory: [
          { from: ComplaintStatus.SUBMITTED, to: ComplaintStatus.SUBMITTED, by: citizenId, at: new Date(Date.now() - 3600 * 1000 * 24), note: 'Submitted by citizen' },
          { from: ComplaintStatus.SUBMITTED, to: ComplaintStatus.ROUTED, by: citizenId, at: new Date(Date.now() - 3600 * 1000 * 20), note: 'Auto-routed to Roads Dept' },
          { from: ComplaintStatus.ROUTED, to: ComplaintStatus.IN_PROGRESS, by: officerId!, at: new Date(Date.now() - 3600 * 1000 * 8), note: 'Inspection team dispatched' },
        ],
      },
      {
        publicId: 'NS-DEMO-002',
        reporterId: citizenId,
        title: 'Garbage accumulation near Sector 19 community center',
        description: 'Municipal bins overflowing for past 3 days. Foul smell and stray animals gathering.',
        location: { type: 'Point' as const, coordinates: [76.7891, 30.7468] as [number, number] },
        category: 'SANITATION',
        status: ComplaintStatus.RESOLVED,
        wardId: centralWard._id,
        departmentId: sanitationDept?._id,
        priority: 3,
        upvotes: 7,
        media: [{ kind: 'complaint', key: 'demo-garbage-1.jpg', source: 'CAMERA' }],
        idempotencyKey: 'demo-key-002',
        statusHistory: [
          { from: ComplaintStatus.SUBMITTED, to: ComplaintStatus.SUBMITTED, by: citizenId, at: new Date(Date.now() - 3600 * 1000 * 48), note: 'Submitted' },
          { from: ComplaintStatus.SUBMITTED, to: ComplaintStatus.RESOLVED, by: officerId!, at: new Date(Date.now() - 3600 * 1000 * 12), note: 'Area thoroughly cleared and disinfected by morning sanitation shift.' },
        ],
      },
      {
        publicId: 'NS-DEMO-003',
        reporterId: citizenId,
        title: 'Broken streetlight on inner lane 4',
        description: 'Street light pole #14 has been dark for a week. Safety concern for pedestrians.',
        location: { type: 'Point' as const, coordinates: [76.7792, 30.7445] as [number, number] },
        category: 'STREET_LIGHTING',
        status: ComplaintStatus.SUBMITTED,
        wardId: centralWard._id,
        priority: 2,
        upvotes: 3,
        media: [{ kind: 'complaint', key: 'demo-lamp-1.jpg', source: 'GALLERY' }],
        idempotencyKey: 'demo-key-003',
        statusHistory: [
          { from: ComplaintStatus.SUBMITTED, to: ComplaintStatus.SUBMITTED, by: citizenId, at: new Date(), note: 'Awaiting departmental review' },
        ],
      },
      {
        publicId: 'NS-DEMO-004',
        reporterId: citizenId,
        title: 'Duplicate report of Sector 17 plaza pothole',
        description: 'Pothole in sector 17 plaza needs quick repair.',
        location: { type: 'Point' as const, coordinates: [76.7847, 30.7422] as [number, number] },
        category: 'ROADS',
        status: ComplaintStatus.LINKED_DUPLICATE,
        wardId: centralWard._id,
        priority: 1,
        upvotes: 1,
        media: [{ kind: 'complaint', key: 'demo-pothole-dup.jpg', source: 'GALLERY' }],
        idempotencyKey: 'demo-key-004',
        statusHistory: [
          { from: ComplaintStatus.SUBMITTED, to: ComplaintStatus.LINKED_DUPLICATE, by: citizenId, at: new Date(), note: 'AI duplicate detection linked to NS-DEMO-001 (Confidence: 96%)' },
        ],
      },
      {
        publicId: 'NS-DEMO-005',
        reporterId: citizenId,
        title: 'Suspicious water contamination report with mismatched EXIF',
        description: 'Water color looks abnormal near fountain park.',
        location: { type: 'Point' as const, coordinates: [76.7812, 30.7495] as [number, number] },
        category: 'WATER',
        status: ComplaintStatus.NEEDS_REVIEW,
        wardId: centralWard._id,
        priority: 3,
        upvotes: 0,
        media: [{ kind: 'complaint', key: 'demo-water-tampered.jpg', source: 'GALLERY' }],
        idempotencyKey: 'demo-key-005',
        statusHistory: [
          { from: ComplaintStatus.SUBMITTED, to: ComplaintStatus.NEEDS_REVIEW, by: citizenId, at: new Date(), note: 'Flagged for reviewer check: photo taken 350km away from claimed ward location' },
        ],
      },
    ];

    for (const c of sampleComplaints) {
      await Complaint.updateOne(
        { publicId: c.publicId },
        { $set: c },
        { upsert: true },
      );
      console.log(`Seeded complaint: ${c.publicId} [${c.status}]`);
    }
  }

  console.log('\n=== Seed Successful! ===');
  console.log('Demo Credentials:');
  console.log('  Citizen:      citizen@test.com  / password123');
  console.log('  Officer:      officer@test.com  / password123');
  console.log('  Dept Admin:   admin@test.com    / password123');
  console.log('  Reviewer:     reviewer@test.com / password123');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
