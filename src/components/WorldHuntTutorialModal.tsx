// WorldHuntTutorialModal.tsx
// Dedicated one-time walkthrough for World Hunt exploration and tactical encounters.
// Teaches new players Venture vs Search, combat mechanics, cursed chests, wandering merchants, and Act Boss gates.
// Strictly adheres to Rule 5 (Anti-Spoiler protocol).

import React, { useState, useEffect } from 'react';
import { soundFX } from '../utils/audio';
import { registerBackHandler } from '../utils/navigationStack';

interface WorldHuntTutorialModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const WorldHuntTutorialModal: React.FC<WorldHuntTutorialModalProps> = ({ isOpen, onComplete }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) return;
    return registerBackHandler(() => {
      if (currentStep > 0) {
        setCurrentStep((prev) => prev - 1);
        return true;
      }
      handleFinish();
      return true;
    });
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const handleNext = () => {
    soundFX.playClickSound();
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    soundFX.playClickSound();
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    try {
      soundFX.playVictorySound();
    } catch (e) {
      console.warn('Audio play error in tutorial finish:', e);
    }
    try {
      localStorage.setItem('maharlika_world_hunt_tutorial_completed', 'true');
    } catch {
      // Ignore localStorage errors
    }
    onComplete();
  };

  const steps = [
    {
      stepNumber: 1,
      badge: 'EXPLORATION MODES',
      icon: '🧭',
      title: 'Scouting the Archipelago',
      description:
        'World exploration consumes Stamina (⚡). Choose your reconnaissance approach carefully based on your remaining vitality and tactical objectives.',
      mechanics: [
        {
          label: 'Venture Forward (1⚡ Stamina)',
          detail: 'Standard forward pace. High probability of encountering roaming wild beasts and regional enemies. Ideal for hunting contracts and steady progression.',
        },
        {
          label: 'Search Area (2⚡ Stamina)',
          detail: 'Deep reconnaissance of the surrounding canopy and terrain. Significantly increases the chance of discovering Cursed Spirit Chests, Wandering Merchants, and Ancestral Shrines.',
        },
      ],
    },
    {
      stepNumber: 2,
      badge: 'TACTICAL COMBAT',
      icon: '⚔️',
      title: 'Turn-Based Combat Arena',
      description:
        'When an enemy attacks, combat locks in turn-based mode. Manage your actions and vitality to conquer wild spirits and mythical beasts.',
      mechanics: [
        {
          label: '⚔️ Attack',
          detail: 'Deals direct physical or magical damage based on your primary attribute scaling (STR for melee, AGI for ranged, INT for spells).',
        },
        {
          label: '🛡️ Guard',
          detail: 'Reduces incoming enemy damage by 50% on the next turn, prevents critical strikes, and mitigates debilitating status effects.',
        },
        {
          label: '🎒 Items & 🏃 Flee',
          detail: 'Drink healing herbs or mana tonics directly in battle. Fleeing gives up to 2 escape attempts based on your Agility (AGI).',
        },
      ],
    },
    {
      stepNumber: 3,
      badge: 'SPECIAL ENCOUNTERS',
      icon: '🔮',
      title: 'Chests, Merchants & Shrines',
      description:
        'Wildlands hold unpredictable ancient anomalies. How you interact with them can yield divine wealth or deadly curses.',
      mechanics: [
        {
          label: '🔮 Cursed Spirit Chests',
          detail: 'Sacrifice your own Health (HP) or Mana (MP) to appease the ancestral seal. High chance for massive Cowrie Shells, Mutya Shards, and gear; but beware of cursed backfires!',
        },
        {
          label: '🛍️ Wandering Merchants',
          detail: 'Nomadic traders offer deeply discounted pre-colonial equipment out in the wild. Buy on the spot or pass safely.',
        },
        {
          label: '⛩️ Ancestral Spirit Shrines',
          detail: 'Blessed sanctuaries that replenish your health, bestow spiritual buffs, or grant sacred Mutya Pearls.',
        },
      ],
    },
    {
      stepNumber: 4,
      badge: 'PROGRESSION RULES',
      icon: '👑',
      title: 'Act Guardians & 3 Mandatory Quests',
      description:
        'Each regional Act is ruled by a legendary Act Guardian Boss. Advancing to new lands requires overcoming ancient rites of passage.',
      mechanics: [
        {
          label: '👑 Mandatory Act Boss Victory',
          detail: 'You must confront and defeat each regional Act Guardian to unlock access to subsequent Acts. Bosses remain shrouded in mystery until discovered, and require a minimum Character Level & Power Rating.',
        },
        {
          label: '📜 3 Mandatory Side Quests & Forfeit Gate',
          detail: 'Each Act contains exactly 3 side quests. All 3 must be completed before entering the next Act. If you advance past an Act with uncompleted side quests, they become permanently forfeited!',
        },
      ],
    },
  ];

  const current = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none animate-fade-in font-sans">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-amber-600/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* TOP BANNER */}
        <div className="bg-zinc-950/90 border-b border-amber-900/60 p-3 sm:p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">{current.icon}</span>
            <div>
              <span className="text-[9px] sm:text-[10px] font-mono uppercase font-bold tracking-widest text-amber-500 block">
                WORLD HUNT TUTORIAL · STEP {current.stepNumber} OF 4
              </span>
              <h2 className="text-sm sm:text-base font-serif font-bold text-amber-100">
                {current.title}
              </h2>
            </div>
          </div>

          <button
            onClick={handleFinish}
            className="text-[10px] sm:text-xs font-mono text-zinc-400 hover:text-amber-300 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-colors cursor-pointer"
          >
            Skip ✕
          </button>
        </div>

        {/* PROGRESS STEPPER */}
        <div className="w-full bg-zinc-950 h-1 flex">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`flex-1 h-full transition-all duration-300 ${
                idx <= currentStep ? 'bg-amber-500' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>

        {/* BODY CONTENT */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1 text-xs sm:text-sm">
          <p className="text-zinc-300 text-[11px] sm:text-xs leading-relaxed">
            {current.description}
          </p>

          {/* Core Mechanics List */}
          <div className="space-y-2.5">
            {current.mechanics.map((mech, i) => (
              <div
                key={i}
                className="bg-zinc-950/90 p-3 rounded-xl border border-zinc-800 hover:border-amber-900/60 transition-all shadow-md"
              >
                <div className="font-mono font-bold text-[11px] sm:text-xs text-amber-300">
                  {mech.label}
                </div>
                <div className="text-[10.5px] sm:text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  {mech.detail}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM NAVIGATION FOOTER */}
        <div className="bg-zinc-950/95 border-t border-amber-900/60 p-3 sm:p-4 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-zinc-400 hover:text-amber-200 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700 transition-all cursor-pointer"
          >
            ← Previous
          </button>

          <button
            type="button"
            onClick={currentStep === 3 ? handleFinish : handleNext}
            className="flex-1 max-w-[200px] py-2 px-4 rounded-xl font-mono font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 shadow-lg shadow-amber-950/80 transition-all active:scale-95 text-center cursor-pointer"
          >
            {currentStep === 3 ? 'Start Hunting 🗡️' : 'Next Step →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorldHuntTutorialModal;

