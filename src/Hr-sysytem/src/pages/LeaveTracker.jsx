import React, { useState, useEffect } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { supabase } from '../lib/supabase';
import { Plus, X, Save, Loader, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function LeaveTracker() {
  const [employees] = useEmployees();
  
  const [leaveAllotments, setLeaveAllotments] = useState({});
  const [leaveRequests, setLeaveRequests] = useState([]);
  
  const [savingBalances, setSavingBalances] = useState(false);
  const [savingRequest, setSavingRequest] = useState(false);

  const [activeTab, setActiveTab] = useState('Balance');
  const [showModal, setShowModal] = useState(false);
  const [newRequest, setNewRequest] = useState({ empId: '', type: 'CL', from: '', to: '', reason: '' });
  
  // Reject Modal State
  const [rejectModalData, setRejectModalData] = useState({ reqId: null, reason: '' });

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const fetchLeaveData = async () => {
    try {
      const [allotmentsRes, requestsRes] = await Promise.all([
        supabase.from('leave_allotments').select('*'),
        supabase.from('leave_requests').select('*').order('created_at', { ascending: false })
      ]);
      
      if (allotmentsRes.error) throw allotmentsRes.error;
      if (requestsRes.error) throw requestsRes.error;
      
      const allotmentsMap = {};
      allotmentsRes.data.forEach(row => {
        allotmentsMap[row.employee_id] = { cl: row.cl, sl: row.sl, el: row.el };
      });
      setLeaveAllotments(allotmentsMap);
      
      const reqs = requestsRes.data.map(row => ({
        id: row.id,
        empId: row.employee_id,
        type: row.leave_type,
        from: row.start_date,
        to: row.end_date,
        days: row.days,
        status: row.status,
        reason: row.reason
      }));
      setLeaveRequests(reqs);
    } catch (err) {
      console.error('Error fetching leave data:', err);
      toast.error('Failed to load leave data');
    }
  };

  // Helper to calculate days between dates
  const calculateDays = (from, to) => {
    if (!from || !to) return 0;
    const date1 = new Date(from);
    const date2 = new Date(to);
    const diffTime = Math.abs(date2 - date1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    return diffDays;
  };

  const handleAllotmentChange = (empId, type, val) => {
    const value = parseInt(val) || 0;
    setLeaveAllotments(prev => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || { cl: 0, sl: 0, el: 0 }),
        [type]: value
      }
    }));
  };

  const saveAllotments = async () => {
    setSavingBalances(true);
    try {
      const upsertData = Object.keys(leaveAllotments).map(empId => ({
        employee_id: empId,
        cl: leaveAllotments[empId].cl,
        sl: leaveAllotments[empId].sl,
        el: leaveAllotments[empId].el
      }));
      
      if (upsertData.length > 0) {
        const { error } = await supabase.from('leave_allotments').upsert(upsertData, { onConflict: 'employee_id' });
        if (error) throw error;
        toast.success('Leave balances saved successfully');
      }
    } catch (err) {
      console.error('Error saving balances:', err);
      toast.error('Failed to save leave balances');
    } finally {
      setSavingBalances(false);
    }
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!newRequest.empId || !newRequest.from || !newRequest.to) {
      return toast.error("Please fill all required fields");
    }
    
    setSavingRequest(true);
    const days = calculateDays(newRequest.from, newRequest.to);
    
    try {
      if (newRequest.id) {
        // Update existing request
        const { error } = await supabase.from('leave_requests').update({
          employee_id: newRequest.empId,
          leave_type: newRequest.type,
          start_date: newRequest.from,
          end_date: newRequest.to,
          days: days,
          reason: newRequest.reason,
          status: newRequest.status
        }).eq('id', newRequest.id);
        
        if (error) throw error;
        
        setLeaveRequests(leaveRequests.map(r => r.id === newRequest.id ? {
          ...r,
          empId: newRequest.empId,
          type: newRequest.type,
          from: newRequest.from,
          to: newRequest.to,
          days: days,
          reason: newRequest.reason,
          status: newRequest.status
        } : r));
        toast.success('Leave request updated successfully');
      } else {
        // Insert new request
        const { data, error } = await supabase.from('leave_requests').insert([{
          employee_id: newRequest.empId,
          leave_type: newRequest.type,
          start_date: newRequest.from,
          end_date: newRequest.to,
          days: days,
          reason: newRequest.reason,
          status: 'Pending'
        }]).select();
        
        if (error) throw error;
        
        if (data && data[0]) {
          const row = data[0];
          const newReq = {
            id: row.id,
            empId: row.employee_id,
            type: row.leave_type,
            from: row.start_date,
            to: row.end_date,
            days: row.days,
            status: row.status,
            reason: row.reason
          };
          setLeaveRequests([newReq, ...leaveRequests]);
        }
        toast.success('Leave request submitted');
      }
      
      setShowModal(false);
      setNewRequest({ empId: '', type: 'CL', from: '', to: '', reason: '' });
    } catch (err) {
      console.error('Error submitting request:', err);
      toast.error('Failed to save request');
    } finally {
      setSavingRequest(false);
    }
  };

  const updateRequestStatus = async (reqId, newStatus, newReason = null) => {
    try {
      const updateData = { status: newStatus };
      if (newReason !== null) updateData.reason = newReason;

      const { error } = await supabase.from('leave_requests').update(updateData).eq('id', reqId);
      if (error) throw error;
      
      setLeaveRequests(leaveRequests.map(r => {
        if (r.id === reqId) {
          return { ...r, status: newStatus, ...(newReason !== null && { reason: newReason }) };
        }
        return r;
      }));
      toast.success(`Request ${newStatus.toLowerCase()}`);
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    }
  };

  const deleteRequest = async (reqId) => {
    if (!window.confirm('Are you sure you want to delete this leave request?')) return;
    try {
      const { error } = await supabase.from('leave_requests').delete().eq('id', reqId);
      if (error) throw error;
      setLeaveRequests(leaveRequests.filter(r => r.id !== reqId));
      toast.success('Request deleted successfully');
    } catch (err) {
      console.error('Error deleting request:', err);
      toast.error('Failed to delete request');
    }
  };

  const openEditModal = (req) => {
    setNewRequest({
      id: req.id,
      empId: req.empId,
      type: req.type,
      from: req.from,
      to: req.to,
      reason: req.reason || '',
      status: req.status
    });
    setShowModal(true);
  };

  // Calculate taken leaves per employee
  const getTakenLeaves = (empId) => {
    const approved = leaveRequests.filter(r => r.empId === empId && r.status === 'Approved');
    const taken = { cl: 0, sl: 0, el: 0 };
    approved.forEach(r => {
      if(r.type === 'CL') taken.cl += r.days;
      if(r.type === 'SL') taken.sl += r.days;
      if(r.type === 'EL') taken.el += r.days;
    });
    return taken;
  };

  // Dashboard Stats
  const totalRequests = leaveRequests.length;
  const approvedRequests = leaveRequests.filter(r => r.status === 'Approved').length;
  const pendingRequests = leaveRequests.filter(r => r.status === 'Pending').length;

  let totalCLTaken = 0, totalSLTaken = 0, totalELTaken = 0;
  leaveRequests.filter(r => r.status === 'Approved').forEach(r => {
    if(r.type === 'CL') totalCLTaken += r.days;
    if(r.type === 'SL') totalSLTaken += r.days;
    if(r.type === 'EL') totalELTaken += r.days;
  });

  const chartData = [
    { name: 'Casual Leave', DaysTaken: totalCLTaken, fill: '#3b82f6' },
    { name: 'Sick Leave', DaysTaken: totalSLTaken, fill: '#ef4444' },
    { name: 'Earned Leave', DaysTaken: totalELTaken, fill: '#84cc16' },
  ];

  const thStyle = {
    border: '1px solid var(--border-color)',
    padding: '12px 10px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    fontWeight: 600,
    textTransform: 'none',
    whiteSpace: 'nowrap',
    backgroundColor: 'var(--bg-main)'
  };

  const tdStyle = {
    border: '1px solid var(--border-color)',
    padding: '10px 12px',
    fontSize: '0.9rem',
    textAlign: 'center'
  };

  const inputStyle = {
    width: '60px',
    height: '32px',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    textAlign: 'center',
    background: 'var(--bg-main)',
    color: 'var(--text-primary)',
    fontWeight: '600',
    outline: 'none'
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Leave Tracker</h1>
          <p className="page-subtitle">Manage Employee Leave Balance and Requests.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('Balance')}
          style={{
            padding: '12px 24px', background: 'none', border: 'none',
            borderBottom: activeTab === 'Balance' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'Balance' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: 600, cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s ease'
          }}
        >
          Leave Balance
        </button>
        <button
          onClick={() => setActiveTab('Requests')}
          style={{
            padding: '12px 24px', background: 'none', border: 'none',
            borderBottom: activeTab === 'Requests' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'Requests' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: 600, cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s ease'
          }}
        >
          Leave Requests
        </button>
        <button
          onClick={() => setActiveTab('Dashboard')}
          style={{
            padding: '12px 24px', background: 'none', border: 'none',
            borderBottom: activeTab === 'Dashboard' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'Dashboard' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: 600, cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s ease'
          }}
        >
          Dashboard
        </button>
      </div>

      {activeTab === 'Balance' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button className="btn-primary" onClick={saveAllotments} disabled={savingBalances} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {savingBalances ? <Loader size={16} className="spin" /> : <Save size={16} />} 
              {savingBalances ? 'Saving...' : 'Save Balances'}
            </button>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', textAlign: 'center', padding: '16px', fontWeight: 500, fontSize: '1.1rem', letterSpacing: '0.5px' }}>
              LEAVE BALANCE
            </div>
          
          <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 300px)', paddingBottom: '12px' }}>
            <table style={{ minWidth: '1000px', borderCollapse: 'collapse', margin: '0' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 4px -2px rgba(0,0,0,0.1)' }}>
                <tr>
                  <th rowSpan="2" style={{...thStyle, width: '60px', position: 'sticky', top: 0, zIndex: 11, backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)'}}>Sr. No.</th>
                  <th rowSpan="2" style={{...thStyle, textAlign: 'left', minWidth: '200px', position: 'sticky', top: 0, zIndex: 11, backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)'}}>Employee Name</th>
                  <th colSpan="3" style={{ ...thStyle, backgroundColor: '#eff6ff', color: 'var(--primary-color)', padding: '10px', borderBottom: '2px solid var(--primary-color)', position: 'sticky', top: 0, zIndex: 11 }}>Casual Leave (CL)</th>
                  <th colSpan="3" style={{ ...thStyle, backgroundColor: '#fef2f2', color: 'var(--danger)', padding: '10px', borderBottom: '2px solid var(--danger)', position: 'sticky', top: 0, zIndex: 11 }}>Sick Leave (SL)</th>
                  <th colSpan="3" style={{ ...thStyle, backgroundColor: '#ecfdf5', color: 'var(--success)', padding: '10px', borderBottom: '2px solid var(--success)', position: 'sticky', top: 0, zIndex: 11 }}>Earned Leave (EL)</th>
                  <th rowSpan="2" style={{...thStyle, backgroundColor: '#f8fafc', position: 'sticky', top: 0, zIndex: 11, borderBottom: '1px solid var(--border-color)'}}>Total<br/>Balance</th>
                </tr>
                <tr>
                  <th style={{...thStyle, position: 'sticky', top: '43px', zIndex: 10, backgroundColor: 'var(--bg-main)'}}>Allotted</th><th style={{...thStyle, position: 'sticky', top: '43px', zIndex: 10, backgroundColor: 'var(--bg-main)'}}>Taken</th><th style={{...thStyle, position: 'sticky', top: '43px', zIndex: 10, backgroundColor: 'var(--bg-main)'}}>Balance</th>
                  <th style={{...thStyle, position: 'sticky', top: '43px', zIndex: 10, backgroundColor: 'var(--bg-main)'}}>Allotted</th><th style={{...thStyle, position: 'sticky', top: '43px', zIndex: 10, backgroundColor: 'var(--bg-main)'}}>Taken</th><th style={{...thStyle, position: 'sticky', top: '43px', zIndex: 10, backgroundColor: 'var(--bg-main)'}}>Balance</th>
                  <th style={{...thStyle, position: 'sticky', top: '43px', zIndex: 10, backgroundColor: 'var(--bg-main)'}}>Allotted</th><th style={{...thStyle, position: 'sticky', top: '43px', zIndex: 10, backgroundColor: 'var(--bg-main)'}}>Taken</th><th style={{...thStyle, position: 'sticky', top: '43px', zIndex: 10, backgroundColor: 'var(--bg-main)'}}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {employees.length > 0 ? (
                  employees.map((emp, idx) => {
                    const allot = leaveAllotments[emp.id] || { cl: 0, sl: 0, el: 0 };
                    const taken = getTakenLeaves(emp.id);
                    const bal = {
                      cl: allot.cl - taken.cl,
                      sl: allot.sl - taken.sl,
                      el: allot.el - taken.el,
                    };
                    const totalBal = bal.cl + bal.sl + bal.el;

                    return (
                      <tr key={emp.id} style={{ backgroundColor: idx % 2 === 0 ? 'var(--bg-card)' : 'rgba(0,0,0,0.02)' }}>
                        <td style={{...tdStyle, color: 'var(--text-secondary)'}}>{idx + 1}</td>
                        <td style={{...tdStyle, textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)'}}>{emp.name}</td>
                        
                        {/* CL */}
                        <td style={{...tdStyle, padding: '4px'}}>
                          <input type="number" value={allot.cl} onChange={e => handleAllotmentChange(emp.id, 'cl', e.target.value)} style={inputStyle} />
                        </td>
                        <td style={{...tdStyle, color: 'var(--text-secondary)'}}>{taken.cl}</td>
                        <td style={{...tdStyle, fontWeight: '700', color: bal.cl > 0 ? 'var(--primary-color)' : 'var(--text-primary)'}}>{bal.cl}</td>

                        {/* SL */}
                        <td style={{...tdStyle, padding: '4px'}}>
                          <input type="number" value={allot.sl} onChange={e => handleAllotmentChange(emp.id, 'sl', e.target.value)} style={inputStyle} />
                        </td>
                        <td style={{...tdStyle, color: 'var(--text-secondary)'}}>{taken.sl}</td>
                        <td style={{...tdStyle, fontWeight: '700', color: bal.sl > 0 ? 'var(--danger)' : 'var(--text-primary)'}}>{bal.sl}</td>

                        {/* EL */}
                        <td style={{...tdStyle, padding: '4px'}}>
                          <input type="number" value={allot.el} onChange={e => handleAllotmentChange(emp.id, 'el', e.target.value)} style={inputStyle} />
                        </td>
                        <td style={{...tdStyle, color: 'var(--text-secondary)'}}>{taken.el}</td>
                        <td style={{...tdStyle, fontWeight: '700', color: bal.el > 0 ? 'var(--success)' : 'var(--text-primary)'}}>{bal.el}</td>

                        <td style={{...tdStyle, fontWeight: 800, color: totalBal > 0 ? 'var(--success)' : 'var(--danger)', backgroundColor: 'rgba(0,0,0,0.02)'}}>{totalBal}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="12" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>No employees found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 24px', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '24px', backgroundColor: 'var(--bg-main)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}></div>
              Allotted = Manual Entry
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.1)' }}></div>
              Taken/Balance = Auto (from 'Leave Requests' where Status = Approved)
            </div>
          </div>
          </div>
        </div>
      )}

      {activeTab === 'Requests' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button className="btn-primary" onClick={() => { setNewRequest({ empId: '', type: 'CL', from: '', to: '', reason: '', status: 'Pending' }); setShowModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} /> New Request
            </button>
          </div>
          
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', textAlign: 'center', padding: '16px', fontWeight: 500, fontSize: '1.1rem', letterSpacing: '0.5px' }}>
              LEAVE REQUESTS
            </div>
            
            <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', margin: '0' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 4px -2px rgba(0,0,0,0.1)' }}>
                  <tr>
                    <th style={{...thStyle, width: '60px', position: 'sticky', top: 0, backgroundColor: 'var(--bg-main)'}}>Sr. No.</th>
                    <th style={{...thStyle, textAlign: 'left', position: 'sticky', top: 0, backgroundColor: 'var(--bg-main)'}}>Employee Name</th>
                    <th style={{...thStyle, position: 'sticky', top: 0, backgroundColor: 'var(--bg-main)'}}>Leave<br/>Type</th>
                    <th style={{...thStyle, position: 'sticky', top: 0, backgroundColor: 'var(--bg-main)'}}>From Date</th>
                    <th style={{...thStyle, position: 'sticky', top: 0, backgroundColor: 'var(--bg-main)'}}>To Date</th>
                    <th style={{...thStyle, position: 'sticky', top: 0, backgroundColor: 'var(--bg-main)'}}>No. of<br/>Days</th>
                    <th style={{...thStyle, position: 'sticky', top: 0, backgroundColor: 'var(--bg-main)'}}>Status</th>
                    <th style={{...thStyle, textAlign: 'left', position: 'sticky', top: 0, backgroundColor: 'var(--bg-main)'}}>Reason / Remarks</th>
                    <th style={{...thStyle, position: 'sticky', top: 0, backgroundColor: 'var(--bg-main)'}}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.length > 0 ? (
                    leaveRequests.map((req, idx) => {
                      const emp = employees.find(e => e.id === req.empId);
                      return (
                        <tr key={req.id} style={{ backgroundColor: idx % 2 === 0 ? 'var(--bg-card)' : 'rgba(0,0,0,0.02)' }}>
                          <td style={tdStyle}>{idx + 1}</td>
                          <td style={{...tdStyle, textAlign: 'left', fontWeight: 600}}>{emp?.name || 'Unknown'}</td>
                          <td style={{...tdStyle, fontWeight: 'bold'}}>{req.type}</td>
                          <td style={tdStyle}>{req.from}</td>
                          <td style={tdStyle}>{req.to}</td>
                          <td style={{...tdStyle, fontWeight: 'bold'}}>{req.days}</td>
                          <td style={tdStyle}>
                            <span style={{ 
                              padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                              backgroundColor: req.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : req.status === 'Rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                              color: req.status === 'Approved' ? '#166534' : req.status === 'Rejected' ? '#dc2626' : '#b45309'
                            }}>
                              {req.status}
                            </span>
                          </td>
                          <td style={{...tdStyle, textAlign: 'left'}}>{req.reason || '-'}</td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                              {req.status === 'Pending' ? (
                                <>
                                  <button onClick={() => updateRequestStatus(req.id, 'Approved')} style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#166534', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.2)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)'}>
                                    Accept
                                  </button>
                                  <button onClick={() => setRejectModalData({ reqId: req.id, reason: '' })} style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}>
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => openEditModal(req)} style={{ padding: '6px', color: 'var(--primary-color)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.2s', borderRadius: '4px' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'} title="Edit">
                                    <Edit size={16} />
                                  </button>
                                  <button onClick={() => deleteRequest(req.id)} style={{ padding: '6px', color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.2s', borderRadius: '4px' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'} title="Delete">
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>No leave requests found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Dashboard' && (
        <div className="fade-in">
          <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '16px 24px', fontWeight: 500, fontSize: '1.1rem', borderRadius: '12px 12px 0 0', letterSpacing: '0.5px' }}>
            DASHBOARD — Leave Overview
          </div>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px 24px', border: '1px solid var(--border-color)', borderTop: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic', marginBottom: '24px', borderRadius: '0 0 12px 12px' }}>
            Auto-updates from 'Leave Requests'
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden', textAlign: 'center', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Total Requests</div>
              <div style={{ padding: '24px', backgroundColor: 'var(--bg-card)', color: '#b45309', fontWeight: 800, fontSize: '2rem' }}>{totalRequests}</div>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden', textAlign: 'center', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Approved</div>
              <div style={{ padding: '24px', backgroundColor: 'var(--bg-card)', color: 'var(--success)', fontWeight: 800, fontSize: '2rem' }}>{approvedRequests}</div>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden', textAlign: 'center', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Pending</div>
              <div style={{ padding: '24px', backgroundColor: 'var(--bg-card)', color: 'var(--danger)', fontWeight: 800, fontSize: '2rem' }}>{pendingRequests}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden', height: 'fit-content' }}>
              <div style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '12px 16px', fontWeight: 700, letterSpacing: '0.5px' }}>Leave Type Breakdown (Approved)</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-main)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '12px', textAlign: 'left', textTransform: 'none', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Leave Type</th>
                    <th style={{ padding: '12px', textAlign: 'right', textTransform: 'none', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Days Taken</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ backgroundColor: 'var(--bg-card)' }}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem', fontWeight: 500 }}>Casual Leave</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '0.95rem', textAlign: 'right', fontWeight: 600 }}>{totalCLTaken}</td>
                  </tr>
                  <tr style={{ backgroundColor: 'var(--bg-main)' }}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem', fontWeight: 500 }}>Sick Leave</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '0.95rem', textAlign: 'right', fontWeight: 600 }}>{totalSLTaken}</td>
                  </tr>
                  <tr style={{ backgroundColor: 'var(--bg-card)' }}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem', fontWeight: 500 }}>Earned Leave</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '0.95rem', textAlign: 'right', fontWeight: 600 }}>{totalELTaken}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '24px', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)', textAlign: 'center' }}>Leave Days by Type</h3>
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-secondary)' }} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }} />
                    <Tooltip 
                      formatter={(value) => `${value} Days`} 
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                    />
                    <Bar dataKey="DaysTaken" barSize={32} radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{newRequest.id ? 'Edit Leave Request' : 'New Leave Request'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={submitRequest} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label>Employee</label>
                <select value={newRequest.empId} onChange={e => setNewRequest({...newRequest, empId: e.target.value})} required>
                  <option value="">Select Employee</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              
              <div className="form-group">
                <label>Leave Type</label>
                <select value={newRequest.type} onChange={e => setNewRequest({...newRequest, type: e.target.value})} required>
                  <option value="CL">Casual Leave (CL)</option>
                  <option value="SL">Sick Leave (SL)</option>
                  <option value="EL">Earned Leave (EL)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>From Date</label>
                  <input type="date" value={newRequest.from} onChange={e => setNewRequest({...newRequest, from: e.target.value})} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>To Date</label>
                  <input type="date" value={newRequest.to} onChange={e => setNewRequest({...newRequest, to: e.target.value})} required min={newRequest.from} />
                </div>
              </div>

              <div className="form-group">
                <label>Reason / Remarks</label>
                <textarea value={newRequest.reason} onChange={e => setNewRequest({...newRequest, reason: e.target.value})} rows="3" style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px' }}></textarea>
              </div>

              {newRequest.id && (
                <div className="form-group">
                  <label>Status</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: newRequest.status === 'Pending' ? 'rgba(245, 158, 11, 0.1)' : 'transparent', color: newRequest.status === 'Pending' ? '#b45309' : 'var(--text-primary)' }}>
                      <input type="radio" name="status" value="Pending" checked={newRequest.status === 'Pending'} onChange={e => setNewRequest({...newRequest, status: e.target.value})} />
                      Pending
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: newRequest.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : 'transparent', color: newRequest.status === 'Approved' ? '#166534' : 'var(--text-primary)' }}>
                      <input type="radio" name="status" value="Approved" checked={newRequest.status === 'Approved'} onChange={e => setNewRequest({...newRequest, status: e.target.value})} />
                      Approved (Accept)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: newRequest.status === 'Rejected' ? 'rgba(239, 68, 68, 0.1)' : 'transparent', color: newRequest.status === 'Rejected' ? '#dc2626' : 'var(--text-primary)' }}>
                      <input type="radio" name="status" value="Rejected" checked={newRequest.status === 'Rejected'} onChange={e => setNewRequest({...newRequest, status: e.target.value})} />
                      Rejected (Reject)
                    </label>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-primary" style={{ backgroundColor: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={savingRequest} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {savingRequest ? <Loader size={16} className="spin" /> : null}
                  {newRequest.id ? 'Save Changes' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Request Modal */}
      {rejectModalData.reqId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 110,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '32px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Reject Leave Request</h2>
              <button onClick={() => setRejectModalData({ reqId: null, reason: '' })} style={{ background: 'var(--bg-main)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Reason for Rejection</label>
              <textarea 
                value={rejectModalData.reason} 
                onChange={(e) => setRejectModalData({ ...rejectModalData, reason: e.target.value })}
                rows="4"
                placeholder="Please explain why this request is being rejected..."
                style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-main)', fontSize: '0.95rem', resize: 'vertical' }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setRejectModalData({ reqId: null, reason: '' })} className="btn-primary" style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '10px 20px', fontWeight: 600 }}>
                Cancel
              </button>
              <button 
                onClick={() => {
                  if(!rejectModalData.reason.trim()) return toast.error('Please enter a rejection reason');
                  const req = leaveRequests.find(r => r.id === rejectModalData.reqId);
                  const updatedReason = req.reason ? `${req.reason} | Rejected: ${rejectModalData.reason}` : `Rejected: ${rejectModalData.reason}`;
                  updateRequestStatus(rejectModalData.reqId, 'Rejected', updatedReason);
                  setRejectModalData({ reqId: null, reason: '' });
                }} 
                className="btn-primary" 
                style={{ backgroundColor: 'var(--danger)', border: 'none', padding: '10px 24px', fontWeight: 600, boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)' }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
