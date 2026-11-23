import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import GenericPageLayout from '../components/GenericPageLayout';
import { fmt, inr, dfmt, SvgIcon, IC, dAgo, MON, specChk } from '../utils/helpers';
import { TYPES, KN, REASONS, SRR } from '../utils/constants';
import VoucherModal from '../components/VoucherModal';

const REPORT_GROUPS = [
  [
    'Stock',
    [
      ['summary', 'Stock Summary'],
      ['ledger', 'Stock Ledger'],
      ['locw', 'Location-wise'],
      ['val', 'Valuation'],
      ['phys', 'Physical vs System']
    ]
  ],
  [
    'Movement',
    [
      ['outward', 'Sales Register'],
      ['inward', 'Purchase Register'],
      ['sr', 'Sales Returns'],
      ['rej', 'Purchase Returns'],
      ['trf', 'Transfers'],
      ['daily', 'Daily Consumption']
    ]
  ],
  [
    'Production',
    [
      ['job', 'Job Card / Yield'],
      ['batch', 'Batch Detail']
    ]
  ],
  [
    'Analysis',
    [
      ['reorder', 'Re-order'],
      ['fsn', 'FSN'],
      ['transit', 'Transit Loss'],
      ['quality', 'Coal Quality'],
      ['party', 'Party-wise']
    ]
  ]
];

export default function ReportsPage() {
  const {
    data,
    setData,
    activeTabs,
    setActiveTabs,
    visibleFirms,
    visibleLocs,
    visibleItems,
    visibleTxns,
    openItemDetail,
    aggregateStock,
    calcVals,
    entries,
    cx,
    navigateTo,
    showToast
  } = useApp();

  const currentTab = activeTabs.reports || 'summary';
  const setTab = tab => setActiveTabs(prev => ({ ...prev, reports: tab }));

  const [activeVoucherId, setActiveVoucherId] = useState(null);

  const firmMap = new Map(data.firms.map(f => [f.id, f.name]));
  const locMap = new Map(data.locs.map(l => [l.id, l.name]));
  const itemMap = new Map(data.items.map(i => [i.id, i]));

  const skuc = {
    h: 'SKU',
    k: 'sku',
    f: x => (
      <>
        <b>{x.sku}</b> <span className="av2">{x.name}</span>
      </>
    )
  };

  const dcol = { h: 'Date', k: 'date', f: x => dfmt(x.date), x: x => x.date };
  const lnk = (headerTitle = 'Txn No') => ({
    h: headerTitle,
    k: 'no',
    f: x => (
      <a className="lnk" onClick={() => setActiveVoucherId(x.tid)}>
        {x.no}
      </a>
    )
  });

  const ms = (list, fn) =>
    fmt(list.filter(x => x.unit === 'MT').reduce((s, x) => s + (+fn(x) || 0), 0)) + ' MT';

  // Navigation tabs header
  const preNav = (
    <div className="rnav">
      {REPORT_GROUPS.map(([grpName, tabList]) => (
        <div key={grpName} className="rg">
          <span>{grpName}</span>
          {tabList.map(([key, label]) => (
            <a
              key={key}
              className={key === currentTab ? 'on' : ''}
              onClick={() => setTab(key)}
            >
              {label}
            </a>
          ))}
        </div>
      ))}
    </div>
  );

  // Common filters
  const fF = () => ({ k: 'firm', l: 'All Firms', o: visibleFirms.map(f => [f.name, f.name]) });
  const tF = () => ({ k: 'type', l: 'All Material Types', o: Object.entries(TYPES) });
  const cF = () => ({ k: 'cat', l: 'All Categories', o: [...new Set(visibleItems.map(i => i.cat))].map(x => [x, x]) });
  const sF = () => ({ k: 'sku', l: 'All SKUs', o: visibleItems.map(i => [i.sku, `${i.sku} - ${i.sub}`]) });

  // 1. Stock Summary
  if (currentTab === 'summary') {
    const summaryData = (from, to) => {
      const A = aggregateStock(from, to);
      const V = calcVals(to);
      return visibleItems.map(i => {
        const a = A[i.id] || {};
        const v = V[i.id] || {};
        return {
          id: i.id,
          sku: i.sku,
          name: i.sub,
          firm: firmMap.get(i.firm) || '',
          type: i.type,
          cat: i.cat,
          unit: i.unit,
          op: a.op || 0,
          pur: a.k?.IN || 0,
          pr: a.k?.REJ || 0,
          sal: a.k?.OUT || 0,
          sr: a.k?.SR || 0,
          jc: a.k?.JC || 0,
          jp: a.k?.JP || 0,
          adj: (a.adj || 0) + (a.trf || 0),
          cl: a.cl || 0,
          wac: v.av || 0,
          val: Math.max(0, a.cl || 0) * (v.av || 0)
        };
      });
    };

    return (
      <>
        <GenericPageLayout
          title="Stock Summary"
          sub="Opening, movement and closing for the selected period. Pick a From / To date."
          pre={preNav}
          showDateRange={true}
          filterDefs={[fF(), tF(), cF()]}
          onClickRow={row => openItemDetail(row.id)}
          sumCols={['op', 'pur', 'pr', 'sal', 'sr', 'jc', 'jp', 'adj', 'cl', 'val']}
          cardsData={r => [
            ['SKUs', r.length],
            ['Purchase (coal)', ms(r, x => x.pur - x.pr), '#1f9d6b', 'Net of returns'],
            ['Sale (coal)', ms(r, x => x.sal - x.sr), '#e5334b', 'Net of returns'],
            ['Job made / used', `${ms(r, x => x.jp)} / ${ms(r, x => x.jc)}`, '#2f6fed'],
            ['Closing value', inr(r.reduce((s, x) => s + x.val, 0))]
          ]}
          cols={[
            skuc,
            { h: 'Firm', k: 'firm' },
            { h: 'Type', k: 'type', f: x => <span className={`tag t${x.type}`}>{x.type}</span> },
            { h: 'Category', k: 'cat' },
            { h: 'Unit', k: 'unit' },
            { h: 'Opening', k: 'op', n: 1 },
            { h: 'Purchase', k: 'pur', n: 1 },
            { h: 'Pur. Return', k: 'pr', n: 1 },
            { h: 'Sale', k: 'sal', n: 1 },
            { h: 'Sales Return', k: 'sr', n: 1 },
            { h: 'Job Used', k: 'jc', n: 1 },
            { h: 'Job Made', k: 'jp', n: 1 },
            { h: 'Adj.', k: 'adj', n: 1 },
            { h: 'Closing', k: 'cl', n: 1, c: 'hl' },
            { h: 'Avg Cost', k: 'wac', n: 1 },
            { h: 'Value', k: 'val', n: 1, inr: 1, f: x => inr(x.val) }
          ]}
          data={() => summaryData()}
        />
      </>
    );
  }

  // 2. Stock Ledger
  if (currentTab === 'ledger') {
    const B = {};
    visibleItems.forEach(i => { B[i.id] = +i.open || 0; });
    const ledgerList = entries
      .filter(e => itemMap.has(e.it))
      .map((e, idx) => {
        const it = itemMap.get(e.it);
        const t = e.t;
        B[e.it] += e.i - e.o;
        return {
          id: idx,
          tid: t.id,
          date: e.d,
          no: t.no,
          k: KN[e.k],
          kk: e.k,
          firm: firmMap.get(t.firm) || '',
          sku: it.sku,
          name: it.sub,
          unit: it.unit,
          party:
            t.party ||
            (t.type === 'TRF'
              ? (e.k === 'TO' ? 'To ' : 'From ') + (locMap.get(e.k === 'TO' ? t.toLoc : t.loc) || '')
              : t.fgc || ''),
          loc: locMap.get(e.loc) || '',
          i: e.i,
          o: e.o,
          bal: B[e.it],
          rate: e.r,
          veh: t.veh || '',
          ref: t.inv || t.challan || t.ref || ''
        };
      })
      .reverse();

    return (
      <>
        <GenericPageLayout
          title="Stock Ledger"
          sub="Every movement with running balance per SKU."
          pre={preNav}
          showDateRange={true}
          filterDefs={[fF(), sF(), { k: 'kk', l: 'All Movements', o: Object.entries(KN) }]}
          cardsData={r => [
            ['Entries', r.length],
            ['Total in (coal)', ms(r, x => x.i), '#1f9d6b'],
            ['Total out (coal)', ms(r, x => x.o), '#e5334b']
          ]}
          sumCols={['i', 'o']}
          cols={[
            dcol,
            lnk(),
            { h: 'Movement', k: 'k', f: x => <span className={`bdg ${x.i > 0 ? 'g' : 'rd'}`}>{x.k}</span> },
            { h: 'Firm', k: 'firm' },
            skuc,
            { h: 'Party / Detail', k: 'party' },
            { h: 'Location', k: 'loc' },
            { h: 'In', k: 'i', n: 1, f: x => (x.i ? fmt(x.i) : '-') },
            { h: 'Out', k: 'o', n: 1, f: x => (x.o ? fmt(x.o) : '-') },
            { h: 'Balance', k: 'bal', n: 1, f: x => <b>{fmt(x.bal)}</b> },
            { h: 'Unit', k: 'unit' },
            { h: 'Rate', k: 'rate', n: 1, f: x => (x.rate ? fmt(x.rate) : '-') },
            { h: 'Vehicle', k: 'veh' },
            { h: 'Invoice / Challan', k: 'ref' }
          ]}
          data={ledgerList}
        />
        {activeVoucherId && (
          <VoucherModal txnId={activeVoucherId} onClose={() => setActiveVoucherId(null)} />
        )}
      </>
    );
  }

  // 3. Location-wise Stock
  if (currentTab === 'locw') {
    const locRows = Object.values(cx).map(x => {
      const o = { id: x.id, sku: x.sku, name: x.name, firm: x.firm, type: x.type, unit: x.unit, tot: x.cl };
      visibleLocs.forEach(l => { o['L' + l.id] = x.locs[l.id] || 0; });
      return o;
    });

    return (
      <GenericPageLayout
        title="Location-wise Stock"
        sub="Current stock of every SKU at every storage location, with yard capacity use (MT)."
        pre={preNav}
        filterDefs={[fF(), tF()]}
        onClickRow={row => openItemDetail(row.id)}
        sumCols={visibleLocs.map(l => 'L' + l.id).concat('tot')}
        cardsData={() =>
          visibleLocs.map(l => {
            const q = Object.values(cx).filter(x => x.unit === 'MT').reduce((s, x) => s + (x.locs[l.id] || 0), 0);
            return [
              l.name,
              `${fmt(q)} MT`,
              q > l.cap * 0.9 && l.cap ? '#e5334b' : '',
              l.cap ? `${fmt((q / l.cap) * 100, 0)}% of ${fmt(l.cap)} MT capacity` : 'No capacity set'
            ];
          })
        }
        cols={[
          skuc,
          { h: 'Firm', k: 'firm' },
          { h: 'Unit', k: 'unit' },
          ...visibleLocs.map(l => ({
            h: l.name,
            k: 'L' + l.id,
            n: 1,
            f: x => (x['L' + l.id] ? fmt(x['L' + l.id]) : '-')
          })),
          { h: 'Total', k: 'tot', n: 1, c: 'hl' }
        ]}
        data={locRows}
      />
    );
  }

  // 4. Valuation
  if (currentTab === 'val') {
    const valRows = () => {
      const A = aggregateStock();
      const V = calcVals();
      const r = visibleItems.map(i => {
        const q = A[i.id]?.cl || 0;
        const v = V[i.id] || {};
        return {
          id: i.id,
          sku: i.sku,
          name: i.sub,
          firm: firmMap.get(i.firm) || '',
          type: i.type,
          cat: i.cat,
          unit: i.unit,
          cl: q,
          rate: +i.rate || 0,
          mval: Math.max(0, q) * (+i.rate || 0),
          wac: v.av || 0,
          val: Math.max(0, q) * (v.av || 0)
        };
      });
      const t = r.reduce((s, x) => s + x.val, 0);
      r.forEach(x => { x.pct = t ? (x.val / t) * 100 : 0; });
      return r.sort((a, b) => b.val - a.val);
    };

    return (
      <GenericPageLayout
        title="Stock Valuation"
        sub="Value at weighted average cost (WAC) as on the To date."
        pre={preNav}
        showDateRange={true}
        filterDefs={[fF(), tF(), cF()]}
        onClickRow={row => openItemDetail(row.id)}
        sumCols={['cl', 'val', 'mval']}
        cardsData={r => [
          ['SKUs', r.length],
          ['Value @ WAC', inr(r.reduce((s, x) => s + x.val, 0))],
          ['Value @ master rate', inr(r.reduce((s, x) => s + x.mval, 0))],
          ['Highest value', r.length ? r[0].sku : '-']
        ]}
        cols={[
          skuc,
          { h: 'Firm', k: 'firm' },
          { h: 'Category', k: 'cat' },
          { h: 'Unit', k: 'unit' },
          { h: 'Stock Qty', k: 'cl', n: 1 },
          { h: 'Master Rate', k: 'rate', n: 1 },
          { h: 'Value @ Rate', k: 'mval', n: 1, inr: 1, f: x => inr(x.mval) },
          { h: 'Avg Cost (WAC)', k: 'wac', n: 1 },
          { h: 'Value @ WAC', k: 'val', n: 1, inr: 1, c: 'hl', f: x => inr(x.val) },
          { h: 'Share %', k: 'pct', n: 1, f: x => `${fmt(x.pct, 1)}%` }
        ]}
        data={valRows}
      />
    );
  }

  // 5. Physical vs System
  if (currentTab === 'phys') {
    const physRows = data.counts
      .filter(c => itemMap.has(c.it))
      .map(c => {
        const it = itemMap.get(c.it) || {};
        return {
          id: c.id,
          date: c.date,
          sku: it.sku,
          name: it.sub,
          firm: firmMap.get(it.firm) || '',
          unit: it.unit,
          sys: c.sys,
          qty: c.qty,
          var: c.qty - c.sys,
          vp: c.sys ? ((c.qty - c.sys) / c.sys) * 100 : 0,
          rem: c.rem,
          op: c.op
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    const handleDeleteCount = id => {
      if (!window.confirm('Delete this physical count record?')) return;
      setData({ ...data, counts: data.counts.filter(c => c.id !== id) });
      showToast('Physical count deleted');
    };

    return (
      <GenericPageLayout
        title="Physical vs System Stock"
        sub="Every physical count against the system stock on that date."
        pre={preNav}
        showDateRange={true}
        filterDefs={[fF(), sF()]}
        sumCols={['sys', 'qty', 'var']}
        cardsData={r => [
          ['Counts', r.length],
          ['Net variance', fmt(r.reduce((s, x) => s + x.var, 0))],
          ['Shortage counts', r.filter(x => x.var < 0).length, '#e5334b'],
          ['Excess counts', r.filter(x => x.var > 0).length, '#1f9d6b']
        ]}
        cols={[
          dcol,
          skuc,
          { h: 'Firm', k: 'firm' },
          { h: 'Unit', k: 'unit' },
          { h: 'System Stock', k: 'sys', n: 1 },
          { h: 'Physical Stock', k: 'qty', n: 1, c: 'hl' },
          {
            h: 'Variance',
            k: 'var',
            n: 1,
            f: x => (
              <b style={{ color: x.var < 0 ? '#e5334b' : x.var > 0 ? '#1f9d6b' : 'inherit' }}>
                {x.var > 0 ? '+' : ''}
                {fmt(x.var)}
              </b>
            )
          },
          { h: 'Variance %', k: 'vp', n: 1, f: x => `${fmt(x.vp, 2)}%` },
          { h: 'Method / Remarks', k: 'rem' },
          { h: 'Counted by', k: 'op' }
        ]}
        act={x => (
          <button
            type="button"
            className="ico dg"
            title="Delete count"
            onClick={() => handleDeleteCount(x.id)}
          >
            <SvgIcon path={IC.trash} />
          </button>
        )}
        data={physRows}
      />
    );
  }

  // 6. Sales Register
  if (currentTab === 'outward') {
    const outRows = visibleTxns
      .filter(t => t.type === 'OUT')
      .flatMap(t =>
        (t.lines || []).map((l, n) => {
          const it = itemMap.get(l.it) || {};
          return {
            id: `${t.id}_${n}`,
            tid: t.id,
            date: t.date,
            no: t.no,
            firm: firmMap.get(t.firm) || '',
            party: t.party,
            dest: t.dest,
            challan: t.challan,
            inv: t.inv,
            veh: t.veh,
            sku: it.sku,
            name: it.sub,
            qty: l.qty,
            unit: it.unit,
            rate: l.rate || 0,
            val: l.qty * (l.rate || 0),
            loc: locMap.get(t.loc) || ''
          };
        })
      )
      .sort((a, b) => b.date.localeCompare(a.date));

    return (
      <>
        <GenericPageLayout
          title="Sales Register"
          sub="Every sale / dispatch with challan, vehicle and sale value."
          pre={preNav}
          showDateRange={true}
          filterDefs={[fF(), sF()]}
          sumCols={['qty', 'val']}
          cardsData={r => [
            ['Dispatches', new Set(r.map(x => x.tid)).size],
            ['Coal issued', ms(r, x => x.qty), '#e5334b'],
            ['Sale value', inr(r.reduce((s, x) => s + x.val, 0)), '#1f9d6b'],
            ['Parties', new Set(r.map(x => x.party)).size]
          ]}
          cols={[
            dcol,
            lnk(),
            { h: 'Firm', k: 'firm' },
            { h: 'Party', k: 'party' },
            { h: 'Destination', k: 'dest' },
            { h: 'Challan', k: 'challan' },
            { h: 'Invoice', k: 'inv' },
            { h: 'Vehicle', k: 'veh' },
            skuc,
            { h: 'Qty', k: 'qty', n: 1, c: 'hl' },
            { h: 'Unit', k: 'unit' },
            { h: 'Rate', k: 'rate', n: 1, f: x => (x.rate ? fmt(x.rate) : '-') },
            { h: 'Value', k: 'val', n: 1, inr: 1, f: x => (x.val ? inr(x.val) : '-') },
            { h: 'Location', k: 'loc' }
          ]}
          onClickRow={row => setActiveVoucherId(row.tid)}
          data={outRows}
        />
        {activeVoucherId && (
          <VoucherModal txnId={activeVoucherId} onClose={() => setActiveVoucherId(null)} />
        )}
      </>
    );
  }

  // 7. Purchase Register
  if (currentTab === 'inward') {
    const inRows = visibleTxns
      .filter(t => t.type === 'IN')
      .flatMap(t =>
        (t.lines || []).map((l, n) => {
          const it = itemMap.get(l.it) || {};
          const specFlags = t.q && t.q.gcv ? specChk(it, t.q) : [];
          return {
            id: `${t.id}_${n}`,
            tid: t.id,
            date: t.date,
            no: t.no,
            firm: firmMap.get(t.firm) || '',
            party: t.party,
            inv: t.inv,
            veh: t.veh,
            sku: it.sku,
            name: it.sub,
            billed: l.billed || 0,
            qty: l.qty,
            short: l.billed ? l.billed - l.qty : 0,
            sp: l.billed ? ((l.billed - l.qty) / l.billed) * 100 : 0,
            unit: it.unit,
            rate: l.rate || 0,
            val: l.qty * (l.rate || 0),
            gcv: t.q?.gcv || 0,
            tm: t.q?.tm || 0,
            ash: t.q?.ash || 0,
            specFlags,
            loc: locMap.get(t.loc) || ''
          };
        })
      )
      .sort((a, b) => b.date.localeCompare(a.date));

    return (
      <>
        <GenericPageLayout
          title="Purchase Register"
          sub="Every purchase receipt with bill vs received quantity, transit shortage and coal quality."
          pre={preNav}
          showDateRange={true}
          filterDefs={[fF(), sF()]}
          sumCols={['billed', 'qty', 'short', 'val']}
          cardsData={r => [
            [
              'Receipts',
              new Set(r.map(x => x.tid)).size,
              '',
              `${r.filter(x => x.specFlags?.length).length} outside coal spec`
            ],
            ['Coal received', ms(r, x => x.qty), '#1f9d6b'],
            [
              'Transit shortage',
              ms(r, x => x.short),
              '#e5334b',
              `${inr(r.reduce((s, x) => s + x.short * x.rate, 0))} value`
            ],
            ['Purchase value', inr(r.reduce((s, x) => s + x.val, 0))]
          ]}
          cols={[
            dcol,
            lnk('GRN No'),
            { h: 'Firm', k: 'firm' },
            { h: 'Supplier', k: 'party' },
            { h: 'Invoice', k: 'inv' },
            { h: 'Vehicle / Rake', k: 'veh' },
            skuc,
            { h: 'Billed', k: 'billed', n: 1 },
            { h: 'Received', k: 'qty', n: 1, c: 'hl' },
            {
              h: 'Shortage',
              k: 'short',
              n: 1,
              f: x => (x.short ? <b style={{ color: '#e5334b' }}>{fmt(x.short)}</b> : '-')
            },
            {
              h: 'Short %',
              k: 'sp',
              n: 1,
              f: x => (x.sp ? `${fmt(x.sp, 2)}%` : '-')
            },
            { h: 'Unit', k: 'unit' },
            { h: 'Rate', k: 'rate', n: 1 },
            { h: 'Value', k: 'val', n: 1, inr: 1, f: x => inr(x.val) },
            { h: 'GCV', k: 'gcv', n: 1, f: x => (x.gcv ? fmt(x.gcv, 0) : '-') },
            { h: 'TM %', k: 'tm', n: 1, f: x => (x.tm ? fmt(x.tm, 1) : '-') },
            { h: 'Ash %', k: 'ash', n: 1, f: x => (x.ash ? fmt(x.ash, 1) : '-') },
            {
              h: 'Spec Check',
              k: 'specFlags',
              f: x =>
                !x.gcv ? (
                  <span className="av2">-</span>
                ) : x.specFlags.length ? (
                  x.specFlags.map(sf => (
                    <span key={sf} className="bdg rd" style={{ marginRight: '4px' }}>
                      {sf}
                    </span>
                  ))
                ) : (
                  <span className="bdg g">Within spec</span>
                )
            },
            { h: 'Location', k: 'loc' }
          ]}
          onClickRow={row => setActiveVoucherId(row.tid)}
          data={inRows}
        />
        {activeVoucherId && (
          <VoucherModal txnId={activeVoucherId} onClose={() => setActiveVoucherId(null)} />
        )}
      </>
    );
  }

  // 8. Daily Consumption Report
  if (currentTab === 'daily') {
    const to = today();
    const from = dAgo(13);
    const dateRangeList = [];
    const ud = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
    for (let d = from; d <= to; d = ud(d, 1)) {
      dateRangeList.push(d);
    }

    const dailyRows = visibleItems.map(it => {
      const o = {
        id: it.id,
        sku: it.sku,
        name: it.sub,
        unit: it.unit,
        firm: firmMap.get(it.firm) || '',
        type: it.type,
        adc: cx[it.id]?.adc || 0
      };
      dateRangeList.forEach(d => { o['d' + d] = 0; });

      for (const e of entries) {
        if (e.it === it.id && 'd' + e.d in o) {
          if (e.k === 'OUT' || e.k === 'JC') o['d' + e.d] += e.o;
          else if (e.k === 'SR') o['d' + e.d] -= e.i;
        }
      }

      o.tot = dateRangeList.reduce((acc, d) => acc + o['d' + d], 0);
      o.avg = o.tot / dateRangeList.length;
      return o;
    });

    return (
      <GenericPageLayout
        title="Daily Consumption Report"
        sub={`Net consumption (sale + job card used − sales return) per SKU per day, ${dfmt(from)} to ${dfmt(to)}.`}
        pre={preNav}
        filterDefs={[fF(), tF()]}
        sumCols={[...dateRangeList.map(d => 'd' + d), 'tot']}
        onClickRow={row => openItemDetail(row.id)}
        cardsData={r => [
          ['Days', dateRangeList.length],
          [
            'Coal consumed',
            ms(r, x => x.tot),
            '#e5334b',
            `${fmt(r.reduce((s, x) => s + x.tot, 0) / dateRangeList.length, 1)} per day across SKUs`
          ]
        ]}
        cols={[
          skuc,
          { h: 'Unit', k: 'unit' },
          ...dateRangeList.map(d => ({
            h: `${d.slice(8)}-${MON[+d.slice(5, 7) - 1]}`,
            k: 'd' + d,
            n: 1,
            f: x => (x['d' + d] ? fmt(x['d' + d]) : <span className="av2">-</span>)
          })),
          { h: 'Total', k: 'tot', n: 1, c: 'hl' },
          { h: 'Avg / Day', k: 'avg', n: 1, f: x => fmt(x.avg, 1) },
          { h: 'ADC (plan)', k: 'adc', n: 1 }
        ]}
        data={dailyRows}
      />
    );
  }

  // 9. Batch Detail
  if (currentTab === 'batch') {
    const batchRows = visibleTxns
      .filter(t => t.type === 'JOB')
      .flatMap(t =>
        (t.batches || []).flatMap((b, bn) =>
          (b.lines || []).map((l, n) => {
            const it = itemMap.get(l.it) || {};
            return {
              id: `${t.id}${bn}_${n}`,
              tid: t.id,
              date: t.date,
              no: t.no,
              firm: firmMap.get(t.firm) || '',
              fgc: t.fgc,
              bn: bn + 1,
              sku: it.sku,
              name: it.sub,
              unit: it.unit,
              qty: l.qty,
              nb: n === 0 ? b.nb : 0,
              rb: n === 0 ? b.rb : 0,
              rm: b.rm,
              prod: (t.prod || [])
                .map(p => `${itemMap.get(p.it)?.sku || ''} ${fmt(p.qty)}`)
                .join(', '),
              loc: locMap.get(t.loc) || ''
            };
          })
        )
      )
      .sort((a, b) => b.date.localeCompare(a.date));

    return (
      <>
        <GenericPageLayout
          title="Batch Detail"
          sub="Batch-wise material consumed on every job card, with remaining batches and material."
          pre={preNav}
          showDateRange={true}
          filterDefs={[fF(), sF()]}
          sumCols={['qty', 'nb', 'rb']}
          cardsData={r => [
            ['Batch lines', r.length],
            ['Material consumed', fmt(r.reduce((s, x) => s + x.qty, 0))],
            ['Batches run', fmt(r.reduce((s, x) => s + x.nb, 0))],
            ['Remaining batches', fmt(r.reduce((s, x) => s + x.rb, 0)), '#f29d12']
          ]}
          cols={[
            dcol,
            lnk('Job Card'),
            { h: 'Firm', k: 'firm' },
            { h: 'FG Category', k: 'fgc' },
            { h: 'Batch', k: 'bn', f: x => `Batch ${x.bn}` },
            skuc,
            { h: 'Qty', k: 'qty', n: 1, c: 'hl' },
            { h: 'Unit', k: 'unit' },
            { h: 'No. of Batches', k: 'nb', n: 1 },
            { h: 'Remaining Batches', k: 'rb', n: 1 },
            { h: 'Remaining Material', k: 'rm' },
            { h: 'Production', k: 'prod' },
            { h: 'Plant', k: 'loc' }
          ]}
          onClickRow={row => setActiveVoucherId(row.tid)}
          data={batchRows}
        />
        {activeVoucherId && (
          <VoucherModal txnId={activeVoucherId} onClose={() => setActiveVoucherId(null)} />
        )}
      </>
    );
  }

  // 10. Job Card / Production Yield
  if (currentTab === 'job') {
    const jobRows = visibleTxns
      .filter(t => t.type === 'JOB')
      .map(t => {
        const B = (t.batches || []).flatMap(b => b.lines || []);
        const inp = B.reduce((s, l) => s + (+l.qty || 0), 0);
        const out = (t.prod || []).reduce((s, l) => s + (+l.qty || 0), 0);
        const sc = (t.prod || []).reduce((s, l) => s + (+l.scrap || 0), 0);
        return {
          id: t.id,
          tid: t.id,
          date: t.date,
          no: t.no,
          firm: firmMap.get(t.firm) || '',
          fgc: t.fgc,
          mats: [...new Set(B.map(l => itemMap.get(l.it)?.sku).filter(Boolean))].join(', '),
          prods: (t.prod || []).map(l => itemMap.get(l.it)?.sku).filter(Boolean).join(', '),
          nb: (t.batches || []).reduce((s, b) => s + (+b.nb || 0), 0),
          inp,
          out,
          sc,
          yld: inp ? (out / inp) * 100 : 0,
          loss: inp - out - sc,
          loc: locMap.get(t.loc) || '',
          ref: t.ref
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    return (
      <>
        <GenericPageLayout
          title="Job Card / Production Yield"
          sub="Input consumed, output produced, scraps and yield for every job card."
          pre={preNav}
          showDateRange={true}
          filterDefs={[fF()]}
          sumCols={['inp', 'out', 'sc', 'loss']}
          cardsData={r => {
            const iSum = r.reduce((s, x) => s + x.inp, 0);
            const oSum = r.reduce((s, x) => s + x.out, 0);
            return [
              ['Job cards', r.length],
              ['Input consumed', fmt(iSum)],
              ['Output produced', fmt(oSum), '#1f9d6b'],
              ['Scraps', fmt(r.reduce((s, x) => s + x.sc, 0)), '#ee7d14'],
              ['Average yield', iSum ? `${fmt((oSum / iSum) * 100, 1)}%` : '-', '#2f6fed']
            ];
          }}
          cols={[
            dcol,
            lnk('Job Card'),
            { h: 'Firm', k: 'firm' },
            { h: 'FG Category', k: 'fgc' },
            { h: 'Materials Consumed', k: 'mats' },
            { h: 'Products', k: 'prods' },
            { h: 'Batches', k: 'nb', n: 1 },
            { h: 'Input', k: 'inp', n: 1 },
            { h: 'Output', k: 'out', n: 1, c: 'hl' },
            { h: 'Scraps', k: 'sc', n: 1 },
            {
              h: 'Yield %',
              k: 'yld',
              n: 1,
              f: x => (
                <b style={{ color: x.yld < 75 ? '#e5334b' : '#1f9d6b' }}>
                  {fmt(x.yld, 1)}%
                </b>
              )
            },
            { h: 'Unaccounted', k: 'loss', n: 1 },
            { h: 'Plant', k: 'loc' },
            { h: 'WO / Ref', k: 'ref' }
          ]}
          onClickRow={row => setActiveVoucherId(row.id)}
          data={jobRows}
        />
        {activeVoucherId && (
          <VoucherModal txnId={activeVoucherId} onClose={() => setActiveVoucherId(null)} />
        )}
      </>
    );
  }

  // 11. Transfers
  if (currentTab === 'trf') {
    const trfRows = visibleTxns
      .filter(t => t.type === 'TRF')
      .flatMap(t =>
        (t.lines || []).map((l, n) => {
          const it = itemMap.get(l.it) || {};
          return {
            id: `${t.id}_${n}`,
            tid: t.id,
            date: t.date,
            no: t.no,
            firm: firmMap.get(t.firm) || '',
            from: locMap.get(t.loc) || '',
            to: locMap.get(t.toLoc) || '',
            veh: t.veh,
            sku: it.sku,
            name: it.sub,
            qty: l.qty,
            unit: it.unit,
            rem: t.rem
          };
        })
      )
      .sort((a, b) => b.date.localeCompare(a.date));

    return (
      <>
        <GenericPageLayout
          title="Transfer Report"
          sub="Stock moved between yards, depots, sidings and the plant."
          pre={preNav}
          showDateRange={true}
          filterDefs={[fF()]}
          sumCols={['qty']}
          cardsData={r => [
            ['Transfers', new Set(r.map(x => x.tid)).size],
            ['Qty moved', ms(r, x => x.qty)]
          ]}
          cols={[
            dcol,
            lnk(),
            { h: 'Firm', k: 'firm' },
            { h: 'From', k: 'from' },
            { h: 'To', k: 'to' },
            { h: 'Vehicle', k: 'veh' },
            skuc,
            { h: 'Qty', k: 'qty', n: 1, c: 'hl' },
            { h: 'Unit', k: 'unit' },
            { h: 'Remarks', k: 'rem' }
          ]}
          onClickRow={row => setActiveVoucherId(row.tid)}
          data={trfRows}
        />
        {activeVoucherId && (
          <VoucherModal txnId={activeVoucherId} onClose={() => setActiveVoucherId(null)} />
        )}
      </>
    );
  }

  // 12. Purchase Returns
  if (currentTab === 'rej') {
    const rejRows = visibleTxns
      .filter(t => t.type === 'REJ')
      .flatMap(t =>
        (t.lines || []).map((l, n) => {
          const it = itemMap.get(l.it) || {};
          return {
            id: `${t.id}_${n}`,
            tid: t.id,
            date: t.date,
            no: t.no,
            firm: firmMap.get(t.firm) || '',
            party: t.party,
            against: t.against,
            reason: t.reason,
            sku: it.sku,
            name: it.sub,
            qty: l.qty,
            unit: it.unit,
            val: l.qty * (l.rate || +it.rate || 0),
            loc: locMap.get(t.loc) || '',
            rem: t.rem
          };
        })
      )
      .sort((a, b) => b.date.localeCompare(a.date));

    return (
      <>
        <GenericPageLayout
          title="Purchase Returns"
          sub="Material returned to suppliers, by supplier and reason."
          pre={preNav}
          showDateRange={true}
          filterDefs={[fF(), { k: 'reason', l: 'All Reasons', o: REASONS.map(x => [x, x]) }]}
          sumCols={['qty', 'val']}
          cardsData={r => [
            ['Rejections', new Set(r.map(x => x.tid)).size],
            ['Rejected qty', ms(r, x => x.qty), '#ee7d14'],
            ['Debit value', inr(r.reduce((s, x) => s + x.val, 0))]
          ]}
          cols={[
            dcol,
            lnk(),
            { h: 'Firm', k: 'firm' },
            { h: 'Supplier', k: 'party' },
            { h: 'Against', k: 'against' },
            skuc,
            { h: 'Qty', k: 'qty', n: 1, c: 'hl' },
            { h: 'Unit', k: 'unit' },
            { h: 'Reason', k: 'reason', f: x => <span className="bdg am">{x.reason}</span> },
            { h: 'Value', k: 'val', n: 1, inr: 1, f: x => inr(x.val) },
            { h: 'Location', k: 'loc' },
            { h: 'Remarks', k: 'rem' }
          ]}
          onClickRow={row => setActiveVoucherId(row.tid)}
          data={rejRows}
        />
        {activeVoucherId && (
          <VoucherModal txnId={activeVoucherId} onClose={() => setActiveVoucherId(null)} />
        )}
      </>
    );
  }

  // 13. Sales Returns
  if (currentTab === 'sr') {
    const srRows = visibleTxns
      .filter(t => t.type === 'SR')
      .flatMap(t =>
        (t.lines || []).map((l, n) => {
          const it = itemMap.get(l.it) || {};
          return {
            id: `${t.id}_${n}`,
            tid: t.id,
            date: t.date,
            no: t.no,
            firm: firmMap.get(t.firm) || '',
            party: t.party,
            against: t.against,
            reason: t.reason,
            sku: it.sku,
            name: it.sub,
            qty: l.qty,
            unit: it.unit,
            val: l.qty * (l.rate || +it.rate || 0),
            loc: locMap.get(t.loc) || '',
            rem: t.rem
          };
        })
      )
      .sort((a, b) => b.date.localeCompare(a.date));

    return (
      <>
        <GenericPageLayout
          title="Sales Returns"
          sub="Material returned by customers, by customer and reason."
          pre={preNav}
          showDateRange={true}
          filterDefs={[fF(), { k: 'reason', l: 'All Reasons', o: SRR.map(x => [x, x]) }]}
          sumCols={['qty', 'val']}
          cardsData={r => [
            ['Sales returns', new Set(r.map(x => x.tid)).size],
            ['Qty returned', ms(r, x => x.qty), '#ee7d14'],
            ['Credit value', inr(r.reduce((s, x) => s + x.val, 0))]
          ]}
          cols={[
            dcol,
            lnk(),
            { h: 'Firm', k: 'firm' },
            { h: 'Customer', k: 'party' },
            { h: 'Against', k: 'against' },
            skuc,
            { h: 'Qty', k: 'qty', n: 1, c: 'hl' },
            { h: 'Unit', k: 'unit' },
            { h: 'Reason', k: 'reason', f: x => <span className="bdg am">{x.reason}</span> },
            { h: 'Value', k: 'val', n: 1, inr: 1, f: x => inr(x.val) },
            { h: 'Location', k: 'loc' },
            { h: 'Remarks', k: 'rem' }
          ]}
          onClickRow={row => setActiveVoucherId(row.tid)}
          data={srRows}
        />
        {activeVoucherId && (
          <VoucherModal txnId={activeVoucherId} onClose={() => setActiveVoucherId(null)} />
        )}
      </>
    );
  }

  // 14. FSN Analysis
  if (currentTab === 'fsn') {
    const fsnRows = Object.values(cx)
      .map(x => ({
        ...x,
        tip:
          x.cls === 'Fast'
            ? 'Keep stocked, watch lead time'
            : x.cls === 'Slow'
            ? 'Order smaller lots'
            : x.cl > 0
            ? 'Stop re-ordering, sell or blend'
            : 'Consider deactivating'
      }))
      .sort(
        (a, b) =>
          ({ Fast: 0, Slow: 1, Dead: 2 }[a.cls] - { Fast: 0, Slow: 1, Dead: 2 }[b.cls]) ||
          b.tr - a.tr
      );

    return (
      <GenericPageLayout
        title="FSN Analysis - Fast / Slow / Dead Stock"
        sub={`Turnover = issues in last ${data.cfg.fsnDays} days ÷ average stock. Fast ≥ ${data.cfg.fastTR}×, Dead = no issue for ${data.cfg.deadDays}+ days.`}
        pre={preNav}
        buttons={
          <button type="button" className="b2" onClick={() => navigateTo('settings', 'gen')}>
            ⚙ FSN settings
          </button>
        }
        filterDefs={[
          fF(),
          tF(),
          {
            k: 'cls',
            l: 'All Classes',
            o: [
              ['Fast', 'Fast moving'],
              ['Slow', 'Slow moving'],
              ['Dead', 'Dead stock']
            ]
          }
        ]}
        onClickRow={row => openItemDetail(row.id)}
        sumCols={['cl', 'out2', 'val']}
        cardsData={r => [
          [
            'Fast moving',
            r.filter(x => x.cls === 'Fast').length,
            '#1f9d6b',
            inr(r.filter(x => x.cls === 'Fast').reduce((s, x) => s + x.val, 0))
          ],
          [
            'Slow moving',
            r.filter(x => x.cls === 'Slow').length,
            '#f29d12',
            inr(r.filter(x => x.cls === 'Slow').reduce((s, x) => s + x.val, 0))
          ],
          [
            'Dead stock',
            r.filter(x => x.cls === 'Dead').length,
            '#e5334b',
            `${inr(r.filter(x => x.cls === 'Dead').reduce((s, x) => s + x.val, 0))} locked up`
          ]
        ]}
        cols={[
          skuc,
          { h: 'Firm', k: 'firm' },
          { h: 'Type', k: 'type', f: x => <span className={`tag t${x.type}`}>{x.type}</span> },
          { h: 'Unit', k: 'unit' },
          { h: 'Closing', k: 'cl', n: 1 },
          { h: `Issued (${data.cfg.fsnDays}d)`, k: 'out2', n: 1 },
          { h: 'Turnover', k: 'tr', n: 1, f: x => `${x.tr.toFixed(2)}×` },
          { h: 'Last Issue', k: 'last', f: x => (x.last ? dfmt(x.last) : 'Never') },
          { h: 'Days Idle', k: 'ds', n: 1, f: x => (x.ds == null ? '-' : x.ds) },
          { h: 'Value', k: 'val', n: 1, inr: 1, f: x => inr(x.val) },
          {
            h: 'Class',
            k: 'cls',
            f: x => (
              <span className={`bdg ${x.cls === 'Fast' ? 'g' : x.cls === 'Slow' ? 'am' : 'rd'}`}>
                {x.cls}
              </span>
            )
          },
          { h: 'Suggestion', k: 'tip' }
        ]}
        data={fsnRows}
      />
    );
  }

  // 15. Transit Loss / Shortage
  if (currentTab === 'transit') {
    const G = {};
    visibleTxns
      .filter(t => t.type === 'IN')
      .forEach(t => {
        (t.lines || [])
          .filter(l => l.billed > 0)
          .forEach(l => {
            const k = `${t.party}|${t.firm}`;
            const g = (G[k] = G[k] || {
              id: k,
              party: t.party,
              firm: firmMap.get(t.firm) || '',
              n: 0,
              billed: 0,
              qty: 0,
              short: 0,
              sval: 0,
              wst: 0,
              T: new Set()
            });
            g.T.add(t.id);
            g.billed += l.billed;
            g.qty += l.qty;
            g.short += l.billed - l.qty;
            g.sval += (l.billed - l.qty) * (l.rate || 0);
            g.wst = Math.max(g.wst, ((l.billed - l.qty) / l.billed) * 100);
          });
      });

    const transitRows = Object.values(G)
      .map(g => ({
        ...g,
        n: g.T.size,
        sp: g.billed ? (g.short / g.billed) * 100 : 0
      }))
      .sort((a, b) => b.sp - a.sp);

    return (
      <GenericPageLayout
        title="Transit Loss / Shortage"
        sub="Billed vs received quantity on receipts, supplier-wise. Pick a period with From / To."
        pre={preNav}
        showDateRange={true}
        filterDefs={[fF()]}
        sumCols={['n', 'billed', 'qty', 'short', 'sval']}
        cardsData={r => {
          const b = r.reduce((s, x) => s + x.billed, 0);
          const s = r.reduce((s, x) => s + x.short, 0);
          return [
            ['Suppliers', r.length],
            ['Billed qty', fmt(b)],
            ['Received qty', fmt(r.reduce((acc, x) => acc + x.qty, 0)), '#1f9d6b'],
            ['Shortage', `${fmt(s)} (${b ? fmt((s / b) * 100, 2) : 0}%)`, '#e5334b'],
            ['Shortage value', inr(r.reduce((acc, x) => acc + x.sval, 0)), '#e5334b']
          ];
        }}
        cols={[
          { h: 'Supplier', k: 'party' },
          { h: 'Firm', k: 'firm' },
          { h: 'Receipts', k: 'n', n: 1 },
          { h: 'Billed Qty', k: 'billed', n: 1 },
          { h: 'Received Qty', k: 'qty', n: 1 },
          {
            h: 'Shortage',
            k: 'short',
            n: 1,
            c: 'hl',
            f: x => (
              <b style={{ color: x.short > 0 ? '#e5334b' : 'inherit' }}>
                {fmt(x.short)}
              </b>
            )
          },
          {
            h: 'Shortage %',
            k: 'sp',
            n: 1,
            f: x => (
              <b style={{ color: x.sp > 1 ? '#e5334b' : x.sp > 0.5 ? '#b87700' : '#1f9d6b' }}>
                {fmt(x.sp, 2)}%
              </b>
            )
          },
          { h: 'Shortage Value', k: 'sval', n: 1, inr: 1, f: x => inr(x.sval) },
          { h: 'Worst Single %', k: 'wst', n: 1, f: x => `${fmt(x.wst, 2)}%` }
        ]}
        data={transitRows}
      />
    );
  }

  // 16. Coal Quality Report
  if (currentTab === 'quality') {
    const G = {};
    visibleTxns
      .filter(t => t.type === 'IN' && t.q && t.q.gcv)
      .forEach(t => {
        (t.lines || []).forEach(l => {
          const it = itemMap.get(l.it) || {};
          const k = `${t.party}|${l.it}`;
          const g = (G[k] = G[k] || {
            id: k,
            party: t.party,
            sku: it.sku,
            name: it.sub,
            it: l.it,
            n: 0,
            qty: 0,
            g: 0,
            m: 0,
            a: 0,
            gmin: 1e9,
            gmax: 0
          });
          g.n++;
          g.qty += l.qty;
          g.g += t.q.gcv * l.qty;
          g.m += t.q.tm * l.qty;
          g.a += t.q.ash * l.qty;
          g.gmin = Math.min(g.gmin, t.q.gcv);
          g.gmax = Math.max(g.gmax, t.q.gcv);
        });
      });

    const qualityRows = Object.values(G).map(g => {
      const it = itemMap.get(g.it);
      const avgGcv = g.g / g.qty;
      const avgTm = g.m / g.qty;
      const avgAsh = g.a / g.qty;
      const specIssues = it ? specChk(it, { gcv: avgGcv, tm: avgTm, ash: avgAsh }) : [];

      const rejQty = visibleTxns
        .filter(t => t.type === 'REJ' && t.party === g.party)
        .flatMap(t => t.lines || [])
        .filter(l => l.it === g.it)
        .reduce((s, l) => s + (+l.qty || 0), 0);

      return {
        ...g,
        gcv: avgGcv,
        tm: avgTm,
        ash: avgAsh,
        specIssues,
        rej: rejQty
      };
    });

    return (
      <GenericPageLayout
        title="Coal Quality Report"
        sub="Quantity-weighted GCV, moisture and ash from receipt lab reports, by supplier and SKU."
        pre={preNav}
        showDateRange={true}
        filterDefs={[fF()]}
        sumCols={['n', 'qty']}
        cardsData={r => {
          const totalQ = r.reduce((s, x) => s + x.qty, 0);
          const avgField = k => (totalQ ? r.reduce((s, x) => s + x[k] * x.qty, 0) / totalQ : 0);
          return [
            ['Supplier-SKU pairs', r.length],
            ['Qty with lab report', fmt(totalQ)],
            ['Avg GCV', `${fmt(avgField('gcv'), 0)} kcal/kg`, '#2f6fed'],
            ['Avg moisture', `${fmt(avgField('tm'), 1)}%`],
            ['Avg ash', `${fmt(avgField('ash'), 1)}%`, '#ee7d14']
          ];
        }}
        cols={[
          { h: 'Supplier', k: 'party' },
          skuc,
          { h: 'Receipts', k: 'n', n: 1 },
          { h: 'Qty', k: 'qty', n: 1 },
          { h: 'Avg GCV', k: 'gcv', n: 1, c: 'hl', f: x => fmt(x.gcv, 0) },
          { h: 'Min GCV', k: 'gmin', n: 1, f: x => fmt(x.gmin, 0) },
          { h: 'Max GCV', k: 'gmax', n: 1, f: x => fmt(x.gmax, 0) },
          { h: 'Avg TM %', k: 'tm', n: 1, f: x => fmt(x.tm, 1) },
          {
            h: 'Avg Ash %',
            k: 'ash',
            n: 1,
            f: x => (
              <b style={{ color: x.ash > 38 ? '#e5334b' : 'inherit' }}>
                {fmt(x.ash, 1)}
              </b>
            )
          },
          { h: 'Rejected Qty', k: 'rej', n: 1 },
          {
            h: 'Vs Spec',
            k: 'specIssues',
            f: x =>
              x.specIssues?.length ? (
                x.specIssues.map(si => (
                  <span key={si} className="bdg rd" style={{ marginRight: '4px' }}>
                    {si}
                  </span>
                ))
              ) : (
                <span className="bdg g">Within spec</span>
              )
          }
        ]}
        data={qualityRows}
      />
    );
  }

  // 17. Party-wise Summary
  if (currentTab === 'party') {
    const G = {};
    visibleTxns
      .filter(t => ['IN', 'OUT', 'REJ', 'SR'].includes(t.type))
      .forEach(t => {
        const role = t.type === 'IN' || t.type === 'REJ' ? 'Supplier' : 'Customer';
        const sign = t.type === 'REJ' || t.type === 'SR' ? -1 : 1;
        const k = `${t.party}|${role}|${t.firm}`;
        const g = (G[k] = G[k] || {
          id: k,
          party: t.party,
          role,
          firm: firmMap.get(t.firm) || '',
          n: 0,
          ret: 0,
          qty: 0,
          val: 0,
          S: new Set(),
          last: ''
        });

        if (sign > 0) g.n++;
        (t.lines || []).forEach(l => {
          g.qty += sign * l.qty;
          if (sign < 0) g.ret += l.qty;
          g.val += sign * l.qty * (l.rate || 0);
          const it = itemMap.get(l.it);
          if (it?.sku) g.S.add(it.sku);
        });

        if (t.date > g.last) g.last = t.date;
      });

    const partyRows = Object.values(G)
      .map(g => ({
        ...g,
        ar: g.qty ? g.val / g.qty : 0,
        skus: [...g.S].join(', ')
      }))
      .sort((a, b) => b.val - a.val);

    return (
      <GenericPageLayout
        title="Party-wise Summary"
        sub="Purchases and sales for the period, net of purchase and sales returns."
        pre={preNav}
        showDateRange={true}
        filterDefs={[
          fF(),
          {
            k: 'role',
            l: 'Suppliers & Customers',
            o: [
              ['Supplier', 'Suppliers'],
              ['Customer', 'Customers']
            ]
          }
        ]}
        sumCols={['n', 'ret', 'qty', 'val']}
        cardsData={r => {
          const s = r.filter(x => x.role === 'Supplier');
          const c = r.filter(x => x.role === 'Customer');
          return [
            ['Suppliers', s.length],
            ['Purchase value', inr(s.reduce((acc, x) => acc + x.val, 0)), '#1f9d6b'],
            ['Customers', c.length],
            ['Sales value', inr(c.reduce((acc, x) => acc + x.val, 0)), '#2f6fed']
          ];
        }}
        cols={[
          { h: 'Party', k: 'party' },
          {
            h: 'Role',
            k: 'role',
            f: x => (
              <span className={`bdg ${x.role === 'Supplier' ? 'g' : 'bl'}`}>
                {x.role}
              </span>
            )
          },
          { h: 'Firm', k: 'firm' },
          { h: 'Bills', k: 'n', n: 1 },
          { h: 'Returned Qty', k: 'ret', n: 1 },
          { h: 'Net Qty', k: 'qty', n: 1 },
          { h: 'Net Value', k: 'val', n: 1, inr: 1, c: 'hl', f: x => inr(x.val) },
          { h: 'Avg Rate', k: 'ar', n: 1, f: x => fmt(x.ar) },
          { h: 'SKUs', k: 'skus' },
          { h: 'Last Date', k: 'last', f: x => dfmt(x.last) }
        ]}
        data={partyRows}
      />
    );
  }

  // Default fallback if tab is 'reorder'
  return (
    <>
      {preNav}
      <div className="card emp">
        Opening Re-order view...{' '}
        <button className="b1" onClick={() => navigateTo('reorder')}>
          Open Re-orders Page
        </button>
      </div>
    </>
  );
}
