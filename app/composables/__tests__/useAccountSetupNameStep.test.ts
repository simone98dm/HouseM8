import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { defineComponent } from 'vue';
import { useAccountSetupNameStep } from '~/composables/useAccountSetupNameStep';
import { useUserApi } from '~/composables/useUserApi';

vi.mock('~/composables/useUserApi', () => ({ useUserApi: vi.fn() }));

async function setup(completeSetup: ReturnType<typeof vi.fn>) {
  vi.mocked(useUserApi).mockReturnValue({
    completeSetup,
  } as unknown as ReturnType<typeof useUserApi>);

  let api!: ReturnType<typeof useAccountSetupNameStep>;
  const Host = defineComponent({
    template: '<div />',
    setup() {
      api = useAccountSetupNameStep();
      return {};
    },
  });

  await mountSuspended(Host);
  return api;
}

describe('useAccountSetupNameStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts invalid with empty fields', async () => {
    const api = await setup(vi.fn());
    expect(api.isStep1Valid.value).toBe(false);
  });

  it('is invalid until both names are set', async () => {
    const api = await setup(vi.fn());
    api.firstName.value = 'John';
    api.lastName.value = '   ';
    expect(api.isStep1Valid.value).toBe(false);
  });

  it('is valid with a first and last name, no password needed', async () => {
    const api = await setup(vi.fn());
    api.firstName.value = 'John';
    api.lastName.value = 'Doe';
    expect(api.isStep1Valid.value).toBe(true);
  });

  it('submits trimmed values and returns true on success', async () => {
    const completeSetup = vi.fn().mockResolvedValue({ success: true });
    const api = await setup(completeSetup);
    api.firstName.value = '  John  ';
    api.lastName.value = '  Doe  ';

    const ok = await api.handleStep1();

    expect(ok).toBe(true);
    expect(completeSetup).toHaveBeenCalledWith({
      firstName: 'John',
      lastName: 'Doe',
    });
    expect(api.step1Error.value).toBe('');
  });

  it('sets a generic error and returns false when the API returns null', async () => {
    const completeSetup = vi.fn().mockResolvedValue(null);
    const api = await setup(completeSetup);

    const ok = await api.handleStep1();

    expect(ok).toBe(false);
    expect(api.step1Error.value).toBe(
      'Could not save your profile. Please try again.',
    );
  });

  it('sets a generic error and returns false when the API call throws', async () => {
    const completeSetup = vi.fn().mockRejectedValue(new Error('boom'));
    const api = await setup(completeSetup);

    const ok = await api.handleStep1();

    expect(ok).toBe(false);
    expect(api.step1Error.value).toBe(
      'Could not save your profile. Please try again.',
    );
  });

  it('clears step1Loading after the call settles', async () => {
    const completeSetup = vi.fn().mockResolvedValue({ success: true });
    const api = await setup(completeSetup);

    const promise = api.handleStep1();
    expect(api.step1Loading.value).toBe(true);
    await promise;
    expect(api.step1Loading.value).toBe(false);
  });
});
