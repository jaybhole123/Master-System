import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import GenericPageLayout from '../components/GenericPageLayout';
import { TYPES, BCOL, BN, LOGO_BASE64 } from '../utils/constants';
import { fmt, inr, dfmt, SvgIcon, IC, today } from '../utils/helpers';
import Modal from '../components/Modal';
import TransactionModal from '../components/TransactionModal';

const UO = { 'Out of stock': 0, Critical: 1, Reorder: 2 };

export default function ReorderPage() {
  const {
    cx,
    visibleFirms,
    visibleItems,
    openItemDetail,
    navigateTo,
    operatorName,
    showError
  } = useApp();

  const [activeJobModalParams, setActiveJobModalParams] = useState(null);
  const [activeIndentModal, setActiveIndentModal] = useState(null); // items to indent or null

  const rows = Object.values(cx)
    .filter(x => x.need)
    .map(x => {
      const rate = x.wac || +x.i.rate || 0;
      return {
        ...x,
        supn: x.sup || '-',
        rate,
        cost: x.sug * rate
      };
    })
    .sort((a, b) => (UO[a.urg] ?? 99) - (UO[b.urg] ?? 99) || a.sku.localeCompare(b.sku));

  const handlePrintIndent = (targetRows) => {
    const purchasable = (targetRows || rows).filter(x => x.type !== 'FG');
    if (!purchasable.length) {
      showError('No purchasable SKUs in this list (finished goods need a job card)');
      return;
    }
    setActiveIndentModal(purchasable);
  };

  const topButtons = (
    <>
      <button type="button" className="b2" onClick={() => navigateTo('masters', 'gen')}>
        ⚙ Planning settings
      </button>
      <button type="button" className="b1" onClick={() => handlePrintIndent(rows)}>
        <SvgIcon path={IC.pr} /> Print purchase indent
      </button>
    </>
  );

  const filterDefinitions = [
    { k: 'firm', l: 'All Firms', o: visibleFirms.map(f => [f.name, f.name]) },
    { k: 'type', l: 'All Material Types', o: Object.entries(TYPES) },
    {
      k: 'supn',
      l: 'All Suppliers',
      o: [...new Set(visibleItems.map(i => i.sup || '-'))].map(x => [x, x])
    },
    {
      k: 'urg',
      l: 'All Urgency',
      o: Object.keys(UO).map(x => [x, x])
    }
  ];

  const cols = [
    {
      h: 'SKU Code',
      k: 'sku',
      f: x => (
        <>
          <a className="sku" onClick={() => openItemDetail(x.id)}>
            {x.sku}
          </a>
          <div className="av2">{x.name}</div>
        </>
      )
    },
    { h: 'Firm', k: 'firm' },
    {
      h: 'Type',
      k: 'type',
      f: x => <span className={`tag t${x.type}`}>{x.type}</span>
    },
    { h: 'Supplier', k: 'supn' },
    {
      h: 'Closing',
      k: 'cl',
      n: 1,
      c: 'hl',
      f: x => (
        <>
          <b>{fmt(x.cl)}</b> <span className="av2">{x.unit}</span>
        </>
      )
    },
    { h: 'Safety Stock', k: 'ss', n: 1 },
    { h: 'Reorder Lvl', k: 'rol', n: 1 },
    { h: 'Max Lvl', k: 'mx', n: 1 },
    { h: 'ADC', k: 'adc', n: 1 },
    {
      h: 'Days Cover',
      k: 'cover',
      n: 1,
      f: x => (x.cover == null ? '-' : fmt(x.cover, 1))
    },
    {
      h: 'Suggested Qty',
      k: 'sug',
      n: 1,
      f: x => (
        <>
          <b>{fmt(x.sug)}</b> {x.unit}
        </>
      )
    },
    { h: 'Rate', k: 'rate', n: 1 },
    { h: 'Est. Value', k: 'cost', n: 1, inr: 1, f: x => inr(x.cost) },
    {
      h: 'Band',
      k: 'band',
      f: x => (
        <span className={`bdg ${x.band === 'EX' ? 'bl' : x.band === 'NO' ? 'g' : x.band === 'MD' ? 'am' : 'rd'}`}>
          <i className="dot"></i>
          {BN[x.band]}
        </span>
      ),
      x: x => BN[x.band]
    },
    {
      h: 'Movement',
      k: 'cls',
      f: x => (
        <span className={`bdg ${x.cls === 'Fast' ? 'g' : x.cls === 'Slow' ? 'am' : 'rd'}`}>
          {x.cls}
        </span>
      )
    },
    {
      h: 'Urgency',
      k: 'urg',
      f: x => (
        <span className={`bdg ${x.urg === 'Reorder' ? 'am' : 'rd'}`}>
          {x.urg}
        </span>
      )
    }
  ];

  const cardsData = (rList) => [
    ['SKUs to re-order', rList.length, '#e5334b'],
    ['Out of stock / critical', rList.filter(x => x.urg !== 'Reorder').length, '#e5334b'],
    [
      'Est. purchase value',
      inr(rList.filter(x => x.type !== 'FG').reduce((s, x) => s + x.cost, 0)),
      '',
      `${rList.filter(x => x.type !== 'FG').length} SKUs to buy`
    ],
    ['To produce (job card)', rList.filter(x => x.type === 'FG').length, '#1f9d6b'],
    ['Dead / slow flagged', rList.filter(x => x.cls !== 'Fast').length, '#f29d12', 'Review before ordering']
  ];

  return (
    <>
      <GenericPageLayout
        title="Re-order List"
        sub="SKUs at or below their re-order level. Suggested qty brings stock back to max level (never below MOQ)."
        buttons={topButtons}
        filterDefs={filterDefinitions}
        cardsData={cardsData}
        cols={cols}
        data={rows}
        sumCols={['sug', 'cost']}
        rowStyle={x => `--c:${BCOL[x.band]}`}
        onClickRow={row => openItemDetail(row.id)}
        act={x =>
          x.type === 'FG' ? (
            <button
              type="button"
              className="b2 sm"
              onClick={() =>
                setActiveJobModalParams({
                  type: 'JOB',
                  preData: {
                    firm: x.fid,
                    fgc: x.cat,
                    loc: x.i.loc,
                    prod: [{ it: x.id, qty: x.sug }]
                  }
                })
              }
            >
              Plan job card
            </button>
          ) : (
            <button
              type="button"
              className="b2 sm"
              onClick={() => handlePrintIndent([x])}
            >
              Indent
            </button>
          )
        }
      />

      {activeJobModalParams && (
        <TransactionModal
          defaultType="JOB"
          preData={activeJobModalParams.preData}
          onClose={() => setActiveJobModalParams(null)}
        />
      )}

      {activeIndentModal && (
        <Modal
          title={`Purchase Indent - IND-${today().replace(/-/g, '')}`}
          width="wide"
          okText="🖨 Print"
          cancelText="Close"
          onOk={() => window.print()}
          onClose={() => setActiveIndentModal(null)}
        >
          <div className="vch">
            <div className="vh">
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <img src={LOGO_BASE64} alt="JBT" />
                <div>
                  <h2>JBT Coal Inventory Management</h2>
                  <div style={{ fontSize: '11px', color: '#555' }}>Purchase Requisition Indent</div>
                </div>
              </div>
              <div className="vt">
                <b>Purchase Indent</b>
                IND-{today().replace(/-/g, '')}
                <br />
                {dfmt(today())}
              </div>
            </div>

            {/* Group by supplier */}
            {(() => {
              const grouped = {};
              activeIndentModal.forEach(r => {
                grouped[r.supn] = grouped[r.supn] || [];
                grouped[r.supn].push(r);
              });

              return Object.entries(grouped).map(([sup, list]) => (
                <div key={sup} style={{ marginBottom: '20px' }}>
                  <p style={{ margin: '14px 0 6px' }}>
                    <b>Supplier: {sup === '-' ? 'Not set on material' : sup}</b>
                  </p>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>SKU</th>
                        <th>Material</th>
                        <th>Firm</th>
                        <th className="r">Stock</th>
                        <th className="r">Reorder lvl</th>
                        <th className="r">Order qty</th>
                        <th>UOM</th>
                        <th className="r">Rate</th>
                        <th className="r">Est. value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((r, n) => (
                        <tr key={n}>
                          <td>{n + 1}</td>
                          <td>{r.sku}</td>
                          <td>{r.name}</td>
                          <td>{r.firm}</td>
                          <td className="r">{fmt(r.cl)}</td>
                          <td className="r">{fmt(r.rol)}</td>
                          <td className="r"><b>{fmt(r.sug)}</b></td>
                          <td>{r.unit}</td>
                          <td className="r">{fmt(r.rate)}</td>
                          <td className="r">{inr(r.cost)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={9} className="r"><b>Total</b></td>
                        <td className="r"><b>{inr(list.reduce((s, r) => s + r.cost, 0))}</b></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ));
            })()}

            <div className="sig">
              <div>
                Raised by
                <br />
                <b>{operatorName}</b>
              </div>
              <div>Store in-charge</div>
              <div>Approved by</div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
