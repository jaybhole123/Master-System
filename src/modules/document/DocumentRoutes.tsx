import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Use the master AdminLayout and ProtectedRoute
import AdminLayout from "../../components/layout/AdminLayout";
import { ProtectedRoute } from "../../App"; // We'll need to export ProtectedRoute from App.jsx or move it

import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import ResourceManager from "./pages/ResourceManager";
import DocumentRenewal from "./pages/document/Renewal";
import SubscriptionRenewal from "./pages/subscription/Renewal";
import AllDocuments from "./pages/document/AllDocuments";
import SharedDocuments from "./pages/document/Shared";
import AllSubscriptions from "./pages/subscription/AllSubscriptions";
import SubscriptionApproval from "./pages/subscription/Approval";
import SubscriptionPayment from "./pages/subscription/Payment";
import AllLoans from "./pages/loan/AllLoans";
import LoanForeclosure from "./pages/loan/Foreclosure";
import LoanNOC from "./pages/loan/NOC";
import AllBG from "./pages/bg/AllBG";
import MasterPage from "./pages/master/MasterPage";

// A wrapper to apply the layout to document pages
const DocumentLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
};

export default function DocumentRoutes() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route index element={<DocumentLayout><Dashboard /></DocumentLayout>} />
        <Route path="doc-dashboard" element={<DocumentLayout><Dashboard /></DocumentLayout>} />
        
        {/* Document Routes */}
        <Route path="document">
          <Route index element={<Navigate to="all" replace />} />
          <Route path="all" element={<DocumentLayout><AllDocuments /></DocumentLayout>} />
          <Route path="renewal" element={<DocumentLayout><DocumentRenewal /></DocumentLayout>} />
          <Route path="shared" element={<DocumentLayout><SharedDocuments /></DocumentLayout>} />
        </Route>

        {/* Subscription Routes */}
        <Route path="subscription">
            <Route index element={<Navigate to="all" replace />} />
            <Route path="all" element={<DocumentLayout><AllSubscriptions /></DocumentLayout>} />
            <Route path="approval" element={<DocumentLayout><SubscriptionApproval /></DocumentLayout>} />
            <Route path="payment" element={<DocumentLayout><SubscriptionPayment /></DocumentLayout>} />
            <Route path="renewal" element={<DocumentLayout><SubscriptionRenewal /></DocumentLayout>} />
        </Route>

        {/* Loan Routes */}
        <Route path="loan">
            <Route index element={<Navigate to="all" replace />} />
            <Route path="all" element={<DocumentLayout><AllLoans /></DocumentLayout>} />
            <Route path="foreclosure" element={<DocumentLayout><LoanForeclosure /></DocumentLayout>} />
            <Route path="noc" element={<DocumentLayout><LoanNOC /></DocumentLayout>} />
        </Route>

        {/* BG Routes */}
        <Route path="bg">
            <Route index element={<Navigate to="all" replace />} />
            <Route path="all" element={<DocumentLayout><AllBG /></DocumentLayout>} />
        </Route>

        <Route path="master" element={<DocumentLayout><MasterPage /></DocumentLayout>} />
        <Route path="resource-manager" element={<DocumentLayout><ResourceManager /></DocumentLayout>} />
        
        {/* We use Checklist's Settings, but if they want D&S settings we can route them here under /doc-settings */}
        <Route path="settings" element={<DocumentLayout><Settings /></DocumentLayout>} />
      </Routes>
    </>
  );
}
