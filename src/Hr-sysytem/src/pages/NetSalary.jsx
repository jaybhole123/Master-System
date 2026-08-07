import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { supabase } from '../lib/supabase';
import { Loader, GripVertical, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function NetSalary() {
  const [employees, , empLoading] = useEmployees();
  
  const [salaries, setSalaries] = useState({});
  const [settings, setSettings] = useState({ pf: 12, esic: 0.75, ptax: 200 });
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('Sheet');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedRows, setSelectedRows] = useState([]);

  const [visibleCols, setVisibleCols] = useState({
    empName: true, department: true, basic: true, hra: true, allowances: true,
    monthAdvance: true, gross: true, totalDays: true, present: true, absent: true, leaves: true,
    leaveDeduct: true, monthRecov: true, prevAdvDeduct: true, pf: true,
    esic: true, pTax: true, otherDeduct: true, totalDeduct: true, netSalary: true,
    paymentStatus: true, bankAcc: true
  });
  const [showColMenu, setShowColMenu] = useState(false);
  const toggleCol = (col) => setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }));
  
  const selectAllCols = (select) => {
    const newCols = {};
    Object.keys(visibleCols).forEach(k => newCols[k] = select);
    setVisibleCols(newCols);
  };

  // Drag scroll & row reorder state
  const tableRef = useRef(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [orderedIds, setOrderedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('hr_netsalary_row_order');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const handleMouseDown = (e) => {
    if (['BUTTON', 'INPUT', 'A', 'SVG', 'PATH'].includes(e.target.tagName)) return;
    if (!tableRef.current) return;
    setIsMouseDown(true);
    setStartX(e.pageX - tableRef.current.offsetLeft);
    setScrollLeft(tableRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsMouseDown(false);
  const handleMouseUp = () => setIsMouseDown(false);
  const handleMouseMove = (e) => {
    if (!isMouseDown || !tableRef.current) return;
    e.preventDefault();
    const x = e.pageX - tableRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    tableRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const currentList = records.map(r => r.id);
    const item = currentList[draggedIndex];
    currentList.splice(draggedIndex, 1);
    currentList.splice(index, 0, item);
    setDraggedIndex(index);
    setOrderedIds(currentList);
    try {
      localStorage.setItem('hr_netsalary_row_order', JSON.stringify(currentList));
    } catch (err) {}
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const isDataLoading = loading || empLoading;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salariesRes, settingsRes] = await Promise.all([
          supabase.from('salary_structures').select('*'),
          supabase.from('payroll_settings').select('*').limit(1).single()
        ]);

        if (salariesRes.error) throw salariesRes.error;
        
        const salMap = {};
        if (salariesRes.data) {
          salariesRes.data.forEach(s => {
            salMap[s.employee_id] = {
              basic: s.basic || 0,
              hra: s.hra || 0,
              allowances: s.allowances || 0,
              profTax: s.prof_tax || 0,
              otherDeductions: s.other_deductions || 0,
              paymentStatus: s.payment_status || 'Pending',
              bankAccount: s.bank_account || '',
              pfApplicable: s.pf_applicable !== false,
              esicApplicable: s.esic_applicable !== false,
              totalDays: s.total_days || 0,
              presentDays: s.present_days || 0,
              absent: s.absent || 0,
              leaves: s.leaves || 0,
              leaveDeduction: s.leave_deduction || 0,
              monthAdvance: s.month_advance || 0,
              monthRecovery: s.month_recovery || 0,
              prevAdvanceDeduction: s.prev_advance_deduction || 0
            };
          });
        }
        setSalaries(salMap);

        if (settingsRes.data) {
          setSettings({
            pf: settingsRes.data.pf_percentage || 12,
            ptax: settingsRes.data.ptax_amount || 200,
            esic: 0.75
          });
        }
      } catch (err) {
        console.error('Error fetching net salary data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const uniqueDepartments = useMemo(() => {
    const depts = employees.map(emp => emp.department).filter(Boolean);
    return [...new Set(depts)].sort();
  }, [employees]);

  const baseRecords = useMemo(() => {
    return employees.map(emp => {
      const sal = salaries[emp.id] || { basic: 0, hra: 0, allowances: 0, profTax: 0, otherDeductions: 0, paymentStatus: 'Pending', bankAccount: '', pfApplicable: true, esicApplicable: true, totalDays: 0, presentDays: 0, leaves: 0, leaveDeduction: 0, monthAdvance: 0, monthRecovery: 0, prevAdvanceDeduction: 0 };
      const gross = sal.basic + sal.hra + sal.allowances + sal.monthAdvance;
      
      // Deductions
      const pfDeduction = sal.pfApplicable ? (sal.basic * (settings.pf / 100)) : 0;
      const esicDeduction = sal.esicApplicable ? (gross * (settings.esic / 100)) : 0;
      const ptax = sal.profTax || 0;
      const otherDeduct = sal.otherDeductions || 0;
      const leaveDeduct = sal.leaveDeduction || 0;
      const monthRecov = sal.monthRecovery || 0;
      const prevAdvDeduct = sal.prevAdvanceDeduction || 0;

      const totalDeductions = pfDeduction + esicDeduction + ptax + otherDeduct + leaveDeduct + monthRecov + prevAdvDeduct;
      
      const net = gross - totalDeductions;

      return {
        id: emp.id,
        name: emp.name,
        department: emp.department,
        gross,
        deductions: totalDeductions,
        net: net > 0 ? net : 0,
        paymentStatus: sal.paymentStatus || 'Pending',
        bankAccount: sal.bankAccount || emp.accountNo || '',
        breakdown: {
          sal,
          pfDeduction,
          esicDeduction,
          ptax,
          empOtherDeductions: otherDeduct,
          leaveDeduct,
          monthRecov,
          prevAdvDeduct,
          monthAdvance: sal.monthAdvance
        }
      };
    });
  }, [employees, salaries, settings]);

  const records = useMemo(() => {
    let currentRecords = baseRecords;
    if (selectedDepartment !== 'All') {
      currentRecords = currentRecords.filter(r => r.department === selectedDepartment);
    }

    if (!orderedIds || orderedIds.length === 0) return currentRecords;
    
    const map = new Map(currentRecords.map(r => [r.id, r]));
    const result = [];
    orderedIds.forEach(id => {
      if (map.has(id)) {
        result.push(map.get(id));
        map.delete(id);
      }
    });
    return [...result, ...Array.from(map.values())];
  }, [baseRecords, orderedIds, selectedDepartment]);

  // Calculations
  const totalGross = records.reduce((acc, curr) => acc + curr.gross, 0);
  const totalNet = records.reduce((acc, curr) => acc + curr.net, 0);
  const totalPF = records.reduce((acc, curr) => acc + curr.breakdown.pfDeduction, 0);
  const totalESIC = records.reduce((acc, curr) => acc + curr.breakdown.esicDeduction, 0);
  const totalPTax = records.reduce((acc, curr) => acc + curr.breakdown.ptax, 0);
  const totalOtherDeduct = records.reduce((acc, curr) => acc + curr.breakdown.empOtherDeductions, 0);
  
  const totalLeaveDeduct = records.reduce((acc, curr) => acc + curr.breakdown.leaveDeduct, 0);
  const totalMonthAdvance = records.reduce((acc, curr) => acc + curr.breakdown.monthAdvance, 0);
  const totalMonthRecovery = records.reduce((acc, curr) => acc + curr.breakdown.monthRecov, 0);
  const totalPrevAdvDeduct = records.reduce((acc, curr) => acc + curr.breakdown.prevAdvDeduct, 0);
  
  const totalDeductions = records.reduce((acc, curr) => acc + curr.deductions, 0);
  const totalBasic = records.reduce((acc, curr) => acc + curr.breakdown.sal.basic, 0);
  const totalHra = records.reduce((acc, curr) => acc + curr.breakdown.sal.hra, 0);
  const totalAllowances = records.reduce((acc, curr) => acc + (curr.breakdown.sal.allowances || 0), 0);

  const chartData = records.map(rec => ({
    name: rec.name,
    NetSalary: rec.net
  }));

  const thStyle = {
    border: '1px solid var(--border-color)',
    padding: '12px 10px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    fontWeight: 500,
    textTransform: 'none',
    letterSpacing: 'normal',
    whiteSpace: 'nowrap',
    backgroundColor: 'var(--bg-main)',
    position: 'sticky',
    top: 0,
    zIndex: 10
  };

  const tdStyle = {
    border: '1px solid var(--border-color)',
    padding: '10px 12px',
    fontSize: '0.9rem',
    whiteSpace: 'nowrap'
  };

  const tdNumStyle = {
    ...tdStyle,
    textAlign: 'right',
    fontFamily: 'monospace',
    fontSize: '0.95rem',
    fontWeight: 400
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4');
    doc.setFontSize(16);
    doc.text('Salary Sheet - July 2026', 40, 40);
    
    const headers = [['Sr. No.']];
    if (visibleCols.empName) headers[0].push('Employee Name');
    if (visibleCols.department) headers[0].push('Department');
    if (visibleCols.basic) headers[0].push('Basic (Rs)');
    if (visibleCols.hra) headers[0].push('HRA (Rs)');
    if (visibleCols.allowances) headers[0].push('Allowances (Rs)');
    if (visibleCols.monthAdvance) headers[0].push('Advance (Rs)');
    if (visibleCols.gross) headers[0].push('Gross (Rs)');
    if (visibleCols.totalDays) headers[0].push('Days');
    if (visibleCols.present) headers[0].push('Present');
    if (visibleCols.absent) headers[0].push('Absent');
    if (visibleCols.leaves) headers[0].push('Leaves');
    if (visibleCols.leaveDeduct) headers[0].push('Leave Ded (Rs)');
    if (visibleCols.monthRecov) headers[0].push('Recovery (Rs)');
    if (visibleCols.prevAdvDeduct) headers[0].push('Prev Adv (Rs)');
    if (visibleCols.pf) headers[0].push('PF (Rs)');
    if (visibleCols.esic) headers[0].push('ESIC (Rs)');
    if (visibleCols.pTax) headers[0].push('PTax (Rs)');
    if (visibleCols.otherDeduct) headers[0].push('Other (Rs)');
    if (visibleCols.totalDeduct) headers[0].push('Total Ded (Rs)');
    if (visibleCols.netSalary) headers[0].push('Net (Rs)');
    if (visibleCols.paymentStatus) headers[0].push('Status');
    if (visibleCols.bankAcc) headers[0].push('Bank A/c');

    const pdfRecords = selectedRows.length > 0 ? records.filter(r => selectedRows.includes(r.id)) : records;
    const data = pdfRecords.map((rec, idx) => {
      const emp = employees.find(e => e.id === rec.id) || {};
      const row = [idx + 1];
      if (visibleCols.empName) row.push(rec.name);
      if (visibleCols.department) row.push(emp.department || '-');
      if (visibleCols.basic) row.push(rec.breakdown.sal.basic.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (visibleCols.hra) row.push(rec.breakdown.sal.hra.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (visibleCols.allowances) row.push((rec.breakdown.sal.allowances || 0).toLocaleString(undefined, {maximumFractionDigits:2}));
      if (visibleCols.monthAdvance) row.push(rec.breakdown.monthAdvance.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (visibleCols.gross) row.push(rec.gross.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (visibleCols.totalDays) row.push(rec.breakdown.sal.totalDays || 0);
      if (visibleCols.present) row.push(rec.breakdown.sal.presentDays || 0);
      if (visibleCols.absent) row.push(rec.breakdown.sal.absent || 0);
      if (visibleCols.leaves) row.push(rec.breakdown.sal.leaves || 0);
      if (visibleCols.leaveDeduct) row.push(rec.breakdown.leaveDeduct.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (visibleCols.monthRecov) row.push(rec.breakdown.monthRecov.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (visibleCols.prevAdvDeduct) row.push(rec.breakdown.prevAdvDeduct.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (visibleCols.pf) row.push(rec.breakdown.pfDeduction.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (visibleCols.esic) row.push(rec.breakdown.esicDeduction.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (visibleCols.pTax) row.push(rec.breakdown.ptax.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (visibleCols.otherDeduct) row.push((rec.breakdown.empOtherDeductions || 0).toLocaleString(undefined, {maximumFractionDigits:2}));
      if (visibleCols.totalDeduct) row.push(rec.deductions.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (visibleCols.netSalary) row.push(rec.net.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (visibleCols.paymentStatus) row.push(rec.paymentStatus);
      if (visibleCols.bankAcc) row.push(rec.bankAccount || '-');
      return row;
    });

    const chunks = [];
    for (let i = 0; i < data.length; i += 15) {
      chunks.push(data.slice(i, i + 15));
    }

    chunks.forEach((chunk, i) => {
      if (i > 0) {
        doc.addPage();
        doc.setFontSize(16);
        doc.text('Salary Sheet - July 2026', 40, 40);
      }
      autoTable(doc, {
        startY: 60,
        head: headers,
        body: chunk,
        margin: { bottom: 20, left: 20, right: 20 },
        pageBreak: 'avoid',
        styles: { 
          fontSize: 8, 
          cellPadding: 4,
          minCellHeight: 28,
          valign: 'middle',
          halign: 'center'
        },
        headStyles: { 
          fillColor: [220, 38, 38],
          textColor: 255,
          fontStyle: 'bold',
          valign: 'middle',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'center' },
          1: { halign: 'left' },
          2: { halign: 'left' }
        }
      });
    });

    doc.save('Salary_Sheet.pdf');
  };

  if (isDataLoading) {
    return (
      <div className="fade-in" style={{ padding: '24px' }}>
        <div className="page-header" style={{ marginBottom: '24px' }}>
          <h1 className="page-title">Salary & Payroll Dashboard</h1>
          <p className="page-subtitle">View Excel-style Salary Sheet and Payroll Summary Dashboard.</p>
        </div>
        <div className="card fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
          <Loader className="spin" size={32} color="var(--primary-color)" />
          <span style={{ marginLeft: '12px', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Loading salary data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Salary & Payroll Dashboard</h1>
          <p className="page-subtitle">View Excel-style Salary Sheet and Payroll Summary Dashboard.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('Sheet')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'Sheet' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'Sheet' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all 0.2s ease'
          }}
        >
          Salary Sheet
        </button>

        <button
          onClick={() => setActiveTab('Dashboard')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'Dashboard' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'Dashboard' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all 0.2s ease'
          }}
        >
          Dashboard
        </button>
      </div>

      {activeTab === 'Sheet' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          {/* Header of Excel Sheet */}
          <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', textAlign: 'center', padding: '16px', fontWeight: 500, fontSize: '1.1rem', letterSpacing: '0.5px' }}>
            SALARY SHEET
          </div>
          
          <div style={{ display: 'flex', gap: '32px', padding: '16px 24px', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Month</span>
              <div style={{ padding: '6px 16px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', borderRadius: '6px', fontWeight: 600 }}>July 2026</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>PF % (Employee)</span>
              <div style={{ padding: '6px 16px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', borderRadius: '6px', fontWeight: 600 }}>12%</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
              <button
                onClick={handleDownloadPDF}
                style={{ padding: '6px 12px', border: '1px solid var(--primary-color)', borderRadius: '6px', outline: 'none', backgroundColor: 'var(--primary-color)', color: 'white', cursor: 'pointer', fontWeight: 500, marginRight: '8px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', fontSize: '0.9rem' }}
              >
                <Download size={14} /> PDF
              </button>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button 
                  onClick={() => setShowColMenu(!showColMenu)}
                  style={{ padding: '6px 16px', border: '1px solid var(--border-color)', borderRadius: '6px', outline: 'none', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500, marginRight: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <GripVertical size={14} /> Columns
                </button>
                {showColMenu && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', zIndex: 50, width: '220px', padding: '12px', maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', textAlign: 'left' }}>Toggle Columns</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <button onClick={() => selectAllCols(true)} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.75rem', cursor: 'pointer', padding: 0, fontWeight: 500 }}>Select All</button>
                      <button onClick={() => selectAllCols(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', padding: 0, fontWeight: 500 }}>Deselect All</button>
                    </div>
                    {Object.keys(visibleCols).map(key => (
                      <div 
                        key={key} 
                        onClick={() => toggleCol(key)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', padding: '6px 4px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}
                      >
                        <input type="checkbox" checked={visibleCols[key]} readOnly style={{ cursor: 'pointer', margin: 0, width: '16px', height: '16px', flexShrink: 0 }} />
                        <span style={{ textAlign: 'left' }}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Department Filter</span>
              <select 
                value={selectedDepartment} 
                onChange={(e) => setSelectedDepartment(e.target.value)}
                style={{ padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', outline: 'none', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', cursor: 'pointer', minWidth: '150px' }}
              >
                <option value="All">All Departments</option>
                {uniqueDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          <div 
            ref={tableRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            style={{ 
              overflow: 'auto', 
              maxHeight: 'calc(100vh - 280px)', 
              paddingBottom: '12px',
              cursor: isMouseDown ? 'grabbing' : 'grab',
              userSelect: isMouseDown ? 'none' : 'auto'
            }}
          >
            <table style={{ minWidth: '1500px', borderCollapse: 'collapse', margin: '0' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 4px -2px rgba(0,0,0,0.1)' }}>
                <tr>
                  <th style={{...thStyle, width: '40px'}}>
                    <input 
                      type="checkbox" 
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      checked={records.length > 0 && selectedRows.length === records.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedRows(records.map(r => r.id));
                        else setSelectedRows([]);
                      }}
                    />
                  </th>
                  <th style={{...thStyle, width: '28px'}}></th>
                  <th style={{...thStyle, width: '60px'}}>Sr. No.</th>
                  {visibleCols.empName && <th style={thStyle}>Employee Name</th>}
                  {visibleCols.department && <th style={thStyle}>Department</th>}
                  {visibleCols.basic && <th style={thStyle}>Basic Salary (₹)</th>}
                  {visibleCols.hra && <th style={thStyle}>HRA (₹)</th>}
                  {visibleCols.allowances && <th style={thStyle}>Allowances (₹)</th>}
                  {visibleCols.monthAdvance && <th style={thStyle}>Month Advance (₹)</th>}
                  {visibleCols.gross && <th style={{...thStyle, backgroundColor: '#f8fafc'}}>Gross Salary (₹)</th>}
                  {visibleCols.totalDays && <th style={thStyle}>Total Days</th>}
                  {visibleCols.present && <th style={thStyle}>Present</th>}
                  {visibleCols.absent && <th style={thStyle}>Absent</th>}
                  {visibleCols.leaves && <th style={thStyle}>Leaves</th>}
                  {visibleCols.leaveDeduct && <th style={thStyle}>Leave Deduct (₹)</th>}
                  {visibleCols.monthRecov && <th style={thStyle}>Month Recovery (₹)</th>}
                  {visibleCols.prevAdvDeduct && <th style={thStyle}>Prev Adv Deduct (₹)</th>}
                  {visibleCols.pf && <th style={thStyle}>PF (₹)</th>}
                  {visibleCols.esic && <th style={thStyle}>ESIC (₹)</th>}
                  {visibleCols.pTax && <th style={thStyle}>Prof. Tax (₹)</th>}
                  {visibleCols.otherDeduct && <th style={thStyle}>Other Deduct. (₹)</th>}
                  {visibleCols.totalDeduct && <th style={{...thStyle, backgroundColor: '#f8fafc'}}>Total Deduct. (₹)</th>}
                  {visibleCols.netSalary && <th style={{...thStyle, backgroundColor: '#ecfdf5'}}>Net Salary (₹)</th>}
                  {visibleCols.paymentStatus && <th style={thStyle}>Payment Status</th>}
                  {visibleCols.bankAcc && <th style={thStyle}>Bank A/c No.</th>}
                </tr>
              </thead>
              <tbody>
                {records.length > 0 ? (
                  records.map((rec, idx) => {
                    const emp = employees.find(e => e.id === rec.id) || {};
                    const allowances = rec.breakdown.sal.allowances || 0;
                    const otherDeduct = rec.breakdown.empOtherDeductions || 0;

                    return (
                      <tr 
                        key={rec.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                        style={{ 
                          backgroundColor: idx % 2 === 0 ? 'var(--bg-card)' : 'rgba(0,0,0,0.02)',
                          opacity: draggedIndex === idx ? 0.4 : 1,
                          cursor: 'grab',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <td style={{...tdStyle, textAlign: 'center'}}>
                          <input 
                            type="checkbox" 
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                            checked={selectedRows.includes(rec.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedRows([...selectedRows, rec.id]);
                              else setSelectedRows(selectedRows.filter(id => id !== rec.id));
                            }}
                          />
                        </td>
                        <td style={{...tdStyle, textAlign: 'center', color: '#9ca3af', cursor: 'grab', paddingRight: '4px' }} title="Drag to reorder">
                          <GripVertical size={16} />
                        </td>
                        <td style={{...tdStyle, textAlign: 'center', color: 'var(--text-secondary)'}}>{idx + 1}</td>
                        {visibleCols.empName && <td style={{...tdStyle, fontWeight: 500, color: 'var(--text-primary)'}}>{rec.name}</td>}
                        {visibleCols.department && <td style={{...tdStyle, color: 'var(--text-secondary)'}}>{emp.department || '-'}</td>}
                        {visibleCols.basic && <td style={tdNumStyle}>{rec.breakdown.sal.basic.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                        {visibleCols.hra && <td style={tdNumStyle}>{rec.breakdown.sal.hra.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                        {visibleCols.allowances && <td style={tdNumStyle}>{allowances.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                        {visibleCols.monthAdvance && <td style={tdNumStyle}>{rec.breakdown.monthAdvance.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                        {visibleCols.gross && <td style={{...tdNumStyle, fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'rgba(0,0,0,0.02)'}}>{rec.gross.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                        {visibleCols.totalDays && <td style={{...tdNumStyle, textAlign: 'center'}}>{rec.breakdown.sal.totalDays || 0}</td>}
                        {visibleCols.present && <td style={{...tdNumStyle, textAlign: 'center'}}>{rec.breakdown.sal.presentDays || 0}</td>}
                        {visibleCols.absent && <td style={{...tdNumStyle, textAlign: 'center'}}>{rec.breakdown.sal.absent || 0}</td>}
                        {visibleCols.leaves && <td style={{...tdNumStyle, textAlign: 'center'}}>{rec.breakdown.sal.leaves || 0}</td>}
                        {visibleCols.leaveDeduct && <td style={{...tdNumStyle, color: 'var(--danger)'}}>{rec.breakdown.leaveDeduct.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                        {visibleCols.monthRecov && <td style={{...tdNumStyle, color: 'var(--danger)'}}>{rec.breakdown.monthRecov.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                        {visibleCols.prevAdvDeduct && <td style={{...tdNumStyle, color: 'var(--danger)'}}>{rec.breakdown.prevAdvDeduct.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                        {visibleCols.pf && <td style={{...tdNumStyle, color: 'var(--danger)'}}>{rec.breakdown.pfDeduction.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                        {visibleCols.esic && <td style={{...tdNumStyle, color: 'var(--danger)'}}>{rec.breakdown.esicDeduction.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                        {visibleCols.pTax && <td style={{...tdNumStyle, color: 'var(--danger)'}}>{rec.breakdown.ptax.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                        {visibleCols.otherDeduct && <td style={{...tdNumStyle, color: 'var(--danger)'}}>{otherDeduct.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                        {visibleCols.totalDeduct && <td style={{...tdNumStyle, color: 'var(--danger)', fontWeight: 600, backgroundColor: 'rgba(239, 68, 68, 0.05)'}}>{rec.deductions.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                        {visibleCols.netSalary && <td style={{...tdNumStyle, color: 'var(--success)', fontWeight: 600, fontSize: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.05)'}}>{rec.net.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                        {visibleCols.paymentStatus && <td style={{...tdStyle, textAlign: 'center'}}>
                          <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', backgroundColor: rec.paymentStatus === 'Processed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: rec.paymentStatus === 'Processed' ? 'var(--success)' : '#d97706', fontWeight: 500 }}>{rec.paymentStatus}</span>
                        </td>}
                        {visibleCols.bankAcc && <td style={{...tdStyle, textAlign: 'center', fontFamily: 'monospace', letterSpacing: '1px'}}>{rec.bankAccount || '-'}</td>}
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="16" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>No employees found to display salary data.</td></tr>
                )}
                {records.length > 0 && (
                  <tr style={{ backgroundColor: 'var(--bg-main)' }}>
                    <td colSpan={3 + (visibleCols.empName ? 1 : 0) + (visibleCols.department ? 1 : 0)} style={{ border: '1px solid var(--border-color)', padding: '16px', textAlign: 'right', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>TOTAL</td>
                    {visibleCols.basic && <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600}}>₹ {totalBasic.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                    {visibleCols.hra && <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600}}>₹ {totalHra.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                    {visibleCols.allowances && <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600}}>₹ {totalAllowances.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                    {visibleCols.monthAdvance && <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600}}>₹ {totalMonthAdvance.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                    {visibleCols.gross && <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'rgba(0,0,0,0.02)'}}>₹ {totalGross.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                    {visibleCols.totalDays && <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600}}>-</td>}
                    {visibleCols.present && <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600}}>-</td>}
                    {visibleCols.absent && <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600}}>-</td>}
                    {visibleCols.leaves && <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600}}>-</td>}
                    {visibleCols.leaveDeduct && <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--danger)'}}>₹ {totalLeaveDeduct.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                    {visibleCols.monthRecov && <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--danger)'}}>₹ {totalMonthRecovery.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                    {visibleCols.prevAdvDeduct && <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--danger)'}}>₹ {totalPrevAdvDeduct.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                    {visibleCols.pf && <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--danger)'}}>₹ {totalPF.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                    {visibleCols.esic && <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--danger)'}}>₹ {totalESIC.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                    {visibleCols.pTax && <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--danger)'}}>₹ {totalPTax.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                    {visibleCols.otherDeduct && <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--danger)'}}>₹ {totalOtherDeduct.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                    {visibleCols.totalDeduct && <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.05)'}}>₹ {totalDeductions.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                    {visibleCols.netSalary && <td style={{...tdNumStyle, border: '1px solid var(--border-color)', fontWeight: 700, color: 'var(--success)', fontSize: '1.05rem', backgroundColor: 'rgba(16, 185, 129, 0.05)'}}>₹ {totalNet.toLocaleString(undefined, {maximumFractionDigits:2})}</td>}
                    {visibleCols.paymentStatus && <td style={{ border: '1px solid var(--border-color)' }}></td>}
                    {visibleCols.bankAcc && <td style={{ border: '1px solid var(--border-color)' }}></td>}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {activeTab === 'Dashboard' && (
        <div className="fade-in">
          {/* Dashboard Header */}
          <div style={{ backgroundColor: '#0f172a', color: 'white', padding: '16px 24px', fontWeight: 700, fontSize: '1.25rem', borderRadius: '12px 12px 0 0', letterSpacing: '0.5px' }}>
            DASHBOARD — Payroll Summary
          </div>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px 24px', border: '1px solid var(--border-color)', borderTop: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic', marginBottom: '24px', borderRadius: '0 0 12px 12px' }}>
            Auto-updates from 'Salary Sheet'
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden', textAlign: 'center', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Total Employees</div>
              <div style={{ padding: '24px', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 800, fontSize: '2rem' }}>{records.length}</div>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden', textAlign: 'center', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Total Gross Payroll</div>
              <div style={{ padding: '24px', backgroundColor: 'var(--bg-card)', color: 'var(--primary-color)', fontWeight: 800, fontSize: '2rem' }}>₹ {totalGross.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden', textAlign: 'center', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Total Net Payroll</div>
              <div style={{ padding: '24px', backgroundColor: 'var(--bg-card)', color: 'var(--success)', fontWeight: 800, fontSize: '2rem' }}>₹ {totalNet.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            {/* Employee-wise Net Salary Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', height: 'fit-content' }}>
              <div style={{ backgroundColor: '#0f172a', color: 'white', padding: '12px 16px', fontWeight: 700, letterSpacing: '0.5px' }}>Employee-wise Net Salary</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e293b', color: 'white', fontSize: '0.85rem' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #334155', textTransform: 'none', color: 'white' }}>Employee</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #334155', textTransform: 'none', color: 'white' }}>Net Salary (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec, idx) => (
                    <tr key={rec.id} style={{ backgroundColor: idx % 2 === 0 ? 'var(--bg-main)' : 'var(--bg-card)' }}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem', fontWeight: 500 }}>{rec.name}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '0.95rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: 'var(--success)' }}>{rec.net.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                    </tr>
                  ))}
                  {/* Fill empty rows */}
                  {[...Array(Math.max(0, 10 - records.length))].map((_, idx) => (
                    <tr key={`empty-${idx}`} style={{ backgroundColor: (records.length + idx) % 2 === 0 ? 'var(--bg-main)' : 'var(--bg-card)' }}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', color: 'transparent' }}>-</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', color: 'transparent' }}>-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Chart */}
            <div className="card">
              <h3 style={{ marginBottom: '24px', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Net Salary by Employee</h3>
              {records.length > 0 ? (
                <div style={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                      <XAxis type="number" tick={{ fill: 'var(--text-secondary)' }} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }} />
                      <Tooltip 
                        formatter={(value) => `₹ ${value.toLocaleString()}`} 
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                        itemStyle={{ color: 'var(--primary-color)', fontWeight: 700 }}
                      />
                      <Bar dataKey="NetSalary" fill="#3b82f6" barSize={24} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  No data to display chart.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
