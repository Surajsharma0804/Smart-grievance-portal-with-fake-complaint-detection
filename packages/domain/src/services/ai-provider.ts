/**
 * AI provider interface for VLM analysis.
 * Supports MockProvider for testing and GeminiAdapter for production.
 */
import { z } from 'zod';
import { CategoryCode } from '@nagrik-setu/shared';

// VLM response schema from design.md §5.3
const categoryValues = Object.values(CategoryCode) as [string, ...string[]];

export const vlmResultSchema = z.object({
  category: z.enum(categoryValues),
  subCategory: z.string().max(60).optional(),
  severity: z.number().int().min(1).max(5),
  caption: z.string().max(200),
  textImageConsistency: z.number().min(0).max(1),
  flags: z.object({
    screenshot: z.boolean(),
    stockPhoto: z.boolean(),
    irrelevantImage: z.boolean(),
    faceProminent: z.boolean(),
    possiblyAiGenerated: z.boolean(),
  }),
  confidence: z.number().min(0).max(1),
});

export type VlmResult = z.infer<typeof vlmResultSchema>;

export interface AIProvider {
  readonly name: string;
  analyze(images: Buffer[], context: AnalysisContext): Promise<VlmResult>;
}

export interface AnalysisContext {
  title: string;
  description?: string;
  citizenCategory?: string;
  location?: { lat: number; lng: number };
}

/**
 * Build the analysis prompt for the VLM.
 */
export function buildPrompt(context: AnalysisContext): string {
  const categories = Object.values(CategoryCode)
    .map((c) => `- ${c}`)
    .join('\n');

  return `You are a civic grievance analysis system. Analyze the provided image(s) and complaint text.

Complaint Title: ${context.title}
${context.description ? `Description: ${context.description}` : ''}
${context.citizenCategory ? `Citizen-selected category: ${context.citizenCategory}` : ''}

Available categories:
${categories}

Respond with a JSON object matching this exact schema:
{
  "category": one of the category codes above,
  "subCategory": optional specific sub-category (max 60 chars),
  "severity": integer 1-5 (1=cosmetic, 5=safety hazard),
  "caption": describe what you see in the image (max 200 chars),
  "textImageConsistency": 0.0-1.0 how well the text matches the image,
  "flags": {
    "screenshot": boolean - is this a screenshot rather than a photo?,
    "stockPhoto": boolean - does this look like a stock photo?,
    "irrelevantImage": boolean - is the image unrelated to the complaint?,
    "faceProminent": boolean - are faces prominently visible?,
    "possiblyAiGenerated": boolean - does this look AI-generated?
  },
  "confidence": 0.0-1.0 your overall confidence in the categorization
}

If unsure, use category "OTHER" with low confidence rather than guessing.
Respond with ONLY valid JSON, no markdown fences or extra text.`;
}

/**
 * Parse and validate VLM response, with one retry on invalid JSON.
 */
export function parseVlmResponse(raw: string): VlmResult {
  // Strip markdown fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const parsed = JSON.parse(cleaned);
  return vlmResultSchema.parse(parsed);
}

/**
 * Default VLM result returned on provider failure.
 */
export function fallbackVlmResult(): VlmResult {
  return {
    category: CategoryCode.OTHER,
    severity: 3,
    caption: 'Analysis unavailable - provider failure',
    textImageConsistency: 0.5,
    flags: {
      screenshot: false,
      stockPhoto: false,
      irrelevantImage: false,
      faceProminent: false,
      possiblyAiGenerated: false,
    },
    confidence: 0,
  };
}

/**
 * Mock AI provider for tests and development.
 * Returns configured responses or a default response.
 */
export class MockProvider implements AIProvider {
  readonly name = 'mock';
  private response: VlmResult | null = null;
  private shouldFail = false;
  private failCount = 0;
  private maxFails = 0;
  callCount = 0;

  setResponse(result: VlmResult): void {
    this.response = result;
  }

  setFailure(count: number): void {
    this.shouldFail = true;
    this.maxFails = count;
    this.failCount = 0;
  }

  async analyze(images: Buffer[], context: AnalysisContext): Promise<VlmResult> {
    this.callCount++;

    if (this.shouldFail && this.failCount < this.maxFails) {
      this.failCount++;
      throw new Error('MockProvider configured to fail');
    }

    if (this.response) return { ...this.response };

    // Default mock response based on context
    return {
      category: (context.citizenCategory as CategoryCode) ?? CategoryCode.OTHER,
      severity: 3,
      caption: `Mock analysis of ${images.length} image(s): ${context.title}`,
      textImageConsistency: 0.8,
      flags: {
        screenshot: false,
        stockPhoto: false,
        irrelevantImage: false,
        faceProminent: false,
        possiblyAiGenerated: false,
      },
      confidence: 0.85,
    };
  }
}

/**
 * Analyze with retry: tries once, on failure retries once, then falls back.
 */
export async function analyzeWithRetry(
  provider: AIProvider,
  images: Buffer[],
  context: AnalysisContext,
  timeoutMs = 30_000,
): Promise<{ result: VlmResult; fromFallback: boolean }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await Promise.race([
        provider.analyze(images, context),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI provider timeout')), timeoutMs),
        ),
      ]);
      return { result, fromFallback: false };
    } catch {
      if (attempt === 1) {
        return { result: fallbackVlmResult(), fromFallback: true };
      }
      // Retry once
    }
  }

  return { result: fallbackVlmResult(), fromFallback: true };
}
