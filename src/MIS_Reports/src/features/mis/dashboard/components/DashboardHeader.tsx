'use client';

import { BarChart3, Calendar, Download } from 'lucide-react';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import { generateDashboardPDF } from '../../shared/utils/pdfGenerator';
import AutoSubmitControl from './AutoSubmitControl';
import UserFilterDropdown from './UserFilterDropdown';

const DashboardHeader = ({
  user,
  ALL_COLUMNS,
  visibleColumns,
  filteredEmployees,
  employeeCommitments,
  topWorstPerformers,
  topBestPerformers,
  pendingTasks,
  departmentScores = [],
  dateRange,
  onDateRangeChange,
  scoreAsNegative,
  onToggleScoreMode,
  periodMode,
  onPeriodModeChange,
  onOpenPerformanceHistory,
  canFilterUsers = false,
  userOptions = [],
  userOptionsLoading = false,
  selectedUserIds = [],
  onSelectedUserIdsChange,
  loading = false,
}: any) => {
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  // The auto-submit setting belongs to one company, so it is hidden in the
  // merged "All Companies" view.
  const orgViewMode = useAppSelector(selectOrgViewMode);

  const handleDownload = () => {
    const visibleColsList = ALL_COLUMNS.filter(
      (col: any) =>
        visibleColumns[col.key] &&
        !['nextWeekPlannedNotDone', 'nextWeekPlannedNotDoneOnTime', 'nextWeekCommitment'].includes(
          col.key
        )
    );
    const exportData = filteredEmployees.map((emp: any) => ({
      ...emp,
      nextWeekPlannedWorkNotDone:
        employeeCommitments[emp.id]?.nextWeekPlannedWorkNotDone || emp.nextWeekPlannedWorkNotDone,
      nextWeekPlannedWorkNotDoneOnTime:
        employeeCommitments[emp.id]?.nextWeekPlannedWorkNotDoneOnTime ||
        emp.nextWeekPlannedWorkNotDoneOnTime,
      nextWeekCommitment: employeeCommitments[emp.id]?.commitment || emp.nextWeekCommitment,
    }));
    const selectedUserNames = userOptions
      .filter((u: { id: string }) => selectedUserIds.includes(u.id))
      .map((u: { name: string }) => u.name);
    generateDashboardPDF(
      visibleColsList,
      exportData,
      topBestPerformers,
      pendingTasks,
      topWorstPerformers,
      departmentScores,
      user?.companyName || 'AutoRocket',
      {
        dateRange,
        periodMode,
        selectedUserNames,
        scoreAsNegative,
      }
    );
  };

  const fmtDay = (iso?: string) =>
    iso
      ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '';
  const dateInputClass =
    'h-9 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:[color-scheme:dark]';

  return (
    <div className="flex flex-col gap-4">
      {/* Title row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            MIS · {periodMode === 'monthly' ? 'Monthly' : 'Weekly'} review
          </span>
          <h1 className="text-xl md:text-[28px] font-bold tracking-tight text-foreground">
            {isAdmin
              ? 'Admin Dashboard'
              : user?.role === 'hod'
                ? 'HOD Dashboard'
                : 'Employee Dashboard'}
          </h1>
          {dateRange?.start && dateRange?.end && (
            <span className="text-sm text-muted-foreground">
              {fmtDay(dateRange.start)} – {fmtDay(dateRange.end)}
              {!loading && ` · ${filteredEmployees.length} people tracked`}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading}
          title={loading ? 'Waiting for the filtered data to load…' : undefined}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 hover:shadow-[0_8px_20px_-8px_rgba(220,38,38,0.6)] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          Download PDF Report
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/60 px-3 py-1.5">
          <Calendar className="h-4 w-4 text-blue-500" />
          <label htmlFor="mis-dashboard-from" className="sr-only">
            From
          </label>
          <input
            id="mis-dashboard-from"
            type="date"
            value={dateRange?.start || ''}
            max={dateRange?.end || undefined}
            onChange={(e) => onDateRangeChange?.({ ...dateRange, start: e.target.value })}
            className={dateInputClass}
          />
          <span className="text-muted-foreground" aria-hidden="true">
            →
          </span>
          <label htmlFor="mis-dashboard-to" className="sr-only">
            To
          </label>
          <input
            id="mis-dashboard-to"
            type="date"
            value={dateRange?.end || ''}
            min={dateRange?.start || undefined}
            onChange={(e) => onDateRangeChange?.({ ...dateRange, end: e.target.value })}
            className={dateInputClass}
          />
        </div>

        {/* Weekly/Monthly — auto-sets From/To to the current week (Mon..Sat)
            or the current calendar month. */}
        <div role="group" aria-label="Period" className="flex rounded-xl bg-muted/60 p-1">
          {(['weekly', 'monthly'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={periodMode === mode}
              onClick={() => onPeriodModeChange?.(mode)}
              className={`h-8 rounded-lg px-3.5 text-sm transition-all ${
                periodMode === mode
                  ? 'bg-card font-semibold text-foreground shadow-sm'
                  : 'font-medium text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode === 'weekly' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>

        {/* User filter — server-side, combined with the date range above.
            Hidden for restricted roles, who only ever see themselves. */}
        {canFilterUsers && (
          <UserFilterDropdown
            users={userOptions}
            loading={userOptionsLoading}
            selectedUserIds={selectedUserIds}
            onChange={(ids) => onSelectedUserIdsChange?.(ids)}
          />
        )}

        <button
          type="button"
          onClick={onToggleScoreMode}
          className={`h-9 rounded-xl border px-3 text-sm font-semibold whitespace-nowrap transition-colors ${
            scoreAsNegative
              ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20'
          }`}
        >
          Score: {scoreAsNegative ? 'Negative (−)' : 'Positive (+)'}
        </button>

        {canFilterUsers && orgViewMode !== 'all' && <AutoSubmitControl />}

        <div className="hidden flex-1 lg:block" />

        <button
          type="button"
          onClick={onOpenPerformanceHistory}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold whitespace-nowrap text-blue-600 transition-colors hover:bg-muted dark:text-blue-400"
        >
          <BarChart3 className="h-4 w-4" />
          Performance history
        </button>
      </div>
    </div>
  );
};

export default DashboardHeader;
