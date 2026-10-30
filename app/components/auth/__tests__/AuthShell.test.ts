import { describe, it, expect, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import AuthShell from '~/components/auth/AuthShell.vue';

let mockRoute: { query: Record<string, string> } = { query: {} };
mockNuxtImport('useRoute', () => () => mockRoute);

const G = {
  mocks: { $t: (k: string) => k },
  stubs: { NuxtLink: true },
};

describe('AuthShell', () => {
  beforeEach(() => {
    mockRoute = { query: {} };
    sessionStorage.clear();
  });

  it('renders the logo, default slot content and no site credit footer', async () => {
    const wrapper = await mountSuspended(AuthShell, {
      slots: { default: '<p class="probe">body</p>' },
      global: G,
    });
    expect(wrapper.find('.auth-logo').exists()).toBe(true);
    expect(wrapper.find('.probe').exists()).toBe(true);
    expect(wrapper.find('.app-footer-themed').exists()).toBe(false);
  });

  it('starts with a skip link to the main region', async () => {
    const wrapper = await mountSuspended(AuthShell, { global: G });
    const skip = wrapper.find('a[href="#auth-main"]');
    expect(skip.exists()).toBe(true);
    expect(skip.text()).toBe('common.skipToContent');
    expect(wrapper.find('main#auth-main').exists()).toBe(true);
  });

  it('does not render the footer-link paragraph when the slot is not provided', async () => {
    const wrapper = await mountSuspended(AuthShell, { global: G });
    expect(wrapper.find('.auth-altlink').exists()).toBe(false);
  });

  it('renders the footer-link paragraph when the slot is provided', async () => {
    const wrapper = await mountSuspended(AuthShell, {
      slots: { 'footer-link': '<span class="link-probe">link</span>' },
      global: G,
    });
    expect(wrapper.find('.auth-altlink').exists()).toBe(true);
    expect(wrapper.find('.link-probe').exists()).toBe(true);
  });

  it('defaults the card max-width to 420px and padding-bottom to 32px', async () => {
    const wrapper = await mountSuspended(AuthShell, { global: G });
    const card = wrapper.find('.auth-card');
    const style = card.attributes('style') ?? '';
    expect(style).toContain('--auth-card-max-width: 420px');
    expect(style).toContain('--auth-card-pb: 32px');
  });

  it('applies custom cardMaxWidth and cardPaddingBottom props', async () => {
    const wrapper = await mountSuspended(AuthShell, {
      props: { cardMaxWidth: 440, cardPaddingBottom: 40 },
      global: G,
    });
    const style = wrapper.find('.auth-card').attributes('style') ?? '';
    expect(style).toContain('--auth-card-max-width: 440px');
    expect(style).toContain('--auth-card-pb: 40px');
  });

  const JOIN = '/house/join/3f2b8c1e-5d4a-4b6e-9c7a-1a2b3c4d5e6f';

  it('shows "Joining {house}" when the redirect is an invite link and the name is known', async () => {
    sessionStorage.setItem('join_house_name', 'Via Roma');
    mockRoute = { query: { redirect: JOIN } };
    const wrapper = await mountSuspended(AuthShell, {
      global: {
        ...G,
        mocks: { $t: (k: string, p?: { house: string }) => `${k}:${p?.house}` },
      },
    });
    expect(wrapper.find('.auth-context').text()).toBe(
      'auth.joiningHouse:Via Roma',
    );
  });

  it('omits the context line when the house name is unknown', async () => {
    mockRoute = { query: { redirect: JOIN } };
    const wrapper = await mountSuspended(AuthShell, { global: G });
    expect(wrapper.find('.auth-context').exists()).toBe(false);
  });

  it('ignores a stored name when the redirect is not an invite link', async () => {
    sessionStorage.setItem('join_house_name', 'Via Roma');
    mockRoute = { query: { redirect: '/dashboard' } };
    const wrapper = await mountSuspended(AuthShell, { global: G });
    expect(wrapper.find('.auth-context').exists()).toBe(false);
  });
});
