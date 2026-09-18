import React from "react";

export default function HighlightText({ text, highlight }) {
  if (!highlight || text === undefined || text === null) return <>{text}</>;
  
  const textStr = String(text);
  // Escape special regex characters in the highlight term
  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const safeHighlight = escapeRegExp(highlight);
  
  const parts = textStr.split(new RegExp(`(${safeHighlight})`, 'gi'));
  
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} style={{ backgroundColor: "#fef08a", color: "#854d0e", fontWeight: "600", padding: "0 2px", borderRadius: "3px" }}>
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}
