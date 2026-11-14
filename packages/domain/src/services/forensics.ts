/**
 * Image forensics: ELA (Error Level Analysis) and noise anomaly detection.
 * Uses sharp for image processing.
 */
import sharp from 'sharp';

export interface ForensicsResult {
  /** ELA statistics */
  ela: {
    mean: number;
    std: number;
    maxBlockMean: number;
    regionVarianceRatio: number; // maxBlockMean / mean
  };
  /** Noise analysis */
  noise: {
    globalVariance: number;
    anomalousBlocks: number;
    totalBlocks: number;
  };
  /** Path to the generated ELA overlay image (if requested) */
  overlayPath?: string;
}

const ELA_QUALITY = 90;
const BLOCK_SIZE = 16;
const NOISE_SIGMA_THRESHOLD = 3;
const AMPLIFY_FACTOR = 20;

/**
 * Perform ELA analysis on an image buffer.
 * Recompresses at JPEG quality 90, takes absolute difference, computes statistics.
 */
export async function analyzeELA(
  imageBuffer: Buffer,
  opts?: { generateOverlay?: boolean; overlayPath?: string },
): Promise<ForensicsResult> {
  // Decode and get raw pixels
  const original = sharp(imageBuffer, { limitInputPixels: 100_000_000 });
  const meta = await original.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  if (width === 0 || height === 0) {
    throw new Error('Could not determine image dimensions');
  }

  // Get raw pixel data from original
  const originalRaw = await sharp(imageBuffer)
    .resize({ width: Math.min(width, 1280), height: Math.min(height, 1280), fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const actualWidth = originalRaw.info.width;
  const actualHeight = originalRaw.info.height;

  // Recompress at JPEG quality and decode
  const recompressedJpeg = await sharp(imageBuffer)
    .resize({ width: actualWidth, height: actualHeight, fit: 'inside' })
    .removeAlpha()
    .jpeg({ quality: ELA_QUALITY })
    .toBuffer();

  const recompressedRaw = await sharp(recompressedJpeg)
    .raw()
    .toBuffer();

  // Compute absolute difference amplified
  const channels = 3;
  const pixelCount = actualWidth * actualHeight;
  const diffBuffer = Buffer.alloc(pixelCount * channels);
  let totalDiff = 0;
  let totalDiffSq = 0;

  for (let i = 0; i < pixelCount * channels; i++) {
    const diff = Math.abs((originalRaw.data[i] ?? 0) - (recompressedRaw[i] ?? 0));
    const amplified = Math.min(255, diff * AMPLIFY_FACTOR);
    diffBuffer[i] = amplified;
    totalDiff += diff;
    totalDiffSq += diff * diff;
  }

  const mean = totalDiff / (pixelCount * channels);
  const variance = totalDiffSq / (pixelCount * channels) - mean * mean;
  const std = Math.sqrt(Math.max(0, variance));

  // Block-level analysis
  const blocksX = Math.floor(actualWidth / BLOCK_SIZE);
  const blocksY = Math.floor(actualHeight / BLOCK_SIZE);
  const totalBlocks = blocksX * blocksY;
  let maxBlockMean = 0;
  const blockMeans: number[] = [];

  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      let blockSum = 0;
      let blockPixels = 0;
      for (let py = 0; py < BLOCK_SIZE; py++) {
        for (let px = 0; px < BLOCK_SIZE; px++) {
          const x = bx * BLOCK_SIZE + px;
          const y = by * BLOCK_SIZE + py;
          const idx = (y * actualWidth + x) * channels;
          for (let c = 0; c < channels; c++) {
            blockSum += Math.abs((originalRaw.data[idx + c] ?? 0) - (recompressedRaw[idx + c] ?? 0));
            blockPixels++;
          }
        }
      }
      const bMean = blockSum / blockPixels;
      blockMeans.push(bMean);
      maxBlockMean = Math.max(maxBlockMean, bMean);
    }
  }

  // Noise anomaly detection using block variance
  const blockVariances: number[] = [];
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      let sum = 0;
      let sumSq = 0;
      let count = 0;
      for (let py = 0; py < BLOCK_SIZE; py++) {
        for (let px = 0; px < BLOCK_SIZE; px++) {
          const x = bx * BLOCK_SIZE + px;
          const y = by * BLOCK_SIZE + py;
          const idx = (y * actualWidth + x) * channels;
          const gray = ((originalRaw.data[idx] ?? 0) + (originalRaw.data[idx + 1] ?? 0) + (originalRaw.data[idx + 2] ?? 0)) / 3;
          sum += gray;
          sumSq += gray * gray;
          count++;
        }
      }
      const bMean = sum / count;
      const bVar = sumSq / count - bMean * bMean;
      blockVariances.push(bVar);
    }
  }

  const globalVariance = blockVariances.reduce((a, b) => a + b, 0) / (blockVariances.length || 1);
  const noiseStd = Math.sqrt(
    blockVariances.reduce((a, b) => a + (b - globalVariance) ** 2, 0) / (blockVariances.length || 1),
  );
  const anomalousBlocks = blockVariances.filter(
    (v) => Math.abs(v - globalVariance) > NOISE_SIGMA_THRESHOLD * noiseStd,
  ).length;

  const regionVarianceRatio = mean > 0 ? maxBlockMean / mean : 0;

  // Generate overlay if requested
  let overlayPath: string | undefined;
  if (opts?.generateOverlay && opts.overlayPath) {
    await sharp(diffBuffer, {
      raw: { width: actualWidth, height: actualHeight, channels: 3 },
    })
      .resize(Math.min(actualWidth, 640), Math.min(actualHeight, 640), { fit: 'inside' })
      .png()
      .toFile(opts.overlayPath);
    overlayPath = opts.overlayPath;
  }

  return {
    ela: { mean, std, maxBlockMean, regionVarianceRatio },
    noise: { globalVariance, anomalousBlocks, totalBlocks },
    overlayPath,
  };
}
