'use client';

import { ChevronDown, ChevronLeft, ChevronRight, Crown, Loader2, Search, X } from 'lucide-react';
import type React from 'react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { resolveActAsTenant } from '@/features/organization/utils/actAsTenant';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import PersonAvatar from '../../shared/components/PersonAvatar';
import { delayMinutesOf, formatDelay } from '../../shared/utils/formatDelay';
import {
  getLastCompletedMonth,
  getLastCompletedWeek,
  usePerformanceHistory,
} from '../hooks/usePerformanceHistory';
import {
  getEmployeeDetailsApi,
  getEmployeeTaskDetailsApi,
  type PeriodSnapshotRow,
} from '../server/api/dashboardApi';
import SummaryCards from './SummaryCards';

// Performance History — a large pop-up over the dashboard showing the
// saved snapshot of a closed week or month. The five headline numbers per
// person come from the snapshot and never change. Clicking a person opens a
// side panel whose system / page / task breakdown is loaded for the same
// dates from the current records (the snapshot only stores totals).

interface PerformanceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PeriodType = 'WEEKLY' | 'MONTHLY';
type Range = { start: string; end: string };

type Person = PeriodSnapshotRow & {
  donePct: number | null; // % done (null when there was no target)
  onTimePct: number | null; // % of done work that was on time (null when nothing was done)
};

// ─── dates ─────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};
// Weeks are Monday..Saturday; months are calendar months.
const shiftRange = (range: Range, type: PeriodType, by: number): Range => {
  const s = parse(range.start);
  if (type === 'WEEKLY') {
    const start = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7 * by);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 5);
    return { start: toISO(start), end: toISO(end) };
  }
  const start = new Date(s.getFullYear(), s.getMonth() + by, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  return { start: toISO(start), end: toISO(end) };
};
const fmtDay = (s: string, withYear = false) =>
  parse(s).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });
const periodLabel = (range: Range, type: PeriodType) =>
  type === 'MONTHLY'
    ? parse(range.start).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : `${fmtDay(range.start)} – ${fmtDay(range.end, true)}`;

// ─── ranking (same rule as the dashboard's Top 5) ──────────────────────────
// % Done → % Done On Time → Total Work Done (higher is better), then
// Pending → All Pending (lower is better).
const rankCompare = (a: Person, b: Person) =>
  (b.donePct ?? 0) - (a.donePct ?? 0) ||
  (b.onTimePct ?? -1) - (a.onTimePct ?? -1) ||
  b.totalWorkDone - a.totalWorkDone ||
  a.weekPending - b.weekPending ||
  a.allPendingTillDate - b.allPendingTillDate;

const toPerson = (r: PeriodSnapshotRow): Person => ({
  ...r,
  donePct: r.target > 0 ? Math.max(0, Math.round(100 - r.weeklyWorkDone)) : null,
  onTimePct: r.actualWorkDone > 0 ? Math.max(0, Math.round(100 - r.weeklyWorkDoneOnTime)) : null,
});

const toneText = (p: number | null) =>
  p == null
    ? 'text-muted-foreground'
    : p >= 70
      ? 'text-emerald-600 dark:text-emerald-400'
      : p >= 40
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400';
const toneBar = (p: number) =>
  p >= 70 ? 'bg-emerald-500' : p >= 40 ? 'bg-amber-500' : 'bg-red-500';
const num = (n: number) => Number(n || 0).toLocaleString('en-IN');

const PctCell = ({ value }: { value: number | null }) =>
  value == null ? (
    <span className="text-muted-foreground">—</span>
  ) : (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="hidden sm:block h-1.5 w-14 rounded-full bg-muted overflow-hidden">
        <span
          className={`block h-full rounded-full ${toneBar(value)}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </span>
      <b className={`tabular-nums ${toneText(value)}`}>{value}%</b>
    </span>
  );

// ─── page ──────────────────────────────────────────────────────────────────
const PerformanceHistoryModal: React.FC<PerformanceHistoryModalProps> = ({ isOpen, onClose }) => {
  const osUser = useAppSelector(selectUser);
  const [periodType, setPeriodType] = useState<PeriodType>('WEEKLY');
  const [dateRange, setDateRange] = useState<Range>(getLastCompletedWeek);
  const [company, setCompany] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Person | null>(null);

  // Open on the most recently closed period, and again on Weekly ↔ Monthly.
  useEffect(() => {
    if (!isOpen) return;
    setDateRange(periodType === 'WEEKLY' ? getLastCompletedWeek() : getLastCompletedMonth());
    setSelected(null);
  }, [isOpen, periodType]);

  const { rows, loading, error } = usePerformanceHistory(periodType, dateRange);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (selected) setSelected(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, selected, onClose]);

  const lastClosed = periodType === 'WEEKLY' ? getLastCompletedWeek() : getLastCompletedMonth();
  const canGoNext = dateRange.start < lastClosed.start;

  const companies = useMemo(
    () =>
      [
        ...new Map(
          rows.flatMap((r) => (r.tenant ? [[r.tenant.id, r.tenant.name ?? ''] as const] : []))
        ),
      ].sort((a, b) => a[1].localeCompare(b[1])),
    [rows]
  );

  const people = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .map(toPerson)
      .filter((p) => !company || p.tenant?.id === company)
      .filter((p) => !q || p.employeeName.toLowerCase().includes(q));
  }, [rows, company, search]);

  const ranked = useMemo(() => people.filter((p) => p.target > 0).sort(rankCompare), [people]);
  const idle = useMemo(
    () =>
      people
        .filter((p) => p.target <= 0)
        .sort((a, b) => a.employeeName.localeCompare(b.employeeName)),
    [people]
  );

  if (!isOpen) return null;

  const showCompany = companies.length > 1;
  const label = periodLabel(dateRange, periodType);
  const winner = periodType === 'MONTHLY' ? ranked[0] : undefined;

  const personRow = (p: Person, rank?: number) => (
    <tr
      key={p.id}
      tabIndex={0}
      onClick={() => setSelected(p)}
      onKeyDown={(e) => e.key === 'Enter' && setSelected(p)}
      className={`border-t border-border cursor-pointer hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-blue-500 ${
        rank ? '' : 'text-muted-foreground'
      }`}
    >
      <td className="px-3 py-3 font-bold text-muted-foreground tabular-nums">{rank ?? '–'}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <PersonAvatar src={p.image} name={p.employeeName} size={34} />
          <div className="min-w-0">
            <div className="font-semibold text-foreground truncate">{p.employeeName}</div>
            {p.tenant?.name && (
              <div className="text-[11.5px] text-muted-foreground truncate">{p.tenant.name}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-3">{p.designation || '—'}</td>
      <td className="px-3 py-3 text-right tabular-nums">{num(p.target)}</td>
      <td className="px-3 py-3 text-right tabular-nums">{num(p.actualWorkDone)}</td>
      <td className="px-3 py-3 text-right">
        <PctCell value={p.donePct} />
      </td>
      <td className="px-3 py-3 text-right">
        <PctCell value={p.onTimePct} />
      </td>
      <td className="px-3 py-3 text-right tabular-nums">{num(p.totalWorkDone)}</td>
      <td className="px-3 py-3 text-right">
        <span
          className={`inline-block min-w-7 rounded-md px-2 py-0.5 text-center font-bold tabular-nums ${
            p.weekPending > 0
              ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
          }`}
        >
          {num(p.weekPending)}
        </span>
      </td>
      <td className="px-3 py-3 text-right font-bold tabular-nums">{num(p.allPendingTillDate)}</td>
    </tr>
  );

  const page = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm md:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Performance History"
        className="flex max-h-[94vh] w-full max-w-[1400px] flex-col gap-5 overflow-y-auto overscroll-contain [&>*]:shrink-0 rounded-2xl border border-border bg-background px-4 py-5 shadow-2xl md:px-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              MIS · Performance History
            </div>
            <h1 className="mt-1 text-xl md:text-2xl font-extrabold tracking-tight text-foreground">
              Performance History
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {periodType === 'WEEKLY' ? `Week of ${label}` : label} · {people.length} people ·
              saved when the period closed, never recalculated
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="shrink-0 rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3">
          <div className="flex rounded-xl bg-muted p-1">
            {(['WEEKLY', 'MONTHLY'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={periodType === mode}
                onClick={() => setPeriodType(mode)}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                  periodType === mode
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode === 'WEEKLY' ? 'Weekly' : 'Monthly'}
              </button>
            ))}
          </div>
          <div className="flex items-stretch overflow-hidden rounded-xl border border-border">
            <button
              type="button"
              aria-label="Previous period"
              onClick={() => setDateRange((r) => shiftRange(r, periodType, -1))}
              className="px-2.5 hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="flex items-center border-x border-border px-4 py-2 text-sm font-semibold whitespace-nowrap">
              {label}
            </span>
            <button
              type="button"
              aria-label="Next period"
              disabled={!canGoNext}
              onClick={() => setDateRange((r) => shiftRange(r, periodType, 1))}
              className="px-2.5 hover:bg-muted disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {showCompany && (
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              aria-label="Company"
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
            >
              <option value="">All Companies</option>
              {companies.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          )}
          <label className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              aria-label="Search by name"
              className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground"
            />
          </label>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            Saved snapshot · never changes
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading saved snapshots…
          </div>
        ) : error ? (
          <div className="py-24 text-center text-sm text-red-500">{error}</div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card py-20 text-center">
            <p className="text-sm font-semibold text-foreground">
              No saved snapshot for {label} yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              A snapshot is saved automatically every{' '}
              {periodType === 'WEEKLY' ? 'Monday for the week' : '1st of the month for the month'}{' '}
              that just ended. Use ‹ to look at an earlier period.
            </p>
          </div>
        ) : (
          <>
            {/* Same six Key Metrics as the dashboard and the PDF report */}
            <SummaryCards employees={people} loading={false} />

            {/* Employee of the Month */}
            {winner && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
                <button
                  type="button"
                  onClick={() => setSelected(winner)}
                  className="relative flex flex-col items-start gap-5 overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-card to-card p-6 text-left sm:flex-row sm:items-center dark:border-amber-500/30 dark:from-amber-500/10"
                >
                  <span className="absolute right-5 top-4 inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400">
                    <Crown className="h-3.5 w-3.5" /> Employee of the Month
                  </span>
                  <span className="rounded-full p-1 ring-[3px] ring-amber-400">
                    <PersonAvatar src={winner.image} name={winner.employeeName} size={84} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                      {winner.employeeName}
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {[winner.tenant?.name, winner.designation].filter(Boolean).join(' · ')} ·
                      Ranked #1 of {ranked.length}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        ['% Done', winner.donePct != null ? `${winner.donePct}%` : '—'],
                        ['% Done On Time', winner.onTimePct != null ? `${winner.onTimePct}%` : '—'],
                        ['Total Work Done', num(winner.totalWorkDone)],
                        ['Pending', num(winner.weekPending)],
                        ['All Pending', num(winner.allPendingTillDate)],
                      ].map(([k, v]) => (
                        <span
                          key={k}
                          className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
                        >
                          {k}
                          <b className="block text-base text-foreground tabular-nums">{v}</b>
                        </span>
                      ))}
                    </div>
                    <p className="mt-2.5 text-xs text-muted-foreground">
                      Highest % Done this month ({winner.donePct ?? 0}% of {num(winner.target)}{' '}
                      tasks). Click for the full month.
                    </p>
                  </div>
                </button>
                <div className="flex flex-col gap-3">
                  {ranked.slice(1, 4).map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelected(p)}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left hover:bg-muted/60"
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white ${
                          ['bg-slate-400', 'bg-orange-700', 'bg-slate-500'][i]
                        }`}
                      >
                        {i + 2}
                      </span>
                      <PersonAvatar src={p.image} name={p.employeeName} size={40} />
                      <div className="min-w-0">
                        <div className="truncate font-bold text-foreground">{p.employeeName}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {[p.tenant?.name, `${num(p.actualWorkDone)}/${num(p.target)} done`]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      </div>
                      <div className="ml-auto text-right">
                        <div className={`font-extrabold tabular-nums ${toneText(p.donePct)}`}>
                          {p.donePct}%
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {p.onTimePct != null ? `${p.onTimePct}% on time` : 'no work done'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ranking */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <h3 className="text-base font-bold text-foreground">Ranking</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Ranked by % Done, then % Done On Time and Total Work Done (higher is better), then
                  Pending and All Pending (lower is better). Click a person for full details.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-muted text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="w-12 px-3 py-2.5 text-left font-semibold">#</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Person</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Designation</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Target</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Done</th>
                      <th className="px-3 py-2.5 text-right font-semibold">% Done</th>
                      <th className="px-3 py-2.5 text-right font-semibold">% Done On Time</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Total Work Done</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Pending</th>
                      <th className="px-3 py-2.5 text-right font-semibold">All Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">
                          No one matches this search.
                        </td>
                      </tr>
                    )}
                    {ranked.map((p, i) => personRow(p, i + 1))}
                    {idle.length > 0 && (
                      <tr className="border-t border-border bg-muted/50">
                        <td colSpan={10} className="px-3 py-2 text-xs text-muted-foreground">
                          No work assigned in this period · {idle.length}{' '}
                          {idle.length === 1 ? 'person' : 'people'}
                        </td>
                      </tr>
                    )}
                    {idle.map((p) => personRow(p))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {selected && (
        <PersonDrawer
          person={selected}
          rank={ranked.indexOf(selected) + 1}
          rankedCount={ranked.length}
          range={dateRange}
          label={label}
          actAsTenantId={resolveActAsTenant(selected.tenant, osUser?.tenantId)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );

  return ReactDOM.createPortal(page, document.body);
};

// ─── person drawer ─────────────────────────────────────────────────────────
type PageRow = {
  taskName: string;
  target: number;
  done: number;
  late: number;
  allPending: number;
};
type SystemRow = PageRow & { fmsName: string; pages: PageRow[] };
type TaskRow = {
  taskName: string;
  planned: string;
  actual: string | null;
  delay: number;
  delayMinutes?: number;
  // false = from before this period, listed only because it is still open.
  inPeriod?: boolean;
};

// Systems whose task list is filtered by start date (see UserDetailsModal).
const START_DATE_SYSTEMS = ['checklist', 'maintenance'];

const PersonDrawer = ({
  person,
  rank,
  rankedCount,
  range,
  label,
  actAsTenantId,
  onClose,
}: {
  person: Person;
  rank: number;
  rankedCount: number;
  range: Range;
  label: string;
  actAsTenantId?: string;
  onClose: () => void;
}) => {
  const [systems, setSystems] = useState<SystemRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openSystem, setOpenSystem] = useState<string | null>(null);
  const [openPage, setOpenPage] = useState<string | null>(null);
  const [tasks, setTasks] = useState<{
    key: string;
    rows: TaskRow[];
    loading: boolean;
    error?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSystems(null);
    setLoadError(null);
    setOpenSystem(null);
    setOpenPage(null);
    setTasks(null);
    getEmployeeDetailsApi(person.employeeId, range.start, range.end, actAsTenantId)
      .then((data: any) => {
        if (cancelled) return;
        const bySystem = new Map<string, SystemRow>();
        for (const t of (data?.tasks ?? []) as any[]) {
          const target = Number(t.target) || 0;
          const done = Math.round((target * (Number(t.actualAchievement) || 0)) / 100);
          const late = done ? Math.round((done * (Number(t.workNotDoneOnTime) || 0)) / 100) : 0;
          const allPending = Number(t.allPendingTillDate) || 0;
          if (!target && !allPending) continue;
          const name = t.fmsName || 'Other';
          const sys = bySystem.get(name) ?? {
            fmsName: name,
            taskName: name,
            target: 0,
            done: 0,
            late: 0,
            allPending: 0,
            pages: [] as PageRow[],
          };
          sys.target += target;
          sys.done += done;
          sys.late += late;
          sys.allPending += allPending;
          sys.pages.push({ taskName: t.taskName, target, done, late, allPending });
          bySystem.set(name, sys);
        }
        setSystems(
          [...bySystem.values()].sort((a, b) => b.target - a.target || b.allPending - a.allPending)
        );
      })
      .catch((err: any) => {
        if (cancelled) return;
        const msg = err?.response?.data?.message || err?.response?.data?.error;
        setLoadError(
          msg
            ? `Could not load the breakdown: ${msg}`
            : 'Could not load the system breakdown for this person.'
        );
      });
    return () => {
      cancelled = true;
    };
  }, [person.employeeId, range.start, range.end, actAsTenantId]);

  const openTasks = async (fmsName: string, page: PageRow) => {
    const key = `${fmsName}::${page.taskName}`;
    if (openPage === key) {
      setOpenPage(null);
      return;
    }
    setOpenPage(key);
    setTasks({ key, rows: [], loading: true });
    try {
      const useStartDate = START_DATE_SYSTEMS.some((s) => fmsName.toLowerCase().includes(s));
      const data = await getEmployeeTaskDetailsApi(
        person.employeeId,
        fmsName,
        page.taskName,
        range.start,
        range.end,
        useStartDate,
        actAsTenantId
      );
      setTasks({ key, rows: data?.rows ?? [], loading: false });
    } catch {
      setTasks({ key, rows: [], loading: false, error: 'Could not load these tasks.' });
    }
  };

  const stats = [
    ['% Done', person.donePct != null ? `${person.donePct}%` : '—', toneText(person.donePct)],
    [
      '% Done On Time',
      person.onTimePct != null ? `${person.onTimePct}%` : '—',
      toneText(person.onTimePct),
    ],
    ['Total Work Done', num(person.totalWorkDone), 'text-foreground'],
    ['Pending', num(person.weekPending), 'text-foreground'],
    ['All Pending', num(person.allPendingTillDate), 'text-foreground'],
  ];

  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      : '—';

  return (
    <>
      <div className="fixed inset-0 z-[110] bg-black/45" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${person.employeeName} details`}
        className="fixed inset-y-0 right-0 z-[111] flex w-full max-w-[660px] flex-col border-l border-border bg-card shadow-2xl"
      >
        <div className="flex items-center gap-4 border-b border-border px-5 py-4">
          <PersonAvatar src={person.image} name={person.employeeName} size={56} />
          <div className="min-w-0">
            <h3 className="truncate text-lg font-extrabold text-foreground">
              {person.employeeName}
            </h3>
            <p className="text-xs text-muted-foreground">
              {[person.tenant?.name, person.designation, label].filter(Boolean).join(' · ')}
              {rank > 0 ? ` · Rank #${rank} of ${rankedCount}` : ' · No work assigned'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto rounded-xl bg-muted p-2 text-foreground hover:bg-muted/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {stats.map(([k, v, cls]) => (
              <div key={k} className="rounded-xl bg-muted p-2.5">
                <div className="text-[11px] text-muted-foreground">{k}</div>
                <div className={`text-lg font-bold tabular-nums ${cls}`}>{v}</div>
              </div>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Target <b className="text-foreground">{num(person.target)}</b> tasks were due in this
            period, <b className="text-foreground">{num(person.actualWorkDone)}</b> done. These five
            numbers are the saved snapshot and never change. The breakdown below is loaded for the
            same dates from the current records.
          </p>

          <div className="flex items-baseline justify-between">
            <h4 className="text-sm font-bold text-foreground">Work by system</h4>
            <span className="text-[11px] text-muted-foreground">
              Done / target · open now · click to see pages and tasks
            </span>
          </div>

          {loadError ? (
            <p className="text-sm text-red-500">{loadError}</p>
          ) : !systems ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading breakdown…
            </div>
          ) : systems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No work in any system for these dates.</p>
          ) : (
            systems.map((s) => {
              const pct = s.target ? Math.round((s.done / s.target) * 100) : null;
              const open = openSystem === s.fmsName;
              return (
                <div
                  key={s.fmsName}
                  className="shrink-0 overflow-hidden rounded-xl border border-border"
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenSystem(open ? null : s.fmsName)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto_64px_72px_16px] items-center gap-3 px-3.5 py-2.5 text-left hover:bg-muted/50"
                  >
                    <span className="truncate text-sm font-semibold text-foreground">
                      {s.fmsName}
                    </span>
                    <PctCell value={pct} />
                    <span className="text-right text-xs tabular-nums text-muted-foreground">
                      {num(s.done)}/{num(s.target)}
                    </span>
                    <span className="text-right text-xs tabular-nums text-muted-foreground">
                      {num(s.allPending)} open
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {open && (
                    <div className="border-t border-border bg-muted/40">
                      <table className="w-full text-xs">
                        <thead className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-3.5 py-2 text-left font-semibold">Page</th>
                            <th className="px-2 py-2 text-right font-semibold">Target</th>
                            <th className="px-2 py-2 text-right font-semibold">Done</th>
                            <th className="px-2 py-2 text-right font-semibold">Late</th>
                            <th className="px-3.5 py-2 text-right font-semibold">All pending</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.pages.map((pg) => {
                            const key = `${s.fmsName}::${pg.taskName}`;
                            const showTasks = openPage === key && tasks?.key === key;
                            return (
                              <PageRows
                                key={key}
                                page={pg}
                                open={openPage === key}
                                onToggle={() => openTasks(s.fmsName, pg)}
                                tasks={showTasks ? tasks : null}
                                fmtDate={fmtDate}
                              />
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
};

const PageRows = ({
  page,
  open,
  onToggle,
  tasks,
  fmtDate,
}: {
  page: PageRow;
  open: boolean;
  onToggle: () => void;
  tasks: { rows: TaskRow[]; loading: boolean; error?: string } | null;
  fmtDate: (iso: string | null) => string;
}) => (
  <>
    <tr
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => e.key === 'Enter' && onToggle()}
      className="cursor-pointer border-t border-border/70 hover:bg-card/70"
    >
      <td className="px-3.5 py-2 text-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ChevronRight className={`h-3 w-3 transition-transform ${open ? 'rotate-90' : ''}`} />
          {page.taskName}
        </span>
      </td>
      <td className="px-2 py-2 text-right tabular-nums">{num(page.target)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{num(page.done)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{num(page.late)}</td>
      <td className="px-3.5 py-2 text-right tabular-nums">{num(page.allPending)}</td>
    </tr>
    {open && (
      <tr className="border-t border-border/70 bg-card">
        <td colSpan={5} className="px-3.5 py-2">
          {!tasks || tasks.loading ? (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading tasks…
            </span>
          ) : tasks.error ? (
            <span className="text-red-500">{tasks.error}</span>
          ) : tasks.rows.length === 0 ? (
            <span className="text-muted-foreground">No tasks for these dates.</span>
          ) : (
            <table className="w-full">
              <thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-1 text-left font-semibold">Task</th>
                  <th className="py-1 text-left font-semibold">Planned</th>
                  <th className="py-1 text-left font-semibold">Done on</th>
                  <th className="py-1 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ...tasks.rows.filter((t) => t.inPeriod !== false),
                  ...tasks.rows.filter((t) => t.inPeriod === false),
                ].map((t, i, all) => {
                  const delay = delayMinutesOf(t);
                  const status = !t.actual
                    ? delay > 0
                      ? `Overdue · ${formatDelay(delay)}`
                      : 'Pending'
                    : delay > 0
                      ? `Late · ${formatDelay(delay)}`
                      : 'On time';
                  const cls =
                    !t.actual && delay <= 0
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                      : delay > 0
                        ? 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
                  const firstEarlier = t.inPeriod === false && all[i - 1]?.inPeriod !== false;
                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id
                    <Fragment key={i}>
                      {firstEarlier && (
                        <tr className="border-t border-border/60">
                          <td
                            colSpan={4}
                            className="pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300"
                          >
                            Earlier pending — from before this period, still not done
                          </td>
                        </tr>
                      )}
                      <tr className="border-t border-border/60">
                        <td className="py-1.5 pr-2 text-foreground">{t.taskName}</td>
                        <td className="py-1.5 pr-2 whitespace-nowrap">{fmtDate(t.planned)}</td>
                        <td className="py-1.5 pr-2 whitespace-nowrap">{fmtDate(t.actual)}</td>
                        <td className="py-1.5 text-right">
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${cls}`}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </td>
      </tr>
    )}
  </>
);

export default PerformanceHistoryModal;
