import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import supabase from "../../SupabaseClient";
import {
  GitFork,
  Truck,
  LayoutDashboard,
  Banknote,
  Shield,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowDown,
  RefreshCw,
  Workflow,
  Fuel,
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
  ChevronRight,
  Gauge,
  Wallet
} from "lucide-react";

export default function TransportSystemFlow() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    totalTrucks: 0,
    activeTrucks: 0,
    totalTrips: 0,
    totalFreight: 0,
    totalDieselCost: 0,
    activeFastags: 0,
    lowBalanceFastags: 0,
    pendingChallans: 0,
    pendingChallanAmount: 0,
  });

  const fetchTransportStats = async () => {
    try {
      setRefreshing(true);
      const [
        trucksRes,
        reportsRes,
        fastagsRes,
        challansRes
      ] = await Promise.all([
        supabase.from("trucks").select("id, status"),
        supabase.from("truck_reports").select("id, diesel_amt, grand_total, net_freight"),
        supabase.from("fastags").select("id, balance, min_bal, status"),
        supabase.from("challans").select("id, amount, status")
      ]);

      const trucks = trucksRes.data || [];
      const reports = reportsRes.data || [];
      const fastags = fastagsRes.data || [];
      const challans = challansRes.data || [];

      const activeTrucks = trucks.filter(t => !t.status || t.status.toLowerCase() === "active").length;

      const totalFreight = reports.reduce((sum, r) => sum + (Number(r.grand_total || r.net_freight) || 0), 0);
      const totalDieselCost = reports.reduce((sum, r) => sum + (Number(r.diesel_amt) || 0), 0);

      const activeFastags = fastags.filter(f => !f.status || f.status.toUpperCase() === "ACTIVE").length;
      const lowBalanceFastags = fastags.filter(f => (Number(f.balance) || 0) < (Number(f.min_bal) || 0)).length;

      const pendingChallansList = challans.filter(c => c.status && c.status.toUpperCase() === "PENDING");
      const pendingChallanAmount = pendingChallansList.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

      setStats({
        totalTrucks: trucks.length,
        activeTrucks: activeTrucks || trucks.length,
        totalTrips: reports.length,
        totalFreight,
        totalDieselCost,
        activeFastags,
        lowBalanceFastags,
        pendingChallans: pendingChallansList.length,
        pendingChallanAmount,
      });
    } catch (err) {
      console.error("Error fetching transport stats:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransportStats();
  }, []);

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amt || 0);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full space-y-6">
      {/* Top Header Section — System Red Theme with Single Line Heading & Buttons */}
      <div className="pb-4 border-b border-gray-200 space-y-1">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Icon + Heading + Badge in Single Line */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-md shadow-red-500/25 shrink-0">
              <GitFork className="w-5 h-5 transform rotate-90" />
            </div>
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight whitespace-nowrap">
                Transport Reporting <span className="text-red-600">Flow</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                Fleet Operations Active
              </span>
            </div>
          </div>

          {/* Right: Buttons in Single Line */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchTransportStats}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${refreshing ? "animate-spin text-red-600" : ""}`} />
              <span>Sync Fleet</span>
            </button>

            <Link
              to="/transport-system/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm shadow-red-500/20 active:scale-95 whitespace-nowrap"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Open Fleet Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Subtitle Underneath */}
        <p className="text-xs sm:text-sm font-medium text-gray-500 pl-[52px]">
          End-to-end fleet operational pipeline from truck onboarding, Fastag & Challan compliance, to trip dispatch and freight reconciliation
        </p>
      </div>

      {/* KPI Metric Cards — System Red Accent */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-red-300 transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold">Total Fleet Vehicles</span>
            <Truck className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-black text-gray-900">{stats.totalTrucks}</p>
          <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-600 font-semibold">{stats.activeTrucks} active</span> in transport operations
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold">Dispatched Trips</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{stats.totalTrips}</p>
          <p className="text-[11px] text-gray-500 mt-1">Logged in Truck Reports</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold">Fastag Compliance</span>
            <Banknote className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600">{stats.activeFastags}</p>
          <p className="text-[11px] text-gray-500 mt-1">
            <span className="text-red-600 font-semibold">{stats.lowBalanceFastags} low balance</span> warnings
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-red-300 transition-all">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold">Pending Traffic Challans</span>
            <Shield className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-black text-red-600">{stats.pendingChallans}</p>
          <p className="text-[11px] text-gray-500 mt-1">
            {formatCurrency(stats.pendingChallanAmount)} fine pending
          </p>
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
                Transport & Logistics Master Flowchart Diagram
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Directional workflow linking fleet vehicle registration, Fastag tolls, Challan audits, trip logs, and final financial reports
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
              <span className="w-2 h-2 rounded-full bg-red-600"></span>
              Fleet Pipeline
            </span>
          </div>
        </div>

        {/* ─── DESKTOP HORIZONTAL FLOW PIPELINE (WITH SVG CONNECTORS) ─── */}
        <div className="hidden lg:block relative py-6 px-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
          <div className="grid grid-cols-4 gap-6 items-center relative z-10">
            {/* Step 1 Node: Fleet Master Registration */}
            <div className="relative group">
              <div className="p-5 rounded-2xl bg-white border-2 border-emerald-500 shadow-md shadow-emerald-500/10 transition-all hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    01
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Asset Master
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">Purchase Truck</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Vehicle Master registry. Records Vehicle No (VNO), chassis, RC ownership, insurance policies, and renewal due dates.
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-emerald-600">{stats.totalTrucks} Vehicles Registered</span>
                  <Link to="/transport-system/purchase-truck" className="text-gray-400 hover:text-emerald-600 font-bold">Trucks &rarr;</Link>
                </div>
              </div>

              {/* Connected Arrow to Step 2 */}
              <div className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 flex items-center">
                <div className="w-6 h-0.5 bg-amber-500"></div>
                <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-amber-500"></div>
              </div>
            </div>

            {/* Step 2 Node: Highway Toll & Fastag Engine */}
            <div className="relative group">
              <div className="p-5 rounded-2xl bg-white border-2 border-amber-500 shadow-md shadow-amber-500/10 transition-all hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    02
                  </span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Toll Management
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">Fastag System</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Highway toll wallet integration. Tracks wallet balance, minimum threshold warnings, and top-up recharge logs.
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-amber-600">{stats.activeFastags} Active Wallets</span>
                  <Link to="/transport-system/fastag" className="text-gray-400 hover:text-amber-600 font-bold">Fastag &rarr;</Link>
                </div>
              </div>

              {/* Connected Arrow to Step 3 */}
              <div className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 flex items-center">
                <div className="w-6 h-0.5 bg-rose-500"></div>
                <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-rose-500"></div>
              </div>
            </div>

            {/* Step 3 Node: Traffic Legal & Challan Auditing */}
            <div className="relative group">
              <div className="p-5 rounded-2xl bg-white border-2 border-rose-500 shadow-md shadow-rose-500/10 transition-all hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-xl bg-rose-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    03
                  </span>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Legal Clearance
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">Challan Management</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Traffic violation & e-challan tracker. Audits offence type, fine amount, payment status, and settlement receipts.
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-rose-600">{stats.pendingChallans} Pending Audits</span>
                  <Link to="/transport-system/Challan" className="text-gray-400 hover:text-rose-600 font-bold">Challan &rarr;</Link>
                </div>
              </div>

              {/* Connected Arrow to Step 4 */}
              <div className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 flex items-center">
                <div className="w-6 h-0.5 bg-red-500"></div>
                <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-red-500"></div>
              </div>
            </div>

            {/* Step 4 Node: Trip Dispatch & Financial Reports */}
            <div className="relative group">
              <div className="p-5 rounded-2xl bg-white border-2 border-red-500 shadow-md shadow-red-500/10 transition-all hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-xl bg-red-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    04
                  </span>
                  <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Operations & Billing
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">Truck Reports & Analytics</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Trip logging (From/To, Weight, Rate, Diesel, Advance, Net Freight) + consolidated operational analytics & PDF exports.
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-red-600">{stats.totalTrips} Total Trips</span>
                  <Link to="/transport-system/truck-reports" className="text-gray-400 hover:text-red-600 font-bold">Reports &rarr;</Link>
                </div>
              </div>
            </div>
          </div>

          {/* ─── RETURN OPERATIONAL COST SETTLEMENT LOOP ─── */}
          <div className="mt-8 pt-6 border-t border-dashed border-slate-300">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    Net Freight Calculation Cycle
                    <span className="px-2 py-0.2 rounded-full text-[10px] bg-red-50 text-red-700 border border-red-200">
                      Auto-Audited
                    </span>
                  </h4>
                  <p className="text-xs text-gray-500">
                    Gross Freight = Qty (MT) &times; Rate/MT. Net Freight = Gross Freight &minus; Diesel Cost &minus; Advance Cash &minus; Deductions.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 px-3.5 py-1.5 rounded-xl border border-red-200/80">
                <span>Trip Operations Synchronized</span>
                <CheckCircle2 className="w-4 h-4 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* ─── MOBILE VERTICAL FLOW DIAGRAM (WITH DOWN ARROWS) ─── */}
        <div className="block lg:hidden space-y-3">
          {/* Node 1 */}
          <div className="p-4 rounded-2xl bg-white border-2 border-emerald-500 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                01
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Step 1: Vehicle Master
              </span>
            </div>
            <h4 className="text-sm font-bold text-gray-900">Purchase Truck (trucks)</h4>
            <p className="text-xs text-gray-600 mt-1">
              Vehicle Master registry. Records Vehicle No (VNO), chassis, RC ownership, insurance policies, and renewal due dates.
            </p>
          </div>

          <div className="flex justify-center py-1">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
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
                Step 2: Toll Wallet
              </span>
            </div>
            <h4 className="text-sm font-bold text-gray-900">Fastag System (fastags)</h4>
            <p className="text-xs text-gray-600 mt-1">
              Highway toll wallet integration. Tracks wallet balance, minimum threshold warnings, and top-up recharge logs.
            </p>
          </div>

          <div className="flex justify-center py-1">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
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
                Step 3: Legal Compliance
              </span>
            </div>
            <h4 className="text-sm font-bold text-gray-900">Challan Management (challans)</h4>
            <p className="text-xs text-gray-600 mt-1">
              Traffic violation & e-challan tracker. Audits offence type, fine amount, payment status, and settlement receipts.
            </p>
          </div>

          <div className="flex justify-center py-1">
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>
          </div>

          {/* Node 4 */}
          <div className="p-4 rounded-2xl bg-white border-2 border-red-500 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="w-7 h-7 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center">
                04
              </span>
              <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                Step 4: Dispatch & Settlement
              </span>
            </div>
            <h4 className="text-sm font-bold text-gray-900">Truck Reports (truck_reports)</h4>
            <p className="text-xs text-gray-600 mt-1">
              Trip logging (From/To, Weight, Rate, Diesel, Advance, Net Freight) + consolidated operational analytics & PDF exports.
            </p>
          </div>
        </div>

        {/* ─── TECHNICAL ARCHITECTURE CARDS ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Card 1 */}
          <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              <Truck className="w-4 h-4 text-emerald-600" />
              Fleet Profile Master (`trucks`)
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Maintains complete digital documents for all vehicles: RC, Insurance Policy, Fitness Certificate, Permit, and National Highway Tax.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
              <Banknote className="w-4 h-4 text-amber-600" />
              Toll & Fine Automation
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Auto-flags vehicles with low Fastag balance before dispatch to prevent toll plaza penalties and tracks online clearance of RTO challans.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-red-700">
              <FileText className="w-4 h-4 text-red-600" />
              Billing & Reconciliation (`truck_reports`)
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Consolidated trip ledger with vehicle-wise profitability, diesel expense auditing, pump accounts, and Excel/PDF report generation.
            </p>
          </div>
        </div>
      </div>

      {/* ════════════ QUICK NAVIGATION STRIP ════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Link
          to="/transport-system/dashboard"
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200/80 hover:border-red-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">Dashboard</p>
            <p className="text-[11px] text-gray-500 truncate">Fleet Analytics</p>
          </div>
        </Link>

        <Link
          to="/transport-system/purchase-truck"
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200/80 hover:border-red-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
            <Truck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">Purchase Truck</p>
            <p className="text-[11px] text-gray-500 truncate">Vehicle Profiles</p>
          </div>
        </Link>

        <Link
          to="/transport-system/fastag"
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200/80 hover:border-red-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
            <Banknote className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">Fastag</p>
            <p className="text-[11px] text-gray-500 truncate">Toll Management</p>
          </div>
        </Link>

        <Link
          to="/transport-system/Challan"
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200/80 hover:border-red-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
            <Shield className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">Challan</p>
            <p className="text-[11px] text-gray-500 truncate">Legal Audits</p>
          </div>
        </Link>

        <Link
          to="/transport-system/truck-reports"
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200/80 hover:border-red-400 hover:shadow-xs transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">Truck Reports</p>
            <p className="text-[11px] text-gray-500 truncate">Trip Registers</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
