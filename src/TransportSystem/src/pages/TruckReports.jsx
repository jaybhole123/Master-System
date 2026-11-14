import React, { useState, useEffect, useMemo } from 'react';
import supabase from '../../../SupabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Select, { components } from 'react-select';
import { 
  Truck, Banknote, Fuel, Route, Search, Plus, Download, FileSpreadsheet, 
  Calendar, RotateCcw, Edit2, Trash2, X, ArrowRight, Shield, Sparkles, Filter,
  Layers, MapPin, Gauge, IndianRupee, Hash, Check, Eye, Upload, FileUp, AlertCircle,
  Clock, Timer, CheckCircle2, PlayCircle, StopCircle
} from 'lucide-react';
import './TruckReports.css';

export default function TruckReports() {
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterVehicleNo, setFilterVehicleNo] = useState('');
  const [filterDoNo, setFilterDoNo] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewModal, setViewModal] = useState({ isOpen: false, data: null });
  const [extraFromOptions, setExtraFromOptions] = useState([]);
  const [extraToOptions, setExtraToOptions] = useState([]);
  const [extraDieselOptions, setExtraDieselOptions] = useState([]);
  const [extraAdvanceOptions, setExtraAdvanceOptions] = useState([]);
  const [extraPartyOptions, setExtraPartyOptions] = useState([]);
  const [extraDoPartyOptions, setExtraDoPartyOptions] = useState([]);
  const [extraDoNoOptions, setExtraDoNoOptions] = useState([]);
  const [extraDistanceOptions, setExtraDistanceOptions] = useState([]);
  const [extraDieselPriceOptions, setExtraDieselPriceOptions] = useState([]);
  const [extraTripsOptions, setExtraTripsOptions] = useState([]);
  const [extraPerMTOptions, setExtraPerMTOptions] = useState([]);
  const [extraTonnageOptions, setExtraTonnageOptions] = useState([]);
  const [promptModal, setPromptModal] = useState({ isOpen: false, type: null, title: '', placeholder: '' });
  const [promptValue, setPromptValue] = useState('');
  const [visibleCount, setVisibleCount] = useState(50);
  
  // Bulk Upload states
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkParsedData, setBulkParsedData] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkCurrentPage, setBulkCurrentPage] = useState(1);
  const [bulkPageSize, setBulkPageSize] = useState(50);
  
  // Bulk selection for delete
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  
  const [reportsData, setReportsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trucksList, setTrucksList] = useState([]);

  useEffect(() => {
    fetchReports();
    fetchTrucks();
  }, []);

  const fetchTrucks = async () => {
    const { data } = await supabase.from('trucks').select('vno');
    if (data) {
      setTrucksList(data.map(d => d.vno).filter(Boolean));
    }
  };

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('truck_reports')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching data:', error);
    } else if (data) {
      const formattedData = data.map((item, index) => ({
        id: item.id,
        sNo: index + 1,
        date: item.date,
        vehicleNo: item.vehicle_no,
        from: item.from_location,
        to: item.to_location,
        distance: item.distance,
        partyName: item.party_name,
        doPartyName: item.do_party_name,
        diesel: item.diesel,
        dieselPrice: item.diesel_price,
        advance: item.advance,
        doNo: item.do_no,
        tonnage: item.tonnage,
        totalTrips: item.total_trips,
        vehicleBalance: item.vehicle_balance,
        perMT: item.per_mt,
        totalFreight: item.total_freight,
        // Nandan Plant format fields
        recWeight: item.rec_weight !== undefined && item.rec_weight !== null ? item.rec_weight : '',
        receivedParty: item.to_location || '',
        driverName: item.driver_name || '',
        minesExp: item.mines_exp !== undefined && item.mines_exp !== null ? item.mines_exp : '',
        biltyExp: item.bilty_exp !== undefined && item.bilty_exp !== null ? item.bilty_exp : '',
        fastagExp: item.fastag_exp !== undefined && item.fastag_exp !== null ? item.fastag_exp : '',
        shortageAmount: item.shortage_amount !== undefined && item.shortage_amount !== null ? item.shortage_amount : '',
        totalExpenses: item.total_expenses !== undefined && item.total_expenses !== null ? item.total_expenses : '',
        // Turnaround Time (TAT) fields
        departureTime: item.departure_time || '',
        arrivalTime: item.arrival_time || '',
        unloadingTime: item.unloading_time || '',
        turnaroundHours: item.turnaround_hours !== undefined && item.turnaround_hours !== null ? item.turnaround_hours : '',
        turnaroundDays: item.turnaround_days !== undefined && item.turnaround_days !== null ? item.turnaround_days : '',
        tatStatus: item.tat_status || ''
      }));
      setReportsData(formattedData);
    }
    setLoading(false);
  };

  // Helper to calculate Turnaround Duration
  const calculateTurnaround = (departure, unloading, arrival) => {
    if (!departure) return { hours: '', days: '', status: 'Pending' };

    const start = new Date(departure).getTime();
    if (isNaN(start)) return { hours: '', days: '', status: 'Pending' };

    const endVal = unloading || arrival;
    if (!endVal) {
      return { hours: '', days: '', status: 'In Transit' };
    }

    const end = new Date(endVal).getTime();
    if (isNaN(end) || end < start) {
      return { hours: '', days: '', status: unloading ? 'Completed' : 'Arrived' };
    }

    const diffMs = end - start;
    const diffHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
    const diffDays = Math.round((diffHours / 24) * 10) / 10;
    const status = unloading ? 'Completed' : (arrival ? 'Unloading' : 'In Transit');

    return { hours: diffHours, days: diffDays, status };
  };

  const [formData, setFormData] = useState({
    date: '', vehicleNo: '', from: '', to: '', distance: '', partyName: '', doPartyName: '', receivedParty: '', driverName: '', diesel: '', dieselPrice: '', advance: '', doNo: '', totalTrips: '', vehicleBalance: '', perMT: '', tonnage: '', recWeight: '', minesExp: '', biltyExp: '', fastagExp: '', shortageAmount: '', totalExpenses: '', totalFreight: '',
    // Turnaround Time fields
    departureTime: '', arrivalTime: '', unloadingTime: '', turnaroundHours: '', turnaroundDays: '', tatStatus: ''
  });

  // Auto-fetch distance & Rate Per MT dynamically based on past data
  useEffect(() => {
    if (formData.from && formData.to && reportsData.length > 0) {
      const fromTrimmed = formData.from.toLowerCase().trim();
      const toTrimmed = formData.to.toLowerCase().trim();
      const routeKey = `${fromTrimmed}-${toTrimmed}`;
      const routeReverseKey = `${toTrimmed}-${fromTrimmed}`;

      // Look for the most recent trip report with matching route that has distance or perMT
      let foundDistance = '';
      let foundPerMT = '';

      for (let i = reportsData.length - 1; i >= 0; i--) {
        const r = reportsData[i];
        if (!r.from || !r.to) continue;
        const rFrom = r.from.toLowerCase().trim();
        const rTo = r.to.toLowerCase().trim();

        if (rFrom === fromTrimmed && rTo === toTrimmed) {
          if (!foundDistance && r.distance) foundDistance = r.distance;
          if (!foundPerMT && r.perMT) foundPerMT = String(r.perMT);
        } else if (rFrom === toTrimmed && rTo === fromTrimmed) {
          if (!foundDistance && r.distance) foundDistance = r.distance;
          if (!foundPerMT && r.perMT) foundPerMT = String(r.perMT);
        }

        if (foundDistance && foundPerMT) break;
      }

      setFormData(prev => {
        let updated = { ...prev };
        let hasChanges = false;

        if (foundDistance) {
          const finalDist = String(foundDistance).toLowerCase().includes('km') ? foundDistance : `${foundDistance} km`;
          if (prev.distance !== finalDist) {
            updated.distance = finalDist;
            hasChanges = true;
          }
        }

        if (foundPerMT && prev.perMT !== foundPerMT) {
          updated.perMT = foundPerMT;
          hasChanges = true;

          // Re-calculate freight and balance if tonnage is already present
          const perMTNum = parseFloat(foundPerMT) || 0;
          const tonnageNum = parseFloat(updated.tonnage) || 0;
          if (perMTNum > 0 && tonnageNum > 0) {
            const totalFreight = Math.round(perMTNum * tonnageNum);
            updated.totalFreight = totalFreight.toString();

            const dieselStr = String(updated.diesel || '');
            const dieselVal = parseFloat(dieselStr.replace(/[^0-9.]/g, '')) || 0;
            const dieselPriceVal = parseFloat(updated.dieselPrice) || 0;
            const advanceVal = parseFloat(updated.advance) || 0;
            const vehicleBalance = totalFreight - (dieselVal * dieselPriceVal) - advanceVal;
            updated.vehicleBalance = Math.round(vehicleBalance).toString();
          }
        }

        return hasChanges ? updated : prev;
      });
    }
  }, [formData.from, formData.to, reportsData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };
    
    if (['perMT', 'tonnage', 'recWeight', 'diesel', 'dieselPrice', 'advance', 'minesExp', 'biltyExp', 'fastagExp', 'shortageAmount'].includes(name)) {
      const perMT = parseFloat(name === 'perMT' ? value : newFormData.perMT) || 0;
      const tonnage = parseFloat(name === 'tonnage' ? value : newFormData.tonnage) || 0;
      
      let totalFreight = 0;
      if (perMT > 0 && tonnage > 0) {
        totalFreight = Math.round(perMT * tonnage);
        newFormData.totalFreight = totalFreight.toString();
      } else {
        newFormData.totalFreight = '';
      }

      const dieselStr = String(name === 'diesel' ? value : newFormData.diesel || '');
      const dieselVal = parseFloat(dieselStr.replace(/[^0-9.]/g, '')) || 0;
      const dieselPriceVal = parseFloat(name === 'dieselPrice' ? value : newFormData.dieselPrice) || 0;
      const advanceVal = parseFloat(name === 'advance' ? value : newFormData.advance) || 0;
      const minesExpVal = parseFloat(name === 'minesExp' ? value : newFormData.minesExp) || 0;
      const biltyExpVal = parseFloat(name === 'biltyExp' ? value : newFormData.biltyExp) || 0;
      const fastagVal = parseFloat(name === 'fastagExp' ? value : newFormData.fastagExp) || 0;
      const shortageVal = parseFloat(name === 'shortageAmount' ? value : newFormData.shortageAmount) || 0;

      const totalDieselCost = Math.round(dieselVal * dieselPriceVal);
      const totalExpenses = totalDieselCost + minesExpVal + biltyExpVal + advanceVal + fastagVal + shortageVal;
      newFormData.totalExpenses = totalExpenses > 0 ? totalExpenses.toString() : '';

      if (totalFreight > 0) {
        const vehicleBalance = totalFreight - totalExpenses;
        newFormData.vehicleBalance = Math.round(vehicleBalance).toString();
      } else {
        newFormData.vehicleBalance = '';
      }
    }
    
    if (['departureTime', 'arrivalTime', 'unloadingTime'].includes(name)) {
      const dep = name === 'departureTime' ? value : newFormData.departureTime;
      const arr = name === 'arrivalTime' ? value : newFormData.arrivalTime;
      const unl = name === 'unloadingTime' ? value : newFormData.unloadingTime;
      const tatCalc = calculateTurnaround(dep, unl, arr);
      newFormData.turnaroundHours = tatCalc.hours !== '' ? tatCalc.hours.toString() : '';
      newFormData.turnaroundDays = tatCalc.days !== '' ? tatCalc.days.toString() : '';
      newFormData.tatStatus = tatCalc.status;
    }
    
    setFormData(newFormData);
  };

  const handleAddReport = async (e) => {
    e.preventDefault();
    
    // Calculate final TAT metrics before save
    const tatCalc = calculateTurnaround(formData.departureTime, formData.unloadingTime, formData.arrivalTime);

    const reportData = {
      date: formData.date,
      vehicle_no: formData.vehicleNo,
      from_location: formData.from,
      to_location: formData.receivedParty || formData.to,
      distance: formData.distance,
      party_name: formData.partyName,
      do_party_name: formData.doPartyName,
      driver_name: formData.driverName || null,
      diesel: formData.diesel,
      diesel_price: Number(formData.dieselPrice) || 0,
      advance: Number(formData.advance) || 0,
      do_no: formData.doNo,
      tonnage: Number(formData.tonnage) || 0,
      rec_weight: Number(formData.recWeight) || 0,
      total_trips: Number(formData.totalTrips) || 0,
      per_mt: Number(formData.perMT) || 0,
      mines_exp: Number(formData.minesExp) || 0,
      bilty_exp: Number(formData.biltyExp) || 0,
      fastag_exp: Number(formData.fastagExp) || 0,
      shortage_amount: Number(formData.shortageAmount) || 0,
      total_expenses: Number(formData.totalExpenses) || 0,
      total_freight: Number(formData.totalFreight) || 0,
      vehicle_balance: Number(formData.vehicleBalance) || 0,
      departure_time: formData.departureTime || null,
      arrival_time: formData.arrivalTime || null,
      unloading_time: formData.unloadingTime || null,
      turnaround_hours: tatCalc.hours !== '' ? Number(tatCalc.hours) : null,
      turnaround_days: tatCalc.days !== '' ? Number(tatCalc.days) : null,
      tat_status: tatCalc.status || null
    };

    const cleanReportDataWithoutTAT = {
      date: formData.date,
      vehicle_no: formData.vehicleNo,
      from_location: formData.from,
      to_location: formData.receivedParty || formData.to,
      distance: formData.distance,
      party_name: formData.partyName,
      do_party_name: formData.doPartyName,
      driver_name: formData.driverName || null,
      diesel: formData.diesel,
      diesel_price: Number(formData.dieselPrice) || 0,
      advance: Number(formData.advance) || 0,
      do_no: formData.doNo,
      tonnage: Number(formData.tonnage) || 0,
      rec_weight: Number(formData.recWeight) || 0,
      total_trips: Number(formData.totalTrips) || 0,
      per_mt: Number(formData.perMT) || 0,
      mines_exp: Number(formData.minesExp) || 0,
      bilty_exp: Number(formData.biltyExp) || 0,
      fastag_exp: Number(formData.fastagExp) || 0,
      shortage_amount: Number(formData.shortageAmount) || 0,
      total_expenses: Number(formData.totalExpenses) || 0,
      total_freight: Number(formData.totalFreight) || 0,
      vehicle_balance: Number(formData.vehicleBalance) || 0
    };

    if (editingId) {
      const reportToEdit = reportsData.find(r => r.sNo === editingId);
      if (reportToEdit && reportToEdit.id) {
        let updateResult = await supabase
          .from('truck_reports')
          .update(reportData)
          .eq('id', reportToEdit.id);
        
        // Graceful fallback if database column is missing yet
        if (updateResult.error && updateResult.error.message?.includes('column')) {
          console.warn("TAT columns not found in database, updating core fields only:", updateResult.error.message);
          updateResult = await supabase
            .from('truck_reports')
            .update(cleanReportDataWithoutTAT)
            .eq('id', reportToEdit.id);
        }

        if (updateResult.error) {
          console.error("Error updating:", updateResult.error);
          toast.error("Error updating report!");
        } else {
          toast.success("Report updated successfully!");
        }
      }
    } else {
      let insertResult = await supabase
        .from('truck_reports')
        .insert([reportData]);
        
      // Graceful fallback if database column is missing yet
      if (insertResult.error && insertResult.error.message?.includes('column')) {
        console.warn("TAT columns not found in database, inserting core fields only:", insertResult.error.message);
        insertResult = await supabase
          .from('truck_reports')
          .insert([cleanReportDataWithoutTAT]);
      }

      if (insertResult.error) {
        console.error("Error inserting:", insertResult.error);
        toast.error("Error saving report!");
      } else {
        toast.success("Report saved successfully!");
      }
    }
    
    await fetchReports();
    setFormData({ 
      date: '', vehicleNo: '', from: '', to: '', distance: '', partyName: '', doPartyName: '', receivedParty: '', driverName: '', diesel: '', dieselPrice: '', advance: '', doNo: '', totalTrips: '', vehicleBalance: '', perMT: '', tonnage: '', recWeight: '', minesExp: '', biltyExp: '', fastagExp: '', shortageAmount: '', totalExpenses: '', totalFreight: '',
      departureTime: '', arrivalTime: '', unloadingTime: '', turnaroundHours: '', turnaroundDays: '', tatStatus: ''
    });
    setIsModalOpen(false);
    setEditingId(null);
  };

  // Helper to safely format any date/ISO/SQL timestamp to input type="datetime-local" (YYYY-MM-DDTHH:mm)
  const formatDateTimeLocal = (dateVal) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) {
        // Fallback: If it's already a string matching YYYY-MM-DDTHH:mm
        const s = String(dateVal).trim();
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
          return s.slice(0, 16);
        }
        return '';
      }
      const pad = (n) => String(n).padStart(2, '0');
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const handleEditReport = (report) => {
    setFormData({
      ...report,
      from: report.from || report.from_location || '',
      to: report.to || report.to_location || report.receivedParty || '',
      receivedParty: report.receivedParty || report.to || report.to_location || '',
      driverName: report.driverName || report.driver_name || '',
      recWeight: report.recWeight !== undefined && report.recWeight !== null ? String(report.recWeight) : '',
      minesExp: report.minesExp !== undefined && report.minesExp !== null ? String(report.minesExp) : '',
      biltyExp: report.biltyExp !== undefined && report.biltyExp !== null ? String(report.biltyExp) : '',
      fastagExp: report.fastagExp !== undefined && report.fastagExp !== null ? String(report.fastagExp) : '',
      shortageAmount: report.shortageAmount !== undefined && report.shortageAmount !== null ? String(report.shortageAmount) : '',
      totalExpenses: report.totalExpenses !== undefined && report.totalExpenses !== null ? String(report.totalExpenses) : '',
      departureTime: formatDateTimeLocal(report.departureTime || report.departure_time),
      arrivalTime: formatDateTimeLocal(report.arrivalTime || report.arrival_time),
      unloadingTime: formatDateTimeLocal(report.unloadingTime || report.unloading_time)
    });
    setEditingId(report.sNo);
    setIsModalOpen(true);
  };

  const handleDeleteReport = async (sNoToDelete) => {
    if(window.confirm("Are you sure you want to delete this trip report?")) {
      const reportToDelete = reportsData.find(r => r.sNo === sNoToDelete);
      if (reportToDelete && reportToDelete.id) {
        const { error } = await supabase
          .from('truck_reports')
          .delete()
          .eq('id', reportToDelete.id);
          
        if (error) {
          console.error("Error deleting:", error);
          toast.error("Failed to delete report");
        } else {
          toast.success("Report deleted successfully");
          setSelectedIds(prev => prev.filter(id => id !== reportToDelete.id));
          await fetchReports();
        }
      }
    }
  };

  // Bulk Delete Selected Reports
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast.error("Please select at least one report to delete!");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected trip reports? This action cannot be undone.`)) {
      return;
    }

    setIsDeletingBulk(true);
    try {
      const { error } = await supabase
        .from('truck_reports')
        .delete()
        .in('id', selectedIds);

      if (error) {
        console.error("Error in bulk delete:", error);
        toast.error(`Failed to delete selected reports: ${error.message}`);
      } else {
        toast.success(`Successfully deleted ${selectedIds.length} trip reports!`);
        setSelectedIds([]);
        await fetchReports();
      }
    } catch (err) {
      console.error("Error bulk deleting reports:", err);
      toast.error("Unexpected error occurred while deleting.");
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // Toggle single row selection
  const handleToggleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Toggle Select All filtered / displayed rows
  const handleToggleSelectAll = () => {
    const displayedIds = displayedData.map(r => r.id).filter(Boolean);
    const allSelected = displayedIds.length > 0 && displayedIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !displayedIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...displayedIds])));
    }
  };

  const filteredData = useMemo(() => {
    return reportsData.filter(row => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || Object.values(row).some(val => 
        String(val).toLowerCase().includes(q)
      );
      
      let matchesDate = true;
      if (fromDate || toDate) {
        const rowDate = new Date(row.date);
        if (fromDate) {
          const from = new Date(fromDate);
          if (rowDate < from) matchesDate = false;
        }
        if (toDate) {
          const to = new Date(toDate);
          if (rowDate > to) matchesDate = false;
        }
      }

      const matchesVehicle = filterVehicleNo ? row.vehicleNo === filterVehicleNo : true;
      const matchesDoNo = filterDoNo ? row.doNo === filterDoNo : true;

      return matchesSearch && matchesDate && matchesVehicle && matchesDoNo;
    });
  }, [reportsData, searchTerm, fromDate, toDate, filterVehicleNo, filterDoNo]);

  const formattedVehicles = trucksList.map(v => v.toUpperCase().trim());
  const uniqueVehicles = [...new Set(formattedVehicles)].sort();
  const vehicleOptions = uniqueVehicles.map(v => ({ label: v, value: v }));
  const uniqueDoNumbers = [...new Set(reportsData.map(item => item.doNo).filter(Boolean))].sort();

  const displayedData = filteredData.slice(0, visibleCount);

  const handleTableScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      if (visibleCount < filteredData.length) {
        setVisibleCount(prev => prev + 50);
      }
    }
  };

  // KPI Calculations
  const totalTripsCount = filteredData.length;
  const totalAdvanceSum = filteredData.reduce((sum, item) => sum + (Number(item.advance) || 0), 0);
  const totalDieselSum = filteredData.reduce((sum, item) => sum + (parseInt(String(item.diesel).replace(/[^0-9]/g, '')) || 0), 0);
  const totalDistanceSum = filteredData.reduce((sum, item) => sum + (parseInt(String(item.distance).replace(/[^0-9]/g, '')) || 0), 0);

  // Turnaround Time KPI Calculations
  const completedTatTrips = filteredData.filter(item => item.turnaroundHours !== '' && !isNaN(Number(item.turnaroundHours)));
  const avgTurnaroundHours = completedTatTrips.length > 0
    ? Math.round((completedTatTrips.reduce((acc, curr) => acc + Number(curr.turnaroundHours), 0) / completedTatTrips.length) * 10) / 10
    : 0;
  const avgTurnaroundDays = Math.round((avgTurnaroundHours / 24) * 10) / 10;
  const activeTripsCount = filteredData.filter(item => item.departureTime && !item.unloadingTime).length;

  // Helper to rename a dropdown option value across database and state
  const handleRenameOption = async (type, oldValue) => {
    const newValue = window.prompt(`Edit "${oldValue}":`, oldValue);
    if (!newValue || newValue.trim() === '' || newValue.trim() === oldValue) return;
    const finalVal = (type === 'from' || type === 'to') ? newValue.trim().toUpperCase() : newValue.trim();

    try {
      if (type === 'from') {
        const { error } = await supabase.from('truck_reports').update({ from_location: finalVal }).eq('from_location', oldValue);
        if (error) throw error;
        setExtraFromOptions(prev => prev.map(v => v === oldValue ? finalVal : v));
        if (formData.from === oldValue) setFormData(prev => ({ ...prev, from: finalVal }));
      } else if (type === 'to') {
        const { error } = await supabase.from('truck_reports').update({ to_location: finalVal }).eq('to_location', oldValue);
        if (error) throw error;
        setExtraToOptions(prev => prev.map(v => v === oldValue ? finalVal : v));
        if (formData.to === oldValue) setFormData(prev => ({ ...prev, to: finalVal }));
      } else if (type === 'party') {
        const { error } = await supabase.from('truck_reports').update({ party_name: finalVal }).eq('party_name', oldValue);
        if (error) throw error;
        setExtraPartyOptions(prev => prev.map(v => v === oldValue ? finalVal : v));
        if (formData.partyName === oldValue) setFormData(prev => ({ ...prev, partyName: finalVal }));
      } else if (type === 'doparty') {
        const { error } = await supabase.from('truck_reports').update({ do_party_name: finalVal }).eq('do_party_name', oldValue);
        if (error) throw error;
        setExtraDoPartyOptions(prev => prev.map(v => v === oldValue ? finalVal : v));
        if (formData.doPartyName === oldValue) setFormData(prev => ({ ...prev, doPartyName: finalVal }));
      } else if (type === 'diesel') {
        const { error } = await supabase.from('truck_reports').update({ diesel: finalVal }).eq('diesel', oldValue);
        if (error) throw error;
        setExtraDieselOptions(prev => prev.map(v => v === oldValue ? finalVal : v));
        if (formData.diesel === oldValue) setFormData(prev => ({ ...prev, diesel: finalVal }));
      } else if (type === 'advance') {
        const { error } = await supabase.from('truck_reports').update({ advance: Number(finalVal) || 0 }).eq('advance', Number(oldValue) || 0);
        if (error) throw error;
        setExtraAdvanceOptions(prev => prev.map(v => v === oldValue ? finalVal : v));
        if (formData.advance === oldValue) setFormData(prev => ({ ...prev, advance: finalVal }));
      } else if (type === 'dono') {
        const { error } = await supabase.from('truck_reports').update({ do_no: finalVal }).eq('do_no', oldValue);
        if (error) throw error;
        setExtraDoNoOptions(prev => prev.map(v => v === oldValue ? finalVal : v));
        if (formData.doNo === oldValue) setFormData(prev => ({ ...prev, doNo: finalVal }));
      } else if (type === 'distance') {
        const { error } = await supabase.from('truck_reports').update({ distance: finalVal }).eq('distance', oldValue);
        if (error) throw error;
        setExtraDistanceOptions(prev => prev.map(v => v === oldValue ? finalVal : v));
        if (formData.distance === oldValue) setFormData(prev => ({ ...prev, distance: finalVal }));
      } else if (type === 'dieselPrice') {
        const { error } = await supabase.from('truck_reports').update({ diesel_price: Number(finalVal) || 0 }).eq('diesel_price', Number(oldValue) || 0);
        if (error) throw error;
        setExtraDieselPriceOptions(prev => prev.map(v => v === oldValue ? finalVal : v));
        if (String(formData.dieselPrice) === String(oldValue)) handleInputChange({ target: { name: 'dieselPrice', value: finalVal } });
      } else if (type === 'trips') {
        const { error } = await supabase.from('truck_reports').update({ total_trips: Number(finalVal) || 0 }).eq('total_trips', Number(oldValue) || 0);
        if (error) throw error;
        setExtraTripsOptions(prev => prev.map(v => v === oldValue ? finalVal : v));
        if (String(formData.totalTrips) === String(oldValue)) handleInputChange({ target: { name: 'totalTrips', value: finalVal } });
      } else if (type === 'perMT') {
        const { error } = await supabase.from('truck_reports').update({ per_mt: Number(finalVal) || 0 }).eq('per_mt', Number(oldValue) || 0);
        if (error) throw error;
        setExtraPerMTOptions(prev => prev.map(v => v === oldValue ? finalVal : v));
        if (String(formData.perMT) === String(oldValue)) handleInputChange({ target: { name: 'perMT', value: finalVal } });
      } else if (type === 'tonnage') {
        const { error } = await supabase.from('truck_reports').update({ tonnage: Number(finalVal) || 0 }).eq('tonnage', Number(oldValue) || 0);
        if (error) throw error;
        setExtraTonnageOptions(prev => prev.map(v => v === oldValue ? finalVal : v));
        if (String(formData.tonnage) === String(oldValue)) handleInputChange({ target: { name: 'tonnage', value: finalVal } });
      }

      toast.success(`Updated "${oldValue}" to "${finalVal}"`);
      await fetchReports();
    } catch (err) {
      console.error('Error updating option:', err);
      toast.error('Failed to update option');
    }
  };

  // Helper to delete an option from dropdown (clears from previous records or removes added option)
  const handleDeleteOption = async (type, valToDelete) => {
    if (!window.confirm(`Are you sure you want to delete "${valToDelete}" from options?`)) return;

    try {
      if (type === 'from') {
        const { error } = await supabase.from('truck_reports').update({ from_location: '' }).eq('from_location', valToDelete);
        if (error) throw error;
        setExtraFromOptions(prev => prev.filter(v => v !== valToDelete));
        if (formData.from === valToDelete) setFormData(prev => ({ ...prev, from: '' }));
      } else if (type === 'to') {
        const { error } = await supabase.from('truck_reports').update({ to_location: '' }).eq('to_location', valToDelete);
        if (error) throw error;
        setExtraToOptions(prev => prev.filter(v => v !== valToDelete));
        if (formData.to === valToDelete) setFormData(prev => ({ ...prev, to: '' }));
      } else if (type === 'party') {
        const { error } = await supabase.from('truck_reports').update({ party_name: '' }).eq('party_name', valToDelete);
        if (error) throw error;
        setExtraPartyOptions(prev => prev.filter(v => v !== valToDelete));
        if (formData.partyName === valToDelete) setFormData(prev => ({ ...prev, partyName: '' }));
      } else if (type === 'doparty') {
        const { error } = await supabase.from('truck_reports').update({ do_party_name: '' }).eq('do_party_name', valToDelete);
        if (error) throw error;
        setExtraDoPartyOptions(prev => prev.filter(v => v !== valToDelete));
        if (formData.doPartyName === valToDelete) setFormData(prev => ({ ...prev, doPartyName: '' }));
      } else if (type === 'diesel') {
        const { error } = await supabase.from('truck_reports').update({ diesel: '' }).eq('diesel', valToDelete);
        if (error) throw error;
        setExtraDieselOptions(prev => prev.filter(v => v !== valToDelete));
        if (formData.diesel === valToDelete) setFormData(prev => ({ ...prev, diesel: '' }));
      } else if (type === 'advance') {
        const { error } = await supabase.from('truck_reports').update({ advance: 0 }).eq('advance', Number(valToDelete) || 0);
        if (error) throw error;
        setExtraAdvanceOptions(prev => prev.filter(v => v !== valToDelete));
        if (formData.advance === valToDelete) setFormData(prev => ({ ...prev, advance: '' }));
      } else if (type === 'dono') {
        const { error } = await supabase.from('truck_reports').update({ do_no: '' }).eq('do_no', valToDelete);
        if (error) throw error;
        setExtraDoNoOptions(prev => prev.filter(v => v !== valToDelete));
        if (formData.doNo === valToDelete) setFormData(prev => ({ ...prev, doNo: '' }));
      } else if (type === 'distance') {
        const { error } = await supabase.from('truck_reports').update({ distance: '' }).eq('distance', valToDelete);
        if (error) throw error;
        setExtraDistanceOptions(prev => prev.filter(v => v !== valToDelete));
        if (formData.distance === valToDelete) setFormData(prev => ({ ...prev, distance: '' }));
      } else if (type === 'dieselPrice') {
        const { error } = await supabase.from('truck_reports').update({ diesel_price: 0 }).eq('diesel_price', Number(valToDelete) || 0);
        if (error) throw error;
        setExtraDieselPriceOptions(prev => prev.filter(v => v !== valToDelete));
        if (String(formData.dieselPrice) === String(valToDelete)) handleInputChange({ target: { name: 'dieselPrice', value: '' } });
      } else if (type === 'trips') {
        const { error } = await supabase.from('truck_reports').update({ total_trips: 0 }).eq('total_trips', Number(valToDelete) || 0);
        if (error) throw error;
        setExtraTripsOptions(prev => prev.filter(v => v !== valToDelete));
        if (String(formData.totalTrips) === String(valToDelete)) handleInputChange({ target: { name: 'totalTrips', value: '' } });
      } else if (type === 'perMT') {
        const { error } = await supabase.from('truck_reports').update({ per_mt: 0 }).eq('per_mt', Number(valToDelete) || 0);
        if (error) throw error;
        setExtraPerMTOptions(prev => prev.filter(v => v !== valToDelete));
        if (String(formData.perMT) === String(valToDelete)) handleInputChange({ target: { name: 'perMT', value: '' } });
      } else if (type === 'tonnage') {
        const { error } = await supabase.from('truck_reports').update({ tonnage: 0 }).eq('tonnage', Number(valToDelete) || 0);
        if (error) throw error;
        setExtraTonnageOptions(prev => prev.filter(v => v !== valToDelete));
        if (String(formData.tonnage) === String(valToDelete)) handleInputChange({ target: { name: 'tonnage', value: '' } });
      }

      toast.success(`Deleted "${valToDelete}"`);
      await fetchReports();
    } catch (err) {
      console.error('Error deleting option:', err);
      toast.error('Failed to delete option');
    }
  };

  // Generic Editable Option component for react-select
  const makeCustomOption = (type) => (props) => {
    return (
      <components.Option {...props}>
        <div className="flex items-center justify-between w-full py-0.5">
          <span className="truncate pr-2 font-medium">{props.label}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              title="Edit value"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRenameOption(type, props.value);
              }}
              className="p-1 text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-100 rounded-md transition-colors"
            >
              <Edit2 size={13} />
            </button>
            <button
              type="button"
              title="Delete value"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeleteOption(type, props.value);
              }}
              className="p-1 text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-100 rounded-md transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </components.Option>
    );
  };

  const FromOptionComponent = useMemo(() => makeCustomOption('from'), [reportsData, extraFromOptions]);
  const ToOptionComponent = useMemo(() => makeCustomOption('to'), [reportsData, extraToOptions]);
  const PartyOptionComponent = useMemo(() => makeCustomOption('party'), [reportsData, extraPartyOptions]);
  const DoPartyOptionComponent = useMemo(() => makeCustomOption('doparty'), [reportsData, extraDoPartyOptions]);
  const DieselOptionComponent = useMemo(() => makeCustomOption('diesel'), [reportsData, extraDieselOptions]);
  const AdvanceOptionComponent = useMemo(() => makeCustomOption('advance'), [reportsData, extraAdvanceOptions]);

  const uniqueFromLocations = [...new Set([...reportsData.map(r => r.from), ...extraFromOptions])]
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));
  const fromOptions = uniqueFromLocations.map(loc => ({ label: loc, value: loc }));

  const CustomMenuList = (props) => {
    return (
      <components.MenuList {...props}>
        {props.children}
        <div 
          className="p-2.5 border-t border-slate-100 text-red-600 font-bold text-xs flex items-center gap-2 bg-slate-50 hover:bg-red-50 cursor-pointer transition-colors"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPromptModal({ isOpen: true, type: 'from', title: 'Enter new Origin City', placeholder: 'e.g. DELHI' });
            setPromptValue('');
          }}
        >
          <Plus size={14} />
          Add New Origin City
        </div>
      </components.MenuList>
    );
  };

  const uniqueToLocations = [...new Set([...reportsData.map(r => r.to), ...extraToOptions])]
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));
  const toOptions = uniqueToLocations.map(loc => ({ label: loc, value: loc }));

  const ToMenuList = (props) => {
    return (
      <components.MenuList {...props}>
        {props.children}
        <div 
          className="p-2.5 border-t border-slate-100 text-red-600 font-bold text-xs flex items-center gap-2 bg-slate-50 hover:bg-red-50 cursor-pointer transition-colors"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPromptModal({ isOpen: true, type: 'to', title: 'Enter new Destination City', placeholder: 'e.g. MUMBAI' });
            setPromptValue('');
          }}
        >
          <Plus size={14} />
          Add New Destination City
        </div>
      </components.MenuList>
    );
  };

  const uniqueDiesel = [...new Set([...reportsData.map(r => r.diesel), ...extraDieselOptions])]
    .filter(Boolean)
    .sort((a, b) => {
      const numA = parseFloat(String(a).replace(/[^0-9.]/g, '')) || 0;
      const numB = parseFloat(String(b).replace(/[^0-9.]/g, '')) || 0;
      return numA !== numB ? numA - numB : String(a).localeCompare(String(b));
    });
  const dieselOptions = uniqueDiesel.map(val => ({ label: val, value: val }));

  const DieselMenuList = (props) => {
    return (
      <components.MenuList {...props}>
        {props.children}
        <div 
          className="p-2.5 border-t border-slate-100 text-red-600 font-bold text-xs flex items-center gap-2 bg-slate-50 hover:bg-red-50 cursor-pointer transition-colors"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPromptModal({ isOpen: true, type: 'diesel', title: 'Enter new Diesel value', placeholder: 'e.g. 150L' });
            setPromptValue('');
          }}
        >
          <Plus size={14} />
          Add New Diesel Value
        </div>
      </components.MenuList>
    );
  };

  const uniqueAdvance = [...new Set([...reportsData.map(r => String(r.advance)), ...extraAdvanceOptions])]
    .filter(Boolean)
    .sort((a, b) => {
      const numA = parseFloat(String(a).replace(/[^0-9.]/g, '')) || 0;
      const numB = parseFloat(String(b).replace(/[^0-9.]/g, '')) || 0;
      return numA !== numB ? numA - numB : String(a).localeCompare(String(b));
    });
  const advanceOptions = uniqueAdvance.map(val => ({ label: val, value: val }));

  const AdvanceMenuList = (props) => {
    return (
      <components.MenuList {...props}>
        {props.children}
        <div 
          className="p-2.5 border-t border-slate-100 text-red-600 font-bold text-xs flex items-center gap-2 bg-slate-50 hover:bg-red-50 cursor-pointer transition-colors"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPromptModal({ isOpen: true, type: 'advance', title: 'Enter new Advance value (₹)', placeholder: 'e.g. 5000' });
            setPromptValue('');
          }}
        >
          <Plus size={14} />
          Add New Advance Value
        </div>
      </components.MenuList>
    );
  };

  const uniqueParties = [...new Set([...reportsData.map(r => r.partyName), ...extraPartyOptions])]
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));
  const partyOptions = uniqueParties.map(p => ({ label: p, value: p }));

  const PartyMenuList = (props) => {
    return (
      <components.MenuList {...props}>
        {props.children}
        <div 
          className="p-2.5 border-t border-slate-100 text-red-600 font-bold text-xs flex items-center gap-2 bg-slate-50 hover:bg-red-50 cursor-pointer transition-colors"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPromptModal({ isOpen: true, type: 'party', title: 'Enter new Party Name', placeholder: 'e.g. ABC Logistics' });
            setPromptValue('');
          }}
        >
          <Plus size={14} />
          Add New Party Name
        </div>
      </components.MenuList>
    );
  };

  const uniqueDoParties = [...new Set([...reportsData.map(r => r.doPartyName), ...extraDoPartyOptions])]
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));
  const doPartyOptions = uniqueDoParties.map(p => ({ label: p, value: p }));

  const DoPartyMenuList = (props) => {
    return (
      <components.MenuList {...props}>
        {props.children}
        <div 
          className="p-2.5 border-t border-slate-100 text-red-600 font-bold text-xs flex items-center gap-2 bg-slate-50 hover:bg-red-50 cursor-pointer transition-colors"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPromptModal({ isOpen: true, type: 'doparty', title: 'Enter new DO Party Name', placeholder: 'e.g. XYZ Transports' });
            setPromptValue('');
          }}
        >
          <Plus size={14} />
          Add New DO Party Name
        </div>
      </components.MenuList>
    );
  };

  const DoNoOptionComponent = useMemo(() => makeCustomOption('dono'), [reportsData, extraDoNoOptions]);
  const uniqueDoNumbersList = [...new Set([...reportsData.map(item => item.doNo), ...extraDoNoOptions])]
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));
  const doNoOptions = uniqueDoNumbersList.map(no => ({ label: String(no), value: String(no) }));

  const DoNoMenuList = (props) => {
    return (
      <components.MenuList {...props}>
        {props.children}
        <div 
          className="p-2.5 border-t border-slate-100 text-red-600 font-bold text-xs flex items-center gap-2 bg-slate-50 hover:bg-red-50 cursor-pointer transition-colors"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPromptModal({ isOpen: true, type: 'dono', title: 'Enter new DO Number', placeholder: 'e.g. 87912' });
            setPromptValue('');
          }}
        >
          <Plus size={14} />
          Add New DO Number
        </div>
      </components.MenuList>
    );
  };

  // Distance Dropdown
  const DistanceOptionComponent = useMemo(() => makeCustomOption('distance'), [reportsData, extraDistanceOptions]);
  const uniqueDistancesList = [...new Set([...reportsData.map(item => item.distance), ...extraDistanceOptions])]
    .filter(Boolean)
    .sort((a, b) => {
      const numA = parseFloat(String(a).replace(/[^0-9.]/g, '')) || 0;
      const numB = parseFloat(String(b).replace(/[^0-9.]/g, '')) || 0;
      return numA !== numB ? numA - numB : String(a).localeCompare(String(b));
    });
  const distanceOptions = uniqueDistancesList.map(d => ({ label: String(d), value: String(d) }));

  const DistanceMenuList = (props) => (
    <components.MenuList {...props}>
      {props.children}
      <div 
        className="p-2.5 border-t border-slate-100 text-red-600 font-bold text-xs flex items-center gap-2 bg-slate-50 hover:bg-red-50 cursor-pointer transition-colors"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setPromptModal({ isOpen: true, type: 'distance', title: 'Enter new Distance', placeholder: 'e.g. 58 km' });
          setPromptValue('');
        }}
      >
        <Plus size={14} />
        Add New Distance
      </div>
    </components.MenuList>
  );

  // Diesel Price Dropdown
  const DieselPriceOptionComponent = useMemo(() => makeCustomOption('dieselPrice'), [reportsData, extraDieselPriceOptions]);
  const uniqueDieselPricesList = [...new Set([...reportsData.map(item => item.dieselPrice ? String(item.dieselPrice) : null), ...extraDieselPriceOptions])]
    .filter(Boolean)
    .sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
  const dieselPriceOptions = uniqueDieselPricesList.map(p => ({ label: `₹${p}`, value: String(p) }));

  const DieselPriceMenuList = (props) => (
    <components.MenuList {...props}>
      {props.children}
      <div 
        className="p-2.5 border-t border-slate-100 text-red-600 font-bold text-xs flex items-center gap-2 bg-slate-50 hover:bg-red-50 cursor-pointer transition-colors"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setPromptModal({ isOpen: true, type: 'dieselPrice', title: 'Enter new Diesel Price (₹/L)', placeholder: 'e.g. 96' });
          setPromptValue('');
        }}
      >
        <Plus size={14} />
        Add New Diesel Price
      </div>
    </components.MenuList>
  );

  // Total Trips Dropdown
  const TripsOptionComponent = useMemo(() => makeCustomOption('trips'), [reportsData, extraTripsOptions]);
  const uniqueTripsList = [...new Set([...reportsData.map(item => item.totalTrips ? String(item.totalTrips) : null), ...extraTripsOptions, '1', '2', '3'])]
    .filter(Boolean)
    .sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
  const tripsOptions = uniqueTripsList.map(t => ({ label: String(t), value: String(t) }));

  const TripsMenuList = (props) => (
    <components.MenuList {...props}>
      {props.children}
      <div 
        className="p-2.5 border-t border-slate-100 text-red-600 font-bold text-xs flex items-center gap-2 bg-slate-50 hover:bg-red-50 cursor-pointer transition-colors"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setPromptModal({ isOpen: true, type: 'trips', title: 'Enter new Total Trips', placeholder: 'e.g. 1' });
          setPromptValue('');
        }}
      >
        <Plus size={14} />
        Add New Total Trips
      </div>
    </components.MenuList>
  );

  // Rate Per MT Dropdown
  const PerMTOptionComponent = useMemo(() => makeCustomOption('perMT'), [reportsData, extraPerMTOptions]);
  const uniquePerMTList = [...new Set([...reportsData.map(item => item.perMT ? String(item.perMT) : null), ...extraPerMTOptions])]
    .filter(Boolean)
    .sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
  const perMTOptions = uniquePerMTList.map(m => ({ label: `₹${m}`, value: String(m) }));

  const PerMTMenuList = (props) => (
    <components.MenuList {...props}>
      {props.children}
      <div 
        className="p-2.5 border-t border-slate-100 text-red-600 font-bold text-xs flex items-center gap-2 bg-slate-50 hover:bg-red-50 cursor-pointer transition-colors"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setPromptModal({ isOpen: true, type: 'perMT', title: 'Enter new Rate Per MT (₹)', placeholder: 'e.g. 1200' });
          setPromptValue('');
        }}
      >
        <Plus size={14} />
        Add New Rate Per MT
      </div>
    </components.MenuList>
  );

  // Tonnage Dropdown
  const TonnageOptionComponent = useMemo(() => makeCustomOption('tonnage'), [reportsData, extraTonnageOptions]);
  const uniqueTonnageList = [...new Set([...reportsData.map(item => item.tonnage ? String(item.tonnage) : null), ...extraTonnageOptions])]
    .filter(Boolean)
    .sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
  const tonnageOptions = uniqueTonnageList.map(tn => ({ label: `${tn} MT`, value: String(tn) }));

  const TonnageMenuList = (props) => (
    <components.MenuList {...props}>
      {props.children}
      <div 
        className="p-2.5 border-t border-slate-100 text-red-600 font-bold text-xs flex items-center gap-2 bg-slate-50 hover:bg-red-50 cursor-pointer transition-colors"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setPromptModal({ isOpen: true, type: 'tonnage', title: 'Enter new Tonnage (MT)', placeholder: 'e.g. 35' });
          setPromptValue('');
        }}
      >
        <Plus size={14} />
        Add New Tonnage
      </div>
    </components.MenuList>
  );

  // Export functions
  const exportToPDF = () => {
    if (filteredData.length === 0) return toast.error("No data to export!");
    const doc = new jsPDF({ orientation: 'landscape' });
    
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text("Truck Reports Analytics", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const currentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    doc.text(`Generated on: ${currentDate}`, 14, 28);

    const tableColumn = ["S.No", "Date", "Vehicle No", "From", "To", "Dist.", "Departure Time", "Arrival Time", "Unload Time", "Turnaround (TAT)", "Status", "Diesel", "Price", "Total Diesel Price", "Advance", "DO No", "Tonnage", "Freight", "Trips", "Per MT", "Balance"];
    const tableRows = [];
    filteredData.forEach(row => {
      const dL = parseFloat(String(row.diesel || '').replace(/[^0-9.]/g, '')) || 0;
      const dP = parseFloat(row.dieselPrice) || 0;
      const totalDieselCost = Math.round(dL * dP);
      const tatDisplay = row.turnaroundHours ? `${row.turnaroundHours} hrs (${row.turnaroundDays} d)` : '—';
      tableRows.push([
        row.sNo, row.date, row.vehicleNo, row.from, row.to, row.distance, 
        row.departureTime || '—', row.arrivalTime || '—', row.unloadingTime || '—', tatDisplay, row.tatStatus || '—',
        row.diesel, row.dieselPrice, totalDieselCost, row.advance, row.doNo, 
        row.tonnage, row.totalFreight, row.totalTrips, row.perMT, row.vehicleBalance
      ]);
    });

    autoTable(doc, { 
      head: [tableColumn], 
      body: tableRows, 
      startY: 35,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'center',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [220, 38, 38], // Red accent matching system
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    doc.save(`Truck_Reports_${currentDate.replace(/ /g, '_')}.pdf`);
    toast.success("PDF exported successfully!");
  };

  const exportToExcel = () => {
    if (filteredData.length === 0) return toast.error("No data to export!");
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reports");
    XLSX.writeFile(workbook, "Truck_Reports.xlsx");
    toast.success("Excel exported successfully!");
  };

  // Download Sample Template for Bulk Import (Excel & CSV format ready)
  const downloadBulkTemplate = (fileType = 'xlsx') => {
    const templateData = [
      {
        "SL.NO.": 1,
        "DATE": "2026-09-22",
        "VEHICLE NO.": "CG10CG9022",
        "Trip Count": 1,
        "DISP. WT.": 32.50,
        "REC.WT.": 32.30,
        "Freight RATE": 350,
        "DO NO.": "87912",
        "MINES": "DIPKA",
        "Do Party Name": "BALAJI FUELS",
        "Driver Name": "RAMESH KUMAR",
        "Received Party": "NANDAN SMELTER",
        "Billing PARTY": "JAY BHOLE ENTERPRISES",
        "DIESEL in Litre": 35,
        "MINES EXP.": 100,
        "BILTY EXP.": 50,
        "ADV": 500,
        "Fastage": 200,
        "SHORTAGE": 70,
        "Total Expenses": "",
        "Freight Amount": "",
        "Balance Freight": ""
      },
      {
        "SL.NO.": 2,
        "DATE": "2026-09-22",
        "VEHICLE NO.": "CG10CG6822",
        "Trip Count": 1,
        "DISP. WT.": 33.10,
        "REC.WT.": 32.95,
        "Freight RATE": 350,
        "DO NO.": "87912",
        "MINES": "DIPKA",
        "Do Party Name": "BALAJI FUELS",
        "Driver Name": "RAMESH KUMAR",
        "Received Party": "NANDAN SMELTER",
        "Billing PARTY": "JAY BHOLE ENTERPRISES",
        "DIESEL in Litre": 37.85,
        "MINES EXP.": 100,
        "BILTY EXP.": 50,
        "ADV": 500,
        "Fastage": 200,
        "SHORTAGE": 52.50,
        "Total Expenses": "",
        "Freight Amount": "",
        "Balance Freight": ""
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Auto set optimal column widths so headers look clean in Excel
    const colWidths = [
      { wch: 8 },  // SL.NO.
      { wch: 12 }, // DATE
      { wch: 15 }, // VEHICLE NO.
      { wch: 12 }, // Trip Count
      { wch: 12 }, // DISP. WT.
      { wch: 12 }, // REC.WT.
      { wch: 14 }, // Freight RATE
      { wch: 12 }, // DO NO.
      { wch: 15 }, // MINES
      { wch: 20 }, // Do Party Name
      { wch: 18 }, // Driver Name
      { wch: 20 }, // Received Party
      { wch: 24 }, // Billing PARTY
      { wch: 15 }, // DIESEL in Litre
      { wch: 13 }, // MINES EXP.
      { wch: 13 }, // BILTY EXP.
      { wch: 10 }, // ADV
      { wch: 10 }, // Fastage
      { wch: 12 }, // SHORTAGE
      { wch: 16 }, // Total Expenses
      { wch: 16 }, // Freight Amount
      { wch: 16 }  // Balance Freight
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Trip_Reports_Template");

    if (fileType === 'csv') {
      XLSX.writeFile(workbook, "Truck_Trip_Bulk_Template.csv", { bookType: 'csv' });
      toast.success("CSV Template downloaded!");
    } else {
      XLSX.writeFile(workbook, "Truck_Trip_Bulk_Template.xlsx");
      toast.success("Excel Template downloaded!");
    }
  };

  // Process and Auto-Calculate Trip Row
  const processTripRow = (rawRow, index) => {
    // Normalizing keys case-insensitively & removing special characters / spaces
    const normalized = {};
    Object.keys(rawRow).forEach(key => {
      const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      normalized[cleanKey] = rawRow[key];
    });

    const getVal = (...keys) => {
      for (const k of keys) {
        const clean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalized[clean] !== undefined && normalized[clean] !== null && String(normalized[clean]).trim() !== '') {
          return normalized[clean];
        }
      }
      return '';
    };

    // Extract values & robust Date parsing
    let rawDate = getVal('date', 'tripdate', 'dateoftrip');
    let date = '';

    if (rawDate !== undefined && rawDate !== null && rawDate !== '') {
      if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
        const year = rawDate.getFullYear();
        const month = String(rawDate.getMonth() + 1).padStart(2, '0');
        const day = String(rawDate.getDate()).padStart(2, '0');
        date = `${year}-${month}-${day}`;
      } else if (typeof rawDate === 'number' || (!isNaN(Number(rawDate)) && !String(rawDate).includes('-') && !String(rawDate).includes('/'))) {
        // Excel serial date number (e.g. 46296 -> 2026-10-09)
        const serial = Number(rawDate);
        if (serial > 10000 && serial < 80000) {
          const excelEpoch = new Date(Date.UTC(1899, 11, 30));
          const parsed = new Date(excelEpoch.getTime() + Math.round(serial) * 86400 * 1000);
          if (!isNaN(parsed.getTime())) {
            const y = parsed.getUTCFullYear();
            const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
            const d = String(parsed.getUTCDate()).padStart(2, '0');
            date = `${y}-${m}-${d}`;
          }
        }
      }

      if (!date) {
        const dateStr = String(rawDate).trim();
        const sep = dateStr.includes('/') ? '/' : (dateStr.includes('-') ? '-' : (dateStr.includes('.') ? '.' : ''));
        if (sep) {
          const parts = dateStr.split(sep);
          if (parts.length === 3) {
            let p0 = parts[0].trim();
            let p1 = parts[1].trim();
            let p2 = parts[2].trim();

            if (p0.length === 4) {
              // YYYY-MM-DD or YYYY-DD-MM
              const y = p0;
              let m = parseInt(p1, 10);
              let d = parseInt(p2, 10);
              if (m > 12 && d <= 12) {
                // Inverted: YYYY-DD-MM -> swap to YYYY-MM-DD
                const temp = m; m = d; d = temp;
              }
              date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            } else {
              // DD/MM/YYYY or MM/DD/YYYY
              const y = p2.length === 2 ? `20${p2}` : (p2.length === 4 ? p2 : p2);
              let first = parseInt(p0, 10);
              let second = parseInt(p1, 10);

              // Standard Indian/SECL format is DD/MM/YYYY
              let day = first;
              let month = second;

              if (first <= 12 && second > 12) {
                // MM/DD/YYYY format
                month = first;
                day = second;
              }

              if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                date = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              }
            }
          }
        } else if (!isNaN(Date.parse(dateStr))) {
          const parsed = new Date(dateStr);
          const y = parsed.getFullYear();
          const m = String(parsed.getMonth() + 1).padStart(2, '0');
          const d = String(parsed.getDate()).padStart(2, '0');
          date = `${y}-${m}-${d}`;
        }
      }
    }

    if (!date) {
      date = new Date().toISOString().split('T')[0];
    }

    const vehicleNo = String(getVal('vehicleno', 'truckno', 'vehiclenumber', 'truck', 'vehicle') || '').trim().toUpperCase();
    
    // Origin / From / Mines
    const from = String(getVal('mines', 'mine', 'fromorigin', 'from', 'origin', 'fromlocation', 'loadingpoint') || '').trim();
    
    // Destination / To / Received Party
    const to = String(getVal('receivedparty', 'recparty', 'receiverparty', 'todestination', 'to', 'destination', 'tolocation', 'unloadingpoint') || '').trim();
    
    let distance = String(getVal('distancekm', 'distance', 'dist', 'km') || '').trim();
    if (distance && !distance.toLowerCase().includes('km') && !isNaN(Number(distance))) {
      distance = `${distance} km`;
    }

    // Party Names
    const partyName = String(getVal('billingparty', 'partyname', 'party') || '').trim();
    const doPartyName = String(getVal('dopartyname', 'doparty') || '').trim();
    const driverName = String(getVal('drivername', 'driver', 'pilotname') || '').trim();
    const receivedParty = to;
    const doNo = String(getVal('dono', 'donumber') || '').trim();

    // Turnaround Time (TAT) Fields from file
    const departureTime = String(getVal('departuretime', 'departure', 'depttime', 'deptime', 'startdatetime') || '').trim();
    const arrivalTime = String(getVal('arrivaltime', 'arrival', 'arrtime', 'reachdatetime') || '').trim();
    const unloadingTime = String(getVal('unloadingtime', 'unloadtime', 'unloadedtime', 'completedatetime') || '').trim();

    const tatCalc = calculateTurnaround(departureTime, unloadingTime, arrivalTime);

    // Diesel in Litres (Store clean numeric string in DB without extra 'L')
    let dieselRaw = String(getVal('dieselinlitre', 'diesell', 'diesel', 'fuel') || '').trim();
    let dieselNumeric = parseFloat(dieselRaw.replace(/[^0-9.]/g, '')) || 0;
    let diesel = dieselNumeric > 0 ? String(dieselNumeric) : '';

    // Diesel Price (e.g. 94.50)
    const dieselPriceRaw = String(getVal('dieselpricers', 'dieselprice', 'fuelprice', 'rateperliter', 'price') || '');
    const dieselPrice = parseFloat(dieselPriceRaw.replace(/[^0-9.]/g, '')) || 0;

    // Advance (e.g. 500)
    const advanceRaw = String(getVal('adv', 'advancers', 'advance', 'driveradvance') || '');
    const advance = parseFloat(advanceRaw.replace(/[^0-9.]/g, '')) || 0;

    // Total Trips / Trip Count
    const totalTripsRaw = String(getVal('tripcount', 'totaltrips', 'trips') || '');
    const totalTrips = parseInt(totalTripsRaw.replace(/[^0-9]/g, ''), 10) || 1;

    // Dispatch Weight (DISP. WT.) / Tonnage
    const tonnageRaw = String(getVal('dispwt', 'dispatchwt', 'dispatchweight', 'tonnagemt', 'tonnage', 'weight', 'mt') || '');
    const tonnage = parseFloat(tonnageRaw.replace(/[^0-9.]/g, '')) || 0;

    // Received Weight (REC.WT.)
    const recWeightRaw = String(getVal('recwt', 'receivedwt', 'receivedweight', 'recweight') || '');
    const recWeight = parseFloat(recWeightRaw.replace(/[^0-9.]/g, '')) || 0;

    // Freight Rate (per MT)
    const perMTRaw = String(getVal('freightrate', 'ratepermtrs', 'ratepermt', 'permt', 'rate') || '');
    const perMT = parseFloat(perMTRaw.replace(/[^0-9.]/g, '')) || 0;

    // Expenses: Mines Exp, Bilty Exp, Fastag, Shortage
    const minesExpRaw = String(getVal('minesexp', 'mineexp', 'mineexpense') || '');
    const minesExp = parseFloat(minesExpRaw.replace(/[^0-9.]/g, '')) || 0;

    const biltyExpRaw = String(getVal('biltyexp', 'biltyexpense', 'builtyexp') || '');
    const biltyExp = parseFloat(biltyExpRaw.replace(/[^0-9.]/g, '')) || 0;

    const fastagRaw = String(getVal('fastage', 'fastag', 'fastagexp', 'toll') || '');
    const fastagExp = parseFloat(fastagRaw.replace(/[^0-9.]/g, '')) || 0;

    const shortageRaw = String(getVal('shortage', 'shortageexp', 'shortageamt') || '');
    const parsedShortage = parseFloat(shortageRaw.replace(/[^0-9.]/g, '')) || 0;
    // Round to max 2 decimal places to eliminate floating point issues (e.g. 0.58 instead of 0.580000000000054)
    const shortageAmount = Math.round(parsedShortage * 100) / 100;

    // Calculations:
    // 1. Total Diesel Price = Diesel(L) * Diesel Price(₹)
    const totalDieselPrice = Math.round(dieselNumeric * dieselPrice);

    // 2. Total Freight = Rate Per MT * Tonnage (DISP. WT.)
    const userFreightAmount = parseFloat(String(getVal('freightamount', 'totalfreight') || '').replace(/[^0-9.]/g, '')) || 0;
    const totalFreight = userFreightAmount > 0 
      ? Math.round(userFreightAmount) 
      : ((perMT > 0 && tonnage > 0) ? Math.round(perMT * tonnage) : 0);

    // 3. Total Expenses = Total Diesel Cost + Mines Exp + Bilty Exp + Advance + Fastag + Shortage
    const userTotalExpenses = parseFloat(String(getVal('totalexpenses', 'totalexpense') || '').replace(/[^0-9.]/g, '')) || 0;
    const calculatedExpenses = totalDieselPrice + minesExp + biltyExp + advance + fastagExp + shortageAmount;
    const totalExpenses = userTotalExpenses > 0 ? Math.round(userTotalExpenses) : Math.round(calculatedExpenses);

    // 4. Vehicle Balance = Total Freight - Total Expenses
    const userBalanceFreight = parseFloat(String(getVal('balancefreight', 'vehiclebalance', 'balance') || '').replace(/[^0-9.-]/g, '')) || 0;
    const vehicleBalance = userBalanceFreight !== 0 
      ? Math.round(userBalanceFreight) 
      : (totalFreight > 0 ? Math.round(totalFreight - totalExpenses) : 0);

    return {
      index: index + 1,
      date: date || new Date().toISOString().split('T')[0],
      vehicleNo,
      from,
      to,
      distance,
      partyName,
      doPartyName,
      driverName,
      receivedParty,
      doNo,
      diesel,
      dieselNumeric,
      dieselPrice,
      totalDieselPrice,
      advance,
      totalTrips,
      perMT,
      tonnage,
      recWeight,
      minesExp,
      biltyExp,
      fastagExp,
      shortageAmount,
      totalExpenses,
      totalFreight,
      vehicleBalance,
      departureTime,
      arrivalTime,
      unloadingTime,
      turnaroundHours: tatCalc.hours,
      turnaroundDays: tatCalc.days,
      tatStatus: tatCalc.status,
      isValid: Boolean(vehicleNo)
    };
  };

  // Helper to extract clean array of rows from sheet (auto-skipping banner/title rows at top)
  const extractSheetData = (sheet) => {
    // Read sheet as 2D array of rows
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    if (!rawRows || rawRows.length === 0) return [];

    // Find the header row (look for row containing 'VEHICLE NO' or 'SL.NO' or 'VEHICLE')
    let headerRowIdx = -1;
    let vehicleColIdx = -1;

    for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
      const row = rawRows[r];
      if (Array.isArray(row)) {
        for (let c = 0; c < row.length; c++) {
          const cellStr = String(row[c] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cellStr.includes('vehicleno') || cellStr === 'truckno' || cellStr === 'vehicle') {
            headerRowIdx = r;
            vehicleColIdx = c;
            break;
          }
        }
        if (headerRowIdx !== -1) break;
      }
    }

    // If no explicit header found in top 15 rows, fallback to standard sheet_to_json
    if (headerRowIdx === -1) {
      return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    }

    const headers = rawRows[headerRowIdx].map(h => String(h || '').trim());
    const dataObjects = [];

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || !Array.isArray(row)) continue;

      // STRICT VALIDATION: If row doesn't have a Vehicle No, it's a summary/footer row!
      const vehicleVal = vehicleColIdx !== -1 ? String(row[vehicleColIdx] || '').trim() : '';
      if (!vehicleVal) {
        continue; // Skip footer / summary / empty lines completely
      }

      // Check if row has any non-empty value
      const hasContent = row.some(cell => String(cell || '').trim() !== '');
      if (!hasContent) continue;

      const obj = {};
      headers.forEach((hdr, colIdx) => {
        if (hdr) {
          obj[hdr] = row[colIdx] !== undefined ? row[colIdx] : '';
        }
      });

      // Filter out footer summary lines (like "Total Trips", "Other Expenses", "AMC EMI", etc.)
      const rowString = row.join(' ').toLowerCase();
      if (rowString.includes('total trips') || rowString.includes('other expenses') || rowString.includes('amc emi') || rowString.includes('monthly emi') || rowString.includes('driver salary')) {
        continue;
      }

      dataObjects.push(obj);
    }

    return dataObjects;
  };

  // Handle Bulk File Upload (Excel or CSV)
  const handleBulkFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFile(file);
    const fileName = file.name.toLowerCase();

    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
      toast.error("Please upload a valid Excel (.xlsx, .xls) or CSV (.csv) file!");
      return;
    }

    const reader = new FileReader();

    if (fileName.endsWith('.csv')) {
      reader.onload = (evt) => {
        try {
          const csvText = evt.target.result;
          const workbook = XLSX.read(csvText, { type: 'string', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          const jsonData = extractSheetData(sheet);

          if (!jsonData || jsonData.length === 0) {
            toast.error("The CSV file is empty!");
            return;
          }

          const parsed = jsonData.map((row, idx) => processTripRow(row, idx));
          setBulkParsedData(parsed);
          setBulkCurrentPage(1);
          toast.success(`Loaded ${parsed.length} rows from CSV! Review & Click Upload.`);
        } catch (err) {
          console.error("Error reading CSV:", err);
          toast.error("Failed to parse CSV file!");
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          const jsonData = extractSheetData(sheet);

          if (!jsonData || jsonData.length === 0) {
            toast.error("The Excel sheet is empty!");
            return;
          }

          const parsed = jsonData.map((row, idx) => processTripRow(row, idx));
          setBulkParsedData(parsed);
          setBulkCurrentPage(1);
          toast.success(`Loaded ${parsed.length} rows from Excel! Review & Click Upload.`);
        } catch (err) {
          console.error("Error reading Excel:", err);
          toast.error("Failed to parse Excel file!");
        }
      };
      reader.readAsArrayBuffer(file);
    }
    // Reset file input target value so re-uploading works
    e.target.value = '';
  };

  // Save Bulk Records to Supabase with Complete Calculated Data
  const handleBulkUploadSubmit = async () => {
    if (!bulkParsedData || bulkParsedData.length === 0) {
      toast.error("No valid trip data to upload!");
      return;
    }

    const invalidRows = bulkParsedData.filter(r => !r.isValid);
    if (invalidRows.length > 0) {
      if (!window.confirm(`${invalidRows.length} rows do not have Vehicle Number. Proceed anyway? (Invalid rows will be skipped)`)) {
        return;
      }
    }

    const rowsToInsert = bulkParsedData
      .filter(r => r.isValid)
      .map(r => ({
        date: r.date,
        vehicle_no: r.vehicleNo,
        from_location: r.from,
        to_location: r.to || r.receivedParty,
        distance: r.distance,
        party_name: r.partyName,
        do_party_name: r.doPartyName,
        driver_name: r.driverName || null,
        diesel: r.diesel,
        diesel_price: Number(r.dieselPrice) || 0,
        advance: Number(r.advance) || 0,
        do_no: r.doNo,
        tonnage: Number(r.tonnage) || 0,
        rec_weight: Number(r.recWeight) || 0,
        total_trips: Number(r.totalTrips) || 1,
        per_mt: Number(r.perMT) || 0,
        mines_exp: Number(r.minesExp) || 0,
        bilty_exp: Number(r.biltyExp) || 0,
        fastag_exp: Number(r.fastagExp) || 0,
        shortage_amount: Number(r.shortageAmount) || 0,
        total_expenses: Number(r.totalExpenses) || 0,
        total_freight: Number(r.totalFreight) || 0,
        vehicle_balance: Number(r.vehicleBalance) || 0,
        departure_time: r.departureTime || null,
        arrival_time: r.arrivalTime || null,
        unloading_time: r.unloadingTime || null,
        turnaround_hours: r.turnaroundHours !== '' && !isNaN(Number(r.turnaroundHours)) ? Number(r.turnaroundHours) : null,
        turnaround_days: r.turnaroundDays !== '' && !isNaN(Number(r.turnaroundDays)) ? Number(r.turnaroundDays) : null,
        tat_status: r.tatStatus || null
      }));

    if (rowsToInsert.length === 0) {
      toast.error("No valid rows remaining after filtering!");
      return;
    }

    setBulkUploading(true);
    try {
      let { data, error } = await supabase
        .from('truck_reports')
        .insert(rowsToInsert);

      // Fallback if TAT columns are not present in DB
      if (error && error.message?.includes('column')) {
        console.warn("TAT columns missing during bulk upload, falling back to core fields:", error.message);
        const fallbackRows = rowsToInsert.map(({ departure_time, arrival_time, unloading_time, turnaround_hours, turnaround_days, tat_status, ...rest }) => rest);
        const res = await supabase.from('truck_reports').insert(fallbackRows);
        error = res.error;
      }

      if (error) {
        console.error("Supabase bulk insert error:", error);
        toast.error(`Error saving records: ${error.message}`);
      } else {
        toast.success(`Successfully uploaded ${rowsToInsert.length} trips with calculations!`);
        setIsBulkModalOpen(false);
        setBulkFile(null);
        setBulkParsedData([]);
        await fetchReports();
      }
    } catch (err) {
      console.error("Error in bulk upload:", err);
      toast.error("Unexpected error occurred during upload.");
    } finally {
      setBulkUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-slate-50 min-h-screen animate-pulse space-y-6">
        <div className="h-10 bg-slate-200 rounded-2xl w-1/4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-28 bg-slate-200 rounded-2xl"></div>
          <div className="h-28 bg-slate-200 rounded-2xl"></div>
          <div className="h-28 bg-slate-200 rounded-2xl"></div>
          <div className="h-28 bg-slate-200 rounded-2xl"></div>
        </div>
        <div className="h-16 bg-slate-200 rounded-2xl"></div>
        <div className="h-96 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1550px] mx-auto p-3 sm:p-5 lg:p-6 space-y-5 sm:space-y-6 animate-in fade-in duration-300">
      <Toaster position="top-right" />
      
      {/* ═══════════════════════════════════════════════════════════
          EXECUTIVE BRAND HEADER - FLEET & LOGISTICS
      ═══════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-red-600 via-rose-700 to-red-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 border border-red-500/30">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-black/15 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>

        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[11px] font-extrabold uppercase tracking-widest text-red-100 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-amber-300 shrink-0" />
            <span>Jay Bhole Fleet & Logistics • Reports Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Truck className="h-7 w-7 text-white/90 shrink-0" />
            Truck Trip Reports & Logistics Hub
          </h1>
          <p className="text-red-100/90 text-xs sm:text-sm max-w-2xl font-medium leading-relaxed">
            Real-time fleet trip monitoring, diesel metrics, route distances & financial freight settlements.
          </p>
        </div>

        {/* Action Buttons: PDF, Excel, Add New */}
        <div className="relative z-10 flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <button 
            onClick={exportToPDF}
            className="bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Export PDF"
          >
            <Download size={15} /> 
            <span>PDF</span>
          </button>
          
          <button 
            onClick={exportToExcel}
            className="bg-emerald-600/90 hover:bg-emerald-600 text-white backdrop-blur-md border border-emerald-400/30 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Export Excel"
          >
            <FileSpreadsheet size={15} /> 
            <span>Excel</span>
          </button>

          <button 
            onClick={() => {
              setBulkFile(null);
              setBulkParsedData([]);
              setIsBulkModalOpen(true);
            }}
            className="bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Bulk Upload Excel/CSV"
          >
            <Upload size={15} /> 
            <span>Bulk Upload</span>
          </button>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-white hover:bg-red-50 text-red-700 px-4 py-2 rounded-xl font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Plus size={16} /> 
            <span>Add New Trip</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          EXECUTIVE KPI SUMMARY METRICS CARDS + TAT METRICS
      ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Card 1: Total Trips */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between group">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Total Trips
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight group-hover:text-red-600 transition-colors">
              {totalTripsCount}
            </div>
            <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              Dispatches
            </span>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Truck size={20} />
          </div>
        </div>

        {/* Card 2: Avg Turnaround (TAT) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between group">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Avg Turnaround
            </span>
            <div className="text-xl sm:text-2xl font-black text-indigo-700 tracking-tight">
              {avgTurnaroundHours} <span className="text-xs font-bold text-slate-400">hrs</span>
            </div>
            <span className="text-[10px] text-indigo-600 font-semibold">
              ≈ {avgTurnaroundDays} Days Avg
            </span>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <Timer size={20} />
          </div>
        </div>

        {/* Card 3: Active Trips in Transit */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between group">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              In Transit
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-600 tracking-tight">
              {activeTripsCount}
            </div>
            <span className="text-[10px] text-amber-700 font-medium">Pending Unload</span>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <Clock size={20} />
          </div>
        </div>

        {/* Card 4: Total Advance */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between group">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Total Advance
            </span>
            <div className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
              ₹{totalAdvanceSum.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Driver Advance</span>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-rose-600 group-hover:text-white transition-colors">
            <IndianRupee size={20} />
          </div>
        </div>

        {/* Card 5: Total Diesel */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between group">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Total Diesel
            </span>
            <div className="text-lg sm:text-xl font-black text-purple-700 tracking-tight">
              {totalDieselSum.toLocaleString('en-IN')} L
            </div>
            <span className="text-[10px] text-purple-600 font-medium">Fuel Issued</span>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <Fuel size={20} />
          </div>
        </div>

        {/* Card 6: Total Distance */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between group">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Total Highway
            </span>
            <div className="text-lg sm:text-xl font-black text-emerald-600 tracking-tight">
              {totalDistanceSum.toLocaleString('en-IN')} KM
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">Highway Run</span>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Route size={20} />
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════
          ADVANCED FILTER CONTROLLER BAR
      ═══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
        
        <div className="flex flex-col lg:flex-row gap-3.5 items-stretch lg:items-center justify-between">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search by Vehicle, DO No, Party, Origin, Destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium placeholder:text-slate-400 shadow-2xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            
            {/* Vehicle Filter */}
            <div className="min-w-[130px] flex-1 sm:flex-initial">
              <select 
                value={filterVehicleNo} 
                onChange={(e) => setFilterVehicleNo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer"
              >
                <option value="">All Vehicles</option>
                {uniqueVehicles.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            {/* DO Number Filter */}
            <div className="min-w-[130px] flex-1 sm:flex-initial">
              <select 
                value={filterDoNo} 
                onChange={(e) => setFilterDoNo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer"
              >
                <option value="">All DO Numbers</option>
                {uniqueDoNumbers.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* From Date */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1.5">
              <Calendar size={13} className="text-slate-400 shrink-0" />
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-medium outline-none cursor-pointer"
                title="From Date"
              />
            </div>

            {/* To Date */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1.5">
              <Calendar size={13} className="text-slate-400 shrink-0" />
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-medium outline-none cursor-pointer"
                title="To Date"
              />
            </div>

            {/* Clear Filter Button */}
            {(searchTerm || fromDate || toDate || filterVehicleNo || filterDoNo) && (
              <button 
                onClick={() => { setFromDate(''); setToDate(''); setFilterVehicleNo(''); setFilterDoNo(''); setSearchTerm(''); }}
                className="px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}

            {/* Bulk Delete Button when items selected */}
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isDeletingBulk}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all cursor-pointer animate-in zoom-in-95"
                title="Delete selected trips"
              >
                <Trash2 size={13} />
                <span>Delete Selected ({selectedIds.length})</span>
              </button>
            )}

          </div>

        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════
          DATA TABLE CONTAINER (DESKTOP)
      ═══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        
        {/* ═══════════ DESKTOP TABLE VIEW (Hidden on mobile < md) ═══════════ */}
        <div 
          className="hidden md:block overflow-x-auto overflow-y-auto max-h-[65vh] custom-sidebar-scroll"
          onScroll={handleTableScroll}
        >
          <table className="w-full text-left border-collapse min-w-[1700px]">
            <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md border-b border-slate-200">
              <tr className="text-xs font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-3 text-center whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={displayedData.length > 0 && displayedData.every(r => selectedIds.includes(r.id))}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                    title="Select / Deselect all visible trips"
                  />
                </th>
                <th className="py-3.5 px-3.5 text-center whitespace-nowrap">S.No</th>
                <th className="py-3.5 px-3.5 text-center whitespace-nowrap">View</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">Date</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">Vehicle No.</th>
                <th className="py-3.5 px-3.5 text-center whitespace-nowrap">Trip Count</th>
                <th className="py-3.5 px-3.5 text-right whitespace-nowrap">Disp. Wt.</th>
                <th className="py-3.5 px-3.5 text-right whitespace-nowrap">Rec. Wt.</th>
                <th className="py-3.5 px-3.5 text-right whitespace-nowrap">Freight Rate</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">DO No.</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">Mines / Route</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">DO Party</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">Driver Name</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">Received Party</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">Billing Party</th>
                <th className="py-3.5 px-3.5 text-center whitespace-nowrap bg-indigo-50/70 text-indigo-800">
                  <div className="flex items-center justify-center gap-1">
                    <Timer size={13} />
                    <span>Turnaround (TAT)</span>
                  </div>
                </th>
                <th className="py-3.5 px-3.5 text-right whitespace-nowrap">Diesel (L)</th>
                <th className="py-3.5 px-3.5 text-right whitespace-nowrap">Mines Exp</th>
                <th className="py-3.5 px-3.5 text-right whitespace-nowrap">Bilty Exp</th>
                <th className="py-3.5 px-3.5 text-right whitespace-nowrap">Advance</th>
                <th className="py-3.5 px-3.5 text-right whitespace-nowrap">Fastag</th>
                <th className="py-3.5 px-3.5 text-right whitespace-nowrap">Shortage</th>
                <th className="py-3.5 px-3.5 text-right whitespace-nowrap text-amber-700 bg-amber-50/50">Total Expenses</th>
                <th className="py-3.5 px-3.5 text-right whitespace-nowrap text-emerald-700 bg-emerald-50/50">Freight Amount</th>
                <th className="py-3.5 px-3.5 text-right whitespace-nowrap text-blue-700 bg-blue-50/50">Balance Freight</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
              {displayedData.length > 0 ? (
                displayedData.map((row, index) => {
                  const dieselNum = parseFloat(String(row.diesel || '').replace(/[^0-9.]/g, '')) || 0;
                  const dieselPriceNum = parseFloat(row.dieselPrice) || 0;
                  const totalDieselPrice = Math.round(dieselNum * dieselPriceNum);
                  const minesExpVal = parseFloat(row.minesExp) || 0;
                  const biltyExpVal = parseFloat(row.biltyExp) || 0;
                  const advanceVal = parseFloat(row.advance) || 0;
                  const fastagVal = parseFloat(row.fastagExp) || 0;
                  const shortageVal = parseFloat(row.shortageAmount) || 0;
                  const autoCalculatedExpenses = totalDieselPrice + minesExpVal + biltyExpVal + advanceVal + fastagVal + shortageVal;
                  const totalExpDisplay = (row.totalExpenses !== '' && row.totalExpenses !== undefined && row.totalExpenses !== null && Number(row.totalExpenses) > 0)
                    ? Number(row.totalExpenses)
                    : autoCalculatedExpenses;

                  return (
                    <tr 
                      key={row.id || index} 
                      className={`hover:bg-slate-50/80 transition-colors group ${selectedIds.includes(row.id) ? 'bg-red-50/40' : ''}`}
                    >
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={() => handleToggleSelectRow(row.id)}
                          className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                        />
                      </td>
                      <td className="py-3.5 px-3.5 text-center font-bold text-slate-400">
                        {row.sNo}
                      </td>
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setViewModal({ isOpen: true, data: row })}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer inline-flex items-center justify-center shadow-2xs"
                          title="View Trip Details"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                      <td className="py-3.5 px-3.5 font-semibold text-slate-700 whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200/90 rounded-lg font-black font-mono tracking-wider text-xs shadow-2xs">
                          {row.vehicleNo?.toUpperCase().includes('CG') ? row.vehicleNo : `CG-10-CG ${row.vehicleNo}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-3.5 text-center font-bold text-slate-800 whitespace-nowrap">
                        {row.totalTrips || 1}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-bold text-slate-800 whitespace-nowrap">
                        {row.tonnage ? `${row.tonnage} MT` : '—'}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-medium text-slate-700 whitespace-nowrap">
                        {row.recWeight ? `${row.recWeight} MT` : '—'}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-semibold text-slate-700 whitespace-nowrap">
                        ₹{row.perMT || 0}
                      </td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap font-mono font-bold text-slate-700">
                        {row.doNo ? (
                          <span className="bg-slate-100 border border-slate-200/70 px-2.5 py-0.5 rounded text-xs">
                            {row.doNo}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap font-medium">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">
                          <span>{row.from || '—'}</span>
                          {row.to && (
                            <>
                              <ArrowRight size={12} className="text-red-500 shrink-0" />
                              <span>{row.to}</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap font-medium text-slate-600">
                        {row.doPartyName || '—'}
                      </td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap font-semibold text-slate-700">
                        {row.driverName || '—'}
                      </td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap font-medium text-slate-600">
                        {row.receivedParty || '—'}
                      </td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap font-medium text-slate-600">
                        {row.partyName || '—'}
                      </td>
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap bg-indigo-50/20">
                        {row.turnaroundHours ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-700 font-mono shadow-2xs">
                              <Timer size={12} />
                              {row.turnaroundHours} hrs
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                              {row.turnaroundDays} Days • {row.tatStatus || 'Done'}
                            </span>
                          </div>
                        ) : row.departureTime ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 animate-pulse">
                            <Clock size={11} />
                            In Transit
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 font-medium">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-black text-purple-700 whitespace-nowrap">
                        {(() => {
                          if (!row.diesel) return '—';
                          const cleanVal = String(row.diesel).replace(/[^0-9.]/g, '').trim();
                          return cleanVal ? `${cleanVal} L` : '—';
                        })()}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-medium text-slate-600 whitespace-nowrap">
                        ₹{row.minesExp || 0}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-medium text-slate-600 whitespace-nowrap">
                        ₹{row.biltyExp || 0}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-black text-amber-600 whitespace-nowrap">
                        ₹{row.advance ? Number(row.advance).toLocaleString('en-IN') : 0}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-medium text-slate-600 whitespace-nowrap">
                        ₹{row.fastagExp || 0}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-medium text-slate-600 whitespace-nowrap">
                        {(() => {
                          if (!row.shortageAmount && row.shortageAmount !== 0) return '₹0';
                          const n = parseFloat(row.shortageAmount);
                          return isNaN(n) ? '₹0' : `₹${parseFloat(n.toFixed(2))}`;
                        })()}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-black text-amber-700 bg-amber-50/30 whitespace-nowrap">
                        ₹{totalExpDisplay.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-black text-emerald-700 bg-emerald-50/30 whitespace-nowrap">
                        ₹{row.totalFreight ? Number(row.totalFreight).toLocaleString('en-IN') : 0}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-black bg-blue-50/30 whitespace-nowrap">
                        <span className={Number(row.vehicleBalance) >= 0 ? "text-emerald-600" : "text-rose-600"}>
                          ₹{row.vehicleBalance ? Number(row.vehicleBalance).toLocaleString('en-IN') : 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button 
                            onClick={() => handleEditReport(row)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                            title="Edit trip report"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteReport(row.sNo)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                            title="Delete trip report"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={25} className="py-12 text-center text-slate-400">
                    <Truck className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No trip reports found matching your filters</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting search or date filters above.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ═══════════ MOBILE CARDS VIEW (Visible on mobile screens < md) ═══════════ */}
        <div 
          className="block md:hidden p-3 sm:p-4 space-y-3 bg-slate-50/70 max-h-[72vh] overflow-y-auto custom-sidebar-scroll"
          onScroll={handleTableScroll}
        >
          {displayedData.length > 0 ? (
            displayedData.map((row, index) => (
              <div 
                key={row.id || index}
                className={`bg-white rounded-2xl p-4 border transition-all space-y-3 ${selectedIds.includes(row.id) ? 'border-red-400 bg-red-50/20 shadow-md' : 'border-slate-200/90 shadow-2xs hover:shadow-md'}`}
              >
                {/* Header: Checkbox + S.No + Vehicle Badge + Action Buttons */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={() => handleToggleSelectRow(row.id)}
                      className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600 shrink-0"
                    />
                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                      #{row.sNo}
                    </span>
                    <button
                      type="button"
                      onClick={() => setViewModal({ isOpen: true, data: row })}
                      className="p-1 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                      title="View Details"
                    >
                      <Eye size={13} />
                    </button>
                    <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/90 rounded-lg font-black font-mono tracking-wider text-xs shadow-2xs truncate">
                      {row.vehicleNo?.toUpperCase().includes('CG') ? row.vehicleNo : `CG-10-CG ${row.vehicleNo}`}
                    </span>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      onClick={() => handleEditReport(row)}
                      className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                      title="Edit trip report"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteReport(row.sNo)}
                      className="p-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                      title="Delete trip report"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Date & Route Container */}
                <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                      <Calendar size={13} className="text-slate-400 shrink-0" />
                      <span>{row.date}</span>
                    </div>
                    {row.distance && (
                      <span className="font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200/70 text-[11px]">
                        {row.distance} KM
                      </span>
                    )}
                  </div>

                  {/* Route From -> To */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold text-xs shadow-2xs">
                      {row.from || 'Origin'}
                    </span>
                    <ArrowRight size={13} className="text-red-500 shrink-0" />
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold text-xs shadow-2xs">
                      {row.to || 'Destination'}
                    </span>
                  </div>

                  {/* Turnaround Time (TAT) Badge in Mobile */}
                  {row.turnaroundHours ? (
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-xs">
                      <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                        <Timer size={12} /> Turnaround:
                      </span>
                      <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                        {row.turnaroundHours} hrs ({row.turnaroundDays} d)
                      </span>
                    </div>
                  ) : row.departureTime ? (
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-xs">
                      <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                        <Clock size={12} /> Status:
                      </span>
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 animate-pulse">
                        In Transit
                      </span>
                    </div>
                  ) : null}

                  {/* Parties & Driver Info */}
                  {(row.doPartyName || row.driverName) && (
                    <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between gap-2 text-xs">
                      <div className="truncate text-left">
                        {row.driverName && (
                          <>
                            <span className="text-slate-400 text-[11px] font-medium">Driver: </span>
                            <span className="font-bold text-slate-800">{row.driverName}</span>
                          </>
                        )}
                      </div>
                      <div className="truncate text-right">
                        {row.doPartyName && (
                          <>
                            <span className="text-slate-400 text-[11px] font-medium">DO Party: </span>
                            <span className="font-bold text-slate-700">{row.doPartyName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2x3 Grid of Metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* DO No. */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DO Number</span>
                    <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block truncate">
                      {row.doNo ? `#${row.doNo}` : '—'}
                    </span>
                  </div>

                  {/* Tonnage & Trips */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tonnage / Trips</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block truncate">
                      {row.tonnage ? `${row.tonnage} MT` : '—'} <span className="text-xs text-slate-500">({row.totalTrips || 1} Trip)</span>
                    </span>
                  </div>

                  {/* Diesel */}
                  <div className="bg-purple-50/50 p-2.5 rounded-xl border border-purple-100/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Diesel (L × Rate)</span>
                    <span className="font-mono font-black text-purple-700 text-sm mt-0.5 block truncate">
                      {row.diesel ? `${row.diesel} L` : '—'} <span className="text-[11px] font-normal text-slate-500">(@ ₹{row.dieselPrice || 0})</span>
                    </span>
                  </div>

                  {/* Total Diesel Price */}
                  <div className="bg-purple-50/80 p-2.5 rounded-xl border border-purple-200/90 shadow-2xs">
                    <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Total Diesel Price</span>
                    <span className="font-mono font-black text-purple-800 text-sm mt-0.5 block truncate">
                      {(() => {
                        const dL = parseFloat(String(row.diesel || '').replace(/[^0-9.]/g, '')) || 0;
                        const dP = parseFloat(row.dieselPrice) || 0;
                        const total = Math.round(dL * dP);
                        return total > 0 ? `₹ ${total.toLocaleString('en-IN')}` : '₹ 0';
                      })()}
                    </span>
                  </div>

                  {/* Advance */}
                  <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Advance Disbursed</span>
                    <span className="font-mono font-black text-amber-600 text-sm mt-0.5 block truncate">
                      ₹ {row.advance ? Number(row.advance).toLocaleString('en-IN') : 0}
                    </span>
                  </div>

                  {/* Freight */}
                  <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Total Freight</span>
                    <span className="font-mono font-black text-emerald-700 text-sm mt-0.5 block truncate">
                      ₹ {row.totalFreight ? Number(row.totalFreight).toLocaleString('en-IN') : 0}
                    </span>
                  </div>

                  {/* Per MT Rate */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rate Per MT</span>
                    <span className="font-mono font-bold text-slate-700 text-sm mt-0.5 block truncate">
                      ₹ {row.perMT || 0}
                    </span>
                  </div>
                </div>

                {/* Footer: Vehicle Balance */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500 font-semibold">Vehicle Balance:</span>
                  <span className={`font-mono font-black px-2.5 py-1 rounded-lg border text-sm ${
                    Number(row.vehicleBalance) >= 0 
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200/80" 
                      : "text-rose-700 bg-rose-50 border-rose-200/80"
                  }`}>
                    ₹ {row.vehicleBalance ? Number(row.vehicleBalance).toLocaleString('en-IN') : 0}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
              <Truck className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700 text-sm">No trip reports found matching your filters</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting search or date filters above.</p>
            </div>
          )}
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════
          ADD / EDIT TRIP MODAL
      ═══════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Truck size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 leading-tight">
                    {editingId ? 'Update Trip Report' : 'Record New Truck Trip'}
                  </h2>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    Transportation & Logistics Operations Entry
                  </p>
                </div>
              </div>

              <button 
                onClick={() => { setIsModalOpen(false); setEditingId(null); }}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddReport} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-sidebar-scroll bg-slate-50/30">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Date */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Trip Date *</label>
                  <input 
                    type="date" 
                    name="date" 
                    value={formData.date} 
                    onChange={handleInputChange} 
                    required 
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all shadow-2xs"
                  />
                </div>

                {/* Vehicle No */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Vehicle No. *</label>
                  <Select
                    isClearable
                    options={vehicleOptions}
                    value={formData.vehicleNo ? { label: formData.vehicleNo, value: formData.vehicleNo } : null}
                    onChange={(newValue) => handleInputChange({ target: { name: 'vehicleNo', value: newValue ? newValue.value : '' } })}
                    placeholder="Select Vehicle..."
                    styles={{
                      control: (base) => ({
                        ...base,
                        padding: '2px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: 'none',
                        fontSize: '14px',
                        '&:hover': { borderColor: '#cbd5e1' }
                      }),
                      menu: (base) => ({ ...base, zIndex: 9999 })
                    }}
                  />
                </div>

                {/* Origin / Mines */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">From (Origin / Mines) *</label>
                  <Select
                    isClearable
                    options={fromOptions}
                    value={formData.from ? { label: formData.from, value: formData.from } : null}
                    onChange={(newValue) => handleInputChange({ target: { name: 'from', value: newValue ? newValue.value : '' } })}
                    placeholder="Select Origin / Mines..."
                    components={{ MenuList: CustomMenuList, Option: FromOptionComponent }}
                    styles={{
                      control: (base) => ({
                        ...base,
                        padding: '2px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '14px',
                        '&:hover': { borderColor: '#cbd5e1' }
                      }),
                      menu: (base) => ({ ...base, zIndex: 9999 })
                    }}
                  />
                </div>

                {/* Received Party / Destination */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Received Party (To Destination) *</label>
                  <Select
                    isClearable
                    options={toOptions}
                    value={(formData.receivedParty || formData.to) ? { label: (formData.receivedParty || formData.to), value: (formData.receivedParty || formData.to) } : null}
                    onChange={(newValue) => {
                      const val = newValue ? newValue.value : '';
                      handleInputChange({ target: { name: 'to', value: val } });
                      handleInputChange({ target: { name: 'receivedParty', value: val } });
                    }}
                    placeholder="Select Received Party..."
                    components={{ MenuList: ToMenuList, Option: ToOptionComponent }}
                    styles={{
                      control: (base) => ({
                        ...base,
                        padding: '2px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '14px',
                        '&:hover': { borderColor: '#cbd5e1' }
                      }),
                      menu: (base) => ({ ...base, zIndex: 9999 })
                    }}
                  />
                </div>

                {/* Distance */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Distance (KM) *</label>
                  <Select
                    isClearable
                    options={distanceOptions}
                    value={formData.distance ? { label: formData.distance, value: formData.distance } : null}
                    onChange={(newValue) => handleInputChange({ target: { name: 'distance', value: newValue ? newValue.value : '' } })}
                    placeholder="Select or enter distance..."
                    components={{ MenuList: DistanceMenuList, Option: DistanceOptionComponent }}
                    styles={{
                      control: (base) => ({
                        ...base,
                        padding: '2px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '14px',
                        '&:hover': { borderColor: '#cbd5e1' }
                      }),
                      menu: (base) => ({ ...base, zIndex: 9999 })
                    }}
                  />
                </div>

                {/* Diesel Liter */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Diesel (L)</label>
                  <Select
                    isClearable
                    options={dieselOptions}
                    value={formData.diesel ? { label: formData.diesel, value: formData.diesel } : null}
                    onChange={(newValue) => handleInputChange({ target: { name: 'diesel', value: newValue ? newValue.value : '' } })}
                    placeholder="Select or enter liters..."
                    components={{ MenuList: DieselMenuList, Option: DieselOptionComponent }}
                    styles={{
                      control: (base) => ({
                        ...base,
                        padding: '2px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '14px',
                        '&:hover': { borderColor: '#cbd5e1' }
                      }),
                      menu: (base) => ({ ...base, zIndex: 9999 })
                    }}
                  />
                </div>

                {/* Diesel Price */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Diesel Price (₹/L)</label>
                  <Select
                    isClearable
                    options={dieselPriceOptions}
                    value={formData.dieselPrice ? { label: `₹${formData.dieselPrice}`, value: String(formData.dieselPrice) } : null}
                    onChange={(newValue) => handleInputChange({ target: { name: 'dieselPrice', value: newValue ? newValue.value : '' } })}
                    placeholder="Select diesel price..."
                    components={{ MenuList: DieselPriceMenuList, Option: DieselPriceOptionComponent }}
                    styles={{
                      control: (base) => ({
                        ...base,
                        padding: '2px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '14px',
                        '&:hover': { borderColor: '#cbd5e1' }
                      }),
                      menu: (base) => ({ ...base, zIndex: 9999 })
                    }}
                  />
                </div>

                {/* Total Diesel Cost (Calculated) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-purple-700 uppercase">Total Diesel Price (₹)</label>
                  <input 
                    type="text" 
                    readOnly
                    value={
                      (() => {
                        const dL = parseFloat(String(formData.diesel || '').replace(/[^0-9.]/g, '')) || 0;
                        const dP = parseFloat(formData.dieselPrice) || 0;
                        return (dL > 0 && dP > 0) ? `₹${Math.round(dL * dP).toLocaleString('en-IN')}` : '';
                      })()
                    }
                    placeholder="Auto (Diesel L × Price)" 
                    className="w-full px-3.5 py-2.5 bg-purple-50 border border-purple-200 rounded-xl text-sm font-black text-purple-800 outline-none shadow-2xs"
                  />
                </div>

                {/* Advance */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Advance (₹)</label>
                  <Select
                    isClearable
                    options={advanceOptions}
                    value={formData.advance ? { label: formData.advance, value: formData.advance } : null}
                    onChange={(newValue) => handleInputChange({ target: { name: 'advance', value: newValue ? newValue.value : '' } })}
                    placeholder="Select advance..."
                    components={{ MenuList: AdvanceMenuList, Option: AdvanceOptionComponent }}
                    styles={{
                      control: (base) => ({
                        ...base,
                        padding: '2px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '14px',
                        '&:hover': { borderColor: '#cbd5e1' }
                      }),
                      menu: (base) => ({ ...base, zIndex: 9999 })
                    }}
                  />
                </div>

                {/* DO No */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">DO Number *</label>
                  <Select
                    isClearable
                    options={doNoOptions}
                    value={formData.doNo ? { label: formData.doNo, value: formData.doNo } : null}
                    onChange={(newValue) => handleInputChange({ target: { name: 'doNo', value: newValue ? newValue.value : '' } })}
                    placeholder="Select DO Number..."
                    components={{ MenuList: DoNoMenuList, Option: DoNoOptionComponent }}
                    styles={{
                      control: (base) => ({
                        ...base,
                        padding: '2px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '14px',
                        '&:hover': { borderColor: '#cbd5e1' }
                      }),
                      menu: (base) => ({ ...base, zIndex: 9999 })
                    }}
                  />
                </div>

                {/* DO Party Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">DO Party Name</label>
                  <Select
                    isClearable
                    options={doPartyOptions}
                    value={formData.doPartyName ? { label: formData.doPartyName, value: formData.doPartyName } : null}
                    onChange={(newValue) => handleInputChange({ target: { name: 'doPartyName', value: newValue ? newValue.value : '' } })}
                    placeholder="Select DO Party..."
                    components={{ MenuList: DoPartyMenuList, Option: DoPartyOptionComponent }}
                    styles={{
                      control: (base) => ({
                        ...base,
                        padding: '2px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '14px',
                        '&:hover': { borderColor: '#cbd5e1' }
                      }),
                      menu: (base) => ({ ...base, zIndex: 9999 })
                    }}
                  />
                </div>

                {/* Driver Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Driver Name</label>
                  <input
                    type="text"
                    name="driverName"
                    value={formData.driverName || ''}
                    onChange={handleInputChange}
                    placeholder="Enter driver name..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all shadow-2xs"
                  />
                </div>

                {/* Billing Party */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Billing Party</label>
                  <Select
                    isClearable
                    options={partyOptions}
                    value={formData.partyName ? { label: formData.partyName, value: formData.partyName } : null}
                    onChange={(newValue) => handleInputChange({ target: { name: 'partyName', value: newValue ? newValue.value : '' } })}
                    placeholder="Select billing party..."
                    components={{ MenuList: PartyMenuList, Option: PartyOptionComponent }}
                    styles={{
                      control: (base) => ({
                        ...base,
                        padding: '2px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '14px',
                        '&:hover': { borderColor: '#cbd5e1' }
                      }),
                      menu: (base) => ({ ...base, zIndex: 9999 })
                    }}
                  />
                </div>

                {/* Total Trips */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Trip Count / Total Trips *</label>
                  <Select
                    isClearable
                    options={tripsOptions}
                    value={formData.totalTrips ? { label: String(formData.totalTrips), value: String(formData.totalTrips) } : null}
                    onChange={(newValue) => handleInputChange({ target: { name: 'totalTrips', value: newValue ? newValue.value : '' } })}
                    placeholder="Select trips..."
                    components={{ MenuList: TripsMenuList, Option: TripsOptionComponent }}
                    styles={{
                      control: (base) => ({
                        ...base,
                        padding: '2px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '14px',
                        '&:hover': { borderColor: '#cbd5e1' }
                      }),
                      menu: (base) => ({ ...base, zIndex: 9999 })
                    }}
                  />
                </div>

                {/* Dispatch Weight (DISP. WT.) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Disp. Wt. (Tonnage MT) *</label>
                  <Select
                    isClearable
                    options={tonnageOptions}
                    value={formData.tonnage ? { label: `${formData.tonnage} MT`, value: String(formData.tonnage) } : null}
                    onChange={(newValue) => handleInputChange({ target: { name: 'tonnage', value: newValue ? newValue.value : '' } })}
                    placeholder="Select dispatch weight..."
                    components={{ MenuList: TonnageMenuList, Option: TonnageOptionComponent }}
                    styles={{
                      control: (base) => ({
                        ...base,
                        padding: '2px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '14px',
                        '&:hover': { borderColor: '#cbd5e1' }
                      }),
                      menu: (base) => ({ ...base, zIndex: 9999 })
                    }}
                  />
                </div>

                {/* Received Weight (REC. WT.) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Rec. Wt. (MT)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="recWeight"
                    value={formData.recWeight || ''}
                    onChange={handleInputChange}
                    placeholder="e.g. 32.30"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
                  />
                </div>

                {/* Freight Rate / Per MT */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Freight Rate (₹/MT) *</label>
                  <Select
                    isClearable
                    options={perMTOptions}
                    value={formData.perMT ? { label: `₹${formData.perMT}`, value: String(formData.perMT) } : null}
                    onChange={(newValue) => handleInputChange({ target: { name: 'perMT', value: newValue ? newValue.value : '' } })}
                    placeholder="Select Freight Rate..."
                    components={{ MenuList: PerMTMenuList, Option: PerMTOptionComponent }}
                    styles={{
                      control: (base) => ({
                        ...base,
                        padding: '2px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '14px',
                        '&:hover': { borderColor: '#cbd5e1' }
                      }),
                      menu: (base) => ({ ...base, zIndex: 9999 })
                    }}
                  />
                </div>

                {/* Mines Exp */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Mines Exp. (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="minesExp"
                    value={formData.minesExp || ''}
                    onChange={handleInputChange}
                    placeholder="e.g. 100"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
                  />
                </div>

                {/* Bilty Exp */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Bilty Exp. (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="biltyExp"
                    value={formData.biltyExp || ''}
                    onChange={handleInputChange}
                    placeholder="e.g. 50"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
                  />
                </div>

                {/* Fastag Exp */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Fastage / Fastag (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="fastagExp"
                    value={formData.fastagExp || ''}
                    onChange={handleInputChange}
                    placeholder="e.g. 200"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
                  />
                </div>

                {/* Shortage Amount */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Shortage (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="shortageAmount"
                    value={formData.shortageAmount || ''}
                    onChange={handleInputChange}
                    placeholder="e.g. 70"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
                  />
                </div>

                {/* Total Expenses (Calculated) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-700 uppercase">Total Expenses (Calculated)</label>
                  <input 
                    type="number" 
                    name="totalExpenses" 
                    value={formData.totalExpenses || ''} 
                    onChange={handleInputChange} 
                    placeholder="Auto calculated" 
                    readOnly
                    className="w-full px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm font-black text-amber-800 outline-none shadow-2xs"
                  />
                </div>

                {/* Total Freight / Freight Amount (Calculated) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-emerald-700 uppercase">Freight Amount (Calculated)</label>
                  <input 
                    type="number" 
                    name="totalFreight" 
                    value={formData.totalFreight} 
                    onChange={handleInputChange} 
                    placeholder="Auto calculated" 
                    readOnly
                    className="w-full px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-black text-emerald-800 outline-none shadow-2xs"
                  />
                </div>

                {/* Vehicle Balance / Balance Freight (Calculated) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-blue-700 uppercase">Balance Freight (Calculated)</label>
                  <input 
                    type="number" 
                    name="vehicleBalance" 
                    value={formData.vehicleBalance} 
                    onChange={handleInputChange} 
                    placeholder="Auto calculated" 
                    readOnly
                    className="w-full px-3.5 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm font-black text-blue-800 outline-none shadow-2xs"
                  />
                </div>

              </div>

              {/* ═══════════════════════════════════════════════════════════
                  TRUCK TURNAROUND TIME (TAT) TRACKING SECTION
              ═══════════════════════════════════════════════════════════ */}
              <div className="mt-4 p-4 sm:p-5 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/60 rounded-2xl border border-indigo-200/80 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                      <Timer size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-indigo-950 uppercase tracking-wide">
                        Truck Turnaround Time (TAT) Journey Tracking
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Departure ➔ Arrival ➔ Unloading Completion • Auto Duration Calculation
                      </p>
                    </div>
                  </div>
                  {formData.turnaroundHours ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-300 flex items-center gap-1 shadow-2xs">
                      <CheckCircle2 size={13} />
                      {formData.turnaroundHours} hrs ({formData.turnaroundDays} d)
                    </span>
                  ) : formData.departureTime ? (
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300 flex items-center gap-1">
                      <Clock size={13} />
                      In Transit
                    </span>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Departure Time */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                      <PlayCircle size={13} className="text-blue-600" />
                      <span>Departure Time</span>
                    </label>
                    <input 
                      type="datetime-local" 
                      name="departureTime" 
                      value={formData.departureTime} 
                      onChange={handleInputChange} 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none shadow-2xs"
                    />
                  </div>

                  {/* Arrival Time */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                      <Clock size={13} className="text-amber-600" />
                      <span>Arrival Time</span>
                    </label>
                    <input 
                      type="datetime-local" 
                      name="arrivalTime" 
                      value={formData.arrivalTime} 
                      onChange={handleInputChange} 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none shadow-2xs"
                    />
                  </div>

                  {/* Unloading Time */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                      <StopCircle size={13} className="text-emerald-600" />
                      <span>Unloading Completion</span>
                    </label>
                    <input 
                      type="datetime-local" 
                      name="unloadingTime" 
                      value={formData.unloadingTime} 
                      onChange={handleInputChange} 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none shadow-2xs"
                    />
                  </div>
                </div>

                {/* Auto Calculated TAT Display */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="bg-white/80 p-3 rounded-xl border border-indigo-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 uppercase">Turnaround Time (Hours)</span>
                    <span className="font-mono font-black text-indigo-700 text-sm">
                      {formData.turnaroundHours ? `${formData.turnaroundHours} Hours` : '— (Auto)'}
                    </span>
                  </div>
                  <div className="bg-white/80 p-3 rounded-xl border border-indigo-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 uppercase">Turnaround Duration (Days)</span>
                    <span className="font-mono font-black text-indigo-700 text-sm">
                      {formData.turnaroundDays ? `${formData.turnaroundDays} Days` : '— (Auto)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); setEditingId(null); }}
                  className="px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-7 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black rounded-xl shadow-md shadow-red-500/20 hover:shadow-lg transition-all text-xs sm:text-sm cursor-pointer"
                >
                  {editingId ? 'Update Trip Report' : 'Save Trip Report'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          CUSTOM PROMPT MODAL (ADD NEW ORIGIN/DESTINATION/PARTY)
      ═══════════════════════════════════════════════════════════ */}
      {promptModal.isOpen && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm leading-tight">{promptModal.title}</h3>
                  <p className="text-[10px] text-slate-400">Add new option to the database</p>
                </div>
              </div>
              <button 
                onClick={() => setPromptModal({ isOpen: false, type: null, title: '', placeholder: '' })}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">New Value</label>
                <input 
                  type="text" 
                  value={promptValue} 
                  onChange={(e) => setPromptValue(e.target.value)} 
                  placeholder={promptModal.placeholder}
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('prompt-add-btn')?.click();
                    }
                  }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setPromptModal({ isOpen: false, type: null, title: '', placeholder: '' })}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  id="prompt-add-btn" 
                  type="button" 
                  onClick={() => {
                    if (promptValue.trim()) {
                      const val = (promptModal.type === 'from' || promptModal.type === 'to') ? promptValue.trim().toUpperCase() : promptValue.trim();
                      if (promptModal.type === 'from') {
                        setExtraFromOptions(prev => [...prev, val]);
                        handleInputChange({ target: { name: 'from', value: val } });
                      } else if (promptModal.type === 'to') {
                        setExtraToOptions(prev => [...prev, val]);
                        handleInputChange({ target: { name: 'to', value: val } });
                      } else if (promptModal.type === 'diesel') {
                        setExtraDieselOptions(prev => [...prev, val]);
                        handleInputChange({ target: { name: 'diesel', value: val } });
                      } else if (promptModal.type === 'advance') {
                        setExtraAdvanceOptions(prev => [...prev, val]);
                        handleInputChange({ target: { name: 'advance', value: val } });
                      } else if (promptModal.type === 'party') {
                        setExtraPartyOptions(prev => [...prev, val]);
                        handleInputChange({ target: { name: 'partyName', value: val } });
                      } else if (promptModal.type === 'doparty') {
                        setExtraDoPartyOptions(prev => [...prev, val]);
                        handleInputChange({ target: { name: 'doPartyName', value: val } });
                      } else if (promptModal.type === 'dono') {
                        setExtraDoNoOptions(prev => [...prev, val]);
                        handleInputChange({ target: { name: 'doNo', value: val } });
                      } else if (promptModal.type === 'distance') {
                        setExtraDistanceOptions(prev => [...prev, val]);
                        handleInputChange({ target: { name: 'distance', value: val } });
                      } else if (promptModal.type === 'dieselPrice') {
                        setExtraDieselPriceOptions(prev => [...prev, val]);
                        handleInputChange({ target: { name: 'dieselPrice', value: val } });
                      } else if (promptModal.type === 'trips') {
                        setExtraTripsOptions(prev => [...prev, val]);
                        handleInputChange({ target: { name: 'totalTrips', value: val } });
                      } else if (promptModal.type === 'perMT') {
                        setExtraPerMTOptions(prev => [...prev, val]);
                        handleInputChange({ target: { name: 'perMT', value: val } });
                      } else if (promptModal.type === 'tonnage') {
                        setExtraTonnageOptions(prev => [...prev, val]);
                        handleInputChange({ target: { name: 'tonnage', value: val } });
                      }
                    }
                    setPromptModal({ isOpen: false, type: null, title: '', placeholder: '' });
                  }}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-sm transition-all"
                >
                  Save Option
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          VIEW TRIP DETAILS MODAL (OPENED BY EYE BUTTON)
      ═══════════════════════════════════════════════════════════ */}
      {viewModal.isOpen && viewModal.data && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Eye size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 leading-tight">
                    Trip Report Details #{viewModal.data.sNo}
                  </h2>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    Vehicle: {viewModal.data.vehicleNo} • Date: {viewModal.data.date}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setViewModal({ isOpen: false, data: null })}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 custom-sidebar-scroll bg-slate-50/30 text-sm">
              {/* Route banner */}
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Route</span>
                  <div className="flex items-center gap-2 font-black text-slate-800 text-sm">
                    <span>{viewModal.data.from || 'Origin'}</span>
                    <ArrowRight size={14} className="text-red-500" />
                    <span>{viewModal.data.to || 'Destination'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Distance</span>
                  <p className="font-mono font-bold text-slate-700 text-sm">{viewModal.data.distance || '—'}</p>
                </div>
              </div>

              {/* Turnaround Time (TAT) Banner in View Modal */}
              <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                    <Timer size={14} className="text-indigo-600" />
                    Turnaround Time (TAT) Journey
                  </span>
                  {viewModal.data.turnaroundHours ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-300">
                      {viewModal.data.turnaroundHours} hrs ({viewModal.data.turnaroundDays} d)
                    </span>
                  ) : viewModal.data.departureTime ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
                      In Transit
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Not Recorded</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                  <div className="bg-white/90 p-2 rounded-xl border border-indigo-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Departure</span>
                    <span className="font-semibold text-slate-800 text-[11px] block mt-0.5">
                      {viewModal.data.departureTime ? new Date(viewModal.data.departureTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </span>
                  </div>
                  <div className="bg-white/90 p-2 rounded-xl border border-indigo-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Arrival</span>
                    <span className="font-semibold text-slate-800 text-[11px] block mt-0.5">
                      {viewModal.data.arrivalTime ? new Date(viewModal.data.arrivalTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </span>
                  </div>
                  <div className="bg-white/90 p-2 rounded-xl border border-indigo-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Unload Done</span>
                    <span className="font-semibold text-slate-800 text-[11px] block mt-0.5">
                      {viewModal.data.unloadingTime ? new Date(viewModal.data.unloadingTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid of Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehicle No</span>
                  <span className="font-mono font-black text-blue-700 text-sm mt-0.5 block">{viewModal.data.vehicleNo}</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">DO Number</span>
                  <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">{viewModal.data.doNo || '—'}</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">DO Party Name</span>
                  <span className="font-bold text-slate-700 text-sm mt-0.5 block">{viewModal.data.doPartyName || '—'}</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Driver Name</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{viewModal.data.driverName || '—'}</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Received Party</span>
                  <span className="font-bold text-slate-700 text-sm mt-0.5 block">{viewModal.data.receivedParty || '—'}</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Billing Party</span>
                  <span className="font-bold text-slate-700 text-sm mt-0.5 block">{viewModal.data.partyName || '—'}</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Trip Count</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{viewModal.data.totalTrips || 1}</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Disp. Wt. (Tonnage)</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{viewModal.data.tonnage ? `${viewModal.data.tonnage} MT` : '—'}</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Rec. Wt.</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{viewModal.data.recWeight ? `${viewModal.data.recWeight} MT` : '—'}</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Freight Rate</span>
                  <span className="font-mono font-bold text-slate-700 text-sm mt-0.5 block">₹{viewModal.data.perMT || 0}</span>
                </div>

                <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-200/80">
                  <span className="text-[10px] font-bold text-purple-700 uppercase block">Diesel (Liters)</span>
                  <span className="font-mono font-black text-purple-700 text-sm mt-0.5 block">
                    {(() => {
                      if (!viewModal.data.diesel) return '—';
                      const cleanVal = String(viewModal.data.diesel).replace(/[^0-9.]/g, '').trim();
                      return cleanVal ? `${cleanVal} L` : '—';
                    })()}
                  </span>
                </div>

                <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-200/80">
                  <span className="text-[10px] font-bold text-purple-700 uppercase block">Diesel Price (₹/L)</span>
                  <span className="font-mono font-bold text-purple-700 text-sm mt-0.5 block">₹{viewModal.data.dieselPrice || 0}</span>
                </div>

                <div className="bg-purple-100/70 p-3 rounded-xl border border-purple-300">
                  <span className="text-[10px] font-bold text-purple-800 uppercase block">Total Diesel Price</span>
                  <span className="font-mono font-black text-purple-900 text-sm mt-0.5 block">
                    {(() => {
                      const dL = parseFloat(String(viewModal.data.diesel || '').replace(/[^0-9.]/g, '')) || 0;
                      const dP = parseFloat(viewModal.data.dieselPrice) || 0;
                      return `₹${Math.round(dL * dP).toLocaleString('en-IN')}`;
                    })()}
                  </span>
                </div>

                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
                  <span className="text-[10px] font-bold text-amber-700 uppercase block">Advance Amount</span>
                  <span className="font-mono font-black text-amber-600 text-sm mt-0.5 block">₹{viewModal.data.advance ? Number(viewModal.data.advance).toLocaleString('en-IN') : 0}</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Mines Exp.</span>
                  <span className="font-mono font-bold text-slate-700 text-sm mt-0.5 block">₹{viewModal.data.minesExp ? Number(viewModal.data.minesExp).toLocaleString('en-IN') : 0}</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Bilty Exp.</span>
                  <span className="font-mono font-bold text-slate-700 text-sm mt-0.5 block">₹{viewModal.data.biltyExp ? Number(viewModal.data.biltyExp).toLocaleString('en-IN') : 0}</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Fastag Exp.</span>
                  <span className="font-mono font-bold text-slate-700 text-sm mt-0.5 block">₹{viewModal.data.fastagExp ? Number(viewModal.data.fastagExp).toLocaleString('en-IN') : 0}</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Shortage</span>
                  <span className="font-mono font-bold text-slate-700 text-sm mt-0.5 block">
                    {(() => {
                      if (!viewModal.data.shortageAmount && viewModal.data.shortageAmount !== 0) return '₹0';
                      const n = parseFloat(viewModal.data.shortageAmount);
                      return isNaN(n) ? '₹0' : `₹${parseFloat(n.toFixed(2))}`;
                    })()}
                  </span>
                </div>

                <div className="bg-amber-100/70 p-3 rounded-xl border border-amber-300">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Total Expenses</span>
                  <span className="font-mono font-black text-amber-900 text-sm mt-0.5 block">
                    {(() => {
                      const dL = parseFloat(String(viewModal.data.diesel || '').replace(/[^0-9.]/g, '')) || 0;
                      const dP = parseFloat(viewModal.data.dieselPrice) || 0;
                      const dTotal = Math.round(dL * dP);
                      const mE = parseFloat(viewModal.data.minesExp) || 0;
                      const bE = parseFloat(viewModal.data.biltyExp) || 0;
                      const adv = parseFloat(viewModal.data.advance) || 0;
                      const fE = parseFloat(viewModal.data.fastagExp) || 0;
                      const sE = parseFloat(viewModal.data.shortageAmount) || 0;
                      const autoCalc = dTotal + mE + bE + adv + fE + sE;
                      const finalExp = (viewModal.data.totalExpenses !== '' && Number(viewModal.data.totalExpenses) > 0)
                        ? Number(viewModal.data.totalExpenses)
                        : autoCalc;
                      return `₹${finalExp.toLocaleString('en-IN')}`;
                    })()}
                  </span>
                </div>

                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/80">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Freight Amount</span>
                  <span className="font-mono font-black text-emerald-700 text-sm mt-0.5 block">₹{viewModal.data.totalFreight ? Number(viewModal.data.totalFreight).toLocaleString('en-IN') : 0}</span>
                </div>

                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80">
                  <span className="text-[10px] font-bold text-blue-700 uppercase block">Balance Freight</span>
                  <span className={`font-mono font-black text-sm mt-0.5 block ${Number(viewModal.data.vehicleBalance) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    ₹{viewModal.data.vehicleBalance ? Number(viewModal.data.vehicleBalance).toLocaleString('en-IN') : 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer with Edit, Delete & Close actions */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const rowData = viewModal.data;
                    setViewModal({ isOpen: false, data: null });
                    handleEditReport(rowData);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <Edit2 size={14} />
                  <span>Edit Report</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const sNoToDelete = viewModal.data.sNo;
                    setViewModal({ isOpen: false, data: null });
                    handleDeleteReport(sNoToDelete);
                  }}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-transparent rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Delete Report</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewModal({ isOpen: false, data: null })}
                className="px-5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          BULK UPLOAD MODAL (EXCEL & CSV WITH AUTO CALCULATIONS)
      ═══════════════════════════════════════════════════════════ */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
                  <FileUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Bulk Upload Truck Trip Reports</h3>
                  <p className="text-xs text-red-100 font-medium">Upload Excel (.xlsx, .xls) or CSV (.csv) file with automatic calculations</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsBulkModalOpen(false);
                  setBulkFile(null);
                  setBulkParsedData([]);
                }}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-colors cursor-pointer text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* Step 1: Download Sample Format Banner */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 text-sm">
                    <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Download Ready Sample Format</span>
                  </div>
                  <p className="text-xs text-amber-800/80">
                    Format me <strong>Rate Per MT</strong> &amp; <strong>Tonnage</strong> aur <strong>Diesel</strong> fill karein. <em>Freight &amp; Balance system khud auto-calculate karega!</em>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => downloadBulkTemplate('xlsx')}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <FileSpreadsheet size={14} />
                    <span>Excel Template (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadBulkTemplate('csv')}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Download size={14} />
                    <span>CSV Template (.csv)</span>
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-red-200 hover:border-red-400 bg-red-50/40 rounded-2xl p-6 sm:p-8 text-center transition-all">
                <input
                  type="file"
                  id="bulkTripFileInput"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleBulkFileChange}
                  className="hidden"
                />
                <label 
                  htmlFor="bulkTripFileInput"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-inner">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="text-sm font-black text-slate-800">
                    {bulkFile ? bulkFile.name : 'Click to select or drag & drop Excel / CSV file'}
                  </div>
                  <p className="text-xs text-slate-500">
                    Supports Microsoft Excel (.xlsx, .xls) and Comma Separated (.csv) files
                  </p>
                </label>
              </div>

              {/* Parsed Data Preview & Calculated Summary */}
              {bulkParsedData.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-800">Preview Data ({bulkParsedData.length} records)</span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {bulkParsedData.filter(r => r.isValid).length} Valid
                      </span>
                      {bulkParsedData.some(r => !r.isValid) && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1">
                          <AlertCircle size={11} />
                          {bulkParsedData.filter(r => !r.isValid).length} Missing Vehicle No
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-500">Auto calculated values highlighted</span>
                  </div>

                  {/* Summary Calculation Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Total Trips</span>
                      <span className="font-bold text-slate-800 text-sm">{bulkParsedData.length}</span>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 p-2.5 rounded-xl">
                      <span className="text-purple-600 font-semibold block text-[10px] uppercase">Diesel Cost</span>
                      <span className="font-black text-purple-700 text-sm">
                        ₹{bulkParsedData.reduce((acc, r) => acc + (r.totalDieselPrice || 0), 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                      <span className="text-amber-600 font-semibold block text-[10px] uppercase">Total Expenses</span>
                      <span className="font-black text-amber-700 text-sm">
                        ₹{bulkParsedData.reduce((acc, r) => acc + (r.totalExpenses || 0), 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                      <span className="text-emerald-600 font-semibold block text-[10px] uppercase">Total Freight</span>
                      <span className="font-black text-emerald-700 text-sm">
                        ₹{bulkParsedData.reduce((acc, r) => acc + (r.totalFreight || 0), 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl">
                      <span className="text-blue-600 font-semibold block text-[10px] uppercase">Balance Freight</span>
                      <span className="font-black text-blue-700 text-sm">
                        ₹{bulkParsedData.reduce((acc, r) => acc + (r.vehicleBalance || 0), 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Scrollable Preview Table */}
                  <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 shadow-2xs">
                        <tr>
                          <th className="p-2 border-b">#</th>
                          <th className="p-2 border-b">Date</th>
                          <th className="p-2 border-b">Vehicle No.</th>
                          <th className="p-2 border-b">Trip Count</th>
                          <th className="p-2 border-b">Disp. Wt.</th>
                          <th className="p-2 border-b">Rec. Wt.</th>
                          <th className="p-2 border-b">Freight Rate</th>
                          <th className="p-2 border-b">DO No.</th>
                          <th className="p-2 border-b">Mines</th>
                          <th className="p-2 border-b">DO Party Name</th>
                          <th className="p-2 border-b">Driver Name</th>
                          <th className="p-2 border-b">Received Party</th>
                          <th className="p-2 border-b">Billing Party</th>
                          <th className="p-2 border-b">Diesel (L)</th>
                          <th className="p-2 border-b">Mines Exp</th>
                          <th className="p-2 border-b">Bilty Exp</th>
                          <th className="p-2 border-b">Adv</th>
                          <th className="p-2 border-b">Fastag</th>
                          <th className="p-2 border-b">Shortage</th>
                          <th className="p-2 border-b text-amber-700 bg-amber-50/70">Total Expenses</th>
                          <th className="p-2 border-b text-emerald-700 bg-emerald-50/70">Freight Amount</th>
                          <th className="p-2 border-b text-blue-700 bg-blue-50/70">Balance Freight</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600">
                        {(() => {
                          const startIdx = (bulkCurrentPage - 1) * bulkPageSize;
                          const pageRows = bulkPageSize === 'all' ? bulkParsedData : bulkParsedData.slice(startIdx, startIdx + bulkPageSize);
                          return pageRows.map((row, idx) => (
                            <tr key={idx} className={!row.isValid ? 'bg-rose-50/60' : 'hover:bg-slate-50 transition-colors'}>
                              <td className="p-2 font-mono font-medium">{row.index}</td>
                              <td className="p-2 font-medium">{row.date}</td>
                              <td className="p-2">
                                {row.vehicleNo ? (
                                  <span className="font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{row.vehicleNo}</span>
                                ) : (
                                  <span className="text-rose-600 font-bold bg-rose-100 px-1.5 py-0.5 rounded">Missing!</span>
                                )}
                              </td>
                              <td className="p-2 font-bold text-center">{row.totalTrips || 1}</td>
                              <td className="p-2 font-bold">{row.tonnage ? `${row.tonnage} MT` : '0 MT'}</td>
                              <td className="p-2 font-medium">{row.recWeight ? `${row.recWeight} MT` : '—'}</td>
                              <td className="p-2 font-mono">₹{row.perMT || 0}</td>
                              <td className="p-2 font-mono font-semibold">{row.doNo || '—'}</td>
                              <td className="p-2 font-semibold text-slate-800">{row.from || '—'}</td>
                              <td className="p-2 font-medium text-slate-700">{row.doPartyName || '—'}</td>
                              <td className="p-2 font-medium text-slate-700">{row.driverName || '—'}</td>
                              <td className="p-2 font-medium text-slate-700">{row.receivedParty || '—'}</td>
                              <td className="p-2 font-medium text-slate-700">{row.partyName || '—'}</td>
                              <td className="p-2 font-bold text-purple-700">
                                {(() => {
                                  if (!row.diesel) return '0 L';
                                  const c = String(row.diesel).replace(/[^0-9.]/g, '').trim();
                                  return c ? `${c} L` : '0 L';
                                })()}
                              </td>
                              <td className="p-2 font-mono">₹{row.minesExp || 0}</td>
                              <td className="p-2 font-mono">₹{row.biltyExp || 0}</td>
                              <td className="p-2 font-bold text-amber-600 font-mono">
                                ₹{row.advance ? row.advance.toLocaleString('en-IN') : 0}
                              </td>
                              <td className="p-2 font-mono">₹{row.fastagExp || 0}</td>
                              <td className="p-2 font-mono">₹{row.shortageAmount || 0}</td>
                              <td className="p-2 font-black text-amber-800 bg-amber-50/40 font-mono">
                                ₹{row.totalExpenses ? row.totalExpenses.toLocaleString('en-IN') : 0}
                              </td>
                              <td className="p-2 font-black text-emerald-800 bg-emerald-50/40 font-mono">
                                ₹{row.totalFreight ? row.totalFreight.toLocaleString('en-IN') : 0}
                              </td>
                              <td className="p-2 font-black text-blue-800 bg-blue-50/40 font-mono">
                                ₹{row.vehicleBalance ? row.vehicleBalance.toLocaleString('en-IN') : 0}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Bulk Preview Pagination Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 px-1 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Rows per page:</span>
                      <select
                        value={bulkPageSize}
                        onChange={(e) => {
                          const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                          setBulkPageSize(val);
                          setBulkCurrentPage(1);
                        }}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 outline-none cursor-pointer"
                      >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                        <option value="all">All ({bulkParsedData.length})</option>
                      </select>

                      <span className="text-slate-400">|</span>
                      
                      <span>
                        Showing {bulkPageSize === 'all' ? `all ${bulkParsedData.length}` : `${Math.min((bulkCurrentPage - 1) * bulkPageSize + 1, bulkParsedData.length)} - ${Math.min(bulkCurrentPage * bulkPageSize, bulkParsedData.length)} of ${bulkParsedData.length}`} records
                      </span>
                    </div>

                    {bulkPageSize !== 'all' && (
                      <div className="flex items-center gap-1.5 font-bold">
                        <button
                          type="button"
                          onClick={() => setBulkCurrentPage(1)}
                          disabled={bulkCurrentPage === 1}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          « First
                        </button>
                        <button
                          type="button"
                          onClick={() => setBulkCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={bulkCurrentPage === 1}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          ‹ Prev
                        </button>
                        
                        <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg border border-red-200 font-black">
                          Page {bulkCurrentPage} of {Math.ceil(bulkParsedData.length / bulkPageSize) || 1}
                        </span>

                        <button
                          type="button"
                          onClick={() => setBulkCurrentPage(prev => Math.min(prev + 1, Math.ceil(bulkParsedData.length / bulkPageSize)))}
                          disabled={bulkCurrentPage >= Math.ceil(bulkParsedData.length / bulkPageSize)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Next ›
                        </button>
                        <button
                          type="button"
                          onClick={() => setBulkCurrentPage(Math.ceil(bulkParsedData.length / bulkPageSize))}
                          disabled={bulkCurrentPage >= Math.ceil(bulkParsedData.length / bulkPageSize)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Last »
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsBulkModalOpen(false);
                  setBulkFile(null);
                  setBulkParsedData([]);
                }}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleBulkUploadSubmit}
                disabled={bulkUploading || bulkParsedData.length === 0}
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl shadow-md shadow-red-500/20 hover:shadow-lg transition-all text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
              >
                {bulkUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Uploading Records...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    <span>Upload {bulkParsedData.filter(r => r.isValid).length} Trips to System</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
