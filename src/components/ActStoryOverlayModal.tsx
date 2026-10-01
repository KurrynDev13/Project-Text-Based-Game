import React, { useRef, useEffect, useCallback, useState } from 'react';
import { getActStory } from '../data/actStoryData';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActStoryOverlayModalProps {
  actId: string;
  actName: string;
  actSubtitle: string;
  actLore?: string; // Multi-paragraph lore text
  isNgPlus?: boolean;
  onClose: () => void;
}

// ─── Roman Numeral Helper ─────────────────────────────────────────────────────

const romanNumerals: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII',
};

/** Extracts the roman numeral from an actId like 'loc_act_1' → 'I' */
function getActRoman(actId: string): string {
  if (actId.includes('rebirth')) return 'REBIRTH';
  const actNumber = parseInt(actId.replace('loc_act_', ''), 10) || 1;
  return romanNumerals[actNumber] ?? String(actNumber);
}

// ─── Auto-Scroll Hook ─────────────────────────────────────────────────────────

/** Manages slow auto-scroll with interaction pause toggle and bottom completion detection. */
function useAutoScroll(scrollRef: React.RefObject<HTMLDivElement | null>) {
  const [paused, setPaused] = useState(false);
  const [reachedBottom, setReachedBottom] = useState(false);
  const pausedRef = useRef(false);
  const reachedBottomRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const togglePause = useCallback(() => {
    if (reachedBottomRef.current) return;
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  }, []);

  const pause = useCallback(() => {
    if (reachedBottomRef.current) return;
    pausedRef.current = true;
    setPaused(true);
  }, []);

  const stopScroll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startScroll = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      const el = scrollRef.current;
      if (!el || pausedRef.current || reachedBottomRef.current) return;

      const maxScroll = el.scrollHeight - el.clientHeight;
      if (el.scrollTop >= maxScroll - 2) {
        reachedBottomRef.current = true;
        setReachedBottom(true);
        setPaused(true);
        pausedRef.current = true;
        stopScroll();
        return;
      }

      el.scrollTop += 1;
    }, 45);
  }, [scrollRef, stopScroll]);

  // Listen for keyboard and gesture/touch interactions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        togglePause();
      }
    };

    const el = scrollRef.current;

    const handleWheel = () => pause();
    const handleTouchStart = () => pause();
    const handleTouchMove = () => pause();
    const handleMouseDown = () => togglePause();

    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: true });
      el.addEventListener('touchstart', handleTouchStart, { passive: true });
      el.addEventListener('touchmove', handleTouchMove, { passive: true });
      el.addEventListener('mousedown', handleMouseDown);
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (el) {
        el.removeEventListener('wheel', handleWheel);
        el.removeEventListener('touchstart', handleTouchStart);
        el.removeEventListener('touchmove', handleTouchMove);
        el.removeEventListener('mousedown', handleMouseDown);
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [scrollRef, togglePause, pause]);

  useEffect(() => {
    startScroll();
    return () => stopScroll();
  }, [startScroll, stopScroll]);

  return { paused, reachedBottom, togglePause };
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

const ActStoryOverlayModal: React.FC<ActStoryOverlayModalProps> = ({
  actId,
  actName,
  actSubtitle,
  actLore,
  isNgPlus,
  onClose,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { paused, reachedBottom } = useAutoScroll(scrollRef);

  const actRoman = getActRoman(actId);
  const fullEpicLore = getActStory(actId, actLore, isNgPlus);

  // Split lore text into paragraphs on double or single newlines
  const loreParagraphs = fullEpicLore
    .split(/\n{1,2}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-[90] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-amber-950/90 via-zinc-900 to-zinc-950 border-2 border-amber-500/70 rounded-2xl max-w-xl md:max-w-2xl w-full flex flex-col max-h-[92vh] shadow-2xl animate-fade-in">

        {/* ── Header ── */}
        <div className="p-4 md:p-6 pb-3 space-y-2 shrink-0 border-b border-amber-900/40">
          {/* ACT badge */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-mono font-bold tracking-widest uppercase px-3.5 py-1 bg-amber-950/80 border border-amber-500/50 text-amber-300 rounded-full shadow-inner">
              📜 CHAPTER CHRONICLES • {actRoman === 'REBIRTH' ? 'REBIRTH' : `ACT ${actRoman}`}
            </span>
            {/* Auto-scroll status badge placed in header so it never obscures lore text or footer buttons */}
            <span
              className={`text-[10px] md:text-xs font-mono px-2.5 py-0.5 rounded-full border ${
                reachedBottom
                  ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-400 font-bold'
                  : paused
                  ? 'bg-zinc-800/90 border-zinc-700 text-zinc-300'
                  : 'bg-amber-950/80 border-amber-700/60 text-amber-300 animate-pulse'
              }`}
            >
              {reachedBottom
                ? '✓ END OF LORE'
                : paused
                ? '⏸ PAUSED (Interact to Resume)'
                : '▶ AUTO-SCROLLING (Interact to Pause)'}
            </span>
          </div>

          {/* Act name */}
          <h2 className="font-serif text-amber-200 text-xl md:text-3xl font-bold leading-tight mt-1">
            {actName}
          </h2>

          {/* Act subtitle */}
          <p className="text-amber-400/90 text-xs md:text-sm font-serif italic">{actSubtitle}</p>

          {/* Decorative divider */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-600/60 to-transparent" />
            <span className="text-amber-500 text-xs">✦</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-amber-600/60 to-transparent" />
          </div>
        </div>

        {/* ── Scrollable Lore Cutscene (Clean flex scroll container) ── */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-6 md:px-8 py-4 scroll-smooth space-y-4">
          {loreParagraphs.map((para, i) => (
            <p
              key={i}
              className="font-serif text-amber-100/95 text-sm md:text-base leading-relaxed tracking-wide first-letter:text-xl first-letter:font-bold first-letter:text-amber-400"
            >
              {para}
            </p>
          ))}
          <div className="h-4" />
        </div>

        {/* ── Footer ── */}
        <div className="p-4 md:p-6 pt-3 shrink-0 border-t border-amber-900/40 bg-zinc-950/80 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] px-6 py-2.5 rounded-xl font-bold text-sm md:text-base transition-all duration-200
              bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500
              text-amber-100 shadow-xl border border-amber-500/40 active:scale-98"
          >
            Enter the Act →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActStoryOverlayModal;
