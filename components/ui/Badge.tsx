import React from 'react';

export const Badge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { bg: string; text: string }> = {
    pending: { bg: 'bg-slate-100', text: 'text-slate-700' },
    fetched: { bg: 'bg-blue-50', text: 'text-blue-700' },
    calculated: { bg: 'bg-green-50', text: 'text-green-700' },
    error: { bg: 'bg-red-50', text: 'text-red-700' }
  };
  const key = (status || 'pending').toLowerCase();
  const styles = map[key] || map.pending;
  return (
    <span className={`${styles.bg} ${styles.text} inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide border border-transparent`}>
      <span className={`inline-block rounded-full w-2 h-2 ${styles.text.replace('text-', 'bg-')}`} />
      <span className="leading-none">{status}</span>
    </span>
  );
};

export default Badge;
