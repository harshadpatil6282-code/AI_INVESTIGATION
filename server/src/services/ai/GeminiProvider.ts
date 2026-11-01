import { z } from 'zod';
import { env } from '../../config/env.js';
import { getRequiredFields, validateAiResponse } from '../../lib/security.js';
import type { AiProvider } from './AiProvider.js';

const modelNames = {
  text: 'gemini-2.5-flash',
  reasoning: 'gemini-2.5-flash',
} as const;

function extractJsonFromText(value: string): unknown {
  const trimmed = value.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenceMatch ? fenceMatch[1] : trimmed;
  return validateAiResponse(candidate, []);
}

export class GeminiProvider implements AiProvider {
  async generateJson<T>({
    stage,
    system,
    prompt,
    schema,
    temperature = 0.2,
    model = 'text',
  }: {
    stage: string;
    system: string;
    prompt: string;
    schema: z.ZodType<T>;
    temperature?: number;
    model?: 'text' | 'reasoning';
  }): Promise<{ data: T; usage: { inputTokens: number; outputTokens: number } }> {
    if (!env.geminiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const modelName = modelNames[model] ?? modelNames.text;
    const candidates = [modelName, 'gemini-2.5-flash'];
    let response: Response | undefined;
    let lastBody = '';

    for (const candidate of candidates) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${env.geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generationConfig: {
              temperature,
              responseMimeType: 'application/json',
            },
            contents: [{
              role: 'user',
              parts: [{
                text: `System instructions: ${system}\n\nStage: ${stage}\n\nRespond with valid JSON only.\n\nUser prompt:\n${prompt}`,
              }],
            }],
          }),
        },
      );

      if (response.ok) break;
      lastBody = await response.text();
      if (response.status !== 404) {
        throw new Error(`Gemini request failed (${response.status}): ${lastBody}`);
      }
    }

    if (!response || !response.ok) {
      throw new Error(`Gemini request failed (${response?.status ?? 'unknown'}): ${lastBody}`);
    }

    const payload = (await response.json()) as any;
    const text = payload?.candidates?.[0]?.content?.parts?.map((part: any) => part.text ?? '').join('') ?? '{}';
    const parsed = extractJsonFromText(text);
    const requiredFields = getRequiredFields(schema);
    const validated = validateAiResponse<Record<string, unknown>>(JSON.stringify(parsed), requiredFields);
    const result = schema.safeParse(validated);

    if (!result.success) {
      throw new Error(`AI response schema validation failed: ${result.error.issues.map((issue) => issue.message).join('; ')}`);
    }

    return {
      data: result.data,
      usage: {
        inputTokens: Number(payload?.usageMetadata?.promptTokenCount ?? 0),
        outputTokens: Number(payload?.usageMetadata?.candidatesTokenCount ?? 0),
      },
    };
  }

  async generateImage(_opts?: { prompt: string; aspectRatio?: string }): Promise<{ bytes: Buffer; mime: string }> {
    throw new Error('Gemini image generation is not configured.');
  }
}
