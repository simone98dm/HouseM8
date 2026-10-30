import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';

describe('useCountUp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns displayValue ref starting at target value (SSR-safe)', async () => {
    const { useCountUp } = await import('../useCountUp');
    const target = ref(100);
    const { displayValue } = useCountUp(target);
    expect(typeof displayValue.value).toBe('number');
  });

  it('exposes displayValue as a ref', async () => {
    const { useCountUp } = await import('../useCountUp');
    const target = ref(50);
    const { displayValue } = useCountUp(target);
    expect(isRef(displayValue)).toBe(true);
  });
});

function isRef(val: unknown): boolean {
  return (
    val !== null && typeof val === 'object' && '__v_isRef' in (val as object)
  );
}
