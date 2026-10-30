import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

const cookie = vi.hoisted(() => ({ value: null as string | null }));
mockNuxtImport('useCookie', () => () => cookie);

// defineNuxtPlugin is the identity for object plugins in tests.
async function run(current: string) {
  const setLocale = vi.fn().mockResolvedValue(undefined);
  const plugin = (await import('~/plugins/locale-preference')).default as {
    setup: (app: unknown) => Promise<void>;
  };
  await plugin.setup({ $i18n: { locale: { value: current }, setLocale } });
  return setLocale;
}

describe('locale-preference plugin', () => {
  beforeEach(() => {
    cookie.value = null;
  });

  it('does nothing when no language was explicitly chosen', async () => {
    expect(await run('en')).not.toHaveBeenCalled();
  });

  it('restores the saved language when it differs from the current one', async () => {
    cookie.value = 'it';
    expect(await run('en')).toHaveBeenCalledWith('it');
  });

  it('does nothing when the saved language is already active', async () => {
    cookie.value = 'it';
    expect(await run('it')).not.toHaveBeenCalled();
  });

  it('ignores unsupported cookie values', async () => {
    cookie.value = 'fr';
    expect(await run('en')).not.toHaveBeenCalled();
  });
});
