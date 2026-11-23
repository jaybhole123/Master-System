import React, { useState } from 'react';
import { SvgIcon, IC, fmt, inr, strip } from '../utils/helpers';
import Modal from './Modal';

export default function DataTable({
  cols,
  rows,
  empty = 'No records found for these filters',
  sumCols,
  act,
  onClickRow,
  rowStyle,
  title = 'Record'
}) {
  const [viewRecord, setViewRecord] = useState(null);

  const handleCellClick = (e, row) => {
    if (e.target.closest('.act, a, button, input, select')) return;
    if (onClickRow) onClickRow(row);
  };

  const hasMixedUnits = new Set(rows.map(x => x.unit).filter(Boolean)).size > 1;

  return (
    <>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th className="no vwc">View</th>
              {cols.map((k, j) => (
                <th key={j} className={`${k.n ? 'r' : ''} ${k.c || ''}`}>
                  {typeof k.h === 'function' ? k.h() : k.h}
                </th>
              ))}
              {act && <th className="no r">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, n) => {
              const rStyle = rowStyle ? rowStyle(row) : undefined;
              return (
                <tr
                  key={row.id != null ? row.id : n}
                  className={`${onClickRow ? 'rowc' : ''} ${rowStyle ? 'bnd' : ''}`}
                  onClick={(e) => handleCellClick(e, row)}
                  style={rStyle ? (typeof rStyle === 'string' ? { '--c': rStyle.replace('--c:', '') } : rStyle) : undefined}
                >
                  <td className="no vwc">
                    <button
                      type="button"
                      className="ico vwb"
                      title="View details"
                      onClick={() => setViewRecord(row)}
                    >
                      <SvgIcon path={IC.eye} />
                    </button>
                  </td>
                  {cols.map((col, j) => {
                    let cellVal = null;
                    if (col.f) cellVal = col.f(row);
                    else if (col.n) cellVal = fmt(row[col.k]);
                    else cellVal = row[col.k];

                    return (
                      <td key={j} className={`${col.n ? 'r' : ''} ${col.c || ''}`}>
                        {cellVal}
                      </td>
                    );
                  })}
                  {act && (
                    <td className="no r">
                      <div className="act">{act(row)}</div>
                    </td>
                  )}
                </tr>
              );
            })}

            {!rows.length && (
              <tr>
                <td colSpan={99} className="emp">
                  {empty}
                </td>
              </tr>
            )}

            {rows.length > 0 && sumCols && (
              <tr className="tot">
                <td className="no vwc"></td>
                {cols.map((col, j) => {
                  let totalVal = '';
                  if (j === 0) {
                    totalVal = (
                      <>
                        Total ({rows.length})
                        {hasMixedUnits && (
                          <span className="av2"> qty totals hidden - mixed units</span>
                        )}
                      </>
                    );
                  } else if (sumCols.includes(col.k) && (!hasMixedUnits || col.inr)) {
                    const totalNum = rows.reduce((acc, x) => acc + (+x[col.k] || 0), 0);
                    totalVal = col.inr ? inr(totalNum) : fmt(totalNum);
                  }

                  return (
                    <td key={j} className={`${col.n ? 'r' : ''} ${col.c || ''}`}>
                      {totalVal}
                    </td>
                  );
                })}
                {act && <td className="no"></td>}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {viewRecord && (
        <Modal
          title={`${strip(title) || 'Record'} - details`}
          width="mid"
          cancelText="Close"
          showOk={false}
          onClose={() => setViewRecord(null)}
          footerExtra={
            onClickRow ? (
              <button
                type="button"
                className="b2"
                style={{ marginRight: 'auto' }}
                onClick={() => {
                  const target = viewRecord;
                  setViewRecord(null);
                  onClickRow(target);
                }}
              >
                <SvgIcon path={IC.eye} /> Open full details
              </button>
            ) : null
          }
        >
          <div className="vwg">
            {cols
              .filter(k => strip(typeof k.h === 'function' ? k.h() : k.h))
              .map((col, idx) => {
                const headerTitle = strip(typeof col.h === 'function' ? col.h() : col.h);
                let val = '';
                try {
                  if (col.f) val = col.f(viewRecord);
                  else if (col.n) val = fmt(viewRecord[col.k]);
                  else val = viewRecord[col.k];
                } catch (e) {
                  val = '';
                }

                if (val == null || (typeof val === 'string' && strip(val) === '')) {
                  val = <span className="av2">-</span>;
                }

                return (
                  <div key={idx} className="vwi">
                    <span>{headerTitle}</span>
                    <div className="vwv">{val}</div>
                  </div>
                );
              })}
          </div>
        </Modal>
      )}
    </>
  );
}
