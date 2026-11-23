import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from './Modal';
import { TYPES, BCL, BN } from '../utils/constants';
import { fmt, inr, SvgIcon, IC } from '../utils/helpers';
import { exportData, importFile } from '../utils/excel';

const MLAB = {
  RM: ['Category', 'e.g. Raw Coal, ROM Coal', 'Material name *', 'Select or type raw material name...', 'e.g. RC-G11'],
  FG: ['Category *', 'e.g. Washed Coal, Sized Coal', 'Sub category (grade / size) *', 'e.g. Washed Coal 20-50 mm', 'e.g. WC-2050'],
  TR: ['Category *', 'e.g. Imported Coal, Steam Coal', 'Coal / product name *', 'e.g. Indonesian Coal 4200 GAR', 'e.g. IMP-ID42'],
  ST: ['Category *', 'e.g. Fuel, Spares, Lubricants', 'Item name *', 'e.g. Diesel (HSD)', 'e.g. DSL-HSD']
};

const MDESC = {
  RM: ['⛏', 'Raw Material', 'Bought & processed'],
  FG: ['🏭', 'Finished Goods', 'Made in washery / plant'],
  TR: ['🚢', 'Trading Goods', 'Bought & resold as is'],
  ST: ['🛢', 'Stores', 'Fuel, spares, consumables']
};

export default function MaterialModal({ itemId, keepState, onClose, onSaved }) {
  const { data, setData, visibleFirms, visibleLocs, cx, pc, nextId, chkNeg, showToast, showError } = useApp();

  const isEdit = !!itemId;
  const existingItem = isEdit ? data.items.find(i => i.id === itemId) : null;

  const [form, setForm] = useState(() => {
    if (existingItem) {
      return { ...existingItem };
    }
    return {
      firm: keepState?.firm || visibleFirms[0]?.id || '',
      type: keepState?.type || 'RM',
      cat: keepState?.cat ?? 'Raw Coal',
      sub: '',
      sku: '',
      hsn: '',
      unit: keepState?.unit || 'MT',
      loc: keepState?.loc || visibleLocs[0]?.id || '',
      open: '',
      rate: '',
      adc: '',
      lt: '',
      sf: 0.5,
      moq: '',
      gmin: '',
      amax: '',
      mmax: '',
      size: '',
      sup: '',
      supc: '',
      status: 'Active'
    };
  });

  const [errors, setErrors] = useState({});

  const materialType = form.type || 'RM';
  const labels = MLAB[materialType];
  const itemMetrics = isEdit ? cx[itemId] : null;

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleTypeChange = (newType) => {
    const defaultCats = { RM: 'Raw Coal', FG: 'Washed Coal', TR: '', ST: '' };
    setForm(prev => ({
      ...prev,
      type: newType,
      cat: ['Raw Coal', 'Washed Coal', ''].includes(prev.cat) ? defaultCats[newType] : prev.cat,
      unit: newType !== 'ST' ? 'MT' : prev.unit
    }));
  };

  // Re-order calculation
  const adcVal = +form.adc || 0;
  const ltVal = +form.lt || 0;
  const sfVal = +form.sf || 0;
  const moqVal = +form.moq || 0;
  const openVal = +form.open || 0;
  const rateVal = +form.rate || 0;

  const pCalc = pc({ adc: adcVal, lt: ltVal, sf: sfVal, moq: moqVal });
  const openValuation = openVal && rateVal ? openVal * rateVal : 0;

  // SKU generation
  const generateSku = () => {
    const s = (form.sub || '').trim();
    if (!s) return '';
    const w = s.replace(/[()]/g, ' ').split(/[\s\-/]+/).filter(Boolean);
    const ini = w
      .filter(x => /^[a-z]/i.test(x) && !/^(mm|of|and|the)$/i.test(x))
      .map(x => x[0].toUpperCase())
      .join('')
      .slice(0, 3);
    const dg = (s.match(/\d+/g) || []).join('').slice(0, 4);

    const prefix = { RM: 'RM', FG: 'FG', TR: 'TR', ST: 'ST' }[materialType];
    const base = prefix + '-' + ini + dg;
    let code = base;
    let n = 2;
    while (data.items.some(i => i.id !== itemId && i.firm === form.firm && i.sku.toUpperCase() === code)) {
      code = base + '-' + n++;
    }
    return code;
  };

  const handleAutoSku = () => {
    const generated = generateSku();
    if (!generated) {
      setErrors(prev => ({ ...prev, sub: 'Enter the name first, then generate the SKU' }));
      return;
    }
    setField('sku', generated);
  };

  const handleSupplierChange = (supName) => {
    setField('sup', supName);
    const party = data.parties.find(p => p.name.toLowerCase() === supName.trim().toLowerCase());
    if (party && !form.supc) {
      setField('supc', party.code || '');
    }
  };

  // Validation & Save
  const handleSave = (again = false) => {
    const errMap = {};
    if (!form.firm) errMap.firm = 'Select a firm';
    if (!form.cat) errMap.cat = 'Enter a category';
    if (!form.sub?.trim()) errMap.sub = 'This field is required';
    if (!form.sku?.trim()) errMap.sku = 'Enter or generate a SKU code';
    else if (
      data.items.some(
        i => i.id !== itemId && i.firm === form.firm && i.sku.toUpperCase() === form.sku.trim().toUpperCase()
      )
    ) {
      errMap.sku = 'This SKU already exists in this firm';
    }

    ['open', 'adc', 'lt', 'sf', 'moq', 'rate', 'gmin', 'amax', 'mmax'].forEach(k => {
      if (+form[k] < 0) errMap[k] = 'Cannot be negative';
    });

    if (+form.amax > 100) errMap.amax = 'Ash % cannot exceed 100';
    if (+form.mmax > 100) errMap.mmax = 'Moisture % cannot exceed 100';

    if (Object.keys(errMap).length > 0) {
      setErrors(errMap);
      showError(`Fix the ${Object.keys(errMap).length} highlighted fields`);
      return;
    }

    const payload = {
      ...form,
      sku: form.sku.trim().toUpperCase(),
      sub: form.sub.trim(),
      open: +form.open || 0,
      adc: +form.adc || 0,
      lt: +form.lt || 0,
      sf: +form.sf || 0,
      moq: +form.moq || 0,
      rate: +form.rate || 0,
      gmin: +form.gmin || 0,
      amax: +form.amax || 0,
      mmax: +form.mmax || 0
    };

    if (isEdit) {
      const it = existingItem;
      const backup = { ...it };
      if (it.firm !== payload.firm && data.txns.some(t => t.firm === backup.firm && JSON.stringify(t).includes(`"${itemId}"`))) {
        setErrors(prev => ({ ...prev, firm: 'Firm cannot change - this SKU has transactions' }));
        return;
      }

      const updatedItems = data.items.map(i => (i.id === itemId ? { ...i, ...payload } : i));
      const negCheck = chkNeg(data.txns);
      if (negCheck) {
        showError(negCheck);
        return;
      }
      setData({ ...data, items: updatedItems });
      showToast('Updated ' + payload.sku);
      if (onSaved) onSaved(payload);
      onClose();
    } else {
      const newSkuItem = { id: nextId(), ...payload };
      const updatedItems = [...data.items, newSkuItem];
      setData({ ...data, items: updatedItems });
      showToast('Added ' + payload.sku);

      if (again) {
        setForm(prev => ({
          ...prev,
          sub: '',
          sku: '',
          open: '',
          rate: ''
        }));
      } else {
        if (onSaved) onSaved(newSkuItem);
        onClose();
      }
    }
  };

  const handleImportTemplate = () => {
    const MH = [
      'Firm', 'Material Type', 'Category', 'Sub Category / Material', 'SKU Code', 'Unit',
      'Storage Location', 'Opening Stock', 'ADC', 'Lead Time', 'Safety Factor', 'MOQ',
      'Rate', 'Supplier Name', 'Supplier Code', 'Status', 'HSN', 'Min GCV', 'Max Ash', 'Max Moisture', 'Size'
    ];
    const sampleRows = [
      {
        Firm: 'JBT Coal Pvt Ltd',
        'Material Type': 'RM',
        Category: 'Raw Coal',
        'Sub Category / Material': 'ROM Coal G-12',
        'SKU Code': 'RC-G12',
        Unit: 'MT',
        'Storage Location': 'Siltara Coal Yard',
        'Opening Stock': 250,
        ADC: 20,
        'Lead Time': 7,
        'Safety Factor': 0.5,
        MOQ: 300,
        Rate: 3600,
        'Supplier Name': 'SECL Gevra Area',
        'Supplier Code': 'SUP-001',
        Status: 'Active',
        HSN: '27011200',
        'Min GCV': 3800,
        'Max Ash': 38,
        'Max Moisture': 12,
        Size: '0-250 mm'
      }
    ];
    exportData('Material_Import_Template', MH.map(h => ({ h, k: h })), sampleRows, false);
  };

  const handleImportCSV = () => {
    importFile((rows) => {
      let added = 0;
      let updated = 0;
      const itemsCopy = [...data.items];
      const firmsCopy = [...data.firms];
      const locsCopy = [...data.locs];
      const unitsCopy = [...data.units];

      for (const r of rows) {
        const g = (k) => r[k.toLowerCase()] ?? '';
        const sku = g('SKU Code') || g('sku code') || g('sku');
        const sub = g('Sub Category / Material') || g('Material') || g('Sub Category') || g('material');
        if (!sku || !sub) continue;

        let fm = firmsCopy.find(f => f.name.toLowerCase() === (g('Firm') || firmsCopy[0]?.name || '').toLowerCase());
        if (!fm) {
          fm = { id: nextId(), name: g('Firm') || 'New Firm', gst: '', addr: '', phone: '' };
          firmsCopy.push(fm);
        }

        const ln = g('Storage Location') || g('storage location');
        let lc = locsCopy.find(l => l.name.toLowerCase() === ln.toLowerCase());
        if (!lc && ln) {
          lc = { id: nextId(), name: ln, kind: 'Coal Yard', addr: '', cap: 0 };
          locsCopy.push(lc);
        }

        const un = g('Unit') || 'MT';
        if (!unitsCopy.some(x => x.name.toLowerCase() === un.toLowerCase())) {
          unitsCopy.push({ id: nextId(), name: un });
        }

        const ty = (g('Material Type') || 'RM').toUpperCase().slice(0, 2);
        const o = {
          firm: fm.id,
          type: TYPES[ty] ? ty : 'RM',
          cat: g('Category') || 'Raw Coal',
          sub,
          sku: sku.toUpperCase(),
          unit: un,
          loc: (lc || locsCopy[0])?.id,
          open: +g('Opening Stock') || 0,
          adc: +g('ADC') || 0,
          lt: +g('Lead Time') || 0,
          sf: +g('Safety Factor') || 0,
          moq: +g('MOQ') || 0,
          rate: +g('Rate') || 0,
          sup: g('Supplier Name'),
          supc: g('Supplier Code'),
          status: g('Status') === 'Inactive' ? 'Inactive' : 'Active',
          hsn: g('HSN'),
          gmin: +g('Min GCV') || 0,
          amax: +g('Max Ash') || 0,
          mmax: +g('Max Moisture') || 0,
          size: g('Size')
        };

        const existingIdx = itemsCopy.findIndex(i => i.firm === o.firm && i.sku.toLowerCase() === sku.toLowerCase());
        if (existingIdx >= 0) {
          itemsCopy[existingIdx] = { ...itemsCopy[existingIdx], ...o };
          updated++;
        } else {
          itemsCopy.push({ id: nextId(), ...o });
          added++;
        }
      }

      setData({ ...data, items: itemsCopy, firms: firmsCopy, locs: locsCopy, units: unitsCopy });
      showToast(`${added} materials added, ${updated} updated`);
      onClose();
    }, showError);
  };

  const scale = Math.max(pCalc.mx * 1.15, openVal);
  const posScale = v => Math.min(100, (v / (scale || 1)) * 100);
  const pct = pCalc.mx > 0 ? (openVal / pCalc.mx) * 100 : 0;
  const band = pct > 100 ? 'EX' : pct >= 66 ? 'NO' : pct >= 33 ? 'MD' : 'CR';

  const categoryDatalist = [...new Set(data.items.filter(i => i.type === materialType).map(i => i.cat))];
  const subCategoryDatalist = [...new Set(data.items.filter(i => i.type === materialType).map(i => i.sub))];

  return (
    <Modal
      title={isEdit ? 'Edit material' : 'Add new material'}
      width="mid"
      okText={isEdit ? 'Save changes' : 'Add SKU material'}
      onOk={() => handleSave(false)}
      onClose={onClose}
      headerExtra={
        !isEdit && (
          <>
            <button type="button" className="b2 sm" onClick={handleImportTemplate}>
              <SvgIcon path={IC.dl} /> Template
            </button>
            <button type="button" className="b2 sm" onClick={handleImportCSV}>
              <SvgIcon path={IC.up} /> Import CSV
            </button>
          </>
        )
      }
      footerExtra={
        !isEdit ? (
          <button
            type="button"
            className="b2"
            style={{ marginRight: 'auto' }}
            onClick={() => handleSave(true)}
          >
            Save &amp; add another
          </button>
        ) : null
      }
    >
      <div className="mtop">
        <div className={`fg ${errors.firm ? 'bad' : ''}`}>
          <label>Firm *</label>
          <select value={form.firm} onChange={e => setField('firm', e.target.value)}>
            <option value="">Select firm...</option>
            {visibleFirms.map(f => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          {errors.firm && <div className="ferr">{errors.firm}</div>}
        </div>

        <div className="fg">
          <label>Material type *</label>
          <div className="tcards">
            {Object.keys(TYPES).map(t => (
              <button
                key={t}
                type="button"
                className={t === materialType ? 'on' : ''}
                onClick={() => handleTypeChange(t)}
              >
                <span className="te">{MDESC[t][0]}</span>
                <b>{MDESC[t][1]}</b>
                <small>{MDESC[t][2]}</small>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Basic details */}
      <div className="msec">
        <div className="msh">
          <span className="mic">📦</span>
          <div>
            <b>Basic details</b>
            <small>What the material is and where it is kept</small>
          </div>
        </div>
        <div className="g2">
          <div className={`fg ${errors.cat ? 'bad' : ''}`}>
            <label>{labels[0]}</label>
            <input
              list="dl_cat"
              value={form.cat || ''}
              placeholder={labels[1]}
              onChange={e => setField('cat', e.target.value)}
            />
            {errors.cat && <div className="ferr">{errors.cat}</div>}
          </div>

          <div className={`fg ${errors.sub ? 'bad' : ''}`}>
            <label>{labels[2]}</label>
            <input
              list="dl_sub"
              value={form.sub || ''}
              placeholder={labels[3]}
              onChange={e => setField('sub', e.target.value)}
            />
            {errors.sub && <div className="ferr">{errors.sub}</div>}
          </div>

          <div className={`fg ${errors.sku ? 'bad' : ''}`}>
            <label>SKU code *</label>
            <div className="ifx">
              <input
                value={form.sku || ''}
                placeholder={labels[4]}
                style={{ textTransform: 'uppercase' }}
                onChange={e => setField('sku', e.target.value.toUpperCase())}
              />
              <button type="button" className="b2 sm" onClick={handleAutoSku} title="Generate from name">
                Auto
              </button>
            </div>
            {errors.sku && <div className="ferr">{errors.sku}</div>}
            <div className="hint">Short unique code used on challans and reports</div>
          </div>

          <div className="fg">
            <label>HSN code</label>
            <input
              value={form.hsn || ''}
              placeholder="e.g. 27011200"
              onChange={e => setField('hsn', e.target.value)}
            />
          </div>

          <div className="fg">
            <label>Unit *</label>
            <select value={form.unit} onChange={e => setField('unit', e.target.value)}>
              {data.units.map(u => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="fg">
            <label>Default storage location</label>
            <select value={form.loc} onChange={e => setField('loc', e.target.value)}>
              {visibleLocs.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Opening stock & cost */}
      <div className="msec">
        <div className="msh">
          <span className="mic">🧮</span>
          <div>
            <b>Opening stock &amp; cost</b>
            <small>Stock on hand on the day you start using the system</small>
          </div>
        </div>
        <div className="g2">
          <div className={`fg ${errors.open ? 'bad' : ''}`}>
            <label>Opening stock balance</label>
            <div className="ifx">
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={form.open}
                onChange={e => setField('open', e.target.value)}
              />
              <span>{form.unit}</span>
            </div>
            {errors.open && <div className="ferr">{errors.open}</div>}
          </div>

          <div className={`fg ${errors.rate ? 'bad' : ''}`}>
            <label>Rate / cost per unit</label>
            <div className="ifx">
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={form.rate}
                onChange={e => setField('rate', e.target.value)}
              />
              <span>₹</span>
            </div>
            {errors.rate && <div className="ferr">{errors.rate}</div>}
            <div className="hint">Used for stock value until purchases come in</div>
          </div>
        </div>
        {openValuation > 0 && (
          <div className="mnote">
            Opening stock value: <b>{inr(openValuation)}</b>
          </div>
        )}
      </div>

      {/* Re-order planning */}
      <div className="msec">
        <div className="msh">
          <span className="mic">📈</span>
          <div>
            <b>Re-order planning</b>
            <small>Decides safety stock, re-order alerts and the colour band on IMS</small>
          </div>
        </div>
        <div className="g2">
          <div className={`fg ${errors.adc ? 'bad' : ''}`}>
            <label>Avg daily consumption (ADC) *</label>
            <div className="ifx">
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={form.adc}
                onChange={e => setField('adc', e.target.value)}
              />
              <span>{form.unit}/day</span>
            </div>
            {itemMetrics?.adcA ? (
              <div className="hint">
                <a
                  className="lnk"
                  onClick={() => setField('adc', +itemMetrics.adcA.toFixed(2))}
                >
                  Use actual: {fmt(itemMetrics.adcA)} / day
                </a>{' '}
                (last {data.cfg.adcDays} days)
              </div>
            ) : (
              <div className="hint">Average quantity issued per day</div>
            )}
            {errors.adc && <div className="ferr">{errors.adc}</div>}
          </div>

          <div className={`fg ${errors.lt ? 'bad' : ''}`}>
            <label>Lead time *</label>
            <div className="ifx">
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={form.lt}
                onChange={e => setField('lt', e.target.value)}
              />
              <span>days</span>
            </div>
            {errors.lt && <div className="ferr">{errors.lt}</div>}
            <div className="hint">Days from order to stock arriving</div>
          </div>

          <div className={`fg ${errors.sf ? 'bad' : ''}`}>
            <label>Safety factor *</label>
            <div className="ifx">
              <input
                type="number"
                step="any"
                min="0"
                value={form.sf}
                onChange={e => setField('sf', e.target.value)}
              />
            </div>
            <div className="chips">
              {[
                [0.25, 'Low risk'],
                [0.5, 'Normal'],
                [1, 'High risk']
              ].map(c => (
                <button
                  key={c[0]}
                  type="button"
                  className={+form.sf === c[0] ? 'on' : ''}
                  onClick={() => setField('sf', c[0])}
                >
                  {c[0]} · {c[1]}
                </button>
              ))}
            </div>
            {errors.sf && <div className="ferr">{errors.sf}</div>}
            <div className="hint">Buffer for late trucks / rakes and demand spikes</div>
          </div>

          <div className={`fg ${errors.moq ? 'bad' : ''}`}>
            <label>MOQ *</label>
            <div className="ifx">
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={form.moq}
                onChange={e => setField('moq', e.target.value)}
              />
              <span>{form.unit}</span>
            </div>
            {errors.moq && <div className="ferr">{errors.moq}</div>}
            <div className="hint">Smallest quantity a supplier will dispatch (e.g. one rake)</div>
          </div>
        </div>

        <div className="kbox">
          <div title="ADC × Lead time × Safety factor">
            <div className="l">Safety stock</div>
            <div className="v">{fmt(pCalc.ss)}</div>
          </div>
          <div className="ka" title="ADC × Lead time + Safety stock">
            <div className="l">Reorder level</div>
            <div className="v">{fmt(pCalc.rol)}</div>
          </div>
          <div title="Reorder level + larger of MOQ and lead-time demand">
            <div className="l">Max level</div>
            <div className="v">{fmt(pCalc.mx)}</div>
          </div>
        </div>

        {pCalc.mx > 0 ? (
          <>
            <div className="pbar">
              <div className="pz" style={{ width: `${posScale(pCalc.mx * 0.33)}%`, background: '#fde3e7' }} />
              <div className="pz" style={{ width: `${posScale(pCalc.mx * 0.33)}%`, background: '#fdefd3' }} />
              <div className="pz" style={{ width: `${posScale(pCalc.mx * 0.34)}%`, background: '#dcf3e8' }} />
              <div className="pz" style={{ flex: 1, background: '#e2ebff' }} />
              {openVal > 0 && (
                <div className="pm" style={{ left: `${posScale(openVal)}%` }} title="Opening stock">
                  <span>Opening {fmt(openVal, 0)}</span>
                </div>
              )}
              <div className="pk" style={{ left: `${posScale(pCalc.rol)}%` }}>
                <em>ROL {fmt(pCalc.rol, 0)}</em>
              </div>
              <div className="pk" style={{ left: `${posScale(pCalc.mx)}%` }}>
                <em>MAX {fmt(pCalc.mx, 0)}</em>
              </div>
            </div>
            <div className="mnote">
              Re-order alert when stock falls to <b>{fmt(pCalc.rol)} {form.unit}</b> (about{' '}
              {fmt(adcVal ? pCalc.rol / adcVal : 0, 1)} days of use). Suggested order is{' '}
              <b>{fmt(pCalc.rq)} {form.unit}</b>; above <b>{fmt(pCalc.mx)} {form.unit}</b> counts as excess.
              {openVal > 0 && (
                <>
                  {' '}
                  Opening stock starts in the{' '}
                  <span className={`bdg ${BCL[band]}`}>
                    {BN[band]} · {Math.round(pct)}%
                  </span>{' '}
                  band.
                </>
              )}
            </div>
          </>
        ) : (
          <div className="mnote">
            Enter ADC and lead time to switch on re-order alerts and the colour band for this SKU.
          </div>
        )}
      </div>

      {/* Coal specification */}
      {materialType !== 'ST' && (
        <div className="msec">
          <div className="msh">
            <span className="mic">🔬</span>
            <div>
              <b>Coal specification</b>
              <small>Optional - receipts outside these limits get flagged in reports</small>
            </div>
          </div>
          <div className="g4">
            <div className="fg">
              <label>Min GCV</label>
              <div className="ifx">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.gmin}
                  placeholder="0"
                  onChange={e => setField('gmin', e.target.value)}
                />
                <span>kcal</span>
              </div>
            </div>
            <div className="fg">
              <label>Max ash</label>
              <div className="ifx">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.amax}
                  placeholder="0"
                  onChange={e => setField('amax', e.target.value)}
                />
                <span>%</span>
              </div>
            </div>
            <div className="fg">
              <label>Max moisture</label>
              <div className="ifx">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.mmax}
                  placeholder="0"
                  onChange={e => setField('mmax', e.target.value)}
                />
                <span>%</span>
              </div>
            </div>
            <div className="fg">
              <label>Size</label>
              <input
                value={form.size || ''}
                placeholder="e.g. 20-50 mm"
                onChange={e => setField('size', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Supplier & status */}
      <div className="msec">
        <div className="msh">
          <span className="mic">🤝</span>
          <div>
            <b>Supplier &amp; status</b>
          </div>
        </div>
        <div className="g3">
          <div className="fg">
            <label>Supplier name</label>
            <input
              list="dl_sup"
              value={form.sup || ''}
              placeholder="e.g. SECL Gevra Area"
              onChange={e => handleSupplierChange(e.target.value)}
            />
          </div>
          <div className="fg">
            <label>Supplier code</label>
            <input
              value={form.supc || ''}
              placeholder="e.g. SUP-001"
              onChange={e => setField('supc', e.target.value)}
            />
          </div>
          <div className="fg">
            <label>Status</label>
            <select value={form.status} onChange={e => setField('status', e.target.value)}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <datalist id="dl_cat">
        {categoryDatalist.map(c => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id="dl_sub">
        {subCategoryDatalist.map(s => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="dl_sup">
        {data.parties
          .filter(p => p.role !== 'Customer')
          .map(p => (
            <option key={p.id} value={p.name} />
          ))}
      </datalist>
    </Modal>
  );
}
