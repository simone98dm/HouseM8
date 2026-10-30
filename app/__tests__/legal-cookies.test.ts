import { describe, it, expect } from 'vitest';
import {
  STORAGE_ITEMS,
  LEGAL_LAST_UPDATED,
  PRIVACY_CONTACT_EMAIL,
  LEGAL_ENTITY,
  LEGAL_POLICY_VERSION,
} from '~/utils/legal/cookies';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Read raw: the i18n vite plugin compiles imported locale JSON into AST objects.
const load = (name: string) =>
  JSON.parse(
    readFileSync(resolve(process.cwd(), `i18n/locales/${name}.json`), 'utf8'),
  );
const en = load('en');
const it_ = load('it');

const get = (o: unknown, key: string) =>
  key
    .split('.')
    .reduce<unknown>((a, k) => (a as Record<string, unknown>)?.[k], o);

describe('legal storage data', () => {
  it('lists every known cookie and storage key once', () => {
    const names = STORAGE_ITEMS.map((i) => i.name).sort();
    expect(names).toEqual(
      [
        'auth_redirect',
        'house_m8_access_token',
        'house_m8_refresh_token',
        'i18n_locale',
        'nuxt-color-mode',
        'oauth_state',
      ].sort(),
    );
  });

  it('only declares necessary or preferences items', () => {
    for (const i of STORAGE_ITEMS)
      expect(['necessary', 'preferences']).toContain(i.category);
  });

  it('has translations in en and it for every purpose and duration key', () => {
    for (const i of STORAGE_ITEMS)
      for (const k of [i.purposeKey, i.durationKey]) {
        expect(typeof get(en, k)).toBe('string');
        expect(typeof get(it_, k)).toBe('string');
      }
  });

  it('exposes an ISO last-updated date and contact email', () => {
    expect(LEGAL_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(PRIVACY_CONTACT_EMAIL).toContain('@');
  });

  it('keeps the contact constants wired to LEGAL_ENTITY, not a private person', () => {
    expect(PRIVACY_CONTACT_EMAIL).toBe(LEGAL_ENTITY.privacyEmail);
    expect(Object.keys(LEGAL_ENTITY).sort()).toEqual(
      [
        'address',
        'legalForm',
        'name',
        'pec',
        'privacyEmail',
        'rea',
        'supportEmail',
        'vatNumber',
      ].sort(),
    );
    expect(JSON.stringify(LEGAL_ENTITY)).not.toMatch(/outlook|local/i);
  });

  it('re-exports the shared integer policy version', () => {
    expect(Number.isInteger(LEGAL_POLICY_VERSION)).toBe(true);
  });
});
