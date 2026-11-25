import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import GenericPageLayout from '../components/GenericPageLayout';
import { fmt, SvgIcon, IC } from '../utils/helpers';
import Modal from '../components/Modal';
import { usePagePermission } from '../../../hooks/usePagePermission';

const MASTER_CONFIG = {
  firms: [
    'Firm',
    [
      { k: 'name', l: 'Firm name *' },
      { k: 'gst', l: 'GSTIN' },
      { k: 'addr', l: 'Address', full: true },
      { k: 'phone', l: 'Phone' }
    ]
  ],
  locs: [
    'Storage Location',
    [
      { k: 'name', l: 'Location name *' },
      {
        k: 'kind',
        l: 'Type',
        o: ['Coal Yard', 'Depot', 'Washery / Plant', 'Railway Siding', 'Port / Stockyard', 'Godown']
      },
      { k: 'addr', l: 'Address' },
      { k: 'cap', l: 'Capacity (MT)', t: 'number' }
    ]
  ],
  units: ['Unit', [{ k: 'name', l: 'Unit name *' }]],
  parties: [
    'Party',
    [
      { k: 'name', l: 'Party name *' },
      { k: 'code', l: 'Party code' },
      { k: 'role', l: 'Role', o: ['Supplier', 'Customer', 'Both', 'Transporter'] },
      { k: 'gst', l: 'GSTIN' },
      { k: 'phone', l: 'Phone' },
      { k: 'city', l: 'City' }
    ]
  ]
};

export default function MastersPage() {
  const { canWrite } = usePagePermission("Inventory (IMS)", "Masters");
  const { data, setData, activeTabs, setActiveTabs, cx, nextId, showToast, showError } = useApp();

  const currentTab = activeTabs.masters || 'firms';
  const setTab = tab => setActiveTabs(prev => ({ ...prev, masters: tab }));

  const configEntry = MASTER_CONFIG[currentTab];
  const tTitle = configEntry ? configEntry[0] : '';
  const fields = configEntry ? configEntry[1] : [];
  const [modalRecord, setModalRecord] = useState(null); // null = closed, {} = new, or edit record

  // General planning configuration state
  const [generalCfg, setGeneralCfg] = useState(() => ({ ...data.cfg }));

  // Backup download
  const handleDownloadBackup = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `JBT_Coal_IMS_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  // Restore from file
  const handleRestoreFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = e => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!parsed.items || !parsed.txns) {
            throw new Error('Invalid format');
          }
          if (!window.confirm('Replace ALL current data with this backup?')) return;
          setData(parsed);
          showToast('Backup restored successfully');
        } catch (err) {
          showError('Not a valid JBT Coal IMS backup file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Start fresh (blank)
  const handleGoLive = () => {
    if (!window.confirm('Delete ALL materials, transactions and physical counts? Download a backup first if you need it.')) return;
    const confirmation = window.prompt('Type DELETE to confirm');
    if (confirmation !== 'DELETE') {
      showToast('Cancelled', true);
      return;
    }
    setData({
      ...data,
      items: [],
      txns: [],
      counts: []
    });
    showToast('All entries cleared - add your materials to start');
  };

  const handleSaveGeneral = () => {
    if (generalCfg.adcDays && +generalCfg.adcDays < 1) {
      return showError('ADC days must be at least 1');
    }
    if (generalCfg.fsnDays && +generalCfg.fsnDays < 1) {
      return showError('FSN days must be at least 1');
    }
    if (generalCfg.deadDays && +generalCfg.deadDays < 1) {
      return showError('Dead days must be at least 1');
    }
    if (generalCfg.fastTR && +generalCfg.fastTR < 0) {
      return showError('Turnover cannot be negative');
    }

    setData({
      ...data,
      cfg: {
        ...data.cfg,
        ...generalCfg,
        adcDays: generalCfg.adcDays !== '' ? +generalCfg.adcDays : '',
        fsnDays: generalCfg.fsnDays !== '' ? +generalCfg.fsnDays : '',
        fastTR: generalCfg.fastTR !== '' ? +generalCfg.fastTR : '',
        deadDays: generalCfg.deadDays !== '' ? +generalCfg.deadDays : ''
      }
    });
    showToast('Settings saved');
  };

  const handleSaveModal = (formVals) => {
    if (!formVals.name?.trim()) {
      showError('Name is required');
      return;
    }

    const list = data[currentTab] || [];
    const isEdit = !!modalRecord.id;

    if (
      list.some(
        x => x.id !== modalRecord.id && x.name.toLowerCase() === formVals.name.trim().toLowerCase()
      )
    ) {
      showError(`${formVals.name} already exists`);
      return;
    }

    if (isEdit) {
      let updatedItems = [...data.items];
      if (currentTab === 'units') {
        updatedItems = updatedItems.map(i => (i.unit === modalRecord.name ? { ...i, unit: formVals.name } : i));
      }
      if (currentTab === 'parties') {
        updatedItems = updatedItems.map(i => (i.sup === modalRecord.name ? { ...i, sup: formVals.name } : i));
      }

      const updatedList = list.map(item => (item.id === modalRecord.id ? { ...item, ...formVals } : item));
      setData({ ...data, [currentTab]: updatedList, items: updatedItems });
    } else {
      const newItem = { id: nextId(), ...formVals };
      setData({ ...data, [currentTab]: [...list, newItem] });
    }

    showToast(`${tTitle} saved`);
    setModalRecord(null);
  };

  const handleDelete = (id) => {
    const record = data[currentTab]?.find(x => x.id === id);
    if (!record) return;

    const txnsStr = JSON.stringify(data.txns);
    const inUse =
      currentTab === 'firms'
        ? data.items.some(i => i.firm === id)
        : currentTab === 'locs'
        ? data.items.some(i => i.loc === id) || txnsStr.includes(`"${id}"`)
        : currentTab === 'units'
        ? data.items.some(i => i.unit === record.name)
        : false;

    if (inUse) {
      showError(`Cannot delete ${record.name} - it is used by materials or transactions`);
      return;
    }

    if (!window.confirm(`Delete ${record.name}?`)) return;

    setData({
      ...data,
      [currentTab]: data[currentTab].filter(x => x.id !== id)
    });
    showToast(`Deleted ${record.name}`);
  };

  const R = Object.values(cx);

  const getTableRows = () => {
    return (data[currentTab] || []).map(x => {
      let extra = {};
      if (currentTab === 'locs') {
        const s = R.filter(r => r.unit === 'MT').reduce((acc, r) => acc + (r.locs[x.id] || 0), 0);
        extra = { stk: s, ut: x.cap ? (s / x.cap) * 100 : 0 };
      } else if (currentTab === 'firms') {
        extra = { n: data.items.filter(i => i.firm === x.id).length };
      }
      return { ...x, ...extra };
    });
  };

  const cols = [
    ...fields.map(x =>
      x.t === 'number'
        ? { h: x.l.replace(' *', ''), k: x.k, n: 1 }
        : { h: x.l.replace(' *', ''), k: x.k }
    ),
    ...(currentTab === 'locs'
      ? [
          { h: 'Stock (MT)', k: 'stk', n: 1 },
          {
            h: 'Utilisation',
            k: 'ut',
            n: 1,
            f: x =>
              x.cap ? (
                <b
                  style={{
                    color: x.ut > 90 ? '#e5334b' : x.ut > 70 ? '#b87700' : '#1f9d6b'
                  }}
                >
                  {fmt(x.ut, 0)}%
                </b>
              ) : (
                '-'
              )
          }
        ]
      : currentTab === 'firms'
      ? [{ h: 'SKUs', k: 'n', n: 1 }]
      : [])
  ];

  return (
    <>
      <div className="tabs">
        {[
          ['firms', 'Firms'],
          ['locs', 'Storage Locations'],
          ['units', 'Units'],
          ['parties', 'Parties (Suppliers / Customers)'],
          ['gen', 'General (Planning & Settings)']
        ].map(([key, label]) => (
          <a
            key={key}
            className={key === currentTab ? 'on' : ''}
            onClick={() => setTab(key)}
          >
            {label}
          </a>
        ))}
      </div>

      {currentTab === 'gen' ? (
        <div className="card" style={{ maxWidth: '820px' }}>
          <div className="msec">
            <div className="msh">
              <span className="mic">📈</span>
              <div>
                <b>Planning</b>
                <small>How ADC, re-order levels and FSN are worked out</small>
              </div>
            </div>
            <div className="g3">
              <div className="fg">
                <label>ADC source</label>
                <select
                  value={generalCfg.adcMode || ''}
                  onChange={e => setGeneralCfg(prev => ({ ...prev, adcMode: e.target.value }))}
                >
                  <option value="">Select...</option>
                  <option value="auto">Actual (from transactions)</option>
                  <option value="manual">Manual (from material)</option>
                </select>
              </div>

              <div className="fg">
                <label>ADC period (days)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 30"
                  value={generalCfg.adcDays ?? ''}
                  onChange={e => setGeneralCfg(prev => ({ ...prev, adcDays: e.target.value ? +e.target.value : '' }))}
                />
              </div>

              <div className="fg">
                <label>FSN period (days)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 90"
                  value={generalCfg.fsnDays ?? ''}
                  onChange={e => setGeneralCfg(prev => ({ ...prev, fsnDays: e.target.value ? +e.target.value : '' }))}
                />
              </div>

              <div className="fg">
                <label>Fast moving if turnover ≥</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 1"
                  value={generalCfg.fastTR ?? ''}
                  onChange={e => setGeneralCfg(prev => ({ ...prev, fastTR: e.target.value ? +e.target.value : '' }))}
                />
              </div>

              <div className="fg">
                <label>Dead if no issue for (days)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 90"
                  value={generalCfg.deadDays ?? ''}
                  onChange={e => setGeneralCfg(prev => ({ ...prev, deadDays: e.target.value ? +e.target.value : '' }))}
                />
              </div>
            </div>
          </div>

          <div className="msec">
            <div className="msh">
              <span className="mic">🛡</span>
              <div>
                <b>Stock control</b>
              </div>
            </div>
            <label className="chk">
              <input
                type="checkbox"
                checked={generalCfg.allowNeg}
                onChange={e => setGeneralCfg(prev => ({ ...prev, allowNeg: e.target.checked }))}
              />{' '}
              Allow stock to go below zero (not recommended)
            </label>
          </div>

          <div style={{ textAlign: 'right', marginTop: '16px' }}>
            <button type="button" className="b1" onClick={handleSaveGeneral}>
              Save settings
            </button>
          </div>

          <div className="msec" style={{ marginTop: '20px' }}>
            <div className="msh">
              <span className="mic">💾</span>
              <div>
                <b>Data Management &amp; Backup</b>
                <small>Download backup, restore or reset data</small>
              </div>
            </div>
            <div className="btns" style={{ marginTop: '8px' }}>
              <button type="button" className="b2" onClick={handleDownloadBackup}>
                <SvgIcon path={IC.dl} /> Download backup
              </button>
              <button type="button" className="b2" onClick={handleRestoreFile}>
                <SvgIcon path={IC.up} /> Restore from file
              </button>
              <button type="button" className="b2 dg" onClick={handleGoLive}>
                Start fresh (blank)
              </button>
            </div>
          </div>
        </div>
      ) : (
        <GenericPageLayout
          title={`${tTitle} Master`}
          buttons={
            canWrite ? (
              <button type="button" className="b1" onClick={() => setModalRecord({})}>
                <SvgIcon path={IC.plus} /> Add {tTitle}
              </button>
            ) : null
          }
          cols={cols}
          data={getTableRows}
          act={canWrite ? (x => (
            <>
              <button
                type="button"
                className="ico"
                title="Edit"
                onClick={() => setModalRecord(x)}
              >
                <SvgIcon path={IC.edit} />
              </button>
              <button
                type="button"
                className="ico dg"
                title="Delete"
                onClick={() => handleDelete(x.id)}
              >
                <SvgIcon path={IC.trash} />
              </button>
            </>
          )) : null}
        />
      )}

      {modalRecord && (
        <MasterFormModal
          title={`${modalRecord.id ? 'Edit' : 'Add'} ${tTitle}`}
          fields={fields}
          initialValues={modalRecord}
          onSave={handleSaveModal}
          onClose={() => setModalRecord(null)}
        />
      )}
    </>
  );
}

function MasterFormModal({ title, fields, initialValues, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    const res = {};
    fields.forEach(f => {
      res[f.k] = initialValues[f.k] ?? '';
    });
    return res;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Modal
      title={title}
      okText="Save"
      onOk={handleSubmit}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="g2">
          {fields.map(f => {
            const val = form[f.k];
            return (
              <div key={f.k} className={`fg ${f.full ? 'full' : ''}`}>
                <label>{f.l}</label>
                {f.o ? (
                  <select
                    value={val}
                    onChange={e => setForm(prev => ({ ...prev, [f.k]: e.target.value }))}
                  >
                    <option value="">Select...</option>
                    {f.o.map(opt => {
                      const [v, l] = Array.isArray(opt) ? opt : [opt, opt];
                      return (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    type={f.t === 'number' ? 'number' : 'text'}
                    step={f.t === 'number' ? 'any' : undefined}
                    min={f.t === 'number' ? '0' : undefined}
                    value={val}
                    onChange={e =>
                      setForm(prev => ({
                        ...prev,
                        [f.k]: f.t === 'number' ? +e.target.value : e.target.value
                      }))
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      </form>
    </Modal>
  );
}
