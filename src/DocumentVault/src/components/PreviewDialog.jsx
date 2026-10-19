import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { status, fmt, size, isoShort, spec } from "../utils/helpers";
import { TYPES } from "../utils/constants";
import { 
  Download, 
  X, 
  FileText, 
  Calendar, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2,
  CheckCircle2,
  Shield,
  Clock
} from "lucide-react";

function download(d) {
  if (d.file instanceof Blob || d.file instanceof File) {
    const u = URL.createObjectURL(d.file);
    const a = document.createElement("a");
    a.href = u; a.download = d.fname || "document";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 60000);
  } else if (d.file_url) {
    const a = document.createElement("a");
    a.href = d.file_url;
    a.target = "_blank";
    a.download = d.fname || "document";
    document.body.appendChild(a); a.click(); a.remove();
  }
}

export default function PreviewDialog({ open, onClose, doc }) {
  const [pvUrl, setPvUrl] = useState("");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (open) {
      if (doc?.file instanceof Blob || doc?.file instanceof File) {
        const u = URL.createObjectURL(doc.file);
        setPvUrl(u);
        setZoom(1);
        setRotation(0);
        return () => URL.revokeObjectURL(u);
      } else if (doc?.file_url) {
        setPvUrl(doc.file_url);
        setZoom(1);
        setRotation(0);
      } else {
        setPvUrl("");
        setZoom(1);
        setRotation(0);
      }
    } else {
      setPvUrl("");
      setZoom(1);
      setRotation(0);
    }
  }, [open, doc]);

  if (!open || !doc) return null;
  const s = status(doc);
  const typeConf = TYPES[doc.type] || TYPES.Other;
  const fields = spec(doc.type);
  const v = doc.fields || {};
  const filledFields = fields.filter((x) => v[x.k]);

  const hasFile = Boolean(doc.file || doc.file_url);
  const ext = (doc.fname || doc.file_url || "").toLowerCase();
  const isImage = (doc.file && /^image/.test(doc.file.type)) || /\.(png|jpe?g|webp|gif|svg)$/i.test(ext);
  const isPdf = (doc.file && /pdf/.test(doc.file.type)) || /\.pdf$/i.test(ext);

  return (
    <Modal open={open} onClose={onClose} className="preview">
      {/* Modern Header */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-red-50 text-red-600 rounded-xl">
            <Shield size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight leading-none">
                {doc.type}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                s.k === 'exp' ? 'bg-red-50 text-red-600 border border-red-200' :
                s.k === 'due' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                'bg-emerald-50 text-emerald-600 border border-emerald-200'
              }`}>
                {s.t}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 font-mono">
              {doc.num ? `Doc No: ${doc.num}` : "No document number specified"}
            </p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          title="Close dialog"
        >
          <X size={18} />
        </button>
      </div>

      {/* Document Meta Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        {(!typeConf || typeConf.needIssue || doc.issue) && (
          <div className="bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
            <span className="text-[11px] font-medium text-gray-400 block uppercase tracking-wider">Issue Date</span>
            <b className="text-xs font-semibold text-gray-800 mt-0.5 block">
              {doc.issue ? fmt(doc.issue) : "Not added"}
            </b>
          </div>
        )}
        {(!typeConf || typeConf.needExpiry || doc.expiry) && (
          <div className="bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
            <span className="text-[11px] font-medium text-gray-400 block uppercase tracking-wider">Expiry Date</span>
            <b className="text-xs font-semibold text-gray-800 mt-0.5 block">
              {doc.expiry ? fmt(doc.expiry) : "Not added"}
            </b>
          </div>
        )}
        <div className="bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
          <span className="text-[11px] font-medium text-gray-400 block uppercase tracking-wider">Attached File</span>
          <b className="text-xs font-semibold text-gray-800 mt-0.5 block truncate" title={doc.fname || "No file"}>
            {doc.file ? `${doc.fname} (${size(doc.file.size)})` : "No file attached"}
          </b>
        </div>
        <div className="bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
          <span className="text-[11px] font-medium text-gray-400 block uppercase tracking-wider">Remarks</span>
          <b className="text-xs font-semibold text-gray-800 mt-0.5 block truncate" title={doc.note || "None"}>
            {doc.note || "None"}
          </b>
        </div>
      </div>

      {/* Extra Type-Specific Details */}
      {filledFields.length > 0 && (
        <div className="bg-red-50/30 rounded-xl p-3 border border-red-100/60 mb-4">
          <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider block mb-2">
            {doc.type} Additional Details
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            {filledFields.map((x) => (
              <div key={x.k}>
                <span className="text-gray-400 block text-[11px]">{x.l}</span>
                <b className="text-gray-800 font-semibold mt-0.5 block">{isoShort(v[x.k])}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image / Document Viewer Stage */}
      <div className="relative rounded-2xl border border-gray-200 bg-slate-900/5 overflow-hidden mb-4">
        {/* Viewer Toolbar */}
        {isImage && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-2 py-1 rounded-xl shadow-sm border border-gray-200/80 text-xs">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
              className="p-1 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>
            <span className="font-mono text-[11px] font-semibold text-gray-600 px-1">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
              className="p-1 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
            <div className="w-px h-3.5 bg-gray-200 mx-0.5"></div>
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
              title="Rotate 90deg"
            >
              <RotateCw size={15} />
            </button>
            <button
              onClick={() => { setZoom(1); setRotation(0); }}
              className="p-1 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
              title="Reset Zoom"
            >
              <Maximize2 size={15} />
            </button>
          </div>
        )}

        {/* Viewport */}
        <div className="min-h-[340px] max-h-[58vh] flex items-center justify-center p-4 overflow-auto bg-slate-100/60">
          {!hasFile && (
            <div className="text-center p-8">
              <FileText className="mx-auto h-12 w-12 text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-gray-700">No scanned file attached</p>
              <p className="text-xs text-gray-400 mt-1">Use 'Edit' to upload and attach this document file.</p>
            </div>
          )}

          {isImage && (
            <div className="transition-transform duration-200 ease-out flex items-center justify-center w-full h-full">
              <img
                src={pvUrl}
                alt={doc.type}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                  maxHeight: "54vh",
                  maxWidth: "100%",
                  objectFit: "contain",
                }}
                className="rounded-xl shadow-md border border-white"
              />
            </div>
          )}

          {isPdf && (
            <iframe
              src={pvUrl}
              title="Document PDF Preview"
              className="w-full h-[54vh] rounded-xl border border-gray-200 bg-white shadow-sm"
            />
          )}

          {doc.file && !isImage && !isPdf && (
            <div className="text-center p-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
              <p className="text-sm font-semibold text-gray-700">Preview not available for this file type</p>
              <p className="text-xs text-gray-400 mt-1">Please download the file to view its full content.</p>
            </div>
          )}
        </div>
      </div>

      {/* Renewal History if available */}
      {doc.history && doc.history.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Clock size={14} className="text-red-600" />
            Renewal History
          </h4>
          <div className="space-y-1.5 max-h-32 overflow-auto">
            {[...doc.history].reverse().map((x, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                <div>
                  <b className="text-gray-800">{x.num || "No number"}</b> · {x.issue ? fmt(x.issue) : "—"} to {x.expiry ? fmt(x.expiry) : "—"}
                  <div className="text-[11px] text-gray-400">Renewed on {fmt(x.on)}</div>
                </div>
                {x.file && (
                  <button
                    className="px-2.5 py-1 text-xs font-semibold bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
                    onClick={() => download({ file: x.file, fname: x.fname })}
                  >
                    Download
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions Footer */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
        {doc.file && (
          <button
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors shadow-sm"
            onClick={() => download(doc)}
          >
            <Download size={15} />
            <span>Download</span>
          </button>
        )}
        <button
          className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-sm shadow-red-200"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
