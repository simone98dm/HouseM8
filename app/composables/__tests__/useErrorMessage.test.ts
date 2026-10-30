/**
 * useErrorMessage Composable Tests
 * Tests for all branches of extractErrorMessage
 */

import { describe, it, expect } from 'vitest';
import { extractErrorMessage } from '~/composables/useErrorMessage';

describe('extractErrorMessage', () => {
  describe('Error instance', () => {
    it('returns error.message for an Error instance', () => {
      const err = new Error('something went wrong');
      expect(extractErrorMessage(err)).toBe('something went wrong');
    });

    it('returns custom Error subclass message', () => {
      class CustomError extends Error {}
      const err = new CustomError('custom error message');
      expect(extractErrorMessage(err)).toBe('custom error message');
    });
  });

  describe('null / non-object primitives → fallback', () => {
    it('returns default fallback for null', () => {
      expect(extractErrorMessage(null)).toBe('An error occurred');
    });

    it('returns default fallback for undefined', () => {
      expect(extractErrorMessage(undefined)).toBe('An error occurred');
    });

    it('returns default fallback for a number', () => {
      expect(extractErrorMessage(42)).toBe('An error occurred');
    });

    it('returns default fallback for a plain string', () => {
      expect(extractErrorMessage('raw string')).toBe('An error occurred');
    });

    it('returns default fallback for boolean', () => {
      expect(extractErrorMessage(false)).toBe('An error occurred');
    });

    it('uses custom fallback for null', () => {
      expect(extractErrorMessage(null, 'Custom fallback')).toBe(
        'Custom fallback',
      );
    });

    it('uses custom fallback for a number', () => {
      expect(extractErrorMessage(0, 'My fallback')).toBe('My fallback');
    });
  });

  describe('object with data.message', () => {
    it('returns data.message when present', () => {
      expect(extractErrorMessage({ data: { message: 'data message' } })).toBe(
        'data message',
      );
    });

    it('data.message takes priority over top-level e.message', () => {
      expect(
        extractErrorMessage({
          data: { message: 'data wins' },
          message: 'top level',
        }),
      ).toBe('data wins');
    });
  });

  describe('object with data.statusMessage', () => {
    it('returns data.statusMessage when data.message is absent', () => {
      expect(
        extractErrorMessage({ data: { statusMessage: 'status from data' } }),
      ).toBe('status from data');
    });

    it('data.message takes priority over data.statusMessage', () => {
      expect(
        extractErrorMessage({
          data: { message: 'msg wins', statusMessage: 'status' },
        }),
      ).toBe('msg wins');
    });
  });

  describe('object without data — top-level message / statusMessage', () => {
    it('returns e.message when data is absent', () => {
      expect(extractErrorMessage({ message: 'top message' })).toBe(
        'top message',
      );
    });

    it('returns e.statusMessage when data and message are absent', () => {
      expect(extractErrorMessage({ statusMessage: 'status msg' })).toBe(
        'status msg',
      );
    });

    it('e.message takes priority over e.statusMessage', () => {
      expect(
        extractErrorMessage({
          message: 'msg wins',
          statusMessage: 'status',
        }),
      ).toBe('msg wins');
    });
  });

  describe('object with data that has no matching fields → fallback', () => {
    it('falls back when data is an object with non-string properties', () => {
      expect(extractErrorMessage({ data: { code: 404 } })).toBe(
        'An error occurred',
      );
    });

    it('falls back when object has no recognised fields', () => {
      expect(extractErrorMessage({ foo: 'bar' })).toBe('An error occurred');
    });
  });

  describe('custom fallback string', () => {
    it('custom fallback is returned when nothing else matches', () => {
      expect(extractErrorMessage({ foo: 'bar' }, 'Fallback!')).toBe(
        'Fallback!',
      );
    });

    it('custom fallback is returned for null', () => {
      expect(extractErrorMessage(null, 'Oops')).toBe('Oops');
    });
  });
});
