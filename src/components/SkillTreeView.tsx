import React, { useState, useRef } from 'react';
import {
  getSkillsByClass,
  CLASS_PILLARS,
  ALL_SKILLS,
  getSkillRank,
  checkSkillGating,
} from '../data/skillsData';
import { PlayerCharacter, Skill, HeroClass } from '../types/game';
import { calcRespecCostInSS } from '../utils/gameFormulas';
import { SkillInspectorModal } from './SkillInspectorModal';
import { soundFX } from '../utils/audio';

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

  // Swipe gesture detection state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const heroClass = (player.heroClass || 'Mandirigma') as HeroClass;
  const pillars = CLASS_PILLARS[heroClass] || [];
  const skills = getSkillsByClass(heroClass);
  const classSkillIds = new Set(skills.map((s) => s.id));

  const unlockedSkillIds = Array.from(new Set(player.unlockedSkillIds ?? []));
  const equippedSkillIds = Array.from(
    new Set((player.equippedSkillIds ?? []).filter((id) => classSkillIds.has(id)))
  );

  const respecCostSS = calcRespecCostInSS(player.level);
  const playerSilver = player.wallet.silverPieces ?? 0;
  const canAffordRespec = playerSilver >= respecCostSS;

  // Tabs list for swipe cycling
  const tabList: Array<'OVERVIEW' | 'PILLAR_1' | 'PILLAR_2' | 'PILLAR_3'> = [
    'OVERVIEW',
    'PILLAR_1',
    'PILLAR_2',
    'PILLAR_3',
  ];

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    // Only switch tabs if the horizontal swipe dominates vertical scroll
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 48) {
      const currentIndex = tabList.indexOf(activeTab);
      if (diffX > 0 && currentIndex < tabList.length - 1) {
        // Swiped Left -> Next tab
        soundFX.playClickSound?.();
        setActiveTab(tabList[currentIndex + 1]);
      } else if (diffX < 0 && currentIndex > 0) {
        // Swiped Right -> Previous tab
        soundFX.playClickSound?.();
        setActiveTab(tabList[currentIndex - 1]);
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Perform Ritual of Cleansing (Respec SP)
  const handlePerformRespec = () => {
    if (!canAffordRespec) {
      onShowToast?.(`❌ Insufficient Silver Pieces! Requires ${respecCostSS} 🥈 Silver.`, 'error', '💰');
      setShowRespecConfirmModal(false);
      return;
    }

    soundFX.playSpellSound?.();

    // Calculate total SP refunded (1 SP per level)
    const totalPossibleSP = Math.max(1, player.level);

    const updated: PlayerCharacter = {
      ...player,
      wallet: {
        ...player.wallet,
        silverPieces: Math.max(0, playerSilver - respecCostSS),
        silverShillings: Math.max(0, playerSilver - respecCostSS),
      },
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

  // Filter skills based on active tab
  const getDisplayedSkills = (): Skill[] => {
    if (activeTab === 'OVERVIEW') return skills;
    const pillarIdx = activeTab === 'PILLAR_1' ? 0 : activeTab === 'PILLAR_2' ? 1 : 2;
    const targetPillar = pillars[pillarIdx];
    if (!targetPillar) return skills;
    return skills.filter((s) => s.pillarId === targetPillar.id);
  };

  const displayedSkills = getDisplayedSkills();

  return (
    <div
      className="flex flex-col gap-3 pb-8 select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. TOP-ANCHORED LOADOUT HEADER */}
      <div className="p-3 bg-stone-900/95 border border-amber-500/40 rounded-2xl shadow-xl space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-serif font-bold text-amber-200">
              ⚡ Active Combat Hotbar
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
              {equippedSkillIds.length} / 3 Equipped
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-600/50">
              <span className="text-xs">⚡</span>
              <span className="text-xs font-bold text-amber-300">
                SP: {player.skillPoints ?? 0}
              </span>
            </div>

            {/* Ritual of Cleansing (Respec) Button */}
            <button
              onClick={() => setShowRespecConfirmModal(true)}
              title="Respec all allocated Skill Points for Silver Pieces"
              className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-200 border border-stone-700 text-xs font-semibold transition-colors flex items-center gap-1"
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
                className={`h-16 relative flex flex-col items-center justify-center rounded-xl border p-1 transition-all ${
                  skill
                    ? 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.15)] cursor-pointer hover:border-amber-400'
                    : 'bg-stone-900/40 border-stone-800 text-stone-600'
                }`}
              >
                {skill ? (
                  <>
                    <div className="flex items-center gap-1">
                      <span className="text-xl leading-none">{skill.icon}</span>
                      {rank > 1 && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded border border-amber-500/40 font-bold">
                          R{rank}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-amber-100 truncate max-w-full px-1 mt-0.5">
                      {skill.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickUnequip(skill.id);
                      }}
                      title="Unequip skill"
                      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-stone-800/80 hover:bg-rose-950 text-stone-400 hover:text-rose-300 text-[10px] flex items-center justify-center transition-colors"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-stone-600">
                    <span className="text-base font-bold leading-none">+</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider">Slot {slotIdx + 1}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. PILLAR TAB SWITCHER & HORIZONTAL NAVIGATION */}
      <div className="flex items-center gap-1 bg-stone-900/90 border border-stone-800 p-1 rounded-xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => {
            soundFX.playClickSound?.();
            setActiveTab('OVERVIEW');
          }}
          className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
            activeTab === 'OVERVIEW'
              ? 'bg-amber-500 text-stone-950 shadow-md'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
          }`}
        >
          Overview
        </button>
        {pillars.map((pillar, idx) => {
          const tabKey = (['PILLAR_1', 'PILLAR_2', 'PILLAR_3'] as const)[idx];
          const isActive = activeTab === tabKey;
          return (
            <button
              key={pillar.id}
              onClick={() => {
                soundFX.playClickSound?.();
                setActiveTab(tabKey);
              }}
              className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center truncate ${
                isActive
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
              }`}
            >
              <span className="mr-1">{pillar.icon}</span>
              {pillar.name}
            </button>
          );
        })}
      </div>

      {/* Active Filter Badge / Hint */}
      {highlightedTag && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-600/40 text-xs text-amber-200">
          <span>Filtering by synergy: <strong>{highlightedTag}</strong></span>
          <button
            onClick={() => setHighlightedTag(null)}
            className="text-[11px] underline text-amber-300 hover:text-white"
          >
            Clear Highlight
          </button>
        </div>
      )}

      {/* 3. SKILL LADDER LIST / GRID */}
      <div className="flex flex-col gap-2.5">
        {displayedSkills.map((skill) => {
          const rank = getSkillRank(player, skill.id);
          const maxRank = skill.maxRank ?? (skill.type === 'PASSIVE' ? 1 : 5);
          const isAllocated = rank > 0;
          const isEquipped = equippedSkillIds.includes(skill.id);
          const gating = checkSkillGating(skill, player);
          const isLocked = gating.isLocked && !isAllocated;

          // Check if matches active synergy tag
          const hasMatchingTag = highlightedTag
            ? skill.synergyTags?.includes(highlightedTag)
            : false;

          return (
            <div
              key={skill.id}
              onClick={() => setSelectedSkill(skill)}
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                isLocked
                  ? 'bg-stone-900/40 border-stone-850 opacity-60 hover:opacity-80'
                  : isEquipped
                  ? 'bg-amber-950/30 border-amber-500/70 shadow-[0_0_8px_rgba(245,158,11,0.18)]'
                  : isAllocated
                  ? 'bg-stone-900/90 border-amber-500/50 hover:border-amber-400'
                  : 'bg-stone-900/60 border-stone-800 hover:border-amber-500/40'
              } ${
                hasMatchingTag ? 'ring-2 ring-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Node Anatomy: Diamond/rounded-xl for Active, Circle for Passive */}
                <div
                  className={`w-11 h-11 flex-shrink-0 flex items-center justify-center text-xl border transition-all ${
                    skill.type === 'ACTIVE'
                      ? 'rounded-xl rotate-0'
                      : 'rounded-full'
                  } ${
                    isLocked
                      ? 'bg-stone-950 border-stone-800 text-stone-600'
                      : isEquipped
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md'
                      : isAllocated
                      ? 'bg-stone-800 border-amber-500/40 text-amber-100'
                      : 'bg-stone-900 border-stone-700 text-stone-400'
                  }`}
                >
                  {isLocked ? '🔒' : skill.icon}
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-sm font-bold text-stone-100 truncate">
                      {skill.name}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider border ${
                        skill.type === 'ACTIVE'
                          ? 'bg-amber-950/70 text-amber-300 border-amber-600/40'
                          : 'bg-indigo-950/70 text-indigo-300 border-indigo-600/40'
                      }`}
                    >
                      {skill.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5 text-xs">
                    {isLocked ? (
                      <span className="text-[11px] text-rose-400 font-semibold truncate max-w-[200px]" title={gating.reason || ''}>
                        🔒 {gating.reason}
                      </span>
                    ) : (
                      <span className={`text-[11px] font-semibold ${isAllocated ? 'text-amber-400' : 'text-stone-400'}`}>
                        Rank {rank}/{maxRank}
                      </span>
                    )}

                    <span className="text-stone-500">•</span>
                    <span className="text-[11px] text-stone-400 truncate">
                      Tier {skill.tier}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side Status / Inspect Trigger */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {isEquipped && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    Equipped
                  </span>
                )}
                {!isAllocated && !isLocked && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-600/50 font-bold">
                    1 SP
                  </span>
                )}
                {isLocked && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 border border-rose-800/50 font-bold">
                    Locked
                  </span>
                )}
                <span className="text-stone-500 text-sm font-bold">›</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. MODAL INSPECTOR (Forge/Inventory style) */}
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

      {/* 5. RESPEC CONFIRMATION MODAL */}
      {showRespecConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowRespecConfirmModal(false)}
        >
          <div
            className="w-full max-w-sm bg-stone-900 border border-amber-500/60 rounded-2xl p-5 shadow-2xl space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-950/60 border border-amber-500/50 flex items-center justify-center text-2xl">
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

            <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800 text-xs space-y-1">
              <div className="flex justify-between text-stone-400">
                <span>Ritual Fee:</span>
                <span className="font-bold text-amber-300">{respecCostSS} 🥈 Silver Pieces</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Your Silver:</span>
                <span className="font-mono text-stone-200">{playerSilver} 🥈 Silver</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Refunded Points:</span>
                <span className="font-bold text-emerald-400">+{player.level} SP</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowRespecConfirmModal(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-stone-800 text-stone-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handlePerformRespec}
                disabled={!canAffordRespec}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                  canAffordRespec
                    ? 'bg-amber-600 hover:bg-amber-500 text-amber-950 border-amber-400 shadow-md'
                    : 'bg-stone-800 text-stone-500 border-stone-700 cursor-not-allowed'
                }`}
              >
                Perform Cleansing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillTreeView;

