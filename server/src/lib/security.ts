import { z } from 'zod';

export function sanitizePrivateSolution<T>(input: T): T {
  if (!input || typeof input !== 'object') {
    return input;
  }

  const stack = new WeakSet<object>();

  const sanitize = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map((entry) => sanitize(entry));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    if (stack.has(value as object)) {
      return value;
    }

    stack.add(value as object);

    const next: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      if (
        [
          'bible',
          'hints',
          'hiddenTruth',
          'culpritId',
          'culpritName',
          'motive',
          'method',
          'solutionSummary',
          'groundTruthTimeline',
          'redHerrings',
          'secret',
          'privateSolution',
        ].includes(key)
      ) {
        continue;
      }
      next[key] = sanitize(nestedValue);
    }

    return next;
  };

  return sanitize(input) as T;
}

export function getRequiredFields(schema: z.ZodTypeAny): string[] {
  if (schema instanceof z.ZodObject) {
    return Object.keys(schema.shape);
  }

  if (schema instanceof z.ZodArray) {
    return getRequiredFields(schema.element);
  }

  return [];
}

export function validateAiResponse<T>(rawText: string, requiredFields: string[] | Record<string, unknown> = []): T {
  const fields = Array.isArray(requiredFields)
    ? requiredFields
    : Array.isArray((requiredFields as { required?: unknown[] }).required)
      ? ((requiredFields as { required?: unknown[] }).required as string[])
      : [];

  const text = rawText.trim();
  if (!text) {
    throw new Error('AI response invalid json: empty output');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`AI response invalid json: ${(error as Error).message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('AI response invalid json: expected an object payload');
  }

  const record = parsed as Record<string, unknown>;
  for (const field of fields) {
    if (!(field in record) || record[field] === undefined || (typeof record[field] === 'string' && !record[field].trim())) {
      throw new Error(`AI response schema validation failed: missing required field "${field}"`);
    }
  }

  return parsed as T;
}

export function ensureCaseConsistency(input: {
  publicSuspects?: Array<{ id?: string; name?: string }>;
  culpritId?: string;
  hiddenTruth?: { culpritId?: string; motive?: string; method?: string };
}): { ok: boolean; reason?: string } {
  const culpritId = input.culpritId ?? input.hiddenTruth?.culpritId;
  if (!culpritId) {
    return { ok: false, reason: 'Case is missing a culprit identifier.' };
  }

  const suspectIds = new Set(
    (input.publicSuspects ?? [])
      .map((suspect) => suspect.id)
      .filter((id): id is string => Boolean(id)),
  );

  if (!suspectIds.has(culpritId)) {
    return {
      ok: false,
      reason: `Culprit ${culpritId} is not present in the public suspect roster and cannot be trusted.`,
    };
  }

  if (input.hiddenTruth?.culpritId && input.hiddenTruth.culpritId !== culpritId) {
    return {
      ok: false,
      reason: 'Hidden culprit drift detected: the public and private sources disagree about the culprit.',
    };
  }

  return { ok: true };
}
