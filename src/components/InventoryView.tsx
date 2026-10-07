// src/components/InventoryView.tsx
// Redesigned Tactical Inventory View matching Image 3:
// 1. Top Player Overview & Currency HUD (with Audio toggle and Settings)
// 2. Equipped Gear 2x2 Grid Paper Doll with Dedicated Unequip Buttons
// 3. Tab Bar: Gear, Potions, Memories
// 4. Filter & Sort Bar: Sort PWR, ALL / WEAPONS / ARMOR, Bag Capacity
// 5. Forge-Store Style Item Listing with Power Delta Badges
// 6. Interactive Modal for Item Inspection (Equip, Power-Rated Sell)
// 7. Decrypt Memories Flow with "Claim to Bag" Modal

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PlayerCharacter, EquipmentItem, ConsumableItem, EncryptedMemory, ItemRarity, Affix, HeroClass } from '../types/game';
import { registerBackHandler } from '../utils/navigationStack';
import {
  UPPER_ARMORS,
  LOWER_ARMORS,
  DAGGERS,
  SWORDS,
  BOWS,
  STAVES,
  BIKES,
  ENCHANTER_PREFIXES,
  ENCHANTER_SUFFIXES,
} from '../data/equipmentData';
import {
  calcDerivedStats,
  totalCowriesFromWallet,
  cowriesToWallet,
  getEquippedItemForCategory,
  calcItemDelta,
  calcItemPowerRating,
  sortInventory,
  calcMaxStamina,
} from '../utils/gameFormulas';
import { formatEquipmentFullName } from '../utils/equipmentGenerator';
import { formatPreColonialCurrencyBadge } from './ForgePurchaseModal';
import { soundFX } from '../utils/audio';


interface InventoryViewProps {
  player: PlayerCharacter;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onNavigateCodebreaker?: () => void;
  onOpenSettings?: () => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error', icon?: string) => void;
}

/**
 * Checks whether an item can be equipped by the given hero class.
 */
export function isItemWearableForClass(item: EquipmentItem, heroClass: HeroClass): boolean {
  if (item.classReq && item.classReq.length > 0) {
    return item.classReq.includes(heroClass);
  }
  if (item.category === 'SWORD') return heroClass === 'Mandirigma';
  if (item.category === 'DAGGER') return heroClass === 'Bagani';
  if (item.category === 'BOW') return heroClass === 'Mangangaso';
  if (item.category === 'STAFF') return heroClass === 'Babaylan';
  return true; // UPPER, LOWER, MOUNT
}

/**
 * Returns human-readable allowed classes string for an item.
 */
export function getAllowedClassesText(item: EquipmentItem): string {
  if (item.classReq && item.classReq.length > 0) {
    if (item.classReq.length >= 4) return 'All Classes';
    return item.classReq.join(', ');
  }
  if (item.category === 'SWORD') return 'Mandirigma';
  if (item.category === 'DAGGER') return 'Bagani';
  if (item.category === 'BOW') return 'Mangangaso';
  if (item.category === 'STAFF') return 'Babaylan';
  return 'All Classes';
}

/**
 * Formats exact stats, buffs, and status inflictions of an affix.
 */
export function formatAffixEffect(aff: Affix): string {
  const parts: string[] = [];
  if (aff.statBonus) {
    if (aff.statBonus.str) parts.push(`+${aff.statBonus.str} STR`);
    if (aff.statBonus.agi) parts.push(`+${aff.statBonus.agi} AGI`);
    if (aff.statBonus.int) parts.push(`+${aff.statBonus.int} INT`);
    if (aff.statBonus.vit) parts.push(`+${aff.statBonus.vit} VIT`);
    if (aff.statBonus.flatArmor) parts.push(`+${aff.statBonus.flatArmor} Armor`);
    if (aff.statBonus.flatHp) parts.push(`+${aff.statBonus.flatHp} HP`);
    if (aff.statBonus.flatMp) parts.push(`+${aff.statBonus.flatMp} MP`);
    if (aff.statBonus.critPercent) parts.push(`+${aff.statBonus.critPercent}% Crit`);
    if (aff.statBonus.dodgePercent) parts.push(`+${aff.statBonus.dodgePercent}% Dodge`);
    if (aff.statBonus.magicResist) parts.push(`+${aff.statBonus.magicResist}% Res`);
  }
  if (aff.statusInfliction) {
    parts.push(`${aff.statusInfliction.chancePercent}% ${aff.statusInfliction.type} (${aff.statusInfliction.durationTurns}t)`);
  }
  if (aff.statusMitigation) {
    if (aff.statusMitigation.isImmune) {
      parts.push(`Immune to ${aff.statusMitigation.type}`);
    } else {
      parts.push(`+${aff.statusMitigation.resistancePercent}% ${aff.statusMitigation.type} Res`);
    }
  }
  return parts.length > 0 ? parts.join(', ') : 'Special Imbuement';
}

/**
 * Calculates dynamic sell price based on item power rating, tier, and rarity.
 */
export function calcItemSellValueInCC(item: EquipmentItem): number {
  const power = calcItemPowerRating(item);
  const tier = item.tier || 1;
  const rarityMult: Record<ItemRarity, number> = {
    COMMON: 1.0,
    UNCOMMON: 1.4,
    RARE: 2.0,
    EPIC: 3.2,
    LEGENDARY: 5.5,
    TRIUMPHANT: 9.0,
  };
  const mult = rarityMult[item.rarity || 'COMMON'] || 1.0;
  return Math.max(15, Math.floor((power * 2.5 + Math.pow(tier, 1.6) * 12) * mult * 0.5));
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  player,
  onUpdatePlayer,
  onOpenSettings,
  onShowToast,
}) => {
  const notify = (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', icon?: string) => {
    onShowToast?.(msg, type, icon);
  };

  const [activeTab, setActiveTab] = useState<'GEAR' | 'CONSUMABLES' | 'MEMORIES'>('GEAR');
  const [gearFilter, setGearFilter] = useState<'ALL' | 'WEAPONS' | 'ARMOR'>('ALL');
  const [selectedInspectItem, setSelectedInspectItem] = useState<EquipmentItem | null>(null);
  const [isInspectEquipped, setIsInspectEquipped] = useState<boolean>(false);
  const [pendingDecryption, setPendingDecryption] = useState<{ memory: EncryptedMemory; item: EquipmentItem } | null>(null);
  const [sortMode, setSortMode] = useState<'POWER' | 'CLASS' | 'TYPE'>('POWER');
  const derived = calcDerivedStats(player.attributes, player.level, player.equipment);

  useEffect(() => {
    if (!selectedInspectItem) return;
    return registerBackHandler(() => {
      setSelectedInspectItem(null);
      return true;
    });
  }, [selectedInspectItem]);

  useEffect(() => {
    if (!pendingDecryption) return;
    return registerBackHandler(() => {
      setPendingDecryption(null);
      return true;
    });
  }, [pendingDecryption]);

  useEffect(() => {
    if (activeTab !== 'GEAR') {
      return registerBackHandler(() => {
        setActiveTab('GEAR');
        return true;
      });
    }
  }, [activeTab]);

  // Touch gesture swipe state for switching tabs: Gear > Consumables > Memories
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Minimum swipe threshold 45px and predominantly horizontal
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      const tabs: ('GEAR' | 'CONSUMABLES' | 'MEMORIES')[] = ['GEAR', 'CONSUMABLES', 'MEMORIES'];
      const currentIndex = tabs.indexOf(activeTab);
      if (deltaX < 0 && currentIndex < tabs.length - 1) {
        // Swipe Left: Next tab (Gear -> Consumables -> Memories)
        soundFX.playClickSound();
        setActiveTab(tabs[currentIndex + 1]);
      } else if (deltaX > 0 && currentIndex > 0) {
        // Swipe Right: Prev tab (Memories -> Consumables -> Gear)
        soundFX.playClickSound();
        setActiveTab(tabs[currentIndex - 1]);
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  // Unequip item handler
  const handleUnequip = (slot: 'weapon' | 'upperArmor' | 'lowerArmor' | 'mount') => {
    soundFX.playClickSound();
    const item =
      slot === 'weapon'
        ? player.equipment.weapon ?? player.equipment.primaryWeapon ?? null
        : slot === 'upperArmor'
        ? player.equipment.upperArmor
        : slot === 'lowerArmor'
        ? player.equipment.lowerArmor
        : player.equipment.mount || player.equipment.bike || null;

    if (!item) return;

    if (player.inventory.length >= derived.inventoryCapacity) {
      notify('🎒 Inventory Full! Free up bag space before unequipping.', 'warning', '🎒');
      return;
    }

    const newEquipment = { ...player.equipment };
    if (slot === 'weapon') {
      newEquipment.weapon = null;
      newEquipment.primaryWeapon = undefined;
    } else if (slot === 'upperArmor') {
      newEquipment.upperArmor = null;
    } else if (slot === 'lowerArmor') {
      newEquipment.lowerArmor = null;
    } else if (slot === 'mount') {
      newEquipment.mount = null;
      newEquipment.bike = null;
    }

    const newInventory = sortInventory([...player.inventory, item], sortMode);
    onUpdatePlayer({
      ...player,
      equipment: newEquipment,
      inventory: newInventory,
    });
    notify(`🛡️ Unequipped: ${item.name}`, 'info', '🛡️');
  };

  // Equip item handler
  const handleEquipGear = (item: EquipmentItem) => {
    soundFX.playClickSound();

    if (!isItemWearableForClass(item, player.heroClass as any)) {
      notify(`🔒 Class Mismatch! (${player.heroClass} cannot equip this item.)`, 'warning', '🔒');
      return;
    }

    const newEquipment = { ...player.equipment };
    let unequippedItem: EquipmentItem | null = null;
    const isWeapon = ['DAGGER', 'SWORD', 'BOW', 'STAFF'].includes(item.category);

    if (item.category === 'UPPER') {
      unequippedItem = newEquipment.upperArmor;
      newEquipment.upperArmor = item;
    } else if (item.category === 'LOWER') {
      unequippedItem = newEquipment.lowerArmor;
      newEquipment.lowerArmor = item;
    } else if (item.category === 'MOUNT' || item.category === 'BIKE') {
      if (!player.act6Completed && !player.mountUnlocked) {
        notify('🔒 Mount Slot Locked! Defeat Act VI Boss to unlock Beastmaster Stables.', 'warning', '🔒');
        return;
      }
      unequippedItem = newEquipment.mount || newEquipment.bike || null;
      newEquipment.mount = item;
      newEquipment.bike = null;
    } else if (isWeapon) {
      unequippedItem = newEquipment.weapon ?? newEquipment.primaryWeapon ?? null;
      newEquipment.weapon = item;
      newEquipment.primaryWeapon = undefined;
    }

    let removed = false;
    const newInventory = player.inventory.filter((inv) => {
      if (!removed && inv.id === item.id) {
        removed = true;
        return false;
      }
      return true;
    });

    if (unequippedItem) {
      newInventory.push(unequippedItem);
    }

    onUpdatePlayer({
      ...player,
      equipment: newEquipment,
      inventory: sortInventory(newInventory, sortMode),
    });

    setSelectedInspectItem(null);
    notify(`⚔️ Equipped: ${item.name}`, 'success', '⚔️');
  };

  // Sell item handler
  const handleSellGear = (item: EquipmentItem) => {
    const sellPriceCC = calcItemSellValueInCC(item);
    const totalCC = totalCowriesFromWallet(player.wallet) + sellPriceCC;
    const newWallet = cowriesToWallet(totalCC);
    newWallet.mutyaShards = player.wallet.mutyaShards || 0;
    newWallet.prismaticShards = newWallet.mutyaShards;

    let removedSell = false;
    const remainingInventory = player.inventory.filter((inv) => {
      if (!removedSell && (inv === item || inv.id === item.id)) {
        removedSell = true;
        return false;
      }
      return true;
    });

    soundFX.playCoinSound();
    onUpdatePlayer({
      ...player,
      inventory: remainingInventory,
      wallet: newWallet,
    });
    if (selectedInspectItem === item || selectedInspectItem?.id === item.id) {
      setSelectedInspectItem(null);
    }
    const badge = formatPreColonialCurrencyBadge(sellPriceCC);
    notify(`💰 Sold ${item.name} for ${badge.formatted}!`, 'success', '💰');
  };

  // Use consumable handler
  const handleUseConsumable = (item: ConsumableItem) => {
    soundFX.playPotionSound();
    let newHp = player.currentHp;
    let newMp = player.currentMp;

    if (item.hpRestore) newHp = Math.min(derived.maxHp, newHp + item.hpRestore);
    if (item.mpRestore) newMp = Math.min(derived.maxMp, newMp + item.mpRestore);

    const newInventory = player.inventory.filter((inv) => inv.id !== item.id);
    onUpdatePlayer({
      ...player,
      currentHp: newHp,
      currentMp: newMp,
      inventory: newInventory,
    });
    notify(`🧪 Used ${item.name}`, 'info', '🧪');
  };

  // Decrypt memory workflow
  const handleStartDecryptMemory = (memory: EncryptedMemory) => {
    soundFX.playSpellSound();

    const isMountUnlocked = !!(player.act6Completed || player.mountUnlocked);
    const mountCatalog = isMountUnlocked ? BIKES : [];
    const allCatalogs = [...UPPER_ARMORS, ...LOWER_ARMORS, ...DAGGERS, ...SWORDS, ...BOWS, ...STAVES, ...mountCatalog];

    const candidateItems = allCatalogs.filter((item) => item.levelReq <= memory.minLevel + 10);
    const baseItem = candidateItems[Math.floor(Math.random() * candidateItems.length)] || allCatalogs[0];

    let itemRarity: ItemRarity = 'COMMON';
    if (memory.rarity === 'GREEN') itemRarity = 'UNCOMMON';
    if (memory.rarity === 'BLUE') itemRarity = 'RARE';
    if (memory.rarity === 'PURPLE') itemRarity = 'EPIC';
    if (memory.rarity === 'RED') itemRarity = 'TRIUMPHANT';

    const generatedAffixes = [];
    if (memory.rarity === 'BLUE' || memory.rarity === 'PURPLE' || memory.rarity === 'RED') {
      const prefix = ENCHANTER_PREFIXES[Math.floor(Math.random() * ENCHANTER_PREFIXES.length)];
      generatedAffixes.push(prefix);
    }
    if (memory.rarity === 'PURPLE' || memory.rarity === 'RED') {
      const suffix = ENCHANTER_SUFFIXES[Math.floor(Math.random() * ENCHANTER_SUFFIXES.length)];
      generatedAffixes.push(suffix);
    }

    const newItem: EquipmentItem = {
      ...baseItem,
      id: `decrypted_${Date.now()}_${Math.random()}`,
      name: formatEquipmentFullName(baseItem.name, generatedAffixes),
      rarity: itemRarity,
      affixes: generatedAffixes,
    };

    setPendingDecryption({ memory, item: newItem });
  };

  // Claim decrypted item into bag
  const handleClaimDecrypted = () => {
    if (!pendingDecryption) return;

    if (player.inventory.length >= derived.inventoryCapacity) {
      notify('🎒 Inventory Full! Free up space in your bag first.', 'warning', '🎒');
      return;
    }

    const { memory, item } = pendingDecryption;
    const updatedMemories = (player.encryptedMemories || []).filter((m) => m.id !== memory.id);
    const updatedInventory = sortInventory([...player.inventory, item], sortMode);

    onUpdatePlayer({
      ...player,
      encryptedMemories: updatedMemories,
      inventory: updatedInventory,
    });

    soundFX.playLevelUpSound();
    notify(`✨ Claimed [${item.name}] into your bag!`, 'success', '💎');
    setPendingDecryption(null);
  };

  // Cycle Sort
  const handleToggleSort = () => {
    soundFX.playClickSound();
    let next: 'POWER' | 'CLASS' | 'TYPE' = 'POWER';
    if (sortMode === 'POWER') next = 'CLASS';
    else if (sortMode === 'CLASS') next = 'TYPE';
    else next = 'POWER';

    setSortMode(next);
    const sorted = sortInventory(player.inventory, next);
    onUpdatePlayer({ ...player, inventory: sorted });
  };

  // Filtered Gear items
  const allGearItems = player.inventory.filter((i): i is EquipmentItem =>
    'category' in i && ['UPPER', 'LOWER', 'DAGGER', 'SWORD', 'BOW', 'STAFF', 'MOUNT', 'BIKE'].includes(i.category)
  );

  const displayedGearItems = allGearItems.filter((item) => {
    if (gearFilter === 'ALL') return true;
    if (gearFilter === 'WEAPONS') return ['DAGGER', 'SWORD', 'BOW', 'STAFF'].includes(item.category);
    if (gearFilter === 'ARMOR') return ['UPPER', 'LOWER'].includes(item.category);
    return true;
  });

  const consumableItems = player.inventory.filter((i): i is ConsumableItem =>
    'category' in i && ['POTION', 'FOOD', 'ELIXIR', 'VIAL', 'VITALITY', 'PANACEA', 'TINCTURE'].includes(i.category)
  );

  const memoriesList = player.encryptedMemories || [];

  const equippedWeapon = player.equipment.weapon ?? player.equipment.primaryWeapon ?? null;
  const isMountUnlocked = !!(player.act6Completed || player.mountUnlocked);
  const equippedMount = player.equipment.mount || player.equipment.bike || null;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex flex-col flex-1 h-full min-h-full bg-transparent text-amber-100 p-2 sm:p-3 space-y-2 overflow-hidden font-sans select-none"
    >

      {/* ── 1. EQUIPPED GEAR (Compact 2x2 Grid with Unequip) ────────────────── */}
      <div className="space-y-1 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-[9.5px] font-mono font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1">
            <span>ᜐᜓᜎᜓᜆ᜔</span>
            <span>• EQUIPPED GEAR</span>
          </h3>
          <span className="text-[9px] font-mono text-zinc-400">
            Tap Unequip to unbind
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {/* Slot 1: UPPER ARMOR */}
          <div
            onClick={() => {
              if (player.equipment.upperArmor) {
                soundFX.playClickSound();
                setIsInspectEquipped(true);
                setSelectedInspectItem(player.equipment.upperArmor);
              }
            }}
            className={`p-2 bg-[#0c0f16]/50 backdrop-blur-sm border border-zinc-800/80 hover:border-amber-500/40 rounded-xl flex items-center justify-between min-h-[42px] shadow-md transition-all ${
              player.equipment.upperArmor ? 'cursor-pointer hover:bg-zinc-900/60 active:scale-[0.98]' : ''
            }`}
          >
            <div className="truncate pr-1">
              <div className="flex items-center gap-1">
                <span className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-wide shrink-0">UPR:</span>
                <h4 className="font-serif text-amber-100 font-bold text-[11px] truncate leading-tight">
                  {player.equipment.upperArmor?.name || 'No Armor'}
                </h4>
              </div>
              <p className="text-[9px] font-mono text-amber-400/90 leading-none mt-0.5">
                {player.equipment.upperArmor ? `+${player.equipment.upperArmor.baseDefense} Armor` : '--'}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUnequip('upperArmor');
              }}
              disabled={!player.equipment.upperArmor}
              className="px-2 py-1 rounded-lg border border-red-900/60 bg-red-950/50 hover:bg-red-900/60 text-red-300 disabled:opacity-20 disabled:cursor-not-allowed text-[9px] font-mono transition-colors shrink-0 cursor-pointer active:scale-95"
            >
              Unequip
            </button>
          </div>

          {/* Slot 2: LOWER ARMOR */}
          <div
            onClick={() => {
              if (player.equipment.lowerArmor) {
                soundFX.playClickSound();
                setIsInspectEquipped(true);
                setSelectedInspectItem(player.equipment.lowerArmor);
              }
            }}
            className={`p-2 bg-[#0c0f16]/50 backdrop-blur-sm border border-zinc-800/80 hover:border-amber-500/40 rounded-xl flex items-center justify-between min-h-[42px] shadow-md transition-all ${
              player.equipment.lowerArmor ? 'cursor-pointer hover:bg-zinc-900/60 active:scale-[0.98]' : ''
            }`}
          >
            <div className="truncate pr-1">
              <div className="flex items-center gap-1">
                <span className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-wide shrink-0">LWR:</span>
                <h4 className="font-serif text-amber-100 font-bold text-[11px] truncate leading-tight">
                  {player.equipment.lowerArmor?.name || 'No Armor'}
                </h4>
              </div>
              <p className="text-[9px] font-mono text-amber-400/90 leading-none mt-0.5">
                {player.equipment.lowerArmor ? `+${player.equipment.lowerArmor.baseDefense} Armor` : '--'}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUnequip('lowerArmor');
              }}
              disabled={!player.equipment.lowerArmor}
              className="px-2 py-1 rounded-lg border border-red-900/60 bg-red-950/50 hover:bg-red-900/60 text-red-300 disabled:opacity-20 disabled:cursor-not-allowed text-[9px] font-mono transition-colors shrink-0 cursor-pointer active:scale-95"
            >
              Unequip
            </button>
          </div>

          {/* Slot 3: WEAPON */}
          <div
            onClick={() => {
              if (equippedWeapon) {
                soundFX.playClickSound();
                setIsInspectEquipped(true);
                setSelectedInspectItem(equippedWeapon);
              }
            }}
            className={`p-2 bg-[#0c0f16]/50 backdrop-blur-sm border border-zinc-800/80 hover:border-amber-500/40 rounded-xl flex items-center justify-between min-h-[42px] shadow-md transition-all ${
              equippedWeapon ? 'cursor-pointer hover:bg-zinc-900/60 active:scale-[0.98]' : ''
            }`}
          >
            <div className="truncate pr-1">
              <div className="flex items-center gap-1">
                <span className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-wide shrink-0">WPN:</span>
                <h4 className="font-serif text-amber-100 font-bold text-[11px] truncate leading-tight">
                  {equippedWeapon?.name || 'Bare Fists'}
                </h4>
              </div>
              <p className="text-[9px] font-mono text-cyan-300 leading-none mt-0.5">
                {equippedWeapon ? `${equippedWeapon.baseDamageMin}-${equippedWeapon.baseDamageMax} DMG` : '1-2 DMG'}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUnequip('weapon');
              }}
              disabled={!equippedWeapon}
              className="px-2 py-1 rounded-lg border border-red-900/60 bg-red-950/50 hover:bg-red-900/60 text-red-300 disabled:opacity-20 disabled:cursor-not-allowed text-[9px] font-mono transition-colors shrink-0 cursor-pointer active:scale-95"
            >
              Unequip
            </button>
          </div>

          {/* Slot 4: MYTHICAL MOUNT */}
          <div
            onClick={() => {
              if (equippedMount) {
                soundFX.playClickSound();
                setIsInspectEquipped(true);
                setSelectedInspectItem(equippedMount);
              }
            }}
            className={`p-2 bg-[#0c0f16]/50 backdrop-blur-sm border border-zinc-800/80 hover:border-amber-500/40 rounded-xl flex items-center justify-between min-h-[42px] shadow-md transition-all ${
              equippedMount ? 'cursor-pointer hover:bg-zinc-900/60 active:scale-[0.98]' : ''
            }`}
          >
            <div className="truncate pr-1">
              <div className="flex items-center gap-1">
                <span className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-wide shrink-0">MNT:</span>
                <h4 className="font-serif text-amber-100 font-bold text-[11px] truncate leading-tight">
                  {isMountUnlocked ? equippedMount?.name || 'No Mount' : '🔒 Locked'}
                </h4>
              </div>
              <p className="text-[9px] font-mono text-zinc-500 leading-none mt-0.5">
                {isMountUnlocked ? (equippedMount ? 'Active Steed' : 'Visit Stables') : 'Defeat Act VI Boss'}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUnequip('mount');
              }}
              disabled={!isMountUnlocked || !equippedMount}
              className="px-2 py-1 rounded-lg border border-red-900/60 bg-red-950/50 hover:bg-red-900/60 text-red-300 disabled:opacity-20 disabled:cursor-not-allowed text-[9px] font-mono transition-colors shrink-0 cursor-pointer active:scale-95"
            >
              Unequip
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. CATEGORY TABS (Gear, Consumables, Memories) ──── */}
      <div className="grid grid-cols-3 gap-1.5 font-mono text-xs shrink-0">
        <button
          onClick={() => setActiveTab('GEAR')}
          className={`py-2 px-2 rounded-xl font-bold transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.97] min-h-[40px] ${
            activeTab === 'GEAR'
              ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-zinc-950 shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-300'
              : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          <span>⚔️</span>
          <span>Gear ({allGearItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CONSUMABLES')}
          className={`py-2 px-2 rounded-xl font-bold transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.97] min-h-[40px] ${
            activeTab === 'CONSUMABLES'
              ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-zinc-950 shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-300'
              : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          <span>🧪</span>
          <span>Consumables ({consumableItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('MEMORIES')}
          className={`py-2 px-2 rounded-xl font-bold transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.97] min-h-[40px] ${
            activeTab === 'MEMORIES'
              ? 'bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)] ring-1 ring-purple-300'
              : 'bg-zinc-900/80 text-purple-400 hover:text-purple-300 border border-zinc-800'
          }`}
        >
          <span>💎</span>
          <span>Memories ({memoriesList.length})</span>
        </button>
      </div>

      {/* ── 3. FILTER & SORT SUB-BAR ────────────────────────────────────────── */}
      {activeTab === 'GEAR' && (
        <div className="flex items-center justify-between bg-zinc-950/50 backdrop-blur-sm px-2 py-1 rounded-xl border border-zinc-800 text-[10px] font-mono shrink-0">
          <button
            onClick={handleToggleSort}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-amber-300 transition-colors"
          >
            <span className="text-cyan-400">🔄</span>
            <span>SORT: <strong className="text-amber-300">{sortMode === 'POWER' ? 'PWR' : sortMode}</strong></span>
          </button>

          <div className="flex items-center space-x-1">
            {(['ALL', 'WEAPONS', 'ARMOR'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setGearFilter(filter)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  gearFilter === filter
                    ? 'bg-amber-600 text-zinc-950'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <span className="text-zinc-400 font-bold">
            {player.inventory.length}/{derived.inventoryCapacity}
          </span>
        </div>
      )}

      {/* ── 4. SCROLLABLE ITEMS PANE (Shows >= 6 items initially without scrolling, Swipe Enabled) ── */}
      <div className="flex-1 overflow-y-auto min-h-[320px] sm:min-h-[380px] space-y-1.5 pr-0.5 touch-pan-y flex flex-col">
        {/* GEAR TAB */}
        {activeTab === 'GEAR' && (
          displayedGearItems.length === 0 ? (
            <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-zinc-950/40 border border-dashed border-zinc-800/80 rounded-2xl text-zinc-500 font-mono text-xs select-none">
              <span className="text-2xl mb-2 opacity-50">🎒</span>
              <span>No gear found in this category.</span>
              <span className="text-[10px] text-zinc-600 mt-1">Swipe left or right to switch inventory tabs</span>
            </div>
          ) : (
            <>
              {displayedGearItems.map((item) => {
                const equipped = getEquippedItemForCategory(player.equipment, item.category);
                const delta = calcItemDelta(item, equipped);
                const isWearable = isItemWearableForClass(item, player.heroClass as any);
                const icon =
                  item.category === 'SWORD' ? '⚔️' :
                  item.category === 'DAGGER' ? '🗡️' :
                  item.category === 'BOW' ? '🏹' :
                  item.category === 'STAFF' ? '🔮' :
                  item.category === 'UPPER' ? '🥋' :
                  item.category === 'LOWER' ? '👖' : '🐎';

                const statSummary = item.baseDefense !== undefined
                  ? `+${item.baseDefense} Armor`
                  : item.baseDamageMin !== undefined
                  ? `${item.baseDamageMin}-${item.baseDamageMax} Dmg`
                  : item.archetype;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      soundFX.playClickSound();
                      setSelectedInspectItem(item);
                    }}
                    className={`relative overflow-hidden px-2.5 py-1.5 rounded-xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group shadow ${
                      !isWearable
                        ? 'bg-red-950/20 hover:bg-red-950/30 border border-red-900/60'
                        : 'bg-zinc-950/50 backdrop-blur-sm hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-amber-600/70'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-sm w-5 text-center shrink-0">{icon}</span>
                      <div className="truncate">
                        <h4 className="font-serif font-bold text-xs text-white group-hover:text-amber-200 truncate leading-snug">
                          {item.name}
                        </h4>
                        <div className="text-[9px] font-mono text-zinc-400 truncate">
                          Tier {item.tier} • {statSummary}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0 font-mono text-[10px]">
                      <span
                        className={`px-1.5 py-0.5 rounded border font-bold flex items-center gap-1 ${
                          delta.deltaPower > 0
                            ? 'bg-emerald-950/80 border-emerald-600/50 text-emerald-300'
                            : delta.deltaPower < 0
                            ? 'bg-rose-950/80 border-rose-800/50 text-rose-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <span>📈</span>
                        <span>{delta.deltaPower > 0 ? `+${delta.deltaPower}` : delta.deltaPower} PWR</span>
                      </span>
                      <span className="text-zinc-500 group-hover:text-amber-400 font-bold text-xs">›</span>
                    </div>

                    {/* Class Mismatch Overlay (Image 1) */}
                    {!isWearable && (
                      <div className="absolute inset-0 bg-zinc-950/75 backdrop-blur-[0.5px] flex items-center justify-between px-3 pointer-events-none border border-red-500/40">
                        <div className="flex items-center gap-1.5">
                          <span className="text-red-400 text-xs">⚠️</span>
                          <span className="text-[10px] font-mono font-bold text-red-300 uppercase tracking-wider">
                            Class Mismatch
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-red-300/80 truncate ml-2">
                          Requires {getAllowedClassesText(item)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Flexible touch-receiver bottom spacer to guarantee full panel height and horizontal swipe registration */}
              <div className="flex-1 min-h-[140px] w-full pointer-events-auto" />
            </>
          )
        )}

        {/* CONSUMABLES TAB (Renamed from Potions) */}
        {activeTab === 'CONSUMABLES' && (
          consumableItems.length === 0 ? (
            <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-zinc-950/40 border border-dashed border-zinc-800/80 rounded-2xl text-zinc-500 font-mono text-xs select-none">
              <span className="text-2xl mb-2 opacity-50">🧪</span>
              <span>No consumables in your bag.</span>
              <span className="text-[10px] text-zinc-600 mt-1">Swipe left or right to switch inventory tabs</span>
            </div>
          ) : (
            <>
              {consumableItems.map((potion) => (
                <div
                  key={potion.id}
                  className="px-2.5 py-1.5 bg-zinc-950/80 border border-zinc-800/80 rounded-xl flex items-center justify-between shadow"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-sm w-5 text-center shrink-0">🧪</span>
                    <div className="truncate">
                      <h4 className="font-serif font-bold text-xs text-emerald-300 truncate leading-snug">
                        {potion.name}
                      </h4>
                      <div className="text-[9px] font-mono text-zinc-400 truncate">
                        {potion.effectDescription}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleUseConsumable(potion)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-[11px] uppercase font-mono rounded-lg transition-all active:scale-95 shrink-0 shadow"
                  >
                    Use
                  </button>
                </div>
              ))}
              {/* Flexible touch-receiver bottom spacer */}
              <div className="flex-1 min-h-[140px] w-full pointer-events-auto" />
            </>
          )
        )}

        {/* MEMORIES TAB */}
        {activeTab === 'MEMORIES' && (
          memoriesList.length === 0 ? (
            <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-zinc-950/40 border border-dashed border-zinc-800/80 rounded-2xl text-zinc-500 font-mono text-xs select-none">
              <span className="text-2xl mb-2 opacity-50">💎</span>
              <span>No encrypted memories currently in your spirit bag.</span>
              <span className="text-[10px] text-zinc-600 mt-1">Swipe left or right to switch inventory tabs</span>
            </div>
          ) : (
            <>
              {memoriesList.map((mem) => (
                <div
                  key={mem.id}
                  className="px-2.5 py-1.5 bg-zinc-950/80 border border-purple-900/50 rounded-xl flex items-center justify-between shadow"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-sm w-5 text-center shrink-0">💎</span>
                    <div className="truncate">
                      <h4 className="font-serif font-bold text-xs text-purple-200 truncate leading-snug">
                        {mem.name}
                      </h4>
                      <div className="text-[9px] font-mono text-zinc-400 truncate">
                        Min Level {mem.minLevel} • {mem.rarity} Quality
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartDecryptMemory(mem)}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] uppercase font-mono rounded-lg transition-all active:scale-95 shrink-0 shadow"
                  >
                    Decrypt
                  </button>
                </div>
              ))}
              {/* Flexible touch-receiver bottom spacer */}
              <div className="flex-1 min-h-[140px] w-full pointer-events-auto" />
            </>
          )
        )}
      </div>

      {/* ── 5. ITEM INSPECT & ACTION MODAL (Equip & Power-Rated Sell) ─────── */}
      {selectedInspectItem && (() => {
        const isInspectWearable = isItemWearableForClass(selectedInspectItem, player.heroClass as any);
        const allowedClasses = getAllowedClassesText(selectedInspectItem);

        return createPortal(
          <div
            onClick={() => {
              setSelectedInspectItem(null);
              setIsInspectEquipped(false);
            }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-zinc-950/85 backdrop-blur-sm animate-fade-in font-sans"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-amber-600/70 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl font-mono"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-amber-950 via-zinc-900 to-amber-950 p-3.5 border-b border-amber-800/40 flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-400">
                    Tier {selectedInspectItem.tier} • {selectedInspectItem.rarity}
                  </span>
                  <h3 className="font-serif text-lg font-bold text-amber-100 leading-tight">
                    {selectedInspectItem.name}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedInspectItem(null);
                    setIsInspectEquipped(false);
                  }}
                  className="text-zinc-400 hover:text-white w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-3.5 space-y-2.5 text-xs">
                {/* Primary Stats */}
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Classification:</span>
                    <span className="text-amber-300 font-bold uppercase">{selectedInspectItem.category}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Hero Class:</span>
                    <span className={`font-bold ${isInspectWearable ? 'text-emerald-400' : 'text-red-400'}`}>
                      {allowedClasses}
                    </span>
                  </div>
                  {selectedInspectItem.baseDefense !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Armor Defense:</span>
                      <span className="text-emerald-400 font-bold">+{selectedInspectItem.baseDefense}</span>
                    </div>
                  )}
                  {selectedInspectItem.baseDamageMin !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Weapon Damage:</span>
                      <span className="text-cyan-400 font-bold">
                        {selectedInspectItem.baseDamageMin} - {selectedInspectItem.baseDamageMax} DMG
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Power Rating:</span>
                    <span className="text-purple-300 font-bold">⚡ {calcItemPowerRating(selectedInspectItem)}</span>
                  </div>
                </div>

                {/* Class Mismatch Notice if not wearable */}
                {!isInspectWearable && (
                  <div className="bg-red-950/70 border border-red-800/80 p-2.5 rounded-xl flex items-center gap-2 text-[10.5px] text-red-200">
                    <span className="text-base shrink-0">⚠️</span>
                    <span>
                      <strong className="text-red-300">Class Mismatch:</strong> Your hero is a <strong className="text-white">{player.heroClass}</strong>. Only <strong className="text-amber-300">{allowedClasses}</strong> can equip this item.
                    </span>
                  </div>
                )}

                {/* Imbued Affixes: Displays exact stats/inflictions/buffs instead of Prefix/Suffix */}
                {selectedInspectItem.affixes && selectedInspectItem.affixes.length > 0 && (
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-purple-900/40 space-y-1.5">
                    <span className="text-[10px] text-purple-400 uppercase font-bold block">Imbued Affixes:</span>
                    {selectedInspectItem.affixes.map((aff, i) => (
                      <div key={i} className="text-[10px] text-purple-200 flex justify-between items-center gap-2">
                        <span className="font-semibold truncate">✨ {aff.name}</span>
                        <span className="text-amber-300 font-mono text-[9px] shrink-0 font-bold bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-800/40 max-w-[55%] text-right truncate">
                          {formatAffixEffect(aff)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dynamic Power-Rated Sell Price */}
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-amber-900/40 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-400 uppercase">
                      {isInspectEquipped ? 'Bound Gear Value:' : 'Market Resale Value:'}
                    </span>
                    {isInspectEquipped && (
                      <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-700/40">
                        Equipped & Bound
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-amber-300">
                    {formatPreColonialCurrencyBadge(calcItemSellValueInCC(selectedInspectItem)).formatted}
                  </div>
                  <div className="text-[9.5px] text-zinc-500">
                    Calculated dynamically from {calcItemPowerRating(selectedInspectItem)} Power Rating
                  </div>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="bg-zinc-950 p-3 border-t border-zinc-800 flex justify-between gap-2">
                {isInspectEquipped ? (
                  <button
                    onClick={() => {
                      setSelectedInspectItem(null);
                      setIsInspectEquipped(false);
                    }}
                    className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-750 text-zinc-200 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow"
                  >
                    Close
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleSellGear(selectedInspectItem)}
                      className="flex-1 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/60 text-emerald-200 font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
                    >
                      💰 Sell Item
                    </button>
                    <button
                      onClick={() => {
                        if (!isInspectWearable) {
                          notify(`🔒 Class Mismatch! ${player.heroClass} cannot equip this item.`, 'warning', '🔒');
                          return;
                        }
                        handleEquipGear(selectedInspectItem);
                      }}
                      disabled={!isInspectWearable}
                      className={`flex-1 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow ${
                        isInspectWearable
                          ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 active:scale-95'
                          : 'bg-zinc-900 text-zinc-500 border border-zinc-800 cursor-not-allowed opacity-60'
                      }`}
                    >
                      {isInspectWearable ? '⚔️ Equip Item' : '🔒 Class Mismatch'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* ── 7. CLAIM DECRYPTED MEMORY MODAL ─────────────────────────────────── */}
      {pendingDecryption &&
        createPortal(
          <div
            onClick={() => setPendingDecryption(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-zinc-950/85 backdrop-blur-sm animate-fade-in font-sans"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border-2 border-purple-500 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl font-mono space-y-3 p-4"
            >
              <div className="text-center space-y-1">
                <div className="text-3xl">✨</div>
                <span className="text-[10px] text-purple-400 uppercase font-bold tracking-widest">
                  MEMORY DECRYPTED!
                </span>
                <h3 className="font-serif text-lg font-bold text-amber-200">
                  {pendingDecryption.item.name}
                </h3>
                <p className="text-[10px] text-zinc-400">
                  Tier {pendingDecryption.item.tier} • {pendingDecryption.item.rarity}
                </p>
              </div>

              <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 space-y-1 text-xs">
                {pendingDecryption.item.baseDefense !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Armor:</span>
                    <span className="text-emerald-400 font-bold">+{pendingDecryption.item.baseDefense}</span>
                  </div>
                )}
                {pendingDecryption.item.baseDamageMin !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Damage:</span>
                    <span className="text-cyan-400 font-bold">
                      {pendingDecryption.item.baseDamageMin} - {pendingDecryption.item.baseDamageMax}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-400">Power Rating:</span>
                  <span className="text-purple-300 font-bold">⚡ {calcItemPowerRating(pendingDecryption.item)}</span>
                </div>
              </div>

              {pendingDecryption.item.affixes && pendingDecryption.item.affixes.length > 0 && (
                <div className="bg-purple-950/40 p-2.5 rounded-xl border border-purple-800/40 space-y-1 text-xs">
                  <span className="text-[10px] text-purple-300 font-bold uppercase">Rolled Affixes:</span>
                  {pendingDecryption.item.affixes.map((aff, i) => (
                    <div key={i} className="text-[10px] text-purple-200">
                      ✨ {aff.name} ({aff.type})
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleClaimDecrypted}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95"
              >
                🎒 Claim to Bag
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default InventoryView;

