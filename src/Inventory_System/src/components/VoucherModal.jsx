import React from 'react';
import { useApp } from '../context/AppContext';
import Modal from './Modal';
import { SvgIcon, IC, fmt, inr, dfmt } from '../utils/helpers';
import { LOGO_BASE64 } from '../utils/constants';

const VT = {
  IN: 'Purchase - Goods Receipt Note',
  OUT: 'Sale - Delivery Challan',
  JOB: 'Job Card / Production Slip',
  SR: 'Sales Return Note',
  REJ: 'Purchase Return - Debit Note',
  TRF: 'Stock Transfer Note',
  ADJ: 'Stock Adjustment Note'
};

export default function VoucherModal({ txnId, onClose, onEdit }) {
  const { data } = useApp();

  const txn = data.txns.find(x => x.id === txnId);
  if (!txn) return null;

  const firm = data.firms.find(f => f.id === txn.firm) || {};
  const locMap = new Map(data.locs.map(l => [l.id, l.name]));
  const itemMap = new Map(data.items.map(i => [i.id, i]));

  const lines = txn.lines || [];
  const batches = txn.batches || [];
  const prod = txn.prod || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      title={`${VT[txn.type] || 'Voucher'} - ${txn.no}`}
      width="wide"
      okText="🖨 Print"
      cancelText="Close"
      onOk={handlePrint}
      onClose={onClose}
      footerExtra={
        txn.type !== 'ADJ' && onEdit ? (
          <button
            type="button"
            className="b2"
            style={{ marginRight: 'auto' }}
            onClick={() => {
              onClose();
              onEdit(txn.id);
            }}
          >
            <SvgIcon path={IC.edit} /> Edit
          </button>
        ) : null
      }
    >
      <div className="vch" id="voucher-print-area">
        {/* Header */}
        <div className="vh">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <img src={LOGO_BASE64} alt="JBT" />
            <div>
              <h2>{firm.name}</h2>
              <div style={{ fontSize: '11px', color: '#555' }}>
                {firm.addr}
                {firm.gst ? ` · GSTIN ${firm.gst}` : ''}
                {firm.phone ? ` · ${firm.phone}` : ''}
              </div>
            </div>
          </div>
          <div className="vt">
            <b>{VT[txn.type]}</b>
            {txn.no && <>{txn.no}<br /></>}
            {dfmt(txn.date)}
          </div>
        </div>

        {/* Voucher Meta details */}
        <div className="vg">
          {txn.type === 'IN' && (
            <>
              <div><span>Supplier</span>{txn.party}</div>
              <div><span>Invoice no.</span>{txn.inv}</div>
              <div><span>Receiving date</span>{dfmt(txn.date)}</div>
              {txn.bdt && <div><span>Billing date</span>{dfmt(txn.bdt)}</div>}
              {txn.veh && <div><span>Vehicle / rake</span>{txn.veh}</div>}
              {txn.trn && <div><span>Transporter / LR</span>{txn.trn}</div>}
              <div><span>Storage location</span>{locMap.get(txn.loc)}</div>
              {txn.ref && <div><span>Reference</span>{txn.ref}</div>}
              <div><span>Operator</span>{txn.op}</div>
            </>
          )}

          {txn.type === 'OUT' && (
            <>
              <div><span>Party</span>{txn.party}</div>
              <div><span>Destination</span>{txn.dest}</div>
              <div><span>Challan no.</span>{txn.challan}</div>
              {txn.inv && <div><span>Invoice no.</span>{txn.inv}</div>}
              {txn.veh && <div><span>Vehicle no.</span>{txn.veh}</div>}
              <div><span>From location</span>{locMap.get(txn.loc)}</div>
              {txn.ref && <div><span>Reference</span>{txn.ref}</div>}
              <div><span>Operator</span>{txn.op}</div>
            </>
          )}

          {txn.type === 'JOB' && (
            <>
              <div><span>Finished goods category</span>{txn.fgc}</div>
              <div><span>Plant / location</span>{locMap.get(txn.loc)}</div>
              {txn.ref && <div><span>Reference / WO</span>{txn.ref}</div>}
              <div><span>Operator</span>{txn.op}</div>
            </>
          )}

          {(txn.type === 'REJ' || txn.type === 'SR') && (
            <>
              <div><span>{txn.type === 'SR' ? 'Customer' : 'Supplier'}</span>{txn.party}</div>
              {txn.against && <div><span>Against</span>{txn.against}</div>}
              <div><span>Reason</span>{txn.reason}</div>
              <div><span>Location</span>{locMap.get(txn.loc)}</div>
              {txn.ref && <div><span>Reference</span>{txn.ref}</div>}
              <div><span>Operator</span>{txn.op}</div>
            </>
          )}

          {txn.type === 'TRF' && (
            <>
              <div><span>From location</span>{locMap.get(txn.loc)}</div>
              <div><span>To location</span>{locMap.get(txn.toLoc)}</div>
              {txn.veh && <div><span>Vehicle no.</span>{txn.veh}</div>}
              {txn.ref && <div><span>Reference</span>{txn.ref}</div>}
              <div><span>Operator</span>{txn.op}</div>
            </>
          )}

          {txn.type === 'ADJ' && (
            <>
              <div><span>Location</span>{locMap.get(txn.loc)}</div>
              <div><span>Operator</span>{txn.op}</div>
            </>
          )}
        </div>

        {/* Tables */}
        {txn.type === 'IN' && (
          <>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>SKU</th>
                  <th>Material</th>
                  <th className="r">Billed qty</th>
                  <th className="r">Received qty</th>
                  <th className="r">Shortage</th>
                  <th>UOM</th>
                  <th className="r">Rate</th>
                  <th className="r">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => {
                  const it = itemMap.get(l.it) || {};
                  return (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{it.sku}</td>
                      <td>{it.sub}</td>
                      <td className="r">{l.billed ? fmt(l.billed) : '-'}</td>
                      <td className="r">{fmt(l.qty)}</td>
                      <td className="r">{l.billed ? fmt(l.billed - l.qty) : '-'}</td>
                      <td>{it.unit}</td>
                      <td className="r">{fmt(l.rate)}</td>
                      <td className="r">{inr(l.qty * l.rate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p style={{ textAlign: 'right' }}>
              <b>
                Total: {fmt(lines.reduce((s, x) => s + (+x.qty || 0), 0))} ·{' '}
                {inr(lines.reduce((s, x) => s + (+x.qty || 0) * (+x.rate || 0), 0))}
              </b>
            </p>
            {txn.q && txn.q.gcv && (
              <p>
                <b>Quality:</b> GCV {fmt(txn.q.gcv, 0)} kcal/kg · Total moisture {fmt(txn.q.tm, 1)}% · Ash {fmt(txn.q.ash, 1)}%
              </p>
            )}
          </>
        )}

        {txn.type === 'OUT' && (
          <>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>SKU</th>
                  <th>Material</th>
                  <th className="r">Qty</th>
                  <th>UOM</th>
                  <th className="r">Rate</th>
                  <th className="r">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => {
                  const it = itemMap.get(l.it) || {};
                  return (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{it.sku}</td>
                      <td>{it.sub}</td>
                      <td className="r">{fmt(l.qty)}</td>
                      <td>{it.unit}</td>
                      <td className="r">{l.rate ? fmt(l.rate) : '-'}</td>
                      <td className="r">{l.rate ? inr(l.qty * l.rate) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p style={{ textAlign: 'right' }}>
              <b>
                Total: {fmt(lines.reduce((s, x) => s + (+x.qty || 0), 0))}
                {lines.some(l => l.rate)
                  ? ` · ${inr(lines.reduce((s, x) => s + (+x.qty || 0) * (+x.rate || 0), 0))}`
                  : ''}
              </b>
            </p>
          </>
        )}

        {txn.type === 'JOB' && (
          <>
            {batches.map((b, bIdx) => (
              <div key={bIdx}>
                <p style={{ margin: '12px 0 6px' }}>
                  <b>Batch {bIdx + 1}</b> · No. of batches: {fmt(b.nb)} · Remaining batches: {fmt(b.rb)} · Remaining material: {b.rm || '-'}
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>SKU</th>
                      <th>Material</th>
                      <th className="r">Qty consumed</th>
                      <th>UOM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(b.lines || []).map((l, idx) => {
                      const it = itemMap.get(l.it) || {};
                      return (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{it.sku}</td>
                          <td>{it.sub}</td>
                          <td className="r">{fmt(l.qty)}</td>
                          <td>{it.unit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}

            <p style={{ margin: '14px 0 6px' }}>
              <b>Total production</b>
            </p>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>SKU</th>
                  <th>Material</th>
                  <th className="r">Output qty</th>
                  <th className="r">Scraps</th>
                  <th>UOM</th>
                </tr>
              </thead>
              <tbody>
                {prod.map((p, idx) => {
                  const it = itemMap.get(p.it) || {};
                  return (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{it.sku}</td>
                      <td>{it.sub}</td>
                      <td className="r">{fmt(p.qty)}</td>
                      <td className="r">{fmt(p.scrap)}</td>
                      <td>{it.unit}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {(() => {
              const inp = batches.flatMap(b => b.lines || []).reduce((acc, l) => acc + (+l.qty || 0), 0);
              const out = prod.reduce((acc, l) => acc + (+l.qty || 0), 0);
              const sc = prod.reduce((acc, l) => acc + (+l.scrap || 0), 0);
              return (
                <p>
                  <b>
                    Input {fmt(inp)} · Output {fmt(out)} · Scraps {fmt(sc)} · Yield{' '}
                    {inp ? `${fmt((out / inp) * 100, 1)}%` : '-'} · Unaccounted {fmt(inp - out - sc)}
                  </b>
                </p>
              );
            })()}
          </>
        )}

        {(txn.type === 'REJ' || txn.type === 'SR') && (
          <>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>SKU</th>
                  <th>Material</th>
                  <th className="r">Qty returned</th>
                  <th>UOM</th>
                  <th className="r">Rate</th>
                  <th className="r">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => {
                  const it = itemMap.get(l.it) || {};
                  return (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{it.sku}</td>
                      <td>{it.sub}</td>
                      <td className="r">{fmt(l.qty)}</td>
                      <td>{it.unit}</td>
                      <td className="r">{l.rate ? fmt(l.rate) : '-'}</td>
                      <td className="r">{l.rate ? inr(l.qty * l.rate) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {lines.some(l => l.rate) && (
              <p style={{ textAlign: 'right' }}>
                <b>
                  {txn.type === 'SR' ? 'Credit' : 'Debit'} value:{' '}
                  {inr(lines.reduce((s, x) => s + (+x.qty || 0) * (+x.rate || 0), 0))}
                </b>
              </p>
            )}
          </>
        )}

        {txn.type === 'TRF' && (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>SKU</th>
                <th>Material</th>
                <th className="r">Qty</th>
                <th>UOM</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => {
                const it = itemMap.get(l.it) || {};
                return (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{it.sku}</td>
                    <td>{it.sub}</td>
                    <td className="r">{fmt(l.qty)}</td>
                    <td>{it.unit}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {txn.type === 'ADJ' && (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>SKU</th>
                <th>Material</th>
                <th className="r">Adjustment</th>
                <th>UOM</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => {
                const it = itemMap.get(l.it) || {};
                return (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{it.sku}</td>
                    <td>{it.sub}</td>
                    <td className="r">{l.qty > 0 ? `+${fmt(l.qty)}` : fmt(l.qty)}</td>
                    <td>{it.unit}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {txn.rem && (
          <p>
            <b>Remarks:</b> {txn.rem}
          </p>
        )}

        <div className="sig">
          <div>
            Prepared by
            <br />
            <b>{txn.op || ''}</b>
          </div>
          <div>Checked by</div>
          <div>Authorised signatory</div>
        </div>
      </div>
    </Modal>
  );
}
