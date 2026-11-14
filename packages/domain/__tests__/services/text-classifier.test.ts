import { describe, it, expect } from 'vitest';
import { classifyByKeywords } from '../../src/services/text-classifier';
import { CategoryCode } from '@nagrik-setu/shared';

describe('text-classifier', () => {
  it('classifies English pothole complaint as ROADS', () => {
    const result = classifyByKeywords('Large pothole on the main road near sector 17');
    expect(result.category).toBe(CategoryCode.ROADS);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('classifies Hindi garbage complaint as SANITATION', () => {
    const result = classifyByKeywords('सड़क पर कचरा फैला हुआ है, गंदगी बहुत है');
    expect(result.category).toBe(CategoryCode.SANITATION);
  });

  it('classifies English water leak as WATER', () => {
    const result = classifyByKeywords('Water pipe burst causing leak and waterlogging');
    expect(result.category).toBe(CategoryCode.WATER);
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it('classifies Hindi electricity complaint as ELECTRICITY', () => {
    const result = classifyByKeywords('बिजली कटौती बहुत हो रही है, ट्रांसफार्मर खराब है');
    expect(result.category).toBe(CategoryCode.ELECTRICITY);
  });

  it('classifies stray animal complaint', () => {
    const result = classifyByKeywords('Stray dogs are roaming in the park area');
    expect(result.category).toBe(CategoryCode.STRAY_ANIMALS);
  });

  it('returns OTHER with 0 confidence for unrelated text', () => {
    const result = classifyByKeywords('Lorem ipsum dolor sit amet');
    expect(result.category).toBe(CategoryCode.OTHER);
    expect(result.confidence).toBe(0);
  });

  it('higher match count gives higher confidence', () => {
    const single = classifyByKeywords('pothole');
    const multiple = classifyByKeywords('pothole on the broken road with cracks in the pavement');
    expect(multiple.confidence).toBeGreaterThan(single.confidence);
  });
});
