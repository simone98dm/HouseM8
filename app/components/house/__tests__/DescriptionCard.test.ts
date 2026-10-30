import { describe, it, expect, vi, afterEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import DescriptionCard from '~/components/house/DescriptionCard.vue';

const render = (props: Record<string, unknown> = {}) =>
  mountSuspended(DescriptionCard, {
    props: { save: vi.fn().mockResolvedValue(true), ...props },
    global: { stubs: { Icon: true } },
    attachTo: document.body,
  });

afterEach(() => {
  document.body.innerHTML = '';
});

describe('HouseDescriptionCard', () => {
  it('preserves line breaks when reading', async () => {
    const w = await render({ description: 'a\nb' });
    expect(w.find('p.whitespace-pre-line').text()).toBe('a\nb');
  });

  it('shows a muted empty line, with an owner hint only for the owner', async () => {
    const member = await render();
    expect(member.text()).toContain('No description yet');
    expect(member.text()).not.toContain('house rules');
    const owner = await render({ isOwner: true });
    expect(owner.text()).toContain('house rules');
  });

  it('has no Edit button for non-owners', async () => {
    const w = await render({ description: 'x' });
    expect(w.find('button').exists()).toBe(false);
  });

  it('saves null for a blank description', async () => {
    const save = vi.fn().mockResolvedValue(true);
    const w = await render({ isOwner: true, description: 'old', save });
    await w.find('button').trigger('click');
    await w.find('textarea').setValue('   ');
    await w.find('form').trigger('submit');
    await vi.waitFor(() => expect(save).toHaveBeenCalledWith(null));
  });

  it('caps the textarea at 1000 characters', async () => {
    const w = await render({ isOwner: true });
    await w.find('button').trigger('click');
    expect(w.find('textarea').attributes('maxlength')).toBe('1000');
  });

  // useHouseInlineEdit: the error belongs to the current edit session.
  describe('inline edit session', () => {
    const ERROR = 'Could not save';
    const cancel = (w: Awaited<ReturnType<typeof render>>) =>
      w.findAll('button').find((b) => b.text() === 'Cancel')!;

    it('hides the error prop until Save is pressed', async () => {
      const w = await render({ isOwner: true, error: ERROR });
      await w.find('button').trigger('click');
      expect(w.text()).not.toContain(ERROR);
    });

    it('shows the error after a failed Save in the same session', async () => {
      const save = vi.fn().mockResolvedValue(false);
      const w = await render({ isOwner: true, error: ERROR, save });
      await w.find('button').trigger('click');
      await w.find('form').trigger('submit');
      await vi.waitFor(() =>
        expect(w.find('[role="alert"]').text()).toBe(ERROR),
      );
      expect(w.find('form').exists()).toBe(true);
    });

    it('hides the error again after Cancel and re-open', async () => {
      const save = vi.fn().mockResolvedValue(false);
      const w = await render({ isOwner: true, error: ERROR, save });
      await w.find('button').trigger('click');
      await w.find('form').trigger('submit');
      await vi.waitFor(() =>
        expect(w.find('[role="alert"]').exists()).toBe(true),
      );

      await cancel(w).trigger('click');
      await w.find('button').trigger('click');

      expect(w.find('form').exists()).toBe(true);
      expect(w.find('[role="alert"]').exists()).toBe(false);
    });

    it('moves focus to the first field when editing starts', async () => {
      const w = await render({ isOwner: true });
      await w.find('button').trigger('click');
      await vi.waitFor(() =>
        expect(document.activeElement).toBe(w.find('textarea').element),
      );
    });

    it('returns focus to the Edit button after a successful save', async () => {
      const w = await render({ isOwner: true });
      await w.find('button').trigger('click');
      await w.find('form').trigger('submit');
      await vi.waitFor(() => expect(w.find('form').exists()).toBe(false));
      await vi.waitFor(() =>
        expect(document.activeElement).toBe(w.find('button').element),
      );
    });

    it('keeps the form open after a failed save', async () => {
      const save = vi.fn().mockResolvedValue(false);
      const w = await render({ isOwner: true, save });
      await w.find('button').trigger('click');
      await w.find('form').trigger('submit');
      await vi.waitFor(() => expect(save).toHaveBeenCalled());
      expect(w.find('form').exists()).toBe(true);
    });
  });
});
