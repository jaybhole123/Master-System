import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Printer, Edit, Download, ArrowLeft, Columns, Plus, Trash2, Eye, Search,
  Loader2, Save, X, FileText, CheckCircle, Clock, RotateCcw, Check, History,
  Undo, ChevronDown, Sparkles, Building2, User, Hash, Calendar
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';

import supabase from '../../../SupabaseClient';

import jbtLogo from '../../../assets/jbt.png';
import ganeshLogo from '../../../assets/ganesh.jpg';
import signatureImg from '../../../assets/signature.png';
import jblLogo from '../../../assets/jai.logostic.png';
import jbeLogo from '../../../assets/jbe.png';
import jblSignature from '../../../assets/logistic.signature.png';

const COMPANY_DETAILS = {
  'M/s Jai Bhole Traders': {
    name: 'M/s Jai Bhole Traders',
    logo: jbtLogo,
    gstin: '22BGWPA5742M1Z2',
    textColor: '#e43b3b',
    address: 'N.K. Agrawal & Sons Tower, 2nd Floor, Lane No. 8, Near State Bank of India, New Shanti Nagar, Shankar Nagar, Raipur 492 004 (C.G.)',
    footerContact: 'Mo. : 78736 50000, 91091 61146, E-mail : biswanath23@gmail.com, jaibholetraderacc@gmail.com'
  },
  'Jai Bhole Enterprises': {
    name: 'Jai Bhole Enterprises',
    logo: jbeLogo,
    gstin: '22AIXPA7225L1ZU',
    textColor: '#000000',
    address: 'N.K. Agrawal & Sons Tower, 3rd Floor, Lane No. 8, Near State Bank of India, New Shanti Nagar, Shankar Nagar, Raipur 492 004 (C.G.)',
    footerContact: 'Mo. : 91654 22000, E-mail : amarnath.agrawal22@gmail.com, GSTIN : 22AIXPA7225L1ZU'
  },
  'ASAK COAL PRIVATE LIMITED': {
    name: 'ASAK COAL PRIVATE LIMITED',
    logo: null,
    gstin: '22AAICA1234A1Z5',
    textColor: '#834333',
    address: 'N.K. Agrawal & Sons Tower, 1st Floor, Lane No. 8, Near State Bank of India, New Shanti Nagar, Shankar Nagar, Raipur 492 004 (C.G.)',
    footerContact: 'Mo. : 91654 22000, E-mail : asakcoal@gmail.com, CIN No. : U51909CT2022PTC013419, GSTIN : 22AAICA1234A1Z5'
  },
  'Jai Bhole Logistics': {
    name: 'Jai Bhole Logistics',
    logo: jblLogo,
    gstin: '22AANHA7052H1ZH',
    textColor: '#e85d04',
    address: 'N.K. Agrawal & Sons Tower, 3rd Floor, Lane No. 8, Near State Bank of India, New Shanti Nagar, Shankar Nagar, Raipur 492 004 (C.G.)',
    footerContact: 'Mo.: 91654 22000, E-mail : amarnath.agrawal22@gmail.com',
    signature: jblSignature
  }
};

const specKeys = [
  { key: 'commodity', label: 'Name of Commodity' },
  { key: 'mines', label: 'Mines' },
  { key: 'price', label: 'Price' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'shortageTolerance', label: 'Shortage Tolerance' },
  { key: 'doDueDate', label: 'D.O. Due Date' },
  { key: 'doCopy', label: 'D.O. Copy' },
  { key: 'destinationAdd', label: 'Destination Add.' },
  { key: 'note', label: 'Note' }
];

const defaultVisibleSpecs = () => specKeys.reduce((acc, s) => ({ ...acc, [s.key]: true }), {});

const defaultFormData = () => ({
  workOrderNo: '',
  companyName: 'Jai Bhole Logistics',
  date: new Date().toISOString().split('T')[0],
  buyerName: '',
  buyerAddress: '',
  buyerDistState: '',
  subject: 'Work Order For Transporting of Coal',
  commodity: 'Coal',
  mines: '',
  price: '',
  quantity: '',
  shortageTolerance: '0.5%',
  doDueDate: '',
  doCopy: '',
  destinationAdd: '',
  note: '',
  terms: '1. TDS will be deducted at source as per IT rules.\n2. Shortage allowed 50.00 Kg Per Truck.( If shortage received more than 50 kg.tolerance limit We will deduct the shortage for the entire quantity as per market price.)\n3. Payment will be released within 20 to 25 days from the date of receipt of invoices.\n4. Invoice will be raised on completion of each DO.',
  signatoryName: 'AMARNATH AGRAWAL',
  signatoryTitle: '9165422000',
  address: COMPANY_DETAILS['Jai Bhole Logistics'].address,
  footerContact: COMPANY_DETAILS['Jai Bhole Logistics'].footerContact,
  signatureDataUrl: COMPANY_DETAILS['Jai Bhole Logistics'].signature || '',
  status: 'Draft'
});

const toDb = (f, visibleSpecs) => ({
  work_order_no: f.workOrderNo || null,
  order_date: f.date,
  company_name: f.companyName,
  signatory_name: f.signatoryName,
  signatory_title: f.signatoryTitle,
  signature_url: f.signatureDataUrl || null,
  buyer_name: f.buyerName,
  buyer_dist_state: f.buyerDistState,
  buyer_address: f.buyerAddress,
  subject: f.subject,
  commodity: f.commodity,
  mines: f.mines,
  price: f.price,
  quantity: f.quantity,
  shortage_tolerance: f.shortageTolerance,
  do_due_date: f.doDueDate,
  do_copy: f.doCopy,
  destination_address: f.destinationAdd,
  note: f.note || '',
  terms: f.terms,
  firm_address: f.address,
  firm_footer_contact: f.footerContact,
  visible_specs: visibleSpecs,
  status: f.status || 'Draft'
});

const fromDb = (row) => ({
  id: row.id,
  workOrderNo: row.work_order_no || '',
  date: row.order_date || new Date().toISOString().split('T')[0],
  companyName: row.company_name || 'Jai Bhole Logistics',
  signatoryName: row.signatory_name || '',
  signatoryTitle: row.signatory_title || '',
  signatureDataUrl: row.signature_url || (COMPANY_DETAILS[row.company_name]?.signature || ''),
  buyerName: row.buyer_name || '',
  buyerDistState: row.buyer_dist_state || '',
  buyerAddress: row.buyer_address || '',
  subject: row.subject || 'Work Order For Transporting of Coal',
  commodity: row.commodity || '',
  mines: row.mines || '',
  price: row.price || '',
  quantity: row.quantity || '',
  shortageTolerance: row.shortage_tolerance || '',
  doDueDate: row.do_due_date || '',
  doCopy: row.do_copy || '',
  destinationAdd: row.destination_address || '',
  note: row.note || '',
  terms: row.terms || '',
  address: row.firm_address || COMPANY_DETAILS[row.company_name]?.address || '',
  footerContact: row.firm_footer_contact || COMPANY_DETAILS[row.company_name]?.footerContact || '',
  status: row.status || 'Draft',
  visibleSpecs: row.visible_specs || defaultVisibleSpecs()
});

// Reusable Hybrid Custom Dropdown Input
const DbDropdownInput = ({ label, name, value, onChange, options = [], placeholder, isTextarea = false, rows = 2, required = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const safeVal = value || '';
  const filteredOptions = useMemo(() => {
    if (!safeVal.trim()) return options;
    const lower = safeVal.toLowerCase().trim();
    return options.filter(opt => opt && opt.toLowerCase().includes(lower));
  }, [options, safeVal]);

  const hasTypedNew = safeVal.trim() && !options.some(opt => opt.toLowerCase().trim() === safeVal.toLowerCase().trim());

  return (
    <div className="form-group" ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        {options.length > 0 && (
          <span style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600, backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
            {options.length} saved
          </span>
        )}
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {isTextarea ? (
          <textarea
            name={name}
            value={safeVal}
            onChange={onChange}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            rows={rows}
            autoComplete="off"
            style={{
              width: '100%',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '8px 30px 8px 12px',
              fontSize: '0.85rem',
              outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
            onFocusCapture={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.12)'; }}
            onBlurCapture={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        ) : (
          <input
            type="text"
            name={name}
            value={safeVal}
            onChange={onChange}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            autoComplete="off"
            style={{
              width: '100%',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '8px 30px 8px 12px',
              fontSize: '0.85rem',
              outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              boxSizing: 'border-box'
            }}
            onFocusCapture={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.12)'; }}
            onBlurCapture={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        )}

        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          tabIndex={-1}
          style={{
            position: 'absolute',
            right: '8px',
            top: isTextarea ? '10px' : '50%',
            transform: isTextarea ? 'none' : 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ChevronDown size={15} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            boxShadow: '0 12px 30px -4px rgba(15, 23, 42, 0.16), 0 4px 6px -2px rgba(15, 23, 42, 0.05)',
            maxHeight: '220px',
            overflowY: 'auto',
            zIndex: 9999
          }}
        >
          {hasTypedNew && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsOpen(false);
              }}
              style={{
                padding: '9px 12px',
                fontSize: '0.8rem',
                color: '#dc2626',
                backgroundColor: '#fef2f2',
                cursor: 'pointer',
                borderBottom: '1px solid #fee2e2',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
            >
              <Plus size={14} style={{ color: '#dc2626' }} />
              <span>Use &quot;{safeVal.trim()}&quot; (New)</span>
            </div>
          )}

          {filteredOptions.length === 0 && !hasTypedNew ? (
            <div style={{ padding: '12px', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
              No matches found
            </div>
          ) : (
            filteredOptions.map((opt, i) => (
              <div
                key={i}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange({ target: { name, value: opt } });
                  setIsOpen(false);
                }}
                style={{
                  padding: '8px 12px',
                  fontSize: '0.825rem',
                  color: '#1e293b',
                  cursor: 'pointer',
                  borderBottom: i < filteredOptions.length - 1 ? '1px solid #f1f5f9' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: safeVal && safeVal.trim().toLowerCase() === opt.trim().toLowerCase() ? '#eff6ff' : 'white'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = safeVal && safeVal.trim().toLowerCase() === opt.trim().toLowerCase() ? '#eff6ff' : 'white';
                }}
              >
                <span style={{ whiteSpace: isTextarea ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt}</span>
                {safeVal && safeVal.trim().toLowerCase() === opt.trim().toLowerCase() && (
                  <Check size={13} style={{ color: '#ef4444', flexShrink: 0, marginLeft: '8px' }} />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const isDone = status === 'Done' || status === 'Completed';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '0.72rem',
      fontWeight: 700,
      letterSpacing: '0.02em',
      backgroundColor: isDone ? '#ecfdf5' : '#f8fafc',
      color: isDone ? '#047857' : '#475569',
      border: `1px solid ${isDone ? '#a7f3d0' : '#e2e8f0'}`
    }}>
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: isDone ? '#10b981' : '#94a3b8'
      }} />
      {status || 'Draft'}
    </span>
  );
};

const WorkOrder = () => {
  const letterRef = useRef(null);

  const [activeTab, setActiveTab] = useState('active');
  const [orders, setOrders] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('All');
  const [filterBuyer, setFilterBuyer] = useState('All');
  const [filterCommodity, setFilterCommodity] = useState('All');
  const [filterQty, setFilterQty] = useState('All');

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewSpecs, setPreviewSpecs] = useState(null);

  const [formData, setFormData] = useState(defaultFormData());
  const [visibleSpecs, setVisibleSpecs] = useState(defaultVisibleSpecs());
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const columnDropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(e.target)) {
        setShowColumnDropdown(false);
      }
    };
    if (showColumnDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showColumnDropdown]);

  const fetchOrders = useCallback(async () => {
    setLoadingList(true);
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      toast.error('Failed to load work orders: ' + err.message);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const generateNextWorkOrderNo = async () => {
    const year = new Date().getFullYear();
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('work_order_no')
        .not('work_order_no', 'is', null)
        .order('id', { ascending: false })
        .limit(20);

      let maxNum = 0;
      if (!error && data) {
        data.forEach(r => {
          if (r.work_order_no) {
            const match = r.work_order_no.match(/WO-\d{4}-(\d+)/i);
            if (match && match[1]) {
              const n = parseInt(match[1], 10);
              if (n > maxNum) maxNum = n;
            }
          }
        });
      }
      const nextNum = String(maxNum + 1).padStart(3, '0');
      return `WO-${year}-${nextNum}`;
    } catch {
      return `WO-${year}-001`;
    }
  };

  const openNewModal = async () => {
    setEditingId(null);
    const autoNo = await generateNextWorkOrderNo();
    setFormData({ ...defaultFormData(), workOrderNo: autoNo, status: 'Draft' });
    setVisibleSpecs(defaultVisibleSpecs());
    setShowOrderModal(true);
  };

  const openEditModal = (row) => {
    const fd = fromDb(row);
    setEditingId(row.id);
    setFormData(fd);
    setVisibleSpecs(fd.visibleSpecs || defaultVisibleSpecs());
    setShowOrderModal(true);
  };

  const handleSave = async () => {
    if (!formData.buyerName.trim()) { toast.error('Receiver Name is required'); return; }
    if (!formData.companyName.trim()) { toast.error('Company Name is required'); return; }
    setSaving(true);
    try {
      let finalWorkOrderNo = (formData.workOrderNo || '').trim();
      if (!editingId && !finalWorkOrderNo) {
        finalWorkOrderNo = await generateNextWorkOrderNo();
      }

      const formToSave = { ...formData, workOrderNo: finalWorkOrderNo };
      const payload = toDb(formToSave, visibleSpecs);

      if (editingId) {
        const { error } = await supabase.from('work_orders').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Work Order updated!');
      } else {
        const { error } = await supabase.from('work_orders').insert([payload]);
        if (error) throw error;
        toast.success(`Work Order ${finalWorkOrderNo} saved!`);
      }
      setShowOrderModal(false);
      fetchOrders();
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkDone = async (order) => {
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({ status: 'Done' })
        .eq('id', order.id);
      if (error) throw error;
      toast.success(`Work Order ${order.work_order_no || ''} marked as Done!`);
      fetchOrders();
    } catch (err) {
      toast.error('Failed to update status: ' + err.message);
    }
  };

  const handleReopen = async (order) => {
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({ status: 'Draft' })
        .eq('id', order.id);
      if (error) throw error;
      toast.success(`Work Order ${order.work_order_no || ''} moved to Active!`);
      fetchOrders();
    } catch (err) {
      toast.error('Failed to update status: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this work order?')) return;
    try {
      const { error } = await supabase.from('work_orders').delete().eq('id', id);
      if (error) throw error;
      toast.success('Deleted successfully');
      fetchOrders();
    } catch (err) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  const openPreview = (row) => {
    const fd = fromDb(row);
    setPreviewData(fd);
    setPreviewSpecs(fd.visibleSpecs || defaultVisibleSpecs());
    setShowPreviewModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'companyName') {
      const selectedCompany = COMPANY_DETAILS[value];
      setFormData(prev => ({
        ...prev, [name]: value,
        address: selectedCompany?.address || '',
        footerContact: selectedCompany?.footerContact || '',
        signatureDataUrl: selectedCompany?.signature || ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSignaturePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (ev) => setFormData(prev => ({ ...prev, signatureDataUrl: ev.target.result }));
        reader.readAsDataURL(blob);
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setFormData(prev => ({ ...prev, signatureDataUrl: ev.target.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadPDF = async () => {
    const element = letterRef.current;
    if (!element) return;
    try {
      const originalWidth = element.style.width;
      element.style.width = '800px';
      element.style.height = 'auto';
      element.style.minHeight = '1131px';
      element.style.border = 'none';
      const canvas = await html2canvas(element, { scale: 2, windowWidth: 800 });
      element.style.border = '1px solid #ccc';
      element.style.width = originalWidth;
      element.style.minHeight = '1131px';
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      let imgWidth = pdfWidth;
      let imgHeight = (canvas.height * pdfWidth) / canvas.width;
      if (imgHeight > pdfPageHeight) {
        const ratio = pdfPageHeight / imgHeight;
        imgHeight = pdfPageHeight;
        imgWidth = pdfWidth * ratio;
      }
      pdf.addImage(imgData, 'PNG', (pdfWidth - imgWidth) / 2, 0, imgWidth, imgHeight);
      pdf.save(`Work_Order_${(previewData?.buyerName || 'Order').split(' ')[0]}.pdf`);
      toast.success('PDF downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download PDF');
    }
  };

  const activeFirm = previewData
    ? (COMPANY_DETAILS[previewData.companyName] || COMPANY_DETAILS['Jai Bhole Logistics'])
    : COMPANY_DETAILS['Jai Bhole Logistics'];

  const companyOptions = useMemo(() => ['All', ...Array.from(new Set(orders.map(o => o.company_name).filter(Boolean)))], [orders]);
  const buyerOptions = useMemo(() => ['All', ...Array.from(new Set(orders.map(o => o.buyer_name).filter(Boolean)))], [orders]);
  const commodityOptions = useMemo(() => ['All', ...Array.from(new Set(orders.map(o => o.commodity).filter(Boolean)))], [orders]);
  const qtyOptions = useMemo(() => ['All', ...Array.from(new Set(orders.map(o => o.quantity).filter(Boolean)))], [orders]);

  const dbSuggestions = useMemo(() => {
    const cleanList = (arr) => Array.from(new Set(arr.map(v => (v ? String(v).trim() : '')).filter(Boolean)));
    return {
      buyers: cleanList(orders.map(o => o.buyer_name)),
      distStates: cleanList(orders.map(o => o.buyer_dist_state)),
      addresses: cleanList(orders.map(o => o.buyer_address)),
      quantities: cleanList(orders.map(o => o.quantity)),
      minesList: cleanList(orders.map(o => o.mines)),
      commodities: cleanList(orders.map(o => o.commodity)),
      shortageTolerances: cleanList(orders.map(o => o.shortage_tolerance)),
      doCopies: cleanList(orders.map(o => o.do_copy)),
      prices: cleanList(orders.map(o => o.price))
    };
  }, [orders]);

  const handleBuyerChange = (val) => {
    const matched = orders.find(o => o.buyer_name && o.buyer_name.toLowerCase().trim() === (val || '').toLowerCase().trim());
    if (matched) {
      setFormData(prev => ({
        ...prev,
        buyerName: val,
        buyerDistState: matched.buyer_dist_state || prev.buyerDistState,
        buyerAddress: matched.buyer_address || prev.buyerAddress
      }));
    } else {
      setFormData(prev => ({ ...prev, buyerName: val }));
    }
  };

  const stats = useMemo(() => {
    const total = orders.length;
    const doneCount = orders.filter(o => o.status === 'Done').length;
    const activeCount = orders.filter(o => o.status !== 'Done').length;
    const draftCount = orders.filter(o => !o.status || o.status === 'Draft').length;
    return { total, doneCount, activeCount, draftCount };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const isDone = o.status === 'Done';
      if (activeTab === 'active' && isDone) return false;
      if (activeTab === 'history' && !isDone) return false;

      const matchSearch = !searchTerm ||
        o.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.work_order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.commodity?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCompany = filterCompany === 'All' || o.company_name === filterCompany;
      const matchBuyer = filterBuyer === 'All' || o.buyer_name === filterBuyer;
      const matchCommodity = filterCommodity === 'All' || o.commodity === filterCommodity;
      const matchQty = filterQty === 'All' || o.quantity === filterQty;
      return matchSearch && matchCompany && matchBuyer && matchCommodity && matchQty;
    });
  }, [orders, activeTab, searchTerm, filterCompany, filterBuyer, filterCommodity, filterQty]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterCompany('All');
    setFilterBuyer('All');
    setFilterCommodity('All');
    setFilterQty('All');
  };

  const hasActiveFilters = searchTerm || filterCompany !== 'All' || filterBuyer !== 'All' || filterCommodity !== 'All' || filterQty !== 'All';

  const toggleSpec = (key) => setVisibleSpecs(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleAllSpecs = (val) => setVisibleSpecs(specKeys.reduce((acc, s) => ({ ...acc, [s.key]: val }), {}));

  return (
    <div className="fade-in" style={{ width: '100%', boxSizing: 'border-box', padding: '16px 20px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>

      {/* Hero Header */}
      <div className="no-print" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
        backgroundColor: '#ffffff',
        padding: '20px 24px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.08em', backgroundColor: '#fef2f2', padding: '2px 8px', borderRadius: '4px' }}>
              Letter Management
            </span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Work Orders
          </h1>
          <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Create, manage and dispatch official transportation work orders with PDF printing
          </p>
        </div>

        <button
          id="btn-new-work-order"
          onClick={openNewModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            fontSize: '0.875rem',
            borderRadius: '9px',
            fontWeight: 600,
            color: '#ffffff',
            background: 'linear-gradient(135deg, #e11d48 0%, #dc2626 100%)',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(220, 38, 38, 0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(220, 38, 38, 0.3)'; }}
        >
          <Plus size={16} strokeWidth={2.5} /> New Work Order
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        {/* Total Orders */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '18px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Orders</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: '1.2' }}>{stats.total}</div>
          </div>
        </div>

        {/* Active Orders */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '18px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Orders</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: '1.2' }}>{stats.activeCount}</div>
          </div>
        </div>

        {/* Done / History */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '18px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed History</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: '1.2' }}>{stats.doneCount}</div>
          </div>
        </div>

        {/* Drafts */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '18px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Draft Status</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: '1.2' }}>{stats.draftCount}</div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="no-print" style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '16px',
        backgroundColor: '#e2e8f0',
        padding: '4px',
        borderRadius: '10px',
        width: 'fit-content'
      }}>
        <button
          onClick={() => setActiveTab('active')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'active' ? '#ffffff' : 'transparent',
            color: activeTab === 'active' ? '#0f172a' : '#64748b',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.84rem',
            boxShadow: activeTab === 'active' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
            transition: 'all 0.15s'
          }}>
          <Clock size={15} style={{ color: activeTab === 'active' ? '#dc2626' : '#64748b' }} />
          Active Orders
          <span style={{
            fontSize: '0.72rem',
            padding: '1px 6px',
            borderRadius: '10px',
            backgroundColor: activeTab === 'active' ? '#fee2e2' : '#cbd5e1',
            color: activeTab === 'active' ? '#dc2626' : '#475569'
          }}>
            {stats.activeCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'history' ? '#ffffff' : 'transparent',
            color: activeTab === 'history' ? '#0f172a' : '#64748b',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.84rem',
            boxShadow: activeTab === 'history' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
            transition: 'all 0.15s'
          }}>
          <History size={15} style={{ color: activeTab === 'history' ? '#15803d' : '#64748b' }} />
          Completed History
          <span style={{
            fontSize: '0.72rem',
            padding: '1px 6px',
            borderRadius: '10px',
            backgroundColor: activeTab === 'history' ? '#dcfce7' : '#cbd5e1',
            color: activeTab === 'history' ? '#15803d' : '#475569'
          }}>
            {stats.doneCount}
          </span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="no-print" style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'nowrap',
        overflowX: 'auto'
      }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            id="work-order-search"
            type="text"
            placeholder="Search by buyer, order no, commodity..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '34px',
              paddingRight: '12px',
              paddingTop: '8px',
              paddingBottom: '8px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.85rem',
              outline: 'none',
              backgroundColor: '#f8fafc',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ minWidth: '150px', flex: '0 1 180px' }}>
          <select
            id="work-order-company-filter"
            value={filterCompany}
            onChange={e => setFilterCompany(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.84rem',
              outline: 'none',
              backgroundColor: '#fff',
              cursor: 'pointer',
              color: '#334155'
            }}
          >
            <option value="All">Company (All)</option>
            {companyOptions.filter(c => c !== 'All').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: '150px', flex: '0 1 180px' }}>
          <select
            id="work-order-buyer-filter"
            value={filterBuyer}
            onChange={e => setFilterBuyer(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.84rem',
              outline: 'none',
              backgroundColor: '#fff',
              cursor: 'pointer',
              color: '#334155'
            }}
          >
            <option value="All">Buyer (All)</option>
            {buyerOptions.filter(b => b !== 'All').map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: '130px', flex: '0 1 150px' }}>
          <select
            id="work-order-commodity-filter"
            value={filterCommodity}
            onChange={e => setFilterCommodity(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.84rem',
              outline: 'none',
              backgroundColor: '#fff',
              cursor: 'pointer',
              color: '#334155'
            }}
          >
            <option value="All">Commodity (All)</option>
            {commodityOptions.filter(c => c !== 'All').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: '110px', flex: '0 1 130px' }}>
          <select
            id="work-order-qty-filter"
            value={filterQty}
            onChange={e => setFilterQty(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.84rem',
              outline: 'none',
              backgroundColor: '#fff',
              cursor: 'pointer',
              color: '#334155'
            }}
          >
            <option value="All">Qty (All)</option>
            {qtyOptions.filter(q => q !== 'All').map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            title="Reset filters"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '8px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <RotateCcw size={13} /> Reset
          </button>
        )}
      </div>

      {/* Orders Table Container */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)',
        overflow: 'hidden',
        width: '100%'
      }}>
        {loadingList ? (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '70px', gap: '12px', color: '#64748b' }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#dc2626' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Loading work orders database…</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '70px 20px', color: '#94a3b8' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
              <FileText size={28} />
            </div>
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#475569', margin: '0 0 6px 0' }}>
              {activeTab === 'history'
                ? 'No completed work orders in history'
                : hasActiveFilters
                  ? 'No active orders match the current filter criteria'
                  : 'No active work orders found'}
            </p>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              {hasActiveFilters ? 'Try clearing or modifying your filter values' : 'Click "New Work Order" above to create an entry'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                style={{
                  marginTop: '14px',
                  padding: '7px 16px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  color: '#334155'
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: '#475569', width: '50px', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>#</th>
                  <th style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 700, color: '#475569', width: '50px', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>VIEW</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', minWidth: '150px', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ORDER NO</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', minWidth: '115px', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>DATE</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', minWidth: '190px', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ISSUING COMPANY</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', minWidth: '220px', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>BUYER / RECEIVER</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', minWidth: '120px', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>COMMODITY</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', minWidth: '100px', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>QTY</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: '#475569', minWidth: '100px', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STATUS</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: '#475569', minWidth: '150px', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o, idx) => (
                  <tr
                    key={o.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600, textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                      {idx + 1}
                    </td>

                    <td style={{ padding: '14px 12px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                      <button
                        id={`btn-preview-${o.id}`}
                        title="Preview & Print Letter"
                        onClick={() => openPreview(o)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: '1px solid #bfdbfe',
                          backgroundColor: '#eff6ff',
                          cursor: 'pointer',
                          color: '#2563eb',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#dbeafe'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        <Eye size={15} />
                      </button>
                    </td>

                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        padding: '4px 9px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontWeight: 700,
                        border: '1px solid #e2e8f0'
                      }}>
                        {o.work_order_no || '—'}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', color: '#475569', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9', fontSize: '0.83rem' }}>
                      {o.order_date ? new Date(o.order_date).toLocaleDateString('en-IN') : '—'}
                    </td>

                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>
                      {o.company_name}
                    </td>

                    <td style={{ padding: '14px 16px', color: '#0f172a', fontWeight: 500, borderBottom: '1px solid #f1f5f9' }}>
                      {o.buyer_name}
                    </td>

                    <td style={{ padding: '14px 16px', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                      {o.commodity || '—'}
                    </td>

                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>
                      {o.quantity || '—'}
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                      <StatusBadge status={o.status} />
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                        {o.status !== 'Done' ? (
                          <button
                            id={`btn-done-${o.id}`}
                            title="Mark as Done"
                            onClick={() => handleMarkDone(o)}
                            style={{
                              padding: '5px 9px',
                              borderRadius: '7px',
                              border: '1px solid #86efac',
                              backgroundColor: '#f0fdf4',
                              cursor: 'pointer',
                              color: '#15803d',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#dcfce7'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f0fdf4'; }}
                          >
                            <Check size={13} strokeWidth={2.8} /> Done
                          </button>
                        ) : (
                          <button
                            id={`btn-reopen-${o.id}`}
                            title="Reopen Order"
                            onClick={() => handleReopen(o)}
                            style={{
                              padding: '5px 9px',
                              borderRadius: '7px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#f8fafc',
                              cursor: 'pointer',
                              color: '#475569',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                          >
                            <Undo size={13} /> Reopen
                          </button>
                        )}

                        <button
                          id={`btn-edit-${o.id}`}
                          title="Edit Order"
                          onClick={() => openEditModal(o)}
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '7px',
                            border: '1px solid #fde68a',
                            backgroundColor: '#fffbeb',
                            cursor: 'pointer',
                            color: '#b45309',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fef3c7'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fffbeb'; e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          <Edit size={14} />
                        </button>

                        <button
                          id={`btn-delete-${o.id}`}
                          title="Delete Order"
                          onClick={() => handleDelete(o.id)}
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '7px',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fef2f2',
                            cursor: 'pointer',
                            color: '#dc2626',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* WORK ORDER FORM MODAL */}
      {showOrderModal && (
        <div className="no-print"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowOrderModal(false); }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
            position: 'relative',
            overflow: 'hidden'
          }}>

            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              backgroundColor: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              flexShrink: 0
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {editingId ? 'Updating Record' : 'Create New Document'}
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0' }}>
                  {editingId ? 'Edit Work Order' : 'New Work Order'}
                </h2>
              </div>
              <button
                id="btn-close-modal"
                onClick={() => setShowOrderModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: '#475569',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#e2e8f0'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scroll Body */}
            <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1, backgroundColor: '#ffffff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

                {/* Section 1: Order Metadata */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>Date</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>Issuing Company</label>
                  <select
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', outline: 'none', backgroundColor: '#fff', cursor: 'pointer', boxSizing: 'border-box' }}
                  >
                    {Object.keys(COMPANY_DETAILS).map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>Work Order No. (Auto)</label>
                  <input
                    type="text"
                    name="workOrderNo"
                    value={formData.workOrderNo || ''}
                    onChange={handleChange}
                    placeholder="Auto-generated e.g. WO-2026-001"
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', outline: 'none', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: 600, boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>Signatory Name</label>
                  <input
                    type="text"
                    name="signatoryName"
                    value={formData.signatoryName}
                    onChange={handleChange}
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>Signatory Title / Phone</label>
                  <input
                    type="text"
                    name="signatoryTitle"
                    value={formData.signatoryTitle}
                    onChange={handleChange}
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group col-span-full" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Signature Image (Click or Press Ctrl+V)
                  </label>
                  <div
                    onPaste={handleSignaturePaste}
                    tabIndex="0"
                    style={{
                      width: '100%',
                      border: '2px dashed #cbd5e1',
                      borderRadius: '10px',
                      padding: '12px',
                      textAlign: 'center',
                      color: '#64748b',
                      cursor: 'pointer',
                      position: 'relative',
                      outline: 'none',
                      backgroundColor: '#f8fafc',
                      minHeight: '64px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box'
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 5 }}
                    />
                    {formData.signatureDataUrl ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', position: 'relative', zIndex: 10 }}>
                        <img src={formData.signatureDataUrl} alt="Signature" style={{ height: '48px', objectFit: 'contain' }} />
                        <span
                          style={{ fontSize: '0.75rem', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormData(prev => ({ ...prev, signatureDataUrl: '' })); }}>
                          Remove Signature
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Click to upload PNG/JPG or paste clipboard image directly (Ctrl+V)
                      </span>
                    )}
                  </div>
                </div>

                {/* Section 2: Receiver Info */}
                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '6px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    To Address (Receiver Information)
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <DbDropdownInput
                      label="Receiver / Buyer Name"
                      name="buyerName"
                      value={formData.buyerName}
                      onChange={(e) => handleBuyerChange(e.target.value)}
                      options={dbSuggestions.buyers}
                      placeholder="Search or enter receiver name"
                      required={true}
                    />
                    <DbDropdownInput
                      label="District & State"
                      name="buyerDistState"
                      value={formData.buyerDistState}
                      onChange={handleChange}
                      options={dbSuggestions.distStates}
                      placeholder="e.g. Durg (C.G.)"
                    />
                    <div style={{ gridColumn: '1 / -1' }}>
                      <DbDropdownInput
                        label="Full Address"
                        name="buyerAddress"
                        value={formData.buyerAddress}
                        onChange={handleChange}
                        options={dbSuggestions.addresses}
                        placeholder="Complete postal address with landmarks..."
                        isTextarea={true}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Order Details with Columns Toggler */}
                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Specifications & Details
                    </h3>
                    <div style={{ position: 'relative' }} ref={columnDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          fontSize: '0.8rem',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff',
                          cursor: 'pointer',
                          fontWeight: 600,
                          color: '#334155'
                        }}
                      >
                        <Columns size={14} /> Toggle Fields
                      </button>
                      {showColumnDropdown && (
                        <div style={{
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          marginTop: '6px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '10px',
                          zIndex: 50,
                          minWidth: '220px',
                          boxShadow: '0 12px 30px -4px rgba(15, 23, 42, 0.16)',
                          userSelect: 'none'
                        }}>
                          <div style={{ padding: '4px 6px 8px', fontWeight: '700', fontSize: '0.82rem', color: '#0f172a', borderBottom: '1px solid #f1f5f9', marginBottom: '8px' }}>
                            Visible Specifications
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 6px 8px', fontSize: '0.78rem', borderBottom: '1px solid #f1f5f9', marginBottom: '6px' }}>
                            <button type="button" onClick={() => toggleAllSpecs(true)} style={{ color: '#dc2626', fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>Select All</button>
                            <button type="button" onClick={() => toggleAllSpecs(false)} style={{ color: '#64748b', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>Deselect All</button>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '250px', overflowY: 'auto' }}>
                            {specKeys.map(spec => {
                              const isChecked = !!visibleSpecs[spec.key];
                              return (
                                <label
                                  key={spec.key}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    toggleSpec(spec.key);
                                  }}
                                  style={{
                                    padding: '6px 8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    cursor: 'pointer',
                                    borderRadius: '6px',
                                    transition: 'background-color 0.15s'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    readOnly
                                    style={{ accentColor: '#dc2626', width: '15px', height: '15px', cursor: 'pointer', margin: 0, flexShrink: 0 }}
                                  />
                                  <span style={{ fontSize: '0.82rem', color: isChecked ? '#0f172a' : '#64748b', fontWeight: isChecked ? 600 : 400, whiteSpace: 'nowrap' }}>
                                    {spec.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>Subject Line</label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {visibleSpecs.commodity && (
                      <DbDropdownInput
                        label="Commodity"
                        name="commodity"
                        value={formData.commodity}
                        onChange={handleChange}
                        options={dbSuggestions.commodities}
                        placeholder="e.g. Coal / Wash Coal"
                      />
                    )}
                    {visibleSpecs.mines && (
                      <DbDropdownInput
                        label="Mines"
                        name="mines"
                        value={formData.mines}
                        onChange={handleChange}
                        options={dbSuggestions.minesList}
                        placeholder="e.g. Dipka / Gevra"
                      />
                    )}
                    {visibleSpecs.quantity && (
                      <DbDropdownInput
                        label="Quantity"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleChange}
                        options={dbSuggestions.quantities}
                        placeholder="e.g. 1000 MT"
                      />
                    )}
                    {visibleSpecs.shortageTolerance && (
                      <DbDropdownInput
                        label="Shortage Tolerance"
                        name="shortageTolerance"
                        value={formData.shortageTolerance}
                        onChange={handleChange}
                        options={dbSuggestions.shortageTolerances}
                        placeholder="e.g. 0.5%"
                      />
                    )}
                    {visibleSpecs.doDueDate && (
                      <div className="form-group">
                        <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>D.O. Due Date</label>
                        <input
                          type="text"
                          name="doDueDate"
                          value={formData.doDueDate}
                          onChange={handleChange}
                          placeholder="e.g. 15 Days from order"
                          style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    )}
                    {visibleSpecs.doCopy && (
                      <DbDropdownInput
                        label="D.O. Copy"
                        name="doCopy"
                        value={formData.doCopy}
                        onChange={handleChange}
                        options={dbSuggestions.doCopies}
                        placeholder="Select or enter DO copy info"
                      />
                    )}
                    {visibleSpecs.price && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <DbDropdownInput
                          label="Price Structure"
                          name="price"
                          value={formData.price}
                          onChange={handleChange}
                          options={dbSuggestions.prices}
                          placeholder="Price description or structure..."
                          isTextarea={true}
                          rows={2}
                        />
                      </div>
                    )}
                    {visibleSpecs.destinationAdd && (
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>Destination Address</label>
                        <input
                          type="text"
                          name="destinationAdd"
                          value={formData.destinationAdd}
                          onChange={handleChange}
                          placeholder="Unloading destination address..."
                          style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    )}
                    {visibleSpecs.note && (
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>Special Note</label>
                        <textarea
                          name="note"
                          value={formData.note}
                          onChange={handleChange}
                          rows="2"
                          placeholder="Any special remarks or instructions..."
                          style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                        />
                      </div>
                    )}
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>Terms & Conditions</label>
                      <textarea
                        name="terms"
                        value={formData.terms}
                        onChange={handleChange}
                        rows="3"
                        style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Firm Footer Details */}
                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '6px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Firm Location Details (Printed at Bottom)
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>Firm Address</label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows="2"
                        style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>Firm Footer Contact</label>
                      <input
                        type="text"
                        name="footerContact"
                        value={formData.footerContact}
                        onChange={handleChange}
                        style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Actions Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              padding: '16px 24px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              flexShrink: 0
            }}>
              <button
                id="btn-cancel-modal"
                onClick={() => setShowOrderModal(false)}
                style={{
                  padding: '9px 20px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: '#475569'
                }}
              >
                Cancel
              </button>
              <button
                id="btn-save-work-order"
                onClick={handleSave}
                disabled={saving}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 24px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  color: 'white',
                  background: 'linear-gradient(135deg, #e11d48 0%, #dc2626 100%)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)'
                }}
              >
                {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                {saving ? 'Saving...' : editingId ? 'Update Work Order' : 'Save Work Order'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PRINT / PDF PREVIEW MODAL */}
      {showPreviewModal && previewData && (
        <div className="no-print"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPreviewModal(false); }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '920px',
            height: '92vh',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45)',
            position: 'relative',
            overflow: 'hidden'
          }}>

            {/* Preview Modal Header */}
            <div className="no-print" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 24px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              flexShrink: 0
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Document Preview</span>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>
                  Work Order: <span style={{ color: '#dc2626' }}>{previewData.workOrderNo || 'Draft'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  id="btn-download-pdf"
                  onClick={handleDownloadPDF}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    borderRadius: '8px',
                    fontWeight: 600,
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)'
                  }}
                >
                  <Download size={15} /> Download PDF
                </button>
                <button
                  onClick={() => window.print()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    borderRadius: '8px',
                    fontWeight: 600,
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={15} /> Print
                </button>
                <button
                  id="btn-close-preview"
                  onClick={() => setShowPreviewModal(false)}
                  style={{
                    padding: '8px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    background: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#475569'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Letter Preview Sheet */}
            <div style={{
              overflowY: 'auto',
              flex: 1,
              padding: '28px 20px 48px 20px',
              backgroundColor: '#334155',
              display: 'flex',
              justifyContent: 'center',
              boxSizing: 'border-box'
            }}>
              <div className="print-area" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <div
                  ref={letterRef}
                  className="letter-content"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    padding: '36px 44px 32px 44px',
                    width: '800px',
                    minHeight: '1131px',
                    height: 'auto',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: '"Times New Roman", Times, serif',
                    boxSizing: 'border-box',
                    fontSize: '13.5px',
                    lineHeight: '1.45',
                    borderRadius: '4px',
                    marginBottom: '20px'
                  }}
                >
                  <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '8px', fontSize: '0.85rem' }}>
                    GSTIN : {activeFirm.gstin}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80px', marginBottom: '12px', position: 'relative' }}>
                    {activeFirm.logo && (
                      <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', zIndex: 10 }}>
                        <img src={activeFirm.logo} alt={activeFirm.name} style={{ height: '65px', maxWidth: '150px', objectFit: 'contain' }} />
                      </div>
                    )}
                    <h1 style={{
                      fontSize: activeFirm.name.length > 20 ? '2rem' : '2.3rem',
                      fontWeight: 'bold',
                      margin: 0,
                      color: activeFirm.textColor,
                      fontFamily: '"Baloo 2", "Comic Sans MS", sans-serif',
                      textAlign: 'center',
                      width: '100%',
                      paddingLeft: activeFirm.logo ? '150px' : '0',
                      paddingRight: activeFirm.logo ? '150px' : '0',
                      boxSizing: 'border-box',
                      whiteSpace: 'nowrap'
                    }}>
                      {activeFirm.name}
                    </h1>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', position: 'relative', marginBottom: '10px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', textDecoration: 'underline', margin: '0 auto', textAlign: 'center' }}>WORK ORDER</h2>
                    <div style={{ fontWeight: 'bold', color: '#000000', position: 'absolute', right: 0 }}>
                      DT: - {previewData.date ? previewData.date.split('-').reverse().join('.') : ''}
                    </div>
                  </div>

                  <div style={{ marginBottom: '10px', lineHeight: '1.4' }}>
                    <p style={{ margin: '0 0 2px 0' }}>To,</p>
                    <p style={{ margin: '0 0 2px 0', fontWeight: 'bold' }}>{previewData.buyerName}</p>
                    <p style={{ margin: '0 0 2px 0', whiteSpace: 'pre-wrap' }}>{previewData.buyerAddress}</p>
                    {previewData.buyerDistState && <p style={{ margin: 0 }}>Dist :- {previewData.buyerDistState}</p>}
                  </div>

                  <p style={{ marginBottom: '10px', fontWeight: 'bold', textDecoration: 'underline' }}>Subject: - {previewData.subject}</p>
                  <p style={{ marginBottom: '8px' }}>Dear Sir,</p>
                  <p style={{ marginBottom: '12px' }}>With Reference to telephonic discussion, we are pleased to give you a work order for Transporting Work of coal.</p>

                  <table style={{ width: '92%', margin: '0 auto 12px auto', borderCollapse: 'collapse', lineHeight: '1.45' }}>
                    <tbody>
                      {previewSpecs?.commodity && <tr><td style={{ width: '40%', padding: '3px 0' }}>Name of Commodity</td><td style={{ width: '10%' }}>:-</td><td><b>{previewData.commodity}</b></td></tr>}
                      {previewSpecs?.mines && <tr><td style={{ padding: '3px 0' }}>Mines</td><td>:-</td><td>{previewData.mines}</td></tr>}
                      {previewSpecs?.price && <tr><td style={{ verticalAlign: 'top', padding: '3px 0' }}>Price</td><td style={{ verticalAlign: 'top' }}>:-</td><td style={{ whiteSpace: 'pre-wrap', fontWeight: 'bold' }}>{previewData.price}</td></tr>}
                      {previewSpecs?.quantity && <tr><td style={{ padding: '3px 0' }}>Quantity</td><td>:-</td><td><b>{previewData.quantity}</b></td></tr>}
                      {previewSpecs?.shortageTolerance && <tr><td style={{ padding: '3px 0' }}>Shortage Tolerance</td><td>:-</td><td>{previewData.shortageTolerance}</td></tr>}
                      {previewSpecs?.doDueDate && <tr><td style={{ padding: '3px 0' }}>D.O.Due Date</td><td>:-</td><td>{previewData.doDueDate}</td></tr>}
                      {previewSpecs?.doCopy && <tr><td style={{ padding: '3px 0' }}>D.O.Copy</td><td>:-</td><td>{previewData.doCopy}</td></tr>}
                      {previewSpecs?.destinationAdd && <tr><td style={{ padding: '3px 0' }}>Destination Add.</td><td>:-</td><td>{previewData.destinationAdd}</td></tr>}
                      {previewSpecs?.note && previewData.note && <tr><td style={{ verticalAlign: 'top', padding: '3px 0' }}>Note</td><td style={{ verticalAlign: 'top' }}>:-</td><td style={{ whiteSpace: 'pre-wrap' }}>{previewData.note}</td></tr>}
                    </tbody>
                  </table>

                  <h3 style={{ fontWeight: 'bold', textDecoration: 'underline', margin: '0 0 6px 0' }}>Term & Conditions</h3>
                  <div style={{ paddingLeft: '16px', marginBottom: '12px', lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>{previewData.terms}</div>

                  <div style={{ marginTop: 'auto', lineHeight: '1.4' }}>
                    <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>For {previewData.companyName}</p>
                    <div style={{ height: '70px', display: 'flex', alignItems: 'center', marginTop: '4px', marginBottom: '4px' }}>
                      {previewData.signatureDataUrl && (
                        <img src={previewData.signatureDataUrl} alt="Signature" style={{ height: '100%', objectFit: 'contain' }} />
                      )}
                    </div>
                    <p style={{ fontWeight: 'bold', margin: '0' }}>{previewData.signatoryName}</p>
                    <p style={{ margin: '0', color: '#334155' }}>{previewData.signatoryTitle}</p>
                    <div style={{ borderTop: '2px solid #ccc', marginTop: '12px', paddingTop: '8px', textAlign: 'center', fontSize: '0.85rem', color: '#1d4ed8' }}>
                      <div>{previewData.address}</div>
                      <div>{previewData.footerContact}</div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default WorkOrder;
