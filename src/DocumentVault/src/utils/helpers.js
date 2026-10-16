// ── Shared helpers ──
import { TYPES, PERSONAL } from "./constants";

/** Escape HTML entities */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Format a date string for Indian locale */
export const fmt = (d) => {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/** Format file size */
export const size = (b) => {
  if (!b) return "";
  return b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
};

/** Today as YYYY-MM-DD */
export const today = () => {
  const t = new Date();
  return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
};

/** Get initials from name */
export const ini = (n) => (n || "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

/** Get the ISO-short display of a date value */
export const isoShort = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? fmt(v) : v);

/** Compute document status */
export function status(d) {
  if (!d.expiry) return { k: "none", t: "No expiry" };
  const days = Math.ceil((new Date(d.expiry + "T00:00:00") - new Date().setHours(0, 0, 0, 0)) / 864e5);
  if (days < 0) return { k: "bad", t: "Expired " + (-days) + " day" + (days === -1 ? "" : "s") + " ago" };
  if (days <= 30) return { k: "warn", t: days === 0 ? "Expires today" : "Expires in " + days + " day" + (days === 1 ? "" : "s") };
  return { k: "ok", t: "Valid till " + fmt(d.expiry) };
}

/** Get worst status for a client */
export const worst = (cid, docs) => {
  let w = "";
  docs.filter((d) => d.cid === cid).forEach((d) => {
    const k = status(d).k;
    if (k === "bad") w = "bad";
    else if (k === "warn" && w !== "bad") w = "warn";
  });
  return w;
};

/** Get spec fields for a doc type */
export const spec = (t) => (TYPES[t] || TYPES.Other).f;

/** Get summary text for a document */
export const sum = (d) => {
  const f = spec(d.type);
  const v = d.fields || {};
  return f.filter((x) => v[x.k] && x.t !== "textarea").slice(0, 2).map((x) => isoShort(v[x.k])).join(" · ");
};

/** Get type options as <option> elements */
export const typeOpts = () => PERSONAL;
export const defType = () => PERSONAL[0];
