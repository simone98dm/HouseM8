import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import DataExport from '~/components/gdpr/DataExport.vue';
import { EXPORT_RATE_LIMITED } from '~/utils/download';

const exportData = vi.hoisted(() => vi.fn());
vi.mock('~/stores/user', () => ({
  useUserStore: () => ({ exportData }),
}));

describe('DataExport', () => {
  let clicked: HTMLAnchorElement | null;

  beforeEach(() => {
    clicked = null;
    exportData.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- capture the clicked anchor
      clicked = this;
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function run() {
    const wrapper = await mountSuspended(DataExport);
    await wrapper.find('button').trigger('click');
    await flushPromises();
    return wrapper;
  }

  it('saves the server file using the store-provided filename', async () => {
    exportData.mockResolvedValue({
      data: {
        blob: new Blob(['{}']),
        filename: 'house-m8-export-2026-10-26.json',
      },
      error: null,
    });
    await run();
    expect(exportData).toHaveBeenCalledTimes(1);
    expect(clicked?.download).toBe('house-m8-export-2026-10-26.json');
  });

  it('shows an alert when the export fails', async () => {
    exportData.mockResolvedValue({ data: null, error: 'x' });
    const wrapper = await run();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(clicked).toBeNull();
  });

  it('shows the rate-limit message on 429', async () => {
    exportData.mockResolvedValue({ data: null, error: EXPORT_RATE_LIMITED });
    const wrapper = await run();
    expect(wrapper.find('[role="alert"]').text()).toMatch(/too many/i);
  });
});
