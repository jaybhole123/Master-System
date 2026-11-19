import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { store } from '@/store/store';

let isRefreshing = false;
let isRedirecting = false; // Flag to prevent multiple redirect attempts
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

// Separate refresh state for the org session (orgAccessToken/orgRefreshToken
// — its own 15-minute access token, see ORG_ACCESS_TOKEN_TTL in
// organization.service.ts). Kept fully isolated from the tenant
// isRefreshing/failedQueue above: an expired org token must never trigger
// the tenant's handleAuthFailure (which hard-redirects to /login) — a
// SUPERADMIN can be deep into real tenant work for hours while their org
// token quietly expires in the background (CompanySwitcher polls it from
// every page's navbar now). Failing to refresh just means the switcher
// hides itself; it must never interrupt the tenant session underneath it.
let isOrgRefreshing = false;
let orgFailedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processOrgQueue = (error: Error | null) => {
  orgFailedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  orgFailedQueue = [];
};

/**
 * Reset the redirect flag — call this after a successful login so the
 * interceptor doesn't immediately bounce the user back to /login if a
 * stale 401 arrived during the previous session.
 */
export const resetAuthInterceptorState = () => {
  isRedirecting = false;
  isRefreshing = false;
  failedQueue = [];
};

/**
 * Call this the moment an intentional logout starts. It reuses the
 * "already redirecting" guard so any request that races the logout call
 * (e.g. a sidebar/profile query still in flight, or a delayed retry) and
 * comes back 401 is rejected quietly instead of triggering
 * handleAuthFailure's hard `window.location.href = '/login'` — which
 * would otherwise re-trigger a redundant redirect to the login page.
 *
 * Deliberately left set after logout completes — do NOT pair this with
 * resetAuthInterceptorState() once navigation settles. A stale
 * authenticated request can still resolve well after the logout call
 * returns, so the guard needs to stay up indefinitely. It's cleared the
 * normal way: resetAuthInterceptorState() already runs when the user
 * actually logs back in (use-login-form.ts / LoginPage.tsx).
 */
export const beginIntentionalLogout = () => {
  isRedirecting = true;
};

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

const isAuthFlowRequest = (url?: string) => {
  if (!url) return false;

  // /org/* never reaches this function — the dedicated org-refresh block
  // above already handles every /org/* response before this point.

  return [
    '/auth/login',
    '/auth/signup-request',
    '/auth/send-signup-email-otp',
    '/auth/verify-signup-email-otp',
    '/auth/forgot-password',
    '/auth/reset-password',
  ].some((path) => url.includes(path));
};

// Helper function to handle redirect to login after clearing cookies
const handleAuthFailure = async (axiosInstance: AxiosInstance) => {
  // Never redirect to login if we're already on the login/auth pages
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    if (path === '/login' || path.startsWith('/login')) {
      return;
    }
  }

  // Prevent multiple concurrent redirect attempts
  if (isRedirecting) {
    return;
  }
  isRedirecting = true;

  try {
    // Call clear-session endpoint to clear httpOnly cookies on the server
    // This endpoint doesn't require authentication
    await axiosInstance.post(
      '/auth/clear-session',
      {},
      {
        withCredentials: true,
        // Don't retry this request
        headers: { 'X-Skip-Retry': 'true' },
      }
    );
  } catch (logoutError) {
    // Ignore logout errors - we're redirecting anyway
    console.warn('Logout request failed during auth failure handling:', logoutError);
  }

  // Redirect to login page
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

export const setupAxiosInterceptors = (axiosInstance: AxiosInstance) => {
  axiosInstance.interceptors.request.use(
    (config) => {
      if (!config.withCredentials) {
        config.withCredentials = true;
      }
      // "All Companies" rollout (docs/organizationplan/08-all-companies-rollout.md)
      // — attached to every request, harmless for the vast majority of
      // endpoints that don't look at it yet. Only endpoints explicitly
      // converted to check this header do anything different; every other
      // endpoint (individual companies included) ignores it completely.
      if (store.getState().userAccount.orgViewMode === 'all') {
        config.headers = config.headers ?? {};
        config.headers['X-Org-View-Mode'] = 'all';
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  axiosInstance.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error: AxiosError) => {
      // Check if error has config (request was made)
      if (!error.config) {
        return Promise.reject(error);
      }

      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      // Skip retry logic for requests marked to skip
      if (originalRequest.headers?.['X-Skip-Retry']) {
        return Promise.reject(error);
      }

      // Org session (/org/*): its own short-lived access token, refreshed via
      // its own endpoint, with no hard redirect on failure — see the
      // isOrgRefreshing block comment above for why this can't share the
      // tenant refresh flow below.
      if (originalRequest.url?.startsWith('/org')) {
        const isOrgAuthEndpoint = [
          '/org/auth/refresh-token',
          '/org/auth/login',
          '/org/auth/logout',
        ].some((path) => originalRequest.url?.includes(path));
        if (error.response?.status !== 401 || isOrgAuthEndpoint || originalRequest._retry) {
          return Promise.reject(error);
        }

        if (isOrgRefreshing) {
          originalRequest._retry = true;
          return new Promise((resolve, reject) => {
            orgFailedQueue.push({ resolve, reject });
          })
            .then(() => axiosInstance(originalRequest))
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isOrgRefreshing = true;
        try {
          await axiosInstance.post('/org/auth/refresh-token', {}, { withCredentials: true });
          processOrgQueue(null);
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          processOrgQueue(refreshError as Error);
          return Promise.reject(error);
        } finally {
          isOrgRefreshing = false;
        }
      }

      // Login/signup failures are not expired-session failures. Let the caller show the API error
      // instead of refreshing tokens and doing a full-page redirect back to /login.
      if (isAuthFlowRequest(originalRequest.url)) {
        return Promise.reject(error);
      }

      // Account deactivated — clear session and redirect immediately, no retry
      if (error.response?.status === 403) {
        const message = (error.response?.data as { message?: string })?.message ?? '';
        if (message.toLowerCase().includes('deactivated')) {
          await handleAuthFailure(axiosInstance);
          return Promise.reject(error);
        }
      }

      if (error.response?.status === 401 && !originalRequest._retry) {
        // If we're already redirecting to login, reject immediately — no retry
        if (isRedirecting) {
          return Promise.reject(error);
        }

        // If refresh token request itself fails, clear cookies and redirect
        if (originalRequest.url?.includes('/auth/refresh-token')) {
          console.error('Refresh token expired or invalid');
          await handleAuthFailure(axiosInstance);
          return Promise.reject(error);
        }

        // If logout request fails with 401, just redirect without calling logout again
        if (originalRequest.url?.includes('/auth/logout')) {
          if (typeof window !== 'undefined' && !isRedirecting) {
            isRedirecting = true;
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }

        // If clear-session request fails, just redirect (don't retry)
        if (originalRequest.url?.includes('/auth/clear-session')) {
          if (typeof window !== 'undefined' && !isRedirecting) {
            isRedirecting = true;
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }

        // If already refreshing, queue this request
        if (isRefreshing) {
          originalRequest._retry = true;

          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(() => {
              // Retry the original request after token is refreshed
              return axiosInstance(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshResponse = await axiosInstance.post(
            '/auth/refresh-token',
            {},
            {
              withCredentials: true,
            }
          );

          if (refreshResponse.status === 200) {
            console.log('Access token refreshed successfully');

            processQueue(null, refreshResponse.data?.accessToken);

            return axiosInstance(originalRequest);
          } else {
            throw new Error('Token refresh failed with non-200 status');
          }
        } catch (refreshError) {
          console.error('Failed to refresh token:', refreshError);

          // Process all queued requests with error
          processQueue(refreshError as Error, null);

          // Clear cookies and redirect to login
          await handleAuthFailure(axiosInstance);

          return Promise.reject(refreshError);
        } finally {
          // Only reset if we're not redirecting — if redirecting, keep isRefreshing true
          // so any in-flight requests don't start a new refresh before the page unloads
          if (!isRedirecting) {
            isRefreshing = false;
          }
        }
      }

      // For other errors, just reject
      return Promise.reject(error);
    }
  );
};
