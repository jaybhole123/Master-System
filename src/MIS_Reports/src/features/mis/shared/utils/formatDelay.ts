// MIS drill-down rows carry `delayMinutes` (exact lateness); older responses
// only had `delay` in whole days, so fall back to that.
export const delayMinutesOf = (row: { delay?: number | string; delayMinutes?: number }) =>
  row.delayMinutes != null ? Number(row.delayMinutes) || 0 : (Number(row.delay) || 0) * 1440;

// 45 → "45m", 686 → "11h 26m", 1572 → "1d 2h 12m".
export const formatDelay = (minutes: number) => {
  const m = Math.max(0, Math.floor(minutes));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const min = m % 60;
  return [d && `${d}d`, h && `${h}h`, min && `${min}m`].filter(Boolean).join(' ') || '0m';
};
