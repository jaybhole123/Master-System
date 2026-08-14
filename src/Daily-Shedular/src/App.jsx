import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SchedulerProvider } from './context/SchedulerContext';
import Layout from './components/layout/Layout';

import Dashboard from './pages/Dashboard';
import WaitingList from './pages/WaitingList';
import SomedayTasks from './pages/SomedayTasks';
import Reports from './pages/Reports';

function App() {
  return (
    <SchedulerProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="waiting-list" element={<WaitingList />} />
            <Route path="someday" element={<SomedayTasks />} />
            <Route path="reports" element={<Reports />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SchedulerProvider>
  );
}

export default App;
