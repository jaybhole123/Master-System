import React from 'react';

const Input = ({ label, id, required, type = "text", placeholder, value, onChange, error }) => {
  return (
    <div className="flex flex-col mb-4">
      <label htmlFor={id} className="mb-2 text-sm font-semibold text-slate-800">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        id={id}
        name={id}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 shadow-sm transition duration-200 ease-in-out focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 ${error ? 'border-red-400 focus:ring-red-100 bg-red-50' : ''}`}
      />
      {error && <span className="mt-2 text-xs text-red-500">{error}</span>}
    </div>
  );
};

export default Input;
