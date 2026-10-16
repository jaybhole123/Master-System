import React from "react";

const paths = {
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
  dl: <><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 20h16"/></>,
  rn: <><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></>,
  ed: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></>,
  tr: <><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></>,
  us: <><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M17 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2.2.6 3.5 2.5 3.5 5.5"/></>,
  fl: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5"/></>,
  ck: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  wr: <><path d="M12 3l10 18H2zM12 10v5M12 18v.5"/></>,
  shield: <><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></>,
};

export default function Icon({ name, size: n = 17 }) {
  return (
    <svg width={n} height={n} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
