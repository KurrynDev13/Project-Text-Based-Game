import React, { useState } from 'react';
import { PlayerCharacter, PrimaryAttributes, EquipmentItem } from '../types/game';
import { calcDerivedStats } from '../utils/gameFormulas';
import { soundFX } from '../utils/audio';
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
  // Tab system: STATS or SKILLS (Skills strictly requires Level 2+)
  const isSkillsUnlocked = player.level >= 2;
  const [activeTab, setActiveTab] = useState<'STATS' | 'SKILLS'>(() => {
    if (initialTab === 'SKILLS' && isSkillsUnlocked) return 'SKILLS';
    return 'STATS';
  });
  const [showSkillsTutorial, setShowSkillsTutorial] = useState(false);

  // Auto-revert if level drops or initialTab changes
  React.useEffect(() => {
    if (initialTab === 'SKILLS' && isSkillsUnlocked) {
      setActiveTab('SKILLS');
    } else if (!isSkillsUnlocked && activeTab === 'SKILLS') {
      setActiveTab('STATS');
    }
  }, [initialTab, isSkillsUnlocked, activeTab]);

  const handleSelectSkillsTab = () => {
    if (!isSkillsUnlocked) return;
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

  return (
    <div className="flex flex-col h-full bg-transparent text-amber-100 p-2.5 sm:p-4 md:p-6 space-y-3 sm:space-y-4 overflow-y-auto">
      {/* ── COMPACT HERO HEADER BANNER (Lesser Scroll Design) ───────────────── */}
      <div className="bg-zinc-950/85 backdrop-blur-md border border-amber-900/50 rounded-xl p-3 sm:p-4 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        {/* Left: Name, Class, Level & EXP */}
        <div className="flex-1 w-full sm:w-auto">
          <div className="flex items-center space-x-2.5">
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-amber-200 truncate">
              {player.name}
            </h2>
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded uppercase shrink-0">
              {player.heroClass} · Lv. {player.level}
            </span>
            {player.availableAP > 0 && (
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/50 text-[10px] font-mono font-bold px-2 py-0.5 rounded animate-pulse shrink-0">
                +{player.availableAP} AP Available
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="bg-gradient-to-r from-amber-600 to-amber-400 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (player.exp / derived.expRequiredNextLevel) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-zinc-400 shrink-0">
              EXP {player.exp}/{derived.expRequiredNextLevel} ({Math.floor((player.exp / derived.expRequiredNextLevel) * 100)}%)
            </span>
          </div>
        </div>

        {/* Right: Compact Titan Power Rating */}
        <div className="bg-zinc-950 border border-amber-500/70 px-3 py-1.5 rounded-xl flex items-center space-x-2 shadow-md shrink-0">
          <span className="text-xl">⚔️</span>
          <div>
            <div className="text-[8px] font-mono uppercase text-amber-400 font-bold tracking-wider">
              Titan Power
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-amber-200 leading-tight">
              {derived.powerLevel} PWR
            </div>
          </div>
        </div>
      </div>

      {/* ── TAB SWITCHER: STATS | MUTYA SKILLS ──────────────────────────────── */}
      <div className="flex space-x-2 border-b border-zinc-800 pb-0.5">
        <button
          onClick={() => setActiveTab('STATS')}
          className={`px-4 py-1.5 rounded-t-lg text-xs font-bold font-mono uppercase tracking-wider transition-colors ${
            activeTab === 'STATS'
              ? 'bg-amber-600 text-zinc-950'
              : 'text-zinc-400 hover:text-amber-300'
          }`}
        >
          ⚔️ Stats &amp; Equipment
        </button>
        {isSkillsUnlocked && (
          <button
            onClick={handleSelectSkillsTab}
            className={`px-4 py-1.5 rounded-t-lg text-xs font-bold font-mono uppercase tracking-wider transition-colors ${
              activeTab === 'SKILLS'
                ? 'bg-amber-600 text-zinc-950'
                : 'text-zinc-400 hover:text-amber-300'
            }`}
          >
            ✨ Mutya Skills
          </button>
        )}
      </div>

      {/* ── STATS TAB: Primary Attributes & Combat Metrics Breakdown ── */}
      {activeTab === 'STATS' && (
        <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto w-full">
            {/* 1. Attributes Allocation Grid (High Density 2x2 Grid) */}
            <div className="bg-zinc-900/80 p-3 sm:p-4 rounded-xl border border-zinc-800 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-sm sm:text-base text-amber-200">
                    Primary Attributes
                  </h3>
                  <span className="text-[10px] text-zinc-400 font-mono">(AP: Attribute Points)</span>
                </div>
                <span className="text-xs font-mono text-amber-400 font-bold bg-amber-950/80 border border-amber-600/40 px-2 py-0.5 rounded">
                  AP Available: {player.availableAP}
                </span>
              </div>

              {/* 2x2 Dense Grid for STR, AGI, INT, VIT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* STR */}
                <div className="p-2 sm:p-2.5 bg-zinc-950/80 rounded-lg border border-zinc-800/80 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Strength (STR):</span>
                      <span className="text-amber-400 font-mono">{player.attributes.str}</span>
                    </div>
                    <div className="text-[9.5px] text-zinc-400 mt-0.5">+2.5 Melee DMG, +1 Bag / 2 pts</div>
                  </div>
                  <button
                    disabled={player.availableAP <= 0}
                    onClick={() => allocatePoint('str')}
                    className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold px-2.5 py-1 rounded text-xs font-mono disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    + Point
                  </button>
                </div>

                {/* AGI */}
                <div className="p-2 sm:p-2.5 bg-zinc-950/80 rounded-lg border border-zinc-800/80 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Agility (AGI):</span>
                      <span className="text-emerald-400 font-mono">{player.attributes.agi}</span>
                    </div>
                    <div className="text-[9.5px] text-zinc-400 mt-0.5">+2.5 Bow/Dagger DMG, +0.3% Dodge, +0.5% Crit</div>
                  </div>
                  <button
                    disabled={player.availableAP <= 0}
                    onClick={() => allocatePoint('agi')}
                    className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold px-2.5 py-1 rounded text-xs font-mono disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    + Point
                  </button>
                </div>

                {/* INT */}
                <div className="p-2 sm:p-2.5 bg-zinc-950/80 rounded-lg border border-zinc-800/80 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Intelligence (INT):</span>
                      <span className="text-sky-400 font-mono">{player.attributes.int}</span>
                    </div>
                    <div className="text-[9.5px] text-zinc-400 mt-0.5">+3.0 Magic DMG, +10 MP, +0.5 M.Def</div>
                  </div>
                  <button
                    disabled={player.availableAP <= 0}
                    onClick={() => allocatePoint('int')}
                    className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold px-2.5 py-1 rounded text-xs font-mono disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    + Point
                  </button>
                </div>

                {/* VIT */}
                <div className="p-2 sm:p-2.5 bg-zinc-950/80 rounded-lg border border-zinc-800/80 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Vitality (VIT):</span>
                      <span className="text-red-400 font-mono">{player.attributes.vit}</span>
                    </div>
                    <div className="text-[9.5px] text-zinc-400 mt-0.5">+25 HP, +0.8 Armor, +1 HP regen/tick</div>
                  </div>
                  <button
                    disabled={player.availableAP <= 0}
                    onClick={() => allocatePoint('vit')}
                    className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold px-2.5 py-1 rounded text-xs font-mono disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    + Point
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Expanded High-Density Combat Metrics (Compact Tactical Grid) */}
            <div className="bg-zinc-950/80 p-3 sm:p-4 rounded-xl border border-zinc-800 space-y-3 shadow-md">
              <h3 className="font-serif font-bold text-sm sm:text-base text-amber-200 pb-1.5 border-b border-zinc-800">
                Combat Metrics &amp; Calculations
              </h3>

              {/* Survival Metrics */}
              <div className="space-y-1">
                <div className="text-[9px] font-mono font-bold uppercase text-amber-500 tracking-wider">
                  ❤️ VITALITY &amp; RECOVERY
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-mono">
                  <div className="p-2 bg-zinc-900/90 rounded border border-red-900/40">
                    <span className="text-zinc-400 text-[9px] block">Max HP</span>
                    <span className="text-red-400 font-bold text-xs sm:text-sm">{derived.maxHp} HP</span>
                  </div>
                  <div className="p-2 bg-zinc-900/90 rounded border border-sky-900/40">
                    <span className="text-zinc-400 text-[9px] block">Max MP</span>
                    <span className="text-sky-400 font-bold text-xs sm:text-sm">{derived.maxMp} MP</span>
                  </div>
                  <div className="p-2 bg-zinc-900/90 rounded border border-pink-900/40">
                    <span className="text-zinc-400 text-[9px] block">HP Regen</span>
                    <span className="text-pink-400 font-bold text-xs sm:text-sm">+{derived.hpRegenRate}/10s</span>
                  </div>
                  <div className="p-2 bg-zinc-900/90 rounded border border-amber-900/40">
                    <span className="text-zinc-400 text-[9px] block">Inventory Bag</span>
                    <span className="text-amber-300 font-bold text-xs sm:text-sm">{derived.inventoryCapacity} Slots</span>
                  </div>
                </div>
              </div>

              {/* Offense Metrics */}
              <div className="space-y-1 pt-1">
                <div className="text-[9px] font-mono font-bold uppercase text-amber-500 tracking-wider">
                  ⚔️ WEAPON DAMAGE SCALING
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                  <div className={`p-2 bg-zinc-900/90 rounded border ${player.heroClass === 'Mandirigma' ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-zinc-800'}`}>
                    <span className="text-zinc-400 text-[9px] block">Melee (STR)</span>
                    <span className="text-amber-300 font-bold text-xs">{derived.meleeDamage} Flat</span>
                  </div>
                  <div className={`p-2 bg-zinc-900/90 rounded border ${player.heroClass === 'Mangangaso' || player.heroClass === 'Bagani' ? 'border-emerald-500 ring-1 ring-emerald-500/50' : 'border-zinc-800'}`}>
                    <span className="text-zinc-400 text-[9px] block">Ranged (AGI)</span>
                    <span className="text-emerald-300 font-bold text-xs">{derived.rangedDamage} Flat</span>
                  </div>
                  <div className={`p-2 bg-zinc-900/90 rounded border ${player.heroClass === 'Babaylan' ? 'border-sky-500 ring-1 ring-sky-500/50' : 'border-zinc-800'}`}>
                    <span className="text-zinc-400 text-[9px] block">Magic (INT)</span>
                    <span className="text-sky-300 font-bold text-xs">{derived.magicDamage} Flat</span>
                  </div>
                </div>
              </div>

              {/* Defense & Mitigation Metrics */}
              <div className="space-y-1 pt-1">
                <div className="text-[9px] font-mono font-bold uppercase text-amber-500 tracking-wider">
                  🛡️ MITIGATION &amp; COMBAT AGILITY
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-mono">
                  <div className="p-2 bg-zinc-900/90 rounded border border-emerald-900/40">
                    <span className="text-zinc-400 text-[9px] block">Physical Armor</span>
                    <span className="text-emerald-300 font-bold text-xs sm:text-sm">{derived.physicalArmor} ({derived.damageReductionPercent}% Cut)</span>
                  </div>
                  <div className="p-2 bg-zinc-900/90 rounded border border-purple-900/40">
                    <span className="text-zinc-400 text-[9px] block">Magic Defense</span>
                    <span className="text-purple-300 font-bold text-xs sm:text-sm">{derived.magicDefense} M.Def</span>
                  </div>
                  <div className="p-2 bg-zinc-900/90 rounded border border-cyan-900/40">
                    <span className="text-zinc-400 text-[9px] block">Dodge Rate</span>
                    <span className="text-cyan-300 font-bold text-xs sm:text-sm">{derived.dodgeChancePercent}%</span>
                  </div>
                  <div className="p-2 bg-zinc-900/90 rounded border border-yellow-900/40">
                    <span className="text-zinc-400 text-[9px] block">Crit Hit Rate</span>
                    <span className="text-yellow-300 font-bold text-xs sm:text-sm">{derived.critChancePercent}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* SKILLS TAB */}
      {activeTab === 'SKILLS' && (
        <SkillTreeView player={player} onUpdatePlayer={(updated) => setPlayer(updated)} />
      )}

      {/* Feature Tutorial Modal for Skills */}
      {showSkillsTutorial && (
        <FeatureTutorialModal
          tutorialId="tut_skills"
          featureName="Mutya Skill Tree System"
          steps={[
            {
              title: '32-Skill Archetype Tree',
              icon: '✨',
              description: 'Spend sacred Mutya Shards earned from side quests and boss battles to unlock powerful active skills tailored to your class.',
              tip: 'Equip up to 3 active skills in your loadout to unleash in battle.',
            },
          ]}
          onComplete={handleCompleteSkillsTutorial}
          onSkip={handleCompleteSkillsTutorial}
        />
      )}
    </div>
  );
};

interface EquippedSlotCardProps {
  slotTitle: string;
  item: EquipmentItem | null | undefined;
  onUnequip: () => void;
}

const EquippedSlotCard: React.FC<EquippedSlotCardProps> = ({ slotTitle, item, onUnequip }) => {
  if (!item) {
    return (
      <div className="p-2 bg-zinc-950/60 rounded-lg border border-dashed border-zinc-800 flex justify-between items-center text-[11px] text-zinc-500 font-mono">
        <span className="font-semibold">{slotTitle}</span>
        <span className="italic">Empty Slot</span>
      </div>
    );
  }

  return (
    <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800 flex justify-between items-center transition-all hover:border-zinc-700">
      <div className="truncate pr-2">
        <div className="text-[9px] font-mono text-amber-500 uppercase font-bold">{slotTitle}</div>
        <div className="text-xs font-bold font-serif text-amber-200 truncate">{item.name}</div>
        <div className="text-[9.5px] text-zinc-400 font-mono">
          {item.baseDefense ? `+${item.baseDefense} Armor` : `${item.baseDamageMin}-${item.baseDamageMax} DMG`} · {item.rarity}
        </div>
      </div>
      <button
        onClick={onUnequip}
        className="bg-red-950/60 hover:bg-red-900 border border-red-800/60 text-red-300 text-[10px] font-mono px-2 py-1 rounded transition-colors shrink-0"
      >
        Unequip
      </button>
    </div>
  );
};

export default CharacterSheet;
