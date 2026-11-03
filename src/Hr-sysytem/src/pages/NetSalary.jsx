import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { supabase } from '../lib/supabase';
import { Loader, GripVertical, Download, CheckCircle2, X, FileSpreadsheet, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const getDesignationStyle = (desg) => {
  if (!desg) return { color: 'var(--text-secondary)' };
  const d = desg.toUpperCase().trim();
  switch (d) {
    case 'HELPING HANDS': return { backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
    case 'JAI BHOLE ENTERPRISE':
    case 'JAI BHOLE ENTERPRISES': return { backgroundColor: '#d9ed92', color: '#3f6212', border: '1px solid #c7e574', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
    case 'ASAK COAL PVT.LTD.': return { backgroundColor: '#d1fae5', color: '#047857', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
    case 'JAI BHOLE LOGISTICS': return { backgroundColor: '#ede9fe', color: '#6d28d9', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
    case 'BOTIVATE': return { backgroundColor: '#ffe4e6', color: '#be123c', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
    case 'JAI BHOLE TRADERS': return { backgroundColor: '#ffedd5', color: '#c2410c', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
    case 'ASAK COAL LOGISTICS': return { backgroundColor: '#ccfbf1', color: '#0f766e', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
    default: return { backgroundColor: '#f3f4f6', color: '#4b5563', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
  }
};

const getDesignationSortOrder = (desg) => {
  if (!desg) return 99; // empty at the bottom
  const d = desg.toUpperCase().trim();
  if (d === 'JAI BHOLE') return 1;
  if (d.includes('JAI BHOLE ENTERPRISE')) return 2; // matches ENTERPRISE or ENTERPRISES
  if (d.includes('JAI BHOLE LOGISTIC')) return 3;
  if (d.includes('JAI BHOLE TRADER')) return 4;
  if (d.includes('ASAK COAL PVT') || (d.includes('ASAK') && !d.includes('LOGISTIC'))) return 5;
  if (d.includes('HELPING HAND')) return 6;
  if (d.includes('BOTIVATE')) return 7;
  return 90; // other unlisted before empty
};

export default function NetSalary() {
  const [employees, , empLoading] = useEmployees();
  
  const [salaries, setSalaries] = useState({});
  const [settings, setSettings] = useState({ pf: 12, esic: 0.75, ptax: 200 });
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('Sheet');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedSalaryDate, setSelectedSalaryDate] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedDesignation, setSelectedDesignation] = useState('All');
  const [selectedRows, setSelectedRows] = useState([]);

  const [visibleCols, setVisibleCols] = useState({
    empName: true, department: true, designation: true, salaryDate: true, salaryMonth: true, basic: true, hra: false, allowances: false,
    monthAdvance: false, gross: true, totalDays: true, present: true, absent: true, leaves: true,
    leaveDeduct: true, monthRecov: false, prevAdvDeduct: false, pf: false,
    esic: false, pTax: false, otherDeduct: false, totalDeduct: true, netSalary: true,
    paymentStatus: true, bankAcc: true
  });
  const [showColMenu, setShowColMenu] = useState(false);
  const colMenuRef = useRef(null);

  // Export column selection modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState('excel'); // 'excel' or 'pdf'
  const [exportCols, setExportCols] = useState({ ...visibleCols });

  const openExportModal = (type) => {
    setExportType(type);
    setExportCols({ ...visibleCols });
    setExportModalOpen(true);
  };

  const toggleExportCol = (col) => {
    setExportCols(prev => ({ ...prev, [col]: !prev[col] }));
  };

  const selectAllExportCols = (select) => {
    const updated = {};
    Object.keys(exportCols).forEach(k => updated[k] = select);
    setExportCols(updated);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colMenuRef.current && !colMenuRef.current.contains(event.target)) {
        setShowColMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  const isDataLoading = loading || empLoading;

  const fetchSalaries = async () => {
    try {
      const salariesRes = await supabase.from('salary_structures').select('*');
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
            prevAdvanceDeduction: s.prev_advance_deduction || 0,
            salaryDate: s.salary_date || '',
            salaryMonth: s.salary_month || ''
          };
        });
      }
      setSalaries(salMap);
    } catch (err) {
      console.error('Error fetching salaries data:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const settingsRes = await supabase.from('payroll_settings').select('*').limit(1).single();
      if (settingsRes.error) throw settingsRes.error;
      
      if (settingsRes.data) {
        setSettings({
          pf: settingsRes.data.pf_percentage || 12,
          ptax: settingsRes.data.ptax_amount || 200,
          esic: 0.75
        });
      }
    } catch (err) {
      console.error('Error fetching settings data:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSalaries(), fetchSettings()]).finally(() => setLoading(false));
  }, []);

  const uniqueDepartments = useMemo(() => {
    const depts = employees.map(emp => emp.department).filter(Boolean);
    return [...new Set(depts)].sort();
  }, [employees]);

  const uniqueDesignations = useMemo(() => {
    const desgs = employees.map(emp => emp.designation).filter(Boolean);
    const unique = [...new Set(desgs)];
    return unique.sort((a, b) => getDesignationSortOrder(a) - getDesignationSortOrder(b));
  }, [employees]);

  const uniqueMonths = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const uniqueSalaryDates = useMemo(() => {
    const dates = Object.values(salaries).map(s => s.salaryDate).filter(Boolean);
    return [...new Set(dates)].sort((a, b) => new Date(b) - new Date(a));
  }, [salaries]);

  const baseRecords = useMemo(() => {
    return employees.map(emp => {
      const defaultSal = { basic: 0, hra: 0, allowances: 0, profTax: 0, otherDeductions: 0, paymentStatus: 'Pending', bankAccount: '', pfApplicable: true, esicApplicable: true, totalDays: 0, presentDays: 0, leaves: 0, leaveDeduction: 0, monthAdvance: 0, monthRecovery: 0, prevAdvanceDeduction: 0 };
      const sal = { ...defaultSal, ...(salaries[emp.id] || {}) };
      // Auto-correct old data where present days wasn't deducted
      if (sal.totalDays > 0) {
        const absVal = sal.absent || 0;
        const levVal = sal.leaves || 0;
        if ((sal.presentDays + absVal + levVal) > sal.totalDays) {
          sal.presentDays = Math.max(0, sal.totalDays - absVal - levVal);
        }
      }

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
        designation: emp.designation,
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
    if (selectedDesignation !== 'All') {
      currentRecords = currentRecords.filter(r => r.designation === selectedDesignation);
    }
    if (selectedSalaryDate !== 'All') {
      currentRecords = currentRecords.filter(r => r.breakdown.sal.salaryDate === selectedSalaryDate);
    }
    if (selectedMonth !== 'All') {
      currentRecords = currentRecords.filter(r => r.breakdown.sal.salaryMonth === selectedMonth);
    }

    return [...currentRecords].sort((a, b) => {
      const orderA = getDesignationSortOrder(a.designation);
      const orderB = getDesignationSortOrder(b.designation);
      if (orderA !== orderB) return orderA - orderB;

      // Secondary sort by name alphabetically
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [baseRecords, selectedDepartment, selectedDesignation, selectedSalaryDate, selectedMonth]);

  const [markingDone, setMarkingDone] = useState(false);

  const handleMarkAllDone = async () => {
    if (selectedRows.length === 0) {
      alert("Please select at least one employee.");
      return;
    }

    if (!window.confirm(`Are you sure you want to mark payment status as 'Done' for the ${selectedRows.length} selected employee(s)?`)) return;
    
    setMarkingDone(true);
    try {
      const employeeIds = selectedRows;
      
      const upsertData = employeeIds.map(id => {
        const sal = salaries[id] || {};
        return {
          employee_id: id,
          basic: sal.basic || 0,
          hra: sal.hra || 0,
          allowances: sal.allowances || 0,
          prof_tax: sal.profTax || 0,
          other_deductions: sal.otherDeductions || 0,
          payment_status: 'Done',
          bank_account: sal.bankAccount || '',
          pf_applicable: sal.pfApplicable || false,
          esic_applicable: sal.esicApplicable || false,
          total_days: sal.totalDays || 0,
          present_days: sal.presentDays || 0,
          absent: sal.absent || 0,
          leaves: sal.leaves || 0,
          leave_deduction: sal.leaveDeduction || 0,
          month_advance: sal.monthAdvance || 0,
          month_recovery: sal.monthRecovery || 0,
          prev_advance_deduction: sal.prevAdvanceDeduction || 0,
          salary_date: sal.salaryDate || null,
          salary_month: sal.salaryMonth || null
        };
      });
      
      const { error } = await supabase.from('salary_structures').upsert(upsertData, { onConflict: 'employee_id' });
      if (error) throw error;
      
      const updatedSalaries = { ...salaries };
      employeeIds.forEach(id => {
        if (updatedSalaries[id]) {
          updatedSalaries[id].paymentStatus = 'Done';
        } else {
          updatedSalaries[id] = { paymentStatus: 'Done' };
        }
      });
      setSalaries(updatedSalaries);
      
      alert('Successfully marked all as Done!');
    } catch (error) {
      console.error('Error marking as done:', error);
      alert('Failed to update payment status.');
    } finally {
      setMarkingDone(false);
    }
  };

  const handleToggleSinglePaymentStatus = async (employeeId, currentStatus) => {
    const newStatus = currentStatus === 'Pending' ? 'Done' : 'Pending';
    try {
      const sal = salaries[employeeId] || {};
      const upsertData = {
        employee_id: employeeId,
        basic: sal.basic || 0,
        hra: sal.hra || 0,
        allowances: sal.allowances || 0,
        prof_tax: sal.profTax || 0,
        other_deductions: sal.otherDeductions || 0,
        payment_status: newStatus,
        bank_account: sal.bankAccount || '',
        pf_applicable: sal.pfApplicable || false,
        esic_applicable: sal.esicApplicable || false,
        total_days: sal.totalDays || 0,
        present_days: sal.presentDays || 0,
        absent: sal.absent || 0,
        leaves: sal.leaves || 0,
        leave_deduction: sal.leaveDeduction || 0,
        month_advance: sal.monthAdvance || 0,
        month_recovery: sal.monthRecovery || 0,
        prev_advance_deduction: sal.prevAdvanceDeduction || 0,
        salary_date: sal.salaryDate || null,
        salary_month: sal.salaryMonth || null
      };

      const { error } = await supabase.from('salary_structures').upsert(upsertData, { onConflict: 'employee_id' });
      if (error) throw error;

      setSalaries(prev => ({
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          paymentStatus: newStatus
        }
      }));
    } catch (err) {
      console.error('Error toggling payment status:', err);
      alert('Failed to update payment status.');
    }
  };

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

  const deptDataMap = records.reduce((acc, curr) => {
    const dept = curr.department || 'Unassigned';
    acc[dept] = (acc[dept] || 0) + curr.net;
    return acc;
  }, {});
  
  const deptAnalysisData = Object.keys(deptDataMap).map(key => ({
    name: key,
    value: deptDataMap[key]
  })).sort((a, b) => b.value - a.value);
  
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

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
    doc.text(`Salary Sheet - ${selectedMonth === 'All' ? 'All Months' : selectedMonth}`, 40, 40);
    
    const headers = [['Sr. No.']];
    if (exportCols.empName) headers[0].push('Employee Name');
    if (exportCols.department) headers[0].push('Department');
    if (exportCols.designation) headers[0].push('Designation');
    if (exportCols.salaryDate) headers[0].push('Salary Date');
    if (exportCols.salaryMonth) headers[0].push('Salary Month');
    if (exportCols.basic) headers[0].push('Basic (Rs)');
    if (exportCols.hra) headers[0].push('HRA (Rs)');
    if (exportCols.allowances) headers[0].push('Allowances (Rs)');
    if (exportCols.monthAdvance) headers[0].push('Advance (Rs)');
    if (exportCols.gross) headers[0].push('Gross (Rs)');
    if (exportCols.totalDays) headers[0].push('Days');
    if (exportCols.present) headers[0].push('Present');
    if (exportCols.absent) headers[0].push('Absent');
    if (exportCols.leaves) headers[0].push('Leaves');
    if (exportCols.leaveDeduct) headers[0].push('Leave Ded (Rs)');
    if (exportCols.monthRecov) headers[0].push('Recovery (Rs)');
    if (exportCols.prevAdvDeduct) headers[0].push('Prev Adv (Rs)');
    if (exportCols.pf) headers[0].push('PF (Rs)');
    if (exportCols.esic) headers[0].push('ESIC (Rs)');
    if (exportCols.pTax) headers[0].push('PTax (Rs)');
    if (exportCols.otherDeduct) headers[0].push('Other (Rs)');
    if (exportCols.totalDeduct) headers[0].push('Total Ded (Rs)');
    if (exportCols.netSalary) headers[0].push('Net (Rs)');
    if (exportCols.paymentStatus) headers[0].push('Status');
    if (exportCols.bankAcc) headers[0].push('Bank A/c');

    const pdfRecords = selectedRows.length > 0 ? records.filter(r => selectedRows.includes(r.id)) : records;
    const data = pdfRecords.map((rec, idx) => {
      const emp = employees.find(e => e.id === rec.id) || {};
      const row = [idx + 1];
      if (exportCols.empName) row.push(rec.name);
      if (exportCols.department) row.push(emp.department || '-');
      if (exportCols.designation) row.push(emp.designation || '-');
      if (exportCols.salaryDate) row.push(rec.breakdown.sal.salaryDate ? new Date(rec.breakdown.sal.salaryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
      if (exportCols.salaryMonth) row.push(rec.breakdown.sal.salaryMonth || '-');
      if (exportCols.basic) row.push(rec.breakdown.sal.basic.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (exportCols.hra) row.push(rec.breakdown.sal.hra.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (exportCols.allowances) row.push((rec.breakdown.sal.allowances || 0).toLocaleString(undefined, {maximumFractionDigits:2}));
      if (exportCols.monthAdvance) row.push(rec.breakdown.monthAdvance.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (exportCols.gross) row.push(rec.gross.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (exportCols.totalDays) row.push(rec.breakdown.sal.totalDays || 0);
      if (exportCols.present) row.push(rec.breakdown.sal.presentDays || 0);
      if (exportCols.absent) row.push(rec.breakdown.sal.absent || 0);
      if (exportCols.leaves) row.push(rec.breakdown.sal.leaves || 0);
      if (exportCols.leaveDeduct) row.push(rec.breakdown.leaveDeduct.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (exportCols.monthRecov) row.push(rec.breakdown.monthRecov.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (exportCols.prevAdvDeduct) row.push(rec.breakdown.prevAdvDeduct.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (exportCols.pf) row.push(rec.breakdown.pfDeduction.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (exportCols.esic) row.push(rec.breakdown.esicDeduction.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (exportCols.pTax) row.push(rec.breakdown.ptax.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (exportCols.otherDeduct) row.push((rec.breakdown.empOtherDeductions || 0).toLocaleString(undefined, {maximumFractionDigits:2}));
      if (exportCols.totalDeduct) row.push(rec.deductions.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (exportCols.netSalary) row.push(rec.net.toLocaleString(undefined, {maximumFractionDigits:2}));
      if (exportCols.paymentStatus) row.push(rec.paymentStatus);
      if (exportCols.bankAcc) row.push(rec.bankAccount || '-');
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
        doc.text(`Salary Sheet - ${selectedMonth === 'All' ? 'All Months' : selectedMonth}`, 40, 40);
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
    setExportModalOpen(false);
  };

  const handleDownloadExcel = () => {
    const exportRecords = selectedRows.length > 0 ? records.filter(r => selectedRows.includes(r.id)) : records;
    
    const rows = exportRecords.map((rec, idx) => {
      const emp = employees.find(e => e.id === rec.id) || {};
      const row = { 'Sr. No.': idx + 1 };
      
      if (exportCols.empName) row['Employee Name'] = rec.name;
      if (exportCols.department) row['Department'] = emp.department || '-';
      if (exportCols.designation) row['Firm / Designation'] = emp.designation || '-';
      if (exportCols.salaryDate) row['Salary Date'] = rec.breakdown.sal.salaryDate ? new Date(rec.breakdown.sal.salaryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
      if (exportCols.salaryMonth) row['Salary Month'] = rec.breakdown.sal.salaryMonth || '-';
      if (exportCols.basic) row['Basic (Rs)'] = rec.breakdown.sal.basic;
      if (exportCols.hra) row['HRA (Rs)'] = rec.breakdown.sal.hra;
      if (exportCols.allowances) row['Allowances (Rs)'] = rec.breakdown.sal.allowances || 0;
      if (exportCols.monthAdvance) row['Advance (Rs)'] = rec.breakdown.monthAdvance;
      if (exportCols.gross) row['Gross (Rs)'] = rec.gross;
      if (exportCols.totalDays) row['Total Days'] = rec.breakdown.sal.totalDays || 0;
      if (exportCols.present) row['Present Days'] = rec.breakdown.sal.presentDays || 0;
      if (exportCols.absent) row['Absent Days'] = rec.breakdown.sal.absent || 0;
      if (exportCols.leaves) row['Leaves'] = rec.breakdown.sal.leaves || 0;
      if (exportCols.leaveDeduct) row['Leave Deduction (Rs)'] = rec.breakdown.leaveDeduct;
      if (exportCols.monthRecov) row['Recovery (Rs)'] = rec.breakdown.monthRecov;
      if (exportCols.prevAdvDeduct) row['Prev Advance Deduction (Rs)'] = rec.breakdown.prevAdvDeduct;
      if (exportCols.pf) row['PF Deduction (Rs)'] = rec.breakdown.pfDeduction;
      if (exportCols.esic) row['ESIC Deduction (Rs)'] = rec.breakdown.esicDeduction;
      if (exportCols.pTax) row['PTax (Rs)'] = rec.breakdown.ptax;
      if (exportCols.otherDeduct) row['Other Deductions (Rs)'] = rec.breakdown.empOtherDeductions || 0;
      if (exportCols.totalDeduct) row['Total Deduction (Rs)'] = rec.deductions;
      if (exportCols.netSalary) row['Net Salary (Rs)'] = rec.net;
      if (exportCols.paymentStatus) row['Status'] = rec.paymentStatus;
      if (exportCols.bankAcc) row['Bank Account'] = rec.bankAccount || '-';

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Sheet');
    XLSX.writeFile(workbook, `Salary_Sheet_${selectedMonth === 'All' ? 'All_Months' : selectedMonth}.xlsx`);
    setExportModalOpen(false);
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
          
          <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-50 border-b border-gray-200 justify-between items-start md:items-center">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-500 text-sm uppercase whitespace-nowrap">PF % (Employee)</span>
              <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-md font-bold text-sm">12%</div>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto flex-1 justify-start md:justify-end">
              <div className="relative flex items-center w-full sm:w-auto" ref={colMenuRef}>
                <button 
                  onClick={() => setShowColMenu(!showColMenu)}
                  className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 rounded-md bg-white text-gray-700 font-medium flex items-center justify-center gap-1.5 text-sm whitespace-nowrap hover:bg-gray-50"
                >
                  <GripVertical size={14} /> Columns
                </button>
                {showColMenu && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 w-64 p-3 max-h-[400px] overflow-y-auto overflow-x-hidden">
                    <h4 className="m-0 mb-2 text-sm text-gray-500 border-b border-gray-100 pb-2 text-left" style={{ textAlign: 'left' }}>Toggle Columns</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <button onClick={() => selectAllCols(true)} className="bg-transparent border-none text-primary text-xs cursor-pointer p-0 font-medium">Select All</button>
                      <button onClick={() => selectAllCols(false)} className="bg-transparent border-none text-gray-500 text-xs cursor-pointer p-0 font-medium">Deselect All</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
                      {Object.keys(visibleCols).map(key => (
                        <div 
                          key={key} 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCol(key);
                          }}
                          style={{ display: 'grid', gridTemplateColumns: '16px 1fr', alignItems: 'center', width: '100%', padding: '6px 8px', gap: '12px' }}
                          className="cursor-pointer hover:bg-gray-50 rounded-md transition-colors"
                        >
                          <input 
                            type="checkbox" 
                            checked={visibleCols[key]} 
                            readOnly 
                            style={{ margin: 0, padding: 0, width: '16px', height: '16px', cursor: 'pointer', justifySelf: 'start' }} 
                          />
                          <span style={{ textAlign: 'left', whiteSpace: 'nowrap', fontSize: '14px', color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {key === 'designation' ? 'Firm' : key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <span className="font-medium text-gray-500 text-xs uppercase hidden sm:block">Filters:</span>
              
              <select 
                value={selectedDepartment} 
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full sm:w-auto sm:max-w-[130px] px-2 py-1.5 border border-gray-300 rounded-md bg-white text-gray-800 text-sm focus:outline-none focus:border-primary"
              >
                <option value="All">All Departments</option>
                {uniqueDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              
              <select 
                value={selectedDesignation} 
                onChange={(e) => setSelectedDesignation(e.target.value)}
                className="w-full sm:w-auto sm:max-w-[130px] px-2 py-1.5 border border-gray-300 rounded-md bg-white text-gray-800 text-sm focus:outline-none focus:border-primary"
              >
                <option value="All">All Firms</option>
                {uniqueDesignations.map(desg => (
                  <option key={desg} value={desg}>{desg}</option>
                ))}
              </select>
              
              <select 
                value={selectedSalaryDate} 
                onChange={(e) => setSelectedSalaryDate(e.target.value)}
                className="w-full sm:w-auto sm:max-w-[130px] px-2 py-1.5 border border-gray-300 rounded-md bg-white text-gray-800 text-sm focus:outline-none focus:border-primary"
              >
                <option value="All">All Dates</option>
                {uniqueSalaryDates.map(d => (
                  <option key={d} value={d}>{new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</option>
                ))}
              </select>
              
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full sm:w-auto sm:max-w-[130px] px-2 py-1.5 border border-gray-300 rounded-md bg-white text-gray-800 text-sm focus:outline-none focus:border-primary"
              >
                <option value="All">All Months</option>
                {uniqueMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              
              {selectedRows.length > 0 && (
                <button
                  onClick={handleMarkAllDone}
                  disabled={markingDone || records.length === 0 || selectedRows.length === 0}
                  className={`w-full sm:w-auto px-3 py-1.5 border border-green-500 rounded-md bg-green-500 text-white font-medium flex items-center justify-center gap-1 text-sm whitespace-nowrap ${(markingDone || records.length === 0 || selectedRows.length === 0) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-green-600'}`}
                >
                  {markingDone ? <Loader size={14} className="spin" /> : <CheckCircle2 size={14} />} Mark All Done
                </button>
              )}
              
              <button
                onClick={() => openExportModal('excel')}
                className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg text-white font-semibold flex items-center justify-center gap-1.5 text-sm whitespace-nowrap cursor-pointer transition-colors shadow-xs"
                style={{ backgroundColor: '#059669', border: '1px solid #047857' }}
                title="Download Excel Sheet"
              >
                <Download size={14} /> Excel
              </button>

              <button
                onClick={() => openExportModal('pdf')}
                className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg text-white font-semibold flex items-center justify-center gap-1.5 text-sm whitespace-nowrap cursor-pointer transition-colors shadow-xs"
                style={{ backgroundColor: '#dc2626', border: '1px solid #b91c1c' }}
                title="Download PDF Sheet"
              >
                <Download size={14} /> PDF
              </button>
            </div>
          </div>

          <div className="hidden md:block">
            <div 
              ref={tableRef}
              style={{ 
                overflow: 'auto', 
                maxHeight: 'calc(100vh - 280px)', 
                paddingBottom: '12px'
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
                  <th style={{...thStyle, width: '60px'}}>Sr. No.</th>
                  {visibleCols.empName && <th style={thStyle}>Employee Name</th>}
                  {visibleCols.department && <th style={thStyle}>Department</th>}
                  {visibleCols.designation && <th style={thStyle}>Firm</th>}
                  {visibleCols.salaryDate && <th style={thStyle}>Salary Date</th>}
                  {visibleCols.salaryMonth && <th style={thStyle}>Salary Month</th>}
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
                        style={{ 
                          backgroundColor: idx % 2 === 0 ? 'var(--bg-card)' : 'rgba(0,0,0,0.02)',
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
                        <td style={{...tdStyle, textAlign: 'center', color: 'var(--text-secondary)'}}>{idx + 1}</td>
                        {visibleCols.empName && <td style={{...tdStyle, fontWeight: 500, color: 'var(--text-primary)'}}>{rec.name}</td>}
                        {visibleCols.department && <td style={{...tdStyle, color: 'var(--text-secondary)'}}>{emp.department || '-'}</td>}
                        {visibleCols.designation && <td style={{...tdStyle, color: 'var(--text-secondary)'}}>
                          <span style={getDesignationStyle(emp.designation)}>{emp.designation || '-'}</span>
                        </td>}
                        {visibleCols.salaryDate && <td style={{...tdStyle, textAlign: 'center', whiteSpace: 'nowrap'}}>{rec.breakdown.sal.salaryDate ? new Date(rec.breakdown.sal.salaryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>}
                        {visibleCols.salaryMonth && <td style={{...tdStyle, textAlign: 'center'}}>{rec.breakdown.sal.salaryMonth || '-'}</td>}
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
                          <button 
                            onClick={() => handleToggleSinglePaymentStatus(rec.id, rec.paymentStatus)}
                            style={{ 
                              padding: '4px 10px', 
                              borderRadius: '12px', 
                              fontSize: '0.75rem', 
                              backgroundColor: (rec.paymentStatus === 'Processed' || rec.paymentStatus === 'Done') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                              color: (rec.paymentStatus === 'Processed' || rec.paymentStatus === 'Done') ? 'var(--success)' : '#d97706', 
                              fontWeight: 600,
                              border: 'none',
                              cursor: 'pointer',
                              outline: 'none',
                              transition: 'transform 0.1s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            title="Click to toggle status"
                          >
                            {rec.paymentStatus}
                          </button>
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
                    <td colSpan={2 + (visibleCols.empName ? 1 : 0) + (visibleCols.department ? 1 : 0) + (visibleCols.designation ? 1 : 0) + (visibleCols.salaryDate ? 1 : 0) + (visibleCols.salaryMonth ? 1 : 0)} style={{ border: '1px solid var(--border-color)', padding: '16px', textAlign: 'right', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>TOTAL</td>
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

          {/* Mobile Cards for Salary Sheet */}
          <div className="md:hidden space-y-4 p-4 bg-gray-50/50 pb-20">
            {records.length > 0 ? (
              records.map((rec, idx) => {
                const emp = employees.find(e => e.id === rec.id) || {};
                return (
                  <div key={rec.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 relative">
                     <div className="absolute top-4 right-4">
                        <button 
                            onClick={() => handleToggleSinglePaymentStatus(rec.id, rec.paymentStatus)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-transform hover:scale-105 active:scale-95 ${
                              (rec.paymentStatus === 'Processed' || rec.paymentStatus === 'Done') 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-amber-100 text-amber-700'
                            }`}
                        >
                          {rec.paymentStatus}
                        </button>
                     </div>
                     <div className="flex items-start gap-3 border-b pb-3 border-gray-100 pr-20">
                        <div className="flex items-center justify-center pt-1">
                           <input 
                            type="checkbox" 
                            className="w-5 h-5 accent-primary cursor-pointer"
                            checked={selectedRows.includes(rec.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedRows([...selectedRows, rec.id]);
                              else setSelectedRows(selectedRows.filter(id => id !== rec.id));
                            }}
                          />
                        </div>
                        <div>
                           <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">#{idx + 1}</span>
                           <p className="font-bold text-gray-900 text-sm uppercase leading-tight">{rec.name}</p>
                           <p className="text-[11px] text-gray-500 font-medium mt-1 uppercase">{emp.designation || '-'} • {emp.department || '-'}</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div>
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Gross Salary</span>
                           <span className="text-sm font-black text-gray-700">₹ {rec.gross.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
                        </div>
                        <div>
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Total Deductions</span>
                           <span className="text-sm font-black text-red-600">₹ {rec.deductions.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
                        </div>
                     </div>

                     <div className="flex justify-between items-center px-2 pt-1">
                        <div>
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Net Salary</span>
                           <span className="text-xl font-black text-green-600">₹ {rec.net.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
                        </div>
                        <div className="text-right">
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Month / Date</span>
                           <span className="text-xs font-bold text-gray-600 block">{rec.breakdown.sal.salaryMonth || '-'}</span>
                           <span className="text-[10px] text-gray-500">{rec.breakdown.sal.salaryDate ? new Date(rec.breakdown.sal.salaryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span>
                        </div>
                     </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-500 text-sm font-medium">
                No employees found to display salary data.
              </div>
            )}
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
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#0f172a', color: 'white', padding: '12px 16px', fontWeight: 700, letterSpacing: '0.5px' }}>Employee-wise Net Salary</div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', textTransform: 'uppercase', fontWeight: 600 }}>Employee Name</th>
                      <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)', textTransform: 'uppercase', fontWeight: 600 }}>Salary</th>
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
            </div>

            {/* Chart and Analysis */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ marginBottom: '16px', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Net Salary by Employee</h3>
                {records.length > 0 ? (
                  <div style={{ width: '100%', height: 350 }}>
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
                  <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    No data to display chart.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Columns Selection Modal */}
      {exportModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setExportModalOpen(false)}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '820px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '85vh',
              overflow: 'hidden',
              border: '1px solid #e2e8f0'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              style={{
                backgroundColor: exportType === 'excel' ? '#059669' : '#dc2626',
                color: '#ffffff',
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {exportType === 'excel' ? <FileSpreadsheet size={22} color="#ffffff" /> : <FileText size={22} color="#ffffff" />}
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.3px' }}>
                  Select Columns to Export ({exportType === 'excel' ? 'Excel' : 'PDF'})
                </h3>
              </div>
              <button 
                onClick={() => setExportModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#ffffff',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Action Toolbar */}
            <div 
              style={{
                padding: '12px 24px',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                {Object.values(exportCols).filter(Boolean).length} of {Object.keys(exportCols).length} columns selected
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  type="button"
                  onClick={() => selectAllExportCols(true)} 
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Select All
                </button>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <button 
                  type="button"
                  onClick={() => selectAllExportCols(false)} 
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Checkboxes List */}
            <div 
              style={{
                padding: '20px 24px',
                overflowY: 'auto',
                overflowX: 'hidden',
                flex: 1
              }}
            >
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '12px'
                }}
              >
                {Object.keys(exportCols).map(key => {
                  const labelMap = {
                    empName: 'Employee Name',
                    department: 'Department',
                    designation: 'Firm / Designation',
                    salaryDate: 'Salary Date',
                    salaryMonth: 'Salary Month',
                    basic: 'Basic Salary (₹)',
                    hra: 'HRA (₹)',
                    allowances: 'Allowances (₹)',
                    monthAdvance: 'Month Advance (₹)',
                    gross: 'Gross Salary (₹)',
                    totalDays: 'Total Days',
                    present: 'Present Days',
                    absent: 'Absent Days',
                    leaves: 'Leaves Taken',
                    leaveDeduct: 'Leave Deduction (₹)',
                    monthRecov: 'Recovery (₹)',
                    prevAdvDeduct: 'Prev Advance Ded. (₹)',
                    pf: 'PF Deduction (₹)',
                    esic: 'ESIC Deduction (₹)',
                    pTax: 'Professional Tax (₹)',
                    otherDeduct: 'Other Deductions (₹)',
                    totalDeduct: 'Total Deductions (₹)',
                    netSalary: 'Net Salary (₹)',
                    paymentStatus: 'Payment Status',
                    bankAcc: 'Bank Account'
                  };
                  const label = labelMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                  const isChecked = !!exportCols[key];

                  return (
                    <label 
                      key={key}
                      onClick={() => toggleExportCol(key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: isChecked ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                        backgroundColor: isChecked ? '#eff6ff' : '#ffffff',
                        color: isChecked ? '#1e3a8a' : '#334155',
                        fontWeight: isChecked ? 600 : 500,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'all 0.15s ease',
                        boxShadow: isChecked ? '0 1px 2px rgba(59, 130, 246, 0.1)' : 'none'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => {}}
                        style={{
                          width: '16px',
                          height: '16px',
                          accentColor: '#2563eb',
                          cursor: 'pointer',
                          margin: 0,
                          flexShrink: 0
                        }}
                      />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div 
              style={{
                padding: '16px 24px',
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px'
              }}
            >
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#475569',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Object.values(exportCols).filter(Boolean).length === 0}
                onClick={exportType === 'excel' ? handleDownloadExcel : handleDownloadPDF}
                style={{
                  padding: '9px 22px',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  backgroundColor: exportType === 'excel' ? '#059669' : '#dc2626',
                  border: `1px solid ${exportType === 'excel' ? '#047857' : '#b91c1c'}`,
                  cursor: Object.values(exportCols).filter(Boolean).length === 0 ? 'not-allowed' : 'pointer',
                  opacity: Object.values(exportCols).filter(Boolean).length === 0 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <Download size={15} />
                Download {exportType === 'excel' ? 'Excel' : 'PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
