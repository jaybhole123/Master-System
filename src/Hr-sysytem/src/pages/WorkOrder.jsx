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
import jbt2Logo from '../../../assets/jbt2.png';
import jbtSignature from '../../../assets/jbtsignature.png';
import ganeshLogo from '../../../assets/ganesh.jpg';
import signatureImg from '../../../assets/signature.png';
import jblLogo from '../../../assets/jai.logostic.png';
import jbeLogo from '../../../assets/jbe.png';
import jblSignature from '../../../assets/logistic.signature.png';

const COMPANY_DETAILS = {
  'M/s Jai Bhole Traders': {
    name: 'M/s Jai Bhole Traders',
    logo: jbt2Logo,
    gstin: '22BGWPA5742M1Z2',
    textColor: '#1e293b',
    address: 'N.K. Agrawal & Sons Tower, 2nd Floor, Lane No. 8, Near State Bank of India, New Shanti Nagar, Shankar Nagar, Raipur 492 004 (C.G.)',
    footerContact: 'Mo. : 78736 50000, 91091 61146, E-mail : biswanath23@gmail.com, jaibholetraderacc@gmail.com',
    signature: jbtSignature
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
  { key: 'fcGuarantee', label: 'FC Guarantee' },
  { key: 'shortageTolerance', label: 'Shortage Tolerance' },
  { key: 'doDueDate', label: 'D.O. Due Date' },
  { key: 'doCopy', label: 'D.O. Copy' },
  { key: 'destinationAdd', label: 'Destination Add.' },
  { key: 'note', label: 'Note' }
];

const defaultVisibleSpecs = () => specKeys.reduce((acc, s) => ({ ...acc, [s.key]: true }), {});

// PURCHASE ORDER (FORMAT 2) SPEC KEYS
const poSpecKeys = [
  { key: 'buyer', label: 'Buyer (Self Firm)' },
  { key: 'consignee', label: 'Consignee' },
  { key: 'material', label: 'Material & Chemical Specs' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'rate', label: 'Rate' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'paymentCondition', label: 'Payment Condition' },
  { key: 'gst', label: 'GST' }
];

const defaultPoVisibleSpecs = () => poSpecKeys.reduce((acc, s) => ({ ...acc, [s.key]: true }), {});

const defaultFormData = () => ({
  docType: 'work_order', // 'work_order' | 'purchase_order'
  workOrderNo: '',
  companyName: 'Jai Bhole Logistics',
  orderTitle: 'WORK ORDER',
  date: new Date().toISOString().split('T')[0],
  buyerName: '',
  buyerAddress: '',
  buyerDistState: '',
  subject: 'Work Order For Transporting of Coal',
  commodity: 'Coal',
  mines: '',
  price: '',
  quantity: '',
  fcGuarantee: '',
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
  status: 'Draft',
  // Purchase Order specific extra fields:
  vendorGst: '',
  buyerGst: '',
  consigneeName: '',
  consigneeAddress: '',
  consigneeGst: '',
  materialName: '',
  chemicalSpecs: [
    { name: '', value: '' }
  ],
  specSul: '',
  specPhos: '',
  specCar: '',
  specMan: '',
  specSi: '',
  delivery: '',
  paymentCondition: '',
  gstRate: ''
});

const defaultPoFormData = () => ({
  docType: 'purchase_order',
  workOrderNo: '',
  companyName: '',
  orderTitle: '',
  date: new Date().toISOString().split('T')[0],
  buyerName: '',
  buyerAddress: '',
  buyerDistState: '',
  vendorGst: '',
  buyerGst: '',
  consigneeName: '',
  consigneeAddress: '',
  consigneeGst: '',
  materialName: '',
  chemicalSpecs: [
    { name: '', value: '' }
  ],
  specSul: '',
  specPhos: '',
  specCar: '',
  specMan: '',
  specSi: '',
  commodity: '',
  mines: '',
  price: '',
  quantity: '',
  delivery: '',
  paymentCondition: '',
  gstRate: '',
  subject: 'Purchase Order',
  fcGuarantee: '',
  shortageTolerance: '',
  doDueDate: '',
  doCopy: '',
  destinationAdd: '',
  note: '',
  terms: '* All Disputes this deal is subject to Raipur jurisdiction only.\nSir, we hope you find the same in order and hence request you to kindly accept the same and do the needful.',
  signatoryName: '',
  signatoryTitle: '',
  address: '',
  footerContact: '',
  signatureDataUrl: '',
  status: 'Draft'
});

const toDb = (f, visibleSpecs) => ({
  work_order_no: f.workOrderNo || null,
  order_title: f.orderTitle || 'WORK ORDER',
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
  fc_guarantee: f.fcGuarantee,
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
  docType: 'work_order',
  workOrderNo: row.work_order_no || '',
  orderTitle: row.order_title || 'WORK ORDER',
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
  fcGuarantee: row.fc_guarantee || '',
  shortageTolerance: row.shortage_tolerance || '',
  doDueDate: row.do_due_date || '',
  doCopy: row.do_copy || '',
  destinationAdd: row.destination_address || '',
  note: row.note || '',
  terms: row.terms || '',
  address: row.firm_address || COMPANY_DETAILS[row.company_name]?.address || '',
  footerContact: row.firm_footer_contact || COMPANY_DETAILS[row.company_name]?.footerContact || '',
  status: row.status || 'Draft',
  visibleSpecs: row.visible_specs && Object.keys(row.visible_specs).length > 0 ? row.visible_specs : defaultVisibleSpecs()
});

const poToDb = (f, visibleSpecs) => ({
  purchase_order_no: f.workOrderNo || null,
  order_date: f.date,
  company_name: f.companyName,
  order_title: f.orderTitle || 'PURCHASE ORDER',
  buyer_name: f.companyName,
  buyer_address: f.address,
  buyer_gst: f.buyerGst || COMPANY_DETAILS[f.companyName]?.gstin || '22AWGPA9068C1ZW',
  consignee_name: f.consigneeName || '',
  consignee_address: f.consigneeAddress || '',
  consignee_gst: f.consigneeGst || '',
  material_name: f.materialName || f.commodity || '',
  chemical_specs: Array.isArray(f.chemicalSpecs) ? f.chemicalSpecs : [],
  quantity: f.quantity || '',
  rate: f.price || '',
  delivery: f.delivery || 'For',
  payment_condition: f.paymentCondition || 'Advance',
  gst_clause: f.gstRate || '18% of GST or AS Applicable at time of dispatch',
  terms: f.terms || '',
  signatory_name: f.signatoryName || 'Jai Bhole Traders',
  signature_url: f.signatureDataUrl || null,
  firm_address: f.address,
  firm_footer_contact: f.footerContact,
  visible_specs: visibleSpecs,
  status: f.status || 'Draft'
});

const poFromDb = (row) => ({
  id: row.id,
  docType: 'purchase_order',
  workOrderNo: row.purchase_order_no || '',
  orderTitle: row.order_title || 'PURCHASE ORDER',
  date: row.order_date || new Date().toISOString().split('T')[0],
  companyName: row.company_name || 'M/s Jai Bhole Traders',
  signatoryName: row.signatory_name || 'Jai Bhole Traders',
  signatoryTitle: '',
  signatureDataUrl: row.signature_url || (COMPANY_DETAILS[row.company_name]?.signature || ''),
  buyerName: row.buyer_name || row.company_name || 'M/s Jai Bhole Traders',
  buyerDistState: '',
  buyerAddress: row.firm_address || row.buyer_address || '',
  subject: 'Purchase Order',
  commodity: row.material_name || '',
  mines: '',
  price: row.rate || '',
  quantity: row.quantity || '',
  fcGuarantee: '',
  shortageTolerance: '',
  doDueDate: '',
  doCopy: '',
  destinationAdd: '',
  note: '',
  terms: row.terms || '',
  address: row.firm_address || row.buyer_address || '',
  footerContact: row.firm_footer_contact || '',
  status: row.status || 'Draft',
  visibleSpecs: row.visible_specs && Object.keys(row.visible_specs).length > 0 ? row.visible_specs : defaultPoVisibleSpecs(),
  buyerGst: row.buyer_gst || '22AWGPA9068C1ZW',
  consigneeName: row.consignee_name || '',
  consigneeAddress: row.consignee_address || '',
  consigneeGst: row.consignee_gst || '',
  materialName: row.material_name || '',
  chemicalSpecs: Array.isArray(row.chemical_specs) ? row.chemical_specs : [],
  delivery: row.delivery || 'For',
  paymentCondition: row.payment_condition || 'Advance',
  gstRate: row.gst_clause || '18% of GST or AS Applicable at time of dispatch'
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
  const [purchaseOrders, setPurchaseOrders] = useState([]);
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
  const [showFieldsModal, setShowFieldsModal] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoadingList(true);
    try {
      // 1. Fetch work orders
      const { data: woData, error: woError } = await supabase
        .from('work_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (woError) throw woError;
      setOrders(woData || []);

      // 2. Fetch purchase orders from dedicated purchase_orders table
      try {
        const { data: poData, error: poError } = await supabase
          .from('purchase_orders')
          .select('*')
          .order('created_at', { ascending: false });
        if (!poError && poData) {
          setPurchaseOrders(poData.map(poFromDb));
        }
      } catch (poErr) {
        console.warn('purchase_orders table fetch skipped or not ready:', poErr);
      }
    } catch (err) {
      toast.error('Failed to load orders: ' + err.message);
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
    const isPO = activeTab === 'purchase_orders';
    if (isPO) {
      setFormData({ ...defaultPoFormData(), status: 'Draft' });
      setVisibleSpecs(defaultPoVisibleSpecs());
    } else {
      const autoNo = await generateNextWorkOrderNo();
      setFormData({ ...defaultFormData(), workOrderNo: autoNo, status: 'Draft' });
      setVisibleSpecs(defaultVisibleSpecs());
    }
    setShowOrderModal(true);
  };

  const openEditModal = (row) => {
    const isPO = row.docType === 'purchase_order' || row.purchase_order_no || row.order_title === 'PURCHASE ORDER';
    const fd = isPO && row.chemical_specs ? poFromDb(row) : (row.docType === 'purchase_order' ? row : fromDb(row));
    setEditingId(row.id);
    setFormData(fd);
    setVisibleSpecs(fd.visibleSpecs || (fd.docType === 'purchase_order' ? defaultPoVisibleSpecs() : defaultVisibleSpecs()));
    setShowOrderModal(true);
  };

  const handleSave = async () => {
    const isPO = formData.docType === 'purchase_order';
    if (!formData.companyName.trim()) { toast.error('Company Name is required'); return; }
    if (!isPO && !formData.buyerName.trim()) { toast.error('Receiver Name is required'); return; }
    setSaving(true);
    try {
      let finalWorkOrderNo = (formData.workOrderNo || '').trim();
      if (!editingId && !finalWorkOrderNo) {
        finalWorkOrderNo = await generateNextWorkOrderNo();
      }

      const formToSave = { ...formData, workOrderNo: finalWorkOrderNo };

      if (isPO) {
        // SAVE TO DEDICATED purchase_orders TABLE
        const poPayload = poToDb(formToSave, visibleSpecs);
        if (editingId) {
          const { error } = await supabase.from('purchase_orders').update(poPayload).eq('id', editingId);
          if (error) throw error;
          toast.success('Purchase Order updated!');
        } else {
          const { error } = await supabase.from('purchase_orders').insert([poPayload]);
          if (error) throw error;
          toast.success(`Purchase Order ${finalWorkOrderNo} saved!`);
        }
      } else {
        // SAVE TO work_orders TABLE
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
    const isPO = order.docType === 'purchase_order' || order.purchase_order_no;
    const targetTable = isPO ? 'purchase_orders' : 'work_orders';
    try {
      const { error } = await supabase
        .from(targetTable)
        .update({ status: 'Done' })
        .eq('id', order.id);
      if (error) throw error;
      toast.success(`${isPO ? 'Purchase Order' : 'Work Order'} marked as Done!`);
      fetchOrders();
    } catch (err) {
      toast.error('Failed to update status: ' + err.message);
    }
  };

  const handleReopen = async (order) => {
    const isPO = order.docType === 'purchase_order' || order.purchase_order_no;
    const targetTable = isPO ? 'purchase_orders' : 'work_orders';
    try {
      const { error } = await supabase
        .from(targetTable)
        .update({ status: 'Draft' })
        .eq('id', order.id);
      if (error) throw error;
      toast.success(`${isPO ? 'Purchase Order' : 'Work Order'} moved to Active!`);
      fetchOrders();
    } catch (err) {
      toast.error('Failed to update status: ' + err.message);
    }
  };

  const handleDelete = async (order) => {
    if (!window.confirm('Delete this record?')) return;
    const id = typeof order === 'object' ? order.id : order;
    const isPO = typeof order === 'object' ? (order.docType === 'purchase_order' || order.purchase_order_no) : (activeTab === 'purchase_orders');
    const targetTable = isPO ? 'purchase_orders' : 'work_orders';
    try {
      const { error } = await supabase.from(targetTable).delete().eq('id', id);
      if (error) throw error;
      toast.success('Deleted successfully');
      fetchOrders();
    } catch (err) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  const openPreview = (row) => {
    const isPO = row.docType === 'purchase_order' || row.purchase_order_no || row.order_title === 'PURCHASE ORDER';
    const fd = isPO && row.chemical_specs ? poFromDb(row) : (row.docType === 'purchase_order' ? row : fromDb(row));
    setPreviewData(fd);
    setPreviewSpecs(fd.visibleSpecs || (isPO ? defaultPoVisibleSpecs() : defaultVisibleSpecs()));
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
      toast.loading('Generating single page PDF...');

      // Ensure all images are fully loaded and rendered before capturing
      const imgElements = element.querySelectorAll('img');
      await Promise.all(Array.from(imgElements).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: element.scrollWidth || 800,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

      const margin = 5; // 5mm margin
      const maxW = pageWidth - (margin * 2); // 200mm
      const maxH = pageHeight - (margin * 2); // 287mm

      // Calculate aspect ratio
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / imgHeight;

      let finalW = maxW;
      let finalH = finalW / ratio;

      // Strictly fit to single page height if it exceeds
      if (finalH > maxH) {
        finalH = maxH;
        finalW = finalH * ratio;
      }

      // Center horizontally and vertically on the single page
      const x = margin + ((maxW - finalW) / 2);
      const y = margin + ((maxH - finalH) / 2);

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', x, y, finalW, finalH);

      toast.dismiss();
      pdf.save(`Work_Order_${(previewData?.workOrderNo || previewData?.buyerName || 'Order').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
      toast.success('PDF downloaded successfully (1 page)!');
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error('Failed to generate PDF: ' + err.message);
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
    const defaultPoTitles = ['PURCHASE ORDER', 'SALE ORDER'];
    const dbTitles = cleanList(orders.map(o => o.order_title));
    const poTitles = cleanList(purchaseOrders.map(p => p.orderTitle || p.order_title));
    return {
      orderTitles: dbTitles.length > 0 ? dbTitles : ['WORK ORDER', 'DELIVERY ORDER', 'DISPATCH ORDER'],
      poOrderTitles: Array.from(new Set([...defaultPoTitles, ...poTitles])),
      buyers: cleanList([...orders.map(o => o.buyer_name), ...purchaseOrders.map(p => p.buyerName || p.buyer_name)]),
      distStates: cleanList(orders.map(o => o.buyer_dist_state)),
      addresses: cleanList([...orders.map(o => o.buyer_address), ...purchaseOrders.map(p => p.buyerAddress || p.buyer_address)]),
      quantities: cleanList([...orders.map(o => o.quantity), ...purchaseOrders.map(p => p.quantity)]),
      minesList: cleanList(orders.map(o => o.mines)),
      commodities: cleanList([...orders.map(o => o.commodity), ...purchaseOrders.map(p => p.materialName || p.material_name)]),
      fcGuarantees: cleanList(orders.map(o => o.fc_guarantee)),
      shortageTolerances: cleanList(orders.map(o => o.shortage_tolerance)),
      doCopies: cleanList(orders.map(o => o.do_copy)),
      prices: cleanList([...orders.map(o => o.price), ...purchaseOrders.map(p => p.price || p.rate)]),
      orderNos: cleanList(orders.map(o => o.work_order_no)),
      poOrderNos: cleanList(purchaseOrders.map(p => p.workOrderNo || p.purchase_order_no)),
      // Purchase Orders specific suggestions:
      consigneeNames: cleanList(purchaseOrders.map(p => p.consigneeName || p.consignee_name)),
      consigneeAddresses: cleanList(purchaseOrders.map(p => p.consigneeAddress || p.consignee_address)),
      consigneeGsts: cleanList(purchaseOrders.map(p => p.consigneeGst || p.consignee_gst)),
      buyerGsts: cleanList(purchaseOrders.map(p => p.buyerGst || p.buyer_gst)),
      materials: cleanList(purchaseOrders.map(p => p.materialName || p.material_name)),
      deliveries: cleanList([...purchaseOrders.map(p => p.delivery)].filter(Boolean)),
      paymentConditions: cleanList([...purchaseOrders.map(p => p.paymentCondition || p.payment_condition)].filter(Boolean)),
      gstClauses: cleanList([...purchaseOrders.map(p => p.gstRate || p.gst_clause)].filter(Boolean))
    };
  }, [orders, purchaseOrders]);

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
    const isPOView = activeTab === 'purchase_orders';
    const isHistoryView = activeTab === 'history';

    const legacyPo = orders.filter(o => {
      const extra = o.visible_specs?._extra;
      return extra?.docType === 'purchase_order' || o.order_title === 'PURCHASE ORDER';
    });
    const allPO = [...purchaseOrders, ...legacyPo];
    const woOrders = orders.filter(o => {
      const extra = o.visible_specs?._extra;
      return extra?.docType !== 'purchase_order' && o.order_title !== 'PURCHASE ORDER';
    });

    const isSoOrder = (item) => {
      const title = (item.orderTitle || item.order_title || '').toUpperCase();
      return title.includes('SALE') || title.includes('SO');
    };

    const donePoList = allPO.filter(p => p.status === 'Done');
    const soDone = donePoList.filter(p => isSoOrder(p)).length;
    const poDone = donePoList.filter(p => !isSoOrder(p)).length;
    const woDone = woOrders.filter(o => o.status === 'Done').length;
    const allDone = woDone + donePoList.length;

    const activePoList = allPO.filter(p => p.status !== 'Done');
    const poActive = activePoList.length;
    const woActive = woOrders.filter(o => o.status !== 'Done').length;

    if (isHistoryView) {
      // DYNAMIC STATS FOR COMPLETED HISTORY TAB:
      // Total Completed, Completed Work Orders, Completed PO, Completed SO (Order Title matching)
      return {
        total: allDone,
        card1Title: 'TOTAL COMPLETED',
        card1Count: allDone,
        card2Title: 'COMPLETED WO',
        card2Count: woDone,
        card3Title: 'COMPLETED PO',
        card3Count: poDone,
        card4Title: 'COMPLETED SO',
        card4Count: soDone,
        poCount: poActive,
        activeCount: woActive,
        doneCount: allDone
      };
    }

    if (isPOView) {
      // DYNAMIC STATS FOR PO + SO TAB BASED ON purchase_orders TABLE
      const total = allPO.length;
      const soCount = allPO.filter(p => isSoOrder(p)).length;
      const purePoCount = total - soCount;
      const poDraft = allPO.filter(p => !p.status || p.status === 'Draft').length;
      return {
        total,
        card1Title: 'TOTAL PO / SO',
        card1Count: total,
        card2Title: 'ACTIVE PO',
        card2Count: activePoList.filter(p => !isSoOrder(p)).length,
        card3Title: 'ACTIVE SO',
        card3Count: activePoList.filter(p => isSoOrder(p)).length,
        card4Title: 'COMPLETED',
        card4Count: donePoList.length,
        poCount: poActive,
        activeCount: woActive,
        doneCount: allDone
      };
    }

    // DEFAULT STATS FOR WORK ORDERS TAB
    const woTotal = woOrders.length;
    const woDraft = woOrders.filter(o => !o.status || o.status === 'Draft').length;

    return {
      total: woTotal,
      card1Title: 'TOTAL WORK ORDERS',
      card1Count: woTotal,
      card2Title: 'ACTIVE ORDERS',
      card2Count: woActive,
      card3Title: 'COMPLETED HISTORY',
      card3Count: allDone,
      card4Title: 'DRAFT STATUS',
      card4Count: woDraft,
      poCount: poActive,
      activeCount: woActive,
      doneCount: allDone
    };
  }, [orders, purchaseOrders, activeTab]);

  const filteredOrders = useMemo(() => {
    if (activeTab === 'purchase_orders') {
      const legacyPo = orders.filter(o => {
        const extra = o.visible_specs?._extra;
        return extra?.docType === 'purchase_order' || o.order_title === 'PURCHASE ORDER';
      });
      const allPO = [...purchaseOrders, ...legacyPo];
      // Only show Active (not Done) in Purchase Orders tab
      return allPO.filter(o => {
        if (o.status === 'Done') return false;
        const matchSearch = !searchTerm ||
          (o.buyerName || o.buyer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.companyName || o.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.workOrderNo || o.work_order_no || o.purchase_order_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.materialName || o.commodity || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchCompany = filterCompany === 'All' || (o.companyName || o.company_name) === filterCompany;
        const matchBuyer = filterBuyer === 'All' || (o.buyerName || o.buyer_name) === filterBuyer;
        const matchCommodity = filterCommodity === 'All' || (o.materialName || o.commodity) === filterCommodity;
        const matchQty = filterQty === 'All' || (o.quantity) === filterQty;
        return matchSearch && matchCompany && matchBuyer && matchCommodity && matchQty;
      });
    }

    if (activeTab === 'history') {
      // Completed history tab includes both Done Work Orders AND Done Purchase Orders
      const legacyPo = orders.filter(o => {
        const extra = o.visible_specs?._extra;
        return extra?.docType === 'purchase_order' || o.order_title === 'PURCHASE ORDER';
      });
      const allDone = [
        ...orders.filter(o => {
          const extra = o.visible_specs?._extra;
          const isPO = extra?.docType === 'purchase_order' || o.order_title === 'PURCHASE ORDER';
          return !isPO && o.status === 'Done';
        }),
        ...purchaseOrders.filter(p => p.status === 'Done'),
        ...legacyPo.filter(p => p.status === 'Done')
      ];

      return allDone.filter(o => {
        const matchSearch = !searchTerm ||
          (o.buyer_name || o.buyerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.company_name || o.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.work_order_no || o.workOrderNo || o.purchase_order_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.commodity || o.materialName || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchCompany = filterCompany === 'All' || (o.company_name || o.companyName) === filterCompany;
        const matchBuyer = filterBuyer === 'All' || (o.buyer_name || o.buyerName) === filterBuyer;
        const matchCommodity = filterCommodity === 'All' || (o.commodity || o.materialName) === filterCommodity;
        const matchQty = filterQty === 'All' || (o.quantity) === filterQty;
        return matchSearch && matchCompany && matchBuyer && matchCommodity && matchQty;
      });
    }

    // Active Orders tab (Work Orders only that are not Done)
    return orders.filter(o => {
      const extra = o.visible_specs?._extra;
      const isPO = extra?.docType === 'purchase_order' || o.order_title === 'PURCHASE ORDER';
      const isDone = o.status === 'Done';

      if (isPO) return false;
      if (isDone) return false;

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
  }, [orders, purchaseOrders, activeTab, searchTerm, filterCompany, filterBuyer, filterCommodity, filterQty]);

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
            {activeTab === 'purchase_orders' ? 'PO + SO ORDER' : 'Work Orders'}
          </h1>
          <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '4px 0 0 0' }}>
            {activeTab === 'purchase_orders'
              ? 'Create, manage and dispatch vendor purchase & sale orders (Billet, Metal, Coal) with official PDF printing'
              : 'Create, manage and dispatch official transportation work orders with PDF printing'}
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
          <Plus size={16} strokeWidth={2.5} /> {activeTab === 'purchase_orders' ? 'New PO + SO Order' : 'New Work Order'}
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        {/* Card 1 */}
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
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stats.card1Title}</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: '1.2' }}>{stats.card1Count}</div>
          </div>
        </div>

        {/* Card 2 */}
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
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stats.card2Title}</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: '1.2' }}>{stats.card2Count}</div>
          </div>
        </div>

        {/* Card 3 */}
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
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stats.card3Title}</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: '1.2' }}>{stats.card3Count}</div>
          </div>
        </div>

        {/* Card 4 */}
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
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stats.card4Title}</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: '1.2' }}>{stats.card4Count}</div>
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
        {/* Tab 1: Work Orders */}
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
          Work Orders
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

        {/* Tab 2: PO + SO */}
        <button
          onClick={() => setActiveTab('purchase_orders')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'purchase_orders' ? '#ffffff' : 'transparent',
            color: activeTab === 'purchase_orders' ? '#0f172a' : '#64748b',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.84rem',
            boxShadow: activeTab === 'purchase_orders' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
            transition: 'all 0.15s'
          }}>
          <FileText size={15} style={{ color: activeTab === 'purchase_orders' ? '#2563eb' : '#64748b' }} />
          PO + SO
          <span style={{
            fontSize: '0.72rem',
            padding: '1px 6px',
            borderRadius: '10px',
            backgroundColor: activeTab === 'purchase_orders' ? '#dbeafe' : '#cbd5e1',
            color: activeTab === 'purchase_orders' ? '#2563eb' : '#475569'
          }}>
            {stats.poCount}
          </span>
        </button>

        {/* Tab 3: Completed History */}
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
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', minWidth: '220px', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {activeTab === 'purchase_orders' ? 'VENDOR / PARTY' : 'BUYER / RECEIVER'}
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', minWidth: '120px', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {activeTab === 'purchase_orders' ? 'MATERIAL' : 'COMMODITY'}
                  </th>
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
                        {o.workOrderNo || o.work_order_no || o.purchase_order_no || '—'}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', color: '#475569', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9', fontSize: '0.83rem' }}>
                      {(o.date || o.order_date) ? new Date(o.date || o.order_date).toLocaleDateString('en-IN') : '—'}
                    </td>

                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>
                      {o.companyName || o.company_name}
                    </td>

                    <td style={{ padding: '14px 16px', color: '#0f172a', fontWeight: 500, whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>
                      {activeTab === 'purchase_orders' ? (o.consigneeName || o.buyer_name || o.buyerName) : (o.buyer_name || o.buyerName)}
                    </td>

                    <td style={{ padding: '14px 16px', color: '#475569', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>
                      {o.materialName || o.visible_specs?._extra?.materialName || o.commodity || '—'}
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
                  {editingId 
                    ? (formData.docType === 'purchase_order' ? 'Edit PO + SO Order' : 'Edit Work Order')
                    : (formData.docType === 'purchase_order' ? 'New PO + SO Order' : 'New Work Order')}
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
              {formData.docType === 'purchase_order' ? (
                /* ================= PURCHASE ORDER FORM ================= */
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>Order Date</label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>Issuing Company (Heading)</label>
                    <select
                      name="companyName"
                      value={formData.companyName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const comp = COMPANY_DETAILS[val];
                        setFormData(prev => ({
                          ...prev,
                          companyName: val,
                          buyerGst: comp?.gstin || prev.buyerGst,
                          address: comp?.address || prev.address,
                          footerContact: comp?.footerContact || prev.footerContact,
                          signatureDataUrl: comp?.signature || prev.signatureDataUrl || '',
                          signatoryName: comp ? comp.name : prev.signatoryName
                        }));
                      }}
                      style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', outline: 'none', backgroundColor: '#fff', cursor: 'pointer', boxSizing: 'border-box' }}
                    >
                      <option value="">-- Select Issuing Company --</option>
                      {Object.keys(COMPANY_DETAILS).map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </div>

                  <DbDropdownInput
                    label="Order Title"
                    name="orderTitle"
                    value={formData.orderTitle}
                    onChange={handleChange}
                    options={dbSuggestions.poOrderTitles || []}
                    placeholder="e.g. PURCHASE ORDER"
                  />

                  <DbDropdownInput
                    label="Order No."
                    name="workOrderNo"
                    value={formData.workOrderNo}
                    onChange={handleChange}
                    options={dbSuggestions.poOrderNos || []}
                    placeholder="e.g. 1367 or PO-2026-001"
                  />

                  {/* Buyer & Consignee */}
                  <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '6px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      {/* Buyer Details */}
                      <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Buyer (Self Firm)</h4>
                        <div style={{ marginBottom: '8px' }}>
                          <DbDropdownInput
                            label="Buyer Name & Address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            options={dbSuggestions.addresses}
                            placeholder="Buyer Address..."
                            isTextarea={true}
                            rows={3}
                          />
                        </div>
                        <div>
                          <DbDropdownInput
                            label="Buyer GST No."
                            name="buyerGst"
                            value={formData.buyerGst}
                            onChange={handleChange}
                            options={dbSuggestions.buyerGsts}
                            placeholder="e.g. 22AWGPA9068C1ZW"
                          />
                        </div>
                      </div>

                      {/* Consignee Details */}
                      <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Consignee</h4>
                        <div style={{ marginBottom: '8px' }}>
                          <DbDropdownInput
                            label="Consignee Name"
                            name="consigneeName"
                            value={formData.consigneeName}
                            onChange={handleChange}
                            options={dbSuggestions.consigneeNames}
                            placeholder="e.g. Hindustan Structural Pipes Limited"
                          />
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <DbDropdownInput
                            label="Consignee Address"
                            name="consigneeAddress"
                            value={formData.consigneeAddress}
                            onChange={handleChange}
                            options={dbSuggestions.consigneeAddresses}
                            placeholder="Plot No, Industrial Area, City..."
                            isTextarea={true}
                            rows={2}
                          />
                        </div>
                        <div>
                          <DbDropdownInput
                            label="Consignee GST No."
                            name="consigneeGst"
                            value={formData.consigneeGst}
                            onChange={handleChange}
                            options={dbSuggestions.consigneeGsts}
                            placeholder="e.g. 22AAHCH4703M1ZN"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Material & Chemical Specifications */}
                  <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Material & Chemical Specifications
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowFieldsModal(true)}
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
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <DbDropdownInput
                        label="Material Description"
                        name="materialName"
                        value={formData.materialName}
                        onChange={handleChange}
                        options={dbSuggestions.materials}
                        placeholder="e.g. Ms Billet 160*160 (6 Mtr)"
                      />
                    </div>

                    {/* Chemical Specs Dynamic Rows */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div>
                          <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                            Chemical Composition Limits
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            Add, edit or remove element limits (e.g. Sul., Phos., Car., etc.)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              chemicalSpecs: [...(prev.chemicalSpecs || []), { name: '', value: '' }]
                            }));
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '5px 12px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            borderRadius: '6px',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fecaca'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                        >
                          <Plus size={14} /> Add Row
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(formData.chemicalSpecs || []).map((spec, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '38%' }}>
                              <input
                                type="text"
                                value={spec.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setFormData(prev => {
                                    const next = [...(prev.chemicalSpecs || [])];
                                    next[idx] = { ...next[idx], name: val };
                                    return { ...prev, chemicalSpecs: next };
                                  });
                                }}
                                placeholder="Element (e.g. Sul. / Carbon)"
                                style={{
                                  width: '100%',
                                  padding: '7px 10px',
                                  fontSize: '0.8rem',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  fontWeight: 600,
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <input
                                type="text"
                                value={spec.value}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setFormData(prev => {
                                    const next = [...(prev.chemicalSpecs || [])];
                                    next[idx] = { ...next[idx], value: val };
                                    return { ...prev, chemicalSpecs: next };
                                  });
                                }}
                                placeholder="Value (e.g. 0.045 Max)"
                                style={{
                                  width: '100%',
                                  padding: '7px 10px',
                                  fontSize: '0.8rem',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  chemicalSpecs: (prev.chemicalSpecs || []).filter((_, i) => i !== idx)
                                }));
                              }}
                              title="Delete Row"
                              style={{
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                backgroundColor: '#fff',
                                color: '#ef4444',
                                cursor: 'pointer',
                                flexShrink: 0
                              }}
                              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}

                        {(!formData.chemicalSpecs || formData.chemicalSpecs.length === 0) && (
                          <div style={{ textAlign: 'center', padding: '12px', color: '#94a3b8', fontSize: '0.78rem' }}>
                            No chemical specifications added. Click "+ Add Row" above to add one.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Commercial Terms Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <DbDropdownInput
                        label="Quantity"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleChange}
                        options={dbSuggestions.quantities}
                        placeholder="e.g. 300 MTS"
                      />
                      <DbDropdownInput
                        label="Rate"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        options={dbSuggestions.prices}
                        placeholder="e.g. 41000 PMT"
                      />
                      <DbDropdownInput
                        label="Delivery"
                        name="delivery"
                        value={formData.delivery}
                        onChange={handleChange}
                        options={dbSuggestions.deliveries}
                        placeholder="e.g. For"
                      />
                      <DbDropdownInput
                        label="Payment Condition"
                        name="paymentCondition"
                        value={formData.paymentCondition}
                        onChange={handleChange}
                        options={dbSuggestions.paymentConditions}
                        placeholder="e.g. Advance"
                      />
                      <div style={{ gridColumn: '1 / -1' }}>
                        <DbDropdownInput
                          label="GST Clause"
                          name="gstRate"
                          value={formData.gstRate}
                          onChange={handleChange}
                          options={dbSuggestions.gstClauses}
                          placeholder="e.g. 18% of GST or AS Applicable at time of dispatch"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Signatory & Signature Block */}
                  <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '4px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div className="form-group">
                        <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>Signatory Name / Firm</label>
                        <input
                          type="text"
                          name="signatoryName"
                          value={formData.signatoryName}
                          onChange={handleChange}
                          placeholder="e.g. Jai Bhole Traders"
                          style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Signature / Stamp (Click or Ctrl+V)
                        </label>
                        <div
                          onPaste={handleSignaturePaste}
                          tabIndex="0"
                          style={{
                            width: '100%',
                            border: '2px dashed #cbd5e1',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            textAlign: 'center',
                            color: '#64748b',
                            cursor: 'pointer',
                            position: 'relative',
                            outline: 'none',
                            backgroundColor: '#f8fafc',
                            minHeight: '42px',
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 10 }}>
                              <img 
                                src={formData.signatureDataUrl} 
                                alt="Signature" 
                                style={{ height: '32px', objectFit: 'contain' }} 
                                onError={(e) => {
                                  const compSig = COMPANY_DETAILS[formData.companyName]?.signature;
                                  if (compSig && e.target.src !== compSig) {
                                    e.target.src = compSig;
                                  }
                                }}
                              />
                              <span
                                style={{ fontSize: '0.72rem', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormData(prev => ({ ...prev, signatureDataUrl: '' })); }}>
                                Remove
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              Click to upload or Ctrl+V
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Conditions & Jurisdiction */}
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>Jurisdiction & Closing Terms</label>
                    <textarea
                      name="terms"
                      value={formData.terms}
                      onChange={handleChange}
                      rows="2"
                      style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                    />
                  </div>
                </div>
              ) : (
                /* ================= WORK ORDER FORM ================= */
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

                <DbDropdownInput
                  label="Document Heading / Title"
                  name="orderTitle"
                  value={formData.orderTitle}
                  onChange={handleChange}
                  options={dbSuggestions.orderTitles}
                  placeholder="e.g. WORK ORDER or DELIVERY ORDER"
                />

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

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>Signatory Title / Phone</label>
                  <input
                    type="text"
                    name="signatoryTitle"
                    value={formData.signatoryTitle}
                    onChange={handleChange}
                    placeholder="e.g. 9165422000"
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Signature Image (Click or Press Ctrl+V)
                  </label>
                  <div
                    onPaste={handleSignaturePaste}
                    tabIndex="0"
                    style={{
                      width: '100%',
                      border: '2px dashed #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      textAlign: 'center',
                      color: '#64748b',
                      cursor: 'pointer',
                      position: 'relative',
                      outline: 'none',
                      backgroundColor: '#f8fafc',
                      minHeight: '42px',
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 10 }}>
                        <img 
                          src={formData.signatureDataUrl} 
                          alt="Signature" 
                          style={{ height: '32px', objectFit: 'contain' }} 
                          onError={(e) => {
                            const compSig = COMPANY_DETAILS[formData.companyName]?.signature;
                            if (compSig && e.target.src !== compSig) {
                              e.target.src = compSig;
                            }
                          }}
                        />
                        <span
                          style={{ fontSize: '0.72rem', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormData(prev => ({ ...prev, signatureDataUrl: '' })); }}>
                          Remove
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Click to upload or Ctrl+V
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
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowFieldsModal(true)}
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
                    {visibleSpecs.fcGuarantee && (
                      <DbDropdownInput
                        label="FC Guarantee"
                        name="fcGuarantee"
                        value={formData.fcGuarantee}
                        onChange={handleChange}
                        options={dbSuggestions.fcGuarantees}
                        placeholder="e.g. 45% or Nil"
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
              )}
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

      {/* SEPARATE MODAL FOR TOGGLE FIELDS / VISIBLE SPECIFICATIONS */}
      {showFieldsModal && (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 1500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowFieldsModal(false); }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '560px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: '1px solid #f1f5f9',
                backgroundColor: '#ffffff'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  Visible Specifications
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Select fields to show in the work order
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFieldsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 20px',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                fontSize: '0.8rem'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  const currentKeys = formData.docType === 'purchase_order' ? poSpecKeys : specKeys;
                  setVisibleSpecs(currentKeys.reduce((acc, s) => ({ ...acc, [s.key]: true }), {}));
                }}
                style={{
                  color: '#dc2626',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0
                }}
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentKeys = formData.docType === 'purchase_order' ? poSpecKeys : specKeys;
                  setVisibleSpecs(currentKeys.reduce((acc, s) => ({ ...acc, [s.key]: false }), {}));
                }}
                style={{
                  color: '#64748b',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0
                }}
              >
                Deselect All
              </button>
            </div>

            {/* Checkbox List - 2 Column Grid */}
            <div
              style={{
                padding: '14px 18px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                maxHeight: '360px',
                overflowY: 'auto'
              }}
            >
              {(formData.docType === 'purchase_order' ? poSpecKeys : specKeys).map(spec => {
                const isChecked = !!visibleSpecs[spec.key];
                return (
                  <div
                    key={spec.key}
                    onClick={() => toggleSpec(spec.key)}
                    style={{
                      padding: '9px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      backgroundColor: isChecked ? '#fef2f2' : 'transparent',
                      border: `1px solid ${isChecked ? '#fecaca' : '#f1f5f9'}`,
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isChecked) e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      style={{
                        accentColor: '#dc2626',
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer',
                        margin: 0,
                        flexShrink: 0,
                        pointerEvents: 'none'
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.83rem',
                        color: isChecked ? '#0f172a' : '#475569',
                        fontWeight: isChecked ? 600 : 400,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {spec.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                display: 'flex',
                justifyContent: 'flex-end'
              }}
            >
              <button
                type="button"
                onClick={() => setShowFieldsModal(false)}
                style={{
                  padding: '7px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)'
                }}
              >
                Done
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
                    padding: '16px 38px 12px 38px',
                    width: '800px',
                    minHeight: '1131px',
                    height: 'auto',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: '"Times New Roman", Times, serif',
                    boxSizing: 'border-box',
                    fontSize: '14px',
                    lineHeight: '1.34',
                    borderRadius: '4px',
                    marginBottom: '20px'
                  }}
                >
                  {previewData.docType === 'purchase_order' ? (
                    /* ================= PURCHASE ORDER LETTER DESIGN ================= */
                    <>
                      {/* Header Top: GSTIN Right */}
                      <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '4px', fontSize: '0.92rem' }}>
                        GSTIN: {previewData.buyerGst || activeFirm.gstin}
                      </div>

                      {/* Header Row: Big Bold Logo + Company Title */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '6px',
                        width: '100%'
                      }}>
                        {activeFirm.logo && (
                          <div style={{
                            width: '95px',
                            height: '85px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginRight: '14px'
                          }}>
                            <img
                              src={activeFirm.logo}
                              alt={activeFirm.name}
                              style={{
                                height: '82px',
                                width: '90px',
                                objectFit: 'contain',
                                display: 'block'
                              }}
                            />
                          </div>
                        )}
                        <h1 style={{
                          fontSize: '3rem',
                          fontWeight: 'bold',
                          color: '#1e293b',
                          fontFamily: '"Baloo 2", "Arial Black", "Segoe UI", sans-serif',
                          letterSpacing: '-0.02em',
                          lineHeight: 1,
                          margin: 0,
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          whiteSpace: 'nowrap'
                        }}>
                          {previewData.companyName || 'M/s Jai Bhole Traders'}
                        </h1>
                      </div>

                      {/* Document Title: PURCHASE ORDER */}
                      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                        <span style={{
                          fontSize: '1.35rem',
                          fontWeight: 'bold',
                          borderBottom: '1.5px solid #000000',
                          paddingBottom: '7px',
                          lineHeight: '1.5',
                          display: 'inline-block',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}>
                          {previewData.orderTitle || 'PURCHASE ORDER'}
                        </span>
                      </div>

                      {/* Order No and Date Row */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginBottom: '10px', fontSize: '14.5px' }}>
                        <tbody>
                          <tr style={{ verticalAlign: 'middle', border: 'none' }}>
                            <td style={{ textAlign: 'left', fontWeight: 'bold', padding: 0, border: 'none' }}>
                              Order No.: {previewData.workOrderNo || '1367'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', padding: 0, border: 'none' }}>
                              Date – {previewData.date ? previewData.date.split('-').reverse().join('-') : '29-03-2026'}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* To / From Vendor Section */}
                      <div style={{ marginBottom: '8px', lineHeight: '1.34', fontSize: '14px' }}>
                        <p style={{ margin: '0 0 2px 0' }}>
                          {(previewData.orderTitle || '').toUpperCase().includes('SALE ORDER') || (previewData.orderTitle || '').toUpperCase().includes('SALES ORDER') ? 'FROM,' : 'To,'}
                        </p>
                        <p style={{ margin: '0 0 1px 0', fontWeight: 'bold' }}>{previewData.buyerName || 'PH ENTERPRISE'}</p>
                        <p style={{ margin: '0 0 1px 0', whiteSpace: 'pre-wrap' }}>{previewData.buyerAddress}</p>
                        {previewData.vendorGst && (
                          <p style={{ margin: 0, fontWeight: 'bold' }}>GST NO. {previewData.vendorGst}</p>
                        )}
                      </div>

                      <p style={{ marginBottom: '4px', fontSize: '14px' }}>Dear Sir,</p>
                      <p style={{ marginBottom: '10px', fontSize: '14px' }}>
                        Enclosed herewith details for order as given above please receive the same and do needful.
                      </p>

                      {/* Specifications Table */}
                      <table style={{ width: '96%', margin: '0 auto 10px auto', borderCollapse: 'collapse', lineHeight: '1.36', border: 'none', fontSize: '14px' }}>
                        <tbody>
                          {/* Buyer */}
                          {previewSpecs?.buyer !== false && (
                            <tr>
                              <td style={{ width: '32%', padding: '3px 0', verticalAlign: 'top', border: 'none', fontWeight: 600 }}>Buyer</td>
                              <td style={{ width: '6%', verticalAlign: 'top', border: 'none' }}>:</td>
                              <td style={{ padding: '3px 0', verticalAlign: 'top', border: 'none' }}>
                                <div style={{ fontWeight: 600 }}>{previewData.companyName || 'Jai Bhole Traders'}</div>
                                <div style={{ whiteSpace: 'pre-wrap' }}>{previewData.address}</div>
                                <div style={{ fontWeight: 'bold' }}>GST No- <span style={{ fontWeight: 'bold' }}>{previewData.buyerGst || activeFirm.gstin}</span></div>
                              </td>
                            </tr>
                          )}

                          {/* Consignee */}
                          {previewSpecs?.consignee !== false && (
                            <tr>
                              <td style={{ padding: '4px 0', verticalAlign: 'top', border: 'none', fontWeight: 600 }}>Consignee</td>
                              <td style={{ verticalAlign: 'top', border: 'none' }}>:</td>
                              <td style={{ padding: '4px 0', verticalAlign: 'top', border: 'none' }}>
                                <div style={{ fontWeight: 600 }}>{previewData.consigneeName || 'Hindustan Structural Pipes Limited'}</div>
                                <div style={{ whiteSpace: 'pre-wrap' }}>{previewData.consigneeAddress || 'Plot No - 98 Industrial Area Silutra Phase -2, Raipur, Chhattisgarh (493111)'}</div>
                                {previewData.consigneeGst && (
                                  <div style={{ fontWeight: 'bold' }}>GST No - <span>{previewData.consigneeGst}</span></div>
                                )}
                              </td>
                            </tr>
                          )}

                          {/* Material & Chemical Specs */}
                          {previewSpecs?.material !== false && (
                            <tr>
                              <td style={{ padding: '4px 0', verticalAlign: 'top', border: 'none', fontWeight: 600 }}>Material</td>
                              <td style={{ verticalAlign: 'top', border: 'none' }}>:</td>
                              <td style={{ padding: '4px 0', verticalAlign: 'top', border: 'none' }}>
                                <div style={{ fontWeight: 600 }}>{previewData.materialName || previewData.commodity || ''}</div>
                                {Array.isArray(previewData.chemicalSpecs) && previewData.chemicalSpecs.filter(s => s && (s.name || s.value)).length > 0 ? (
                                  <table style={{ borderCollapse: 'collapse', border: 'none', marginTop: '2px', fontSize: '13.5px' }}>
                                    <tbody>
                                      {previewData.chemicalSpecs.filter(s => s && (s.name || s.value)).map((spec, i) => (
                                        <tr key={i}>
                                          <td style={{ width: '60px', padding: 0, fontWeight: 'bold', border: 'none' }}>{spec.name}</td>
                                          <td style={{ padding: 0, border: 'none' }}>: {spec.value}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : null}
                              </td>
                            </tr>
                          )}

                          {/* Quantity */}
                          {previewSpecs?.quantity !== false && previewData.quantity && (
                            <tr>
                              <td style={{ padding: '3px 0', border: 'none', fontWeight: 600 }}>Quantity</td>
                              <td style={{ border: 'none' }}>:</td>
                              <td style={{ padding: '3px 0', border: 'none', fontWeight: 600 }}>{previewData.quantity}</td>
                            </tr>
                          )}

                          {/* Rate */}
                          {previewSpecs?.rate !== false && previewData.price && (
                            <tr>
                              <td style={{ padding: '3px 0', border: 'none', fontWeight: 600 }}>Rate</td>
                              <td style={{ border: 'none' }}>:</td>
                              <td style={{ padding: '3px 0', border: 'none' }}>{previewData.price}</td>
                            </tr>
                          )}

                          {/* Delivery */}
                          {previewSpecs?.delivery !== false && previewData.delivery && (
                            <tr>
                              <td style={{ padding: '3px 0', border: 'none', fontWeight: 600 }}>Delivery</td>
                              <td style={{ border: 'none' }}>:</td>
                              <td style={{ padding: '3px 0', border: 'none' }}>{previewData.delivery}</td>
                            </tr>
                          )}

                          {/* Payment Condition */}
                          {previewSpecs?.paymentCondition !== false && previewData.paymentCondition && (
                            <tr>
                              <td style={{ padding: '3px 0', border: 'none', fontWeight: 600 }}>Payment Condition</td>
                              <td style={{ border: 'none' }}>:</td>
                              <td style={{ padding: '3px 0', border: 'none' }}>{previewData.paymentCondition}</td>
                            </tr>
                          )}

                          {/* Gst */}
                          {previewSpecs?.gst !== false && previewData.gstRate && (
                            <tr>
                              <td style={{ padding: '3px 0', border: 'none', fontWeight: 600 }}>Gst</td>
                              <td style={{ border: 'none' }}>:</td>
                              <td style={{ padding: '3px 0', border: 'none' }}>{previewData.gstRate}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      {/* Terms / Jurisdiction */}
                      <div style={{ marginTop: '4px', fontSize: '13.5px', lineHeight: '1.34' }}>
                        <p style={{ margin: '0 0 4px 0' }}>* All Disputes this deal is subject to Raipur jurisdiction only.</p>
                        <p style={{ margin: '0 0 10px 0' }}>
                          Sir, we hope you find the same in order and hence request you to kindly accept the same and do the needful.
                        </p>
                      </div>

                      {/* Footer & Signature */}
                      <div style={{ marginTop: 'auto', lineHeight: '1.32', fontSize: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '4px' }}>
                          <div>
                            <p style={{ fontWeight: 'bold', margin: '0' }}>Thanking You</p>
                            <p style={{ margin: '0 0 2px 0' }}>Yours truly</p>
                            <p style={{ fontWeight: 'bold', margin: '0', whiteSpace: 'nowrap' }}>{previewData.companyName || 'Jai Bhole Traders'}</p>
                          </div>

                          <div style={{ minHeight: '80px', height: '80px', display: 'flex', alignItems: 'center' }}>
                            {(previewData.signatureDataUrl || activeFirm?.signature || jbtSignature) && (
                              <img 
                                src={previewData.signatureDataUrl || activeFirm?.signature || jbtSignature} 
                                alt="Signature" 
                                style={{ height: '80px', maxWidth: '200px', objectFit: 'contain' }}
                              />
                            )}
                          </div>
                        </div>

                        <div style={{ borderTop: '1.5px solid #1e3a8a', marginTop: '6px', paddingTop: '4px', textAlign: 'center', fontSize: '0.74rem', color: '#1d4ed8' }}>
                          <div style={{ lineHeight: '1.25', whiteSpace: 'normal' }}>
                            {previewData.address || 'N.K. Agrawal & Sons Tower, 2nd Floor, Lane No. 8, Near State Bank of India, New Shanti Nagar, Shankar Nagar, Raipur 492 004 (C.G.)'}
                          </div>
                          <div style={{ lineHeight: '1.25', marginTop: '2px', whiteSpace: 'normal' }}>
                            {previewData.footerContact || 'Mo.: 78736 50000, 91091 61144, E-mail : bisiwanath23@gmail.com, jaibholetraderacc@gmail.com'}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* ================= WORK ORDER LETTER DESIGN ================= */
                    <>
                      <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '6px', fontSize: '0.9rem' }}>
                        GSTIN : {activeFirm.gstin}
                      </div>

                      {/* Header Row: Logo at Left, followed immediately by Big Bold Company Title */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: '10px',
                        width: '100%'
                      }}>
                        {activeFirm.logo && (
                          <div style={{
                            width: '105px',
                            height: '92px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginRight: '16px'
                          }}>
                            <img
                              src={activeFirm.logo}
                              alt={activeFirm.name}
                              style={{
                                height: '90px',
                                width: '100px',
                                objectFit: 'contain',
                                display: 'block'
                              }}
                            />
                          </div>
                        )}
                        <h1 style={{
                          fontSize: activeFirm.name.length > 20 ? '2.8rem' : '3.3rem',
                          fontWeight: 'bold',
                          color: activeFirm.textColor,
                          fontFamily: '"Baloo 2", "Arial Black", "Segoe UI", sans-serif',
                          letterSpacing: '-0.02em',
                          lineHeight: 1,
                          margin: '-12px 0 0 0',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          whiteSpace: 'nowrap'
                        }}>
                          {activeFirm.name}
                        </h1>
                      </div>

                      {/* Title and Date Row */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginBottom: '10px' }}>
                        <tbody>
                          <tr style={{ verticalAlign: 'middle', border: 'none' }}>
                            <td style={{ width: '120px', padding: 0, border: 'none' }}></td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: 0, border: 'none' }}>
                              <span style={{
                                fontSize: '1.35rem',
                                fontWeight: 'bold',
                                borderBottom: '1.5px solid #000000',
                                paddingBottom: '5px',
                                display: 'inline-block',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em'
                              }}>
                                {previewData.orderTitle || 'WORK ORDER'}
                              </span>
                            </td>
                            <td style={{ width: '150px', textAlign: 'right', verticalAlign: 'middle', padding: 0, fontWeight: 'bold', fontSize: '0.92rem', color: '#000000', whiteSpace: 'nowrap', border: 'none' }}>
                              Date - {previewData.date ? previewData.date.split('-').reverse().join('-') : ''}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <div style={{ marginBottom: '6px', lineHeight: '1.32', fontSize: '14.5px' }}>
                        <p style={{ margin: '0 0 1px 0' }}>To,</p>
                        <p style={{ margin: '0 0 1px 0', fontWeight: 'bold' }}>{previewData.buyerName}</p>
                        <p style={{ margin: '0 0 1px 0', whiteSpace: 'pre-wrap' }}>{previewData.buyerAddress}</p>
                        {previewData.buyerDistState && <p style={{ margin: 0 }}>Dist :- {previewData.buyerDistState}</p>}
                      </div>

                      <p style={{ marginBottom: '6px' }}>
                        <span style={{
                          fontWeight: 'bold',
                          borderBottom: '1.2px solid #000000',
                          paddingBottom: '5px',
                          display: 'inline-block',
                          fontSize: '15px'
                        }}>
                          Subject: - {previewData.subject}
                        </span>
                      </p>
                      <p style={{ marginBottom: '4px', fontSize: '14.5px' }}>Dear Sir,</p>
                      <p style={{ marginBottom: '8px', fontSize: '14.5px' }}>With Reference to telephonic discussion, we are pleased to give you a work order for Transporting Work of coal.</p>

                      <table style={{ width: '92%', margin: '0 auto 8px auto', borderCollapse: 'collapse', lineHeight: '1.32', border: 'none', fontSize: '14.5px' }}>
                        <tbody>
                          {previewSpecs?.commodity && <tr><td style={{ width: '40%', padding: '2px 0', border: 'none' }}>Name of Commodity</td><td style={{ width: '10%', border: 'none' }}>:-</td><td style={{ border: 'none' }}><b>{previewData.commodity}</b></td></tr>}
                          {previewSpecs?.mines && <tr><td style={{ padding: '2px 0', border: 'none' }}>Mines</td><td style={{ border: 'none' }}>:-</td><td style={{ border: 'none' }}>{previewData.mines}</td></tr>}
                          {previewSpecs?.price && <tr><td style={{ verticalAlign: 'top', padding: '2px 0', border: 'none' }}>Price</td><td style={{ verticalAlign: 'top', border: 'none' }}>:-</td><td style={{ whiteSpace: 'pre-wrap', fontWeight: 'bold', border: 'none' }}>{previewData.price}</td></tr>}
                          {previewSpecs?.quantity && <tr><td style={{ padding: '2px 0', border: 'none' }}>Quantity</td><td style={{ border: 'none' }}>:-</td><td style={{ border: 'none' }}><b>{previewData.quantity}</b></td></tr>}
                          {previewSpecs?.fcGuarantee && <tr><td style={{ padding: '2px 0', border: 'none' }}>FC Guarantee</td><td style={{ border: 'none' }}>:-</td><td style={{ border: 'none' }}>{previewData.fcGuarantee}</td></tr>}
                          {previewSpecs?.shortageTolerance && <tr><td style={{ padding: '2px 0', border: 'none' }}>Shortage Tolerance</td><td style={{ border: 'none' }}>:-</td><td style={{ border: 'none' }}>{previewData.shortageTolerance}</td></tr>}
                          {previewSpecs?.doDueDate && <tr><td style={{ padding: '2px 0', border: 'none' }}>D.O.Due Date</td><td style={{ border: 'none' }}>:-</td><td style={{ border: 'none' }}>{previewData.doDueDate}</td></tr>}
                          {previewSpecs?.doCopy && <tr><td style={{ padding: '2px 0', border: 'none' }}>D.O.Copy</td><td style={{ border: 'none' }}>:-</td><td style={{ border: 'none' }}>{previewData.doCopy}</td></tr>}
                          {previewSpecs?.destinationAdd && <tr><td style={{ padding: '2px 0', border: 'none' }}>Destination Add.</td><td style={{ border: 'none' }}>:-</td><td style={{ border: 'none' }}>{previewData.destinationAdd}</td></tr>}
                          {previewSpecs?.note && previewData.note && <tr><td style={{ verticalAlign: 'top', padding: '2px 0', border: 'none' }}>Note</td><td style={{ verticalAlign: 'top', border: 'none' }}>:-</td><td style={{ whiteSpace: 'pre-wrap', border: 'none' }}>{previewData.note}</td></tr>}
                        </tbody>
                      </table>

                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem' }}>
                        <span style={{
                          fontWeight: 'bold',
                          borderBottom: '1.2px solid #000000',
                          paddingBottom: '5px',
                          display: 'inline-block'
                        }}>
                          Term & Conditions
                        </span>
                      </h3>
                      <div style={{ paddingLeft: '14px', marginBottom: '6px', lineHeight: '1.34', whiteSpace: 'pre-wrap', fontSize: '14px' }}>{previewData.terms}</div>

                      <div style={{ marginTop: 'auto', lineHeight: '1.32', fontSize: '14px' }}>
                        <p style={{ fontWeight: 'bold', margin: '0 0 2px 0' }}>For {previewData.companyName}</p>
                        <div style={{ minHeight: '85px', height: '85px', display: 'flex', alignItems: 'center', marginTop: '2px', marginBottom: '2px' }}>
                          {(previewData.signatureDataUrl || activeFirm?.signature) && (
                            <img 
                              src={previewData.signatureDataUrl || activeFirm?.signature} 
                              alt="Signature" 
                              style={{ height: '85px', maxWidth: '240px', objectFit: 'contain' }}
                              onError={(e) => {
                                if (activeFirm?.signature && e.target.src !== activeFirm.signature) {
                                  e.target.src = activeFirm.signature;
                                }
                              }}
                            />
                          )}
                        </div>
                        <p style={{ fontWeight: 'bold', margin: '0' }}>{previewData.signatoryName}</p>
                        <p style={{ margin: '0', color: '#334155' }}>{previewData.signatoryTitle}</p>
                        <div style={{ borderTop: '1.5px solid #ccc', marginTop: '6px', paddingTop: '4px', textAlign: 'center', fontSize: '0.74rem', color: '#1d4ed8' }}>
                          <div style={{ lineHeight: '1.25', whiteSpace: 'normal' }}>{previewData.address}</div>
                          <div style={{ lineHeight: '1.25', marginTop: '2px', whiteSpace: 'normal' }}>{previewData.footerContact}</div>
                        </div>
                      </div>
                    </>
                  )}

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
