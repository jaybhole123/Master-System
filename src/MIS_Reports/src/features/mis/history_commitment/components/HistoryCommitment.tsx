'use client';

import { History, Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import type { CommitmentHistoryItem } from '../../shared/types/index';
import { getCommitmentHistory } from '../server/api/history_commitmentApi';

const AdminHistoryCommitment = () => {
  const _orgViewMode = useAppSelector(selectOrgViewMode);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<CommitmentHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [nameFilter, setNameFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true);
        const data = await getCommitmentHistory();
        setRecords(Array.isArray(data) ? data : []);
      } catch (_error) {
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showCompanyColumn = records.some((r) => r.tenant);

  const uniqueNames = useMemo(() => {
    return [...new Set(records.map((r) => r.name))].sort();
  }, [records]);

  const uniqueDates = useMemo(() => {
    return [...new Set(records.map((r) => r.dateStart))]
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.dateStart || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.department || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesName = nameFilter === 'all' || r.name === nameFilter;
      const matchesDate = dateFilter === 'all' || r.dateStart === dateFilter;
      return matchesSearch && matchesName && matchesDate;
    });
  }, [records, searchQuery, nameFilter, dateFilter]);

  const formatValue = (val: any) => {
    if (val === '' || val === null || val === undefined) return '-';
    return String(val);
  };

  const formatDate = (val: string) => {
    if (!val) return '-';
    try {
      return new Date(val).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return val;
    }
  };

  if (loading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="text-muted-foreground font-medium">Loading History...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-full">
        <div className="mb-5 flex items-center gap-3">
          <History className="h-6 w-6 text-blue-600" />
          <h1 className="text-foreground text-xl font-bold">History</h1>
          <span className="text-muted-foreground bg-card border-border ml-auto rounded border px-3 py-1 text-sm shadow-sm">
            {filteredRecords.length} of {records.length} records
          </span>
        </div>

        <div className="bg-card border-border mb-5 rounded-lg border p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, department or date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-border bg-card text-foreground w-full rounded border py-2 pr-3 pl-9 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="w-full md:w-56">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="border-border bg-card text-foreground w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Dates</option>
                {uniqueDates.map((d: any) => (
                  <option key={d} value={d}>
                    {formatDate(d)}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-56">
              <select
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="border-border bg-card text-foreground w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Names</option>
                {uniqueNames.map((n: any) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-4">
          <div className="bg-card border-border rounded-lg border p-4 shadow-sm">
            <p className="text-muted-foreground text-xs font-medium uppercase">Total Records</p>
            <p className="text-foreground mt-1 text-xl font-bold">{records.length}</p>
          </div>
          <div className="bg-card border-border rounded-lg border p-4 shadow-sm">
            <p className="text-muted-foreground text-xs font-medium uppercase">Unique Persons</p>
            <p className="text-foreground mt-1 text-xl font-bold">{uniqueNames.length}</p>
          </div>
        </div>

        <div className="bg-card border-border overflow-hidden rounded-lg border shadow-sm">
          <div className="border-border bg-muted border-b px-5 py-4">
            <h2 className="text-foreground text-base font-bold">Commitment Records</h2>
          </div>
          <div className="relative max-h-[calc(100vh-320px)] overflow-auto">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead className="bg-muted sticky top-0 z-30 shadow-sm">
                <tr>
                  <th className="text-muted-foreground bg-muted border-border sticky top-0 left-0 z-40 w-12 border-b px-4 py-3 text-left text-xs font-semibold tracking-wider whitespace-nowrap uppercase">
                    S.No
                  </th>
                  <th className="text-muted-foreground bg-muted border-border border-b px-4 py-3 text-left text-xs font-semibold tracking-wider whitespace-nowrap uppercase">
                    Date Start
                  </th>
                  <th className="text-muted-foreground bg-muted border-border border-b px-4 py-3 text-left text-xs font-semibold tracking-wider whitespace-nowrap uppercase">
                    Date End
                  </th>
                  <th className="text-muted-foreground bg-muted border-border sticky top-0 left-12 z-40 border-b border-l px-4 py-3 text-left text-xs font-semibold tracking-wider whitespace-nowrap uppercase">
                    Name
                  </th>
                  <th className="text-muted-foreground border-border border-b px-4 py-3 text-left text-xs font-semibold tracking-wider whitespace-nowrap uppercase">
                    Department
                  </th>
                  <th className="text-muted-foreground border-border border-b px-4 py-3 text-right text-xs font-semibold tracking-wider whitespace-nowrap uppercase">
                    Target
                  </th>
                  <th className="text-muted-foreground border-border border-b px-4 py-3 text-right text-xs font-semibold tracking-wider whitespace-nowrap uppercase">
                    Score
                  </th>
                  <th className="text-muted-foreground border-border border-b px-4 py-3 text-right text-xs font-semibold tracking-wider whitespace-nowrap uppercase">
                    Actual Work Done
                  </th>
                  <th className="text-muted-foreground border-border border-b px-4 py-3 text-right text-xs font-semibold tracking-wider whitespace-nowrap uppercase">
                    % Not Done
                  </th>
                  <th className="text-muted-foreground border-border border-b px-4 py-3 text-right text-xs font-semibold tracking-wider whitespace-nowrap uppercase">
                    On Time Not Done %
                  </th>
                  <th className="text-muted-foreground border-border border-b px-4 py-3 text-right text-xs font-semibold tracking-wider whitespace-nowrap uppercase">
                    Total Work Done
                  </th>
                  <th className="text-muted-foreground border-border border-b px-4 py-3 text-right text-xs font-semibold tracking-wider whitespace-nowrap uppercase">
                    Pending
                  </th>
                  <th className="text-muted-foreground border-border border-b px-4 py-3 text-right text-xs font-semibold tracking-wider whitespace-nowrap uppercase">
                    All Pending
                  </th>
                  <th className="border-border border-b bg-red-900/20 px-4 py-3 text-right text-xs font-bold tracking-wider whitespace-nowrap text-red-400 uppercase">
                    Commitment
                  </th>
                  <th className="border-border border-b bg-green-900/20 px-4 py-3 text-right text-xs font-bold tracking-wider whitespace-nowrap text-green-400 uppercase">
                    NW Planned % Not Done
                  </th>
                  <th className="border-border border-b bg-green-900/20 px-4 py-3 text-right text-xs font-bold tracking-wider whitespace-nowrap text-green-400 uppercase">
                    NW % Not Done On Time
                  </th>
                  <th className="text-muted-foreground border-border border-b px-4 py-3 text-left text-xs font-semibold tracking-wider whitespace-nowrap uppercase">
                    Submitted At
                  </th>
                  {showCompanyColumn && (
                    <th className="text-muted-foreground border-border border-b px-4 py-3 text-left text-xs font-semibold tracking-wider whitespace-nowrap uppercase">
                      Company
                    </th>
                  )}
                  <th className="text-muted-foreground border-border border-b px-4 py-3 text-left text-xs font-semibold tracking-wider whitespace-nowrap uppercase">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-border divide-y">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                      <td className="text-muted-foreground bg-card sticky left-0 z-10 px-4 py-3 text-center font-medium">
                        {idx + 1}
                      </td>
                      <td className="text-foreground bg-card px-4 py-3 whitespace-nowrap">
                        {formatDate(r.dateStart)}
                      </td>
                      <td className="text-foreground bg-card px-4 py-3 whitespace-nowrap">
                        {formatDate(r.dateEnd)}
                      </td>
                      <td className="text-foreground bg-card border-border sticky left-12 z-10 border-l px-4 py-3 font-semibold whitespace-nowrap">
                        {formatValue(r.name)}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                        {formatValue(r.department)}
                      </td>
                      <td className="text-foreground px-4 py-3 text-right">
                        {formatValue(r.target)}
                      </td>
                      <td className="text-foreground px-4 py-3 text-right font-medium">
                        {formatValue(r.score)}
                      </td>
                      <td className="text-foreground px-4 py-3 text-right">
                        {formatValue(r.actualWorkDone)}
                      </td>
                      <td className="text-foreground px-4 py-3 text-right">
                        {formatValue(r.weeklyWorkDone)}
                      </td>
                      <td className="text-foreground px-4 py-3 text-right">
                        {formatValue(r.weeklyWorkDoneOnTime)}
                      </td>
                      <td className="text-foreground px-4 py-3 text-right">
                        {formatValue(r.totalWorkDone)}
                      </td>
                      <td className="text-foreground px-4 py-3 text-right">
                        {formatValue(r.weekPending)}
                      </td>
                      <td className="text-foreground px-4 py-3 text-right">
                        {formatValue(r.allPendingTillDate)}
                      </td>
                      <td className="bg-red-900/10 px-4 py-3 text-right">
                        <span className="font-bold text-red-400">{formatValue(r.commitment)}</span>
                      </td>
                      <td className="bg-green-900/10 px-4 py-3 text-right">
                        <span className="font-medium text-green-400">
                          {formatValue(r.nextWeekPlannedWorkNotDone)}
                        </span>
                      </td>
                      <td className="bg-green-900/10 px-4 py-3 text-right">
                        <span className="font-medium text-green-400">
                          {formatValue(r.nextWeekPlannedWorkNotDoneOnTime)}
                        </span>
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-xs whitespace-nowrap">
                        {formatDate(r.submittedAt)}
                      </td>
                      {showCompanyColumn && (
                        <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                          {r.tenant?.name ?? '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.source === 'AUTO' ? (
                          <span
                            className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-600/20 ring-inset dark:bg-blue-500/15 dark:text-blue-300"
                            title="Saved by the auto-submit trigger (nobody submitted this period)"
                          >
                            Auto
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20 ring-inset dark:bg-emerald-500/15 dark:text-emerald-300">
                            Manual
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={showCompanyColumn ? 19 : 18}
                      className="text-muted-foreground px-6 py-12 text-center"
                    >
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHistoryCommitment;
