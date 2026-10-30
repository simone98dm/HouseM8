import { describe, it, expect } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import JoinCodeCard from '~/components/house/JoinCodeCard.vue';
import { uiButtonStub } from '~/tests/utils';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string, params?: Record<string, string>) =>
    params ? `${key} ${JSON.stringify(params)}` : key,
  locale: { value: 'en' },
}));

const G = { stubs: { Icon: true, UiButton: uiButtonStub } };
const CODE = { code: '482913', code_expires_at: '2026-10-28T10:00:00Z' };

const mount = (props: Record<string, unknown>) =>
  mountSuspended(JoinCodeCard, { props, global: G });

describe('HouseJoinCodeCard', () => {
  it('shows the title and the code in bold with its expiry', async () => {
    const wrapper = await mount({ joinCode: CODE });
    expect(wrapper.find('h3').text()).toBe('houseProfile.joinCode.title');
    const code = wrapper.find('button.font-bold');
    expect(code.text()).toBe('482913');
    expect(wrapper.text()).toContain('houseProfile.joinCode.validUntil');
  });

  it('copies from the code itself or the button, and offers a new code', async () => {
    const wrapper = await mount({ joinCode: CODE });
    const buttons = wrapper.findAll('button');
    expect(buttons.map((b) => b.text())).toEqual([
      '482913',
      'houseProfile.joinCode.copy',
      'houseProfile.joinCode.regenerate',
    ]);
    expect(buttons[0]!.attributes('aria-label')).toContain(
      'houseProfile.joinCode.copyCode',
    );
    await buttons[0]!.trigger('click');
    await buttons[1]!.trigger('click');
    await buttons[2]!.trigger('click');
    expect(wrapper.emitted('copy')).toHaveLength(2);
    expect(wrapper.emitted('generate')).toHaveLength(1);
  });

  it('explains the empty state and offers to generate one', async () => {
    const wrapper = await mount({ joinCode: null });
    expect(wrapper.text()).toContain('houseProfile.joinCode.none');
    expect(wrapper.find('button').text()).toBe(
      'houseProfile.joinCode.generate',
    );
  });

  it('shows a static skeleton inside a status region while loading', async () => {
    const wrapper = await mount({ joinCode: null, loading: true });
    expect(wrapper.find('[role="status"]').text()).toContain('common.loading');
    expect(wrapper.find('p.font-bold').exists()).toBe(false);
  });

  it('announces a load or generate error', async () => {
    const wrapper = await mount({ joinCode: null, hasError: true });
    expect(wrapper.find('[role="alert"]').text()).toBe(
      'houseProfile.joinCode.error',
    );
  });
});
