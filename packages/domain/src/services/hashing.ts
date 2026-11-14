import { createHash } from 'node:crypto';
import sharp from 'sharp';

/**
 * SHA-256 hash of a buffer, returned as lowercase hex.
 */
export function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Hamming distance between two hex-encoded hashes of equal length.
 */
export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) {
    throw new Error(`Hash length mismatch: ${a.length} vs ${b.length}`);
  }
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const nibA = parseInt(a[i]!, 16);
    const nibB = parseInt(b[i]!, 16);
    let xor = nibA ^ nibB;
    while (xor) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}

/**
 * 1-D DCT-II (unscaled). Allocates and returns a new Float64Array.
 */
function dct1d(input: Float64Array): Float64Array {
  const N = input.length;
  const output = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += input[n]! * Math.cos((Math.PI * (2 * n + 1) * k) / (2 * N));
    }
    output[k] = sum;
  }
  return output;
}

/**
 * 2-D DCT-II applied to a square matrix stored row-major.
 */
function dct2d(matrix: Float64Array, size: number): Float64Array {
  const result = new Float64Array(size * size);
  // DCT rows
  for (let r = 0; r < size; r++) {
    const row = matrix.slice(r * size, (r + 1) * size);
    const dctRow = dct1d(row);
    result.set(dctRow, r * size);
  }
  // DCT columns (in-place via transpose trick)
  const colBuf = new Float64Array(size);
  const final = new Float64Array(size * size);
  for (let c = 0; c < size; c++) {
    for (let r = 0; r < size; r++) colBuf[r] = result[r * size + c]!;
    const dctCol = dct1d(colBuf);
    for (let r = 0; r < size; r++) final[r * size + c] = dctCol[r]!;
  }
  return final;
}

/**
 * Perceptual hash using DCT.
 * Resize to 32×32 grayscale → 2D DCT → top-left 8×8 → threshold at median
 * (excluding DC coefficient) → 64-bit value as 16 hex chars.
 */
export async function pHash(buffer: Buffer): Promise<string> {
  const pixels = await sharp(buffer)
    .resize(32, 32, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer();

  const matrix = new Float64Array(32 * 32);
  for (let i = 0; i < 1024; i++) matrix[i] = pixels[i]!;

  const dctResult = dct2d(matrix, 32);

  // Extract top-left 8×8 (excluding DC at [0,0])
  const block: number[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (r === 0 && c === 0) continue; // skip DC
      block.push(dctResult[r * 32 + c]!);
    }
  }

  // Median of 63 values
  const sorted = [...block].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)]!;

  // Build 64-bit hash: DC bit is always 0 (excluded), then 63 bits
  let bits = '';
  let bitIndex = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (r === 0 && c === 0) {
        bits += '0'; // DC excluded, always 0
      } else {
        bits += block[bitIndex]! >= median ? '1' : '0';
        bitIndex++;
      }
    }
  }

  // Convert 64 bits to 16 hex chars
  let hex = '';
  for (let i = 0; i < 64; i += 4) {
    hex += parseInt(bits.substring(i, i + 4), 2).toString(16);
  }
  return hex;
}

/**
 * Difference hash (dHash).
 * Resize to 9×8 grayscale → horizontal gradient → 64-bit as 16 hex chars.
 */
export async function dHash(buffer: Buffer): Promise<string> {
  const pixels = await sharp(buffer)
    .resize(9, 8, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer();

  let bits = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = pixels[row * 9 + col]!;
      const right = pixels[row * 9 + col + 1]!;
      bits += left < right ? '1' : '0';
    }
  }

  let hex = '';
  for (let i = 0; i < 64; i += 4) {
    hex += parseInt(bits.substring(i, i + 4), 2).toString(16);
  }
  return hex;
}
