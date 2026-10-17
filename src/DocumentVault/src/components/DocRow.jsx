import React from "react";
import Icon from "./Icon";
import { status, fmt, size, sum } from "../utils/helpers";

function download(d) {
  if (!d.file) return;
  const u = URL.createObjectURL(d.file);
  const a = document.createElement("a");
  a.href = u; a.download = d.fname || "document";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 60000);
}

function highlightText(text, query) {
  if (!text || !query || !query.trim()) return text;
  const q = query.trim();
  const parts = String(text).split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, i) => 
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} style={{ background: "#fef08a", color: "#854d0e", padding: "1px 4px", borderRadius: 3, fontWeight: 700 }}>
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function DocRow({ doc, index, clients, showClient, onView, onEdit, onRenew, onDelete, onGoClient, highlight = "" }) {
  const s = status(doc);
  const ext = (doc.fname?.split(".")?.pop() || "FILE").toUpperCase().slice(0, 4);
  const c = clients?.find((x) => x.id === doc.cid);
  const due = s.k === "warn" || s.k === "bad";
  const summary = sum(doc);

  return (
    <div className={`dv-row s-${s.k}`}>
      <div className="dv-serial-cell">
        {index != null ? index + 1 : "•"}
      </div>
      <div>
        <div className="t">{highlightText(doc.type, highlight)}</div>
        {summary && <div className="s" title={summary}>{highlightText(summary, highlight)}</div>}
        {doc.note && <div className="s" title={doc.note}>{highlightText(doc.note, highlight)}</div>}
        {doc.history && doc.history.length > 0 && (
          <div className="s">Renewed {doc.history.length} time{doc.history.length > 1 ? "s" : ""}</div>
        )}
      </div>
      <div data-l="Name">
        {c ? (
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-gray-900 text-sm">{highlightText(c.name, highlight)}</span>
          </div>
        ) : (
          <span className="s">Unassigned</span>
        )}
      </div>
      <div data-l="Number">{doc.num ? highlightText(doc.num, highlight) : <span className="s">Not added</span>}</div>
      <div data-l="Issued">{doc.issue ? fmt(doc.issue) : <span className="s">Not added</span>}</div>
      <div data-l="Status">
        <span className={`dv-pill ${s.k}`}>{s.t}</span>
        {doc.expiry && s.k !== "ok" && <div className="s">Expiry {fmt(doc.expiry)}</div>}
      </div>
      <div data-l="File">
        {doc.file ? (
          <button
            type="button"
            className="dv-file-tile-btn"
            onClick={() => onView?.(doc)}
            title={`Preview: ${doc.fname} (${size(doc.file.size)})`}
          >
            <svg
              className="dv-file-tile-icon"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="15" y2="17" />
            </svg>
            <span className="dv-file-tile-ext">{ext}</span>
          </button>
        ) : (
          <span className="dv-no-file-text">No File</span>
        )}
      </div>
      <div className="dv-ra">
        <button className="dv-btn ic" onClick={() => onView?.(doc)} title="View details"><Icon name="eye" /></button>
        {doc.file && <button className="dv-btn ic" onClick={() => download(doc)} title="Download file"><Icon name="dl" /></button>}
        <button className={`dv-btn ic rn${due ? " due" : ""}`} onClick={() => onRenew?.(doc)} title="Renew document"><Icon name="rn" /></button>
        <button className="dv-btn ic" onClick={() => onEdit?.(doc)} title="Edit"><Icon name="ed" /></button>
        <button className="dv-btn ic dng" onClick={() => onDelete?.(doc)} title="Delete"><Icon name="tr" /></button>
      </div>
    </div>
  );
}

export function DocTableHeader() {
  return (
    <div className="dv-row hd">
      <div className="dv-serial-cell">#</div>
      <div>Document</div>
      <div>Name</div>
      <div>Number</div>
      <div>Issued</div>
      <div>Status</div>
      <div>File</div>
      <div className="dv-ra">Actions</div>
    </div>
  );
}
