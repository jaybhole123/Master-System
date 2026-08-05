import React, { useRef, useEffect } from 'react';

const TextArea = ({ label, id, required, placeholder, value, onChange, error, maxLength = 1000 }) => {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <div className="flex flex-col mb-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2 mb-2">
        <label htmlFor={id} className="text-sm font-semibold text-slate-800">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <span className="text-xs text-slate-500">{value.length} / {maxLength}</span>
      </div>
      <textarea
        ref={textareaRef}
        id={id}
        name={id}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        className={`w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 text-slate-700 shadow-sm resize-none min-h-[110px] transition duration-200 ease-in-out focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 ${error ? 'border-red-400 focus:ring-red-100 bg-red-50' : ''}`}
      />
      {error && <span className="mt-2 text-xs text-red-500">{error}</span>}
    </div>
  );
};

export default TextArea;
