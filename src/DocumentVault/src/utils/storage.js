// ── IndexedDB + localStorage storage layer ──
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const b2d = (b) => new Promise((ok, no) => { const f = new FileReader(); f.onload = () => ok(f.result); f.onerror = () => no(f.error); f.readAsDataURL(b); });
const d2b = (u) => { const [h, b] = u.split(","); const m = (h.match(/:(.*?)[;,]/) || [0, ""])[1]; const s = atob(b); const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return new Blob([a], { type: m }); };
const pf = async (f) => f ? { type: f.type, data: await b2d(f) } : null;
const uf = (f) => f ? d2b(f.data) : null;

const pack = async (d) => ({
  ...d,
  file: await pf(d.file),
  history: await Promise.all((d.history || []).map(async (h) => ({ ...h, file: await pf(h.file) })))
});
const unpack = (d) => ({
  ...d,
  file: uf(d.file),
  history: (d.history || []).map((h) => ({ ...h, file: uf(h.file) }))
});

let db = null;
let mode = "idb";
let persistTimer = null;

const req = (r) => new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
const idbStore = (n, m) => db.transaction(n, m).objectStore(n);
const getAll = (n) => req(idbStore(n, "readonly").getAll());

const put = async (n, v, allClients, allDocs) => {
  if (mode === "idb") return req(idbStore(n, "readwrite").put(v));
  persistLS(allClients, allDocs);
};
const del = async (n, k, allClients, allDocs) => {
  if (mode === "idb") return req(idbStore(n, "readwrite").delete(k));
  persistLS(allClients, allDocs);
};

function persistLS(clients, docs) {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(async () => {
    try {
      localStorage.setItem("cdm_clients", JSON.stringify(clients));
      localStorage.setItem("cdm_docs", JSON.stringify(await Promise.all(docs.map(pack))));
    } catch {
      // Storage full — handled upstream
    }
  }, 0);
}

async function initStorage() {
  try {
    db = await Promise.race([
      new Promise((ok, no) => {
        const r = indexedDB.open("clientDocManager", 1);
        r.onupgradeneeded = () => { r.result.createObjectStore("clients", { keyPath: "id" }); r.result.createObjectStore("docs", { keyPath: "id" }); };
        r.onsuccess = () => ok(r.result);
        r.onerror = () => no(r.error);
      }),
      new Promise((_, no) => setTimeout(() => no(new Error("timeout")), 2500))
    ]);
    mode = "idb";
    const clients = await getAll("clients");
    const docs = await getAll("docs");
    return { clients, docs, mode, warning: null };
  } catch {
    try {
      localStorage.setItem("cdm_t", "1");
      localStorage.removeItem("cdm_t");
      mode = "ls";
      const clients = JSON.parse(localStorage.getItem("cdm_clients") || "[]");
      const docs = JSON.parse(localStorage.getItem("cdm_docs") || "[]").map(unpack);
      return { clients, docs, mode, warning: "Your browser is saving in basic storage (about 5 MB in total). For many or large files, open this in Chrome or Edge on a computer. Download a Backup regularly." };
    } catch {
      mode = "mem";
      return { clients: [], docs: [], mode, warning: "Your browser is blocking storage for this page, so nothing you add will be kept after you close it. Open this file directly in Chrome or Edge, and download a Backup before closing." };
    }
  }
}

async function createBackup(clients, docs) {
  const data = JSON.stringify({ v: 1, clients, docs: await Promise.all(docs.map(pack)) });
  const blob = new Blob([data], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "document-vault-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
}

async function restoreBackup(file) {
  const j = JSON.parse(await file.text());
  const clients = j.clients || [];
  const docs = (j.docs || []).map(unpack);
  return { clients, docs };
}

export { uid, put, del, initStorage, createBackup, restoreBackup, pack, unpack, mode };
