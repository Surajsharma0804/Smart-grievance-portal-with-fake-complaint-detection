import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { Role } from '@nagrik-setu/shared';
import { Department, Category, Ward, User, AuditLog, Complaint } from '@nagrik-setu/domain';
import { parseCookies, requireAuth, requireRole } from '../middleware/auth';
import type { Types } from 'mongoose';

export const adminRouter = Router();

const adminAuth = [parseCookies, requireAuth, requireRole(Role.DEPT_ADMIN)] as const;
const staffReadAuth = [
  parseCookies,
  requireAuth,
  requireRole(Role.OFFICER, Role.REVIEWER, Role.DEPT_ADMIN),
] as const;

async function logAudit(
  req: Request,
  action: string,
  entity: string,
  entityId: Types.ObjectId | string,
  before?: any,
  after?: any,
) {
  try {
    const actorId = req.user!.sub;
    const ip = req.ip;
    const requestId = (req as any).id;
    await AuditLog.create({
      actorId,
      action,
      entity,
      entityId,
      before,
      after,
      ip,
      requestId,
      at: new Date(),
    });
  } catch (err) {
    console.error('Audit log write failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

const departmentSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(100),
  categories: z.array(z.string()).default([]),
  defaultSlaHours: z.number().int().positive().default(48),
});

adminRouter.get('/admin/departments', ...staffReadAuth, async (_req: Request, res: Response) => {
  const departments = await Department.find().sort({ code: 1 });
  res.json({ departments });
});

adminRouter.post('/admin/departments', ...adminAuth, async (req: Request, res: Response) => {
  const data = departmentSchema.parse(req.body);
  const department = await Department.create(data);
  await logAudit(req, 'CREATE', 'Department', department._id, undefined, department.toObject());
  res.status(201).json({ department });
});

adminRouter.put('/admin/departments/:id', ...adminAuth, async (req: Request, res: Response) => {
  const data = departmentSchema.partial().parse(req.body);
  const before = await Department.findById(req.params.id);
  if (!before) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Department not found' } });
    return;
  }
  const department = await Department.findByIdAndUpdate(req.params.id, data, { new: true });
  await logAudit(req, 'UPDATE', 'Department', before._id, before.toObject(), department?.toObject());
  res.json({ department });
});

adminRouter.delete('/admin/departments/:id', ...adminAuth, async (req: Request, res: Response) => {
  const before = await Department.findById(req.params.id);
  if (!before) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Department not found' } });
    return;
  }
  await Department.findByIdAndDelete(req.params.id);
  await logAudit(req, 'DELETE', 'Department', before._id, before.toObject(), undefined);
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

const categoryInputSchema = z.object({
  code: z.string().min(2).max(30),
  label: z.object({
    en: z.string().min(1),
    hi: z.string().min(1),
  }),
  departmentId: z.string(),
  slaHours: z.number().int().positive(),
  keywords: z.array(z.string()).default([]),
});

adminRouter.get('/admin/categories', ...staffReadAuth, async (_req: Request, res: Response) => {
  const categories = await Category.find().populate('departmentId', 'name code').sort({ code: 1 });
  res.json({ categories });
});

adminRouter.post('/admin/categories', ...adminAuth, async (req: Request, res: Response) => {
  const data = categoryInputSchema.parse(req.body);
  const category = await Category.create(data);
  await logAudit(req, 'CREATE', 'Category', category._id, undefined, category.toObject());
  res.status(201).json({ category });
});

adminRouter.put('/admin/categories/:id', ...adminAuth, async (req: Request, res: Response) => {
  const data = categoryInputSchema.partial().parse(req.body);
  const before = await Category.findById(req.params.id);
  if (!before) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Category not found' } });
    return;
  }
  const category = await Category.findByIdAndUpdate(req.params.id, data, { new: true });
  await logAudit(req, 'UPDATE', 'Category', before._id, before.toObject(), category?.toObject());
  res.json({ category });
});

adminRouter.delete('/admin/categories/:id', ...adminAuth, async (req: Request, res: Response) => {
  const before = await Category.findById(req.params.id);
  if (!before) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Category not found' } });
    return;
  }
  await Category.findByIdAndDelete(req.params.id);
  await logAudit(req, 'DELETE', 'Category', before._id, before.toObject(), undefined);
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Wards
// ---------------------------------------------------------------------------

const wardInputSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(100),
  geometry: z.object({
    type: z.enum(['Polygon', 'MultiPolygon']),
    coordinates: z.any(),
  }),
});

adminRouter.get('/admin/wards', ...staffReadAuth, async (_req: Request, res: Response) => {
  const wards = await Ward.find().sort({ code: 1 });
  res.json({ wards });
});

adminRouter.post('/admin/wards', ...adminAuth, async (req: Request, res: Response) => {
  const data = wardInputSchema.parse(req.body);
  const ward = await Ward.create(data);
  await logAudit(req, 'CREATE', 'Ward', ward._id, undefined, ward.toObject());
  res.status(201).json({ ward });
});

adminRouter.put('/admin/wards/:id', ...adminAuth, async (req: Request, res: Response) => {
  const data = wardInputSchema.partial().parse(req.body);
  const before = await Ward.findById(req.params.id);
  if (!before) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ward not found' } });
    return;
  }
  const ward = await Ward.findByIdAndUpdate(req.params.id, data, { new: true });
  await logAudit(req, 'UPDATE', 'Ward', before._id, before.toObject(), ward?.toObject());
  res.json({ ward });
});

adminRouter.delete('/admin/wards/:id', ...adminAuth, async (req: Request, res: Response) => {
  const before = await Ward.findById(req.params.id);
  if (!before) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ward not found' } });
    return;
  }
  await Ward.findByIdAndDelete(req.params.id);
  await logAudit(req, 'DELETE', 'Ward', before._id, before.toObject(), undefined);
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

adminRouter.get('/admin/users', ...staffReadAuth, async (req: Request, res: Response) => {
  const role = req.query.role as string | undefined;
  const filter = role ? { role } : {};
  const users = await User.find(filter)
    .select('-passwordHash')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json({ users });
});

const userUpdateSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  departmentId: z.string().nullable().optional(),
  wardIds: z.array(z.string()).optional(),
  suspendedUntil: z.string().datetime().nullable().optional(),
});

adminRouter.put('/admin/users/:id', ...adminAuth, async (req: Request, res: Response) => {
  const data = userUpdateSchema.parse(req.body);
  const before = await User.findById(req.params.id).select('-passwordHash');
  if (!before) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    return;
  }
  const user = await User.findByIdAndUpdate(req.params.id, data, { new: true }).select('-passwordHash');
  await logAudit(req, 'UPDATE', 'User', before._id, before.toObject(), user?.toObject());
  res.json({ user });
});

// ---------------------------------------------------------------------------
// Analytics & Export
// ---------------------------------------------------------------------------

adminRouter.get('/admin/analytics/summary', ...staffReadAuth, async (_req: Request, res: Response) => {
  const [total, statusAgg, categoryAgg, overdueCount] = await Promise.all([
    Complaint.countDocuments(),
    Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Complaint.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    Complaint.countDocuments({
      status: { $nin: ['RESOLVED', 'CLOSED'] },
      slaDueAt: { $lt: new Date() },
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const s of statusAgg) {
    if (s._id) statusCounts[s._id] = s.count;
  }

  const categoryCounts: Record<string, number> = {};
  for (const c of categoryAgg) {
    if (c._id) categoryCounts[c._id] = c.count;
  }

  res.json({
    summary: {
      totalComplaints: total,
      statusCounts,
      categoryCounts,
      overdueComplaints: overdueCount,
    },
  });
});

adminRouter.get('/admin/export/complaints.csv', ...staffReadAuth, async (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="complaints-export.csv"');

  // Header line
  res.write('Public ID,Title,Category,Status,Priority,Created At,SLA Due At,Anonymous\r\n');

  const cursor = Complaint.find()
    .sort({ createdAt: -1 })
    .select('publicId title category status priority createdAt slaDueAt anonymous')
    .cursor();

  for await (const doc of cursor) {
    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const row = [
      escapeCsv(doc.publicId),
      escapeCsv(doc.title),
      escapeCsv(doc.category || 'UNASSIGNED'),
      escapeCsv(doc.status),
      escapeCsv(doc.priority || 0),
      escapeCsv(doc.createdAt ? new Date(doc.createdAt).toISOString() : ''),
      escapeCsv(doc.slaDueAt ? new Date(doc.slaDueAt).toISOString() : ''),
      escapeCsv(doc.anonymous ? 'Yes' : 'No'),
    ].join(',');

    res.write(row + '\r\n');
  }

  res.end();
});
