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
  Workflow
} from 'lucide-react';
import supabase from '../../SupabaseClient';
import { useNavigate } from 'react-router-dom';

export default function CoalSystemFlow() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    auctions: 0,
    intimations: 0,
    paymentAdvices: 0,
    salesOrders: 0,
    invoices: 0,
    saudaSales: 0
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
        { count: saudaCount }
      ] = await Promise.all([
        supabase.from('auctions').select('*', { count: 'exact', head: true }),
        supabase.from('secl_intimation_format_1').select('*', { count: 'exact', head: true }),
        supabase.from('secl_payment_advices').select('*', { count: 'exact', head: true }),
        supabase.from('sales_orders').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('*', { count: 'exact', head: true }),
        supabase.from('buy_sauda').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        auctions: auctionCount || 0,
        intimations: intimationCount || 0,
        paymentAdvices: adviceCount || 0,
        salesOrders: soCount || 0,
        invoices: invCount || 0,
        saudaSales: saudaCount || 0
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

  const flowSteps = [
    {
      id: 1,
      title: "1. E-Auction & Coal Bidding",
      subtitle: "Procurement & Allocation",
      icon: Gavel,
      color: "border-red-500 bg-red-50/60 text-red-600",
      accent: "bg-red-600",
      stats: `${stats.auctions} Auctions`,
      route: "/coal-system/auction",
      description: "Participation in Coal India (CIL/SECL) e-auctions. Bidding for specific coal grades, collieries, quantities, and setting base reserve prices.",
      actions: [
        "Record Auction Number, Notice & Scheme",
        "Set Colliery, Grade & Bid Price / MT",
        "Track Allocation Quantity & EMD Deposit",
        "Mark Won Lots & Release for Intimation"
      ]
    },
    {
      id: 2,
      title: "2. SECL Intimation & Payment Advice",
      subtitle: "Bank Finance & Subsidiary Approvals",
      icon: CreditCard,
      color: "border-orange-500 bg-orange-50/60 text-orange-600",
      accent: "bg-orange-600",
      stats: `${stats.intimations + stats.paymentAdvices} Intimations & Advices`,
      route: "/coal-system/secl-intimation",
      description: "Submission of Format-1 Intimation to SECL and generation of formal Payment Advices with RTGS/NEFT transaction details.",
      actions: [
        "Generate Format-1 Intimation with Bank & Area codes",
        "Issue Payment Advice with Coal Value + GST + Cess",
        "Reconcile UTR with Bank RTGS acknowledgment",
        "Confirm SECL acceptance & Delivery Order clearance"
      ]
    },
    {
      id: 3,
      title: "3. Sales Order & Lift Dispatch",
      subtitle: "Truck Logistics & Weighment",
      icon: Truck,
      color: "border-amber-500 bg-amber-50/60 text-amber-600",
      accent: "bg-amber-600",
      stats: `${stats.salesOrders} Sales Orders`,
      route: "/coal-system/sales-order",
      description: "Mapping client orders against allocated coal blocks, truck assignment, mine gate weighment, and transit tracking.",
      actions: [
        "Create Sales Order against customer contracts",
        "Map DO (Delivery Order) valid dates & quotas",
        "Record Truck Gross & Tare weights at mine pit",
        "Dispatch with E-Way Bill & Coal Gate Pass"
      ]
    },
    {
      id: 4,
      title: "4. Invoicing, Refund & Sauda Settlement",
      subtitle: "GST Billing & Account Clearance",
      icon: Receipt,
      color: "border-emerald-500 bg-emerald-50/60 text-emerald-600",
      accent: "bg-emerald-600",
      stats: `${stats.invoices} Invoices`,
      route: "/coal-system/invoice",
      description: "Commercial tax invoicing, transporter freight payment settlement, handling coal refund/lapse claims, and Bilateral Sauda Sales.",
      actions: [
        "Raise GST Commercial Invoice with clean pricing",
        "Process Transporter Trip Freight Payments",
        "File Refund / Lapse claims for unlifted quantity",
        "Reconcile Bilateral Sauda Sales & Trading books"
      ]
    }
  ];

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Banner / Header in a Single Line */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 text-red-600 rounded-lg">
              <Workflow className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Coal System Flow</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                Procurement Pipeline Active
              </span>
            </div>
          </div>

          {/* Action buttons on the right */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
              Sync Live Stats
            </button>
            <button
              onClick={() => navigate('/coal-system/dashboard')}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all duration-150"
            >
              Open Coal Dashboard
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1 pl-12">
          End-to-End Coal Lifecycle: From CIL/SECL E-Auction bidding, Format-1 Intimation, and DO issuance to Pit-Head Dispatch, GST Invoicing, and Refund settlements.
        </p>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-red-50 text-red-600">
            <Gavel className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Auctions</div>
            <div className="text-lg font-bold text-gray-900">{loading ? '...' : stats.auctions}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-orange-50 text-orange-600">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">SECL Intimations</div>
            <div className="text-lg font-bold text-gray-900">{loading ? '...' : stats.intimations}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Payment Advices</div>
            <div className="text-lg font-bold text-gray-900">{loading ? '...' : stats.paymentAdvices}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Sales Orders</div>
            <div className="text-lg font-bold text-gray-900">{loading ? '...' : stats.salesOrders}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Invoices</div>
            <div className="text-lg font-bold text-gray-900">{loading ? '...' : stats.invoices}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Sauda Sales</div>
            <div className="text-lg font-bold text-gray-900">{loading ? '...' : stats.saudaSales}</div>
          </div>
        </div>
      </div>

      {/* Main Flowchart with Connected Arrows */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-red-600" />
              Coal Procurement, Allocation & Settlement Architecture
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Sequential flow of auction bidding, financial clearances, truck lifting dispatches, and accounting reconciliation
            </p>
          </div>
          <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded bg-gray-100 text-gray-600">
            4-Stage Pipeline
          </span>
        </div>

        {/* Steps Grid with arrows */}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {flowSteps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <div key={step.id} className="relative flex flex-col">
                  {/* Step Card */}
                  <div className={`h-full flex flex-col justify-between rounded-xl border-2 ${step.color} p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 bg-white`}>
                    <div>
                      {/* Step Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className={`p-2.5 rounded-lg ${step.accent} text-white shadow-sm`}>
                          <StepIcon className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                          {step.stats}
                        </span>
                      </div>

                      <h3 className="font-bold text-gray-900 text-sm">{step.title}</h3>
                      <div className="text-[11px] font-medium text-gray-500 mb-2">{step.subtitle}</div>
                      <p className="text-xs text-gray-600 mb-3 leading-relaxed">{step.description}</p>

                      {/* Action points */}
                      <div className="space-y-1.5 pt-2 border-t border-gray-100">
                        {step.actions.map((act, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[11px] text-gray-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <span>{act}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Step Link */}
                    <div className="pt-4 mt-3 border-t border-gray-100">
                      <button
                        onClick={() => navigate(step.route)}
                        className="w-full inline-flex items-center justify-between text-xs font-semibold text-gray-700 hover:text-red-600 transition-colors py-1 group"
                      >
                        <span>Open Stage View</span>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 group-hover:text-red-600 transition-all" />
                      </button>
                    </div>
                  </div>

                  {/* Flow Arrow (Desktop Horizontal) */}
                  {idx < flowSteps.length - 1 && (
                    <div className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-red-600 text-white items-center justify-center shadow-md ring-4 ring-white">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}

                  {/* Flow Arrow (Mobile / Tablet Vertical) */}
                  {idx < flowSteps.length - 1 && (
                    <div className="flex lg:hidden justify-center my-2 text-red-600">
                      <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
                        ↓
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Closed Loop / Reconciliation Flow Banner */}
        <div className="bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 border border-red-200 rounded-xl p-4 mt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-600 text-white rounded-lg shadow-sm">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                  Closed-Loop Reconciliation & Recovery Cycle
                </h4>
                <p className="text-xs text-gray-600">
                  Unlifted balance coal quantity triggers automated <strong>SECL Refund Claims</strong> or converts into <strong>Bilateral Sauda Sales</strong> to prevent margin lapse and capital freeze.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/coal-system/refund-lapse')}
                className="px-3 py-1.5 text-xs font-semibold bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm"
              >
                Refund / Lapse
              </button>
              <button
                onClick={() => navigate('/coal-system/sauda-sale')}
                className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm"
              >
                Sauda Sale
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Strip */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
          Coal System Direct Module Navigation
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
          {[
            { label: 'Dashboard', path: '/coal-system/dashboard', icon: Layers },
            { label: 'Auction', path: '/coal-system/auction', icon: Gavel },
            { label: 'SECL Intimation', path: '/coal-system/secl-intimation', icon: FileSpreadsheet },
            { label: 'Payment Advice', path: '/coal-system/payment-advice', icon: CreditCard },
            { label: 'Sales Order', path: '/coal-system/sales-order', icon: ShoppingCart },
            { label: 'Dispatch', path: '/coal-system/dispatch', icon: Truck },
            { label: 'Invoice', path: '/coal-system/invoice', icon: Receipt },
            { label: 'Transport Pay', path: '/coal-system/transport-payment', icon: DollarSign },
            { label: 'Refund / Lapse', path: '/coal-system/refund-lapse', icon: RotateCcw }
          ].map((item, i) => {
            const ItemIcon = item.icon;
            return (
              <button
                key={i}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-gray-100 hover:border-red-300 hover:bg-red-50/50 transition-all text-center group"
              >
                <ItemIcon className="w-4 h-4 text-gray-500 group-hover:text-red-600 mb-1" />
                <span className="text-[11px] font-medium text-gray-700 group-hover:text-red-700 truncate w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
