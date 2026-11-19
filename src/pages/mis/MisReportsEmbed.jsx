import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function MisReportsEmbed({ path = "/mis/dashboard" }) {
  const [isLoading, setIsLoading] = useState(true);
  
  // Point directly to Next.js server where all styles and chunks are guaranteed to load 100% cleanly
  const targetUrl = `http://localhost:3000${path}?embed=true`;

  return (
    <div className="relative w-full h-[calc(100vh-64px)] flex flex-col bg-slate-50 overflow-hidden">
      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs">
          <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white shadow-lg border border-slate-100">
            <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
            <span className="text-sm font-semibold text-slate-700">Loading MIS Reports...</span>
          </div>
        </div>
      )}

      {/* Embedded Next.js Iframe running on the SAME port (5180) via Vite Reverse Proxy */}
      <iframe
        src={targetUrl}
        title="MIS Reports System"
        onLoad={(e) => {
          setIsLoading(false);
          try {
            const iframeDoc = e.target.contentDocument || e.target.contentWindow?.document;
            if (iframeDoc) {
              const aside = iframeDoc.querySelector('aside');
              if (aside) aside.style.display = 'none';
              const header = iframeDoc.querySelector('header');
              if (header) header.style.display = 'none';
            }
          } catch(err) {}
        }}
        className="w-full flex-1 border-0"
        style={{ minHeight: 'calc(100vh - 64px)' }}
      />
    </div>
  );
}


