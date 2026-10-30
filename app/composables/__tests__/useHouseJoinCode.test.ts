import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { useHouseJoinCode } from '~/composables/useHouseJoinCode';
import { useHouses } from '~/composables/useHouses';
import { useNotificationStore } from '~/stores/notifications';

vi.mock('~/composables/useHouses', () => ({ useHouses: vi.fn() }));
vi.mock('~/stores/notifications', () => ({ useNotificationStore: vi.fn() }));

const CODE = { code: '482913', code_expires_at: '2026-10-28T10:00:00Z' };

const getActiveInviteCode = vi.fn();
const generateInvitation = vi.fn();
const notify = { success: vi.fn(), error: vi.fn() };

const host = async (houseId = 'h-1', enabled = true) => {
  let api!: ReturnType<typeof useHouseJoinCode>;
  const id = ref<string | undefined>(houseId);
  const on = ref(enabled);
  await mountSuspended(
    defineComponent({
      setup() {
        api = useHouseJoinCode(id, on);
        return () => h('div');
      },
    }),
  );
  await flushPromises();
  return { api, id, on };
};

describe('useHouseJoinCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActiveInviteCode.mockResolvedValue({ data: CODE, error: null });
    vi.mocked(useHouses).mockReturnValue({
      getActiveInviteCode,
      generateInvitation,
    } as unknown as ReturnType<typeof useHouses>);
    vi.mocked(useNotificationStore).mockReturnValue(
      notify as unknown as ReturnType<typeof useNotificationStore>,
    );
  });

  it('loads the active code when enabled', async () => {
    const { api } = await host();
    expect(getActiveInviteCode).toHaveBeenCalledWith('h-1');
    expect(api.joinCode.value).toEqual(CODE);
    expect(api.loading.value).toBe(false);
  });

  it('does not ask the server when the user cannot invite', async () => {
    const { api } = await host('h-1', false);
    expect(getActiveInviteCode).not.toHaveBeenCalled();
    expect(api.joinCode.value).toBeNull();
  });

  it('flags a load error', async () => {
    getActiveInviteCode.mockResolvedValue({ data: null, error: 'boom' });
    const { api } = await host();
    expect(api.hasError.value).toBe(true);
    expect(api.joinCode.value).toBeNull();
  });

  it('shows the freshly generated code', async () => {
    getActiveInviteCode.mockResolvedValue({ data: null, error: null });
    generateInvitation.mockResolvedValue({
      data: { token: 't', code: '111222', code_expires_at: 'x' },
      error: null,
    });
    const { api } = await host();
    await api.generate();
    expect(generateInvitation).toHaveBeenCalledWith('h-1');
    expect(api.joinCode.value).toEqual({
      code: '111222',
      code_expires_at: 'x',
    });
    expect(api.generating.value).toBe(false);
  });

  it('keeps the old code and flags an error when generating fails', async () => {
    generateInvitation.mockResolvedValue({ data: null, error: 'nope' });
    const { api } = await host();
    await api.generate();
    expect(api.joinCode.value).toEqual(CODE);
    expect(api.hasError.value).toBe(true);
  });

  it('copies the code and confirms it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { api } = await host();
    await api.copy();
    expect(writeText).toHaveBeenCalledWith('482913');
    expect(notify.success).toHaveBeenCalledWith(
      'houseProfile.joinCode.copied',
      '',
      { i18n: true },
    );
    vi.unstubAllGlobals();
  });
});
