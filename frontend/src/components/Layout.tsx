import React, { useState } from 'react';
import { Navbar, NavItem } from './Navbar';
import { useAnnouncements } from '../lib/useAnnouncements';
import { AnnouncementsBanner } from './AnnouncementsBanner';
import { AnnouncementsModal } from './AnnouncementsModal';

export interface LayoutProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    role: 'super_admin' | 'admin' | 'judge' | 'mentor';
  } | null;
  navItems?: NavItem[];
  onSignOut?: () => void;
  maxWidth?: '5xl' | '7xl' | 'full';
  syncStatus?: 'saved' | 'syncing' | 'offline';
  pendingSyncCount?: number;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  user,
  navItems,
  onSignOut,
  maxWidth = '7xl',
  syncStatus,
  pendingSyncCount = 0,
}) => {
  const [isAnnouncementsModalOpen, setIsAnnouncementsModalOpen] = useState(false);
  const {
    announcements,
    activeBanner,
    unreadCount,
    dismissAnnouncement,
    postAnnouncement,
    deleteAnnouncement,
  } = useAnnouncements(user?.role);

  const maxWidthClass = {
    '5xl': 'max-w-5xl',
    '7xl': 'max-w-7xl',
    'full': 'max-w-full',
  }[maxWidth];

  return (
    <div className="min-h-screen bg-[#F4F5F9] text-slate-900 flex flex-col font-sans">
      {/* Active announcement banner (urgent/warning) */}
      <AnnouncementsBanner
        announcement={activeBanner}
        onDismiss={() => activeBanner && dismissAnnouncement(activeBanner.id)}
        onOpenModal={() => setIsAnnouncementsModalOpen(true)}
      />

      <Navbar
        user={user}
        navItems={navItems}
        onSignOut={onSignOut}
        unreadCount={unreadCount}
        onOpenAnnouncements={() => setIsAnnouncementsModalOpen(true)}
        syncStatus={syncStatus}
        pendingSyncCount={pendingSyncCount}
      />

      <main className={`flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 ${maxWidthClass}`}>
        {children}
      </main>

      <footer className="border-t border-slate-200/80 bg-white/70 py-4 text-center text-xs text-slate-400">
        <p>NexHack 2.0 Judging Portal &bull; Geeta University 24-Hour Hackathon</p>
      </footer>

      {/* Announcements Modal */}
      <AnnouncementsModal
        isOpen={isAnnouncementsModalOpen}
        onClose={() => setIsAnnouncementsModalOpen(false)}
        announcements={announcements}
        userRole={user?.role}
        onPostAnnouncement={postAnnouncement}
        onDeleteAnnouncement={deleteAnnouncement}
      />
    </div>
  );
};
