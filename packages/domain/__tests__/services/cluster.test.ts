import { describe, it, expect } from 'vitest';
import { computeClusterPriority } from '../../src/services/cluster';

describe('cluster priority computation', () => {
  it('returns base severity when clusterSize is 0 or 1', () => {
    expect(computeClusterPriority(3, 0)).toBe(3);
    expect(computeClusterPriority(3, 1)).toBe(3); // log2(1) = 0
  });

  it('bumps priority by 1 for cluster size 2 and 3', () => {
    expect(computeClusterPriority(3, 2)).toBe(4); // floor(log2(2)) = 1
    expect(computeClusterPriority(3, 3)).toBe(4); // floor(log2(3)) = 1
  });

  it('bumps priority by at most 2 for large clusters', () => {
    expect(computeClusterPriority(3, 4)).toBe(5); // floor(log2(4)) = 2
    expect(computeClusterPriority(3, 16)).toBe(5); // capped at min(2, 4) = 2
    expect(computeClusterPriority(3, 100)).toBe(5); // capped at 2
  });
});
