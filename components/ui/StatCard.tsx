import React from 'react';

export const StatCard: React.FC<any> = ({ title, value, icon: Icon, colorClass, trend }: any) => (
  <div className="card p-5 flex items-center justify-between hover:shadow-lg transition-shadow border border-slate-100">
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <p className="text-2xl md:text-3xl font-extrabold text-slate-900">{value}</p>
      {trend && <p className="text-xs text-green-600 mt-2 flex items-center font-medium"><Icon className="w-3 h-3 mr-1 -rotate-45" /> {trend} this week</p>}
    </div>
    <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10 flex items-center justify-center`}>
      {Icon && <Icon className={`w-6 h-6 ${colorClass ? colorClass.replace('bg-', 'text-') : ''}`} />}
    </div>
  </div>
);

export default StatCard;
