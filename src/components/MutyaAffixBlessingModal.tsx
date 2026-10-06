import React from 'react';
import { createPortal } from 'react-dom';
import { PlayerCharacter, EquipmentItem } from '../types/game';
import { ENCHANTER_PREFIXES, ENCHANTER_SUFFIXES } from '../data/equipmentData';
import { calcItemPowerRating, getEquippedItemForCategory, calcItemDelta } from '../utils/gameFormulas';
import { formatEquipmentFullName } from '../utils/equipmentGenerator';
import { soundFX } from '../utils/audio';

interface MutyaAffixBlessingModalProps {
  item: EquipmentItem | null;
  onClose: () => void;
  player: PlayerCharacter;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error', icon?: string) => void;
}

const BLESSING_TIERS = [
  { attempt: 1, breakRisk: 5, statBonusPercent: 15, title: 'Lesser Anito Blessing', color: 'text-emerald-400' },
  { attempt: 2, breakRisk: 15, statBonusPercent: 35, title: 'Potent Diwata Blessing', color: 'text-cyan-400' },
  { attempt: 3, breakRisk: 30, statBonusPercent: 60, title: 'Major Ancestral Blessing', color: 'text-purple-400' },
  { attempt: 4, breakRisk: 50, statBonusPercent: 95, title: 'Supreme Bathala Blessing', color: 'text-amber-400' },
  { attempt: 5, breakRisk: 80, statBonusPercent: 150, title: 'Transcendent Celestial God-Roll', color: 'text-red-400' },
];

export const MutyaAffixBlessingModal: React.FC<MutyaAffixBlessingModalProps> = ({
  item,
  onClose,
  player,
  onUpdatePlayer,
  onShowToast,
}) => {
  if (!item) return null;

  const currentAttempts = item.blessingAttempts || 0;
  const maxAttempts = 5;
  const remainingAttempts = Math.max(0, maxAttempts - currentAttempts);
  const isTooFragile = currentAttempts >= maxAttempts;

  const currentTierInfo = isTooFragile
    ? { attempt: 5, breakRisk: 100, statBonusPercent: 0, title: 'Item Brittleness Maxed', color: 'text-zinc-500' }
    : BLESSING_TIERS[currentAttempts];

  const currentPower = calcItemPowerRating(item);

  // Delta vs Equipped calculation
  const equippedItem = getEquippedItemForCategory(player.equipment, item.category);
  const isCurrentlyEquipped = equippedItem?.id === item.id;
  const delta = equippedItem && !isCurrentlyEquipped ? calcItemDelta(item, equippedItem) : null;

  const icon =
    item.category === 'SWORD' ? '⚔️' :
    item.category === 'DAGGER' ? '🗡️' :
    item.category === 'BOW' ? '🏹' :
    item.category === 'STAFF' ? '🔮' :
    item.category === 'UPPER' ? '🥋' :
    item.category === 'LOWER' ? '👖' : '🛡️';

  const statSummary = item.baseDefense !== undefined
    ? `+${item.baseDefense} Armor`
    : item.baseDamageMin !== undefined
    ? `${item.baseDamageMin}-${item.baseDamageMax} Dmg`
    : item.archetype;

  // Mutya Pearl cost scales with gear power rating
  const calcMutyaCost = (): number => {
    if (currentPower < 60) return 1;
    if (currentPower < 120) return 2;
    if (currentPower < 180) return 3;
    if (currentPower < 240) return 4;
    return 5;
  };

  const requiredMutya = calcMutyaCost();
  const availableMutya = player.wallet.mutyaShards ?? player.wallet.prismaticShards ?? 0;
  const canAfford = availableMutya >= requiredMutya;

  const handleExecuteBlessing = () => {
    if (isTooFragile) {
      onShowToast?.('⛔ Equipment has reached maximum brittleness and cannot be blessed further!', 'error', '⛔');
      return;
    }
    if (!canAfford) {
      onShowToast?.(`🔮 Insufficient Mutya Pearls! Requires ${requiredMutya} Mutya Pearls (you have ${availableMutya}).`, 'error', '🔮');
      return;
    }

    // Roll for Break Risk failure
    const roll = Math.random() * 100;
    const isBroken = roll < currentTierInfo.breakRisk;

    const remainingMutya = Math.max(0, availableMutya - requiredMutya);
    const newWallet = {
      ...player.wallet,
      mutyaShards: remainingMutya,
      prismaticShards: remainingMutya,
    };

    if (isBroken) {
      // Equipment Destroyed!
      soundFX.playDefeatSound();

      let removed = false;
      const updatedInventory = player.inventory.filter((inv) => {
        if (!removed && inv.id === item.id) {
          removed = true;
          return false;
        }
        return true;
      });

      const updatedEquipment = { ...player.equipment };
      if (updatedEquipment.weapon?.id === item.id) updatedEquipment.weapon = null;
      if (updatedEquipment.upperArmor?.id === item.id) updatedEquipment.upperArmor = null;
      if (updatedEquipment.lowerArmor?.id === item.id) updatedEquipment.lowerArmor = null;

      onUpdatePlayer({
        ...player,
        wallet: newWallet,
        inventory: updatedInventory,
        equipment: updatedEquipment,
      });

      onShowToast?.(
        `💥 CATASTROPHIC BREAK! [${item.name}] shattered under celestial pressure into Mutya dust! (${currentTierInfo.breakRisk}% Break Risk triggered)`,
        'error',
        '💥'
      );
      onClose();
      return;
    }

    // Success! Roll random affixes with bonus stat magnitude
    const randomPrefix = ENCHANTER_PREFIXES[Math.floor(Math.random() * ENCHANTER_PREFIXES.length)];
    const randomSuffix = ENCHANTER_SUFFIXES[Math.floor(Math.random() * ENCHANTER_SUFFIXES.length)];

    const updatedItem: EquipmentItem = {
      ...item,
      name: formatEquipmentFullName(item.name, [randomPrefix, randomSuffix]),
      affixes: [randomPrefix, randomSuffix],
      blessingAttempts: currentAttempts + 1,
    };

    const updatedInventory = player.inventory.map((inv) => (inv.id === item.id ? updatedItem : inv));
    const updatedEquipment = { ...player.equipment };
    if (updatedEquipment.weapon?.id === item.id) updatedEquipment.weapon = updatedItem;
    if (updatedEquipment.upperArmor?.id === item.id) updatedEquipment.upperArmor = updatedItem;
    if (updatedEquipment.lowerArmor?.id === item.id) updatedEquipment.lowerArmor = updatedItem;

    onUpdatePlayer({
      ...player,
      wallet: newWallet,
      inventory: updatedInventory,
      equipment: updatedEquipment,
    });

    soundFX.playLevelUp();
    onShowToast?.(
      `✨ BLESSING SUCCESSFUL! [${item.name}] imbued with +${currentTierInfo.statBonusPercent}% power bonus: [${randomPrefix.name}] and [${randomSuffix.name}]!`,
      'success',
      '🔮'
    );
    onClose();
  };

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-zinc-950/85 backdrop-blur-sm animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-purple-600/60 rounded-2xl w-full max-w-sm max-h-[88vh] flex flex-col overflow-hidden shadow-2xl font-sans"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-950/90 via-zinc-900 to-purple-950/90 p-3 border-b border-purple-800/40 flex justify-between items-start">
          <div className="truncate pr-2">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-mono font-bold uppercase text-purple-300">
                Mutya Pearl Blessing Ritual
              </span>
              <span className="text-[10px] font-mono bg-purple-950 text-purple-200 px-1.5 py-0.2 rounded border border-purple-700/50">
                Power {currentPower}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold font-serif text-white mt-0.5 truncate">{item.name}</h3>
            <div className="text-[10px] font-mono text-zinc-400 truncate">
              Tier {item.tier} • {item.archetype}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center font-bold text-xs shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs min-h-0">
          {/* Compact Gear Stats & Delta vs Equipped Bar */}
          <div className="bg-zinc-950/90 border border-purple-900/40 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-[11px]">
            <div className="flex items-center space-x-2 truncate">
              <span className="text-base shrink-0">{icon}</span>
              <span className="text-amber-300 font-bold">
                {statSummary}
              </span>
              {item.levelReq && (
                <span className="text-zinc-500 text-[10px]">Lv.{item.levelReq}</span>
              )}
            </div>

            <div className="shrink-0 flex items-center">
              {isCurrentlyEquipped ? (
                <span className="text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40 text-[10px]">
                  ✨ Equipped
                </span>
              ) : delta ? (
                <div className="flex items-center space-x-1 text-[10px] font-bold">
                  <span className={delta.deltaPower > 0 ? 'text-emerald-400' : delta.deltaPower < 0 ? 'text-rose-400' : 'text-zinc-400'}>
                    {delta.deltaPower > 0 ? `📈 +${delta.deltaPower}` : delta.deltaPower < 0 ? `📉 ${delta.deltaPower}` : '➡️ +0'} Pwr
                  </span>
                  {delta.deltaArmor !== 0 && (
                    <span className={delta.deltaArmor > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      ({delta.deltaArmor > 0 ? `+${delta.deltaArmor}` : delta.deltaArmor} Def)
                    </span>
                  )}
                  {delta.deltaAvgDamage !== 0 && (
                    <span className={delta.deltaAvgDamage > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      ({delta.deltaAvgDamage > 0 ? `+${delta.deltaAvgDamage}` : delta.deltaAvgDamage} Dmg)
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-cyan-400 font-bold text-[10px]">✨ Empty Slot</span>
              )}
            </div>
          </div>

          {/* Current Affixes */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2 space-y-1">
            <span className="text-[10px] text-purple-300 font-bold uppercase block">Current Blessed Affixes:</span>
            {item.affixes && item.affixes.length > 0 ? (
              item.affixes.map((aff, i) => (
                <div key={i} className="text-zinc-200 text-[10px] flex items-center space-x-1 truncate">
                  <span>✨</span>
                  <strong className="text-purple-300 truncate">{aff.name}</strong>
                  <span className="text-zinc-500">({aff.type})</span>
                </div>
              ))
            ) : (
              <div className="text-zinc-500 italic text-[10px]">No affixes currently bound.</div>
            )}
          </div>

          {/* Escalating Risk & Reward Breakdown */}
          <div className="bg-purple-950/30 border border-purple-900/50 rounded-xl p-2 space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-300">Blessing Progress:</span>
              <span className="font-bold text-amber-300">
                Attempt {currentAttempts + 1} of {maxAttempts} ({remainingAttempts} Left)
              </span>
            </div>

            {/* Break Risk vs Stat Reward Meter */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-red-950/60 border border-red-800/40 rounded-lg p-1.5">
                <span className="text-[9px] text-red-300 uppercase block font-bold">Destruction Risk</span>
                <span className="text-xs sm:text-sm font-bold text-red-400">{currentTierInfo.breakRisk}% Break Chance</span>
              </div>
              <div className="bg-emerald-950/60 border border-emerald-800/40 rounded-lg p-1.5">
                <span className="text-[9px] text-emerald-300 uppercase block font-bold">Empowerment Reward</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-400">+{currentTierInfo.statBonusPercent}% Stat Power</span>
              </div>
            </div>

            <p className="text-[9px] text-zinc-400 leading-tight">
              As remaining attempts decrease, break risk rises sharply—granting god-tier transcendent affix rolls.
            </p>
          </div>

          {/* Cost & Wallet Status */}
          <div className="bg-zinc-950 border border-purple-900/40 rounded-xl p-2 flex justify-between items-center text-[10px]">
            <div>
              <span className="text-zinc-400 block text-[9px] uppercase">Ritual Mutya Cost</span>
              <span className="text-purple-300 font-bold text-xs sm:text-sm">{requiredMutya} Mutya Pearls 🔮</span>
            </div>
            <div className="text-right">
              <span className="text-zinc-400 block text-[9px] uppercase">Your Mutya Pearls</span>
              <span className="text-zinc-200 font-bold text-xs sm:text-sm">{availableMutya} Available</span>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="shrink-0 bg-zinc-950 p-2.5 border-t border-zinc-800 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-mono"
          >
            Cancel
          </button>

          <button
            onClick={handleExecuteBlessing}
            disabled={!canAfford || isTooFragile}
            className={`px-4 py-1.5 rounded-lg font-mono font-bold text-xs uppercase tracking-wider transition-all shadow ${
              isTooFragile
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : !canAfford
                ? 'bg-zinc-800 text-purple-400 cursor-not-allowed border border-purple-900/40'
                : 'bg-purple-600 hover:bg-purple-500 text-white active:scale-95'
            }`}
          >
            {isTooFragile ? 'Fragility Maxed' : `Bless Gear (${requiredMutya} 🔮)`}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
export default MutyaAffixBlessingModal;

