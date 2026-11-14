import { describe, it, expect } from 'vitest';
import { sha256, pHash, dHash, hammingDistance } from '../../src/services/hashing';
import sharp from 'sharp';

// Helper: create a solid color test image
async function createTestImage(
  width: number, height: number, color: { r: number; g: number; b: number },
): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: color },
  }).jpeg({ quality: 90 }).toBuffer();
}

describe('hashing', () => {
  describe('sha256', () => {
    it('returns consistent hex hash', () => {
      const buf = Buffer.from('test data');
      const h1 = sha256(buf);
      const h2 = sha256(buf);
      expect(h1).toBe(h2);
      expect(h1).toHaveLength(64);
    });

    it('different data produces different hash', () => {
      expect(sha256(Buffer.from('a'))).not.toBe(sha256(Buffer.from('b')));
    });
  });

  describe('hammingDistance', () => {
    it('identical hashes have distance 0', () => {
      expect(hammingDistance('abcdef0123456789', 'abcdef0123456789')).toBe(0);
    });

    it('completely different hashes have high distance', () => {
      const d = hammingDistance('0000000000000000', 'ffffffffffffffff');
      expect(d).toBe(64);
    });

    it('single bit difference has distance 1', () => {
      expect(hammingDistance('0000000000000000', '0000000000000001')).toBe(1);
    });
  });

  describe('pHash', () => {
    it('identical images produce identical hashes', async () => {
      const img = await createTestImage(100, 100, { r: 128, g: 128, b: 128 });
      const h1 = await pHash(img);
      const h2 = await pHash(img);
      expect(h1).toBe(h2);
      expect(h1).toHaveLength(16);
    });

    it('resized image has low hamming distance', async () => {
      const original = await createTestImage(200, 200, { r: 100, g: 150, b: 200 });
      const resized = await sharp(original).resize(100, 100).jpeg().toBuffer();

      const h1 = await pHash(original);
      const h2 = await pHash(resized);
      const dist = hammingDistance(h1, h2);
      expect(dist).toBeLessThanOrEqual(10);
    });
  });

  describe('dHash', () => {
    it('produces 16-char hex string', async () => {
      const img = await createTestImage(100, 100, { r: 64, g: 64, b: 64 });
      const h = await dHash(img);
      expect(h).toHaveLength(16);
      expect(h).toMatch(/^[0-9a-f]{16}$/);
    });
  });
});
