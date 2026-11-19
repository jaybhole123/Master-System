'use client';

import { useEffect, useState } from 'react';
import { getPeriodSnapshotsApi, type PeriodSnapshotRow } from '../server/api/dashboardApi';

const pad = (n: number) => String(n).padStart(2, '0');
const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// The business week (matches Dashboard.tsx's own getCurrentWeek()) is
// Monday..Saturday. The last FULLY CLOSED week is the one that ended before
// this week started — i.e. last Monday through last Saturday.
export const getLastCompletedWeek = () => {
  const today = new Date();
  const day = today.getDay() || 7; // Mon=1 … Sun=7
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - day + 1);
  const start = new Date(thisMonday);
  start.setDate(thisMonday.getDate() - 7);
  const end = new Date(thisMonday);
  end.setDate(thisMonday.getDate() - 2);
  return { start: toISODate(start), end: toISODate(end) };
};

// The last fully closed calendar month.
export const getLastCompletedMonth = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const end = new Date(today.getFullYear(), today.getMonth(), 0);
  return { start: toISODate(start), end: toISODate(end) };
};

export const usePerformanceHistory = (
  periodType: 'WEEKLY' | 'MONTHLY',
  dateRange: { start: string; end: string }
) => {
  const [rows, setRows] = useState<PeriodSnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPeriodSnapshotsApi(periodType, dateRange.start, dateRange.end)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load performance history.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [periodType, dateRange.start, dateRange.end]);

  return { rows, loading, error };
};
