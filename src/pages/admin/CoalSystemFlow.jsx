import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Gavel, 
  FileSpreadsheet, 
  CreditCard, 
  ShoppingCart, 
  Truck, 
  Receipt, 
  RotateCcw, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  TrendingUp, 
  HelpCircle,
  FileText,
  DollarSign,
  ChevronRight,
  Database,
  Building2,
  Workflow,
  Sparkles,
  Zap,
  Check,
  Fuel,
  Scale,
  ShieldCheck,
  FileCode,
  Landmark,
  BadgePercent,
  Timer,
  Eye,
  X,
  Compass,
  Coins,
  Cpu,
  ShieldAlert,
  Calendar,
  FileCheck
} from 'lucide-react';
import supabase from '../../SupabaseClient';
import { useNavigate } from 'react-router-dom';

export default function CoalSystemFlow() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState(null);
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline' | 'tax_engine' | 'audit_matrix'
  const [stats, setStats] = useState({
    auctions: 0,
    intimations: 0,
    paymentAdvices: 0,
    salesOrders: 0,
    invoices: 0,
    saudaSales: 0,
    dispatches: 0
  });

  const fetchStats = async () => {
    try {
      setLoading(true);

      const [
        { count: auctionCount },
        { count: intimationCount },
        { count: adviceCount },
        { count: soCount },
        { count: invCount },
        { count: saudaCount },
        { count: dispatchCount }
      ] = await Promise.all([
        supabase.from('auctions').select('*', { count: 'exact', head: true }),
        supabase.from('secl_intimation_format_1').select('*', { count: 'exact', head: true }),
        supabase.from('secl_payment_advices').select('*', { count: 'exact', head: true }),
        supabase.from('sales_orders').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('*', { count: 'exact', head: true }),
        supabase.from('buy_sauda').select('*', { count: 'exact', head: true }),
        supabase.from('coal_dispatch').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        auctions: auctionCount || 0,
        intimations: intimationCount || 0,
        paymentAdvices: adviceCount || 0,
        salesOrders: soCount || 0,
        invoices: invCount || 0,
        saudaSales: saudaCount || 0,
        dispatches: dispatchCount || 0
      });
    } catch (err) {
      console.error('Error fetching coal stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const flowStages = [
    {
      id: "stage-1",
      stepNum: "01",
      title: "E-Auction & SECL Bidding",
      phase: "Procurement & Quota",
      icon: Gavel,
      color: "border-red-500",
      accent: "bg-red-600 text-white",
      lightBg: "bg-red-50/60",
      badgeBg: "bg-red-100 text-red-700 border-red-200",
      stats: `${stats.auctions} Won Lots`,
      route: "/coal-system/auction",
      summary: "Direct participation in CIL / SECL single-window mode-agnostic e-auctions (SWMA).",
      systemActions: [
        "Record Official Scheme Notification Number & Notice Reference",
        "Select E-Auction Portal (mjunction / MSTC Limited / CIL e-Portal)",
        "Lock Siding / Colliery Name, Coal Grade (G11/G12/G13) & Size (ROM/SLACK)",
        "Capture Floor Reserve Price & Record Winning Bid Modulated Rate",
        "Track EMD (Earnest Money Deposit) & Allocation Quota in Metric Tonnes"
      ],
      keyDocuments: [
        "SECL Auction Scheme Notice",
        "EMD Credit Slip / Bank Guarantee",
        "Bid Winning Allotment Summary"
      ],
      kpiNote: "Winning bid rate sets base for all downstream statutory calculations."
    },
    {
      id: "stage-2",
      stepNum: "02",
      title: "Format-1 Intimation & Payment Advice",
      phase: "Banking & Statutory Taxes",
      icon: CreditCard,
      color: "border-amber-500",
      accent: "bg-amber-500 text-white",
      lightBg: "bg-amber-50/60",
      badgeBg: "bg-amber-100 text-amber-700 border-amber-200",
      stats: `${stats.intimations + stats.paymentAdvices} Records`,
      route: "/coal-system/secl-intimation",
      summary: "Statutory tax computation and RTGS clearance submission to SECL Area Financial Controller.",
      systemActions: [
        "Generate Formal Format-1 Intimation Letter with designated Area & Bank Code",
        "Calculate Base Coal Value = Won Qty (MT) × Winning Bid Rate",
        "Apply Statutory Levies: Royalty (14%), DMF (30% on Royalty), NMET (2% on Royalty)",
        "Add Indirect Taxes: GST (5%) + GST Compensation Cess (@ ₹400/MT Flat)",
        "Reconcile Bank RTGS UTR reference and submit for Delivery Order (DO) issuance"
      ],
      keyDocuments: [
        "Format-1 Area Intimation Sheet",
        "Official Bank RTGS Transaction Slip",
        "SECL Validated Delivery Order (DO)"
      ],
      kpiNote: "Payment advice upload auto-parses statutory tax values into Supabase DB."
    },
    {
      id: "stage-3",
      stepNum: "03",
      title: "Sales Order & Client Allocation",
      phase: "Customer Contracts & Quotas",
      icon: ShoppingCart,
      color: "border-blue-500",
      accent: "bg-blue-600 text-white",
      lightBg: "bg-blue-50/60",
      badgeBg: "bg-blue-100 text-blue-700 border-blue-200",
      stats: `${stats.salesOrders} Sales Orders`,
      route: "/coal-system/sales-order",
      summary: "Mapping end-user industrial plants or trader demand contracts against SECL DO quotas.",
      systemActions: [
        "Generate Client Sales Order (SO) with Agreed Plant Delivery Terms",
        "Map order quota against active SECL Delivery Order validity window",
        "Configure Client Specific Premium or Discount margins per MT",
        "Assign Authorized Transporter & Logistics Fleet for Pit-Head Lifting",
        "Track DO balance validity countdown (45-Day statutory expiry tracker)"
      ],
      keyDocuments: [
        "Customer Purchase Order / Agreement",
        "Sales Order Confirmation (SO)",
        "DO Quota Reservation Schedule"
      ],
      kpiNote: "Auto-prevents over-booking beyond issued SECL DO allotted quantity."
    },
    {
      id: "stage-4",
      stepNum: "04",
      title: "Pit-Head Dispatch & Transit",
      phase: "Truck Lifting & Weighment",
      icon: Truck,
      color: "border-purple-500",
      accent: "bg-purple-600 text-white",
      lightBg: "bg-purple-50/60",
      badgeBg: "bg-purple-100 text-purple-700 border-purple-200",
      stats: `${stats.dispatches} Trips Lifted`,
      route: "/coal-system/dispatch",
      summary: "Colliery pit-head truck placement, dual gross-tare weighment, and road transit auditing.",
      systemActions: [
        "Log Truck Registration (VNO), Driver KYC & Mine Entry Authorization",
        "Capture Mine Electronic Weighment: Tare Weight (Empty) & Gross Weight (Loaded)",
        "Compute Exact Net Lifted Coal Weight with Colliery Weighbridge Slip",
        "Generate Statutory E-Way Bill & Coal Transit Pass (Form D / Pass Slip)",
        "Monitor Transit GPS and reconcile at Destination Plant Weighbridge"
      ],
      keyDocuments: [
        "Colliery Weighbridge Gross/Tare Slip",
        "GST E-Way Bill (Road Movement)",
        "Coal Transit Pass (Form D) & Gate Pass"
      ],
      kpiNote: "Dual weighment tracking detects pit-head tare manipulation & transit shortage."
    },
    {
      id: "stage-5",
      stepNum: "05",
      title: "Invoicing, Sauda & Refund",
      phase: "Revenue & Margin Settlement",
      icon: Receipt,
      color: "border-emerald-500",
      accent: "bg-emerald-600 text-white",
      lightBg: "bg-emerald-50/60",
      badgeBg: "bg-emerald-100 text-emerald-700 border-emerald-200",
      stats: `${stats.invoices} Invoices`,
      route: "/coal-system/invoice",
      summary: "Commercial tax billing, transporter freight payout, and closed-loop refund/sauda claims.",
      systemActions: [
        "Raise Final Commercial Tax Invoice (CGST + SGST or IGST + Cess)",
        "Settle Transporter Freight: Trip Rate/MT − Diesel Issued − Cash Advances",
        "Unlifted Balance Recovery: File Formal Refund Claim with SECL Finance",
        "Bilateral Sauda Quota Transfer: Re-route unlifted DO quota to secondary traders",
        "Finalize Gross Profit, Net Margin PMT, and release locked EMD deposits"
      ],
      keyDocuments: [
        "Commercial GST Tax Invoice",
        "Transporter Trip Settlement Sheet",
        "SECL Refund Order / Sauda Delivery Note"
      ],
      kpiNote: "Closed-loop reconciliation ensures zero margin loss or dead capital on unlifted DOs."
    }
  ];

  return (
    <div className="w-full space-y-6 pb-12 max-w-7xl mx-auto">
      {/* ═══════════ TOP HEADER SECTION ═══════════ */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-gradient-to-tr from-red-600 to-rose-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-red-500/25 shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Coal System <span className="text-red-600">Enterprise Flow</span>
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  CIL / SECL Pipeline Synchronized
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Comprehensive 5-Phase Coal Supply Chain: E-Auction Procurement, Statutory Tax Intimation, Mine Dispatch, and Settlement Ledgers
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-2xs active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : 'text-gray-500'}`} />
              <span>Sync Live Stats</span>
            </button>
            <button
              onClick={() => navigate('/coal-system/dashboard')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm shadow-red-500/20 transition-all active:scale-95"
            >
              <span>Open Coal Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════ KPI STAT COUNTERS ═══════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3 hover:border-red-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <Gavel className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider truncate">Auctions</div>
            <div className="text-lg font-black text-gray-900">{loading ? '...' : stats.auctions}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3 hover:border-orange-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider truncate">Format-1 Intimations</div>
            <div className="text-lg font-black text-gray-900">{loading ? '...' : stats.intimations}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3 hover:border-amber-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider truncate">Payment Advices</div>
            <div className="text-lg font-black text-gray-900">{loading ? '...' : stats.paymentAdvices}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3 hover:border-blue-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider truncate">Sales Orders</div>
            <div className="text-lg font-black text-gray-900">{loading ? '...' : stats.salesOrders}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3 hover:border-emerald-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider truncate">GST Invoices</div>
            <div className="text-lg font-black text-gray-900">{loading ? '...' : stats.invoices}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3 hover:border-purple-300 transition-all">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider truncate">Sauda Sales</div>
            <div className="text-lg font-black text-gray-900">{loading ? '...' : stats.saudaSales}</div>
          </div>
        </div>
      </div>

      {/* ═══════════ RECENT UPGRADE TICKER ═══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-3.5 border border-red-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <FileCode className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-red-600">Notice Standards</div>
            <div className="text-xs font-extrabold text-slate-800">SECL SWMA Parameters</div>
            <p className="text-[10px] text-slate-400">Cluster, Siding, Floor & Modulated</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-amber-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Landmark className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-amber-600">Tax Integration</div>
            <div className="text-xs font-extrabold text-slate-800">CIL Statutory Calculator</div>
            <p className="text-[10px] text-slate-400">Royalty 14%, DMF 30%, NMET 2%</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-blue-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Scale className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-blue-600">Weighment Audit</div>
            <div className="text-xs font-extrabold text-slate-800">Mine Dual Pit Weighment</div>
            <p className="text-[10px] text-slate-400">Tare & Gross electronic slip sync</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-emerald-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <RotateCcw className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">Capital Protection</div>
            <div className="text-xs font-extrabold text-slate-800">Closed-Loop Sauda / Refund</div>
            <p className="text-[10px] text-slate-400">Zero margin loss on unlifted DO</p>
          </div>
        </div>
      </div>

      {/* ═══════════ NAVIGATION TABS (PIPELINE / STATUTORY ENGINE / RECONCILIATION) ═══════════ */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'pipeline'
                ? 'bg-red-600 text-white shadow-md shadow-red-500/25'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Workflow className="w-4 h-4" />
            <span>End-to-End Pipeline</span>
          </button>

          <button
            onClick={() => setActiveTab('tax_engine')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'tax_engine'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/25'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <BadgePercent className="w-4 h-4" />
            <span>SECL Statutory Tax Formula</span>
          </button>

          <button
            onClick={() => setActiveTab('audit_matrix')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'audit_matrix'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Pit-Head & Freight Audit Matrix</span>
          </button>
        </div>

        <span className="hidden sm:inline-flex text-[11px] font-bold text-gray-400">
          Click any phase card for complete step-by-step audit
        </span>
      </div>

      {/* ═══════════ TAB 1: 5-PHASE INTERACTIVE MASTER FLOWCHART ═══════════ */}
      {activeTab === 'pipeline' && (
        <div className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-100 text-red-600">
                  <Workflow className="w-5 h-5" />
                </span>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                  Coal Procurement, Allocation & Settlement Architecture
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Sequential flow of auction bidding, financial clearances, truck lifting dispatches, and accounting reconciliation
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              5-Stage Complete Pipeline
            </span>
          </div>

          {/* 5-Step Desktop Grid with Directional Connectors */}
          <div className="relative py-4 px-2 bg-slate-50/70 rounded-2xl border border-slate-200/80">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-stretch relative z-10">
              {flowStages.map((stage, idx) => {
                const StageIcon = stage.icon;
                return (
                  <div key={stage.id} className="relative group flex flex-col justify-between">
                    {/* Card Node */}
                    <div
                      className={`h-full flex flex-col justify-between rounded-2xl border-2 ${stage.color} p-4 bg-white shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
                    >
                      <div>
                        {/* Top Step Number + Icon */}
                        <div className="flex items-center justify-between mb-3">
                          <span className={`w-8 h-8 rounded-xl ${stage.accent} font-black text-xs flex items-center justify-center shadow-xs`}>
                            {stage.stepNum}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase tracking-wider">
                            {stage.phase}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-gray-900 text-sm group-hover:text-red-600 transition-colors">
                          {stage.title}
                        </h3>
                        <p className="text-[11px] text-gray-500 mt-1 mb-3 leading-relaxed">
                          {stage.summary}
                        </p>

                        {/* Technical Parameter Checklist */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                          {stage.systemActions.slice(0, 3).map((action, pIdx) => (
                            <div key={pIdx} className="flex items-start gap-1.5 text-[10.5px] text-slate-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="leading-tight">{action}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bottom Deliverable & Action Buttons */}
                      <div className="mt-4 pt-2.5 border-t border-slate-100 space-y-2">
                        <div>
                          <div className="text-[9.5px] uppercase font-bold text-slate-400">Stage Deliverable:</div>
                          <div className="text-[11px] font-extrabold text-slate-800 bg-slate-50 px-2 py-1 rounded-lg border border-slate-150 truncate">
                            {stage.keyDocuments[0]}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            onClick={() => setSelectedStage(stage)}
                            className="flex-1 py-1.5 px-2 text-[10.5px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center gap-1 transition-colors"
                          >
                            <Eye className="w-3 h-3 text-slate-600" />
                            <span>Deep View</span>
                          </button>
                          <button
                            onClick={() => navigate(stage.route)}
                            className="flex-1 py-1.5 px-2 text-[10.5px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center justify-center gap-1 transition-colors"
                          >
                            <span>Open Page</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Right Connector Arrow */}
                    {idx < flowStages.length - 1 && (
                      <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-red-600 text-white items-center justify-center shadow-md ring-2 ring-white">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ═══════════ CLOSED LOOP RECONCILIATION BANNER ═══════════ */}
            <div className="mt-6 pt-5 border-t border-dashed border-slate-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shadow-xs shrink-0">
                    <RotateCcw className="w-5 h-5 animate-spin-reverse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                      Closed-Loop Recovery: Bilateral Sauda & SECL Refund Engine
                      <span className="px-2 py-0.2 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Zero Margin Freeze
                      </span>
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Agar delivery period ke andar koi coal unlifted reh jaye, toh system automatically <strong>SECL Refund Claim</strong> initiate karta hai ya us balance quota ko <strong>Bilateral Sauda Sales</strong> me route karke full margin release karta hai.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => navigate('/coal-system/refund-lapse')}
                    className="px-3.5 py-1.5 text-xs font-bold bg-white text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 shadow-2xs transition-all active:scale-95"
                  >
                    Refund / Lapse
                  </button>
                  <button
                    onClick={() => navigate('/coal-system/sauda-scale')}
                    className="px-3.5 py-1.5 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-xs transition-all active:scale-95"
                  >
                    Bilateral Sauda
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TAB 2: SECL STATUTORY TAX FORMULA ═══════════ */}
      {activeTab === 'tax_engine' && (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <BadgePercent className="w-5 h-5 text-amber-600" />
                SECL / Coal India Statutory Taxation & Pricing Architecture
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Exact compliance calculation embedded in Format-1 Intimation & Payment Advice generator
              </p>
            </div>
            <button
              onClick={() => navigate('/coal-system/secl-intimation')}
              className="px-3.5 py-1.5 text-xs font-bold bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all flex items-center gap-1.5"
            >
              <span>Format-1 Intimation Module</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-2">
              <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Step 1: Base Value</div>
              <div className="text-sm font-extrabold text-gray-900">Base Coal Value</div>
              <div className="font-mono text-xs bg-white px-2 py-1.5 rounded-lg border border-amber-200 text-amber-900">
                Won Qty (MT) × Bid Rate (PMT)
              </div>
              <p className="text-[11px] text-gray-600">
                Calculated directly from E-Auction winning lot rate and quota allocated by SECL.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-200/80 space-y-2">
              <div className="text-[10px] font-bold text-orange-800 uppercase tracking-wider">Step 2: Statutory Levies</div>
              <div className="text-sm font-extrabold text-gray-900">Royalty, DMF & NMET</div>
              <div className="font-mono text-[11px] bg-white px-2 py-1.5 rounded-lg border border-orange-200 text-orange-900 space-y-0.5">
                <div>• Royalty = 14% of Base Value</div>
                <div>• DMF = 30% of Royalty</div>
                <div>• NMET = 2% of Royalty</div>
              </div>
              <p className="text-[11px] text-gray-600">
                Mines and Minerals (Development and Regulation) statutory compliance mandatory for mine clearance.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-2">
              <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Step 3: Indirect Taxes</div>
              <div className="text-sm font-extrabold text-gray-900">GST & Clean Energy Cess</div>
              <div className="font-mono text-[11px] bg-white px-2 py-1.5 rounded-lg border border-rose-200 text-rose-900 space-y-0.5">
                <div>• GST = 5% (CGST 2.5% + SGST 2.5%)</div>
                <div>• GST Cess = ₹400 / MT (Fixed)</div>
              </div>
              <p className="text-[11px] text-gray-600">
                Levied on gross coal value + statutory levies before RTGS remittance to SECL bank account.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Step 4: Remittance & DO</div>
              <div className="text-sm font-extrabold text-gray-900">Net RTGS Payment & DO</div>
              <div className="font-mono text-xs bg-white px-2 py-1.5 rounded-lg border border-emerald-200 text-emerald-900">
                Total Taxable Amount − EMD Adjusted
              </div>
              <p className="text-[11px] text-gray-600">
                Once bank UTR is submitted in Format-1, SECL issues the valid Delivery Order (DO) within 72 hours.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TAB 3: PIT-HEAD & FREIGHT AUDIT MATRIX ═══════════ */}
      {activeTab === 'audit_matrix' && (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Pit-Head Weighment & Transporter Freight Audit Matrix
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time reconciliation preventing tare fraud, weighbridge discrepancy, and freight leaks
              </p>
            </div>
            <button
              onClick={() => navigate('/coal-system/dispatch')}
              className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex items-center gap-1.5"
            >
              <span>Dispatch Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-gray-200 bg-slate-50/50 space-y-2.5">
              <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm">
                <Scale className="w-4 h-4 text-blue-600" />
                Mine Dual Electronic Weighment
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Truck empty tare is recorded electronically at mine entry weighbridge before loading. Loaded gross weight is logged at mine exit.
              </p>
              <div className="bg-white p-2.5 rounded-xl border border-gray-200 text-[11px] font-mono text-gray-700">
                Net Lifted Coal = Gross Weight − Tare Weight
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-gray-200 bg-slate-50/50 space-y-2.5">
              <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm">
                <Compass className="w-4 h-4 text-purple-600" />
                Transit Tolerance & Moisture Audit
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                When trucks arrive at the consumer plant weighbridge, gross weight is verified against the Mine Pass Slip with allowable 0.5% moisture/transit tolerance.
              </p>
              <div className="bg-white p-2.5 rounded-xl border border-gray-200 text-[11px] font-mono text-gray-700">
                Shortage Claim = Destination Net &lt; (Mine Net − 0.5%)
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-gray-200 bg-slate-50/50 space-y-2.5">
              <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Transporter Trip Freight Settlement
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Transporter payout is computed based on accepted destination weight minus diesel fuel coupons and en-route cash advances.
              </p>
              <div className="bg-white p-2.5 rounded-xl border border-gray-200 text-[11px] font-mono text-gray-700">
                Net Payable = (Rate/MT × Net Qty) − Diesel − Advances
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ DIRECT MODULE NAVIGATION GRID ═══════════ */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
          Coal System Direct Module Navigation
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5">
          {[
            { label: 'Dashboard', path: '/coal-system/dashboard', icon: Layers },
            { label: 'E-Auction', path: '/coal-system/auction', icon: Gavel },
            { label: 'SECL Intimation', path: '/coal-system/secl-intimation', icon: FileSpreadsheet },
            { label: 'Payment Advice', path: '/coal-system/payment-advice', icon: CreditCard },
            { label: 'Sales Order', path: '/coal-system/sales-order', icon: ShoppingCart },
            { label: 'Dispatch', path: '/coal-system/dispatch', icon: Truck },
            { label: 'GST Invoice', path: '/coal-system/invoice', icon: Receipt },
            { label: 'Transport Pay', path: '/coal-system/transport-payment', icon: DollarSign },
            { label: 'Refund / Lapse', path: '/coal-system/refund-lapse', icon: RotateCcw }
          ].map((item, i) => {
            const ItemIcon = item.icon;
            return (
              <button
                key={i}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:border-red-400 hover:bg-red-50/50 hover:shadow-xs transition-all text-center group cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-red-100 text-gray-500 group-hover:text-red-600 transition-colors mb-1.5">
                  <ItemIcon className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-gray-700 group-hover:text-red-700 truncate w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════ DEEP AUDIT INSPECTION MODAL ═══════════ */}
      {selectedStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl ${selectedStage.accent} flex items-center justify-center font-black text-sm shadow-md`}>
                  {selectedStage.stepNum}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {selectedStage.phase}
                    </span>
                    <span className="text-xs font-bold text-red-600">{selectedStage.stats}</span>
                  </div>
                  <h3 className="text-lg font-black text-gray-900 mt-0.5">
                    {selectedStage.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedStage(null)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stage Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-[10.5px] uppercase font-bold text-slate-400 mb-1">Phase Objective</div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {selectedStage.summary}
              </p>
            </div>

            {/* Detailed System Actions */}
            <div>
              <div className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Step-by-Step Operational & Compliance Checklist
              </div>
              <div className="space-y-2">
                {selectedStage.systemActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-800">
                    <span className="w-5 h-5 rounded-full bg-white text-gray-700 font-bold text-[10px] flex items-center justify-center border border-gray-200 shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{action}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mandatory Key Documents */}
            <div>
              <div className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-600" />
                Statutory Documents & Digital Artifacts
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {selectedStage.keyDocuments.map((doc, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 flex items-center gap-2 shadow-2xs">
                    <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="truncate">{doc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* KPI / Audit Note */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Operational Audit Rule:</strong> {selectedStage.kpiNote}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setSelectedStage(null)}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Close View
              </button>
              <button
                onClick={() => {
                  const targetRoute = selectedStage.route;
                  setSelectedStage(null);
                  navigate(targetRoute);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
              >
                <span>Navigate to Module</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


