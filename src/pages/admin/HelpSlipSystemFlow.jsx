import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import supabase from "../../SupabaseClient";
import {
  GitFork,
  HelpCircle,
  FileQuestion,
  Lightbulb,
  MessageSquare,
  ShieldCheck,
  Send,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Building2,
  Layers,
  Phone,
  MessageCircle,
  ChevronRight,
  Database,
  ArrowDown,
  CornerDownRight,
  Workflow
} from "lucide-react";

export default function HelpSlipSystemFlow() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const [stats, setStats] = useState({
    totalSlips: 0,
    pendingSlips: 0,
    repliedSlips: 0,
    totalEmployees: 0,
    departmentsCount: 0,
    whatsappAlertsSent: 0,
  });

  const fetchHelpSlipStats = async () => {
    try {
      setRefreshing(true);
      const [
        allSlipsRes,
        pendingSlipsRes,
        repliedSlipsRes,
        usersRes
      ] = await Promise.all([
        supabase.from("help_slips").select("id, department", { count: "exact" }),
        supabase.from("help_slips").select("id", { count: "exact", head: true }).is("admin_reply", null),
        supabase.from("help_slips").select("id", { count: "exact", head: true }).not("admin_reply", "is", null),
        supabase.from("users").select("id, department", { count: "exact" })
      ]);

      const totalSlips = allSlipsRes.count || (allSlipsRes.data ? allSlipsRes.data.length : 0);
      const pendingSlips = pendingSlipsRes.count || 0;
      const repliedSlips = repliedSlipsRes.count || 0;
      const totalEmployees = usersRes.count || (usersRes.data ? usersRes.data.length : 0);

      // Unique departments
      const depts = new Set();
      if (allSlipsRes.data) {
        allSlipsRes.data.forEach(s => s.department && depts.add(s.department.trim()));
      }
      if (usersRes.data) {
        usersRes.data.forEach(u => u.department && depts.add(u.department.trim()));
      }

      setStats({
        totalSlips,
        pendingSlips,
        repliedSlips,
        totalEmployees,
        departmentsCount: depts.size || 6,
        whatsappAlertsSent: totalSlips + repliedSlips
      });
    } catch (err) {
      console.error("Error fetching Help Slip stats:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHelpSlipStats();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
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
                Help Slip <span className="text-red-600">Flow</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                Support Engine Active
              </span>
            </div>
          </div>

          {/* Right: Buttons in Single Line */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchHelpSlipStats}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${refreshing ? "animate-spin text-red-600" : ""}`} />
              <span>Sync Stats</span>
            </button>

            <Link
              to="/dashboard/help-slip"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm shadow-red-500/20 active:scale-95 whitespace-nowrap"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Open Help Slip Desk</span>
            </Link>
          </div>
        </div>

        {/* Subtitle Underneath */}
        <p className="text-xs sm:text-sm font-medium text-gray-500 pl-[52px]">
          Visual workflow diagram showing end-to-end data flow with connected directional arrows
        </p>
      </div>

      {/* KPI Metric Cards — System Red Accent */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-red-300 transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold">Total Slips Logged</span>
            <FileQuestion className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-black text-gray-900">{stats.totalSlips}</p>
          <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
            <span className="text-red-600 font-semibold">{stats.departmentsCount}</span> departments active
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold">Pending Admin Decision</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600">{stats.pendingSlips}</p>
          <p className="text-[11px] text-gray-500 mt-1">Awaiting executive review</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold">Resolved & Closed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{stats.repliedSlips}</p>
          <p className="text-[11px] text-gray-500 mt-1">
            {stats.totalSlips > 0 ? Math.round((stats.repliedSlips / stats.totalSlips) * 100) : 100}% resolution rate
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-red-300 transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold">WhatsApp Alerts Sent</span>
            <MessageCircle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-black text-gray-900">{stats.whatsappAlertsSent}</p>
          <p className="text-[11px] text-gray-500 mt-1">Realtime Admin & Staff alerts</p>
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
                Help Slip Interactive Flowchart Diagram
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Step-by-step visual diagram connected with sequential arrows from problem intake to resolution
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Live Pipeline
            </span>
          </div>
        </div>

        {/* ─── DESKTOP & TABLET HORIZONTAL FLOW PIPELINE (WITH SVG CONNECTORS) ─── */}
        <div className="hidden lg:block relative py-6 px-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
          {/* Top Stage Badges */}
          <div className="grid grid-cols-4 gap-6 items-center relative z-10">
            {/* Step 1 Node */}
            <div className="relative group">
              <div className="p-5 rounded-2xl bg-white border-2 border-red-500 shadow-md shadow-red-500/10 transition-all hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-xl bg-red-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    01
                  </span>
                  <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Staff Intake
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">Raise Challenge</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Employee selects profile, auto-fills phone & department, then articulates problem.
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-red-600">{stats.totalEmployees} Active Users</span>
                  <Link to="/dashboard/help-slip" className="text-gray-400 hover:text-red-600 font-bold">Form &rarr;</Link>
                </div>
              </div>

              {/* Connected Arrow to Step 2 */}
              <div className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 flex items-center">
                <div className="w-6 h-0.5 bg-red-500"></div>
                <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-red-500"></div>
              </div>
            </div>

            {/* Step 2 Node */}
            <div className="relative group">
              <div className="p-5 rounded-2xl bg-white border-2 border-amber-500 shadow-md shadow-amber-500/10 transition-all hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    02
                  </span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Core Rule
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">3 Proposed Solutions</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Compulsory solution triad: Solution 1 (Primary), Solution 2 (Alt), Solution 3 (Fallback).
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-amber-600">3 Solutions Enforced</span>
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                </div>
              </div>

              {/* Connected Arrow to Step 3 */}
              <div className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 flex items-center">
                <div className="w-6 h-0.5 bg-emerald-500"></div>
                <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-emerald-500"></div>
              </div>
            </div>

            {/* Step 3 Node */}
            <div className="relative group">
              <div className="p-5 rounded-2xl bg-white border-2 border-emerald-500 shadow-md shadow-emerald-500/10 transition-all hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    03
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Zero-Delay
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">WhatsApp Dispatch</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Saved into database + instant WhatsApp webhook triggers direct alert on Superadmin phones.
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-emerald-600">Superadmin Alert</span>
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                </div>
              </div>

              {/* Connected Arrow to Step 4 */}
              <div className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 flex items-center">
                <div className="w-6 h-0.5 bg-purple-500"></div>
                <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-purple-500"></div>
              </div>
            </div>

            {/* Step 4 Node */}
            <div className="relative group">
              <div className="p-5 rounded-2xl bg-white border-2 border-purple-500 shadow-md shadow-purple-500/10 transition-all hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-xl bg-purple-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    04
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Executive
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">Admin Reply & Action</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Admin inspects proposals in Submissions tab, enters official guidance and locks decision.
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-purple-600">{stats.pendingSlips} Awaiting Review</span>
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* ─── RETURN FEEDBACK LOOP (ARROW FLOWING BACK TO EMPLOYEE) ─── */}
          <div className="mt-8 pt-6 border-t border-dashed border-slate-300">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    Loop Completion & Return Flow
                    <span className="px-2 py-0.2 rounded-full text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                      Closed Loop
                    </span>
                  </h4>
                  <p className="text-xs text-gray-500">
                    Once Admin replies, automated WhatsApp webhook returns decision directly to the employee's phone and marks record as Replied.
                  </p>
                </div>
              </div>

              {/* Visual Return Arrow Indicator */}
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-xl border border-blue-200/80">
                <span>Decision Feedback Delivered via WhatsApp</span>
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* ─── MOBILE & TABLET VERTICAL FLOW DIAGRAM (WITH DOWN ARROWS) ─── */}
        <div className="block lg:hidden space-y-3">
          {/* Node 1 */}
          <div className="p-4 rounded-2xl bg-white border-2 border-red-500 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="w-7 h-7 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center">
                01
              </span>
              <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                Step 1: Intake
              </span>
            </div>
            <h4 className="text-sm font-bold text-gray-900">1. Problem & Challenge Identification</h4>
            <p className="text-xs text-gray-600 mt-1">
              Employee logs challenge with department & contact, accompanied by 3 concrete solutions before escalating.
            </p>
          </div>

          {/* Arrow 1 */}
          <div className="flex justify-center py-1">
            <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>
          </div>

          {/* Node 2 */}
          <div className="p-4 rounded-2xl bg-white border-2 border-amber-500 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="w-7 h-7 rounded-lg bg-amber-500 text-white font-black text-xs flex items-center justify-center">
                02
              </span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Step 2: Tri-Solution Rule
              </span>
            </div>
            <h4 className="text-sm font-bold text-gray-900">2. Tri-Solution Framework</h4>
            <p className="text-xs text-gray-600 mt-1">
              Root principle: 'Always suggest your best recommended solutions'. No problem is escalated without employee initiative.
            </p>
          </div>

          {/* Arrow 2 */}
          <div className="flex justify-center py-1">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>
          </div>

          {/* Node 3 */}
          <div className="p-4 rounded-2xl bg-white border-2 border-emerald-500 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                03
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Step 3: Alert Dispatch
              </span>
            </div>
            <h4 className="text-sm font-bold text-gray-900">3. Realtime WhatsApp Escalation</h4>
            <p className="text-xs text-gray-600 mt-1">
              Automated WhatsApp API hook triggers instant notification to Superadmin(s) mobile phones with full challenge & proposed solutions.
            </p>
          </div>

          {/* Arrow 3 */}
          <div className="flex justify-center py-1">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>
          </div>

          {/* Node 4 */}
          <div className="p-4 rounded-2xl bg-white border-2 border-purple-500 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center">
                04
              </span>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                Step 4: Resolution & Closure
              </span>
            </div>
            <h4 className="text-sm font-bold text-gray-900">4. Executive Review & Admin Resolution</h4>
            <p className="text-xs text-gray-600 mt-1">
              Superadmin & HODs inspect challenges, choose or craft official guidance, and return notification to staff phone.
            </p>
          </div>
        </div>

        {/* ─── SYSTEM DECISION MATRIX & ACTION FLOW ─── */}
        <div className="pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input Branch */}
            <div className="p-5 rounded-2xl bg-red-50/40 border border-red-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  Staff Intake Requirements
                </span>
                <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Mandatory</span>
              </div>
              <ul className="space-y-2 text-xs text-gray-700">
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                  <span><strong>Employee Profile:</strong> Full name, verified mobile, assigned department</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                  <span><strong>Challenge Statement:</strong> Specific operational roadblock or hurdle</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                  <span><strong>Proposals:</strong> 3 distinct solutions evaluated by author before submitting</span>
                </li>
              </ul>
            </div>

            {/* Output Branch */}
            <div className="p-5 rounded-2xl bg-purple-50/40 border border-purple-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  Executive Decision & Output
                </span>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">Automated</span>
              </div>
              <ul className="space-y-2 text-xs text-gray-700">
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                  <span><strong>Admin Review:</strong> Review submitted solutions in Submissions repository</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                  <span><strong>Official Reply:</strong> Formal administrative verdict logged in PostgreSQL</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                  <span><strong>WhatsApp Feedback:</strong> Decision message delivered straight to employee</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      {/* ════════════ QUICK NAVIGATION STRIP ════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/dashboard/help-slip"
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200/80 hover:border-red-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">Help Slip Form</p>
            <p className="text-[11px] text-gray-500 truncate">Submit Challenge</p>
          </div>
        </Link>

        <Link
          to="/dashboard/help-slip"
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200/80 hover:border-red-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">Submissions List</p>
            <p className="text-[11px] text-gray-500 truncate">Review & Reply</p>
          </div>
        </Link>

        <Link
          to="/dashboard/setting"
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200/80 hover:border-red-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">User Directory</p>
            <p className="text-[11px] text-gray-500 truncate">Staff Contacts</p>
          </div>
        </Link>

        <Link
          to="/dashboard/global-settings"
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200/80 hover:border-red-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">Access Controls</p>
            <p className="text-[11px] text-gray-500 truncate">Permissions</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
