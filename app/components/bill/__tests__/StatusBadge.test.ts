import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import StatusBadge from '~/components/bill/StatusBadge.vue';

const G = { mocks: { $t: (k: string) => k } };

describe('StatusBadge', () => {
  it('renders when active', async () => {
    const wrapper = await mountSuspended(StatusBadge, {
      props: { active: true },
      global: G,
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('shows bills.details.active key when active', async () => {
    const wrapper = await mountSuspended(StatusBadge, {
      props: { active: true },
      global: G,
    });
    expect(wrapper.text()).toContain('bills.details.active');
  });

  it('shows bills.details.inactive key when not active', async () => {
    const wrapper = await mountSuspended(StatusBadge, {
      props: { active: false },
      global: G,
    });
    expect(wrapper.text()).toContain('bills.details.inactive');
  });

  it('applies success classes when active', async () => {
    const wrapper = await mountSuspended(StatusBadge, {
      props: { active: true },
      global: G,
    });
    // Dark-mode-safe token class (see app/assets/css/_tokens.scss --success-subtle),
    // replacing the old bg-success-100 which had no dark: coverage.
    expect(wrapper.html()).toContain('badge-success');
  });

  it('applies muted classes when not active', async () => {
    const wrapper = await mountSuspended(StatusBadge, {
      props: { active: false },
      global: G,
    });
    expect(wrapper.html()).toContain('badge-muted');
  });
});
