import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('useLoading', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('initial state', () => {
    it('starts with isLoading false', async () => {
      const { useLoading } = await import('~/composables/useLoading');
      const { isLoading } = useLoading();
      expect(isLoading.value).toBe(false);
    });

    it('starts with zero active requests', async () => {
      const { useLoading } = await import('~/composables/useLoading');
      const { activeRequests } = useLoading();
      expect(activeRequests.value).toBe(0);
    });
  });

  describe('startLoading', () => {
    it('sets isLoading to true', async () => {
      const { useLoading } = await import('~/composables/useLoading');
      const { isLoading, startLoading, forceStopLoading } = useLoading();
      forceStopLoading(); // ensure clean state
      startLoading();
      expect(isLoading.value).toBe(true);
      forceStopLoading(); // cleanup
    });

    it('increments active requests counter', async () => {
      const { useLoading } = await import('~/composables/useLoading');
      const { activeRequests, startLoading, forceStopLoading } = useLoading();
      forceStopLoading();
      startLoading();
      expect(activeRequests.value).toBe(1);
      forceStopLoading();
    });

    it('handles multiple concurrent requests', async () => {
      const { useLoading } = await import('~/composables/useLoading');
      const { activeRequests, isLoading, startLoading, forceStopLoading } =
        useLoading();
      forceStopLoading();
      startLoading();
      startLoading();
      startLoading();
      expect(activeRequests.value).toBe(3);
      expect(isLoading.value).toBe(true);
      forceStopLoading();
    });
  });

  describe('stopLoading', () => {
    it('decrements active requests counter', async () => {
      const { useLoading } = await import('~/composables/useLoading');
      const { activeRequests, startLoading, stopLoading, forceStopLoading } =
        useLoading();
      forceStopLoading();
      startLoading();
      startLoading();
      stopLoading();
      expect(activeRequests.value).toBe(1);
      forceStopLoading();
    });

    it('sets isLoading to false when all requests complete', async () => {
      const { useLoading } = await import('~/composables/useLoading');
      const { isLoading, startLoading, stopLoading, forceStopLoading } =
        useLoading();
      forceStopLoading();
      startLoading();
      stopLoading();
      expect(isLoading.value).toBe(false);
    });

    it('does not decrement below zero', async () => {
      const { useLoading } = await import('~/composables/useLoading');
      const { activeRequests, isLoading, stopLoading, forceStopLoading } =
        useLoading();
      forceStopLoading();
      stopLoading();
      stopLoading();
      expect(activeRequests.value).toBe(0);
      expect(isLoading.value).toBe(false);
    });

    it('does not stop loading if other requests are still active', async () => {
      const { useLoading } = await import('~/composables/useLoading');
      const { isLoading, startLoading, stopLoading, forceStopLoading } =
        useLoading();
      forceStopLoading();
      startLoading();
      startLoading();
      stopLoading();
      expect(isLoading.value).toBe(true);
      forceStopLoading();
    });
  });

  describe('forceStopLoading', () => {
    it('resets all loading state immediately', async () => {
      const { useLoading } = await import('~/composables/useLoading');
      const { activeRequests, isLoading, startLoading, forceStopLoading } =
        useLoading();
      startLoading();
      startLoading();
      startLoading();
      forceStopLoading();
      expect(activeRequests.value).toBe(0);
      expect(isLoading.value).toBe(false);
    });

    it('works when no requests are active', async () => {
      const { useLoading } = await import('~/composables/useLoading');
      const { activeRequests, isLoading, forceStopLoading } = useLoading();
      forceStopLoading();
      expect(activeRequests.value).toBe(0);
      expect(isLoading.value).toBe(false);
    });
  });

  describe('reactivity', () => {
    it('isLoading reacts to startLoading and stopLoading', async () => {
      const { useLoading } = await import('~/composables/useLoading');
      const { isLoading, startLoading, stopLoading, forceStopLoading } =
        useLoading();
      forceStopLoading();
      expect(isLoading.value).toBe(false);
      startLoading();
      expect(isLoading.value).toBe(true);
      stopLoading();
      expect(isLoading.value).toBe(false);
    });
  });
});
