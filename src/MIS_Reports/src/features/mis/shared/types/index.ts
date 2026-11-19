export interface Employee {
  id: string;
  name: string;
  email: string;
  image: string;
  department: string;
  designation: string;
  score: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
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
  commitment: number;
  nextWeekPlannedWorkNotDone: number;
  nextWeekPlannedWorkNotDoneOnTime: number;
  nextWeekCommitment: number;
  weeklyCommitment: number;
  // Dynamic fields for inputs
  tasks?: Task[];
  // Present only in an org owner's "All Companies" merged view — see
  // useRequireCompanySelected.ts / selectOrgViewMode.
  tenant?: { id: string; name: string } | null;
}

export interface Task {
  id: string;
  fmsName: string;
  taskName: string;
  personName: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  todayTask: string;
  // Additional fields from dashboard demo data
  target?: number;
  actualAchievement?: number;
  workNotDone?: number;
  workNotDoneOnTime?: number;
  allPendingTillDate?: number;
}

export interface Department {
  id: string;
  name: string;
  employeeCount: number;
  averageScore: number;
}

export interface EmployeeCommitment {
  id?: string; // key from localStorage might just be empId
  commitment: number;
  nextWeekPlannedWorkNotDone: number;
  nextWeekPlannedWorkNotDoneOnTime: number;
}

export interface CommitmentHistoryItem {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  target: number;
  score: number;
  // Snapshot of the Dashboard's "List of People" row for this employee at
  // the moment the commitment was submitted. null on any commitment
  // submitted before these columns existed — never backfilled.
  actualWorkDone: number | null;
  weeklyWorkDone: number | null;
  weeklyWorkDoneOnTime: number | null;
  totalWorkDone: number | null;
  weekPending: number | null;
  allPendingTillDate: number | null;
  commitment: string;
  nextWeekPlannedWorkNotDone: number;
  nextWeekPlannedWorkNotDoneOnTime: number;
  dateStart: string;
  dateEnd: string;
  submittedAt: string;
  /** MANUAL = submitted from the Dashboard; AUTO = saved by the auto-submit trigger. */
  source?: 'MANUAL' | 'AUTO';
  // Present only in an org owner's "All Companies" merged view — see
  // useRequireCompanySelected.ts / selectOrgViewMode.
  tenant?: { id: string; name: string } | null;
}
