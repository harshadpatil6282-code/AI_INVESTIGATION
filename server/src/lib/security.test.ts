import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAiResponse, ensureCaseConsistency, sanitizePrivateSolution } from './security.js';

const aiSchema = {
  type: 'object',
  properties: {
    culpritId: { type: 'string' },
    motive: { type: 'string' },
    method: { type: 'string' },
  },
  required: ['culpritId', 'motive', 'method'],
} as const;

test('validateAiResponse rejects invalid JSON before it reaches the server', () => {
  assert.throws(() => validateAiResponse('not-json', aiSchema), /invalid json/i);
  assert.throws(() => validateAiResponse('{"culpritId":123}', aiSchema), /schema validation/i);
});

test('ensureCaseConsistency rejects hidden-solution drift', () => {
  const result = ensureCaseConsistency({
    publicSuspects: [{ id: 's1', name: 'Alice' }, { id: 's2', name: 'Bob' }],
    culpritId: 's2',
    hiddenTruth: { culpritId: 's1', motive: 'revenge', method: 'poison' },
  });

  assert.equal(result.ok, false);
  assert.match(result.reason ?? '', /culprit/i);
});

test('sanitizePrivateSolution strips truth from public payloads', () => {
  const publicPayload = sanitizePrivateSolution({
    title: 'Case',
    culpritId: 's3',
    hiddenTruth: { culpritId: 's3', motive: 'greed', method: 'poison' },
    publicSuspects: [{ id: 's1' }],
  });

  assert.equal(publicPayload.culpritId, undefined);
  assert.equal(publicPayload.hiddenTruth, undefined);
});
