'use client';

import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  ListChecks,
  Loader2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import ReactDOM from 'react-dom';
import PersonAvatar from '../../shared/components/PersonAvatar';
import { delayMinutesOf, formatDelay } from '../../shared/utils/formatDelay';
import { getEmployeeTaskDetailsApi } from '../server/api/dashboardApi';

// Systems that filter by task start date (createdAt) instead of planned/dueDate
const START_DATE_SYSTEMS = ['checklist', 'maintenance'];
const isStartDateSystem = (fmsName: string) =>
  START_DATE_SYSTEMS.some((s) => fmsName?.toLowerCase().includes(s));

type DrillRow = {
  taskName: string;
  planned: string;
  actual: string | null;
  delay: number;
  // Exact lateness (planned → done, or planned → now while still open).
  delayMinutes?: number;
  status?: string;
  // false = scheduled before the selected period and still open — listed so
  // "All Pending Till Date" adds up, but not part of this period's Target.
  inPeriod?: boolean;
};

type DrillState = {
  fmsName: string;
  taskName: string;
  rows: DrillRow[];
  loading: boolean;
  error: string | null;
  filter: 'all' | 'ontime' | 'pending' | 'delay' | 'older';
};

// A row's own single displayed STATUS label — kept exactly as before
// ("DELAY" for a not-done task whose planned date has already passed, so
// the badge reads correctly). This is a label, not a tab filter: see
// isPending/isDelay below for why the "Pending" TAB can't just check
// getRowStatus(r) === 'pending' — a row can legitimately belong to both.
const getRowStatus = (row: DrillRow): 'ontime' | 'pending' | 'delay' => {
  const status = row.status?.toLowerCase();
  const delay = delayMinutesOf(row);
  if (status === 'pending' || (!row.actual && !status)) {
    // Overdue pending tasks (planned date passed) → classify as delay
    return delay > 0 ? 'delay' : 'pending';
  }
  if (delay > 0) return 'delay';
  return 'ontime';
};

// Whether a row is still outstanding at all (no actual completion recorded
// yet) — regardless of whether it's also overdue. Deliberately broader than
// getRowStatus's 'pending' bucket: the header's "All Pending Till Date"
// count already includes overdue-and-not-done tasks, so the Pending TAB
// must too, or clicking it contradicts the number shown right next to it
// (a not-done, overdue task used to vanish from "Pending" entirely once it
// also qualified as "Delay" — the exact mismatch this fixes).
const isPending = (row: DrillRow) => {
  const status = row.status?.toLowerCase();
  return status === 'pending' || (!row.actual && !status);
};
const isDelay = (row: DrillRow) => delayMinutesOf(row) > 0;

// What the row's badge says. A not-done task past its planned date reads
// "Overdue" (still to do), a done-late task "Done Late" — both used to read
// "DELAY", which hid whether the work was finished.
type RowTone = 'ontime' | 'late' | 'overdue' | 'pending';
const getRowTone = (row: DrillRow): RowTone => {
  const s = getRowStatus(row);
  if (s === 'ontime') return 'ontime';
  if (s === 'pending') return 'pending';
  return isPending(row) ? 'overdue' : 'late';
};
const TONE: Record<
  RowTone,
  { label: string; badge: string; dot: string; bar: string; delay: string }
> = {
  ontime: {
    label: 'On Time',
    badge:
      'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
    dot: 'bg-emerald-500',
    bar: 'border-l-emerald-500',
    delay: 'text-emerald-700 dark:text-emerald-300',
  },
  late: {
    label: 'Done Late',
    badge:
      'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
    dot: 'bg-amber-500',
    bar: 'border-l-amber-500',
    delay: 'text-amber-700 dark:text-amber-300',
  },
  overdue: {
    label: 'Overdue',
    badge:
      'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/20',
    dot: 'bg-red-500',
    bar: 'border-l-red-500',
    delay: 'text-red-700 dark:text-red-300',
  },
  pending: {
    label: 'Pending',
    badge:
      'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20',
    dot: 'bg-sky-500',
    bar: 'border-l-sky-500',
    delay: 'text-sky-700 dark:text-sky-300',
  },
};

// Date and time on two lines so the columns stay narrow and scannable.
const DateCell = ({ iso }: { iso: string | null }) => {
  if (!iso) return <span className="text-muted-foreground">—</span>;
  const d = new Date(iso);
  return (
    <div className="leading-tight">
      <div className="text-foreground">
        {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
      </div>
      <div className="text-[11px] text-muted-foreground">
        {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
      </div>
    </div>
  );
};

// Each filter tile carries the same colour as the rows it shows.
const FILTERS = [
  {
    key: 'all',
    label: 'All',
    hint: 'Every task in this period',
    Icon: ListChecks,
    tile: 'border-blue-200 bg-blue-50/60 dark:border-blue-500/30 dark:bg-blue-500/10',
    active: 'ring-2 ring-blue-500 border-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
  },
  {
    key: 'ontime',
    label: 'On Time',
    hint: 'Done before the planned time',
    Icon: CheckCircle2,
    tile: 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/10',
    active: 'ring-2 ring-emerald-500 border-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    key: 'delay',
    label: 'Delay',
    hint: 'Done late or overdue',
    Icon: AlertTriangle,
    tile: 'border-red-200 bg-red-50/60 dark:border-red-500/30 dark:bg-red-500/10',
    active: 'ring-2 ring-red-500 border-red-500',
    text: 'text-red-700 dark:text-red-300',
  },
  {
    key: 'pending',
    label: 'Pending',
    hint: 'Not done yet',
    Icon: Clock,
    tile: 'border-sky-200 bg-sky-50/60 dark:border-sky-500/30 dark:bg-sky-500/10',
    active: 'ring-2 ring-sky-500 border-sky-500',
    text: 'text-sky-700 dark:text-sky-300',
  },
  {
    key: 'older',
    label: 'Earlier pending',
    hint: 'From before this period, still not done',
    Icon: History,
    tile: 'border-amber-200 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/10',
    active: 'ring-2 ring-amber-500 border-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
  },
] as const;

const UserDetailsModal = ({ selectedUserDetails, setSelectedUserDetails, dateRange }: any) => {
  const [drill, setDrill] = useState<DrillState | null>(null);
  // The system whose pages are open (null = the system summary).
  const [systemView, setSystemView] = useState<string | null>(null);

  const handleTaskRowClick = async (task: any) => {
    const useStartDate = isStartDateSystem(task.fmsName || '');
    setDrill({
      fmsName: task.fmsName,
      taskName: task.taskName,
      rows: [],
      loading: true,
      error: null,
      filter: 'all',
    });
    try {
      const data = await getEmployeeTaskDetailsApi(
        selectedUserDetails.id,
        task.fmsName,
        task.taskName,
        dateRange?.start,
        dateRange?.end,
        useStartDate
      );
      setDrill((prev) => (prev ? { ...prev, rows: data?.rows ?? [], loading: false } : null));
    } catch (_err: any) {
      setDrill((prev) =>
        prev ? { ...prev, loading: false, error: 'Failed to load details' } : null
      );
    }
  };

  const handleClose = () => {
    setDrill(null);
    setSystemView(null);
    setSelectedUserDetails(null);
  };

  if (!selectedUserDetails) return null;

  const tasks: any[] = selectedUserDetails.tasks ?? [];

  // One place decides which rows each filter shows, so the tile counts and
  // the list always agree.
  const rowsFor = (f: DrillState['filter']): DrillRow[] => {
    if (!drill) return [];
    // The four period tiles count only this period's tasks, so they match
    // the Target / Done / Pending the row was opened from.
    if (f === 'older') return drill.rows.filter((r) => r.inPeriod === false);
    const inPeriod = drill.rows.filter((r) => r.inPeriod !== false);
    if (f === 'pending') return inPeriod.filter(isPending);
    if (f === 'delay') return inPeriod.filter(isDelay);
    // 'ontime' — the one row-status the label and the tab already agree on
    if (f === 'ontime') return inPeriod.filter((r) => getRowStatus(r) === 'ontime');
    return inPeriod;
  };
  const filteredDrillRows = drill ? rowsFor(drill.filter) : [];

  const visibleTasks = tasks.filter(
    (t: any) => Number(t.target) > 0 || Number(t.allPendingTillDate) > 0
  );
  const departmentOf = (t: any) => t?.department || selectedUserDetails.department || '—';

  // One row per system. Page rows carry only percentages, so each page's
  // done / late counts are rebuilt from its target (achievement = done ÷
  // target, on-time-not-done = late ÷ done, both rounded) and summed.
  const systemRows = (() => {
    const bySystem = new Map<string, any[]>();
    for (const t of visibleTasks) {
      const key = t.fmsName || '—';
      bySystem.set(key, [...(bySystem.get(key) ?? []), t]);
    }
    return [...bySystem.entries()].map(([fmsName, pages]) => {
      let target = 0;
      let done = 0;
      let late = 0;
      let allPending = 0;
      for (const p of pages) {
        const t = Number(p.target) || 0;
        const d = Math.round((t * (Number(p.actualAchievement) || 0)) / 100);
        target += t;
        done += d;
        late += Math.round((d * (Number(p.workNotDoneOnTime) || 0)) / 100);
        allPending += Number(p.allPendingTillDate) || 0;
      }
      const achievement = target > 0 ? Math.round((done / target) * 100) : 0;
      return {
        fmsName,
        department: departmentOf(pages[0]),
        pageCount: pages.length,
        target,
        actualAchievement: achievement,
        workNotDone: target > 0 ? 100 - achievement : 0,
        workNotDoneOnTime: done > 0 ? Math.round((late / done) * 100) : 0,
        allPendingTillDate: allPending,
      };
    });
  })();
  const systemPages = systemView
    ? visibleTasks.filter((t: any) => (t.fmsName || '—') === systemView)
    : [];

  const statCells = (row: any) => (
    <>
      <td className="px-4 py-3 text-center text-foreground tabular-nums">{row.target ?? '—'}</td>
      <td className="px-4 py-3 text-center text-foreground tabular-nums">
        {row.actualAchievement != null ? `${row.actualAchievement}%` : (row.completedCount ?? '—')}
      </td>
      <td className="px-4 py-3 text-center tabular-nums">
        <span
          className={`font-semibold ${
            Number(row.workNotDone) > 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {row.workNotDone != null ? `${row.workNotDone}%` : '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-center tabular-nums">
        <span
          className={`font-semibold ${
            Number(row.workNotDoneOnTime) > 0
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {row.workNotDoneOnTime != null ? `${row.workNotDoneOnTime}%` : '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-center tabular-nums">
        <span
          className={`font-semibold ${
            Number(row.allPendingTillDate) > 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-foreground'
          }`}
        >
          {row.allPendingTillDate ?? '—'}
        </span>
      </td>
      <td className="px-3 py-3 text-muted-foreground">
        <ChevronRight className="h-4 w-4" />
      </td>
    </>
  );
  const statHeads = (
    <>
      <th className="px-4 py-2.5 text-center font-medium whitespace-nowrap">Target</th>
      <th className="px-4 py-2.5 text-center font-medium whitespace-nowrap">Achievement</th>
      <th className="px-4 py-2.5 text-center font-medium whitespace-nowrap">% Work Not Done</th>
      <th className="px-4 py-2.5 text-center font-medium whitespace-nowrap">
        % Work Not Done On Time
      </th>
      <th className="px-4 py-2.5 text-center font-medium whitespace-nowrap">
        All Pending Till Date
      </th>
      <th className="w-8 px-3 py-2.5">
        <span className="sr-only">Open</span>
      </th>
    </>
  );

  const modal = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 md:p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col border border-border">
        {/* ── Header ── */}
        <div className="sticky top-0 bg-card border-b border-border px-4 md:px-5 py-3.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {(drill || systemView) && (
              <button
                type="button"
                onClick={() => (drill ? setDrill(null) : setSystemView(null))}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                title="Back"
              >
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <PersonAvatar
              src={selectedUserDetails.image}
              name={selectedUserDetails.name}
              size={36}
            />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground truncate">
                {drill ? drill.taskName : (systemView ?? selectedUserDetails.name)}
              </h2>
              <p className="text-xs text-muted-foreground truncate">
                {drill || systemView ? (
                  <>
                    {drill ? drill.fmsName : departmentOf(systemPages[0])}
                    <span className="mx-1.5">·</span>
                    {selectedUserDetails.name}
                  </>
                ) : (
                  selectedUserDetails.department || 'Work summary'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-full transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-auto">
          {/* ══ LEVEL 2: Drill-down ══ */}
          {drill ? (
            <div className="p-4 md:p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h3 className="text-sm font-semibold text-foreground">Total Achievement Details</h3>
                {!drill.loading && !drill.error && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20">
                      This period: {rowsFor('all').length}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-pink-50 px-2 py-0.5 font-medium text-pink-700 ring-1 ring-inset ring-pink-600/20 dark:bg-pink-500/10 dark:text-pink-300 dark:ring-pink-400/20">
                      All Pending Till Date: {drill.rows.filter(isPending).length}
                    </span>
                  </div>
                )}
              </div>

              {/* Summary: each tile is also the filter for the list below */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {FILTERS.map((f) => {
                  const count = drill.loading || drill.error ? null : rowsFor(f.key).length;
                  const active = drill.filter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setDrill((prev) => (prev ? { ...prev, filter: f.key } : null))}
                      className={`rounded-lg border px-3 py-2.5 text-left transition-all hover:shadow-sm ${f.tile} ${
                        active ? f.active : ''
                      }`}
                    >
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${f.text}`}>
                        <f.Icon className="h-3.5 w-3.5" />
                        {f.label}
                      </div>
                      <div className={`mt-1 text-2xl font-bold tabular-nums ${f.text}`}>
                        {count ?? '–'}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{f.hint}</div>
                    </button>
                  );
                })}
              </div>

              {drill.loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : drill.error ? (
                <div className="text-center py-12 text-destructive text-sm">{drill.error}</div>
              ) : filteredDrillRows.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {drill.filter !== 'older' && rowsFor('older').length > 0
                    ? 'Nothing here in this period — open "Earlier pending" for older open tasks'
                    : 'No records in this view'}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-2.5 text-left font-medium">Task</th>
                        <th className="px-4 py-2.5 text-left font-medium">Planned</th>
                        <th className="px-4 py-2.5 text-left font-medium">Done On</th>
                        <th className="px-4 py-2.5 text-right font-medium">Delay</th>
                        <th className="px-4 py-2.5 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredDrillRows.map((row, i) => {
                        const tone = TONE[getRowTone(row)];
                        const delay = delayMinutesOf(row);
                        return (
                          <tr key={i} className="hover:bg-muted/40 transition-colors">
                            <td className={`border-l-4 px-4 py-3 ${tone.bar}`}>
                              <div className="flex items-center gap-2.5">
                                <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
                                <span className="font-medium text-foreground">
                                  {row.taskName || '—'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <DateCell iso={row.planned} />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {row.actual ? (
                                <DateCell iso={row.actual} />
                              ) : (
                                <span className="text-xs italic text-muted-foreground">
                                  Not done yet
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                              {delay > 0 ? (
                                <span className={`font-semibold ${tone.delay}`}>
                                  {formatDelay(delay)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone.badge}`}
                              >
                                {tone.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 md:p-5">
              {visibleTasks.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  No system/task data available for this employee
                </div>
              ) : !systemView ? (
                /* ══ LEVEL 1: one row per system ══ */
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-[11px] text-muted-foreground uppercase tracking-wide">
                        <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                          System
                        </th>
                        <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                          Department
                        </th>
                        {statHeads}
                      </tr>
                    </thead>
                    <tbody>
                      {systemRows.map((row) => (
                        <tr
                          key={row.fmsName}
                          onClick={() => setSystemView(row.fmsName)}
                          className="border-t border-border hover:bg-muted/60 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-semibold text-foreground">{row.fmsName}</div>
                            <div className="text-xs text-muted-foreground">
                              {row.pageCount} {row.pageCount === 1 ? 'page' : 'pages'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {row.department}
                          </td>
                          {statCells(row)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* ══ LEVEL 2: the system's pages, stage by stage ══ */
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-[11px] text-muted-foreground uppercase tracking-wide">
                        <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                          Page / Stage
                        </th>
                        {statHeads}
                      </tr>
                    </thead>
                    <tbody>
                      {systemPages.map((task: any, i: number) => (
                        <tr
                          key={`${task.taskName}-${i}`}
                          onClick={() => handleTaskRowClick(task)}
                          className="border-t border-border hover:bg-muted/60 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                            {task.taskName || '—'}
                          </td>
                          {statCells(task)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="sticky bottom-0 bg-card border-t border-border px-4 py-2.5 flex justify-end flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-1.5 border border-border rounded text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
};

export default UserDetailsModal;
