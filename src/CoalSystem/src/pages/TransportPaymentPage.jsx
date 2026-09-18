import React from "react";

export default function TransportPaymentPage() {
  return (
    <div className="page-content">
      <div className="topbar" style={{ padding: "0 0 20px 0", borderBottom: "none" }}>
        <h2>Transport Payment</h2>
      </div>
      <div className="placeholder-page">
        <svg className="placeholder-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="18" r="3"></circle>
          <circle cx="18" cy="6" r="3"></circle>
          <path d="M6 15v-2a4 4 0 0 1 4-4h4a4 4 0 0 0 4-4V7"></path>
        </svg>
        <div className="placeholder-title">Transport Payment Tracking</div>
        <div className="placeholder-sub">
          This section is currently under development. Transport payment details and workflows will appear here.
        </div>
      </div>
    </div>
  );
}
