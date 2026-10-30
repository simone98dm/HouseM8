import { describe, it, expect, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { createMockHouse } from '~/tests/utils';
import KeyFacts from '~/components/house/KeyFacts.vue';

const house = createMockHouse({
  id: 'h',
  name: 'Casa',
  address: 'Via Roma 1',
  currency: 'EUR',
  max_members: 4,
});

const render = (props: Record<string, unknown> = {}) =>
  mountSuspended(KeyFacts, {
    props: {
      house,
      ownerName: 'Ada Rossi',
      ownerId: 'u1',
      activeCount: 2,
      save: vi.fn().mockResolvedValue(true),
      ...props,
    },
    global: { stubs: { Icon: true } },
  });

describe('HouseKeyFacts', () => {
  it('shows every fact without any disclosure', async () => {
    const w = await render();
    expect(w.find('details').exists()).toBe(false);
    expect(w.text()).toContain('Via Roma 1');
    expect(w.text()).toContain('Ada Rossi');
    expect(w.find('a[href="/user/u1"]').exists()).toBe(true);
  });

  it('hides Edit from non-owners', async () => {
    const w = await render({ isOwner: false });
    expect(w.find('button').exists()).toBe(false);
  });

  it('swaps to a form on Edit and saves the trimmed payload', async () => {
    const save = vi.fn().mockResolvedValue(true);
    const w = await render({ isOwner: true, save });
    await w.find('button').trigger('click');
    const name = w.find('input');
    await name.setValue('  Nuova  ');
    await w.find('form').trigger('submit');
    await vi.waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0]![0]).toMatchObject({
      name: 'Nuova',
      max_members: 4,
    });
  });

  it('rejects a capacity below the active members without saving', async () => {
    const save = vi.fn();
    const w = await render({ isOwner: true, activeCount: 3, save });
    await w.find('button').trigger('click');
    await w.find('input[type="number"]').setValue(2);
    await w.find('form').trigger('submit');
    await vi.waitFor(() => expect(w.find('form').exists()).toBe(true));
    expect(save).not.toHaveBeenCalled();
  });

  it('Cancel returns to the read view', async () => {
    const w = await render({ isOwner: true });
    await w.find('button').trigger('click');
    const cancel = w.findAll('button').find((b) => b.text() === 'Cancel');
    await cancel!.trigger('click');
    expect(w.find('form').exists()).toBe(false);
  });
});
