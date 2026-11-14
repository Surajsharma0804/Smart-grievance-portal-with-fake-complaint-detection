import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';

export interface PresignedUrl {
  url: string;
  key: string;
  expiresAt: Date;
}

export interface StorageDriver {
  presignPut(opts: { contentType: string; maxBytes: number; expiresInSec?: number }): Promise<PresignedUrl>;
  presignGet(key: string, expiresInSec?: number): Promise<string>;
  head(key: string): Promise<{ size: number; contentType: string } | null>;
  getBuffer(key: string): Promise<Buffer>;
  putBuffer(key: string, data: Buffer, contentType: string): Promise<void>;
  deleteObject(key: string): Promise<void>;
}

/**
 * Local filesystem storage for development.
 * Files are stored under `basePath` using the key as the filename.
 */
export class LocalDiskDriver implements StorageDriver {
  constructor(private basePath: string) {}

  private filePath(key: string): string {
    // Prevent directory traversal
    const sanitized = path.basename(key);
    if (sanitized !== key || key.includes('..') || key.includes('/') || key.includes('\\')) {
      throw new Error('Invalid storage key');
    }
    return path.join(this.basePath, sanitized);
  }

  async presignPut(opts: { contentType: string; maxBytes: number; expiresInSec?: number }): Promise<PresignedUrl> {
    await fs.mkdir(this.basePath, { recursive: true });
    const ext = mimeToExt(opts.contentType);
    const key = `${randomUUID()}${ext}`;
    const expiresAt = new Date(Date.now() + (opts.expiresInSec ?? 300) * 1000);
    // For local dev, the "presigned URL" is just a local API endpoint
    return {
      url: `/api/storage/upload/${key}?maxBytes=${opts.maxBytes}&contentType=${encodeURIComponent(opts.contentType)}`,
      key,
      expiresAt,
    };
  }

  async presignGet(key: string): Promise<string> {
    return `/api/storage/download/${key}`;
  }

  async head(key: string): Promise<{ size: number; contentType: string } | null> {
    try {
      const fp = this.filePath(key);
      const stat = await fs.stat(fp);
      const ext = path.extname(key);
      return { size: stat.size, contentType: extToMime(ext) };
    } catch {
      return null;
    }
  }

  async getBuffer(key: string): Promise<Buffer> {
    return fs.readFile(this.filePath(key));
  }

  async putBuffer(key: string, data: Buffer, _contentType: string): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true });
    await fs.writeFile(this.filePath(key), data);
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await fs.unlink(this.filePath(key));
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
  };
  return map[mime] ?? '';
}

function extToMime(ext: string): string {
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.heic': 'image/heic',
  };
  return map[ext.toLowerCase()] ?? 'application/octet-stream';
}
