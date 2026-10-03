import React, { useRef, useState, useEffect } from 'react';
import { soundFX } from '../utils/audio';
import { formatPreColonialCurrencyBadge } from './ForgePurchaseModal';

export interface RestOption {
  actId: string;
  actName: string;
  title: string;
  minLevel: number;
  costInCC: number;
  hpPercent: number;
  mpPercent: number;
  staminaRestore: number;
  description: string;
  icon: string;
}

interface HearthRestCarouselProps {
  options: RestOption[];
  currentIndex: number;
  onChangeIndex: (index: number) => void;
  onRest: (option: RestOption) => void;
  playerLevel: number;
  playerCowries: number;
}

export const HearthRestCarousel: React.FC<HearthRestCarouselProps> = ({
  options,
  currentIndex,
  onChangeIndex,
  onRest,
  playerLevel,
  playerCowries,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);

  // Measure container width to dynamically center active card with responsive peeking cards
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Card dimensions tailored for mobile and desktop
  const isMobile = containerWidth < 640;
  const cardWidth = isMobile ? Math.min(270, containerWidth - 52) : 320;
  const cardGap = isMobile ? 12 : 18;

  // Touch swipe handling for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    // Only swipe if horizontal motion exceeds vertical motion
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
      if (diffX < 0 && currentIndex < options.length - 1) {
        soundFX.playClick();
        onChangeIndex(currentIndex + 1);
      } else if (diffX > 0 && currentIndex > 0) {
        soundFX.playClick();
        onChangeIndex(currentIndex - 1);
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Keyboard navigation support (Left/Right arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onChangeIndex(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < options.length - 1) {
        onChangeIndex(currentIndex + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, options.length, onChangeIndex]);

  // Center translation calculation
  const centerOffset = containerWidth / 2 - (currentIndex * (cardWidth + cardGap) + cardWidth / 2);

  return (
    <div className="w-full flex flex-col items-center justify-center select-none py-0.5">
      {/* ─── HORIZONTAL CAROUSEL STAGE ────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="w-full h-[300px] xs:h-[320px] sm:h-[360px] md:h-[400px] relative overflow-hidden flex items-center touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Sliding Track containing all 8 Hearth Cards */}
        <div
          className="flex items-center transition-transform duration-300 ease-out will-change-transform h-full"
          style={{
            transform: `translateX(${centerOffset}px)`,
            gap: `${cardGap}px`,
          }}
        >
          {options.map((option, index) => {
            const isActive = index === currentIndex;
            const isUnlocked = playerLevel >= option.minLevel;
            const canAfford = playerCowries >= option.costInCC;
            const price = formatPreColonialCurrencyBadge(option.costInCC);

            return (
              <div
                key={option.actId}
                onClick={() => {
                  if (!isActive) {
                    soundFX.playClick();
                    onChangeIndex(index);
                  }
                }}
                style={{ width: `${cardWidth}px` }}
                className={`h-[285px] xs:h-[305px] sm:h-[345px] md:h-[385px] shrink-0 rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
                  isActive
                    ? 'scale-100 opacity-100 z-20 shadow-[0_10px_35px_rgba(0,0,0,0.85)] ring-2 ring-amber-500/70 border-2 border-amber-500/80 bg-zinc-950/75 backdrop-blur-md'
                    : 'scale-[0.88] opacity-40 hover:opacity-75 z-10 cursor-pointer border border-zinc-800/80 bg-zinc-950/55 backdrop-blur-sm shadow-lg'
                }`}
              >
                {/* Ambient Radiant Glow for Active Card */}
                {isActive && (
                  <>
                    <div className="absolute -top-14 -left-14 w-36 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-14 -right-14 w-36 h-36 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
                  </>
                )}

                {/* Card Top: Act Ribbon & Unlock Status */}
                <div className="flex justify-between items-center relative z-10">
                  <span
                    className={`text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      isActive
                        ? 'bg-amber-950/90 text-amber-300 border-amber-600/50 shadow-inner'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    {option.actName} Hearth
                  </span>

                  <span
                    className={`text-[9px] sm:text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      isUnlocked
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/50'
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    {isUnlocked ? '✅ Unlocked' : `🔒 Min Lv. ${option.minLevel}`}
                  </span>
                </div>

                {/* Card Center: Atmospheric Icon Ring, Title & Stat Gain Grid */}
                <div className="flex flex-col items-center justify-center my-auto relative z-10 text-center space-y-1 sm:space-y-1.5">
                  {/* Illuminated Emblem Ring */}
                  <div
                    className={`w-12 h-12 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl md:text-4xl transition-all shadow-inner ${
                      isActive
                        ? 'bg-gradient-to-br from-amber-500/20 via-zinc-900 to-zinc-950 border border-amber-500/60 shadow-amber-950/40 ring-1 ring-amber-500/30'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
                    }`}
                  >
                    {option.icon}
                  </div>

                  <div>
                    <h4
                      className={`font-serif font-bold text-xs xs:text-sm sm:text-base md:text-lg tracking-wide ${
                        isActive ? 'text-white' : 'text-zinc-400'
                      }`}
                    >
                      {option.title}
                    </h4>
                    <div className="text-[9px] font-mono text-amber-400/80 uppercase tracking-widest mt-0.5">
                      Sanctuary Rite
                    </div>
                  </div>

                  {/* Restorative Stat Badges */}
                  <div className="flex flex-wrap items-center justify-center gap-1 pt-0.5">
                    <span className="text-[8px] xs:text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-lg bg-red-950/80 text-red-300 border border-red-800/40 shadow-sm">
                      💚 +{Math.round(option.hpPercent * 100)}% HP
                    </span>
                    <span className="text-[8px] xs:text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-lg bg-cyan-950/80 text-cyan-300 border border-cyan-800/40 shadow-sm">
                      💙 +{Math.round(option.mpPercent * 100)}% MP
                    </span>
                    <span className="text-[8px] xs:text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800/40 shadow-sm">
                      ⚡ +{option.staminaRestore} Stamina
                    </span>
                  </div>

                  {/* Narrative Flavor Text */}
                  <p
                    className={`text-[9px] sm:text-[10px] md:text-[11px] font-mono px-2 leading-tight sm:leading-relaxed max-w-xs italic line-clamp-2 ${
                      isActive ? 'text-zinc-300' : 'text-zinc-500'
                    }`}
                  >
                    "{option.description}"
                  </p>
                </div>

                {/* Card Bottom: Tribute Breakdown & Rest Action Button */}
                <div className="pt-1.5 sm:pt-2 border-t border-zinc-800/80 space-y-1 sm:space-y-1.5 relative z-10">
                  <div className="flex justify-between items-center text-[10px] sm:text-xs font-mono">
                    <span className="text-zinc-400 uppercase font-semibold">Tribute:</span>
                    <span className="text-amber-300 font-bold">{price.formatted}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isActive && isUnlocked && canAfford) {
                        onRest(option);
                      } else if (!isActive) {
                        soundFX.playClick();
                        onChangeIndex(index);
                      }
                    }}
                    disabled={isActive && (!isUnlocked || !canAfford)}
                    className={`w-full py-1.5 sm:py-2.5 rounded-xl font-mono font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all shadow-lg min-h-[38px] sm:min-h-[44px] flex items-center justify-center ${
                      !isActive
                        ? 'bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-700'
                        : !isUnlocked
                        ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                        : !canAfford
                        ? 'bg-zinc-900 text-red-400 border border-red-900/50 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 shadow-amber-950/60 active:scale-95'
                    }`}
                  >
                    {!isActive
                      ? 'Select Hearth ➔'
                      : !isUnlocked
                      ? `Locked (Lv. ${option.minLevel})`
                      : !canAfford
                      ? 'Insufficient Tribute'
                      : `Rest at Hearth (${price.formatted})`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── BOTTOM CAROUSEL CONTROLS & PAGINATION (ONLY SHOWN IF MULTIPLE HEARTHS UNLOCKED) ─ */}
      {options.length > 1 && (
        <>
          <div className="flex items-center justify-center space-x-2.5 mt-1 sm:mt-1.5 shrink-0 z-30">
            {/* Previous Button */}
            <button
              onClick={() => {
                if (currentIndex > 0) {
                  soundFX.playClick();
                  onChangeIndex(currentIndex - 1);
                }
              }}
              disabled={currentIndex === 0}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base font-mono border border-zinc-800 shadow-md transition-all active:scale-90"
              aria-label="Previous Hearth"
            >
              ‹
            </button>

            {/* Pagination Indicators with Act Tooltips */}
            <div className="flex items-center space-x-1 sm:space-x-1.5 px-2 py-0.5 sm:py-1 bg-zinc-900/90 rounded-full border border-zinc-800">
              {options.map((opt, i) => (
                <button
                  key={opt.actId}
                  onClick={() => {
                    soundFX.playClick();
                    onChangeIndex(i);
                  }}
                  title={`${opt.actName}: ${opt.title}`}
                  className={`transition-all rounded-full ${
                    i === currentIndex
                      ? 'w-5 sm:w-6 h-1.5 sm:h-2 bg-gradient-to-r from-amber-500 to-amber-400 shadow-sm shadow-amber-400/50'
                      : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-zinc-700 hover:bg-zinc-500'
                  }`}
                  aria-label={`Go to Hearth ${i + 1}`}
                />
              ))}
            </div>

            {/* Next Button */}
            <button
              onClick={() => {
                if (currentIndex < options.length - 1) {
                  soundFX.playClick();
                  onChangeIndex(currentIndex + 1);
                }
              }}
              disabled={currentIndex === options.length - 1}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base font-mono border border-zinc-800 shadow-md transition-all active:scale-90"
              aria-label="Next Hearth"
            >
              ›
            </button>
          </div>

          <div className="text-[9px] font-mono text-zinc-500 mt-0.5 hidden xs:block">
            Swipe or click peeking cards to view Act Hearths
          </div>
        </>
      )}
    </div>
  );
};
export default HearthRestCarousel;

