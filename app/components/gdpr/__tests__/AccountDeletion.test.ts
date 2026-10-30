import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import AccountDeletion from '~/components/gdpr/AccountDeletion.vue';

const requestDeletion = vi.hoisted(() => vi.fn());
const cancelDeletion = vi.hoisted(() => vi.fn());
vi.mock('~/stores/user', () => ({
  useUserStore: () => ({ requestDeletion, cancelDeletion }),
}));

const G = { stubs: { Teleport: true, NuxtLink: false } };
const mount = (deletedAt: string | null = null) =>
  mountSuspended(AccountDeletion, { props: { deletedAt }, global: G });

async function confirmDeletion(wrapper: Awaited<ReturnType<typeof mount>>) {
  await wrapper
    .find('button[aria-describedby="delete-account-description"]')
    .trigger('click');
  const danger = wrapper
    .findAll('button')
    .filter(
      (b) =>
        b.text() === 'gdpr.deletion.confirmButton' ||
        b.text().includes('Schedule'),
    );
  await danger[danger.length - 1]!.trigger('click');
  await flushPromises();
}

describe('AccountDeletion', () => {
  beforeEach(() => {
    requestDeletion.mockReset();
    cancelDeletion.mockReset();
  });

  it('explains the grace period before deleting', async () => {
    const wrapper = await mount();
    await wrapper
      .find('button[aria-describedby="delete-account-description"]')
      .trigger('click');
    expect(wrapper.findAll('li')).toHaveLength(7);
    expect(requestDeletion).not.toHaveBeenCalled();
  });

  it('emits deleted on success', async () => {
    requestDeletion.mockResolvedValue({ error: null, houses: [] });
    const wrapper = await mount();
    await confirmDeletion(wrapper);
    expect(requestDeletion).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('deleted')).toHaveLength(1);
  });

  it('lists the houses to transfer on OWNER_MUST_TRANSFER', async () => {
    requestDeletion.mockResolvedValue({
      error: 'OWNER_MUST_TRANSFER',
      houses: [{ id: 'h1', name: 'Casa' }],
    });
    const wrapper = await mount();
    await confirmDeletion(wrapper);
    const alert = wrapper.find('[role="alert"]');
    expect(alert.text()).toContain('You still own a house');
    expect(alert.find('a').attributes('href')).toBe('/house/h1');
    expect(wrapper.emitted('deleted')).toBeUndefined();
  });

  it('shows the billing error on BILLING_CANCEL_FAILED', async () => {
    requestDeletion.mockResolvedValue({
      error: 'BILLING_CANCEL_FAILED',
      houses: [],
    });
    const wrapper = await mount();
    await confirmDeletion(wrapper);
    expect(wrapper.find('[role="alert"]').text()).toContain(
      'We could not cancel your subscription',
    );
  });

  it('shows an inline rate-limit message on 429 and does not emit deleted', async () => {
    requestDeletion.mockResolvedValue({ error: 'RATE_LIMITED', houses: [] });
    const wrapper = await mount();
    await confirmDeletion(wrapper);
    expect(wrapper.find('[role="alert"]').text()).toMatch(/too many/i);
    expect(wrapper.emitted('deleted')).toBeUndefined();
  });

  it('shows the pending state and cancels', async () => {
    cancelDeletion.mockResolvedValue({
      result: { restored_house_ids: [], subscription_restored: true },
      error: null,
    });
    const wrapper = await mount(new Date().toISOString());
    expect(wrapper.find('[role="region"]').exists()).toBe(true);
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(cancelDeletion).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('cancelled')).toHaveLength(1);
  });

  it('shows a generic error when cancelling fails', async () => {
    cancelDeletion.mockResolvedValue({ result: null, error: 'boom' });
    const wrapper = await mount(new Date().toISOString());
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.emitted('cancelled')).toBeUndefined();
  });
});
