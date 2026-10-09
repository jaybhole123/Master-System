import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Select from 'react-select';
import VehicleProfileModal from '../components/VehicleProfileModal';
import './PurchaseTruck.css';
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

function fstat(r) {
  const s = String(r.status || "Active").toUpperCase();
  return s === "ACTIVE" ? ((Number(r.balance) || 0) < (Number(r.minBal) || 0) ? "LOW BALANCE" : "ACTIVE") : s;
}

const cls = s => ["ACTIVE", "PAID"].includes(s) ? "ACTIVE" : ["EXPIRED", "BLOCKED"].includes(s) ? "EXPIRED" : "DUE";

export default function ChallanSystem() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [Challans, setChallans] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [fastags, setFastags] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [toastMsg, setToastMsg] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('PENDING');
  
  const fetchChallans = async () => {
    const { data, error } = await supabase.from('challans').select('*').order('created_at', { ascending: false });
    if (data && !error) {
      const mapped = data.map(d => ({
        id: d.id,
        ChallanNo: d.challan_no,
        vno: d.vno,
        date: d.challan_date,
        place: d.place,
        offence: d.offence,
        amount: d.amount,
        status: d.status,
        paidDate: d.paid_date,
        driver: d.driver,
        remarks: d.remarks,
        document_url: d.document_url
      }));
      setChallans(mapped);
      try {
        const ls = JSON.parse(localStorage.getItem("fleet_v2") || '{"trucks":[],"fastag":[],"Challan":[]}');
        ls.Challan = mapped;
        localStorage.setItem("fleet_v2", JSON.stringify(ls));
      } catch(e){}
    }
  };

  useEffect(() => {
    fetchChallans();
    try {
      const data = JSON.parse(localStorage.getItem("fleet_v2") || "null");
      if (data) {
        setTrucks(data.trucks || []);
        setFastags(data.fastag || []);
      }
    } catch(e) {}
    
    const v = searchParams.get('vno');
    if (v) setSearch(v);
    const a = searchParams.get('add');
    if (a) {
      setFormData({ vno: a, status: 'Pending' });
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleSave = async () => {
    const cleaned = { ...formData };
    if (!cleaned.ChallanNo) cleaned.ChallanNo = "CH" + Date.now().toString(36).toUpperCase();
    cleaned.vno = (cleaned.vno || "").toUpperCase();
    
    const payload = {
      challan_no: cleaned.ChallanNo,
      vno: cleaned.vno || null,
      challan_date: cleaned.date || null,
      place: cleaned.place || null,
      offence: cleaned.offence || null,
      amount: cleaned.amount || 0,
      status: cleaned.status || 'Pending',
      paid_date: cleaned.paidDate || null,
      driver: cleaned.driver || null,
      remarks: cleaned.remarks || null,
      document_url: cleaned.document_url || null
    };

    const { error } = await supabase.from('challans').upsert(payload, { onConflict: 'challan_no' });
    if (error) return alert("Error: " + error.message);
    
    await fetchChallans();
    setIsModalOpen(false);
    showToast("Saved successfully");
  };

  const [uploading, setUploading] = useState(false);
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `challans/${fileName}`;
    
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
    if (uploadError) {
      alert('Error uploading file (make sure "documents" storage bucket exists and is public): ' + uploadError.message);
      setUploading(false);
      return;
    }
    
    const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
    setFormData({...formData, document_url: data.publicUrl});
    setUploading(false);
    showToast('File uploaded successfully!');
  };

  const handleDelete = (id) => {
    setConfirmModal({
      title: "Delete Challan?",
      message: "Are you sure you want to delete this challan permanently? This action cannot be undone.",
      onConfirm: async () => {
        const { error } = await supabase.from('challans').delete().eq('id', id);
        if (error) {
          alert("Error: " + error.message);
        } else {
          await fetchChallans();
          showToast("Deleted");
        }
        setConfirmModal(null);
      }
    });
  };

  const handleMarkPaid = (id) => {
    setConfirmModal({
      title: "Mark as Paid?",
      message: "Are you sure you want to mark this challan as paid? The current date will be recorded as the payment date.",
      onConfirm: async () => {
        const pDate = iso(new Date());
        const { error } = await supabase.from('challans').update({
          status: 'Paid',
          paid_date: pDate
        }).eq('id', id);
        
        if (error) {
          alert("Error: " + error.message);
        } else {
          await fetchChallans();
          showToast("Marked as Paid!");
        }
        setConfirmModal(null);
      }
    });
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
        if (!row['Challan No.']) return;
        newPayloads.push({
          challan_no: row['Challan No.']?.toString() || "",
          vno: row['Vehicle No.']?.toString() || null,
          challan_date: row['Challan Date'] ? iso(new Date(row['Challan Date'])) : null,
          place: row['Place / Location']?.toString() || null,
          offence: row['Offence']?.toString() || null,
          amount: Number(row['Amount (₹)']) || 0,
          status: row['Status']?.toString() || "Pending",
          paid_date: row['Paid Date'] ? iso(new Date(row['Paid Date'])) : null,
          driver: row['Driver Name']?.toString() || null,
          remarks: row['Remarks']?.toString() || null
        });
        count++;
      });
      if (newPayloads.length > 0) {
        const { error } = await supabase.from('challans').upsert(newPayloads, { onConflict: 'challan_no' });
        if (error) alert("Error importing: " + error.message);
        else {
          await fetchChallans();
          showToast(`Imported ${count} Challans`);
        }
      }
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleExport = () => {
    const data = Challans.map((t, i) => ({
      "S.No.": i + 1,
      "Challan No.": t.ChallanNo,
      "Vehicle No.": t.vno,
      "Owner Name": trucks.find(x => idOf(x.vno) === idOf(t.vno))?.owner || "",
      "Challan Date": fmt(t.date),
      "Place / Location": t.place,
      "Offence": t.offence,
      "Amount (₹)": t.amount,
      "Status": (t.status || 'PENDING').toUpperCase(),
      "Paid Date": fmt(t.paidDate),
      "Driver Name": t.driver,
      "Remarks": t.remarks
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Challan DATA");
    XLSX.writeFile(wb, "Challan_DATA.xlsx");
  };

  const exportToPDF = () => {
    if (Challans.length === 0) return alert("No data to export!");
    const doc = new jsPDF({ orientation: 'landscape' });
    
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text("Challan Details", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const currentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    doc.text(`Generated on: ${currentDate}`, 14, 28);

    const tableColumn = ["#", "Challan No.", "Vehicle No.", "Owner Name", "Date", "Place", "Offence", "Amount (Rs)", "Status", "Driver Name"];
    const tableRows = [];
    filtered.forEach((t, i) => {
      const owner = trucks.find(x => idOf(x.vno) === idOf(t.vno))?.owner || "";
      tableRows.push([
        i + 1,
        t.ChallanNo,
        t.vno,
        owner,
        fmt(t.date),
        t.place,
        t.offence,
        t.amount,
        (t.status || 'PENDING').toUpperCase(),
        t.driver
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

    doc.save("Challan_DATA.pdf");
  };

  const [filterVehicleNo, setFilterVehicleNo] = useState(null);

  let filtered = Challans.filter(t => {
    if (filterVehicleNo && t.vno !== filterVehicleNo.value) return false;
    const stat = (t.status || "Pending").toUpperCase();
    if (activeTab === 'PENDING' && stat !== 'PENDING') return false;
    if (activeTab === 'HISTORY' && stat === 'PENDING') return false;

    if (statusFilter && stat !== statusFilter) return false;
    if (search) {
       const q = search.toLowerCase();
       if (!t.vno.toLowerCase().includes(q) && !(t.ChallanNo||"").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const uniqueChallans = [...new Set(Challans.map(t => t.vno))].filter(Boolean);
  const challanOptions = uniqueChallans.map(v => ({ label: v, value: v }));

  const getStatus = (t) => (t.status || 'PENDING').toUpperCase();
  
  const pendingCount = Challans.filter(t => getStatus(t) === 'PENDING').length;
  const pendingAmt = Challans.filter(t => getStatus(t) === 'PENDING').reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const paidCount = Challans.filter(t => getStatus(t) === 'PAID').length;
  const paidAmt = Challans.filter(t => getStatus(t) === 'PAID').reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const disputedCount = Challans.filter(t => getStatus(t) === 'DISPUTED').length;

  const faCount = fastags.filter(r => ["LOW BALANCE","BLOCKED"].includes(fstat(r))).length;

  const pv = {}, of = {};
  Challans.forEach(r => {
    if (getStatus(r) === "PENDING") pv[r.vno] = (pv[r.vno] || 0) + (Number(r.amount) || 0);
    of[r.offence || "—"] = (of[r.offence || "—"] || 0) + (Number(r.amount) || 0);
  });
  
  const sortedPv = Object.entries(pv).sort((a,b) => b[1] - a[1]);
  const sortedOf = Object.entries(of).sort((a,b) => b[1] - a[1]);
  const maxPv = Math.max(1, ...sortedPv.map(x => x[1]));
  const maxOf = Math.max(1, ...sortedOf.map(x => x[1]));

  return (
    <div className="fleet-wrapper">
      <header>
        <h1>🚨 Challan <small id="sub"></small></h1>
        <div className="row">
          <button className="btn p" onClick={() => { setFormData({status: 'Pending'}); setIsModalOpen(true); }}>+ Add Challan</button>
          <button className="btn" onClick={exportToPDF}>📄 PDF Download</button>
          <button className="btn" onClick={handleExport}>📤 Export Excel</button>
        </div>
      </header>

      <main>
        <div id="alert" style={{ display: faCount ? 'flex' : 'none' }}>
           {faCount > 0 && (
             <button className="btn er" onClick={() => navigate('/transport-system/fastag')}>
               🏷️ {faCount} FASTag low/blocked
             </button>
           )}
        </div>

        <div className="kpis">
          <div className="kpi"><b>{Challans.length}</b><span>Total Challans</span></div>
          <div className="kpi er"><b>{pendingCount}</b><span>Pending</span></div>
          <div className="kpi er"><b>{inr(pendingAmt)}</b><span>Pending Amount</span></div>
          <div className="kpi ok"><b>{paidCount}</b><span>Paid</span></div>
          <div className="kpi"><b>{inr(paidAmt)}</b><span>Paid Amount</span></div>
          {/* <div className="kpi wa"><b>{disputedCount}</b><span>Disputed</span></div> */}
        </div>

        <div className="grid2">
          <div className="card">
            <h3>PENDING AMOUNT BY VEHICLE</h3>
            {sortedPv.length ? sortedPv.map(f => (
              <div className="bar" key={f[0]}>
                <i title={f[0]}>{f[0]}</i>
                <div style={{ width: `${(f[1]/maxPv)*65}%` }}></div>
                <em>{inr(f[1])}</em>
              </div>
            )) : <div className="empty">No data</div>}
          </div>
          <div className="card">
            <h3>OFFENCE-WISE AMOUNT</h3>
            {sortedOf.length ? sortedOf.map(f => (
              <div className="bar" key={f[0]}>
                <i title={f[0]}>{f[0]}</i>
                <div style={{ width: `${(f[1]/maxOf)*65}%` }}></div>
                <em>{inr(f[1])}</em>
              </div>
            )) : <div className="empty">No data</div>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
          <button 
            style={{ padding: '10px 20px', fontWeight: 'bold', fontSize: '14px', background: 'transparent', border: 'none', borderBottom: activeTab === 'PENDING' ? '3px solid #dc2626' : '3px solid transparent', color: activeTab === 'PENDING' ? '#dc2626' : '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => { setActiveTab('PENDING'); setStatusFilter(''); }}
          >
            Pending
          </button>
          <button 
            style={{ padding: '10px 20px', fontWeight: 'bold', fontSize: '14px', background: 'transparent', border: 'none', borderBottom: activeTab === 'HISTORY' ? '3px solid #dc2626' : '3px solid transparent', color: activeTab === 'HISTORY' ? '#dc2626' : '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => { setActiveTab('HISTORY'); setStatusFilter(''); }}
          >
            History
          </button>
        </div>

        <div className="row" style={{ marginBottom: '10px' }}>
          <input type="text" placeholder="🔍 Search..." style={{ flex: 1, minWidth: '220px', padding: '10px', borderRadius: '8px', border: '1px solid var(--bd)' }} value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ width: '250px' }}>
            <Select
              isClearable
              options={challanOptions}
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
          {activeTab === 'HISTORY' && (
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--bd)' }}>
              <option value="">All History</option>
              <option value="PAID">Paid</option>
              {/* <option value="DISPUTED">Disputed</option> */}
            </select>
          )}
          <span style={{ color: 'var(--mut)', fontWeight: 'bold' }}>{filtered.length} / {Challans.length}</span>
        </div>

        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Challan No.</th>
                <th>Vehicle No.</th>
                <th>Owner</th>
                <th>Date ▼</th>
                <th>Place</th>
                <th>Offence</th>
                <th className="n">Amount</th>
                <th>Status</th>
                <th>Paid Date</th>
                <th>Driver</th>
                <th>Document</th>
                <th>FASTag</th>
                <th>Remarks</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map((t, i) => {
                const owner = trucks.find(x => idOf(x.vno) === idOf(t.vno))?.owner || "";
                const f = fastags.find(x => idOf(x.vno) === idOf(t.vno));
                return (
                  <tr key={t.id}>
                    <td data-label="#">{i + 1}</td>
                    <td data-label="Challan No."><b>{t.ChallanNo}</b></td>
                    <td data-label="Vehicle No."><b className="lk" onClick={() => setSelectedVehicle(t.vno)}>{t.vno}</b></td>
                    <td data-label="Owner">{owner}</td>
                    <td data-label="Date">{fmt(t.date)}</td>
                    <td data-label="Place">{t.place}</td>
                    <td data-label="Offence">{t.offence}</td>
                    <td className="n" data-label="Amount">{inr(t.amount)}</td>
                    <td data-label="Status"><span className={`tag ${cls(getStatus(t))}`}>{getStatus(t)}</span></td>
                    <td data-label="Paid Date">{fmt(t.paidDate)}</td>
                    <td data-label="Driver">{t.driver}</td>
                    <td data-label="Document">{t.document_url ? <a href={t.document_url} target="_blank" rel="noreferrer" className="lk">View</a> : "—"}</td>
                    <td data-label="FASTag">{f ? <span className="lk" onClick={() => navigate('/transport-system/fastag?vno='+t.vno)}>{inr(f.balance)}</span> : "—"}</td>
                    <td data-label="Remarks">{t.remarks}</td>
                    <td data-label="Action">
                      {getStatus(t) !== 'PAID' && (
                        <button className="btn s ok" style={{ marginRight: '5px', background: '#22c55e', color: '#fff', border: 'none' }} onClick={() => handleMarkPaid(t.id)}>Paid</button>
                      )}
                      <button className="btn s" onClick={() => { setFormData(t); setIsModalOpen(true); }}>Edit</button>{' '}
                      <button className="btn s d" onClick={() => handleDelete(t.id)}>Delete</button>
                    </td>
                  </tr>
                );
              }) : <tr><td colSpan="14"><div className="empty">No data</div></td></tr>}
            </tbody>
          </table>
        </div>
      </main>

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="ov on">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <h2>{formData.id ? 'Edit Challan' : 'Add Challan'}</h2>
            <div className="f">
              <label>Challan No.<input type="text" value={formData.ChallanNo || ''} onChange={e => setFormData({...formData, ChallanNo: e.target.value})} disabled={!!formData.id} placeholder="Leave blank to auto-generate" /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>Vehicle No.
                {formData.id ? (
                  <input type="text" value={formData.vno || ''} disabled />
                ) : (
                  <Select
                    isClearable
                    options={trucks.map(t => ({ label: t.vno, value: t.vno }))}
                    value={formData.vno ? { label: formData.vno, value: formData.vno } : null}
                    onChange={(newValue) => setFormData({...formData, vno: newValue ? newValue.value : ''})}
                    placeholder="Select Vehicle No..."
                    styles={{
                      control: (base) => ({
                        ...base,
                        padding: '1px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        boxShadow: 'none',
                        '&:hover': { borderColor: '#999' }
                      }),
                      menu: (base) => ({ ...base, zIndex: 9999 })
                    }}
                  />
                )}
              </label>
              <label>Date<input type="date" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} /></label>
              <label>Place / Location<input type="text" value={formData.place || ''} onChange={e => setFormData({...formData, place: e.target.value})} /></label>
              <label style={{ gridColumn: '1 / -1' }}>Offence<input type="text" value={formData.offence || ''} onChange={e => setFormData({...formData, offence: e.target.value})} /></label>
              <label>Amount (₹)<input type="number" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: e.target.value})} /></label>
              <label>Driver Name<input type="text" value={formData.driver || ''} onChange={e => setFormData({...formData, driver: e.target.value})} /></label>
              <label>Upload Document (PDF/Image)
                <input type="file" accept=".pdf,image/*" onChange={handleFileUpload} disabled={uploading} />
                {uploading && <small style={{ color: '#2563eb', marginTop: '4px', display: 'block' }}>Uploading...</small>}
                {formData.document_url && !uploading && <small style={{ color: '#16a34a', marginTop: '4px', display: 'block' }}>✓ File Uploaded (<a href={formData.document_url} target="_blank" rel="noreferrer">View</a>)</small>}
              </label>
            </div>
            <div className="row" style={{ marginTop: '12px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn p" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {selectedVehicle && <VehicleProfileModal vno={selectedVehicle} onClose={() => setSelectedVehicle(null)} />}

      {confirmModal && (
        <div className="ov on" style={{ zIndex: 10000 }}>
          <div className="modal" style={{ maxWidth: '400px', textAlign: 'center', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '12px', color: '#1e293b' }}>{confirmModal.title}</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>{confirmModal.message}</p>
            <div className="row" style={{ justifyContent: 'center', gap: '12px' }}>
              <button className="btn" onClick={() => setConfirmModal(null)} style={{ padding: '8px 24px' }}>Cancel</button>
              <button className="btn p" onClick={confirmModal.onConfirm} style={{ padding: '8px 24px', background: confirmModal.title.includes('Delete') ? '#ef4444' : '#22c55e', border: 'none' }}>
                {confirmModal.title.includes('Delete') ? 'Yes, Delete' : 'Yes, Mark Paid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMsg && (
        <div id="toast" style={{ display: 'block' }}>{toastMsg}</div>
      )}
    </div>
  );
}
