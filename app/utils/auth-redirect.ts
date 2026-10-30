const STORAGE_KEY = 'auth_redirect';
const JOIN_PATH = /^\/house\/join\/[0-9a-f-]{8,64}$/i;

// Same-origin absolute paths only: never `//host` or a full URL, and no
// control characters or backslashes anywhere — URL parsers strip tabs and
// newlines, so `/\t/evil.com` would otherwise resolve to host evil.com.
// eslint-disable-next-line no-control-regex -- matching control chars is the point
const SAFE_REDIRECT = /^\/(?![/\\])[^\u0000-\u001f\u007f\\]*$/;

export const isSafeRedirect = (value: unknown): value is string =>
  typeof value === 'string' && SAFE_REDIRECT.test(value);

export const isJoinRedirect = (value: unknown): value is string =>
  typeof value === 'string' && JOIN_PATH.test(value);

/**
 * Remember where to land after email confirmation. localStorage, not
 * sessionStorage: the confirmation link usually opens in a new tab.
 */
export const stashAuthRedirect = (path: string): void => {
  if (!isSafeRedirect(path)) return;
  try {
    localStorage.setItem(STORAGE_KEY, path);
  } catch {
    // storage blocked: the user lands on the dashboard instead
  }
};

export const takeStashedAuthRedirect = (): string | null => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    return isSafeRedirect(value) ? value : null;
  } catch {
    return null;
  }
};

/** The join page leaves the house name here so AuthShell can say "Joining X". */
export const JOIN_HOUSE_NAME_KEY = 'join_house_name';

// Cookie names mirror server/utils/jwt.ts. The cookies are httpOnly, so this is
// only meaningful during SSR: absence of both means definitely logged out.
const AUTH_COOKIE_NAMES = ['house_m8_access_token', 'house_m8_refresh_token'];

export const hasAuthCookie = (): boolean =>
  AUTH_COOKIE_NAMES.some((name) => !!useCookie(name).value);
