import { Router, type Request, type Response } from 'express';
import { Contractor, Project, Bid, Complaint } from '@nagrik-setu/domain';
import { requireAuth, requireRole } from '../middleware/auth';

export const contractorRouter = Router();

// Public Endpoints

/**
 * GET /public/contractors — list verified contractors
 */
contractorRouter.get('/public/contractors', async (_req: Request, res: Response) => {
  try {
    const contractors = await Contractor.find({ verified: true })
      .sort({ rating: -1, completedProjects: -1 })
      .populate('userId', 'name email');
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    res.json({ contractors });
  } catch {
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Failed to fetch contractors' } });
  }
});

/**
 * GET /public/projects — list open projects for bidding
 */
contractorRouter.get('/public/projects', async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || 'OPEN,BIDDING';
    const statuses = status.split(',');
    const projects = await Project.find({ status: { $in: statuses } })
      .sort({ createdAt: -1 })
      .populate('complaintId', 'publicId title category address')
      .limit(50);

    // cost estimation - compute from category averages
    const projectsWithEstimates = projects.map((p) => {
      const pObj = p.toObject();
      if (!pObj.estimatedCost) {
        pObj.estimatedCost = estimateCost(pObj.category);
      }
      return pObj;
    });

    res.json({ projects: projectsWithEstimates });
  } catch {
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Failed to fetch projects' } });
  }
});

/**
 * GET /public/projects/:id — single project with bids count
 */
contractorRouter.get('/public/projects/:id', async (req: Request, res: Response) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('complaintId', 'publicId title category address location')
      .populate('awardedTo', 'companyName rating');
    if (!project) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found' } });
      return;
    }
    const bidCount = await Bid.countDocuments({ projectId: project._id });
    const bids = await Bid.find({ projectId: project._id })
      .sort({ amount: 1 })
      .populate('contractorId', 'companyName rating completedProjects');
    res.json({ project, bidCount, bids });
  } catch {
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Failed to fetch project' } });
  }
});

// Authenticated Contractor Endpoints

/**
 * POST /contractors/register — register as contractor
 */
contractorRouter.post(
  '/contractors/register',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.sub;
      const { companyName, licenseNumber, specializations, experience, bio, phone, address } = req.body;

      const existing = await Contractor.findOne({ userId });
      if (existing) {
        res.status(409).json({ error: { code: 'DUPLICATE', message: 'Already registered as contractor' } });
        return;
      }

      const contractor = await Contractor.create({
        userId,
        companyName,
        licenseNumber,
        specializations: specializations || [],
        experience: experience || 0,
        bio,
        phone,
        address,
      });

      res.status(201).json({ contractor });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      res.status(500).json({ error: { code: 'INTERNAL', message: msg } });
    }
  },
);

/**
 * GET /contractors/me — get own contractor profile
 */
contractorRouter.get(
  '/contractors/me',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const contractor = await Contractor.findOne({ userId: req.user!.sub });
      if (!contractor) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not registered as contractor' } });
        return;
      }
      res.json({ contractor });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL', message: 'Failed to fetch profile' } });
    }
  },
);

/**
 * POST /projects/:id/bid — submit a bid on a project
 */
contractorRouter.post(
  '/projects/:id/bid',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const contractor = await Contractor.findOne({ userId: req.user!.sub });
      if (!contractor) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Must be a registered contractor' } });
        return;
      }
      if (!contractor.verified) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Contractor must be verified to bid' } });
        return;
      }

      const project = await Project.findById(req.params.id);
      if (!project) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found' } });
        return;
      }
      if (project.status !== 'OPEN' && project.status !== 'BIDDING') {
        res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Project is not accepting bids' } });
        return;
      }

      const existing = await Bid.findOne({ projectId: project._id, contractorId: contractor._id });
      if (existing) {
        res.status(409).json({ error: { code: 'DUPLICATE', message: 'Already submitted a bid for this project' } });
        return;
      }

      const { amount, timeline, materials, approach } = req.body;
      const bid = await Bid.create({
        projectId: project._id,
        contractorId: contractor._id,
        amount,
        timeline,
        materials,
        approach,
      });

      if (project.status === 'OPEN') {
        project.status = 'BIDDING';
        await project.save();
      }

      res.status(201).json({ bid });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bid submission failed';
      res.status(500).json({ error: { code: 'INTERNAL', message: msg } });
    }
  },
);

/**
 * GET /contractors/my-bids — list bids by current contractor
 */
contractorRouter.get(
  '/contractors/my-bids',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const contractor = await Contractor.findOne({ userId: req.user!.sub });
      if (!contractor) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not registered as contractor' } });
        return;
      }

      const bids = await Bid.find({ contractorId: contractor._id })
        .sort({ createdAt: -1 })
        .populate('projectId', 'title status category estimatedCost');
      res.json({ bids });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL', message: 'Failed to fetch bids' } });
    }
  },
);

// Admin Endpoints

/**
 * POST /admin/projects — create project from a complaint (staff only)
 */
contractorRouter.post(
  '/admin/projects',
  requireAuth,
  requireRole('DEPT_ADMIN', 'OFFICER'),
  async (req: Request, res: Response) => {
    try {
      const { complaintId, title, description, category, estimatedCost, deadline } = req.body;

      const complaint = await Complaint.findOne({ publicId: complaintId });
      if (!complaint) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Complaint not found' } });
        return;
      }

      const cat = category || complaint.category || complaint.citizenCategory || 'OTHER';
      const project = await Project.create({
        complaintId: complaint._id,
        title: title || complaint.title,
        description: description || complaint.description || 'Municipal repair project',
        category: cat,
        location: complaint.location,
        address: complaint.address,
        estimatedCost: estimatedCost || estimateCost(cat),
        deadline: deadline ? new Date(deadline) : undefined,
      });

      res.status(201).json({ project });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Project creation failed';
      res.status(500).json({ error: { code: 'INTERNAL', message: msg } });
    }
  },
);

/**
 * POST /admin/projects/:id/award — award project to a contractor
 */
contractorRouter.post(
  '/admin/projects/:id/award',
  requireAuth,
  requireRole('DEPT_ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found' } });
        return;
      }

      const { bidId } = req.body;
      const bid = await Bid.findById(bidId);
      if (!bid || bid.projectId.toString() !== project._id.toString()) {
        res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid bid' } });
        return;
      }

      project.status = 'AWARDED';
      project.awardedTo = bid.contractorId;
      project.actualCost = bid.amount;
      project.startDate = new Date();
      await project.save();

      bid.status = 'ACCEPTED';
      await bid.save();

      await Bid.updateMany(
        { projectId: project._id, _id: { $ne: bid._id } },
        { status: 'REJECTED' },
      );

      await Contractor.findByIdAndUpdate(bid.contractorId, { $inc: { totalProjects: 1 } });

      res.json({ project });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Award failed';
      res.status(500).json({ error: { code: 'INTERNAL', message: msg } });
    }
  },
);

/**
 * GET /admin/contractors — list all contractors (for admin management)
 */
contractorRouter.get(
  '/admin/contractors',
  requireAuth,
  requireRole('DEPT_ADMIN', 'REVIEWER'),
  async (_req: Request, res: Response) => {
    try {
      const contractors = await Contractor.find()
        .sort({ createdAt: -1 })
        .populate('userId', 'name email');
      res.json({ contractors });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL', message: 'Failed to fetch contractors' } });
    }
  },
);

/**
 * PATCH /admin/contractors/:id/verify — verify/unverify a contractor
 */
contractorRouter.patch(
  '/admin/contractors/:id/verify',
  requireAuth,
  requireRole('DEPT_ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const { verified } = req.body;
      const contractor = await Contractor.findByIdAndUpdate(
        req.params.id,
        { verified: !!verified },
        { new: true },
      ).populate('userId', 'name email');
      if (!contractor) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contractor not found' } });
        return;
      }
      res.json({ contractor });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL', message: 'Failed to update contractor' } });
    }
  },
);

// Cost Estimation

const COST_ESTIMATES: Record<string, { base: number; label: string }> = {
  ROADS: { base: 150000, label: 'Road repair' },
  WATER: { base: 75000, label: 'Water infrastructure' },
  SANITATION: { base: 50000, label: 'Sanitation work' },
  ELECTRICITY: { base: 80000, label: 'Electrical work' },
  STREET_LIGHTING: { base: 35000, label: 'Street lighting' },
  TRAFFIC: { base: 120000, label: 'Traffic infrastructure' },
  PARKS: { base: 90000, label: 'Park maintenance' },
  PUBLIC_HEALTH: { base: 60000, label: 'Public health facility' },
  ENCROACHMENT: { base: 45000, label: 'Encroachment removal' },
  STRAY_ANIMALS: { base: 25000, label: 'Animal control' },
  OTHER: { base: 50000, label: 'General civic work' },
};

function estimateCost(category: string): number {
  const estimate = COST_ESTIMATES[category] ?? COST_ESTIMATES['OTHER']!;
  const variation = 0.8 + Math.random() * 0.4;
  return Math.round(estimate!.base * variation / 100) * 100;
}
