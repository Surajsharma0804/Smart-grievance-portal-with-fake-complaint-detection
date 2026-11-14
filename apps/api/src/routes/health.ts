import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';

export const healthRouter = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

healthRouter.get('/ready', (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  // 1 = connected
  if (dbState === 1) {
    res.json({ status: 'ready', db: 'connected' });
  } else {
    res.status(503).json({ status: 'not ready', db: 'disconnected' });
  }
});
