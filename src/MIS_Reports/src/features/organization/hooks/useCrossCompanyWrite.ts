'use client';

import { useCallback } from 'react';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';

const getErrMsg = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
    ?.message ??
  (err as { message?: string })?.message ??
  fallback;

export interface CrossCompanyWriteResult<T> {
  succeeded: T[];
  failed: { row: T; error: string }[];
}

export interface CrossCompanyWriteOptions<T> {
  /** The row's own company, as returned by a merged ("All Companies") read
   * — undefined/null for a row that matches the caller's own active tenant. */
  getTenant: (row: T) => { id: string; name: string } | null | undefined;
  getId: (row: T) => string;
  /** An ordinary bulk-write call — every row in `rows` here is guaranteed to
   * already belong to one single company. `actAsTenantId` is set only when
   * that company isn't the caller's own active tenant — pass it straight
   * through as the `X-Act-As-Tenant` header on this one call (see
   * src/lib/axios.ts's `api` client — every API function in this codebase
   * accepts an optional trailing axios config for exactly this). */
  write: (
    rows: T[],
    actAsTenantId?: string
  ) => Promise<{ errors: { id: string; error: string }[] }>;
  /** Caller-owned refetch, run once after every group settles. This hook
   * never calls a blanket queryClient.clear()/invalidateQueries() itself —
   * only the calling module knows which of its own queries to refetch. */
  onSettled: () => unknown | Promise<unknown>;
}

/**
 * Lets any module act on a merged ("All Companies") row belonging to a
 * company other than the caller's own active tenant, WITHOUT switching
 * sessions — see the backend's `actAsTenantMiddleware`
 * (src/middlewares/actAsTenant.middleware.ts), which re-verifies real
 * access to the target company on every request and substitutes
 * `req.user.tenantId`/`userId` for that one request only. No cookie change,
 * no reload, "All Companies" view is never left.
 *
 * Groups the given rows by their own `tenant.id`, then writes each group
 * CONCURRENTLY (there is no shared session state left to race between
 * groups, unlike the earlier pin-based design) — a mixed-company bulk
 * action completes in one round trip per company, not sequentially.
 *
 * For a normal single-tenant session, every row's tenant matches the
 * active tenant (or has no tenant tag at all), so this collapses to exactly
 * one group and `write` is called once with `actAsTenantId` undefined —
 * byte-identical to calling `write(rows)` directly.
 */
export function useCrossCompanyWrite<T>() {
  const user = useAppSelector(selectUser);

  const run = useCallback(
    async (rows: T[], opts: CrossCompanyWriteOptions<T>): Promise<CrossCompanyWriteResult<T>> => {
      const groups = new Map<string, T[]>();
      for (const row of rows) {
        const tenantId = opts.getTenant(row)?.id || user?.tenantId || '';
        const existing = groups.get(tenantId);
        if (existing) existing.push(row);
        else groups.set(tenantId, [row]);
      }

      const groupResults = await Promise.all(
        [...groups].map(async ([tenantId, groupRows]) => {
          const actAsTenantId = tenantId && tenantId !== user?.tenantId ? tenantId : undefined;
          try {
            const { errors } = await opts.write(groupRows, actAsTenantId);
            const errorById = new Map(errors.map((e) => [e.id, e.error]));
            const succeeded: T[] = [];
            const failed: { row: T; error: string }[] = [];
            for (const row of groupRows) {
              const error = errorById.get(opts.getId(row));
              if (error) failed.push({ row, error });
              else succeeded.push(row);
            }
            return { succeeded, failed };
          } catch (err) {
            const message = getErrMsg(err, 'Write failed. Please try again.');
            return { succeeded: [], failed: groupRows.map((row) => ({ row, error: message })) };
          }
        })
      );

      const succeeded = groupResults.flatMap((r) => r.succeeded);
      const failed = groupResults.flatMap((r) => r.failed);

      await opts.onSettled();
      return { succeeded, failed };
    },
    [user?.tenantId]
  );

  return { run };
}
