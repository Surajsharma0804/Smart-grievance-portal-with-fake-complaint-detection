/**
 * Image embedding service with interface for different providers.
 * Supports stub (random vectors) for testing and caption-text mode.
 */

/**
 * Interface for image embedding providers.
 */
export interface ImageEmbedder {
  readonly name: string;
  embed(buffer: Buffer): Promise<number[]>;
}

/**
 * L2-normalize a vector (unit length).
 */
export function l2Normalize(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vec;
  return vec.map((v) => v / magnitude);
}

/**
 * Cosine similarity between two vectors.
 * Assumes vectors are L2-normalized (returns dot product).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
  }
  return dot;
}

/**
 * Stub embedder for testing - returns deterministic random-looking vectors.
 * Uses a simple seeded approach based on buffer content hash.
 */
export class StubEmbedder implements ImageEmbedder {
  readonly name = 'stub';
  private dim: number;

  constructor(dim = 512) {
    this.dim = dim;
  }

  async embed(buffer: Buffer): Promise<number[]> {
    // Generate a deterministic vector based on buffer content
    const vec: number[] = new Array(this.dim);
    let seed = 0;
    for (let i = 0; i < Math.min(buffer.length, 100); i++) {
      seed = (seed * 31 + (buffer[i] ?? 0)) & 0x7fffffff;
    }

    for (let i = 0; i < this.dim; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      vec[i] = (seed / 0x7fffffff) * 2 - 1;
    }

    return l2Normalize(vec);
  }
}

/**
 * Text embedding using a simple TF-IDF-like approach.
 * For production, this would be replaced by a real text embedding model.
 */
export function simpleTextEmbedding(text: string, dim = 512): number[] {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const vec = new Array(dim).fill(0) as number[];

  for (let i = 0; i < dim; i++) {
    vec[i] = 0;
  }

  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 31 + word.charCodeAt(i)) & 0x7fffffff;
    }
    const idx = hash % dim;
    vec[idx] = (vec[idx] ?? 0) + 1;
  }

  return l2Normalize(vec);
}
