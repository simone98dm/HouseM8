// Single source of truth for every cookie / browser-storage item the app sets.
// Rendered by pages/cookies.vue; privacy.vue links there instead of repeating
// the table. Keep in sync with the code that sets each item (source in comments).

import { LEGAL_ENTITY } from './entity';

export { LEGAL_POLICY_VERSION } from '~~/shared/utils/legal';
export { LEGAL_ENTITY };
export type { LegalEntity } from './entity';

export const LEGAL_LAST_UPDATED = '2026-10-26';
export const CONTROLLER_NAME = LEGAL_ENTITY.name;
export const PRIVACY_CONTACT_EMAIL = LEGAL_ENTITY.privacyEmail;

export type StorageKind = 'cookie' | 'localStorage' | 'sessionStorage';
export type StorageCategory = 'necessary' | 'preferences';

export interface StorageItem {
  name: string;
  provider: 'firstParty';
  kind: StorageKind;
  category: StorageCategory;
  /** i18n key under legal.storage.purpose.* */
  purposeKey: string;
  /** i18n key under legal.storage.duration.* */
  durationKey: string;
}

export const STORAGE_ITEMS: readonly StorageItem[] = [
  {
    // server/utils/jwt.ts: 15 min, httpOnly
    name: 'house_m8_access_token',
    provider: 'firstParty',
    kind: 'cookie',
    category: 'necessary',
    purposeKey: 'legal.storage.purpose.accessToken',
    durationKey: 'legal.storage.duration.minutes15',
  },
  {
    // server/utils/jwt.ts: session, or 7 days with "remember me"
    name: 'house_m8_refresh_token',
    provider: 'firstParty',
    kind: 'cookie',
    category: 'necessary',
    purposeKey: 'legal.storage.purpose.refreshToken',
    durationKey: 'legal.storage.duration.sessionOr7Days',
  },
  {
    // server/api/auth/google/index.get.ts: 10 min, deleted in callback
    name: 'oauth_state',
    provider: 'firstParty',
    kind: 'cookie',
    category: 'necessary',
    purposeKey: 'legal.storage.purpose.oauthState',
    durationKey: 'legal.storage.duration.minutes10',
  },
  {
    // app/middleware/auth.global.ts: removed after use
    name: 'auth_redirect',
    provider: 'firstParty',
    kind: 'sessionStorage',
    category: 'necessary',
    purposeKey: 'legal.storage.purpose.authRedirect',
    durationKey: 'legal.storage.duration.tab',
  },
  {
    // @nuxtjs/i18n v10 client cookie: set only when the user picks a language
    // (LanguageSwitcher), never from browser detection; expires = now + 365 days
    name: 'i18n_locale',
    provider: 'firstParty',
    kind: 'cookie',
    category: 'preferences',
    purposeKey: 'legal.storage.purpose.locale',
    durationKey: 'legal.storage.duration.days365',
  },
  {
    // @nuxtjs/color-mode default storageKey
    name: 'nuxt-color-mode',
    provider: 'firstParty',
    kind: 'localStorage',
    category: 'preferences',
    purposeKey: 'legal.storage.purpose.colorMode',
    durationKey: 'legal.storage.duration.untilCleared',
  },
];
