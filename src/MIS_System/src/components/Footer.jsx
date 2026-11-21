import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white/80 backdrop-blur-md border-t border-slate-200/80 py-2 fixed bottom-0 left-0 right-0 z-20 h-10 shadow-xs">
      <div className="container mx-auto px-4 h-full flex items-center justify-between text-xs text-slate-500">
        <p className="hidden sm:block">
          Management Information System (MIS) © {new Date().getFullYear()}
        </p>
        <div className="mx-auto sm:mx-0 flex items-center gap-1.5 font-medium">
          <span>Powered by</span>
          <a 
            href="https://www.botivate.in" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
          >
            Botivate
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;