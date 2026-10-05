import React, { useState, useRef, useEffect } from 'react';
import { showToast } from "../utils/toast";
import Dropzone from "../components/Dropzone";
import EditModal from "../components/EditModal";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { exportToExcel, exportToPDF } from "../utils/exportHelpers";
import supabase from "../../../SupabaseClient";
import { Edit, Trash, CheckCircle } from "lucide-react";

// Point pdf.js at the correct worker
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export default function CLPage() {
  const fileInputRef = useRef(null);
  
  const [docs, setDocs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [view, setView] = useState("drop");
  const [loading, setLoading] = useState(false);
  const [loadingName, setLoadingName] = useState("");
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tesseractLoaded, setTesseractLoaded] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [editRowInfo, setEditRowInfo] = useState(null);
  const [editData, setEditData] = useState(null);

  useEffect(() => {
    // Load Tesseract script if not present
    const loadScript = (id, src) => {
      return new Promise((resolve) => {
        if (document.getElementById(id)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.id = id;
        script.src = src;
        script.async = true;
        script.onload = resolve;
        document.head.appendChild(script);
      });
    };

    const initScripts = async () => {
      await loadScript('tesseract-js-script', 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract.min.js');
      setTesseractLoaded(true);
    };

    initScripts();
  }, []);

  const fetchFromSupabase = async () => {
    try {
      const { data, error } = await supabase.from('secl_cmpdcil').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      const grouped = {};
      data.forEach(row => {
        const key = row.file_name || 'Manual Entry';
        if (!grouped[key]) {
          grouped[key] = {
            id: row.id,
            fileName: row.file_name,
            pdfUrl: row.pdf_url,
            data: {
              info: {
                'Company': row.company,
                'Contact Person': row.contact_person,
                'Auction ID': row.auction_id,
                'Auction Ref No': row.auction_ref_no,
                'Auction Start': row.auction_start,
                'Auction End': row.auction_end,
                'Mail Date': row.mail_date,
                'Buyer Ref No': row.buyer_ref_no
              },
              rows: []
            }
          };
        }
        grouped[key].data.rows.push({
          status: row.status || 'pending',
          dbId: row.id,
          subsidiary: row.subsidiary,
          source: row.source,
          bidId: row.bid_id,
          mode: row.mode,
          repGrade: row.rep_grade,
          size: row.size,
          offerQty: row.offer_qty,
          repNotifiedPrice: row.rep_notified_price,
          colliery: row.colliery,
          grade: row.grade,
          allocatedQty: row.allocated_qty,
          bidPrice: row.bid_price,
          collNotified: row.coll_notified,
          finalBid: row.final_bid,
          supplyRange: row.supply_range,
          premium: row.premium,
          seniority: row.seniority,
          thirdParty: row.third_party,
          value: row.value_rs
        });
      });
      const docsArray = Object.values(grouped);
      setDocs(docsArray);
      if (docsArray.length > 0) setView("results");
    } catch (e) {
      console.error("Failed to load saved data from Supabase", e);
    }
  };

  useEffect(() => {
    fetchFromSupabase();
  }, []);

  const NUM = s => { if (s === null || s === undefined) return null; const n = parseFloat(String(s).replace(/,/g, '')); return isNaN(n) ? null : n; };
  const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const parseDMY = s => { const m = String(s || '').match(/(\d{1,2})-(\w{3})-(\d{4})/); return m && MON[m[2].toLowerCase()] !== undefined ? new Date(+m[3], MON[m[2].toLowerCase()], +m[1]) : null; };

  function parseLetter(txt) {
    const R = { info: {}, rows: [], notes: [], terms: [], warns: [] };
    const first = (re, i = 1) => { const m = txt.match(re); return m ? m[i].trim() : ''; };
    const I = R.info;
    I['Auction ID'] = first(/Auction ID\s+([A-Z0-9_]{6,})/);
    I['Source Name'] = first(/Source Name\s+(.+?)\s+in the/i);
    I['Auction Ref No'] = first(/^Auction Ref\.?\s*No\.?\s+(.+)$/im);
    const pm = txt.match(/(\d{1,2}-\w{3}-\d{4}\s+\d{1,2}:\d{2}\s*[AP]M)\s*::\s*(\d{1,2}-\w{3}-\d{4}\s+\d{1,2}:\d{2})(?:\s*(?:Date\s+)?([AP]M))?/i);
    if (pm) { I['Auction Start'] = pm[1].replace(/\s+/g, ' '); I['Auction End'] = (pm[2] + ' ' + (pm[3] || '')).replace(/\s+/g, ' ').trim(); }
    I['Letter Date'] = first(/Date:\s*(\d{1,2}-\w{3}-\d{4})/);
    I['Mail Date'] = first(/((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \w{3} \d{1,2}, \d{4} at [\d:]+\s*[AP]M?)/);
    I["Buyer Ref No"] = first(/Buyer\s*Ref[.,]?\s*No[.,]?\s*(\S+)/i);
    const cl = txt.split('\n').find(l => /Buyer\s*Ref/i.test(l)) || '';
    I['Company'] = cl.replace(/^.*Buyer\s*Ref[.,]?\s*No[.,]?\s*\S+\s*/i, '').replace(/^\S*ompany(\s+Name)?\s*/i, '').trim();
    if (!I['Company']) I['Company'] = first(/^Company(?:\s*Name)?\s+(.+)$/im);
    I['Contact Person'] = first(/^Contact Person\s+(.+)$/im);
    I['UBID No'] = first(/UBID\s*No[.,]?\s*([A-Z0-9]+)/i);
    I['City'] = first(/^City\s+(\S+)/im);
    I['District'] = first(/^(?:.*\s)?District\s+(\S+)/im);
    I['State'] = first(/^State\s+([A-Za-z ]+)$/im);
    I['Pin Code'] = first(/Pin\s*Code\s+(\d{6})/i);
    I['Country'] = first(/^Country\s+(\S+)/im);

    const end = txt.search(/^\s*\W?\s*Note\s*:/im);
    const ids = [...txt.matchAll(/\b(\d{10,})\b/g)].filter(m => end < 0 || m.index < end);
    ids.forEach((m, k) => {
      const stop = k + 1 < ids.length ? ids[k + 1].index : (end > 0 ? end : txt.length);
      const seg = txt.slice(m.index + m[1].length, stop);
      const pre = txt.slice(Math.max(0, m.index - 60), m.index);
      const ctx = txt.slice(Math.max(0, m.index - 300), stop);
      const row = { bidId: m[1] };
      const sm = pre.match(/\b(SECL|NCL|MCL|WCL|CCL|BCCL|ECL|NEC)\b/); row.subsidiary = sm ? sm[1] : '';
      const mo = seg.match(/\b(Road cum Rail|Road|Rail|RCR)\b/i); row.mode = mo ? mo[1] : '';
      const gm = seg.match(/G-?\s?\d+/); row.repGrade = gm ? gm[0].replace(/\s/g, '') : '';
      const pr = seg.match(/(\d[\d,]*\.\d{2})\s*\|?\s*(\d[\d,]*\.\d{2})/);
      if (!pr) { R.warns.push(`Bid ID ${m[1]} ki row poori samajh nahi aayi (offer qty / price nahi mile).`); R.rows.push(row); return; }
      row.offerQty = NUM(pr[1]); row.repNotifiedPrice = NUM(pr[2]);
      const rest = seg.slice(seg.indexOf(pr[0]) + pr[0].length);
      const cm2 = rest.match(/^\s*\|?\s*(.+?)\s*\|?\s*(G-?\s?\d+)/);
      row.colliery = cm2 ? cm2[1].replace(/[|]/g, '').trim() : ''; row.collieryGrade = cm2 ? cm2[2].replace(/\s/g, '') : '';
      const tm = rest.match(/(\d[\d,]*\.\d{2})\s+(\d+(?:\.\d+)?)\s+(\d[\d,]*\.\d{2})\s*\|?\s*(\d+(?:\.\d+)?)\s+(?:(\S{1,8})\s+)?(\d+\.\d{1,2})\s+(\d+)\s+(Yes|No)\b/i);
      if (tm) {
        row.allocatedQty = NUM(tm[1]); row.bidPrice = NUM(tm[2]); row.collieryNotified = NUM(tm[3]); row.finalBid = NUM(tm[4]);
        row.supplyRange = tm[5] || '-'; row.premium = NUM(tm[6]); row.seniority = tm[7]; row.thirdParty = tm[8];
      } else R.warns.push(`Bid ID ${m[1]}: allocated qty / bid price wali row ka format samajh nahi aaya. Raw text dekh kar check karein.`);
      const mm = seg.match(/(\d{2,3})\s*MM\b/i) || seg.match(/\(-\)\s*(\d+)/);
      row.size = (/SIZED/i.test(ctx) ? 'Sized ROM ' : '') + (mm ? `(-) ${mm[1]} mm` : '');
      row.source = (I['Source Name'] || '').replace(/\s*\(.*\)\s*$/, '');
      if (row.bidPrice && row.repNotifiedPrice && row.premium !== null && row.premium !== undefined) {
        const p = (row.bidPrice - row.repNotifiedPrice) / row.repNotifiedPrice * 100;
        if (Math.abs(p - row.premium) > 0.05) R.warns.push(`Bid ID ${m[1]}: premium ${row.premium}% likha hai, par (Bid − Notified)/Notified = ${p.toFixed(2)}% aata hai. Koi number galat padha gaya ho sakta hai.`);
      }
      if (!R.rows.some(r => JSON.stringify(r) === JSON.stringify(row))) {
        R.rows.push(row);
      }
    });

    const ni = txt.search(/^\s*\W?\s*Note\s*:/im);
    const tail = ni >= 0 ? txt.slice(ni) : '';
    tail.split('\n').map(l => l.trim()).filter(Boolean).forEach(l => R.terms.push(l));
    return R;
  }

  function addWorkingDays(d, n) {
    const x = new Date(d.getTime());
    while (n > 0) { x.setDate(x.getDate() + 1); if (x.getDay() !== 0 && x.getDay() !== 6) n--; }
    return x;
  }
  
  const dmy = d => String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear();

  function derive(d) {
    d.rows.forEach(r => { r.value = (r.allocatedQty || 0) * (r.bidPrice || 0); });
    d.totals = { qty: d.rows.reduce((t, r) => t + (r.allocatedQty || 0), 0), value: d.rows.reduce((t, r) => t + r.value, 0) };
    d.totals.avg = d.totals.qty ? d.totals.value / d.totals.qty : 0;
    const ed = parseDMY(d.info['Auction End'] || d.info['Letter Date']);
    d.payBy = ed ? dmy(addWorkingDays(ed, 10)) : '';
  }

  function itemsToText(items) {
    const s = items.filter(i => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x), lines = [];
    s.forEach(it => { const L = lines.find(l => Math.abs(l.y - it.y) <= 2.5); if (L) L.items.push(it); else lines.push({ y: it.y, items: [it] }); });
    return lines.map(l => l.items.sort((a, b) => a.x - b.x).map(i => i.str.trim()).join(' ')).join('\n');
  }

  async function llmTranscribe(dataUrl) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 1000,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: dataUrl.split(',')[1] } },
          { type: 'text', text: 'Transcribe the text of this document page exactly as plain text, in reading order. Skip the Gmail header/footer lines. Keep every table row on ONE single line with cells separated by single spaces, and keep all numbers exactly. Key-value blocks: one "Label value" pair per line. Output only the text, nothing else.' }
        ] }]
      })
    });
    const d = await r.json();
    if (!d.content) throw new Error((d.error && d.error.message) || 'API response nahi mila');
    return d.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
  }

  const handleFiles = async (files) => {
    if (files.length === 0) {
      setError("Please upload only PDF files.");
      return;
    }

    if (!tesseractLoaded) {
      setError("Please wait for scripts to load.");
      return;
    }

    setError(null);
    setLoading(true);
    setLoadingName(files.length > 1 ? `${files.length} files` : files[0].name);
    setStatusMsg("");

    const newDocs = [];
    for (const file of files) {
      if (docs.some(d => d.fileName === file.name)) continue;
      try {
        setStatusMsg(`PDF khol rahe hain... (${file.name})`);
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        const texts = [], imgs = [], canv = [];
        let needOcr = false;
        
        for (let p = 1; p <= doc.numPages; p++) {
          const page = await doc.getPage(p);
          const tc = await page.getTextContent();
          const t = itemsToText(tc.items.map(i => ({ str: i.str, x: i.transform[4], y: i.transform[5] })));
          
          const vp = page.getViewport({ scale: 3 });
          const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
          await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
          
          imgs.push(c.toDataURL('image/jpeg', 0.6)); canv.push(c);
          texts.push(t); 
          if (t.replace(/\s/g, '').length < 80) needOcr = true;
        }

        if (needOcr && window.Tesseract) {
          let cur = 1;
          try {
            setStatusMsg(`OCR engine load ho raha hai (pehli baar thoda time lagta hai)...`);
            const worker = await window.Tesseract.createWorker('eng', 1, { 
              logger: m => { 
                if (m.status === 'recognizing text') {
                  setStatusMsg(`OCR chal raha hai... ${Math.round(m.progress * 100)}% (page ${cur})`); 
                }
              } 
            });
            await worker.setParameters({ tessedit_pageseg_mode: '4' });
            for (let i = 0; i < canv.length; i++) { 
              cur = i + 1; 
              texts[i] = (await worker.recognize(canv[i])).data.text; 
            }
            await worker.terminate();
          } catch (e1) {
            try {
              for (let i = 0; i < imgs.length; i++) { 
                setStatusMsg(`Claude se page ${i + 1} padhwa rahe hain...`); 
                texts[i] = await llmTranscribe(imgs[i]); 
              }
            } catch (e2) {
              throw new Error('OCR nahi chal saka (' + e1.message + '). Is PDF file ko Chrome me kholein, ya Chrome ke "Save as PDF" se banayi hui text-wali PDF use karein.');
            }
          }
        }

        const RAW = texts.join('\n\n--- page ---\n\n');
        const d = parseLetter(RAW);
        
        if (!d.rows.length) { 
          setError(`Allocation table nahi mili (${file.name}).`);
          continue;
        }
        
        derive(d);
        newDocs.push({
          id: Math.random().toString(36).substring(7),
          fileName: file.name,
          pdfUrl: URL.createObjectURL(file),
          data: d,
          raw: RAW,
          imgs: imgs
        });
      } catch (err) {
        console.error(err);
        setError(`Error: ${err.message}`);
      }
    }
    
    if (newDocs.length > 0) {
      setDocs((prev) => [...prev, ...newDocs]);
      setView("results");
    }
    setLoading(false);
    setStatusMsg("");
  };
  const exportCols = [
    { key: "company", label: "Company" },
    { key: "contactPerson", label: "Contact Person" },
    { key: "auctionId", label: "Auction ID" },
    { key: "auctionRefNo", label: "Auction Ref No" },
    { key: "auctionStart", label: "Auction Start" },
    { key: "auctionEnd", label: "Auction End" },
    { key: "mailDate", label: "Mail Date" },
    { key: "buyerRefNo", label: "Buyer Ref No" },
    { key: "subsidiary", label: "Subsidiary" },
    { key: "source", label: "Source" },
    { key: "bidId", label: "Bid ID" },
    { key: "mode", label: "Mode" },
    { key: "repGrade", label: "Rep. Grade" },
    { key: "size", label: "Size" },
    { key: "offerQty", label: "Offer Qty" },
    { key: "repNotifiedPrice", label: "Rep. Notified Price" },
    { key: "colliery", label: "Colliery" },
    { key: "grade", label: "Grade" },
    { key: "allocatedQty", label: "Allocated (MT)" },
    { key: "bidPrice", label: "Bid ₹/MT" },
    { key: "collNotified", label: "Coll. Notified" },
    { key: "finalBid", label: "Final Bid" },
    { key: "supplyRange", label: "Supply Range" },
    { key: "premium", label: "Premium %" },
    { key: "seniority", label: "Seniority" },
    { key: "thirdParty", label: "Third Party" },
    { key: "value", label: "Value ₹" }
  ];

  const getExportData = () => {
    return docs.flatMap(d => {
      const info = d.data.info || {};
      return (d.data.rows || []).map(r => ({
        company: info['Company'] || "",
        contactPerson: info['Contact Person'] || "",
        auctionId: info['Auction ID'] || "",
        auctionRefNo: info['Auction Ref No'] || "",
        auctionStart: info['Auction Start'] || "",
        auctionEnd: info['Auction End'] || "",
        mailDate: info['Mail Date'] || "",
        buyerRefNo: info['Buyer Ref No'] || "",
        subsidiary: r.subsidiary || "",
        source: r.source || "",
        bidId: r.bidId || "",
        mode: r.mode || "",
        repGrade: r.repGrade || "",
        size: r.size || "",
        offerQty: r.offerQty || "",
        repNotifiedPrice: r.repNotifiedPrice || "",
        colliery: r.colliery || "",
        grade: r.collieryGrade || r.grade || "",
        allocatedQty: r.allocatedQty || "",
        bidPrice: r.bidPrice || "",
        collNotified: r.collieryNotified || r.collNotified || "",
        finalBid: r.finalBid || "",
        supplyRange: r.supplyRange || "",
        premium: r.premium || "",
        seniority: r.seniority || "",
        thirdParty: r.thirdParty || "",
        value: r.value || ""
      }));
    });
  };

  const handleExportExcel = () => {
    exportToExcel(getExportData(), exportCols, "CMPDCIL_Extracted_Data");
  };

  const handleExportPdf = () => {
    exportToPDF(getExportData(), exportCols, "CMPDCIL_Extracted_Data", "CMPDCIL Summary Table");
  };

  const handleReset = () => {
    setDocs([]);
    setView("drop");
    setLoading(false);
    setLoadingName("");
    setError(null);
  };

  const handleSave = async () => {
    if (docs.length === 0) return;
    
    showToast("Saving PDFs to cloud...");
    setLoading(true);
    let updatedDocs = [...docs];
    try {
      for (let i = 0; i < updatedDocs.length; i++) {
        const d = updatedDocs[i];
        let pdf_url = d.pdfUrl || null;
        if (pdf_url && pdf_url.startsWith("blob:")) {
          try {
            const response = await fetch(pdf_url);
            const blob = await response.blob();
            const fileName = d.fileName || `cmpdcil_${Date.now()}.pdf`;
            const filePath = `pdfs/${Date.now()}_${fileName}`;
            
            const { error: uploadError } = await supabase.storage
              .from("secl-pdfs")
              .upload(filePath, blob, { contentType: "application/pdf", upsert: true });

            if (!uploadError) {
              const { data: publicUrlData } = supabase.storage
                .from("secl-pdfs")
                .getPublicUrl(filePath);
              pdf_url = publicUrlData?.publicUrl || null;
            } else {
              console.warn("PDF upload failed:", uploadError);
            }
          } catch (e) {
            console.error("Error fetching blob", e);
          }
        }
        updatedDocs[i].pdfUrl = pdf_url;
        
        // Save to Supabase
        const dbRows = (d.data.rows || []).filter(r => !r.dbId).map(r => ({
          company: d.data.info['Company'] || "",
          contact_person: d.data.info['Contact Person'] || "",
          auction_id: d.data.info['Auction ID'] || "",
          auction_ref_no: d.data.info['Auction Ref No'] || "",
          auction_start: d.data.info['Auction Start'] || "",
          auction_end: d.data.info['Auction End'] || "",
          mail_date: d.data.info['Mail Date'] || "",
          buyer_ref_no: d.data.info['Buyer Ref No'] || "",
          subsidiary: r.subsidiary || "",
          source: r.source || "",
          bid_id: r.bidId || "",
          mode: r.mode || "",
          rep_grade: r.repGrade || "",
          size: r.size || "",
          offer_qty: NUM(r.offerQty),
          rep_notified_price: NUM(r.repNotifiedPrice),
          colliery: r.colliery || "",
          grade: r.collieryGrade || r.grade || "",
          allocated_qty: NUM(r.allocatedQty),
          bid_price: NUM(r.bidPrice),
          coll_notified: NUM(r.collieryNotified || r.collNotified),
          final_bid: NUM(r.finalBid),
          supply_range: r.supplyRange || "",
          premium: r.premium || "",
          seniority: r.seniority || "",
          third_party: r.thirdParty || "",
          value_rs: NUM(r.value),
          pdf_url: pdf_url,
          file_name: d.fileName
        }));
        
        if (dbRows.length > 0) {
          const { error: dbError } = await supabase.from('secl_cmpdcil').insert(dbRows);
          if (dbError) console.error("Database insert error:", dbError);
        }
      }
      
      await fetchFromSupabase();
      showToast("Data and PDFs saved to Supabase successfully!");
    } catch(err) {
      console.error(err);
      showToast("Error saving PDFs");
    } finally {
      setLoading(false);
    }
  };

  const handleManualAdd = (formData) => {
    showToast("Manual entry for CL coming soon!");
    setIsModalOpen(false);
  };

  const handleModalSave = async (formData) => {
    if (editRowInfo) {
      if (editRowInfo.dbId) {
        const updateData = {
          company: formData.company,
          contact_person: formData.contactPerson,
          auction_id: formData.auctionId,
          auction_ref_no: formData.auctionRefNo,
          auction_start: formData.auctionStart,
          auction_end: formData.auctionEnd,
          mail_date: formData.mailDate,
          buyer_ref_no: formData.buyerRefNo,
          subsidiary: formData.subsidiary,
          source: formData.source,
          bid_id: formData.bidId,
          mode: formData.mode,
          rep_grade: formData.repGrade,
          size: formData.size,
          offer_qty: NUM(formData.offerQty),
          rep_notified_price: NUM(formData.repNotifiedPrice),
          colliery: formData.colliery,
          grade: formData.grade,
          allocated_qty: NUM(formData.allocatedQty),
          bid_price: NUM(formData.bidPrice),
          coll_notified: NUM(formData.collNotified),
          final_bid: NUM(formData.finalBid),
          supply_range: formData.supplyRange,
          premium: formData.premium,
          seniority: formData.seniority,
          third_party: formData.thirdParty,
          value_rs: NUM(formData.value)
        };
        const { error: updateError } = await supabase.from('secl_cmpdcil').update(updateData).eq('id', editRowInfo.dbId);
        if (updateError) {
          console.error(updateError);
          showToast("Error updating database.");
          return;
        }
      }
      setDocs(prev => {
        const newDocs = [...prev];
        const newDoc = {
          ...newDocs[editRowInfo.dIdx],
          data: {
            ...newDocs[editRowInfo.dIdx].data,
            info: { ...newDocs[editRowInfo.dIdx].data.info },
            rows: [...newDocs[editRowInfo.dIdx].data.rows]
          }
        };

        newDoc.data.info = {
          ...newDoc.data.info,
          'Company': formData.company,
          'Contact Person': formData.contactPerson,
          'Auction ID': formData.auctionId,
          'Auction Ref No': formData.auctionRefNo,
          'Auction Start': formData.auctionStart,
          'Auction End': formData.auctionEnd,
          'Mail Date': formData.mailDate,
          'Buyer Ref No': formData.buyerRefNo,
        };
        newDoc.data.rows[editRowInfo.rIdx] = {
           ...newDoc.data.rows[editRowInfo.rIdx],
           ...formData
        };
        
        newDocs[editRowInfo.dIdx] = newDoc;
        return newDocs;
      });
      showToast("Row updated successfully!");
      setIsModalOpen(false);
      setEditRowInfo(null);
      setEditData(null);
    } else {
      handleManualAdd(formData);
    }
  };

  
  const handleMarkDone = async (dIdx, rIdx, dbId, currentStatus) => {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done';
    if (dbId) {
      try {
        const { error } = await supabase.from('secl_cmpdcil').update({ status: newStatus }).eq('id', dbId);
        if (error) throw error;
      } catch (err) {
        console.error(err);
        showToast("Error updating status.");
        return;
      }
    }
    setDocs(prev => {
      const newDocs = [...prev];
      newDocs[dIdx].rows[rIdx].status = newStatus;
      return newDocs;
    });
    showToast(newStatus === 'done' ? 'Marked as Done!' : 'Moved to Pending');
  };

  const handleDeleteRow = async (dIdx, rIdx, dbId) => {
    if (!window.confirm("Are you sure you want to delete this row?")) return;
    if (dbId) {
      try {
        const { error } = await supabase.from('secl_cmpdcil').delete().eq('id', dbId);
        if (error) throw error;
        showToast("Row deleted from database.");
      } catch (err) {
        console.error(err);
        showToast("Error deleting from database.");
        return;
      }
    }
    setDocs(prev => {
      const newDocs = [...prev];
      const newDoc = {
        ...newDocs[dIdx],
        data: {
          ...newDocs[dIdx].data,
          rows: [...newDocs[dIdx].data.rows]
        }
      };
      
      newDoc.data.rows.splice(rIdx, 1);
      
      if (newDoc.data.rows.length === 0) {
        newDocs.splice(dIdx, 1);
      } else {
        newDocs[dIdx] = newDoc;
      }
      
      return newDocs;
    });
  };

  const openEditModal = (r) => {
    setEditRowInfo({ dIdx: r._dIdx, rIdx: r._rIdx, dbId: r.dbId });
    setEditData({
      company: r._doc?.data?.info['Company'],
      contactPerson: r._doc?.data?.info['Contact Person'],
      auctionId: r._doc?.data?.info['Auction ID'],
      auctionRefNo: r._doc?.data?.info['Auction Ref No'],
      auctionStart: r._doc?.data?.info['Auction Start'],
      auctionEnd: r._doc?.data?.info['Auction End'],
      mailDate: r._doc?.data?.info['Mail Date'],
      buyerRefNo: r._doc?.data?.info['Buyer Ref No'],
      subsidiary: r.subsidiary,
      source: r.source,
      bidId: r.bidId,
      mode: r.mode,
      repGrade: r.repGrade,
      size: r.size,
      offerQty: r.offerQty,
      repNotifiedPrice: r.repNotifiedPrice,
      colliery: r.colliery,
      grade: r.collieryGrade || r.grade,
      allocatedQty: r.allocatedQty,
      bidPrice: r.bidPrice,
      collNotified: r.collieryNotified || r.collNotified,
      finalBid: r.finalBid,
      supplyRange: r.supplyRange,
      premium: r.premium,
      seniority: r.seniority,
      thirdParty: r.thirdParty,
      value: r.value
    });
    setIsModalOpen(true);
  };

  const saveFile = (name, text, type) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; 
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const handleCsvExport = (exportDocs) => {
    exportDocs.forEach(doc => {
      const DATA = doc.data;
      const q = v => '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"';
      const L = [['Field', 'Value']]; 
      Object.entries(DATA.info).forEach(kv => L.push(kv));
      L.push([], ['Subsidiary', 'Source', 'Bid ID', 'Mode', 'Rep Grade', 'Size', 'Offer Qty', 'Rep Notified Price', 'Colliery', 'Grade', 'Allocated MT', 'Bid Price', 'Colliery Notified', 'Final Bid Price', 'Supply Range', 'Premium %', 'Seniority', 'Third Party', 'Value Rs']);
      DATA.rows.forEach(r => L.push([r.subsidiary, r.source, r.bidId, r.mode, r.repGrade, r.size, r.offerQty, r.repNotifiedPrice, r.colliery, r.collieryGrade, r.allocatedQty, r.bidPrice, r.collieryNotified, r.finalBid, r.supplyRange, r.premium, r.seniority, r.thirdParty, r.value]));
      
      const csvContent = '\ufeff' + L.map(r => r.map(q).join(',')).join('\n');
      const baseName = 'final_allocation_' + String((DATA.info['Buyer Ref No'] || 'letter')).replace(/[^\w.-]+/g, '_');
      saveFile(baseName + '.csv', csvContent, 'text/csv');
    });
  };

  const handleJsonExport = (exportDocs) => {
    exportDocs.forEach(doc => {
      const baseName = 'final_allocation_' + String((doc.data.info['Buyer Ref No'] || 'letter')).replace(/[^\w.-]+/g, '_');
      saveFile(baseName + '.json', JSON.stringify(doc.data, null, 2), 'application/json');
    });
  };

  const inr = (n, d = 2) => n === null || n === undefined ? '-' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div>
      {view === "drop" && (
        <>
          <Dropzone
            onFiles={handleFiles}
            loading={loading}
            loadingName={loadingName || statusMsg}
            error={error}
            title="Upload CL Final Allocation Letter PDF"
            icon="📄"
          />
          {statusMsg && (
            <div style={{ textAlign: 'center', color: 'var(--primary)', marginTop: 10, fontSize: 13 }}>
              {statusMsg}
            </div>
          )}
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <span style={{ color: "var(--muted)", marginRight: 15, fontSize: "14px" }}>Or enter data manually</span>
            <button className="btn outline" onClick={() => setIsModalOpen(true)}>+ Add Form</button>
          </div>
          <div className="summary-section" style={{ marginTop: 40, opacity: 0.6, pointerEvents: "none" }}>
            <div className="summary-header">
              <div className="summary-title">Data Preview (Upload PDF to populate)</div>
            </div>
            <div className="summary-table-wrap">
              <table className="stable">
                <thead>
                  <tr>
                    <th>Buyer Ref No</th>
                    <th>Total Allocated (MT)</th>
                    <th>Bid Price (Rs/MT)</th>
                    <th>Premium (%)</th>
                    <th>Coal Value (Rs)</th>
                    <th>Payment Last Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                      Upload a PDF to view extracted data
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {view === "results" && (
        <div className="results-container slide-up">
          <div className="results-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', borderBottom: "1px solid var(--line)", paddingBottom: "16px", marginBottom: "24px" }}>
            <div style={{ display: "flex", marginBottom: "-17px" }}>
              <button 
                onClick={() => setActiveTab("pending")}
                style={{
                  background: "none", border: "none", padding: "10px 20px", fontSize: "14px", fontWeight: "600",
                  color: activeTab === "pending" ? "var(--primary, #dc2626)" : "var(--muted)",
                  borderBottom: activeTab === "pending" ? "2px solid var(--primary, #dc2626)" : "2px solid transparent",
                  cursor: "pointer", transition: "all 0.2s"
                }}
              >
                Pending
              </button>
              <button 
                onClick={() => setActiveTab("history")}
                style={{
                  background: "none", border: "none", padding: "10px 20px", fontSize: "14px", fontWeight: "600",
                  color: activeTab === "history" ? "var(--primary, #dc2626)" : "var(--muted)",
                  borderBottom: activeTab === "history" ? "2px solid var(--primary, #dc2626)" : "2px solid transparent",
                  cursor: "pointer", transition: "all 0.2s"
                }}
              >
                History
              </button>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {/* SEARCH BAR */}
              <div style={{ position: "relative" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}>
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ padding: "6px 12px 6px 30px", border: "1px solid var(--line)", borderRadius: "6px", fontSize: "13px", width: "220px", outline: "none", color: "var(--text)", background: "var(--surface)" }}
                />
              </div>
            </div>
            <div className="results-actions" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button className="btn ghost" onClick={handleExportExcel} style={{ borderColor: "#107c41", color: "#107c41", display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(16, 124, 65, 0.04)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="8" y1="13" x2="16" y2="13"></line>
                  <line x1="8" y1="17" x2="16" y2="17"></line>
                </svg>
                EXCEL
              </button>
              <button className="btn ghost" onClick={handleExportPdf} style={{ borderColor: "#d6251b", color: "#d6251b", display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(214, 37, 27, 0.04)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <path d="M9 15h1a2 2 0 0 0 0-4H9v4Z"></path>
                </svg>
                PDF
              </button>              <button 
                className="btn ghost" 
                onClick={handleSave} 
                style={{ 
                  borderColor: "var(--primary)", 
                  color: "var(--primary)", 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: "6px",
                  background: "rgba(0, 0, 0, 0.04)"
                }}
              >
                💾 SAVE
              </button>
              
              <input 
                type="file" 
                multiple 
                ref={fileInputRef} 
                accept=".pdf" 
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files.length) handleFiles(Array.from(e.target.files));
                }} 
              />
              <button className="btn outline" onClick={() => {
                setEditRowInfo(null);
                setEditData(null);
                setIsModalOpen(true);
              }}>
                + Add Form
              </button>
              <button className="btn outline" onClick={() => fileInputRef.current?.click()}>
                Add More Files
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginTop: '32px' }}>
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: '8px' }}>Total Allocated (MT)</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>{(() => {
                const allRows = docs.flatMap((d, dIdx) => (d.data.rows || []).map((r, rIdx) => ({ ...r, _doc: d, _dIdx: dIdx, _rIdx: rIdx })));
                const filteredRows = allRows.filter(r => {
                  const statusMatch = activeTab === "pending" ? r.status !== 'done' : r.status === 'done';
                  if (!statusMatch) return false;
                  if (!searchTerm) return true;
                  const lower = searchTerm.toLowerCase();
                  const values = [...Object.values(r), ...(Object.values(r._doc.data.info || {}))];
                  return values.some(v => String(v || "").toLowerCase().includes(lower));
                });
                return inr(filteredRows.reduce((sum, r) => sum + (Number(r.allocatedQty) || 0), 0));
              })()}</div>
            </div>
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: '8px' }}>Total Value ₹</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ember)' }}>{(() => {
                const allRows = docs.flatMap((d, dIdx) => (d.data.rows || []).map((r, rIdx) => ({ ...r, _doc: d, _dIdx: dIdx, _rIdx: rIdx })));
                const filteredRows = allRows.filter(r => {
                  const statusMatch = activeTab === "pending" ? r.status !== 'done' : r.status === 'done';
                  if (!statusMatch) return false;
                  if (!searchTerm) return true;
                  const lower = searchTerm.toLowerCase();
                  const values = [...Object.values(r), ...(Object.values(r._doc.data.info || {}))];
                  return values.some(v => String(v || "").toLowerCase().includes(lower));
                });
                return inr(filteredRows.reduce((sum, r) => sum + (Number(r.value) || 0), 0));
              })()}</div>
            </div>
          </div>

          <div className="results-content" style={{ marginTop: 32 }}>
            <h3 style={{ fontSize: 18, marginBottom: 16, color: "var(--text)" }}>Extracted Items</h3>
            
            {(() => {
               const allWarns = docs.flatMap(d => (d.data.warns || []));
               if (allWarns.length > 0) {
                 return (
                  <div style={{ background: "#fff4e5", border: "1px solid #ffcc80", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 13, color: "#e65100" }}>
                    <div>⚠ This data has been extracted via OCR/PDF. Please verify the amounts and quantity values against the original PDF.</div>
                    {allWarns.map((w, i) => <div key={i}>⚠ {w}</div>)}
                  </div>
                 );
               }
               return (
                  <div style={{ background: "#fff4e5", border: "1px solid #ffcc80", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 13, color: "#e65100" }}>
                    <div>⚠ This data has been extracted via OCR/PDF. Please verify the amounts and quantity values against the original PDF.</div>
                  </div>
               );
            })()}

            <div style={{ padding: 24, background: "white", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                <div className="summary-table-wrap" style={{ border: "1px solid #e5e7eb" }}>
                  <table className="stable">
                    <thead style={{ background: "#f9fafb" }}>
                      <tr>
                        <th>#</th><th>Company</th><th>Contact Person</th><th>Auction ID</th><th>Auction Ref No</th><th>Auction Start</th><th>Auction End</th><th>Mail Date</th><th>Buyer Ref No</th>
                        <th>Subsidiary</th><th>Source</th><th>Bid ID</th><th>Mode</th><th>Rep. Grade</th><th>Size</th>
                        <th>Offer Qty</th><th>Rep. Notified</th><th>Colliery</th><th>Grade</th><th>Allocated</th>
                        <th>Bid ₹/MT</th><th>Coll. Notified</th><th>Final Bid</th><th>Supply Range</th><th>Premium %</th>
                        <th>Seniority</th><th>Third Party</th><th>Value ₹</th><th>Status</th><th>Preview</th><th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const allRows = docs.flatMap((d, dIdx) => (d.data.rows || []).map((r, rIdx) => ({ ...r, _doc: d, _dIdx: dIdx, _rIdx: rIdx })));
                        const filteredRows = allRows.filter(r => {
                        const statusMatch = activeTab === "pending" ? r.status !== 'done' : r.status === 'done';
                        if (!statusMatch) return false;
                          if (!searchTerm) return true;
                          const lower = searchTerm.toLowerCase();
                          const values = [...Object.values(r), ...(Object.values(r._doc.data.info || {}))];
                          return values.some(v => String(v || "").toLowerCase().includes(lower));
                        });

                        if (filteredRows.length === 0) {
                          return <tr><td colSpan="30" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>No matching records found.</td></tr>;
                        }

                        return filteredRows.map((r, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td>{r._doc.data.info['Company'] || '-'}</td>
                            <td>{r._doc.data.info['Contact Person'] || '-'}</td>
                            <td>{r._doc.data.info['Auction ID'] || '-'}</td>
                            <td>{r._doc.data.info['Auction Ref No'] || '-'}</td>
                            <td>{r._doc.data.info['Auction Start'] || '-'}</td>
                            <td>{r._doc.data.info['Auction End'] || '-'}</td>
                            <td>{r._doc.data.info['Mail Date'] || '-'}</td>
                            <td>{r._doc.data.info['Buyer Ref No'] || '-'}</td>
                            <td>{r.subsidiary}</td>
                            <td>{r.source}</td>
                            <td>{r.bidId}</td>
                            <td>{r.mode}</td>
                            <td>{r.repGrade}</td>
                            <td>{r.size}</td>
                            <td>{inr(r.offerQty)}</td>
                            <td>{inr(r.repNotifiedPrice)}</td>
                            <td>{r.colliery}</td>
                            <td>{r.collieryGrade}</td>
                            <td style={{ color: "var(--ember)", fontWeight: 500 }}>{inr(r.allocatedQty)}</td>
                            <td style={{ color: "var(--ember)", fontWeight: 500 }}>{inr(r.bidPrice, 0)}</td>
                            <td>{inr(r.collieryNotified)}</td>
                            <td>{inr(r.finalBid, 0)}</td>
                            <td>{r.supplyRange || '-'}</td>
                            <td>{inr(r.premium)}</td>
                            <td>{r.seniority}</td>
                            <td>{r.thirdParty}</td>
                            <td>{inr(r.value)}</td>
                            <td>
                            <span style={{ 
                              padding: "4px 12px", 
                              borderRadius: "16px", 
                              fontSize: "12px", 
                              fontWeight: "600", 
                              display: "inline-block",
                              backgroundColor: r.status === "done" ? "#d1fae5" : "#fef3c7",
                              color: r.status === "done" ? "#065f46" : "#92400e"
                            }}>
                              {r.status === "done" ? "Done" : "Pending"}
                            </span>
                          </td>
                          <td>
                              {r._doc.pdfUrl ? (
                                <a href={r._doc.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 500, fontSize: "12px" }}>
                                  View PDF
                               </a>
                              ) : (
                                <span style={{ color: "var(--muted)" }}>-</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                onClick={() => handleMarkDone(r._dIdx, r._rIdx, r.dbId, r.status)} 
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: '1px solid #86efac', color: '#16a34a', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
                              >
                                <CheckCircle size={14} /> {r.status === 'done' ? 'Undo' : 'Done'}
                              </button>
                              <button 
                                  onClick={() => openEditModal(r)} 
                                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: '1px solid #93c5fd', color: '#dc2626', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
                                >
                                  <Edit size={14} /> Edit
                                </button>
                                <button 
                                  onClick={() => handleDeleteRow(r._dIdx, r._rIdx, r.dbId)} 
                                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: '1px solid #fca5a5', color: '#dc2626', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
                                >
                                  <Trash size={14} /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
            </div>
          </div>
        </div>
      )}

      <EditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleModalSave}
        title={editRowInfo ? "Edit Row" : "Add Manual Entry"}
        initialData={editData || {}}
        columns={[
          { key: "company", label: "Company", type: "text" },
          { key: "contactPerson", label: "Contact Person", type: "text" },
          { key: "auctionId", label: "Auction ID", type: "text" },
          { key: "auctionRefNo", label: "Auction Ref No", type: "text" },
          { key: "auctionStart", label: "Auction Start", type: "text" },
          { key: "auctionEnd", label: "Auction End", type: "text" },
          { key: "mailDate", label: "Mail Date", type: "text" },
          { key: "buyerRefNo", label: "Buyer Ref No", type: "text" },
          { key: "subsidiary", label: "Subsidiary", type: "text" },
          { key: "source", label: "Source", type: "text" },
          { key: "bidId", label: "Bid ID", type: "text" },
          { key: "mode", label: "Mode", type: "text" },
          { key: "repGrade", label: "Rep. Grade", type: "text" },
          { key: "size", label: "Size", type: "text" },
          { key: "offerQty", label: "Offer Qty", type: "text" },
          { key: "repNotifiedPrice", label: "Rep. Notified Price", type: "text" },
          { key: "colliery", label: "Colliery", type: "text" },
          { key: "grade", label: "Grade", type: "text" },
          { key: "allocatedQty", label: "Allocated (MT)", type: "text" },
          { key: "bidPrice", label: "Bid ₹/MT", type: "text" },
          { key: "collNotified", label: "Coll. Notified", type: "text" },
          { key: "finalBid", label: "Final Bid", type: "text" },
          { key: "supplyRange", label: "Supply Range", type: "text" },
          { key: "premium", label: "Premium %", type: "text" },
          { key: "seniority", label: "Seniority", type: "text" },
          { key: "thirdParty", label: "Third Party", type: "text" },
          { key: "value", label: "Value ₹", type: "text" }
        ]}
      />
    </div>
  );
}
