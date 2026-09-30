// src/components/AnnouncementTicker.tsx
// Floating Announcement Ticker Bar (Floats right-to-left, auto-hides when complete)

import React, { useState, useEffect, useRef } from 'react';
import {
  subscribeLocalAnnouncements,
  fetchRecentAnnouncements,
  isSupabaseConfigured,
} from '../utils/supabase';

interface AnnouncementTickerProps {
  onTickerActiveChange?: (isActive: boolean) => void;
}

export const AnnouncementTicker: React.FC<AnnouncementTickerProps> = ({ onTickerActiveChange }) => {
  const [announcementQueue, setAnnouncementQueue] = useState<string[]>([]);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<string | null>(null);
  const seenMessagesRef = useRef<Set<string>>(new Set());

  // Subscribe to instant local announcement triggers
  useEffect(() => {
    const unsubscribe = subscribeLocalAnnouncements((text) => {
      if (!seenMessagesRef.current.has(text)) {
        seenMessagesRef.current.add(text);
        setAnnouncementQueue((prev) => [...prev, text]);
      }
    });
    return unsubscribe;
  }, []);

  // Poll Supabase for remote GM announcements
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let isMounted = true;
    const pollAnnouncements = async () => {
      const recent = await fetchRecentAnnouncements();
      if (!isMounted) return;
      recent.forEach((msg) => {
        if (!seenMessagesRef.current.has(msg)) {
          seenMessagesRef.current.add(msg);
          setAnnouncementQueue((prev) => [...prev, msg]);
        }
      });
    };
    pollAnnouncements();
    const interval = setInterval(pollAnnouncements, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Process announcement queue one by one
  useEffect(() => {
    if (!currentAnnouncement && announcementQueue.length > 0) {
      const nextMsg = announcementQueue[0];
      setAnnouncementQueue((prev) => prev.slice(1));
      setCurrentAnnouncement(nextMsg);
      onTickerActiveChange?.(true);
    }
  }, [currentAnnouncement, announcementQueue, onTickerActiveChange]);

  const handleAnimationEnd = () => {
    setCurrentAnnouncement(null);
    if (announcementQueue.length === 0) {
      onTickerActiveChange?.(false);
    }
  };

  if (!currentAnnouncement) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-amber-950 via-zinc-950 to-amber-950 border-b border-amber-500/60 text-amber-200 text-[10px] md:text-xs font-mono py-1 px-2 overflow-hidden relative shadow-lg z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center space-x-2 overflow-hidden">
        <span className="bg-amber-500 text-zinc-950 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest shrink-0 shadow">
          ANNOUNCEMENT
        </span>
        <div className="flex-1 overflow-hidden relative h-4 md:h-5">
          <div
            onAnimationEnd={handleAnimationEnd}
            className="whitespace-nowrap absolute inline-block animate-marquee font-semibold tracking-wide text-amber-100"
            style={{
              animation: 'marquee 16s linear 1 forwards',
            }}
          >
            {currentAnnouncement}
          </div>
        </div>
      </div>
    </div>
  );
};

