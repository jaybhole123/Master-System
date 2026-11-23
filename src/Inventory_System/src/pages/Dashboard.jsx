import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { fmt, inr, dfmt, SvgIcon, IC } from '../utils/helpers';
import { BANDS, BCOL } from '../utils/constants';

export default function Dashboard() {
  const {
    data,
    cx,
    visibleFirms,
    visibleLocs,
    visibleTxns,
    operatorName,
    navigateTo,
    setFilters
  } = useApp();

  const [period, setPeriod] = useState('30'); // 'd', '7', '30', 'm'

  const allSkus = Object.values(cx);
  const t = new Date().toISOString().slice(0, 10);

  const getFromDate = () => {
    if (period === 'd') return t;
    if (period === '7') {
      const d = new Date(Date.now() - 6 * 864e5);
      return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    }
    if (period === '30') {
      const d = new Date(Date.now() - 29 * 864e5);
      return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    }
    return t.slice(0, 8) + '01';
  };

  const fromDate = getFromDate();
  const inPeriod = (x) => x.date >= fromDate && x.date <= t;

  const tIN = visibleTxns.filter(x => x.type === 'IN');
  const tOUT = visibleTxns.filter(x => x.type === 'OUT');

  const pIN = tIN.filter(inPeriod);
  const pOUT = tOUT.filter(inPeriod);
  const pPR = visibleTxns.filter(x => x.type === 'REJ' && inPeriod(x));
  const pSR = visibleTxns.filter(x => x.type === 'SR' && inPeriod(x));
  const pJOB = visibleTxns.filter(x => x.type === 'JOB' && inPeriod(x));

  const itemMap = new Map(data.items.map(i => [i.id, i]));
  const isMt = l => itemMap.get(l.it)?.unit === 'MT';

  const calcMtQty = (list) =>
    list.reduce((acc, x) => acc + (x.lines || []).filter(isMt).reduce((s, l) => s + (+l.qty || 0), 0), 0);

  const calcTotalVal = (list) =>
    list.reduce((acc, x) => acc + (x.lines || []).reduce((s, l) => s + (+l.qty || 0) * (+l.rate || 0), 0), 0);

  // Alerts logic
  const alerts = [];
  const addAlert = (sev, icon, title, det, action, n) => alerts.push({ sev, icon, title, det, action, n });
  const names = list => list.slice(0, 4).map(x => x.sku).join(', ') + (list.length > 4 ? ` +${list.length - 4} more` : '');

  const neg = allSkus.filter(x => x.cl < 0);
  const oos = allSkus.filter(x => x.cl === 0 && x.status !== 'Inactive' && (x.mx > 0 || x.outq > 0));
  const crit = allSkus.filter(x => x.band === 'CR' && x.cl > 0);
  const ro = allSkus.filter(x => x.need && x.band !== 'CR' && x.cl > 0);

  if (neg.length) addAlert('hi', '⛔', 'Negative stock', names(neg) + ' - check missing receipts', () => navigateTo('ims'), neg.length);
  if (oos.length) addAlert('hi', '📭', 'Out of stock', names(oos), () => navigateTo('reorder'), oos.length);
  if (crit.length) addAlert('hi', '🔴', 'Critical stock (below 33%)', names(crit), () => { setFilters({ band: 'CR' }); navigateTo('ims'); }, crit.length);
  if (ro.length) addAlert('md', '🔁', 'At re-order level', names(ro) + ' - raise purchase indent', () => navigateTo('reorder'), ro.length);

  const spec = pIN.filter(x => (x.lines || []).some(l => {
    const it = itemMap.get(l.it);
    if (!it || !x.q?.gcv) return false;
    return (it.gmin && x.q.gcv < it.gmin) || (it.amax && x.q.ash > it.amax) || (it.mmax && x.q.tm > it.mmax);
  }));
  if (spec.length) addAlert('md', '🔬', 'Purchases outside coal spec', spec.map(x => `${x.party} ${x.inv}`).slice(0, 2).join('; '), () => navigateTo('reports', 'inward'), spec.length);

  const sh = pIN.filter(x => (x.lines || []).some(l => l.billed > 0 && (l.billed - l.qty) / l.billed > 0.01));
  if (sh.length) addAlert('md', '🚚', 'Transit shortage above 1%', sh.slice(0, 3).map(x => x.party).join('; '), () => navigateTo('reports', 'transit'), sh.length);

  const pv = allSkus.filter(x => x.pv != null && x.phys != null && Math.abs(x.pv) > Math.max(1, Math.abs(x.phys - x.pv)) * 0.01);
  if (pv.length) addAlert('md', '📏', 'Physical vs system variance', pv.map(x => `${x.sku} (${x.pv > 0 ? '+' : ''}${fmt(x.pv)})`).join(', '), () => navigateTo('reports', 'phys'), pv.length);

  const cap = visibleLocs.filter(l => l.cap).map(l => ({
    l,
    q: allSkus.filter(x => x.unit === 'MT').reduce((s, x) => s + (x.locs[l.id] || 0), 0)
  })).filter(x => x.q > x.l.cap * 0.9);
  if (cap.length) addAlert('md', '🏗', 'Yard almost full (>90%)', cap.map(x => `${x.l.name} ${fmt((x.q / x.l.cap) * 100, 0)}%`).join(', '), () => navigateTo('reports', 'locw'), cap.length);

  const ly = pJOB.filter(x => {
    const inp = (x.batches || []).flatMap(b => b.lines || []).reduce((s, l) => s + (+l.qty || 0), 0);
    const outp = (x.prod || []).reduce((s, l) => s + (+l.qty || 0), 0);
    return inp && outp / inp < 0.75;
  });
  if (ly.length) addAlert('md', '⚙', 'Low washery yield (<75%)', ly.map(x => x.no).join(', '), () => navigateTo('reports', 'job'), ly.length);

  const dead = allSkus.filter(x => x.cls === 'Dead' && x.val > 0);
  if (dead.length) addAlert('lo', '💤', 'Dead stock', names(dead) + ' · ' + inr(dead.reduce((s, x) => s + x.val, 0)) + ' locked', () => navigateTo('reports', 'fsn'), dead.length);

  const ex = allSkus.filter(x => x.band === 'EX');
  if (ex.length) addAlert('lo', '📦', 'Excess stock (>100%)', names(ex) + ' · ' + inr(ex.reduce((s, x) => s + x.val, 0)), () => { setFilters({ band: 'EX' }); navigateTo('ims'); }, ex.length);

  // Purchase vs sales chart data
  const N = period === 'd' ? 7 : period === 'm' ? Math.max(7, +t.slice(8)) : +period;
  const ds = [...Array(N)].map((_, k) => {
    const d = new Date(Date.now() - (N - 1 - k) * 864e5);
    return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  });

  const PI = ds.map(d => calcMtQty(tIN.filter(x => x.date === d)));
  const PO = ds.map(d => calcMtQty(tOUT.filter(x => x.date === d)));
  const mxChart = Math.max(1, ...PI, ...PO);
  const bw = 550 / N;

  // Grouping helpers
  const grp = (txList) => {
    const G = {};
    txList.forEach(x => {
      (x.lines || []).filter(isMt).forEach(l => {
        const k = x.party;
        if (!k) return;
        const sign = x.type === 'SR' || x.type === 'REJ' ? -1 : 1;
        G[k] = (G[k] || 0) + sign * (+l.qty || 0);
      });
    });
    return Object.entries(G).sort((a, b) => b[1] - a[1]).slice(0, 5);
  };

  const topCustomers = grp([...pOUT, ...pSR].filter(x => !/^Internal/i.test(x.party || '')));
  const topSuppliers = grp([...pIN, ...pPR]);

  // Stock by category
  const catStock = {};
  allSkus.filter(x => x.unit === 'MT').forEach(x => {
    catStock[x.cat] = catStock[x.cat] || [0, 0];
    catStock[x.cat][0] += x.cl;
    catStock[x.cat][1] += x.val;
  });

  // Production metrics
  const ji = pJOB.flatMap(x => x.batches || []).flatMap(b => b.lines || []).reduce((s, l) => s + (+l.qty || 0), 0);
  const jo = pJOB.flatMap(x => x.prod || []).reduce((s, l) => s + (+l.qty || 0), 0);
  const js = pJOB.flatMap(x => x.prod || []).reduce((s, l) => s + (+l.scrap || 0), 0);

  // Quality metrics
  const Q = {};
  pIN.filter(x => x.q && x.q.gcv).forEach(x => {
    const w = (x.lines || []).reduce((s, l) => s + (+l.qty || 0), 0);
    const qObj = Q[x.party] = Q[x.party] || { w: 0, g: 0, a: 0, f: 0 };
    qObj.w += w;
    qObj.g += x.q.gcv * w;
    qObj.a += x.q.ash * w;
  });

  const periodLabel = { d: 'today', '7': 'last 7 days', '30': 'last 30 days', m: 'this month' }[period];
  const hiCount = alerts.filter(x => x.sev === 'hi').length;

  return (
    <>
      <div className="dhead">
        <div>
          <h2>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            {operatorName.split(' ')[0]}
          </h2>
          <div className="lg">
            {visibleFirms.map(f => f.name).join(' · ')} · showing {periodLabel}
          </div>
        </div>
        <div className="seg2">
          {[
            ['d', 'Today'],
            ['7', '7 days'],
            ['30', '30 days'],
            ['m', 'This month']
          ].map(([k, l]) => (
            <button
              key={k}
              type="button"
              className={k === period ? 'on' : ''}
              onClick={() => setPeriod(k)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="cards c4">
        <div
          className="card kp clickable"
          style={{ '--a': '#2f6fed' }}
          onClick={() => navigateTo('reports', 'val')}
        >
          <div className="l">Stock value (WAC)</div>
          <div className="v">{inr(allSkus.reduce((s, x) => s + x.val, 0))}</div>
          <div className="s">
            {fmt(allSkus.filter(x => x.unit === 'MT').reduce((s, x) => s + x.cl, 0))} MT coal in stock
          </div>
        </div>

        <div
          className="card kp clickable"
          style={{ '--a': '#1f9d6b' }}
          onClick={() => navigateTo('reports', 'inward')}
        >
          <div className="l">Purchase (net)</div>
          <div className="v">{fmt(calcMtQty(pIN) - calcMtQty(pPR))} MT</div>
          <div className="s">
            {pIN.length} bills · {inr(calcTotalVal(pIN) - calcTotalVal(pPR))}
            {pPR.length ? ` · ${fmt(calcMtQty(pPR))} MT returned` : ''}
          </div>
        </div>

        <div
          className="card kp clickable"
          style={{ '--a': '#e5334b' }}
          onClick={() => navigateTo('reports', 'outward')}
        >
          <div className="l">Sales (net)</div>
          <div className="v">{fmt(calcMtQty(pOUT) - calcMtQty(pSR))} MT</div>
          <div className="s">
            {pOUT.length} bills · {inr(calcTotalVal(pOUT) - calcTotalVal(pSR))}
            {pSR.length ? ` · ${fmt(calcMtQty(pSR))} MT returned` : ''}
          </div>
        </div>

        <div
          className="card kp clickable"
          style={{ '--a': hiCount ? '#e5334b' : '#1f9d6b' }}
          onClick={() => document.getElementById('alerts')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <div className="l">Alerts</div>
          <div className="v">{alerts.length}</div>
          <div className="s">{hiCount ? `${hiCount} need action now` : 'Nothing urgent'}</div>
        </div>
      </div>

      {/* Grid: Alerts & Chart */}
      <div className="dgrid">
        <div className="card alerts" id="alerts">
          <div className="wh">
            <h3>
              Alerts <span className="cnt">{alerts.length}</span>
            </h3>
            <span className="lg">{periodLabel}</span>
          </div>
          {alerts.length ? (
            alerts.map((al, idx) => (
              <div key={idx} className={`al ${al.sev}`} onClick={al.action}>
                <span className="ai">{al.icon}</span>
                <div>
                  <b>
                    {al.title} <em>{al.n}</em>
                  </b>
                  <small>{al.det}</small>
                </div>
                <span className="ar">›</span>
              </div>
            ))
          ) : (
            <div className="allok">✅ All clear - no stock or quality issues right now.</div>
          )}
        </div>

        <div className="card">
          <div className="wh">
            <h3>Purchase vs sales</h3>
            <a className="lnk" onClick={() => navigateTo('reports', 'daily')}>
              View report →
            </a>
          </div>
          <svg viewBox="0 0 600 205" className="ch">
            {[0, 0.5, 1].map((f, i) => {
              const y = 175 - f * 150;
              return (
                <React.Fragment key={i}>
                  <line x1="44" x2="596" y1={y} y2={y} stroke="#e8edf5" />
                  <text x="40" y={y + 3} textAnchor="end" fontSize="9" fill="#6b778c">
                    {fmt(mxChart * f, 0)}
                  </text>
                </React.Fragment>
              );
            })}
            {ds.map((d, k) => {
              const x = 48 + k * bw;
              const w = Math.max(2, bw / 2 - 2);
              const a = (PI[k] / mxChart) * 150;
              const b = (PO[k] / mxChart) * 150;
              return (
                <React.Fragment key={d}>
                  <rect x={x} y={175 - a} width={w} height={a} rx="2" fill="#1f9d6b">
                    <title>{`${dfmt(d)} in ${fmt(PI[k])} MT`}</title>
                  </rect>
                  <rect x={x + w + 1} y={175 - b} width={w} height={b} rx="2" fill="#e5334b">
                    <title>{`${dfmt(d)} out ${fmt(PO[k])} MT`}</title>
                  </rect>
                  {k % Math.ceil(N / 10) === 0 && (
                    <text x={x + w} y="192" textAnchor="middle" fontSize="9" fill="#6b778c">
                      {d.slice(8)}/{d.slice(5, 7)}
                    </text>
                  )}
                </React.Fragment>
              );
            })}
          </svg>
          <div className="lg">
            <i style={{ background: '#1f9d6b' }}></i>Purchase
            <i style={{ background: '#e5334b' }}></i>Sale (MT per day)
          </div>
        </div>
      </div>

      {/* Row: Stock Bands, Category, Yard Utilisation */}
      <div className="row3">
        <div className="card">
          <div className="wh">
            <h3>Stock bands</h3>
            <a className="lnk" onClick={() => navigateTo('ims')}>
              View report →
            </a>
          </div>
          <div className="stk">
            {[...BANDS.map(b => b[0]), 'NS'].map(b => (
              <i
                key={b}
                style={{
                  width: `${(allSkus.filter(x => x.band === b).length / Math.max(1, allSkus.length)) * 100}%`,
                  background: BCOL[b]
                }}
              />
            ))}
          </div>
          {[...BANDS, ['NS', 'Not planned']].map(b => {
            const list = allSkus.filter(x => x.band === b[0]);
            if (!list.length) return null;
            return (
              <div
                key={b[0]}
                className="brow"
                onClick={() => {
                  setFilters({ band: b[0] });
                  navigateTo('ims');
                }}
              >
                <span className={`bdg ${b[0] === 'NS' ? 'gy' : b[0] === 'EX' ? 'bl' : b[0] === 'NO' ? 'g' : b[0] === 'MD' ? 'am' : 'rd'}`}>
                  <i className="dot"></i>
                  {b[1]}
                </span>
                <span>{list.length} SKU</span>
                <b>{inr(list.reduce((s, x) => s + x.val, 0))}</b>
              </div>
            );
          })}
        </div>

        <div className="card">
          <div className="wh">
            <h3>Stock by category (MT)</h3>
            <a className="lnk" onClick={() => navigateTo('reports', 'summary')}>
              View report →
            </a>
          </div>
          {Object.entries(catStock)
            .sort((a, b) => b[1][0] - a[1][0])
            .slice(0, 5)
            .map(([catName, [qty, val]]) => {
              const maxQ = Math.max(1, ...Object.values(catStock).map(v => v[0]));
              return (
                <div key={catName}>
                  <div className="hbar">
                    <span title={catName}>{catName}</span>
                    <span className="t">
                      <i style={{ width: `${(qty / maxQ) * 100}%`, background: '#2f6fed' }} />
                    </span>
                    <b>{fmt(qty, 0)} MT</b>
                  </div>
                  <div className="hsub">{inr(val)}</div>
                </div>
              );
            })}
        </div>

        <div className="card">
          <div className="wh">
            <h3>Yard utilisation</h3>
            <a className="lnk" onClick={() => navigateTo('reports', 'locw')}>
              View report →
            </a>
          </div>
          {visibleLocs.map(l => {
            const currentStock = allSkus.filter(x => x.unit === 'MT').reduce((s, x) => s + (x.locs[l.id] || 0), 0);
            const maxL = Math.max(1, ...visibleLocs.map(loc => allSkus.filter(x => x.unit === 'MT').reduce((s, x) => s + (x.locs[loc.id] || 0), 0)));
            return (
              <div key={l.id}>
                <div className="hbar">
                  <span title={l.name}>{l.name}</span>
                  <span className="t">
                    <i style={{ width: `${(currentStock / maxL) * 100}%`, background: '#6d3fd1' }} />
                  </span>
                  <b>{fmt(currentStock, 0)} MT</b>
                </div>
                {l.cap && (
                  <div className="hsub">
                    {fmt((currentStock / l.cap) * 100, 0)}% of {fmt(l.cap)} MT
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Row: Production, Quality, Recent Txns */}
      <div className="row3">
        <div className="card">
          <div className="wh">
            <h3>Production ({periodLabel})</h3>
            <a className="lnk" onClick={() => navigateTo('reports', 'job')}>
              View report →
            </a>
          </div>
          {pJOB.length ? (
            <>
              <div className="mini">
                <div>
                  <span>Job cards</span>
                  <b>{pJOB.length}</b>
                </div>
                <div>
                  <span>Input</span>
                  <b>{fmt(ji)}</b>
                </div>
                <div>
                  <span>Output</span>
                  <b>{fmt(jo)}</b>
                </div>
                <div>
                  <span>Yield</span>
                  <b style={{ color: ji && jo / ji < 0.75 ? '#e5334b' : '#1f9d6b' }}>
                    {ji ? `${fmt((jo / ji) * 100, 1)}%` : '-'}
                  </b>
                </div>
              </div>
              <div className="lg" style={{ marginTop: '8px' }}>
                Scraps {fmt(js)} · Unaccounted {fmt(ji - jo - js)}
              </div>
            </>
          ) : (
            <div className="emp" style={{ padding: '14px' }}>
              No job cards in this period
            </div>
          )}
        </div>

        <div className="card">
          <div className="wh">
            <h3>Coal quality by supplier</h3>
            <a className="lnk" onClick={() => navigateTo('reports', 'quality')}>
              View report →
            </a>
          </div>
          {Object.keys(Q).length ? (
            <table className="kv">
              <tbody>
                {Object.entries(Q).map(([supName, qData]) => (
                  <tr key={supName}>
                    <td>
                      {supName}
                      {qData.f > 0 && <span className="bdg rd" style={{ marginLeft: '6px' }}>{qData.f} off-spec</span>}
                    </td>
                    <td>
                      {fmt(qData.g / qData.w, 0)} kcal · {fmt(qData.a / qData.w, 1)}% ash
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="emp" style={{ padding: '14px' }}>
              No lab reports in this period
            </div>
          )}
        </div>

        <div className="card">
          <div className="wh">
            <h3>Recent transactions</h3>
            <a className="lnk" onClick={() => navigateTo('txns')}>
              View report →
            </a>
          </div>
          <table className="kv">
            <tbody>
              {visibleTxns.slice(0, 6).map(x => (
                <tr key={x.id}>
                  <td>
                    <span className={`bdg ${x.type === 'IN' ? 'g' : x.type === 'OUT' ? 'rd' : 'bl'}`}>
                      {x.type}
                    </span>{' '}
                    <a className="lnk" onClick={() => navigateTo('txns')}>
                      {x.no}
                    </a>{' '}
                    <span className="av2">{x.party || x.fgc}</span>
                  </td>
                  <td>
                    {fmt((x.lines || []).reduce((s, l) => s + (+l.qty || 0), 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row: Top Customers & Suppliers */}
      <div className="row2">
        <div className="card">
          <div className="wh">
            <h3>Top customers (net MT, {periodLabel})</h3>
            <a className="lnk" onClick={() => navigateTo('reports', 'party')}>
              View report →
            </a>
          </div>
          {topCustomers.map(([cName, qVal]) => {
            const maxC = Math.max(1, ...topCustomers.map(x => x[1]));
            return (
              <div key={cName} className="hbar">
                <span title={cName}>{cName}</span>
                <span className="t">
                  <i style={{ width: `${(qVal / maxC) * 100}%`, background: '#2f6fed' }} />
                </span>
                <b>{fmt(qVal, 0)} MT</b>
              </div>
            );
          })}
        </div>

        <div className="card">
          <div className="wh">
            <h3>Top suppliers (net MT, {periodLabel})</h3>
            <a className="lnk" onClick={() => navigateTo('reports', 'party')}>
              View report →
            </a>
          </div>
          {topSuppliers.map(([sName, qVal]) => {
            const maxS = Math.max(1, ...topSuppliers.map(x => x[1]));
            return (
              <div key={sName} className="hbar">
                <span title={sName}>{sName}</span>
                <span className="t">
                  <i style={{ width: `${(qVal / maxS) * 100}%`, background: '#1f9d6b' }} />
                </span>
                <b>{fmt(qVal, 0)} MT</b>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
