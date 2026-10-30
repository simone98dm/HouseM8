import { describe, it, expect, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import Notification from '~/components/ui/Notification.vue';
import type { UiNotification } from '~/types';

const make = (overrides: Partial<UiNotification> = {}): UiNotification => ({
  id: '1',
  type: 'success',
  title: 'Saved',
  description: 'All good',
  timestamp: new Date(),
  ...overrides,
});

const mount = (notification: UiNotification, i18n = false) =>
  mountSuspended(Notification, { props: { notification, i18n } });

describe('UiNotification', () => {
  it.each([
    ['success', 'status'],
    ['info', 'status'],
    ['error', 'alert'],
    ['warning', 'alert'],
  ] as const)('uses role=%s -> %s', async (type, role) => {
    const w = await mount(make({ type }));
    expect(w.attributes('role')).toBe(role);
    expect(w.attributes('aria-atomic')).toBe('true');
  });

  it('renders raw title and description when i18n is off', async () => {
    const w = await mount(make());
    expect(w.text()).toContain('Saved');
    expect(w.text()).toContain('All good');
  });

  it('translates title and description when i18n is on', async () => {
    const w = await mount(
      make({ title: 'common.close', description: 'common.close' }),
      true,
    );
    expect(w.text()).toContain('Close');
    expect(w.text()).not.toContain('common.close');
  });

  it('close button has a translated label and emits dismiss', async () => {
    const w = await mount(make());
    const close = w.get('button[aria-label="Close"]');
    await close.trigger('click');
    expect(w.emitted('dismiss')).toHaveLength(1);
  });

  it('renders no action button without an action', async () => {
    const w = await mount(make());
    expect(w.findAll('button')).toHaveLength(1);
  });

  it('runs the action callback; the button keeps its visible name', async () => {
    const action = vi.fn();
    const w = await mount(make({ action: { label: 'Undo', action } }));
    const btn = w.findAll('button').find((b) => b.text() === 'Undo')!;
    expect(btn.attributes('aria-label')).toBeUndefined();
    await btn.trigger('click');
    expect(action).toHaveBeenCalledOnce();
    expect(w.emitted('action')).toBeUndefined();
  });

  it('shows "Just now" for fresh notifications', async () => {
    const w = await mount(make());
    expect(w.text()).toContain('Just now');
  });
});
