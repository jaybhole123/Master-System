import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Printer, Edit, Download, ArrowLeft, Columns, Plus, Trash2, Eye, Search,
  Loader2, Save, X, FileText, CheckCircle, Clock, RotateCcw, Check, History,
  Undo, ChevronDown, Sparkles, Building2, User, Hash, Calendar
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';
import './WorkOrder.css';

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
    gstin: '22AWGPA9068C1ZW',
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
  { key: 'orderDate', label: 'Order Date' },
  { key: 'issuingCompany', label: 'Issuing Company' },
  { key: 'orderTitle', label: 'Order Title' },
  { key: 'orderNo', label: 'Order No.' },
  { key: 'vendor', label: 'Vendor (Supplier Firm)' },
  { key: 'buyer', label: 'Buyer (Self Firm)' },
  { key: 'consignee', label: 'Consignee (Delivery Point)' },
  { key: 'material', label: 'Material Description' },
  { key: 'chemicalSpecs', label: 'Chemical Composition Limits' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'rate', label: 'Rate / Price' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'paymentCondition', label: 'Payment Condition' },
  { key: 'gst', label: 'GST Clause' },
  { key: 'signatory', label: 'Signatory Name & Stamp' },
  { key: 'terms', label: 'Jurisdiction & Closing Terms' }
];

const defaultPoVisibleSpecs = () => poSpecKeys.reduce((acc, s) => ({ ...acc, [s.key]: true }), {});

const defaultFormData = () => ({
  docType: 'work_order', // 'work_order' | 'purchase_order'
  workOrderNo: '',
  companyName: '',
  headerGstin: '',
  orderTitle: '',
  date: new Date().toISOString().split('T')[0],
  buyerName: '',
  buyerAddress: '',
  buyerDistState: '',
  subject: '',
  commodity: '',
  mines: '',
  price: '',
  quantity: '',
  fcGuarantee: '',
  shortageTolerance: '',
  doDueDate: '',
  doCopy: '',
  destinationAdd: '',
  note: '',
  terms: '',
  signatoryName: '',
  signatoryTitle: '',
  address: '',
  footerContact: '',
  signatureDataUrl: '',
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
  headerGstin: '',
  selfFirmName: '',
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
  chemicalSpecs: [{ name: '', value: '' }],
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
  customFields: [],
  subject: '',
  fcGuarantee: '',
  shortageTolerance: '',
  doDueDate: '',
  doCopy: '',
  destinationAdd: '',
  note: '',
  terms: '',
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
  header_gstin: f.headerGstin || null,
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
  custom_fields: Array.isArray(f.customFields) ? f.customFields : [],
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
  headerGstin: row.header_gstin || '',
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
  customFields: Array.isArray(row.custom_fields) ? row.custom_fields : (row.customFields || []),
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
  header_gstin: f.headerGstin || null,
  order_title: f.orderTitle || '',
  vendor_name: f.buyerName || '',
  vendor_address: f.buyerAddress || '',
  vendor_gst: f.vendorGst || '',
  buyer_name: f.selfFirmName || f.companyName || '',
  buyer_address: f.address,
  buyer_gst: f.buyerGst || COMPANY_DETAILS[f.companyName]?.gstin || '',
  consignee_name: f.consigneeName || '',
  consignee_address: f.consigneeAddress || '',
  consignee_gst: f.consigneeGst || '',
  material_name: f.materialName || f.commodity || '',
  chemical_specs: Array.isArray(f.chemicalSpecs) ? f.chemicalSpecs : [],
  quantity: f.quantity || '',
  rate: f.price || '',
  delivery: f.delivery || '',
  payment_condition: f.paymentCondition || '',
  gst_clause: f.gstRate || '',
  custom_fields: Array.isArray(f.customFields) ? f.customFields : [],
  terms: f.terms || '',
  signatory_name: f.signatoryName || '',
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
  orderTitle: row.order_title || '',
  date: row.order_date || new Date().toISOString().split('T')[0],
  companyName: row.company_name || '',
  headerGstin: row.header_gstin || '',
  selfFirmName: row.buyer_name || row.company_name || '',
  signatoryName: row.signatory_name || '',
  signatoryTitle: '',
  signatureDataUrl: row.signature_url || (COMPANY_DETAILS[row.company_name]?.signature || ''),
  // STRICT: Only use vendor_name/vendor_address/vendor_gst from DB column, no fallback to company address
  buyerName: row.vendor_name || '',
  buyerDistState: '',
  buyerAddress: row.vendor_address || '',
  vendorGst: row.vendor_gst || '',
  subject: '',
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
  address: row.buyer_address || row.firm_address || '',
  footerContact: row.firm_footer_contact || '',
  status: row.status || 'Draft',
  visibleSpecs: row.visible_specs && Object.keys(row.visible_specs).length > 0 ? row.visible_specs : defaultPoVisibleSpecs(),
  buyerGst: row.buyer_gst || '',
  consigneeName: row.consignee_name || '',
  consigneeAddress: row.consignee_address || '',
  consigneeGst: row.consignee_gst || '',
  materialName: row.material_name || '',
  chemicalSpecs: Array.isArray(row.chemical_specs) ? row.chemical_specs : [],
  delivery: row.delivery || '',
  paymentCondition: row.payment_condition || '',
  gstRate: row.gst_clause || '',
  customFields: Array.isArray(row.custom_fields) ? row.custom_fields : (row.customFields || [])
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

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'purchase_orders' | 'wo_history' | 'po_history'
  const [orders, setOrders] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [woHistoryOrders, setWoHistoryOrders] = useState([]);
  const [poHistoryOrders, setPoHistoryOrders] = useState([]);
  const [tabCounts, setTabCounts] = useState({ activeCount: 0, poCount: 0, woDoneCount: 0, poDoneCount: 0 });
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

  // Custom added companies stored in localStorage so they persist across sessions
  const [customCompanies, setCustomCompanies] = useState(() => {
    try {
      const saved = localStorage.getItem('CUSTOM_ISSUING_COMPANIES');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const allCompanies = useMemo(() => ({
    ...COMPANY_DETAILS,
    ...customCompanies
  }), [customCompanies]);

  const [newCompanyModal, setNewCompanyModal] = useState({
    isOpen: false,
    name: '',
    gstin: '',
    address: '',
    footerContact: '',
    signatoryName: '',
    signature: ''
  });

  // Fast count fetch for badge counters (exact count, head: true - 0 heavy data transferred)
  const fetchBadgeCounts = useCallback(async () => {
    try {
      const [woActiveRes, poActiveRes, woDoneRes, poDoneRes] = await Promise.all([
        supabase.from('work_orders').select('id', { count: 'exact', head: true }).neq('status', 'Done'),
        supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).neq('status', 'Done'),
        supabase.from('work_orders').select('id', { count: 'exact', head: true }).eq('status', 'Done'),
        supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('status', 'Done'),
      ]);

      const activeCount = woActiveRes.count || 0;
      const poCount = poActiveRes.count || 0;
      const woDoneCount = woDoneRes.count || 0;
      const poDoneCount = poDoneRes.count || 0;

      setTabCounts({ activeCount, poCount, woDoneCount, poDoneCount });
    } catch (err) {
      console.warn('Error fetching badge counts:', err);
    }
  }, []);

  // Optimized single-tab data fetching: only query the table required for the current tab
  const fetchOrdersForTab = useCallback(async (tabToFetch) => {
    const currentTab = tabToFetch || activeTab;
    setLoadingList(true);
    try {
      if (currentTab === 'active') {
        // ONLY fetch active/draft work orders from work_orders table
        const { data: woData, error: woError } = await supabase
          .from('work_orders')
          .select('*')
          .neq('status', 'Done')
          .order('created_at', { ascending: false });
        if (woError) throw woError;
        setOrders(woData || []);
      } else if (currentTab === 'purchase_orders') {
        // ONLY fetch PO/SO from purchase_orders table
        const { data: poData, error: poError } = await supabase
          .from('purchase_orders')
          .select('*')
          .neq('status', 'Done')
          .order('created_at', { ascending: false });
        if (poError) throw poError;
        setPurchaseOrders((poData || []).map(poFromDb));
      } else if (currentTab === 'wo_history') {
        // STRICTLY fetch only from work_orders table where status = 'Done'
        const { data: woDoneData, error: woDoneError } = await supabase
          .from('work_orders')
          .select('*')
          .eq('status', 'Done')
          .order('created_at', { ascending: false });
        if (woDoneError) throw woDoneError;
        setWoHistoryOrders((woDoneData || []).map(r => ({ ...fromDb(r), docType: 'work_order' })));
      } else if (currentTab === 'po_history') {
        // STRICTLY fetch only from purchase_orders table where status = 'Done'
        const { data: poDoneData, error: poDoneError } = await supabase
          .from('purchase_orders')
          .select('*')
          .eq('status', 'Done')
          .order('created_at', { ascending: false });
        if (poDoneError) throw poDoneError;
        setPoHistoryOrders((poDoneData || []).map(r => ({ ...poFromDb(r), docType: 'purchase_order' })));
      }
    } catch (err) {
      toast.error('Failed to load orders: ' + err.message);
    } finally {
      setLoadingList(false);
    }
  }, [activeTab]);

  // Fetch only active tab's data whenever the user switches tabs
  useEffect(() => {
    fetchOrdersForTab(activeTab);
  }, [activeTab, fetchOrdersForTab]);

  // Initial badge counts on mount
  useEffect(() => {
    fetchBadgeCounts();
  }, [fetchBadgeCounts]);

  const refreshAll = useCallback(() => {
    fetchOrdersForTab(activeTab);
    fetchBadgeCounts();
  }, [fetchOrdersForTab, fetchBadgeCounts, activeTab]);

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
        let resError = null;

        if (editingId) {
          const { error } = await supabase.from('purchase_orders').update(poPayload).eq('id', editingId);
          resError = error;
          if (resError && resError.message?.includes('column')) {
            // Fallback without vendor_name/vendor_address/vendor_gst if DB doesn't have them yet
            const { vendor_name, vendor_address, vendor_gst, ...fallbackPayload } = poPayload;
            const res = await supabase.from('purchase_orders').update(fallbackPayload).eq('id', editingId);
            resError = res.error;
          }
          if (resError) throw resError;
          toast.success('Purchase Order updated!');
        } else {
          let { error } = await supabase.from('purchase_orders').insert([poPayload]);
          resError = error;
          if (resError && resError.message?.includes('column')) {
            const { vendor_name, vendor_address, vendor_gst, ...fallbackPayload } = poPayload;
            const res = await supabase.from('purchase_orders').insert([fallbackPayload]);
            resError = res.error;
          }
          if (resError) throw resError;
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
      refreshAll();
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
      refreshAll();
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
      refreshAll();
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
      refreshAll();
    } catch (err) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  const openPreview = (row) => {
    const isPO = row.docType === 'purchase_order' || row.purchase_order_no || row.order_title === 'PURCHASE ORDER';
    // If row is already mapped (has docType), use it directly; otherwise map from DB row
    const fd = row.docType ? { ...row } : (isPO ? poFromDb(row) : fromDb(row));
    // Ensure signature fallback if signatureDataUrl is empty
    if (!fd.signatureDataUrl) {
      fd.signatureDataUrl = COMPANY_DETAILS[fd.companyName]?.signature || jbtSignature;
    }
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
        scrollY: 0,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

      const marginX = 4; // 4mm margin left & right
      const marginY = 4; // 4mm margin top & bottom
      const maxW = pageWidth - (marginX * 2); // 202mm
      const maxH = pageHeight - (marginY * 2); // 289mm

      // Calculate aspect ratio
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / imgHeight;

      let finalW = maxW;
      let finalH = finalW / ratio;

      // If calculated height exceeds max printable height, fit by height
      if (finalH > maxH) {
        finalH = maxH;
        finalW = finalH * ratio;
      }

      // Center horizontally, align with top margin
      const x = marginX + ((maxW - finalW) / 2);
      const y = marginY;

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', x, y, finalW, finalH);

      toast.dismiss();

      // Dynamic PDF Filename:
      // Purchase Order -> Vendor Firm Name + Order No (e.g. nikhil_pvt_PO_123.pdf)
      // Sale Order     -> Buyer Name + Order No (e.g. Sharma_Enterprises_SO_123.pdf)
      // Work Order     -> Buyer Name + Order No (e.g. Sharma_Enterprises_WO_2026.pdf)
      const orderTitle = (previewData?.orderTitle || '').toUpperCase();
      const isSO = orderTitle.includes('SALE') || orderTitle.includes('SO');
      const isPO = previewData?.docType === 'purchase_order' || !isSO && orderTitle.includes('PURCHASE');
      const orderNo = previewData?.workOrderNo || 'Draft';

      let fileNamePrefix = '';
      if (isPO) {
        // In PO: vendor name is stored in previewData.buyerName (Vendor Firm Name)
        const vendorFirm = previewData?.buyerName || 'Vendor';
        fileNamePrefix = `${vendorFirm}_PO_${orderNo}`;
      } else if (isSO) {
        // In SO: buyer name / party is previewData.buyerName
        const buyer = previewData?.buyerName || 'Buyer';
        fileNamePrefix = `${buyer}_SO_${orderNo}`;
      } else {
        const buyer = previewData?.buyerName || 'Party';
        fileNamePrefix = `${buyer}_WO_${orderNo}`;
      }

      const sanitizedFileName = `${fileNamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      pdf.save(sanitizedFileName);
      toast.success('PDF downloaded successfully (1 page)!');
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error('Failed to generate PDF: ' + err.message);
    }
  };

  const activeFirm = previewData
    ? (allCompanies[previewData.companyName] || allCompanies['Jai Bhole Logistics'])
    : allCompanies['Jai Bhole Logistics'];

  const allAvailableOrders = useMemo(() => {
    return [...orders, ...purchaseOrders, ...woHistoryOrders, ...poHistoryOrders];
  }, [orders, purchaseOrders, woHistoryOrders, poHistoryOrders]);

  const companyOptions = useMemo(() => ['All', ...Array.from(new Set(allAvailableOrders.map(o => o.company_name || o.companyName).filter(Boolean)))], [allAvailableOrders]);
  const buyerOptions = useMemo(() => ['All', ...Array.from(new Set(allAvailableOrders.map(o => o.buyer_name || o.buyerName).filter(Boolean)))], [allAvailableOrders]);
  const commodityOptions = useMemo(() => ['All', ...Array.from(new Set(allAvailableOrders.map(o => o.commodity || o.materialName).filter(Boolean)))], [allAvailableOrders]);
  const qtyOptions = useMemo(() => ['All', ...Array.from(new Set(allAvailableOrders.map(o => o.quantity).filter(Boolean)))], [allAvailableOrders]);

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
      subjects: cleanList(orders.map(o => o.subject)),
      doDueDates: cleanList(orders.map(o => o.do_due_date)),
      destinationAddresses: cleanList(orders.map(o => o.destination_address)),
      notes: cleanList(orders.map(o => o.note)),
      signatoryTitles: cleanList(orders.map(o => o.signatory_title)),
      firmAddresses: cleanList(orders.map(o => o.firm_address)),
      firmFooterContacts: cleanList(orders.map(o => o.firm_footer_contact)),
      // Purchase Orders specific suggestions (ONLY from vendor_name, vendor_address, vendor_gst columns):
      vendorNames: cleanList(purchaseOrders.map(p => p.vendor_name || p.buyerName)),
      vendorAddresses: cleanList(purchaseOrders.map(p => p.vendor_address || p.buyerAddress)),
      vendorGsts: cleanList(purchaseOrders.map(p => p.vendor_gst || p.vendorGst)),
      consigneeNames: cleanList(purchaseOrders.map(p => p.consigneeName || p.consignee_name)),
      consigneeAddresses: cleanList(purchaseOrders.map(p => p.consigneeAddress || p.consignee_address)),
      consigneeGsts: cleanList(purchaseOrders.map(p => p.consigneeGst || p.consignee_gst)),
      buyerGsts: cleanList(purchaseOrders.map(p => p.buyerGst || p.buyer_gst)),
      materials: cleanList(purchaseOrders.map(p => p.materialName || p.material_name)),
      deliveries: cleanList([...purchaseOrders.map(p => p.delivery)].filter(Boolean)),
      paymentConditions: cleanList([...purchaseOrders.map(p => p.paymentCondition || p.payment_condition)].filter(Boolean)),
      gstClauses: cleanList([...purchaseOrders.map(p => p.gstRate || p.gst_clause)].filter(Boolean)),
      signatories: cleanList([...orders.map(o => o.signatory_name), ...purchaseOrders.map(p => p.signatoryName || p.signatory_name)]),
      termsList: cleanList([...orders.map(o => o.terms), ...purchaseOrders.map(p => p.terms)]),
      chemicalElements: cleanList(
        purchaseOrders.flatMap(p => {
          const specs = Array.isArray(p.chemical_specs) ? p.chemical_specs : (Array.isArray(p.chemicalSpecs) ? p.chemicalSpecs : []);
          return specs.map(s => s?.name);
        }).concat(['Sul.', 'Phos.', 'Carbon', 'Manganese', 'Silicon'])
      ),
      chemicalValues: cleanList(
        purchaseOrders.flatMap(p => {
          const specs = Array.isArray(p.chemical_specs) ? p.chemical_specs : (Array.isArray(p.chemicalSpecs) ? p.chemicalSpecs : []);
          return specs.map(s => s?.value);
        })
      )
    };
  }, [orders, purchaseOrders]);

  const handleVendorNameChange = (val) => {
    // Auto-fill vendor address & vendor GST if user selects an existing vendor from purchase_orders
    const matched = purchaseOrders.find(p => 
      (p.buyerName || p.vendor_name || p.buyer_name) && 
      (p.buyerName || p.vendor_name || p.buyer_name).toLowerCase().trim() === (val || '').toLowerCase().trim()
    );

    if (matched) {
      setFormData(prev => ({
        ...prev,
        buyerName: val,
        buyerAddress: matched.buyerAddress || matched.vendor_address || matched.buyer_address || prev.buyerAddress,
        vendorGst: matched.vendorGst || matched.vendor_gst || prev.vendorGst
      }));
    } else {
      setFormData(prev => ({ ...prev, buyerName: val }));
    }
  };

  const stats = useMemo(() => {
    const isPOView = activeTab === 'purchase_orders';
    const isWOHistory = activeTab === 'wo_history';
    const isPOHistory = activeTab === 'po_history';

    const isSoOrder = (item) => {
      const title = (item.orderTitle || item.order_title || '').toUpperCase();
      return title.includes('SALE') || title.includes('SO');
    };

    if (isWOHistory) {
      const count = tabCounts.woDoneCount || woHistoryOrders.length;
      return {
        total: count,
        card1Title: 'TOTAL COMPLETED WO',
        card1Count: count,
        card2Title: 'COAL TRANSPORT',
        card2Count: woHistoryOrders.filter(o => (o.commodity || '').toLowerCase().includes('coal')).length,
        card3Title: 'OTHER COMMODITY',
        card3Count: woHistoryOrders.filter(o => !(o.commodity || '').toLowerCase().includes('coal')).length,
        card4Title: 'STATUS',
        card4Count: count,
        poCount: tabCounts.poCount,
        activeCount: tabCounts.activeCount,
        woDoneCount: count,
        poDoneCount: tabCounts.poDoneCount || poHistoryOrders.length
      };
    }

    if (isPOHistory) {
      const count = tabCounts.poDoneCount || poHistoryOrders.length;
      const soDone = poHistoryOrders.filter(p => isSoOrder(p)).length;
      const poDone = count - soDone;
      return {
        total: count,
        card1Title: 'TOTAL COMPLETED PO/SO',
        card1Count: count,
        card2Title: 'COMPLETED PO',
        card2Count: Math.max(0, poDone),
        card3Title: 'COMPLETED SO',
        card3Count: soDone,
        card4Title: 'STATUS',
        card4Count: count,
        poCount: tabCounts.poCount,
        activeCount: tabCounts.activeCount,
        woDoneCount: tabCounts.woDoneCount || woHistoryOrders.length,
        poDoneCount: count
      };
    }

    if (isPOView) {
      const total = tabCounts.poCount || purchaseOrders.length;
      const soCount = purchaseOrders.filter(p => isSoOrder(p)).length;
      const purePoCount = purchaseOrders.filter(p => !isSoOrder(p)).length;
      const poDraft = purchaseOrders.filter(p => !p.status || p.status === 'Draft').length;
      return {
        total,
        card1Title: 'TOTAL PO / SO',
        card1Count: total,
        card2Title: 'ACTIVE PO',
        card2Count: purePoCount,
        card3Title: 'ACTIVE SO',
        card3Count: soCount,
        card4Title: 'DRAFT PO/SO',
        card4Count: poDraft,
        poCount: tabCounts.poCount,
        activeCount: tabCounts.activeCount,
        woDoneCount: tabCounts.woDoneCount || woHistoryOrders.length,
        poDoneCount: tabCounts.poDoneCount || poHistoryOrders.length
      };
    }

    // DEFAULT STATS FOR WORK ORDERS TAB
    const woTotal = tabCounts.activeCount || orders.length;
    const woDraft = orders.filter(o => !o.status || o.status === 'Draft').length;

    return {
      total: woTotal,
      card1Title: 'ACTIVE WORK ORDERS',
      card1Count: woTotal,
      card2Title: 'OPEN ORDERS',
      card2Count: orders.filter(o => o.status === 'Open' || !o.status).length,
      card3Title: 'WO HISTORY',
      card3Count: tabCounts.woDoneCount || woHistoryOrders.length,
      card4Title: 'DRAFT STATUS',
      card4Count: woDraft,
      poCount: tabCounts.poCount,
      activeCount: tabCounts.activeCount,
      woDoneCount: tabCounts.woDoneCount || woHistoryOrders.length,
      poDoneCount: tabCounts.poDoneCount || poHistoryOrders.length
    };
  }, [orders, purchaseOrders, woHistoryOrders, poHistoryOrders, tabCounts, activeTab]);

  const filteredOrders = useMemo(() => {
    if (activeTab === 'purchase_orders') {
      return purchaseOrders.filter(o => {
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

    if (activeTab === 'wo_history') {
      // STRICTLY work_orders table records only
      return woHistoryOrders.filter(o => {
        const matchSearch = !searchTerm ||
          (o.buyer_name || o.buyerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.company_name || o.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.work_order_no || o.workOrderNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.commodity || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchCompany = filterCompany === 'All' || (o.company_name || o.companyName) === filterCompany;
        const matchBuyer = filterBuyer === 'All' || (o.buyer_name || o.buyerName) === filterBuyer;
        const matchCommodity = filterCommodity === 'All' || o.commodity === filterCommodity;
        const matchQty = filterQty === 'All' || (o.quantity) === filterQty;
        return matchSearch && matchCompany && matchBuyer && matchCommodity && matchQty;
      });
    }

    if (activeTab === 'po_history') {
      // STRICTLY purchase_orders table records only
      return poHistoryOrders.filter(o => {
        const matchSearch = !searchTerm ||
          (o.buyerName || o.vendor_name || o.consigneeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.companyName || o.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.workOrderNo || o.purchase_order_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.materialName || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchCompany = filterCompany === 'All' || (o.companyName || o.company_name) === filterCompany;
        const matchBuyer = filterBuyer === 'All' || (o.buyerName || o.vendor_name) === filterBuyer;
        const matchCommodity = filterCommodity === 'All' || o.materialName === filterCommodity;
        const matchQty = filterQty === 'All' || (o.quantity) === filterQty;
        return matchSearch && matchCompany && matchBuyer && matchCommodity && matchQty;
      });
    }

    // Active Orders tab (Work Orders only)
    return orders.filter(o => {
      const matchSearch = !searchTerm ||
        (o.buyer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.work_order_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.commodity || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCompany = filterCompany === 'All' || o.company_name === filterCompany;
      const matchBuyer = filterBuyer === 'All' || o.buyer_name === filterBuyer;
      const matchCommodity = filterCommodity === 'All' || o.commodity === filterCommodity;
      const matchQty = filterQty === 'All' || o.quantity === filterQty;
      return matchSearch && matchCompany && matchBuyer && matchCommodity && matchQty;
    });
  }, [orders, purchaseOrders, woHistoryOrders, poHistoryOrders, activeTab, searchTerm, filterCompany, filterBuyer, filterCommodity, filterQty]);

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
    <div className="fade-in work-order-page-container">

      {/* Hero Header */}
      <div className="no-print work-order-hero">
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
          className="work-order-hero-btn"
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(220, 38, 38, 0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(220, 38, 38, 0.3)'; }}
        >
          <Plus size={16} strokeWidth={2.5} /> {activeTab === 'purchase_orders' ? 'New PO + SO Order' : 'New Work Order'}
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="no-print work-order-kpi-grid">
        {/* Card 1 */}
        <div className="work-order-kpi-card">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={22} strokeWidth={2.2} />
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div className="kpi-title" style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stats.card1Title}</div>
            <div className="kpi-count" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: '1.2' }}>{stats.card1Count}</div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="work-order-kpi-card">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={22} strokeWidth={2.2} />
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div className="kpi-title" style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stats.card2Title}</div>
            <div className="kpi-count" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: '1.2' }}>{stats.card2Count}</div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="work-order-kpi-card">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle size={22} strokeWidth={2.2} />
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div className="kpi-title" style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stats.card3Title}</div>
            <div className="kpi-count" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: '1.2' }}>{stats.card3Count}</div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="work-order-kpi-card">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={22} strokeWidth={2.2} />
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div className="kpi-title" style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stats.card4Title}</div>
            <div className="kpi-count" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: '1.2' }}>{stats.card4Count}</div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="no-print work-order-tabs-bar">
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

        {/* Tab 3: Completed Work Orders History */}
        <button
          onClick={() => setActiveTab('wo_history')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'wo_history' ? '#ffffff' : 'transparent',
            color: activeTab === 'wo_history' ? '#dc2626' : '#64748b',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.84rem',
            boxShadow: activeTab === 'wo_history' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
            transition: 'all 0.15s'
          }}>
          <Clock size={15} style={{ color: activeTab === 'wo_history' ? '#dc2626' : '#64748b' }} />
          Work Order History
          <span style={{
            fontSize: '0.72rem',
            padding: '1px 6px',
            borderRadius: '10px',
            backgroundColor: activeTab === 'wo_history' ? '#fee2e2' : '#cbd5e1',
            color: activeTab === 'wo_history' ? '#dc2626' : '#475569'
          }}>
            {stats.woDoneCount}
          </span>
        </button>

        {/* Tab 4: Completed PO + SO History */}
        <button
          onClick={() => setActiveTab('po_history')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'po_history' ? '#ffffff' : 'transparent',
            color: activeTab === 'po_history' ? '#2563eb' : '#64748b',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.84rem',
            boxShadow: activeTab === 'po_history' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
            transition: 'all 0.15s'
          }}>
          <FileText size={15} style={{ color: activeTab === 'po_history' ? '#2563eb' : '#64748b' }} />
          PO + SO History
          <span style={{
            fontSize: '0.72rem',
            padding: '1px 6px',
            borderRadius: '10px',
            backgroundColor: activeTab === 'po_history' ? '#dbeafe' : '#cbd5e1',
            color: activeTab === 'po_history' ? '#2563eb' : '#475569'
          }}>
            {stats.poDoneCount}
          </span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="no-print work-order-filters-bar">
        <div className="work-order-filter-search">
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

        <div className="work-order-filter-select-comp">
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

        <div className="work-order-filter-select-buyer">
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
            <option value="All">
              {activeTab === 'purchase_orders' || activeTab === 'po_history' ? 'Vendor / Party (All)' : 'Buyer (All)'}
            </option>
            {buyerOptions.filter(b => b !== 'All').map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="work-order-filter-select-comm">
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
            <option value="All">
              {activeTab === 'purchase_orders' || activeTab === 'po_history' ? 'Material (All)' : 'Commodity (All)'}
            </option>
            {commodityOptions.filter(c => c !== 'All').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="work-order-filter-select-qty">
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
          <>
            {/* Desktop Table View */}
            <div className="work-order-desktop-table">
              <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: '#475569', width: '50px', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>#</th>
                    <th style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 700, color: '#475569', width: '50px', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>VIEW</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', minWidth: '150px', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ORDER NO</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', minWidth: '115px', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>DATE</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', minWidth: '190px', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ISSUING COMPANY</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', minWidth: '220px', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {activeTab === 'purchase_orders' || activeTab === 'po_history'
                        ? 'VENDOR / PARTY'
                        : 'BUYER / RECEIVER'}
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', minWidth: '120px', borderBottom: '1px solid #e2e8f0', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {activeTab === 'purchase_orders' || activeTab === 'po_history'
                        ? 'MATERIAL'
                        : 'COMMODITY'}
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
                        {o.docType === 'purchase_order' 
                          ? (o.buyerName || o.vendor_name || o.consigneeName || '—')
                          : (o.buyer_name || o.buyerName || '—')}
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

            {/* Mobile Cards View (< 768px) */}
            <div className="work-order-mobile-cards">
              {filteredOrders.map((o, idx) => {
                const orderNo = o.workOrderNo || o.work_order_no || o.purchase_order_no || '—';
                const orderDate = (o.date || o.order_date) ? new Date(o.date || o.order_date).toLocaleDateString('en-IN') : '—';
                const partyName = activeTab === 'purchase_orders' ? (o.consigneeName || o.buyer_name || o.buyerName) : (o.buyer_name || o.buyerName);
                const itemCommodity = o.materialName || o.visible_specs?._extra?.materialName || o.commodity || '—';

                return (
                  <div
                    key={o.id}
                    className="work-order-mobile-card-item"
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 4px rgba(15, 23, 42, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    {/* Header Row: # + Order No (Left) and Status Badge (Right) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8' }}>#{idx + 1}</span>
                        <span style={{
                          backgroundColor: '#f1f5f9',
                          color: '#0f172a',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontFamily: 'ui-monospace, monospace',
                          fontWeight: 700,
                          border: '1px solid #e2e8f0'
                        }}>
                          {orderNo}
                        </span>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>

                    {/* Company Name */}
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', lineHeight: '1.2' }}>
                      {o.companyName || o.company_name}
                    </div>

                    {/* 2-Column Grid: Party / Commodity / Qty / Date side by side */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '6px 12px',
                      backgroundColor: '#f8fafc',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Party</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={partyName}>
                          {partyName || '—'}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>
                          {activeTab === 'purchase_orders' ? 'Material' : 'Commodity'}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={itemCommodity}>
                          {itemCommodity}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Quantity</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                          {o.quantity || '—'}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Date</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block' }}>
                          {orderDate}
                        </span>
                      </div>
                    </div>

                    {/* Single Row Actions Bar: Preview + Done + Edit + Delete all on 1 clean row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                      <button
                        type="button"
                        title="Preview & Print Letter"
                        onClick={() => openPreview(o)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px solid #bfdbfe',
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        <Eye size={13} />
                        <span>Preview</span>
                      </button>

                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        {o.status !== 'Done' ? (
                          <button
                            type="button"
                            title="Mark as Done"
                            onClick={() => handleMarkDone(o)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: '1px solid #86efac',
                              backgroundColor: '#f0fdf4',
                              color: '#15803d',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              cursor: 'pointer'
                            }}
                          >
                            <Check size={12} strokeWidth={2.8} />
                            <span>Done</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            title="Reopen Order"
                            onClick={() => handleReopen(o)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#f8fafc',
                              color: '#475569',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              cursor: 'pointer'
                            }}
                          >
                            <Undo size={12} />
                            <span>Reopen</span>
                          </button>
                        )}

                        <button
                          type="button"
                          title="Edit Order"
                          onClick={() => openEditModal(o)}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            border: '1px solid #fde68a',
                            backgroundColor: '#fffbeb',
                            color: '#b45309',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit size={13} />
                        </button>

                        <button
                          type="button"
                          title="Delete Order"
                          onClick={() => handleDelete(o.id)}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fef2f2',
                            color: '#dc2626',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
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
            width: '92vw',
            maxWidth: '1360px',
            height: '86vh',
            maxHeight: '86vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
            position: 'relative',
            overflow: 'hidden'
          }}>

            {/* Modal Header */}
            <div className="work-order-modal-header" style={{
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowFieldsModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    fontWeight: 700,
                    color: '#334155',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                >
                  <Columns size={14} style={{ color: '#dc2626' }} /> Toggle Fields
                </button>
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
            </div>

            {/* Modal Body: Split 2-Column Layout (Form on Left, Live Preview on Right) */}
            <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
              {/* Left Column: Form Fields */}
              <div className="work-order-modal-body" style={{ width: '50%', minWidth: '420px', overflowY: 'auto', padding: '16px 20px', backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0' }}>
                {formData.docType === 'purchase_order' ? (
                  /* ================= PURCHASE ORDER FORM ================= */
                  <div className="work-order-form-grid">
                  {visibleSpecs.orderDate !== false && (
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
                  )}

                  {visibleSpecs.issuingCompany !== false && (
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                        Issuing Company (Heading)
                      </label>

                      <div style={{ position: 'relative' }}>
                        <select
                          name="companyName"
                          value={formData.companyName}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__add_new__') {
                              setNewCompanyModal({
                                isOpen: true,
                                name: '',
                                gstin: '',
                                address: '',
                                footerContact: '',
                                signatoryName: '',
                                signature: ''
                              });
                              return;
                            }
                            const comp = allCompanies[val];
                            setFormData(prev => ({
                              ...prev,
                              companyName: val,
                              headerGstin: comp?.gstin || prev.headerGstin || '',
                              footerContact: comp?.footerContact || prev.footerContact,
                              signatureDataUrl: comp?.signature || prev.signatureDataUrl || '',
                              signatoryName: comp ? comp.name : prev.signatoryName
                            }));
                          }}
                          style={{
                            width: '100%',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            padding: '8.5px 36px 8.5px 12px',
                            fontSize: '0.85rem',
                            outline: 'none',
                            backgroundColor: '#ffffff',
                            cursor: 'pointer',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none',
                            fontWeight: formData.companyName ? 600 : 400,
                            color: formData.companyName ? '#0f172a' : '#64748b',
                            transition: 'all 0.15s',
                            boxSizing: 'border-box'
                          }}
                          onFocus={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.12)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          <option value="">-- Select Issuing Company --</option>
                          {Object.keys(allCompanies).map(name => (
                            <option key={name} value={name} style={{ color: '#0f172a', fontWeight: 500, padding: '4px' }}>
                              {name}
                            </option>
                          ))}
                          <option value="__add_new__" style={{ fontWeight: 700, color: '#dc2626' }}>
                            + Add New Company...
                          </option>
                        </select>
                        <ChevronDown
                          size={15}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#64748b',
                            pointerEvents: 'none'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <DbDropdownInput
                    label="Header GSTIN"
                    name="headerGstin"
                    value={formData.headerGstin}
                    onChange={handleChange}
                    options={dbSuggestions.buyerGsts || []}
                  />

                  {visibleSpecs.orderTitle !== false && (
                    <DbDropdownInput
                      label="Order Title"
                      name="orderTitle"
                      value={formData.orderTitle}
                      onChange={handleChange}
                      options={dbSuggestions.poOrderTitles || []}
                    />
                  )}

                  {visibleSpecs.orderNo !== false && (
                    <DbDropdownInput
                      label="Order No."
                      name="workOrderNo"
                      value={formData.workOrderNo}
                      onChange={handleChange}
                      options={dbSuggestions.poOrderNos || []}
                    />
                  )}

                  {/* Vendor / Supplier, Buyer & Consignee: Single Section per card (Stacked Vertically) */}
                  {(visibleSpecs.vendor !== false || visibleSpecs.buyer !== false || visibleSpecs.consignee !== false) && (
                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '4px' }}>
                      
                      {/* 1. Vendor Details (To / Supplier Firm) Section */}
                      {visibleSpecs.vendor !== false && (
                        <div style={{ backgroundColor: '#fffbf5', padding: '16px 18px', borderRadius: '12px', border: '1px solid #fed7aa' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Building2 size={16} style={{ color: '#ea580c' }} />
                              <h4 style={{ fontSize: '0.86rem', fontWeight: 800, color: '#9a3412', margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                {(formData.orderTitle || '').toUpperCase().includes('SALE') ? 'Buyer / Customer' : 'Vendor (Supplier Firm)'}
                              </h4>
                            </div>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', backgroundColor: '#ffedd5', color: '#c2410c' }}>
                              {(formData.orderTitle || '').toUpperCase().includes('SALE') ? 'FROM' : 'TO'}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                            <DbDropdownInput
                              label="Vendor Firm Name"
                              name="buyerName"
                              value={formData.buyerName}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleVendorNameChange(val);
                              }}
                              options={dbSuggestions.vendorNames || []}
                            />
                            <DbDropdownInput
                              label="Vendor GST No."
                              name="vendorGst"
                              value={formData.vendorGst}
                              onChange={handleChange}
                              options={dbSuggestions.vendorGsts || []}
                            />
                            <div style={{ gridColumn: '1 / -1' }}>
                              <DbDropdownInput
                                label="Vendor Address"
                                name="buyerAddress"
                                value={formData.buyerAddress}
                                onChange={handleChange}
                                options={dbSuggestions.vendorAddresses || []}
                                isTextarea={true}
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 2. Buyer Details (Self Firm) Section */}
                      {visibleSpecs.buyer !== false && (
                        <div style={{ backgroundColor: '#f8fafc', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Building2 size={16} style={{ color: '#475569' }} />
                              <h4 style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                Buyer (Self Firm)
                              </h4>
                            </div>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', backgroundColor: '#e2e8f0', color: '#334155' }}>
                              ISSUING
                            </span>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                            <DbDropdownInput
                              label="Buyer Firm Name"
                              name="selfFirmName"
                              value={formData.selfFirmName || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                const comp = allCompanies[val];
                                setFormData(prev => ({
                                  ...prev,
                                  selfFirmName: val,
                                  buyerGst: comp?.gstin || prev.buyerGst,
                                  address: comp?.address || prev.address
                                }));
                              }}
                              options={Object.keys(allCompanies)}
                            />
                            <DbDropdownInput
                              label="Buyer GST No."
                              name="buyerGst"
                              value={formData.buyerGst}
                              onChange={handleChange}
                              options={dbSuggestions.buyerGsts}
                            />
                            <div style={{ gridColumn: '1 / -1' }}>
                              <DbDropdownInput
                                label="Buyer Name & Address"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                options={dbSuggestions.addresses}
                                isTextarea={true}
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3. Consignee Details Section */}
                      {visibleSpecs.consignee !== false && (
                        <div style={{ backgroundColor: '#f8fafc', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Building2 size={16} style={{ color: '#2563eb' }} />
                              <h4 style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                Consignee (Delivery Point)
                              </h4>
                            </div>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', backgroundColor: '#dbeafe', color: '#1e40af' }}>
                              SHIP TO
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                            <DbDropdownInput
                              label="Consignee Name"
                              name="consigneeName"
                              value={formData.consigneeName}
                              onChange={handleChange}
                              options={dbSuggestions.consigneeNames}
                            />
                            <DbDropdownInput
                              label="Consignee GST No."
                              name="consigneeGst"
                              value={formData.consigneeGst}
                              onChange={handleChange}
                              options={dbSuggestions.consigneeGsts}
                            />
                            <div style={{ gridColumn: '1 / -1' }}>
                              <DbDropdownInput
                                label="Consignee Address"
                                name="consigneeAddress"
                                value={formData.consigneeAddress}
                                onChange={handleChange}
                                options={dbSuggestions.consigneeAddresses}
                                isTextarea={true}
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* Material & Chemical Specifications */}
                  {(visibleSpecs.material !== false || visibleSpecs.chemicalSpecs !== false || visibleSpecs.quantity !== false || visibleSpecs.rate !== false || visibleSpecs.delivery !== false || visibleSpecs.paymentCondition !== false || visibleSpecs.gst !== false) && (
                    <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Material & Commercial Specifications
                        </h3>
                      </div>

                      {visibleSpecs.material !== false && (
                        <div style={{ marginBottom: '12px' }}>
                          <DbDropdownInput
                            label="Material Description"
                            name="materialName"
                            value={formData.materialName}
                            onChange={handleChange}
                            options={dbSuggestions.materials}
                          />
                        </div>
                      )}

                      {/* Chemical Specs Dynamic Rows */}
                      {visibleSpecs.chemicalSpecs !== false && (
                        <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div>
                              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                                Chemical Composition Limits
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                Add, edit or remove element limits
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
                            {((formData.chemicalSpecs && formData.chemicalSpecs.length > 0) 
                              ? formData.chemicalSpecs 
                              : [{ name: '', value: '' }]
                            ).map((spec, idx, arr) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '38%' }}>
                                  <input
                                    type="text"
                                    list="chemical-elements-list"
                                    value={spec.name || ''}
                                    placeholder=""
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFormData(prev => {
                                        const currentSpecs = (prev.chemicalSpecs && prev.chemicalSpecs.length > 0) 
                                          ? [...prev.chemicalSpecs] 
                                          : [{ name: '', value: '' }];
                                        currentSpecs[idx] = { ...(currentSpecs[idx] || { name: '', value: '' }), name: val };
                                        return { ...prev, chemicalSpecs: currentSpecs };
                                      });
                                    }}
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
                                    list="chemical-values-list"
                                    value={spec.value || ''}
                                    placeholder=""
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFormData(prev => {
                                        const currentSpecs = (prev.chemicalSpecs && prev.chemicalSpecs.length > 0) 
                                          ? [...prev.chemicalSpecs] 
                                          : [{ name: '', value: '' }];
                                        currentSpecs[idx] = { ...(currentSpecs[idx] || { name: '', value: '' }), value: val };
                                        return { ...prev, chemicalSpecs: currentSpecs };
                                      });
                                    }}
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
                                    setFormData(prev => {
                                      const remaining = (prev.chemicalSpecs || []).filter((_, i) => i !== idx);
                                      return {
                                        ...prev,
                                        chemicalSpecs: remaining.length > 0 ? remaining : [{ name: '', value: '' }]
                                      };
                                    });
                                  }}
                                  title="Delete or Clear Row"
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
                          </div>

                          <datalist id="chemical-elements-list">
                            {(dbSuggestions.chemicalElements || []).map((el, i) => (
                              <option key={i} value={el} />
                            ))}
                          </datalist>
                          <datalist id="chemical-values-list">
                            {(dbSuggestions.chemicalValues || []).map((val, i) => (
                              <option key={i} value={val} />
                            ))}
                          </datalist>
                        </div>
                      )}

                      {/* Order Commercial Terms Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        {visibleSpecs.quantity !== false && (
                          <DbDropdownInput
                            label="Quantity"
                            name="quantity"
                            value={formData.quantity}
                            onChange={handleChange}
                            options={dbSuggestions.quantities}
                          />
                        )}
                        {visibleSpecs.rate !== false && (
                          <DbDropdownInput
                            label="Rate"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            options={dbSuggestions.prices}
                          />
                        )}
                        {visibleSpecs.delivery !== false && (
                          <DbDropdownInput
                            label="Delivery"
                            name="delivery"
                            value={formData.delivery}
                            onChange={handleChange}
                            options={dbSuggestions.deliveries}
                          />
                        )}
                        {visibleSpecs.paymentCondition !== false && (
                          <DbDropdownInput
                            label="Payment Condition"
                            name="paymentCondition"
                            value={formData.paymentCondition}
                            onChange={handleChange}
                            options={dbSuggestions.paymentConditions}
                          />
                        )}
                        {visibleSpecs.gst !== false && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <DbDropdownInput
                              label="GST Clause"
                              name="gstRate"
                              value={formData.gstRate}
                              onChange={handleChange}
                              options={dbSuggestions.gstClauses}
                            />
                          </div>
                        )}
                        {/* Dynamic Custom Fields Section */}
                        <div style={{ gridColumn: '1 / -1', marginTop: '6px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Custom Specification Fields (Add Extra Columns)
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  customFields: [...(prev.customFields || []), { label: '', value: '' }]
                                }));
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                borderRadius: '6px',
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                cursor: 'pointer'
                              }}
                            >
                              <Plus size={13} /> + Add Custom Field
                            </button>
                          </div>

                          {Array.isArray(formData.customFields) && formData.customFields.map((field, cIdx) => (
                            <div key={cIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <div style={{ width: '38%' }}>
                                <input
                                  type="text"
                                  placeholder="Field Name (e.g. Loading Point)"
                                  value={field.label || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData(prev => {
                                      const next = [...(prev.customFields || [])];
                                      next[cIdx] = { ...next[cIdx], label: val };
                                      return { ...prev, customFields: next };
                                    });
                                  }}
                                  style={{
                                    width: '100%',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    padding: '7px 10px',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    boxSizing: 'border-box'
                                  }}
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <input
                                  type="text"
                                  placeholder="Value / Details"
                                  value={field.value || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData(prev => {
                                      const next = [...(prev.customFields || [])];
                                      next[cIdx] = { ...next[cIdx], value: val };
                                      return { ...prev, customFields: next };
                                    });
                                  }}
                                  style={{
                                    width: '100%',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    padding: '7px 10px',
                                    fontSize: '0.8rem',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    customFields: (prev.customFields || []).filter((_, i) => i !== cIdx)
                                  }));
                                }}
                                style={{
                                  width: '30px',
                                  height: '30px',
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
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Signatory & Signature Block */}
                  {visibleSpecs.signatory !== false && (
                    <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '4px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <DbDropdownInput
                          label="Signatory Name / Firm"
                          name="signatoryName"
                          value={formData.signatoryName}
                          onChange={handleChange}
                          options={dbSuggestions.signatories}
                        />
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
                  )}

                  {/* Conditions & Jurisdiction */}
                  {visibleSpecs.terms !== false && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <DbDropdownInput
                        label="Jurisdiction & Closing Terms"
                        name="terms"
                        value={formData.terms}
                        onChange={handleChange}
                        options={dbSuggestions.termsList}
                        isTextarea={true}
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* ================= WORK ORDER FORM ================= */
                <div className="work-order-form-grid">
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

                <div className="form-group" style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>Issuing Company</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      name="companyName"
                      value={formData.companyName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const comp = allCompanies[val];
                        setFormData(prev => ({
                          ...prev,
                          companyName: val,
                          headerGstin: comp?.gstin || prev.headerGstin || '',
                          address: comp?.address || prev.address,
                          footerContact: comp?.footerContact || prev.footerContact,
                          signatureDataUrl: comp?.signature || prev.signatureDataUrl || '',
                          signatoryName: comp ? comp.name : prev.signatoryName
                        }));
                      }}
                      style={{
                        width: '100%',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '8.5px 36px 8.5px 12px',
                        fontSize: '0.85rem',
                        outline: 'none',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        fontWeight: formData.companyName ? 600 : 400,
                        color: formData.companyName ? '#0f172a' : '#64748b',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">-- Select Issuing Company --</option>
                      {Object.keys(allCompanies).map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                    <ChevronDown
                      size={15}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#64748b',
                        pointerEvents: 'none'
                      }}
                    />
                  </div>
                </div>

                <DbDropdownInput
                  label="GSTIN No."
                  name="headerGstin"
                  value={formData.headerGstin}
                  onChange={handleChange}
                  options={dbSuggestions.buyerGsts || []}
                />

                <DbDropdownInput
                  label="Document Heading / Title"
                  name="orderTitle"
                  value={formData.orderTitle}
                  onChange={handleChange}
                  options={dbSuggestions.orderTitles}
                />

                <DbDropdownInput
                  label="Work Order No. (Auto)"
                  name="workOrderNo"
                  value={formData.workOrderNo || ''}
                  onChange={handleChange}
                  options={dbSuggestions.orderNos || []}
                />

                <DbDropdownInput
                  label="Signatory Name"
                  name="signatoryName"
                  value={formData.signatoryName}
                  onChange={handleChange}
                  options={dbSuggestions.signatories || []}
                />

                <DbDropdownInput
                  label="Signatory Title / Phone"
                  name="signatoryTitle"
                  value={formData.signatoryTitle}
                  onChange={handleChange}
                  options={dbSuggestions.signatoryTitles || []}
                />

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
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({ ...prev, buyerName: val }));
                      }}
                      options={dbSuggestions.buyers}
                      required={true}
                    />
                    <DbDropdownInput
                      label="District & State"
                      name="buyerDistState"
                      value={formData.buyerDistState}
                      onChange={handleChange}
                      options={dbSuggestions.distStates}
                    />
                    <div style={{ gridColumn: '1 / -1' }}>
                      <DbDropdownInput
                        label="Full Address"
                        name="buyerAddress"
                        value={formData.buyerAddress}
                        onChange={handleChange}
                        options={dbSuggestions.addresses}
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

                  <div style={{ marginBottom: '14px' }}>
                    <DbDropdownInput
                      label="Subject Line"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      options={dbSuggestions.subjects || []}
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
                      />
                    )}
                    {visibleSpecs.mines && (
                      <DbDropdownInput
                        label="Mines"
                        name="mines"
                        value={formData.mines}
                        onChange={handleChange}
                        options={dbSuggestions.minesList}
                      />
                    )}
                    {visibleSpecs.quantity && (
                      <DbDropdownInput
                        label="Quantity"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleChange}
                        options={dbSuggestions.quantities}
                      />
                    )}
                    {visibleSpecs.fcGuarantee && (
                      <DbDropdownInput
                        label="FC Guarantee"
                        name="fcGuarantee"
                        value={formData.fcGuarantee}
                        onChange={handleChange}
                        options={dbSuggestions.fcGuarantees}
                      />
                    )}
                    {visibleSpecs.shortageTolerance && (
                      <DbDropdownInput
                        label="Shortage Tolerance"
                        name="shortageTolerance"
                        value={formData.shortageTolerance}
                        onChange={handleChange}
                        options={dbSuggestions.shortageTolerances}
                      />
                    )}
                    {visibleSpecs.doDueDate && (
                      <DbDropdownInput
                        label="D.O. Due Date"
                        name="doDueDate"
                        value={formData.doDueDate}
                        onChange={handleChange}
                        options={dbSuggestions.doDueDates || []}
                      />
                    )}
                    {visibleSpecs.doCopy && (
                      <DbDropdownInput
                        label="D.O. Copy"
                        name="doCopy"
                        value={formData.doCopy}
                        onChange={handleChange}
                        options={dbSuggestions.doCopies}
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
                          isTextarea={true}
                          rows={2}
                        />
                      </div>
                    )}
                    {visibleSpecs.destinationAdd && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <DbDropdownInput
                          label="Destination Address"
                          name="destinationAdd"
                          value={formData.destinationAdd}
                          onChange={handleChange}
                          options={dbSuggestions.destinationAddresses || []}
                        />
                      </div>
                    )}
                    {visibleSpecs.note && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <DbDropdownInput
                          label="Special Note"
                          name="note"
                          value={formData.note}
                          onChange={handleChange}
                          options={dbSuggestions.notes || []}
                          isTextarea={true}
                          rows={2}
                        />
                      </div>
                    )}

                    {/* Custom Specification Fields in Work Order Form */}
                    <div style={{ gridColumn: '1 / -1', marginTop: '6px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Custom Specification Fields (Add Extra Columns)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              customFields: [...(prev.customFields || []), { label: '', value: '' }]
                            }));
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            borderRadius: '6px',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            cursor: 'pointer'
                          }}
                        >
                          <Plus size={13} /> + Add Custom Field
                        </button>
                      </div>

                      {Array.isArray(formData.customFields) && formData.customFields.map((field, cIdx) => (
                        <div key={cIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <div style={{ width: '38%' }}>
                            <input
                              type="text"
                              placeholder="Field Name (e.g. Loading Point)"
                              value={field.label || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormData(prev => {
                                  const next = [...(prev.customFields || [])];
                                  next[cIdx] = { ...next[cIdx], label: val };
                                  return { ...prev, customFields: next };
                                });
                              }}
                              style={{
                                width: '100%',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '7px 10px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <input
                              type="text"
                              placeholder="Value / Details"
                              value={field.value || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormData(prev => {
                                  const next = [...(prev.customFields || [])];
                                  next[cIdx] = { ...next[cIdx], value: val };
                                  return { ...prev, customFields: next };
                                });
                              }}
                              style={{
                                width: '100%',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '7px 10px',
                                fontSize: '0.8rem',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                customFields: (prev.customFields || []).filter((_, i) => i !== cIdx)
                              }));
                            }}
                            style={{
                              width: '30px',
                              height: '30px',
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
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <DbDropdownInput
                        label="Terms & Conditions"
                        name="terms"
                        value={formData.terms}
                        onChange={handleChange}
                        options={dbSuggestions.termsList || []}
                        isTextarea={true}
                        rows={3}
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
                    <DbDropdownInput
                      label="Firm Address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      options={dbSuggestions.firmAddresses || []}
                      isTextarea={true}
                      rows={2}
                    />
                    <DbDropdownInput
                      label="Firm Footer Contact"
                      name="footerContact"
                      value={formData.footerContact}
                      onChange={handleChange}
                      options={dbSuggestions.firmFooterContacts || []}
                    />
                  </div>
                </div>
                </div>
              )}
              </div>

              {/* Right Column: Live Form Preview Document Sheet */}
              <div style={{
                flex: 1,
                backgroundColor: '#1e293b',
                padding: '12px 14px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <div style={{
                  width: '100%',
                  maxWidth: '540px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  color: '#f8fafc'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Eye size={14} style={{ color: '#ef4444' }} />
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Live Document Preview</span>
                  </div>
                  <span style={{ fontSize: '0.68rem', backgroundColor: '#334155', padding: '1.5px 7px', borderRadius: '4px', color: '#94a3b8' }}>
                    Auto-updates live
                  </span>
                </div>

                {/* Render Paper Preview */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    padding: '18px 22px',
                    width: '100%',
                    maxWidth: '540px',
                    minHeight: 'auto',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                    borderRadius: '4px',
                    fontFamily: '"Times New Roman", Times, serif',
                    fontSize: '11.5px',
                    lineHeight: '1.28',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  {formData.docType === 'purchase_order' ? (
                    /* LIVE PO PREVIEW */
                    <>
                      <div>
                        {/* Header Top: GSTIN */}
                        {formData.headerGstin && (
                          <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '3px', fontSize: '0.76rem' }}>
                            GSTIN: {formData.headerGstin}
                          </div>
                        )}

                        {/* Header Row: Company Title */}
                        {formData.companyName && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '6px',
                            width: '100%'
                          }}>
                            {allCompanies[formData.companyName]?.logo && (
                              <img
                                src={allCompanies[formData.companyName].logo}
                                alt="Logo"
                                style={{ height: '42px', maxWidth: '50px', objectFit: 'contain', marginRight: '8px' }}
                              />
                            )}
                            <h1 style={{
                              fontSize: '1.65rem',
                              fontWeight: 'bold',
                              color: '#1e293b',
                              fontFamily: '"Baloo 2", "Arial Black", "Segoe UI", sans-serif',
                              lineHeight: 1,
                              margin: 0,
                              whiteSpace: 'nowrap'
                            }}>
                              {formData.companyName}
                            </h1>
                          </div>
                        )}

                        {/* Document Title */}
                        {formData.orderTitle && (
                          <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                            <span style={{
                              fontSize: '0.95rem',
                              fontWeight: 'bold',
                              borderBottom: '1.2px solid #000000',
                              paddingBottom: '3px',
                              display: 'inline-block',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}>
                              {formData.orderTitle}
                            </span>
                          </div>
                        )}

                        {/* Order No & Date */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginBottom: '6px', fontSize: '11.5px' }}>
                          <tbody>
                            <tr style={{ border: 'none' }}>
                              <td style={{ textAlign: 'left', fontWeight: 'bold', padding: 0, border: 'none' }}>
                                Order No.: {formData.workOrderNo || '—'}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', padding: 0, border: 'none' }}>
                                Date – {formData.date ? formData.date.split('-').reverse().join('-') : '—'}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Vendor Block */}
                        {visibleSpecs.vendor !== false && (
                          <div style={{ marginBottom: '6px', lineHeight: '1.26' }}>
                            <p style={{ margin: '0 0 1px 0', fontWeight: 'bold' }}>
                              {(formData.orderTitle || '').toUpperCase().includes('SALE') ? 'FROM,' : 'To,'}
                            </p>
                            <p style={{ margin: '0 0 1px 0', fontWeight: 'bold', fontSize: '12px' }}>
                              {formData.buyerName || 'Vendor / Supplier Name'}
                            </p>
                            {formData.buyerAddress && (
                              <p style={{ margin: '0 0 1px 0', whiteSpace: 'pre-wrap' }}>
                                {formData.buyerAddress}
                              </p>
                            )}
                            {formData.vendorGst && (
                              <p style={{ margin: '1px 0 0 0', fontWeight: 'bold' }}>
                                GST NO. {formData.vendorGst}
                              </p>
                            )}
                          </div>
                        )}

                        <p style={{ margin: '0 0 3px 0', fontSize: '11px' }}>Dear Sir,</p>
                        <p style={{ margin: '0 0 6px 0', fontSize: '11px' }}>
                          Enclosed herewith details for order as given above please receive the same and do needful.
                        </p>

                        {/* Specs Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', fontSize: '11px', marginBottom: '6px' }}>
                          <tbody>
                            {/* Buyer */}
                            {visibleSpecs.buyer !== false && (formData.selfFirmName || formData.address || formData.buyerGst) && (
                              <tr>
                                <td style={{ width: '30%', padding: '2px 0', verticalAlign: 'top', border: 'none', fontWeight: 600 }}>Buyer</td>
                                <td style={{ width: '5%', verticalAlign: 'top', border: 'none' }}>:</td>
                                <td style={{ padding: '2px 0', verticalAlign: 'top', border: 'none' }}>
                                  {formData.selfFirmName && <div style={{ fontWeight: 600 }}>{formData.selfFirmName}</div>}
                                  {formData.address && <div style={{ whiteSpace: 'pre-wrap' }}>{formData.address}</div>}
                                  {formData.buyerGst && <div style={{ fontWeight: 'bold' }}>GST No- <span>{formData.buyerGst}</span></div>}
                                </td>
                              </tr>
                            )}

                            {/* Consignee */}
                            {visibleSpecs.consignee !== false && (
                              <tr>
                                <td style={{ padding: '2px 0', verticalAlign: 'top', border: 'none', fontWeight: 600 }}>Consignee</td>
                                <td style={{ verticalAlign: 'top', border: 'none' }}>:</td>
                                <td style={{ padding: '2px 0', verticalAlign: 'top', border: 'none' }}>
                                  <div style={{ fontWeight: 600 }}>{formData.consigneeName || '—'}</div>
                                  {formData.consigneeAddress && <div style={{ whiteSpace: 'pre-wrap' }}>{formData.consigneeAddress}</div>}
                                  {formData.consigneeGst && <div style={{ fontWeight: 'bold' }}>GST No - <span>{formData.consigneeGst}</span></div>}
                                </td>
                              </tr>
                            )}

                            {/* Material & Chemical */}
                            {visibleSpecs.material !== false && (
                              <tr>
                                <td style={{ padding: '2px 0', verticalAlign: 'top', border: 'none', fontWeight: 600 }}>Material</td>
                                <td style={{ verticalAlign: 'top', border: 'none' }}>:</td>
                                <td style={{ padding: '2px 0', verticalAlign: 'top', border: 'none' }}>
                                  <div style={{ fontWeight: 600 }}>{formData.materialName || '—'}</div>
                                  {visibleSpecs.chemicalSpecs !== false && Array.isArray(formData.chemicalSpecs) && formData.chemicalSpecs.filter(s => s && (s.name || s.value)).length > 0 && (
                                    <table style={{ borderCollapse: 'collapse', border: 'none', marginTop: '2px', fontSize: '10.5px' }}>
                                      <tbody>
                                        {formData.chemicalSpecs.filter(s => s && (s.name || s.value)).map((spec, i) => (
                                          <tr key={i}>
                                            <td style={{ width: '45px', padding: 0, fontWeight: 'bold', border: 'none' }}>{spec.name}</td>
                                            <td style={{ padding: 0, border: 'none' }}>: {spec.value}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </td>
                              </tr>
                            )}

                            {visibleSpecs.quantity !== false && formData.quantity && (
                              <tr>
                                <td style={{ padding: '1.5px 0', border: 'none', fontWeight: 600 }}>Quantity</td>
                                <td style={{ border: 'none' }}>:</td>
                                <td style={{ padding: '1.5px 0', border: 'none', fontWeight: 600 }}>{formData.quantity}</td>
                              </tr>
                            )}

                            {visibleSpecs.rate !== false && formData.price && (
                              <tr>
                                <td style={{ padding: '1.5px 0', border: 'none', fontWeight: 600 }}>Rate</td>
                                <td style={{ border: 'none' }}>:</td>
                                <td style={{ padding: '1.5px 0', border: 'none' }}>{formData.price}</td>
                              </tr>
                            )}

                            {visibleSpecs.delivery !== false && formData.delivery && (
                              <tr>
                                <td style={{ padding: '1.5px 0', border: 'none', fontWeight: 600 }}>Delivery</td>
                                <td style={{ border: 'none' }}>:</td>
                                <td style={{ padding: '1.5px 0', border: 'none' }}>{formData.delivery}</td>
                              </tr>
                            )}

                            {visibleSpecs.paymentCondition !== false && formData.paymentCondition && (
                              <tr>
                                <td style={{ padding: '1.5px 0', border: 'none', fontWeight: 600 }}>Payment Condition</td>
                                <td style={{ border: 'none' }}>:</td>
                                <td style={{ padding: '1.5px 0', border: 'none' }}>{formData.paymentCondition}</td>
                              </tr>
                            )}

                            {visibleSpecs.gst !== false && formData.gstRate && (
                              <tr>
                                <td style={{ padding: '1.5px 0', border: 'none', fontWeight: 600 }}>Gst</td>
                                <td style={{ border: 'none' }}>:</td>
                                <td style={{ padding: '1.5px 0', border: 'none' }}>{formData.gstRate}</td>
                              </tr>
                            )}

                            {/* Dynamic Custom Fields */}
                            {Array.isArray(formData.customFields) && formData.customFields.filter(f => f && (f.label || f.value)).map((cf, cIdx) => (
                              <tr key={cIdx}>
                                <td style={{ padding: '1.5px 0', border: 'none', fontWeight: 600 }}>{cf.label || '—'}</td>
                                <td style={{ border: 'none' }}>:</td>
                                <td style={{ padding: '1.5px 0', border: 'none' }}>{cf.value || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Terms */}
                        {visibleSpecs.terms !== false && formData.terms && (
                          <div style={{ marginTop: '3px', fontSize: '10.5px', lineHeight: '1.26', whiteSpace: 'pre-wrap' }}>
                            {formData.terms}
                          </div>
                        )}
                      </div>

                      {/* Footer & Signature */}
                      {visibleSpecs.signatory !== false && (
                        <div style={{ marginTop: 'auto', paddingTop: '8px', fontSize: '11px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '3px' }}>
                            <div>
                              <p style={{ fontWeight: 'bold', margin: '0' }}>Thanking You</p>
                              <p style={{ margin: '0 0 1px 0' }}>Yours truly</p>
                              <p style={{ fontWeight: 'bold', margin: '0', whiteSpace: 'nowrap' }}>{formData.signatoryName || formData.companyName || ''}</p>
                            </div>
                            {(formData.signatureDataUrl || (formData.companyName && allCompanies[formData.companyName]?.signature)) && (
                              <img 
                                src={formData.signatureDataUrl || allCompanies[formData.companyName]?.signature} 
                                alt="Signature" 
                                style={{ height: '42px', maxWidth: '110px', objectFit: 'contain' }} 
                              />
                            )}
                          </div>
                          {((formData.companyName && allCompanies[formData.companyName]?.address) || formData.footerContact || (formData.companyName && allCompanies[formData.companyName]?.footerContact)) && (
                            <div style={{ borderTop: '1px solid #1e3a8a', marginTop: '3px', paddingTop: '2px', textAlign: 'center', fontSize: '0.62rem', color: '#1d4ed8' }}>
                              {formData.companyName && allCompanies[formData.companyName]?.address && <div>{allCompanies[formData.companyName].address}</div>}
                              {(formData.footerContact || (formData.companyName && allCompanies[formData.companyName]?.footerContact)) && (
                                <div>{formData.footerContact || allCompanies[formData.companyName]?.footerContact}</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    /* LIVE WO PREVIEW (FULL RICH LETTER DESIGN SCALED) */
                    <>
                      <div>
                        {/* Header Top: GSTIN */}
                        {formData.headerGstin && (
                          <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '3px', fontSize: '0.76rem' }}>
                            GSTIN : {formData.headerGstin}
                          </div>
                        )}

                        {/* Header Row: Logo + Company Title */}
                        {formData.companyName && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '6px',
                            width: '100%'
                          }}>
                            {allCompanies[formData.companyName]?.logo && (
                              <img
                                src={allCompanies[formData.companyName].logo}
                                alt="Logo"
                                style={{ height: '42px', maxWidth: '50px', objectFit: 'contain', marginRight: '8px' }}
                              />
                            )}
                            <h1 style={{
                              fontSize: '1.5rem',
                              fontWeight: 'bold',
                              color: allCompanies[formData.companyName]?.textColor || '#1e293b',
                              fontFamily: '"Baloo 2", "Arial Black", "Segoe UI", sans-serif',
                              lineHeight: 1,
                              margin: 0,
                              whiteSpace: 'nowrap'
                            }}>
                              {formData.companyName}
                            </h1>
                          </div>
                        )}

                        {/* Document Title & Date */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginBottom: '6px' }}>
                          <tbody>
                            <tr style={{ verticalAlign: 'middle', border: 'none' }}>
                              <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: 0, border: 'none' }}>
                                {formData.orderTitle && (
                                  <span style={{
                                    fontSize: '0.95rem',
                                    fontWeight: 'bold',
                                    borderBottom: '1.2px solid #000000',
                                    paddingBottom: '3px',
                                    display: 'inline-block',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em'
                                  }}>
                                    {formData.orderTitle}
                                  </span>
                                )}
                              </td>
                              <td style={{ width: '110px', textAlign: 'right', verticalAlign: 'middle', padding: 0, fontWeight: 'bold', fontSize: '0.78rem', color: '#000000', whiteSpace: 'nowrap', border: 'none' }}>
                                {formData.date ? `Date - ${formData.date.split('-').reverse().join('-')}` : ''}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Order No */}
                        {formData.workOrderNo && (
                          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                            Order No: {formData.workOrderNo}
                          </div>
                        )}

                        {/* Receiver (To) Block */}
                        {(formData.buyerName || formData.buyerAddress || formData.buyerDistState) && (
                          <div style={{ marginBottom: '5px', lineHeight: '1.3', fontSize: '11px' }}>
                            <p style={{ margin: '0 0 1px 0' }}>To,</p>
                            {formData.buyerName && <p style={{ margin: '0 0 1px 0', fontWeight: 'bold' }}>{formData.buyerName}</p>}
                            {formData.buyerAddress && <p style={{ margin: '0 0 1px 0', whiteSpace: 'pre-wrap' }}>{formData.buyerAddress}</p>}
                            {formData.buyerDistState && <p style={{ margin: 0 }}>Dist :- {formData.buyerDistState}</p>}
                          </div>
                        )}

                        {/* Subject */}
                        {formData.subject && (
                          <p style={{ margin: '0 0 4px 0', fontSize: '11px' }}>
                            <span style={{ fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px' }}>
                              Subject: - {formData.subject}
                            </span>
                          </p>
                        )}

                        <p style={{ margin: '0 0 3px 0', fontSize: '11px' }}>Dear Sir,</p>
                        <p style={{ margin: '0 0 6px 0', fontSize: '11px' }}>
                          With Reference to telephonic discussion, we are pleased to give you a work order for Transporting Work of coal.
                        </p>

                        {/* Specifications Table */}
                        <table style={{ width: '96%', margin: '0 auto 6px auto', borderCollapse: 'collapse', lineHeight: '1.28', border: 'none', fontSize: '11px' }}>
                          <tbody>
                            {visibleSpecs.commodity && formData.commodity && <tr><td style={{ width: '42%', padding: '1.5px 0', border: 'none' }}>Name of Commodity</td><td style={{ width: '8%', border: 'none' }}>:-</td><td style={{ border: 'none' }}><b>{formData.commodity}</b></td></tr>}
                            {visibleSpecs.mines && formData.mines && <tr><td style={{ padding: '1.5px 0', border: 'none' }}>Mines</td><td style={{ border: 'none' }}>:-</td><td style={{ border: 'none' }}>{formData.mines}</td></tr>}
                            {visibleSpecs.price && formData.price && <tr><td style={{ verticalAlign: 'top', padding: '1.5px 0', border: 'none' }}>Price</td><td style={{ verticalAlign: 'top', border: 'none' }}>:-</td><td style={{ whiteSpace: 'pre-wrap', fontWeight: 'bold', border: 'none' }}>{formData.price}</td></tr>}
                            {visibleSpecs.quantity && formData.quantity && <tr><td style={{ padding: '1.5px 0', border: 'none' }}>Quantity</td><td style={{ border: 'none' }}>:-</td><td style={{ border: 'none' }}><b>{formData.quantity}</b></td></tr>}
                            {visibleSpecs.fcGuarantee && formData.fcGuarantee && <tr><td style={{ padding: '1.5px 0', border: 'none' }}>FC Guarantee</td><td style={{ border: 'none' }}>:-</td><td style={{ border: 'none' }}>{formData.fcGuarantee}</td></tr>}
                            {visibleSpecs.shortageTolerance && formData.shortageTolerance && <tr><td style={{ padding: '1.5px 0', border: 'none' }}>Shortage Tolerance</td><td style={{ border: 'none' }}>:-</td><td style={{ border: 'none' }}>{formData.shortageTolerance}</td></tr>}
                            {visibleSpecs.doDueDate && formData.doDueDate && <tr><td style={{ padding: '1.5px 0', border: 'none' }}>D.O.Due Date</td><td style={{ border: 'none' }}>:-</td><td style={{ border: 'none' }}>{formData.doDueDate}</td></tr>}
                            {visibleSpecs.doCopy && formData.doCopy && <tr><td style={{ padding: '1.5px 0', border: 'none' }}>D.O.Copy</td><td style={{ border: 'none' }}>:-</td><td style={{ border: 'none' }}>{formData.doCopy}</td></tr>}
                            {visibleSpecs.destinationAdd && formData.destinationAdd && <tr><td style={{ padding: '1.5px 0', border: 'none' }}>Destination Add.</td><td style={{ border: 'none' }}>:-</td><td style={{ border: 'none' }}>{formData.destinationAdd}</td></tr>}
                            {visibleSpecs.note && formData.note && <tr><td style={{ verticalAlign: 'top', padding: '1.5px 0', border: 'none' }}>Note</td><td style={{ verticalAlign: 'top', border: 'none' }}>:-</td><td style={{ whiteSpace: 'pre-wrap', border: 'none' }}>{formData.note}</td></tr>}
                            {/* Dynamic Custom Fields */}
                            {Array.isArray(formData.customFields) && formData.customFields.filter(f => f && (f.label || f.value)).map((cf, cIdx) => (
                              <tr key={cIdx}>
                                <td style={{ padding: '1.5px 0', border: 'none' }}>{cf.label || '—'}</td>
                                <td style={{ border: 'none' }}>:-</td>
                                <td style={{ border: 'none' }}><b>{cf.value || '—'}</b></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Terms */}
                        {formData.terms && (
                          <div style={{ marginTop: '4px', fontSize: '10.5px', lineHeight: '1.25' }}>
                            <span style={{ fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px', display: 'inline-block', marginBottom: '3px' }}>
                              Term & Conditions
                            </span>
                            <div style={{ paddingLeft: '8px', whiteSpace: 'pre-wrap' }}>{formData.terms}</div>
                          </div>
                        )}
                      </div>

                      {/* Footer & Signature */}
                      {(formData.companyName || formData.signatoryName || formData.signatureDataUrl || formData.address) && (
                        <div style={{ marginTop: 'auto', paddingTop: '8px', fontSize: '11px' }}>
                          <p style={{ fontWeight: 'bold', margin: '0 0 2px 0' }}>For {formData.companyName || ''}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '3px' }}>
                            <div>
                              <p style={{ fontWeight: 'bold', margin: '0', whiteSpace: 'nowrap' }}>{formData.signatoryName || ''}</p>
                              <p style={{ margin: '0', fontSize: '0.68rem', color: '#334155' }}>{formData.signatoryTitle || ''}</p>
                            </div>
                            {(formData.signatureDataUrl || (formData.companyName && allCompanies[formData.companyName]?.signature)) && (
                              <img 
                                src={formData.signatureDataUrl || allCompanies[formData.companyName]?.signature} 
                                alt="Signature" 
                                style={{ height: '42px', maxWidth: '110px', objectFit: 'contain' }} 
                              />
                            )}
                          </div>
                          {((formData.companyName && allCompanies[formData.companyName]?.address) || formData.footerContact || (formData.companyName && allCompanies[formData.companyName]?.footerContact)) && (
                            <div style={{ borderTop: '1px solid #ccc', marginTop: '3px', paddingTop: '2px', textAlign: 'center', fontSize: '0.62rem', color: '#1d4ed8' }}>
                              {formData.companyName && allCompanies[formData.companyName]?.address && <div>{allCompanies[formData.companyName].address}</div>}
                              {(formData.footerContact || (formData.companyName && allCompanies[formData.companyName]?.footerContact)) && (
                                <div>{formData.footerContact || allCompanies[formData.companyName]?.footerContact}</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="work-order-modal-footer" style={{
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

      {/* Modal: Add New Issuing Company Modal */}
      {newCompanyModal.isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '460px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderBottom: '1px solid #f1f5f9',
              background: 'linear-gradient(to right, #fef2f2, #ffffff)'
            }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Company Master</span>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0' }}>Add New Issuing Company</h3>
              </div>
              <button
                type="button"
                onClick={() => setNewCompanyModal({ isOpen: false, name: '', gstin: '', address: '', footerContact: '', signatoryName: '' })}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '11px', maxHeight: '72vh', overflowY: 'auto' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Company Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newCompanyModal.name}
                  onChange={e => setNewCompanyModal(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. M/s Maa Sharda Transport"
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '7px 10px', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                  GSTIN
                </label>
                <input
                  type="text"
                  value={newCompanyModal.gstin}
                  onChange={e => setNewCompanyModal(prev => ({ ...prev, gstin: e.target.value }))}
                  placeholder="e.g. 22AAAAA0000A1Z5"
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '7px 10px', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Registered Address
                </label>
                <textarea
                  rows={2}
                  value={newCompanyModal.address}
                  onChange={e => setNewCompanyModal(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Office address / location..."
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '7px 10px', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Footer Contact Info
                </label>
                <input
                  type="text"
                  value={newCompanyModal.footerContact}
                  onChange={e => setNewCompanyModal(prev => ({ ...prev, footerContact: e.target.value }))}
                  placeholder="e.g. Mo.: 9876543210, E-mail: info@example.com"
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '7px 10px', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Default Signatory Name / Firm
                </label>
                <input
                  type="text"
                  value={newCompanyModal.signatoryName}
                  onChange={e => setNewCompanyModal(prev => ({ ...prev, signatoryName: e.target.value }))}
                  placeholder="e.g. Authorized Signatory"
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '7px 10px', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Signature / Stamp Image
                </label>
                <div
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
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setNewCompanyModal(prev => ({ ...prev, signature: ev.target.result }));
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 5 }}
                  />
                  {newCompanyModal.signature ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 10 }}>
                      <img 
                        src={newCompanyModal.signature} 
                        alt="Signature Preview" 
                        style={{ height: '32px', maxWidth: '120px', objectFit: 'contain' }} 
                      />
                      <span
                        style={{ fontSize: '0.72rem', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setNewCompanyModal(prev => ({ ...prev, signature: '' })); }}>
                        Remove
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                      Click to upload Signature / Stamp (PNG, JPG)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              padding: '14px 20px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0'
            }}>
              <button
                type="button"
                onClick={() => setNewCompanyModal({ isOpen: false, name: '', gstin: '', address: '', footerContact: '', signatoryName: '', signature: '' })}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.82rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const compName = (newCompanyModal.name || '').trim();
                  if (!compName) {
                    toast.error('Company Name is required');
                    return;
                  }
                  const newComp = {
                    name: compName,
                    gstin: (newCompanyModal.gstin || '').trim(),
                    address: (newCompanyModal.address || '').trim(),
                    footerContact: (newCompanyModal.footerContact || '').trim(),
                    signatoryName: (newCompanyModal.signatoryName || compName).trim(),
                    signature: newCompanyModal.signature || '',
                    textColor: '#1e293b'
                  };
                  const updated = { ...customCompanies, [compName]: newComp };
                  setCustomCompanies(updated);
                  try {
                    localStorage.setItem('CUSTOM_ISSUING_COMPANIES', JSON.stringify(updated));
                  } catch (e) {
                    console.error(e);
                  }
                  // Select newly added company into form
                  setFormData(prev => ({
                    ...prev,
                    companyName: compName,
                    buyerGst: newComp.gstin || prev.buyerGst,
                    address: newComp.address || prev.address,
                    footerContact: newComp.footerContact || prev.footerContact,
                    signatoryName: newComp.signatoryName || prev.signatoryName,
                    signatureDataUrl: newComp.signature || prev.signatureDataUrl || ''
                  }));
                  setNewCompanyModal({ isOpen: false, name: '', gstin: '', address: '', footerContact: '', signatoryName: '', signature: '' });
                  toast.success(`Company "${compName}" added & selected!`);
                }}
                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Save & Select Company
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
              padding: '24px 20px 40px 20px',
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
                    padding: '24px 38px 36px 38px',
                    width: '794px',
                    minHeight: '1123px',
                    height: 'auto',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    fontFamily: '"Times New Roman", Times, serif',
                    boxSizing: 'border-box',
                    fontSize: '13.5px',
                    lineHeight: '1.28',
                    borderRadius: '2px',
                    marginBottom: '20px',
                    position: 'relative'
                  }}
                >
                  {previewData.docType === 'purchase_order' ? (
                    /* ================= PURCHASE ORDER LETTER DESIGN ================= */
                    <>
                      {/* Header Top: GSTIN Right */}
                      {(previewData.headerGstin || previewData.buyerGst) && (
                        <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '4px', fontSize: '0.92rem' }}>
                          GSTIN: {previewData.headerGstin || previewData.buyerGst}
                        </div>
                      )}

                      {/* Header Row: Big Bold Logo + Company Title */}
                      {previewData.companyName && (
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
                            {previewData.companyName}
                          </h1>
                        </div>
                      )}

                      {/* Document Title: PURCHASE ORDER */}
                      {previewData.orderTitle && (
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
                            {previewData.orderTitle}
                          </span>
                        </div>
                      )}

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
                      <div style={{ marginBottom: '10px', lineHeight: '1.38', fontSize: '14.5px' }}>
                        <p style={{ margin: '0 0 2px 0', fontWeight: 'bold' }}>
                          {(previewData.orderTitle || '').toUpperCase().includes('SALE ORDER') || (previewData.orderTitle || '').toUpperCase().includes('SALES ORDER') ? 'FROM,' : 'To,'}
                        </p>
                        {/* 1) Vendor Firm Name */}
                        <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', fontSize: '15px' }}>
                          {previewData.buyerName || 'PH ENTERPRISE'}
                        </p>
                        {/* 2) Vendor Address */}
                        {previewData.buyerAddress && (
                          <p style={{ margin: '0 0 2px 0', whiteSpace: 'pre-wrap' }}>
                            {previewData.buyerAddress}
                          </p>
                        )}
                        {/* 3) Vendor GST No. */}
                        {previewData.vendorGst && (
                          <p style={{ margin: '2px 0 0 0', fontWeight: 'bold' }}>
                            GST NO. {previewData.vendorGst}
                          </p>
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
                          {previewSpecs?.buyer !== false && (previewData.selfFirmName || previewData.address || previewData.buyerGst) && (
                            <tr>
                              <td style={{ width: '32%', padding: '3px 0', verticalAlign: 'top', border: 'none', fontWeight: 600 }}>Buyer</td>
                              <td style={{ width: '6%', verticalAlign: 'top', border: 'none' }}>:</td>
                              <td style={{ padding: '3px 0', verticalAlign: 'top', border: 'none' }}>
                                {previewData.selfFirmName && <div style={{ fontWeight: 600 }}>{previewData.selfFirmName}</div>}
                                {previewData.address && <div style={{ whiteSpace: 'pre-wrap' }}>{previewData.address}</div>}
                                {previewData.buyerGst && <div style={{ fontWeight: 'bold' }}>GST No- <span style={{ fontWeight: 'bold' }}>{previewData.buyerGst}</span></div>}
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

                          {/* Dynamic Custom Fields */}
                          {Array.isArray(previewData.customFields) && previewData.customFields.filter(f => f && (f.label || f.value)).map((cf, cIdx) => (
                            <tr key={cIdx}>
                              <td style={{ padding: '3px 0', border: 'none', fontWeight: 600 }}>{cf.label || '—'}</td>
                              <td style={{ border: 'none' }}>:</td>
                              <td style={{ padding: '3px 0', border: 'none' }}>{cf.value || '—'}</td>
                            </tr>
                          ))}
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
                      <div style={{ marginTop: 'auto', paddingTop: '16px', lineHeight: '1.32', fontSize: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '4px' }}>
                          <div>
                            <p style={{ fontWeight: 'bold', margin: '0' }}>Thanking You</p>
                            <p style={{ margin: '0 0 2px 0' }}>Yours truly</p>
                            <p style={{ fontWeight: 'bold', margin: '0', whiteSpace: 'nowrap' }}>{previewData.signatoryName || previewData.companyName || ''}</p>
                          </div>

                          <div style={{ minHeight: '80px', height: '80px', display: 'flex', alignItems: 'center' }}>
                            {(previewData.signatureDataUrl || (previewData.companyName && activeFirm?.signature)) && (
                              <img 
                                src={previewData.signatureDataUrl || activeFirm?.signature} 
                                alt="Signature" 
                                style={{ height: '70px', maxWidth: '160px', objectFit: 'contain', display: 'block' }} 
                              />
                            )}
                          </div>
                        </div>

                        {((previewData.companyName && allCompanies[previewData.companyName]?.address) || previewData.footerContact || (previewData.companyName && allCompanies[previewData.companyName]?.footerContact)) && (
                          <div style={{ borderTop: '1.5px solid #1e3a8a', marginTop: '6px', paddingTop: '4px', textAlign: 'center', fontSize: '0.74rem', color: '#1d4ed8' }}>
                            {previewData.companyName && allCompanies[previewData.companyName]?.address && (
                              <div style={{ lineHeight: '1.25', whiteSpace: 'normal' }}>
                                {allCompanies[previewData.companyName].address}
                              </div>
                            )}
                            {(previewData.footerContact || (previewData.companyName && allCompanies[previewData.companyName]?.footerContact)) && (
                              <div style={{ lineHeight: '1.25', marginTop: '2px', whiteSpace: 'normal' }}>
                                {previewData.footerContact || allCompanies[previewData.companyName]?.footerContact}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    /* ================= WORK ORDER LETTER DESIGN ================= */
                    (() => {
                      // Dynamically calculate row count to auto-scale font, spacing & signature size
                      const customCount = Array.isArray(previewData.customFields)
                        ? previewData.customFields.filter(f => f && (f.label || f.value)).length
                        : 0;
                      const standardCount = [
                        previewSpecs?.commodity,
                        previewSpecs?.mines,
                        previewSpecs?.price,
                        previewSpecs?.quantity,
                        previewSpecs?.fcGuarantee,
                        previewSpecs?.shortageTolerance,
                        previewSpecs?.doDueDate,
                        previewSpecs?.doCopy,
                        previewSpecs?.destinationAdd,
                        previewSpecs?.note && previewData.note
                      ].filter(Boolean).length;

                      const totalRows = standardCount + customCount;
                      // Dynamic auto-scaling factors:
                      // If rows > 11, scale down progressively so it always fits 1 single page without shrinking excessively
                      const isHighDensity = totalRows > 12;
                      const isMediumDensity = totalRows > 9 && !isHighDensity;

                      const tableFontSize = isHighDensity ? '12.5px' : isMediumDensity ? '13.5px' : '14.5px';
                      const rowPadding = isHighDensity ? '1px 0' : isMediumDensity ? '1.5px 0' : '2px 0';
                      const termsFontSize = isHighDensity ? '12.5px' : isMediumDensity ? '13px' : '14px';
                      const sigHeight = isHighDensity ? '50px' : isMediumDensity ? '60px' : '65px';
                      const headerMarginBottom = isHighDensity ? '4px' : '8px';

                      return (
                    <>
                      {previewData.headerGstin && (
                        <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#1e3a8a', marginBottom: isHighDensity ? '2px' : '6px', fontSize: isHighDensity ? '0.82rem' : '0.9rem' }}>
                          GSTIN : {previewData.headerGstin}
                        </div>
                      )}

                      {/* Header Row: Logo at Left, followed immediately by Big Bold Company Title */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: headerMarginBottom,
                        width: '100%'
                      }}>
                        {activeFirm.logo && (
                          <div style={{
                            width: isHighDensity ? '85px' : '105px',
                            height: isHighDensity ? '75px' : '92px',
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
                                height: isHighDensity ? '72px' : '90px',
                                width: isHighDensity ? '80px' : '100px',
                                objectFit: 'contain',
                                display: 'block'
                              }}
                            />
                          </div>
                        )}
                        <h1 style={{
                          fontSize: activeFirm.name.length > 20 
                            ? (isHighDensity ? '2.3rem' : '2.8rem') 
                            : (isHighDensity ? '2.8rem' : '3.3rem'),
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
                      <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginBottom: isHighDensity ? '4px' : '8px' }}>
                        <tbody>
                          <tr style={{ verticalAlign: 'middle', border: 'none' }}>
                            <td style={{ width: '120px', padding: 0, border: 'none' }}></td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: 0, border: 'none' }}>
                              <span style={{
                                fontSize: isHighDensity ? '1.18rem' : '1.35rem',
                                fontWeight: 'bold',
                                borderBottom: '1.5px solid #000000',
                                paddingBottom: '3px',
                                display: 'inline-block',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em'
                              }}>
                                {previewData.orderTitle || 'WORK ORDER'}
                              </span>
                            </td>
                            <td style={{ width: '150px', textAlign: 'right', verticalAlign: 'middle', padding: 0, fontWeight: 'bold', fontSize: isHighDensity ? '0.84rem' : '0.92rem', color: '#000000', whiteSpace: 'nowrap', border: 'none' }}>
                              Date - {previewData.date ? previewData.date.split('-').reverse().join('-') : ''}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <div style={{ marginBottom: isHighDensity ? '3px' : '6px', lineHeight: '1.25', fontSize: isHighDensity ? '13px' : '14.5px' }}>
                        <p style={{ margin: '0 0 1px 0' }}>To,</p>
                        <p style={{ margin: '0 0 1px 0', fontWeight: 'bold' }}>{previewData.buyerName}</p>
                        <p style={{ margin: '0 0 1px 0', whiteSpace: 'pre-wrap' }}>{previewData.buyerAddress}</p>
                        {previewData.buyerDistState && <p style={{ margin: 0 }}>Dist :- {previewData.buyerDistState}</p>}
                      </div>

                      <p style={{ marginBottom: isHighDensity ? '3px' : '6px' }}>
                        <span style={{
                          fontWeight: 'bold',
                          borderBottom: '1.2px solid #000000',
                          paddingBottom: '3px',
                          display: 'inline-block',
                          fontSize: isHighDensity ? '13.5px' : '15px'
                        }}>
                          Subject: - {previewData.subject}
                        </span>
                      </p>
                      <p style={{ marginBottom: isHighDensity ? '2px' : '4px', fontSize: isHighDensity ? '13px' : '14.5px' }}>Dear Sir,</p>
                      <p style={{ marginBottom: isHighDensity ? '4px' : '8px', fontSize: isHighDensity ? '13px' : '14.5px' }}>With Reference to telephonic discussion, we are pleased to give you a work order for Transporting Work of coal.</p>

                      <table style={{ width: '92%', margin: '0 auto 6px auto', borderCollapse: 'collapse', lineHeight: '1.25', border: 'none', fontSize: tableFontSize }}>
                        <tbody>
                          {previewSpecs?.commodity && <tr><td style={{ width: '40%', padding: rowPadding, border: 'none' }}>Name of Commodity</td><td style={{ width: '10%', border: 'none' }}>:-</td><td style={{ border: 'none' }}><b>{previewData.commodity}</b></td></tr>}
                          {previewSpecs?.mines && <tr><td style={{ padding: rowPadding, border: 'none' }}>Mines</td><td style={{ border: 'none' }}>:-</td><td style={{ border: 'none' }}>{previewData.mines}</td></tr>}
                          {previewSpecs?.price && <tr><td style={{ verticalAlign: 'top', padding: rowPadding, border: 'none' }}>Price</td><td style={{ verticalAlign: 'top', border: 'none' }}>:-</td><td style={{ whiteSpace: 'pre-wrap', fontWeight: 'bold', border: 'none' }}>{previewData.price}</td></tr>}
                          {previewSpecs?.quantity && <tr><td style={{ padding: rowPadding, border: 'none' }}>Quantity</td><td style={{ border: 'none' }}>:-</td><td style={{ border: 'none' }}><b>{previewData.quantity}</b></td></tr>}
                          {previewSpecs?.fcGuarantee && <tr><td style={{ padding: rowPadding, border: 'none' }}>FC Guarantee</td><td style={{ border: 'none' }}>:-</td><td style={{ border: 'none' }}>{previewData.fcGuarantee}</td></tr>}
                          {previewSpecs?.shortageTolerance && <tr><td style={{ padding: rowPadding, border: 'none' }}>Shortage Tolerance</td><td style={{ border: 'none' }}>:-</td><td style={{ border: 'none' }}>{previewData.shortageTolerance}</td></tr>}
                          {previewSpecs?.doDueDate && <tr><td style={{ padding: rowPadding, border: 'none' }}>D.O.Due Date</td><td style={{ border: 'none' }}>:-</td><td style={{ border: 'none' }}>{previewData.doDueDate}</td></tr>}
                          {previewSpecs?.doCopy && <tr><td style={{ padding: rowPadding, border: 'none' }}>D.O.Copy</td><td style={{ border: 'none' }}>:-</td><td style={{ border: 'none' }}>{previewData.doCopy}</td></tr>}
                          {previewSpecs?.destinationAdd && <tr><td style={{ padding: rowPadding, border: 'none' }}>Destination Add.</td><td style={{ border: 'none' }}>:-</td><td style={{ border: 'none' }}>{previewData.destinationAdd}</td></tr>}
                          {previewSpecs?.note && previewData.note && <tr><td style={{ verticalAlign: 'top', padding: rowPadding, border: 'none' }}>Note</td><td style={{ verticalAlign: 'top', border: 'none' }}>:-</td><td style={{ whiteSpace: 'pre-wrap', border: 'none' }}>{previewData.note}</td></tr>}
                          {/* Dynamic Custom Fields */}
                          {Array.isArray(previewData.customFields) && previewData.customFields.filter(f => f && (f.label || f.value)).map((cf, cIdx) => (
                            <tr key={cIdx}>
                              <td style={{ padding: rowPadding, border: 'none' }}>{cf.label || '—'}</td>
                              <td style={{ border: 'none' }}>:-</td>
                              <td style={{ border: 'none' }}><b>{cf.value || '—'}</b></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <h3 style={{ margin: '0 0 3px 0', fontSize: isHighDensity ? '0.95rem' : '1.05rem' }}>
                        <span style={{
                          fontWeight: 'bold',
                          borderBottom: '1.2px solid #000000',
                          paddingBottom: '3px',
                          display: 'inline-block'
                        }}>
                          Term & Conditions
                        </span>
                      </h3>
                      <div style={{ paddingLeft: '14px', marginBottom: isHighDensity ? '3px' : '6px', lineHeight: '1.26', whiteSpace: 'pre-wrap', fontSize: termsFontSize }}>{previewData.terms}</div>

                      <div style={{ marginTop: 'auto', paddingTop: isHighDensity ? '6px' : '10px', lineHeight: '1.24', fontSize: termsFontSize }}>
                        <p style={{ fontWeight: 'bold', margin: '0 0 2px 0' }}>For {previewData.companyName}</p>
                        <div style={{ minHeight: sigHeight, height: sigHeight, display: 'flex', alignItems: 'center', marginTop: '1px', marginBottom: '1px' }}>
                          {(previewData.signatureDataUrl || activeFirm?.signature) && (
                            <img 
                              src={previewData.signatureDataUrl || activeFirm?.signature} 
                              alt="Signature" 
                              style={{ height: sigHeight, maxWidth: '200px', objectFit: 'contain' }}
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
                        <div style={{ borderTop: '1.5px solid #ccc', marginTop: isHighDensity ? '3px' : '6px', paddingTop: '3px', textAlign: 'center', fontSize: '0.72rem', color: '#1d4ed8' }}>
                          <div style={{ lineHeight: '1.2', whiteSpace: 'normal', wordBreak: 'break-word' }}>{previewData.address}</div>
                          <div style={{ lineHeight: '1.2', marginTop: '1px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{previewData.footerContact}</div>
                        </div>
                      </div>
                    </>
                      );
                    })()
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
