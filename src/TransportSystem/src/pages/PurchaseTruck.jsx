import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Select from 'react-select';
import VehicleProfileModal from '../components/VehicleProfileModal';
import supabase from '../../../SupabaseClient';

const idOf = v => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const inr = n => "₹" + Number(n || 0).toLocaleString("en-IN");
const iso = d => {
  const pad = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
};
const fmt = s => {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${d}-${m}-${y}`;
};

function days(expiry) {
  if (!expiry) return null;
  const [y, m, d] = expiry.split("-").map(Number);
  const t = new Date();
  return Math.round((new Date(y, m - 1, d) - new Date(t.getFullYear(), t.getMonth(), t.getDate())) / 864e5);
}

function istat(expiry) {
  const d = days(expiry);
  if (d === null) return "";
  return d < 0 ? "EXPIRED" : d === 0 ? "DUE TODAY" : d <= 7 ? "DUE IN 7 DAYS" : d <= 30 ? "DUE IN 30 DAYS" : "ACTIVE";
}

function addDay(s, n) { const [y,m,d] = s.split("-").map(Number); return iso(new Date(y, m-1, d+n)); }
function addYear(s, n) { const [y,m,d] = s.split("-").map(Number); return iso(new Date(y+n, m-1, d)); }

export default function PurchaseTruck() {
  const [trucks, setTrucks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [toastMsg, setToastMsg] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isUploading, setIsUploading] = useState(false);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const fetchTrucks = async () => {
    const { data, error } = await supabase.from('trucks').select('*').order('created_at', { ascending: false });
    if (data && !error) {
      const mapped = data.map(d => ({
        id: d.id,
        vno: d.vno,
        ownerName: d.owner_name,
        owner: d.firm_name,
        company: d.company,
        policy: d.policy,
        start: d.start_date,
        expiry: d.expiry_date,
        idv: d.idv,
        premium: d.premium,
        agent: d.agent,
        chassis: d.chassis_no,
        engine: d.engine_no,
        modelName: d.model_name,
        extraRemarks: d.remarks,
        insuranceCopy: d.insurance_copy,
        registrationCopy: d.registration_copy
      }));
      setTrucks(mapped);
      try {
        const ls = JSON.parse(localStorage.getItem("fleet_v2") || '{"trucks":[],"fastag":[],"Challan":[]}');
        ls.trucks = mapped;
        localStorage.setItem("fleet_v2", JSON.stringify(ls));
      } catch(e){}
    }
  };

  useEffect(() => {
    fetchTrucks();
    
    const v = searchParams.get('vno');
    if (v) setSearch(v);
    const a = searchParams.get('add');
    if (a) {
      setFormData({ vno: a });
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `trucks/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
    
    if (uploadError) {
      alert("Error uploading file: " + uploadError.message);
      setIsUploading(false);
      return;
    }
    
    const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
    if (type === 'insurance') {
      setFormData(prev => ({ ...prev, insuranceCopy: data.publicUrl }));
    } else {
      setFormData(prev => ({ ...prev, registrationCopy: data.publicUrl }));
    }
    setIsUploading(false);
    showToast("File uploaded!");
  };

  const handleSave = async () => {
    if (!formData.vno) return alert("Vehicle No. is required");
    const cleaned = { ...formData };
    ['vno','chassis','engine'].forEach(k => { if(cleaned[k]) cleaned[k] = cleaned[k].toUpperCase() });
    
    const payload = {
      vno: cleaned.vno,
      owner_name: cleaned.ownerName || null,
      firm_name: cleaned.owner || null,
      company: cleaned.company || null,
      policy: cleaned.policy || null,
      start_date: cleaned.start || null,
      expiry_date: cleaned.expiry || null,
      idv: cleaned.idv || 0,
      premium: cleaned.premium || 0,
      agent: cleaned.agent || null,
      chassis_no: cleaned.chassis || null,
      engine_no: cleaned.engine || null,
      model_name: cleaned.modelName || null,
      remarks: cleaned.extraRemarks || null,
      insurance_copy: cleaned.insuranceCopy || null,
      registration_copy: cleaned.registrationCopy || null
    };

    const { error } = await supabase.from('trucks').upsert(payload, { onConflict: 'vno' });
    if (error) return alert("Error: " + error.message);
    
    await fetchTrucks();
    setIsModalOpen(false);
    showToast("Saved successfully");
  };

  const handleDelete = async (id) => {
    if (window.confirm("Sure to delete?")) {
      const { error } = await supabase.from('trucks').delete().eq('id', id);
      if (error) return alert("Error: " + error.message);
      await fetchTrucks();
      showToast("Deleted");
    }
  };

  const handleRenew = (t) => {
    const nextStart = t.expiry ? addDay(t.expiry, 1) : "";
    const nextExpiry = nextStart ? addDay(addYear(nextStart, 1), -1) : "";
    setFormData({ ...t, start: nextStart, expiry: nextExpiry, policy: "" });
    setIsModalOpen(true);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      let count = 0;
      let newPayloads = [];
      data.forEach(row => {
        if (!row['Vehicle No.']) return;
        newPayloads.push({
          vno: row['Vehicle No.']?.toString().toUpperCase() || "",
          owner_name: row['Owner Name']?.toString() || null,
          firm_name: row['Firm Name']?.toString() || row['Owner']?.toString() || null,
          company: row['Insurance Company']?.toString() || null,
          policy: row['Policy No.']?.toString() || null,
          start_date: row['Policy Start Date'] ? iso(new Date(row['Policy Start Date'])) : null,
          expiry_date: row['Policy Expiry Date'] ? iso(new Date(row['Policy Expiry Date'])) : null,
          idv: Number(row['IDV (₹)']) || 0,
          premium: Number(row['Premium (₹)']) || 0,
          agent: row['Agent / Contact']?.toString() || null,
          chassis_no: row['Chassis No.']?.toString() || null,
          engine_no: row['Engine No.']?.toString() || null,
          model_name: row['Model Name']?.toString() || row['Remarks']?.toString() || null,
          remarks: row['New Remarks']?.toString() || null
        });
        count++;
      });
      if (newPayloads.length > 0) {
        const { error } = await supabase.from('trucks').upsert(newPayloads, { onConflict: 'vno' });
        if (error) alert("Error importing: " + error.message);
        else {
          await fetchTrucks();
          showToast(`Imported ${count} trucks`);
        }
      }
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleExport = () => {
    const data = trucks.map((t, i) => ({
      "S.No.": i + 1,
      "Vehicle No.": t.vno,
      "Owner Name": t.ownerName,
      "Firm Name": t.owner,
      "Insurance Company": t.company,
      "Policy No.": t.policy,
      "Policy Start Date": fmt(t.start),
      "Policy Expiry Date": fmt(t.expiry),
      "IDV (₹)": t.idv,
      "Premium (₹)": t.premium,
      "Agent / Contact": t.agent,
      "Chassis No.": t.chassis,
      "Engine No.": t.engine,
      "Model Name": t.modelName || t.remarks,
      "Remarks": t.extraRemarks,
      "Days Remaining": days(t.expiry),
      "Status": istat(t.expiry)
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TRUCK DATA");
    XLSX.writeFile(wb, "TRUCKS_DATA.xlsx");
  };

  const exportToPDF = () => {
    if (trucks.length === 0) return alert("No data to export!");
    const doc = new jsPDF({ orientation: 'landscape' });
    
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text("Truck RTO & Insurance Details", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const currentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    doc.text(`Generated on: ${currentDate}`, 14, 28);

    const tableColumn = ["#", "Vehicle No.", "Owner Name", "Firm Name", "Insurance Co.", "Policy No.", "Start Date", "Expiry Date", "Days Left", "Status"];
    const tableRows = [];
    filtered.forEach((t, i) => {
      tableRows.push([
        i + 1,
        t.vno,
        t.ownerName,
        t.owner,
        t.company,
        t.policy,
        fmt(t.start),
        fmt(t.expiry),
        days(t.expiry) !== null ? `${days(t.expiry)}d` : '-',
        istat(t.expiry)
      ]);
    });

    autoTable(doc, { 
      head: [tableColumn], 
      body: tableRows, 
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3, halign: 'center', valign: 'middle' },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' }
    });

    doc.save("TRUCKS_DATA.pdf");
  };

  const [filterVehicleNo, setFilterVehicleNo] = useState(null);

  let filtered = trucks.filter(t => {
    if (filterVehicleNo && t.vno !== filterVehicleNo.value) return false;
    if (statusFilter && istat(t.expiry) !== statusFilter) return false;
    if (search) {
       const q = search.toLowerCase();
       if (!t.vno.toLowerCase().includes(q) && !(t.owner||"").toLowerCase().includes(q) && !(t.ownerName||"").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const uniqueTrucks = [...new Set(trucks.map(t => t.vno))].filter(Boolean);
  const truckOptions = uniqueTrucks.map(v => ({ label: v, value: v }));

  const activeCount = trucks.filter(t => istat(t.expiry) === 'ACTIVE').length;
  const due30Count = trucks.filter(t => istat(t.expiry).startsWith('DUE')).length;
  const expiredCount = trucks.filter(t => istat(t.expiry) === 'EXPIRED').length;

  return (
    <div className="p-4 bg-gray-50 h-full overflow-auto text-sm">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🚚 Trucks (RTO & Insurance)</h1>
          <small className="text-gray-500">Manage your truck fleet details</small>
        </div>
        <div className="flex gap-2">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow font-medium transition" onClick={() => { setFormData({}); setIsModalOpen(true); }}>+ Add Truck</button>
          <button className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-4 py-2 rounded shadow font-medium transition flex items-center gap-1" onClick={exportToPDF}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            PDF Download
          </button>
          <button className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-4 py-2 rounded shadow font-medium transition flex items-center gap-1" onClick={handleExport}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
            Export Excel
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '24px' }}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-gray-800 mb-1">{trucks.length}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Trucks</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-green-600 mb-1">{activeCount}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-orange-600 mb-1">{due30Count}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Due ≤ 30 days</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="text-2xl font-bold text-red-600 mb-1">{expiredCount}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Expired</div>
        </div>
      </div>

      {/* Filters */}
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <input type="text" placeholder="🔍 Search Vehicle or Owner..." className="border border-gray-300 p-2 rounded-lg flex-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]" value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ width: '250px' }}>
          <Select
            isClearable
            options={truckOptions}
            value={filterVehicleNo}
            onChange={setFilterVehicleNo}
            placeholder="Select Vehicle No..."
            menuPortalTarget={document.body}
            styles={{
              control: (base) => ({
                ...base, padding: '2px', borderRadius: '8px', border: '1px solid #d1d5db', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }),
              menuPortal: base => ({ ...base, zIndex: 9999 })
            }}
          />
        </div>
        <select className="border border-gray-300 p-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[150px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="DUE IN 30 DAYS">Due in 30 Days</option>
          <option value="DUE IN 7 DAYS">Due in 7 Days</option>
          <option value="DUE TODAY">Due Today</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-auto max-h-[70vh]">
        <table className="w-full text-left border-collapse whitespace-nowrap mobile-card-table">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-[11px] uppercase tracking-wider font-bold shadow-sm">
              <th className="p-4">#</th>
              <th className="p-4">Vehicle No.</th>
              <th className="p-4">Owner Name</th>
              <th className="p-4">Firm Name</th>
              <th className="p-4">Insurance Co.</th>
              <th className="p-4">Policy No.</th>
              <th className="p-4">Start Date</th>
              <th className="p-4">Expiry Date</th>
              <th className="p-4">Days Left</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length ? filtered.map((t, i) => (
              <tr key={t.id} className="hover:bg-blue-50/40 transition-colors group">
                <td data-label="#" className="p-4 text-gray-500 font-medium">{i + 1}</td>
                <td data-label="Vehicle No." className="p-4 font-bold text-gray-800 cursor-pointer text-blue-600 group-hover:underline" onClick={() => setSelectedVehicle(t.vno)}>{t.vno}</td>
                <td data-label="Owner Name" className="p-4 text-gray-600">{t.ownerName}</td>
                <td data-label="Firm Name" className="p-4 text-gray-600">{t.owner}</td>
                <td data-label="Insurance Co." className="p-4 text-gray-600">{t.company}</td>
                <td data-label="Policy No." className="p-4 text-gray-600 font-mono">{t.policy}</td>
                <td data-label="Start Date" className="p-4 text-gray-600">{fmt(t.start)}</td>
                <td data-label="Expiry Date" className="p-4 text-gray-600">{fmt(t.expiry)}</td>
                <td data-label="Days Left" className="p-4 font-bold">
                  {(() => {
                    const d = days(t.expiry);
                    if (d === null) return '-';
                    if (d < 0) return <span className="text-red-600 tracking-tight">Overdue {-d}d</span>;
                    if (d === 0) return <span className="text-orange-600 tracking-tight">Today</span>;
                    return <span className={d <= 30 ? "text-orange-600 tracking-tight" : "text-green-600 tracking-tight"}>{d}d Left</span>;
                  })()}
                </td>
                <td data-label="Status" className="p-4">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider text-white shadow-sm ${istat(t.expiry) === 'ACTIVE' ? 'bg-green-500' : istat(t.expiry) === 'EXPIRED' ? 'bg-red-500' : 'bg-orange-500'}`}>
                    {istat(t.expiry) || 'UNKNOWN'}
                  </span>
                </td>
                <td data-label="Action" className="p-4 flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button title="View Details" className="bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-600 hover:text-white px-2 py-1.5 rounded-md font-medium transition flex items-center justify-center" onClick={() => setSelectedVehicle(t.vno)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  </button>
                  <button className="bg-green-50/50 text-green-600 border border-green-200 hover:bg-green-500 hover:text-white px-3 py-1.5 rounded-md font-medium transition" onClick={() => handleRenew(t)}>Renew</button>
                  <button className="bg-blue-50/50 text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-md font-medium transition" onClick={() => { setFormData(t); setIsModalOpen(true); }}>Edit</button>
                  <button className="bg-red-50/50 text-red-600 border border-red-200 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-md font-medium transition" onClick={() => handleDelete(t.id)}>Delete</button>
                </td>
              </tr>
            )) : <tr><td colSpan="11" className="p-10 text-center text-gray-500 font-medium">No trucks found. Click "+ Add Truck" to get started.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">{formData.id ? 'Edit Truck' : 'Add New Truck'}</h2>
              <button className="text-gray-400 hover:text-gray-600 text-2xl leading-none" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-5 bg-gray-50/50">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Vehicle No.</label>
                <input type="text" className="border border-gray-300 w-full p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" value={formData.vno || ''} onChange={e => setFormData({...formData, vno: e.target.value})} disabled={!!formData.id} placeholder="e.g. MH01AB1234" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Owner Name</label>
                <input type="text" className="border border-gray-300 w-full p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" value={formData.ownerName || ''} onChange={e => setFormData({...formData, ownerName: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Firm Name</label>
                <input type="text" className="border border-gray-300 w-full p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" value={formData.owner || ''} onChange={e => setFormData({...formData, owner: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Insurance Company</label>
                <input type="text" className="border border-gray-300 w-full p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" value={formData.company || ''} onChange={e => setFormData({...formData, company: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Policy No.</label>
                <input type="text" className="border border-gray-300 w-full p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" value={formData.policy || ''} onChange={e => setFormData({...formData, policy: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Start Date</label>
                <input type="date" className="border border-gray-300 w-full p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white" value={formData.start || ''} onChange={e => setFormData({...formData, start: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Expiry Date</label>
                <input type="date" className="border border-gray-300 w-full p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white" value={formData.expiry || ''} onChange={e => setFormData({...formData, expiry: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">IDV (₹)</label>
                <input type="number" className="border border-gray-300 w-full p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" value={formData.idv || ''} onChange={e => setFormData({...formData, idv: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Premium (₹)</label>
                <input type="number" className="border border-gray-300 w-full p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" value={formData.premium || ''} onChange={e => setFormData({...formData, premium: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Agent / Contact</label>
                <input type="text" className="border border-gray-300 w-full p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" value={formData.agent || ''} onChange={e => setFormData({...formData, agent: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Chassis No.</label>
                <input type="text" className="border border-gray-300 w-full p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" value={formData.chassis || ''} onChange={e => setFormData({...formData, chassis: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Engine No.</label>
                <input type="text" className="border border-gray-300 w-full p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" value={formData.engine || ''} onChange={e => setFormData({...formData, engine: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Model Name</label>
                <input type="text" className="border border-gray-300 w-full p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" value={formData.modelName ?? formData.remarks ?? ''} onChange={e => setFormData({...formData, modelName: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Remarks</label>
                <textarea className="border border-gray-300 w-full p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none" rows="1" value={formData.extraRemarks || ''} onChange={e => setFormData({...formData, extraRemarks: e.target.value})}></textarea>
              </div>
              <div className="md:col-span-2 border-t border-gray-200 mt-2 pt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Copy of Insurance</label>
                  <input type="file" accept="image/*,.pdf" className="border border-gray-300 w-full p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-sm bg-white" onChange={(e) => handleFileUpload(e, 'insurance')} disabled={isUploading} />
                  {isUploading && <span className="text-xs text-blue-500 mt-1 block animate-pulse">Uploading...</span>}
                  {formData.insuranceCopy && <a href={formData.insuranceCopy} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">📄 View Uploaded Insurance</a>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Copy of Registration</label>
                  <input type="file" accept="image/*,.pdf" className="border border-gray-300 w-full p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-sm bg-white" onChange={(e) => handleFileUpload(e, 'registration')} disabled={isUploading} />
                  {isUploading && <span className="text-xs text-blue-500 mt-1 block animate-pulse">Uploading...</span>}
                  {formData.registrationCopy && <a href={formData.registrationCopy} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">📄 View Uploaded Registration</a>}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-white rounded-b-xl">
              <button className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition" onClick={handleSave} disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Save Truck'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {selectedVehicle && <VehicleProfileModal vno={selectedVehicle} onClose={() => setSelectedVehicle(null)} />}

      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-bounce">
          <span className="text-green-400">✓</span>
          {toastMsg}
        </div>
      )}
    </div>
  );
}
