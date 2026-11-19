'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useCrossCompanyWrite } from '@/features/organization/hooks/useCrossCompanyWrite';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import { useMisAuth } from '../../shared/utils/useMisAuth';
import { toLocalIsoDate, useDashboard } from '../hooks/useDashboard';
import { submitCommitmentsApi } from '../server/api/dashboardApi';
import { useDashboardUsers } from '../server/tanstackQuery/useDashboardQueries';
import ChartsGrid from './ChartsGrid';
import DashboardHeader from './DashboardHeader';
import DepartmentScores from './DepartmentScores';
import EmployeeListSection from './EmployeeListSection';
import PerformanceHistoryModal from './PerformanceHistoryModal';
import SummaryCards from './SummaryCards';
import UserDetailsModal from './UserDetailsModal';

// Same roles MISController.hasFullMisAccess lets see every employee. Read
// from the raw OS role, since useMisAuth maps COMPANY to 'user'.
const FULL_MIS_ACCESS_ROLES = new Set(['SUPERADMIN', 'ADMIN', 'COMPANY']);

// Local-calendar dates (toLocalIsoDate), never toISOString() — that's UTC,
// which in IST starts the week/month a day early before 05:30.
const getCurrentWeek = () => {
  const today = new Date();
  const day = today.getDay() || 7; // Mon=1 … Sun=7
  const start = new Date(today);
  start.setDate(today.getDate() - day + 1); // Monday
  const end = new Date(start);
  end.setDate(start.getDate() + 5); // Saturday
  return { start: toLocalIsoDate(start), end: toLocalIsoDate(end) };
};

// 1st of the current month through its last day.
const getCurrentMonth = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { start: toLocalIsoDate(start), end: toLocalIsoDate(end) };
};

type CommitmentRow = {
  employeeId: string;
  name: string;
  department: string;
  target: number;
  score: number;
  commitment: string;
  nextWeekPlannedWorkNotDone: number;
  nextWeekPlannedWorkNotDoneOnTime: number;
  dateStart: string;
  dateEnd: string;
  tenant?: { id: string; name: string } | null;
};

const AdminDashboard = () => {
  const { user } = useMisAuth();
  const osUser = useAppSelector(selectUser);
  const canFilterUsers = FULL_MIS_ACCESS_ROLES.has((osUser?.role as string) ?? '');
  const { run: runCrossCompanyWrite } = useCrossCompanyWrite<CommitmentRow>();
  const [dateRange, setDateRange] = useState(getCurrentWeek);
  const [periodMode, setPeriodMode] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showPerformanceHistory, setShowPerformanceHistory] = useState(false);

  // Switching Weekly/Monthly resets only the dates — the user selection is
  // an independent filter and is kept.
  const handlePeriodModeChange = (mode: 'weekly' | 'monthly') => {
    setPeriodMode(mode);
    setDateRange(mode === 'weekly' ? getCurrentWeek() : getCurrentMonth());
  };

  // Ignore a half-edited/invalid range (From after To) instead of fetching
  // an empty result for it.
  const handleDateRangeChange = (range: { start: string; end: string }) => {
    if (range.start && range.end && range.start > range.end) return;
    setDateRange(range);
  };

  const { data: userOptions = [], isPending: userOptionsLoading } =
    useDashboardUsers(canFilterUsers);

  // Drop selected ids that are no longer selectable (e.g. after switching
  // company / "All Companies"), so the filter never silently matches nobody.
  useEffect(() => {
    if (userOptionsLoading || selectedUserIds.length === 0) return;
    const valid = new Set(userOptions.map((u) => u.id));
    const kept = selectedUserIds.filter((id) => valid.has(id));
    if (kept.length !== selectedUserIds.length) setSelectedUserIds(kept);
  }, [userOptions, userOptionsLoading, selectedUserIds]);

  const {
    loading,
    employeesData,
    departmentsStats,
    filteredEmployees,
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
    handleSelectAll,
    handleEmployeeSelect,
    handleCommitmentChange,
    handleRowClick,
  } = useDashboard(dateRange, canFilterUsers ? selectedUserIds : undefined);

  useEffect(() => {
    if (selectedUserDetails) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedUserDetails]);

  const [scoreAsNegative, setScoreAsNegative] = useState(false);

  // A range longer than 8 days is a month (the Monthly preset); the backend
  // uses the same rule to pick last week's vs last month's commitment.
  const periodUnit: 'week' | 'month' =
    dateRange.start &&
    dateRange.end &&
    new Date(`${dateRange.end}T00:00:00`).getTime() -
      new Date(`${dateRange.start}T00:00:00`).getTime() >
      8 * 86_400_000
      ? 'month'
      : 'week';
  const P = periodUnit === 'month' ? 'Month' : 'Week';

  const columnLabels = {
    name: 'Name',
    designation: 'Designation',
    target: 'Target',
    actualWork: 'Actual Work Done',
    weeklyDone: '% Not Done',
    weeklyOnTime: 'On Time Not Done %',
    totalWork: 'Total Work Done',
    weekPending: 'Pending',
    allPending: 'All Pending',
    nextWeekPlannedNotDone: `Next ${P} Planned Work Not Done`,
    nextWeekPlannedNotDoneOnTime: `Next ${P} Planned Work Not Done On Time`,
    nextWeekCommitment: `Next ${P} Commitment`,
  };

  const ALL_COLUMNS = [
    { key: 'name', label: columnLabels.name },
    { key: 'designation', label: columnLabels.designation },
    { key: 'target', label: columnLabels.target },
    { key: 'actualWork', label: columnLabels.actualWork },
    { key: 'weeklyDone', label: columnLabels.weeklyDone },
    { key: 'weeklyOnTime', label: columnLabels.weeklyOnTime },
    { key: 'totalWork', label: columnLabels.totalWork },
    { key: 'weekPending', label: columnLabels.weekPending },
    { key: 'allPending', label: columnLabels.allPending },
    { key: 'lastWeekPlannedNotDone', label: `Last ${P} Planned Work Not Done %` },
    { key: 'lastWeekPlannedNotDoneOnTime', label: `Last ${P} Planned Work Not Done On Time %` },
    { key: 'lastWeekCommitment', label: `Last ${P} Commitment` },
    { key: 'nextWeekPlannedNotDone', label: columnLabels.nextWeekPlannedNotDone },
    { key: 'nextWeekPlannedNotDoneOnTime', label: columnLabels.nextWeekPlannedNotDoneOnTime },
    { key: 'nextWeekCommitment', label: columnLabels.nextWeekCommitment },
  ];

  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    ALL_COLUMNS.forEach((col) => {
      initial[col.key] = true;
    });
    return initial;
  });

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllColumns = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    const newVisibility: Record<string, boolean> = {};
    ALL_COLUMNS.forEach((col) => {
      newVisibility[col.key] = isChecked;
    });
    setVisibleColumns(newVisibility);
  };

  const [editableData, setEditableData] = useState<Record<string, any>>({});
  const [mainSubmitting, setMainSubmitting] = useState(false);

  useEffect(() => {
    if (selectedEmployees.length === 0) setEditableData({});
  }, [selectedEmployees]);

  const handleInputChange = (employeeId: string, field: string, value: string) => {
    if (field !== 'nextWeekCommitment' && value && !/^\d*$/.test(value)) return;
    setEditableData((prev) => ({ ...prev, [employeeId]: { ...prev[employeeId], [field]: value } }));
  };

  const handleCheckboxChange = (employeeId: string) => {
    const alreadySelected = selectedEmployees.includes(employeeId);
    if (!alreadySelected) {
      setEditableData((prev) => ({
        ...prev,
        [employeeId]: {
          nextWeekPlannedNotDone: '',
          nextWeekPlannedNotDoneOnTime: '',
          nextWeekCommitment: '',
        },
      }));
    } else {
      setEditableData((prev) => {
        const copy = { ...prev };
        delete copy[employeeId];
        return copy;
      });
    }
    handleEmployeeSelect(employeeId);
  };

  const handleMainSubmit = async (e: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (mainSubmitting) return;
    if (selectedEmployees.length === 0) {
      alert('Please select at least one person.');
      return;
    }

    setMainSubmitting(true);
    try {
      const payload: CommitmentRow[] = selectedEmployees
        .map((id) => {
          const emp = employeesData.find((e) => e.id === id);
          const inputs = editableData[id] || {};
          if (!emp) return null;
          return {
            employeeId: id,
            name: emp.name,
            department: emp.department,
            target: emp.target,
            score: emp.score ?? 0,
            commitment: inputs.nextWeekCommitment || '',
            nextWeekPlannedWorkNotDone: parseInt(inputs.nextWeekPlannedNotDone, 10) || 0,
            nextWeekPlannedWorkNotDoneOnTime:
              parseInt(inputs.nextWeekPlannedNotDoneOnTime, 10) || 0,
            dateStart: dateRange.start,
            dateEnd: dateRange.end,
            tenant: emp.tenant,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      // Selected employees can span companies in the merged "All Companies"
      // view — submitCommitmentsApi writes a whole batch under one tenant,
      // so each company's rows must be split into its own call.
      const { failed } = await runCrossCompanyWrite(payload, {
        getTenant: (row) => row.tenant,
        getId: (row) => row.employeeId,
        write: async (rows, actAsTenantId) => {
          const sanitized = rows.map(({ tenant: _tenant, ...rest }) => rest);
          await submitCommitmentsApi(sanitized, actAsTenantId);
          return { errors: [] };
        },
        onSettled: () => {},
      });

      if (failed.length > 0) {
        alert(
          `Failed to save for: ${failed.map((f) => f.row.name).join(', ')} — ${failed[0].error}`
        );
      } else {
        alert('Saved successfully ✅');
        setEditableData({});
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setMainSubmitting(false);
    }
  };

  // All three rankings read `filteredEmployees` — the same rows the table
  // shows — so the date range, user filter, name search and designation
  // filter all apply to the charts and the PDF exactly as they do to the table.
  //
  // Best performers only rank people who actually had work in the range —
  // a 0-task row "scores" 0% and otherwise filled the chart with 0/0 bars.
  // Ranked column by column, like the table: % Done, then % Done On Time,
  // then Total Work Done (higher is better), then Pending, then All Pending
  // (lower is better). Worst performers are the exact reverse order.
  const rankedForPerformance = useMemo(() => {
    const donePct = (e: any) => 100 - (Number(e.weeklyWorkDone) || 0);
    // Nothing finished yet = nothing finished on time.
    const onTimePct = (e: any) =>
      (Number(e.actualWorkDone) || 0) > 0 ? 100 - (Number(e.weeklyWorkDoneOnTime) || 0) : 0;
    const better = (a: any, b: any) =>
      donePct(b) - donePct(a) ||
      onTimePct(b) - onTimePct(a) ||
      (Number(b.totalWorkDone) || 0) - (Number(a.totalWorkDone) || 0) ||
      (Number(a.weekPending) || 0) - (Number(b.weekPending) || 0) ||
      (Number(a.allPendingTillDate) || 0) - (Number(b.allPendingTillDate) || 0);
    return [...filteredEmployees].filter((e) => (e.totalTasks ?? 0) > 0).sort(better);
  }, [filteredEmployees]);
  const topBestPerformers = useMemo(() => rankedForPerformance.slice(0, 5), [rankedForPerformance]);
  // Worst performers / Pending Tasks by User = most pending tasks WITHIN the
  // selected date range (weekPending, the table's "PENDING" column) — not
  // allPendingTillDate, which is "pending as of right now" regardless of any
  // date filter and so never changed when the filters did.
  const pendingTopList = useMemo(
    () =>
      [...filteredEmployees]
        .filter((e) => (e.weekPending ?? 0) > 0)
        .sort((a, b) => (b.weekPending ?? 0) - (a.weekPending ?? 0))
        .slice(0, 5),
    [filteredEmployees]
  );
  const worstPerformers = useMemo(
    () => [...rankedForPerformance].reverse().slice(0, 5),
    [rankedForPerformance]
  );

  // Department id is unique per company, so two companies' same-named
  // departments never merge into one bar here — but they'd look identical on
  // the chart's own axis labels without a company tag, so append one when
  // present (the ranking cards show it under each name for the same reason).
  const departmentScoresLabels = useMemo(
    () => departmentsStats.map((d) => (d.tenant ? `${d.name} (${d.tenant.name})` : d.name)),
    [departmentsStats]
  );
  // Matches the chart legend: amber = Total Pending Works (date-range
  // pending), blue = Work Not Done %, red = Not Done On Time %. It was fed
  // employeeCount / all-time pending / nothing, respectively.
  const departmentScoresPending = useMemo(
    () => departmentsStats.map((d) => d.pendingWorks || 0),
    [departmentsStats]
  );
  const departmentScoresNotDone = useMemo(
    () => departmentsStats.map((d) => d.workNotDonePct || 0),
    [departmentsStats]
  );
  const departmentScoresNotDoneOnTime = useMemo(
    () => departmentsStats.map((d) => d.notDoneOnTimePct || 0),
    [departmentsStats]
  );

  const rangeLabel = useMemo(() => {
    const fmt = (iso: string) =>
      new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    return dateRange.start && dateRange.end
      ? `${fmt(dateRange.start)} – ${fmt(dateRange.end)}`
      : '';
  }, [dateRange.start, dateRange.end]);

  const uniqueDesignations = useMemo(
    () => [...new Set(employeesData.map((emp) => emp.designation).filter(Boolean))],
    [employeesData]
  );

  return (
    <div className="space-y-4 lg:space-y-6 p-2 md:p-4">
      <DashboardHeader
        user={user}
        ALL_COLUMNS={ALL_COLUMNS}
        visibleColumns={visibleColumns}
        filteredEmployees={filteredEmployees}
        employeeCommitments={employeeCommitments}
        topWorstPerformers={worstPerformers}
        topBestPerformers={topBestPerformers}
        pendingTasks={pendingTopList}
        departmentScores={departmentsStats}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        scoreAsNegative={scoreAsNegative}
        onToggleScoreMode={() => setScoreAsNegative((prev) => !prev)}
        periodMode={periodMode}
        onPeriodModeChange={handlePeriodModeChange}
        onOpenPerformanceHistory={() => setShowPerformanceHistory(true)}
        canFilterUsers={canFilterUsers}
        userOptions={userOptions}
        userOptionsLoading={userOptionsLoading}
        selectedUserIds={selectedUserIds}
        onSelectedUserIdsChange={setSelectedUserIds}
        loading={loading}
      />

      <PerformanceHistoryModal
        isOpen={showPerformanceHistory}
        onClose={() => setShowPerformanceHistory(false)}
      />

      <SummaryCards employees={filteredEmployees} loading={loading} />

      <EmployeeListSection
        user={user}
        ALL_COLUMNS={ALL_COLUMNS}
        visibleColumns={visibleColumns}
        showColumnFilter={showColumnFilter}
        setShowColumnFilter={setShowColumnFilter}
        toggleColumn={toggleColumn}
        toggleAllColumns={toggleAllColumns}
        columnLabels={{
          ...columnLabels,
          // Score mode decides how the two percentage columns read on screen
          // (the PDF keeps the not-done figures under their fixed names).
          weeklyDone: scoreAsNegative ? '% Not Done' : '% Done',
          weeklyOnTime: scoreAsNegative ? '% Not Done On Time' : '% Done On Time',
        }}
        filterName={filterName}
        setFilterName={setFilterName}
        filterDepartment={filterDesignation}
        setFilterDepartment={setFilterDesignation}
        uniqueDesignations={uniqueDesignations}
        onMainSubmit={handleMainSubmit}
        selectedEmployees={selectedEmployees}
        mainSubmitting={mainSubmitting}
        loading={loading}
        filteredEmployees={filteredEmployees}
        selectAll={selectAll}
        handleSelectAll={handleSelectAll}
        handleCheckboxChange={handleCheckboxChange}
        handleEmployeeSelect={handleEmployeeSelect}
        handleRowClick={handleRowClick}
        editableData={editableData}
        handleInputChange={handleInputChange}
        expandedEmployee={expandedEmployee}
        setExpandedEmployee={setExpandedEmployee}
        employeeCommitments={employeeCommitments}
        handleCommitmentChange={handleCommitmentChange}
        scoreAsNegative={scoreAsNegative}
        periodUnit={periodUnit}
      />

      <UserDetailsModal
        selectedUserDetails={selectedUserDetails}
        setSelectedUserDetails={setSelectedUserDetails}
        dateRange={dateRange}
      />

      <ChartsGrid
        user={user}
        loading={loading}
        bestPerformers={topBestPerformers}
        worstPerformers={worstPerformers}
        pendingTop={pendingTopList}
        rangeLabel={rangeLabel}
      />

      {(user?.role === 'admin' || user?.role === 'superadmin') && (
        <DepartmentScores
          labels={departmentScoresLabels}
          pendingData={departmentScoresPending}
          notDoneData={departmentScoresNotDone}
          notDoneOnTimeData={departmentScoresNotDoneOnTime}
          employeeCounts={departmentsStats.map((d: any) => d.employeeCount)}
          details={departmentsStats.map((d: any) => ({
            target: d.target,
            actualWorkDone: d.actualWorkDone,
            totalWorkDone: d.totalWorkDone,
            allPending: d.allPending,
          }))}
          scoreAsNegative={scoreAsNegative}
          loading={loading}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
