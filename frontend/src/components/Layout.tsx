import React from 'react';
import { Navbar, NavItem } from './Navbar';

export interface LayoutProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    role: 'admin' | 'judge' | 'mentor';
  } | null;
  navItems?: NavItem[];
  onSignOut?: () => void;
  maxWidth?: '5xl' | '7xl' | 'full';
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  user,
  navItems,
  onSignOut,
  maxWidth = '7xl',
}) => {
  const maxWidthClass = {
    '5xl': 'max-w-5xl',
    '7xl': 'max-w-7xl',
    'full': 'max-w-full',
  }[maxWidth];

  return (
    <div className="min-h-screen bg-[#F4F5F9] text-slate-900 flex flex-col font-sans">
      <Navbar user={user} navItems={navItems} onSignOut={onSignOut} />
      <main className={`flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 ${maxWidthClass}`}>
        {children}
      </main>
      <footer className="border-t border-slate-200/80 bg-white/70 py-4 text-center text-xs text-slate-400">
        <p>NexHack 2.0 Judging Portal &bull; Geeta University 24-Hour Hackathon</p>
      </footer>
    </div>
  );
};
