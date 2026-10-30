import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useConsents } from '~/composables/useConsents';
import { useNotificationStore } from '~/stores/notifications';
import { useConsentsStore } from '~/stores/consents';

vi.mock('~/composables/useConsents', () => ({ useConsents: vi.fn() }));
vi.mock('~/stores/notifications', () => ({ useNotificationStore: vi.fn() }));

const consent = {
  id: 'c-1',
  purpose: 'profile_sharing' as const,
  version: 2,
  granted_at: '2026-10-26T00:00:00Z',
  withdrawn_at: null,
};

describe('useConsentsStore', () => {
  let api: Record<
    'listConsents' | 'grantConsent' | 'withdrawConsent' | 'acceptTerms',
    ReturnType<typeof vi.fn>
  >;
  let notify: { addNotification: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    setActivePinia(createPinia());
    api = {
      listConsents: vi.fn(),
      grantConsent: vi.fn(),
      withdrawConsent: vi.fn(),
      acceptTerms: vi.fn(),
    };
    notify = { addNotification: vi.fn() };
    vi.mocked(useConsents).mockReturnValue(api as never);
    vi.mocked(useNotificationStore).mockReturnValue(notify as never);
  });

  it('loadConsents fills state and resets loading', async () => {
    api.listConsents.mockResolvedValue([consent]);
    const store = useConsentsStore();
    await store.loadConsents();
    expect(store.consents).toEqual([consent]);
    expect(store.hasProfileSharing).toBe(true);
    expect(store.isLoading).toBe(false);
  });

  it('loadConsents keeps state on failure', async () => {
    api.listConsents.mockResolvedValue(null);
    const store = useConsentsStore();
    await store.loadConsents();
    expect(store.consents).toEqual([]);
  });

  it('grant adds the consent once', async () => {
    api.grantConsent.mockResolvedValue(consent);
    const store = useConsentsStore();
    expect(await store.grant('profile_sharing')).toBe(true);
    await store.grant('profile_sharing');
    expect(store.consents).toHaveLength(1);
  });

  it('grant notifies on error', async () => {
    api.grantConsent.mockResolvedValue(null);
    const store = useConsentsStore();
    expect(await store.grant('profile_sharing')).toBe(false);
    expect(notify.addNotification).toHaveBeenCalledWith(
      'error',
      'errors.generic',
      'errors.consentGrantFailed',
      { i18n: true },
    );
  });

  it('withdraw removes the consent', async () => {
    api.listConsents.mockResolvedValue([consent]);
    api.withdrawConsent.mockResolvedValue(true);
    const store = useConsentsStore();
    await store.loadConsents();
    expect(await store.withdraw('profile_sharing')).toBe(true);
    expect(store.hasProfileSharing).toBe(false);
  });

  it('withdraw keeps state and notifies on error', async () => {
    api.listConsents.mockResolvedValue([consent]);
    api.withdrawConsent.mockResolvedValue(false);
    const store = useConsentsStore();
    await store.loadConsents();
    expect(await store.withdraw('profile_sharing')).toBe(false);
    expect(store.hasProfileSharing).toBe(true);
    expect(notify.addNotification).toHaveBeenCalled();
  });

  it('acceptTerms returns true and does not notify on success', async () => {
    api.acceptTerms.mockResolvedValue(true);
    const store = useConsentsStore();
    expect(await store.acceptTerms()).toBe(true);
    expect(notify.addNotification).not.toHaveBeenCalled();
    expect(store.isLoading).toBe(false);
  });

  it('acceptTerms notifies and returns false on failure', async () => {
    api.acceptTerms.mockResolvedValue(false);
    const store = useConsentsStore();
    expect(await store.acceptTerms()).toBe(false);
    expect(notify.addNotification).toHaveBeenCalledWith(
      'error',
      'errors.generic',
      'errors.consentAcceptFailed',
      { i18n: true },
    );
  });
});
