/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
vi.stubGlobal('createError', (o: object) => Object.assign(new Error(), o));
const setHeaderMock = vi.fn();
vi.stubGlobal('setHeader', setHeaderMock);

describe('CSP and api docs', () => {
  it('global CSP in nuxt.config.ts no longer allows jsdelivr', () => {
    const cfg = readFileSync(
      resolve(__dirname, '../../../nuxt.config.ts'),
      'utf8',
    );
    expect(cfg).not.toContain('cdn.jsdelivr.net');
  });

  it('docs page sets its own CSP allowing jsdelivr scripts', async () => {
    const { default: handler } = await import('../../api/docs.get');
    (handler as Function)({});
    const csp = setHeaderMock.mock.calls.find(
      (c) => c[1] === 'Content-Security-Policy',
    )![2] as string;
    expect(csp).toMatch(/script-src[^;]*https:\/\/cdn\.jsdelivr\.net/);
  });
});
