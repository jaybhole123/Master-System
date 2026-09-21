import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Dashboard from "./pages/Dashboard";
import PaymentAdvicePage from "./pages/PaymentAdvicePage";
import SalesOrderPage from "./pages/SalesOrderPage";
import SECLIntimationPage from "./pages/SECLIntimationPage";
import SECLPaymentAdvicePage from "./pages/SECLPaymentAdvicePage";
import InvoicePage from "./pages/InvoicePage";
import AuctionPage from "./pages/AuctionPage";
import WorkOrderPage from "./pages/WorkOrderPage";
import DispatchPage from "./pages/DispatchPage";
import TransportPaymentPage from "./pages/TransportPaymentPage";
import RefundLapsePage from "./pages/RefundLapsePage";
import SaudaScalePage from "./pages/SaudaScalePage";

// Initial state for the Payment Advice page (lifted here so navigating away preserves data)
const PAYMENT_INIT = {
  view: "drop",
  loading: false,
  loadingName: "",
  error: null,
  data: null,
  fileName: "",
};

const SALES_ORDER_INIT = {
  view: "drop",
  loading: false,
  loadingName: "",
  error: null,
  data: null,
  fileName: "",
};

const SECL_INIT = {
  view: "drop",
  loading: false,
  loadingName: "",
  error: null,
  data: null,
  fileName: "",
};

const INVOICE_INIT = {
  view: "drop",
  loading: false,
  loadingName: "",
  error: null,
  data: null,
  fileName: "",
};

const SECL_PAYMENT_ADVICE_INIT = {
  view: "drop",
  loading: false,
  loadingName: "",
  error: null,
  data: null,
  fileName: "",
};

const getInitialState = (key, defaultState) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      let parsed = JSON.parse(saved);

      // Clean up dead blob URLs that were saved to localStorage
      const cleanBlobs = (obj) => {
        if (Array.isArray(obj)) {
          return obj.map(cleanBlobs);
        } else if (obj !== null && typeof obj === 'object') {
          const newObj = {};
          for (let k in obj) {
            if (k === 'pdfUrl' && typeof obj[k] === 'string' && obj[k].startsWith('blob:')) {
              newObj[k] = null;
            } else {
              newObj[k] = cleanBlobs(obj[k]);
            }
          }
          return newObj;
        }
        return obj;
      };

      parsed = cleanBlobs(parsed);

      return {
        ...defaultState,
        view: "results",
        data: parsed,
        fileName: "Loaded from LocalStorage",
      };
    }
  } catch (e) {
    console.error("Failed to load from local storage", e);
  }
  return defaultState;
};

export default function App({ page, hideNavigation }) {
  const [activePage, setActivePage] = useState(() => {
    return page || localStorage.getItem("active_page") || "dashboard";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [paymentState, setPaymentState] = useState(() => getInitialState("payment_advice_data", PAYMENT_INIT));
  const [salesOrderState, setSalesOrderState] = useState(SALES_ORDER_INIT);
  const [seclState, setSeclState] = useState(SECL_INIT);
  const [invoiceState, setInvoiceState] = useState(() => getInitialState("app_invoice_state", INVOICE_INIT));
  const [seclPaymentAdviceState, setSeclPaymentAdviceState] = useState(() => getInitialState("app_secl_payment_advice_state", SECL_PAYMENT_ADVICE_INIT));

  useEffect(() => {
    if (page) setActivePage(page);
  }, [page]);

  useEffect(() => {
    if (!page) localStorage.setItem("active_page", activePage);
  }, [activePage, page]);

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard onNavigate={setActivePage} />;
      case "auction":
        return <AuctionPage />;
      case "payment-advice":
        return (
          <PaymentAdvicePage
            state={paymentState}
            setState={setPaymentState}
          />
        );
      case "secl-payment-advice":
        return (
          <SECLPaymentAdvicePage
            state={seclPaymentAdviceState}
            setState={setSeclPaymentAdviceState}
          />
        );
      case "sales-order":
        return (
          <SalesOrderPage
            state={salesOrderState}
            setState={setSalesOrderState}
          />
        );
      case "secl-intimation":
        return (
          <SECLIntimationPage
            state={seclState}
            setState={setSeclState}
          />
        );
      case "invoice":
        return (
          <InvoicePage
            state={invoiceState}
            setState={setInvoiceState}
          />
        );
      case "work-order":
        return <WorkOrderPage />;
      case "dispatch":
        return <DispatchPage />;
      case "transport-payment":
        return <TransportPaymentPage />;
      case "refund-lapse":
        return <RefundLapsePage />;
      case "sauda-scale":
        return <SaudaScalePage />;
      default:
        return <Dashboard onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="app-layout">
      {!hideNavigation && (
        <Sidebar 
          activePage={activePage} 
          onNavigate={(id) => { setActivePage(id); setIsSidebarOpen(false); }} 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      )}
      <div className="main-area" style={{ marginLeft: hideNavigation ? 0 : undefined, width: hideNavigation ? '100%' : undefined }}>
        {!hideNavigation && (
          <Topbar activePage={activePage} onMenuClick={() => setIsSidebarOpen(true)} />
        )}
        <main className="page-content" id="main-content" style={{ padding: hideNavigation ? '20px 24px' : undefined, marginTop: hideNavigation ? 0 : undefined }}>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
