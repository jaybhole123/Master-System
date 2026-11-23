import React, { useState, useEffect } from 'react';
import './App.css';
import { useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Toast from './components/Toast';

import Dashboard from './pages/Dashboard';
import InventoryPage from './pages/InventoryPage';
import TransactionsPage from './pages/TransactionsPage';
import ReorderPage from './pages/ReorderPage';
import ReportsPage from './pages/ReportsPage';
import MastersPage from './pages/MastersPage';
import ItemDetailPage from './pages/ItemDetailPage';

export default function App({ page, hideNavigation = false }) {
  const { activePage, setActivePage, canP } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sync prop page with activePage
  useEffect(() => {
    if (page && page !== activePage) {
      setActivePage(page);
    }
  }, [page, setActivePage]);

  // Page switcher
  const renderCurrentPage = () => {
    const currentPageKey = page || activePage;

    if (activePage === 'item') {
      return <ItemDetailPage />;
    }

    if (!canP(currentPageKey)) {
      return (
        <div className="card emp">
          No pages are assigned to you. Ask the admin.
        </div>
      );
    }

    switch (currentPageKey) {
      case 'dashboard':
        return <Dashboard />;
      case 'ims':
        return <InventoryPage />;
      case 'txns':
        return <TransactionsPage />;
      case 'reorder':
        return <ReorderPage />;
      case 'reports':
        return <ReportsPage />;
      case 'masters':
        return <MastersPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      {!hideNavigation && (
        <>
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          <Header onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
        </>
      )}

      <main id="main">{renderCurrentPage()}</main>

      <Toast />
    </>
  );
}
