const LEGAL_PATHS = ['/privacy', '/terms', '/cookies', '/accessibility'];
// Every legal page is public: derived from LEGAL_PATHS so a new one can't be
// forgotten here (the accessibility statement once redirected to login).
const PUBLIC_PATHS = ['/', '/pricing', ...LEGAL_PATHS];

const isAuthPath = (path: string) => path.startsWith('/auth/');
// Invite links open to logged-out visitors (preview + sign-up); accepting
// the invitation still requires a session on the API.
const isPublicPath = (path: string) =>
  PUBLIC_PATHS.includes(path) || path.startsWith('/house/join/');
const isAuthOrPublicPath = (path: string) =>
  isAuthPath(path) || isPublicPath(path);

/**
 * SSR guard for a protected route. A visitor with no auth cookie must never
 * receive the protected page, otherwise the client-side redirect during
 * hydration causes a hydration mismatch. With a cookie we render and let the
 * client validate the session (an expired session still redirects client-side).
 */
export const redirectLoggedOutOnServer = (path: string, fullPath: string) => {
  if (isAuthOrPublicPath(path)) return;
  if (hasAuthCookie()) return;
  return navigateTo(
    {
      path: '/auth/login',
      query: isSafeRedirect(fullPath) ? { redirect: fullPath } : {},
    },
    { redirectCode: 302 },
  );
};

export default defineNuxtRouteMiddleware(async (to) => {
  const dashboardPath = '/dashboard';
  const loginPath = '/auth/login';
  const pendingDeletionPath = '/account/pending-deletion';
  const legalPaths = LEGAL_PATHS;
  if (to.path.startsWith('/api/')) return;

  if (import.meta.server) {
    return redirectLoggedOutOnServer(to.path, to.fullPath);
  }

  const isAuthPage = isAuthPath(to.path);
  const isPublicPage = isPublicPath(to.path);

  const userStore = useUserStore();
  const nuxtApp = useNuxtApp();

  const consumeStoredRedirect = (currentPath?: string) => {
    const storedRedirect = sessionStorage.getItem('auth_redirect');

    if (
      !storedRedirect ||
      storedRedirect === currentPath ||
      !isSafeRedirect(storedRedirect)
    ) {
      return null;
    }

    sessionStorage.removeItem('auth_redirect');
    return storedRedirect;
  };

  const restoreSessionIfNeeded = async () => {
    if (nuxtApp._sessionRestoreAttempted) {
      return null;
    }

    nuxtApp._sessionRestoreAttempted = true;

    try {
      await userStore.fetchCurrentUser(to.query.oauth_completed === 'true');
    } catch {
      return null;
    }

    if (!userStore.isAuthenticated) {
      return null;
    }

    return consumeStoredRedirect(to.fullPath);
  };

  const restoredRedirect = await restoreSessionIfNeeded();

  if (restoredRedirect) {
    return navigateTo(restoredRedirect, { replace: true });
  }

  if (userStore.isAuthenticated) {
    // Accounts in the deletion grace period can only reach the pending-deletion
    // page, the legal pages and the auth pages; everything else is bounced.
    if (userStore.currentUser?.pending_deletion) {
      if (
        to.path === pendingDeletionPath ||
        isAuthPage ||
        legalPaths.includes(to.path)
      ) {
        return;
      }
      // Keep the deletion email's cancel link working: the page cancels on
      // arrival when it carries cancel_token.
      const cancelToken = to.query.cancel_token;
      return navigateTo(
        {
          path: pendingDeletionPath,
          query: cancelToken ? { cancel_token: cancelToken } : {},
        },
        { replace: true },
      );
    }

    if (to.path === pendingDeletionPath) {
      return navigateTo(dashboardPath, { replace: true });
    }

    if (!isAuthPage) {
      return;
    }

    const storedRedirect = consumeStoredRedirect();
    return navigateTo(storedRedirect ?? dashboardPath, { replace: true });
  }

  if (isAuthPage || isPublicPage) {
    return;
  }

  return navigateTo({
    path: loginPath,
    query: { redirect: to.fullPath },
  });
});
