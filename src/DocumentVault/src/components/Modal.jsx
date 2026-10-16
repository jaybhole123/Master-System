import React, { useEffect, useRef } from "react";

export default function Modal({ open, onClose, children, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("keydown", esc); };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="dv-backdrop" onClick={onClose} />
      <div className={`dv-dialog ${className}`} ref={ref}>
        {children}
      </div>
    </>
  );
}
