// CharacterCreationModal.tsx
// Full-screen 2-step character creation modal for Maharlika: Legends of the Archipelago.
// Step 1: Responsive Horizontal Card Carousel for Class Selection (No vertical scrolling needed).
// Step 2: Hero name input with validated submission.

import React, { useState, useRef, useEffect } from 'react';
import { HeroClass } from '../types/game';
import { soundFX } from '../utils/audio';
import { getHeroImageUrl } from '../utils/assetHelper';

export type { HeroClass };

interface ClassInfo {
  heroClass: HeroClass;
  icon: string;
  title: string;
  subtitle: string;
  primaryStat: string;
  weaponType: string;
  description: string;
  startingStats: { str: number; agi: number; int: number; vit: number };
}

interface CharacterCreationModalProps {
  onComplete: (heroClass: HeroClass, name: string) => void;
  onCancel?: () => void;
}

const CLASS_DATA: ClassInfo[] = [
  {
    heroClass: 'Mandirigma',
    icon: '⚔️',
    title: 'Mandirigma',
    subtitle: 'Battle-Hardened Warrior',
    primaryStat: 'STR',
    weaponType: 'Swords & Cleavers',
    description:
      'A fearless warrior who fights with overwhelming force and Kampilan blade mastery. Built for frontline combat.',
    startingStats: { str: 14, agi: 9, int: 8, vit: 14 },
  },
  {
    heroClass: 'Bagani',
    icon: '🌑',
    title: 'Bagani',
    subtitle: 'Shadow Blade of the Night',
    primaryStat: 'AGI',
    weaponType: 'Daggers & Balisong',
    description:
      'A silent predator who strikes from the darkness with lethal precision and Balisong flurry techniques.',
    startingStats: { str: 9, agi: 15, int: 10, vit: 11 },
  },
  {
    heroClass: 'Mangangaso',
    icon: '🏹',
    title: 'Mangangaso',
    subtitle: 'Forest Hunter & Tracker',
    primaryStat: 'AGI',
    weaponType: 'Bows & Blowguns',
    description:
      'A skilled hunter who commands the battlefield from range, delivering poison darts and precise Pinaka bow shots.',
    startingStats: { str: 10, agi: 14, int: 11, vit: 10 },
  },
  {
    heroClass: 'Babaylan',
    icon: '🌿',
    title: 'Babaylan',
    subtitle: 'Spirit Shaman & Healer',
    primaryStat: 'INT',
    weaponType: 'Staves & Wands',
    description:
      'A powerful shaman who channels ancestor spirits and divine magic to heal allies and smite the profane.',
    startingStats: { str: 8, agi: 9, int: 16, vit: 12 },
  },
];

/** Validates hero name: 2–24 letters, spaces, and apostrophes */
function isValidName(name: string): boolean {
  return /^[A-Za-z ']{2,24}$/.test(name.trim());
}

const StatBar: React.FC<{ label: string; value: number; max?: number }> = ({
  label,
  value,
  max = 16,
}) => (
  <div className="flex items-center gap-1.5 text-[10px]">
    <span className="w-6 text-amber-400 font-mono font-bold">{label}</span>
    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-300"
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
    <span className="w-4 text-amber-300 font-mono text-right font-semibold">{value}</span>
  </div>
);

export const CharacterCreationModal: React.FC<CharacterCreationModalProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedClassIndex, setSelectedClassIndex] = useState<number>(0);
  const [heroName, setHeroName] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(500);

  // Measure container width for dynamic responsive centering
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [step]);

  // Dimensions
  const isMobile = containerWidth < 640;
  const cardWidth = isMobile ? Math.min(280, containerWidth - 48) : 320;
  const cardGap = isMobile ? 12 : 18;

  // Touch Swipe Handling for Carousel
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 25) {
      if (diffX < 0 && selectedClassIndex < CLASS_DATA.length - 1) {
        soundFX.playClickSound();
        setSelectedClassIndex(selectedClassIndex + 1);
      } else if (diffX > 0 && selectedClassIndex > 0) {
        soundFX.playClickSound();
        setSelectedClassIndex(selectedClassIndex - 1);
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Keyboard Navigation (Arrow Keys)
  useEffect(() => {
    if (step !== 1) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && selectedClassIndex > 0) {
        soundFX.playClickSound();
        setSelectedClassIndex((prev) => prev - 1);
      } else if (e.key === 'ArrowRight' && selectedClassIndex < CLASS_DATA.length - 1) {
        soundFX.playClickSound();
        setSelectedClassIndex((prev) => prev + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, selectedClassIndex]);

  const activeClass = CLASS_DATA[selectedClassIndex];
  const nameValid = isValidName(heroName);

  const handleConfirmClass = () => {
    soundFX.playClickSound();
    setStep(2);
  };

  const handleBeginLegend = () => {
    if (activeClass && nameValid) {
      soundFX.playLevelUpSound();
      onComplete(activeClass.heroClass, heroName.trim());
    }
  };

  // Centering translation calculation
  const centerOffset = containerWidth / 2 - (selectedClassIndex * (cardWidth + cardGap) + cardWidth / 2);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in select-none">
      <div className="bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 border-2 border-amber-600/70 rounded-2xl max-w-xl w-full p-3 sm:p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between max-h-[96vh]">
        {/* Cancel / Close button if cancel is provided */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-200 text-lg w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center z-30"
            title="Cancel"
          >
            ✕
          </button>
        )}

        {/* ── STEP 1: CLASS SELECTION CAROUSEL ─────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-col items-center w-full space-y-2">
            {/* Header */}
            <div className="text-center space-y-0.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500 font-bold">
                HERITAGE OF THE ARCHIPELAGO
              </span>
              <h1 className="font-serif text-amber-200 text-xl sm:text-2xl font-bold tracking-wide">
                Choose Your Hero Class
              </h1>
              <p className="text-zinc-400 text-xs hidden sm:block">
                Swipe or click cards to choose your pre-colonial fighting discipline.
              </p>
            </div>

            {/* Horizontal Carousel Stage */}
            <div
              ref={containerRef}
              className="w-full h-[370px] xs:h-[390px] sm:h-[410px] relative overflow-hidden flex items-center touch-pan-y"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="flex items-center transition-transform duration-300 ease-out will-change-transform h-full"
                style={{
                  transform: `translateX(${centerOffset}px)`,
                  gap: `${cardGap}px`,
                }}
              >
                {CLASS_DATA.map((cls, idx) => {
                  const isActive = idx === selectedClassIndex;
                  const heroImg = getHeroImageUrl(cls.heroClass);

                  return (
                    <div
                      key={cls.heroClass}
                      onClick={() => {
                        if (!isActive) {
                          soundFX.playClickSound();
                          setSelectedClassIndex(idx);
                        }
                      }}
                      style={{ width: `${cardWidth}px` }}
                      className={`h-[355px] xs:h-[375px] sm:h-[395px] shrink-0 rounded-2xl p-3 sm:p-4 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
                        isActive
                          ? 'scale-100 opacity-100 z-20 shadow-[0_10px_35px_rgba(0,0,0,0.9)] ring-2 ring-amber-500/80 border-2 border-amber-500 bg-zinc-950/90'
                          : 'scale-[0.90] opacity-40 hover:opacity-75 z-10 cursor-pointer border border-zinc-800 bg-zinc-950/60'
                      }`}
                    >
                      {/* Active Ambient Glow */}
                      {isActive && (
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
                      )}

                      {/* Card Header: Icon, Title & Primary Stat */}
                      <div className="flex justify-between items-center relative z-10">
                        <div className="flex items-center gap-2">
                          <span className="text-xl sm:text-2xl">{cls.icon}</span>
                          <div>
                            <h3 className="font-serif font-bold text-base sm:text-lg text-amber-200 leading-tight">
                              {cls.title}
                            </h3>
                            <span className="text-[9px] sm:text-[10px] font-mono text-zinc-400">
                              {cls.subtitle}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600/50">
                          {cls.primaryStat}
                        </span>
                      </div>

                      {/* Hero Portrait Banner */}
                      <div className="w-full h-24 xs:h-28 sm:h-32 rounded-xl overflow-hidden relative border border-zinc-800 my-1 shadow-inner group">
                        <img
                          src={heroImg}
                          alt={cls.title}
                          className="w-full h-full object-cover object-center filter contrast-105 group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                        <div className="absolute bottom-1 left-2 text-[9px] font-mono text-amber-300/90">
                          ⚔️ {cls.weaponType}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-[10px] font-mono text-zinc-300 leading-tight line-clamp-2 px-0.5">
                        {cls.description}
                      </p>

                      {/* Starting Stats Distribution */}
                      <div className="bg-zinc-900/80 border border-zinc-800/80 p-2 rounded-xl space-y-1">
                        <div className="text-[9px] font-mono uppercase text-zinc-400 font-semibold tracking-wider">
                          Base Attributes
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                          <StatBar label="STR" value={cls.startingStats.str} />
                          <StatBar label="AGI" value={cls.startingStats.agi} />
                          <StatBar label="INT" value={cls.startingStats.int} />
                          <StatBar label="VIT" value={cls.startingStats.vit} />
                        </div>
                      </div>

                      {/* Card Bottom CTA */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isActive) {
                            handleConfirmClass();
                          } else {
                            soundFX.playClickSound();
                            setSelectedClassIndex(idx);
                          }
                        }}
                        className={`w-full py-2 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all min-h-[38px] flex items-center justify-center mt-1 ${
                          isActive
                            ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 shadow-lg shadow-amber-950/70 active:scale-95'
                            : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                      >
                        {isActive ? `Choose ${cls.title} ➔` : 'Inspect Class'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pagination Controls & Dots */}
            <div className="flex items-center space-x-2 pt-0.5">
              <button
                onClick={() => {
                  if (selectedClassIndex > 0) {
                    soundFX.playClickSound();
                    setSelectedClassIndex(selectedClassIndex - 1);
                  }
                }}
                disabled={selectedClassIndex === 0}
                className="w-7 h-7 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-sm font-mono border border-zinc-800"
              >
                ‹
              </button>

              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-zinc-900/90 rounded-full border border-zinc-800">
                {CLASS_DATA.map((cls, idx) => (
                  <button
                    key={cls.heroClass}
                    onClick={() => {
                      soundFX.playClickSound();
                      setSelectedClassIndex(idx);
                    }}
                    title={cls.title}
                    className={`transition-all rounded-full ${
                      idx === selectedClassIndex
                        ? 'w-6 h-2 bg-gradient-to-r from-amber-500 to-amber-400 shadow-sm'
                        : 'w-2 h-2 bg-zinc-700 hover:bg-zinc-500'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={() => {
                  if (selectedClassIndex < CLASS_DATA.length - 1) {
                    soundFX.playClickSound();
                    setSelectedClassIndex(selectedClassIndex + 1);
                  }
                }}
                disabled={selectedClassIndex === CLASS_DATA.length - 1}
                className="w-7 h-7 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-sm font-mono border border-zinc-800"
              >
                ›
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: NAME INPUT ───────────────────────────────────────────── */}
        {step === 2 && activeClass && (
          <div className="p-2 sm:p-4 space-y-4 animate-fade-in">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500 font-bold">
                INSCRIBE THE ANCESTRAL SCROLL
              </span>
              <h2 className="font-serif text-amber-200 text-2xl font-bold tracking-wide">
                Name Your Hero
              </h2>
            </div>

            {/* Selected Class Preview Card */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-700/60 bg-zinc-900/90">
              <img
                src={getHeroImageUrl(activeClass.heroClass)}
                alt={activeClass.title}
                className="w-14 h-14 rounded-lg object-cover border border-amber-500/60"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base">{activeClass.icon}</span>
                  <p className="font-serif text-amber-200 font-bold text-base leading-tight">
                    {activeClass.title}
                  </p>
                </div>
                <p className="text-zinc-400 text-xs">{activeClass.subtitle}</p>
                <p className="text-[10px] font-mono text-amber-400 mt-0.5">
                  Proficiency: {activeClass.weaponType}
                </p>
              </div>
              <div className="ml-auto text-xs bg-amber-950 text-amber-300 px-2 py-1 rounded font-mono font-bold border border-amber-600/40">
                {activeClass.primaryStat}
              </div>
            </div>

            {/* Name Input Box */}
            <div className="space-y-2">
              <label htmlFor="hero-name" className="block font-serif text-amber-300 text-sm font-semibold">
                What is your name, warrior of the islands?
              </label>
              <input
                id="hero-name"
                type="text"
                value={heroName}
                onChange={(e) => setHeroName(e.target.value)}
                placeholder="Enter your hero's name (e.g., Alunsina, Urduja, Lapu)..."
                maxLength={24}
                autoFocus
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 outline-none text-amber-100 placeholder-zinc-500 text-sm font-mono transition-colors"
              />

              {heroName.length > 0 && !nameValid && (
                <p className="text-red-400 text-xs font-mono">
                  Name must be 2–24 characters (letters, spaces, and apostrophes only).
                </p>
              )}
              <p className="text-zinc-500 text-[11px] font-mono">
                2–24 characters · Letters, spaces, apostrophes permitted
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="min-h-[44px] px-5 py-2 rounded-xl text-sm text-zinc-400 hover:text-amber-200 bg-zinc-900 border border-zinc-800 transition-colors"
              >
                ← Change Class
              </button>

              <button
                type="button"
                onClick={handleBeginLegend}
                disabled={!nameValid}
                className="min-h-[44px] px-6 py-2.5 rounded-xl font-mono font-bold text-sm uppercase tracking-wider transition-all bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-950/60 active:scale-95"
              >
                Begin Your Legend ➔
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterCreationModal;
