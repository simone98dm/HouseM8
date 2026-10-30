import { describe, it, expect, afterEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import OverflowMenu from '~/components/ui/OverflowMenu.vue';

const ITEMS = [
  { key: 'a', label: 'First' },
  { key: 'b', label: 'Second', danger: true },
];

const mounted: Array<{ unmount: () => void }> = [];
const mount = async (props: Record<string, unknown> = {}) => {
  const wrapper = await mountSuspended(OverflowMenu, {
    props: { items: ITEMS, ariaLabel: 'Actions', ...props },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  return wrapper;
};
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()));

const menu = () => document.querySelector('[role="menu"]');
const items = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]'));
const key = (el: Element, k: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

describe('UiOverflowMenu', () => {
  it('exposes menu semantics on the trigger', async () => {
    const wrapper = await mount();
    const trigger = wrapper.find('button');
    expect(trigger.attributes('aria-haspopup')).toBe('menu');
    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(trigger.attributes('aria-label')).toBe('Actions');
  });

  it('opens on click, focuses the first item and flips aria-expanded', async () => {
    const wrapper = await mount();
    await wrapper.find('button').trigger('click');
    await nextTick();
    expect(menu()).not.toBeNull();
    expect(items()).toHaveLength(2);
    expect(document.activeElement).toBe(items()[0]);
    expect(wrapper.find('button').attributes('aria-expanded')).toBe('true');
  });

  it('opens with ArrowDown on the trigger', async () => {
    const wrapper = await mount();
    await wrapper.find('button').trigger('keydown', { key: 'ArrowDown' });
    await nextTick();
    expect(menu()).not.toBeNull();
  });

  it('moves focus with arrows and wraps', async () => {
    const wrapper = await mount();
    await wrapper.find('button').trigger('click');
    await nextTick();
    key(menu()!, 'ArrowDown');
    expect(document.activeElement).toBe(items()[1]);
    key(menu()!, 'ArrowDown');
    expect(document.activeElement).toBe(items()[0]);
    key(menu()!, 'ArrowUp');
    expect(document.activeElement).toBe(items()[1]);
  });

  it('closes on Escape and restores focus to the trigger', async () => {
    const wrapper = await mount();
    const trigger = wrapper.find('button');
    await trigger.trigger('click');
    await nextTick();
    key(menu()!, 'Escape');
    await nextTick();
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger.element);
  });

  it('emits select with the item key, then closes', async () => {
    const wrapper = await mount();
    await wrapper.find('button').trigger('click');
    await nextTick();
    items()[1]!.click();
    await nextTick();
    expect(wrapper.emitted('select')).toEqual([['b']]);
    expect(menu()).toBeNull();
  });

  it('closes on an outside pointerdown', async () => {
    const wrapper = await mount();
    await wrapper.find('button').trigger('click');
    await nextTick();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await nextTick();
    expect(menu()).toBeNull();
  });

  it('with a visible label sets no aria-label', async () => {
    const wrapper = await mount({ ariaLabel: undefined, label: 'Member' });
    expect(wrapper.find('button').attributes('aria-label')).toBeUndefined();
    expect(wrapper.text()).toContain('Member');
  });
});
