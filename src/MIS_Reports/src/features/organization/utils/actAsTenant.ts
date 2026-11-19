/**
 * Resolves whether a write against `row`'s own company needs to act as a
 * different tenant than the caller's current active one — pass the result
 * straight through as the `X-Act-As-Tenant` header on that one API call
 * (see `actAsTenantHeaders`). Returns undefined when the row already
 * matches the active tenant (or has no tenant tag — the ~100% common case
 * for every individual company and every single-company session), so
 * callers never need their own `!== activeTenantId` check.
 */
export function resolveActAsTenant(
  tenant: { id: string; name: string } | null | undefined,
  activeTenantId: string | undefined
): string | undefined {
  return tenant?.id && tenant.id !== activeTenantId ? tenant.id : undefined;
}

/** Axios request-config fragment carrying the act-as-tenant header, or
 * undefined when none is needed — spread/pass straight into an API call's
 * config argument: `api.patch(url, body, actAsTenantHeaders(actAsTenantId))`. */
export function actAsTenantHeaders(actAsTenantId: string | undefined) {
  return actAsTenantId ? { headers: { 'X-Act-As-Tenant': actAsTenantId } } : undefined;
}
