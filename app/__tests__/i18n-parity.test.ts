import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Locale drift is invisible at runtime: `fallbackLocale: 'en'` means a key
// missing from it.json renders ENGLISH inside an Italian UI rather than failing.
// Phase 9 found three such keys by hand (common.upload, bills.notFoundDesc, and
// a dead house.create.create present only in it). Nothing was watching for it.
// These tests are that watcher.
const load = (name: string) =>
  JSON.parse(
    readFileSync(resolve(process.cwd(), `i18n/locales/${name}.json`), 'utf8'),
  );

const flatten = (obj: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null
      ? flatten(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );

describe('i18n locale parity', () => {
  const en = load('en');
  const itLocale = load('it');
  const enKeys = flatten(en);
  const itKeys = flatten(itLocale);

  it('has no key present in en but missing from it', () => {
    expect(enKeys.filter((k) => !itKeys.includes(k))).toEqual([]);
  });

  it('has no key present in it but missing from en', () => {
    expect(itKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
  });

  it('has no empty translation values in either locale', () => {
    const empties = (obj: Record<string, unknown>, label: string) =>
      flatten(obj)
        .filter((k) => {
          const v = k
            .split('.')
            .reduce<unknown>(
              (a, p) => (a as Record<string, unknown>)?.[p],
              obj,
            );
          return typeof v === 'string' && v.trim() === '';
        })
        .map((k) => `${label}:${k}`);
    expect([...empties(en, 'en'), ...empties(itLocale, 'it')]).toEqual([]);
  });

  /**
   * `@` opens vue-i18n's linked-message syntax (`@:other.key`). A literal `@`
   * in a message — an email placeholder, a social handle — is a COMPILE error,
   * and one bad message takes the whole bundle down: every `t()` call in the
   * app starts returning its own key. The UI renders `common.uploadFile`
   * instead of "Upload file", in both locales, everywhere.
   *
   * That shipped once, from a single `you@example.com` placeholder, and no
   * test noticed because each individual component test mocks `useI18n`. The
   * literal must be escaped as `{'@'}`.
   */
  it('has no unescaped @ in any message', () => {
    const offenders = (obj: Record<string, unknown>, label: string) =>
      flatten(obj)
        .map((k) => {
          const v = k
            .split('.')
            .reduce<unknown>(
              (a, p) => (a as Record<string, unknown>)?.[p],
              obj,
            );
          return [k, v] as const;
        })
        .filter(([, v]) => typeof v === 'string' && /@(?!:)/.test(v as string))
        .filter(([, v]) => !(v as string).includes("{'@'}"))
        .map(([k, v]) => `${label}:${k} = ${String(v)}`);

    expect([...offenders(en, 'en'), ...offenders(itLocale, 'it')]).toEqual([]);
  });
});
