import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import GenericPageLayout from '../components/GenericPageLayout';
import { BANDS, BCOL, TYPES } from '../utils/constants';
import { fmt, inr, SvgIcon, IC } from '../utils/helpers';
import MaterialModal from '../components/MaterialModal';
import CountModal from '../components/CountModal';
import TransactionModal from '../components/TransactionModal';
import { usePagePermission } from '../../../hooks/usePagePermission';

export default function InventoryPage() {
  const { canWrite } = usePagePermission("Inventory (IMS)", "Inventory (IMS)");
  const {
    data,
    setData,
    cx,
    visibleItems,
    visibleFirms,
    openItemDetail,
    navigateTo,
    filters,
    setFilters,
    showToast,
    showError
  } = useApp();

  const [activeMaterialModalId, setActiveMaterialModalId] = useState(null); // null = closed, 'NEW', or id
  const [activeCountItemId, setActiveCountItemId] = useState(null);
  const [activeTxnType, setActiveTxnType] = useState(null);

  const R = Object.values(cx);
  const countBand = b => R.filter(x => x.band === b).length;
  const noPlanningCount = countBand('NS');

  const selectedBand = filters.band || '';

  const handleDeleteMaterial = (id) => {
    const itemObj = data.items.find(i => i.id === id);
    if (!itemObj) return;

    if (data.txns.some(t => JSON.stringify(t).includes(`"${id}"`))) {
      showError(`${itemObj.sku} has transactions - set it Inactive instead`);
      return;
    }

    if (!window.confirm(`Delete ${itemObj.sku}?`)) return;

    setData({
      ...data,
      items: data.items.filter(x => x.id !== id),
      counts: data.counts.filter(c => c.it !== id)
    });
    showToast(`Deleted ${itemObj.sku}`);
  };

  const cats = [...new Set(visibleItems.map(i => i.cat).filter(Boolean))];
  const subs = [...new Set(visibleItems.map(i => i.sub).filter(Boolean))];

  const cols = [
    {
      h: 'SKU Code',
      k: 'sku',
      f: x => (
        <>
          <a className="sku" onClick={() => openItemDetail(x.id)}>
            {x.sku}
          </a>
          <div className="av2">
            {x.name}
            {x.status === 'Inactive' ? ' · Inactive' : ''}
          </div>
        </>
      )
    },
    { h: 'Sub Category', k: 'sub', f: x => <b>{x.sub}</b> },
    { h: 'Firm', k: 'firm', f: x => <span className="tag">{x.firm}</span> },
    {
      h: 'Material Type',
      k: 'type',
      f: x => <span className={`tag t${x.type}`}>{x.type}</span>
    },
    { h: 'Category', k: 'cat', f: x => String(x.cat || '').toUpperCase() },
    { h: 'Opening Stock', k: 'op', n: 1 },
    {
      h: 'ADC',
      k: 'adc',
      n: 1,
      f: x => (
        <>
          {fmt(x.adc)}
          {x.auto && (
            <sup className="au" title={`Actual, last ${data.cfg.adcDays} days`}>
              A
            </sup>
          )}
        </>
      ),
      x: x => +x.adc.toFixed(3)
    },
    { h: 'Lead Time', k: 'lt', n: 1, f: x => `${x.lt}d` },
    { h: 'Safety Stock', k: 'ss', n: 1 },
    { h: 'Reorder Lvl', k: 'rol', n: 1 },
    { h: 'MOQ', k: 'moq', n: 1 },
    { h: 'Max Lvl', k: 'mx', n: 1 },
    {
      h: 'Purchase',
      k: 'pur',
      n: 1,
      f: x => <span className="pill pin">{fmt(x.pur)}</span>
    },
    {
      h: 'Pur. Return',
      k: 'pr',
      n: 1,
      f: x => (x.pr ? <span className="pill prj">{fmt(x.pr)}</span> : <span className="av2">0</span>)
    },
    {
      h: 'Sale',
      k: 'sal',
      n: 1,
      f: x => <span className="pill pout">{fmt(x.sal)}</span>
    },
    {
      h: 'Sales Return',
      k: 'sr',
      n: 1,
      f: x => (x.sr ? <span className="pill psr">{fmt(x.sr)}</span> : <span className="av2">0</span>)
    },
    {
      h: 'Job Used',
      k: 'jc',
      n: 1,
      f: x => (x.jc ? fmt(x.jc) : <span className="av2">0</span>)
    },
    {
      h: 'Job Made',
      k: 'jp',
      n: 1,
      f: x => (x.jp ? fmt(x.jp) : <span className="av2">0</span>)
    },
    {
      h: 'Transfer',
      k: 'trq',
      n: 1,
      f: x =>
        x.trq ? (
          <span className="av2" title="Moved between locations (net 0)">
            ⇄ {fmt(x.trq)}
          </span>
        ) : (
          <span className="av2">0</span>
        )
    },
    {
      h: 'Closing Stock',
      k: 'cl',
      n: 1,
      c: 'hl',
      f: x => (
        <>
          <span className={`pill pcl ${x.cl < 0 ? 'neg' : ''}`}>{fmt(x.cl)}</span>{' '}
          <span className="av2">{x.unit}</span>
        </>
      )
    },
    {
      h: 'Physical Stock',
      k: 'phys',
      n: 1,
      f: x =>
        x.phys == null ? (
          <span className="av2">-</span>
        ) : (
          <>
            {fmt(x.phys)}
            {x.pv ? (
              <span className={`av2 ${x.pv < 0 ? 'wn' : 'ok'}`}>
                {' '}
                ({x.pv > 0 ? '+' : ''}
                {fmt(x.pv)})
              </span>
            ) : (
              ''
            )}
          </>
        ),
      x: x => x.phys ?? ''
    },
    {
      h: 'Stock Value',
      k: 'val',
      n: 1,
      inr: 1,
      f: x => inr(x.val),
      x: x => Math.round(x.val)
    },
    {
      h: 'Stock Band',
      k: 'band',
      f: x => (
        <span className={`bdg ${x.band === 'EX' ? 'bl' : x.band === 'NO' ? 'g' : x.band === 'MD' ? 'am' : x.band === 'CR' ? 'rd' : 'gy'}`}>
          <i className="dot"></i>
          {x.band === 'EX' ? 'Excess' : x.band === 'NO' ? 'Normal' : x.band === 'MD' ? '33-66%' : x.band === 'CR' ? 'Critical' : 'Not planned'}
          {x.pct != null ? ` · ${Math.round(x.pct)}%` : ''}
        </span>
      ),
      x: x => x.band + (x.pct != null ? ` ${Math.round(x.pct)}%` : '')
    },
    {
      h: 'Movement',
      k: 'cls',
      f: x => (
        <span className={`bdg ${x.cls === 'Fast' ? 'g' : x.cls === 'Slow' ? 'am' : 'rd'}`}>
          {x.cls}
        </span>
      )
    }
  ];

  const preContent = (
    <>
      <div className="legend">
        {BANDS.map(b => (
          <button
            key={b[0]}
            type="button"
            className={selectedBand && selectedBand !== b[0] ? 'off' : ''}
            style={{
              background: `linear-gradient(135deg, ${b[2]}, color-mix(in srgb, ${b[2]} 75%, #000))`,
              '--lc': b[2]
            }}
            onClick={() => {
              setFilters(prev => ({
                ...prev,
                band: prev.band === b[0] ? '' : b[0]
              }));
            }}
            title="Click to filter"
          >
            {b[1]}
            <b>{countBand(b[0])}</b>
          </button>
        ))}
      </div>
      <div className="lgn">
        Band = closing stock ÷ max level.
        {noPlanningCount > 0 && (
          <>
            {' '}
            {noPlanningCount} SKU(s) have no planning (ADC / lead time) yet -{' '}
            <a
              className="lnk"
              onClick={() => setFilters(prev => ({ ...prev, band: 'NS' }))}
            >
              show them
            </a>
            .
          </>
        )}
        {selectedBand && (
          <>
            {' '}
            &nbsp;
            <a
              className="lnk"
              onClick={() => setFilters(prev => ({ ...prev, band: '' }))}
            >
              Clear band filter
            </a>
          </>
        )}
      </div>
    </>
  );

  const topButtons = (
    <>
      <button type="button" className="b1" onClick={() => setActiveMaterialModalId('NEW')}>
        <SvgIcon path={IC.plus} /> Add Material
      </button>
      <button type="button" className="b1" onClick={() => setActiveTxnType('OUT')}>
        <SvgIcon path={IC.plus} /> Sale
      </button>
      <button type="button" className="b1 gr" onClick={() => setActiveTxnType('IN')}>
        <SvgIcon path={IC.plus} /> Purchase
      </button>
      <button type="button" className="b1" onClick={() => setActiveTxnType('TRF')}>
        <SvgIcon path={IC.swap} /> Transfer Material
      </button>
      <button type="button" className="b1" onClick={() => navigateTo('reports')}>
        <SvgIcon path={IC.rep} /> Report
      </button>
      <button type="button" className="b1 or" onClick={() => navigateTo('reports', 'daily')}>
        <SvgIcon path={IC.trend} /> Daily Consumption Report
      </button>
      <button type="button" className="b1" onClick={() => navigateTo('reports', 'batch')}>
        <SvgIcon path={IC.layers} /> Batch Detail
      </button>
    </>
  );

  const filterDefinitions = [
    { k: 'type', l: 'All Material Types', o: Object.entries(TYPES) },
    { k: 'firm', l: 'All Firms', o: visibleFirms.map(f => [f.name, f.name]) },
    { k: 'cat', l: 'All Categories', o: cats.map(x => [x, x]) },
    { k: 'sub', l: 'All Sub Categories', o: subs.map(x => [x, x]) },
    {
      k: 'status',
      l: 'All Status',
      o: [
        ['Active', 'Active'],
        ['Inactive', 'Inactive']
      ]
    }
  ];

  const tableData = () => {
    let result = R;
    if (selectedBand) {
      result = result.filter(x => x.band === selectedBand);
    }
    return result.sort(
      (a, b) =>
        a.firm.localeCompare(b.firm) ||
        Object.keys(TYPES).indexOf(a.type) - Object.keys(TYPES).indexOf(b.type) ||
        a.sku.localeCompare(b.sku)
    );
  };

  return (
    <>
      <GenericPageLayout
        title="Inventory Management IMS"
        sub="Live stock, re-order levels and stock bands for every SKU. Click any row to see its complete history."
        searchPlaceholder="Search SKU or material name..."
        pre={preContent}
        buttons={canWrite ? topButtons : null}
        filterDefs={filterDefinitions}
        cols={cols}
        data={tableData}
        sumCols={['val']}
        rowStyle={x => `--c:${BCOL[x.band]}`}
        onClickRow={row => openItemDetail(row.id)}
        act={canWrite ? (x => (
          <>
            <button
              type="button"
              className="ico"
              title="Edit"
              onClick={() => setActiveMaterialModalId(x.id)}
            >
              <SvgIcon path={IC.edit} />
            </button>
            <button
              type="button"
              className="ico"
              title="Physical count"
              onClick={() => setActiveCountItemId(x.id)}
            >
              <SvgIcon path={IC.count} />
            </button>
            <button
              type="button"
              className="ico dg"
              title="Delete"
              onClick={() => handleDeleteMaterial(x.id)}
            >
              <SvgIcon path={IC.trash} />
            </button>
          </>
        )) : null}
      />

      {activeMaterialModalId && (
        <MaterialModal
          itemId={activeMaterialModalId === 'NEW' ? null : activeMaterialModalId}
          onClose={() => setActiveMaterialModalId(null)}
        />
      )}

      {activeCountItemId && (
        <CountModal
          itemId={activeCountItemId}
          onClose={() => setActiveCountItemId(null)}
        />
      )}

      {activeTxnType && (
        <TransactionModal
          defaultType={activeTxnType}
          onClose={() => setActiveTxnType(null)}
        />
      )}
    </>
  );
}
