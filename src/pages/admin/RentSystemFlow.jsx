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
  Percent
} from "lucide-react";

export default function RentSystemFlow() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const [stats, setStats] = useState({
    totalProperties: 0,
    totalMonthlyYield: 0,
    activeAgreements: 0,
    expiringAgreements: 0,
    totalTenants: 0,
    uniqueLandlords: 0,
    currentMonthPending: 0,
    currentMonthReceived: 0,
    currentMonthDelay: 0,
    currentMonthCollectedAmount: 0,
    currentMonthPendingAmount: 0,
    recoveryRate: 0,
    totalDepositCustody: 0
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

      let activeCount = 0;
      let expiringCount = 0;

      master.forEach((m) => {
        totalYield += Number(m.monthly_rent) || 0;
        totalDeposit += Number(m.security_deposit) || 0;
        if (m.owner_name) ownersSet.add(m.owner_name.trim());
        if (m.tenant_name) tenantsSet.add(m.tenant_name.trim());

        if (m.agreement_end) {
          const end = new Date(m.agreement_end);
          if (!isNaN(end.getTime())) {
            const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 60) {
              expiringCount++;
            } else if (diffDays > 60) {
              activeCount++;
            }
          }
        }
      });

      // Calculate current month tracker stats
      const currentMonthRecords = tracker.filter((t) => (t.month || "").toLowerCase() === currentMonth.toLowerCase());
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
        expiringAgreements: expiringCount,
        totalTenants: tenantsSet.size,
        uniqueLandlords: ownersSet.size,
        currentMonthPending: pendingCount,
        currentMonthReceived: receivedCount,
        currentMonthDelay: delayCount,
        currentMonthCollectedAmount: collectedAmt,
        currentMonthPendingAmount: pendingAmt,
        recoveryRate: recovery,
        totalDepositCustody: totalDeposit
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
      subtitle: "Property asset profiles, tenant KYC & custody",
      category: "core",
      badge: "Origin / Asset Master",
      color: "red",
      icon: Building2,
      path: "/dashboard/rent-tracker/master",
      stats: [
        { label: "Total Assets", value: stats.totalProperties },
        { label: "Monthly Yield", value: `₹${(stats.totalMonthlyYield / 1000).toFixed(1)}k` }
      ],
      description: "Foundational master directory. Register land/building assets, tenant agreements, payment cycle dates & security deposit custody.",
      outputs: ["monthly-tracker", "rent-dashboard"]
    },
    {
      id: "monthly-tracker",
      title: "Monthly Rent Tracker",
      subtitle: "Billing cycles, grace tracking & WhatsApp receipts",
      category: "execution",
      badge: "Collection Operations",
      color: "amber",
      icon: CalendarIcon,
      path: "/dashboard/rent-tracker/monthly",
      stats: [
        { label: "Pending (This Month)", value: stats.currentMonthPending, alert: stats.currentMonthPending > 0 },
        { label: "Received", value: stats.currentMonthReceived }
      ],
      description: "Tracks active monthly rent dues against due dates, marks cash/bank settlements, logs delays, and dispatches automated WhatsApp rent receipts.",
      outputs: ["rent-dashboard"]
    },
    {
      id: "rent-dashboard",
      title: "Rent Intelligence & Analytics",
      subtitle: "Yield graphs, defaulters list & landlord shares",
      category: "reporting",
      badge: "Decision Analytics",
      color: "rose",
      icon: LayoutDashboard,
      path: "/dashboard/rent-tracker/dashboard",
      stats: [
        { label: "Recovery Rate", value: `${stats.recoveryRate}%` },
        { label: "Custody Deposit", value: `₹${(stats.totalDepositCustody / 1000).toFixed(1)}k` }
      ],
      description: "Real-time rental intelligence. Visualizes recovery KPIs, revenue shares per landlord, upcoming contract expiries & sends one-click WhatsApp reminders.",
      outputs: []
    }
  ];

  const getColorClasses = (color) => {
    switch (color) {
      case "red":
        return {
          border: "border-red-200 hover:border-red-400",
          bg: "bg-red-500/10",
          cardBg: "from-red-50/60 via-white to-white",
          text: "text-red-700",
          badge: "bg-red-50 text-red-700 border-red-200",
          ring: "focus:ring-red-400",
          iconBg: "bg-gradient-to-tr from-red-600 to-rose-600 text-white shadow-red-200"
        };
      case "amber":
        return {
          border: "border-amber-200 hover:border-amber-400",
          bg: "bg-amber-500/10",
          cardBg: "from-amber-50/60 via-white to-white",
          text: "text-amber-700",
          badge: "bg-amber-50 text-amber-800 border-amber-200",
          ring: "focus:ring-amber-400",
          iconBg: "bg-amber-600 text-white shadow-amber-200"
        };
      case "rose":
        return {
          border: "border-rose-200 hover:border-rose-400",
          bg: "bg-rose-500/10",
          cardBg: "from-rose-50/60 via-white to-white",
          text: "text-rose-700",
          badge: "bg-rose-50 text-rose-700 border-rose-200",
          ring: "focus:ring-rose-400",
          iconBg: "bg-rose-600 text-white shadow-rose-200"
        };
      default:
        return {
          border: "border-gray-200 hover:border-red-400",
          bg: "bg-red-500/10",
          cardBg: "from-gray-50 via-white to-white",
          text: "text-gray-800",
          badge: "bg-gray-100 text-gray-700 border-gray-200",
          ring: "focus:ring-red-400",
          iconBg: "bg-red-600 text-white shadow-red-200"
        };
    }
  };

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
                How properties, monthly billing cycles, settlements, and performance reports connect — click any box to open that page
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            <button
              onClick={fetchRentFlowData}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-red-600" : "text-gray-500"}`} />
              <span>Refresh Stats</span>
            </button>
            <Link
              to="/dashboard/rent-tracker/dashboard"
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
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
        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-1.5 border border-gray-200/80 shadow-xs flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Link
            to="/dashboard/rent-tracker/system-flow"
            className="flex items-center gap-2 py-2 px-5 rounded-xl text-xs font-bold bg-red-600 text-white shadow-sm whitespace-nowrap"
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

        {/* ═══════════ INTERACTIVE MODULE MAP (WORKFLOW DIAGRAM) ═══════════ */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-sm overflow-hidden relative">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">Interactive Rent Process Architecture</h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">End-to-end data flow: From Property Onboarding to Monthly Settlements and Executive Analytics</p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span> 1. Asset & Tenant Master
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> 2. Monthly Collection Tracker
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> 3. Yield & Intelligence Dashboard
              </span>
            </div>
          </div>

          {/* Diagram Cards & Connectors */}
          <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 lg:gap-2 items-center">
            
            {/* Step 1: Rent Master (Origin) */}
            <div className="lg:col-span-3">
              <div
                onClick={() => navigate("/dashboard/rent-tracker/master")}
                className="group cursor-pointer p-5 rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white shadow-lg shadow-red-600/25 border border-red-500 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] relative"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-md tracking-wider uppercase">
                    Step 1: Onboard
                  </span>
                </div>
                <h3 className="text-lg font-extrabold tracking-tight">Rent Master</h3>
                <p className="text-xs text-red-100 mt-1 leading-relaxed">
                  Single source of truth. Manage properties, tenants, landlord revenue split, agreement contracts, deposit custody & due date windows.
                </p>
                <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-semibold">
                  <span>{stats.totalProperties} Total Assets</span>
                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>

            {/* Connector Arrow 1 */}
            <div className="hidden lg:flex lg:col-span-1 items-center justify-center text-gray-300">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Generates</span>
                <ArrowRight className="w-6 h-6 text-red-500 animate-pulse" />
              </div>
            </div>

            {/* Step 2: Monthly Tracker */}
            <div className="lg:col-span-3">
              <div
                onClick={() => navigate("/dashboard/rent-tracker/monthly")}
                className="group cursor-pointer p-5 rounded-2xl bg-white border-2 border-amber-300 hover:border-amber-500 shadow-sm hover:shadow-lg transition-all duration-300 relative"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stats.currentMonthPending > 0 ? "bg-amber-100 text-amber-800 animate-pulse" : "bg-emerald-100 text-emerald-800"}`}>
                    Step 2: Collect & Settle
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-gray-900 group-hover:text-amber-700 transition-colors">
                  Monthly Tracker
                </h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Tracks each month's rent. Record received amounts, payment modes (Cash/Bank), calculate delay days, and send automated WhatsApp payment receipts.
                </p>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-700">
                  <span className="text-amber-700">{stats.currentMonthPending} Pending for {currentMonth}</span>
                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-amber-600">
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>

            {/* Connector Arrow 2 */}
            <div className="hidden lg:flex lg:col-span-1 items-center justify-center text-gray-300">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aggregates</span>
                <ArrowRight className="w-6 h-6 text-rose-500 animate-pulse" />
              </div>
            </div>

            {/* Step 3: Executive Analytics Dashboard */}
            <div className="lg:col-span-3">
              <div
                onClick={() => navigate("/dashboard/rent-tracker/dashboard")}
                className="group cursor-pointer p-5 rounded-2xl bg-gradient-to-br from-red-50/70 via-white to-white border-2 border-red-200 hover:border-red-500 shadow-sm hover:shadow-lg transition-all duration-300 relative"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-200">
                    <LayoutDashboard className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                    Step 3: Executive MIS
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-gray-900 group-hover:text-red-700 transition-colors">
                  Rent Dashboard
                </h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Consolidated KPIs: Monthly rental yield, on-time vs delayed metrics, landlord revenue share breakdown, and agreement expiry alerts.
                </p>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-700">
                  <span className="text-red-600">{stats.recoveryRate}% Recovery Rate</span>
                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-red-600">
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ═══════════ DETAILED MODULE CARDS ═══════════ */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Module Deep-Dive Cards</h2>
            <p className="text-xs text-gray-500">Live indicators, configuration capabilities, and operational flows</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {flowNodes.map((node) => {
              const styles = getColorClasses(node.color);
              const Icon = node.icon;
              return (
                <div
                  key={node.id}
                  onClick={() => navigate(node.path)}
                  className={`
                    group relative flex flex-col p-5 bg-gradient-to-b ${styles.cardBg}
                    border ${styles.border} rounded-2xl shadow-xs hover:shadow-lg hover:-translate-y-0.5
                    transition-all duration-300 cursor-pointer text-left
                  `}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${styles.iconBg} flex items-center justify-center shadow-md`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                          {node.title}
                        </h3>
                        <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles.badge}`}>
                          {node.badge}
                        </span>
                      </div>
                    </div>
                    <div className="p-1 rounded-lg text-gray-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                    {node.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-gray-100">
                    {node.stats.map((st, idx) => (
                      <div key={idx} className="bg-white/90 border border-gray-100 rounded-xl p-2.5 shadow-2xs">
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
                    <span className="text-[11px] font-medium text-gray-400">Click to navigate</span>
                    <span className="flex items-center gap-1 font-bold text-red-600 group-hover:translate-x-1 transition-transform">
                      Go to page <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════ COMPLETE RENT LIFECYCLE BLUEPRINT ═══════════ */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <Sparkles className="w-5 h-5 text-red-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Standard Operating Rent Cycle (SOP)</h2>
              <p className="text-xs text-gray-500">Step-by-step lifecycle from asset onboarding to monthly reconciliation</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="p-4 rounded-2xl bg-red-50/40 border border-red-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  1
                </span>
                <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Agreement</span>
              </div>
              <h4 className="text-sm font-bold text-gray-900">Asset & Tenant Setup</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Property registered in Rent Master with monthly rent amount, security deposit, billing cycle window, landlord ownership, and agreement PDF custody.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-amber-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  2
                </span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Billing</span>
              </div>
              <h4 className="text-sm font-bold text-gray-900">Monthly Due Invoicing</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Monthly records generated based on agreed payment window (e.g. 1st to 10th of every month). WhatsApp reminder sent to tenant ahead of due date.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  3
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Collection</span>
              </div>
              <h4 className="text-sm font-bold text-gray-900">Receive & WhatsApp Receipt</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Cash/Bank transfer logged in Monthly Tracker. System marks transaction as "On Time" or "Delay" and dispatches instant WhatsApp confirmation receipt.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  4
                </span>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">Analysis</span>
              </div>
              <h4 className="text-sm font-bold text-gray-900">Analytics & Renewals</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Rent Dashboard visualizes total portfolio yield, landlord revenue splits, defaulter list, and contract renewals expiring within 60 days.
              </p>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
