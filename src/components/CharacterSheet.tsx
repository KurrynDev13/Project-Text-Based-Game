import React from 'react';
import { PlayerCharacter, PrimaryAttributes, EquipmentItem } from '../types/game';
import { calcDerivedStats } from '../utils/gameFormulas';
import { soundFX } from '../utils/audio';

interface CharacterSheetProps {
  player: PlayerCharacter;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerCharacter>>;
  onUnequipItem: (slot: 'upperArmor' | 'lowerArmor' | 'primaryWeapon' | 'specialWeapon' | 'heavyWeapon' | 'bike') => void;
}

export const CharacterSheet: React.FC<CharacterSheetProps> = ({
  player,
  setPlayer,
  onUnequipItem,
}) => {
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
    <div className="flex flex-col h-full bg-zinc-950 text-amber-100 p-4 md:p-6 space-y-6 overflow-y-auto">
      {/* Hero Header & Power Level */}
      <div className="bg-zinc-900 border border-amber-900/50 rounded-xl p-5 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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

        {/* Center Column: Paper Doll Gear Slots (Titan Conquest Layout) */}
        <div className="bg-zinc-900/80 p-5 rounded-xl border border-zinc-800 space-y-4 shadow-md">
          <h3 className="font-serif font-bold text-lg text-amber-200 pb-2 border-b border-zinc-800">
            Titan Gear Slots
          </h3>

          <div className="space-y-2.5">
            <EquippedSlotCard slotTitle="Primary Weapon" item={player.equipment.primaryWeapon} onUnequip={() => onUnequipItem('primaryWeapon')} />
            <EquippedSlotCard slotTitle="Special Weapon" item={player.equipment.specialWeapon} onUnequip={() => onUnequipItem('specialWeapon')} />
            <EquippedSlotCard slotTitle="Heavy Titan Weapon" item={player.equipment.heavyWeapon} onUnequip={() => onUnequipItem('heavyWeapon')} />
            <EquippedSlotCard slotTitle="Upper Armor" item={player.equipment.upperArmor} onUnequip={() => onUnequipItem('upperArmor')} />
            <EquippedSlotCard slotTitle="Lower Armor" item={player.equipment.lowerArmor} onUnequip={() => onUnequipItem('lowerArmor')} />
            <EquippedSlotCard slotTitle="Vehicle / Bike" item={player.equipment.bike} onUnequip={() => onUnequipItem('bike')} />
          </div>
        </div>

        {/* Right Column: Derived Combat Metrics */}
        <div className="bg-zinc-900/80 p-5 rounded-xl border border-zinc-800 space-y-4 shadow-md">
          <h3 className="font-serif font-bold text-lg text-amber-200 pb-2 border-b border-zinc-800">
            Combat Metrics
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Max HP</span>
              <span className="text-red-400 font-bold text-sm">{derived.maxHp} HP</span>
            </div>
            <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Max MP</span>
              <span className="text-sky-400 font-bold text-sm">{derived.maxMp} MP</span>
            </div>
            <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Armor Rating</span>
              <span className="text-amber-200 font-bold text-sm">{derived.physicalArmor}</span>
            </div>
            <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Damage Reduction</span>
              <span className="text-amber-400 font-bold text-sm">{derived.damageReductionPercent.toFixed(1)}%</span>
            </div>
            <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Dodge Chance</span>
              <span className="text-emerald-400 font-bold text-sm">{derived.dodgeChancePercent.toFixed(1)}%</span>
            </div>
            <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Crit Hit Rate</span>
              <span className="text-rose-400 font-bold text-sm">{derived.critChancePercent.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface EquippedSlotCardProps {
  slotTitle: string;
  item: EquipmentItem | null;
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
