import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import BulletinBoard from '~/components/bulletin/Board.vue';
import type { BulletinNote } from '~/types';

const note = {
  id: 'n1',
  message: 'Milk',
  color: 'green',
  created_at: new Date().toISOString(),
  author: { first_name: 'Anna' },
} as unknown as BulletinNote;

describe('BulletinBoard delete button', () => {
  const mountBoard = () =>
    mountSuspended(BulletinBoard, {
      props: { notes: [note], currentHouse: null },
      global: {
        stubs: {
          Icon: true,
          LazyBulletinModal: true,
          UiButton: {
            template: '<button v-bind="$attrs"><slot /></button>',
          },
        },
      },
    });

  it('names the note author in its accessible label and emits delete-note', async () => {
    const wrapper = await mountBoard();
    const del = wrapper.find('.note-delete');

    expect(del.attributes('aria-label')).toContain('Anna');
    await del.trigger('click');
    expect(wrapper.emitted('delete-note')?.[0]).toEqual(['n1']);
  });

  it('uses no inline styles on notes', async () => {
    const wrapper = await mountBoard();
    expect(wrapper.find('.sticky-note').attributes('style')).toBeUndefined();
  });
});
