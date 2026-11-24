import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import GenericPageLayout from '../components/GenericPageLayout';
import { TT, TS } from '../utils/constants';
import { fmt, inr, dfmt, SvgIcon, IC } from '../utils/helpers';
import TransactionModal from '../components/TransactionModal';
import VoucherModal from '../components/VoucherModal';
import { usePagePermission } from '../../../hooks/usePagePermission';

const TTAB = [
  ['OUT', '↑', 'Sale', ''],
  ['IN', '↓', 'Purchase', 'gr'],
  ['JOB', '⚙', 'Job Card', ''],
  ['SR', '↩', 'Sales Return', 'nv'],
  ['REJ', '↪', 'Purchase Return', 'or'],
  ['TRF', '⇄', 'Transfer', 'nv']
];

export default function TransactionsPage() {
  const { canWrite } = usePagePermission("Inventory (IMS)", "Transactions");
  const {
    data,
    setData,
    visibleTxns,
    visibleFirms,
    visibleLocs,
    chkNeg,
    showToast,
    showError
  } = useApp();

  const [activeTxnModalParams, setActiveTxnModalParams] = useState(null); // { type, id }
  const [activeVoucherId, setActiveVoucherId] = useState(null);

  const itemMap = new Map(data.items.map(i => [i.id, i]));
  const firmMap = new Map(data.firms.map(f => [f.id, f.name]));
  const locMap = new Map(data.locs.map(l => [l.id, l.name]));

  const rows = visibleTxns
    .map(t => {
      const L = t.type === 'JOB' ? (t.batches || []).flatMap(b => b.lines || []) : t.lines || [];
      const P = t.prod || [];
      const itemsList = (t.type === 'JOB' ? P : L).map(l => itemMap.get(l.it)?.sku || '').filter(Boolean).join(', ');

      return {
        id: t.id,
        tid: t.id,
        date: t.date,
        no: t.no,
        type: t.type,
        typ: TT[t.type],
        firm: firmMap.get(t.firm) || '',
        party:
          t.party ||
          (t.type === 'JOB'
            ? t.fgc
            : t.type === 'TRF'
            ? `${locMap.get(t.loc) || ''} → ${locMap.get(t.toLoc) || ''}`
            : t.type === 'ADJ'
            ? 'Physical count'
            : ''),
        doc: t.inv || t.challan || t.against || '',
        challan: t.challan || '',
        veh: t.veh || '',
        items: itemsList,
        qty: t.type === 'JOB' ? P.reduce((s, l) => s + (+l.qty || 0), 0) : L.reduce((s, l) => s + Math.abs(+l.qty || 0), 0),
        val: L.reduce((s, l) => s + (+l.qty || 0) * (+l.rate || 0), 0),
        loc: locMap.get(t.loc) || '',
        op: t.op || ''
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  const handleDelete = (id) => {
    const txn = data.txns.find(x => x.id === id);
    if (!txn) return;

    if (!window.confirm(`Delete ${txn.no}? Its stock effect will be reversed.`)) return;

    const remainingTxns = data.txns.filter(x => x.id !== id);
    const negErr = chkNeg(remainingTxns);
    if (negErr) {
      showError('Cannot delete: ' + negErr);
      return;
    }

    setData({ ...data, txns: remainingTxns });
    showToast(`${txn.no} deleted`);
  };

  const topButtons = TTAB.map(([k, icon, label, cls]) => (
    <button
      key={k}
      type="button"
      className={`b1 ${cls}`}
      onClick={() => setActiveTxnModalParams({ type: k })}
    >
      {icon} {label}
    </button>
  ));

  const filterDefinitions = [
    { k: 'type', l: 'All Movement Types', o: Object.entries(TT).map(([k, v]) => [k, v]) },
    { k: 'firm', l: 'All Firms', o: visibleFirms.map(f => [f.name, f.name]) },
    { k: 'loc', l: 'All Locations', o: visibleLocs.map(l => [l.name, l.name]) }
  ];

  const cols = [
    { h: 'Date', k: 'date', f: x => dfmt(x.date), x: x => x.date },
    {
      h: 'Txn No',
      k: 'no',
      f: x => (
        <a className="lnk" onClick={() => setActiveVoucherId(x.tid)}>
          {x.no}
        </a>
      )
    },
    {
      h: 'Type',
      k: 'type',
      f: x => (
        <span className={`bdg ${TS[x.type]?.[1] || 'gy'}`}>
          {TS[x.type]?.[0] || x.type}
        </span>
      )
    },
    { h: 'Firm', k: 'firm' },
    { h: 'Party / Detail', k: 'party' },
    { h: 'Invoice / Challan', k: 'doc' },
    { h: 'Vehicle', k: 'veh' },
    {
      h: 'Items',
      k: 'items',
      f: x => (
        <span title={x.items}>
          {x.items.length > 34 ? x.items.slice(0, 34) + '…' : x.items}
        </span>
      )
    },
    { h: 'Qty', k: 'qty', n: 1 },
    { h: 'Value', k: 'val', n: 1, inr: 1, f: x => (x.val ? inr(x.val) : '-') },
    { h: 'Location', k: 'loc' },
    { h: 'Operator', k: 'op' }
  ];

  const cardsData = (rList) =>
    ['OUT', 'IN', 'JOB', 'SR', 'REJ', 'TRF'].map(k => {
      const filtered = rList.filter(y => y.type === k);
      const accent = {
        OUT: '#e5334b',
        IN: '#1f9d6b',
        JOB: '#2f6fed',
        SR: '#6d3fd1',
        REJ: '#ee7d14',
        TRF: '#5b6678'
      }[k];
      const subText = ['IN', 'OUT', 'SR', 'REJ'].includes(k)
        ? inr(filtered.reduce((s, y) => s + y.val, 0))
        : `${fmt(filtered.reduce((s, y) => s + y.qty, 0))} qty`;

      return [TT[k], filtered.length, accent, subText];
    });

  return (
    <>
      <GenericPageLayout
        title="Transactions"
        sub="Sale, purchase, job card, sales return, purchase return and transfer entries."
        buttons={canWrite ? topButtons : null}
        filterDefs={filterDefinitions}
        showDateRange={true}
        cardsData={cardsData}
        cols={cols}
        data={rows}
        sumCols={['qty', 'val']}
        onClickRow={row => setActiveVoucherId(row.id)}
        act={canWrite ? (x => (
          <>
            {x.type !== 'ADJ' && (
              <button
                type="button"
                className="ico"
                title="Edit"
                onClick={() => setActiveTxnModalParams({ id: x.id })}
              >
                <SvgIcon path={IC.edit} />
              </button>
            )}
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

      {activeTxnModalParams && (
        <TransactionModal
          defaultType={activeTxnModalParams.type || 'OUT'}
          txnId={activeTxnModalParams.id}
          onClose={() => setActiveTxnModalParams(null)}
        />
      )}

      {activeVoucherId && (
        <VoucherModal
          txnId={activeVoucherId}
          onClose={() => setActiveVoucherId(null)}
          onEdit={id => setActiveTxnModalParams({ id })}
        />
      )}
    </>
  );
}
