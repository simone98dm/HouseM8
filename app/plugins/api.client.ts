import { logger } from '~/utils/logger';

type FetchRequest = string | Request | URL;

interface FetchError extends Error {
  response?: {
    status: number;
    statusText: string;
    _data?: unknown;
  };
  statusCode?: number;
  statusMessage?: string;
  data?: { data?: { code?: string }; code?: string };
}

const PENDING_DELETION_PATH = '/account/pending-deletion';
const PENDING_DELETION_CODE = 'ACCOUNT_PENDING_DELETION';

function isPendingDeletionError(error: FetchError, status?: number): boolean {
  if (status !== 403) return false;
  // createError({ data }) is serialised as { data: { code } } in the body.
  const body = error.data ?? (error.response?._data as FetchError['data']);
  return (body?.data?.code ?? body?.code) === PENDING_DELETION_CODE;
}

interface ApiPluginConfig {
  /** Routes that should not trigger auth redirects on 401 */
  excludeAuthRoutes?: string[];
  /** Whether to log errors to console */
  enableLogging?: boolean;
  /** Maximum retry attempts for network errors */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
}

function isNetworkError(error: FetchError): boolean {
  return (
    !error.response ||
    error.response.status >= 500 ||
    error.response.status === 408
  );
}

function handleKnownHttpErrors(status: number | undefined): void {
  const notificationStore = useNotificationStore();
  if (status === 403) {
    notificationStore.addNotification(
      'error',
      'errors.accessDenied',
      'errors.accessDeniedMessage',
      { autoDismiss: true, i18n: true },
    );
  } else if (status === 429) {
    notificationStore.addNotification(
      'error',
      'errors.tooManyRequests',
      'errors.tooManyRequestsMessage',
      { autoDismiss: true, i18n: true },
    );
  } else if (status !== undefined && status >= 500) {
    notificationStore.addNotification(
      'error',
      'errors.serverError',
      'errors.serverErrorMessage',
      { autoDismiss: true, i18n: true },
    );
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const config: ApiPluginConfig = {
    excludeAuthRoutes: [
      '/api/auth/signin',
      '/api/auth/signout',
      '/api/auth/verify-email',
      '/api/auth/refresh',
    ],
    enableLogging: import.meta.dev,
    maxRetries: 2,
    retryDelay: 1000,
  };

  // Global API error handling and request interception
  // Save a reference to the original fetch implementation
  const baseFetch =
    typeof globalThis.$fetch === 'function'
      ? globalThis.$fetch
      : $fetch.create({});

  const toUrl = (request: FetchRequest): string => {
    if (typeof request === 'string') return request;
    if (request instanceof URL) return request.href;
    return request.url;
  };

  const originalFetch = async <T = unknown>(
    request: FetchRequest,
    opts?: Record<string, unknown>,
  ): Promise<T> => {
    // Untyped on purpose: Nitro's typed-route union overflows TS (TS2321) here.
    const untypedFetch = baseFetch as (
      url: string,
      opts?: Record<string, unknown>,
    ) => Promise<unknown>;
    return (await untypedFetch(toUrl(request), opts)) as T;
  };

  // Track if we're already handling an auth error to prevent loops
  let isHandlingAuthError = false;

  // Same guard for the pending-deletion redirect: many requests can 403 at once.
  let isRedirectingToPendingDeletion = false;

  async function redirectToPendingDeletion(): Promise<void> {
    if (isRedirectingToPendingDeletion) return;
    if (nuxtApp.$router.currentRoute.value.path === PENDING_DELETION_PATH)
      return;
    isRedirectingToPendingDeletion = true;
    try {
      // Refresh the cached user first: the route middleware sends users whose
      // `pending_deletion` is false away from the page, which would loop.
      await useUserStore().fetchCurrentUser(true);
      await navigateTo(PENDING_DELETION_PATH, { replace: true });
    } catch (redirectError) {
      logger.error('[Auth] Pending-deletion redirect failed:', redirectError);
    } finally {
      isRedirectingToPendingDeletion = false;
    }
  }

  // Retry mechanism for network errors
  async function retryWithBackoff<T>(
    request: () => Promise<T>,
    attempts: number,
    delay: number,
  ): Promise<T> {
    try {
      return await request();
    } catch (error) {
      if (attempts > 0 && isNetworkError(error as FetchError)) {
        if (config.enableLogging) {
          logger.warn(
            `Request failed, retrying in ${delay}ms... (${attempts} attempts left)`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        return retryWithBackoff(request, attempts - 1, delay * 2);
      }
      throw error;
    }
  }

  // Check if request should be excluded from auth handling
  function shouldExcludeAuthHandling(url: string): boolean {
    return (
      config.excludeAuthRoutes?.some((route) => url.includes(route)) ?? false
    );
  }

  // Enhanced error logging
  function logError(error: FetchError, url: string, method?: string): void {
    if (!config.enableLogging) return;

    logger.error(`[API Error] ${method || 'GET'} ${url}:`, {
      status: error.response?.status || error.statusCode,
      message:
        error.response?.statusText || error.statusMessage || error.message,
      data: error.response?._data,
      timestamp: new Date().toISOString(),
    });
  }

  // Perform auth logout after token refresh failure
  async function performAuthLogout(): Promise<void> {
    isHandlingAuthError = true;
    try {
      const userStore = useUserStore();
      if (config.enableLogging) {
        logger.warn('[Auth] Authentication failed, signing out user');
      }
      userStore.reset();
      await navigateTo('/auth/login', { replace: true });
      const notificationStore = useNotificationStore();
      notificationStore.addNotification(
        'error',
        'errors.sessionExpired',
        'errors.sessionExpiredMessage',
        { autoDismiss: false, i18n: true },
      );
    } catch (authError) {
      if (config.enableLogging) {
        logger.error('[Auth] Error during auth cleanup:', authError);
      }
    } finally {
      isHandlingAuthError = false;
    }
  }

  // Handle 401 by attempting token refresh then retrying
  async function handleUnauthorized<T>(
    request: FetchRequest,
    opts: Record<string, unknown> | undefined,
  ): Promise<T> {
    try {
      await originalFetch('/api/auth/refresh', { method: 'POST' });
      return await originalFetch<T>(request, opts);
    } catch {
      await performAuthLogout();
      throw new Error('Session expired');
    }
  }

  // Create enhanced fetch function
  const enhancedFetch = async <T = unknown>(
    request: FetchRequest,
    opts?: Record<string, unknown>,
  ): Promise<T> => {
    const url = toUrl(request);
    const method = (opts?.method as string) || 'GET';

    try {
      return await retryWithBackoff(
        () => originalFetch<T>(request, opts),
        config.maxRetries ?? 2,
        config.retryDelay ?? 1000,
      );
    } catch (error) {
      const fetchError = error as FetchError;
      logError(fetchError, url, method);

      const status = fetchError.response?.status ?? fetchError.statusCode;

      if (isPendingDeletionError(fetchError, status)) {
        await redirectToPendingDeletion();
        throw error;
      }

      if (
        status === 401 &&
        !isHandlingAuthError &&
        !shouldExcludeAuthHandling(url)
      ) {
        return handleUnauthorized<T>(request, opts);
      }

      handleKnownHttpErrors(status);
      throw error;
    }
  };

  // Override both nuxtApp.$fetch and global $fetch
  nuxtApp.$fetch = enhancedFetch;
  globalThis.$fetch = enhancedFetch as typeof globalThis.$fetch;

  // Provide the config to other parts of the app if needed
  nuxtApp.provide('apiConfig', config);
});
