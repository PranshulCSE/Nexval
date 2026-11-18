import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Bell, Send, Trash2, AlertTriangle, Info, AlertCircle } from 'lucide-react';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'info' | 'warning' | 'urgent';
  target_role: string;
  is_active: boolean;
  created_at: string;
}

interface AnnouncementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcements: Announcement[];
  userRole?: string;
  onPostAnnouncement?: (data: { title: string; message: string; priority: 'info' | 'warning' | 'urgent'; target_role: string }) => Promise<void>;
  onDeleteAnnouncement?: (id: string) => Promise<void>;
}

export const AnnouncementsModal: React.FC<AnnouncementsModalProps> = ({
  isOpen,
  onClose,
  announcements,
  userRole,
  onPostAnnouncement,
  onDeleteAnnouncement,
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'info' | 'warning' | 'urgent'>('info');
  const [targetRole, setTargetRole] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim() || !onPostAnnouncement) return;
    setIsSubmitting(true);
    try {
      await onPostAnnouncement({
        title: title.trim(),
        message: message.trim(),
        priority,
        target_role: targetRole,
      });
      setTitle('');
      setMessage('');
      setPriority('info');
      setTargetRole('all');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return (
          <Badge variant="red" className="flex items-center gap-1 text-[10px]">
            <AlertCircle className="w-3 h-3" /> URGENT
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="yellow" className="flex items-center gap-1 text-[10px]">
            <AlertTriangle className="w-3 h-3" /> ATTENTION
          </Badge>
        );
      default:
        return (
          <Badge variant="blue" className="flex items-center gap-1 text-[10px]">
            <Info className="w-3 h-3" /> INFO
          </Badge>
        );
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hackathon Announcements"
    >
      <div className="space-y-6">
        {/* Admin Post Announcement Form */}
        {userRole === 'admin' && onPostAnnouncement && (
          <form onSubmit={handleSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-slate-700" /> Broadcast New Announcement
              </h4>
              <div className="flex items-center gap-2">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="info">Info (Blue)</option>
                  <option value="warning">Warning (Yellow)</option>
                  <option value="urgent">Urgent (Red Banner)</option>
                </select>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="all">Everyone</option>
                  <option value="judge">Judges Only</option>
                  <option value="mentor">Mentors Only</option>
                </select>
              </div>
            </div>

            <div>
              <input
                type="text"
                placeholder="Announcement Title (e.g., Round 2 Evaluation Window Extended)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>

            <div>
              <textarea
                placeholder="Detailed message for judges and participants..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={2}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 resize-none"
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                className="flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Post Announcement
              </Button>
            </div>
          </form>
        )}

        {/* Announcements List */}
        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {announcements.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No active announcements at this moment.
            </div>
          ) : (
            announcements.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  item.priority === 'urgent'
                    ? 'bg-red-50/60 border-red-200'
                    : item.priority === 'warning'
                    ? 'bg-amber-50/60 border-amber-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(item.priority)}
                      <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                      {item.target_role !== 'all' && (
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          [{item.target_role}]
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mt-1">
                      {item.message}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono inline-block mt-1">
                      {formatDate(item.created_at)}
                    </span>
                  </div>

                  {userRole === 'admin' && onDeleteAnnouncement && (
                    <button
                      onClick={() => onDeleteAnnouncement(item.id)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded-md transition-colors"
                      title="Delete Announcement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
