import React from 'react';

export const Input: React.FC<any> = ({ label, error, multiline, className = '', inputClassName = '', rows = 4, ...props }) => (
  <div className={`mb-4 ${className}`}>
    {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
    {multiline ? (
      <textarea rows={rows} {...props} className={`block w-full rounded-md shadow-sm sm:text-sm bg-white text-slate-900 ${inputClassName} ${error ? 'border-red-300 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:ring-orange-500 focus:border-orange-500'} disabled:bg-slate-50 disabled:text-slate-500`} />
    ) : (
      <input {...props} className={`block w-full rounded-md shadow-sm sm:text-sm bg-white text-slate-900 ${inputClassName} ${error ? 'border-red-300 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:ring-orange-500 focus:border-orange-500'} disabled:bg-slate-50 disabled:text-slate-500`} />
    )}
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

export default Input;
