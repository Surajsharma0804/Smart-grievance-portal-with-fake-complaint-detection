import { describe, it, expect } from 'vitest';
import {
  MockProvider,
  parseVlmResponse,
  fallbackVlmResult,
  analyzeWithRetry,
  buildPrompt,
} from '../../src/services/ai-provider';

describe('ai-provider', () => {
  describe('MockProvider', () => {
    it('returns default mock response', async () => {
      const provider = new MockProvider();
      const result = await provider.analyze([Buffer.from('test')], {
        title: 'Pothole on road',
        citizenCategory: 'ROADS',
      });
      expect(result.category).toBe('ROADS');
      expect(result.confidence).toBe(0.85);
    });

    it('returns configured response', async () => {
      const provider = new MockProvider();
      provider.setResponse({
        category: 'WATER',
        severity: 4,
        caption: 'Water leak',
        textImageConsistency: 0.9,
        flags: { screenshot: false, stockPhoto: false, irrelevantImage: false, faceProminent: false, possiblyAiGenerated: false },
        confidence: 0.95,
      });
      const result = await provider.analyze([], { title: 'test' });
      expect(result.category).toBe('WATER');
      expect(result.severity).toBe(4);
    });

    it('can be configured to fail', async () => {
      const provider = new MockProvider();
      provider.setFailure(1);
      await expect(provider.analyze([], { title: 'test' })).rejects.toThrow('MockProvider configured to fail');
    });
  });

  describe('parseVlmResponse', () => {
    it('parses valid JSON', () => {
      const json = JSON.stringify({
        category: 'ROADS',
        severity: 3,
        caption: 'A pothole on the road',
        textImageConsistency: 0.8,
        flags: { screenshot: false, stockPhoto: false, irrelevantImage: false, faceProminent: false, possiblyAiGenerated: false },
        confidence: 0.85,
      });
      const result = parseVlmResponse(json);
      expect(result.category).toBe('ROADS');
    });

    it('strips markdown fences', () => {
      const json = '```json\n{"category":"WATER","severity":2,"caption":"test","textImageConsistency":0.5,"flags":{"screenshot":false,"stockPhoto":false,"irrelevantImage":false,"faceProminent":false,"possiblyAiGenerated":false},"confidence":0.7}\n```';
      const result = parseVlmResponse(json);
      expect(result.category).toBe('WATER');
    });

    it('rejects invalid JSON', () => {
      expect(() => parseVlmResponse('not json')).toThrow();
    });

    it('rejects invalid schema', () => {
      expect(() => parseVlmResponse('{"category":"INVALID"}')).toThrow();
    });
  });

  describe('fallbackVlmResult', () => {
    it('returns OTHER with 0 confidence', () => {
      const result = fallbackVlmResult();
      expect(result.category).toBe('OTHER');
      expect(result.confidence).toBe(0);
    });
  });

  describe('analyzeWithRetry', () => {
    it('returns result on first success', async () => {
      const provider = new MockProvider();
      const { result, fromFallback } = await analyzeWithRetry(provider, [], { title: 'test' });
      expect(fromFallback).toBe(false);
      expect(result.confidence).toBe(0.85);
      expect(provider.callCount).toBe(1);
    });

    it('retries once and succeeds', async () => {
      const provider = new MockProvider();
      provider.setFailure(1); // fail first attempt only
      const { result, fromFallback } = await analyzeWithRetry(provider, [], { title: 'test' });
      expect(fromFallback).toBe(false);
      expect(provider.callCount).toBe(2);
    });

    it('falls back after two failures', async () => {
      const provider = new MockProvider();
      provider.setFailure(5); // fail all attempts
      const { result, fromFallback } = await analyzeWithRetry(provider, [], { title: 'test' });
      expect(fromFallback).toBe(true);
      expect(result.confidence).toBe(0);
      expect(provider.callCount).toBe(2);
    });

    it('falls back on timeout', async () => {
      const provider: MockProvider = {
        name: 'slow-mock',
        callCount: 0,
        analyze: async () => {
          await new Promise((r) => setTimeout(r, 5000));
          return fallbackVlmResult();
        },
      } as unknown as MockProvider;

      const { fromFallback } = await analyzeWithRetry(provider, [], { title: 'test' }, 100);
      expect(fromFallback).toBe(true);
    });
  });

  describe('buildPrompt', () => {
    it('includes title and categories', () => {
      const prompt = buildPrompt({ title: 'Broken road', description: 'Near sector 17' });
      expect(prompt).toContain('Broken road');
      expect(prompt).toContain('ROADS');
      expect(prompt).toContain('SANITATION');
    });
  });
});
