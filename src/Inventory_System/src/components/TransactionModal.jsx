import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from './Modal';
import { SvgIcon, IC, fmt, inr, today } from '../utils/helpers';
import { PFX, TT, REASONS, SRR } from '../utils/constants';

const TTAB = [
  ['OUT', '↑', 'Sale', 'Dispatch to customer'],
  ['IN', '↓', 'Purchase', 'Receipt from supplier'],
  ['JOB', '⚙', 'Job Card', 'Production'],
  ['SR', '↩', 'Sales Return', 'Back from customer'],
  ['REJ', '↪', 'Purchase Return', 'Back to supplier'],
  ['TRF', '⇄', 'Transfer', 'Between locations']
];

export default function TransactionModal({ defaultType = 'OUT', txnId, preData, onClose, onSaved }) {
  const {
    data,
    setData,
    visibleFirms,
    visibleLocs,
    visibleItems,
    cx,
    operatorName,
    nextId,
    chkNeg,
    showToast,
    showError
  } = useApp();

  const isEdit = !!txnId;
  const existingTxn = isEdit ? data.txns.find(x => x.id === txnId) : null;

  const [type, setType] = useState(existingTxn ? existingTxn.type : defaultType);
  const [firm, setFirm] = useState(() => existingTxn?.firm || preData?.firm || visibleFirms[0]?.id || '');
  const [date, setDate] = useState(() => existingTxn?.date || preData?.date || today());
  const [loc, setLoc] = useState(() => existingTxn?.loc || preData?.loc || visibleLocs[0]?.id || '');
  const [toLoc, setToLoc] = useState(() => existingTxn?.toLoc || preData?.toLoc || visibleLocs[1]?.id || '');
  const [party, setParty] = useState(() => existingTxn?.party || preData?.party || '');
  const [dest, setDest] = useState(() => existingTxn?.dest || preData?.dest || '');
  const [challan, setChallan] = useState(() => existingTxn?.challan || preData?.challan || '');
  const [inv, setInv] = useState(() => existingTxn?.inv || preData?.inv || '');
  const [veh, setVeh] = useState(() => existingTxn?.veh || preData?.veh || '');
  const [ref, setRef] = useState(() => existingTxn?.ref || preData?.ref || '');
  const [rem, setRem] = useState(() => existingTxn?.rem || preData?.rem || '');
  const [bdt, setBdt] = useState(() => existingTxn?.bdt ? existingTxn.bdt.slice(0, 10) : '');
  const [trn, setTrn] = useState(() => existingTxn?.trn || '');
  const [qGcv, setQGcv] = useState(() => existingTxn?.q?.gcv || '');
  const [qTm, setQTm] = useState(() => existingTxn?.q?.tm || '');
  const [qAsh, setQAsh] = useState(() => existingTxn?.q?.ash || '');
  const [against, setAgainst] = useState(() => existingTxn?.against || '');
  const [reason, setReason] = useState(() => existingTxn?.reason || REASONS[0]);

  // Job card specific
  const [fgc, setFgc] = useState(() => existingTxn?.fgc || preData?.fgc || '');
  const [batches, setBatches] = useState(() => {
    if (existingTxn?.batches?.length) return existingTxn.batches;
    return [{ lines: [{}], nb: '', rb: '', rm: '' }];
  });
  const [prod, setProd] = useState(() => {
    if (existingTxn?.prod?.length) return existingTxn.prod;
    if (preData?.prod?.length) return preData.prod;
    return [{}];
  });

  // Standard line items (IN, OUT, SR, REJ, TRF)
  const [lines, setLines] = useState(() => {
    if (existingTxn?.lines?.length) return existingTxn.lines;
    if (preData?.lines?.length) return preData.lines;
    return [{}];
  });

  // Helpers
  const nextNo = (ty) => {
    const maxNo = Math.max(0, ...data.txns.filter(x => x.type === ty).map(x => +String(x.no).split('-').pop() || 0));
    return (PFX[ty] || ty) + '-' + String(maxNo + 1).padStart(4, '0');
  };

  const nextChallan = () => {
    const maxCh = Math.max(0, ...data.txns.filter(t => t.type === 'OUT' && /^CH-/.test(t.challan || '')).map(t => +t.challan.split('-').pop() || 0));
    return 'CH-' + new Date().getFullYear() + '-' + String(maxCh + 1).padStart(3, '0');
  };

  const availableSkus = (k) => {
    return visibleItems.filter(i =>
      i.firm === firm &&
      (i.status !== 'Inactive' || isEdit) &&
      (k !== 'pr' || (i.type === 'FG' && (!fgc || i.cat === fgc)))
    );
  };

  // Standard lines management
  const updateLine = (idx, field, val) => {
    setLines(prev => {
      const up = [...prev];
      up[idx] = { ...up[idx], [field]: val };
      if (field === 'it') {
        const selectedItem = data.items.find(i => i.id === val);
        if (selectedItem && (type === 'IN' || type === 'REJ')) {
          up[idx].rate = selectedItem.rate || '';
        }
      }
      return up;
    });
  };

  const addLine = () => setLines(prev => [...prev, {}]);
  const removeLine = (idx) => {
    setLines(prev => {
      if (prev.length <= 1) return [{}];
      return prev.filter((_, i) => i !== idx);
    });
  };

  // Batch lines management
  const updateBatchLine = (bIdx, lIdx, field, val) => {
    setBatches(prev => {
      const up = [...prev];
      const batchLines = [...(up[bIdx].lines || [])];
      batchLines[lIdx] = { ...batchLines[lIdx], [field]: val };
      up[bIdx] = { ...up[bIdx], lines: batchLines };
      return up;
    });
  };

  const addBatchLine = (bIdx) => {
    setBatches(prev => {
      const up = [...prev];
      up[bIdx] = { ...up[bIdx], lines: [...(up[bIdx].lines || []), {}] };
      return up;
    });
  };

  const removeBatchLine = (bIdx, lIdx) => {
    setBatches(prev => {
      const up = [...prev];
      const batchLines = (up[bIdx].lines || []).filter((_, i) => i !== lIdx);
      up[bIdx] = { ...up[bIdx], lines: batchLines.length ? batchLines : [{}] };
      return up;
    });
  };

  const addBatch = () => {
    setBatches(prev => [...prev, { lines: [{}], nb: '', rb: '', rm: '' }]);
  };

  const removeBatch = (bIdx) => {
    if (batches.length <= 1) {
      showError('A job card needs at least one batch');
      return;
    }
    setBatches(prev => prev.filter((_, i) => i !== bIdx));
  };

  // Prod lines management
  const updateProdLine = (idx, field, val) => {
    setProd(prev => {
      const up = [...prev];
      up[idx] = { ...up[idx], [field]: val };
      return up;
    });
  };

  const addProdLine = () => setProd(prev => [...prev, {}]);
  const removeProdLine = (idx) => {
    setProd(prev => {
      if (prev.length <= 1) return [{}];
      return prev.filter((_, i) => i !== idx);
    });
  };

  // Totals calculations
  const totalQty = lines.reduce((acc, l) => acc + (+l.qty || 0), 0);
  const totalBilled = lines.reduce((acc, l) => acc + (+l.billed || 0), 0);
  const totalVal = lines.reduce((acc, l) => acc + (+l.qty || 0) * (+l.rate || 0), 0);
  const totalShortage = lines.reduce((acc, l) => acc + ((+l.billed || 0) ? (+l.billed - +l.qty) : 0), 0);

  const jobInput = batches.flatMap(b => b.lines || []).reduce((acc, l) => acc + (+l.qty || 0), 0);
  const jobOutput = prod.reduce((acc, l) => acc + (+l.qty || 0), 0);
  const jobScrap = prod.reduce((acc, l) => acc + (+l.scrap || 0), 0);
  const jobLoss = jobInput - jobOutput - jobScrap;

  // Validation & Save
  const handleSave = () => {
    if (!firm) return showError('Select a firm you have access to');
    if (!date) return showError('Enter the date');
    if (date > today()) return showError('Date cannot be in the future');
    if (!loc) return showError('Select a location');

    const cleanLines = (arr, isPr = false) =>
      arr
        .map(l => ({
          it: l.it || '',
          qty: +l.qty || 0,
          billed: +l.billed || 0,
          rate: +l.rate || 0,
          scrap: +l.scrap || 0
        }))
        .filter(l => l.it || l.qty);

    const validateList = (list, title = 'material') => {
      if (!list.length) return `Add at least one ${title}`;
      if (list.some(l => !l.it)) return `Select a SKU on every ${title} line`;
      if (list.some(l => l.qty <= 0)) return `Quantity must be greater than 0 on every ${title} line`;
      if (list.some(l => l.billed < 0 || l.rate < 0 || l.scrap < 0)) return 'Values cannot be negative';
      return '';
    };

    const finalTxn = {
      type,
      firm,
      date,
      op: existingTxn?.op || operatorName,
      rem: rem.trim(),
      ref: ref.trim(),
      loc
    };

    if (type === 'IN') {
      const parsedLines = cleanLines(lines);
      if (!party.trim()) return showError('Enter the supplier');
      if (!inv.trim()) return showError('Enter the invoice number');
      if (bdt && bdt > date) return showError('Billing date cannot be after the receiving date');
      if (+qTm > 100 || +qAsh > 100) return showError('Moisture / ash % cannot exceed 100');

      if (
        data.txns.some(
          x =>
            x.id !== txnId &&
            x.type === 'IN' &&
            x.party.toLowerCase() === party.trim().toLowerCase() &&
            String(x.inv).toLowerCase() === inv.trim().toLowerCase()
        )
      ) {
        return showError(`Invoice ${inv} from ${party} is already posted`);
      }

      const lErr = validateList(parsedLines);
      if (lErr) return showError(lErr);

      Object.assign(finalTxn, {
        bdt,
        party: party.trim(),
        inv: inv.trim(),
        veh: veh.trim(),
        trn: trn.trim(),
        q: { gcv: +qGcv || 0, tm: +qTm || 0, ash: +qAsh || 0 },
        lines: parsedLines
      });
    } else if (type === 'OUT') {
      const parsedLines = cleanLines(lines);
      const chNo = challan.trim() || nextChallan();
      if (!party.trim()) return showError('Enter the party');
      if (!dest.trim()) return showError('Enter the destination');
      if (!chNo) return showError('Enter the challan number');

      if (
        data.txns.some(
          x =>
            x.id !== txnId &&
            x.type === 'OUT' &&
            x.firm === firm &&
            String(x.challan).toLowerCase() === chNo.toLowerCase()
        )
      ) {
        return showError(`Challan ${chNo} already exists`);
      }

      const lErr = validateList(parsedLines);
      if (lErr) return showError(lErr);

      Object.assign(finalTxn, {
        party: party.trim(),
        dest: dest.trim(),
        challan: chNo,
        inv: inv.trim(),
        veh: veh.trim(),
        lines: parsedLines
      });
    } else if (type === 'JOB') {
      if (!fgc) return showError('Select the FG category');
      const parsedBatches = batches.map(b => ({
        lines: cleanLines(b.lines || []),
        nb: +b.nb || 0,
        rb: +b.rb || 0,
        rm: (b.rm || '').trim()
      }));

      for (let i = 0; i < parsedBatches.length; i++) {
        const b = parsedBatches[i];
        const bErr = validateList(b.lines, `batch ${i + 1}`);
        if (bErr) return showError(bErr);
        if (b.nb && b.rb > b.nb) {
          return showError(`Batch ${i + 1}: remaining batches cannot exceed no. of batches`);
        }
      }

      const parsedProd = cleanLines(prod, true);
      const pErr = validateList(parsedProd, 'production output');
      if (pErr) return showError(pErr);

      Object.assign(finalTxn, {
        fgc,
        batches: parsedBatches,
        prod: parsedProd
      });
    } else if (type === 'REJ') {
      const parsedLines = cleanLines(lines);
      if (!party.trim()) return showError('Enter the supplier');
      const lErr = validateList(parsedLines);
      if (lErr) return showError(lErr);

      Object.assign(finalTxn, {
        party: party.trim(),
        against: against.trim(),
        reason,
        lines: parsedLines
      });
    } else if (type === 'SR') {
      const parsedLines = cleanLines(lines);
      if (!party.trim()) return showError('Enter the customer');
      const lErr = validateList(parsedLines);
      if (lErr) return showError(lErr);

      Object.assign(finalTxn, {
        party: party.trim(),
        against: against.trim(),
        reason,
        lines: parsedLines
      });
    } else if (type === 'TRF') {
      const parsedLines = cleanLines(lines);
      if (!loc || !toLoc) return showError('Select from and to locations');
      if (loc === toLoc) return showError('From and to locations must be different');
      const lErr = validateList(parsedLines);
      if (lErr) return showError(lErr);

      Object.assign(finalTxn, {
        veh: veh.trim(),
        toLoc,
        lines: parsedLines
      });
    }

    finalTxn.id = txnId || nextId();
    finalTxn.no = existingTxn?.no || nextNo(type);

    const allTxns = isEdit
      ? data.txns.map(x => (x.id === txnId ? finalTxn : x))
      : [...data.txns, finalTxn];

    const negError = chkNeg(allTxns);
    if (negError) {
      return showError(negError);
    }

    setData({ ...data, txns: allTxns });
    showToast(`${isEdit ? 'Updated ' : 'Posted '}${finalTxn.no}`);
    if (onSaved) onSaved(finalTxn);
    onClose();
  };

  const fgCategories = [...new Set(data.items.filter(i => i.firm === firm && i.type === 'FG').map(i => i.cat))];
  const suppliers = data.parties.filter(p => p.role === 'Supplier' || p.role === 'Both');
  const customers = data.parties.filter(p => p.role === 'Customer' || p.role === 'Both');
  const purchaseInvoices = [...new Set(data.txns.filter(t => t.type === 'IN' && t.firm === firm).map(t => t.inv).filter(Boolean))];
  const saleChallans = [...new Set(data.txns.filter(t => t.type === 'OUT' && t.firm === firm).flatMap(t => [t.challan, t.inv]).filter(Boolean))];

  return (
    <Modal
      title={existingTxn ? `Edit ${existingTxn.no}` : 'New entry'}
      width="mid"
      okText={existingTxn ? 'Save changes' : 'Save entry'}
      onOk={handleSave}
      onClose={onClose}
      footerExtra={
        <span className="opby">
          Posting as <b>{existingTxn?.op || operatorName}</b>
        </span>
      }
    >
      <div className="ttabs" id="ttabs">
        {TTAB.map(([k, icon, title, subtitle]) => (
          <button
            key={k}
            type="button"
            className={`tt t${k} ${k === type ? 'on' : ''}`}
            disabled={isEdit && k !== type}
            onClick={() => setType(k)}
          >
            <span>{icon}</span>
            <b>{title}</b>
            <small>{subtitle}</small>
          </button>
        ))}
      </div>

      <div id="txb">
        {/* Top common inputs */}
        <div className="g3">
          {visibleFirms.length > 1 ? (
            <div className="fg">
              <label>Firm *</label>
              <select value={firm} onChange={e => setFirm(e.target.value)}>
                {visibleFirms.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input type="hidden" value={firm} />
          )}

          <div className="fg">
            <label>Date *</label>
            <input
              type="date"
              max={today()}
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {type === 'IN' && (
            <>
              <div className="fg">
                <label>Supplier *</label>
                <input
                  list="dl_sup_p"
                  value={party}
                  placeholder="Supplier name"
                  onChange={e => setParty(e.target.value)}
                />
              </div>
              <div className="fg">
                <label>Invoice no. *</label>
                <input
                  value={inv}
                  placeholder="e.g. INV-9901"
                  onChange={e => setInv(e.target.value)}
                />
              </div>
              <div className="fg">
                <label>Vehicle / rake no.</label>
                <input
                  value={veh}
                  placeholder="e.g. CG-04-AB-1234"
                  onChange={e => setVeh(e.target.value)}
                />
              </div>
              <div className="fg">
                <label>Location *</label>
                <select value={loc} onChange={e => setLoc(e.target.value)}>
                  <option value="">Select location...</option>
                  {visibleLocs.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {type === 'OUT' && (
            <>
              <div className="fg">
                <label>Party *</label>
                <input
                  list="dl_cus_p"
                  value={party}
                  placeholder="Customer name"
                  onChange={e => setParty(e.target.value)}
                />
              </div>
              <div className="fg">
                <label>Destination *</label>
                <input
                  value={dest}
                  placeholder="e.g. Plant / site"
                  onChange={e => setDest(e.target.value)}
                />
              </div>
              <div className="fg">
                <label>Challan no. *</label>
                <input
                  value={challan}
                  placeholder={nextChallan()}
                  onChange={e => setChallan(e.target.value)}
                />
              </div>
              <div className="fg">
                <label>Invoice no.</label>
                <input
                  value={inv}
                  placeholder="Blank for internal issue"
                  onChange={e => setInv(e.target.value)}
                />
              </div>
              <div className="fg">
                <label>Vehicle no.</label>
                <input
                  value={veh}
                  placeholder="e.g. CG-04-AB-1234"
                  onChange={e => setVeh(e.target.value)}
                />
              </div>
              <div className="fg">
                <label>Location *</label>
                <select value={loc} onChange={e => setLoc(e.target.value)}>
                  <option value="">Select location...</option>
                  {visibleLocs.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {type === 'JOB' && (
            <>
              <div className="fg">
                <label>FG category *</label>
                <select value={fgc} onChange={e => setFgc(e.target.value)}>
                  <option value="">Select...</option>
                  {fgCategories.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label>Plant location *</label>
                <select value={loc} onChange={e => setLoc(e.target.value)}>
                  <option value="">Select location...</option>
                  {visibleLocs.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {type === 'REJ' && (
            <>
              <div className="fg">
                <label>Supplier *</label>
                <input
                  list="dl_sup_p"
                  value={party}
                  placeholder="Supplier name"
                  onChange={e => setParty(e.target.value)}
                />
              </div>
              <div className="fg">
                <label>Against purchase invoice</label>
                <input
                  list="dl_pur_inv"
                  value={against}
                  placeholder="Supplier invoice"
                  onChange={e => setAgainst(e.target.value)}
                />
              </div>
              <div className="fg">
                <label>Reason *</label>
                <select value={reason} onChange={e => setReason(e.target.value)}>
                  {REASONS.map(r => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label>Location *</label>
                <select value={loc} onChange={e => setLoc(e.target.value)}>
                  <option value="">Select location...</option>
                  {visibleLocs.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {type === 'SR' && (
            <>
              <div className="fg">
                <label>Customer *</label>
                <input
                  list="dl_cus_p"
                  value={party}
                  placeholder="Customer name"
                  onChange={e => setParty(e.target.value)}
                />
              </div>
              <div className="fg">
                <label>Against challan / invoice</label>
                <input
                  list="dl_sal_ch"
                  value={against}
                  placeholder="Sale challan or invoice"
                  onChange={e => setAgainst(e.target.value)}
                />
              </div>
              <div className="fg">
                <label>Reason *</label>
                <select value={reason} onChange={e => setReason(e.target.value)}>
                  {SRR.map(r => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label>Received at location *</label>
                <select value={loc} onChange={e => setLoc(e.target.value)}>
                  <option value="">Select location...</option>
                  {visibleLocs.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {type === 'TRF' && (
            <>
              <div className="fg">
                <label>Vehicle no.</label>
                <input
                  value={veh}
                  placeholder="e.g. CG-04-HT-7781"
                  onChange={e => setVeh(e.target.value)}
                />
              </div>
              <div className="fg">
                <label>From location *</label>
                <select value={loc} onChange={e => setLoc(e.target.value)}>
                  <option value="">Select location...</option>
                  {visibleLocs.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label>To location *</label>
                <select value={toLoc} onChange={e => setToLoc(e.target.value)}>
                  <option value="">Select location...</option>
                  {visibleLocs.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Dynamic Line Items Blocks */}
        {type !== 'JOB' ? (
          <>
            <div className="sh">
              {type === 'IN'
                ? 'Materials received'
                : type === 'OUT'
                ? 'Materials issued'
                : type === 'REJ'
                ? 'Materials returned to supplier'
                : type === 'SR'
                ? 'Materials returned by customer'
                : 'Materials transferred'}
            </div>

            <div className={`lhd ${type === 'IN' ? 'g-in' : type === 'TRF' ? 'g-q' : 'g-out'}`}>
              <span>Material SKU</span>
              {type === 'IN' && <span>Billed qty</span>}
              <span>{type === 'SR' ? 'Qty returned *' : 'Qty *'}</span>
              <span>UOM</span>
              {type !== 'TRF' && <span>Rate (₹)</span>}
              <span></span>
            </div>

            <div className="lines">
              {lines.map((l, idx) => {
                const itemObj = data.items.find(i => i.id === l.it);
                const avail = loc && l.it ? (cx[l.it]?.locs[loc] || 0) : null;
                const isShort = type === 'IN' && l.billed && l.qty && l.billed > l.qty;

                return (
                  <div key={idx} className={`ln ${type === 'IN' ? 'g-in' : type === 'TRF' ? 'g-q' : 'g-out'}`}>
                    <div>
                      <select
                        className="l-it"
                        value={l.it || ''}
                        onChange={e => updateLine(idx, 'it', e.target.value)}
                      >
                        <option value="">Select a material SKU...</option>
                        {availableSkus('normal').map(i => (
                          <option key={i.id} value={i.id}>
                            {i.sku} - {i.sub}
                          </option>
                        ))}
                      </select>
                      <div className={`l-h ${isShort ? 'wn' : ''}`}>
                        {itemObj && (
                          type === 'IN' && l.billed && l.qty ? (
                            l.billed > l.qty
                              ? `Shortage ${fmt(l.billed - l.qty)} ${itemObj.unit} (${fmt(((l.billed - l.qty) / l.billed) * 100, 2)}%)`
                              : l.billed < l.qty
                              ? `Excess ${fmt(l.qty - l.billed)} ${itemObj.unit}`
                              : 'Matches bill'
                          ) : avail != null ? (
                            `Available: ${fmt(avail)} ${itemObj.unit}`
                          ) : (
                            `Stock now: ${fmt(cx[l.it]?.cl)} ${itemObj.unit}`
                          )
                        )}
                      </div>
                    </div>

                    {type === 'IN' && (
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="As per bill"
                        value={l.billed ?? ''}
                        onChange={e => updateLine(idx, 'billed', e.target.value)}
                      />
                    )}

                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 100"
                      value={l.qty ?? ''}
                      onChange={e => updateLine(idx, 'qty', e.target.value)}
                    />

                    <input disabled placeholder="-" value={itemObj?.unit || ''} />

                    {type !== 'TRF' && (
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Rate"
                        value={l.rate ?? ''}
                        onChange={e => updateLine(idx, 'rate', e.target.value)}
                      />
                    )}

                    <button
                      type="button"
                      className="x"
                      title="Remove line"
                      onClick={() => removeLine(idx)}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            <button type="button" className="b2 sm" onClick={addLine}>
              <SvgIcon path={IC.plus} /> Add material
            </button>

            <div className="ltot">
              Total qty<b>{fmt(totalQty)}</b>
              {type === 'IN' && totalShortage > 0 && (
                <>
                  Shortage<b>{fmt(totalShortage)}</b>
                </>
              )}
              {type !== 'TRF' && (
                <>
                  Value<b>{inr(totalVal)}</b>
                </>
              )}
            </div>
          </>
        ) : (
          /* Job card mode */
          <>
            <div className="sh">
              Material consumed (batches)
              <button type="button" className="b2 sm" onClick={addBatch}>
                <SvgIcon path={IC.plus} /> Add batch
              </button>
            </div>

            <div id="bts">
              {batches.map((b, bIdx) => (
                <div key={bIdx} className="batch">
                  <div className="bh">
                    <b>Batch detail {bIdx + 1}</b>
                    <button
                      type="button"
                      className="x"
                      title="Remove batch"
                      onClick={() => removeBatch(bIdx)}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="lhd g-q">
                    <span>SKU / Material</span>
                    <span>Qty *</span>
                    <span>UOM</span>
                    <span></span>
                  </div>

                  <div className="lines">
                    {(b.lines || [{}]).map((bl, lIdx) => {
                      const itemObj = data.items.find(i => i.id === bl.it);
                      const avail = loc && bl.it ? (cx[bl.it]?.locs[loc] || 0) : null;
                      return (
                        <div key={lIdx} className="ln g-q">
                          <div>
                            <select
                              value={bl.it || ''}
                              onChange={e => updateBatchLine(bIdx, lIdx, 'it', e.target.value)}
                            >
                              <option value="">Select a material SKU...</option>
                              {availableSkus('normal').map(i => (
                                <option key={i.id} value={i.id}>
                                  {i.sku} - {i.sub}
                                </option>
                              ))}
                            </select>
                            <div className="l-h">
                              {avail != null ? `Available: ${fmt(avail)} ${itemObj?.unit || ''}` : ''}
                            </div>
                          </div>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="e.g. 100"
                            value={bl.qty ?? ''}
                            onChange={e => updateBatchLine(bIdx, lIdx, 'qty', e.target.value)}
                          />
                          <input disabled placeholder="-" value={itemObj?.unit || ''} />
                          <button
                            type="button"
                            className="x"
                            onClick={() => removeBatchLine(bIdx, lIdx)}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    className="b2 sm"
                    onClick={() => addBatchLine(bIdx)}
                  >
                    <SvgIcon path={IC.plus} /> Add material
                  </button>

                  <div className="g3" style={{ marginTop: '10px' }}>
                    <div className="fg">
                      <label>No. of batches</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="e.g. 5"
                        value={b.nb ?? ''}
                        onChange={e => {
                          const val = e.target.value;
                          setBatches(prev => {
                            const up = [...prev];
                            up[bIdx].nb = val;
                            return up;
                          });
                        }}
                      />
                    </div>
                    <div className="fg">
                      <label>Remaining batches</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="e.g. 4"
                        value={b.rb ?? ''}
                        onChange={e => {
                          const val = e.target.value;
                          setBatches(prev => {
                            const up = [...prev];
                            up[bIdx].rb = val;
                            return up;
                          });
                        }}
                      />
                    </div>
                    <div className="fg">
                      <label>Remaining material</label>
                      <input
                        placeholder="e.g. 200 MT"
                        value={b.rm || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setBatches(prev => {
                            const up = [...prev];
                            up[bIdx].rm = val;
                            return up;
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="sh">Production output</div>
            <div className="lhd g-pr">
              <span>Finished goods SKU</span>
              <span>Qty *</span>
              <span>Scraps</span>
              <span>UOM</span>
              <span></span>
            </div>

            <div className="lines">
              {prod.map((pl, idx) => {
                const itemObj = data.items.find(i => i.id === pl.it);
                return (
                  <div key={idx} className="ln g-pr">
                    <select
                      value={pl.it || ''}
                      onChange={e => updateProdLine(idx, 'it', e.target.value)}
                    >
                      <option value="">Select a finished good...</option>
                      {availableSkus('pr').map(i => (
                        <option key={i.id} value={i.id}>
                          {i.sku} - {i.sub}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 100"
                      value={pl.qty ?? ''}
                      onChange={e => updateProdLine(idx, 'qty', e.target.value)}
                    />

                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 5"
                      value={pl.scrap ?? ''}
                      onChange={e => updateProdLine(idx, 'scrap', e.target.value)}
                    />

                    <input disabled placeholder="-" value={itemObj?.unit || ''} />

                    <button
                      type="button"
                      className="x"
                      onClick={() => removeProdLine(idx)}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            <button type="button" className="b2 sm" onClick={addProdLine}>
              <SvgIcon path={IC.plus} /> Add finished good
            </button>

            <div className="yld">
              <div>
                Input (consumed)
                <b>{fmt(jobInput)}</b>
              </div>
              <div>
                Output
                <b>{fmt(jobOutput)}</b>
              </div>
              <div>
                Scraps / rejects
                <b>{fmt(jobScrap)}</b>
              </div>
              <div>
                Yield
                <b>{jobInput ? `${fmt((jobOutput / jobInput) * 100, 1)}%` : '-'}</b>
              </div>
              <div>
                Unaccounted loss
                <b style={{ color: jobLoss < -1e-9 ? '#e5334b' : 'inherit' }}>
                  {fmt(jobLoss)}
                </b>
              </div>
            </div>
          </>
        )}

        {/* Optional More Details Foldout */}
        <details className="more">
          <summary>
            More details <span>optional</span>
          </summary>
          <div className="g3" style={{ marginTop: '10px' }}>
            {type === 'IN' && (
              <>
                <div className="fg">
                  <label>Billing date</label>
                  <input
                    type="date"
                    value={bdt}
                    onChange={e => setBdt(e.target.value)}
                  />
                </div>
                <div className="fg">
                  <label>Transporter / LR no.</label>
                  <input
                    value={trn}
                    placeholder="e.g. Sai Roadlines LR-4471"
                    onChange={e => setTrn(e.target.value)}
                  />
                </div>
                <div className="fg">
                  <label>Reference (PO / WO)</label>
                  <input
                    value={ref}
                    placeholder="e.g. PO-7491"
                    onChange={e => setRef(e.target.value)}
                  />
                </div>
                <div className="fg">
                  <label>GCV (kcal/kg)</label>
                  <input
                    type="number"
                    value={qGcv}
                    placeholder="e.g. 4200"
                    onChange={e => setQGcv(e.target.value)}
                  />
                </div>
                <div className="fg">
                  <label>Total moisture %</label>
                  <input
                    type="number"
                    value={qTm}
                    placeholder="e.g. 9.5"
                    onChange={e => setQTm(e.target.value)}
                  />
                </div>
                <div className="fg">
                  <label>Ash %</label>
                  <input
                    type="number"
                    value={qAsh}
                    placeholder="e.g. 34"
                    onChange={e => setQAAsh(e.target.value)}
                  />
                </div>
              </>
            )}

            {type !== 'IN' && (
              <div className="fg">
                <label>Reference (PO / WO)</label>
                <input
                  value={ref}
                  placeholder="e.g. PO-7491"
                  onChange={e => setRef(e.target.value)}
                />
              </div>
            )}

            <div className="fg full">
              <label>Remarks</label>
              <textarea
                rows={2}
                value={rem}
                placeholder="Optional"
                onChange={e => setRem(e.target.value)}
              />
            </div>
          </div>
        </details>
      </div>

      <datalist id="dl_sup_p">
        {suppliers.map(p => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>
      <datalist id="dl_cus_p">
        {customers.map(p => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>
      <datalist id="dl_pur_inv">
        {purchaseInvoices.map(invNo => (
          <option key={invNo} value={invNo} />
        ))}
      </datalist>
      <datalist id="dl_sal_ch">
        {saleChallans.map(chNo => (
          <option key={chNo} value={chNo} />
        ))}
      </datalist>
    </Modal>
  );
}
