import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import supabase from "../../SupabaseClient";
import {
  GitFork,
  Building2,
  Calendar as CalendarIcon,
  LayoutDashboard,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  Plus,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Layers,
  Sparkles,
  ChevronRight,
  Wallet,
  Banknote,
  Send,
  Users,
  ShieldCheck,
  TrendingUp,
  Receipt,
  FileCheck,
  PhoneCall,
  BadgeAlert,
  Percent,
  RotateCw,
  Eye,
  Check,
  Workflow,
  Zap,
  ArrowDownRight,
  History,
  Timer
} from "lucide-react";

export default function RentSystemFlow() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeStep, setActiveStep] = useState(null);

  const [stats, setStats] = useState({
    totalProperties: 0,
    totalMonthlyYield: 0,
    activeAgreements: 0,
    expiredAgreements: 0,
    expiringAgreements: 0,
    totalTenants: 0,
    uniqueLandlords: 0,
    currentMonthPending: 0,
    currentMonthReceived: 0,
    currentMonthDelay: 0,
    currentMonthCollectedAmount: 0,
    currentMonthPendingAmount: 0,
    recoveryRate: 0,
    totalDepositCustody: 0,
    totalTrackerCycles: 0
  });

  const currentMonth = new Date().toLocaleString("default", { month: "long" });

  const fetchRentFlowData = async () => {
    try {
      setRefreshing(true);
      const [masterRes, trackerRes] = await Promise.all([
        supabase.from("rent_master").select("*"),
        supabase.from("rent_monthly_tracker").select("*")
      ]);

      if (masterRes.error) throw masterRes.error;
      if (trackerRes.error) throw trackerRes.error;

      const master = masterRes.data || [];
      const tracker = trackerRes.data || [];

      // Calculate master stats
      const totalProps = master.length;
      let totalYield = 0;
      let totalDeposit = 0;
      const ownersSet = new Set();
      const tenantsSet = new Set();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split("T")[0];

      let activeCount = 0;
      let expiringCount = 0;
      let expiredCount = 0;

      master.forEach((m) => {
        totalYield += Number(m.monthly_rent) || 0;
        totalDeposit += Number(m.security_deposit) || 0;
        if (m.owner_name) ownersSet.add(m.owner_name.trim());
        if (m.tenant_name) tenantsSet.add(m.tenant_name.trim());

        if (m.agreement_end) {
          if (m.agreement_end < todayStr) {
            expiredCount++;
          } else {
            const end = new Date(m.agreement_end);
            if (!isNaN(end.getTime())) {
              const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
              if (diffDays >= 0 && diffDays <= 60) {
                expiringCount++;
              } else {
                activeCount++;
              }
            }
          }
        }
      });

      // Calculate current month tracker stats
      const currentMonthRecords = tracker.filter((t) => {
        const m = (t.month || "").toLowerCase();
        const cm = currentMonth.toLowerCase();
        return m === cm || m.startsWith(cm);
      });

      let pendingCount = 0;
      let receivedCount = 0;
      let delayCount = 0;
      let collectedAmt = 0;
      let pendingAmt = 0;

      currentMonthRecords.forEach((r) => {
        const rentVal = Number(r.rent) || 0;
        const status = (r.status || "").toLowerCase();
        if (status === "done" || status === "received" || status === "on time") {
          receivedCount++;
          collectedAmt += rentVal;
        } else if (status === "delay") {
          delayCount++;
          pendingAmt += rentVal;
        } else {
          pendingCount++;
          pendingAmt += rentVal;
        }
      });

      const totalTarget = collectedAmt + pendingAmt;
      const recovery = totalTarget > 0 ? Math.round((collectedAmt / totalTarget) * 100) : 0;

      setStats({
        totalProperties: totalProps,
        totalMonthlyYield: totalYield,
        activeAgreements: activeCount,
        expiredAgreements: expiredCount,
        expiringAgreements: expiringCount,
        totalTenants: tenantsSet.size,
        uniqueLandlords: ownersSet.size,
        currentMonthPending: pendingCount,
        currentMonthReceived: receivedCount,
        currentMonthDelay: delayCount,
        currentMonthCollectedAmount: collectedAmt,
        currentMonthPendingAmount: pendingAmt,
        recoveryRate: recovery,
        totalDepositCustody: totalDeposit,
        totalTrackerCycles: tracker.length
      });
    } catch (err) {
      console.error("Error fetching rent flow stats:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRentFlowData();
  }, []);

  const flowNodes = [
    {
      id: "rent-master",
      title: "Rent Master Directory",
      subtitle: "Asset profiles, tenure contracts & custody documents",
      badge: "Origin / Asset Master",
      color: "red",
      icon: Building2,
      path: "/dashboard/rent-tracker/master",
      features: [
        "Single-click Tenancy Renewal Engine with rate revision",
        "Auto-Schedule Monthly Tracker generation for remaining tenure",
        "Instant View (Eye Icon) to inspect full rental ledger & history",
        "Expired Agreement filter & direct action cards"
      ],
      stats: [
        { label: "Total Assets", value: stats.totalProperties },
        { label: "Expired Contracts", value: stats.expiredAgreements, alert: stats.expiredAgreements > 0 }
      ]
    },
    {
      id: "monthly-tracker",
      title: "Monthly Rent Tracker",
      subtitle: "Auto 1st-of-month cycles, grace windows & WhatsApp receipts",
      badge: "Execution & Receipts",
      color: "amber",
      icon: CalendarIcon,
      path: "/dashboard/rent-tracker/monthly",
      features: [
        "Zero-touch auto display on the 1st of every month",
        "Tracks due-date windows, on-time receipts & delay penalties",
        "Automated WhatsApp rent payment receipts dispatched to tenant",
        "Past expired months auto-skipped during schedule sync"
      ],
      stats: [
        { label: "Pending (This Month)", value: stats.currentMonthPending, alert: stats.currentMonthPending > 0 },
        { label: "Total Synced Cycles", value: stats.totalTrackerCycles }
      ]
    },
    {
      id: "rent-dashboard",
      title: "Rent Intelligence & Analytics",
      subtitle: "Yield graphs, defaulter tracking & landlord revenue split",
      badge: "Executive MIS",
      color: "rose",
      icon: LayoutDashboard,
      path: "/dashboard/rent-tracker/dashboard",
      features: [
        "Executive collection efficiency & recovery rate gauge",
        "Landlord portfolio split & custody deposit ledger",
        "One-click WhatsApp payment reminders to overdue tenants",
        "Active vs expiring vs expired agreement radar"
      ],
      stats: [
        { label: "Recovery Rate", value: `${stats.recoveryRate}%` },
        { label: "Monthly Portfolio", value: `₹${(stats.totalMonthlyYield / 1000).toFixed(1)}k` }
      ]
    }
  ];

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-red-500/25">
              <GitFork className="w-6 h-6 transform rotate-90" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  Rent Tracker <span className="text-red-600">System Flow</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                  Live Rent Data
                </span>
              </div>
              <p className="text-sm font-medium text-gray-500 mt-0.5">
                Complete architectural flow: Auto-generation, renewal engine, instant ledger view, and monthly settlements
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            <button
              onClick={fetchRentFlowData}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-xs active:scale-95 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-red-600" : "text-gray-500"}`} />
              <span>Refresh Stats</span>
            </button>
            <Link
              to="/dashboard/rent-tracker/dashboard"
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-600" />
              <span>Rent Dashboard</span>
            </Link>
            <Link
              to="/dashboard/rent-tracker/master"
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-md shadow-red-600/25 active:scale-95"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Rent Master</span>
            </Link>
          </div>
        </div>

        {/* Navigation Shortcut Strip for Rent Module */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-1.5 border border-gray-200/80 shadow-xs flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Link
            to="/dashboard/rent-tracker/system-flow"
            className="flex items-center gap-2 py-2 px-5 rounded-xl text-xs font-bold bg-red-600 text-white shadow-xs whitespace-nowrap"
          >
            <GitFork className="w-4 h-4 transform rotate-90" />
            <span>System Flow</span>
          </Link>
          <Link
            to="/dashboard/rent-tracker/dashboard"
            className="flex items-center gap-2 py-2 px-5 rounded-xl text-xs font-bold text-gray-600 hover:text-red-600 hover:bg-gray-100 transition-all whitespace-nowrap"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Rent Dashboard</span>
          </Link>
          <Link
            to="/dashboard/rent-tracker/master"
            className="flex items-center gap-2 py-2 px-5 rounded-xl text-xs font-bold text-gray-600 hover:text-red-600 hover:bg-gray-100 transition-all whitespace-nowrap"
          >
            <Building2 className="w-4 h-4" />
            <span>Rent Master</span>
            {stats.expiredAgreements > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-[18px] text-center" title="Expired agreements needing renewal">
                {stats.expiredAgreements}
              </span>
            )}
          </Link>
          <Link
            to="/dashboard/rent-tracker/monthly"
            className="flex items-center gap-2 py-2 px-5 rounded-xl text-xs font-bold text-gray-600 hover:text-red-600 hover:bg-gray-100 transition-all whitespace-nowrap"
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Monthly Tracker</span>
            {stats.currentMonthPending > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                {stats.currentMonthPending}
              </span>
            )}
          </Link>
        </div>

        {/* ═══════════ NEW FEATURE HIGHLIGHT TICKER ═══════════ */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-3.5 border border-red-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-red-600">Auto-Scheduler</div>
              <div className="text-xs font-extrabold text-slate-800">Auto Generate Cycles</div>
              <p className="text-[10px] text-slate-400">Skips past months, syncs future</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-amber-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <RotateCw className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-amber-600">Renewal Engine</div>
              <div className="text-xs font-extrabold text-slate-800">Agreement Renewal Modal</div>
              <p className="text-[10px] text-slate-400">Custom end date + rate hike sync</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-blue-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-blue-600">Ledger View</div>
              <div className="text-xs font-extrabold text-slate-800">Direct Eye Button</div>
              <p className="text-[10px] text-slate-400">Full tenant payment history</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-emerald-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">1st Date Auto-Show</div>
              <div className="text-xs font-extrabold text-slate-800">Monthly Tracker Live</div>
              <p className="text-[10px] text-slate-400">Zero manual monthly entry</p>
            </div>
          </div>
        </div>

        {/* ═══════════ CREATIVE ARCHITECTURE WORKFLOW DIAGRAM ═══════════ */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-sm overflow-hidden relative">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <Workflow className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">Interactive Smart Rent Process Flowchart</h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Automated data pipeline connecting Asset Masters, Intelligent Renewal Scheduling, and Executive Real-Time MIS
              </p>
            </div>

            {/* Badges / Legend */}
            <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-semibold text-gray-600">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                <span className="w-2 h-2 rounded-full bg-red-600"></span> Step 1: Onboard & Renew
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Step 2: Auto-Track & Receipts
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                <span className="w-2 h-2 rounded-full bg-rose-600"></span> Step 3: Yield & Defaulters MIS
              </span>
            </div>
          </div>

          {/* Diagram Body */}
          <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 lg:gap-2 items-stretch">
            
            {/* ═══════ STEP 1: RENT MASTER ═══════ */}
            <div className="lg:col-span-3 flex flex-col justify-between">
              <div
                onClick={() => navigate("/dashboard/rent-tracker/master")}
                className="group cursor-pointer p-5 rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white shadow-lg shadow-red-600/25 border border-red-500 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] flex flex-col justify-between h-full relative overflow-hidden"
              >
                {/* Background decorative ring */}
                <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 pointer-events-none blur-sm" />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-md tracking-wider uppercase">
                      Step 1: Onboard
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold tracking-tight">Rent Master Directory</h3>
                  <p className="text-xs text-red-100 mt-1 leading-relaxed">
                    Central property asset repository. Manages tenant KYC, agreement start/end dates, custody deposits & landlord shares.
                  </p>

                  {/* Feature badges inside node */}
                  <div className="mt-3.5 space-y-1.5 text-[11px] font-medium text-white/95">
                    <div className="flex items-center gap-1.5 bg-white/15 px-2 py-1 rounded-lg backdrop-blur-xs">
                      <RotateCw className="w-3.5 h-3.5 text-amber-300" />
                      <span><strong>Agreement Renewal:</strong> Custom end-date extension</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/15 px-2 py-1 rounded-lg backdrop-blur-xs">
                      <Eye className="w-3.5 h-3.5 text-blue-200" />
                      <span><strong>View Button:</strong> Instant full payment ledger</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/15 px-2 py-1 rounded-lg backdrop-blur-xs">
                      <CalendarIcon className="w-3.5 h-3.5 text-emerald-300" />
                      <span><strong>1-Click Schedule:</strong> Sync active months to tracker</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-semibold">
                  <span>{stats.totalProperties} Active Units</span>
                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Open Master <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>

            {/* ═══════ CONNECTOR 1: AUTO-GENERATION ENGINE ═══════ */}
            <div className="hidden lg:flex lg:col-span-1 flex-col items-center justify-center gap-2 text-center px-1">
              <div className="w-full flex items-center justify-center">
                <div className="h-0.5 w-full bg-gradient-to-r from-red-500 to-amber-500 relative">
                  <span className="absolute -top-1 right-0 w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                </div>
              </div>
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200/80 shadow-2xs">
                <Zap className="w-4 h-4 text-amber-600 mx-auto mb-0.5 animate-bounce" />
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 block">
                  Auto-Gen
                </span>
                <span className="text-[8px] text-slate-500 leading-tight block">
                  Only Active Months
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-amber-500 animate-pulse" />
            </div>

            {/* ═══════ STEP 2: MONTHLY TRACKER ═══════ */}
            <div className="lg:col-span-3 flex flex-col justify-between">
              <div
                onClick={() => navigate("/dashboard/rent-tracker/monthly")}
                className="group cursor-pointer p-5 rounded-2xl bg-white border-2 border-amber-300 hover:border-amber-500 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-full relative"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-2xs">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${stats.currentMonthPending > 0 ? "bg-amber-100 text-amber-800 animate-pulse" : "bg-emerald-100 text-emerald-800"}`}>
                      Step 2: Collect & Settle
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-gray-900 group-hover:text-amber-700 transition-colors">
                    Monthly Rent Tracker
                  </h3>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Monthly cycle ledger. Records cash/bank receipts, tracks grace due dates, logs delays & generates automatic WhatsApp payment receipts.
                  </p>

                  {/* Feature badges inside node */}
                  <div className="mt-3.5 space-y-1.5 text-[11px] font-medium text-slate-700">
                    <div className="flex items-center gap-1.5 bg-amber-50/70 border border-amber-200/60 px-2 py-1 rounded-lg">
                      <Timer className="w-3.5 h-3.5 text-amber-600" />
                      <span><strong>1st Date Auto-Show:</strong> Default current month view</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-50/70 border border-amber-200/60 px-2 py-1 rounded-lg">
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                      <span><strong>Instant WhatsApp:</strong> Payment receipts to tenant</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-50/70 border border-amber-200/60 px-2 py-1 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-rose-600" />
                      <span><strong>Delay Tracker:</strong> Auto calculates overdue days</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-700">
                  <span className="text-amber-700">{stats.currentMonthPending} Pending for {currentMonth}</span>
                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-amber-600">
                    Open Tracker <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>

            {/* ═══════ CONNECTOR 2: AGGREGATION PIPELINE ═══════ */}
            <div className="hidden lg:flex lg:col-span-1 flex-col items-center justify-center gap-2 text-center px-1">
              <div className="w-full flex items-center justify-center">
                <div className="h-0.5 w-full bg-gradient-to-r from-amber-500 to-rose-500 relative">
                  <span className="absolute -top-1 right-0 w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                </div>
              </div>
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-200/80 shadow-2xs">
                <TrendingUp className="w-4 h-4 text-rose-600 mx-auto mb-0.5" />
                <span className="text-[9px] font-black uppercase tracking-wider text-rose-700 block">
                  Real-Time
                </span>
                <span className="text-[8px] text-slate-500 leading-tight block">
                  Yield & Defaulters
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-rose-500 animate-pulse" />
            </div>

            {/* ═══════ STEP 3: EXECUTIVE ANALYTICS ═══════ */}
            <div className="lg:col-span-3 flex flex-col justify-between">
              <div
                onClick={() => navigate("/dashboard/rent-tracker/dashboard")}
                className="group cursor-pointer p-5 rounded-2xl bg-gradient-to-br from-red-50/70 via-white to-white border-2 border-red-200 hover:border-red-500 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-full relative"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-200">
                      <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                      Step 3: Executive MIS
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-gray-900 group-hover:text-red-700 transition-colors">
                    Rent Intelligence & MIS
                  </h3>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Consolidated executive decision dashboards. Real-time recovery rates, revenue shares, expiring contracts & WhatsApp defaulter nudges.
                  </p>

                  {/* Feature badges inside node */}
                  <div className="mt-3.5 space-y-1.5 text-[11px] font-medium text-slate-700">
                    <div className="flex items-center gap-1.5 bg-red-50/70 border border-red-200/60 px-2 py-1 rounded-lg">
                      <Percent className="w-3.5 h-3.5 text-red-600" />
                      <span><strong>Recovery Meter:</strong> Live {stats.recoveryRate}% collection rate</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-red-50/70 border border-red-200/60 px-2 py-1 rounded-lg">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span><strong>Landlord Split:</strong> Revenue breakdown by owner</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-red-50/70 border border-red-200/60 px-2 py-1 rounded-lg">
                      <BadgeAlert className="w-3.5 h-3.5 text-amber-600" />
                      <span><strong>Expiry Watch:</strong> {stats.expiringAgreements} contracts due in 60 days</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-700">
                  <span className="text-red-600 font-bold">{stats.recoveryRate}% Recovery Rate</span>
                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-red-600">
                    Open Dashboard <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Feedback Loop */}
          <div className="mt-6 pt-4 border-t border-dashed border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-amber-500 animate-spin-reverse" />
              <span><strong>Continuous Lifecycle Loop:</strong> When contract approaches expiry, trigger <strong>Renew</strong> in Rent Master to extend tenure & auto-generate new cycles seamlessly.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px]">Active Loop</span>
            </div>
          </div>

        </div>

        {/* ═══════════ DEEP DIVE FEATURE CAPABILITIES ═══════════ */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Module Capabilities & Feature Matrix</h2>
            <p className="text-xs text-gray-500">How each component interacts with recent updates and live database records</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {flowNodes.map((node) => {
              const Icon = node.icon;
              return (
                <div
                  key={node.id}
                  onClick={() => navigate(node.path)}
                  className="group relative flex flex-col p-5 bg-white border border-slate-200 rounded-2xl shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer text-left overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shadow-xs">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                          {node.title}
                        </h3>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-slate-50 text-slate-700 border-slate-200">
                          {node.badge}
                        </span>
                      </div>
                    </div>
                    <div className="p-1 rounded-lg text-gray-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                    {node.subtitle}
                  </p>

                  {/* Bullet features */}
                  <div className="space-y-1.5 mb-4">
                    {node.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-gray-100">
                    {node.stats.map((st, idx) => (
                      <div key={idx} className="bg-slate-50/80 border border-slate-150 rounded-xl p-2.5">
                        <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                          {st.label}
                        </span>
                        <span className={`text-sm font-extrabold ${st.alert ? "text-amber-600" : "text-gray-900"}`}>
                          {loading ? "..." : st.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-2 flex items-center justify-between text-xs font-semibold text-gray-500 group-hover:text-gray-900 transition-colors">
                    <span className="text-[11px] font-medium text-gray-400">Click to open module</span>
                    <span className="flex items-center gap-1 font-bold text-red-600 group-hover:translate-x-1 transition-transform">
                      Go to page <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════ COMPLETE RENT LIFECYCLE BLUEPRINT (SOP) ═══════════ */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <Sparkles className="w-5 h-5 text-red-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Standard Operating Rent Cycle (SOP)</h2>
              <p className="text-xs text-gray-500">Step-by-step lifecycle from asset onboarding, auto-scheduling to renewal</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="p-4 rounded-2xl bg-red-50/40 border border-red-200/80 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  1
                </span>
                <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Onboard & Save</span>
              </div>
              <h4 className="text-sm font-bold text-gray-900">Property & Contract Setup</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Save property profile with monthly rent, deposit, start/end dates. System calculates remaining tenure and generates future monthly tracker entries.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-amber-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  2
                </span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Auto 1st Date</span>
              </div>
              <h4 className="text-sm font-bold text-gray-900">Monthly Cycle Activation</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                On the 1st of every month, Monthly Tracker automatically pulls and displays pending dues with due-date windows without any manual data entry.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  3
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">WhatsApp Receipt</span>
              </div>
              <h4 className="text-sm font-bold text-gray-900">Settlement & Instant Receipt</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Log cash/bank payment. System marks "On Time" or "Delay" based on agreed window and instantly dispatches branded WhatsApp receipt to tenant.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200/80 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  4
                </span>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">Renew or Re-lease</span>
              </div>
              <h4 className="text-sm font-bold text-gray-900">Agreement Renewal & Sync</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Track expiring/expired units on Rent Master. Open 1-click Renewal Modal, set new expiration date & optional rent hike to extend schedule effortlessly.
              </p>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}

