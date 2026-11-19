'use client';

import { CheckCircle2, Clock, Loader2, TrendingDown, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import PersonAvatar from '../../shared/components/PersonAvatar';

type Row = {
  key: string;
  name: string;
  company: string;
  image?: string | null;
  value: string;
  detail?: string;
  pct: number;
};

// A person's numbers as the table shows them (positive view).
const donePct = (e: any) => (Number(e.target) > 0 ? 100 - (Number(e.weeklyWorkDone) || 0) : 0);
const onTimePct = (e: any) =>
  (Number(e.actualWorkDone) || 0) > 0 ? 100 - (Number(e.weeklyWorkDoneOnTime) || 0) : 0;
const performanceRow = (e: any): Row => ({
  key: `${e.tenant?.id ?? ''}${e.id}`,
  name: e.name,
  company: e.tenant?.name ?? '',
  image: e.image,
  value: `${donePct(e)}%`,
  detail: `${e.actualWorkDone ?? 0}/${e.target ?? 0} done · ${onTimePct(e)}% on time`,
  pct: donePct(e),
});

const Card = ({
  title,
  subtitle,
  icon,
  iconClass,
  rangeLabel,
  loading,
  loaderClass,
  rows,
  barClass,
  firstRankClass,
  empty,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  iconClass: string;
  rangeLabel?: string;
  loading: boolean;
  loaderClass: string;
  rows: Row[];
  barClass: string;
  firstRankClass: string;
  empty: ReactNode;
}) => (
  <div className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-4 md:p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-500/50 hover:shadow-[0_12px_32px_-14px_rgba(59,130,246,0.35)]">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[15px] md:text-base font-semibold text-foreground">{title}</h2>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
      </div>
      {rangeLabel && (
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-muted-foreground">
          {rangeLabel}
        </span>
      )}
    </div>

    {loading ? (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
        <Loader2 className={`h-7 w-7 animate-spin ${loaderClass}`} />
        <span className="text-sm font-medium">Loading data...</span>
      </div>
    ) : rows.length === 0 ? (
      <div className="flex flex-1 items-center justify-center py-10">{empty}</div>
    ) : (
      <ol className="flex flex-col gap-3.5">
        {rows.map((row, index) => {
          const { name, company } = row;
          return (
            <li
              key={`${row.key}-${index}`}
              title={`${name}${company ? ` (${company})` : ''}: ${row.value}${row.detail ? ` (${row.detail})` : ''}`}
              className="flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    index === 0 ? firstRankClass : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index + 1}
                </span>
                <PersonAvatar src={row.image} name={name} size={30} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-semibold text-foreground">{name}</span>
                  {company && (
                    <span className="truncate text-[11px] text-muted-foreground">{company}</span>
                  )}
                </span>
                <span className="flex flex-col items-end">
                  <span className="text-[15px] font-bold tabular-nums text-foreground">
                    {row.value}
                  </span>
                  {row.detail && (
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {row.detail}
                    </span>
                  )}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-muted">
                <div
                  className={`h-full rounded transition-[width] duration-700 ease-out ${barClass}`}
                  style={{ width: `${Math.max(row.pct > 0 ? 2 : 0, Math.min(100, row.pct))}%` }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    )}
  </div>
);

const ChartsGrid = ({
  user,
  loading,
  bestPerformers = [],
  worstPerformers = [],
  pendingTop = [],
  rangeLabel,
}: any) => {
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const bestRows: Row[] = bestPerformers.map(performanceRow);
  const worstRows: Row[] = worstPerformers.map(performanceRow);
  const pendingRows: Row[] = pendingTop.map((e: any) => {
    const pending = Number(e.weekPending) || 0;
    const total = Number(e.totalTasks) || 0;
    return {
      key: `${e.tenant?.id ?? ''}${e.id}`,
      name: e.name,
      company: e.tenant?.name ?? '',
      image: e.image,
      value: String(pending),
      detail: `of ${total} tasks`,
      pct: total > 0 ? (pending / total) * 100 : 0,
    };
  });

  const noData = <span className="text-sm italic text-muted-foreground">No data available</span>;

  return (
    <div
      className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-2 xl:grid-cols-3' : ''} gap-4 lg:gap-5`}
    >
      {/* Top 5 Best Performers - Admin Only */}
      {isAdmin && (
        <Card
          title="Top 5 Best Performers"
          subtitle="% Done, then on time, work done, pending"
          icon={<Trophy className="h-4.5 w-4.5" />}
          iconClass="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
          rangeLabel={rangeLabel}
          loading={loading}
          loaderClass="text-emerald-500"
          rows={bestRows}
          barClass="bg-blue-600 dark:bg-blue-500"
          firstRankClass="bg-emerald-600 text-white"
          empty={noData}
        />
      )}

      {/* Pending Tasks by User - Everyone */}
      <Card
        title="Pending Tasks by User"
        subtitle="Pending in this period, out of their tasks"
        icon={<Clock className="h-4.5 w-4.5" />}
        iconClass="bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300"
        rangeLabel={rangeLabel}
        loading={loading}
        loaderClass="text-red-500"
        rows={pendingRows}
        barClass="bg-orange-500"
        firstRankClass="bg-red-600 text-white"
        empty={
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <CheckCircle2 size={32} className="text-emerald-500 opacity-60" />
            <p className="text-sm font-medium italic">No pending tasks for this period ✅</p>
          </div>
        }
      />

      {/* Top 5 Worst Performers - Admin Only */}
      {isAdmin && (
        <Card
          title="Top 5 Worst Performers"
          subtitle="Lowest % done first (reverse of best)"
          icon={<TrendingDown className="h-4.5 w-4.5" />}
          iconClass="bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
          rangeLabel={rangeLabel}
          loading={loading}
          loaderClass="text-amber-500"
          rows={worstRows}
          barClass="bg-orange-500"
          firstRankClass="bg-red-600 text-white"
          empty={noData}
        />
      )}
    </div>
  );
};

export default ChartsGrid;
