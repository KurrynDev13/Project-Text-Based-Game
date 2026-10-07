import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  getSkillsByClass,
  CLASS_PILLARS,
  ALL_SKILLS,
  getSkillRank,
  checkSkillGating,
  getPillarSpentSP,
  getSkillUpgradeCostSP,
  TIER_LEVEL_REQUIREMENTS,
  TIER_PILLAR_SP_REQUIREMENTS,
} from '../data/skillsData';
import { PlayerCharacter, Skill, HeroClass } from '../types/game';
import { calcRespecCostInSS, totalCowriesFromWallet, cowriesToWallet } from '../utils/gameFormulas';
import { SkillInspectorModal } from './SkillInspectorModal';
import { soundFX } from '../utils/audio';
import { registerBackHandler } from '../utils/navigationStack';

interface SkillTreeViewProps {
  player: PlayerCharacter;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error', icon?: string) => void;
}

export const SkillTreeView: React.FC<SkillTreeViewProps> = ({
  player,
  onUpdatePlayer,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PILLAR_1' | 'PILLAR_2' | 'PILLAR_3'>('OVERVIEW');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [highlightedTag, setHighlightedTag] = useState<string | null>(null);
  const [showRespecConfirmModal, setShowRespecConfirmModal] = useState<boolean>(false);

  // Overview vertical scroll tracking: tracks which pillar is currently in view
  const [overviewPillarIdx, setOverviewPillarIdx] = useState<number>(0);
  const overviewScrollRef = useRef<HTMLDivElement | null>(null);

  // Horizontal scroll container reference & scroll state (for single pillar mode)
  const singlePillarScrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(true);

  const heroClass = (player.heroClass || 'Mandirigma') as HeroClass;
  const pillars = CLASS_PILLARS[heroClass] || [];
  const skills = getSkillsByClass(heroClass);
  const classSkillIds = new Set(skills.map((s) => s.id));

  const equippedSkillIds = Array.from(
    new Set((player.equippedSkillIds ?? []).filter((id) => classSkillIds.has(id)))
  );

  const respecCostSS = calcRespecCostInSS(player.level);
  const respecCostCowries = respecCostSS * 100;
  const totalPlayerCowries = totalCowriesFromWallet(player.wallet);
  const playerGold = player.wallet.goldIngots ?? player.wallet.goldSovereigns ?? 0;
  const playerSilver = player.wallet.silverPieces ?? player.wallet.silverShillings ?? 0;
  const canAffordRespec = totalPlayerCowries >= respecCostCowries;

  // Active pillar resolution:
  // In Overview mode, dynamically changes to whichever pillar is currently in view!
  // In specific pillar mode, locked to that selected pillar.
  const selectedPillarIdx =
    activeTab === 'PILLAR_2' ? 1 : activeTab === 'PILLAR_3' ? 2 : 0;
  const currentPillar =
    activeTab === 'OVERVIEW'
      ? pillars[overviewPillarIdx] || pillars[0]
      : pillars[selectedPillarIdx] || pillars[0];

  // Back handler registrations
  useEffect(() => {
    if (!showRespecConfirmModal) return;
    return registerBackHandler(() => {
      setShowRespecConfirmModal(false);
      return true;
    });
  }, [showRespecConfirmModal]);

  useEffect(() => {
    if (!selectedSkill) return;
    return registerBackHandler(() => {
      setSelectedSkill(null);
      return true;
    });
  }, [selectedSkill]);

  // Check scroll bounds for single-pillar horizontal scroll container
  const checkSingleScrollBounds = useCallback(() => {
    const el = singlePillarScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  useEffect(() => {
    if (activeTab === 'OVERVIEW') return;
    checkSingleScrollBounds();
    const el = singlePillarScrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkSingleScrollBounds);
      window.addEventListener('resize', checkSingleScrollBounds);
      return () => {
        el.removeEventListener('scroll', checkSingleScrollBounds);
        window.removeEventListener('resize', checkSingleScrollBounds);
      };
    }
  }, [checkSingleScrollBounds, activeTab]);

  // Smooth scroll handler for < and > buttons
  const handleSingleHorizontalScroll = (dir: 'left' | 'right') => {
    soundFX.playClickSound?.();
    if (singlePillarScrollRef.current) {
      const scrollStep = 280;
      singlePillarScrollRef.current.scrollBy({
        left: dir === 'left' ? -scrollStep : scrollStep,
        behavior: 'smooth',
      });
    }
  };

  // Dynamically update the header in overview mode based on vertical scroll position
  const handleOverviewVerticalScroll = useCallback(() => {
    const container = overviewScrollRef.current;
    if (!container) return;
    const containerTop = container.getBoundingClientRect().top;

    const el0 = document.getElementById('overview-pillar-0');
    const el1 = document.getElementById('overview-pillar-1');
    const el2 = document.getElementById('overview-pillar-2');

    if (el2 && el1 && el0) {
      const rect2 = el2.getBoundingClientRect();
      const rect1 = el1.getBoundingClientRect();

      // Check which pillar section top is closest to the viewport top
      if (rect2.top - containerTop <= 110) {
        setOverviewPillarIdx(2);
      } else if (rect1.top - containerTop <= 110) {
        setOverviewPillarIdx(1);
      } else {
        setOverviewPillarIdx(0);
      }
    }
  }, []);

  // Perform Ritual of Cleansing (Respec SP)
  const handlePerformRespec = () => {
    if (!canAffordRespec) {
      onShowToast?.(`❌ Insufficient Funds! Requires ${respecCostSS} 🥈 Silver.`, 'error', '💰');
      setShowRespecConfirmModal(false);
      return;
    }

    soundFX.playSpellSound?.();

    // Calculate total SP refunded (1 SP per level)
    const totalPossibleSP = Math.max(1, player.level);
    const newWallet = cowriesToWallet(totalPlayerCowries - respecCostCowries, player.wallet.mutyaShards ?? 0);

    const updated: PlayerCharacter = {
      ...player,
      wallet: newWallet,
      skillPoints: totalPossibleSP,
      unlockedSkillIds: [],
      skillRanks: {},
      equippedSkillIds: [],
    };

    onUpdatePlayer(updated);
    setShowRespecConfirmModal(false);
    onShowToast?.(
      `✨ Ritual of Cleansing complete! Refunded all spent points. You now have ${totalPossibleSP} Skill Points.`,
      'success',
      '✨'
    );
  };

  // Quick unequip from slot header
  const handleQuickUnequip = (skillId: string) => {
    soundFX.playUnequipSound?.();
    const newEquipped = equippedSkillIds.filter((id) => id !== skillId);
    onUpdatePlayer({ ...player, equippedSkillIds: newEquipped });
    onShowToast?.(`Removed skill from active combat hotbar.`, 'info', '🛡️');
  };

  // Helper to render an individual skill node card
  const renderSkillCard = (skill: Skill) => {
    const rank = getSkillRank(player, skill.id);
    const maxRank = skill.maxRank ?? (skill.type === 'PASSIVE' ? 1 : 5);
    const isAllocated = rank > 0;
    const isEquipped = equippedSkillIds.includes(skill.id);
    const gating = checkSkillGating(skill, player);
    const isLocked = gating.isLocked && !isAllocated;
    const spCost = getSkillUpgradeCostSP(skill, rank);

    const hasMatchingTag = highlightedTag
      ? skill.synergyTags?.includes(highlightedTag)
      : false;

    return (
      <div
        key={skill.id}
        onClick={() => setSelectedSkill(skill)}
        className={`w-full p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer relative shadow-md active:scale-[0.98] ${
          isLocked
            ? 'bg-stone-950/70 border-stone-850 opacity-60 hover:opacity-85'
            : isEquipped
            ? 'bg-gradient-to-br from-amber-950/60 to-stone-900 border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/50'
            : isAllocated
            ? 'bg-stone-900/90 border-amber-500/50 hover:border-amber-400'
            : 'bg-stone-900/70 border-stone-800 hover:border-amber-500/40'
        } ${hasMatchingTag ? 'ring-2 ring-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.5)]' : ''}`}
      >
        <div className="flex items-start justify-between gap-2">
          {/* Node Icon & Emblem */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 flex items-center justify-center text-lg border transition-all ${
                skill.type === 'ACTIVE' ? 'rounded-xl' : 'rounded-full'
              } ${
                isLocked
                  ? 'bg-stone-950 border-stone-800 text-stone-600'
                  : isEquipped
                  ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-inner'
                  : isAllocated
                  ? 'bg-stone-800 border-amber-500/40 text-amber-100'
                  : 'bg-stone-900 border-stone-700 text-stone-400'
              }`}
            >
              {isLocked ? '🔒' : skill.icon}
            </div>

            <div className="truncate min-w-0">
              <h4 className="font-serif text-xs sm:text-sm font-bold text-amber-100 truncate leading-snug">
                {skill.name}
              </h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[8px] font-mono px-1 rounded uppercase font-bold tracking-wider border ${
                    skill.type === 'ACTIVE'
                      ? 'bg-amber-950/70 text-amber-300 border-amber-600/40'
                      : 'bg-indigo-950/70 text-indigo-300 border-indigo-600/40'
                  }`}
                >
                  {skill.type}
                </span>

                <span
                  className={`text-[9px] font-mono font-bold ${
                    isAllocated ? 'text-amber-400' : 'text-zinc-500'
                  }`}
                >
                  {skill.type === 'PASSIVE'
                    ? isAllocated
                      ? '1/1 Keystone'
                      : '0/1 Keystone'
                    : `Rank ${rank}/${maxRank}`}
                </span>
              </div>
            </div>
          </div>

          {/* SP Cost or Status Tag */}
          <div className="shrink-0 flex flex-col items-end gap-1">
            {isEquipped ? (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50">
                Hotbar
              </span>
            ) : isAllocated && rank >= maxRank ? (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                MAX
              </span>
            ) : (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-600/50 shadow-inner">
                {spCost} SP
              </span>
            )}
          </div>
        </div>

        {/* Short Lore / Description Snippet */}
        <p className="text-[9.5px] font-mono text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
          {skill.description}
        </p>

        {/* Lock Gating Reason Footer if Locked */}
        {isLocked && gating.reason && (
          <div className="mt-1.5 pt-1.5 border-t border-rose-900/30 text-[9px] font-mono text-rose-300 truncate">
            🔒 {gating.reason}
          </div>
        )}
      </div>
    );
  };

  // Helper to render a 4-tier horizontal grid for a given pillar
  const renderPillarHorizontalTree = (pillarId: string) => {
    const pSkills = skills.filter((s) => s.pillarId === pillarId);
    const t1 = pSkills.filter((s) => (s.tier || 1) === 1);
    const t2 = pSkills.filter((s) => s.tier === 2);
    const t3 = pSkills.filter((s) => s.tier === 3);
    const t4 = pSkills.filter((s) => s.tier === 4);

    return (
      <div
        data-skill-tree-container="true"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className="overflow-x-auto no-scrollbar scroll-smooth flex items-stretch gap-2 sm:gap-3 px-2 sm:px-4 py-1"
      >
        {/* Tier 1 Column */}
        <div className="w-[230px] sm:w-[260px] shrink-0 flex flex-col space-y-2.5">
          <div className="flex items-center justify-between px-2 py-1 bg-stone-900/80 border border-zinc-800 rounded-xl">
            <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider">
              Tier 1 • Novice
            </span>
            <span className="text-[9px] font-mono text-emerald-400/80 font-semibold">
              Free Entry
            </span>
          </div>
          <div className="flex-1 flex flex-col space-y-2.5 justify-start">
            {t1.map((skill) => renderSkillCard(skill))}
          </div>
        </div>

        {/* Horizontal Line Connector between Tier 1 & Tier 2 */}
        <div className="hidden sm:flex flex-col justify-around py-12 shrink-0 w-5 items-center">
          <div className="w-full h-0.5 bg-gradient-to-r from-amber-500/60 to-amber-500/30" />
          <div className="w-full h-0.5 bg-gradient-to-r from-amber-500/40 to-amber-500/20" />
        </div>

        {/* Tier 2 Column */}
        <div className="w-[230px] sm:w-[260px] shrink-0 flex flex-col space-y-2.5">
          <div className="flex items-center justify-between px-2 py-1 bg-stone-900/80 border border-zinc-800 rounded-xl">
            <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider">
              Tier 2 • Adept
            </span>
            <span className="text-[9px] font-mono text-zinc-400">
              {TIER_PILLAR_SP_REQUIREMENTS[2]} Pillar SP
            </span>
          </div>
          <div className="flex-1 flex flex-col space-y-2.5 justify-start">
            {t2.map((skill) => renderSkillCard(skill))}
          </div>
        </div>

        {/* Horizontal Line Connector between Tier 2 & Tier 3 */}
        <div className="hidden sm:flex flex-col justify-center shrink-0 w-5 items-center">
          <div className="w-full h-0.5 bg-gradient-to-r from-amber-500/60 to-amber-500/30" />
        </div>

        {/* Tier 3 Column */}
        <div className="w-[230px] sm:w-[260px] shrink-0 flex flex-col space-y-2.5">
          <div className="flex items-center justify-between px-2 py-1 bg-stone-900/80 border border-zinc-800 rounded-xl">
            <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider">
              Tier 3 • Master
            </span>
            <span className="text-[9px] font-mono text-zinc-400">
              {TIER_PILLAR_SP_REQUIREMENTS[3]} Pillar SP
            </span>
          </div>
          <div className="flex-1 flex flex-col space-y-2.5 justify-start">
            {t3.map((skill) => renderSkillCard(skill))}
          </div>
        </div>

        {/* Horizontal Line Connector between Tier 3 & Tier 4 */}
        <div className="hidden sm:flex flex-col justify-center shrink-0 w-5 items-center">
          <div className="w-full h-0.5 bg-gradient-to-r from-amber-500/60 to-amber-500/30" />
        </div>

        {/* Tier 4 Column */}
        <div className="w-[230px] sm:w-[260px] shrink-0 flex flex-col space-y-2.5">
          <div className="flex items-center justify-between px-2 py-1 bg-stone-900/80 border border-amber-500/40 rounded-xl shadow-inner">
            <span className="text-[10px] font-mono font-bold text-amber-200 uppercase tracking-wider">
              Tier 4 • Capstone
            </span>
            <span className="text-[9px] font-mono text-zinc-400">
              {TIER_PILLAR_SP_REQUIREMENTS[4]} Pillar SP
            </span>
          </div>
          <div className="flex-1 flex flex-col space-y-2.5 justify-start">
            {t4.map((skill) => renderSkillCard(skill))}
          </div>
        </div>
      </div>
    );
  };

  // Build the readable tab options list (all visible without horizontal scroll)
  const tabList = [
    { key: 'OVERVIEW' as const, label: 'Overview', shortName: 'All', icon: '🌐', investedSP: 0 },
    ...pillars.map((p, idx) => ({
      key: (['PILLAR_1', 'PILLAR_2', 'PILLAR_3'] as const)[idx],
      label: p.name,
      shortName: p.shortName || p.name,
      icon: p.icon,
      investedSP: getPillarSpentSP(player, p.id),
    })),
  ];

  return (
    <div
      data-skill-tree-container="true"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      className="flex flex-col gap-2.5 pb-6 select-none font-sans"
    >
      {/* ── 1. TOP COMBAT HOTBAR & SP SUMMARY ────────────────────────────── */}
      <div className="p-2.5 sm:p-3 bg-[#0c0f16]/90 backdrop-blur-md border border-amber-500/30 rounded-2xl shadow-xl space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-serif font-bold text-amber-200 flex items-center gap-1.5">
              <span>⚡</span>
              <span>Active Combat Hotbar</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
              {equippedSkillIds.length} / 3 Equipped
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-950/70 border border-amber-500/50 shadow-inner">
              <span className="text-xs">⚡</span>
              <span className="text-xs font-mono font-bold text-amber-300">
                SP: {player.skillPoints ?? 0}
              </span>
            </div>

            {/* Ritual of Cleansing (Respec) Button */}
            <button
              onClick={() => setShowRespecConfirmModal(true)}
              title="Respec all allocated Skill Points for Silver Pieces"
              className="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-amber-200 border border-zinc-700/80 text-[11px] font-mono font-semibold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
            >
              <span>🌊</span>
              <span className="hidden sm:inline">Ritual of Cleansing</span>
              <span className="sm:hidden">Respec</span>
            </button>
          </div>
        </div>

        {/* 3 Hotbar Slots */}
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((slotIdx) => {
            const skillId = equippedSkillIds[slotIdx];
            const skill = skillId ? ALL_SKILLS.find((s) => s.id === skillId) : null;
            const rank = skill ? getSkillRank(player, skill.id) : 1;

            return (
              <div
                key={slotIdx}
                onClick={() => {
                  if (skill) {
                    setSelectedSkill(skill);
                  }
                }}
                className={`h-15 sm:h-16 relative flex flex-col items-center justify-center rounded-xl border p-1 transition-all ${
                  skill
                    ? 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.15)] cursor-pointer hover:border-amber-400'
                    : 'bg-zinc-950/50 border-zinc-800 text-zinc-600'
                }`}
              >
                {skill ? (
                  <>
                    <div className="flex items-center gap-1">
                      <span className="text-xl leading-none">{skill.icon}</span>
                      {rank > 1 && (
                        <span className="text-[9px] font-mono bg-amber-500/20 text-amber-300 px-1 rounded border border-amber-500/40 font-bold">
                          R{rank}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-serif font-semibold text-amber-100 truncate max-w-full px-1 mt-0.5">
                      {skill.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickUnequip(skill.id);
                      }}
                      title="Unequip skill"
                      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-zinc-855 hover:bg-rose-950 text-zinc-400 hover:text-rose-300 text-[10px] flex items-center justify-center transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-zinc-600">
                    <span className="text-sm font-bold leading-none">+</span>
                    <span className="text-[9.5px] font-mono uppercase tracking-wider mt-0.5">
                      Slot {slotIdx + 1}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 2. 4-COLUMN TAB BAR (ALL TABS VISIBLE WITHOUT HORIZONTAL SCROLL) ── */}
      <div className="grid grid-cols-4 gap-1 sm:gap-1.5 w-full bg-[#090c12]/85 backdrop-blur-md border border-zinc-800/90 p-1 rounded-2xl shadow-md">
        {tabList.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                soundFX.playClickSound?.();
                setActiveTab(tab.key);
              }}
              className={`relative py-2 px-1 sm:px-2 rounded-xl text-[10.5px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 text-center min-h-[38px] ${
                isActive
                  ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-zinc-950 shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-300 font-bold'
                  : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800/90'
              }`}
            >
              <span className="text-xs sm:text-sm shrink-0">{tab.icon}</span>
              <span className="font-serif tracking-tight truncate">
                <span className="sm:hidden">{tab.shortName}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
              {tab.investedSP > 0 && (
                <span
                  className={`text-[8px] sm:text-[9px] font-mono font-bold px-1 rounded-full shrink-0 ${
                    isActive
                      ? 'bg-zinc-950 text-amber-300 shadow-inner'
                      : 'bg-amber-950 text-amber-300 border border-amber-600/50'
                  }`}
                >
                  {tab.investedSP}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active synergy tag filter notice if any */}
      {highlightedTag && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-600/40 text-xs text-amber-200">
          <span>Filtering by synergy: <strong>{highlightedTag}</strong></span>
          <button
            onClick={() => setHighlightedTag(null)}
            className="text-[11px] underline text-amber-300 hover:text-white cursor-pointer"
          >
            Clear Highlight
          </button>
        </div>
      )}

      {/* ── 3. SKILL TREE SCROLLABLE PANE (CONTAINED HEIGHT) ───────────────── */}
      <div className="relative bg-[#090c12]/90 backdrop-blur-md border border-amber-600/40 rounded-2xl p-2.5 sm:p-3.5 shadow-2xl overflow-hidden font-sans">
        {/* Dynamic Pillar Header Banner matching Image 5 */}
        <div className="flex items-center justify-between border-b border-amber-500/25 pb-2.5 mb-2.5 px-1 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl sm:text-3xl shrink-0 p-1.5 rounded-xl bg-stone-900 border border-amber-500/30 transition-all">
              {currentPillar.icon}
            </span>
            <div className="min-w-0">
              <h3 className="font-serif text-sm sm:text-base font-bold text-amber-100 flex items-center gap-2 truncate leading-tight">
                <span>{currentPillar.name}</span>
                <span className="text-[9.5px] font-mono text-amber-300 font-bold border border-amber-500/40 px-2 py-0.5 rounded-full bg-amber-950/60 shrink-0">
                  ⚡ {getPillarSpentSP(player, currentPillar.id)} SP Invested
                </span>
                {activeTab === 'OVERVIEW' && (
                  <span className="text-[8.5px] font-mono text-emerald-400 border border-emerald-600/40 px-1.5 py-0.5 rounded-full bg-emerald-950/60 shrink-0">
                    Overview (Pillar {overviewPillarIdx + 1}/3)
                  </span>
                )}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono truncate mt-0.5">
                {currentPillar.tagline}
              </p>
            </div>
          </div>
        </div>

        {/* ── MODE A: OVERVIEW MODE (ALL PILLARS, VERTICAL SCROLL, CONTAINED HEIGHT) ── */}
        {activeTab === 'OVERVIEW' ? (
          <div
            ref={overviewScrollRef}
            onScroll={handleOverviewVerticalScroll}
            data-skill-tree-container="true"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="h-[350px] sm:h-[380px] overflow-y-auto no-scrollbar scroll-smooth space-y-2 pr-1"
          >
            {pillars.map((pillar, pIdx) => {
              return (
                <div
                  key={pillar.id}
                  id={`overview-pillar-${pIdx}`}
                  className="space-y-1"
                >
                  {pIdx > 0 && (
                    <div className="py-2.5 flex items-center gap-2 text-amber-500/30">
                      <div className="flex-1 border-t border-amber-500/20" />
                      <span className="text-[9px] font-mono tracking-widest text-amber-500/50 uppercase">
                        ✦ ✦ ✦
                      </span>
                      <div className="flex-1 border-t border-amber-500/20" />
                    </div>
                  )}

                  {renderPillarHorizontalTree(pillar.id)}
                </div>
              );
            })}
          </div>
        ) : (
          /* ── MODE B: SINGLE PILLAR MODE (HORIZONTAL SCROLL WITH < & > BUTTONS) ── */
          <div className="relative">
            {/* Left Navigation Arrow (<) */}
            <button
              onClick={() => handleSingleHorizontalScroll('left')}
              disabled={!canScrollLeft}
              aria-label="Scroll Tree Left"
              className={`absolute left-0 top-1/2 -translate-y-1/2 z-30 w-7 sm:w-8 h-20 sm:h-24 bg-stone-950/90 hover:bg-stone-900 text-amber-300 border border-amber-500/50 rounded-r-2xl flex items-center justify-center font-bold text-lg sm:text-xl transition-all shadow-2xl active:scale-95 cursor-pointer backdrop-blur-md ${
                !canScrollLeft ? 'opacity-20 cursor-not-allowed pointer-events-none' : 'hover:border-amber-400'
              }`}
            >
              ‹
            </button>

            {/* Right Navigation Arrow (>) */}
            <button
              onClick={() => handleSingleHorizontalScroll('right')}
              disabled={!canScrollRight}
              aria-label="Scroll Tree Right"
              className={`absolute right-0 top-1/2 -translate-y-1/2 z-30 w-7 sm:w-8 h-20 sm:h-24 bg-stone-950/90 hover:bg-stone-900 text-amber-300 border border-amber-500/50 rounded-l-2xl flex items-center justify-center font-bold text-lg sm:text-xl transition-all shadow-2xl active:scale-95 cursor-pointer backdrop-blur-md ${
                !canScrollRight ? 'opacity-20 cursor-not-allowed pointer-events-none' : 'hover:border-amber-400'
              }`}
            >
              ›
            </button>

            {/* Scrollable Stage: 4 Columns with Horizontal Connectors */}
            <div
              ref={singlePillarScrollRef}
              onScroll={checkSingleScrollBounds}
              data-skill-tree-container="true"
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              className="overflow-x-auto no-scrollbar scroll-smooth flex items-stretch gap-2 sm:gap-3 px-8 sm:px-10 py-1"
            >
              {renderPillarHorizontalTree(currentPillar.id)}
            </div>
          </div>
        )}
      </div>

      {/* ── 4. SKILL INSPECTOR MODAL ─────────────────────────────────────── */}
      {selectedSkill && (
        <SkillInspectorModal
          skill={selectedSkill}
          player={player}
          onClose={() => setSelectedSkill(null)}
          onUpdatePlayer={onUpdatePlayer}
          onShowToast={onShowToast}
          highlightedTag={highlightedTag}
          onSelectTag={(tag) => {
            setHighlightedTag(tag);
            setSelectedSkill(null);
          }}
        />
      )}

      {/* ── 5. RESPEC CONFIRMATION MODAL ─────────────────────────────────── */}
      {showRespecConfirmModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm animate-fade-in font-sans"
            onClick={() => setShowRespecConfirmModal(false)}
          >
            <div
              className="w-full max-w-sm bg-stone-900 border border-amber-500/60 rounded-2xl p-5 shadow-2xl space-y-4 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-950/60 border border-amber-500/50 flex items-center justify-center text-2xl shadow-inner">
                🌊
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-amber-100">
                  Ritual of Cleansing
                </h3>
                <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                  Cleanse all allocated skill techniques and refund your Skill Points to your spiritual pool.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-stone-400">
                  <span>Ritual Fee:</span>
                  <span className="font-bold text-amber-300">{respecCostSS} 🥈 Silver</span>
                </div>
                <div className="flex justify-between items-center text-stone-400">
                  <span>Your Wealth:</span>
                  <div className="flex items-center gap-1.5 text-stone-200">
                    {playerGold > 0 && (
                      <span className="text-amber-400 font-bold">{playerGold}🪙</span>
                    )}
                    <span className="text-zinc-300">{playerSilver}🔘</span>
                    <span className="text-amber-500">{player.wallet.cowrieShells ?? player.wallet.copperCoins ?? 0}🐚</span>
                  </div>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>Refunded Points:</span>
                  <span className="font-bold text-emerald-400">+{player.level} SP</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowRespecConfirmModal(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePerformRespec}
                  disabled={!canAffordRespec}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    canAffordRespec
                      ? 'bg-amber-600 hover:bg-amber-500 text-amber-950 border-amber-400 shadow-md cursor-pointer active:scale-95'
                      : 'bg-stone-800 text-stone-500 border-stone-700 cursor-not-allowed opacity-60'
                  }`}
                >
                  Perform Cleansing
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default SkillTreeView;

