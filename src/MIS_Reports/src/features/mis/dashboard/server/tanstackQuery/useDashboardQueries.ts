'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import {
  type DashboardFilters,
  getDashboardData,
  getDashboardUsersApi,
  getDepartmentStatsApi,
} from '../api/dashboardApi';

// userIds are sorted inside the key so the same selection made in a
// different click order hits the same cache entry.
const normalizeFilters = ({ fromDate, toDate, userIds }: DashboardFilters) => ({
  fromDate: fromDate ?? '',
  toDate: toDate ?? '',
  userIds: [...(userIds ?? [])].sort(),
});

export const MIS_DASHBOARD_QUERY_KEYS = {
  all: ['mis', 'dashboard'] as const,
  employees: (filters: DashboardFilters) =>
    [...MIS_DASHBOARD_QUERY_KEYS.all, 'employees', normalizeFilters(filters)] as const,
  departmentStats: (filters: DashboardFilters) =>
    [...MIS_DASHBOARD_QUERY_KEYS.all, 'departmentStats', normalizeFilters(filters)] as const,
  users: () => [...MIS_DASHBOARD_QUERY_KEYS.all, 'users'] as const,
};

// Every filter lives in the query key, so a newer filter combination can
// never be overwritten by an older, slower response (the race the previous
// useEffect fetch had). orgViewMode is part of the key too — switching
// "All Companies" on/off returns a differently-shaped response and must
// re-fetch rather than serve the single-company cache.
export function useDashboardEmployees(filters: DashboardFilters) {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: [...MIS_DASHBOARD_QUERY_KEYS.employees(filters), orgViewMode],
    queryFn: () => getDashboardData(filters),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });
}

export function useDepartmentStats(filters: DashboardFilters) {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: [...MIS_DASHBOARD_QUERY_KEYS.departmentStats(filters), orgViewMode],
    queryFn: () => getDepartmentStatsApi(filters),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });
}

export function useDashboardUsers(enabled = true) {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: [...MIS_DASHBOARD_QUERY_KEYS.users(), orgViewMode],
    queryFn: getDashboardUsersApi,
    enabled,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}
