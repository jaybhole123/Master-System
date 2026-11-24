  import React, { useState, useMemo } from 'react';
import { SvgIcon, IC } from '../utils/helpers';
import DataTable from './DataTable';
import { exportData } from '../utils/excel';
import { usePagePermission } from '../../../hooks/usePagePermission';

export default function GenericPageLayout({
  title,
  sub,
  pre,
  buttons,
  searchPlaceholder = 'Search...',
  filterDefs = [], // [{ k, l, o: [[val, label]], onChange, reload }]
  showDateRange = false,
  cardsData, // function or array of [label, val, accentColor, sub]
  cols,
  data, // array or function returning array
  sumCols,
  act,
  onClickRow,
  rowStyle,
  initialFilters = {}
}) {
  const { canWrite } = usePagePermission("Inventory (IMS)", title || "Inventory");
  const [localFilters, setLocalFilters] = useState(initialFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState(initialFilters.from || '');
  const [toDate, setToDate] = useState(initialFilters.to || '');

  // Retrieve raw rows
  const rawRows = useMemo(() => {
    return typeof data === 'function' ? data() : (data || []);
  }, [data]);

  // Filter rows
  const filteredRows = useMemo(() => {
    let r = [...rawRows];

    if (showDateRange) {
      if (fromDate) r = r.filter(x => x.date >= fromDate);
      if (toDate) r = r.filter(x => x.date <= toDate);
    }

    // Dropdown filters
    for (const [key, val] of Object.entries(localFilters)) {
      if (val !== '' && val != null) {
        r = r.filter(x => String(x[key]) === String(val));
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      r = r.filter(x =>
        Object.values(x)
          .filter(v => typeof v !== 'object')
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }

    return r;
  }, [rawRows, showDateRange, fromDate, toDate, localFilters, searchQuery]);

  // Compute cards
  const cards = useMemo(() => {
    if (!cardsData) return [];
    return typeof cardsData === 'function' ? cardsData(filteredRows) : cardsData;
  }, [cardsData, filteredRows]);

  const handleExport = (asExcel = false) => {
    exportData(title, cols, filteredRows, asExcel);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {pre}

      <div className="bar">
        <div>
          <h2>{title}</h2>
          {sub && <div className="lg" style={{ marginTop: '2px' }}>{sub}</div>}
        </div>
        {canWrite && <div className="btns">{buttons}</div>}
      </div>

      {cards && cards.length > 0 && (
        <div className="cards" id="kc">
          {cards.map((c, i) => (
            <div
              key={i}
              className={`card kp ${c[4] ? 'clickable' : ''}`}
              style={c[2] ? { '--a': c[2] } : undefined}
              onClick={c[4] || undefined}
            >
              <div className="l">{c[0]}</div>
              <div className="v">{c[1]}</div>
              {c[3] && <div className="s">{c[3]}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="card filt">
        <div className="srch">
          <SvgIcon path={IC.search} />
          <input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {showDateRange && (
          <>
            <label>
              From{' '}
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>
            <label>
              To{' '}
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>
          </>
        )}

        {filterDefs.map((flt, idx) => (
          <select
            key={flt.k || idx}
            value={localFilters[flt.k] || ''}
            onChange={(e) => {
              const val = e.target.value;
              setLocalFilters(prev => ({ ...prev, [flt.k]: val }));
              if (flt.onChange) flt.onChange(val);
            }}
          >
            <option value="">{flt.l}</option>
            {flt.o?.map((opt, oIdx) => {
              const [val, lbl] = Array.isArray(opt) ? opt : [opt, opt];
              return (
                <option key={oIdx} value={val}>
                  {lbl}
                </option>
              );
            })}
          </select>
        ))}

        <span className="sp"></span>

        <button type="button" className="b2" onClick={() => handleExport(false)}>
          <SvgIcon path={IC.dl} /> Export CSV
        </button>
        <button type="button" className="b2" onClick={() => handleExport(true)}>
          Excel
        </button>
        <button type="button" className="b2" onClick={handlePrint}>
          <SvgIcon path={IC.pr} /> Print
        </button>
      </div>

      <div className="card tblc" id="tbl">
        <DataTable
          title={title}
          cols={cols}
          rows={filteredRows}
          sumCols={sumCols}
          act={canWrite ? act : null}
          onClickRow={onClickRow}
          rowStyle={rowStyle}
        />
      </div>
    </>
  );
}
