import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, Shield, Award, Users } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

export interface NavItem {
  label: string;
  href: string;
}

export interface NavbarProps {
  user?: {
    name: string;
    email: string;
    role: 'admin' | 'judge' | 'mentor';
  } | null;
  navItems?: NavItem[];
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  navItems = [],
  onSignOut,
}) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const roleBadgeVariant: Record<'admin' | 'judge' | 'mentor', 'yellow' | 'blue' | 'green'> = {
    admin: 'yellow',
    judge: 'blue',
    mentor: 'green',
  };

  const roleIcons = {
    admin: <Shield className="w-3 h-3 mr-1 inline" />,
    judge: <Award className="w-3 h-3 mr-1 inline" />,
    mentor: <Users className="w-3 h-3 mr-1 inline" />,
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Logos + App Title */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <Link to="/" className="flex items-center gap-2.5 group">
            {/* Geeta University Logo Placeholder */}
            <img
              src="/geeta-university-logo.svg"
              alt="Geeta University"
              className="h-8 w-auto object-contain"
            />
            <span className="h-5 w-[1px] bg-slate-200 hidden sm:block" />
            {/* NexHack Logo Placeholder */}
            <img
              src="/nexhack-logo.svg"
              alt="NexHack 2.0"
              className="h-7 w-auto object-contain"
            />
          </Link>
          <div className="hidden lg:flex flex-col border-l border-slate-200 pl-3">
            <span className="text-xs font-bold tracking-tight text-slate-900 leading-none">Judging Portal</span>
            <span className="text-[10px] text-slate-400 font-medium">NexHack 2.0</span>
          </div>
        </div>

        {/* Center: Desktop Nav Items (active item is dark pill) */}
        {navItems.length > 0 && (
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-150 ${
                    isActive
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right: User Info + Sign out */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* User Identity */}
              <div className="hidden sm:flex flex-col items-end text-right">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-900 leading-tight">
                    {user.name}
                  </span>
                  <Badge variant={roleBadgeVariant[user.role] || 'gray'} className="text-[10px] py-0 px-2">
                    {roleIcons[user.role]}
                    {user.role}
                  </Badge>
                </div>
                <span className="text-[11px] text-slate-400 font-mono leading-none mt-0.5">
                  {user.email}
                </span>
              </div>

              {/* Mobile badge indicator */}
              <div className="sm:hidden flex items-center">
                <Badge variant={roleBadgeVariant[user.role] || 'gray'} className="text-[10px]">
                  {user.role}
                </Badge>
              </div>

              {/* Outlined "Sign out" button */}
              {onSignOut && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSignOut}
                  leftIcon={<LogOut className="w-3.5 h-3.5 text-slate-500" />}
                  className="text-xs font-medium border-slate-200"
                >
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              )}
            </>
          ) : (
            <Link to="/login">
              <Button variant="primary" size="sm">
                Sign in
              </Button>
            </Link>
          )}

          {/* Mobile menu hamburger */}
          {navItems.length > 0 && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && navItems.length > 0 && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-[#0F172A] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {user && (
            <div className="pt-2 border-t border-slate-100 mt-2 text-xs text-slate-500 px-4">
              Signed in as <span className="font-semibold text-slate-800">{user.name}</span> ({user.role})
            </div>
          )}
        </div>
      )}
    </header>
  );
};
