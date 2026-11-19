'use client';

import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  type LucideIcon,
  Target,
  Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// Animates a number from its previous value to `value` (ease-out, ~0.8s).
// Display only — the real figure is what's passed in.
const useCountUp = (value: number, duration = 800) => {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const begin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(begin + (value - begin) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return Math.round(shown);
};

type Tone = 'blue' | 'navy' | 'green' | 'orange' | 'red' | 'amber';

// Same colours as the Key Metrics row of the MIS PDF report.
const TONES: Record<Tone, { border: string; text: string; icon: string; bar: string }> = {
  blue: {
    border: 'border-l-blue-600',
    text: 'text-blue-600 dark:text-blue-400',
    icon: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
    bar: 'bg-blue-600',
  },
  navy: {
    border: 'border-l-blue-900 dark:border-l-blue-400',
    text: 'text-blue-900 dark:text-blue-300',
    icon: 'bg-blue-100 text-blue-900 dark:bg-blue-500/15 dark:text-blue-300',
    bar: 'bg-blue-900',
  },
  green: {
    border: 'border-l-emerald-600',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    bar: 'bg-emerald-600',
  },
  orange: {
    border: 'border-l-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
    icon: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
    bar: 'bg-orange-500',
  },
  red: {
    border: 'border-l-red-600',
    text: 'text-red-600 dark:text-red-400',
    icon: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300',
    bar: 'bg-red-600',
  },
  amber: {
    border: 'border-l-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    icon: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    bar: 'bg-amber-500',
  },
};

const Card = ({
  label,
  value,
  suffix = '',
  tone,
  Icon,
  loading,
  progress,
}: {
  label: string;
  value: number;
  suffix?: string;
  tone: Tone;
  Icon: LucideIcon;
  loading: boolean;
  progress?: { pct: number; caption: string };
}) => {
  const shown = useCountUp(loading ? 0 : value);
  const t = TONES[tone];
  return (
    <div
      className={`flex min-h-[112px] flex-col justify-between gap-3 rounded-xl border border-l-4 border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${t.border}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`text-2xl md:text-[28px] font-bold leading-none tabular-nums ${t.text}`}>
          {loading ? '–' : `${shown.toLocaleString('en-IN')}${suffix}`}
        </span>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${t.icon}`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          {progress && !loading && (
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {progress.caption}
            </span>
          )}
        </div>
        {progress && (
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-[width] duration-700 ease-out ${t.bar}`}
              style={{ width: `${loading ? 0 : Math.max(0, Math.min(100, progress.pct))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// The PDF report's six Key Metrics, over exactly the rows passed in (the
// List of People with its filters, or a saved snapshot's people).
const SummaryCards = ({ employees, loading }: { employees: any[]; loading: boolean }) => {
  const sum = (key: string) => employees.reduce((total, e) => total + (Number(e?.[key]) || 0), 0);
  const target = sum('target');
  const done = sum('actualWorkDone');
  const periodPending = sum('weekPending');
  const allPending = sum('allPendingTillDate');
  const rate = target > 0 ? Math.round((done / target) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 lg:gap-4">
      <Card
        label="Total employees"
        value={employees.length}
        tone="blue"
        Icon={Users}
        loading={loading}
      />
      <Card label="Total target" value={target} tone="navy" Icon={Target} loading={loading} />
      <Card label="Completed" value={done} tone="green" Icon={CheckCircle2} loading={loading} />
      <Card
        label="Pending (period)"
        value={periodPending}
        tone="orange"
        Icon={Clock}
        loading={loading}
      />
      <Card
        label="All pending (till date)"
        value={allPending}
        tone="red"
        Icon={AlertTriangle}
        loading={loading}
      />
      <Card
        label="Completion rate"
        value={rate}
        suffix="%"
        tone="amber"
        Icon={BarChart3}
        loading={loading}
        progress={{
          pct: rate,
          caption: `${done.toLocaleString('en-IN')} / ${target.toLocaleString('en-IN')}`,
        }}
      />
    </div>
  );
};

export default SummaryCards;
