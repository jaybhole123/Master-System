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

export default function FastagSystem() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [fastags, setFastags] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [Challans, setChallans] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [toastMsg, setToastMsg] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  
  const [rechargeModal, setRechargeModal] = useState(null);
  const [rechargeAmt, setRechargeAmt] = useState('');
  const [rechargeDate, setRechargeDate] = useState('');
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const fetchFastags = async () => {
    const { data, error } = await supabase.from('fastags').select('*').order('created_at', { ascending: false });
    if (data && !error) {
      const mapped = data.map(d => ({
        id: d.id,
        vno: d.vno,
        tagId: d.tag_id,
        bank: d.bank,
        balance: d.balance,
        minBal: d.min_bal,
        lastDate: d.last_date,
        lastAmt: d.last_amt,
        status: d.status,
        remarks: d.remarks,
        document_url: d.document_url
      }));
      setFastags(mapped);
      try {
        const ls = JSON.parse(localStorage.getItem("fleet_v2") || '{"trucks":[],"fastag":[],"Challan":[]}');
        ls.fastag = mapped;
        localStorage.setItem("fleet_v2", JSON.stringify(ls));
      } catch(e){}
    }
  };

  useEffect(() => {
    fetchFastags();
    try {
      const data = JSON.parse(localStorage.getItem("fleet_v2") || "null");
      if (data) {
        setTrucks(data.trucks || []);
        setChallans(data.Challan || []);
      }
    } catch(e) {}
    
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

  const handleSave = async () => {
    if (!formData.vno) return alert("Vehicle No. is required");
    const cleaned = { ...formData };
    cleaned.vno = cleaned.vno.toUpperCase();
    
    const payload = {
      vno: cleaned.vno,
      tag_id: cleaned.tagId || null,
      bank: cleaned.bank || null,
      balance: cleaned.balance || 0,
      min_bal: cleaned.minBal || 0,
      last_date: cleaned.lastDate || null,
      last_amt: cleaned.lastAmt || 0,
      status: cleaned.status || 'Active',
      remarks: cleaned.remarks || null,
      document_url: cleaned.document_url || null
    };

    const { error } = await supabase.from('fastags').upsert(payload, { onConflict: 'vno' });
    if (error) return alert("Error: " + error.message);
    
    await fetchFastags();
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
    const filePath = `fastags/${fileName}`;
    
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

  const handleDelete = async (id) => {
    if (window.confirm("Sure to delete?")) {
      const { error } = await supabase.from('fastags').delete().eq('id', id);
      if (error) return alert("Error: " + error.message);
      await fetchFastags();
      showToast("Deleted");
    }
  };

  const handleRechargeSubmit = async () => {
    const amt = Number(rechargeAmt);
    if (!amt || amt <= 0) return alert("Valid amount is required");
    
    const t = fastags.find(x => x.id === rechargeModal.id);
    if (!t) return;
    
    const newBal = (Number(t.balance) || 0) + amt;
    const lDate = rechargeDate || iso(new Date());
    
    const { error } = await supabase.from('fastags').update({
      balance: newBal,
      last_amt: amt,
      last_date: lDate
    }).eq('id', t.id);
    
    if (error) return alert("Error: " + error.message);
    
    await fetchFastags();
    setRechargeModal(null);
    showToast(`Successfully recharged ₹${amt} for ${t.vno}`);
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
          tag_id: row['FASTag / Tag ID']?.toString() || null,
          bank: row['Bank / Issuer']?.toString() || null,
          balance: Number(row['Current Balance (₹)']) || 0,
          min_bal: Number(row['Low Balance Alert Below (₹)']) || 0,
          last_date: row['Last Recharge Date'] ? iso(new Date(row['Last Recharge Date'])) : null,
          last_amt: Number(row['Last Recharge Amount (₹)']) || 0,
          status: row['Tag Status']?.toString() || "Active",
          remarks: row['Remarks']?.toString() || null
        });
        count++;
      });
      if (newPayloads.length > 0) {
        const { error } = await supabase.from('fastags').upsert(newPayloads, { onConflict: 'vno' });
        if (error) alert("Error importing: " + error.message);
        else {
          await fetchFastags();
          showToast(`Imported ${count} FASTags`);
        }
      }
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleExport = () => {
    const data = fastags.map((t, i) => ({
      "S.No.": i + 1,
      "Vehicle No.": t.vno,
      "Owner Name": trucks.find(x => idOf(x.vno) === idOf(t.vno))?.owner || "",
      "FASTag / Tag ID": t.tagId,
      "Bank / Issuer": t.bank,
      "Current Balance (₹)": t.balance,
      "Low Balance Alert Below (₹)": t.minBal,
      "Last Recharge Date": fmt(t.lastDate),
      "Last Recharge Amount (₹)": t.lastAmt,
      "Tag Status": t.status,
      "Remarks": t.remarks,
      "Alert Status": fstat(t)
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "FASTAG DATA");
    XLSX.writeFile(wb, "FASTAG_DATA.xlsx");
  };

  const exportToPDF = () => {
    if (fastags.length === 0) return alert("No data to export!");
    const doc = new jsPDF({ orientation: 'landscape' });
    
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text("FASTag Details", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const currentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    doc.text(`Generated on: ${currentDate}`, 14, 28);

    const tableColumn = ["#", "Vehicle No.", "Owner Name", "Tag ID", "Bank", "Balance (Rs)", "Alert Below (Rs)", "Last Recharge", "Last Amount (Rs)", "Status"];
    const tableRows = [];
    filtered.forEach((t, i) => {
      const owner = trucks.find(x => idOf(x.vno) === idOf(t.vno))?.owner || "";
      tableRows.push([
        i + 1,
        t.vno,
        owner,
        t.tagId,
        t.bank,
        t.balance,
        t.minBal,
        fmt(t.lastDate),
        t.lastAmt,
        fstat(t)
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

    doc.save("FASTAG_DATA.pdf");
  };

  const [filterVehicleNo, setFilterVehicleNo] = useState(null);

  let filtered = fastags.filter(t => {
    if (filterVehicleNo && t.vno !== filterVehicleNo.value) return false;
    if (statusFilter && fstat(t) !== statusFilter) return false;
    if (search) {
       const q = search.toLowerCase();
       if (!t.vno.toLowerCase().includes(q) && !(t.tagId||"").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const uniqueFastags = [...new Set(fastags.map(t => t.vno))].filter(Boolean);
  const fastagOptions = uniqueFastags.map(v => ({ label: v, value: v }));

  const activeCount = fastags.filter(t => fstat(t) === 'ACTIVE').length;
  const lowCount = fastags.filter(t => fstat(t) === 'LOW BALANCE').length;
  const blockedCount = fastags.filter(t => fstat(t) === 'BLOCKED').length;
  const totalBalance = fastags.reduce((a, b) => a + (Number(b.balance) || 0), 0);
  
  const missingTrucks = trucks.filter(t => !fastags.some(f => idOf(f.vno) === idOf(t.vno)));
  const sortedBalances = [...fastags].sort((a,b) => (Number(a.balance)||0) - (Number(b.balance)||0));
  const maxBal = Math.max(1, ...sortedBalances.map(f => Number(f.balance)||0));

  // compute pending Challan amount per vehicle
  const pendingByVno = {};
  Challans.forEach(c => {
    if ((c.status || "PENDING").toUpperCase() === "PENDING") {
      const k = idOf(c.vno);
      if (!pendingByVno[k]) pendingByVno[k] = { n: 0, a: 0 };
      pendingByVno[k].n++;
      pendingByVno[k].a += (Number(c.amount) || 0);
    }
  });

  return (
    <div className="fleet-wrapper">
      <header>
        <h1>🏷️ Fastag <small id="sub"></small></h1>
        <div className="row">
          <button className="btn p" onClick={() => { setFormData({}); setIsModalOpen(true); }}>+ Add FASTag</button>
          <button className="btn" onClick={exportToPDF}>📄 PDF Download</button>
          <button className="btn" onClick={handleExport}>📤 Export Excel</button>
        </div>
      </header>

      <main>
        <div id="alert" style={{ display: (lowCount || blockedCount) ? 'flex' : 'none' }}>
           {(lowCount > 0 || blockedCount > 0) && (
             <button className="btn er" onClick={() => setStatusFilter(blockedCount ? 'BLOCKED' : 'LOW BALANCE')}>
               🏷️ {lowCount + blockedCount} FASTag low/blocked
             </button>
           )}
        </div>

        <div className="kpis">
          <div className="kpi"><b>{fastags.length}</b><span>FASTags</span></div>
          <div className="kpi ok"><b>{activeCount}</b><span>Active</span></div>
          <div className="kpi wa"><b>{lowCount}</b><span>Low Balance</span></div>
          <div className="kpi er"><b>{blockedCount}</b><span>Blocked</span></div>
          <div className="kpi"><b>{inr(totalBalance)}</b><span>Total Balance</span></div>
          <div className={`kpi ${missingTrucks.length ? 'er' : 'ok'}`}><b>{missingTrucks.length}</b><span>Trucks without FASTag</span></div>
        </div>

        <div className="grid2">
          <div className="card">
            <h3>BALANCE BY VEHICLE (lowest first)</h3>
            {sortedBalances.length ? sortedBalances.map(f => (
              <div className="bar" key={f.id}>
                <i title={f.vno}>{f.vno}</i>
                <div style={{ width: `${((Number(f.balance)||0)/maxBal)*65}%` }}></div>
                <em>{inr(f.balance)}</em>
              </div>
            )) : <div className="empty">No data</div>}
          </div>
          <div className="card">
            <h3>TRUCKS WITHOUT FASTAG (click to add)</h3>
            {missingTrucks.length ? missingTrucks.map(t => (
              <button key={t.id} className="btn s" style={{ margin: '2px' }} onClick={() => { setFormData({ vno: t.vno, status: 'Active' }); setIsModalOpen(true); }}>
                + {t.vno}
              </button>
            )) : <div className="empty">Sab trucks me FASTag hai ✔</div>}
          </div>
        </div>

        <div className="row" style={{ marginBottom: '10px' }}>
          <input type="text" placeholder="🔍 Search..." style={{ flex: 1, minWidth: '220px', padding: '10px', borderRadius: '8px', border: '1px solid var(--bd)' }} value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ width: '250px' }}>
            <Select
              isClearable
              options={fastagOptions}
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
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--bd)' }}>
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="LOW BALANCE">Low Balance</option>
            <option value="BLOCKED">Blocked</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <span style={{ color: 'var(--mut)', fontWeight: 'bold' }}>{filtered.length} / {fastags.length}</span>
        </div>

        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Vehicle No.</th>
                <th>Owner</th>
                <th>Tag ID</th>
                <th>Bank</th>
                <th className="n">Balance</th>
                <th className="n">Alert Below</th>
                <th>Last Recharge</th>
                <th className="n">Last Amount</th>
                <th>Status</th>
                <th>Pending Challan</th>
                <th>Document</th>
                <th>Remarks</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map((t, i) => {
                const owner = trucks.find(x => idOf(x.vno) === idOf(t.vno))?.owner || "";
                const pc = pendingByVno[idOf(t.vno)];
                return (
                  <tr key={t.id}>
                    <td data-label="#">{i + 1}</td>
                    <td data-label="Vehicle No."><b className="lk" onClick={() => setSelectedVehicle(t.vno)}>{t.vno}</b></td>
                    <td data-label="Owner">{owner}</td>
                    <td data-label="Tag ID">{t.tagId}</td>
                    <td data-label="Bank">{t.bank}</td>
                    <td className="n" data-label="Balance">{inr(t.balance)}</td>
                    <td className="n" data-label="Alert Below">{inr(t.minBal)}</td>
                    <td data-label="Last Recharge">{fmt(t.lastDate)}</td>
                    <td className="n" data-label="Last Amount">{inr(t.lastAmt)}</td>
                    <td data-label="Status"><span className={`tag ${cls(fstat(t))}`}>{fstat(t)}</span></td>
                    <td data-label="Pending Challan">
                      {pc ? (
                        <div 
                          onClick={() => navigate('/transport-system/Challan?vno='+t.vno)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px',
                            backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px',
                            cursor: 'pointer', color: '#dc2626', fontWeight: '600', fontSize: '13px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca'; }}
                        >
                          <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{pc.n}</span>
                          <span>{inr(pc.a)}</span>
                        </div>
                      ) : "—"}
                    </td>
                    <td data-label="Document">{t.document_url ? <a href={t.document_url} target="_blank" rel="noreferrer" className="lk">View</a> : "—"}</td>
                    <td data-label="Remarks">{t.remarks}</td>
                    <td data-label="Action">
                      <button className="btn s" onClick={() => { setRechargeModal(t); setRechargeAmt(''); setRechargeDate(iso(new Date())); }}>Recharge</button>
                      <button className="btn s" onClick={() => { setFormData(t); setIsModalOpen(true); }}>Edit</button>
                      <button className="btn s d" onClick={() => handleDelete(t.id)}>Delete</button>
                    </td>
                  </tr>
                );
              }) : <tr><td colSpan="13"><div className="empty">No data</div></td></tr>}
            </tbody>
          </table>
        </div>
      </main>

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="ov on">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <h2>{formData.id ? 'Edit FASTag' : 'Add FASTag'}</h2>
            <div className="f">
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
              <label>Tag ID<input type="text" value={formData.tagId || ''} onChange={e => setFormData({...formData, tagId: e.target.value})} /></label>
              <label>Bank<input type="text" value={formData.bank || ''} onChange={e => setFormData({...formData, bank: e.target.value})} /></label>
              <label>Balance (₹)<input type="number" value={formData.balance || ''} onChange={e => setFormData({...formData, balance: e.target.value})} /></label>
              <label>Low Balance Alert Below (₹)<input type="number" value={formData.minBal || ''} onChange={e => setFormData({...formData, minBal: e.target.value})} /></label>
              <label>Status
                <select value={formData.status || 'Active'} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option>Active</option>
                  <option>Blocked</option>
                  <option>Inactive</option>
                </select>
              </label>
              <label>Last Recharge Date<input type="date" value={formData.lastDate || ''} onChange={e => setFormData({...formData, lastDate: e.target.value})} /></label>
              <label>Last Recharge Amount (₹)<input type="number" value={formData.lastAmt || ''} onChange={e => setFormData({...formData, lastAmt: e.target.value})} /></label>
              <label>Remarks<input type="text" value={formData.remarks || ''} onChange={e => setFormData({...formData, remarks: e.target.value})} /></label>
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

      {/* Recharge Modal */}
      {rechargeModal && (
        <div className="ov on">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <h2>Recharge – {rechargeModal.vno} (balance: {inr(rechargeModal.balance)})</h2>
            <div className="f">
              <label>Recharge Amount (₹)<input type="number" value={rechargeAmt} onChange={e => setRechargeAmt(e.target.value)} autoFocus /></label>
              <label>Recharge Date<input type="date" value={rechargeDate} onChange={e => setRechargeDate(e.target.value)} /></label>
            </div>
            <div className="row" style={{ marginTop: '12px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setRechargeModal(null)}>Cancel</button>
              <button className="btn p" onClick={handleRechargeSubmit}>Save</button>
            </div>
          </div>
        </div>
      )}

      {selectedVehicle && <VehicleProfileModal vno={selectedVehicle} onClose={() => setSelectedVehicle(null)} />}

      {toastMsg && (
        <div id="toast" style={{ display: 'block' }}>{toastMsg}</div>
      )}
    </div>
  );
}
