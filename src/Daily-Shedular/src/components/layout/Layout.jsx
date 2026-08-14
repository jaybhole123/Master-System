import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="app-container">
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
        onClick={closeSidebar}
      ></div>

      <Sidebar isOpen={isSidebarOpen} closeSidebar={closeSidebar} />
      <main className="main-content">
        <Header 
          currentDate={currentDate} 
          setCurrentDate={setCurrentDate} 
          toggleSidebar={toggleSidebar} 
        />
        <div className="page-content bg-color">
          {/* Outlet renders the child route's element, passing currentDate context if needed. 
              We can use React Context for Date, but passing via Outlet context works well for simple apps */}
          <Outlet context={{ currentDate, setCurrentDate }} />
        </div>
      </main>
    </div>
  );
};

export default Layout;
