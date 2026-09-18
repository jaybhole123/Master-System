import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Exports data array to a proper Excel (.xlsx) file
 * @param {Array} data - Array of row objects
 * @param {Array} columns - Array of column definitions { key, label }
 * @param {string} fileName - Destination filename
 */
export function exportToExcel(data, columns, fileName) {
  const rows = data.map(row => {
    const formattedRow = {};
    columns.forEach(c => {
      formattedRow[c.label] = row[c.key] !== null && row[c.key] !== undefined ? row[c.key] : "";
    });
    return formattedRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  
  // Save file
  const cleanName = fileName.replace(/\.[^/.]+$/, ""); // strip existing extension
  XLSX.writeFile(workbook, `${cleanName}.xlsx`);
}

/**
 * Exports data array to a styled PDF table
 * @param {Array} data - Array of row objects
 * @param {Array} columns - Array of column definitions { key, label }
 * @param {string} fileName - Destination filename
 * @param {string} title - Title of the PDF document
 */
export function exportToPDF(data, columns, fileName, title = "Summary Table", extraTables = []) {
  // Use landscape ('l') format to fit columns better
  const doc = new jsPDF('l', 'mm', 'a4');
  
  // Set title & metadata
  doc.setFontSize(16);
  doc.setTextColor(0, 51, 102); // Ember color
  doc.text(title, 14, 15);
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

  const headers = columns.map(c => c.label);
  const body = data.map(row => 
    columns.map(c => {
      const val = row[c.key];
      return val !== null && val !== undefined ? String(val) : "";
    })
  );

  // Dynamically adjust styling based on the number of columns to prevent wrapping
  const colCount = columns.length;
  const isLargeTable = colCount > 10;
  const fontSize = isLargeTable ? 5.2 : 8;
  const cellPadding = isLargeTable 
    ? { top: 2.2, right: 0.8, bottom: 2.2, left: 0.8 } 
    : 2.5;

  autoTable(doc, {
    startY: 26,
    head: [headers],
    body: body,
    theme: 'grid',
    styles: { 
      fontSize: fontSize, 
      cellPadding: cellPadding,
      valign: 'middle',
      overflow: 'linebreak'
    },
    headStyles: { 
      fillColor: [0, 51, 102], 
      textColor: [255, 255, 255], 
      fontStyle: 'bold',
      fontSize: isLargeTable ? 5.2 : 8
    },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    margin: { top: 25, left: 10, right: 10 },
    tableWidth: 'auto'
  });

  // Render any extra tables
  extraTables.forEach((table) => {
    let currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 26;
    
    // Add page if needed before rendering title
    if (currentY > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text(table.title || "", 14, currentY);
    currentY += 6;

    const extraHeaders = table.columns.map(c => c.label);
    const extraBody = table.data.map(row => 
      table.columns.map(c => {
        const val = row[c.key];
        return val !== null && val !== undefined ? String(val) : "";
      })
    );

    const extraColCount = table.columns.length;
    const extraIsLargeTable = extraColCount > 10;
    const extraFontSize = extraIsLargeTable ? 5.2 : 8;
    const extraCellPadding = extraIsLargeTable 
      ? { top: 2.2, right: 0.8, bottom: 2.2, left: 0.8 } 
      : 2.5;

    autoTable(doc, {
      startY: currentY,
      head: [extraHeaders],
      body: extraBody,
      theme: 'grid',
      styles: { 
        fontSize: extraFontSize, 
        cellPadding: extraCellPadding,
        valign: 'middle',
        overflow: 'linebreak'
      },
      headStyles: { 
        fillColor: [0, 51, 102], 
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        fontSize: extraIsLargeTable ? 5.2 : 8
      },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      margin: { top: 25, left: 10, right: 10 },
      tableWidth: 'auto'
    });
  });

  const cleanName = fileName.replace(/\.[^/.]+$/, "");
  doc.save(`${cleanName}.pdf`);
}
