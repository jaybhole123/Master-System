import React from 'react';

const FormCard = ({ children, title, subtitle }) => {
  return (
    <div className="w-full max-w-5xl mx-auto bg-white/95 backdrop-blur-xl rounded-[32px] shadow-2xl ring-1 ring-slate-200/60 overflow-hidden mt-4 mb-10">
      <div className="bg-gradient-to-r from-slate-50 via-white to-slate-100 px-8 py-6 border-b border-slate-200">
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-2 text-sm sm:text-base text-slate-500 max-w-2xl">{subtitle}</p>}
      </div>
      <div className="p-8 sm:p-10">
        {children}
      </div>
    </div>
  );
};

export default FormCard;
