import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { parseCookies, requireAuth } from '../middleware/auth';
import { LocalDiskDriver, generatePresignedUrls } from '@nagrik-setu/domain';
import path from 'node:path';

export const mediaRouter = Router();

// In local dev, store in ./uploads or from env
const storagePath = process.env.STORAGE_PATH || './uploads';
const storage = new LocalDiskDriver(path.resolve(storagePath));

const presignInputSchema = z.object({
  files: z
    .array(
      z.object({
        contentType: z.string(),
        fileSize: z.number().int().positive(),
      }),
    )
    .min(1)
    .max(4),
});

/**
 * POST /uploads/presign
 * Generates presigned upload URLs for 1-4 images.
 */
mediaRouter.post(
  '/uploads/presign',
  parseCookies,
  requireAuth,
  async (req: Request, res: Response) => {
    const { files } = presignInputSchema.parse(req.body);
    try {
      const results = await generatePresignedUrls(storage, files);
      res.json({ uploads: results });
    } catch (err: unknown) {
      res.status(400).json({
        error: {
          code: 'INVALID_UPLOAD_REQUEST',
          message: err instanceof Error ? err.message : 'Invalid upload request',
        },
      });
    }
  },
);

/**
 * Local dev upload endpoint: PUT /storage/upload/:key
 * Reads raw stream and stores with putBuffer
 */
mediaRouter.put('/storage/upload/:key', async (req: Request, res: Response) => {
  const key = req.params.key as string;
  if (!key) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Key required' } });
    return;
  }

  const queryType = typeof req.query.contentType === 'string' ? req.query.contentType : undefined;
  const rawContentType = queryType || req.headers['content-type'] || 'application/octet-stream';
  const contentType = Array.isArray(rawContentType) ? rawContentType[0]! : String(rawContentType);

  const chunks: Buffer[] = [];
  req.on('data', (chunk) => {
    chunks.push(chunk);
  });

  req.on('end', async () => {
    try {
      const buffer = Buffer.concat(chunks);
      await storage.putBuffer(key, buffer, contentType);
      res.status(200).json({ success: true, key });
    } catch (err: unknown) {
      res.status(500).json({
        error: {
          code: 'UPLOAD_FAILED',
          message: err instanceof Error ? err.message : 'Upload failed',
        },
      });
    }
  });

  req.on('error', (err) => {
    res.status(500).json({
      error: {
        code: 'UPLOAD_ERROR',
        message: err.message,
      },
    });
  });
});

/**
 * Local dev download endpoint: GET /storage/download/:key
 */
mediaRouter.get('/storage/download/:key', async (req: Request, res: Response) => {
  const key = req.params.key as string;
  if (!key) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Key required' } });
    return;
  }

  try {
    const head = await storage.head(key);
    if (!head) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'File not found' } });
      return;
    }
    const buf = await storage.getBuffer(key);
    res.setHeader('Content-Type', head.contentType);
    res.setHeader('Content-Length', head.size);
    res.send(buf);
  } catch {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'File not found' } });
  }
});
