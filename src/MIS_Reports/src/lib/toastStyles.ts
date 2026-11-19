// Overrides the app-wide `richColors` green/red toast styling for auth flows
// (login, logout) that should read as neutral confirmations instead.
export const authToastStyle = {
  background: '#ffffff',
  color: '#111827',
  border: '1px solid #e5e7eb',
};

export const authToastPosition = 'top-center' as const;

// Shorter than sonner's 4s default. A login confirmation has nothing to act on
// and the dashboard is already rendering underneath it, so it lingered over the
// landing screen well after it had been read.
export const authSuccessToastDuration = 1500;

// Same solid red as the SubscriptionExpiredBanner (bg-red-600 / text-white),
// used for account-suspension/lockout style auth errors so the toast and the
// banner read as one consistent warning.
export const dangerToastStyle = {
  background: '#dc2626',
  color: '#ffffff',
  border: '1px solid #dc2626',
};
