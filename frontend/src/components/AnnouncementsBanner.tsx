import React from 'react';
import { Announcement } from './AnnouncementsModal';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

interface AnnouncementsBannerProps {
  announcement: Announcement | null;
  onDismiss: () => void;
  onOpenModal: () => void;
}

export const AnnouncementsBanner: React.FC<AnnouncementsBannerProps> = ({
  announcement,
  onDismiss,
  onOpenModal,
}) => {
  if (!announcement) return null;

  const isUrgent = announcement.priority === 'urgent';
  const isWarning = announcement.priority === 'warning';

  const bgColor = isUrgent
    ? 'bg-red-500 text-white'
    : isWarning
    ? 'bg-amber-500 text-white'
    : 'bg-[#0F172A] text-white';

  return (
    <div className={`w-full ${bgColor} px-4 py-2 text-xs font-medium shadow-sm transition-all duration-200`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-hidden">
          {isUrgent ? (
            <AlertCircle className="w-4 h-4 shrink-0 animate-pulse text-white" />
          ) : isWarning ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-white" />
          ) : (
            <Info className="w-4 h-4 shrink-0 text-slate-300" />
          )}
          <span className="font-bold shrink-0 uppercase tracking-wider text-[11px] opacity-90">
            {isUrgent ? 'URGENT NOTICE:' : isWarning ? 'ATTENTION:' : 'ANNOUNCEMENT:'}
          </span>
          <span className="truncate cursor-pointer hover:underline" onClick={onOpenModal}>
            {announcement.title} — {announcement.message}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenModal}
            className="text-[11px] underline font-semibold opacity-90 hover:opacity-100 hidden sm:inline"
          >
            View All
          </button>
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-black/10 rounded transition-colors text-white/80 hover:text-white"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
