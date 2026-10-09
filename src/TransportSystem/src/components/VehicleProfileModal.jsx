import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const inr = n => "₹" + Number(n || 0).toLocaleString("en-IN");
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

function fstat(r) {
  const s = String(r.status || "Active").toUpperCase();
  return s === "ACTIVE" ? ((Number(r.balance) || 0) < (Number(r.minBal) || 0) ? "LOW BALANCE" : "ACTIVE") : s;
}

export default function VehicleProfileModal({ vno, onClose }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    try {
      const ls = JSON.parse(localStorage.getItem("fleet_v2") || '{"trucks":[],"fastag":[],"Challan":[]}');
      const truck = (ls.trucks || []).find(t => t.vno === vno) || { vno };
      const fastag = (ls.fastag || []).find(f => f.vno === vno);
      const Challans = (ls.Challan || []).filter(c => c.vno === vno).sort((a,b) => a.date < b.date ? 1 : -1);
      setData({ truck, fastag, Challans });
    } catch(e) {}
  }, [vno]);

  if (!data) return null;
  const { truck, fastag, Challans } = data;
  const pendingChallans = Challans.filter(c => (c.status || "PENDING").toUpperCase() === "PENDING");
  const pendingAmount = pendingChallans.reduce((a, b) => a + (Number(b.amount) || 0), 0);
  
  const truckStatus = truck.expiry ? istat(truck.expiry) : 'UNKNOWN';

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Vehicle Profile - ${vno}`, 14, 22);
    
    // Truck details
    doc.setFontSize(12);
    doc.text("Truck Details:", 14, 32);
    autoTable(doc, {
      startY: 36,
      head: [["Field", "Value"]],
      body: [
        ["Owner Name", truck.ownerName || "-"],
        ["Firm Name", truck.owner || "-"],
        ["Insurance Co.", truck.company || "-"],
        ["Policy No.", truck.policy || "-"],
        ["Start Date", fmt(truck.start) || "-"],
        ["Expiry Date", fmt(truck.expiry) || "-"],
        ["IDV", inr(truck.idv)],
        ["Premium", inr(truck.premium)],
        ["Chassis No.", truck.chassis || "-"],
        ["Engine No.", truck.engine || "-"],
        ["Model", truck.modelName || truck.remarks || "-"],
        ["Remarks", truck.extraRemarks || "-"],
      ],
      theme: 'grid'
    });

    // Fastag Details
    let nextY = doc.lastAutoTable.finalY + 10;
    if (fastag) {
      doc.text("FASTag Details:", 14, nextY);
      autoTable(doc, {
        startY: nextY + 4,
        head: [["Tag ID", "Bank", "Balance", "Status"]],
        body: [[fastag.tagId, fastag.bank, inr(fastag.balance), fstat(fastag)]],
        theme: 'grid'
      });
      nextY = doc.lastAutoTable.finalY + 10;
    }

    // Challans
    if (Challans.length > 0) {
      doc.text(`Challans (${Challans.length}) - Pending: ${inr(pendingAmount)}`, 14, nextY);
      autoTable(doc, {
        startY: nextY + 4,
        head: [["Challan No", "Date", "Offence", "Amount", "Status"]],
        body: Challans.map(c => [c.ChallanNo, fmt(c.date), c.offence, inr(c.amount), c.status || "PENDING"]),
        theme: 'grid'
      });
    }

    doc.save(`Profile_${vno}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            🚚 {vno}
            {truck.expiry && (
              <span className={`px-3 py-1 rounded-full text-xs text-white ${truckStatus === 'ACTIVE' ? 'bg-green-500' : truckStatus === 'EXPIRED' ? 'bg-red-500' : 'bg-orange-500'}`}>
                {truckStatus}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-4">
            <button className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-red-600 hover:text-white transition flex items-center gap-2 shadow-sm" onClick={exportToPDF}>
              📄 Download PDF
            </button>
            <button className="text-gray-400 hover:text-gray-600 text-2xl leading-none" onClick={onClose}>&times;</button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto bg-white" style={{ display: 'block' }}>
          
          {/* Truck Section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
            <div className="bg-blue-50/50 p-3 border-b border-gray-200 font-bold text-blue-800 flex justify-between items-center">
              TRUCK & INSURANCE
              <button className="text-xs bg-white border border-blue-200 text-blue-600 px-3 py-1 rounded hover:bg-blue-50" onClick={() => navigate('/transport-system/purchase-truck?vno='+vno)}>Open in Trucks</button>
            </div>
            {truck.owner || truck.ownerName ? (
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500 block text-xs">Owner Name</span><strong className="text-gray-800">{truck.ownerName || '-'}</strong></div>
                <div><span className="text-gray-500 block text-xs">Firm Name</span><strong className="text-gray-800">{truck.owner || '-'}</strong></div>
                <div><span className="text-gray-500 block text-xs">Insurance Co.</span><strong className="text-gray-800">{truck.company || '-'}</strong></div>
                <div><span className="text-gray-500 block text-xs">Policy No.</span><strong className="text-gray-800">{truck.policy || '-'}</strong></div>
                <div><span className="text-gray-500 block text-xs">Start Date</span><strong className="text-gray-800">{fmt(truck.start)}</strong></div>
                <div><span className="text-gray-500 block text-xs">Expiry Date</span><strong className="text-gray-800">{fmt(truck.expiry)}</strong></div>
                <div>
                  <span className="text-gray-500 block text-xs">Days Left</span>
                  <strong className={`text-gray-800 ${days(truck.expiry) !== null && days(truck.expiry) < 0 ? 'text-red-600' : days(truck.expiry) <= 30 ? 'text-orange-600' : 'text-green-600'}`}>
                    {days(truck.expiry) !== null ? (days(truck.expiry) < 0 ? `Overdue ${-days(truck.expiry)} days` : days(truck.expiry) === 0 ? 'Today' : `${days(truck.expiry)} days left`) : '-'}
                  </strong>
                </div>
                <div><span className="text-gray-500 block text-xs">IDV</span><strong className="text-gray-800">{inr(truck.idv)}</strong></div>
                <div><span className="text-gray-500 block text-xs">Premium</span><strong className="text-gray-800">{inr(truck.premium)}</strong></div>
                <div><span className="text-gray-500 block text-xs">Chassis No.</span><strong className="text-gray-800">{truck.chassis || '-'}</strong></div>
                <div><span className="text-gray-500 block text-xs">Engine No.</span><strong className="text-gray-800">{truck.engine || '-'}</strong></div>
                <div><span className="text-gray-500 block text-xs">Agent / Contact</span><strong className="text-gray-800">{truck.agent || '-'}</strong></div>
                <div><span className="text-gray-500 block text-xs">Model Name</span><strong className="text-gray-800">{truck.modelName || truck.remarks || '-'}</strong></div>
                <div><span className="text-gray-500 block text-xs">Remarks</span><strong className="text-gray-800">{truck.extraRemarks || '-'}</strong></div>
                <div>
                  <span className="text-gray-500 block text-xs mb-1">Copy of Insurance</span>
                  {truck.insuranceCopy ? <a href={truck.insuranceCopy} target="_blank" rel="noreferrer" className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded-md text-xs font-semibold hover:bg-blue-600 hover:text-white transition inline-block">📄 View</a> : <strong className="text-gray-800">-</strong>}
                </div>
                <div>
                  <span className="text-gray-500 block text-xs mb-1">Copy of Registration</span>
                  {truck.registrationCopy ? <a href={truck.registrationCopy} target="_blank" rel="noreferrer" className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded-md text-xs font-semibold hover:bg-blue-600 hover:text-white transition inline-block">📄 View</a> : <strong className="text-gray-800">-</strong>}
                </div>
              </div>
            ) : <div className="p-4 text-gray-500">Truck details missing.</div>}
          </div>

          {/* Fastag Section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
            <div className="bg-indigo-50/50 p-3 border-b border-gray-200 font-bold text-indigo-800 flex justify-between items-center">
              FASTAG
              <button className="text-xs bg-white border border-indigo-200 text-indigo-600 px-3 py-1 rounded hover:bg-indigo-50" onClick={() => navigate('/transport-system/fastag?vno='+vno)}>Open in FASTag</button>
            </div>
            {fastag ? (
              <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500 block text-xs">Tag ID</span><strong className="text-gray-800">{fastag.tagId}</strong></div>
                <div><span className="text-gray-500 block text-xs">Bank</span><strong className="text-gray-800">{fastag.bank}</strong></div>
                <div><span className="text-gray-500 block text-xs">Balance</span><strong className="text-gray-800">{inr(fastag.balance)} ({fstat(fastag)})</strong></div>
                <div><span className="text-gray-500 block text-xs">Last Recharge</span><strong className="text-gray-800">{inr(fastag.lastAmt)} on {fmt(fastag.lastDate)}</strong></div>
              </div>
            ) : <div className="p-4 text-gray-500 flex justify-between items-center">No FASTag found. <button className="text-xs bg-indigo-600 text-white px-3 py-1 rounded" onClick={() => navigate('/transport-system/fastag?add='+vno)}>+ Add FASTag</button></div>}
          </div>

          {/* Challans Section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-red-50/50 p-3 border-b border-gray-200 font-bold text-red-800 flex justify-between items-center">
              ChallanS ({Challans.length}) &middot; Pending: {pendingChallans.length} = {inr(pendingAmount)}
              <button className="text-xs bg-white border border-red-200 text-red-600 px-3 py-1 rounded hover:bg-red-50" onClick={() => navigate('/transport-system/Challan?vno='+vno)}>Open in Challans</button>
            </div>
            {Challans.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr><th className="p-2 pl-4">No.</th><th className="p-2">Date</th><th className="p-2">Offence</th><th className="p-2">Amount</th><th className="p-2">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Challans.map(c => (
                      <tr key={c.id}>
                        <td className="p-2 pl-4">{c.ChallanNo}</td>
                        <td className="p-2">{fmt(c.date)}</td>
                        <td className="p-2">{c.offence}</td>
                        <td className="p-2 font-bold text-gray-800">{inr(c.amount)}</td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${(c.status||"PENDING").toUpperCase()==='PAID'?'bg-green-500':(c.status||"").toUpperCase()==='PENDING'?'bg-red-500':'bg-orange-500'}`}>
                            {(c.status||"PENDING").toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="p-4 text-gray-500 flex justify-between items-center">No Challans found. <button className="text-xs bg-red-600 text-white px-3 py-1 rounded" onClick={() => navigate('/transport-system/Challan?add='+vno)}>+ Add Challan</button></div>}
          </div>
          
        </div>
      </div>
    </div>
  );
}
