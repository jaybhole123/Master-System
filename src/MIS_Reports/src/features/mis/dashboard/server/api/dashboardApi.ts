import { actAsTenantHeaders } from '@/features/organization/utils/actAsTenant';
import { api } from '@/lib/axios';
import type { Employee } from '../../../shared/types';

export interface MyDashboardData {
  profile: {
    name: string;
    initials: string;
    role: string;
    department: string;
    /** Additive — absent on older responses. */
    designation?: string | null;
    email: string;
    joinedDate: string;
    bloodGroup: string | null;
    employeeId: string | null;
    /** Employee ID to SHOW: HR employee code, or the ID typed at user creation. */
    employeeCode?: string | null;
  };
  mis: { score: number; rank: string; dept: string; month: string };
  monthly: { tasksCompleted: number; totalTasks: number; pendingTasks: number };
  taskSummary: {
    checklist: { done: number; total: number };
    delegation: { done: number; total: number };
  };
  attendance: {
    present: number;
    late: number;
    leave: number;
    workingDays: number;
    // Additive — absent on older responses / the unlinked-login fallback.
    halfDays?: number;
    misPunch?: number;
    lateMinutes?: number;
    recentDays: { day: number; status: 'present' | 'late' | 'leave' | 'absent'; today?: boolean }[];
  };
  leaveBalance: {
    annual: { used: number; total: number };
    privilege: { used: number; total: number };
    casual: { used: number; total: number };
  };
  // Present only when this login is linked to an HR employee AND the tenant
  // has configured leave types — one row per active LeaveType, computed by
  // the same LeavePolicyService.getBalances() the HR FMS Leave Balance
  // Report uses. The widget renders from this (real, per-configured-type)
  // when available, falling back to the fixed 3-bucket `leaveBalance` above
  // only when it's absent.
  leaveBalances?: LeaveBalanceItem[];
}

export interface LeaveBalanceItem {
  leaveTypeId: string;
  code: string;
  name: string;
  isPaid: boolean;
  annualQuota: number;
  accrual: 'YEARLY' | 'MONTHLY' | 'WEEKLY';
  accrued: number;
  adjusted: number;
  used: number;
  pending: number;
  available: number;
  availableAfterPending: number;
  allowNegative: boolean;
  allowHalfDay: boolean;
  isCompOff: boolean;
}

// Only present for a multi-company identity user (see UserIdentity):
// getMyDashboardApi returns one MyDashboardData per linked company instead
// of a single object, each tagged with which company it's for — rank/
// performance/attendance are inherently relative to one company's own
// colleagues/calendar, so they're never blended into one combined view.
export type MyDashboardEntry = MyDashboardData & { tenant: { id: string; name: string } };

export const getMyDashboardApi = async (): Promise<MyDashboardData | MyDashboardEntry[]> => {
  const response = await api.get('/mis/my-dashboard');
  return response.data;
};

export interface CelebrationItem {
  employeeId: string;
  name: string;
  photo: string | null;
  designation: string | null;
  type: 'birthday' | 'anniversary';
  date: string;
  daysUntil: number;
  years?: number;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  desc: string | null;
  dept: string;
  priority: string;
  time: string | null;
  createdAt: string;
}

/** Announcements the Executive Assistant posted — all-department ones plus the user's own department's. */
export const getAnnouncementsApi = async (): Promise<AnnouncementItem[]> => {
  const response = await api.get('/mis/announcements');
  return response.data;
};

export const getCelebrationsApi = async (): Promise<CelebrationItem[]> => {
  const response = await api.get('/mis/celebrations');
  return response.data;
};

export interface DashboardFilters {
  fromDate?: string;
  toDate?: string;
  // Empty/omitted = every user. Sent comma-joined; the backend ignores it
  // for restricted (non-admin) callers, who only ever see themselves.
  userIds?: string[];
}

const toFilterParams = ({ fromDate, toDate, userIds }: DashboardFilters) => {
  const params: Record<string, string> = {};
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;
  if (userIds && userIds.length > 0) params.userIds = userIds.join(',');
  return params;
};

export const getDashboardData = async (filters: DashboardFilters = {}): Promise<Employee[]> => {
  try {
    const response = await api.get('/mis/dashboard', { params: toFilterParams(filters) });
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.employees)) return data.employees;
    return [];
  } catch (_error) {
    return [];
  }
};

export interface DashboardUserOption {
  id: string;
  name: string;
  department: string;
  designation: string;
  tenant?: { id: string; name: string } | null;
}

// Options for the user filter — deliberately NOT derived from
// getDashboardData, whose response is itself narrowed by the selection.
export const getDashboardUsersApi = async (): Promise<DashboardUserOption[]> => {
  try {
    const response = await api.get('/mis/dashboard/users');
    return response.data;
  } catch (_error) {
    return [];
  }
};

export interface DepartmentStat {
  id: string;
  name: string;
  employeeCount: number;
  averageScore: number;
  // Date-range pending (same as the table's PENDING column), summed.
  pendingWorks: number;
  // All pending till today, summed — independent of the date range.
  allPending: number;
  workNotDonePct: number;
  notDoneOnTimePct: number;
  // Present only in an org owner's "All Companies" merged view.
  tenant?: { id: string; name: string } | null;
}

export const submitCommitmentsApi = async (commitments: any[], actAsTenantId?: string) => {
  const response = await api.post(
    '/mis/commitments',
    commitments,
    actAsTenantHeaders(actAsTenantId)
  );
  return response.data;
};

export const getDepartmentStatsApi = async (
  filters: DashboardFilters = {}
): Promise<DepartmentStat[]> => {
  try {
    const response = await api.get('/mis/departments/stats', { params: toFilterParams(filters) });
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.departmentStats)) return data.departmentStats;
    return [];
  } catch (_error) {
    return [];
  }
};
export const getEmployeeDetailsApi = async (
  id: string,
  fromDate?: string,
  toDate?: string,
  actAsTenantId?: string
) => {
  const params: Record<string, string> = {};
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;
  const response = await api.get(`/mis/employee/${id}`, {
    params,
    ...actAsTenantHeaders(actAsTenantId),
  });
  return response.data;
};

// Fetch individual task instances for drill-down (Planned / Actual / Delay rows)
// useStartDate=true  →  filter by task createdAt/startDate  (Checklist, Maintenance)
// useStartDate=false →  filter by planned/dueDate            (all other systems)
export const getEmployeeTaskDetailsApi = async (
  employeeId: string,
  systemName: string,
  taskName: string,
  fromDate?: string,
  toDate?: string,
  useStartDate = false,
  actAsTenantId?: string
) => {
  const params: Record<string, string> = {};
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;
  params.dateColumn = useStartDate ? 'startDate' : 'planned';
  const response = await api.get(`/mis/employee/${employeeId}/task-details`, {
    params: { ...params, system: systemName, task: taskName },
    ...actAsTenantHeaders(actAsTenantId),
  });
  return response.data; // expects: { rows: [{taskName, planned, actual, delay}] }
};

export interface PeriodSnapshotRow {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string | null;
  department: string | null;
  designation: string | null;
  periodType: 'WEEKLY' | 'MONTHLY';
  dateStart: string;
  dateEnd: string;
  target: number;
  actualWorkDone: number;
  weeklyWorkDone: number;
  weeklyWorkDoneOnTime: number;
  totalWorkDone: number;
  weekPending: number;
  allPendingTillDate: number;
  plannedWorkNotDone: number;
  plannedWorkNotDoneOnTime: number;
  commitment: string;
  score: number;
  capturedAt: string;
  // Profile photo (null → initials avatar).
  image?: string | null;
  tenant?: { id: string; name: string };
}

// Reads back the scheduled job's saved snapshot rows (see
// src/workers/misSnapshotScheduler.ts on the backend) — never live-computed,
// so a past week/month's numbers stay exactly what they were when that
// period closed, immune to later edits to the underlying task data.
export const getPeriodSnapshotsApi = async (
  periodType: 'WEEKLY' | 'MONTHLY',
  fromDate?: string,
  toDate?: string
): Promise<PeriodSnapshotRow[]> => {
  const params: Record<string, string> = { periodType };
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;
  const response = await api.get('/mis/snapshots', { params });
  return response.data;
};

export const getTodayTasksApi = async () => {
  const response = await api.get('/mis/tasks/today');
  return response.data;
};

export const getPendingTasksApi = async () => {
  const response = await api.get('/mis/tasks/pending');
  return response.data;
};

// ── MIS auto-submit trigger (per company) ───────────────────────────────────
export type AutoSubmitPeriod = 'WEEKLY' | 'MONTHLY';
export interface AutoSubmitSetting {
  enabled: boolean;
  period: AutoSubmitPeriod;
  updatedAt: string | null;
}

export const getAutoSubmitSettingApi = async (): Promise<AutoSubmitSetting> => {
  const response = await api.get('/mis/auto-submit-setting');
  return response.data;
};

export const updateAutoSubmitSettingApi = async (setting: {
  enabled: boolean;
  period: AutoSubmitPeriod;
}): Promise<AutoSubmitSetting> => {
  const response = await api.put('/mis/auto-submit-setting', setting);
  return response.data;
};
