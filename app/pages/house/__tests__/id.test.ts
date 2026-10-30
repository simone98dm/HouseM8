import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { ref, computed } from 'vue';
import HousePage from '~/pages/house/[id].vue';
import { createMockHouse, createMockHouseMember } from '~/tests/utils';

const state = vi.hoisted(() => ({
  isOwner: false,
  handleEditHouse: vi.fn(),
  editError: { value: '' } as { value: string },
}));

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

mockNuxtImport('useHouseDetailsPage', () => () => {
  const members = [
    createMockHouseMember({
      user_id: 'owner-1',
      role: 'owner',
      user: { id: 'owner-1', first_name: 'Ada', last_name: 'Rossi' },
    }),
  ];
  return {
    house: ref(
      createMockHouse({
        id: 'h1',
        owner_id: 'owner-1',
        members,
        description: 'Hi',
      }),
    ),
    loading: ref(false),
    error: ref(''),
    showInvitationModal: ref(false),
    inviteLoading: ref(false),
    inviteError: ref(''),
    roleLoading: ref(false),
    memberActionError: ref(''),
    memberActionUserId: ref(null),
    isOwner: ref(state.isOwner),
    isCurrentUserOwner: ref(state.isOwner),
    canViewHouse: ref(true),
    activeMembers: computed(() => members),
    canInviteMembers: ref(false),
    enableInvitation: ref(false),
    isFull: ref(false),
    ownerMember: computed(() => members[0]),
    showLeaveModal: ref(false),
    showArchiveConfirm: ref(false),
    archiveLoading: ref(false),
    handleLeft: vi.fn(),
    handleArchiveHouse: vi.fn(),
    loadHouseDetails: vi.fn(),
    handleEditHouse: state.handleEditHouse,
    editError: state.editError,
    editLoading: ref(false),
    navigateToUser: vi.fn(),
    handleRoleUpdate: vi.fn(),
    handleTransferOwnership: vi.fn(),
    handleRemoveMember: vi.fn(),
    handleInviteMember: vi.fn(),
  };
});

mockNuxtImport('useHouseSummary', () => () => ({
  summary: ref(null),
  balance: ref(null),
}));
mockNuxtImport('useHouseJoinCode', () => () => ({
  joinCode: ref(null),
  loading: ref(false),
  generating: ref(false),
  hasError: ref(false),
  generate: vi.fn(),
  copy: vi.fn(),
}));
mockNuxtImport('useExpensesStore', () => () => ({
  initialize: vi.fn(),
  expenses: [],
}));
mockNuxtImport('useBillsStore', () => () => ({ bills: [] }));
mockNuxtImport('useUserStore', () => () => ({
  currentUser: { id: 'owner-1' },
}));

const stubs = {
  Icon: true,
  AppPageHeader: true,
  HouseInformationCard: true,
  HouseMoneySnapshot: true,
  HouseMembersCard: true,
  HouseBillsPreview: true,
  HouseInvitationModal: true,
  UserLeaveHouseModal: true,
  UiConfirmModal: true,
};

const render = async (isOwner: boolean) => {
  state.isOwner = isOwner;
  return mountSuspended(HousePage, { global: { stubs } });
};

const ERROR_TEXT = 'Save failed';
const section = (w: Awaited<ReturnType<typeof render>>, title: string) =>
  w.findAll('section').find((s) => s.find('h2').text() === title)!;
const editButton = (el: { findAll: (s: string) => { text: () => string }[] }) =>
  el.findAll('button').find((b) => b.text() === 'houseProfile.edit');

describe('house/[id] page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.editError.value = '';
  });

  it('gives the owner Edit on Key facts and About, and Archive in the danger zone', async () => {
    const w = await render(true);
    expect(editButton(section(w, 'houseProfile.keyFacts.title'))).toBeTruthy();
    expect(editButton(section(w, 'houseProfile.about.title'))).toBeTruthy();
    const danger = w.text();
    expect(danger).toContain('houseProfile.danger.archive');
    expect(danger).not.toContain('houseProfile.danger.leave');
  });

  it('gives a non-owner no Edit buttons and a Leave action', async () => {
    const w = await render(false);
    expect(w.text()).not.toContain('houseProfile.edit');
    expect(w.text()).toContain('houseProfile.danger.leave');
    expect(w.text()).not.toContain('houseProfile.danger.archive');
  });

  const openAndSave = async (
    w: Awaited<ReturnType<typeof render>>,
    title: string,
  ) => {
    const card = section(w, title);
    await (
      editButton(card) as unknown as { trigger: (e: string) => Promise<void> }
    ).trigger('click');
    await w.find('form').trigger('submit');
    await vi.waitFor(() => expect(state.handleEditHouse).toHaveBeenCalled());
  };

  it('shows a failed key-facts save only in the Key facts card', async () => {
    state.handleEditHouse.mockImplementation(async () => {
      state.editError.value = ERROR_TEXT;
      return false;
    });
    const w = await render(true);
    await openAndSave(w, 'houseProfile.keyFacts.title');
    await vi.waitFor(() =>
      expect(section(w, 'houseProfile.keyFacts.title').text()).toContain(
        ERROR_TEXT,
      ),
    );
    expect(section(w, 'houseProfile.about.title').text()).not.toContain(
      ERROR_TEXT,
    );
  });

  it('shows a failed About save only in the About card', async () => {
    state.handleEditHouse.mockImplementation(async () => {
      state.editError.value = ERROR_TEXT;
      return false;
    });
    const w = await render(true);
    await openAndSave(w, 'houseProfile.about.title');
    await vi.waitFor(() =>
      expect(section(w, 'houseProfile.about.title').text()).toContain(
        ERROR_TEXT,
      ),
    );
    expect(section(w, 'houseProfile.keyFacts.title').text()).not.toContain(
      ERROR_TEXT,
    );
  });

  it('sends the About description as a patch', async () => {
    state.handleEditHouse.mockResolvedValue(true);
    const w = await render(true);
    await openAndSave(w, 'houseProfile.about.title');
    expect(state.handleEditHouse).toHaveBeenCalledWith({ description: 'Hi' });
  });
});
