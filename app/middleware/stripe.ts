export default defineNuxtRouteMiddleware(() => {
  const { isEnabled } = useFeatureFlags();
  if (isEnabled('showStripe')) return;

  // Billing is switched off. Authenticated users go to their dashboard, but an
  // anonymous visitor must not: /dashboard is not public, so auth.global.ts
  // would bounce them straight to the login screen — which is how a public
  // /pricing link ended up dumping logged-out visitors on a login form.
  const userStore = useUserStore();
  return navigateTo(userStore.isAuthenticated ? '/dashboard' : '/');
});
