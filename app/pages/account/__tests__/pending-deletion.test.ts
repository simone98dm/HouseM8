import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises, type DOMWrapper } from '@vue/test-utils';
import PendingDeletionPage from '~/pages/account/pending-deletion.vue';

import { useUserStore } from '~/stores/user';
import { useAuth } from '~/composables/useAuth';
import { ALREADY_CANCELLED } from '~/composables/useUser';
import { uiButtonStub } from '~/tests/utils';

const getHouseNames = vi.hoisted(() => vi.fn());

vi.mock('~/stores/user', () => ({ useUserStore: vi.fn() }));
vi.mock('~/stores/houses', () => ({
  useHousesStore: () => ({ getHouseNames }),
}));
vi.mock('~/composables/useAuth', () => ({ useAuth: vi.fn() }));

// Renders `key|param=value|...` so tests can assert on keys and params.
mockNuxtImport('useI18n', () => () => ({
  t: (key: string, params?: Record<string, unknown>) =>
    params && typeof params === 'object'
      ? [key, ...Object.entries(params).map(([k, v]) => `${k}=${v}`)].join('|')
      : key,
  locale: { value: 'en' },
}));

const navigateToMock = vi.hoisted(() => vi.fn());
mockNuxtImport('navigateTo', () => navigateToMock);

const DAY_MS = 86_400_000;
const inDays = (days: number) => new Date(Date.now() + days * DAY_MS);

const baseGlobal = {
  mocks: { $t: (k: string) => k },
  stubs: {
    NuxtLink: { template: '<a :href="to"><slot /></a>', props: ['to'] },
    AuthShell: { template: '<div><slot /></div>' },
  },
};
const G = {
  ...baseGlobal,
  stubs: { ...baseGlobal.stubs, UiButton: uiButtonStub },
};

type Wrapper = Awaited<ReturnType<typeof mountSuspended>>;

interface StoreOverrides {
  currentUser?: Record<string, unknown>;
  pendingSummary?: unknown;
  isPendingSummaryLoading?: boolean;
  pendingSummaryError?: unknown;
}

describe('pending-deletion page', () => {
  let cancelDeletion: ReturnType<typeof vi.fn>;
  let exportData: ReturnType<typeof vi.fn>;
  let signOut: ReturnType<typeof vi.fn>;
  let fetchCurrentUser: ReturnType<typeof vi.fn>;
  let loadPendingSummary: ReturnType<typeof vi.fn>;

  const buttons = (wrapper: Wrapper): DOMWrapper<HTMLButtonElement>[] =>
    wrapper.findAll('button');

  const setStore = (overrides: StoreOverrides = {}) => {
    vi.mocked(useUserStore).mockReturnValue({
      currentUser: {
        id: 'u1',
        pending_deletion: true,
        deletion_scheduled_for: inDays(10).toISOString(),
        deleted_at: inDays(-20).toISOString(),
        ...overrides.currentUser,
      },
      cancelDeletion,
      exportData,
      loadPendingSummary,
      pendingSummary: overrides.pendingSummary ?? null,
      isPendingSummaryLoading: overrides.isPendingSummaryLoading ?? false,
      pendingSummaryError: overrides.pendingSummaryError ?? null,
      fetchCurrentUser,
    } as unknown as ReturnType<typeof useUserStore>);
  };

  const mountPage = (global: Record<string, unknown> = G) =>
    mountSuspended(PendingDeletionPage, { global });

  const summaryOf = (
    counterparts: Array<{ id: string; first: string; net: number }>,
    houseName = 'Casa',
  ) => ({
    houses: [
      {
        id: 'h1',
        name: houseName,
        currency: 'EUR',
        counterparts: counterparts.map((c) => ({
          user: { id: c.id, first_name: c.first, last_name: 'Rossi' },
          net_cents: c.net,
        })),
      },
    ],
  });

  beforeEach(() => {
    navigateToMock.mockClear();
    getHouseNames.mockReset().mockResolvedValue([]);
    cancelDeletion = vi.fn();
    exportData = vi.fn();
    signOut = vi.fn().mockResolvedValue({ data: {}, error: null });
    fetchCurrentUser = vi.fn().mockResolvedValue(undefined);
    loadPendingSummary = vi.fn();
    setStore();
    vi.mocked(useAuth).mockReturnValue({
      signOut,
    } as unknown as ReturnType<typeof useAuth>);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('header and actions', () => {
    it('loads the pending summary on mount', async () => {
      await mountPage();
      expect(loadPendingSummary).toHaveBeenCalledTimes(1);
    });

    it('cancels on arrival from the email cancel link', async () => {
      cancelDeletion.mockResolvedValue({
        result: { restored_house_ids: [], subscription_restored: null },
        error: null,
      });
      await mountSuspended(PendingDeletionPage, {
        global: G,
        route: '/account/pending-deletion?cancel_token=tok',
      });
      await flushPromises();
      expect(cancelDeletion).toHaveBeenCalledTimes(1);
    });

    it('does not cancel on a plain visit', async () => {
      await mountPage();
      await flushPromises();
      expect(cancelDeletion).not.toHaveBeenCalled();
    });

    it('orders the buttons Keep, Download, then Sign out', async () => {
      const wrapper = await mountPage();
      expect(buttons(wrapper).map((b) => b.text())).toEqual([
        'pendingDeletion.actions.cancel',
        'pendingDeletion.actions.export',
        'pendingDeletion.actions.signOut',
      ]);
    });

    it('makes Keep my account the primary action', async () => {
      const wrapper = await mountPage({
        ...baseGlobal,
        stubs: { ...baseGlobal.stubs },
      });
      const keep = buttons(wrapper)[0]!;
      expect(keep.classes().join(' ')).toMatch(/primary|bg-brand/);
    });

    it('places a divider between Download and Sign out', async () => {
      const wrapper = await mountPage();
      const form = wrapper.find('.auth-form');
      const children = Array.from(form.element.children).map((el) =>
        el.tagName === 'HR' ? 'hr' : el.textContent?.trim(),
      );
      expect(children).toEqual([
        'pendingDeletion.actions.cancel',
        'pendingDeletion.actions.export',
        'hr',
        'pendingDeletion.actions.signOut',
      ]);
    });
  });

  describe('subtitle', () => {
    it('shows days left with the date for several days', async () => {
      setStore({
        currentUser: { deletion_scheduled_for: inDays(10).toISOString() },
      });
      const wrapper = await mountPage();
      expect(wrapper.find('.pending-sub').text()).toMatch(
        /^pendingDeletion\.daysLeft\|n=10\|date=.+/,
      );
    });

    it('shows one day left when the date is within a day', async () => {
      setStore({
        currentUser: { deletion_scheduled_for: inDays(0.5).toISOString() },
      });
      const wrapper = await mountPage();
      expect(wrapper.find('.pending-sub').text()).toContain('n=1|');
    });

    it('uses the "past" wording when the scheduled date has passed', async () => {
      setStore({
        currentUser: { deletion_scheduled_for: inDays(-2).toISOString() },
      });
      const wrapper = await mountPage();
      expect(wrapper.find('.pending-sub').text()).toBe(
        'pendingDeletion.scheduledPast',
      );
    });

    it('falls back to the 30-day window when there is no scheduled date', async () => {
      setStore({ currentUser: { deletion_scheduled_for: null } });
      const wrapper = await mountPage();
      expect(wrapper.find('.pending-sub').text()).toBe(
        'pendingDeletion.scheduledSoon|days=30',
      );
    });

    it('falls back to the 30-day window for an invalid date', async () => {
      setStore({ currentUser: { deletion_scheduled_for: 'not-a-date' } });
      const wrapper = await mountPage();
      expect(wrapper.find('.pending-sub').text()).toBe(
        'pendingDeletion.scheduledSoon|days=30',
      );
    });

    it('shows the request date from deleted_at', async () => {
      const wrapper = await mountPage();
      expect(wrapper.find('.requested').text()).toMatch(
        /^pendingDeletion\.requestedOn\|date=.+/,
      );
    });

    it('derives the request date from the scheduled date when deleted_at is missing', async () => {
      setStore({ currentUser: { deleted_at: null } });
      const wrapper = await mountPage();
      expect(wrapper.find('.requested').exists()).toBe(true);
    });

    it('omits the request line when there is no date at all', async () => {
      setStore({
        currentUser: { deleted_at: null, deletion_scheduled_for: null },
      });
      const wrapper = await mountPage();
      expect(wrapper.find('.requested').exists()).toBe(false);
    });

    it('uses the date-less balances bullet without a scheduled date', async () => {
      setStore({ currentUser: { deletion_scheduled_for: null } });
      const wrapper = await mountPage();
      expect(wrapper.text()).toContain('pendingDeletion.points.balancesNoDate');
    });
  });

  describe('balances summary', () => {
    const section = (wrapper: Wrapper) =>
      wrapper.find('section[aria-labelledby="pending-balances"]');

    it('shows a skeleton status region and marks the section busy while loading', async () => {
      setStore({ isPendingSummaryLoading: true });
      const wrapper = await mountPage();
      const status = section(wrapper).find('[role="status"]');
      expect(status.find('.sr-only').text()).toBe(
        'pendingDeletion.balances.loading',
      );
      expect(section(wrapper).attributes('aria-busy')).toBe('true');
    });

    it('is not busy once the summary is loaded', async () => {
      setStore({ pendingSummary: { houses: [] } });
      const wrapper = await mountPage();
      expect(section(wrapper).attributes('aria-busy')).toBe('false');
      expect(section(wrapper).find('[role="status"]').exists()).toBe(false);
    });

    it('renders all three directions and skips even counterparts', async () => {
      setStore({
        pendingSummary: summaryOf([
          { id: 'a', first: 'Anna', net: 1250 },
          { id: 'b', first: 'Bruno', net: -300 },
          { id: 'c', first: 'Carla', net: 0 },
        ]),
      });
      const wrapper = await mountPage();
      const items = section(wrapper)
        .findAll('li')
        .map((li: DOMWrapper<Element>) => li.text());
      expect(section(wrapper).find('h3').text()).toBe('Casa');
      expect(items).toHaveLength(2);
      expect(items[0]).toContain('Anna Rossi owes you');
      expect(items[0]).toContain('12.50');
      expect(items[1]).toContain('You owe Bruno Rossi');
      expect(items[1]).toContain('3.00');
      expect(section(wrapper).text()).not.toContain('Carla');
    });

    it('falls back to "someone" when a housemate has no name', async () => {
      setStore({
        pendingSummary: {
          houses: [
            {
              id: 'h1',
              name: 'Casa',
              currency: 'EUR',
              counterparts: [
                {
                  user: { id: 'x', first_name: null, last_name: null },
                  net_cents: 500,
                },
              ],
            },
          ],
        },
      });
      const wrapper = await mountPage();
      expect(section(wrapper).find('li').text()).toContain(
        'pendingDeletion.balances.someone owes',
      );
    });

    it('shows the no open balances line when everyone is even', async () => {
      setStore({
        pendingSummary: summaryOf([{ id: 'a', first: 'Anna', net: 0 }]),
      });
      const wrapper = await mountPage();
      expect(section(wrapper).find('.balances-empty').text()).toBe(
        'pendingDeletion.balances.none',
      );
      expect(section(wrapper).find('li').exists()).toBe(false);
    });

    it('shows the no open balances line when there are no houses', async () => {
      setStore({ pendingSummary: { houses: [] } });
      const wrapper = await mountPage();
      expect(section(wrapper).find('.balances-empty').exists()).toBe(true);
    });

    it('makes the scrollable balances list keyboard focusable', async () => {
      setStore({
        pendingSummary: summaryOf([{ id: 'a', first: 'Anna', net: 100 }]),
      });
      const wrapper = await mountPage();
      const scroll = section(wrapper).find('.balances-scroll');
      expect(scroll.attributes('tabindex')).toBe('0');
      expect(scroll.attributes('role')).toBe('group');
    });

    it('hides the section content and shows no alert when loading failed', async () => {
      setStore({ pendingSummaryError: 'boom' });
      const wrapper = await mountPage();
      expect(section(wrapper).find('li').exists()).toBe(false);
      expect(section(wrapper).find('.balances-empty').exists()).toBe(false);
      expect(section(wrapper).find('[role="status"]').exists()).toBe(false);
      expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    });

    it('always renders the generic open-balances bullet as the 4th point', async () => {
      const cases: StoreOverrides[] = [
        {},
        { isPendingSummaryLoading: true },
        { pendingSummaryError: 'boom' },
        { pendingSummary: summaryOf([{ id: 'a', first: 'Anna', net: 100 }]) },
      ];
      for (const overrides of cases) {
        setStore(overrides);
        const wrapper = await mountPage();
        const items = wrapper
          .find('section[aria-labelledby="pending-what-happens"]')
          .findAll('li');
        expect(items).toHaveLength(4);
        expect(items[3]!.text()).toContain('pendingDeletion.points.balances|');
      }
    });
  });

  describe('cancelling deletion', () => {
    const clickCancel = async (wrapper: Wrapper) => {
      await buttons(wrapper)[0]!.trigger('click');
      await flushPromises();
    };

    it('shows restored state with the looked-up house names', async () => {
      cancelDeletion.mockResolvedValue({
        result: {
          restored_house_ids: ['h1', 'h2'],
          subscription_restored: true,
        },
        error: null,
      });
      getHouseNames.mockResolvedValue([{ name: 'Casa' }, { name: 'Mare' }]);
      const wrapper = await mountPage();
      await clickCancel(wrapper);

      expect(getHouseNames).toHaveBeenCalledWith(['h1', 'h2']);
      const body = wrapper.find('#pending-restored-body').text();
      expect(body).toContain('pendingDeletion.restored.houses|names=');
      expect(body).toContain('Casa');
      expect(body).toContain('Mare');
      expect(body).toContain('pendingDeletion.restored.subscriptionResumed');
      expect(wrapper.find('[href="/dashboard"]').exists()).toBe(true);
    });

    it('uses the fallback line when the name lookup is empty', async () => {
      cancelDeletion.mockResolvedValue({
        result: { restored_house_ids: ['h1'], subscription_restored: null },
        error: null,
      });
      const wrapper = await mountPage();
      await clickCancel(wrapper);
      expect(wrapper.find('#pending-restored-body').text()).toBe(
        'pendingDeletion.restored.housesFallback',
      );
    });

    it('omits house and subscription lines when nothing was restored', async () => {
      cancelDeletion.mockResolvedValue({
        result: { restored_house_ids: [], subscription_restored: null },
        error: null,
      });
      const wrapper = await mountPage();
      await clickCancel(wrapper);
      expect(getHouseNames).not.toHaveBeenCalled();
      expect(wrapper.find('#pending-restored-body').text()).toBe('');
      expect(wrapper.text()).not.toContain('subscriptionFailed');
    });

    it('links to subscription settings when the subscription could not be resumed', async () => {
      cancelDeletion.mockResolvedValue({
        result: { restored_house_ids: [], subscription_restored: false },
        error: null,
      });
      const wrapper = await mountPage();
      await clickCancel(wrapper);
      const link = wrapper.find('a[href="/settings/subscription"]');
      expect(link.exists()).toBe(true);
      expect(link.text()).toBe('pendingDeletion.restored.subscriptionLink');
      expect(wrapper.text()).toContain("couldn't resume your subscription");
    });

    it('shows restored without houses when already cancelled and no longer pending', async () => {
      cancelDeletion.mockResolvedValue({
        result: null,
        error: ALREADY_CANCELLED,
      });
      // Re-read the store on each access by pointing the mock at a live object.
      const live = {
        currentUser: { id: 'u1', pending_deletion: true } as Record<
          string,
          unknown
        >,
        cancelDeletion,
        exportData,
        loadPendingSummary,
        pendingSummary: null,
        isPendingSummaryLoading: false,
        pendingSummaryError: null,
        fetchCurrentUser: vi.fn(async () => {
          live.currentUser = { id: 'u1', pending_deletion: false };
        }),
      };
      vi.mocked(useUserStore).mockReturnValue(
        live as unknown as ReturnType<typeof useUserStore>,
      );
      const wrapper = await mountPage();
      await clickCancel(wrapper);

      expect(live.fetchCurrentUser).toHaveBeenCalledWith(true);
      expect(wrapper.find('#pending-restored-body').exists()).toBe(true);
      expect(wrapper.find('#pending-restored-body').text()).toBe('');
      expect(wrapper.find('[role="alert"]').exists()).toBe(false);
      expect(getHouseNames).not.toHaveBeenCalled();
    });

    it('shows the error when already cancelled but still pending', async () => {
      cancelDeletion.mockResolvedValue({
        result: null,
        error: ALREADY_CANCELLED,
      });
      const wrapper = await mountPage();
      await clickCancel(wrapper);
      expect(fetchCurrentUser).toHaveBeenCalledWith(true);
      expect(wrapper.find('[role="alert"]').text()).toContain(
        'pendingDeletion.errors.cancel',
      );
    });

    it('shows an alert for a generic failure and does not refetch the user', async () => {
      cancelDeletion.mockResolvedValue({ result: null, error: 'boom' });
      const wrapper = await mountPage();
      await clickCancel(wrapper);
      expect(fetchCurrentUser).not.toHaveBeenCalled();
      expect(wrapper.find('[role="alert"]').text()).toContain(
        'pendingDeletion.errors.cancel',
      );
    });

    it('focuses the restored heading and describes it by the body', async () => {
      cancelDeletion.mockResolvedValue({
        result: { restored_house_ids: [], subscription_restored: null },
        error: null,
      });
      const wrapper = await mountSuspended(PendingDeletionPage, {
        global: G,
        attachTo: document.body,
      });
      await clickCancel(wrapper);
      await flushPromises();

      const h1 = wrapper.find('h1');
      expect(h1.text()).toBe('pendingDeletion.restored.title');
      expect(h1.attributes('aria-describedby')).toBe('pending-restored-body');
      expect(document.activeElement).toBe(h1.element);
      wrapper.unmount();
    });
  });

  describe('export', () => {
    const stubDownload = () => {
      Object.assign(URL, {
        createObjectURL: vi.fn(() => 'blob:x'),
        revokeObjectURL: vi.fn(),
      });
      return vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {});
    };

    it('downloads the file and announces the filename in the persistent status region', async () => {
      exportData.mockResolvedValue({
        data: { blob: new Blob(['{}']), filename: 'house-m8-export-x.json' },
        error: null,
      });
      const click = stubDownload();
      const wrapper = await mountPage();
      const status = wrapper.find('p.export-ok[role="status"]');
      expect(status.text()).toBe('');

      await buttons(wrapper)[1]!.trigger('click');
      await flushPromises();

      expect(click).toHaveBeenCalled();
      expect(status.text()).toBe(
        'pendingDeletion.exported|filename=house-m8-export-x.json',
      );
      click.mockRestore();
    });

    it('clears the export message on the next action', async () => {
      exportData
        .mockResolvedValueOnce({
          data: { blob: new Blob(['{}']), filename: 'a.json' },
          error: null,
        })
        .mockResolvedValueOnce({ data: null, error: 'x' });
      const click = stubDownload();
      const wrapper = await mountPage();
      await buttons(wrapper)[1]!.trigger('click');
      await flushPromises();
      expect(wrapper.find('p.export-ok').text()).toContain('a.json');

      await buttons(wrapper)[1]!.trigger('click');
      await flushPromises();
      expect(wrapper.find('p.export-ok').text()).toBe('');
      click.mockRestore();
    });

    it('shows an alert when the export fails', async () => {
      exportData.mockResolvedValue({ data: null, error: 'x' });
      const wrapper = await mountPage();
      await buttons(wrapper)[1]!.trigger('click');
      await flushPromises();
      expect(wrapper.find('[role="alert"]').text()).toContain(
        'pendingDeletion.errors.export',
      );
      expect(wrapper.find('p.export-ok').text()).toBe('');
    });

    it('shows the rate-limit message when the export is rate limited', async () => {
      const { EXPORT_RATE_LIMITED } = await import('~/utils/download');
      exportData.mockResolvedValue({ data: null, error: EXPORT_RATE_LIMITED });
      const wrapper = await mountPage();
      await buttons(wrapper)[1]!.trigger('click');
      await flushPromises();
      expect(wrapper.find('[role="alert"]').text()).toContain(
        'errors.tooManyRequestsMessage',
      );
    });
  });

  describe('sign out', () => {
    it('signs out and goes to login', async () => {
      const wrapper = await mountPage();
      await buttons(wrapper)[2]!.trigger('click');
      await flushPromises();
      expect(signOut).toHaveBeenCalled();
      expect(navigateToMock).toHaveBeenCalledWith('/auth/login', {
        replace: true,
      });
    });

    it('shows an alert and stays when sign out fails', async () => {
      signOut.mockResolvedValue({ data: null, error: 'x' });
      const wrapper = await mountPage();
      await buttons(wrapper)[2]!.trigger('click');
      await flushPromises();
      expect(navigateToMock).not.toHaveBeenCalled();
      expect(wrapper.find('[role="alert"]').text()).toContain(
        'pendingDeletion.errors.signOut',
      );
    });
  });

  describe('focus (AC20)', () => {
    it('keeps focus on the clicked button after a failure', async () => {
      cancelDeletion.mockResolvedValue({ result: null, error: 'boom' });
      // Real UiButton (aria-disabled, not native disabled) keeps focus.
      const wrapper = await mountSuspended(PendingDeletionPage, {
        global: baseGlobal,
        attachTo: document.body,
      });
      const keep = wrapper.findAll('button')[0]!;
      (keep.element as HTMLButtonElement).focus();
      expect(document.activeElement).toBe(keep.element);

      await keep.trigger('click');
      await flushPromises();

      expect(wrapper.find('[role="alert"]').exists()).toBe(true);
      expect(document.activeElement).toBe(keep.element);
      wrapper.unmount();
    });

    it('does not start a second action while one is in flight', async () => {
      let resolve!: (v: unknown) => void;
      cancelDeletion.mockReturnValue(new Promise((r) => (resolve = r)));
      const wrapper = await mountPage();
      await buttons(wrapper)[0]!.trigger('click');
      await buttons(wrapper)[0]!.trigger('click');
      expect(cancelDeletion).toHaveBeenCalledTimes(1);
      resolve({ result: null, error: 'boom' });
      await flushPromises();
    });
  });
});
