import React from "react";

export default function WorkOrderPage() {
  return (
    <div className="page-content">
      <div className="topbar" style={{ padding: "0 0 20px 0", borderBottom: "none" }}>
        <h2>Work Order</h2>
      </div>
      <div className="placeholder-page">
        <svg className="placeholder-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <path d="M16 13H8"></path>
          <path d="M16 17H8"></path>
          <path d="M10 9H8"></path>
        </svg>
        <div className="placeholder-title">Work Order Management</div>
        <div className="placeholder-sub">
          This section is currently under development. Work order extraction and management features will appear here.
        </div>
      </div>
    </div>
  );
}
