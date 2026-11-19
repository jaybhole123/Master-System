import { QueryClient } from '@tanstack/react-query';

// Sane app-wide defaults so hooks that never set their own staleTime/gcTime
// don't inherit React Query's out-of-the-box "always stale, refetch on every
// focus" behavior — see PAGE_SCOPED_DATA_LOADING_PLAN.md Phase 4. Individual
// hooks can still override these per-query where a shorter/longer window is
// genuinely needed (e.g. sidebar badge polling).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s
      gcTime: 5 * 60_000, // 5 min
      refetchOnWindowFocus: false,
    },
  },
});
