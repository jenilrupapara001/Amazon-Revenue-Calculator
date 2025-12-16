import React from 'react';

export const Input: React.FC<any> = ({
  label,
  error,
  multiline,
  className = '',
  inputClassName = '',
  rows = 4,
  style,
  ...props
}) => (
  <div className={`mb-4 ${className}`}>
    {label && (
      <label
        className="block mb-1.5 font-semibold text-[15px]"
        style={{ fontFamily: '-apple-system', color: 'black' }}
      >
        {label}
      </label>
    )}
    {multiline ? (
      <textarea
        rows={rows}
        {...props}
        style={{ fontFamily: '-apple-system', ...(style || {}) }}
        className={`block w-full rounded-lg shadow-sm sm:text-sm text-slate-900 ${inputClassName} ${
          error
            ? 'border-red-300 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
            : 'border-slate-300 focus:ring-orange-500 focus:border-orange-500'
        } disabled:bg-slate-50 disabled:text-slate-500`}
      />
    ) : (
      <input
        {...props}
        style={{ fontFamily: '-apple-system', ...(style || {}) }}
        className={`block w-full rounded-lg shadow-sm sm:text-sm text-slate-900 ${inputClassName} ${
          error
            ? 'border-red-300 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
            : 'border-slate-300 focus:ring-orange-500 focus:border-orange-500'
        } disabled:bg-slate-50 disabled:text-slate-500`}
      />
    )}
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

export default Input;
