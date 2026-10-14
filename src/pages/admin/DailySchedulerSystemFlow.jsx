import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import supabase from "../../SupabaseClient";
import {
  GitFork,
  CalendarCheck,
  LayoutDashboard,
  List,
  Calendar as CalendarIcon,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowDown,
  RefreshCw,
  Users,
  ShieldCheck,
  Workflow,
  CalendarRange,
  Timer,
  Layers,
  ChevronRight,
  RotateCcw,
  PlusCircle
} from "lucide-react";

export default function DailySchedulerSystemFlow() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    todayTasks: 0,
    completedToday: 0,
    waitingTasks: 0,
    somedayTasks: 0,
    totalScheduled: 0,
    activeStaffCount: 0,
  });

  const fetchSchedulerStats = async () => {
    try {
      setRefreshing(true);
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const [
        todayTasksRes,
        waitingTasksRes,
        somedayTasksRes,
        allTasksRes,
        usersRes
      ] = await Promise.all([
        supabase.from("tasks").select("id, status, date").eq("date", todayStr),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "Overdue"),
        supabase.from("someday_tasks").select("id", { count: "exact", head: true }),
        supabase.from("tasks").select("id", { count: "exact", head: true }),
        supabase.from("users").select("id", { count: "exact", head: true })
      ]);

      const todayData = todayTasksRes.data || [];
      const completedToday = todayData.filter(t => t.status === "Completed" || t.status === "Done").length;

      setStats({
        todayTasks: todayData.length,
        completedToday,
        waitingTasks: waitingTasksRes.count || 0,
        somedayTasks: somedayTasksRes.count || 0,
        totalScheduled: allTasksRes.count || 0,
        activeStaffCount: usersRes.count || 0,
      });
    } catch (err) {
      console.error("Error fetching scheduler stats:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedulerStats();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full space-y-6">
      {/* Top Header Section — System Red Theme */}
      <div className="pb-4 border-b border-gray-200 space-y-1">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Icon + Heading + Badge in Single Line */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-md shadow-red-500/25 shrink-0">
              <GitFork className="w-5 h-5 transform rotate-90" />
            </div>
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight whitespace-nowrap">
                Daily Scheduler <span className="text-red-600">Flow</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                Active Execution Engine
              </span>
            </div>
          </div>

          {/* Right: Buttons in Single Line */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchSchedulerStats}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${refreshing ? "animate-spin text-red-600" : ""}`} />
              <span>Sync Schedule</span>
            </button>

            <Link
              to="/daily-scheduler/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm shadow-red-500/20 active:scale-95 whitespace-nowrap"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Open Scheduler Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Subtitle Underneath */}
        <p className="text-xs sm:text-sm font-medium text-gray-500 pl-[52px]">
          End-to-end task lifecycle from Someday backlog to daily slot scheduling, overdue waiting list, and performance reports
        </p>
      </div>

      {/* KPI Metric Cards — System Red Accent */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-red-300 transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold">Today's Scheduled Tasks</span>
            <CalendarCheck className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-black text-gray-900">{stats.todayTasks}</p>
          <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-600 font-semibold">{stats.completedToday} done</span> today
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-red-300 transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold">Waiting List (Overdue)</span>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-black text-red-600">{stats.waitingTasks}</p>
          <p className="text-[11px] text-gray-500 mt-1">Needs reschedule or action</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold">Someday Tasks (Backlog)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600">{stats.somedayTasks}</p>
          <p className="text-[11px] text-gray-500 mt-1">Unscheduled ideas & backlog</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold">Total Scheduled History</span>
            <Timer className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-gray-900">{stats.totalScheduled}</p>
          <p className="text-[11px] text-gray-500 mt-1">{stats.activeStaffCount} Team members tracked</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          AUTHENTIC FLOWCHART WORKFLOW CANVAS WITH ARROWS & NODES
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-200/90 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-red-100 text-red-600">
                <Workflow className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-gray-900">
                Daily Task Execution Flowchart Diagram
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Directional workflow representing task inception, time-slot scheduling, overdue waiting loop, and monthly reports
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
              <span className="w-2 h-2 rounded-full bg-red-600"></span>
              Timebox Lifecycle
            </span>
          </div>
        </div>

        {/* ─── DESKTOP HORIZONTAL FLOW PIPELINE (WITH SVG CONNECTORS) ─── */}
        <div className="hidden lg:block relative py-6 px-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
          <div className="grid grid-cols-4 gap-6 items-center relative z-10">
            {/* Step 1 Node: Someday Backlog */}
            <div className="relative group">
              <div className="p-5 rounded-2xl bg-white border-2 border-amber-500 shadow-md shadow-amber-500/10 transition-all hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    01
                  </span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Idea Backlog
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">Someday Tasks</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Future tasks without fixed dates. Stored safely until ready to be pulled into a specific work schedule.
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-amber-600">{stats.somedayTasks} Backlogged Tasks</span>
                  <Link to="/daily-scheduler/someday" className="text-gray-400 hover:text-amber-600 font-bold">Someday &rarr;</Link>
                </div>
              </div>

              {/* Connected Arrow to Step 2 */}
              <div className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 flex items-center">
                <div className="w-6 h-0.5 bg-red-500"></div>
                <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-red-500"></div>
              </div>
            </div>

            {/* Step 2 Node: Scheduling Matrix */}
            <div className="relative group">
              <div className="p-5 rounded-2xl bg-white border-2 border-red-500 shadow-md shadow-red-500/10 transition-all hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-xl bg-red-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    02
                  </span>
                  <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Execution
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">Scheduler Dashboard</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Time-boxed slots (e.g. 10:00 - 11:30 AM). Assigned to specific staff member with priority color tag and remarks.
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-red-600">{stats.todayTasks} Today's Schedule</span>
                  <Link to="/daily-scheduler/dashboard" className="text-gray-400 hover:text-red-600 font-bold">Today &rarr;</Link>
                </div>
              </div>

              {/* Connected Arrow to Step 3 */}
              <div className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 flex items-center">
                <div className="w-6 h-0.5 bg-rose-500"></div>
                <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-rose-500"></div>
              </div>
            </div>

            {/* Step 3 Node: Overdue Waiting Loop */}
            <div className="relative group">
              <div className="p-5 rounded-2xl bg-white border-2 border-rose-500 shadow-md shadow-rose-500/10 transition-all hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-xl bg-rose-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    03
                  </span>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Snooze / Reschedule
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">Waiting List</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Tasks not completed within the assigned time-slot automatically route to the Waiting List to prevent missed deadlines.
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-rose-600">{stats.waitingTasks} Overdue Tasks</span>
                  <Link to="/daily-scheduler/waiting-list" className="text-gray-400 hover:text-rose-600 font-bold">Waiting &rarr;</Link>
                </div>
              </div>

              {/* Connected Arrow to Step 4 */}
              <div className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 flex items-center">
                <div className="w-6 h-0.5 bg-emerald-500"></div>
                <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-emerald-500"></div>
              </div>
            </div>

            {/* Step 4 Node: Calendar & Performance Reports */}
            <div className="relative group">
              <div className="p-5 rounded-2xl bg-white border-2 border-emerald-500 shadow-md shadow-emerald-500/10 transition-all hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    04
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Auditing
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">Calendar & Reports</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Full monthly calendar grid view + department-wise productivity and completion rate analytical reports.
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-emerald-600">Productivity Analysis</span>
                  <Link to="/daily-scheduler/reports" className="text-gray-400 hover:text-emerald-600 font-bold">Reports &rarr;</Link>
                </div>
              </div>
            </div>
          </div>

          {/* ─── RESCHEDULING RECOVERY LOOP ─── */}
          <div className="mt-8 pt-6 border-t border-dashed border-slate-300">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    Overdue Rescheduling Loop (Zero Task Loss)
                    <span className="px-2 py-0.2 rounded-full text-[10px] bg-red-50 text-red-700 border border-red-200">
                      Auto-Escalation
                    </span>
                  </h4>
                  <p className="text-xs text-gray-500">
                    Tasks from Waiting List or Someday Backlog can be rescheduled directly into any future date slot, cycling back into active execution.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 px-3.5 py-1.5 rounded-xl border border-red-200/80">
                <span>Reschedule &rarr; Active Schedule</span>
                <CheckCircle2 className="w-4 h-4 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* ─── MOBILE VERTICAL FLOW DIAGRAM (WITH DOWN ARROWS) ─── */}
        <div className="block lg:hidden space-y-3">
          {/* Node 1 */}
          <div className="p-4 rounded-2xl bg-white border-2 border-amber-500 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="w-7 h-7 rounded-lg bg-amber-500 text-white font-black text-xs flex items-center justify-center">
                01
              </span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Step 1: Idea Backlog
              </span>
            </div>
            <h4 className="text-sm font-bold text-gray-900">Someday Tasks (someday_tasks)</h4>
            <p className="text-xs text-gray-600 mt-1">
              Future tasks without fixed dates. Stored safely until ready to be pulled into a specific work schedule.
            </p>
          </div>

          <div className="flex justify-center py-1">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>
          </div>

          {/* Node 2 */}
          <div className="p-4 rounded-2xl bg-white border-2 border-red-500 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="w-7 h-7 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center">
                02
              </span>
              <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                Step 2: Execution Slot
              </span>
            </div>
            <h4 className="text-sm font-bold text-gray-900">Scheduler Dashboard (tasks)</h4>
            <p className="text-xs text-gray-600 mt-1">
              Time-boxed slots (e.g. 10:00 - 11:30 AM). Assigned to specific staff member with priority color tag and remarks.
            </p>
          </div>

          <div className="flex justify-center py-1">
            <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>
          </div>

          {/* Node 3 */}
          <div className="p-4 rounded-2xl bg-white border-2 border-rose-500 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="w-7 h-7 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center">
                03
              </span>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                Step 3: Waiting List
              </span>
            </div>
            <h4 className="text-sm font-bold text-gray-900">Overdue Task Recovery</h4>
            <p className="text-xs text-gray-600 mt-1">
              Tasks not completed within the assigned time-slot automatically route to the Waiting List to prevent missed deadlines.
            </p>
          </div>

          <div className="flex justify-center py-1">
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>
          </div>

          {/* Node 4 */}
          <div className="p-4 rounded-2xl bg-white border-2 border-emerald-500 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                04
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Step 4: Analytics
              </span>
            </div>
            <h4 className="text-sm font-bold text-gray-900">Calendar & Performance Reports</h4>
            <p className="text-xs text-gray-600 mt-1">
              Full monthly calendar grid view + department-wise productivity and completion rate analytical reports.
            </p>
          </div>
        </div>

        {/* ─── TECHNICAL ARCHITECTURE CARDS ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Card 1 */}
          <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
              <Clock className="w-4 h-4 text-amber-600" />
              Someday Tasks Store (`someday_tasks`)
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Maintains agile backlog of untimed activities. Any task can be one-click promoted into a specific calendar date and hour.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-red-700">
              <CalendarCheck className="w-4 h-4 text-red-600" />
              Daily Timeboxing (`tasks`)
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Tracks start time, end time, assigned staff ID, attachments, and status (Pending, In Progress, Completed, Overdue).
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              <FileText className="w-4 h-4 text-emerald-600" />
              Productivity Reports & Audit
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Calculates daily on-time completion percentages, overdue resolution efficiency, and staff-by-staff workload breakdown.
            </p>
          </div>
        </div>
      </div>

      {/* ════════════ QUICK NAVIGATION STRIP ════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Link
          to="/daily-scheduler/dashboard"
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200/80 hover:border-red-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">Dashboard</p>
            <p className="text-[11px] text-gray-500 truncate">Today's Schedule</p>
          </div>
        </Link>

        <Link
          to="/daily-scheduler/waiting-list"
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200/80 hover:border-red-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
            <List className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">Waiting List</p>
            <p className="text-[11px] text-gray-500 truncate">Overdue Tasks</p>
          </div>
        </Link>

        <Link
          to="/daily-scheduler/someday"
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200/80 hover:border-red-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">Someday Tasks</p>
            <p className="text-[11px] text-gray-500 truncate">Idea Backlog</p>
          </div>
        </Link>

        <Link
          to="/daily-scheduler/calendar"
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200/80 hover:border-red-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">Calendar View</p>
            <p className="text-[11px] text-gray-500 truncate">Monthly Grid</p>
          </div>
        </Link>

        <Link
          to="/daily-scheduler/reports"
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200/80 hover:border-red-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">Reports</p>
            <p className="text-[11px] text-gray-500 truncate">Completion Audit</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
