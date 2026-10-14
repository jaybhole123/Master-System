import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CreditCard, 
  Banknote, 
  ShieldCheck, 
  RotateCcw, 
  Calendar, 
  Share2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  Layers, 
  ArrowRight, 
  ChevronRight, 
  DollarSign, 
  Car, 
  Building2, 
  Workflow,
  Lock,
  FileCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useDataStore from '../store/dataStore';
import useHeaderStore from '../store/headerStore';
import { 
  fetchDocumentsFromGoogleSheets, 
  fetchLoansFromGoogleSheets, 
  fetchCarInsuranceFromGoogleSheets 
} from '../utils/googleSheetsService';
import { syncSubscriptions } from '../utils/subscriptionSync';

export default function DocumentSystemFlow() {
  const navigate = useNavigate();
  const { setTitle } = useHeaderStore();
  const { documents, subscriptions, loans, setDocuments, setLoans, setSubscriptions } = useDataStore();

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    documents: 0,
    carInsurance: 0,
    subscriptions: 0,
    loans: 0,
    renewalsPending: 0,
    bgs: 0
  });

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch documents, loans, car insurances, subscriptions
      const [docs, loanData, carData] = await Promise.all([
        fetchDocumentsFromGoogleSheets().catch(() => []),
        fetchLoansFromGoogleSheets().catch(() => []),
        fetchCarInsuranceFromGoogleSheets().catch(() => [])
      ]);

      if (docs && docs.length > 0) setDocuments(docs);
      if (loanData && loanData.length > 0) setLoans(loanData);

      let subList: any[] = [];
      try {
        subList = await syncSubscriptions();
        if (subList && subList.length > 0) setSubscriptions(subList);
      } catch (e) {
        subList = subscriptions || [];
      }

      const activeDocs = docs || documents || [];
      const activeSubs = subList || subscriptions || [];
      const activeLoans = loanData || loans || [];

      // Calculate renewals pending
      const pendingDocRenewals = activeDocs.filter((d: any) => d.needsRenewal || (d.renewalDate && new Date(d.renewalDate) <= new Date())).length;
      const pendingSubRenewals = activeSubs.filter((s: any) => s.status === 'Active' || s.nextBillingDate).length;

      setStats({
        documents: activeDocs.length,
        carInsurance: carData ? carData.length : 0,
        subscriptions: activeSubs.length,
        loans: activeLoans.length,
        renewalsPending: pendingDocRenewals + pendingSubRenewals,
        bgs: 12 // Bank Guarantees default baseline
      });
    } catch (err) {
      console.error('Error fetching document & subscription stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTitle('System Flow');
    loadData();
  }, []);

  const flowSteps = [
    {
      id: 1,
      title: "1. Asset & Record Onboarding",
      subtitle: "Document Vault & Insurance Registry",
      icon: FileText,
      color: "border-blue-500 bg-blue-50/60 text-blue-600",
      accent: "bg-blue-600",
      stats: `${stats.documents} Documents`,
      route: "/document/all",
      description: "Centralized ingestion of legal agreements, entity licenses, commercial & vehicle insurance policies with secure cloud storage.",
      actions: [
        "Upload contracts, registration certificates & master deeds",
        "Record Policy No, IDV, Premium & Term validity",
        "Tag company branch, department & concern person",
        "Generate audit-compliant Document Master Data"
      ]
    },
    {
      id: 2,
      title: "2. Expiry Tracking & Calendar Alert",
      subtitle: "Automated Renewal Monitoring",
      icon: Calendar,
      color: "border-amber-500 bg-amber-50/60 text-amber-600",
      accent: "bg-amber-600",
      stats: `${stats.renewalsPending} Expiries Monitored`,
      route: "/document/reminder-calendar",
      description: "Real-time calendar matrix monitoring document expiration dates, policy lapse windows, and automated WhatsApp/Email alerts.",
      actions: [
        "Scan upcoming renewal dates (30/15/7 days out)",
        "Trigger reminder calendar flags for department HODs",
        "Dispatch WhatsApp & Email renewal notices",
        "Prevent penalty lapses on vehicular & legal filings"
      ]
    },
    {
      id: 3,
      title: "3. Subscription & Vendor Approval",
      subtitle: "Software SaaS & Recurring Services",
      icon: CreditCard,
      color: "border-purple-500 bg-purple-50/60 text-purple-600",
      accent: "bg-purple-600",
      stats: `${stats.subscriptions} Active Subscriptions`,
      route: "/subscription/approval",
      description: "Dual-tier approval workflows for corporate software licenses, recurring utilities, and finance disbursement checks.",
      actions: [
        "Track active vendor software tools & recurring billing",
        "Management review & approval verification",
        "Issue payment release vouchers & transaction logs",
        "Update next billing cycle & license seat counts"
      ]
    },
    {
      id: 4,
      title: "4. Capital Liability & Compliance Close",
      subtitle: "Loans, Foreclosure, NOC & Bank Guarantee",
      icon: Banknote,
      color: "border-emerald-500 bg-emerald-50/60 text-emerald-600",
      accent: "bg-emerald-600",
      stats: `${stats.loans} Loan Portfolios`,
      route: "/loan/all",
      description: "Complete financing lifecycle management from bank loans and BG deposits to foreclosure payoff and final NOC certificate retrieval.",
      actions: [
        "Monitor EMI schedules, principal balances & interest",
        "Initiate early loan foreclosure settlement requests",
        "Track bank physical NOC & clearance certificate collection",
        "Manage Bank Guarantee (BG) release & maturity returns"
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
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Document &amp; Subscription Flow</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Compliance Registry Active
              </span>
            </div>
          </div>

          {/* Action buttons on the right */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
              Sync Live Stats
            </button>
            <button
              onClick={() => navigate('/doc-dashboard')}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all duration-150"
            >
              Open Overview Dashboard
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1 pl-12">
          End-to-End Enterprise Compliance: From Document Vault Ingestion, Vehicle &amp; General Insurance, Reminder Calendars to SaaS Subscriptions, Bank Guarantees &amp; Loan NOC Settlement.
        </p>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Vault Documents</div>
            <div className="text-lg font-bold text-gray-900">{loading ? '...' : stats.documents}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Car Insurance</div>
            <div className="text-lg font-bold text-gray-900">{loading ? '...' : stats.carInsurance}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Subscriptions</div>
            <div className="text-lg font-bold text-gray-900">{loading ? '...' : stats.subscriptions}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Due Renewals</div>
            <div className="text-lg font-bold text-gray-900">{loading ? '...' : stats.renewalsPending}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-red-50 text-red-600">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Active Loans</div>
            <div className="text-lg font-bold text-gray-900">{loading ? '...' : stats.loans}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Bank Guarantees</div>
            <div className="text-lg font-bold text-gray-900">{loading ? '...' : stats.bgs}</div>
          </div>
        </div>
      </div>

      {/* Main Flowchart with Connected Arrows */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-red-600" />
              Document Lifecycle &amp; Statutory Compliance Architecture
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Systematic lifecycle mapping asset onboarding, automated renewal alerts, dual-tier payment authorization, and loan NOC recovery
            </p>
          </div>
          <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded bg-gray-100 text-gray-600">
            4-Stage Architecture
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

        {/* Closed Loop / Continuous Audit & Sharing Banner */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-xl p-4 mt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                  Secure Document Sharing &amp; Audit Trail
                </h4>
                <p className="text-xs text-gray-600">
                  Time-expiring secure document sharing logs track external parties, while <strong>Loan Foreclosure &amp; NOC Collection</strong> feeds clearance history back into corporate master registers.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/document/shared')}
                className="px-3 py-1.5 text-xs font-semibold bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm"
              >
                Shared Logs
              </button>
              <button
                onClick={() => navigate('/loan/noc')}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
              >
                Collect NOC
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Strip */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
          Document &amp; Subscription Direct Module Navigation
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2">
          {[
            { label: 'Dashboard', path: '/doc-dashboard', icon: Layers },
            { label: 'Insurance', path: '/resource-manager', icon: ShieldCheck },
            { label: 'Car Insurance', path: '/document/car-insurance', icon: Car },
            { label: 'Doc Renewal', path: '/document/renewal', icon: RotateCcw },
            { label: 'Sub Renewal', path: '/subscription/renewal', icon: RotateCcw },
            { label: 'Shared Docs', path: '/document/shared', icon: Share2 },
            { label: 'Calendar', path: '/document/reminder-calendar', icon: Calendar },
            { label: 'Sub Approval', path: '/subscription/approval', icon: CheckCircle2 },
            { label: 'Sub Payment', path: '/subscription/payment', icon: CreditCard },
            { label: 'All Loans', path: '/loan/all', icon: Banknote }
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
