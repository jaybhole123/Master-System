import React from "react";
import Modal from "./Modal";

export default function ConfirmDialog({ open, onClose, onConfirm, title, message }) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose}>
      <h3>{title}</h3>
      <p style={{ color: "var(--dv-mute)" }}>{message}</p>
      <div className="dv-fa">
        <button className="dv-btn" onClick={onClose}>Cancel</button>
        <button className="dv-btn pri" onClick={() => { onConfirm(); onClose(); }}>Delete</button>
      </div>
    </Modal>
  );
}
