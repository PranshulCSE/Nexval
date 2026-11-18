import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { Announcement } from '../components/AnnouncementsModal';

export function useAnnouncements(userRole?: string) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('nexhack_dismissed_announcements');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/announcements');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (err) {
      console.warn('Announcements fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();

    // Supabase Realtime channel subscription
    let channel: any = null;
    try {
      channel = supabase
        .channel('announcements_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'announcements' },
          () => {
            fetchAnnouncements();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription not active, using polling fallback');
    }

    // 25s polling fallback
    const interval = setInterval(fetchAnnouncements, 25000);

    return () => {
      clearInterval(interval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchAnnouncements]);

  const dismissAnnouncement = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem('nexhack_dismissed_announcements', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const postAnnouncement = async (payload: {
    title: string;
    message: string;
    priority: 'info' | 'warning' | 'urgent';
    target_role: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        setAnnouncements((prev) => [created, ...prev.filter((a) => a.id !== created.id)]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/announcements/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.warn('Delete announcement error:', err);
    }
  };

  // Top banner should show the latest urgent or warning announcement that hasn't been dismissed
  const activeBanner = announcements.find(
    (a) => a.is_active && !dismissedIds.has(a.id) && (a.priority === 'urgent' || a.priority === 'warning')
  ) || null;

  return {
    announcements,
    activeBanner,
    unreadCount: announcements.filter((a) => !dismissedIds.has(a.id)).length,
    dismissAnnouncement,
    postAnnouncement,
    deleteAnnouncement,
    isLoading,
    refetch: fetchAnnouncements,
  };
}
