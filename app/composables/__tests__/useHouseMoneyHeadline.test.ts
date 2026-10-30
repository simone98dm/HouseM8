import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { useHouseMoneyHeadline } from '~/composables/useHouseMoneyHeadline';

const getHouseBalance = vi.fn();
mockNuxtImport('useBalance', () => () => ({ getHouseBalance }));

const host = async (trigger = ref(0)) => {
  await mountSuspended(
    defineComponent({
      setup() {
        useHouseMoneyHeadline(() => 'h-1', trigger);
        return () => h('div');
      },
    }),
  );
  await flushPromises();
  return trigger;
};

describe('useHouseMoneyHeadline', () => {
  beforeEach(() => {
    getHouseBalance.mockReset();
    getHouseBalance.mockResolvedValue({ data: null, error: null });
  });

  it('loads the plan once on mount', async () => {
    await host();
    expect(getHouseBalance).toHaveBeenCalledTimes(1);
    expect(getHouseBalance).toHaveBeenCalledWith('h-1');
  });

  it('reloads the plan when the refresh source changes (a share was settled)', async () => {
    const trigger = await host();
    trigger.value++;
    await flushPromises();
    expect(getHouseBalance).toHaveBeenCalledTimes(2);
  });
});
