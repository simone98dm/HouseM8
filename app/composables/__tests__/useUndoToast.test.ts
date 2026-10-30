import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { defineComponent } from 'vue';
import { useUndoToast, UNDO_TOAST_MS } from '~/composables/useUndoToast';

const store = vi.hoisted(() => ({
  success: vi.fn(),
  dismissNotification: vi.fn(),
}));

vi.mock('~/stores/notifications', () => ({
  useNotificationStore: () => store,
}));
mockNuxtImport('useI18n', () => () => ({ t: (k: string) => k }));

async function setup() {
  let show!: ReturnType<typeof useUndoToast>;
  await mountSuspended(
    defineComponent({
      setup() {
        show = useUndoToast();
        return () => null;
      },
    }),
  );
  return show;
}

beforeEach(() => {
  vi.clearAllMocks();
  store.success.mockReturnValue('toast-1');
});

describe('useUndoToast', () => {
  it('shows a success toast with an Undo action for UNDO_TOAST_MS', async () => {
    const show = await setup();
    const id = show('Paid Anna', vi.fn());
    expect(id).toBe('toast-1');
    expect(store.success).toHaveBeenCalledWith(
      'Paid Anna',
      '',
      expect.objectContaining({
        duration: UNDO_TOAST_MS,
        action: expect.objectContaining({ label: 'balance.undo' }),
      }),
    );
  });

  it('is longer than the default 5s toast', () => {
    expect(UNDO_TOAST_MS).toBeGreaterThan(5000);
  });

  it('dismisses the toast and runs onUndo when Undo is tapped', async () => {
    const show = await setup();
    const onUndo = vi.fn();
    show('Paid', onUndo);
    expect(onUndo).not.toHaveBeenCalled();
    store.success.mock.calls[0]![2].action.action();
    expect(store.dismissNotification).toHaveBeenCalledWith('toast-1');
    expect(onUndo).toHaveBeenCalledOnce();
  });
});
