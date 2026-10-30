import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import UiSkeleton from '~/components/ui/Skeleton.vue';

const classOf = (wrapper: { element: Element }) =>
  wrapper.element.getAttribute('class') ?? '';

describe('UiSkeleton', () => {
  it('is a static, decorative token surface', async () => {
    const wrapper = await mountSuspended(UiSkeleton);
    expect(classOf(wrapper)).toContain('bg-surface-hover');
    expect(classOf(wrapper)).not.toMatch(/animate|gray|gradient|dark:/);
    expect(wrapper.attributes('aria-hidden')).toBe('true');
  });

  it('keeps class sizes: no default inline size overrides them', async () => {
    const wrapper = await mountSuspended(UiSkeleton, {
      attrs: { class: 'h-4 w-40' },
    });
    expect(wrapper.attributes('style') ?? '').toBe('');
    expect(classOf(wrapper)).toContain('h-4');
    expect(classOf(wrapper)).not.toContain('h-5');
  });

  it('falls back to h-5 only when no height is given', async () => {
    const wrapper = await mountSuspended(UiSkeleton);
    expect(classOf(wrapper)).toContain('h-5');
  });

  it('applies prop sizes as inline style when passed', async () => {
    const wrapper = await mountSuspended(UiSkeleton, {
      props: { height: 64, width: '50%' },
    });
    const style = wrapper.attributes('style') ?? '';
    expect(style).toContain('height: 64px');
    expect(style).toContain('width: 50%');
    expect(classOf(wrapper)).not.toContain('h-5');
  });

  it('uses the control radius unless a radius is given', async () => {
    const plain = await mountSuspended(UiSkeleton);
    const byProp = await mountSuspended(UiSkeleton, {
      props: { rounded: 'rounded-card' },
    });
    const byClass = await mountSuspended(UiSkeleton, {
      attrs: { class: 'size-10 rounded-full' },
    });
    expect(classOf(plain)).toContain('rounded-control');
    expect(classOf(byProp)).toContain('rounded-card');
    expect(classOf(byProp)).not.toContain('rounded-control');
    expect(classOf(byClass)).toContain('rounded-full');
    expect(classOf(byClass)).not.toContain('rounded-control');
  });
});
