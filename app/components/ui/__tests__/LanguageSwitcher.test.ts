import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import LanguageSwitcher from '~/components/ui/LanguageSwitcher.vue';

const setLocale = vi.hoisted(() => vi.fn());
const cookie = vi.hoisted(() => ({ value: null as string | null }));
const current = vi.hoisted(() => ({ value: 'en' }));

mockNuxtImport('useI18n', () => () => ({
  t: (k: string) => k,
  locale: current,
  setLocale,
}));
mockNuxtImport('useCookie', () => () => cookie);

const G = { mocks: { $t: (k: string) => k } };
const mount = () => mountSuspended(LanguageSwitcher, { global: G });

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    setLocale.mockReset().mockResolvedValue(undefined);
    cookie.value = null;
    current.value = 'en';
  });

  it('renders a labelled select with both languages named in their own language', async () => {
    const wrapper = await mount();
    const id = wrapper.find('select').attributes('id');
    expect(id).toBeTruthy();
    expect(wrapper.find('label').attributes('for')).toBe(id);
    const options = wrapper.findAll('option');
    expect(options.map((o) => o.text())).toEqual(['English', 'Italiano']);
    expect(options.map((o) => o.attributes('lang'))).toEqual(['en', 'it']);
  });

  it('preselects the current locale', async () => {
    current.value = 'it';
    const wrapper = await mount();
    expect(wrapper.find<HTMLSelectElement>('select').element.value).toBe('it');
  });

  it('sets the preference cookie and switches locale on an explicit choice', async () => {
    const wrapper = await mount();
    await wrapper.find('select').setValue('it');
    expect(cookie.value).toBe('it');
    expect(setLocale).toHaveBeenCalledWith('it');
  });

  it('does nothing when the current locale is re-selected', async () => {
    const wrapper = await mount();
    await wrapper.find('select').setValue('en');
    expect(cookie.value).toBeNull();
    expect(setLocale).not.toHaveBeenCalled();
  });
});
