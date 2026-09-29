// OpeningStoryModal.tsx
// Cinematic auto-scroll lore modal shown immediately after character creation.
// Scrolls slowly downward; click/touch anywhere on scroll area pauses; release resumes.

import React, { useRef, useEffect, useCallback, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OpeningStoryModalProps {
  heroName: string;
  heroClass: string;
  onClose: () => void;
}

// ─── Lore Builder ─────────────────────────────────────────────────────────────

interface LoreParagraph {
  text: string;
  italic?: boolean;
}

function buildLore(heroName: string, heroClass: string): LoreParagraph[] {
  return [
    {
      text: 'Before the sea was parted and the mountains stood tall, there was only the void — and within it, Bathala, the Supreme Being, breathed creation into existence.',
      italic: true,
    },
    {
      text: 'He fashioned the islands of Maharlika from the scales of the great Bakunawa serpent, blessed the soil with the tears of Mayari, and lit the heavens with the undying fire of Apolaki.',
    },
    {
      text: 'For a thousand harvests, the people of the archipelago lived as one — Datu and Alipin, Babaylan and Mandirigma — each knowing their sacred place beneath the stars.',
    },
    {
      text: 'But the old covenants have shattered. Ancient creatures stir in the depths of the Balete forests and beneath the ocean trenches. The Aswang covens feast in the moonless dark. Mount Kanlaon bleeds fire once more.',
      italic: true,
    },
    {
      text: 'The spirit world bleeds into mortal lands, and only one with the courage to walk between worlds can restore the balance.',
    },
    {
      text: `You are ${heroName}, a ${heroClass} who has heard the ancestors' call.`,
      italic: true,
    },
    {
      text: 'Your path begins at the edge of the Whispering Balete Forest, where the first shadows of a great darkness have fallen.',
    },
    {
      text: 'May Bathala guide your blade. May Mayari light your path. And may the Balete trees remember your name when the final battle is won.',
      italic: true,
    },
  ];
}

// ─── Auto-Scroll Hook ─────────────────────────────────────────────────────────

/** Manages slow auto-scroll with spacebar pause toggle and bottom completion detection. */
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
    }, 40);
  }, [scrollRef, stopScroll]);

  // Listen for Spacebar key to pause / resume
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        togglePause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePause]);

  useEffect(() => {
    startScroll();
    return () => stopScroll();
  }, [startScroll, stopScroll]);

  return { paused, reachedBottom, togglePause };
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

const OpeningStoryModal: React.FC<OpeningStoryModalProps> = ({
  heroName,
  heroClass,
  onClose,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { paused, reachedBottom } = useAutoScroll(scrollRef);
  const lore = buildLore(heroName, heroClass);

  return (
    <div className="fixed inset-0 z-[90] bg-zinc-950/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-amber-800/60 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="p-6 pb-4 text-center space-y-3 shrink-0">
          <h1 className="font-serif text-amber-200 text-2xl md:text-3xl font-bold tracking-wide">
            Maharlika: Legends of the Archipelago
          </h1>
          {/* Decorative amber divider */}
          <div className="flex items-center gap-3 px-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-700 to-amber-500" />
            <span className="text-amber-600 text-xs tracking-widest uppercase font-mono">
              ✦ Origin ✦
            </span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-amber-700 to-amber-500" />
          </div>
        </div>

        {/* ── Scrollable Lore Content ── */}
        <div className="relative flex-1 min-h-0">
          <div
            ref={scrollRef}
            className="overflow-y-auto max-h-[60vh] px-6 pb-4 scroll-smooth"
          >
            <div className="space-y-5">
              {lore.map((para, i) => (
                <p
                  key={i}
                  className={`font-serif text-amber-100 text-sm md:text-base leading-relaxed
                    ${para.italic ? 'italic text-amber-200' : ''}`}
                >
                  {para.text}
                </p>
              ))}
              {/* Scroll padding at bottom so last paragraph is readable */}
              <div className="h-8" />
            </div>
          </div>

          {/* Auto-scroll status badge */}
          <div className="absolute bottom-2 right-4 pointer-events-none">
            <span
              className={`text-xs font-mono px-3 py-1 rounded-full shadow-lg border ${
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
                ? '⏸ PAUSED (Press Spacebar)'
                : '▶ AUTO-SCROLLING (Spacebar to Pause)'}
            </span>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="p-6 pt-4 shrink-0 flex justify-center border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-8 py-2.5 rounded-xl font-bold text-sm transition-all duration-200
              bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500
              text-amber-100 shadow-lg shadow-amber-900/30"
          >
            Begin Your Journey →
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpeningStoryModal;
