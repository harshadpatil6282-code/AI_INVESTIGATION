import type { z } from 'zod';
import { env } from '../../config/env.js';
import { GeminiProvider } from './GeminiProvider.js';
import { MockAiProvider } from './MockAiProvider.js';
import type { AiProvider } from './AiProvider.js';

export class GeminiAdapter {
  private provider: AiProvider;

  constructor(provider?: AiProvider) {
    this.provider = provider ?? (env.geminiKey ? new GeminiProvider() : new MockAiProvider());
  }

  async generateStructuredResponse<T>({
    stage,
    system,
    prompt,
    schema,
    model = 'text',
  }: {
    stage: string;
    system: string;
    prompt: string;
    schema: z.ZodType<T>;
    model?: 'text' | 'reasoning';
  }) {
    return this.provider.generateJson({
      stage,
      system,
      prompt,
      schema,
      model,
    });
  }
}
