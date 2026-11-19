'use client';

import { FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';

// @react-pdf/renderer is ~500KB — dynamically imported only when user clicks the button

const DailyReportButton = ({ dataSheetRows }: any) => {
  const [generating, setGenerating] = useState(false);

  const fetchTodayData = async () => {
    setGenerating(true);
    try {
      const now = new Date();
      const todayAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayStr = now.toLocaleDateString('en-GB');

      const allData: any = {};
      const modulesMap: any = {};

      // Group tasks by Module Name (Column C / Index 2)
      dataSheetRows.forEach((row: any, _idx: number) => {
        const groupName = String(row[2] || '').trim();
        // Skip empty group names or "Other" modules completely
        if (!groupName || groupName.toLowerCase() === 'other') return;

        if (!modulesMap[groupName]) {
          modulesMap[groupName] = { id: groupName, name: groupName };
          allData[groupName] = [];
        }
      });

      const modules = Object.values(modulesMap);

      // Fetch data for each unique sheet reference
      const sheetGroups: any = {};
      dataSheetRows.forEach((row: any, idx: number) => {
        const groupName = String(row[2] || '').trim();
        if (!groupName || groupName.toLowerCase() === 'other') return;

        const scriptUrl = String(row[25] || '').trim();
        const plannedRef = parseSheetRef(row[7]);
        const spreadsheetId = String(row[5] || '').trim();
        if (!scriptUrl || !plannedRef) return;

        const key = `${scriptUrl}|${plannedRef.sheetName}|${spreadsheetId}`;
        if (!sheetGroups[key]) {
          sheetGroups[key] = {
            scriptUrl,
            sheetName: plannedRef.sheetName,
            spreadsheetId,
            taskIndices: [],
          };
        }
        sheetGroups[key].taskIndices.push(idx);
      });

      const parseDate = (val: any) => {
        if (!val) return null;
        if (val instanceof Date) return val;

        const str = String(val).trim();
        if (!str) return null;

        if (!str.includes('/') && !str.includes('-')) {
          return null;
        }

        if (str.includes('/')) {
          const native = new Date(str);
          if (!Number.isNaN(native.getTime()) && native.getFullYear() > 1970) return native;

          const parts = str.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            if (year > 1970) {
              const date = new Date(year, month, day);
              if (!Number.isNaN(date.getTime())) return date;
            }
          }
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          const parts = str.split('-');
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          if (y > 1970) return new Date(y, m, d);
        }

        const d = new Date(str);
        return Number.isNaN(d.getTime()) ? null : d;
      };

      const formatDate = (val: any) => {
        if (val === undefined || val === null || val === '') return '';
        const str = String(val);
        const d = new Date(str);
        if (
          !Number.isNaN(d.getTime()) &&
          (str.includes('T') || str.includes('-') || str.includes('/'))
        ) {
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          const hh = String(d.getHours()).padStart(2, '0');
          const min = String(d.getMinutes()).padStart(2, '0');
          const ss = String(d.getSeconds()).padStart(2, '0');
          return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
        }
        return str;
      };

      const formatDuration = (val: any) => {
        if (val === undefined || val === null || val === '') return '';
        const str = String(val).toLowerCase();
        const d = parseDate(val);
        if (d && (String(val).includes('T') || String(val).includes('-'))) {
          const year = d.getUTCFullYear();
          if (year <= 1900) {
            const epoch = new Date(Date.UTC(1899, 11, 30));
            const diffMs = d.getTime() - epoch.getTime();
            const totalSeconds = Math.floor(diffMs / 1000);
            if (totalSeconds >= 0) {
              const h = Math.floor(totalSeconds / 3600);
              const m = Math.floor((totalSeconds % 3600) / 60);
              const s = totalSeconds % 60;
              return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            }
          }
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          const ss = String(d.getSeconds()).padStart(2, '0');
          return `${hh}:${mm}:${ss}`;
        }
        if (
          str.includes('day') ||
          str.includes('hour') ||
          str.includes('hr') ||
          str.includes('min')
        ) {
          let days = 0,
            hours = 0,
            minutes = 0,
            seconds = 0;
          const dayMatch = str.match(/(\d+)\s*day/);
          const hrMatch = str.match(/(\d+)\s*(hour|hr)/);
          const minMatch = str.match(/(\d+)\s*min/);
          const secMatch = str.match(/(\d+)\s*sec/);
          if (dayMatch) days = parseInt(dayMatch[1], 10);
          if (hrMatch) hours = parseInt(hrMatch[1], 10);
          if (minMatch) minutes = parseInt(minMatch[1], 10);
          if (secMatch) seconds = parseInt(secMatch[1], 10);
          const totalHours = days * 24 + hours;
          return `${String(totalHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        if (!Number.isNaN(val) && !Number.isNaN(parseFloat(val))) {
          const totalSeconds = Math.round(parseFloat(val) * 24 * 60 * 60);
          const h = Math.floor(totalSeconds / 3600);
          const m = Math.floor((totalSeconds % 3600) / 60);
          const s = totalSeconds % 60;
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        return String(val);
      };

      const activeSheetGroups = Object.values(sheetGroups).filter((group: any) =>
        group.taskIndices.some((idx: number) => {
          const row = dataSheetRows[idx];
          return (
            parseInt(row[10], 10) > 0 ||
            parseInt(row[14], 10) > 0 ||
            parseInt(row[15], 10) > 0 ||
            parseInt(row[18], 10) > 0
          );
        })
      );

      await Promise.all(
        (activeSheetGroups as any[]).map(async (group: any) => {
          try {
            const urlsToTry = [process.env.NEXT_PUBLIC_MIS_SCRIPT_URL]
              .map((u: any) => String(u || '').trim())
              .filter((u: string) => u.startsWith('http'));
            let sheetData = null;
            let success = false;

            for (const url of urlsToTry) {
              try {
                const separator = url.includes('?') ? '&' : '?';
                let fetchUrl = `${url}${separator}sheet=${encodeURIComponent(group.sheetName)}`;
                if (group.spreadsheetId) {
                  fetchUrl += `&spreadsheetId=${encodeURIComponent(group.spreadsheetId)}`;
                }

                const res = await fetch(fetchUrl);
                if (!res.ok) {
                  throw new Error(`HTTP error ${res.status}`);
                }
                const result = await res.json();
                if (result.success && Array.isArray(result.data)) {
                  sheetData = result.data;
                  success = true;
                  break;
                } else {
                  throw new Error(
                    result.message ||
                      result.error ||
                      'API returned success: false or invalid format'
                  );
                }
              } catch (err) {
                console.error(
                  `Fetch failed for PDF sheet ${group.sheetName} using url ${url}:`,
                  err
                );
              }
            }

            if (!success || !sheetData) {
              throw new Error(`Failed to fetch sheet data from all attempted URLs`);
            }

            const taskConfigs = group.taskIndices.map((idx: number) => {
              const row = dataSheetRows[idx];
              return {
                idx,
                groupName: String(row[2] || '').trim(),
                stageName: String(row[28] || '').trim(),
                personName: String(row[4] || '')
                  .trim()
                  .replace(/\s+/g, ' ')
                  .toLowerCase(),
                plannedRef: parseSheetRef(row[7]),
                actualRef: parseSheetRef(row[8]),
                nameRef: parseSheetRef(row[6]),
                taskNameRef: parseSheetRef(row[26]),
                delayRef: parseSheetRef(row[27]),
                defaultTaskName: row[3],
              };
            });

            const minStartRow = Math.min(
              ...taskConfigs.map((c: any) => c.nameRef?.startRowIndex || 0)
            );

            const nameColMap = new Map();
            taskConfigs.forEach((config: any) => {
              if (!config.nameRef) return;
              const col = config.nameRef.colIndex;
              if (!nameColMap.has(col)) nameColMap.set(col, new Map());
              const personMap = nameColMap.get(col);
              if (!personMap.has(config.personName)) personMap.set(config.personName, []);
              personMap.get(config.personName).push(config);
            });

            const seenKeys = new Set();

            (sheetData as any[]).slice(minStartRow).forEach((r: any, relativeIdx: number) => {
              const absoluteIdx = minStartRow + relativeIdx;

              nameColMap.forEach((personMap: any, colIndex: number) => {
                const rowPerson = String(r[colIndex] || '')
                  .trim()
                  .replace(/\s+/g, ' ')
                  .toLowerCase();
                if (!rowPerson) return;
                const configs = personMap.get(rowPerson);
                if (!configs) return;

                configs.forEach((config: any) => {
                  if (!config.nameRef || absoluteIdx < config.nameRef.startRowIndex) return;

                  const plannedVal = config.plannedRef ? r[config.plannedRef.colIndex] : '';
                  const actualVal = config.actualRef ? r[config.actualRef.colIndex] : '';
                  const delayVal = config.delayRef ? r[config.delayRef.colIndex] : '';

                  const pDate = parseDate(plannedVal);
                  const aDate = parseDate(actualVal);

                  if (pDate || aDate) {
                    const pDateAtMidnight = pDate
                      ? new Date(pDate.getFullYear(), pDate.getMonth(), pDate.getDate())
                      : null;
                    const aDateAtMidnight = aDate
                      ? new Date(aDate.getFullYear(), aDate.getMonth(), aDate.getDate())
                      : null;

                    const isCompletedToday =
                      aDateAtMidnight && aDateAtMidnight.getTime() === todayAtMidnight.getTime();
                    const isPlannedToday =
                      pDateAtMidnight && pDateAtMidnight.getTime() === todayAtMidnight.getTime();
                    const isPastPending =
                      !aDate &&
                      pDateAtMidnight &&
                      pDateAtMidnight.getTime() < todayAtMidnight.getTime();

                    if (isCompletedToday || isPlannedToday || isPastPending) {
                      const dedupKey = `${config.groupName}|${rowPerson}|${absoluteIdx}`;
                      if (seenKeys.has(dedupKey)) return;
                      seenKeys.add(dedupKey);

                      let taskName = config.taskNameRef
                        ? String(r[config.taskNameRef.colIndex] || '').trim()
                        : '';
                      if (!taskName) taskName = config.defaultTaskName;

                      let status = 'Not Started';
                      let progress = 0;
                      if (actualVal) {
                        status = 'Completed';
                        progress = 100;
                      }

                      if (allData[config.groupName].length < 1000) {
                        allData[config.groupName].push({
                          id: config.idx,
                          personName: String(r[config.nameRef.colIndex] || '').trim(),
                          projectName: config.stageName,
                          taskDescription: taskName,
                          planned: formatDate(plannedVal),
                          actual: formatDate(actualVal),
                          delay: formatDuration(delayVal),
                          progress: progress,
                          status: status,
                          date: formatDate(plannedVal) || todayStr,
                        });
                      }
                    }
                  }
                });
              });
            });
          } catch (e) {
            console.error('Error fetching data for PDF:', group.sheetName, e);
          }
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 50));
      // Lazy load heavy PDF libraries only at this point — not on page load
      const [{ pdf }, { default: AllModulesPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../../shared/utils/AllModulesPDF'),
      ]);
      const doc = <AllModulesPDF modules={modules} allData={allData} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Daily_Report_${todayStr.replace(/\//g, '-')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF Generation error:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const parseSheetRef = (ref: any) => {
    if (!ref) return null;
    const str = String(ref).trim();
    const bangIndex = str.indexOf('!');
    if (bangIndex === -1) return { sheetName: str, colIndex: -1, startRowIndex: 0 };
    const sheetName = str.substring(0, bangIndex);
    const rangePart = str.substring(bangIndex + 1);
    const colMatch = rangePart.match(/^([A-Za-z]+)(\d*)/);
    if (!colMatch) return { sheetName, colIndex: -1, startRowIndex: 0 };
    const colLetter = colMatch[1].toUpperCase();
    let colIndex = 0;
    for (let i = 0; i < colLetter.length; i++) {
      colIndex = colIndex * 26 + (colLetter.charCodeAt(i) - 64);
    }
    colIndex -= 1;
    const startRow = colMatch[2] ? parseInt(colMatch[2], 10) : 1;
    const startRowIndex = startRow > 0 ? startRow - 1 : 0;
    return { sheetName, colIndex, startRowIndex };
  };

  return (
    <button
      onClick={fetchTodayData}
      disabled={generating}
      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
    >
      {generating ? (
        <>
          <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
          Generating...
        </>
      ) : (
        <>
          <FileText className="-ml-1 mr-2 h-4 w-4" />
          Daily Report
        </>
      )}
    </button>
  );
};

export default DailyReportButton;
