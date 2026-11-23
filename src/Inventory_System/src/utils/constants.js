// Constants & Seed Data for JBT Coal IMS
export const STORAGE_KEY = 'jbt_coal_ims_v2';
export const SESSION_USER_KEY = 'jbt_coal_ims_user';

export const LOGO_BASE64 = `data:image/png;base64,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`;

export const TYPES = {
  RM: 'R.M (Raw Material)',
  FG: 'F.G (Finished Goods)',
  TR: 'Trading Goods',
  ST: 'Stores / Consumable'
};

export const TT = {
  OUT: 'Sale',
  IN: 'Purchase',
  JOB: 'Job Card',
  SR: 'Sales Return',
  REJ: 'Purchase Return',
  TRF: 'Transfer',
  ADJ: 'Physical Adjustment'
};

export const TS = {
  OUT: ['SALE', 'rd'],
  IN: ['PURCHASE', 'g'],
  JOB: ['JOB CARD', 'bl'],
  SR: ['SALES RET.', 'pu'],
  REJ: ['PUR. RET.', 'am'],
  TRF: ['TRANSFER', 'gy'],
  ADJ: ['ADJUST', 'gy']
};

export const PFX = {
  OUT: 'SAL',
  IN: 'PUR',
  JOB: 'JC',
  SR: 'SR',
  REJ: 'PR',
  TRF: 'TRF',
  ADJ: 'ADJ'
};

export const KN = {
  OUT: 'Sale',
  IN: 'Purchase',
  JC: 'Job Consumption',
  JP: 'Job Production',
  SR: 'Sales Return',
  REJ: 'Purchase Return',
  TI: 'Transfer In',
  TO: 'Transfer Out',
  ADJ: 'Physical Adj.'
};

export const BANDS = [
  ['EX', 'Excess Stock (>100%)', 'var(--ex)'],
  ['NO', 'Normal Stock (66-100%)', 'var(--no)'],
  ['MD', '33-66% Stock', 'var(--md)'],
  ['CR', 'Below 33% (Critical)', 'var(--cr)']
];

export const BN = {
  EX: 'Excess',
  NO: 'Normal',
  MD: '33-66%',
  CR: 'Critical',
  NS: 'Not planned'
};

export const BCL = {
  EX: 'bl',
  NO: 'g',
  MD: 'am',
  CR: 'rd',
  NS: 'gy'
};

export const BCOL = {
  EX: '#2f6fed',
  NO: '#1f9d6b',
  MD: '#f29d12',
  CR: '#e5334b',
  NS: '#98a2b3'
};

export const SRR = [
  'Quality complaint',
  'Wrong grade / size',
  'Excess supply',
  'Short / damaged',
  'Other'
];

export const REASONS = [
  'High ash',
  'Excess moisture',
  'Low GCV',
  'Oversize / stones / shale',
  'Short / damaged',
  'Other'
];

export const PAGEL = {
  dashboard: 'Dashboard',
  ims: 'Inventory (IMS)',
  txns: 'Transactions',
  reorder: 'Re-Orders',
  reports: 'Reports',
  masters: 'Masters'
};

export const DEFCFG = {
  op: 'admin1',
  adcMode: 'auto',
  adcDays: 30,
  fsnDays: 90,
  fastTR: 1,
  deadDays: 90,
  allowNeg: false
};

// Demo Coal Seed Data Generator
export function getSeedData() {
  let seq = 0;
  const nid = () => 'u' + (++seq);
  const dAgo = n => {
    const d = new Date(Date.now() - n * 864e5);
    return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  };
  const dl_ = (n, h = '10:30') => dAgo(n) + 'T' + h;

  const firms = [
    { id: nid(), name: 'JBT Coal Pvt Ltd', gst: '22AAJCJ4521K1Z3', addr: 'Siltara Industrial Area, Raipur (C.G.)', phone: '0771-4000101' },
    { id: nid(), name: 'JBT Coal Traders', gst: '22AAKFJ7788L1Z6', addr: 'Urla Industrial Area, Raipur (C.G.)', phone: '0771-4000202' }
  ];

  const locs = [
    { id: nid(), name: 'Siltara Coal Yard', kind: 'Coal Yard', addr: 'Siltara Phase II, Raipur', cap: 5000 },
    { id: nid(), name: 'Urla Depot', kind: 'Depot', addr: 'Urla, Raipur', cap: 3000 },
    { id: nid(), name: 'Washery Plant', kind: 'Washery / Plant', addr: 'Siltara, Raipur', cap: 1500 },
    { id: nid(), name: 'Raipur Railway Siding', kind: 'Railway Siding', addr: 'Raipur Goods Shed', cap: 4000 }
  ];

  const units = ['MT', 'KG', 'Ltr', 'Nos'].map(n => ({ id: nid(), name: n }));

  const parties = [
    ['SECL Gevra Area', 'SUP-001', 'Supplier', '22AAACS1234A1Z5', 'Korba'],
    ['Korba Mines Pvt Ltd', 'SUP-002', 'Supplier', '22AABCK5678B1Z2', 'Korba'],
    ['Adani Global (Imported)', 'SUP-003', 'Supplier', '24AACCA1111C1Z1', 'Visakhapatnam'],
    ['Indian Oil Corporation', 'SUP-004', 'Supplier', '22AAACI1681G1Z0', 'Raipur'],
    ['Bhilai Steel Traders', 'CUS-001', 'Customer', '22AABCB1111C1Z9', 'Bhilai'],
    ['Raipur Power Corp', 'CUS-002', 'Customer', '22AABCR2222D1Z7', 'Raipur'],
    ['Hira Ferro Alloys', 'CUS-003', 'Customer', '22AABCH3333E1Z5', 'Raipur'],
    ['Internal - Yard Loaders', 'INT-001', 'Customer', '', 'Siltara'],
    ['Sai Roadlines', 'TRN-001', 'Transporter', '22AAFFS4444F1Z3', 'Raipur']
  ].map(p => ({ id: nid(), name: p[0], code: p[1], role: p[2], gst: p[3], city: p[4], phone: '' }));

  const SP = {
    'RC-G11': { gmin: 4200, amax: 36, mmax: 10, size: '0-250 mm' },
    'RC-G13': { gmin: 3600, amax: 40, mmax: 12, size: '0-250 mm' },
    'WC-2050': { gmin: 4800, amax: 24, mmax: 10, size: '20-50 mm' },
    'IMP-ID42': { gmin: 4100, amax: 8, mmax: 30, size: '0-50 mm' },
    'SC-G10': { gmin: 4000, amax: 35, mmax: 11, size: '0-100 mm' }
  };

  const F1 = firms[0].id;
  const F2 = firms[1].id;
  const LS = locs[0].id;
  const LU = locs[1].id;
  const LW = locs[2].id;
  const LR = locs[3].id;

  const I = (firm, type, cat, sub, sku, unit, loc, open, adc, lt, sf, moq, rate, sup, supc) => ({
    id: nid(), firm, type, cat, sub, sku, unit, loc, open, adc, lt, sf, moq, rate, sup, supc,
    status: 'Active',
    hsn: unit === 'Ltr' ? '27101944' : '27011200',
    ...(SP[sku] || {})
  });

  const a = I(F1, 'RM', 'Raw Coal', 'ROM Coal G-11 (SECL)', 'RC-G11', 'MT', LS, 800, 40, 7, 0.5, 500, 3900, 'SECL Gevra Area', 'SUP-001');
  const b = I(F1, 'RM', 'Raw Coal', 'ROM Coal G-13', 'RC-G13', 'MT', LS, 400, 15, 10, 0.5, 300, 3200, 'Korba Mines Pvt Ltd', 'SUP-002');
  const w = I(F1, 'FG', 'Washed Coal', 'Washed Coal 20-50 mm', 'WC-2050', 'MT', LW, 100, 18, 2, 0.5, 100, 5600, '', '');
  const f = I(F1, 'FG', 'Washed Coal', 'Coal Fines 0-10 mm', 'CF-0010', 'MT', LW, 150, 2, 3, 0.5, 50, 2100, '', '');
  const dz = I(F1, 'ST', 'Fuel', 'Diesel (HSD)', 'DSL-HSD', 'Ltr', LS, 2500, 120, 3, 0.5, 2000, 92, 'Indian Oil Corporation', 'SUP-004');
  const m = I(F2, 'TR', 'Imported Coal', 'Indonesian Coal 4200 GAR', 'IMP-ID42', 'MT', LU, 600, 20, 25, 0.6, 1000, 7400, 'Adani Global (Imported)', 'SUP-003');
  const s = I(F2, 'TR', 'Steam Coal', 'Steam Coal G-10', 'SC-G10', 'MT', LR, 300, 25, 7, 0.5, 200, 4300, 'SECL Gevra Area', 'SUP-001');

  const items = [a, b, w, f, dz, m, s];

  const txns = [];
  const nextNo = ty => {
    const maxNo = Math.max(0, ...txns.filter(x => x.type === ty).map(x => +String(x.no).split('-').pop() || 0));
    return PFX[ty] + '-' + String(maxNo + 1).padStart(4, '0');
  };

  const X = o => {
    o.id = nid();
    o.no = nextNo(o.type);
    o.op = DEFCFG.op;
    o.rem = o.rem || '';
    o.ref = o.ref || '';
    txns.push(o);
  };

  const IN = (firm, n, party, inv, veh, loc, lines, q, trn, ref) => X({
    type: 'IN', firm, date: dAgo(n), bdt: dl_(n + 1, '18:00'), rdt: dl_(n), party, inv, veh, trn: trn || '', loc, lines, q, ref
  });

  const OUT = (firm, n, party, dest, ch, inv, veh, loc, lines, rem) => X({
    type: 'OUT', firm, date: dAgo(n), party, dest, challan: ch, inv, veh, loc, lines, rem
  });

  IN(F1, 30, 'SECL Gevra Area', 'SECL/GV/8812', 'Rake BOXN-4471', LS, [{ it: a.id, billed: 1020, qty: 1000, rate: 3900 }], { gcv: 4310, tm: 9.2, ash: 33.8 }, 'Indian Railways RR-55120', 'PO-1101');
  IN(F2, 28, 'SECL Gevra Area', 'SECL/GV/8840', 'Rake BOXN-4502', LR, [{ it: s.id, billed: 1230, qty: 1200, rate: 4300 }], { gcv: 3950, tm: 10.1, ash: 36.2 }, 'Indian Railways RR-55190', 'PO-2101');
  OUT(F2, 27, 'Hira Ferro Alloys', 'Hira Ferro, Siltara', 'DC-2201', 'JCT/24/1101', 'CG-04-MK-2211', LU, [{ it: m.id, qty: 250, rate: 8100 }]);
  OUT(F1, 26, 'Internal - Yard Loaders', 'Siltara Coal Yard', 'ISS-0101', '', '', LS, [{ it: dz.id, qty: 800, rate: 0 }], 'Loader & dumper fuel');
  X({ type: 'TRF', firm: F1, date: dAgo(25), loc: LS, toLoc: LW, veh: 'CG-04-HT-7781', lines: [{ it: a.id, qty: 600 }], rem: 'Feed for washery' });
  OUT(F2, 24, 'Bhilai Steel Traders', 'Bhilai Steel Plant Gate 3', 'DC-2202', 'JCT/24/1102', 'CG-07-BK-4411', LR, [{ it: s.id, qty: 300, rate: 4900 }]);
  IN(F2, 21, 'Adani Global (Imported)', 'AGL/VZG/3391', 'CG-04-TR-1188', LU, [{ it: m.id, billed: 510, qty: 500, rate: 7400 }], { gcv: 4230, tm: 27.5, ash: 5.8 }, 'Sai Roadlines LR-4471', 'PO-2102');
  X({ type: 'JOB', firm: F1, date: dAgo(20), fgc: 'Washed Coal', loc: LW, ref: 'WO-201', batches: [{ lines: [{ it: a.id, qty: 450 }], nb: 9, rb: 0, rm: '0 MT' }], prod: [{ it: w.id, qty: 340, scrap: 50 }, { it: f.id, qty: 60, scrap: 0 }], rem: 'Jig washing' });
  IN(F1, 19, 'Indian Oil Corporation', 'IOC/RPR/7712', 'CG-04-TK-9001', LS, [{ it: dz.id, billed: 2000, qty: 2000, rate: 92 }], null, '', 'PO-1102');
  OUT(F1, 18, 'Bhilai Steel Traders', 'Bhilai Steel Plant Gate 3', 'DC-1101', 'JCPL/24/501', 'CG-07-BK-5521', LW, [{ it: w.id, qty: 250, rate: 6200 }]);
  OUT(F1, 18, 'Internal - Yard Loaders', 'Siltara Coal Yard', 'ISS-0102', '', '', LS, [{ it: dz.id, qty: 700, rate: 0 }], 'Loader fuel');
  OUT(F2, 17, 'Bhilai Steel Traders', 'Bhilai Steel Plant Gate 3', 'DC-2203', 'JCT/24/1103', 'CG-07-BK-4417', LU, [{ it: m.id, qty: 200, rate: 8150 }]);
  OUT(F1, 16, 'Raipur Power Corp', 'RPC Boiler House, Urla', 'DC-1102', 'JCPL/24/502', 'CG-04-PL-3321', LS, [{ it: b.id, qty: 120, rate: 3700 }]);
  OUT(F1, 15, 'Raipur Power Corp', 'RPC Boiler House, Urla', 'DC-1103', 'JCPL/24/503', 'CG-04-PL-3322', LW, [{ it: w.id, qty: 150, rate: 6100 }]);
  OUT(F1, 14, 'Hira Ferro Alloys', 'Hira Ferro, Siltara', 'DC-1104', 'JCPL/24/504', 'CG-04-MK-2219', LS, [{ it: a.id, qty: 200, rate: 4600 }]);
  OUT(F2, 13, 'Raipur Power Corp', 'RPC Boiler House, Urla', 'DC-2204', 'JCT/24/1104', 'CG-04-PL-3330', LR, [{ it: s.id, qty: 350, rate: 4950 }]);
  IN(F1, 12, 'SECL Gevra Area', 'SECL/GV/8902', 'CG-12-TR-6620', LS, [{ it: a.id, billed: 306, qty: 300, rate: 3950 }], { gcv: 4250, tm: 9.8, ash: 34.6 }, 'Sai Roadlines LR-4502', 'PO-1103');
  X({ type: 'TRF', firm: F2, date: dAgo(11), loc: LR, toLoc: LU, veh: 'CG-04-HT-7790', lines: [{ it: s.id, qty: 100 }], rem: 'Depot stock for local sales' });
  OUT(F1, 11, 'Internal - Yard Loaders', 'Siltara Coal Yard', 'ISS-0103', '', '', LS, [{ it: dz.id, qty: 900, rate: 0 }], 'Loader fuel');
  X({ type: 'TRF', firm: F1, date: dAgo(10), loc: LS, toLoc: LW, veh: 'CG-04-HT-7781', lines: [{ it: a.id, qty: 500 }], rem: 'Feed for washery' });
  IN(F1, 9, 'Korba Mines Pvt Ltd', 'KMPL/3301', 'CG-12-TR-7710', LS, [{ it: b.id, billed: 300, qty: 300, rate: 3200 }], { gcv: 3650, tm: 11.2, ash: 41.5 }, 'Sai Roadlines LR-4510', 'PO-1104');
  X({ type: 'REJ', firm: F1, date: dAgo(9), party: 'Korba Mines Pvt Ltd', against: 'KMPL/3301', reason: 'High ash', loc: LS, lines: [{ it: b.id, qty: 40, rate: 3200 }], rem: 'Ash above 40% contract limit - returned' });
  X({ type: 'JOB', firm: F1, date: dAgo(8), fgc: 'Washed Coal', loc: LW, ref: 'WO-202', batches: [{ lines: [{ it: a.id, qty: 300 }], nb: 6, rb: 0, rm: '0 MT' }, { lines: [{ it: a.id, qty: 200 }], nb: 4, rb: 0, rm: '0 MT' }], prod: [{ it: w.id, qty: 400, scrap: 50 }, { it: f.id, qty: 50, scrap: 0 }], rem: '' });
  OUT(F2, 7, 'Raipur Power Corp', 'RPC Boiler House, Urla', 'DC-2205', 'JCT/24/1105', 'CG-04-PL-3341', LU, [{ it: m.id, qty: 220, rate: 8200 }]);
  OUT(F1, 6, 'Bhilai Steel Traders', 'Bhilai Steel Plant Gate 3', 'DC-1105', 'JCPL/24/505', 'CG-07-BK-5530', LW, [{ it: w.id, qty: 300, rate: 6250 }]);
  OUT(F1, 5, 'Raipur Power Corp', 'RPC Boiler House, Urla', 'DC-1106', 'JCPL/24/506', 'CG-04-PL-3350', LS, [{ it: b.id, qty: 150, rate: 3750 }]);
  OUT(F1, 4, 'Internal - Yard Loaders', 'Siltara Coal Yard', 'ISS-0104', '', '', LS, [{ it: dz.id, qty: 900, rate: 0 }], 'Loader fuel');
  OUT(F2, 4, 'Hira Ferro Alloys', 'Hira Ferro, Siltara', 'DC-2206', 'JCT/24/1106', 'CG-04-MK-2230', LR, [{ it: s.id, qty: 250, rate: 5000 }]);
  X({ type: 'JOB', firm: F1, date: dAgo(3), fgc: 'Washed Coal', loc: LW, ref: 'WO-203', batches: [{ lines: [{ it: a.id, qty: 150 }], nb: 3, rb: 1, rm: '50 MT' }], prod: [{ it: w.id, qty: 120, scrap: 30 }], rem: '' });
  X({ type: 'SR', firm: F1, date: dAgo(1), party: 'Bhilai Steel Traders', against: 'DC-1105', reason: 'Wrong grade / size', loc: LW, lines: [{ it: w.id, qty: 20, rate: 6250 }], rem: 'Oversize lumps returned' });
  OUT(F1, 2, 'Hira Ferro Alloys', 'Hira Ferro, Siltara', 'DC-1107', 'JCPL/24/507', 'CG-04-MK-2241', LW, [{ it: w.id, qty: 150, rate: 6300 }]);
  OUT(F1, 1, 'Internal - Yard Loaders', 'Siltara Coal Yard', 'ISS-0105', '', '', LS, [{ it: dz.id, qty: 700, rate: 0 }], 'Loader fuel');

  const counts = [
    { id: nid(), date: dAgo(2), it: a.id, qty: 790, sys: 800, rem: 'Monthly yard survey (drone volumetric)', op: DEFCFG.op },
    { id: nid(), date: dAgo(3), it: s.id, qty: 600, sys: 600, rem: 'Siding survey', op: DEFCFG.op }
  ];

  const siltaraLocs = locs.filter(l => /siltara|washery/i.test(l.name)).map(l => l.id);
  const users = [
    { id: nid(), name: 'admin1', role: 'Admin', pin: '1234', pages: [], firms: [], locs: [] },
    { id: nid(), name: 'Ramesh (Siltara store)', role: 'User', pin: '1111', pages: ['dashboard', 'ims', 'txns', 'reorder'], firms: [F1], locs: siltaraLocs.length ? siltaraLocs : [locs[0].id] }
  ];

  return {
    seq,
    cfg: { ...DEFCFG },
    firms,
    locs,
    units,
    parties,
    items,
    txns,
    counts,
    users
  };
}
