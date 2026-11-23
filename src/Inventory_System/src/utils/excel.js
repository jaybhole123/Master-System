import * as XLSX from 'xlsx';
import { strip } from './helpers';

export function exportData(filename, cols, rows, asExcel = false) {
  const exportCols = cols.filter(c => strip(c.h) && !c.nx);
  const header = exportCols.map(c => strip(c.h));
  const dataRows = rows.map(r =>
    exportCols.map(c => (c.x ? c.x(r) : r[c.k] ?? ''))
  );

  const cleanName = strip(filename).replace(/\W+/g, '_') || 'Export';

  if (asExcel && XLSX && XLSX.utils) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, cleanName + '.xlsx');
    return;
  }

  // Fallback to CSV
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const csvContent =
    '\ufeff' +
    [header, ...dataRows].map(r => r.map(q).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = cleanName + '.csv';
  a.click();
}

export function parseCSV(text) {
  const r = [];
  let row = [];
  let c = '';
  let q = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          c += '"';
          i++;
        } else {
          q = 0;
        }
      } else {
        c += ch;
      }
    } else if (ch === '"') {
      q = 1;
    } else if (ch === ',') {
      row.push(c);
      c = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(c);
      c = '';
      r.push(row);
      row = [];
    } else {
      c += ch;
    }
  }
  if (c || row.length) {
    row.push(c);
    r.push(row);
  }
  return r;
}

export function importFile(callback, onError) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv,.xlsx,.xls';
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;

    const done = (matrix) => {
      if (matrix.length < 2) {
        if (onError) onError('File is empty');
        return;
      }
      const headers = matrix[0].map(h => String(h || '').trim().toLowerCase());
      const records = matrix
        .slice(1)
        .filter(row => row.some(cell => String(cell || '').trim()))
        .map(row =>
          Object.fromEntries(
            headers.map((h, idx) => [h, String(row[idx] ?? '').trim()])
          )
        );
      callback(records);
    };

    const reader = new FileReader();
    if (/\.xlsx?$/i.test(file.name)) {
      if (!XLSX || !XLSX.read) {
        if (onError) onError('Excel reader not available, please use CSV');
        return;
      }
      reader.onload = e => {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
        done(data);
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = e => {
        done(parseCSV(e.target.result));
      };
      reader.readAsText(file);
    }
  };
  input.click();
}
