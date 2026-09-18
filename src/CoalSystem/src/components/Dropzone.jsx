import { useRef } from "react";
import { showToast } from "../utils/toast";

/**
 * Dropzone — handles drag-and-drop + click-to-browse for PDF files.
 *
 * Props:
 *   onFile(file)    — called when a valid file is chosen
 *   loading         — bool, shows wagon animation while parsing
 *   loadingName     — string, filename currently being parsed
 *   error           — string | null, error message to show
 */
export default function Dropzone({ onFiles, loading, loadingName, error, title = "Payment Advice PDF yahan drop karein", icon = "⛃" }) {
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag");
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    
    const validFiles = files.filter(f => {
      if (f.size > 10 * 1024 * 1024) {
        showToast("File size 10MB se kam hona chahiye. Kripya choti file upload karein.", "error");
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) onFiles(validFiles);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add("drag");
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove("drag");
  };

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    
    const validFiles = files.filter(f => {
      if (f.size > 10 * 1024 * 1024) {
        showToast("File size 10MB se kam hona chahiye. Kripya choti file upload karein.", "error");
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) onFiles(validFiles);
    // reset so the same files can be re-selected
    e.target.value = "";
  };

  return (
    <section
      id="dropzone"
      className={`dropzone${error ? " err" : ""}`}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      role="button"
      tabIndex={0}
      aria-label="Click or drop a PDF to upload"
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      <input
        ref={inputRef}
        id="fileInput"
        type="file"
        accept="application/pdf,.pdf"
        multiple
        hidden
        onChange={handleChange}
      />

      {loading ? (
        /* ── Loading state ── */
        <div id="dzLoading">
          <div className="wagon-loader">
            <div className="wagon" />
          </div>
          <p className="dz-title">Reading {loadingName}…</p>
          <p className="dz-sub">Data extract ho raha hai, ek second…</p>
        </div>
      ) : (
        /* ── Idle state ── */
        <div id="dzIdle">
          <div className="dz-icon">{icon}</div>
          <p className="dz-title">{title}</p>
          <p className="dz-sub">upload</p>
          {error && (
            <p id="dzError" className="dz-error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
