import React from 'react';

const Button = ({ type = 'button', variant = 'primary', isLoading, onClick, children }) => {
  const baseClasses = "px-7 py-3 font-semibold rounded-full transition-all duration-200 inline-flex justify-center items-center gap-2";

  const variants = {
    primary: "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-200/40 hover:shadow-red-300/40 hover:-translate-y-0.5 focus:ring-4 focus:ring-red-200",
    secondary: "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus:ring-4 focus:ring-slate-100"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isLoading}
      className={`${baseClasses} ${variants[variant]} ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
};

export default Button;
