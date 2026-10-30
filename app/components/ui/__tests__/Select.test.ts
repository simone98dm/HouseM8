import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import Select from '~/components/ui/Select.vue';

const options = [
  { label: 'A', value: 'a' },
  { label: 'B', value: 'b' },
];
const mount = (props: Record<string, unknown> = {}) =>
  mountSuspended(Select, { props: { modelValue: 'a', options, ...props } });

describe('UiSelect', () => {
  it('associates the label with the select', async () => {
    const w = await mount({ label: 'Pick' });
    expect(w.find('label').attributes('for')).toBe(
      w.find('select').attributes('id'),
    );
  });

  it('links the hint via aria-describedby and alerts on error', async () => {
    const w = await mount({ hint: 'Required', error: true });
    const p = w.find('p');
    expect(w.find('select').attributes('aria-describedby')).toBe(
      p.attributes('id'),
    );
    expect(p.attributes('role')).toBe('alert');
    expect(w.find('select').attributes('aria-invalid')).toBe('true');
  });

  it('uses aria-label only when there is no visible label', async () => {
    const a = await mount({ ariaLabel: 'Lang' });
    expect(a.find('select').attributes('aria-label')).toBe('Lang');
    const b = await mount({ ariaLabel: 'Lang', label: 'Visible' });
    expect(b.find('select').attributes('aria-label')).toBeUndefined();
  });

  it('uses shared field tokens', async () => {
    const cls = (await mount()).find('select').attributes('class');
    expect(cls).toContain('rounded-control');
    expect(cls).toContain('border-line-control');
    expect(cls).not.toContain('rounded-xl');
  });

  it('forwards attrs to the select and merges aria-describedby with the hint', async () => {
    const w = await mount({
      hint: 'Help',
      name: 'lang',
      'aria-describedby': 'extra',
    });
    const select = w.find('select');
    expect(select.attributes('name')).toBe('lang');
    expect(select.attributes('aria-describedby')).toBe(
      `${w.find('p').attributes('id')} extra`,
    );
    expect(w.find('div').attributes('name')).toBeUndefined();
  });
});
