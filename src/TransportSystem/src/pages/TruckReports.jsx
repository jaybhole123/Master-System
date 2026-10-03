import React, { useState, useEffect } from 'react';
import supabase from '../../../SupabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Select, { components } from 'react-select';
import './TruckReports.css';

export default function TruckReports() {
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [extraFromOptions, setExtraFromOptions] = useState([]);
  const [extraToOptions, setExtraToOptions] = useState([]);
  const [extraDieselOptions, setExtraDieselOptions] = useState([]);
  const [extraAdvanceOptions, setExtraAdvanceOptions] = useState([]);
  const [promptModal, setPromptModal] = useState({ isOpen: false, type: null, title: '', placeholder: '' });
  const [promptValue, setPromptValue] = useState('');
  const [visibleCount, setVisibleCount] = useState(50);
  
  const [reportsData, setReportsData] = useState([]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('truck_reports')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching data:', error);
    } else if (data) {
      // Map data to match frontend naming
      const formattedData = data.map((item, index) => ({
        id: item.id,
        sNo: index + 1,
        date: item.date,
        vehicleNo: item.vehicle_no,
        from: item.from_location,
        to: item.to_location,
        distance: item.distance,
        diesel: item.diesel,
        advance: item.advance,
        doNo: item.do_no,
        tonnage: item.tonnage,
        totalTrips: item.total_trips,
        vehicleBalance: item.vehicle_balance,
        perMT: item.per_mt,
        totalFreight: item.total_freight
      }));
      setReportsData(formattedData);
    }
  };

  const [formData, setFormData] = useState({
    date: '', vehicleNo: '', from: '', to: '', distance: '', diesel: '', advance: '', doNo: '', totalTrips: '', vehicleBalance: '', perMT: '', tonnage: '', totalFreight: ''
  });

  // Predefined mock distances for auto-fetch feature
  const routeDistances = {
    'delhi-mumbai': '1420',
    'mumbai-delhi': '1420',
    'jaipur-ahmedabad': '680',
    'ahmedabad-jaipur': '680',
    'chandigarh-pune': '1650',
    'pune-chandigarh': '1650',
    'delhi-jaipur': '280',
    'jaipur-delhi': '280',
    'mumbai-pune': '150',
    'pune-mumbai': '150'
  };

  React.useEffect(() => {
    if (formData.from && formData.to) {
      const routeKey = `${formData.from.toLowerCase().trim()}-${formData.to.toLowerCase().trim()}`;
      if (routeDistances[routeKey]) {
        setFormData(prev => ({ ...prev, distance: `${routeDistances[routeKey]} km` }));
      }
    }
  }, [formData.from, formData.to]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };
    
    if (['perMT', 'tonnage', 'diesel', 'advance'].includes(name)) {
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
      const advanceVal = parseFloat(name === 'advance' ? value : newFormData.advance) || 0;

      if (totalFreight > 0) {
        const vehicleBalance = totalFreight - (dieselVal * 101) - advanceVal;
        newFormData.vehicleBalance = Math.round(vehicleBalance).toString();
      } else {
        newFormData.vehicleBalance = '';
      }
    }
    
    setFormData(newFormData);
  };

  const handleAddReport = async (e) => {
    e.preventDefault();
    
    const reportData = {
      date: formData.date,
      vehicle_no: formData.vehicleNo,
      from_location: formData.from,
      to_location: formData.to,
      distance: formData.distance,
      diesel: formData.diesel,
      advance: Number(formData.advance) || 0,
      do_no: formData.doNo,
      tonnage: Number(formData.tonnage) || 0,
      total_trips: Number(formData.totalTrips) || 0,
      vehicle_balance: Number(formData.vehicleBalance) || 0,
      per_mt: Number(formData.perMT) || 0,
      total_freight: Number(formData.totalFreight) || 0
    };

    if (editingId) {
      // Update logic (assuming we store supabase 'id' in editingId or we find it)
      // For now, if editingId is sNo, we need the actual supabase id. Let's update state mapping above
      const reportToEdit = reportsData.find(r => r.sNo === editingId);
      if (reportToEdit && reportToEdit.id) {
        const { error } = await supabase
          .from('truck_reports')
          .update(reportData)
          .eq('id', reportToEdit.id);
        
        if (error) {
          console.error("Error updating:", error);
          toast.error("Error updating report!");
        } else {
          toast.success("Report updated successfully!");
        }
      }
    } else {
      const { error } = await supabase
        .from('truck_reports')
        .insert([reportData]);
        
      if (error) {
        console.error("Error inserting:", error);
        toast.error("Error saving report!");
      } else {
        toast.success("Report saved successfully!");
      }
    }
    
    // Refresh data from server
    await fetchReports();
    setFormData({ date: '', vehicleNo: '', from: '', to: '', distance: '', diesel: '', advance: '', doNo: '', totalTrips: '', vehicleBalance: '', perMT: '', tonnage: '', totalFreight: '' });
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleEditReport = (report) => {
    setFormData(report);
    setEditingId(report.sNo);
    setIsModalOpen(true);
  };

  const handleDeleteReport = async (sNoToDelete) => {
    if(window.confirm("Are you sure you want to delete this report?")) {
      const reportToDelete = reportsData.find(r => r.sNo === sNoToDelete);
      if (reportToDelete && reportToDelete.id) {
        const { error } = await supabase
          .from('truck_reports')
          .delete()
          .eq('id', reportToDelete.id);
          
        if (error) {
          console.error("Error deleting:", error);
        } else {
          await fetchReports();
        }
      }
    }
  };

  // Filter Logic
  const filteredData = reportsData.filter(row => {
    const matchesSearch = row.vehicleNo.toLowerCase().includes(searchTerm.toLowerCase()) || row.doNo.toLowerCase().includes(searchTerm.toLowerCase());
    
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

    return matchesSearch && matchesDate;
  });

  const displayedData = filteredData.slice(0, visibleCount);

  const handleTableScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Load more when user scrolls near the bottom (within 50px)
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      if (visibleCount < filteredData.length) {
        setVisibleCount(prev => prev + 50);
      }
    }
  };

  // Dynamic calculations for cards
  const totalTripsCount = filteredData.length;
  const totalAdvanceSum = filteredData.reduce((sum, item) => sum + (Number(item.advance) || 0), 0);
  const totalDieselSum = filteredData.reduce((sum, item) => sum + (parseInt(item.diesel) || 0), 0);

  const uniqueFromLocations = [...new Set([...reportsData.map(r => r.from), ...extraFromOptions])].filter(Boolean);
  const fromOptions = uniqueFromLocations.map(loc => ({ label: loc, value: loc }));

  const CustomMenuList = (props) => {
    return (
      <components.MenuList {...props}>
        {props.children}
        <div 
          style={{ padding: '10px 12px', borderTop: '1px solid #e5e7eb', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc' }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPromptModal({ isOpen: true, type: 'from', title: 'Enter new Origin City', placeholder: 'e.g. DELHI' });
            setPromptValue('');
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add New Origin City
        </div>
      </components.MenuList>
    );
  };

  const uniqueToLocations = [...new Set([...reportsData.map(r => r.to), ...extraToOptions])].filter(Boolean);
  const toOptions = uniqueToLocations.map(loc => ({ label: loc, value: loc }));

  const ToMenuList = (props) => {
    return (
      <components.MenuList {...props}>
        {props.children}
        <div 
          style={{ padding: '10px 12px', borderTop: '1px solid #e5e7eb', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc' }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPromptModal({ isOpen: true, type: 'to', title: 'Enter new Destination City', placeholder: 'e.g. MUMBAI' });
            setPromptValue('');
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add New Destination City
        </div>
      </components.MenuList>
    );
  };

  const uniqueDiesel = [...new Set([...reportsData.map(r => r.diesel), ...extraDieselOptions])].filter(Boolean);
  const dieselOptions = uniqueDiesel.map(val => ({ label: val, value: val }));

  const DieselMenuList = (props) => {
    return (
      <components.MenuList {...props}>
        {props.children}
        <div 
          style={{ padding: '10px 12px', borderTop: '1px solid #e5e7eb', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc' }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPromptModal({ isOpen: true, type: 'diesel', title: 'Enter new Diesel value', placeholder: 'e.g. 150L' });
            setPromptValue('');
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add New Diesel Value
        </div>
      </components.MenuList>
    );
  };

  const uniqueAdvance = [...new Set([...reportsData.map(r => String(r.advance)), ...extraAdvanceOptions])].filter(Boolean);
  const advanceOptions = uniqueAdvance.map(val => ({ label: val, value: val }));

  const AdvanceMenuList = (props) => {
    return (
      <components.MenuList {...props}>
        {props.children}
        <div 
          style={{ padding: '10px 12px', borderTop: '1px solid #e5e7eb', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc' }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPromptModal({ isOpen: true, type: 'advance', title: 'Enter new Advance value (₹)', placeholder: 'e.g. 5000' });
            setPromptValue('');
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add New Advance Value
        </div>
      </components.MenuList>
    );
  };

  // Export functions
  const exportToPDF = () => {
    if (filteredData.length === 0) return alert("No data to export!");
    const doc = new jsPDF({ orientation: 'landscape' });
    
    // Add Title
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text("Truck Reports Analytics", 14, 20);
    
    // Add Date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const currentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    doc.text(`Generated on: ${currentDate}`, 14, 28);

    const tableColumn = ["S.No", "Date", "Vehicle No", "From", "To", "Dist.", "Diesel", "Advance", "DO No", "Tonnage", "Freight", "Trips", "Per MT", "Balance"];
    const tableRows = [];
    filteredData.forEach(row => {
      tableRows.push([row.sNo, row.date, row.vehicleNo, row.from, row.to, row.distance, row.diesel, row.advance, row.doNo, row.tonnage, row.totalFreight, row.totalTrips, row.perMT, row.vehicleBalance]);
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
        fillColor: [59, 130, 246], // Blue accent
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      columnStyles: {
        2: { cellWidth: 25 }, // Vehicle No
        3: { cellWidth: 20 }, // From
        4: { cellWidth: 20 }, // To
        8: { cellWidth: 22 }, // DO No
      }
    });

    doc.save(`Truck_Reports_${currentDate.replace(/ /g, '_')}.pdf`);
  };

  const exportToExcel = () => {
    if (filteredData.length === 0) return alert("No data to export!");
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reports");
    XLSX.writeFile(workbook, "Truck_Reports.xlsx");
  };

  return (
    <div className="truck-reports-container-wrapper">
      <div className="truck-reports-container bg-white text-gray-900 rounded-lg p-6 shadow-sm">
        <Toaster position="top-right" />
      {/* Header and Add Button */}
      <div className="reports-header-row">
        <div>
          <h1 className="page-title">Reports Analytics</h1>
          <p className="page-subtitle">Overview of your transportation operations</p>
        </div>
        <div className="header-actions">
          <button className="btn-export pdf-btn" onClick={exportToPDF}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            PDF
          </button>
          <button className="btn-export excel-btn" onClick={exportToExcel}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
            Excel
          </button>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add New
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="analytics-cards">
        <div className="card">
          <div className="card-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
          </div>
          <div className="card-info">
            <h3>Total Trips</h3>
            <h2>{totalTripsCount}</h2>
          </div>
        </div>
        <div className="card">
          <div className="card-icon orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
          <div className="card-info">
            <h3>Total Advance</h3>
            <h2>₹ {totalAdvanceSum.toLocaleString()}</h2>
          </div>
        </div>
        <div className="card">
          <div className="card-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
          </div>
          <div className="card-info">
            <h3>Total Diesel</h3>
            <h2>{totalDieselSum.toLocaleString()} L</h2>
          </div>
        </div>
      </div>

      {/* Filters Area */}
      <div className="filters-container">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            placeholder="Search by Vehicle No or DO No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="date-filters">
          <div className="date-input">
            <label>From Date</label>
            <input 
              type="date" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="date-input">
            <label>To Date</label>
            <input 
              type="date" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <button 
            className="btn-secondary" 
            onClick={() => { setFromDate(''); setToDate(''); }}
          >
            Clear Filter
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="table-wrapper" onScroll={handleTableScroll}>
        <table className="truck-reports-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Date</th>
              <th>Vehicle No.</th>
              <th>From</th>
              <th>To</th>
              <th>Distance</th>
              <th>Diesel</th>
              <th>Advance</th>
              <th>DO No.</th>
              <th>Tonnage</th>
              <th>Total Freight</th>
              <th>Total Trips</th>
              <th>Per MT</th>
              <th>Vehicle Bal.</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {displayedData.length > 0 ? displayedData.map((row, index) => (
              <tr key={index}>
                <td data-label="S.No">{row.sNo}</td>
                <td data-label="Date">{row.date}</td>
                <td data-label="Vehicle No."><span className="vehicle-badge">{row.vehicleNo}</span></td>
                <td data-label="From">{row.from}</td>
                <td data-label="To">{row.to}</td>
                <td data-label="Distance">{row.distance}</td>
                <td data-label="Diesel">{row.diesel}</td>
                <td data-label="Advance"><span className="advance-text">₹{row.advance}</span></td>
                <td data-label="DO No.">{row.doNo}</td>
                <td data-label="Tonnage">{row.tonnage}</td>
                <td data-label="Total Freight">₹{row.totalFreight}</td>
                <td data-label="Total Trips">{row.totalTrips}</td>
                <td data-label="Per MT">₹{row.perMT}</td>
                <td data-label="Vehicle Bal.">₹{row.vehicleBalance}</td>
                <td data-label="Action">
                  <div className="action-buttons">
                    <button className="action-btn edit-btn" onClick={() => handleEditReport(row)}>Edit</button>
                    <button className="action-btn delete-btn" onClick={() => handleDeleteReport(row.sNo)}>Delete</button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="9" style={{textAlign: 'center', padding: '20px'}}>No reports found for "{searchTerm}"</td>
              </tr>
            )}
          </tbody>
        </table>
        
        {visibleCount < filteredData.length && (
          <div style={{ textAlign: 'center', padding: '1rem', borderTop: '1px solid #e5e7eb' }}>
            <button 
              className="btn-secondary" 
              onClick={() => setVisibleCount(prev => prev + 50)}
              style={{ width: 'auto', padding: '8px 24px', borderRadius: '20px' }}
            >
              Load More Data...
            </button>
          </div>
        )}
      </div>

      {/* Add New Report Modal */}
      {isModalOpen && (
        <div className="tr-modal-overlay">
          <div className="tr-modal-content">
            <div className="tr-modal-header">
              <h2>{editingId ? 'Edit Truck Report' : 'Add New Truck Report'}</h2>
              <button className="tr-close-btn" onClick={() => { setIsModalOpen(false); setEditingId(null); setFormData({ date: '', vehicleNo: '', from: '', to: '', distance: '', diesel: '', advance: '', doNo: '', totalTrips: '', vehicleBalance: '', perMT: '', tonnage: '', totalFreight: '' }); }}>&times;</button>
            </div>
            <form onSubmit={handleAddReport} className="tr-modal-form">
              <div className="tr-form-group">
                <label>Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} required />
              </div>
              <div className="tr-form-group">
                <label>Vehicle No.</label>
                <input type="text" name="vehicleNo" value={formData.vehicleNo} onChange={handleInputChange} placeholder="e.g. UP32 AB 1234" required />
              </div>
              <div className="tr-form-group" style={{ zIndex: 100 }}>
                <label>From</label>
                <Select
                  isClearable
                  options={fromOptions}
                  value={formData.from ? { label: formData.from, value: formData.from } : null}
                  onChange={(newValue) => handleInputChange({ target: { name: 'from', value: newValue ? newValue.value : '' } })}
                  placeholder="Select Origin City..."
                  components={{ MenuList: CustomMenuList }}
                  styles={{
                    control: (base) => ({
                      ...base,
                      padding: '2px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      boxShadow: 'none',
                      '&:hover': {
                        borderColor: '#d1d5db'
                      }
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                      overflow: 'hidden'
                    })
                  }}
                />
              </div>
              <div className="tr-form-group" style={{ zIndex: 99 }}>
                <label>To</label>
                <Select
                  isClearable
                  options={toOptions}
                  value={formData.to ? { label: formData.to, value: formData.to } : null}
                  onChange={(newValue) => handleInputChange({ target: { name: 'to', value: newValue ? newValue.value : '' } })}
                  placeholder="Select Destination City..."
                  components={{ MenuList: ToMenuList }}
                  styles={{
                    control: (base) => ({
                      ...base,
                      padding: '2px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      boxShadow: 'none',
                      '&:hover': {
                        borderColor: '#d1d5db'
                      }
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                      overflow: 'hidden'
                    })
                  }}
                />
              </div>
              <div className="tr-form-group">
                <label>Distance</label>
                <input type="text" name="distance" value={formData.distance} onChange={handleInputChange} placeholder="e.g. 1500 km" required />
              </div>
              <div className="tr-form-group" style={{ zIndex: 98 }}>
                <label>Diesel</label>
                <Select
                  isClearable
                  options={dieselOptions}
                  value={formData.diesel ? { label: formData.diesel, value: formData.diesel } : null}
                  onChange={(newValue) => handleInputChange({ target: { name: 'diesel', value: newValue ? newValue.value : '' } })}
                  placeholder="Select or type..."
                  components={{ MenuList: DieselMenuList }}
                  styles={{
                    control: (base) => ({
                      ...base,
                      padding: '2px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      boxShadow: 'none',
                      '&:hover': {
                        borderColor: '#d1d5db'
                      }
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                      overflow: 'hidden'
                    })
                  }}
                />
              </div>
              <div className="tr-form-group" style={{ zIndex: 97 }}>
                <label>Advance (₹)</label>
                <Select
                  isClearable
                  options={advanceOptions}
                  value={formData.advance ? { label: formData.advance, value: formData.advance } : null}
                  onChange={(newValue) => handleInputChange({ target: { name: 'advance', value: newValue ? newValue.value : '' } })}
                  placeholder="Select or type..."
                  components={{ MenuList: AdvanceMenuList }}
                  styles={{
                    control: (base) => ({
                      ...base,
                      padding: '2px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      boxShadow: 'none',
                      '&:hover': {
                        borderColor: '#d1d5db'
                      }
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                      overflow: 'hidden'
                    })
                  }}
                />
              </div>
              <div className="tr-form-group">
                <label>DO No.</label>
                <input type="text" name="doNo" value={formData.doNo} onChange={handleInputChange} placeholder="e.g. DO-1004" required />
              </div>
              <div className="tr-form-group">
                <label>Total Trips</label>
                <input type="number" name="totalTrips" value={formData.totalTrips} onChange={handleInputChange} placeholder="e.g. 5" required />
              </div>
              <div className="tr-form-group">
                <label>Vehicle Balance (₹)</label>
                <input type="number" name="vehicleBalance" value={formData.vehicleBalance} onChange={handleInputChange} placeholder="e.g. 15000" required />
              </div>
              <div className="tr-form-group">
                <label>Per MT (₹)</label>
                <input type="number" name="perMT" value={formData.perMT} onChange={handleInputChange} placeholder="e.g. 1200" required />
              </div>
              <div className="tr-form-group">
                <label>Tonnage (MT)</label>
                <input type="number" name="tonnage" value={formData.tonnage} onChange={handleInputChange} placeholder="e.g. 40" required />
              </div>
              <div className="tr-form-group">
                <label>Total Freight (₹)</label>
                <input type="number" name="totalFreight" value={formData.totalFreight} onChange={handleInputChange} placeholder="e.g. 48000" required />
              </div>
              <div className="tr-form-actions">
                <button type="button" className="btn-secondary" onClick={() => { setIsModalOpen(false); setEditingId(null); setFormData({ date: '', vehicleNo: '', from: '', to: '', distance: '', diesel: '', advance: '', doNo: '', totalTrips: '', vehicleBalance: '', perMT: '', tonnage: '', totalFreight: '' }); }}>Cancel</button>
                <button type="submit" className="btn-primary">{editingId ? 'Update Report' : 'Save Report'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Prompt Modal */}
      {promptModal.isOpen && (
        <div className="tr-modal-overlay" style={{ zIndex: 10001, backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ 
            background: '#ffffff', 
            borderRadius: '16px', 
            width: '90%', 
            maxWidth: '420px', 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fcfcfc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px', borderRadius: '12px', display: 'flex', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', margin: '0 0 2px 0' }}>{promptModal.title}</h2>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Add a new option to the system</p>
                </div>
              </div>
              <button 
                onClick={() => setPromptModal({ isOpen: false, type: null, title: '', placeholder: '' })}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '6px', borderRadius: '8px', display: 'flex', transition: 'all 0.2s' }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div style={{ padding: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                New Value
              </label>
              <input 
                type="text" 
                value={promptValue} 
                onChange={(e) => setPromptValue(e.target.value)} 
                placeholder={promptModal.placeholder}
                autoFocus
                style={{ 
                  width: '100%', 
                  padding: '14px 16px', 
                  borderRadius: '10px', 
                  border: '2px solid #e2e8f0',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  background: '#f8fafc',
                  color: '#0f172a'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#ef4444';
                  e.target.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.1)';
                  e.target.style.background = '#ffffff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = '#f8fafc';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('prompt-add-btn').click();
                  }
                }}
              />
              
              <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setPromptModal({ isOpen: false, type: null, title: '', placeholder: '' })}
                  style={{ 
                    padding: '10px 20px', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1', 
                    background: '#ffffff', 
                    color: '#475569', 
                    fontWeight: '600', 
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
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
                      }
                    }
                    setPromptModal({ isOpen: false, type: null, title: '', placeholder: '' });
                  }}
                  style={{ 
                    padding: '10px 24px', 
                    borderRadius: '8px', 
                    border: 'none', 
                    background: '#ef4444', 
                    color: '#ffffff', 
                    fontWeight: '600', 
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#dc2626'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#ef4444'; }}
                >
                  Save Option
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
