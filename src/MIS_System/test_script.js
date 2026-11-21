fetch('https://script.google.com/macros/s/AKfycbzJsQ2wNa8qfi_MyPyPSJEZgskpaBX_QO94NWBa-FTk7WONYut6Hqta-AFqXqpUnzL8xg/exec?sheet=P-MIS&spreadsheetId=1eEshKj2Ful5YkAoY2HWTr_pPMsQ1HRv7nmq6vGtly1c')
  .then(r => r.json())
  .then(d => {
    if (d.success) {
      console.log('Testing ALL rows for meghraj');
      let found = 0;
      for (let i = 0; i < d.data.length; i++) {
        const row = d.data[i];
        if (row && JSON.stringify(row).toLowerCase().includes('meghraj') && i > 3) {
           console.log(`Found at index ${i}: `, row); 
           found++;
           if (found > 3) break;
        }
      }
    }
  });
