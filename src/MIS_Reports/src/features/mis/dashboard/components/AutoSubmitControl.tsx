'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import {
  type AutoSubmitPeriod,
  type AutoSubmitSetting,
  getAutoSubmitSettingApi,
  updateAutoSubmitSettingApi,
} from '../server/api/dashboardApi';

const QUERY_KEY = ['mis', 'autoSubmitSetting'] as const;

// Company switch for the MIS auto-submit trigger. When on, every Monday (for
// last week) or every 1st (for last month) each person's score is saved to
// History Commitment as "Auto". A manual submit for the same period replaces
// it. Off by default; only admins see this control.
const AutoSubmitControl = () => {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getAutoSubmitSettingApi,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
  const mutation = useMutation({
    mutationFn: updateAutoSubmitSettingApi,
    onSuccess: (saved: AutoSubmitSetting) => {
      queryClient.setQueryData(QUERY_KEY, saved);
      toast.success(
        saved.enabled
          ? `Auto submit on — ${saved.period === 'WEEKLY' ? 'every Monday for last week' : 'every 1st for last month'}`
          : 'Auto submit off'
      );
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Could not save auto submit');
    },
  });

  const enabled = data?.enabled ?? false;
  const period: AutoSubmitPeriod = data?.period ?? 'WEEKLY';
  const busy = isPending || mutation.isPending;
  const save = (next: { enabled: boolean; period: AutoSubmitPeriod }) => mutation.mutate(next);

  return (
    <div
      className={`flex h-9 items-center gap-2 rounded-xl border px-3 transition-colors ${
        enabled
          ? 'border-blue-200 bg-blue-50/70 dark:border-blue-500/30 dark:bg-blue-500/10'
          : 'border-border bg-card'
      }`}
      title="When on, each person's score for the period that just ended is saved to History Commitment automatically (Auto). A manual submit for the same period replaces it."
    >
      <CalendarClock
        className={`h-4 w-4 ${enabled ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}
      />
      <label
        htmlFor="mis-auto-submit"
        className="text-sm font-semibold whitespace-nowrap text-foreground"
      >
        Auto submit score
      </label>
      <Switch
        id="mis-auto-submit"
        checked={enabled}
        disabled={busy}
        onCheckedChange={(checked) => save({ enabled: checked, period })}
      />
      {enabled && (
        <div
          role="group"
          aria-label="Auto submit period"
          className="flex rounded-lg bg-muted/70 p-0.5"
        >
          {(['WEEKLY', 'MONTHLY'] as const).map((p) => (
            <button
              key={p}
              type="button"
              disabled={busy}
              aria-pressed={period === p}
              onClick={() => period !== p && save({ enabled: true, period: p })}
              className={`h-7 rounded-md px-2.5 text-xs transition-all disabled:opacity-60 ${
                period === p
                  ? 'bg-card font-semibold text-foreground shadow-sm'
                  : 'font-medium text-muted-foreground hover:text-foreground'
              }`}
            >
              {p === 'WEEKLY' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutoSubmitControl;
