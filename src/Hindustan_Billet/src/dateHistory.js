// Helper for normalising and storing/retrieving history by date
export function normalizeDate(str) {
  if (!str) return '';
  // Remove spaces around slashes, dots, and hyphens: "13 / 10 / 2026" -> "13/10/2026"
  const cleaned = String(str).trim().replace(/\s*([\/\.-])\s*/g, '$1');
  // Match formats like 21/10/2026, 21.10.2026, 21-10-2026
  const dmy = cleaned.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (dmy) {
    const d = dmy[1].padStart(2, '0');
    const m = dmy[2].padStart(2, '0');
    const y = dmy[3];
    return `${y}-${m}-${d}`;
  }
  const ymd = cleaned.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})$/);
  if (ymd) {
    const y = ymd[1];
    const m = ymd[2].padStart(2, '0');
    const d = ymd[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return cleaned;
}

export function formatDisplayDate(isoDateStr) {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(m, 10) - 1] || m;
    return `${parseInt(d, 10)} ${monthName} ${y}`;
  }
  return isoDateStr;
}

export function getTodayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function offsetDate(isoStr, days) {
  if (!isoStr || !isoStr.includes('-')) return getTodayIso();
  const [y, m, d] = isoStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const ny = dt.getFullYear();
  const nm = String(dt.getMonth() + 1).padStart(2, '0');
  const nd = String(dt.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

// Clean heavy non-tabular data (like massive base64 images) before persisting to localStorage
function cleanForStorage(data) {
  if (!data || typeof data !== 'object') return data;
  try {
    const copy = JSON.parse(JSON.stringify(data));
    // If imageUrl is large base64 (> 100KB), remove or omit from persistent history to save storage
    if (copy.imageUrl && typeof copy.imageUrl === 'string' && copy.imageUrl.length > 50000) {
      delete copy.imageUrl;
    }
    return copy;
  } catch (e) {
    return data;
  }
}

// History storage helpers
export function getHistory(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveToHistory(storageKey, dateKey, data) {
  if (!dateKey || !data) return;
  try {
    const hist = getHistory(storageKey);
    hist[dateKey] = cleanForStorage(data);
    localStorage.setItem(storageKey, JSON.stringify(hist));
  } catch (err) {
    console.warn(`[dateHistory] Storage quota hit for ${storageKey}, attempting auto-cleanup of heavy payloads...`, err);
    try {
      // Step 1: Strip heavy imageUrl from all previous records in this history
      const hist = getHistory(storageKey);
      for (const k of Object.keys(hist)) {
        if (hist[k] && hist[k].imageUrl) {
          delete hist[k].imageUrl;
        }
      }
      hist[dateKey] = cleanForStorage(data);
      localStorage.setItem(storageKey, JSON.stringify(hist));
    } catch (err2) {
      console.warn(`[dateHistory] Second cleanup attempt failed for ${storageKey}:`, err2);
      try {
        // Step 2: Strip heavy images across both billetHistory and consumptionHistory
        ['billetHistory', 'consumptionHistory'].forEach(key => {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              Object.keys(parsed).forEach(pk => {
                if (parsed[pk] && parsed[pk].imageUrl) delete parsed[pk].imageUrl;
              });
              localStorage.setItem(key, JSON.stringify(parsed));
            } catch (e) {}
          }
        });
        const hist = getHistory(storageKey);
        hist[dateKey] = cleanForStorage(data);
        localStorage.setItem(storageKey, JSON.stringify(hist));
      } catch (err3) {
        console.error(`[dateHistory] Failed to save history even after cleanup:`, err3);
      }
    }
  }
}

export function getFromHistory(storageKey, dateKey) {
  const hist = getHistory(storageKey);
  if (hist[dateKey]) return hist[dateKey];
  return null;
}
