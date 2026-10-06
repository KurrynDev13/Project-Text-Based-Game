import React, { useState, useEffect } from 'react';
import { PlayerCharacter, PrimaryAttributes, EquipmentItem } from '../types/game';
import { calcDerivedStats, formatCompactNumber } from '../utils/gameFormulas';
import { soundFX } from '../utils/audio';
import { registerBackHandler } from '../utils/navigationStack';
import SkillTreeView from './SkillTreeView';
import FeatureTutorialModal from './FeatureTutorialModal';

interface CharacterSheetProps {
  player: PlayerCharacter;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerCharacter>>;
  onUnequipItem: (slot: 'upperArmor' | 'lowerArmor' | 'weapon' | 'mount') => void;
  initialTab?: 'STATS' | 'SKILLS';
}

export const CharacterSheet: React.FC<CharacterSheetProps> = ({
  player,
  setPlayer,
  onUnequipItem,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<'STATS' | 'SKILLS'>(() => {
    if (initialTab === 'SKILLS') return 'SKILLS';
    return 'STATS';
  });
  const [showSkillsTutorial, setShowSkillsTutorial] = useState(false);

  useEffect(() => {
    if (activeTab === 'SKILLS') {
      return registerBackHandler(() => {
        setActiveTab('STATS');
        return true;
      });
    }
  }, [activeTab]);

  React.useEffect(() => {
    if (initialTab === 'SKILLS') {
      setActiveTab('SKILLS');
    }
  }, [initialTab]);

  const handleSelectSkillsTab = () => {
    setActiveTab('SKILLS');
    if (!(player.tutorialsSeen ?? []).includes('tut_skills')) {
      setShowSkillsTutorial(true);
    }
  };

  const handleCompleteSkillsTutorial = () => {
    setShowSkillsTutorial(false);
    const seen = Array.from(new Set([...(player.tutorialsSeen ?? []), 'tut_skills']));
    setPlayer((prev) => ({ ...prev, tutorialsSeen: seen }));
  };

  const derived = calcDerivedStats(player.attributes, player.level, player.equipment);

  const allocatePoint = (stat: keyof PrimaryAttributes) => {
    if (player.availableAP <= 0) return;
    soundFX.playClickSound();

    setPlayer((prev) => ({
      ...prev,
      availableAP: prev.availableAP - 1,
      attributes: {
        ...prev.attributes,
        [stat]: prev.attributes[stat] + 1,
      },
    }));
  };

  // Touch gesture swipe state for switching tabs: STATS <-> SKILLS
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Priority: Never trigger tab switch when touch starts inside the skill tree container
    if ((e.target as HTMLElement)?.closest?.('[data-skill-tree-container]')) {
      setTouchStartX(null);
      setTouchStartY(null);
      return;
    }
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    if ((e.target as HTMLElement)?.closest?.('[data-skill-tree-container]')) {
      setTouchStartX(null);
      setTouchStartY(null);
      return;
    }
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0 && activeTab === 'STATS') {
        // Swipe Left: Go to Skills
        soundFX.playClickSound();
        handleSelectSkillsTab();
      } else if (deltaX > 0 && activeTab === 'SKILLS') {
        // Swipe Right: Go to Stats
        soundFX.playClickSound();
        setActiveTab('STATS');
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex flex-col h-full bg-transparent text-amber-100 p-2.5 sm:p-4 md:p-6 space-y-3 sm:space-y-4 overflow-y-auto font-sans select-none pb-20 md:pb-6"
    >
      {/* ── TITAN POWER RATING & EXP BAR ───────────────── */}
      <div className="bg-[#090c12]/80 backdrop-blur-md border border-amber-500/25 rounded-2xl px-3 py-2 shadow-xl flex items-center gap-2.5 sm:gap-3 shrink-0">
        <div className="bg-gradient-to-r from-amber-500/20 via-[#0c0f16] to-[#07090e] border border-amber-500/40 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shrink-0 shadow-inner">
          <span className="text-xs sm:text-sm">⚔️</span>
          <span className="text-[10.5px] sm:text-xs font-mono font-bold text-amber-300 whitespace-nowrap">
            Titan Power: <strong className="text-amber-100 font-extrabold">{derived.powerLevel}</strong>
          </span>
        </div>

        <div className="relative flex-1 bg-black/60 h-5 sm:h-5.5 rounded-full overflow-hidden border border-zinc-800 shadow-inner flex items-center justify-center min-w-0">
          <div
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 transition-all duration-300 rounded-full"
            style={{ width: `${Math.min(100, (player.exp / derived.expRequiredNextLevel) * 100)}%` }}
          />
          <span className="relative z-10 text-[9px] sm:text-[10px] font-mono font-bold text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] whitespace-nowrap px-2">
            EXP {formatCompactNumber(player.exp)}/{formatCompactNumber(derived.expRequiredNextLevel)} ({Math.floor((player.exp / derived.expRequiredNextLevel) * 100)}%)
          </span>
        </div>
      </div>

      {/* ── TAB SWITCHER: STATS | ANCESTRAL SKILLS ─────────────────────────── */}
      <div className="flex space-x-2 border-b border-zinc-800/80 pb-0.5 shrink-0">
        <button
          onClick={() => setActiveTab('STATS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer min-h-[38px] flex items-center gap-1.5 active:scale-[0.97] ${
            activeTab === 'STATS'
              ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-zinc-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-300'
              : 'bg-zinc-900/70 text-zinc-400 hover:text-amber-200 border border-zinc-800'
          }`}
        >
          <span>⚔️</span>
          <span>Attributes & Combat</span>
        </button>
        <button
          onClick={handleSelectSkillsTab}
          className={`px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer min-h-[38px] flex items-center gap-1.5 active:scale-[0.97] ${
            activeTab === 'SKILLS'
              ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-zinc-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-300'
              : 'bg-zinc-900/70 text-zinc-400 hover:text-amber-200 border border-zinc-800'
          }`}
        >
          <span>📜</span>
          <span>Ancestral Skill Tree</span>
          {(player.skillPoints ?? 0) > 0 && (
            <span
              className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'SKILLS' ? 'bg-zinc-950 text-amber-300' : 'bg-amber-500 text-zinc-950'
              }`}
            >
              +{player.skillPoints} SP
            </span>
          )}
        </button>
      </div>

      {/* ── STATS TAB: Primary Attributes & Combat Metrics Breakdown ── */}
      {activeTab === 'STATS' && (
        <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto w-full">
          {/* 1. Attributes Allocation Grid */}
          <div className="bg-[#090c12]/80 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-amber-500/25 space-y-2.5 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-sm sm:text-base text-amber-100 flex items-center gap-1.5">
                  <span>ᜊᜌᜈᜒ</span>
                  <span>• Primary Hero Attributes</span>
                </h3>
                <span className="text-[10px] text-zinc-400 font-mono">(AP: Attribute Points)</span>
              </div>
              <span className="text-xs font-mono text-amber-300 font-bold bg-amber-950/80 border border-amber-600/50 px-2.5 py-0.5 rounded-lg shadow-inner">
                Available AP: {player.availableAP}
              </span>
            </div>

            {/* 2x2 Dense Grid for STR, AGI, INT, VIT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* STR */}
              <div className="p-2.5 sm:p-3 bg-[#0c0f16]/85 rounded-xl border border-zinc-800 hover:border-amber-500/40 flex justify-between items-center transition-all shadow-md">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5 font-serif">
                    <span>Strength (STR):</span>
                    <span className="text-amber-400 font-mono font-bold">{player.attributes.str}</span>
                  </div>
                  <div className="text-[9.5px] text-zinc-400 mt-0.5 font-mono">
                    +2.5 Melee DMG • +1.5% Crit DMG • +0.4 Armor/Poise • +1 Bag / 3 pts
                  </div>
                </div>
                <button
                  disabled={player.availableAP <= 0}
                  onClick={() => allocatePoint('str')}
                  className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-bold px-3 py-1.5 rounded-lg text-xs font-mono disabled:opacity-25 disabled:cursor-not-allowed transition-all active:scale-95 shadow cursor-pointer"
                >
                  + Point
                </button>
              </div>

              {/* AGI */}
              <div className="p-2.5 sm:p-3 bg-[#0c0f16]/90 rounded-xl border border-zinc-800 hover:border-emerald-500/40 flex justify-between items-center transition-all shadow-md">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5 font-serif">
                    <span>Agility (AGI):</span>
                    <span className="text-emerald-400 font-mono font-bold">{player.attributes.agi}</span>
                  </div>
                  <div className="text-[9.5px] text-zinc-400 mt-0.5 font-mono">
                    +2.5 Bow/Dagger DMG • +0.35% Dodge • +0.4% Crit • +0.3% Armor Pen
                  </div>
                </div>
                <button
                  disabled={player.availableAP <= 0}
                  onClick={() => allocatePoint('agi')}
                  className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-bold px-3 py-1.5 rounded-lg text-xs font-mono disabled:opacity-25 disabled:cursor-not-allowed transition-all active:scale-95 shadow cursor-pointer"
                >
                  + Point
                </button>
              </div>

              {/* INT */}
              <div className="p-2.5 sm:p-3 bg-[#0c0f16]/90 rounded-xl border border-zinc-800 hover:border-cyan-500/40 flex justify-between items-center transition-all shadow-md">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5 font-serif">
                    <span>Intelligence (INT):</span>
                    <span className="text-sky-400 font-mono font-bold">{player.attributes.int}</span>
                  </div>
                  <div className="text-[9.5px] text-zinc-400 mt-0.5 font-mono">
                    +3.0 Magic DMG • +8 MP • +0.8 M.Def • +1 In-Combat MP/10 INT • +1.5% Potion
                  </div>
                </div>
                <button
                  disabled={player.availableAP <= 0}
                  onClick={() => allocatePoint('int')}
                  className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-bold px-3 py-1.5 rounded-lg text-xs font-mono disabled:opacity-25 disabled:cursor-not-allowed transition-all active:scale-95 shadow cursor-pointer"
                >
                  + Point
                </button>
              </div>

              {/* VIT */}
              <div className="p-2.5 sm:p-3 bg-[#0c0f16]/90 rounded-xl border border-zinc-800 hover:border-red-500/40 flex justify-between items-center transition-all shadow-md">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5 font-serif">
                    <span>Vitality (VIT):</span>
                    <span className="text-red-400 font-mono font-bold">{player.attributes.vit}</span>
                  </div>
                  <div className="text-[9.5px] text-zinc-400 mt-0.5 font-mono">
                    +25 HP • +0.8 Armor • +0.15 In-Combat HP/turn • +0.5% Tenacity
                  </div>
                </div>
                <button
                  disabled={player.availableAP <= 0}
                  onClick={() => allocatePoint('vit')}
                  className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-bold px-3 py-1.5 rounded-lg text-xs font-mono disabled:opacity-25 disabled:cursor-not-allowed transition-all active:scale-95 shadow cursor-pointer"
                >
                  + Point
                </button>
              </div>
            </div>
          </div>

          {/* 2. Expanded High-Density Combat Metrics */}
          <div className="bg-[#090c12]/80 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-amber-500/25 space-y-3 shadow-xl">
            <h3 className="font-serif font-bold text-sm sm:text-base text-amber-100 pb-2 border-b border-zinc-800/80">
              Combat Metrics & Calculations
            </h3>

            {/* Survival Metrics */}
            <div className="space-y-1.5">
              <div className="text-[9.5px] font-mono font-bold uppercase text-amber-400 tracking-wider">
                ❤️ VITALITY & RECOVERY
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-[#0c0f16]/90 rounded-xl border border-red-900/40 shadow-inner">
                  <span className="text-zinc-400 text-[9px] block">Max HP</span>
                  <span className="text-red-400 font-bold text-xs sm:text-sm">{derived.maxHp} HP</span>
                </div>
                <div className="p-2.5 bg-[#0c0f16]/90 rounded-xl border border-sky-900/40 shadow-inner">
                  <span className="text-zinc-400 text-[9px] block">Max MP</span>
                  <span className="text-sky-400 font-bold text-xs sm:text-sm">{derived.maxMp} MP</span>
                </div>
                <div className="p-2.5 bg-[#0c0f16]/90 rounded-xl border border-zinc-800 shadow-inner">
                  <span className="text-zinc-400 text-[9px] block">Physical Armor</span>
                  <span className="text-white font-bold text-xs sm:text-sm">
                    {derived.physicalArmor} ({derived.damageReductionPercent}% DR)
                  </span>
                </div>
                <div className="p-2.5 bg-[#0c0f16]/90 rounded-xl border border-zinc-800 shadow-inner">
                  <span className="text-zinc-400 text-[9px] block">Magic Defense</span>
                  <span className="text-purple-300 font-bold text-xs sm:text-sm">
                    {derived.magicDefense} ({derived.magicDRPercent}% MDR)
                  </span>
                </div>
              </div>
            </div>

            {/* Offensive Metrics */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[9.5px] font-mono font-bold uppercase text-amber-400 tracking-wider">
                ⚔️ OFFENSE & PRECISION
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-[#0c0f16]/90 rounded-xl border border-amber-900/40 shadow-inner">
                  <span className="text-zinc-400 text-[9px] block">Melee Damage</span>
                  <span className="text-amber-300 font-bold text-xs sm:text-sm">
                    +{derived.meleeDamage.toFixed(1)}
                  </span>
                </div>
                <div className="p-2.5 bg-[#0c0f16]/90 rounded-xl border border-cyan-900/40 shadow-inner">
                  <span className="text-zinc-400 text-[9px] block">Magic Damage</span>
                  <span className="text-cyan-300 font-bold text-xs sm:text-sm">
                    +{derived.magicDamage.toFixed(1)}
                  </span>
                </div>
                <div className="p-2.5 bg-[#0c0f16]/90 rounded-xl border border-zinc-800 shadow-inner">
                  <span className="text-zinc-400 text-[9px] block">Crit Rate & Multi</span>
                  <span className="text-yellow-400 font-bold text-xs sm:text-sm">
                    {derived.critChancePercent}% ({derived.critDamageMultiplier.toFixed(2)}x)
                  </span>
                </div>
                <div className="p-2.5 bg-[#0c0f16]/90 rounded-xl border border-zinc-800 shadow-inner">
                  <span className="text-zinc-400 text-[9px] block">Dodge & Penetration</span>
                  <span className="text-emerald-400 font-bold text-xs sm:text-sm">
                    {derived.dodgeChancePercent}% / {derived.armorPenetrationPercent}% Pen
                  </span>
                </div>
              </div>
            </div>

            {/* Utility Metrics */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[9.5px] font-mono font-bold uppercase text-amber-400 tracking-wider">
                🎒 UTILITY & SUSTAIN
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-[#0c0f16]/90 rounded-xl border border-zinc-800 shadow-inner">
                  <span className="text-zinc-400 text-[9px] block">Bag Capacity</span>
                  <span className="text-white font-bold text-xs sm:text-sm">
                    {derived.inventoryCapacity} Slots
                  </span>
                </div>
                <div className="p-2.5 bg-[#0c0f16]/90 rounded-xl border border-zinc-800 shadow-inner">
                  <span className="text-zinc-400 text-[9px] block">Combat HP Regen</span>
                  <span className="text-emerald-300 font-bold text-xs sm:text-sm">
                    +{derived.combatHpRegen.toFixed(1)} / turn
                  </span>
                </div>
                <div className="p-2.5 bg-[#0c0f16]/90 rounded-xl border border-zinc-800 shadow-inner">
                  <span className="text-zinc-400 text-[9px] block">Combat MP Regen</span>
                  <span className="text-sky-300 font-bold text-xs sm:text-sm">
                    +{derived.combatMpRegen} / turn
                  </span>
                </div>
                <div className="p-2.5 bg-[#0c0f16]/90 rounded-xl border border-zinc-800 shadow-inner">
                  <span className="text-zinc-400 text-[9px] block">Tenacity & Potions</span>
                  <span className="text-purple-300 font-bold text-xs sm:text-sm">
                    {derived.debuffTenacityPercent}% / +{derived.potionPotencyPercent}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SKILLS TAB: 3-Pillar ARPG Skill Tree ── */}
      {activeTab === 'SKILLS' && (
        <SkillTreeView player={player} onUpdatePlayer={setPlayer} />
      )}

      {/* Feature Tutorial Modal */}
      {showSkillsTutorial && (
        <FeatureTutorialModal
          tutorialId="tut_skills"
          featureName="Ancestral Skill Tree"
          steps={[
            {
              title: 'Welcome to the Ancestral Skill Tree',
              description:
                'Spend Skill Points (SP) to unlock tactical active combat abilities and passive keystone traits across 3 thematic pillars.',
              icon: '📜',
              tip: 'Active skills can be equipped to your 3-slot combat bar.',
            },
          ]}
          onComplete={handleCompleteSkillsTutorial}
          onSkip={handleCompleteSkillsTutorial}
        />
      )}
    </div>
  );
};
export default CharacterSheet;
