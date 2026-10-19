import supabase from "../../../SupabaseClient";
import { COMPANY_CHECKLIST_SECTIONS } from "./constants";

const BUCKET_NAME = "vault-documents";

// Helper to determine checklist section code (A, B, C, D, E) from document type
export function getSectionCodeForType(docType) {
  for (const sec of COMPANY_CHECKLIST_SECTIONS) {
    if (sec.items.includes(docType)) return sec.code;
  }
  return "E";
}

// ──────────────────────────────────────────
// INDIVIDUALS & PERSONAL DOCUMENTS
// ──────────────────────────────────────────

export async function fetchIndividualsFromSupabase() {
  const { data, error } = await supabase
    .from("vault_individuals")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchDocumentsFromSupabase() {
  const { data, error } = await supabase
    .from("vault_documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function upsertIndividualInSupabase(individual) {
  const payload = {
    name: individual.name,
    phone: individual.phone || null,
    email: individual.email || null,
    addr: individual.addr || null,
    ctype: individual.ctype || "Individual",
    fields: individual.fields || {},
    updated_at: new Date().toISOString()
  };

  if (individual.id) {
    payload.id = individual.id;
  }

  const { data, error } = await supabase
    .from("vault_individuals")
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteIndividualFromSupabase(id) {
  const { error } = await supabase
    .from("vault_individuals")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}

export async function upsertDocumentInSupabase(doc) {
  let fileUrl = doc.file_url || null;

  if (doc.file instanceof File || doc.file instanceof Blob) {
    try {
      const uploadRes = await uploadDocFileToSupabase(doc.file, `individuals/${doc.cid}`);
      if (uploadRes.publicUrl) {
        fileUrl = uploadRes.publicUrl;
      }
    } catch (e) {
      console.warn("Storage upload skipped or failed:", e);
    }
  }

  const payload = {
    cid: doc.cid,
    type: doc.type,
    num: doc.num || null,
    category: doc.category || "Personal",
    issue: doc.issue ? doc.issue : null,
    expiry: doc.expiry ? doc.expiry : null,
    note: doc.note || null,
    file_url: fileUrl,
    fname: doc.fname || (doc.file?.name) || null,
    fields: doc.fields || {},
    history: doc.history || [],
    updated_at: new Date().toISOString()
  };

  if (doc.id) {
    payload.id = doc.id;
  }

  const { data, error } = await supabase
    .from("vault_documents")
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    file: doc.file || null
  };
}

export async function deleteDocumentFromSupabase(id) {
  const { error } = await supabase
    .from("vault_documents")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}

// ──────────────────────────────────────────
// FIRMS, COMPANIES & CORPORATE DOCUMENTS
// ──────────────────────────────────────────

export async function fetchCompaniesFromSupabase() {
  const { data, error } = await supabase
    .from("vault_companies")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchCompanyDocumentsFromSupabase() {
  const { data, error } = await supabase
    .from("vault_company_documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function upsertCompanyInSupabase(company) {
  const payload = {
    name: company.name,
    ctype: company.ctype || "Company",
    phone: company.phone || null,
    email: company.email || null,
    addr: company.addr || null,
    fields: company.fields || {},
    updated_at: new Date().toISOString()
  };

  if (company.id) {
    payload.id = company.id;
  }

  const { data, error } = await supabase
    .from("vault_companies")
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCompanyFromSupabase(id) {
  const { error } = await supabase
    .from("vault_companies")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}

export async function upsertCompanyDocumentInSupabase(doc) {
  let fileUrl = doc.file_url || null;

  if (doc.file instanceof File || doc.file instanceof Blob) {
    try {
      const uploadRes = await uploadDocFileToSupabase(doc.file, `companies/${doc.cid}`);
      if (uploadRes.publicUrl) {
        fileUrl = uploadRes.publicUrl;
      }
    } catch (e) {
      console.warn("Storage upload skipped or failed:", e);
    }
  }

  const secCode = doc.section_code || getSectionCodeForType(doc.type);

  const payload = {
    cid: doc.cid,
    section_code: secCode,
    type: doc.type,
    num: doc.num || null,
    category: "Company",
    issue: doc.issue ? doc.issue : null,
    expiry: doc.expiry ? doc.expiry : null,
    note: doc.note || null,
    file_url: fileUrl,
    fname: doc.fname || (doc.file?.name) || null,
    fields: doc.fields || {},
    history: doc.history || [],
    updated_at: new Date().toISOString()
  };

  if (doc.id) {
    payload.id = doc.id;
  }

  const { data, error } = await supabase
    .from("vault_company_documents")
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    file: doc.file || null
  };
}

export async function deleteCompanyDocumentFromSupabase(id) {
  const { error } = await supabase
    .from("vault_company_documents")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}

// ──────────────────────────────────────────
// STORAGE FILE UPLOAD
// ──────────────────────────────────────────

export async function uploadDocFileToSupabase(file, folder = "vault") {
  if (!file || !(file instanceof Blob || file instanceof File)) {
    return { publicUrl: null, filePath: null };
  }

  const cleanName = (file.name || "file").replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `${folder}/${Date.now()}_${cleanName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (uploadError) {
    console.warn("Supabase Storage Upload failed:", uploadError.message);
    return { publicUrl: null, filePath: null, error: uploadError };
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return { publicUrl: urlData?.publicUrl || null, filePath };
}
