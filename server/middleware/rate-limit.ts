// server/middleware/rate-limit.ts
//
// Throttles write requests to sensitive endpoints coming from the same source.
// Two stages per key, inside a fixed window:
//   1. slow   after SLOW_AFTER hits each further request is delayed, growing
//             by DELAY_STEP_MS per hit up to MAX_DELAY_MS
//   2. block  after MAX_REQUESTS hits the request is refused with 429 and a
//             Retry-After header until the window resets
//
// Counters live in Postgres (rate_limits table) so they are shared across
// serverless instances.
//
// Keys:
//   - `ip:<route>:<ip hash>`      every limited route, per client IP and route
//   - `signin:<email hash>:<ip hash>`  /api/auth/signin only: guesses against one
//                                 account from one address
//
// No key is built from the email alone: that would let anyone lock a victim's
// address out from elsewhere. Caps on mail sent to one inbox live where the
// mail is sent (sign-up resend, password reset and invite cooldowns).
import type { H3Event } from 'h3';
import consola from 'consola';
import { hitRateLimit } from '../utils/rate-limit-store';
import { getClientIp, hashIp, hashToken } from '../utils/tokens';

interface LimitedRoute {
  name: string;
  pattern: RegExp;
  /** Also throttle this method (GET is otherwise exempt) and use `max` per `windowSeconds`. */
  method?: string;
  max?: number;
  windowSeconds?: number;
}

const HOUR_SECONDS = 3600;

const LIMITED_ROUTES: LimitedRoute[] = [
  { name: 'signin', pattern: /^\/api\/auth\/signin/ },
  { name: 'password-reset', pattern: /^\/api\/auth\/password-reset/ },
  { name: 'refresh', pattern: /^\/api\/auth\/refresh/ },
  { name: 'register', pattern: /^\/api\/auth\/register/ },
  { name: 'confirm', pattern: /^\/api\/auth\/confirm/ },
  {
    name: 'resend-confirmation',
    pattern: /^\/api\/auth\/resend-confirmation\/?$/,
    max: 10,
    windowSeconds: HOUR_SECONDS,
  },
  { name: 'redeem', pattern: /^\/api\/invitation\/redeem/ },
  // Public token lookup: GET is otherwise exempt, so opt in to stop token
  // enumeration from one address.
  {
    name: 'invitation-preview',
    pattern: /^\/api\/invitation\/[^/]+\/preview\/?$/,
    method: 'GET',
    max: 30,
    windowSeconds: 60,
  },
  { name: 'email-change', pattern: /^\/api\/users\/me\/email/ },
  // Expensive or irreversible; a few per hour is plenty for a real user.
  {
    name: 'gdpr-export',
    pattern: /^\/api\/gdpr\/export\/?$/,
    method: 'GET',
    max: 5,
    windowSeconds: HOUR_SECONDS,
  },
  {
    name: 'gdpr-delete',
    pattern: /^\/api\/gdpr\/delete-account\/?$/,
    max: 5,
    windowSeconds: HOUR_SECONDS,
  },
  {
    name: 'stripe-withdraw',
    pattern: /^\/api\/stripe\/withdraw\/?$/,
    max: 5,
    windowSeconds: HOUR_SECONDS,
  },
  // Undo is a write that flips money state back; cap it like the other
  // irreversible-ish actions.
  {
    name: 'settlement-undo',
    pattern: /^\/api\/houses\/[^/]+\/settlements\/[^/]+\/undo\/?$/,
    max: 10,
    windowSeconds: HOUR_SECONDS,
  },
  // Money writes: a handful per hour is plenty for a household (and the
  // per-house lock makes each one cost a ledger recompute).
  {
    name: 'settle',
    pattern: /^\/api\/houses\/[^/]+\/settle\/?$/,
    max: 20,
    windowSeconds: HOUR_SECONDS,
  },
  {
    name: 'invite',
    pattern: /^\/api\/houses\/[^/]+\/(invitation\/generate|members\/?$)/,
  },
];

const WINDOW_SECONDS = 60;
const SLOW_AFTER = 5;
const MAX_REQUESTS = 10;
const DELAY_STEP_MS = 500;
const MAX_DELAY_MS = 2000;

// Reads are never throttled: GET /api/houses/:id/members shares its path with
// the limited POST, and every limited endpoint is a write.
const UNLIMITED_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function checkLimit(
  event: H3Event,
  key: string,
  windowSeconds = WINDOW_SECONDS,
  maxRequests = MAX_REQUESTS,
): Promise<void> {
  let count: number;
  try {
    count = await hitRateLimit(key, windowSeconds);
  } catch (error) {
    // Fail open: a database outage must not take authentication down too.
    consola.error('Rate limit store unavailable, allowing request', error);
    return;
  }

  if (count > maxRequests) {
    setResponseHeader(event, 'Retry-After', windowSeconds);
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests. Please try again later.',
    });
  }

  if (count > SLOW_AFTER) {
    await sleep(Math.min((count - SLOW_AFTER) * DELAY_STEP_MS, MAX_DELAY_MS));
  }
}

async function readEmail(event: H3Event): Promise<string> {
  try {
    const body = await readBody(event);
    return typeof body?.email === 'string'
      ? body.email.toLowerCase().trim()
      : '';
  } catch {
    return '';
  }
}

export default defineEventHandler(async (event) => {
  const path = (event.path ?? '').split('?')[0] ?? '';
  const route = LIMITED_ROUTES.find((r) => r.pattern.test(path));
  if (!route) return;
  if (UNLIMITED_METHODS.has(event.method) && route.method !== event.method) {
    return;
  }
  if (route.method && route.method !== event.method) return;

  const rawIp = getClientIp(event) ?? 'unknown';
  // Keyed hash: raw IPs are personal data and must not sit in the rate_limits table.
  const ip = hashIp(rawIp);

  // IP first: a blocked source never reaches the second counter.
  await checkLimit(
    event,
    `ip:${route.name}:${ip}`,
    route.windowSeconds,
    route.max,
  );

  if (route.name === 'signin') {
    const email = await readEmail(event);
    // Hashed so the key has a fixed size whatever the client submits.
    if (email) await checkLimit(event, `signin:${hashToken(email)}:${ip}`);
  }
});
