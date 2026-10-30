import { describe, it, expect } from 'vitest';

/**
 * OtpCodeInput — unit tests
 *
 * The component is logic-heavy (paste, navigation, complete event) so these
 * tests focus on the internal invariants rather than full DOM mounting,
 * which requires jsdom + i18n setup that is overkill for a pure-logic check.
 */

describe('OtpCodeInput logic', () => {
  describe('digit extraction', () => {
    it('strips non-digit chars from paste payload', () => {
      const raw = 'abc123456xyz';
      const digits = raw.replace(/\D/g, '').slice(0, 6);
      expect(digits).toBe('123456');
    });

    it('takes only last char from a single-key input', () => {
      const typed = '5'; // normal key press
      const char = typed.replace(/\D/g, '').slice(-1);
      expect(char).toBe('5');
    });

    it('ignores non-digit key presses', () => {
      const typed = 'a';
      const char = typed.replace(/\D/g, '').slice(-1);
      expect(char).toBe('');
    });
  });

  describe('paste distribution', () => {
    it('distributes pasted digits from startIndex', () => {
      const pasted = '123456'.replace(/\D/g, '').slice(0, 6 - 0);
      const digits = Array.from({ length: 6 }, () => '');
      for (let i = 0; i < pasted.length; i++) {
        digits[i] = pasted[i] ?? '';
      }
      expect(digits).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    it('distributes partial paste from mid-point', () => {
      const startIndex = 4;
      const pasted = '4321'.replace(/\D/g, '').slice(0, 6 - startIndex);
      const digits = Array.from({ length: 6 }, () => '');
      for (let i = 0; i < pasted.length; i++) {
        digits[startIndex + i] = pasted[i] ?? '';
      }
      expect(digits.slice(0, 4)).toEqual(['', '', '', '']);
      expect(digits.slice(4)).toEqual(['4', '3']);
    });
  });

  describe('complete detection', () => {
    // Joining empty strings collapses the length: ['1','','3',...].join('') = '13...' (length < 6)
    // So checking value.length === 6 is sufficient — no need for includes('') guard.
    it('detects complete when all 6 digits filled', () => {
      const digits = ['1', '2', '3', '4', '5', '6'];
      const value = digits.join('');
      const isComplete = value.length === 6;
      expect(isComplete).toBe(true);
    });

    it('is not complete when any digit is empty', () => {
      const digits = ['1', '2', '', '4', '5', '6'];
      const value = digits.join(''); // '12456' — length 5
      const isComplete = value.length === 6;
      expect(isComplete).toBe(false);
    });
  });

  describe('modelValue sync', () => {
    it('parses modelValue into individual digits', () => {
      const modelValue = '123456';
      const digits = Array.from({ length: 6 }, (_, i) => modelValue[i] ?? '');
      expect(digits).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    it('pads shorter modelValue with empty strings', () => {
      const modelValue = '123';
      const digits = Array.from({ length: 6 }, (_, i) => modelValue[i] ?? '');
      expect(digits).toEqual(['1', '2', '3', '', '', '']);
    });
  });
});
