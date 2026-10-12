import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import supabase from '../../SupabaseClient';
import { 
  Building2, Users, Banknote, Calendar as CalendarIcon, Clock, CheckCircle2, 
  AlertCircle, TrendingUp, TrendingDown, ShieldCheck, FileSpreadsheet, 
  FileText, Plus, Search, MessageSquare, Phone, ArrowRight, ExternalLink,
  PieChart as PieChartIcon, BarChart3, Sparkles, RefreshCw, Layers, Home,
  AlertTriangle, Check, DollarSign, Wallet, Shield, ChevronRight, CalendarCheck
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area
} from 'recharts';
import { sendRentPaymentReminder } from '../../services/whatsappService';
import toast from 'react-hot-toast';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const STATUS_COLORS = {
  'On Time': '#10b981',
  'Received': '#3b82f6',
  'Pending': '#f59e0b',
  'Delay': '#ef4444'
};

const OWNER_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];

export default function RentDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toLocaleString('default', { month: 'long' }));
  const [selectedOwner, setSelectedOwner] = useState('ALL');
  const [masterData, setMasterData] = useState([]);
  const [trackerData, setTrackerData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [masterRes, trackerRes] = await Promise.all([
        supabase.from('rent_master').select('*').order('id', { ascending: false }),
        supabase.from('rent_monthly_tracker').select('*').order('id', { ascending: false })
      ]);

      if (masterRes.error) throw masterRes.error;
      if (trackerRes.error) throw trackerRes.error;

      setMasterData(masterRes.data || []);
      setTrackerData(trackerRes.data || []);
    } catch (err) {
      console.error('Error fetching rent dashboard data:', err);
      toast.error('Failed to load rent analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Format currency helper
  const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  // Unique owners
  const uniqueOwners = useMemo(() => {
    return [...new Set(masterData.map(item => item.owner_name).filter(Boolean))].sort();
  }, [masterData]);

  // Master Portfolio Totals
  const portfolioStats = useMemo(() => {
    const list = selectedOwner === 'ALL' 
      ? masterData 
      : masterData.filter(m => m.owner_name === selectedOwner);

    const totalProperties = list.length;
    const totalYield = list.reduce((sum, item) => sum + (Number(item.monthly_rent) || 0), 0);
    const totalDeposit = list.reduce((sum, item) => sum + (Number(item.security_deposit) || 0), 0);
    const avgRent = totalProperties > 0 ? Math.round(totalYield / totalProperties) : 0;

    // Highest and lowest yield
    let highest = null;
    let lowest = null;
    if (list.length > 0) {
      const sorted = [...list].sort((a, b) => (Number(b.monthly_rent) || 0) - (Number(a.monthly_rent) || 0));
      highest = sorted[0];
      lowest = sorted[sorted.length - 1];
    }

    return { totalProperties, totalYield, totalDeposit, avgRent, highest, lowest };
  }, [masterData, selectedOwner]);

  // Selected Month Analytics
  const monthlyStats = useMemo(() => {
    const monthRecords = trackerData.filter(r => r.month === selectedMonth);
    const filteredRecords = selectedOwner === 'ALL'
      ? monthRecords
      : monthRecords.filter(r => {
          const master = masterData.find(m => m.id === r.rent_master_id || m.property_name?.toLowerCase() === r.property?.toLowerCase());
          return master?.owner_name === selectedOwner;
        });

    let onTimeCount = 0;
    let receivedCount = 0;
    let pendingCount = 0;
    let delayCount = 0;
    let collectedAmount = 0;
    let pendingAmount = 0;

    const getStatus = (record) => {
      if (record.status === 'Done' || record.status === 'Received') {
        if (record.received_date && record.due_date_start && record.due_date_end && 
            record.received_date >= record.due_date_start && record.received_date <= record.due_date_end) {
          return 'On Time';
        }
        return 'Received';
      }
      const today = new Date().toISOString().split('T')[0];
      if (record.due_date_end && today > record.due_date_end) return 'Delay';
      return 'Pending';
    };

    filteredRecords.forEach(r => {
      const s = getStatus(r);
      const rentAmt = Number(r.rent) || 0;

      if (s === 'On Time') {
        onTimeCount++;
        collectedAmount += rentAmt;
      } else if (s === 'Received') {
        receivedCount++;
        collectedAmount += rentAmt;
      } else if (s === 'Delay') {
        delayCount++;
        pendingAmount += rentAmt;
      } else {
        pendingCount++;
        pendingAmount += rentAmt;
      }
    });

    const totalTracked = filteredRecords.length;
    const totalDue = collectedAmount + pendingAmount || portfolioStats.totalYield;
    const collectionRate = totalDue > 0 ? Math.round((collectedAmount / totalDue) * 100) : 0;
    const onTimeRate = (onTimeCount + receivedCount) > 0 ? Math.round((onTimeCount / (onTimeCount + receivedCount)) * 100) : 0;

    const statusChartData = [
      { name: 'On Time', value: onTimeCount, fill: STATUS_COLORS['On Time'] },
      { name: 'Received', value: receivedCount, fill: STATUS_COLORS['Received'] },
      { name: 'Pending', value: pendingCount, fill: STATUS_COLORS['Pending'] },
      { name: 'Delay', value: delayCount, fill: STATUS_COLORS['Delay'] }
    ].filter(d => d.value > 0);

    return {
      totalTracked,
      collectedAmount,
      pendingAmount,
      collectionRate,
      onTimeRate,
      onTimeCount,
      receivedCount,
      pendingCount,
      delayCount,
      records: filteredRecords,
      statusChartData
    };
  }, [trackerData, masterData, selectedMonth, selectedOwner, portfolioStats.totalYield]);

  // Year-wide Collection Performance (Historical trend per month)
  const annualTrendData = useMemo(() => {
    return MONTH_NAMES.map(mName => {
      const records = trackerData.filter(r => r.month === mName);
      const collected = records.reduce((sum, r) => {
        if (r.status === 'Done' || r.status === 'Received') {
          return sum + (Number(r.rent) || 0);
        }
        return sum;
      }, 0);
      const target = portfolioStats.totalYield;
      return {
        month: mName.substring(0, 3),
        fullMonth: mName,
        Collected: collected,
        Target: target,
        Rate: target > 0 ? Math.round((collected / target) * 100) : 0
      };
    });
  }, [trackerData, portfolioStats.totalYield]);

  // Property Revenue Ranking
  const propertyRanking = useMemo(() => {
    return [...masterData]
      .sort((a, b) => (Number(b.monthly_rent) || 0) - (Number(a.monthly_rent) || 0))
      .map(item => ({
        name: item.property_name || 'Unnamed',
        rent: Number(item.monthly_rent) || 0,
        tenant: item.tenant_name || '-',
        owner: item.owner_name || '-'
      }));
  }, [masterData]);

  // Landlord Revenue Share
  const landlordShareData = useMemo(() => {
    const map = {};
    masterData.forEach(item => {
      const owner = item.owner_name || 'Other';
      const rent = Number(item.monthly_rent) || 0;
      if (!map[owner]) {
        map[owner] = { name: owner, value: 0, properties: 0 };
      }
      map[owner].value += rent;
      map[owner].properties += 1;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [masterData]);

  // Agreement Expiry & Renewals Timeline
  const agreementTimeline = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return masterData.map(item => {
      let daysLeft = null;
      let status = 'Unknown';
      if (item.agreement_end) {
        const end = new Date(item.agreement_end);
        if (!isNaN(end.getTime())) {
          const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
          daysLeft = diff;
          if (diff < 0) status = 'Expired';
          else if (diff <= 60) status = 'Expiring Soon';
          else status = 'Active';
        }
      }
      return {
        id: item.id,
        property: item.property_name,
        tenant: item.tenant_name,
        contact: item.tenant_contact,
        rent: item.monthly_rent,
        endDate: item.agreement_end,
        daysLeft,
        status
      };
    }).sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999));
  }, [masterData]);

  // Defaulters List for Selected Month
  const pendingDefaulters = useMemo(() => {
    return monthlyStats.records.filter(r => {
      const s = r.status || '';
      return s !== 'Done' && s !== 'Received';
    }).map(r => {
      const master = masterData.find(m => m.id === r.rent_master_id || m.property_name?.toLowerCase() === r.property?.toLowerCase());
      const contact = r.tenantContact || master?.tenant_contact || '';
      return {
        ...r,
        tenantContact: contact,
        owner: master?.owner_name || '-'
      };
    });
  }, [monthlyStats.records, masterData]);

  // Send WhatsApp Reminder
  const handleSendReminder = async (item) => {
    if (!item.tenantContact) {
      toast.error('No contact number available for this tenant');
      return;
    }
    try {
      const res = await sendRentPaymentReminder({
        tenantName: item.tenant,
        propertyName: item.property,
        month: item.month,
        rentAmount: item.rent,
        dueDate: item.due_date_end,
        phoneNumber: item.tenantContact
      });
      if (res.success) {
        toast.success(`Reminder sent to ${item.tenant}`);
      } else {
        toast.error('Failed to send WhatsApp message');
      }
    } catch (e) {
      toast.error('Error triggering WhatsApp reminder');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="h-10 w-10 border-3 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading Rent Intelligence Dashboard...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="w-full px-3 sm:px-6 py-2 space-y-7 animate-in fade-in duration-300">
        
        {/* ═══════════ HEADER & CONTROLS ═══════════ */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200/80 text-[11px] font-bold text-red-600 mb-2 uppercase tracking-wider shadow-2xs">
              <Building2 className="h-3.5 w-3.5 text-red-500" />
              <span>Rent Intelligence & Performance Analytics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Rent Analytics Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Real-time rental yield, timeliness metrics, tenant recovery, and asset distribution
            </p>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Month Filter */}
            <div className="flex items-center bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <CalendarIcon className="h-3.5 w-3.5 text-slate-400 mr-2" />
              <span className="text-[11px] font-bold text-slate-400 uppercase mr-2">Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
              >
                {MONTH_NAMES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Owner Filter */}
            <div className="flex items-center bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <Users className="h-3.5 w-3.5 text-slate-400 mr-2" />
              <span className="text-[11px] font-bold text-slate-400 uppercase mr-2">Owner:</span>
              <select
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
              >
                <option value="ALL">All Landlords</option>
                {uniqueOwners.map(owner => (
                  <option key={owner} value={owner}>{owner}</option>
                ))}
              </select>
            </div>

            {/* Quick Action Navigation */}
            <Link
              to="/dashboard/rent-tracker/master"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Rent Master</span>
            </Link>

            <Link
              to="/dashboard/rent-tracker/monthly"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              <span>Monthly Tracker</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <button
              onClick={fetchData}
              disabled={refreshing}
              className="p-2 bg-white text-slate-600 hover:text-red-600 rounded-xl border border-slate-200 shadow-2xs transition-colors"
              title="Refresh Analytics"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-red-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* ═══════════ TOP 6 KPI METRICS - SINGLE LINE ═══════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '10px' }}>
          
          {/* 1. TOTAL PROPERTIES */}
          <div className="bg-white rounded-xl p-2.5 sm:py-2.5 sm:px-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
            <div className="flex items-center justify-between mb-1.5 gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate" title="Total Properties">
                Properties
              </span>
              <div className="p-1 rounded-lg shrink-0 bg-blue-50 text-blue-600">
                <Building2 className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-black text-blue-700 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
              {portfolioStats.totalProperties} Units
            </div>
            <div className="text-[10px] text-emerald-600 mt-0.5 font-bold truncate">
              100% Occupied
            </div>
          </div>

          {/* 2. MONTHLY PORTFOLIO YIELD */}
          <div className="bg-white rounded-xl p-2.5 sm:py-2.5 sm:px-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
            <div className="flex items-center justify-between mb-1.5 gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate" title="Projected Yield">
                Monthly Yield
              </span>
              <div className="p-1 rounded-lg shrink-0 bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-700 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
              {fmt(portfolioStats.totalYield)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
              Target Monthly Rent
            </div>
          </div>

          {/* 3. COLLECTED THIS MONTH */}
          <div className="bg-white rounded-xl p-2.5 sm:py-2.5 sm:px-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
            <div className="flex items-center justify-between mb-1.5 gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate" title="Rent Received">
                {selectedMonth} Recv.
              </span>
              <div className="p-1 rounded-lg shrink-0 bg-teal-50 text-teal-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-black text-teal-700 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
              {fmt(monthlyStats.collectedAmount)}
            </div>
            <div className="text-[10px] text-teal-600 mt-0.5 font-bold truncate">
              {monthlyStats.collectionRate}% Recovered
            </div>
          </div>

          {/* 4. PENDING / OVERDUE */}
          <div className="bg-white rounded-xl p-2.5 sm:py-2.5 sm:px-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
            <div className="flex items-center justify-between mb-1.5 gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate" title="Pending Rent">
                Pending Rent
              </span>
              <div className="p-1 rounded-lg shrink-0 bg-amber-50 text-amber-600">
                <Clock className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-black text-amber-700 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
              {fmt(monthlyStats.pendingAmount)}
            </div>
            <div className="text-[10px] text-amber-600 mt-0.5 font-bold truncate">
              {monthlyStats.pendingCount + monthlyStats.delayCount} Pending Tenants
            </div>
          </div>

          {/* 5. ON-TIME RATE */}
          <div className="bg-white rounded-xl p-2.5 sm:py-2.5 sm:px-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
            <div className="flex items-center justify-between mb-1.5 gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate" title="On-Time Rate">
                On-Time Rate
              </span>
              <div className="p-1 rounded-lg shrink-0 bg-violet-50 text-violet-600">
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-black text-violet-700 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
              {monthlyStats.onTimeRate}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
              {monthlyStats.onTimeCount} Paid On Time
            </div>
          </div>

          {/* 6. SECURITY DEPOSIT HELD */}
          <div className="bg-white rounded-xl p-2.5 sm:py-2.5 sm:px-3 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group min-w-0">
            <div className="flex items-center justify-between mb-1.5 gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate" title="Security Deposit">
                Security Deposit
              </span>
              <div className="p-1 rounded-lg shrink-0 bg-rose-50 text-rose-600">
                <Shield className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-black text-rose-600 tracking-tight leading-tight group-hover:text-red-600 transition-colors truncate">
              {fmt(portfolioStats.totalDeposit)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
              Held in Custody
            </div>
          </div>

        </div>

        {/* ═══════════ ANALYTICS CHARTS ROW 1 ═══════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          
          {/* Chart 1: Monthly Collection Trend across the Year */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs w-full">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                    Monthly Rent Collection Trend
                  </h2>
                  <p className="text-[11px] text-slate-400">Target Monthly Yield vs Actual Realized Collections</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                2026 Annual
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={annualTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={{ stroke: '#e2e8f0' }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `₹${v/1000}k`} axisLine={{ stroke: '#e2e8f0' }} />
                  <RechartsTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white/95 backdrop-blur-xs p-3 rounded-xl shadow-xl border border-slate-200 text-xs">
                            <p className="font-bold text-slate-800">{data.fullMonth}</p>
                            <p className="text-emerald-600 font-extrabold mt-1">Collected: {fmt(data.Collected)}</p>
                            <p className="text-slate-400">Target: {fmt(data.Target)}</p>
                            <p className="text-blue-600 font-bold mt-0.5">Rate: {data.Rate}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="Collected" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRent)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Timeliness & Status Distribution (Donut Chart) */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between w-full">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <PieChartIcon className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                    Payment Timeliness Breakdown
                  </h2>
                  <p className="text-[11px] text-slate-400">{selectedMonth} status distribution ratio</p>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {monthlyStats.totalTracked} Tenants
              </span>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={monthlyStats.statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {monthlyStats.statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
                        const total = monthlyStats.totalTracked;
                        const pct = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
                        return (
                          <div className="bg-white/95 backdrop-blur-xs p-3 rounded-xl shadow-xl border border-slate-200 text-xs font-semibold">
                            <p className="font-bold text-slate-700">{data.name}</p>
                            <p className="font-black text-slate-900 mt-0.5">{data.value} Tenant(s)</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Share: {pct}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={32} 
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* ═══════════ ANALYTICS CHARTS ROW 2 ═══════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          
          {/* Chart 3: Property Revenue Ranking (Bar Chart) */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs w-full">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                    Property Revenue Ranking
                  </h2>
                  <p className="text-[11px] text-slate-400">Monthly rental value per property unit</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Top {propertyRanking.length} Properties
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={propertyRanking} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: "#64748b" }} 
                    angle={-30} 
                    textAnchor="end" 
                    interval={0}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: "#64748b" }} 
                    tickFormatter={(v) => `₹${v/1000}k`}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <RechartsTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white/95 backdrop-blur-xs p-3 rounded-xl shadow-xl border border-slate-200 text-xs">
                            <p className="font-bold text-slate-900">{d.name}</p>
                            <p className="text-red-600 font-extrabold mt-1">Monthly Rent: {fmt(d.rent)}</p>
                            <p className="text-slate-500 mt-0.5">Tenant: {d.tenant}</p>
                            <p className="text-slate-400">Landlord: {d.owner}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="rent" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Landlord / Owner Share Distribution (Pie Chart) */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between w-full">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                    Landlord Revenue Portfolio
                  </h2>
                  <p className="text-[11px] text-slate-400">Monthly rental yield divided by property owner</p>
                </div>
              </div>
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                {landlordShareData.length} Owners
              </span>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={landlordShareData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {landlordShareData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={OWNER_COLORS[index % OWNER_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        const total = portfolioStats.totalYield;
                        const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
                        return (
                          <div className="bg-white/95 backdrop-blur-xs p-3 rounded-xl shadow-xl border border-slate-200 text-xs font-semibold">
                            <p className="font-bold text-slate-800">{d.name}</p>
                            <p className="font-black text-red-600 mt-0.5">{fmt(d.value)} / month</p>
                            <p className="text-slate-500 mt-0.5">{d.properties} Properties ({pct}%)</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={32} 
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>
    </AdminLayout>
  );
}
