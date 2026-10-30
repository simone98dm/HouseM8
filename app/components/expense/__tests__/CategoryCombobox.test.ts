import { describe, it, expect, vi, afterEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import CategoryCombobox from '~/components/expense/CategoryCombobox.vue';
import type { ExpenseCategory } from '~~/shared/constants/categories';

// Keys double as labels, so a query like "sub" matches only "subscriptions".
mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

const mount = (modelValue: ExpenseCategory[] = []) =>
  mountSuspended(CategoryCombobox, {
    props: { modelValue },
    global: { stubs: { Icon: true } },
  });

const lastModel = (wrapper: Awaited<ReturnType<typeof mount>>) =>
  wrapper.emitted('update:modelValue')?.at(-1)?.[0];

afterEach(() => vi.useRealTimers());

describe('ExpenseCategoryCombobox', () => {
  it('waits 300ms after typing before suggesting', async () => {
    const wrapper = await mount();
    vi.useFakeTimers();
    const input = wrapper.find('input[role="combobox"]');

    await input.setValue('sub');
    vi.advanceTimersByTime(299);
    await wrapper.vm.$nextTick();
    expect(input.attributes('aria-expanded')).toBe('false');

    vi.advanceTimersByTime(1);
    await wrapper.vm.$nextTick();
    expect(input.attributes('aria-expanded')).toBe('true');
    const options = wrapper.findAll('[role="option"]');
    expect(options.map((o) => o.text())).toEqual(['categories.subscriptions']);
  });

  it('selects the active suggestion with Enter', async () => {
    const wrapper = await mount();
    vi.useFakeTimers();
    const input = wrapper.find('input[role="combobox"]');

    await input.setValue('rent');
    vi.advanceTimersByTime(300);
    await wrapper.vm.$nextTick();
    await input.trigger('keydown', { key: 'Enter' });

    expect(lastModel(wrapper)).toEqual(['rent']);
    expect(input.attributes('aria-expanded')).toBe('false');
  });

  it('flushes the debounce when Enter is pressed early', async () => {
    const wrapper = await mount();
    vi.useFakeTimers();
    const input = wrapper.find('input[role="combobox"]');

    await input.setValue('ren');
    await input.trigger('keydown', { key: 'Enter' });

    expect(lastModel(wrapper)).toEqual(['rent']);
  });

  it('opens the full list with ArrowDown and hides already picked ones', async () => {
    const wrapper = await mount(['rent']);
    await wrapper.find('input').trigger('keydown', { key: 'ArrowDown' });

    const options = wrapper.findAll('[role="option"]');
    expect(options).toHaveLength(11);
    expect(options[0]!.attributes('aria-selected')).toBe('true');
    expect(options.map((o) => o.text())).not.toContain('categories.rent');
  });

  it('shows a no-match message', async () => {
    const wrapper = await mount();
    vi.useFakeTimers();
    await wrapper.find('input').setValue('zzz');
    vi.advanceTimersByTime(300);
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll('[role="option"]')).toHaveLength(0);
    expect(wrapper.text()).toContain('expenses.form.categoriesNoMatch');
  });

  it('closes on Escape without letting the event reach the modal', async () => {
    const wrapper = await mount();
    const input = wrapper.find('input');
    await input.trigger('keydown', { key: 'ArrowDown' });

    const outer = vi.fn();
    wrapper.element.parentElement?.addEventListener('keydown', outer);
    await input.trigger('keydown', { key: 'Escape' });

    expect(input.attributes('aria-expanded')).toBe('false');
    expect(outer).not.toHaveBeenCalled();
  });

  it('locks the input at three categories without dropping focus', async () => {
    const wrapper = await mount(['rent', 'gifts', 'travel']);
    const input = wrapper.find('input');

    // readonly, not disabled: a disabled input loses focus to <body>.
    expect(input.attributes('disabled')).toBeUndefined();
    expect(input.attributes('readonly')).toBeDefined();
    expect(input.attributes('aria-disabled')).toBe('true');
    expect(wrapper.text()).toContain('expenses.form.categoriesFull');
  });

  it('removes the last chip with Backspace on an empty input', async () => {
    const wrapper = await mount(['rent', 'gifts']);
    await wrapper.find('input').trigger('keydown', { key: 'Backspace' });
    expect(lastModel(wrapper)).toEqual(['rent']);
  });

  it('removes a chip with its remove button', async () => {
    const wrapper = await mount(['rent', 'gifts']);
    await wrapper.find('button[aria-label]').trigger('click');
    expect(lastModel(wrapper)).toEqual(['gifts']);
  });
});
