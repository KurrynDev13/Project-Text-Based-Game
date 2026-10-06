import React from 'react';
import { createPortal } from 'react-dom';
import { PlayerCharacter, EquipmentItem } from '../types/game';
import {
  calcItemPowerRating,
  totalCowriesFromWallet,
  cowriesToWallet,
  calcDerivedStats,
  getEquippedItemForCategory,
  calcItemDelta,
} from '../utils/gameFormulas';
import { soundFX } from '../utils/audio';

interface ForgePurchaseModalProps {
  item: EquipmentItem | null;
  onClose: () => void;
  player: PlayerCharacter;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error', icon?: string) => void;
  stock?: number;
  onPurchaseSuccess?: (item: EquipmentItem) => void;
  customCostCC?: number;
  discountPercent?: number;
  actionButtonText?: string;
  vendorTitle?: string;
  hideStock?: boolean;
}

export function formatPreColonialCurrencyBadge(costInCowries: number): {
  gold: number;
  silver: number;
  shells: number;
  formatted: string;
} {
  const safeCost = Math.max(0, costInCowries);
  const gold = Math.floor(safeCost / 10000);
  const remainder = safeCost % 10000;
  const silver = Math.floor(remainder / 100);
  const shells = remainder % 100;

  const parts: string[] = [];
  if (gold > 0) parts.push(`${gold} 🪙 Gold`);
  if (silver > 0) parts.push(`${silver} 🥈 Silver`);
  if (shells > 0 || parts.length === 0) parts.push(`${shells} 🐚 Shells`);

  return { gold, silver, shells, formatted: parts.join(' ') };
}

export const ForgePurchaseModal: React.FC<ForgePurchaseModalProps> = ({
  item,
  onClose,
  player,
  onUpdatePlayer,
  onShowToast,
  stock = 1,
  onPurchaseSuccess,
  customCostCC,
  discountPercent,
  actionButtonText,
  vendorTitle,
  hideStock = false,
}) => {
  if (!item) return null;

  const derived = calcDerivedStats(player.attributes, player.level, player.equipment);
  const totalCowries = totalCowriesFromWallet(player.wallet);
  const effectiveCostCC = customCostCC !== undefined ? customCostCC : item.costInCC;
  const price = formatPreColonialCurrencyBadge(effectiveCostCC);

  // Compare against currently equipped item
  const equippedItem = getEquippedItemForCategory(player.equipment, item.category);
  const delta = calcItemDelta(item, equippedItem);

  // Stock rule (not bound to what's in player inventory)
  const isOutOfStock = !hideStock && stock <= 0;
  const canAfford = totalCowries >= effectiveCostCC;
  const isInventoryFull = player.inventory.length >= derived.inventoryCapacity;

  const handlePurchase = () => {
    if (isOutOfStock) {
      onShowToast?.(`⚠️ Sold Out! ${item.name} is currently out of stock.`, 'warning', '🔒');
      return;
    }
    if (isInventoryFull) {
      onShowToast?.('🎒 Inventory Full! Stash excess gear in the Royal Vault first.', 'warning', '🎒');
      return;
    }
    if (!canAfford) {
      onShowToast?.(`❌ Insufficient funds! Requires ${price.formatted}.`, 'error', '💰');
      return;
    }

    const newWallet = cowriesToWallet(
      totalCowries - effectiveCostCC,
      player.wallet.mutyaShards ?? player.wallet.prismaticShards ?? 0
    );

    const purchased: EquipmentItem = {
      ...item,
      id: `${item.id}_${Date.now()}`,
    };

    onUpdatePlayer({
      ...player,
      wallet: { ...player.wallet, ...newWallet },
      inventory: [...player.inventory, purchased],
    });

    onPurchaseSuccess?.(purchased);

    soundFX.playCoinClink();
    onShowToast?.(`⚒️ Purchased ${item.name} for ${price.formatted}!`, 'success', '⚔️');
    onClose();
  };

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-zinc-950/85 backdrop-blur-sm animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-amber-600/60 rounded-2xl w-full max-w-sm max-h-[88vh] flex flex-col overflow-hidden shadow-2xl font-sans"
      >
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-r from-amber-950/90 via-zinc-900 to-amber-950/90 p-3.5 border-b border-amber-800/40 flex justify-between items-start">
          <div className="min-w-0 pr-2">
            <div className="flex items-center space-x-1.5 flex-wrap">
              <span className="text-xs font-mono font-bold uppercase text-amber-400">
                Tier {item.tier} • {item.rarity}
              </span>
              <span className="text-[10px] font-mono bg-purple-950 text-purple-300 px-1.5 py-0.2 rounded border border-purple-800/40">
                Power {calcItemPowerRating(item)}
              </span>
              {discountPercent !== undefined && discountPercent > 0 && (
                <span className="text-[9.5px] font-mono bg-emerald-950 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-700/60 animate-pulse">
                  {discountPercent}% OFF
                </span>
              )}
            </div>
            <h3 className="text-base font-bold font-serif text-white mt-0.5 truncate">{item.name}</h3>
            <div className="text-[11px] font-mono text-zinc-400 truncate">{item.archetype}</div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center font-bold text-xs shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body Stats & Details - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 font-mono text-xs min-h-0">
          {/* Main Stat Display */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 space-y-1">
            {item.baseDefense !== undefined && (
              <div className="flex justify-between items-center text-emerald-400 font-bold">
                <span>🛡️ Base Armor:</span>
                <span>+{item.baseDefense} Armor</span>
              </div>
            )}
            {item.baseDamageMin !== undefined && (
              <div className="flex justify-between items-center text-amber-300 font-bold">
                <span>⚔️ Attack Damage:</span>
                <span>{item.baseDamageMin} - {item.baseDamageMax} ({item.damageType || 'PHYSICAL'})</span>
              </div>
            )}
            <div className="flex justify-between items-center text-zinc-400 text-[11px] pt-1 border-t border-zinc-850">
              <span>Required Level:</span>
              <span className={player.level >= item.levelReq ? 'text-zinc-200' : 'text-red-400 font-bold'}>
                Level {item.levelReq}
              </span>
            </div>
            {item.classReq && item.classReq.length > 0 && (
              <div className="flex justify-between items-center text-zinc-400 text-[11px]">
                <span>Class Fit:</span>
                <span className="text-purple-300">{item.classReq.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Delta vs Currently Equipped */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 space-y-1.5 shadow-inner">
            <div className="flex justify-between items-center text-[11px] font-mono">
              <span className="text-zinc-400">Comparing vs Equipped:</span>
              <span className="text-zinc-200 font-semibold truncate max-w-[170px]" title={equippedItem?.name}>
                {equippedItem ? equippedItem.name : 'None (Empty Slot)'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono font-bold pt-1 border-t border-zinc-850">
              <span className="text-zinc-400">Power Delta:</span>
              <span className={delta.deltaPower > 0 ? 'text-emerald-400' : delta.deltaPower < 0 ? 'text-rose-400' : 'text-zinc-400'}>
                {delta.deltaPower > 0 ? `📈 +${delta.deltaPower} Power` : delta.deltaPower < 0 ? `📉 ${delta.deltaPower} Power` : '➡️ +0 Power'}
              </span>
            </div>

            {item.baseDefense !== undefined && (
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-zinc-400">Armor Delta:</span>
                <span className={delta.deltaArmor > 0 ? 'text-emerald-400' : delta.deltaArmor < 0 ? 'text-rose-400' : 'text-zinc-400'}>
                  {delta.deltaArmor > 0 ? `🛡️ +${delta.deltaArmor} Armor` : delta.deltaArmor < 0 ? `🛡️ ${delta.deltaArmor} Armor` : '🛡️ +0 Armor'}
                </span>
              </div>
            )}

            {item.baseDamageMin !== undefined && (
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-zinc-400">Weapon Damage:</span>
                <span className={delta.deltaAvgDamage > 0 ? 'text-emerald-400' : delta.deltaAvgDamage < 0 ? 'text-rose-400' : 'text-zinc-400'}>
                  {delta.deltaAvgDamage > 0 ? `⚔️ +${delta.deltaAvgDamage} Avg Dmg` : delta.deltaAvgDamage < 0 ? `⚔️ ${delta.deltaAvgDamage} Avg Dmg` : '⚔️ +0 Avg Dmg'}
                </span>
              </div>
            )}

            {delta.statHighlights && delta.statHighlights.length > 0 && (
              <div className="text-[10px] font-mono text-purple-300 pt-0.5">
                Bonus Traits: {delta.statHighlights.join(', ')}
              </div>
            )}

            {item.classReq && item.classReq.length > 0 && !item.classReq.includes(player.heroClass as any) && (
              <div className="bg-red-950/80 border border-red-700/60 p-1.5 rounded text-[10px] text-red-300 font-bold mt-1">
                ⚠️ Class Mismatch: Requires {item.classReq.join(', ')} (You are {player.heroClass})
              </div>
            )}
          </div>

          {/* Inherent Perk */}
          {item.inherentPerk && (
            <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-2.5 text-[11px]">
              <span className="text-amber-400 font-bold block mb-0.5">✨ Inherent Trait:</span>
              <span className="text-zinc-300">{item.inherentPerk}</span>
            </div>
          )}

          {/* Affixes */}
          {item.affixes && item.affixes.length > 0 && (
            <div className="bg-purple-950/20 border border-purple-800/30 rounded-xl p-2.5 text-[11px] space-y-1">
              <span className="text-purple-400 font-bold block mb-0.5">✨ Imbued Affixes:</span>
              {item.affixes.map((aff, i) => (
                <div key={i} className="flex justify-between items-center text-zinc-300 text-[10px]">
                  <span className="font-semibold text-purple-300">{aff.name}</span>
                  <span className="text-amber-300">{aff.type}</span>
                </div>
              ))}
            </div>
          )}

          {/* Stock Indicator */}
          {!hideStock && (
            <div className="flex justify-between items-center text-[11px] bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-800">
              <span className="text-zinc-400">Armory Inventory:</span>
              <span className={isOutOfStock ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                {isOutOfStock ? '0 In Stock (Sold Out)' : `${stock} In Stock`}
              </span>
            </div>
          )}

          {/* Pre-Colonial Tiered Price */}
          <div className="bg-zinc-950 border border-amber-900/40 rounded-xl p-2.5 space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase">
              {vendorTitle || "Smith's Price (Pre-Colonial Currency)"}:
            </div>
            <div className="text-sm font-bold text-amber-300 flex items-center space-x-2 flex-wrap">
              {price.gold > 0 && <span className="text-amber-300">{price.gold} 🪙 Gold</span>}
              {price.silver > 0 && <span className="text-zinc-200">{price.silver} 🥈 Silver</span>}
              {price.shells > 0 && <span className="text-cyan-200">{price.shells} 🐚 Shells</span>}
            </div>
            <div className="text-[10px] text-zinc-500">
              Total Cowries equivalent: {effectiveCostCC} shells (100:1 ratio)
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="shrink-0 bg-zinc-950 p-3 border-t border-zinc-800 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-mono"
          >
            Cancel
          </button>

          <button
            onClick={handlePurchase}
            disabled={!canAfford || isOutOfStock || isInventoryFull}
            className={`px-4 py-1.5 rounded-lg font-mono font-bold text-xs uppercase tracking-wider transition-all shadow ${
              isOutOfStock
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : !canAfford
                ? 'bg-zinc-800 text-red-400 cursor-not-allowed border border-red-900/40'
                : 'bg-amber-600 hover:bg-amber-500 text-zinc-950 active:scale-95'
            }`}
          >
            {isOutOfStock ? 'Sold Out' : !canAfford ? 'Cannot Afford' : (actionButtonText || 'Buy Equipment')}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export default ForgePurchaseModal;

