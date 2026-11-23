import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { fmt, inr, dfmt, SvgIcon, IC, dAgo, MON } from '../utils/helpers';
import { BCOL, BN, KN } from '../utils/constants';
import DataTable from '../components/DataTable';
import MaterialModal from '../components/MaterialModal';
import CountModal from '../components/CountModal';
import TransactionModal from '../components/TransactionModal';
import VoucherModal from '../components/VoucherModal';
import { exportData } from '../utils/excel';

export default function ItemDetailPage() {
  const {
    data,
    selectedItemId,
    backFromItemDetail,
    cx,
    entries,
    visibleTxns
  } = useApp();

  const [activeMaterialModal, setActiveMaterialModal] = useState(false);
  const [activeCountModal, setActiveCountModal] = useState(false);
  const [activeTxnParams, setActiveTxnParams] = useState(null);
  const [activeVoucherId, setActiveVoucherId] = useState(null);

  const [ledgerFilters, setLedgerFilters] = useState({
    from: '',
    to: '',
    kk: ''
  });

  const r = cx[selectedItemId];
  if (!r) {
    return (
      <div className="card emp">
        Material not found.{' '}
        <button className="b2" onClick={backFromItemDetail}>
          Go back
        </button>
      </div>
    );
  }

  const i = r.i;
  const u = i.unit;
  const locMap = new Map(data.locs.map(l => [l.id, l.name]));

  // Ledger computation
  const buildLedgerRows = () => {
    let b = +i.open || 0;
    let av = +i.rate || 0;
    let v = b * av;

    const list = [
      {
        date: '',
        no: '',
        tid: '',
        k: 'Opening balance',
        kk: 'OP',
        party: '',
        loc: locMap.get(i.loc) || '',
        i: b,
        o: 0,
        bal: b,
        rate: av,
        val: v,
        veh: '',
        ref: '',
        rem: ''
      }
    ];

    for (const e of entries) {
      if (e.it !== i.id) continue;
      const t = e.t;
      const tr = e.k === 'TI' || e.k === 'TO';
      if (!tr) {
        if (e.i > 0) v += e.i * (e.k === 'IN' && e.r > 0 ? e.r : (av || +i.rate || 0));
        if (e.o > 0) v -= e.o * av;
      }
      b += e.i - e.o;
      if (!tr) {
        if (b > 1e-9) av = v / b;
        else v = 0;
      }

      list.push({
        date: e.d,
        no: t.no,
        tid: t.id,
        k: KN[e.k],
        kk: e.k,
        party:
          t.party ||
          (t.type === 'TRF'
            ? e.k === 'TO'
              ? 'To ' + (locMap.get(t.toLoc) || '')
              : 'From ' + (locMap.get(t.loc) || '')
            : t.type === 'JOB'
            ? 'Job card - ' + (t.fgc || '')
            : t.type === 'ADJ'
            ? 'Physical count'
            : ''),
        loc: locMap.get(e.loc) || '',
        i: e.i,
        o: e.o,
        bal: b,
        rate: e.r,
        val: Math.max(0, b) * av,
        veh: t.veh || '',
        ref: t.inv || t.challan || t.ref || '',
        rem: t.rem || (t.reason ? 'Reason: ' + t.reason : '')
      });
    }

    return list;
  };

  const allLedgerRows = buildLedgerRows();
  let filteredLedger = allLedgerRows;
  if (ledgerFilters.from) filteredLedger = filteredLedger.filter(x => !x.date || x.date >= ledgerFilters.from);
  if (ledgerFilters.to) filteredLedger = filteredLedger.filter(x => !x.date || x.date <= ledgerFilters.to);
  if (ledgerFilters.kk) filteredLedger = filteredLedger.filter(x => x.kk === ledgerFilters.kk);

  // Quality of receipts
  const ins = visibleTxns.filter(t => t.type === 'IN' && (t.lines || []).some(l => l.it === i.id));
  const labReports = ins.filter(t => t.q && t.q.gcv);
  const qw = t => (t.lines || []).filter(l => l.it === i.id).reduce((s, l) => s + (+l.qty || 0), 0);
  const totalWeight = labReports.reduce((s, t) => s + qw(t), 0);
  const wq = k => (totalWeight ? labReports.reduce((s, t) => s + (t.q[k] || 0) * qw(t), 0) / totalWeight : 0);

  // Top Parties
  const partiesMap = {};
  visibleTxns.forEach(t => {
    if ((t.type === 'IN' || t.type === 'OUT') && t.party) {
      (t.lines || []).filter(l => l.it === i.id).forEach(l => {
        const key = `${t.party}|${t.type === 'IN' ? 'Supplier' : 'Customer'}`;
        partiesMap[key] = (partiesMap[key] || 0) + (+l.qty || 0);
      });
    }
  });
  const topParties = Object.entries(partiesMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxPartyVal = Math.max(1, ...topParties.map(x => x[1]));

  // 30 days movement chart
  const N = 30;
  const chartDays = [...Array(N)].map((_, idx) => dAgo(N - 1 - idx));
  const chartIn = {};
  const chartOut = {};
  let balTrack = 0;

  for (const e of entries) {
    if (e.it === i.id && e.d > dAgo(N) && e.k !== 'TI' && e.k !== 'TO') {
      chartIn[e.d] = (chartIn[e.d] || 0) + e.i;
      chartOut[e.d] = (chartOut[e.d] || 0) + e.o;
    }
  }

  const chartBalances = [];
  chartDays.forEach(d => {
    balTrack += (chartIn[d] || 0) - (chartOut[d] || 0);
    chartBalances.push(balTrack);
  });

  const maxChartVal = Math.max(
    1,
    ...chartDays.map(d => Math.max(chartIn[d] || 0, chartOut[d] || 0)),
    ...chartBalances
  );

  const W = 640;
  const H = 200;
  const x0 = 44;
  const bw = (W - x0 - 10) / N;
  const yPos = v => 170 - (v / (maxChartVal || 1)) * 150;

  const scale = Math.max(r.mx * 1.25, r.cl, 1);
  const posScale = v => Math.min(100, Math.max(0, (v / scale) * 100));

  const ledgerCols = [
    { h: 'Date', k: 'date', f: x => dfmt(x.date), x: x => x.date },
    {
      h: 'Txn No',
      k: 'no',
      f: x =>
        x.tid ? (
          <a className="lnk" onClick={() => setActiveVoucherId(x.tid)}>
            {x.no}
          </a>
        ) : (
          ''
        )
    },
    {
      h: 'Movement',
      k: 'k',
      f: x =>
        x.kk === 'OP' ? (
          <b>Opening balance</b>
        ) : (
          <span className={`bdg ${x.i > 0 ? 'g' : 'rd'}`}>{x.k}</span>
        )
    },
    { h: 'Party / Detail', k: 'party' },
    { h: 'Location', k: 'loc' },
    { h: 'In', k: 'i', n: 1, f: x => (x.i ? fmt(x.i) : '-') },
    { h: 'Out', k: 'o', n: 1, f: x => (x.o ? fmt(x.o) : '-') },
    { h: 'Balance', k: 'bal', n: 1, f: x => <b>{fmt(x.bal)}</b> },
    { h: 'Rate', k: 'rate', n: 1, f: x => (x.rate ? fmt(x.rate) : '-') },
    { h: 'Stock Value', k: 'val', n: 1, inr: 1, f: x => inr(x.val), x: x => Math.round(x.val) },
    { h: 'Vehicle', k: 'veh' },
    { h: 'Invoice / Challan', k: 'ref' },
    { h: 'Remarks', k: 'rem' }
  ];

  return (
    <>
      <div className="bar">
        <div className="ttlr">
          <button type="button" className="b2" onClick={backFromItemDetail}>
            <SvgIcon path={IC.back} /> Back
          </button>
          <div>
            <h2>
              {i.sku} <span style={{ fontWeight: 400, color: 'var(--mut)' }}>{i.sub}</span>
            </h2>
            <div className="tags">
              <span className={`tag t${i.type}`}>{i.type}</span>
              <span className="tag">{r.firm}</span>
              <span className="tag">{i.cat}</span>
              <span className={`bdg ${r.band === 'EX' ? 'bl' : r.band === 'NO' ? 'g' : r.band === 'MD' ? 'am' : 'rd'}`}>
                <i className="dot"></i>
                {BN[r.band]}
                {r.pct != null ? ` · ${Math.round(r.pct)}%` : ''}
              </span>
              <span className={`bdg ${r.cls === 'Fast' ? 'g' : r.cls === 'Slow' ? 'am' : 'rd'}`}>
                {r.cls}
              </span>
              {i.status === 'Inactive' && <span className="bdg gy">Inactive</span>}
              {r.need && (
                <span className="bdg rd">
                  Re-order: {fmt(r.sug)} {i.unit}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="btns">
          <button type="button" className="b2" onClick={() => setActiveMaterialModal(true)}>
            <SvgIcon path={IC.edit} /> Edit
          </button>
          <button type="button" className="b2" onClick={() => setActiveCountModal(true)}>
            <SvgIcon path={IC.count} /> Physical count
          </button>
          <button
            type="button"
            className="b1"
            onClick={() =>
              setActiveTxnParams({
                type: 'IN',
                preData: { firm: i.firm, loc: i.loc, lines: [{ it: i.id }] }
              })
            }
          >
            <SvgIcon path={IC.plus} /> Purchase
          </button>
          <button
            type="button"
            className="b1 nv"
            onClick={() =>
              setActiveTxnParams({
                type: 'OUT',
                preData: { firm: i.firm, loc: i.loc, lines: [{ it: i.id }] }
              })
            }
          >
            <SvgIcon path={IC.plus} /> Sale
          </button>
          <button type="button" className="b2" onClick={() => window.print()}>
            <SvgIcon path={IC.pr} /> Print
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="cards c4">
        <div className="card kp">
          <div className="l">Opening stock</div>
          <div className="v">{fmt(r.op)} {u}</div>
        </div>
        <div className="card kp" style={{ '--a': '#1f9d6b' }}>
          <div className="l">Purchase</div>
          <div className="v">{fmt(r.pur)} {u}</div>
          <div className="s">{r.pr ? `Returned ${fmt(r.pr)}` : 'No purchase returns'}</div>
        </div>
        <div className="card kp" style={{ '--a': '#e5334b' }}>
          <div className="l">Sale</div>
          <div className="v">{fmt(r.sal)} {u}</div>
          <div className="s">{r.sr ? `Returned by customers ${fmt(r.sr)}` : 'No sales returns'}</div>
        </div>
        <div className="card kp" style={{ '--a': '#2f6fed' }}>
          <div className="l">Job card</div>
          <div className="v">{fmt(r.jp)} made</div>
          <div className="s">
            {fmt(r.jc)} {u} used{r.adj ? ` · adj. ${r.adj > 0 ? '+' : ''}${fmt(r.adj)}` : ''}
          </div>
        </div>
        <div className="card kp" style={{ '--a': BCOL[r.band] }}>
          <div className="l">Closing stock</div>
          <div className="v">{fmt(r.cl)} {u}</div>
          <div className="s">
            Band: {BN[r.band]}
            {r.pct != null ? ` (${Math.round(r.pct)}% of max)` : ''}
          </div>
        </div>
        <div className="card kp">
          <div className="l">Physical stock</div>
          <div className="v">{r.phys == null ? '-' : `${fmt(r.phys)} ${u}`}</div>
          <div className="s">
            {r.phys == null
              ? 'No count recorded'
              : `Counted ${dfmt(r.pdate)}${r.pv ? `, variance ${r.pv > 0 ? '+' : ''}${fmt(r.pv)}` : ''}`}
          </div>
        </div>
        <div className="card kp">
          <div className="l">Stock value (WAC)</div>
          <div className="v">{inr(r.val)}</div>
          <div className="s">Avg cost ₹{fmt(r.wac)} / {u}</div>
        </div>
        <div className="card kp" style={r.cover != null && r.cover < r.lt ? { '--a': '#e5334b' } : undefined}>
          <div className="l">Days of cover</div>
          <div className="v">{r.cover == null ? '-' : `${fmt(r.cover, 1)} days`}</div>
          <div className="s">Lead time {r.lt} days</div>
        </div>
      </div>

      {/* Row: Planning, Location, Quality & Top Parties */}
      <div className="row3">
        <div className="card">
          <h3>Planning &amp; stock band</h3>
          <div className="gauge">
            <div
              className="fill"
              style={{
                width: `${posScale(Math.max(0, r.cl))}%`,
                background: BCOL[r.band]
              }}
            />
            {r.mx > 0 &&
              [['SS', r.ss], ['ROL', r.rol], ['MAX', r.mx]].map((m, idx) => (
                <div key={idx} className="mk" style={{ left: `${posScale(m[1])}%` }}>
                  <span>{m[0]}</span>
                  <em>{fmt(m[1], 0)}</em>
                </div>
              ))}
          </div>

          <table className="kv">
            <tbody>
              <tr>
                <td>ADC used <span className={`bdg ${r.auto ? 'g' : 'gy'}`}>{r.auto ? 'Actual' : 'Manual'}</span></td>
                <td>{fmt(r.adc)} {u}/day</td>
              </tr>
              <tr>
                <td>Actual ADC (last {data.cfg.adcDays} days)</td>
                <td>{fmt(r.adcA)}</td>
              </tr>
              <tr>
                <td>ADC on master</td>
                <td>{fmt(i.adc)}</td>
              </tr>
              <tr>
                <td>Lead time / Safety factor</td>
                <td>{r.lt} d / {r.sf}</td>
              </tr>
              <tr>
                <td>Safety stock</td>
                <td>{fmt(r.ss)}</td>
              </tr>
              <tr>
                <td>Reorder level</td>
                <td>{fmt(r.rol)}</td>
              </tr>
              <tr>
                <td>MOQ / Reorder qty</td>
                <td>{fmt(r.moq)} / {fmt(r.rq)}</td>
              </tr>
              <tr>
                <td>Max level</td>
                <td>{fmt(r.mx)}</td>
              </tr>
              <tr>
                <td>Turnover ({data.cfg.fsnDays} d) / Last issue</td>
                <td>{r.tr.toFixed(2)}× / {r.last ? dfmt(r.last) : 'Never'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Location-wise stock</h3>
          <table className="kv">
            <tbody>
              {Object.entries(r.locs).filter(x => Math.abs(x[1]) > 1e-9).map(([lId, qVal]) => (
                <tr key={lId}>
                  <td>{locMap.get(lId)}</td>
                  <td>{fmt(qVal)} {u}</td>
                </tr>
              ))}
              {!Object.entries(r.locs).some(x => Math.abs(x[1]) > 1e-9) && (
                <tr>
                  <td colSpan={2} className="av2">No stock at any location</td>
                </tr>
              )}
            </tbody>
          </table>

          <h3 style={{ marginTop: '18px' }}>Supplier</h3>
          <table className="kv">
            <tbody>
              <tr>
                <td>Supplier</td>
                <td>{i.sup || '-'}</td>
              </tr>
              <tr>
                <td>Supplier code</td>
                <td>{i.supc || '-'}</td>
              </tr>
              <tr>
                <td>Default location</td>
                <td>{r.loc}</td>
              </tr>
              <tr>
                <td>Master rate</td>
                <td>₹{fmt(i.rate)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Coal quality (weighted avg of receipts)</h3>
          {labReports.length ? (
            <table className="kv">
              <tbody>
                <tr>
                  <td>GCV</td>
                  <td>{fmt(wq('gcv'), 0)} kcal/kg</td>
                </tr>
                <tr>
                  <td>Total moisture</td>
                  <td>{fmt(wq('tm'), 1)} %</td>
                </tr>
                <tr>
                  <td>Ash</td>
                  <td>{fmt(wq('ash'), 1)} %</td>
                </tr>
                <tr>
                  <td>Receipts with lab report</td>
                  <td>{labReports.length}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="av2">No quality data on receipts yet.</div>
          )}

          <h3 style={{ marginTop: '18px' }}>Top parties</h3>
          {topParties.map(([k, v]) => {
            const [pName, pRole] = k.split('|');
            return (
              <div key={k} className="hbar">
                <span title={pName}>
                  {pName} <span className="av2">{pRole}</span>
                </span>
                <span className="t">
                  <i
                    style={{
                      width: `${(v / maxPartyVal) * 100}%`,
                      background: pRole === 'Supplier' ? '#1f9d6b' : '#e5334b'
                    }}
                  />
                </span>
                <b>{fmt(v)}</b>
              </div>
            );
          })}
          {!topParties.length && <div className="av2">No parties yet.</div>}
        </div>
      </div>

      {/* Movement chart */}
      <div className="card">
        <h3>Last 30 days movement</h3>
        <svg viewBox={`0 0 ${W} ${H}`} className="ch">
          {[0, 0.5, 1].map((f, idx) => {
            const y = yPos(maxChartVal * f);
            return (
              <React.Fragment key={idx}>
                <line x1={x0} x2={W - 6} y1={y} y2={y} stroke="#e3e8f0" />
                <text x={x0 - 5} y={y + 3} textAnchor="end" fontSize="9" fill="#6b778c">
                  {fmt(maxChartVal * f, 0)}
                </text>
              </React.Fragment>
            );
          })}
          {chartDays.map((d, k) => {
            const X = x0 + k * bw;
            return (
              <React.Fragment key={d}>
                {chartIn[d] > 0 && (
                  <rect
                    x={X + 1}
                    y={yPos(chartIn[d])}
                    width={Math.max(2, bw / 2 - 1)}
                    height={170 - yPos(chartIn[d])}
                    fill="#1f9d6b"
                    rx="2"
                  >
                    <title>{`${dfmt(d)} in ${fmt(chartIn[d])}`}</title>
                  </rect>
                )}
                {chartOut[d] > 0 && (
                  <rect
                    x={X + bw / 2}
                    y={yPos(chartOut[d])}
                    width={Math.max(2, bw / 2 - 1)}
                    height={170 - yPos(chartOut[d])}
                    fill="#e5334b"
                    rx="2"
                  >
                    <title>{`${dfmt(d)} out ${fmt(chartOut[d])}`}</title>
                  </rect>
                )}
                {k % 5 === 0 && (
                  <text x={X + bw / 2} y="186" textAnchor="middle" fontSize="9" fill="#6b778c">
                    {d.slice(8)}-{MON[+d.slice(5, 7) - 1]}
                  </text>
                )}
              </React.Fragment>
            );
          })}
          <polyline
            fill="none"
            stroke="#2f6fed"
            strokeWidth="2"
            points={chartBalances
              .map((v, k) => `${x0 + k * bw + bw / 2},${yPos(Math.max(0, v))}`)
              .join(' ')}
          />
        </svg>
        <div className="lg">
          <i style={{ background: '#1f9d6b' }}></i>In
          <i style={{ background: '#e5334b' }}></i>Out
          <i style={{ background: '#2f6fed' }}></i>Closing balance ({u})
        </div>
      </div>

      {/* Stock Ledger */}
      <div className="card">
        <div className="bar">
          <h3 style={{ margin: 0 }}>Complete stock ledger</h3>
          <div className="btns">
            <label className="lg">
              From{' '}
              <input
                type="date"
                style={{ width: 'auto' }}
                value={ledgerFilters.from}
                onChange={e => setLedgerFilters(prev => ({ ...prev, from: e.target.value }))}
              />
            </label>
            <label className="lg">
              To{' '}
              <input
                type="date"
                style={{ width: 'auto' }}
                value={ledgerFilters.to}
                onChange={e => setLedgerFilters(prev => ({ ...prev, to: e.target.value }))}
              />
            </label>
            <select
              style={{ width: 'auto' }}
              value={ledgerFilters.kk}
              onChange={e => setLedgerFilters(prev => ({ ...prev, kk: e.target.value }))}
            >
              <option value="">All movements</option>
              {Object.entries(KN).map(([k, lbl]) => (
                <option key={k} value={k}>
                  {lbl}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="b2"
              onClick={() => exportData(`${i.sku}_ledger`, ledgerCols, filteredLedger, false)}
            >
              <SvgIcon path={IC.dl} /> Export CSV
            </button>
          </div>
        </div>

        <DataTable
          title={`${i.sku} ledger`}
          cols={ledgerCols}
          rows={filteredLedger}
          sumCols={['i', 'o']}
        />
      </div>

      {/* Modals */}
      {activeMaterialModal && (
        <MaterialModal
          itemId={i.id}
          onClose={() => setActiveMaterialModal(false)}
        />
      )}

      {activeCountModal && (
        <CountModal
          itemId={i.id}
          onClose={() => setActiveCountModal(false)}
        />
      )}

      {activeTxnParams && (
        <TransactionModal
          defaultType={activeTxnParams.type}
          preData={activeTxnParams.preData}
          onClose={() => setActiveTxnParams(null)}
        />
      )}

      {activeVoucherId && (
        <VoucherModal
          txnId={activeVoucherId}
          onClose={() => setActiveVoucherId(null)}
        />
      )}
    </>
  );
}
