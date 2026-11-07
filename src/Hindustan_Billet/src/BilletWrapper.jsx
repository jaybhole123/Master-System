import React from 'react';
import './App.css';

/**
 * BilletWrapper provides scoped styling and layout wrapper for Hindustan Billet screens
 * inside the Master-System's AdminLayout.
 */
export default function BilletWrapper({ children }) {
  return (
    <div className="billet-system-root min-h-full w-full max-w-full overflow-hidden">
      <div className="erp-content min-h-full w-full max-w-full box-border" style={{ padding: '16px 20px' }}>
        {children}
      </div>
    </div>
  );
}
