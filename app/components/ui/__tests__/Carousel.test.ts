import { describe, it, expect, afterEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import UiCarousel from '~/components/ui/Carousel.vue';

const images = ['/a.jpg', '/b.jpg', '/c.jpg'];

afterEach(() => {
  document.querySelectorAll('[role="dialog"]').forEach((el) => el.remove());
  document.documentElement.style.overflow = '';
});

const current = (wrapper: Awaited<ReturnType<typeof mountSuspended>>) =>
  wrapper
    .findAll('[aria-current="true"]')
    .map((e: { attributes: (name: string) => string | undefined }) =>
      e.attributes('aria-label'),
    );

describe('UiCarousel', () => {
  it('names thumbnails and marks the current one', async () => {
    const wrapper = await mountSuspended(UiCarousel, { props: { images } });
    expect(current(wrapper)).toEqual(['Image 1 of 3']);
    expect(wrapper.findAll('button[aria-label$=" of 3"]').length).toBe(3);
  });

  it('names dots when thumbnails are hidden', async () => {
    const wrapper = await mountSuspended(UiCarousel, {
      props: { images, showThumbnails: false },
    });
    expect(wrapper.findAll('button[aria-label$=" of 3"]').length).toBe(3);
    expect(wrapper.findAll('[aria-current="true"]').length).toBe(1);
  });

  it('ArrowRight / ArrowLeft move the current slide', async () => {
    const wrapper = await mountSuspended(UiCarousel, { props: { images } });
    const thumbs = () =>
      wrapper.findAll('button[aria-current], button[aria-label$=" of 3"]');
    await wrapper.trigger('keydown', { key: 'ArrowRight' });
    expect(thumbs()[1]!.attributes('aria-current')).toBe('true');
    await new Promise((r) => setTimeout(r, 350));
    await wrapper.trigger('keydown', { key: 'ArrowLeft' });
    expect(thumbs()[0]!.attributes('aria-current')).toBe('true');
  });

  it('opens fullscreen in a modal dialog with scroll lock', async () => {
    const wrapper = await mountSuspended(UiCarousel, { props: { images } });
    await wrapper
      .find('button[aria-label="Open image in full view"]')
      .trigger('click');
    expect(
      document.querySelector('[role="dialog"][aria-modal="true"]'),
    ).not.toBeNull();
    expect(document.documentElement.style.overflow).toBe('hidden');
  });
});
