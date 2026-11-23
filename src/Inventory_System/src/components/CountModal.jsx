import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from './Modal';
import { today, fmt } from '../utils/helpers';
import { PFX } from '../utils/constants';

export default function CountModal({ itemId, onClose }) {
  const { data, setData, stkAt, nextId, chkNeg, operatorName, showToast, showError } = useApp();

  const item = data.items.find(i => i.id === itemId);
  const [date, setDate] = useState(today());
  const [qty, setQty] = useState('');
  const [remarks, setRemarks] = useState('');
  const [autoAdj, setAutoAdj] = useState(false);

  if (!item) return null;

  const currentSys = stkAt(item.id, date);
  const diff = qty === '' ? null : +qty - currentSys;

  const nextNo = (ty) => {
    const maxNo = Math.max(0, ...data.txns.filter(x => x.type === ty).map(x => +String(x.no).split('-').pop() || 0));
    return (PFX[ty] || ty) + '-' + String(maxNo + 1).padStart(4, '0');
  };

  const handleSave = () => {
    if (!date || qty === '' || +qty < 0) {
      showError('Enter count date and physical quantity');
      return;
    }

    const sys = stkAt(item.id, date);
    const d = +qty - sys;

    let updatedTxns = [...data.txns];

    if (autoAdj && Math.abs(d) > 1e-9) {
      const adjTxn = {
        id: nextId(),
        no: nextNo('ADJ'),
        type: 'ADJ',
        firm: item.firm,
        date,
        loc: item.loc,
        lines: [{ it: item.id, qty: d }],
        rem: 'Physical count adjustment',
        ref: '',
        op: operatorName
      };

      const negErr = chkNeg([...updatedTxns, adjTxn]);
      if (negErr) {
        showError(negErr);
        return;
      }
      updatedTxns.push(adjTxn);
    }

    const newCount = {
      id: nextId(),
      date,
      it: item.id,
      qty: +qty,
      sys,
      rem: remarks.trim(),
      op: operatorName
    };

    setData({
      ...data,
      txns: updatedTxns,
      counts: [...data.counts, newCount]
    });

    showToast('Physical count saved');
    onClose();
  };

  return (
    <Modal
      title={`Physical Stock Count - ${item.sku}`}
      okText="Save count"
      onOk={handleSave}
      onClose={onClose}
    >
      <div className="g2">
        <div className="fg">
          <label>Count date *</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div className="fg">
          <label>Physical quantity ({item.unit}) *</label>
          <input
            type="number"
            step="any"
            min="0"
            value={qty}
            placeholder="0"
            onChange={e => setQty(e.target.value)}
          />
        </div>
        <div className="fg full">
          <label>Remarks / method</label>
          <input
            value={remarks}
            placeholder="e.g. Drone volumetric survey, weighbridge, stick measurement"
            onChange={e => setRemarks(e.target.value)}
          />
        </div>
      </div>

      <div className="cntb">
        System stock on this date: <b>{fmt(currentSys)} {item.unit}</b>
        {diff != null && (
          <>
            {' '}
            &nbsp;·&nbsp; Variance:{' '}
            <b style={{ color: diff < 0 ? '#e5334b' : diff > 0 ? '#1f9d6b' : 'inherit' }}>
              {diff > 0 ? '+' : ''}
              {fmt(diff)} {item.unit}
            </b>
            {currentSys ? ` (${fmt((diff / currentSys) * 100, 1)}%)` : ''}
          </>
        )}
      </div>

      <label className="chk">
        <input
          type="checkbox"
          checked={autoAdj}
          onChange={e => setAutoAdj(e.target.checked)}
        />{' '}
        Post an adjustment so system stock matches this physical count
      </label>
    </Modal>
  );
}
