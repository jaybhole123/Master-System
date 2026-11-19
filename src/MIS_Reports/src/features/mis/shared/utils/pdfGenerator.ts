'use client';

import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';

// MIS Dashboard PDF report — A4 landscape, two parts:
//   page 1: header, filters, key metrics, executive summary (best / worst /
//           highest pending), department performance;
//   page 2+: employee details (current period + last week / month).
// Every number comes from the rows the dashboard is showing (same filters).
// Built with jsPDF's standard Helvetica (WinAnsi), so only Latin-1 symbols are
// used in text (a plain hyphen stands in for the minus sign).

type RGB = [number, number, number];
const C = {
  ink: [17, 24, 39] as RGB,
  ink2: [55, 65, 81] as RGB,
  muted: [107, 114, 128] as RGB,
  faint: [156, 163, 175] as RGB,
  line: [229, 231, 235] as RGB,
  bg: [249, 250, 251] as RGB,
  white: [255, 255, 255] as RGB,
  blue: [37, 99, 235] as RGB,
  blueDark: [30, 58, 138] as RGB,
  blueTint: [235, 242, 255] as RGB,
  blueHead: [219, 234, 254] as RGB,
  green: [21, 128, 61] as RGB,
  greenTint: [220, 252, 231] as RGB,
  amber: [180, 83, 9] as RGB,
  amberTint: [254, 243, 199] as RGB,
  orange: [234, 88, 12] as RGB,
  orangeTint: [255, 237, 213] as RGB,
  red: [185, 28, 28] as RGB,
  redTint: [254, 226, 226] as RGB,
  gold: [202, 138, 4] as RGB,
  goldTint: [254, 249, 195] as RGB,
  silver: [148, 163, 184] as RGB,
  bronze: [180, 110, 60] as RGB,
};
const AVATAR = [
  [37, 99, 235],
  [124, 58, 237],
  [14, 147, 132],
  [196, 50, 10],
  [71, 84, 103],
  [221, 37, 144],
  [2, 132, 199],
] as RGB[];

const fill = (d: jsPDF, c: RGB) => d.setFillColor(c[0], c[1], c[2]);
const ink = (d: jsPDF, c: RGB) => d.setTextColor(c[0], c[1], c[2]);
const stroke = (d: jsPDF, c: RGB) => d.setDrawColor(c[0], c[1], c[2]);
const font = (d: jsPDF, size: number, style: 'normal' | 'bold' = 'normal') => {
  d.setFont('helvetica', style);
  d.setFontSize(size);
};

const W = 297;
const H = 210;
const M = 12;

// ─── filters / text helpers ──────────────────────────────────────────────────
export interface DashboardPdfFilters {
  dateRange?: { start?: string; end?: string };
  periodMode?: string;
  // Empty = no user filter (all users).
  selectedUserNames?: string[];
  // Same Score toggle as the dashboard: Positive shows done %, Negative
  // shows not-done % as a minus.
  scoreAsNegative?: boolean;
}

// "2026-09-28" → "28-09-2026" (no Date parsing, so no timezone shift).
const fmtIsoDate = (iso?: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}-${m}-${y}` : iso;
};

// A range longer than 8 days is a month — the dashboard's own rule.
const isMonthRange = (f: DashboardPdfFilters) => {
  const { start, end } = f.dateRange ?? {};
  if (!start || !end) return false;
  return Date.parse(`${end}T00:00:00`) - Date.parse(`${start}T00:00:00`) > 8 * 86_400_000;
};

const describePeriod = (f: DashboardPdfFilters) => {
  const { start, end } = f.dateRange ?? {};
  if (!start && !end) return 'All dates';
  const mode = isMonthRange(f) ? 'Monthly' : 'Weekly';
  return `${fmtIsoDate(start) || '...'} to ${fmtIsoDate(end) || '...'} (${mode})`;
};

const describeUsers = (names: string[] = []) => {
  if (names.length === 0) return 'All users';
  const shown = names.slice(0, 6).join(', ');
  return names.length > 6 ? `${shown} +${names.length - 6} more` : shown;
};

const initialsOf = (name?: string) =>
  (name ?? '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
const colourOf = (name?: string) => {
  let h = 0;
  for (const ch of name ?? '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR[h % AVATAR.length];
};

// Fits text into a width, adding "..." when it is cut.
const fit = (d: jsPDF, text: string, width: number) => {
  if (d.getTextWidth(text) <= width) return text;
  let t = text;
  while (t.length > 1 && d.getTextWidth(`${t}...`) > width) t = t.slice(0, -1);
  return `${t}...`;
};

// ─── photos: loaded once, cropped to a circle, as PNG data URLs ─────────────
const isRealPhoto = (src?: string | null) => !!src && !src.includes('ui-avatars.com');

// The dashboard's <img> tags load the same photos without CORS, and the
// browser caches that copy without the CORS header — reusing it here would
// taint the canvas. So fetch a fresh CORS copy (no cache) and draw it from a
// local blob URL; the cached <img> path below is only the fallback.
const fetchPhotoBlobUrl = async (src: string): Promise<string | null> => {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(src, { mode: 'cors', cache: 'no-store', signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const blob = await res.blob();
    return blob.type.startsWith('image/') ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
};

const loadPhoto = async (src: string): Promise<string | null> => {
  const blobUrl = await fetchPhotoBlobUrl(src);
  try {
    return (await drawPhoto(blobUrl ?? src)) ?? (blobUrl ? await drawPhoto(src) : null);
  } finally {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }
};

const drawPhoto = (src: string): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    if (!src.startsWith('blob:')) img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 4000);
    img.onload = () => {
      clearTimeout(timer);
      try {
        const size = 96;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        const s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        // Host without CORS headers: the canvas is tainted — use initials.
        resolve(null);
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });

const loadPhotos = async (people: any[]) => {
  const out = new Map<string, string>();
  const srcs = [...new Set(people.map((p) => p?.image).filter(isRealPhoto))] as string[];
  const loaded = await Promise.all(srcs.map(async (s) => [s, await loadPhoto(s)] as const));
  for (const [s, data] of loaded) if (data) out.set(s, data);
  return out;
};

const drawAvatar = (
  d: jsPDF,
  photos: Map<string, string>,
  person: { name?: string; image?: string | null },
  cx: number,
  cy: number,
  r: number
) => {
  const data = person.image ? photos.get(person.image) : undefined;
  if (data) {
    d.addImage(data, 'PNG', cx - r, cy - r, r * 2, r * 2);
    return;
  }
  fill(d, colourOf(person.name));
  d.circle(cx, cy, r, 'F');
  font(d, r * 2.1, 'bold');
  ink(d, C.white);
  d.text(initialsOf(person.name), cx, cy + r * 0.36, { align: 'center' });
};

// ─── page furniture ──────────────────────────────────────────────────────────
const drawLogo = (d: jsPDF, x: number, y: number, s: number) => {
  fill(d, C.blue);
  d.roundedRect(x, y, s, s, 2.6, 2.6, 'F');
  // rocket: body, nose, fins, flame
  fill(d, C.white);
  const cx = x + s / 2;
  d.triangle(cx, y + s * 0.16, cx - s * 0.13, y + s * 0.42, cx + s * 0.13, y + s * 0.42, 'F');
  d.rect(cx - s * 0.13, y + s * 0.42, s * 0.26, s * 0.24, 'F');
  d.triangle(
    cx - s * 0.13,
    y + s * 0.5,
    cx - s * 0.26,
    y + s * 0.72,
    cx - s * 0.13,
    y + s * 0.66,
    'F'
  );
  d.triangle(
    cx + s * 0.13,
    y + s * 0.5,
    cx + s * 0.26,
    y + s * 0.72,
    cx + s * 0.13,
    y + s * 0.66,
    'F'
  );
  d.setFillColor(251, 191, 36);
  d.triangle(cx - s * 0.08, y + s * 0.68, cx + s * 0.08, y + s * 0.68, cx, y + s * 0.86, 'F');
  fill(d, C.blue);
  d.circle(cx, y + s * 0.45, s * 0.05, 'F');
};

const drawHeader = (d: jsPDF, title: string, subtitle: string) => {
  fill(d, C.blueTint);
  d.rect(0, 0, W, 27, 'F');
  // soft rings, top right
  d.setDrawColor(214, 226, 252);
  d.setLineWidth(0.3);
  d.circle(W - 40, 4, 22, 'S');
  d.circle(W - 40, 4, 32, 'S');
  drawLogo(d, M, 6.5, 14);
  font(d, 15, 'bold');
  ink(d, C.blue);
  d.text('Auto', M + 18, 14);
  const autoW = d.getTextWidth('Auto');
  ink(d, C.ink);
  d.text('Rocket', M + 18 + autoW, 14);
  font(d, 7.5);
  ink(d, C.muted);
  d.text('Growth on Autopilot', M + 18, 18.6);
  font(d, 15, 'bold');
  ink(d, C.ink);
  d.text(title, W - M, 13.5, { align: 'right' });
  font(d, 8);
  ink(d, C.muted);
  d.text(subtitle, W - M, 19, { align: 'right' });
  fill(d, C.blue);
  d.rect(0, 27, W, 1.1, 'F');
};

const sectionTitle = (d: jsPDF, text: string, y: number, note?: string) => {
  font(d, 11, 'bold');
  ink(d, C.ink);
  d.text(text, M, y);
  const w = d.getTextWidth(text);
  fill(d, C.blue);
  d.rect(M, y + 1.6, 10, 0.9, 'F');
  if (note) {
    font(d, 7.5);
    ink(d, C.muted);
    d.text(note, M + w + 4, y);
  }
};

const drawFooters = (d: jsPDF, generated: string) => {
  const total = d.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    d.setPage(i);
    stroke(d, C.line);
    d.setLineWidth(0.2);
    d.line(M, H - 10, W - M, H - 10);
    fill(d, C.blue);
    d.circle(M + 1, H - 6.2, 0.8, 'F');
    font(d, 7);
    ink(d, C.muted);
    d.text(
      'AutoRocket  ·  MIS System Dashboard  ·  Confidential - for internal use only',
      M + 3,
      H - 5.5
    );
    d.text(`Generated ${generated}   |   Page ${i} of ${total}`, W - M, H - 5.5, {
      align: 'right',
    });
  }
};

// Small line icons for the metric cards (no font glyphs needed).
type IconKind = 'people' | 'target' | 'check' | 'clock' | 'alert' | 'bars';
const drawIcon = (d: jsPDF, kind: IconKind, cx: number, cy: number, c: RGB, tint: RGB) => {
  fill(d, tint);
  d.circle(cx, cy, 4.6, 'F');
  stroke(d, c);
  fill(d, c);
  d.setLineWidth(0.45);
  if (kind === 'people') {
    d.circle(cx - 1.2, cy - 1, 0.9, 'F');
    d.circle(cx + 1.2, cy - 1, 0.9, 'F');
    d.roundedRect(cx - 2.6, cy + 0.3, 2.4, 1.6, 0.6, 0.6, 'F');
    d.roundedRect(cx + 0.2, cy + 0.3, 2.4, 1.6, 0.6, 0.6, 'F');
  } else if (kind === 'target') {
    d.circle(cx, cy, 2.6, 'S');
    d.circle(cx, cy, 1.4, 'S');
    d.circle(cx, cy, 0.4, 'F');
  } else if (kind === 'check') {
    d.setLineWidth(0.7);
    d.line(cx - 1.8, cy, cx - 0.5, cy + 1.3);
    d.line(cx - 0.5, cy + 1.3, cx + 1.9, cy - 1.3);
  } else if (kind === 'clock') {
    d.circle(cx, cy, 2.4, 'S');
    d.line(cx, cy, cx, cy - 1.5);
    d.line(cx, cy, cx + 1.1, cy + 0.6);
  } else if (kind === 'alert') {
    d.triangle(cx, cy - 2.4, cx - 2.5, cy + 1.9, cx + 2.5, cy + 1.9, 'S');
    d.line(cx, cy - 0.8, cx, cy + 0.6);
    d.circle(cx, cy + 1.25, 0.2, 'F');
  } else {
    d.rect(cx - 2, cy + 0.2, 0.9, 1.6, 'F');
    d.rect(cx - 0.45, cy - 0.8, 0.9, 2.6, 'F');
    d.rect(cx + 1.1, cy - 1.9, 0.9, 3.7, 'F');
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═════════════════════════════════════════════════════════════════════════════
export const generateDashboardPDF = async (
  visibleColumnsList: any[],
  filteredEmployeesData: any[],
  topBestPerformers: any[] = [],
  pendingTasks: any[] = [],
  topWorstPerformers: any[] = [],
  departmentScores: any[] = [],
  _companyName: string = 'AutoRocket',
  filters: DashboardPdfFilters = {}
) => {
  const generated = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const { start, end } = filters.dateRange ?? {};
  const fileName =
    start && end
      ? `MIS-Report-${start}_to_${end}.pdf`
      : `MIS-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
  const monthly = isMonthRange(filters);
  const unit = monthly ? 'Month' : 'Week';
  const periodText = describePeriod(filters);
  const usersText = describeUsers(filters.selectedUserNames);
  const negative = !!filters.scoreAsNegative;
  const rows = filteredEmployeesData ?? [];

  const photos = await loadPhotos([
    ...rows,
    ...topBestPerformers,
    ...topWorstPerformers,
    ...pendingTasks,
  ]);

  // Table %-columns, shown the way the dashboard's Score toggle shows them.
  const donePct = (e: any) => 100 - (Number(e.weeklyWorkDone) || 0);
  const onTimePct = (e: any) => 100 - (Number(e.weeklyWorkDoneOnTime) || 0);
  const pctCell = (notDone: number, done: number, measurable: boolean) => {
    if (!measurable) return '-';
    if (negative) return notDone > 0 ? `-${notDone}%` : '0%';
    return `${done}%`;
  };

  const d = new jsPDF('l', 'mm', 'a4');

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1
  // ══════════════════════════════════════════════════════════════════════════
  drawHeader(
    d,
    'MIS Dashboard Report',
    `${monthly ? 'Monthly' : 'Weekly'} Performance Review  ·  ${periodText}`
  );

  // ── filter chips ──────────────────────────────────────────────────────────
  let y = 35;
  font(d, 7.5, 'bold');
  ink(d, C.muted);
  d.text('FILTERS', M, y + 1);
  let x = M + 17;
  const chips: [string, string][] = [
    ['Period: ', periodText],
    ['Generated: ', generated],
    ['Users: ', usersText],
    ['Score: ', negative ? 'Negative (-)' : 'Positive (+)'],
  ];
  for (const [k, v] of chips) {
    font(d, 7.5);
    const kw = d.getTextWidth(k);
    font(d, 7.5, 'bold');
    const vw = d.getTextWidth(v);
    const cw = kw + vw + 8;
    fill(d, C.blueTint);
    d.roundedRect(x, y - 3.6, cw, 6.2, 3.1, 3.1, 'F');
    font(d, 7.5);
    ink(d, C.muted);
    d.text(k, x + 4, y + 0.6);
    font(d, 7.5, 'bold');
    ink(d, C.blueDark);
    d.text(v, x + 4 + kw, y + 0.6);
    x += cw + 3;
  }

  // ── key metrics ───────────────────────────────────────────────────────────
  y = 48;
  sectionTitle(d, 'Key Metrics', y);
  const totalEmps = rows.length;
  const totalTarget = rows.reduce((s, e) => s + (Number(e.target) || 0), 0);
  const totalDone = rows.reduce((s, e) => s + (Number(e.actualWorkDone) || 0), 0);
  const periodPend = rows.reduce((s, e) => s + (Number(e.weekPending) || 0), 0);
  const allPend = rows.reduce((s, e) => s + (Number(e.allPendingTillDate) || 0), 0);
  const rate = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;
  const cards: { v: string; l: string; c: RGB; t: RGB; i: IconKind; progress?: boolean }[] = [
    { v: `${totalEmps}`, l: 'TOTAL EMPLOYEES', c: C.blue, t: C.blueTint, i: 'people' },
    { v: `${totalTarget}`, l: 'TOTAL TARGET', c: C.blueDark, t: C.blueHead, i: 'target' },
    { v: `${totalDone}`, l: 'COMPLETED', c: C.green, t: C.greenTint, i: 'check' },
    { v: `${periodPend}`, l: 'PENDING (PERIOD)', c: C.orange, t: C.orangeTint, i: 'clock' },
    { v: `${allPend}`, l: 'ALL PENDING (TILL DATE)', c: C.red, t: C.redTint, i: 'alert' },
    { v: `${rate}%`, l: 'COMPLETION RATE', c: C.amber, t: C.amberTint, i: 'bars', progress: true },
  ];
  const gap = 4;
  const cw = (W - M * 2 - gap * 5) / 6;
  const ch = 24;
  const cy = y + 5;
  cards.forEach((k, i) => {
    const cx = M + i * (cw + gap);
    fill(d, C.white);
    stroke(d, C.line);
    d.setLineWidth(0.25);
    d.roundedRect(cx, cy, cw, ch, 2, 2, 'FD');
    fill(d, k.c);
    d.roundedRect(cx, cy, 1.4, ch, 0.7, 0.7, 'F');
    font(d, 18, 'bold');
    ink(d, k.c);
    d.text(k.v, cx + 5.5, cy + 11);
    font(d, 6.3, 'bold');
    ink(d, C.muted);
    d.text(k.l, cx + 5.5, cy + 18);
    drawIcon(d, k.i, cx + cw - 8, cy + 7.5, k.c, k.t);
    if (k.progress) {
      font(d, 6.3, 'bold');
      ink(d, C.muted);
      d.text(`${totalDone} / ${totalTarget}`, cx + cw - 4, cy + 18, { align: 'right' });
      fill(d, C.line);
      d.roundedRect(cx + 5.5, cy + 20.3, cw - 9.5, 1.2, 0.6, 0.6, 'F');
      fill(d, k.c);
      d.roundedRect(
        cx + 5.5,
        cy + 20.3,
        Math.max(0.8, ((cw - 9.5) * rate) / 100),
        1.2,
        0.6,
        0.6,
        'F'
      );
    }
  });

  // ── executive summary ─────────────────────────────────────────────────────
  y = cy + ch + 11;
  sectionTitle(d, 'Executive Summary', y, 'Top 5 rankings for the selected period');
  const sy = y + 5;
  const sw = (W - M * 2 - 6 * 2) / 3;
  const sh = 64;
  const lists: {
    title: string;
    sub: string;
    color: RGB;
    tint: RGB;
    people: any[];
    kind: 'best' | 'worst' | 'pending';
  }[] = [
    {
      title: 'Top 5 Best Performers',
      sub: '% done, then on time, work done, pending',
      color: C.gold,
      tint: C.goldTint,
      people: topBestPerformers,
      kind: 'best',
    },
    {
      title: 'Top 5 Worst Performers',
      sub: 'Lowest % done first (reverse of best)',
      color: C.orange,
      tint: C.orangeTint,
      people: topWorstPerformers,
      kind: 'worst',
    },
    {
      title: 'Highest Pending Tasks',
      sub: 'Open tasks in this period',
      color: C.red,
      tint: C.redTint,
      people: pendingTasks,
      kind: 'pending',
    },
  ];
  const maxPend = Math.max(1, ...pendingTasks.map((e) => Number(e.weekPending) || 0));
  lists.forEach((L, li) => {
    const lx = M + li * (sw + 6);
    fill(d, C.white);
    stroke(d, C.line);
    d.setLineWidth(0.25);
    d.roundedRect(lx, sy, sw, sh, 2, 2, 'FD');
    fill(d, L.color);
    d.rect(lx + 0.4, sy, sw - 0.8, 1.2, 'F');
    font(d, 9.5, 'bold');
    ink(d, C.ink);
    d.text(L.title, lx + 5, sy + 8.5);
    font(d, 6.5);
    ink(d, C.muted);
    d.text(L.sub, lx + 5, sy + 12.5);
    drawIcon(
      d,
      L.kind === 'best' ? 'target' : L.kind === 'worst' ? 'alert' : 'bars',
      lx + sw - 9,
      sy + 9,
      L.color,
      L.tint
    );
    const people = (L.people ?? []).slice(0, 5);
    if (people.length === 0) {
      font(d, 8);
      ink(d, C.faint);
      d.text('No data for this period', lx + sw / 2, sy + 38, { align: 'center' });
      return;
    }
    people.forEach((p, i) => {
      const ry = sy + 17 + i * 9.4;
      // rank
      if (L.kind === 'best' && i < 3) {
        fill(d, [C.gold, C.silver, C.bronze][i]);
        d.circle(lx + 7.5, ry + 3.5, 2.6, 'F');
        font(d, 7, 'bold');
        ink(d, C.white);
      } else {
        fill(d, L.kind === 'best' ? C.bg : C.redTint);
        d.roundedRect(lx + 5, ry + 1, 5, 5, 1, 1, 'F');
        font(d, 7, 'bold');
        ink(d, L.kind === 'best' ? C.muted : C.red);
      }
      d.text(String(i + 1), lx + 7.5, ry + 4.5, { align: 'center' });
      drawAvatar(d, photos, p, lx + 16, ry + 3.5, 3.3);
      font(d, 8, 'bold');
      ink(d, C.ink);
      const name = p.tenant?.name ? `${p.name} (${p.tenant.name})` : (p.name ?? '');
      d.text(fit(d, name, sw - 56), lx + 21.5, ry + 4.6);
      if (L.kind === 'pending') {
        const v = Number(p.weekPending) || 0;
        fill(d, C.line);
        d.roundedRect(lx + sw - 34, ry + 2.9, 22, 1.4, 0.7, 0.7, 'F');
        fill(d, C.red);
        d.roundedRect(lx + sw - 34, ry + 2.9, Math.max(1, (22 * v) / maxPend), 1.4, 0.7, 0.7, 'F');
        font(d, 9, 'bold');
        ink(d, C.ink);
        d.text(String(v), lx + sw - 5, ry + 4.7, { align: 'right' });
      } else {
        const v = donePct(p);
        const good = v >= 80;
        const bad = v < 40;
        const pillC = good ? C.green : bad ? C.red : C.amber;
        const pillT = good ? C.greenTint : bad ? C.redTint : C.amberTint;
        font(d, 7, 'bold');
        const label = `${v}%`;
        const pw = d.getTextWidth(label) + 6;
        fill(d, pillT);
        d.roundedRect(lx + sw - 5 - pw, ry + 1.2, pw, 4.8, 2.4, 2.4, 'F');
        ink(d, pillC);
        d.text(label, lx + sw - 5 - pw / 2, ry + 4.5, { align: 'center' });
        font(d, 6);
        ink(d, C.muted);
        d.text(`${p.actualWorkDone ?? 0}/${p.target ?? 0} done`, lx + sw - 7 - pw, ry + 4.5, {
          align: 'right',
        });
      }
      if (i < people.length - 1) {
        stroke(d, C.line);
        d.setLineWidth(0.15);
        d.line(lx + 5, ry + 8.2, lx + sw - 5, ry + 8.2);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — DEPARTMENT PERFORMANCE (graph + table), always on its own page so
  // nothing from it is split off the bottom of page 1.
  // ══════════════════════════════════════════════════════════════════════════
  const depts = [...(departmentScores ?? [])].sort(
    (a: any, b: any) => (b.pendingWorks ?? 0) - (a.pendingWorks ?? 0)
  );
  const deptLabel = (dp: any) => (dp?.name ?? '') as string;
  const deptDone = (dp: any) =>
    negative ? Number(dp.workNotDonePct) || 0 : 100 - (Number(dp.workNotDonePct) || 0);
  const deptOnTime = (dp: any) =>
    negative ? Number(dp.notDoneOnTimePct) || 0 : 100 - (Number(dp.notDoneOnTimePct) || 0);
  const scoreHead = negative ? 'NOT DONE %' : 'DONE %';
  const lateHead = negative ? 'LATE %' : 'ON TIME %';

  d.addPage();
  const deptHeader = () =>
    drawHeader(d, 'Department Performance', `${depts.length} departments  ·  ${periodText}`);
  deptHeader();
  y = 38;
  sectionTitle(
    d,
    'Department Performance',
    y,
    'Pending works per department, with its done and on-time scores'
  );

  // ── column chart (same reading as the dashboard's Department Scores) ──────
  const TEAL: RGB = [13, 148, 136];
  const chartDepts = depts.slice(0, 12);
  if (chartDepts.length) {
    // legend
    const legendItems: [RGB, string][] = [
      [C.orange, 'Total pending works'],
      [C.blue, negative ? 'Work Not Done %' : 'Work Done %'],
      [TEAL, negative ? 'Not Done On Time %' : 'Done On Time %'],
    ];
    let lgx = W - M;
    font(d, 7);
    for (const [c, t] of [...legendItems].reverse()) {
      const tw = d.getTextWidth(t);
      lgx -= tw;
      ink(d, C.ink2);
      d.text(t, lgx, y);
      lgx -= 4;
      fill(d, c);
      d.circle(lgx + 1.4, y - 1, 1.2, 'F');
      lgx -= 6;
    }

    const plotTop = y + 10;
    const plotH = 46;
    const plotLeft = M + 10;
    const plotW = W - M - plotLeft;
    const base = plotTop + plotH;
    const top = Math.max(0, ...chartDepts.map((dp: any) => Number(dp.pendingWorks) || 0));
    const raw = Math.max(1, top) / 4;
    const pow = 10 ** Math.floor(Math.log10(raw));
    const n = raw / pow;
    const step = Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow);
    const max = Math.max(step, Math.ceil(top / step) * step);

    // grid + y-axis labels
    for (let t = 0; t <= max + 0.0001; t += step) {
      const gy = base - (t / max) * plotH;
      stroke(d, C.line);
      d.setLineWidth(t === 0 ? 0.3 : 0.15);
      if (t === 0) d.line(plotLeft, gy, W - M, gy);
      else {
        d.setLineDashPattern([1, 1], 0);
        d.line(plotLeft, gy, W - M, gy);
        d.setLineDashPattern([], 0);
      }
      font(d, 6.5);
      ink(d, C.muted);
      d.text(t >= 1000 ? `${+(t / 1000).toFixed(1)}k` : String(t), plotLeft - 2, gy + 1, {
        align: 'right',
      });
    }

    const slot = plotW / chartDepts.length;
    const barW = Math.min(14, slot * 0.42);
    const miniW = Math.min(44, slot * 0.82);
    chartDepts.forEach((dp: any, i: number) => {
      const cx = plotLeft + slot * i + slot / 2;
      const v = Number(dp.pendingWorks) || 0;
      const bh = (v / max) * plotH;
      fill(d, C.orange);
      if (bh > 0) d.roundedRect(cx - barW / 2, base - bh, barW, bh, 1, 1, 'F');
      // value pill above the bar
      font(d, 7, 'bold');
      const label = v.toLocaleString('en-IN');
      const pw = d.getTextWidth(label) + 4;
      fill(d, C.amberTint);
      d.roundedRect(cx - pw / 2, base - bh - 6, pw, 4.4, 1.2, 1.2, 'F');
      ink(d, C.amber);
      d.text(label, cx, base - bh - 2.8, { align: 'center' });

      // name + company · people under the axis
      font(d, 7.5, 'bold');
      ink(d, C.ink);
      d.text(fit(d, deptLabel(dp).toUpperCase(), slot - 4), cx, base + 5, { align: 'center' });
      font(d, 6.5);
      ink(d, C.muted);
      const meta = [dp.tenant?.name, dp.employeeCount != null ? `${dp.employeeCount} ppl` : '']
        .filter(Boolean)
        .join(' · ');
      d.text(fit(d, meta, slot - 4), cx, base + 8.6, { align: 'center' });

      // two mini score bars
      const mx = cx - miniW / 2;
      const bars: [string, number, RGB][] = [
        [negative ? 'Not done' : 'Done', deptDone(dp), C.blue],
        [negative ? 'Late' : 'On time', deptOnTime(dp), TEAL],
      ];
      bars.forEach(([t, val, c], j) => {
        const by = base + 12.5 + j * 6.5;
        font(d, 6);
        ink(d, C.muted);
        d.text(t, mx, by);
        font(d, 6, 'bold');
        ink(d, negative && val > 0 ? C.red : C.ink);
        d.text(`${negative && val > 0 ? '-' : ''}${val.toFixed(1)}%`, mx + miniW, by, {
          align: 'right',
        });
        fill(d, C.line);
        d.roundedRect(mx, by + 1, miniW, 1.2, 0.6, 0.6, 'F');
        fill(d, c);
        d.roundedRect(
          mx,
          by + 1,
          Math.max(0.6, (miniW * Math.min(100, val)) / 100),
          1.2,
          0.6,
          0.6,
          'F'
        );
      });
    });
    y = base + 30;
    if (depts.length > chartDepts.length) {
      font(d, 6.5);
      ink(d, C.muted);
      d.text(
        `Chart shows the ${chartDepts.length} departments with the most pending work; the table lists all ${depts.length}.`,
        M,
        y - 3
      );
      y += 2;
    }
  } else {
    y += 6;
  }

  // ── department table (continues on a fresh page with its header if long) ──
  autoTable(d, {
    startY: y + 2,
    margin: { left: M, right: M, top: 34, bottom: 14 },
    rowPageBreak: 'avoid',
    head: [['DEPARTMENT', 'EMPLOYEES', 'AVG SCORE', 'PENDING', scoreHead, lateHead]],
    body: depts.length
      ? depts.map((dp: any) => [
          dp.tenant?.name ? `${dp.name} (${dp.tenant.name})` : (dp.name ?? ''),
          dp.employeeCount ?? 0,
          `${(Number(dp.averageScore) || 0).toFixed(1)}%`,
          dp.pendingWorks ?? 0,
          `${deptDone(dp).toFixed(1)}%`,
          `${deptOnTime(dp).toFixed(1)}%`,
        ])
      : [['No department data', '', '', '', '', '']],
    theme: 'plain',
    headStyles: {
      fillColor: C.blueTint,
      textColor: C.blueDark,
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: C.ink,
      cellPadding: { top: 2.6, bottom: 2.6, left: 4, right: 4 },
      halign: 'center',
      lineColor: C.line,
      lineWidth: { bottom: 0.15 },
    },
    columnStyles: {
      0: {
        halign: 'left',
        cellWidth: 70,
        cellPadding: { top: 2.6, bottom: 2.6, left: 12, right: 4 },
      },
      2: { cellWidth: 70 },
    },
    didParseCell: (h: any) => {
      if (h.section === 'head' && h.column.index === 0) h.cell.styles.halign = 'left';
      if (h.section !== 'body' || !depts.length) return;
      if (h.column.index === 2) h.cell.text = [''];
      if (h.column.index === 3) {
        h.cell.styles.textColor = Number(h.cell.raw) > 0 ? C.red : C.ink;
        h.cell.styles.fontStyle = 'bold';
      }
    },
    didDrawCell: (h: any) => {
      if (h.section !== 'body' || !depts.length) return;
      const dp = depts[h.row.index];
      const { x: cx0, y: cy0, width: cwid, height: chei } = h.cell;
      const mid = cy0 + chei / 2;
      if (h.column.index === 0) {
        fill(d, colourOf(dp?.name));
        d.roundedRect(cx0 + 3.5, mid - 2.2, 4.4, 4.4, 1, 1, 'F');
        font(d, 6.5, 'bold');
        ink(d, C.white);
        d.text(initialsOf(dp?.name).slice(0, 1), cx0 + 5.7, mid + 0.9, { align: 'center' });
      }
      if (h.column.index === 2) {
        const v = Number(dp?.averageScore) || 0;
        const bw = cwid - 26;
        fill(d, C.line);
        d.roundedRect(cx0 + 4, mid - 0.7, bw, 1.4, 0.7, 0.7, 'F');
        fill(d, C.blue);
        d.roundedRect(
          cx0 + 4,
          mid - 0.7,
          Math.max(0.8, (bw * Math.min(100, v)) / 100),
          1.4,
          0.7,
          0.7,
          'F'
        );
        font(d, 8, 'bold');
        ink(d, C.ink);
        d.text(`${v.toFixed(1)}%`, cx0 + cwid - 4, mid + 1, { align: 'right' });
      }
    },
    willDrawPage: (h: any) => {
      if (h.pageNumber > 1) deptHeader();
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 3+ — EMPLOYEE DETAILS
  // ══════════════════════════════════════════════════════════════════════════
  d.addPage();
  const detailsHeader = () =>
    drawHeader(d, 'Employee Details', `${rows.length} records  ·  ${periodText}`);
  detailsHeader();
  y = 38;
  sectionTitle(d, 'Employee Performance Details', y);
  // legend
  const legend: [RGB, string][] = [
    [C.green, 'Completed / clear'],
    [C.amber, 'Watch'],
    [C.red, 'Needs attention'],
  ];
  let lx = W - M;
  font(d, 7);
  for (const [c, t] of [...legend].reverse()) {
    const tw = d.getTextWidth(t);
    lx -= tw;
    ink(d, C.muted);
    d.text(t, lx, y);
    fill(d, c);
    d.circle(lx - 2.5, y - 1, 0.9, 'F');
    lx -= 8;
  }

  // Columns: whatever the dashboard shows, minus next-period inputs.
  const cols = (visibleColumnsList ?? []).filter((c: any) => !String(c.key).startsWith('nextWeek'));
  const lastKeys = ['lastWeekPlannedNotDone', 'lastWeekPlannedNotDoneOnTime', 'lastWeekCommitment'];
  const currentCols = cols.filter((c: any) => !lastKeys.includes(c.key));
  const lastCols = cols.filter((c: any) => lastKeys.includes(c.key));
  const ordered = [...currentCols, ...lastCols];
  const headLabel = (c: any) => {
    switch (c.key) {
      case 'weeklyDone':
        return negative ? '% NOT DONE' : '% DONE';
      case 'weeklyOnTime':
        return negative ? '% NOT DONE ON TIME' : '% DONE ON TIME';
      case 'lastWeekPlannedNotDone':
        return 'PLANNED NOT DONE %';
      case 'lastWeekPlannedNotDoneOnTime':
        return 'PLANNED NOT DONE ON TIME %';
      case 'lastWeekCommitment':
        return 'COMMITMENT';
      default:
        return String(c.label ?? '').toUpperCase();
    }
  };
  const cell = (e: any, key: string): string | number => {
    switch (key) {
      case 'name':
        return e.tenant?.name ? `${e.name} (${e.tenant.name})` : (e.name ?? '');
      case 'designation':
        return e.designation ?? '';
      case 'target':
        return e.target ?? 0;
      case 'actualWork':
        return e.actualWorkDone ?? 0;
      case 'weeklyDone':
        return pctCell(Number(e.weeklyWorkDone) || 0, donePct(e), Number(e.target) > 0);
      case 'weeklyOnTime':
        return pctCell(
          Number(e.weeklyWorkDoneOnTime) || 0,
          onTimePct(e),
          Number(e.actualWorkDone) > 0
        );
      case 'totalWork':
        return e.totalWorkDone ?? 0;
      case 'weekPending':
        return e.weekPending ?? 0;
      case 'allPending':
        return e.allPendingTillDate ?? 0;
      case 'lastWeekPlannedNotDone':
        return `${e.plannedWorkNotDone ?? 0}%`;
      case 'lastWeekPlannedNotDoneOnTime':
        return `${e.plannedWorkNotDoneOnTime ?? 0}%`;
      case 'lastWeekCommitment':
        return e.commitment ?? '';
      default:
        return '';
    }
  };
  const groupRow: any[] = [];
  if (currentCols.length)
    groupRow.push({
      content: 'CURRENT PERIOD',
      colSpan: currentCols.length,
      styles: { fillColor: C.blue, textColor: C.white, halign: 'center' },
    });
  if (lastCols.length)
    groupRow.push({
      content: `LAST ${unit.toUpperCase()}`,
      colSpan: lastCols.length,
      styles: { fillColor: C.blueDark, textColor: C.white, halign: 'center' },
    });
  const nameIdx = ordered.findIndex((c: any) => c.key === 'name');
  const keyAt = (i: number) => ordered[i]?.key as string;

  autoTable(d, {
    startY: y + 5,
    margin: { left: M, right: M, top: 34, bottom: 14 },
    head: [groupRow, ordered.map(headLabel)],
    body: rows.length
      ? rows.map((e) => ordered.map((c: any) => cell(e, c.key)))
      : [[{ content: 'No people match the filters', colSpan: Math.max(1, ordered.length) }]],
    theme: 'plain',
    styles: { overflow: 'linebreak' },
    headStyles: {
      fillColor: C.blueHead,
      textColor: C.blueDark,
      fontStyle: 'bold',
      fontSize: 6.5,
      halign: 'center',
      valign: 'middle',
      cellPadding: 2.2,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: C.ink,
      halign: 'center',
      valign: 'middle',
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
      lineColor: C.line,
      lineWidth: { bottom: 0.15 },
    },
    alternateRowStyles: { fillColor: C.bg },
    columnStyles: nameIdx >= 0 ? { [nameIdx]: { halign: 'left', cellWidth: 40 } } : {},
    didParseCell: (h: any) => {
      if (h.section === 'head') {
        if (h.row.index === 1 && keyAt(h.column.index) === 'name') h.cell.styles.halign = 'left';
        return;
      }
      if (!rows.length) return;
      const e = rows[h.row.index];
      const key = keyAt(h.column.index);
      const s = h.cell.styles;
      if (key === 'name') {
        s.fontStyle = 'bold';
        s.cellPadding = { top: 3, bottom: 3, left: 9, right: 2 };
      }
      if (key === 'designation') s.textColor = C.muted;
      if ((key === 'actualWork' || key === 'totalWork') && Number(h.cell.raw) > 0) {
        s.fillColor = C.greenTint;
        s.textColor = C.green;
        s.fontStyle = 'bold';
      }
      if (key === 'weeklyDone' && Number(e.target) > 0) {
        const notDone = Number(e.weeklyWorkDone) || 0;
        if (notDone >= 75) {
          s.fillColor = C.redTint;
          s.textColor = C.red;
          s.fontStyle = 'bold';
        } else if (notDone >= 25) {
          s.fillColor = C.amberTint;
          s.textColor = C.amber;
          s.fontStyle = 'bold';
        } else {
          s.textColor = C.green;
          s.fontStyle = 'bold';
        }
      }
      if (key === 'weekPending' && Number(h.cell.raw) > 0) {
        s.textColor = C.red;
        s.fontStyle = 'bold';
      }
      if (key === 'allPending') {
        const v = Number(h.cell.raw) || 0;
        if (v >= 50) {
          s.fillColor = C.redTint;
          s.textColor = C.red;
          s.fontStyle = 'bold';
        } else if (v > 0) {
          s.fillColor = C.amberTint;
          s.textColor = C.amber;
          s.fontStyle = 'bold';
        }
      }
      if (
        (key === 'lastWeekPlannedNotDone' || key === 'lastWeekPlannedNotDoneOnTime') &&
        Number(String(h.cell.raw).replace('%', '')) > 0
      ) {
        s.fillColor = C.amberTint;
        s.textColor = C.amber;
        s.fontStyle = 'bold';
      }
      if (key === 'lastWeekCommitment') s.halign = 'left';
    },
    didDrawCell: (h: any) => {
      if (h.section !== 'body' || !rows.length) return;
      if (keyAt(h.column.index) !== 'name') return;
      drawAvatar(d, photos, rows[h.row.index], h.cell.x + 4.5, h.cell.y + h.cell.height / 2, 2.8);
    },
    willDrawPage: (h: any) => {
      if (h.pageNumber > 1) detailsHeader();
    },
  });

  // ── totals strip ──────────────────────────────────────────────────────────
  let ty = ((d as any).lastAutoTable?.finalY ?? y + 20) + 8;
  if (ty > H - 28) {
    d.addPage();
    detailsHeader();
    ty = 38;
  }
  const totals: [string, number, RGB][] = [
    ['Total Target', totalTarget, C.blueDark],
    ['Total Work Done', totalDone, C.green],
    ['Pending (Period)', periodPend, C.orange],
    ['All Pending (Till Date)', allPend, C.red],
  ];
  const tw = (W - M * 2 - 3 * 5) / 4;
  totals.forEach(([label, value, c], i) => {
    const tx = M + i * (tw + 5);
    fill(d, C.white);
    stroke(d, C.line);
    d.setLineWidth(0.25);
    d.roundedRect(tx, ty, tw, 11, 2, 2, 'FD');
    fill(d, c);
    d.roundedRect(tx, ty, 1.3, 11, 0.6, 0.6, 'F');
    font(d, 8);
    ink(d, C.ink2);
    d.text(label, tx + 5, ty + 6.9);
    font(d, 11, 'bold');
    ink(d, c);
    d.text(String(value), tx + tw - 5, ty + 7.2, { align: 'right' });
  });

  drawFooters(d, generated);
  d.save(fileName);
};
