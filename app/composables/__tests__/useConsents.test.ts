import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useApi } from '~/composables/useApi';
import { useConsents } from '~/composables/useConsents';

vi.mock('~/composables/useApi', () => ({ useApi: vi.fn() }));

describe('useConsents', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.mocked(useApi).mockReturnValue({ fetch: mockFetch } as never);
  });

  it('listConsents returns data', async () => {
    mockFetch.mockResolvedValue({ data: [{ id: 'c-1' }] });
    expect(await useConsents().listConsents()).toEqual([{ id: 'c-1' }]);
    expect(mockFetch).toHaveBeenCalledWith('/api/users/me/consents');
  });

  it('listConsents returns null on error', async () => {
    mockFetch.mockRejectedValue(new Error('x'));
    expect(await useConsents().listConsents()).toBeNull();
  });

  it('grantConsent POSTs the purpose', async () => {
    mockFetch.mockResolvedValue({ data: { id: 'c-1' } });
    const r = await useConsents().grantConsent('profile_sharing');
    expect(mockFetch).toHaveBeenCalledWith('/api/users/me/consents', {
      method: 'POST',
      body: { purpose: 'profile_sharing' },
    });
    expect(r).toEqual({ id: 'c-1' });
  });

  it('grantConsent returns null on error', async () => {
    mockFetch.mockRejectedValue(new Error('x'));
    expect(await useConsents().grantConsent('profile_sharing')).toBeNull();
  });

  it('withdrawConsent DELETEs and reports success/failure', async () => {
    mockFetch.mockResolvedValue({ success: true });
    expect(await useConsents().withdrawConsent('profile_sharing')).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/users/me/consents/profile_sharing',
      { method: 'DELETE' },
    );
    mockFetch.mockRejectedValue(new Error('x'));
    expect(await useConsents().withdrawConsent('profile_sharing')).toBe(false);
  });

  it('acceptTerms POSTs the three confirmations', async () => {
    mockFetch.mockResolvedValue({});
    expect(await useConsents().acceptTerms()).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('/api/users/me/accept-terms', {
      method: 'POST',
      body: {
        terms_accepted: true,
        privacy_acknowledged: true,
        age_confirmed: true,
      },
    });
  });

  it('acceptTerms returns false on error', async () => {
    mockFetch.mockRejectedValue(new Error('x'));
    expect(await useConsents().acceptTerms()).toBe(false);
  });
});
