import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import PrivacyPage from '~/pages/settings/privacy.vue';

import { useApi } from '~/composables/useApi';

vi.mock('~/composables/useApi', () => ({ useApi: vi.fn() }));

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

let mockRoute = { query: {} as Record<string, string> };
mockNuxtImport('useRoute', () => () => mockRoute);

const navigateToMock = vi.hoisted(() => vi.fn());
mockNuxtImport('navigateTo', () => navigateToMock);

const mockRefreshFn = vi.hoisted(() => vi.fn());
const mockMeDataRef = ref<{ data?: Record<string, unknown> } | null>(null);
mockNuxtImport('useFetch', () => () => ({
  data: mockMeDataRef,
  refresh: mockRefreshFn,
}));

const G = {
  mocks: { $t: (k: string) => k },
  stubs: {
    NuxtLink: true,
    Teleport: true,
    GdprDataExport: { name: 'GdprDataExport', template: '<div />' },
    GdprAccountDeletion: {
      name: 'GdprAccountDeletion',
      template: '<div />',
      props: ['deletedAt'],
      emits: ['cancelled', 'deleted'],
    },
  },
};

const sharedApiFetch = vi.hoisted(() => vi.fn());

describe('Settings Privacy Page', () => {
  let mockApiFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setActivePinia(createPinia());
    mockRoute = { query: {} };
    mockMeDataRef.value = null;
    mockRefreshFn.mockClear();
    navigateToMock.mockClear();
    // Shared instance: the consents store captures the api once per app.
    mockApiFetch = sharedApiFetch;
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue(undefined);
    useConsentsStore().consents = [];
    vi.mocked(useApi).mockReturnValue({
      fetch: mockApiFetch,
    } as unknown as ReturnType<typeof useApi>);
  });

  it('mounts', async () => {
    const wrapper = await mountSuspended(PrivacyPage, { global: G });
    expect(wrapper.exists()).toBe(true);
  });

  it('renders the primary GDPR sections: export, docs, consent, danger zone', async () => {
    const wrapper = await mountSuspended(PrivacyPage, { global: G });
    expect(wrapper.findComponent({ name: 'GdprDataExport' }).exists()).toBe(
      true,
    );
    expect(
      wrapper.findComponent({ name: 'GdprAccountDeletion' }).exists(),
    ).toBe(true);
    expect(wrapper.text()).toContain('gdpr.settingsTitle');
    expect(wrapper.text()).toContain('gdpr.consentSection');
    expect(wrapper.text()).toContain('gdpr.dangerZone');
  });

  it('passes the user deleted_at as deletedAt prop to GdprAccountDeletion', async () => {
    mockMeDataRef.value = { data: { deleted_at: '2026-01-15T00:00:00Z' } };
    const wrapper = await mountSuspended(PrivacyPage, { global: G });
    expect(
      wrapper.findComponent({ name: 'GdprAccountDeletion' }).props('deletedAt'),
    ).toBe('2026-01-15T00:00:00Z');
  });

  it('defaults deletedAt to null when user data has no deleted_at (empty state)', async () => {
    mockMeDataRef.value = { data: {} };
    const wrapper = await mountSuspended(PrivacyPage, { global: G });
    expect(
      wrapper.findComponent({ name: 'GdprAccountDeletion' }).props('deletedAt'),
    ).toBeNull();
  });

  it('shows the "Accepted" consent badge when terms_accepted_at is set', async () => {
    mockMeDataRef.value = {
      data: {
        terms_accepted_at: '2026-01-15T00:00:00Z',
        consent_version: 1,
      },
    };
    const wrapper = await mountSuspended(PrivacyPage, { global: G });
    expect(wrapper.text()).toContain('gdpr.consentAccepted');
    expect(wrapper.text()).not.toContain('gdpr.consentPending');
  });

  it('hides the "Accepted" consent badge and shows a pending state when terms_accepted_at is null', async () => {
    mockMeDataRef.value = { data: { terms_accepted_at: null } };
    const wrapper = await mountSuspended(PrivacyPage, { global: G });
    expect(wrapper.text()).not.toContain('gdpr.consentAccepted');
    expect(wrapper.text()).toContain('gdpr.consentPending');
    expect(wrapper.text()).toContain('gdpr.consentNotAcceptedYet');
  });

  it('calls the cancel-delete API when a cancel_token is present in the query', async () => {
    mockRoute = { query: { cancel_token: 'tok-123' } };
    await mountSuspended(PrivacyPage, { global: G });
    await flushPromises();
    expect(mockApiFetch).toHaveBeenCalledWith('/api/gdpr/cancel-delete', {
      method: 'POST',
      body: { token: 'tok-123' },
    });
    expect(mockRefreshFn).toHaveBeenCalled();
    expect(navigateToMock).toHaveBeenCalledWith('/settings/privacy', {
      replace: true,
    });
  });

  it('shows the i18n cancellation-failed message when cancel-delete fails', async () => {
    mockRoute = { query: { cancel_token: 'bad-token' } };
    mockApiFetch.mockRejectedValue(new Error('expired'));
    const wrapper = await mountSuspended(PrivacyPage, { global: G });
    await flushPromises();
    // Routed through t() now — see i18n/locales/{en,it}.json gdpr.cancelDeletionFailed.
    expect(wrapper.find('[role="alert"]').text()).toContain(
      'gdpr.cancelDeletionFailed',
    );
    expect(mockRefreshFn).not.toHaveBeenCalled();
    expect(navigateToMock).toHaveBeenCalledWith('/settings/privacy', {
      replace: true,
    });
  });

  it('does not call the cancel-delete API when no cancel_token is present', async () => {
    await mountSuspended(PrivacyPage, { global: G });
    await flushPromises();
    expect(mockApiFetch).not.toHaveBeenCalledWith(
      '/api/gdpr/cancel-delete',
      expect.anything(),
    );
    expect(navigateToMock).not.toHaveBeenCalled();
  });

  it('navigates home when GdprAccountDeletion emits "deleted"', async () => {
    const wrapper = await mountSuspended(PrivacyPage, { global: G });
    await wrapper
      .findComponent({ name: 'GdprAccountDeletion' })
      .vm.$emit('deleted');
    expect(navigateToMock).toHaveBeenCalledWith('/');
  });

  it('refreshes user data when GdprAccountDeletion emits "cancelled"', async () => {
    const wrapper = await mountSuspended(PrivacyPage, { global: G });
    await wrapper
      .findComponent({ name: 'GdprAccountDeletion' })
      .vm.$emit('cancelled');
    expect(mockRefreshFn).toHaveBeenCalledTimes(1);
  });

  describe('profile sharing', () => {
    const consent = {
      id: 'c-1',
      purpose: 'profile_sharing',
      version: 2,
      granted_at: '2026-10-26T00:00:00Z',
      withdrawn_at: null,
    };
    const confirmButton = (w: Awaited<ReturnType<typeof mountSuspended>>) =>
      w
        .findAll('button')
        .find(
          (b: { text: () => string }) =>
            b.text() === 'gdpr.sharing.confirmButton',
        );

    it('shows the switch reflecting the current consent', async () => {
      mockApiFetch.mockResolvedValue({ data: [consent] });
      const wrapper = await mountSuspended(PrivacyPage, { global: G });
      await flushPromises();
      expect(wrapper.find('[role="switch"]').attributes('aria-checked')).toBe(
        'true',
      );
    });

    it('asks for confirmation before withdrawing, then withdraws', async () => {
      mockApiFetch.mockImplementation(
        async (url: string, opts?: { method?: string }) =>
          opts?.method === 'DELETE' ? {} : { data: [consent] },
      );
      const wrapper = await mountSuspended(PrivacyPage, { global: G });
      await flushPromises();
      await wrapper.find('[role="switch"]').trigger('click');
      expect(mockApiFetch).not.toHaveBeenCalledWith(
        '/api/users/me/consents/profile_sharing',
        expect.anything(),
      );
      expect(wrapper.find('[role="switch"]').attributes('aria-checked')).toBe(
        'true',
      );
      await confirmButton(wrapper)!.trigger('click');
      await flushPromises();
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/users/me/consents/profile_sharing',
        { method: 'DELETE' },
      );
      expect(wrapper.find('[role="switch"]').attributes('aria-checked')).toBe(
        'false',
      );
    });

    it('grants the consent when turned on', async () => {
      mockApiFetch.mockImplementation(
        async (url: string, opts?: { method?: string }) =>
          opts?.method === 'POST' ? { data: consent } : { data: [] },
      );
      const wrapper = await mountSuspended(PrivacyPage, { global: G });
      await flushPromises();
      await wrapper.find('[role="switch"]').trigger('click');
      await flushPromises();
      expect(mockApiFetch).toHaveBeenCalledWith('/api/users/me/consents', {
        method: 'POST',
        body: { purpose: 'profile_sharing' },
      });
    });
  });
});
