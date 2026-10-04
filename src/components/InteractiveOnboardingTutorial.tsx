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

const getScrollParent = (node: HTMLElement | null): HTMLElement | Window => {
  if (!node) return window;
  let parent = node.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    const isScrollableStyle = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
    if (isScrollableStyle && parent.scrollHeight > parent.clientHeight + 2) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return window;
};

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

  // Measure target DOM element bounding box (filters for visible element when duplicate targets exist)
  const updateTargetRect = useCallback(() => {
    if (!currentStep.targetId) {
      setTargetRect(null);
      return;
    }

    if (currentStep.targetId === 'navbar-bottom') {
      const navEl = document.querySelector('[data-tutorial-target="navbar-bottom"]');
      const rect = navEl ? navEl.getBoundingClientRect() : null;
      const navTop = rect && rect.top > 0 ? rect.top : window.innerHeight - 56;
      const navHeight = rect && rect.height > 10 ? rect.height : 56;
      setTargetRect(new DOMRect(0, navTop, window.innerWidth, navHeight));
      return;
    }

    const elements = Array.from(document.querySelectorAll(`[data-tutorial-target="${currentStep.targetId}"]`));
    const visibleElement = elements.find((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 10 && rect.height > 10;
    });

    if (visibleElement) {
      const rect = visibleElement.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [currentStep.targetId]);

  useLayoutEffect(() => {
    const scrollToTarget = () => {
      if (!currentStep.targetId || currentStep.targetId === 'navbar-bottom') return;
      const elements = Array.from(document.querySelectorAll(`[data-tutorial-target="${currentStep.targetId}"]`));
      const targetEl = (elements.find((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 10 && rect.height > 10;
      }) || elements[0]) as HTMLElement | undefined;

      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        // If element is already nicely visible in the viewport, DO NOT scroll!
        const isAlreadyVisible = rect.top >= 70 && rect.bottom <= window.innerHeight - 65;
        if (isAlreadyVisible) {
          return;
        }

        // Only scroll if outside visible bounds, using nearest block alignment to prevent unnecessary jerks
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    };

    scrollToTarget();
    updateTargetRect();

    // Re-check target bounding box as smooth scroll animation finishes
    const t1 = setTimeout(updateTargetRect, 60);
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
    const isValid = Boolean(targetRect && targetRect.width > 10 && targetRect.height > 10);
    const isMobile = window.innerWidth < 768;
    const popoverWidth = Math.min(window.innerWidth - (isMobile ? 24 : 32), isMobile ? 350 : 440);

    if (!isValid || !targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed',
        width: `${popoverWidth}px`,
      };
    }

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    const bottomReserve = isMobile ? 65 : 80;

    let isPlacingAbove = false;
    let topPosition: number;

    const spaceBelow = windowHeight - targetRect.bottom - bottomReserve;

    if (isMobile) {
      // Place below if target is in the upper area (top < 240) OR if there is ample room below (>= 200px)
      if (targetRect.top < 240 || spaceBelow >= 200) {
        isPlacingAbove = false;
        topPosition = targetRect.bottom + 10;
      } else {
        isPlacingAbove = true;
        // Position card comfortably above target, ensuring it does not squeeze
        topPosition = Math.max(12, targetRect.top - 230);
      }
    } else {
      if (targetRect.top < 180 || spaceBelow >= 240) {
        isPlacingAbove = false;
        topPosition = targetRect.bottom + 12;
      } else {
        isPlacingAbove = true;
        topPosition = 24;
      }
    }

    // Give generous max-height so panel content is never squeezed or clipped
    const maxCardHeight = isPlacingAbove
      ? Math.max(220, targetRect.top - 20)
      : Math.max(220, windowHeight - topPosition - bottomReserve - 6);

    // Clamp top position safely inside visible bounds
    topPosition = Math.max(8, Math.min(topPosition, windowHeight - 160));

    const targetCenterX = targetRect.left + targetRect.width / 2;
    let leftPosition = targetCenterX - popoverWidth / 2;
    leftPosition = Math.max(8, Math.min(leftPosition, windowWidth - popoverWidth - 8));

    return {
      top: `${topPosition}px`,
      left: `${leftPosition}px`,
      width: `${popoverWidth}px`,
      maxHeight: `${maxCardHeight}px`,
      position: 'fixed',
    };
  };

  const hasValidSpotlight = Boolean(targetRect && targetRect.width > 10 && targetRect.height > 10);
  const isNavbarBottom = currentStep.targetId === 'navbar-bottom';

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
          className={`fixed transition-all duration-300 pointer-events-auto cursor-pointer z-[101] border-2 border-amber-400 ring-4 ring-amber-500/40 ${
            isNavbarBottom ? 'rounded-t-2xl' : 'rounded-xl'
          }`}
          style={{
            top: isNavbarBottom ? `${Math.max(0, targetRect.top - 4)}px` : `${Math.max(0, targetRect.top - 6)}px`,
            left: isNavbarBottom ? '0px' : `${Math.max(0, targetRect.left - 6)}px`,
            width: isNavbarBottom ? '100vw' : `${targetRect.width + 12}px`,
            height: isNavbarBottom ? `${window.innerHeight - targetRect.top + 4}px` : `${targetRect.height + 12}px`,
            boxShadow: '0 0 0 9999px rgba(9, 9, 11, 0.82), 0 0 25px rgba(251, 191, 36, 0.6)',
          }}
        >
          {/* Label badge for forced action targets */}
          {currentStep.isForcedAction && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-amber-500 text-zinc-950 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full shadow-lg whitespace-nowrap">
              👉 {currentStep.forcedActionLabel || 'Tap Here'}
            </div>
          )}
        </div>
      )}

      {/* ── Popover Tooltip Card ── */}
      <div
        style={getPopoverStyle()}
        className="pointer-events-auto z-[102] bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-amber-600/70 rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5 shadow-2xl space-y-1.5 md:space-y-3 overflow-y-auto animate-fade-in flex flex-col justify-between"
      >
        {/* Header Row */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-1 md:pb-3">
          <div className="flex items-center space-x-1.5 md:space-x-2">
            <span className="text-amber-500 font-mono text-[8px] md:text-xs font-bold uppercase tracking-wider">
              INSTRUCTIVE ONBOARDING · STEP {currentStepIndex + 1} OF {STEPS.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onSkip}
            className="text-[9px] md:text-xs font-mono text-zinc-400 hover:text-amber-300 px-1.5 py-0.5 md:px-2.5 md:py-1 rounded-md md:rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700 min-h-[24px] md:min-h-[36px]"
          >
            Skip ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-800 h-1 md:h-1.5 rounded-full overflow-hidden shrink-0">
          <div
            className="bg-amber-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content Box */}
        <div className="space-y-1 md:space-y-3">
          <div className="flex items-center space-x-1.5 md:space-x-3">
            <span className="text-base md:text-3xl drop-shadow-[0_0_10px_rgba(251,191,36,0.4)] shrink-0">{currentStep.icon}</span>
            <h3 className="font-serif text-xs md:text-lg font-bold text-amber-200 leading-tight">
              {currentStep.title}
            </h3>
          </div>

          <p className="text-zinc-300 text-[10px] md:text-xs leading-tight md:leading-relaxed font-sans">
            {currentStep.description}
          </p>

          {currentStep.tip && (
            <div className="flex gap-1.5 px-2 py-1 md:px-3 md:py-2.5 bg-amber-950/60 border border-amber-700/50 rounded-lg md:rounded-xl">
              <span className="text-amber-400 text-xs md:text-sm shrink-0">💡</span>
              <p className="text-amber-200 text-[9px] md:text-[11px] leading-tight font-sans">{currentStep.tip}</p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-1.5 md:gap-3 pt-1 md:pt-2 border-t border-zinc-800/80 shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            disabled={isFirstStep}
            className="min-h-[32px] md:min-h-[44px] px-2.5 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-mono font-bold text-zinc-400 hover:text-amber-200 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700 transition-all"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            className={`flex-1 min-h-[32px] md:min-h-[44px] px-3 md:px-5 py-1 md:py-2.5 rounded-lg md:rounded-xl font-mono font-bold text-[10px] md:text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center space-x-1.5 md:space-x-2 ${
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

