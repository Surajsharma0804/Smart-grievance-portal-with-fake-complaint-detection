import { describe, it, expect } from 'vitest';
import { l2Normalize, cosineSimilarity, StubEmbedder, simpleTextEmbedding } from '../../src/services/embedding';

describe('embedding', () => {
  describe('l2Normalize', () => {
    it('normalizes to unit length', () => {
      const vec = l2Normalize([3, 4]);
      const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
      expect(magnitude).toBeCloseTo(1, 5);
    });

    it('handles zero vector', () => {
      const vec = l2Normalize([0, 0, 0]);
      expect(vec).toEqual([0, 0, 0]);
    });
  });

  describe('cosineSimilarity', () => {
    it('identical normalized vectors have similarity 1', () => {
      const v = l2Normalize([1, 2, 3]);
      expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
    });

    it('orthogonal vectors have similarity 0', () => {
      const a = l2Normalize([1, 0]);
      const b = l2Normalize([0, 1]);
      expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
    });

    it('throws on mismatched lengths', () => {
      expect(() => cosineSimilarity([1], [1, 2])).toThrow('length mismatch');
    });
  });

  describe('StubEmbedder', () => {
    it('returns normalized vector', async () => {
      const embedder = new StubEmbedder(128);
      const vec = await embedder.embed(Buffer.from('test'));
      const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
      expect(magnitude).toBeCloseTo(1, 3);
      expect(vec).toHaveLength(128);
    });

    it('same input produces same output (deterministic)', async () => {
      const embedder = new StubEmbedder(128);
      const buf = Buffer.from('consistent test data');
      const v1 = await embedder.embed(buf);
      const v2 = await embedder.embed(buf);
      expect(v1).toEqual(v2);
    });

    it('different inputs produce different embeddings', async () => {
      const embedder = new StubEmbedder(128);
      const v1 = await embedder.embed(Buffer.from('image A'));
      const v2 = await embedder.embed(Buffer.from('image B'));
      const sim = cosineSimilarity(v1, v2);
      expect(sim).toBeLessThan(1);
    });
  });

  describe('simpleTextEmbedding', () => {
    it('returns normalized vector of specified dimension', () => {
      const vec = simpleTextEmbedding('pothole on the road', 256);
      expect(vec).toHaveLength(256);
      const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
      expect(magnitude).toBeCloseTo(1, 3);
    });

    it('similar texts produce higher similarity', () => {
      const v1 = simpleTextEmbedding('pothole on road near sector 17');
      const v2 = simpleTextEmbedding('road pothole sector 17 area');
      const v3 = simpleTextEmbedding('stray dogs in the park');
      const sim12 = cosineSimilarity(v1, v2);
      const sim13 = cosineSimilarity(v1, v3);
      expect(sim12).toBeGreaterThan(sim13);
    });
  });
});
