import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { defineComponent } from 'vue';
import { useAccountSetupInviteCode } from '~/composables/useAccountSetupInviteCode';
import { useUserApi } from '~/composables/useUserApi';

vi.mock('~/composables/useUserApi', () => ({ useUserApi: vi.fn() }));

async function setup(redeemInviteCode: ReturnType<typeof vi.fn>) {
  vi.mocked(useUserApi).mockReturnValue({
    redeemInviteCode,
  } as unknown as ReturnType<typeof useUserApi>);

  let api!: ReturnType<typeof useAccountSetupInviteCode>;
  const Host = defineComponent({
    template: '<div />',
    setup() {
      api = useAccountSetupInviteCode();
      return {};
    },
  });

  await mountSuspended(Host);
  return api;
}

describe('useAccountSetupInviteCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is incomplete with fewer than 6 digits', async () => {
    const api = await setup(vi.fn());
    api.inviteCode.value = '1234';
    expect(api.isCodeComplete.value).toBe(false);
  });

  it('is complete with exactly 6 digits', async () => {
    const api = await setup(vi.fn());
    api.inviteCode.value = '123456';
    expect(api.isCodeComplete.value).toBe(true);
  });

  it('redeems the code and returns true on success', async () => {
    const redeemInviteCode = vi
      .fn()
      .mockResolvedValue({ data: { house_id: 'house-1' } });
    const api = await setup(redeemInviteCode);
    api.inviteCode.value = '123456';

    const ok = await api.handleRedeemCode();

    expect(ok).toBe(true);
    expect(redeemInviteCode).toHaveBeenCalledWith('123456');
    expect(api.codeError.value).toBe('');
  });

  it('sets a generic error when the API returns null', async () => {
    const redeemInviteCode = vi.fn().mockResolvedValue(null);
    const api = await setup(redeemInviteCode);

    const ok = await api.handleRedeemCode();

    expect(ok).toBe(false);
    expect(api.codeError.value).toBe(
      "Couldn't use that invitation code. Check the code with whoever sent it, then try again.",
    );
  });

  it.each([
    [423, 'Too many failed attempts. Please try again in 15 minutes.'],
    [410, 'This invitation code has already been used.'],
    [409, 'You are already a member of this house.'],
    [400, 'Invalid or expired code. Please check and try again.'],
  ])(
    'maps HTTP status %i to the matching error message',
    async (status, message) => {
      const redeemInviteCode = vi.fn().mockRejectedValue({ status });
      const api = await setup(redeemInviteCode);

      const ok = await api.handleRedeemCode();

      expect(ok).toBe(false);
      expect(api.codeError.value).toBe(message);
    },
  );

  it('clears codeLoading after the call settles', async () => {
    const redeemInviteCode = vi
      .fn()
      .mockResolvedValue({ data: { house_id: 'house-1' } });
    const api = await setup(redeemInviteCode);

    const promise = api.handleRedeemCode();
    expect(api.codeLoading.value).toBe(true);
    await promise;
    expect(api.codeLoading.value).toBe(false);
  });

  it('remembers the joined house and never redeems the same code twice', async () => {
    const redeemInviteCode = vi
      .fn()
      .mockResolvedValue({ data: { house_id: 'house-1' } });
    const api = await setup(redeemInviteCode);
    api.inviteCode.value = '123456';

    await api.handleRedeemCode(); // OTP field: last digit typed
    const again = await api.handleRedeemCode(); // wizard finish

    expect(again).toBe(true);
    expect(redeemInviteCode).toHaveBeenCalledTimes(1);
    expect(api.joinedHouseId.value).toBe('house-1');
  });

  it('leaves joinedHouseId empty when redemption fails', async () => {
    const redeemInviteCode = vi.fn().mockRejectedValue({ status: 410 });
    const api = await setup(redeemInviteCode);

    await api.handleRedeemCode();

    expect(api.joinedHouseId.value).toBeNull();
  });
});
