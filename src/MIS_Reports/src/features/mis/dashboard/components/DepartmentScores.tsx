'use client';

import { Building2, Loader2 } from 'lucide-react';
import { useState } from 'react';

// Department Scores as a column chart: one column per department on the
// x-axis, its height = total pending works (count, left axis), value on top.
// The two scores are percentages, so they sit under each column on their own
// 0–100 % mini bars instead of sharing the count axis (on one axis they were
// flattened next to counts in the thousands). Columns are sorted by pending
// work; hovering a column shows all of its numbers. Score mode decides how
// the % read: Positive = done / done on time; Negative = not done / not done
// on time, as a minus.
const splitLabel = (label: string) => {
  const m = /^(.*) \(([^()]+)\)$/.exec(label ?? '');
  return m ? { name: m[1], company: m[2] } : { name: label, company: '' };
};

type Row = {
  key: string;
  name: string;
  company: string;
  people?: number;
  pending: number;
  score1: number; // done % (or not done %)
  score2: number; // done on time % (or not done on time %)
  detail?: DeptDetail;
};

// The List of People's columns, summed per department (tooltip only).
export type DeptDetail = {
  target?: number;
  actualWorkDone?: number;
  totalWorkDone?: number;
  allPending?: number;
};

// A round tick step (1, 2 or 5 × 10^n) giving about five gridlines.
const niceStep = (v: number) => {
  if (v <= 0) return 1;
  const raw = v / 5;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow);
};

const PLOT_H = 240; // px, column area height

const MiniBar = ({
  label,
  value,
  text,
  barClass,
  negative,
}: {
  label: string;
  value: number;
  text: string;
  barClass: string;
  negative: boolean;
}) => (
  <div className="flex flex-col gap-0.5">
    <div className="flex items-baseline justify-between gap-1 text-[10.5px]">
      <span className="truncate text-muted-foreground">{label}</span>
      <span
        className={`font-bold tabular-nums ${negative && value > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}
      >
        {text}
      </span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-out ${barClass}`}
        style={{ width: `${Math.max(value > 0 ? 3 : 0, Math.min(100, value))}%` }}
      />
    </div>
  </div>
);

const DepartmentScores = ({
  labels = [],
  pendingData = [],
  notDoneData = [],
  notDoneOnTimeData = [],
  employeeCounts = [],
  details = [],
  scoreAsNegative,
  loading,
}: {
  labels: string[];
  pendingData: number[];
  notDoneData: number[];
  notDoneOnTimeData: number[];
  employeeCounts?: (number | undefined)[];
  details?: (DeptDetail | undefined)[];
  scoreAsNegative: boolean;
  loading: boolean;
}) => {
  const [hover, setHover] = useState<string | null>(null);
  const label1 = scoreAsNegative ? 'Work Not Done %' : 'Work Done %';
  const label2 = scoreAsNegative ? 'Not Done On Time %' : 'Done On Time %';
  const short1 = scoreAsNegative ? 'Not done' : 'Done';
  const short2 = scoreAsNegative ? 'Late' : 'On time';
  const num = (v?: number) => (v == null ? '—' : v.toLocaleString('en-IN'));
  const show = (v: number) =>
    scoreAsNegative ? (v > 0 ? `−${v.toFixed(1)}%` : '0.0%') : `${v.toFixed(1)}%`;

  const rows: Row[] = labels
    .map((label, i) => {
      const { name, company } = splitLabel(label);
      const notDone = Number(notDoneData[i]) || 0;
      const notOnTime = Number(notDoneOnTimeData[i]) || 0;
      return {
        key: `${label}-${i}`,
        name,
        company,
        people: employeeCounts[i],
        detail: details[i],
        pending: Number(pendingData[i]) || 0,
        score1: scoreAsNegative ? notDone : Math.max(0, 100 - notDone),
        score2: scoreAsNegative ? notOnTime : Math.max(0, 100 - notOnTime),
      };
    })
    .sort((a, b) => b.pending - a.pending || a.name.localeCompare(b.name));

  const top = Math.max(0, ...rows.map((r) => r.pending));
  const step = niceStep(top);
  const max = Math.max(step, Math.ceil(top / step) * step);
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const totalPending = rows.reduce((s, r) => s + r.pending, 0);
  const fmtTick = (v: number) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : `${+v.toFixed(0)}`);

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            <Building2 className="h-4.5 w-4.5" />
          </span>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[15px] md:text-base font-semibold text-foreground">
              Department Scores
            </h2>
            <span className="text-xs text-muted-foreground">
              {rows.length} departments · {totalPending.toLocaleString('en-IN')} pending works ·
              Score: {scoreAsNegative ? 'Negative (−)' : 'Positive (+)'} · hover a column for
              details
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
            Total pending works
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-blue-600 dark:bg-blue-500" />
            {label1}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-teal-600 dark:bg-teal-500" />
            {label2}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
          <span className="text-sm font-medium">Loading data...</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center text-sm italic text-muted-foreground">
          No data available
        </div>
      ) : (
        <div className="overflow-x-auto pb-1">
          <div className="flex" style={{ minWidth: Math.max(560, 56 + rows.length * 128) }}>
            {/* y-axis */}
            <div className="relative w-12 shrink-0" style={{ height: PLOT_H + 28 }}>
              {ticks.map((t) => (
                <span
                  key={t}
                  className="absolute right-2 -translate-y-1/2 text-[10.5px] tabular-nums text-muted-foreground"
                  style={{ top: 28 + PLOT_H - (t / max) * PLOT_H }}
                >
                  {fmtTick(t)}
                </span>
              ))}
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              {/* plot */}
              <div className="relative" style={{ height: PLOT_H + 28 }}>
                {ticks.map((t) => (
                  <div
                    key={t}
                    className={`absolute inset-x-0 ${t === 0 ? 'border-t border-border' : 'border-t border-dashed border-border/60'}`}
                    style={{ top: 28 + PLOT_H - (t / max) * PLOT_H }}
                  />
                ))}
                <div className="absolute inset-0 flex justify-around">
                  {rows.map((r, idx) => {
                    const h = (r.pending / max) * PLOT_H;
                    // Tooltip beside the column (never over its value).
                    const side =
                      idx < rows.length / 2 || rows.length === 1
                        ? 'left-full ml-2'
                        : 'right-full mr-2';
                    const on = hover === r.key;
                    const dim = hover !== null && !on;
                    return (
                      <div
                        key={r.key}
                        onMouseEnter={() => setHover(r.key)}
                        onMouseLeave={() => setHover(null)}
                        className={`relative flex max-w-[220px] flex-1 flex-col items-center justify-end px-3 transition-opacity duration-150 ${dim ? 'opacity-40' : 'opacity-100'}`}
                      >
                        {on && (
                          <div className="absolute inset-x-1 top-0 bottom-0 rounded-lg bg-muted/50" />
                        )}
                        <span className="relative mb-1.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-amber-800 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300">
                          {r.pending.toLocaleString('en-IN')}
                        </span>
                        <div
                          className="relative w-full max-w-14 rounded-t-md bg-gradient-to-t from-amber-600 to-amber-400 shadow-[0_6px_16px_-8px_rgba(217,119,6,0.7)] transition-[height] duration-700 ease-out"
                          style={{ height: Math.max(r.pending > 0 ? 3 : 0, h) }}
                        />
                        {on && (
                          <div
                            className={`absolute top-6 z-10 w-60 ${side} rounded-xl border border-border bg-popover p-3 text-left text-xs shadow-xl`}
                          >
                            <div className="font-semibold text-foreground">{r.name}</div>
                            <div className="mb-2 text-[11px] text-muted-foreground">
                              {[
                                r.company,
                                r.people != null
                                  ? `${r.people} ${r.people === 1 ? 'person' : 'people'}`
                                  : '',
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                            {(
                              [
                                ['Target', num(r.detail?.target)],
                                ['Actual Work Done', num(r.detail?.actualWorkDone)],
                                [scoreAsNegative ? '% Not Done' : '% Done', show(r.score1)],
                                [
                                  scoreAsNegative ? '% Not Done On Time' : '% Done On Time',
                                  show(r.score2),
                                ],
                                ['Total Work Done', num(r.detail?.totalWorkDone)],
                                ['Pending', num(r.pending)],
                                ['All Pending', num(r.detail?.allPending)],
                              ] as const
                            ).map(([k, v]) => (
                              <div key={k} className="flex justify-between gap-3 py-0.5">
                                <span className="text-muted-foreground">{k}</span>
                                <span className="font-bold tabular-nums">{v}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* x-axis: department + its two scores */}
              <div className="flex justify-around border-t border-border pt-2.5">
                {rows.map((r) => (
                  <div
                    key={r.key}
                    onMouseEnter={() => setHover(r.key)}
                    onMouseLeave={() => setHover(null)}
                    className={`flex min-w-0 max-w-[220px] flex-1 flex-col gap-1.5 px-2.5 transition-opacity duration-150 ${hover !== null && hover !== r.key ? 'opacity-40' : 'opacity-100'}`}
                  >
                    <div className="min-w-0 text-center">
                      <div className="truncate text-[12.5px] font-bold uppercase tracking-wide text-foreground">
                        {r.name}
                      </div>
                      <div className="truncate text-[10.5px] text-muted-foreground">
                        {[r.company, r.people != null ? `${r.people} ppl` : '']
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    <MiniBar
                      label={short1}
                      value={r.score1}
                      text={show(r.score1)}
                      barClass="bg-blue-600 dark:bg-blue-500"
                      negative={scoreAsNegative}
                    />
                    <MiniBar
                      label={short2}
                      value={r.score2}
                      text={show(r.score2)}
                      barClass="bg-teal-600 dark:bg-teal-500"
                      negative={scoreAsNegative}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentScores;
