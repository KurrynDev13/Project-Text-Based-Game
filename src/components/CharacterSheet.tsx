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
}

export const CharacterSheet: React.FC<CharacterSheetProps> = ({
  player,
  setPlayer,
  onUnequipItem,
}) => {
  // Tab system: STATS or SKILLS
  const [activeTab, setActiveTab] = useState<'STATS' | 'SKILLS'>('STATS');
  const [showSkillsTutorial, setShowSkillsTutorial] = useState(false);

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

  return (
    <div className="flex flex-col h-full bg-transparent text-amber-100 p-4 md:p-6 space-y-6 overflow-y-auto">
      {/* Hero Header & Power Level */}
      <div className="bg-zinc-950/80 backdrop-blur-md border border-amber-900/50 rounded-xl p-5 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl md:text-3xl font-bold font-serif text-amber-200">{player.name}</h2>
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold px-2.5 py-0.5 rounded uppercase">
              {player.heroClass} · Level {player.level}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            EXP: {player.exp} / {derived.expRequiredNextLevel} ({Math.floor((player.exp / derived.expRequiredNextLevel) * 100)}%)
          </p>
          <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden mt-2 border border-zinc-800">
            <div
              className="bg-gradient-to-r from-amber-600 to-amber-400 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, (player.exp / derived.expRequiredNextLevel) * 100)}%` }}
            />
          </div>
        </div>

        {/* Titan Conquest Power Rating Badge */}
        <div className="bg-zinc-950 border-2 border-amber-500/80 px-5 py-3 rounded-xl flex items-center space-x-3 shadow-lg">
          <div className="text-3xl">⚔️</div>
          <div>
            <div className="text-[10px] font-mono uppercase text-amber-400 tracking-wider">Titan Power Rating</div>
            <div className="text-2xl font-bold font-mono text-amber-200">{derived.powerLevel} POWER</div>
          </div>
        </div>
      </div>

      {/* Tab Switcher: STATS | SKILLS */}
      <div className="flex space-x-2 border-b border-zinc-800 pb-1">
        <button
          onClick={() => setActiveTab('STATS')}
          className={`px-5 py-2 rounded-t-lg text-sm font-bold font-mono uppercase tracking-wider transition-colors ${
            activeTab === 'STATS'
              ? 'bg-amber-600 text-zinc-950'
              : 'text-zinc-400 hover:text-amber-300'
          }`}
        >
          ⚔️ Stats
        </button>
        <button
          onClick={handleSelectSkillsTab}
          className={`px-5 py-2 rounded-t-lg text-sm font-bold font-mono uppercase tracking-wider transition-colors ${
            activeTab === 'SKILLS'
              ? 'bg-amber-600 text-zinc-950'
              : 'text-zinc-400 hover:text-amber-300'
          }`}
        >
          ✨ Mutya Skills
        </button>
      </div>

      {/* STATS TAB */}
      {activeTab === 'STATS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Attributes Allocation */}
          <div className="bg-zinc-900/80 p-5 rounded-xl border border-zinc-800 space-y-4 shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="font-serif font-bold text-lg text-amber-200">Attributes</h3>
              <span className="text-xs font-mono text-amber-400 font-semibold">AP: {player.availableAP}</span>
            </div>

            <div className="space-y-3">
              {/* STR */}
              <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-white">Strength (STR): <span className="text-amber-400">{player.attributes.str}</span></div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">+2.5 Melee DMG, +1 Inv slot / 2 pts</div>
                </div>
                <button
                  disabled={player.availableAP <= 0}
                  onClick={() => allocatePoint('str')}
                  className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold px-3 py-1 rounded text-xs font-mono disabled:opacity-40"
                >
                  + Point
                </button>
              </div>

              {/* AGI */}
              <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-white">Agility (AGI): <span className="text-emerald-400">{player.attributes.agi}</span></div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">+2.5 Bow/Dagger DMG, +0.3% Dodge, +0.5% Crit</div>
                </div>
                <button
                  disabled={player.availableAP <= 0}
                  onClick={() => allocatePoint('agi')}
                  className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold px-3 py-1 rounded text-xs font-mono disabled:opacity-40"
                >
                  + Point
                </button>
              </div>

              {/* INT */}
              <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-white">Intelligence (INT): <span className="text-sky-400">{player.attributes.int}</span></div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">+3.0 Magic DMG, +10 Max MP, +0.5 Magic Def</div>
                </div>
                <button
                  disabled={player.availableAP <= 0}
                  onClick={() => allocatePoint('int')}
                  className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold px-3 py-1 rounded text-xs font-mono disabled:opacity-40"
                >
                  + Point
                </button>
              </div>

              {/* VIT */}
              <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-white">Vitality (VIT): <span className="text-red-400">{player.attributes.vit}</span></div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">+25 Max HP, +0.8 Armor, +1 HP regen/tick</div>
                </div>
                <button
                  disabled={player.availableAP <= 0}
                  onClick={() => allocatePoint('vit')}
                  className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold px-3 py-1 rounded text-xs font-mono disabled:opacity-40"
                >
                  + Point
                </button>
              </div>
            </div>
          </div>

          {/* Center Column: Paper Doll Gear Slots — Single Weapon Slot */}
          <div className="bg-zinc-900/80 p-5 rounded-xl border border-zinc-800 space-y-4 shadow-md">
            <h3 className="font-serif font-bold text-lg text-amber-200 pb-2 border-b border-zinc-800">
              Titan Gear Slots
            </h3>

            <div className="space-y-2.5">
              {/* Single Weapon Slot (new unified slot; falls back to deprecated primaryWeapon for old saves) */}
              <EquippedSlotCard
                slotTitle="Weapon"
                item={player.equipment.weapon ?? player.equipment.primaryWeapon ?? null}
                onUnequip={() => onUnequipItem('weapon')}
              />
              <EquippedSlotCard slotTitle="Upper Armor" item={player.equipment.upperArmor} onUnequip={() => onUnequipItem('upperArmor')} />
              <EquippedSlotCard slotTitle="Lower Armor" item={player.equipment.lowerArmor} onUnequip={() => onUnequipItem('lowerArmor')} />
              <EquippedSlotCard
                slotTitle={player.act6Completed || player.mountUnlocked ? 'Mythical Mount' : 'Mount (Locked: Post-Act 6)'}
                item={player.equipment.mount || player.equipment.bike || null}
                onUnequip={() => onUnequipItem('mount')}
              />
            </div>
          </div>

          {/* Right Column: Expanded Derived Combat Metrics */}
          <div className="bg-zinc-950/80 p-4 md:p-5 rounded-xl border border-zinc-800 space-y-4 shadow-md">
            <h3 className="font-serif font-bold text-lg text-amber-200 pb-2 border-b border-zinc-800">
              Combat Metrics
            </h3>

            {/* Category 1: Vitality & Survival */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono font-bold uppercase text-amber-500 tracking-wider">
                ❤️ VITALITY &amp; REGENERATION
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-zinc-950 rounded border border-red-900/40">
                  <span className="text-zinc-400 text-[10px] block font-semibold">Max HP</span>
                  <span className="text-red-400 font-bold text-sm">{derived.maxHp} HP</span>
                </div>
                <div className="p-2.5 bg-zinc-950 rounded border border-sky-900/40">
                  <span className="text-zinc-400 text-[10px] block font-semibold">Max MP</span>
                  <span className="text-sky-400 font-bold text-sm">{derived.maxMp} MP</span>
                </div>
                <div className="p-2.5 bg-zinc-950 rounded border border-pink-900/40">
                  <span className="text-zinc-400 text-[10px] block font-semibold">HP Passive Regen</span>
                  <span className="text-pink-400 font-bold text-sm">+{derived.hpRegenRate} HP / 10s</span>
                </div>
                <div className="p-2.5 bg-zinc-950 rounded border border-amber-900/40">
                  <span className="text-zinc-400 text-[10px] block font-semibold">Carrying Capacity</span>
                  <span className="text-amber-300 font-bold text-sm">🎒 {derived.inventoryCapacity} Slots</span>
                </div>
              </div>
            </div>

            {/* Category 2: Offense & Weapon Damage */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-mono font-bold uppercase text-amber-500 tracking-wider">
                ⚔️ OFFENSE &amp; WEAPON SCALING
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className={`p-2.5 bg-zinc-950 rounded border ${player.heroClass === 'Mandirigma' ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-zinc-800'}`}>
                  <span className="text-zinc-400 text-[10px] block font-semibold">Melee Physical DMG</span>
                  <span className="text-amber-300 font-bold text-sm">⚔️ {derived.meleeDamage}</span>
                </div>
                <div className={`p-2.5 bg-zinc-950 rounded border ${player.heroClass === 'Bagani' || player.heroClass === 'Mangangaso' ? 'border-emerald-500 ring-1 ring-emerald-500/50' : 'border-zinc-800'}`}>
                  <span className="text-zinc-400 text-[10px] block font-semibold">Ranged / Agility DMG</span>
                  <span className="text-emerald-400 font-bold text-sm">🏹 {derived.rangedDamage}</span>
                </div>
                <div className={`p-2.5 bg-zinc-950 rounded border ${player.heroClass === 'Babaylan' ? 'border-purple-500 ring-1 ring-purple-500/50' : 'border-zinc-800'}`}>
                  <span className="text-zinc-400 text-[10px] block font-semibold">Magic Spell DMG</span>
                  <span className="text-purple-300 font-bold text-sm">🔮 {derived.magicDamage}</span>
                </div>
                <div className="p-2.5 bg-zinc-950 rounded border border-rose-900/40">
                  <span className="text-zinc-400 text-[10px] block font-semibold">Critical Hit Rate</span>
                  <span className="text-rose-400 font-bold text-sm">🎯 {derived.critChancePercent.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Category 3: Defense & Avoidance */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-mono font-bold uppercase text-amber-500 tracking-wider">
                🛡️ DEFENSE &amp; AVOIDANCE
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800">
                  <span className="text-zinc-400 text-[10px] block font-semibold">Armor Rating</span>
                  <span className="text-amber-200 font-bold text-sm">🛡️ {derived.physicalArmor}</span>
                </div>
                <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800">
                  <span className="text-zinc-400 text-[10px] block font-semibold">Physical Damage Red.</span>
                  <span className="text-amber-400 font-bold text-sm">🔰 {derived.damageReductionPercent.toFixed(1)}%</span>
                </div>
                <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800">
                  <span className="text-zinc-400 text-[10px] block font-semibold">Magic Resistance</span>
                  <span className="text-purple-300 font-bold text-sm">🔮 {derived.magicDefense} ({derived.magicDRPercent.toFixed(1)}%)</span>
                </div>
                <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800">
                  <span className="text-zinc-400 text-[10px] block font-semibold">Dodge Chance</span>
                  <span className="text-emerald-400 font-bold text-sm">💨 {derived.dodgeChancePercent.toFixed(1)}%</span>
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

      {/* Feature Tutorial Modal for Skills (Phase 9.2) */}
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
      <div className="p-2.5 bg-zinc-950/50 rounded-lg border border-dashed border-zinc-800 flex justify-between items-center text-xs text-zinc-500 font-mono">
        <span>{slotTitle}</span>
        <span className="italic">Empty</span>
      </div>
    );
  }

  return (
    <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 flex justify-between items-center">
      <div>
        <div className="text-[10px] font-mono text-amber-500 uppercase">{slotTitle}</div>
        <div className="text-xs font-bold font-serif text-amber-200">{item.name}</div>
        <div className="text-[10px] text-zinc-400">
          {item.baseDefense ? `+${item.baseDefense} Armor` : `${item.baseDamageMin}-${item.baseDamageMax} DMG`} · {item.inherentPerk}
        </div>
      </div>
      <button
        onClick={onUnequip}
        className="bg-red-950/60 hover:bg-red-900 border border-red-800/60 text-red-300 text-[11px] font-mono px-2.5 py-1 rounded transition-colors"
      >
        Unequip
      </button>
    </div>
  );
};
