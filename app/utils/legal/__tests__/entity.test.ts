import { describe, it, expect } from 'vitest';
import { LEGAL_ENTITY, isLegalEntityComplete } from '../entity';

describe('isLegalEntityComplete', () => {
  it('is false while placeholders remain', () => {
    expect(isLegalEntityComplete()).toBe(false);
  });

  it('is false when a single field is still TODO', () => {
    const filled = Object.fromEntries(
      Object.keys(LEGAL_ENTITY).map((k) => [k, 'x']),
    ) as unknown as typeof LEGAL_ENTITY;
    expect(isLegalEntityComplete(filled)).toBe(true);
    expect(isLegalEntityComplete({ ...filled, pec: 'TODO: PEC' })).toBe(false);
  });
});
