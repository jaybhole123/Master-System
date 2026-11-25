import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { STORAGE_KEY, SESSION_USER_KEY, DEFCFG, getSeedData } from '../utils/constants';
import { today, dAgo, days } from '../utils/helpers';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Clear legacy demo keys if present
  useEffect(() => {
    try {
      ['jbt_coal_ims', 'jbt_coal_ims_v1', 'jbt_coal_ims_v2', 'jbt_coal_ims_v3', 'jbt_coal_ims_clean_v1', 'jbt_coal_ims_clean_v2', 'jbt_coal_ims_clean_v3'].forEach(k => localStorage.removeItem(k));
    } catch(e) {}
  }, []);

  // Load data from LocalStorage or clean seed
  const [data, setData] = useState(() => {
    try {
      // Clear old versions
      ['jbt_coal_ims', 'jbt_coal_ims_v1', 'jbt_coal_ims_v2', 'jbt_coal_ims_v3', 'jbt_coal_ims_clean_v1', 'jbt_coal_ims_clean_v2', 'jbt_coal_ims_clean_v3'].forEach(k => localStorage.removeItem(k));

      const s = localStorage.getItem(STORAGE_KEY);
      if (s) {
        const d = JSON.parse(s);
        d.cfg = { ...DEFCFG, ...(d.cfg || {}) };
        if (!d.users || !d.users.length) {
          const fresh = getSeedData();
          d.users = fresh.users;
        }
        // Remove dummy firms and locations if present
        d.firms = (d.firms || []).filter(f => !['JBT Coal Pvt Ltd', 'JBT Coal Traders'].includes(f.name));
        d.locs = (d.locs || []).filter(l => !['Siltara Coal Yard', 'Urla Depot', 'Washery Plant', 'Raipur Railway Siding'].includes(l.name));
        // Remove dummy units if present
        d.units = (d.units || []).filter(u => !['MT', 'KG', 'Ltr', 'Nos'].includes(u.name));
        if (!d.parties) d.parties = [];
        
        // Remove any remnant demo items or transactions if present
        d.items = (d.items || []).filter(i => !['RC-G11', 'RC-G13', 'WC-2050', 'CF-0010', 'DSL-HSD', 'IMP-ID42', 'SC-G10'].includes(i.sku));
        d.txns = (d.txns || []).filter(t => !String(t.no).startsWith('SAL-00') && !String(t.no).startsWith('PUR-00') && !String(t.no).startsWith('JC-00') && !String(t.no).startsWith('TRF-00') && !String(t.no).startsWith('SR-00') && !String(t.no).startsWith('PR-00'));
        d.counts = [];

        return d;
      }
    } catch (e) {
      console.error('Failed to load storage', e);
    }
    const seeded = getSeedData();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    } catch (e) {}
    return seeded;
  });

  // Current logged in user: default directly to admin user (no login screen required)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const uid = sessionStorage.getItem(SESSION_USER_KEY);
      if (uid && data.users) {
        const found = data.users.find(u => u.id === uid);
        if (found) return found;
      }
    } catch (e) {}
    // Default to admin user immediately
    return (
      data.users?.find(u => u.role === 'Admin') ||
      data.users?.[0] || {
        id: 'u1',
        name: 'admin1',
        role: 'Admin',
        pages: [],
        firms: [],
        locs: []
      }
    );
  });

  // Navigation and UI state
  const [activePage, setActivePage] = useState('dashboard');
  const [activeTabs, setActiveTabs] = useState({});
  const [filters, setFilters] = useState({});
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [filterStack, setFilterStack] = useState(null);

  // Toast notification state
  const [toastInfo, setToastInfo] = useState({ message: '', isError: false, visible: false });

  // Modal state
  const [modalState, setModalState] = useState(null);

  // Print voucher preview state
  const [printContent, setPrintContent] = useState(null);

  const showToast = useCallback((message, isError = false) => {
    setToastInfo({ message, isError, visible: true });
    setTimeout(() => {
      setToastInfo(prev => ({ ...prev, visible: false }));
    }, 3800);
  }, []);

  const showError = useCallback((msg) => {
    showToast(msg, true);
    return false;
  }, [showToast]);

  // Persist data
  const saveData = useCallback((newData) => {
    setData(newData);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    } catch (e) {
      showToast('Browser storage is full - export your data', true);
    }
  }, [showToast]);

  // Helper getters
  const nextId = useCallback(() => {
    let nextSeq = (data.seq || 0) + 1;
    setData(prev => {
      const up = { ...prev, seq: nextSeq };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(up));
      } catch (e) {}
      return up;
    });
    return 'u' + nextSeq;
  }, [data.seq]);

  const pid = useCallback((x) => +String(x?.id || '').slice(1) || 0, []);

  const isAdm = useCallback(() => !currentUser || currentUser.role === 'Admin', [currentUser]);
  const canF = useCallback((fId) => isAdm() || !(currentUser?.firms || []).length || currentUser.firms.includes(fId), [isAdm, currentUser]);
  const canL = useCallback((lId) => isAdm() || !(currentUser?.locs || []).length || currentUser.locs.includes(lId), [isAdm, currentUser]);
  const canP = useCallback((p) => isAdm() || (currentUser?.pages || []).includes(p), [isAdm, currentUser]);

  const visibleItems = useMemo(() => data.items.filter(i => canF(i.firm)), [data.items, canF]);
  const visibleTxns = useMemo(() => data.txns.filter(t => canF(t.firm) && (canL(t.loc) || (t.toLoc && canL(t.toLoc)))), [data.txns, canF, canL]);
  const visibleFirms = useMemo(() => data.firms.filter(f => canF(f.id)), [data.firms, canF]);
  const visibleLocs = useMemo(() => data.locs.filter(l => canL(l.id)), [data.locs, canL]);

  const opn = useCallback((itemObj) => canL(itemObj.loc) ? (+itemObj.open || 0) : 0, [canL]);
  const operatorName = currentUser ? currentUser.name : data.cfg.op;

  // Stock calculation engine: Ledger Entries
  const entries = useMemo(() => {
    const E = [];
    const P = (t, it, loc, i, o, k, r) => {
      if (it && canL(loc)) {
        E.push({ d: t.date, it, loc, i: +i || 0, o: +o || 0, k, r: +r || 0, t });
      }
    };

    for (const t of data.txns) {
      const L = t.lines || [];
      if (t.type === 'IN') L.forEach(l => P(t, l.it, t.loc, l.qty, 0, 'IN', l.rate));
      else if (t.type === 'OUT') L.forEach(l => P(t, l.it, t.loc, 0, l.qty, 'OUT', l.rate));
      else if (t.type === 'REJ') L.forEach(l => P(t, l.it, t.loc, 0, l.qty, 'REJ', l.rate));
      else if (t.type === 'SR') L.forEach(l => P(t, l.it, t.loc, l.qty, 0, 'SR', l.rate));
      else if (t.type === 'TRF') L.forEach(l => { P(t, l.it, t.loc, 0, l.qty, 'TO'); P(t, l.it, t.toLoc, l.qty, 0, 'TI'); });
      else if (t.type === 'ADJ') L.forEach(l => P(t, l.it, t.loc, l.qty > 0 ? l.qty : 0, l.qty < 0 ? -l.qty : 0, 'ADJ'));
      else if (t.type === 'JOB') {
        (t.batches || []).forEach(b => (b.lines || []).forEach(l => P(t, l.it, t.loc, 0, l.qty, 'JC')));
        (t.prod || []).forEach(l => P(t, l.it, t.loc, l.qty, 0, 'JP'));
      }
    }

    const rk = e => (e.k === 'TO' ? 0.5 : e.k === 'TI' ? 0.6 : e.i > 0 ? 0 : 1);
    E.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : (rk(a) - rk(b)) || (pid(a.t) - pid(b.t))));
    return E;
  }, [data.txns, canL, pid]);

  // Aggregate function
  const aggregateStock = useCallback((from, to) => {
    const A = {};
    data.items.forEach(i => {
      A[i.id] = { op: opn(i), inq: 0, outq: 0, rej: 0, adj: 0, trf: 0, cl: 0, k: {}, loc: { [i.loc]: opn(i) } };
    });

    for (const e of entries) {
      if (to && e.d > to) break;
      const a = A[e.it];
      if (!a) continue;
      const n = e.i - e.o;
      a.loc[e.loc] = (a.loc[e.loc] || 0) + n;
      if (from && e.d < from) {
        a.op += n;
        continue;
      }
      a.k[e.k] = (a.k[e.k] || 0) + e.i + e.o;
      if (e.k === 'IN' || e.k === 'JP' || e.k === 'SR') a.inq += e.i;
      else if (e.k === 'OUT' || e.k === 'JC') a.outq += e.o;
      else if (e.k === 'REJ') a.rej += e.o;
      else if (e.k === 'ADJ') a.adj += n;
      else if (e.k === 'TI' || e.k === 'TO') a.trf += n;
    }

    for (const a of Object.values(A)) {
      a.cl = a.op + a.inq - a.outq - a.rej + a.adj + a.trf;
    }
    return A;
  }, [data.items, entries, opn]);

  // Weighted average cost per item
  const calcVals = useCallback((to) => {
    const S = {};
    data.items.forEach(i => {
      S[i.id] = { b: opn(i), av: +i.rate || 0, v: opn(i) * (+i.rate || 0) };
    });

    for (const e of entries) {
      if (to && e.d > to) break;
      const s = S[e.it];
      if (!s || ((e.k === 'TI' || e.k === 'TO') && !(currentUser && !isAdm() && (currentUser.locs || []).length))) continue;
      if (e.i > 0) {
        const itemObj = data.items.find(i => i.id === e.it);
        s.v += e.i * ((e.k === 'IN' && e.r > 0) ? e.r : (s.av || +(itemObj?.rate || 0)));
        s.b += e.i;
      }
      if (e.o > 0) {
        s.v -= e.o * s.av;
        s.b -= e.o;
      }
      if (s.b > 1e-9) s.av = s.v / s.b;
      else s.v = 0;
    }
    return S;
  }, [data.items, entries, opn, currentUser, isAdm]);

  const stkAt = useCallback((id, date, loc) => {
    const i = data.items.find(x => x.id === id);
    if (!i) return 0;
    let s = (!loc || loc === i.loc) ? opn(i) : 0;
    for (const e of entries) {
      if (date && e.d > date) break;
      if (e.it === id && (!loc || e.loc === loc)) s += e.i - e.o;
    }
    return s;
  }, [data.items, entries, opn]);

  const pc = useCallback((o) => {
    const ltd = (+o.adc || 0) * (+o.lt || 0);
    const ss = ltd * (+o.sf || 0);
    const rol = ltd + ss;
    const rq = Math.max(+o.moq || 0, ltd);
    return { ltd, ss, rol, rq, mx: rol + rq };
  }, []);

  // Comprehensive SKU Metrics Context (cx)
  const cx = useMemo(() => {
    const A = aggregateStock();
    const V = calcVals();
    const c = data.cfg;
    const t = today();
    const f1 = dAgo(c.adcDays);
    const f2 = dAgo(c.fsnDays);
    const C = {};
    const O = {};
    const LO = {};
    const S0 = {};
    const PH = {};

    data.items.forEach(i => {
      C[i.id] = 0;
      O[i.id] = 0;
      LO[i.id] = '';
      S0[i.id] = opn(i);
    });

    for (const e of entries) {
      if (!(e.it in C)) continue;
      if (e.d <= f2) S0[e.it] += e.i - e.o;
      if ((e.k === 'OUT' || e.k === 'JC') && e.d <= t) {
        if (e.d > f1) C[e.it] += e.o;
        if (e.d > f2) O[e.it] += e.o;
        if (e.d > LO[e.it]) LO[e.it] = e.d;
      } else if (e.k === 'SR' && e.d <= t) {
        if (e.d > f1) C[e.it] -= e.i;
        if (e.d > f2) O[e.it] -= e.i;
      }
    }

    [...data.counts]
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : pid(a) - pid(b)))
      .forEach(k => { PH[k.it] = k; });

    const firmMap = new Map(data.firms.map(f => [f.id, f.name]));
    const locMap = new Map(data.locs.map(l => [l.id, l.name]));

    const R = {};
    for (const i of visibleItems) {
      const a = A[i.id] || { cl: 0, inq: 0, outq: 0, rej: 0, adj: 0, k: {}, loc: {} };
      const v = V[i.id] || { av: 0 };
      const adcA = Math.max(0, C[i.id] || 0) / c.adcDays;
      const auto = c.adcMode === 'auto' && adcA > 0;
      const adc = auto ? adcA : +i.adc || 0;
      const p = pc({ adc, lt: i.lt, sf: i.sf, moq: i.moq });
      const cl = a.cl;
      const pct = p.mx > 0 ? (cl / p.mx) * 100 : null;
      const band = pct == null ? (cl < 0 ? 'CR' : 'NS') : pct > 100 ? 'EX' : pct >= 66 ? 'NO' : pct >= 33 ? 'MD' : 'CR';
      const act = i.status !== 'Inactive';
      const need = act && (p.rol > 0 ? cl <= p.rol + 1e-9 : cl < 0);
      const sug = need ? Math.ceil(Math.max(+i.moq || 0, p.rq, p.mx - cl)) : 0;
      const avg = ((S0[i.id] || 0) + cl) / 2;
      const tr = avg > 0 ? (O[i.id] || 0) / avg : (O[i.id] || 0) > 0 ? O[i.id] : 0;
      const ds = LO[i.id] ? days(LO[i.id], t) : null;
      const cls = !LO[i.id] || ds > c.deadDays ? 'Dead' : tr >= c.fastTR ? 'Fast' : 'Slow';
      const ph = PH[i.id];

      R[i.id] = {
        id: i.id,
        i,
        sku: i.sku,
        name: i.sub,
        sub: i.sub,
        cat: i.cat,
        type: i.type,
        firm: firmMap.get(i.firm) || '',
        fid: i.firm,
        unit: i.unit,
        loc: locMap.get(i.loc) || '',
        status: i.status || 'Active',
        sup: i.sup || '',
        supc: i.supc || '',
        op: opn(i),
        adc,
        adcA,
        auto,
        lt: +i.lt || 0,
        sf: +i.sf || 0,
        moq: +i.moq || 0,
        ...p,
        inq: a.inq,
        outq: a.outq,
        rej: a.rej,
        adj: a.adj,
        pur: a.k.IN || 0,
        pr: a.k.REJ || 0,
        sal: a.k.OUT || 0,
        sr: a.k.SR || 0,
        jc: a.k.JC || 0,
        jp: a.k.JP || 0,
        trq: a.k.TI || 0,
        cl,
        locs: a.loc,
        phys: ph ? ph.qty : null,
        pdate: ph ? ph.date : '',
        pv: ph ? ph.qty - ph.sys : null,
        pct,
        band,
        need,
        sug,
        wac: v.av,
        val: Math.max(0, cl) * v.av,
        cover: adc > 0 ? cl / adc : null,
        out2: O[i.id] || 0,
        tr,
        last: LO[i.id],
        ds,
        cls,
        urg: cl <= 0 ? 'Out of stock' : cl <= p.ss ? 'Critical' : 'Reorder'
      };
    }
    return R;
  }, [data.cfg, data.items, data.counts, data.firms, data.locs, visibleItems, aggregateStock, calcVals, opn, entries, pid, pc]);

  // Check negative stock constraint
  const chkNeg = useCallback((customTxns) => {
    if (data.cfg.allowNeg) return '';
    const E = [];
    const P = (t, it, loc, i, o, k) => {
      if (it && canL(loc)) E.push({ d: t.date, it, loc, i: +i || 0, o: +o || 0, k, t });
    };

    for (const t of customTxns) {
      const L = t.lines || [];
      if (t.type === 'IN') L.forEach(l => P(t, l.it, t.loc, l.qty, 0, 'IN'));
      else if (t.type === 'OUT') L.forEach(l => P(t, l.it, t.loc, 0, l.qty, 'OUT'));
      else if (t.type === 'REJ') L.forEach(l => P(t, l.it, t.loc, 0, l.qty, 'REJ'));
      else if (t.type === 'SR') L.forEach(l => P(t, l.it, t.loc, l.qty, 0, 'SR'));
      else if (t.type === 'TRF') L.forEach(l => { P(t, l.it, t.loc, 0, l.qty, 'TO'); P(t, l.it, t.toLoc, l.qty, 0, 'TI'); });
      else if (t.type === 'ADJ') L.forEach(l => P(t, l.it, t.loc, l.qty > 0 ? l.qty : 0, l.qty < 0 ? -l.qty : 0, 'ADJ'));
      else if (t.type === 'JOB') {
        (t.batches || []).forEach(b => (b.lines || []).forEach(l => P(t, l.it, t.loc, 0, l.qty, 'JC')));
        (t.prod || []).forEach(l => P(t, l.it, t.loc, l.qty, 0, 'JP'));
      }
    }

    const rk = e => (e.k === 'TO' ? 0.5 : e.k === 'TI' ? 0.6 : e.i > 0 ? 0 : 1);
    E.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : (rk(a) - rk(b)) || (pid(a.t) - pid(b.t))));

    const B = {};
    data.items.forEach(i => { B[i.id + '|' + i.loc] = +i.open || 0; });
    const locMap = new Map(data.locs.map(l => [l.id, l.name]));

    for (const x of E) {
      const k = x.it + '|' + x.loc;
      B[k] = (B[k] || 0) + x.i - x.o;
      if (B[k] < -1e-9) {
        const i = data.items.find(item => item.id === x.it);
        return `Not enough stock: ${i ? i.sku : ''} at ${locMap.get(x.loc) || ''} would go to ${B[k].toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${i ? i.unit : ''} on ${x.d} (${x.t.no || 'this entry'})`;
      }
    }
    return '';
  }, [data.cfg.allowNeg, data.items, data.locs, canL, pid]);

  // Auth functions
  const login = useCallback((user) => {
    setCurrentUser(user);
    try {
      sessionStorage.setItem(SESSION_USER_KEY, user.id);
    } catch (e) {}
    setActivePage('dashboard');
    showToast(`Welcome, ${user.name}`);
  }, [showToast]);

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_USER_KEY);
    } catch (e) {}
    setCurrentUser(null);
    setModalState(null);
  }, []);

  // Navigation functions
  const navigateTo = useCallback((pageName, tab) => {
    setActivePage(pageName);
    setFilters({});
    if (tab) {
      setActiveTabs(prev => ({ ...prev, [pageName]: tab }));
    }
    window.scrollTo(0, 0);
  }, []);

  const openItemDetail = useCallback((itemId) => {
    setFilterStack({ page: activePage, filters, tabs: { ...activeTabs } });
    setSelectedItemId(itemId);
    setActivePage('item');
    setFilters({});
    window.scrollTo(0, 0);
  }, [activePage, filters, activeTabs]);

  const backFromItemDetail = useCallback(() => {
    if (filterStack) {
      setActivePage(filterStack.page);
      setFilters(filterStack.filters || {});
      setActiveTabs(filterStack.tabs || {});
    } else {
      setActivePage('ims');
      setFilters({});
    }
  }, [filterStack]);

  const resetDemo = useCallback(() => {
    if (!window.confirm('Reset all inventory data to a clean state? Your entries will be lost.')) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('jbt_coal_ims_v2');
      localStorage.removeItem('jbt_coal_ims_v1');
    } catch (e) {}
    const fresh = getSeedData();
    saveData(fresh);
    setActiveTabs({});
    setFilters({});
    setActivePage('dashboard');
    showToast('Inventory reset to clean state.');
  }, [saveData, showToast]);

  const value = {
    data,
    setData: saveData,
    currentUser,
    login,
    logout,
    activePage,
    setActivePage,
    navigateTo,
    activeTabs,
    setActiveTabs,
    filters,
    setFilters,
    selectedItemId,
    setSelectedItemId,
    openItemDetail,
    backFromItemDetail,
    toastInfo,
    showToast,
    showError,
    modalState,
    setModalState,
    closeModal: () => setModalState(null),
    printContent,
    setPrintContent,
    nextId,
    pid,
    isAdm,
    canF,
    canL,
    canP,
    visibleItems,
    visibleTxns,
    visibleFirms,
    visibleLocs,
    operatorName,
    entries,
    aggregateStock,
    calcVals,
    stkAt,
    pc,
    cx,
    chkNeg,
    resetDemo
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
