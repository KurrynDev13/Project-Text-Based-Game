// InteractiveOnboardingTutorial.tsx
// Comprehensive 14-step spotlight-based onboarding tutorial for Maharlika: Legends of the Archipelago.
// Teaches new players top HUD stats, Poblacion Sanctuary districts, forced Forge/Alchemist interactions,
// and all bottom navigation bar tabs.

import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { NavTab } from './Navbar';

export interface OnboardingStep {
  id: string;
  targetId?: string; // data-tutorial-target value
  title: string;
  icon: string;
  description: string;
  tip?: string;
  isForcedAction?: boolean;
  forcedActionLabel?: string;
  districtToSwitch?: 'TAVERN' | 'FORGE' | 'ALCHEMIST' | 'STABLES' | 'GATE' | 'STASH';
  tabToSwitch?: NavTab;
}

interface InteractiveOnboardingTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
  onSelectDistrict: (district: 'TAVERN' | 'FORGE' | 'ALCHEMIST' | 'STABLES' | 'GATE' | 'STASH') => void;
  onSelectTab: (tab: NavTab) => void;
}

const STEPS: OnboardingStep[] = [
  {
    id: 'hud',
    targetId: 'persistent-hud',
    icon: '📊',
    title: 'Top Persistent HUD & Currencies',
    description:
      'Keep a close eye on your Hero Level, HP, MP, and Stamina here. Stamina is spent during world exploration and combat actions.',
    tip: 'Pre-Colonial Currency: Cowrie Shells (Base), Silver Pieces (100:1), Gold Ingots (10,000:1), and Mutya Shards (Magic Rerolls).',
    districtToSwitch: 'TAVERN',
    tabToSwitch: 'HAVEN',
  },
  {
    id: 'town-banner',
    targetId: 'town-banner',
    icon: '🏰',
    title: 'Poblacion Sanctuary (Town Hub)',
    description:
      'Welcome to Poblacion Sanctuary—the central safe zone of Maharlika. Here you can rest, accept bounties, buy gear, and brew shamanic potions.',
    tip: 'Your Stamina slowly regenerates while staying inside the Sanctuary safe zone.',
    districtToSwitch: 'TAVERN',
    tabToSwitch: 'HAVEN',
  },
  {
    id: 'inn',
    targetId: 'inn-card',
    icon: '🍺',
    title: 'Sanctuary Inn & Shaman\'s Hearth',
    description:
      'Pay 5 Silver Shillings (500 CC) at the Inn to fully recover your Health and Mana, cleanse all active debuffs (Bleed/Burn), and restore +5 Stamina.',
    tip: 'Resting before heading out into high-level monster territory ensures survival.',
    districtToSwitch: 'TAVERN',
    tabToSwitch: 'HAVEN',
  },
  {
    id: 'tavern-bounties',
    targetId: 'tavern-card',
    icon: '📜',
    title: 'Ancestral Notice Board & Bounties',
    description:
      'Reaching Character Level 3 unlocks the Bounty Board! Accept up to 3 active contracts concurrently to hunt dangerous beasts for Cowries, EXP, and Mutya Shards.',
    tip: 'Bounty rewards scale with your character level and unlocked Archipelago Acts.',
    districtToSwitch: 'TAVERN',
    tabToSwitch: 'HAVEN',
  },
  {
    id: 'forge-view',
    targetId: 'district-forge',
    icon: '⚒️',
    title: 'Panday Pira\'s Ancient Forge',
    description:
      'Panday Pira crafts 10 tiers of pre-colonial weapons and armor (Kampilan swords, Balisong daggers, Pinaka bows, & Staves). You can also use Mutya Shards to re-bless equipment affixes!',
    tip: 'Always compare gear stats (Armor & Avg Atk) against your currently equipped items.',
    districtToSwitch: 'FORGE',
    tabToSwitch: 'HAVEN',
  },
  {
    id: 'alchemist-view',
    targetId: 'district-alchemist',
    icon: '🧪',
    title: 'Shamanic Alchemist Apothecary',
    description:
      'Stock up on Healing Herbs, Shamanic Mana Tonics, and Stamina Elixirs before embarking on dangerous expeditions into wilderness acts.',
    tip: 'Consumables can be used directly from your inventory during turn-based combat.',
    districtToSwitch: 'ALCHEMIST',
    tabToSwitch: 'HAVEN',
  },
  {
    id: 'navbar-overview',
    targetId: 'navbar-bottom',
    icon: '🧭',
    title: 'Global Navigation Bar',
    description:
      'Use the ergonomic navigation bar at the bottom to seamlessly switch between Haven Town Hub, World Exploration, Inventory, Character Stats, and Battle Logs.',
    districtToSwitch: 'TAVERN',
    tabToSwitch: 'HAVEN',
  },
  {
    id: 'tab-world',
    targetId: 'nav-tab-world',
    icon: '🌌',
    title: 'World / Hunt Tab (Exploration & Combat)',
    description:
      'Embark on an epic journey across the vast pre-colonial archipelago! Venture into uncharted wildlands, confront ancient mythic beasts, and challenge powerful Act Guardians to unlock dangerous new realms.',
    tip: 'Defeating each Act Guardian Boss unlocks access to the next Act.',
    tabToSwitch: 'WORLD',
  },
  {
    id: 'tab-inventory',
    targetId: 'nav-tab-inventory',
    icon: '🎒',
    title: 'Inventory & Gear Bag Tab',
    description:
      'Manage your paper-doll equipment slots, inventory backpack, and Vault Stash. Decrypt Encrypted Memory Shards acquired from bounties to reveal rare artifacts.',
    tip: 'Increasing your Strength (STR) attribute increases your maximum inventory capacity!',
    tabToSwitch: 'INVENTORY',
  },
  {
    id: 'tab-character',
    targetId: 'nav-tab-character',
    icon: '👤',
    title: 'Hero Character Sheet & Skill Tree',
    description:
      'Allocate Attribute Points (STR, AGI, INT, VIT) gained on level-up. Unlock and equip class-specific active skills and passive masteries.',
    tip: 'STR boosts physical damage, AGI boosts dodge & crit, INT boosts magic & max MP, VIT boosts max HP & armor.',
    tabToSwitch: 'CHARACTER',
  },
  {
    id: 'tab-log',
    targetId: 'nav-tab-log',
    icon: '📜',
    title: 'Log & Chat Tab (Quests & Lore)',
    description:
      'Track your Active Monster Bounties, regional Act Side Quests, detailed battle history logs, and pre-colonial folklore records.',
    tip: 'Remember to complete all 3 side quests in an Act before advancing, or uncompleted side quests become permanently forfeited!',
    tabToSwitch: 'LOG',
  },
  {
    id: 'completion',
    icon: '🗡️',
    title: 'You are Ready, Maharlika!',
    description:
      'You have mastered the fundamentals of Maharlika: Legends of the Archipelago. Step into the Whispering Balete Forest and carve your legend!',
    tip: 'You can replay this tutorial anytime from the Town Hub or Log tab.',
    tabToSwitch: 'HAVEN',
    districtToSwitch: 'TAVERN',
  },
];

export const InteractiveOnboardingTutorial: React.FC<InteractiveOnboardingTutorialProps> = ({
  onComplete,
  onSkip,
  onSelectDistrict,
  onSelectTab,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  // Measure target DOM element bounding box
  const updateTargetRect = useCallback(() => {
    if (!currentStep.targetId) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(`[data-tutorial-target="${currentStep.targetId}"]`);
    if (element) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 20 && rect.height > 20) {
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  }, [currentStep.targetId]);

  useLayoutEffect(() => {
    updateTargetRect();

    // Scroll target element into view if available
    if (currentStep.targetId) {
      const element = document.querySelector(`[data-tutorial-target="${currentStep.targetId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    // Schedule re-checks to account for district switching and React DOM mounting delays
    const t1 = setTimeout(updateTargetRect, 50);
    const t2 = setTimeout(updateTargetRect, 180);
    const t3 = setTimeout(updateTargetRect, 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [updateTargetRect, currentStepIndex, currentStep.targetId]);

  // Handle window resize & scroll
  useEffect(() => {
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);
    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [updateTargetRect]);

  // Handle navigation
  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    const nextStep = STEPS[nextIndex];

    if (nextStep?.districtToSwitch) {
      onSelectDistrict(nextStep.districtToSwitch);
    }

    if (nextStep?.tabToSwitch) {
      onSelectTab(nextStep.tabToSwitch);
    }

    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex(nextIndex);
    }
  };

  const handlePrev = () => {
    if (isFirstStep) return;
    const prevIndex = currentStepIndex - 1;
    const prevStep = STEPS[prevIndex];

    if (prevStep?.districtToSwitch) {
      onSelectDistrict(prevStep.districtToSwitch);
    }
    if (prevStep?.tabToSwitch) {
      onSelectTab(prevStep.tabToSwitch);
    }

    setCurrentStepIndex(prevIndex);
  };

  const handleSpotlightClick = () => {
    if (currentStep.isForcedAction) {
      handleNext();
    }
  };

  // Compute position for the popover tooltip card relative to target Rect
  const getPopoverStyle = (): React.CSSProperties => {
    const isValid = Boolean(targetRect && targetRect.width > 20 && targetRect.height > 20);

    if (!isValid || !targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed',
        width: `${Math.min(window.innerWidth - 32, 440)}px`,
      };
    }

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    const spaceBelow = windowHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;

    let topPosition: number;
    // If target is in lower portion of screen (e.g. bottom navbar, tabs, or district cards), position popover card near top (24px)
    // so bottom target & navbar remain 100% visible and completely unobscured.
    if (targetRect.top > windowHeight / 2 || targetRect.bottom > windowHeight - 160) {
      topPosition = 24;
    } else if (spaceBelow >= 300) {
      topPosition = targetRect.bottom + 16;
    } else {
      topPosition = Math.max(24, targetRect.top - 360);
    }

    // Ensure popover top position stays strictly inside visible bounds
    topPosition = Math.max(16, topPosition);

    const targetCenterX = targetRect.left + targetRect.width / 2;
    const popoverWidth = Math.min(windowWidth - 32, 440);
    let leftPosition = targetCenterX - popoverWidth / 2;

    leftPosition = Math.max(16, Math.min(leftPosition, windowWidth - popoverWidth - 16));

    return {
      top: `${topPosition}px`,
      left: `${leftPosition}px`,
      width: `${popoverWidth}px`,
      position: 'fixed',
    };
  };

  const hasValidSpotlight = Boolean(targetRect && targetRect.width > 20 && targetRect.height > 20);

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden select-none pointer-events-none">
      {/* ── Dark Fallback Backdrop when no spotlight rect is active ── */}
      {!hasValidSpotlight && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-[2px] transition-opacity duration-300 pointer-events-auto" />
      )}

      {/* ── True Hole-Punch Glowing Spotlight over target element ── */}
      {hasValidSpotlight && targetRect && (
        <div
          onClick={handleSpotlightClick}
          className="fixed transition-all duration-300 rounded-xl pointer-events-auto cursor-pointer z-[101] border-2 border-amber-400 ring-4 ring-amber-500/40"
          style={{
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
            boxShadow: '0 0 0 9999px rgba(9, 9, 11, 0.82), 0 0 25px rgba(251, 191, 36, 0.6)',
          }}
        >
          {/* Label badge for forced action targets */}
          {currentStep.isForcedAction && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-amber-500 text-zinc-950 text-[11px] font-mono font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
              👉 {currentStep.forcedActionLabel || 'Tap Here'}
            </div>
          )}
        </div>
      )}

      {/* ── Popover Tooltip Card ── */}
      <div
        style={getPopoverStyle()}
        className="pointer-events-auto z-[102] bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-amber-600/70 rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-fade-in"
      >
        {/* Header Row */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-amber-500 font-mono text-xs font-bold uppercase tracking-wider">
              INSTRUCTIVE ONBOARDING · STEP {currentStepIndex + 1} OF {STEPS.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-mono text-zinc-400 hover:text-amber-300 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700 min-h-[36px]"
          >
            Skip Tutorial ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-amber-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content Box */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <span className="text-3xl drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]">{currentStep.icon}</span>
            <h3 className="font-serif text-lg font-bold text-amber-200 leading-tight">
              {currentStep.title}
            </h3>
          </div>

          <p className="text-zinc-300 text-xs leading-relaxed font-sans">
            {currentStep.description}
          </p>

          {currentStep.tip && (
            <div className="flex gap-2.5 px-3 py-2.5 bg-amber-950/60 border border-amber-700/50 rounded-xl">
              <span className="text-amber-400 text-sm shrink-0">💡</span>
              <p className="text-amber-200 text-[11px] leading-snug font-sans">{currentStep.tip}</p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={handlePrev}
            disabled={isFirstStep}
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-mono font-bold text-zinc-400 hover:text-amber-200 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700 transition-all"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            className={`flex-1 min-h-[44px] px-5 py-2.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center space-x-2 ${
              currentStep.isForcedAction
                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 ring-2 ring-amber-300 animate-pulse'
                : 'bg-amber-600 hover:bg-amber-500 text-zinc-950 shadow-amber-900/30'
            }`}
          >
            <span>{isLastStep ? 'Complete Tutorial ✓' : currentStep.isForcedAction ? currentStep.forcedActionLabel : 'Next Step →'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InteractiveOnboardingTutorial;

