import React, { useState } from 'react';
import {
  LayoutDashboard,
  Upload,
  IndianRupeeIcon,
  Table,
  LogOut,
  Menu,
  Bell,
  Settings
} from 'lucide-react';

import { Button } from './ui/Button';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  userEmail: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activePage,
  onNavigate,
  onLogout,
  userEmail
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'upload', label: 'Bulk Upload', icon: Upload },
    { id: 'results', label: 'Analysis Results', icon: Table },
    { id: 'fees', label: 'Fee Configuration', icon: IndianRupeeIcon },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const getPageTitle = () =>
    navItems.find(i => i.id === activePage)?.label ?? 'Dashboard';

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="px-6 py-5 border-b border-slate-800">
  <div className="flex flex-col items-start gap-1">
    <img
      src="/assets/amazon-in-logo.png"
      alt="Amazon"
      className="h-8"
    />

    <span className="text-xs tracking-widest text-slate-400 uppercase">
      Revenue Calculator
    </span>
  </div>
</div>


        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => {
            const active = item.id === activePage;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                  transition
                  ${active
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 px-4 py-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-orange-500 flex items-center justify-center text-sm font-semibold">
            {userEmail.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{userEmail}</p>
            <p className="text-xs text-slate-400">Administrator</p>
          </div>
          <button onClick={onLogout} className="text-slate-400 hover:text-white">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur border-b border-slate-200">
          <div className="h-16 px-6 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                {getPageTitle()}
              </h1>
              <p className="text-xs text-slate-500">
                Amazon India Marketplace
              </p>
            </div>

            <Bell className="h-5 w-5 text-slate-500" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
