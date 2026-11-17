import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pino } from 'pino';
import { randomUUID } from 'node:crypto';
import { AppError } from '@nagrik-setu/shared';
import { ZodError } from 'zod';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { complaintRouter } from './routes/complaints';
import { mediaRouter } from './routes/media';
import { adminRouter } from './routes/admin';
import { officerRouter } from './routes/officer';
import { reviewRouter } from './routes/review';
import { contractorRouter } from './routes/contractor';

const logger = pino({ level: 'info' });

export function createApp(options: { clientOrigin: string; logLevel?: string }) {
  const app = express();

  if (options.logLevel) {
    logger.level = options.logLevel;
  }

  // Attach request ID and logger to every request
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const id = randomUUID();
    const r = req as unknown as Record<string, unknown>;
    r['id'] = id;
    r['log'] = logger.child({ requestId: id });
    next();
  });

  app.use(helmet());
  app.use(cors({ origin: options.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Routes
  app.use('/', healthRouter);
  app.use('/', authRouter);
  app.use('/', complaintRouter);
  app.use('/', mediaRouter);
  app.use('/', adminRouter);
  app.use('/', officerRouter);
  app.use('/', reviewRouter);
  app.use('/', contractorRouter);

  // 404 for unmatched routes
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError('NOT_FOUND', 404, 'Route not found'));
  });

  // Central error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const requestId = ((req as unknown as Record<string, unknown>)['id'] as string) ?? 'unknown';

    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
          requestId,
        },
      });
      return;
    }

    if (err instanceof ZodError) {
      res.status(422).json({
        error: {
          code: 'VALIDATION',
          message: 'Validation failed',
          details: err.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
          requestId,
        },
      });
      return;
    }

    const log = (req as unknown as Record<string, unknown>)['log'] as typeof logger | undefined;
    if (log) {
      log.error(err, 'unhandled error');
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL',
        message: 'An unexpected error occurred',
        requestId,
      },
    });
  });

  return app;
}
