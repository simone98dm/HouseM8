import { describe, it, expect } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import Card from '~/components/report/Card.vue';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

const G = {
  mocks: { $t: (k: string) => k },
  stubs: { Icon: true, UiButton: true, NuxtImg: true },
};

const mockReport = {
  id: 'r-1',
  house_id: 'h-1',
  created_by: 'u-1',
  description: 'Broken window in living room',
  created_at: new Date().toISOString(),
};

describe('ReportCard', () => {
  it('renders', async () => {
    const wrapper = await mountSuspended(Card, {
      props: { report: mockReport },
      global: G,
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('shows report description', async () => {
    const wrapper = await mountSuspended(Card, {
      props: { report: mockReport },
      global: G,
    });
    expect(wrapper.text()).toContain('Broken window in living room');
  });

  it('emits view when the stretched primary button is clicked', async () => {
    const wrapper = await mountSuspended(Card, {
      props: { report: mockReport },
      global: G,
    });
    const primary = wrapper.find('button.after\\:absolute');
    expect(primary.exists()).toBe(true);
    await primary.trigger('click');
    expect(wrapper.emitted('view')).toHaveLength(1);
  });

  it('hides mark-solved button when isOwner is false', async () => {
    const wrapper = await mountSuspended(Card, {
      props: { report: mockReport, isOwner: false },
      global: G,
    });
    const buttons = wrapper.findAllComponents({ name: 'UiButton' });
    const solvedButton = buttons.find((b) =>
      b.text().includes('reports.markSolved'),
    );
    expect(solvedButton).toBeUndefined();
  });
});
