'use client';

import {
  BarChart3,
  Building2,
  CalendarCheck,
  Clock,
  History,
  LayoutDashboard,
  Menu,
  X,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';
import { useGetProfileQuery } from '@/features/profile/shared/server/tanstackQuery/useProfileQueries';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/mis/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/mis/today_tasks', label: "Today's Tasks", icon: CalendarCheck },
  { href: '/mis/pending_tasks', label: 'Pending Tasks', icon: Clock },
  { href: '/mis/history_commitment', label: 'Commitment History', icon: History },
  { href: '/mis/kpi_kra', label: 'KPI / KRA', icon: BarChart3 },
  { href: '/mis/department', label: 'Department', icon: Building2 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Completely removed MIS Portal sidebar as Master System already provides the sidebar
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background w-full">
      <main className="w-full p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
