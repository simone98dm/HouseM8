import { consola } from 'consola';

/**
 * Universal on purpose (it used to be `.client.ts`). As a client-only plugin,
 * SSR rendered every flag as false and the client flipped them on after
 * hydration, so anything behind `v-if="isEnabled(...)"` mismatched — the
 * monthly-report card's plan gate was rendering `<!---->` on the server and a
 * `<div>` on the client. `/api/feature-flags` needs no auth, so it is safe to
 * resolve during SSR; `useState` then carries the result into the payload.
 */
export default defineNuxtPlugin(async () => {
  if (import.meta.test) return;
  const { flags } = useFeatureFlags();

  // Already filled from the SSR payload on the client — refetching would just
  // repeat the request the server already made.
  if (Object.keys(flags.value).length > 0) return;

  try {
    const data =
      await $fetch<Record<string, boolean | string | number>>(
        '/api/feature-flags',
      );
    flags.value = data;
  } catch (err) {
    consola.warn('[FeatureFlags] Failed to load feature flags:', err);
    flags.value = {};
  }
});
