import { describe, it, expect } from 'vitest';
import { analyzeELA } from '../../src/services/forensics';
import sharp from 'sharp';

describe('forensics (ELA)', () => {
  it('analyzes an image and returns ELA and noise metrics', async () => {
    // Generate an image
    const sampleImage = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 180, g: 120, b: 60 },
      },
    })
      .jpeg({ quality: 90 })
      .toBuffer();

    const result = await analyzeELA(sampleImage);
    expect(result.ela).toBeDefined();
    expect(typeof result.ela.mean).toBe('number');
    expect(typeof result.ela.regionVarianceRatio).toBe('number');
    expect(result.noise).toBeDefined();
    expect(result.noise.totalBlocks).toBeGreaterThan(0);
  });
});
