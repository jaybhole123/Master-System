'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  type DepartmentStat,
  getEmployeeDetailsApi,
  submitCommitmentsApi,
} from '../server/api/dashboardApi';
import {
  MIS_DASHBOARD_QUERY_KEYS,
  useDashboardEmployees,
  useDepartmentStats,
} from '../server/tanstackQuery/useDashboardQueries';
import type { Employee } from '../types/types';

type CommitmentEntry = {
  commitment: number;
  nextWeekPlannedWorkNotDone: number;
  nextWeekPlannedWorkNotDoneOnTime: number;
};

const EMPTY_EMPLOYEES: Employee[] = [];
const EMPTY_DEPARTMENTS: DepartmentStat[] = [];
// Stable default — a fresh `[]` per render would change `filters` every
// render and loop the selection-reset effect below.
const EMPTY_USER_IDS: string[] = [];

// dateRange + userIds are server-side filters (sent to /mis/dashboard and
// /mis/departments/stats); filterName + filterDesignation are client-side
// refinements of whatever the server returned. Every table, chart and PDF
// consumer should read `filteredEmployees` so all of them agree.
export function useDashboard(
  dateRange?: { start: string; end: string },
  userIds: string[] = EMPTY_USER_IDS
) {
  const queryClient = useQueryClient();
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [employeeCommitments, setEmployeeCommitments] = useState<Record<string, CommitmentEntry>>(
    {}
  );
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [filterName, setFilterName] = useState('');
  const [filterDesignation, setFilterDesignation] = useState('');
  const [selectedUserDetails, setSelectedUserDetails] = useState<Employee | null>(null);

  const filters = useMemo(
    () => ({ fromDate: dateRange?.start, toDate: dateRange?.end, userIds }),
    [dateRange?.start, dateRange?.end, userIds]
  );

  const employeesQuery = useDashboardEmployees(filters);
  const departmentsQuery = useDepartmentStats(filters);

  const rawEmployeesData = employeesQuery.data;
  const employeesData: Employee[] = Array.isArray(rawEmployeesData)
    ? rawEmployeesData
    : Array.isArray((rawEmployeesData as any)?.data)
      ? (rawEmployeesData as any).data
      : Array.isArray((rawEmployeesData as any)?.employees)
        ? (rawEmployeesData as any).employees
        : EMPTY_EMPLOYEES;
  const rawDepartmentsStats = departmentsQuery.data;
  const departmentsStats: DepartmentStat[] = Array.isArray(rawDepartmentsStats)
    ? rawDepartmentsStats
    : Array.isArray((rawDepartmentsStats as any)?.data)
      ? (rawDepartmentsStats as any).data
      : Array.isArray((rawDepartmentsStats as any)?.departmentStats)
        ? (rawDepartmentsStats as any).departmentStats
        : EMPTY_DEPARTMENTS;
  const loading = employeesQuery.isPending || employeesQuery.isFetching;
  const error = employeesQuery.isError ? 'Failed to fetch dashboard data' : null;

  useEffect(() => {
    if (employeesQuery.isError) console.error(employeesQuery.error);
  }, [employeesQuery.isError, employeesQuery.error]);

  // A row selection made under one set of server filters must not carry
  // over to a different result set (selected ids may no longer be listed).
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset is keyed on the server filters on purpose
  useEffect(() => {
    setSelectedEmployees([]);
    setSelectAll(false);
  }, [filters]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('employeeCommitments');
      if (saved) setEmployeeCommitments(JSON.parse(saved) as Record<string, CommitmentEntry>);
    } catch (_e) {
      // ignore invalid/blocked cache
    }
  }, []);

  // ── Derived data ────────────────────────────────────────────────

  const filteredEmployees = useMemo(
    () =>
      employeesData.filter((emp) => {
        const matchesName = emp.name.toLowerCase().includes(filterName.toLowerCase());
        // The dropdown is built from `designation`, so compare that field
        // (it previously compared `department`, so any choice emptied the table).
        const matchesDesignation =
          filterDesignation === '' || emp.designation === filterDesignation;
        return matchesName && matchesDesignation;
      }),
    [employeesData, filterName, filterDesignation]
  );

  const uniqueDepartments = useMemo(
    () => [...new Set(employeesData.map((emp) => emp.department))],
    [employeesData]
  );

  // ── Helpers ─────────────────────────────────────────────────────

  const getNextWeekDateRange = () => {
    const today = new Date();
    const nextWeekStart = new Date(today);
    nextWeekStart.setDate(nextWeekStart.getDate() + (8 - nextWeekStart.getDay()));
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
    return { start: toLocalIsoDate(nextWeekStart), end: toLocalIsoDate(nextWeekEnd) };
  };

  // ── Handlers ────────────────────────────────────────────────────

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map((emp) => emp.id));
    }
    setSelectAll(!selectAll);
  };

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    );
  };

  const handleCommitmentChange = (employeeId: string, field: string, value: string) => {
    setEmployeeCommitments((prev) => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: Number.parseInt(value, 10) || 0,
      },
    }));
  };

  const handleRowClick = async (employee: Employee) => {
    try {
      const detailed = await getEmployeeDetailsApi(employee.id, dateRange?.start, dateRange?.end);
      setSelectedUserDetails(detailed);
    } catch (err: unknown) {
      console.error('Failed to fetch employee details', err);
      setSelectedUserDetails(employee);
    }
  };

  const handleSubmit = async () => {
    try {
      const { start, end } = getNextWeekDateRange();
      const payload = selectedEmployees
        .map((empId) => {
          const emp = employeesData.find((e) => e.id === empId);
          if (!emp) return null;
          return {
            employeeId: empId,
            name: emp.name,
            department: emp.department,
            target: emp.target,
            // Snapshot of this same row's other Dashboard stats, captured at
            // the exact moment Submit is clicked — these are already loaded
            // here (they're what's on screen), so History can later show
            // "what these were at the time," not just Target/Commitment.
            actualWorkDone: emp.actualWorkDone,
            weeklyWorkDone: emp.weeklyWorkDone,
            weeklyWorkDoneOnTime: emp.weeklyWorkDoneOnTime,
            totalWorkDone: emp.totalWorkDone,
            weekPending: emp.weekPending,
            allPendingTillDate: emp.allPendingTillDate,
            commitment: employeeCommitments[empId]?.commitment ?? 0,
            nextWeekPlannedWorkNotDone: employeeCommitments[empId]?.nextWeekPlannedWorkNotDone ?? 0,
            nextWeekPlannedWorkNotDoneOnTime:
              employeeCommitments[empId]?.nextWeekPlannedWorkNotDoneOnTime ?? 0,
            dateStart: start,
            dateEnd: end,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      await submitCommitmentsApi(payload);
      try {
        localStorage.setItem('employeeCommitments', JSON.stringify(employeeCommitments));
      } catch (_e) {
        // storage unavailable — the commitments are already saved server-side
      }
      toast.success('Commitments submitted successfully!');
      setSelectedEmployees([]);
      setSelectAll(false);
      await queryClient.invalidateQueries({ queryKey: MIS_DASHBOARD_QUERY_KEYS.all });
    } catch (err: unknown) {
      toast.error('Failed to submit commitments');
      console.error(err);
    }
  };

  return {
    // state
    selectedEmployees,
    selectAll,
    employeeCommitments,
    expandedEmployee,
    setExpandedEmployee,
    filterName,
    setFilterName,
    filterDesignation,
    setFilterDesignation,
    selectedUserDetails,
    setSelectedUserDetails,
    loading,
    error,
    employeesData,
    departmentsStats,
    // derived
    filteredEmployees,
    uniqueDepartments,
    // handlers
    handleSelectAll,
    handleEmployeeSelect,
    handleCommitmentChange,
    handleRowClick,
    handleSubmit,
  };
}

// YYYY-MM-DD in the browser's local calendar — toISOString() is UTC, which
// in IST reports the previous day for anything before 05:30.
export function toLocalIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
