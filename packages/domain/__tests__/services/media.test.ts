import { describe, it, expect } from 'vitest';
import {
  validatePresignRequest,
  generatePresignedUrls,
  detectMimeFromMagicBytes,
  verifyUpload,
  type PresignRequest,
} from '../../src/services/media';
import { LocalDiskDriver } from '../../src/services/storage';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

describe('media service', () => {
  describe('validatePresignRequest', () => {
    it('accepts valid JPEG request within size limit', () => {
      const result = validatePresignRequest({
        contentType: 'image/jpeg',
        fileSize: 2 * 1024 * 1024,
      });
      expect(result.valid).toBe(true);
    });

    it('rejects unsupported content type', () => {
      const result = validatePresignRequest({
        contentType: 'application/pdf',
        fileSize: 1024,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Unsupported file type');
    });

    it('rejects file larger than 10MB', () => {
      const result = validatePresignRequest({
        contentType: 'image/png',
        fileSize: 15 * 1024 * 1024,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('File too large');
    });

    it('rejects negative or zero size', () => {
      const result = validatePresignRequest({
        contentType: 'image/jpeg',
        fileSize: 0,
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('detectMimeFromMagicBytes', () => {
    it('detects JPEG magic bytes (FF D8 FF)', () => {
      const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      expect(detectMimeFromMagicBytes(buf)).toBe('image/jpeg');
    });

    it('detects PNG magic bytes (89 50 4E 47)', () => {
      const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(detectMimeFromMagicBytes(buf)).toBe('image/png');
    });

    it('detects WebP magic bytes (RIFF....WEBP)', () => {
      const buf = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x00, 0x00, 0x00, 0x00, // length
        0x57, 0x45, 0x42, 0x50, // WEBP
      ]);
      expect(detectMimeFromMagicBytes(buf)).toBe('image/webp');
    });

    it('returns null for unknown/corrupt headers', () => {
      const buf = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      expect(detectMimeFromMagicBytes(buf)).toBeNull();
    });
  });

  describe('generatePresignedUrls and verifyUpload with storage driver', () => {
    it('generates presigned URLs and verifies an uploaded valid image', async () => {
      const tmpDir = path.join(os.tmpdir(), 'nagrik-test-' + Math.random().toString(36).substring(2, 7));
      const storage = new LocalDiskDriver(tmpDir);

      const requests: PresignRequest[] = [
        { contentType: 'image/jpeg', fileSize: 5000 },
      ];

      const presigned = await generatePresignedUrls(storage, requests);
      expect(presigned).toHaveLength(1);
      expect(presigned[0]!.key).toMatch(/\.jpg$/);

      // Simulate writing a valid JPEG file directly to storage key
      const fakeJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x01, 0x02, 0x03, 0x04]);
      await storage.putBuffer(presigned[0]!.key, fakeJpeg, 'image/jpeg');

      // Verify upload
      const verification = await verifyUpload(storage, presigned[0]!.key, 'image/jpeg');
      expect(verification.valid).toBe(true);

      // Clean up
      await fs.rm(tmpDir, { recursive: true, force: true });
    });
  });
});
