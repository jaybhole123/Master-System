import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from "react";
import { initStorage, put, del, uid, createBackup, restoreBackup } from "../utils/storage";
import {
  fetchIndividualsFromSupabase,
  fetchDocumentsFromSupabase,
  upsertIndividualInSupabase,
  deleteIndividualFromSupabase,
  upsertDocumentInSupabase,
  deleteDocumentFromSupabase,
  fetchCompaniesFromSupabase,
  fetchCompanyDocumentsFromSupabase,
  upsertCompanyInSupabase,
  deleteCompanyFromSupabase,
  upsertCompanyDocumentInSupabase,
  deleteCompanyDocumentFromSupabase
} from "../utils/supabaseVaultService";

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

  const loadData = useCallback(async () => {
    let loadedClients = [];
    let loadedDocs = [];
    let isSupabaseLoaded = false;

    try {
      const [supaInds, supaIndDocs, supaComps, supaCompDocs] = await Promise.all([
        fetchIndividualsFromSupabase(),
        fetchDocumentsFromSupabase(),
        fetchCompaniesFromSupabase(),
        fetchCompanyDocumentsFromSupabase()
      ]);

      loadedClients = [...(supaInds || []), ...(supaComps || [])];
      loadedDocs = [...(supaIndDocs || []), ...(supaCompDocs || [])];
      isSupabaseLoaded = true;
    } catch (err) {
      console.warn("Supabase fetch fallback to local storage:", err.message);
    }

    if (!isSupabaseLoaded) {
      const local = await initStorage();
      loadedClients = local.clients || [];
      loadedDocs = local.docs || [];
      if (local.warning) setWarning(local.warning);
    }

    dispatch({ type: "INIT", clients: loadedClients, docs: loadedDocs });

    if (loadedClients.length) {
      const indClients = loadedClients
        .filter((c) => !c.ctype || c.ctype === "Individual")
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      const firmClients = loadedClients
        .filter((c) => c.ctype === "Firm" || c.ctype === "Company" || c.ctype === "Plant")
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

      if (indClients.length) {
        dispatch({ type: "SET_SEL", id: indClients[0].id });
      }
      if (firmClients.length) {
        dispatch({ type: "SET_SEL_COMPANY", id: firmClients[0].id });
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }, []);

  const saveClient = useCallback(async (c) => {
    const isCompany = c.ctype === "Firm" || c.ctype === "Company" || c.ctype === "Plant";
    try {
      const saved = isCompany 
        ? await upsertCompanyInSupabase(c)
        : await upsertIndividualInSupabase(c);

      dispatch({ type: "UPSERT_CLIENT", client: saved });
      showToast(`${isCompany ? "Firm / Company" : "Individual"} saved to Supabase`);
      return saved;
    } catch (err) {
      console.warn("Supabase save failed, saving locally:", err.message);
      const fallbackClient = { ...c, id: c.id || uid() };
      await put("clients", fallbackClient, state.clients, state.docs);
      dispatch({ type: "UPSERT_CLIENT", client: fallbackClient });
      showToast("Saved locally (offline mode)");
      return fallbackClient;
    }
  }, [state.clients, state.docs, showToast]);

  const deleteClient = useCallback(async (id) => {
    const target = state.clients.find((x) => x.id === id);
    const isCompany = target && (target.ctype === "Firm" || target.ctype === "Company" || target.ctype === "Plant");
    try {
      if (isCompany) {
        await deleteCompanyFromSupabase(id);
      } else {
        await deleteIndividualFromSupabase(id);
      }
      dispatch({ type: "DEL_CLIENT", id });
      showToast(`${isCompany ? "Company" : "Individual"} deleted from Supabase`);
    } catch (err) {
      console.warn("Supabase delete failed, deleting locally:", err.message);
      const clientDocs = state.docs.filter((d) => d.cid === id);
      for (const d of clientDocs) await del("docs", d.id, state.clients, state.docs);
      await del("clients", id, state.clients, state.docs);
      dispatch({ type: "DEL_CLIENT", id });
      showToast("Deleted locally");
    }
  }, [state.clients, state.docs, showToast]);

  const saveDoc = useCallback(async (d) => {
    const ownerClient = state.clients.find((x) => x.id === d.cid);
    const isCompanyDoc = d.category === "Company" || (ownerClient && (ownerClient.ctype === "Firm" || ownerClient.ctype === "Company" || ownerClient.ctype === "Plant"));

    try {
      const saved = isCompanyDoc
        ? await upsertCompanyDocumentInSupabase(d)
        : await upsertDocumentInSupabase(d);

      dispatch({ type: "UPSERT_DOC", doc: saved });
      showToast("Document saved to Supabase");
      return saved;
    } catch (err) {
      console.warn("Supabase doc save failed, saving locally:", err.message);
      const fallbackDoc = { ...d, id: d.id || uid() };
      await put("docs", fallbackDoc, state.clients, state.docs);
      dispatch({ type: "UPSERT_DOC", doc: fallbackDoc });
      showToast("Document saved locally");
      return fallbackDoc;
    }
  }, [state.clients, state.docs, showToast]);

  const deleteDoc = useCallback(async (id) => {
    const targetDoc = state.docs.find((x) => x.id === id);
    const ownerClient = targetDoc ? state.clients.find((x) => x.id === targetDoc.cid) : null;
    const isCompanyDoc = targetDoc?.category === "Company" || (ownerClient && (ownerClient.ctype === "Firm" || ownerClient.ctype === "Company" || ownerClient.ctype === "Plant"));

    try {
      if (isCompanyDoc) {
        await deleteCompanyDocumentFromSupabase(id);
      } else {
        await deleteDocumentFromSupabase(id);
      }
      dispatch({ type: "DEL_DOC", id });
      showToast("Document deleted from Supabase");
    } catch (err) {
      console.warn("Supabase doc delete failed, deleting locally:", err.message);
      await del("docs", id, state.clients, state.docs);
      dispatch({ type: "DEL_DOC", id });
      showToast("Document deleted locally");
    }
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
