import { useRef } from "react";
import { showToast } from "../utils/toast";

/**
 * Dropzone — handles drag-and-drop + click-to-browse for files.
 *
 * Props:
 *   onFiles(files)  — called when valid files are chosen
 *   loading         — bool, shows wagon animation while parsing
 *   loadingName     — string, filename currently being parsed
 *   error           — string | null, error message to show
 */
export default function Dropzone({ 
  onFiles, 
  loading, 
  loadingName, 
  error, 
  title = "Payment Advice PDF yahan drop karein", 
  icon = "⛃",
  accept = "application/pdf,.pdf,image/*"
}) {
  const inputRef = useRef(null);

  const isAcceptedFile = (f) => {
    if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) return true;
    if (f.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(f.name)) return true;
    return false;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag");
    const files = Array.from(e.dataTransfer.files || []).filter(isAcceptedFile);
    
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
    const files = Array.from(e.target.files || []).filter(isAcceptedFile);
    
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
      aria-label="Click or drop a file to upload"
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      <input
        ref={inputRef}
        id="fileInput"
        type="file"
        accept={accept}
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
