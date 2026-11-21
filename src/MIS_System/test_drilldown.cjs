
const https = require('https');
const API_URL = 'https://script.google.com/macros/s/AKfycbwmhX_IEbuxvDRhaxm6hnYjh9ovJo3YuD2nML3a3vNbSBtuYJNqgPZnFARqsOrPvE_YdA/exec';
const MASTER_SHEET_ID = '1H8mSp4YEUxKQC7dIKTj0hNcpIWf1gpLJh2BIt2WhGiQ';
const TARGET_NAME = 'Ghanshyam Choudhary';

function fetchUrl(targetUrl) {
    return new Promise((resolve, reject) => {
        const req = https.get(targetUrl, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchUrl(res.headers.location).then(resolve).catch(reject);
            } else {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); }
                    catch (e) { reject(new Error('HTML error')); }
                });
            }
        });
        req.setTimeout(30000, () => { req.destroy(); reject(new Error('TIMEOUT')); });
        req.on('error', reject);
    });
}

function fetchSheet(sheetName, spreadsheetId) {
    let url = API_URL + '?sheet=' + encodeURIComponent(sheetName);
    if (spreadsheetId) url += '&spreadsheetId=' + encodeURIComponent(spreadsheetId);
    return fetchUrl(url);
}

function parseSheetRef(ref) {
    if (!ref) return null;
    const str = String(ref).trim();
    const bangIndex = str.indexOf('!');
    if (bangIndex === -1) return { sheetName: str, colIndex: -1 };
    const sheetName = str.substring(0, bangIndex);
    const rangePart = str.substring(bangIndex + 1);
    const colMatch = rangePart.match(/^([A-Za-z]+)/);
    if (!colMatch) return { sheetName, colIndex: -1 };
    const colLetter = colMatch[1].toUpperCase();
    let colIndex = 0;
    for (let i = 0; i < colLetter.length; i++) colIndex = colIndex * 26 + (colLetter.charCodeAt(i) - 64);
    return { sheetName, colIndex: colIndex - 1 };
}

function formatDateValue(val) {
    if (val === undefined || val === null || val === '') return '';
    const str = String(val);
    const d = new Date(str);
    if (!isNaN(d.getTime()) && (str.includes('t') || str.includes('T') || str.includes('-') || str.includes('/'))) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return dd + '/' + mm + '/' + yyyy + ' ' + hh + ':' + min;
    }
    return str;
}

async function runTest() {
    console.log('==================================================');
    console.log('DRILL DOWN TEST FOR: ' + TARGET_NAME);
    console.log('==================================================');

    try {
        // STEP 1
        console.log('\nStep 1: Reading from Master Data Sheet...');
        const t1 = Date.now();
        const dataSheet = await fetchSheet('Data', MASTER_SHEET_ID);
        if (!dataSheet.success) throw new Error('Master Data error: ' + (dataSheet.error || dataSheet.message));
        console.log('Master Data loaded in ' + ((Date.now()-t1)/1000).toFixed(1) + 's | ' + dataSheet.data.length + ' rows');

        const userRow = dataSheet.data.find(r => r[4] && String(r[4]).trim() === TARGET_NAME);
        if (!userRow) throw new Error('User not found in Data sheet');

        const task = {
            taskName: userRow[3],
            nameColRef: userRow[9],
            plannedSheetRef: userRow[7],
            actualSheetRef: userRow[8],
            delayColRef: userRow[27],
            sheetId: userRow[5]
        };
        const nameParsed = parseSheetRef(task.nameColRef);

        console.log('FMS Name: ' + userRow[2]);
        console.log('FMS Sheet ID: ' + task.sheetId);
        console.log('Planned Sheet Ref: ' + task.plannedSheetRef);
        console.log('Name Col Ref: ' + task.nameColRef);

        // STEP 2
        console.log('\nStep 2: Fetching the FMS Sheet (' + nameParsed.sheetName + ')...');
        const t2 = Date.now();
        const fmsSheet = await fetchSheet(nameParsed.sheetName, task.sheetId);
        if (!fmsSheet.success) throw new Error('FMS Sheet error: ' + (fmsSheet.error || fmsSheet.message));
        const elapsed2 = ((Date.now()-t2)/1000).toFixed(1);
        const rows = fmsSheet.data;
        console.log('Result: Downloaded ' + rows.length + ' rows from ' + nameParsed.sheetName + ' in ' + elapsed2 + ' seconds!');

        // STEP 3
        console.log('\nStep 3: Filtering the Data...');
        const nameCol = nameParsed.colIndex;
        const plannedCol = parseSheetRef(task.plannedSheetRef).colIndex;
        const actualCol = parseSheetRef(task.actualSheetRef).colIndex;
        const delayCol = task.delayColRef ? parseSheetRef(task.delayColRef).colIndex : -1;

        let matchCount = 0;
        const finalOutput = [];
        for (let i = 1; i < rows.length; i++) {
            const rowName = rows[i][nameCol];
            if (rowName && String(rowName).trim() === TARGET_NAME) {
                matchCount++;
                finalOutput.push({
                    taskName: task.taskName,
                    planned: formatDateValue(rows[i][plannedCol]),
                    actual: formatDateValue(rows[i][actualCol]),
                    delay: delayCol >= 0 ? String(rows[i][delayCol]) : ''
                });
            }
        }
        console.log('Filter by Name: Found ' + matchCount + ' rows where Name = Ghanshyam Choudhary');

        // FINAL OUTPUT
        console.log('\nFinal Output (first 3 rows):');
        console.log(JSON.stringify(finalOutput.slice(0, 3), null, 2));
        if (finalOutput.length > 3) {
            console.log('... and ' + (finalOutput.length - 3) + ' more rows');
        }

    } catch(e) {
        console.log('\n---ERROR---');
        console.log(e.message);
    }
}

runTest();
