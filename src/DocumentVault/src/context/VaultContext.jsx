import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from "react";
import { initStorage, put, del, uid, createBackup, restoreBackup } from "../utils/storage";

const VaultCtx = createContext(null);
export const useVault = () => useContext(VaultCtx);

function reducer(state, action) {
  switch (action.type) {
    case "INIT":
      return { ...state, clients: action.clients, docs: action.docs, loaded: true };
    case "SET_SEL":
      return { ...state, sel: action.id, view: "client", filt: "All" };
    case "SET_SEL_COMPANY":
      return { ...state, selCompany: action.id };
    case "SET_VIEW":
      return { ...state, view: action.view };
    case "SET_FILT":
      return { ...state, filt: action.filt };
    case "SET_SEARCH":
      return { ...state, q: action.q };
    case "SET_CTF":
      return { ...state, ctf: action.ctf };
    case "UPSERT_CLIENT": {
      const i = state.clients.findIndex((x) => x.id === action.client.id);
      const clients = [...state.clients];
      if (i > -1) clients[i] = action.client; else clients.push(action.client);
      const isFirm = action.client.ctype === "Firm" || action.client.ctype === "Company" || action.client.ctype === "Plant";
      return { 
        ...state, 
        clients, 
        sel: isFirm ? state.sel : action.client.id,
        selCompany: isFirm ? action.client.id : state.selCompany 
      };
    }
    case "DEL_CLIENT": {
      return { 
        ...state, 
        clients: state.clients.filter((x) => x.id !== action.id), 
        docs: state.docs.filter((d) => d.cid !== action.id), 
        sel: state.sel === action.id ? null : state.sel,
        selCompany: state.selCompany === action.id ? null : state.selCompany
      };
    }
    case "UPSERT_DOC": {
      const i = state.docs.findIndex((x) => x.id === action.doc.id);
      const docs = [...state.docs];
      if (i > -1) docs[i] = action.doc; else docs.push(action.doc);
      return { ...state, docs };
    }
    case "DEL_DOC": {
      return { ...state, docs: state.docs.filter((x) => x.id !== action.id) };
    }
    case "RESTORE": {
      // merge restored data
      const cm = new Map(state.clients.map((c) => [c.id, c]));
      action.clients.forEach((c) => cm.set(c.id, c));
      const dm = new Map(state.docs.map((d) => [d.id, d]));
      action.docs.forEach((d) => dm.set(d.id, d));
      return { ...state, clients: [...cm.values()], docs: [...dm.values()] };
    }
    default:
      return state;
  }
}

const initial = { clients: [], docs: [], sel: null, selCompany: null, view: "client", filt: "All", q: "", ctf: "All", loaded: false };

export function VaultProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const [warning, setWarning] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    initStorage().then(({ clients, docs, warning: w }) => {
      dispatch({ type: "INIT", clients, docs });
      if (w) setWarning(w);
      if (clients.length) {
        const indClients = clients.filter((c) => !c.ctype || c.ctype === "Individual").sort((a, b) => a.name.localeCompare(b.name));
        const firmClients = clients.filter((c) => c.ctype === "Firm" || c.ctype === "Company" || c.ctype === "Plant").sort((a, b) => a.name.localeCompare(b.name));
        if (indClients.length) {
          dispatch({ type: "SET_SEL", id: indClients[0].id });
        }
        if (firmClients.length) {
          dispatch({ type: "SET_SEL_COMPANY", id: firmClients[0].id });
        }
      }
    });
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }, []);

  const saveClient = useCallback(async (c) => {
    const client = { ...c, id: c.id || uid() };
    try { await put("clients", client, state.clients, state.docs); } catch { showToast("Could not save. Browser storage may be blocked."); return null; }
    dispatch({ type: "UPSERT_CLIENT", client });
    showToast("Client saved");
    return client;
  }, [state.clients, state.docs, showToast]);

  const deleteClient = useCallback(async (id) => {
    const clientDocs = state.docs.filter((d) => d.cid === id);
    for (const d of clientDocs) await del("docs", d.id, state.clients, state.docs);
    await del("clients", id, state.clients, state.docs);
    dispatch({ type: "DEL_CLIENT", id });
    showToast("Client deleted");
  }, [state.clients, state.docs, showToast]);

  const saveDoc = useCallback(async (d) => {
    const doc = { ...d, id: d.id || uid() };
    try { await put("docs", doc, state.clients, state.docs); } catch { showToast("Could not save. Browser storage may be full."); return null; }
    dispatch({ type: "UPSERT_DOC", doc });
    showToast("Document saved");
    return doc;
  }, [state.clients, state.docs, showToast]);

  const deleteDoc = useCallback(async (id) => {
    await del("docs", id, state.clients, state.docs);
    dispatch({ type: "DEL_DOC", id });
    showToast("Document deleted");
  }, [state.clients, state.docs, showToast]);

  const backup = useCallback(async () => {
    try { await createBackup(state.clients, state.docs); showToast("Backup downloaded"); } catch { showToast("Backup failed"); }
  }, [state.clients, state.docs, showToast]);

  const restore = useCallback(async (file) => {
    try {
      const { clients, docs } = await restoreBackup(file);
      for (const c of clients) await put("clients", c, state.clients, state.docs);
      for (const d of docs) await put("docs", d, state.clients, state.docs);
      dispatch({ type: "RESTORE", clients, docs });
      showToast("Backup restored");
    } catch { showToast("That file is not a valid backup."); }
  }, [state.clients, state.docs, showToast]);

  return (
    <VaultCtx.Provider value={{ ...state, dispatch, warning, toast, showToast, saveClient, deleteClient, saveDoc, deleteDoc, backup, restore }}>
      {children}
    </VaultCtx.Provider>
  );
}
