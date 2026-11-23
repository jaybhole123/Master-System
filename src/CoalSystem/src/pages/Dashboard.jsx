import React, { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from "recharts";
import { supabase } from "../utils/supabase";
import { CHART_THEME, formatIndianNumber, formatIndianCurrency } from "../utils/chartTheme";
import {
  Flame,
  Database,
  TrendingUp,
  FileText,
  FileSpreadsheet,
  Boxes,
  Receipt,
  Gavel,
  Truck,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  ShieldCheck,
  ChevronRight,
  Wallet,
  Sparkles,
  DollarSign,
  Briefcase,
  Filter,
  CheckCircle
} from "lucide-react";

export default function Dashboard({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [trendRange, setTrendRange] = useState("30"); // '7' | '30' | '90' days

  // Global Dashboard Filter States
  const [selectedFirm, setSelectedFirm] = useState("ALL");
  const [selectedLocation, setSelectedLocation] = useState("ALL");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const [raw, setRaw] = useState({
    salesOrders: [],
    invoices: [],
    paymentAdvices: [],
    seclF1: [],
    seclF2: [],
    cmpdcil: [],
    auctions: [],
    auctionItems: [],
    dispatch: []
  });

  useEffect(() => {
    (async () => {
      try {
        const [
          { data: salesOrders },
          { data: invoices },
          { data: paymentAdvices },
          { data: seclF1 },
          { data: seclF2 },
          { data: cmpdcil },
          { data: auctions },
          { data: auctionItems },
          { data: dispatch }
        ] = await Promise.all([
          supabase.from("sales_orders").select("*"),
          supabase.from("invoices").select("*"),
          supabase.from("secl_payment_advices").select("*"),
          supabase.from("secl_intimation_format_1").select("*"),
          supabase.from("secl_intimation_format_2").select("*"),
          supabase.from("secl_cmpdcil").select("*"),
          supabase.from("auctions").select("*"),
          supabase.from("auction_items").select("*"),
          supabase.from("dispatch_records").select("*")
        ]);

        setRaw({
          salesOrders: salesOrders || [],
          invoices: invoices || [],
          paymentAdvices: paymentAdvices || [],
          seclF1: seclF1 || [],
          seclF2: seclF2 || [],
          cmpdcil: cmpdcil || [],
          auctions: auctions || [],
          auctionItems: auctionItems || [],
          dispatch: dispatch || []
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Compute unique firms and locations from actual data for dropdown filters
  const { filterOptions } = useMemo(() => {
    const firms = new Set();
    const locations = new Set();

    raw.salesOrders.forEach(s => {
      if (s.name) firms.add(s.name.trim());
      if (s.office_area) locations.add(s.office_area.trim());
      if (s.mine) locations.add(s.mine.trim());
    });
    raw.invoices.forEach(i => {
      if (i.buyer_name) firms.add(i.buyer_name.trim());
      if (i.location) locations.add(i.location.trim());
    });
    raw.paymentAdvices.forEach(p => {
      if (p.unit_name) locations.add(p.unit_name.trim());
    });
    raw.dispatch.forEach(d => {
      if (d.party_name) firms.add(d.party_name.trim());
      if (d.destination) locations.add(d.destination.trim());
      if (d.colliery) locations.add(d.colliery.trim());
    });

    return {
      filterOptions: {
        firms: Array.from(firms).filter(Boolean).sort(),
        locations: Array.from(locations).filter(Boolean).sort()
      }
    };
  }, [raw]);

  // Main Shared Data & Calculations Layer - strictly matching KPI Cards and Charts
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Apply Filter Function to raw records
    const matchesFilter = (record, dateField, firmField, locField) => {
      if (selectedFirm !== "ALL") {
        const firmVal = record[firmField] || record.name || record.buyer_name || record.party_name || "";
        if (firmVal.trim().toLowerCase() !== selectedFirm.toLowerCase()) return false;
      }
      if (selectedLocation !== "ALL") {
        const locVal = record[locField] || record.office_area || record.mine || record.location || record.unit_name || record.colliery || record.source || "";
        if (locVal.trim().toLowerCase() !== selectedLocation.toLowerCase()) return false;
      }
      if (dateRange.start || dateRange.end) {
        const recDateStr = record[dateField] || record.created_at || record.sales_order_valid_from || record.dispatch_date;
        if (!recDateStr) return false;
        const recDate = new Date(recDateStr);
        if (isNaN(recDate.getTime())) return false;
        if (dateRange.start && recDate < new Date(dateRange.start)) return false;
        if (dateRange.end) {
          const endD = new Date(dateRange.end);
          endD.setHours(23, 59, 59, 999);
          if (recDate > endD) return false;
        }
      }
      return true;
    };

    const filteredSO = raw.salesOrders.filter(r => matchesFilter(r, "created_at", "name", "office_area"));
    const filteredInv = raw.invoices.filter(r => matchesFilter(r, "created_at", "buyer_name", "location"));
    const filteredPA = raw.paymentAdvices.filter(r => matchesFilter(r, "created_at", "party_name", "unit_name"));
    const filteredF1 = raw.seclF1.filter(r => matchesFilter(r, "created_at", "buyer_name", "source"));
    const filteredF2 = raw.seclF2.filter(r => matchesFilter(r, "created_at", "buyer_name", "source"));
    const filteredCL = raw.cmpdcil.filter(r => matchesFilter(r, "created_at", "company", "source"));
    const filteredAuctions = raw.auctions.filter(r => matchesFilter(r, "created_at", "coal_company", "department"));
    const filteredAuctionItems = raw.auctionItems;
    const filteredDispatch = raw.dispatch.filter(r => matchesFilter(r, "created_at", "party_name", "colliery"));

    // 1. Sales Orders (DO) Metrics
    let soValid = 0, soExpired = 0, soTotalQty = 0, soTotalAmt = 0;
    filteredSO.forEach(s => {
      soTotalQty += Number(s.quantity) || 0;
      soTotalAmt += Number(s.amount) || 0;
      if (!s.sales_order_valid_to || s.sales_order_valid_to === "-" || s.sales_order_valid_to === "Not Found") {
        soValid++;
      } else {
        const vt = new Date(s.sales_order_valid_to);
        if (isNaN(vt)) soValid++;
        else { vt.setHours(0, 0, 0, 0); vt < today ? soExpired++ : soValid++; }
      }
    });

    // 2. Payment Advices Metrics
    let paValid = 0, paExpired = 0, paTotalAmt = 0;
    filteredPA.forEach(p => {
      paTotalAmt += Number(p.grand_total) || 0;
      if (!p.due_date || p.due_date === "-" || p.due_date === "Not Found") {
        paValid++;
      } else {
        const vt = new Date(p.due_date);
        if (isNaN(vt)) paValid++;
        else { vt.setHours(0, 0, 0, 0); vt < today ? paExpired++ : paValid++; }
      }
    });

    // 3. SECL Formats Metrics
    let f1Qty = 0, f1Bid = 0, f1Pending = 0, f1Done = 0;
    filteredF1.forEach(s => {
      f1Qty += Number(s.quantity_allotted) || 0;
      f1Bid += Number(s.winning_bid_price_rs_mt) || 0;
      s.status === "done" ? f1Done++ : f1Pending++;
    });

    let f2Qty = 0, f2Bid = 0, f2Pending = 0, f2Done = 0;
    filteredF2.forEach(s => {
      f2Qty += Number(s.qty_allotted) || 0;
      f2Bid += Number(s.bid_price) || 0;
      s.status === "done" ? f2Done++ : f2Pending++;
    });

    let clQty = 0, clValue = 0, clPending = 0, clDone = 0;
    filteredCL.forEach(s => {
      clQty += Number(s.allocated_qty) || 0;
      clValue += Number(s.value_rs) || 0;
      s.status === "done" ? clDone++ : clPending++;
    });

    // 4. Invoices Metrics
    let invTotal = 0;
    filteredInv.forEach(i => invTotal += Number(i.total_amount) || 0);

    // 5. Auctions Metrics
    const aucCount = filteredAuctions.length;
    let aucTotalQty = 0;
    filteredAuctionItems.forEach(a => aucTotalQty += Number(a.quantity_offered) || 0);

    // 6. Dispatch Metrics
    let dispQty = 0, dispFreight = 0;
    filteredDispatch.forEach(d => {
      dispQty += Number(d.truck_qty) || 0;
      dispFreight += Number(d.freight) || 0;
    });

    const seclTotalQty = f1Qty + f2Qty + clQty;
    const seclTotalPending = f1Pending + f2Pending + clPending;
    const seclTotalDone = f1Done + f2Done + clDone;

    const totalDocs = filteredSO.length + filteredInv.length + filteredPA.length + filteredF1.length + filteredF2.length + filteredCL.length + filteredAuctions.length + filteredDispatch.length;
    const totalValue = soTotalAmt + invTotal + paTotalAmt;
    const totalCoalTonnage = soTotalQty + seclTotalQty;

    /* ═══════════════════════════════════════════════════════
       CHART 1: DONUT CHART - Order Status Split (Idle / In Progress / Completed / Pending)
       Tie-in: Matches Total Sales Orders (soCount)
       ═══════════════════════════════════════════════════════ */
    let statusIdle = 0, statusInProgress = 0, statusCompleted = 0, statusPending = 0;
    filteredSO.forEach(s => {
      const st = (s.status || "").toLowerCase();
      if (st === "completed" || st === "done") {
        statusCompleted++;
      } else if (st === "in progress" || st === "in_progress" || st === "processing") {
        statusInProgress++;
      } else if (st === "idle" || st === "unassigned" || st === "draft") {
        statusIdle++;
      } else {
        // Default valid or pending orders
        if (s.sales_order_valid_to) {
          const vt = new Date(s.sales_order_valid_to);
          if (!isNaN(vt) && vt < today) {
            statusIdle++; // Expired without completion treated as idle
          } else {
            statusPending++;
          }
        } else {
          statusPending++;
        }
      }
    });

    const orderStatusData = [
      { name: "Completed", value: statusCompleted, color: CHART_THEME.colors.good },
      { name: "In Progress", value: statusInProgress, color: CHART_THEME.colors.warning },
      { name: "Pending", value: statusPending, color: CHART_THEME.colors.critical },
      { name: "Idle", value: statusIdle, color: CHART_THEME.colors.neutralSlate }
    ].filter(item => item.value > 0);

    const orderStatusTotal = statusCompleted + statusInProgress + statusPending + statusIdle;
    if (orderStatusTotal !== filteredSO.length && filteredSO.length > 0) {
      console.warn("Validation Alert: Order status donut total does not equal Sales Orders count!");
    }

    /* ═══════════════════════════════════════════════════════
       CHART 2: PIE CHART - Coal Stock / Allocation by Grade or Type
       Tie-in: Matches Total Sales Order Quantity (soTotalQty) or Allotted Qty
       ═══════════════════════════════════════════════════════ */
    const gradeMap = {};
    filteredSO.forEach(s => {
      // Extract coal grade / type from order details, or mine name fallback
      const grade = s.coal_grade || s.grade || s.mine || s.office_area || "Standard Grade";
      const qty = Number(s.quantity) || 0;
      if (qty > 0) {
        gradeMap[grade] = (gradeMap[grade] || 0) + qty;
      }
    });

    const coalGradeData = Object.entries(gradeMap)
      .map(([name, value], i) => ({
        name,
        value: Math.round(value * 100) / 100,
        color: CHART_THEME.piePalette[i % CHART_THEME.piePalette.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const totalGradeQty = coalGradeData.reduce((acc, d) => acc + d.value, 0);

    /* ═══════════════════════════════════════════════════════
       CHART 3: GROUPED BAR CHART - FIFO Compliant vs Non-Compliant
       Tie-in: Evaluated across Sales Orders validity & dispatch timestamps
       ═══════════════════════════════════════════════════════ */
    // FIFO Rule: Orders issued earlier should be dispatched or executed before newer ones.
    const fifoMonthlyMap = {};
    filteredSO.forEach(s => {
      const crDate = s.created_at ? new Date(s.created_at) : null;
      if (!crDate || isNaN(crDate.getTime())) return;
      const monthKey = `${crDate.getFullYear()}-${String(crDate.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = crDate.toLocaleString('default', { month: 'short' });

      if (!fifoMonthlyMap[monthKey]) {
        fifoMonthlyMap[monthKey] = { month: monthLabel, compliant: 0, nonCompliant: 0, sortKey: crDate.getTime() };
      }

      // If order is within valid period or successfully completed, it's FIFO compliant
      const isExpired = s.sales_order_valid_to && new Date(s.sales_order_valid_to) < today && s.status !== "completed";
      if (isExpired) {
        fifoMonthlyMap[monthKey].nonCompliant += Number(s.quantity) || 1;
      } else {
        fifoMonthlyMap[monthKey].compliant += Number(s.quantity) || 1;
      }
    });

    const fifoChartData = Object.values(fifoMonthlyMap)
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(-6);

    /* ═══════════════════════════════════════════════════════
       CHART 4: LINE / AREA CHART - Daily Dispatch / Receipts Trend (7 / 30 / 90 Days Toggle)
       Tie-in: Matches Actual Dispatch records and Invoices/Receipts within range
       ═══════════════════════════════════════════════════════ */
    const daysCount = parseInt(trendRange) || 30;
    const trendMap = {};
    const startDateThreshold = new Date();
    startDateThreshold.setDate(startDateThreshold.getDate() - daysCount);
    startDateThreshold.setHours(0, 0, 0, 0);

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = daysCount <= 14 
        ? d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })
        : d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      trendMap[key] = { date: label, dispatch: 0, receipts: 0 };
    }

    // Populate actual dispatch tonnage
    filteredDispatch.forEach(d => {
      const dDateStr = d.dispatch_date || d.created_at;
      if (!dDateStr) return;
      const key = new Date(dDateStr).toISOString().slice(0, 10);
      if (trendMap[key]) {
        trendMap[key].dispatch += Number(d.truck_qty) || 0;
      }
    });

    // Populate actual receipts (invoices / SO receipts)
    filteredInv.forEach(inv => {
      const invDateStr = inv.created_at || inv.date;
      if (!invDateStr) return;
      const key = new Date(invDateStr).toISOString().slice(0, 10);
      if (trendMap[key]) {
        trendMap[key].receipts += Number(inv.total_amount ? inv.total_amount / 5000 : 0) || 0; // Approximate equivalent or quantity
      }
    });

    // Also include SO daily volumes into trend receipts
    filteredSO.forEach(s => {
      if (!s.created_at) return;
      const key = new Date(s.created_at).toISOString().slice(0, 10);
      if (trendMap[key]) {
        trendMap[key].receipts += Number(s.quantity) || 0;
      }
    });

    const dailyTrendData = Object.values(trendMap);

    /* ═══════════════════════════════════════════════════════
       CHART 5: HORIZONTAL BAR CHART - Top 5 Parties by Quantity & Outstanding
       Tie-in: Matches Sales Orders and Invoices top customer volumes
       ═══════════════════════════════════════════════════════ */
    const partyStats = {};
    filteredSO.forEach(s => {
      const party = (s.name || s.sold_to_party?.name || "General Client").trim();
      if (!partyStats[party]) partyStats[party] = { name: party, qty: 0, amount: 0 };
      partyStats[party].qty += Number(s.quantity) || 0;
      partyStats[party].amount += Number(s.amount) || 0;
    });

    filteredDispatch.forEach(d => {
      if (d.party_name) {
        const party = d.party_name.trim();
        if (!partyStats[party]) partyStats[party] = { name: party, qty: 0, amount: 0 };
        partyStats[party].qty += Number(d.truck_qty) || 0;
      }
    });

    const topPartiesData = Object.values(partyStats)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
      .map(p => ({
        name: p.name.length > 20 ? `${p.name.substring(0, 18)}...` : p.name,
        fullName: p.name,
        qty: Math.round(p.qty * 100) / 100,
        amount: Math.round(p.amount)
      }));

    return {
      totalDocs, totalValue, totalCoalTonnage,
      soValid, soExpired, soTotalQty, soTotalAmt, soCount: filteredSO.length,
      paValid, paExpired, paTotalAmt, paCount: filteredPA.length,
      f1Qty, f1Bid, f1Count: filteredF1.length, f1Pending, f1Done,
      f2Qty, f2Bid, f2Count: filteredF2.length, f2Pending, f2Done,
      clQty, clValue, clCount: filteredCL.length, clPending, clDone,
      seclTotalQty, seclTotalPending, seclTotalDone,
      invTotal, invCount: filteredInv.length,
      aucCount, aucTotalQty,
      dispQty, dispFreight, dispCount: filteredDispatch.length,
      orderStatusData, orderStatusTotal,
      coalGradeData, totalGradeQty,
      fifoChartData,
      dailyTrendData,
      topPartiesData
    };
  }, [raw, selectedFirm, selectedLocation, dateRange, trendRange]);

  if (loading) {
    return (
      <div className="w-full space-y-6 font-sans">
        {/* Loading Skeleton */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 animate-pulse flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-200 rounded-lg"></div>
            <div className="h-4 w-72 bg-slate-100 rounded-lg"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-12 w-28 bg-slate-100 rounded-xl"></div>
            <div className="h-12 w-28 bg-slate-100 rounded-xl"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-white rounded-3xl p-5 border border-slate-200 animate-pulse space-y-3">
              <div className="h-4 w-32 bg-slate-200 rounded"></div>
              <div className="h-44 bg-slate-100 rounded-2xl"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 font-sans text-slate-800 animate-in fade-in duration-200">
      
      {/* ═══════════ TOP EXECUTIVE BANNER ═══════════ */}
      <div className="relative overflow-hidden bg-gradient-to-r from-white via-white to-red-50/40 rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-xs backdrop-blur-md">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-gradient-to-br from-red-500/10 via-rose-500/5 to-transparent pointer-events-none blur-3xl"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#e7000b] via-red-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 shrink-0 ring-4 ring-red-100">
              <Flame size={28} className="stroke-[2.2] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-[#e7000b] border border-red-200 shadow-2xs">
                  Operations & Intelligence
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Connected
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1.5 flex items-center gap-2">
                Coal System Command Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Comprehensive overview of Sales Orders, SECL Intimations, Payment Advices & Dispatch Pipeline
              </p>
            </div>
          </div>

          {/* Key High-Level Stats */}
          <div className="grid grid-cols-3 gap-2.5 w-full lg:w-auto">
            <div className="bg-white/80 hover:bg-white rounded-2xl px-4 py-3 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-center min-w-[130px]">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">Total Records</span>
              <span className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-0.5 whitespace-nowrap">
                {formatIndianNumber(stats.totalDocs, 0)}
              </span>
              <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Across all tables</span>
            </div>

            <div className="bg-emerald-50/40 hover:bg-emerald-50/70 rounded-2xl px-4 py-3 border border-emerald-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-center min-w-[145px]">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 whitespace-nowrap">Total Valuation</span>
              <span className="text-lg sm:text-xl font-black text-emerald-700 font-mono mt-0.5 whitespace-nowrap">
                {formatIndianCurrency(stats.totalValue)}
              </span>
              <span className="text-[10px] text-emerald-600/80 font-medium whitespace-nowrap">SO + Inv + Advices</span>
            </div>

            <div className="bg-blue-50/40 hover:bg-blue-50/70 rounded-2xl px-4 py-3 border border-blue-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-center min-w-[155px]">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 whitespace-nowrap">Total Coal Qty</span>
              <span className="text-lg sm:text-xl font-black text-blue-700 font-mono mt-0.5 whitespace-nowrap">
                {formatIndianNumber(stats.totalCoalTonnage)} MT
              </span>
              <span className="text-[10px] text-blue-600/80 font-medium whitespace-nowrap">Allotted & SO Volume</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ GLOBAL ADVANCED FILTERS BAR (COMPACT SINGLE LINE) ═══════════ */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
            <Filter className="w-3.5 h-3.5 text-[#e7000b]" />
            <span>Filters:</span>
          </div>

          {/* Firm / Party Filter (Compact width) */}
          <div className="relative shrink-0 w-36 sm:w-44">
            <select
              value={selectedFirm}
              onChange={(e) => setSelectedFirm(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 text-[11px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-200 cursor-pointer transition-colors truncate"
            >
              <option value="ALL">All Firms / Parties</option>
              {filterOptions.firms.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Location / Mine Filter (Compact width) */}
          <div className="relative shrink-0 w-36 sm:w-44">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 text-[11px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-200 cursor-pointer transition-colors truncate"
            >
              <option value="ALL">All Locations / Mines</option>
              {filterOptions.locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Date Range Picker (Compact single line) */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs shrink-0">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-transparent text-slate-700 font-semibold focus:outline-none text-[11px] cursor-pointer"
            />
            <span className="text-slate-400 font-bold text-[10px]">→</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-transparent text-slate-700 font-semibold focus:outline-none text-[11px] cursor-pointer"
            />
          </div>

          {(selectedFirm !== "ALL" || selectedLocation !== "ALL" || dateRange.start || dateRange.end) && (
            <button
              onClick={() => {
                setSelectedFirm("ALL");
                setSelectedLocation("ALL");
                setDateRange({ start: "", end: "" });
              }}
              className="px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              Reset
            </button>
          )}
        </div>

        <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 shrink-0 whitespace-nowrap pl-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Real-time DB</span>
        </div>
      </div>

      {/* ═══════════ CHARTS SECTION (MODERN & ATTRACTIVE) ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* 1. DONUT CHART: Order Status Split */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-[#e7000b] flex items-center justify-center border border-red-100 shadow-2xs">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Order Status Split
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">Idle, In Progress, Completed & Pending</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
              Ties to DOs
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center relative mt-3">
            {stats.orderStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.orderStatusData}
                    innerRadius={70}
                    outerRadius={98}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.orderStatusData.map((entry, idx) => (
                      <Cell key={`status-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val, name) => [`${formatIndianNumber(val, 0)} Orders`, name]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                      fontWeight: "700"
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-xs font-semibold">
                No data for selected filters
              </div>
            )}
            {/* Center Total Count with gradient styling */}
            {stats.orderStatusData.length > 0 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-8 text-center pointer-events-none">
                <div className="text-2xl font-black text-slate-900 font-mono leading-none tracking-tight">
                  {formatIndianNumber(stats.orderStatusTotal, 0)}
                </div>
                <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mt-1">
                  Total DOs
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. PIE CHART: Coal Stock / Allocation by Grade or Type */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs">
                <Boxes className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Coal Allocation by Grade / Type
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">Tonnage distribution across mines</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
              Ties to Qty
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center mt-3">
            {stats.coalGradeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.coalGradeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={92}
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2.5}
                  >
                    {stats.coalGradeData.map((entry, idx) => (
                      <Cell key={`grade-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val) => [`${formatIndianNumber(val)} MT`, "Quantity"]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                      fontWeight: "700"
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-xs font-semibold">
                No data for selected filters
              </div>
            )}
          </div>
        </div>

        {/* 3. GROUPED BAR CHART: FIFO Compliant vs Non-Compliant */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  FIFO Dispatch Compliance
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">Compliant vs Non-Compliant orders</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              Validity Audit
            </span>
          </div>

          <div className="h-64 w-full mt-3">
            {stats.fifoChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.fifoChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={38} />
                  <RechartsTooltip
                    formatter={(val) => [`${formatIndianNumber(val)} MT`, ""]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                      fontWeight: "700"
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="compliant" name="FIFO Compliant" fill={CHART_THEME.colors.good} radius={[5, 5, 0, 0]} barSize={18} />
                  <Bar dataKey="nonCompliant" name="Non-Compliant (Expired)" fill={CHART_THEME.colors.critical} radius={[5, 5, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                No data for selected filters
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ═══════════ TREND & TOP PARTIES CHARTS ROW ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* 4. LINE / AREA CHART: Daily Dispatch / Receipts Trend with 7/30/90 Days Toggle */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between pb-3 mb-2 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#e7000b]" />
                Daily Dispatch & Receipts Trend
              </h3>
              <p className="text-xs text-slate-400 font-medium">Tonnage movement over operational timeline</p>
            </div>

            {/* 7 / 30 / 90 Days Toggle */}
            <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200/80">
              {["7", "30", "90"].map((r) => (
                <button
                  key={r}
                  onClick={() => setTrendRange(r)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    trendRange === r
                      ? "bg-white text-[#e7000b] shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {r} Days
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full mt-2">
            {stats.dailyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.dailyTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradDispatch" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_THEME.colors.critical} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={CHART_THEME.colors.critical} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="gradReceipts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_THEME.colors.good} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={CHART_THEME.colors.good} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={45} />
                  <RechartsTooltip
                    formatter={(val, name) => [`${formatIndianNumber(val)} MT`, name === "dispatch" ? "Dispatch Tonnage" : "Receipts Volume"]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)",
                      fontSize: "12px",
                      fontWeight: "700"
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="dispatch" name="Dispatch (MT)" stroke={CHART_THEME.colors.critical} fill="url(#gradDispatch)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="receipts" name="Receipts / Allocated (MT)" stroke={CHART_THEME.colors.good} fill="url(#gradReceipts)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                No data for selected filters
              </div>
            )}
          </div>
        </div>

        {/* 5. HORIZONTAL BAR CHART: Top 5 Parties by Quantity */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-purple-600" />
                Top 5 Parties by Quantity
              </h3>
              <p className="text-xs text-slate-400 font-medium">Ranked by volume (MT)</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              Volume Leader
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full mt-2">
            {stats.topPartiesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={stats.topPartiesData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }} axisLine={false} tickLine={false} width={90} />
                  <RechartsTooltip
                    formatter={(val, _, item) => [
                      `${formatIndianNumber(val)} MT (${formatIndianCurrency(item.payload.amount)})`,
                      item.payload.fullName
                    ]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                      fontWeight: "700"
                    }}
                  />
                  <Bar dataKey="qty" fill={CHART_THEME.colors.purple} radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                No data for selected filters
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ═══════════ SECTION 1: SALES ORDER (DO) ═══════════ */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
        <SectionHeader 
          title="Sales Order (DO)" 
          subtitle="Contract allocations, active validity & tonnage tracking"
          icon={FileSpreadsheet} 
          count={stats.soCount}
          onNavigate={() => onNavigate("sales-order")} 
        />
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 sm:gap-3">
          <StatBox label="Total DOs" value={stats.soCount} subtext="Registered orders" color="blue" icon={FileText} />
          <StatBox label="Active DOs" value={stats.soValid} badge="Valid" subtext="In validity period" color="emerald" />
          <StatBox label="Expired DOs" value={stats.soExpired} badge="Expired" subtext="Elapsed validity" color="rose" />
          <StatBox label="Total Quantity" value={`${formatIndianNumber(stats.soTotalQty)} MT`} subtext="Combined DO tonnage" color="purple" icon={Boxes} />
          <StatBox label="Total Amount" value={formatIndianCurrency(stats.soTotalAmt)} subtext="Financial contract value" color="amber" icon={TrendingUp} />
        </div>
      </div>

      {/* ═══════════ SECTION 2: SECL PAYMENT ADVICE ═══════════ */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
        <SectionHeader 
          title="SECL Payment Advice" 
          subtitle="Due dates, approved payment advices & total financial commitments"
          icon={Wallet} 
          count={stats.paCount}
          onNavigate={() => onNavigate("secl-payment-advice")} 
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          <StatBox label="Total Advices" value={stats.paCount} subtext="Bank advices generated" color="blue" icon={Receipt} />
          <StatBox label="Active" value={stats.paValid} badge="Valid" subtext="Within payment window" color="emerald" />
          <StatBox label="Expired" value={stats.paExpired} badge="Expired" subtext="Past due date" color="rose" />
          <StatBox label="Grand Total" value={formatIndianCurrency(stats.paTotalAmt)} subtext="Cumulative payment value" color="amber" icon={TrendingUp} />
        </div>
      </div>

      {/* ═══════════ SECTION 3: SECL INTIMATION BREAKDOWN ═══════════ */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
        <SectionHeader 
          title="SECL Intimation Formats" 
          subtitle="M-Junction, MSTC Auction allotments & CMPDCIL allocations"
          icon={FileText} 
          count={stats.f1Count + stats.f2Count + stats.clCount}
          onNavigate={() => onNavigate("secl-intimation")} 
        />

        {/* Aggregate Strip */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 bg-slate-50/70 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200/70">
          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">Total Allotted Qty</span>
            <div className="text-base sm:text-lg font-black text-slate-900 font-mono whitespace-nowrap">{formatIndianNumber(stats.seclTotalQty)} MT</div>
          </div>
          <div className="text-center border-x border-slate-200">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 whitespace-nowrap">Pending Execution</span>
            <div className="text-base sm:text-lg font-black text-amber-700 font-mono whitespace-nowrap">{stats.seclTotalPending}</div>
          </div>
          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 whitespace-nowrap">Completed (Done)</span>
            <div className="text-base sm:text-lg font-black text-emerald-700 font-mono whitespace-nowrap">{stats.seclTotalDone}</div>
          </div>
        </div>

        {/* 3 Formats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormatCard 
            title="M-Junction (Format 1)"
            count={stats.f1Count}
            qty={`${formatIndianNumber(stats.f1Qty)} MT`}
            value={formatIndianCurrency(stats.f1Bid)}
            valueLabel="Winning Bid Rate"
            pending={stats.f1Pending}
            done={stats.f1Done}
            color="blue"
          />
          <FormatCard 
            title="MSTC (Format 2)"
            count={stats.f2Count}
            qty={`${formatIndianNumber(stats.f2Qty)} MT`}
            value={formatIndianCurrency(stats.f2Bid)}
            valueLabel="Bid Price Rate"
            pending={stats.f2Pending}
            done={stats.f2Done}
            color="purple"
          />
          <FormatCard 
            title="CMPDCIL"
            count={stats.clCount}
            qty={`${formatIndianNumber(stats.clQty)} MT`}
            value={formatIndianCurrency(stats.clValue)}
            valueLabel="Allocated Value"
            pending={stats.clPending}
            done={stats.clDone}
            color="teal"
          />
        </div>
      </div>

      {/* ═══════════ SECTION 4: INVOICE, AUCTION & DISPATCH ROW ═══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        
        {/* INVOICE CARD */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
          <SectionHeader 
            title="Invoice" 
            subtitle="Commercial billing & tax invoices"
            icon={Receipt} 
            count={stats.invCount}
            onNavigate={() => onNavigate("invoice")} 
          />
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <StatBox label="Total Invoices" value={stats.invCount} subtext="Generated invoices" color="blue" icon={Receipt} />
            <StatBox label="Total Amount" value={formatIndianCurrency(stats.invTotal)} subtext="Tax invoice amount" color="emerald" icon={TrendingUp} />
          </div>
        </div>

        {/* AUCTION CARD */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
          <SectionHeader 
            title="Auction / Deal" 
            subtitle="SECL e-Auction notices & lots"
            icon={Gavel} 
            count={stats.aucCount}
            onNavigate={() => onNavigate("auction")} 
          />
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <StatBox label="Total Auctions" value={stats.aucCount} subtext="Bidding notices" color="purple" icon={Gavel} />
            <StatBox label="Qty Offered" value={`${formatIndianNumber(stats.aucTotalQty)} MT`} subtext="Volume on block" color="amber" icon={Boxes} />
          </div>
        </div>

        {/* DISPATCH CARD */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
          <SectionHeader 
            title="Dispatch Tracking" 
            subtitle="Physical truck dispatches from mines"
            icon={Truck} 
            count={stats.dispCount}
            onNavigate={() => onNavigate("dispatch")} 
          />
          <div className="grid grid-cols-3 gap-2">
            <StatBox label="Dispatches" value={stats.dispCount} subtext="Truck records" color="blue" />
            <StatBox label="Total Qty" value={`${formatIndianNumber(stats.dispQty)} MT`} subtext="Lifted tonnage" color="emerald" />
            <StatBox label="Freight" value={formatIndianCurrency(stats.dispFreight)} subtext="Transport cost" color="amber" />
          </div>
        </div>

      </div>

      {/* ═══════════ SECTION 5: QUICK NAVIGATION ═══════════ */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-50 text-[#e7000b] flex items-center justify-center">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Quick Navigation
              </h3>
              <p className="text-xs text-slate-400 font-medium">Direct Coal System module shortcuts</p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Shortcuts</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <QuickNavItem title="Sales Order (DO)" icon={FileSpreadsheet} count={stats.soCount} onClick={() => onNavigate("sales-order")} />
          <QuickNavItem title="SECL Payment Advice" icon={Wallet} count={stats.paCount} onClick={() => onNavigate("secl-payment-advice")} />
          <QuickNavItem title="SECL Intimation" icon={FileText} count={stats.f1Count + stats.f2Count + stats.clCount} onClick={() => onNavigate("secl-intimation")} />
          <QuickNavItem title="Invoice" icon={Receipt} count={stats.invCount} onClick={() => onNavigate("invoice")} />
          <QuickNavItem title="Auction / Deal" icon={Gavel} count={stats.aucCount} onClick={() => onNavigate("auction")} />
          <QuickNavItem title="Dispatch Tracking" icon={Truck} count={stats.dispCount} onClick={() => onNavigate("dispatch")} />
          <QuickNavItem title="Sauda Scale (Buy/Sell)" icon={Briefcase} count="" onClick={() => onNavigate("sauda-scale")} />
          <QuickNavItem title="Refund / Lapse" icon={RotateCcw} count="" onClick={() => onNavigate("refund-lapse")} />
        </div>
      </div>

    </div>
  );
}

/* ═════════════════════════════════════════════════
   HELPER SUB-COMPONENTS
═════════════════════════════════════════════════ */

function SectionHeader({ title, subtitle, icon: Icon, count, onNavigate }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl bg-red-50 text-[#e7000b] flex items-center justify-center border border-red-200/80 shadow-2xs shrink-0">
          <Icon size={16} className="stroke-[2.2]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              {title}
            </h3>
            {count !== undefined && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black font-mono bg-slate-100 text-slate-700 border border-slate-200">
                {count}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-400 font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {onNavigate && (
        <button
          onClick={onNavigate}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-[#e7000b] border border-slate-200 hover:border-red-200 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
        >
          <span>View All</span>
          <ArrowUpRight size={13} />
        </button>
      )}
    </div>
  );
}

function StatBox({ label, value, subtext, badge, color = "blue", icon: Icon }) {
  const colorMap = {
    blue: {
      bg: "bg-blue-50/50 hover:bg-blue-50/80",
      border: "border-blue-100 hover:border-blue-200",
      label: "text-blue-900",
      value: "text-blue-950",
      iconBg: "bg-blue-100 text-blue-700",
      badge: "bg-blue-100 text-blue-800 border-blue-200"
    },
    emerald: {
      bg: "bg-emerald-50/50 hover:bg-emerald-50/80",
      border: "border-emerald-100 hover:border-emerald-200",
      label: "text-emerald-900",
      value: "text-emerald-900",
      iconBg: "bg-emerald-100 text-emerald-700",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200"
    },
    rose: {
      bg: "bg-rose-50/50 hover:bg-rose-50/80",
      border: "border-rose-100 hover:border-rose-200",
      label: "text-rose-900",
      value: "text-rose-950",
      iconBg: "bg-rose-100 text-rose-700",
      badge: "bg-rose-100 text-rose-800 border-rose-200"
    },
    purple: {
      bg: "bg-purple-50/50 hover:bg-purple-50/80",
      border: "border-purple-100 hover:border-purple-200",
      label: "text-purple-900",
      value: "text-purple-950",
      iconBg: "bg-purple-100 text-purple-700",
      badge: "bg-purple-100 text-purple-800 border-purple-200"
    },
    amber: {
      bg: "bg-amber-50/50 hover:bg-amber-50/80",
      border: "border-amber-100 hover:border-amber-200",
      label: "text-amber-900",
      value: "text-amber-950",
      iconBg: "bg-amber-100 text-amber-700",
      badge: "bg-amber-100 text-amber-800 border-amber-200"
    }
  };

  const style = colorMap[color] || colorMap.blue;

  return (
    <div className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border ${style.border} ${style.bg} transition-all flex flex-col justify-between`}>
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">
          {label}
        </span>
        {badge ? (
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${style.badge} whitespace-nowrap`}>
            {badge}
          </span>
        ) : Icon ? (
          <div className={`w-5 h-5 rounded-md ${style.iconBg} flex items-center justify-center shrink-0`}>
            <Icon size={11} />
          </div>
        ) : null}
      </div>

      <div>
        <div className="text-sm sm:text-base lg:text-lg font-black font-mono text-slate-900 leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
          {value}
        </div>
        {subtext && (
          <div className="text-[10px] text-slate-400 font-medium mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}

function FormatCard({ title, count, qty, value, valueLabel, pending, done, color = "blue" }) {
  return (
    <div className="bg-slate-50/70 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 hover:border-slate-300 transition-all flex flex-col justify-between space-y-2.5">
      <div className="flex items-center justify-between border-b border-slate-200/70 pb-1.5">
        <span className="text-xs font-black text-slate-800 uppercase tracking-wide">{title}</span>
        <span className="px-2 py-0.5 rounded-md bg-white text-slate-700 text-[10px] font-mono font-black border border-slate-200 whitespace-nowrap">
          {count} Entries
        </span>
      </div>

      <div className="space-y-1 text-xs font-medium">
        <div className="flex justify-between py-0.5">
          <span className="text-slate-500">Quantity Allotted</span>
          <span className="font-mono font-bold text-slate-900 whitespace-nowrap">{qty}</span>
        </div>
        <div className="flex justify-between py-0.5">
          <span className="text-slate-500">{valueLabel}</span>
          <span className="font-mono font-bold text-emerald-700 whitespace-nowrap">{value}</span>
        </div>
      </div>

      <div className="pt-1.5 border-t border-slate-200/70 flex items-center justify-between text-[11px] font-bold">
        <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 whitespace-nowrap">
          <Clock size={11} className="text-amber-600" />
          Pending: {pending}
        </span>
        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 whitespace-nowrap">
          <CheckCircle2 size={11} className="text-emerald-600" />
          Done: {done}
        </span>
      </div>
    </div>
  );
}

function QuickNavItem({ title, icon: Icon, count, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-red-50/50 border border-slate-200/70 hover:border-red-200 transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 group-hover:text-[#e7000b] flex items-center justify-center shrink-0 shadow-2xs">
          <Icon size={14} />
        </div>
        <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 truncate">
          {title}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {count !== "" && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-slate-200/70 group-hover:bg-red-100 group-hover:text-red-700 text-slate-700">
            {count}
          </span>
        )}
        <ChevronRight size={14} className="text-slate-400 group-hover:text-[#e7000b] group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );
}
