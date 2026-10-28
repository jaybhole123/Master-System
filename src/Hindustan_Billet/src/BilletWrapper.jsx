import React from 'react';
import './App.css';

/**
 * BilletWrapper provides scoped styling and layout wrapper for Hindustan Billet screens
 * inside the Master-System's AdminLayout.
 */
export default function BilletWrapper({ children }) {
  return (
    <div className="billet-system-root min-h-full w-full">
      <div className="erp-content min-h-full" style={{ padding: '24px 32px' }}>
        {children}
      </div>
    </div>
  );
}
