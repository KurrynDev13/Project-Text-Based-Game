import React, { useState } from 'react';
import { PlayerCharacter, EquipmentItem, ConsumableItem, EncryptedMemory, ItemRarity, Affix } from '../types/game';
import { UPPER_ARMORS, LOWER_ARMORS, DAGGERS, SWORDS, BOWS, STAVES, BIKES, ENCHANTER_PREFIXES, ENCHANTER_SUFFIXES } from '../data/equipmentData';
import { calcDerivedStats, totalCowriesFromWallet, cowriesToWallet, formatCostInCowries, getEquippedItemForCategory, calcItemDelta, calcItemPowerRating, sortInventory } from '../utils/gameFormulas';
import { soundFX } from '../utils/audio';

interface InventoryViewProps {
  player: PlayerCharacter;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onNavigateCodebreaker: () => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error', icon?: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  player,
  onUpdatePlayer,
  onNavigateCodebreaker,
  onShowToast,
}) => {
  const notify = (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', icon?: string) => {
    onShowToast?.(msg, type, icon);
  };
  const [activeTab, setActiveTab] = useState<'GEAR' | 'CONSUMABLES' | 'MEMORIES'>('GEAR');
  const [selectedInspectItem, setSelectedInspectItem] = useState<EquipmentItem | null>(null);
  const [decryptedResult, setDecryptedResult] = useState<EquipmentItem | null>(null);

  const derived = calcDerivedStats(player.attributes, player.level, player.equipment);

  const formatStatBonus = (bonus?: Affix['statBonus']) => {
    if (!bonus) return '';
    const parts: string[] = [];
    if (bonus.str) parts.push(`+${bonus.str} STR`);
    if (bonus.agi) parts.push(`+${bonus.agi} AGI`);
    if (bonus.int) parts.push(`+${bonus.int} INT`);
    if (bonus.vit) parts.push(`+${bonus.vit} VIT`);
    if (bonus.flatHp) parts.push(`+${bonus.flatHp} HP`);
    if (bonus.flatMp) parts.push(`+${bonus.flatMp} MP`);
    if (bonus.flatArmor) parts.push(`+${bonus.flatArmor} Armor`);
    if (bonus.critPercent) parts.push(`+${bonus.critPercent}% Crit`);
    if (bonus.dodgePercent) parts.push(`+${bonus.dodgePercent}% Dodge`);
    if (bonus.magicResist) parts.push(`+${bonus.magicResist} M.Res`);
    return parts.join(', ');
  };

  const renderAffixBadges = (item: EquipmentItem) => {
    if (!item.affixes || item.affixes.length === 0) return null;

    return (
      <div className="space-y-0.5 mt-1">
        {item.affixes.map((aff, idx) => {
          const hasInfliction = !!aff.statusInfliction;
          const hasMitigation = !!aff.statusMitigation;
          const statText = formatStatBonus(aff.statBonus);

          return (
            <div key={idx} className="text-[10px] font-mono bg-purple-950/70 border border-purple-800/40 rounded px-1.5 py-0.5 flex justify-between items-center text-purple-200">
              <span className="font-semibold truncate">✨ {aff.name}</span>
              <span className="shrink-0 font-bold ml-1">
                {hasInfliction && (
                  <span className="text-amber-300">🩸 {aff.statusInfliction?.type} ({aff.statusInfliction?.chancePercent}%)</span>
                )}
                {hasMitigation && (
                  <span className="text-emerald-300">
                    🛡️ {aff.statusMitigation?.isImmune ? `${aff.statusMitigation?.type} IMMUNE` : `${aff.statusMitigation?.resistancePercent}% ${aff.statusMitigation?.type} RESIST`}
                  </span>
                )}
                {!hasInfliction && !hasMitigation && (
                  <span className="text-sky-300 text-[9px]">{statText || '+Stat'}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const handleDecryptMemory = (memory: EncryptedMemory) => {
    soundFX.playSpellSound();

    // Pool of potential equipment items based on memory level & rarity
    const allCatalogs = [...UPPER_ARMORS, ...LOWER_ARMORS, ...DAGGERS, ...SWORDS, ...BOWS, ...STAVES, ...BIKES];

    // Pick item appropriate for rarity/level
    const candidateItems = allCatalogs.filter((item) => item.levelReq <= memory.minLevel + 10);
    const baseItem = candidateItems[Math.floor(Math.random() * candidateItems.length)] || allCatalogs[0];

    // Map memory rarity to item rarity
    let itemRarity: ItemRarity = 'COMMON';
    if (memory.rarity === 'GREEN') itemRarity = 'UNCOMMON';
    if (memory.rarity === 'BLUE') itemRarity = 'RARE';
    if (memory.rarity === 'PURPLE') itemRarity = 'EPIC';
    if (memory.rarity === 'RED') itemRarity = 'TRIUMPHANT';

    // Generate affixes for Blue/Purple/Red
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
      name: generatedAffixes.length > 0
        ? `${generatedAffixes[0]?.name || ''} ${baseItem.name} ${generatedAffixes[1]?.name || ''}`.trim()
        : baseItem.name,
      rarity: itemRarity,
      affixes: generatedAffixes,
    };

    // Remove memory from player & add new item to inventory
    const updatedMemories = (player.encryptedMemories || []).filter((m) => m.id !== memory.id);
    const updatedInventory = sortInventory([...player.inventory, newItem], sortMode);

    onUpdatePlayer({
      ...player,
      encryptedMemories: updatedMemories,
      inventory: updatedInventory,
    });

    setDecryptedResult(newItem);
  };

  /**
   * Equips a gear item from inventory.
   * Weapons (DAGGER, SWORD, BOW, STAFF) now go into the single unified `equipment.weapon` slot.
   * Class-compatibility is checked before equipping any weapon type.
   */
  const handleEquipGear = (item: EquipmentItem) => {
    soundFX.playClickSound();

    if (item.classReq && item.classReq.length > 0 && !item.classReq.includes(player.heroClass as any)) {
      notify(`🔒 Incompatible Item! (${player.heroClass} cannot equip this item.)`, 'warning', '🔒');
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
        notify('🔒 Mount Slot Locked! Defeat the Act VI Boss (Tambanokano) to unlock Beastmaster Stables.', 'warning', '🔒');
        return;
      }
      unequippedItem = newEquipment.mount || newEquipment.bike || null;
      newEquipment.mount = item;
      newEquipment.bike = item;
    } else if (isWeapon) {
      // Unified single weapon slot — old deprecated slot is also cleared to keep data clean
      unequippedItem = newEquipment.weapon ?? newEquipment.primaryWeapon ?? null;
      newEquipment.weapon = item;
      newEquipment.primaryWeapon = null;
      newEquipment.specialWeapon = null;
      newEquipment.heavyWeapon = null;
    }

    let removed = false;
    let newInventory = player.inventory.filter((inv) => {
      if (!removed && (inv === item || inv.id === item.id)) {
        removed = true;
        return false;
      }
      return true;
    });
    if (unequippedItem) {
      newInventory.push(unequippedItem);
    }
    newInventory = sortInventory(newInventory, sortMode);

    onUpdatePlayer({
      ...player,
      equipment: newEquipment,
      inventory: newInventory,
    });
    setSelectedInspectItem(null);
  };

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
  };

  // BATCH ACTION 1: Salvage All Commons
  const handleSalvageAllCommons = () => {
    const commons = player.inventory.filter((i): i is EquipmentItem => 'rarity' in i && i.rarity === 'COMMON');
    if (commons.length === 0) {
      notify('No Common quality equipment items found in bag!', 'info', '🎒');
      return;
    }

    let totalSalvageCC = 0;
    commons.forEach((c) => {
      totalSalvageCC += Math.floor((c.costInCC || 50) * 0.5);
    });

    const remainingInventory = player.inventory.filter((i) => !('rarity' in i && i.rarity === 'COMMON'));

    soundFX.playCoinSound();
    onUpdatePlayer({
      ...player,
      inventory: remainingInventory,
      wallet: {
        ...player.wallet,
        mutyaShards: (player.wallet.mutyaShards || player.wallet.prismaticShards || 0) + commons.length,
        prismaticShards: (player.wallet.mutyaShards || player.wallet.prismaticShards || 0) + commons.length,
      },
    });

    notify(`🔨 Salvaged ${commons.length} Common items! Earned +${totalSalvageCC} Cowries & +${commons.length} Mutya Shards.`, 'success', '🔨');
  };

  // ACTION: Sell Single Equipment Item
  const handleSellGear = (item: EquipmentItem) => {
    const sellPriceCC = Math.max(15, Math.floor((item.costInCC || 30) * 0.6));
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
    if (selectedInspectItem === item || selectedInspectItem?.id === item.id) setSelectedInspectItem(null);
  };

  // BATCH ACTION: Sell All Common Gear
  const handleSellAllCommons = () => {
    const commons = player.inventory.filter((i): i is EquipmentItem => 'rarity' in i && i.rarity === 'COMMON');
    if (commons.length === 0) {
      notify('No Common quality equipment items found in bag to sell!', 'info', '🎒');
      return;
    }

    let totalGoldFromSell = 0;
    commons.forEach((c) => {
      totalGoldFromSell += Math.max(15, Math.floor((c.costInCC || 30) * 0.6));
    });

    const totalCC = totalCowriesFromWallet(player.wallet) + totalGoldFromSell;
    const newWallet = cowriesToWallet(totalCC);
    newWallet.mutyaShards = player.wallet.mutyaShards || 0;
    newWallet.prismaticShards = newWallet.mutyaShards;

    const remainingInventory = player.inventory.filter((i) => !('rarity' in i && i.rarity === 'COMMON'));

    soundFX.playCoinSound();
    onUpdatePlayer({
      ...player,
      inventory: remainingInventory,
      wallet: newWallet,
    });

    notify(`💰 Sold ${commons.length} Common items! Received +${totalGoldFromSell} Cowrie Shells.`, 'success', '💰');
  };

  const [sortMode, setSortMode] = useState<'POWER' | 'CLASS' | 'TYPE'>('POWER');

  // BATCH ACTION 2: Auto-Sort Inventory (Cycles: Power -> Class -> Equipment Type)
  const handleAutoSort = () => {
    soundFX.playClickSound();

    let nextMode: 'POWER' | 'CLASS' | 'TYPE' = 'POWER';
    if (sortMode === 'POWER') nextMode = 'CLASS';
    else if (sortMode === 'CLASS') nextMode = 'TYPE';
    else nextMode = 'POWER';

    setSortMode(nextMode);

    const sorted = sortInventory(player.inventory, nextMode);

    const modeLabels = {
      POWER: 'Power Rating (Descending)',
      CLASS: 'Hero Class',
      TYPE: 'Equipment Type',
    };

    notify(`🔄 Sorted Inventory by ${modeLabels[nextMode]}`, 'info', '🔄');
    onUpdatePlayer({ ...player, inventory: sorted });
  };

  const gearItems = player.inventory.filter((i): i is EquipmentItem => 'category' in i && ['UPPER', 'LOWER', 'DAGGER', 'SWORD', 'BOW', 'STAFF', 'MOUNT', 'BIKE'].includes(i.category));
  const consumableItems = player.inventory.filter((i): i is ConsumableItem => 'category' in i && ['POTION', 'FOOD', 'ELIXIR', 'VIAL'].includes(i.category));

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-amber-100 p-3 md:p-6 space-y-4 overflow-y-auto">
      {/* Paper Doll Inspection Header */}
      <div className="bg-zinc-900 border border-amber-900/50 rounded-xl p-4 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <div className="text-[10px] font-mono uppercase text-amber-500 font-semibold tracking-widest">CHARACTER PAPER DOLL INSPECTOR</div>
            <h2 className="text-2xl font-bold font-serif text-amber-200">Equipped Gear & Slots</h2>
          </div>

          {/* Batch Action Buttons */}
          <div className="flex items-center space-x-2 font-mono text-xs">
            <button
              onClick={handleSellAllCommons}
              className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-200 font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all"
            >
              💰 Sell Commons
            </button>
            <button
              onClick={handleSalvageAllCommons}
              className="bg-red-950 hover:bg-red-900 border border-red-600/50 text-red-200 font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all"
            >
              🔨 Salvage Commons
            </button>
            <button
              onClick={handleAutoSort}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all flex items-center space-x-1"
            >
              <span>🔄</span>
              <span>Auto-Sort: <strong className="text-amber-300">{sortMode === 'POWER' ? 'Power' : sortMode === 'CLASS' ? 'Class' : 'Type'}</strong></span>
            </button>
          </div>
        </div>

        {/* Paper Doll Slots Grid — 4 slots: Upper Armor, Lower Armor, Weapon (single), Mount */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-xs">
          {/* Upper Armor Slot */}
          <div className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-center space-y-1">
            <div className="text-[10px] uppercase text-zinc-500">Upper Armor</div>
            <div className="font-bold text-amber-200 truncate">{player.equipment.upperArmor?.name || 'Empty Slot'}</div>
            <div className="text-[10px] text-amber-400">+{player.equipment.upperArmor?.baseDefense || 0} Armor</div>
            {player.equipment.upperArmor && renderAffixBadges(player.equipment.upperArmor)}
          </div>

          {/* Lower Armor Slot */}
          <div className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-center space-y-1">
            <div className="text-[10px] uppercase text-zinc-500">Lower Armor</div>
            <div className="font-bold text-amber-200 truncate">{player.equipment.lowerArmor?.name || 'Empty Slot'}</div>
            <div className="text-[10px] text-amber-400">+{player.equipment.lowerArmor?.baseDefense || 0} Armor</div>
            {player.equipment.lowerArmor && renderAffixBadges(player.equipment.lowerArmor)}
          </div>

          {/* Single Weapon Slot (unified; falls back to primaryWeapon for old saves) */}
          <div className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-center space-y-1">
            <div className="text-[10px] uppercase text-zinc-500">Weapon</div>
            {(() => {
              const w = player.equipment.weapon ?? player.equipment.primaryWeapon ?? null;
              return w ? (
                <>
                  <div className="font-bold text-amber-200 truncate">{w.name}</div>
                  <div className="text-[10px] text-sky-400">{w.baseDamageMin}-{w.baseDamageMax} DMG</div>
                  {renderAffixBadges(w)}
                </>
              ) : (
                <>
                  <div className="font-bold text-zinc-500 truncate">No Weapon</div>
                  <div className="text-[10px] text-zinc-600">—</div>
                </>
              );
            })()}
          </div>

          {/* Mythical Mount Slot (Post-Act 6) */}
          <div className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-center space-y-1">
            <div className="text-[10px] uppercase text-zinc-500">Mythical Mount</div>
            {player.equipment.mount || player.equipment.bike ? (
              <>
                <div className="font-bold text-amber-200 truncate">{(player.equipment.mount || player.equipment.bike)?.name}</div>
                <div className="text-[10px] text-emerald-400">Tier {(player.equipment.mount || player.equipment.bike)?.tier} Mount</div>
                {(player.equipment.mount || player.equipment.bike) && renderAffixBadges((player.equipment.mount || player.equipment.bike)!)}
              </>
            ) : (
              <>
                <div className="font-bold text-zinc-500 text-xs truncate">
                  {player.act6Completed || player.mountUnlocked ? 'No Mount Equipped' : '🔒 Sealed Slot'}
                </div>
                <div className="text-[9px] text-zinc-600">
                  {player.act6Completed || player.mountUnlocked ? 'Beastmaster Stables' : 'Unlocks in Later Acts'}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bag Inventory View & Stat Delta Comparison Tooltip */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 shadow-xl space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('GEAR')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold ${activeTab === 'GEAR' ? 'bg-amber-600 text-zinc-950' : 'text-zinc-400'}`}
            >
              Gear Bag ({gearItems.length})
            </button>
            <button
              onClick={() => setActiveTab('CONSUMABLES')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold ${activeTab === 'CONSUMABLES' ? 'bg-amber-600 text-zinc-950' : 'text-zinc-400'}`}
            >
              Potions ({consumableItems.length})
            </button>
            <button
              onClick={() => setActiveTab('MEMORIES')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold flex items-center space-x-1 ${activeTab === 'MEMORIES' ? 'bg-purple-600 text-white' : 'text-purple-400 hover:text-purple-300'}`}
            >
              <span>💎 Memories</span>
              <span className="bg-purple-950 px-1.5 py-0.5 rounded text-[10px] border border-purple-500/40">{(player.encryptedMemories || []).length}</span>
            </button>
          </div>

          <span className="text-xs font-mono text-zinc-400">
            Capacity: <strong>{player.inventory.length} / {derived.inventoryCapacity}</strong>
          </span>
        </div>

        {/* Selected Gear Detailed Specs Inspection Modal */}
        {selectedInspectItem && (
          <div className="bg-zinc-900 border-2 border-amber-500/80 rounded-xl p-4 space-y-3 shadow-2xl relative animate-fade-in my-2">
            <button
              onClick={() => setSelectedInspectItem(null)}
              className="absolute top-3 right-3 text-zinc-400 hover:text-white text-xs font-mono"
            >
              ✕ Close Inspection
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-zinc-950 border border-amber-500/40 rounded-lg flex items-center justify-center text-2xl">
                {['DAGGER', 'SWORD', 'BOW', 'STAFF'].includes(selectedInspectItem.category) ? '⚔️' : '🛡️'}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-400">{selectedInspectItem.rarity} {selectedInspectItem.category}</span>
                  <span className="text-[10px] font-mono text-zinc-400">• Tier {selectedInspectItem.tier}</span>
                </div>
                <h3 className="text-lg font-bold font-serif text-amber-200">{selectedInspectItem.name}</h3>
              </div>
            </div>

            {/* Complete Stat & Status Affix Breakdown */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 space-y-1.5 text-xs font-mono">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold border-b border-zinc-800 pb-1">
                ITEM SPECIFICATIONS & AFFIXES
              </div>

              {selectedInspectItem.baseDefense !== undefined && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Base Physical Armor:</span>
                  <strong className="text-emerald-300">+{selectedInspectItem.baseDefense} Defense</strong>
                </div>
              )}

              {selectedInspectItem.baseDamageMin !== undefined && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Attack Damage Range:</span>
                  <strong className="text-amber-300">{selectedInspectItem.baseDamageMin} - {selectedInspectItem.baseDamageMax} ({selectedInspectItem.damageType || 'PHYSICAL'})</strong>
                </div>
              )}

              {/* Status Infliction / Mitigation Affixes */}
              {selectedInspectItem.affixes && selectedInspectItem.affixes.length > 0 ? (
                <div className="pt-1 space-y-1 border-t border-zinc-800/60">
                  <div className="text-[10px] uppercase font-bold text-purple-400">Magical Affixes & Status Effects:</div>
                  {selectedInspectItem.affixes.map((aff, idx) => (
                    <div key={idx} className="bg-purple-950/60 border border-purple-800/40 p-1.5 rounded text-[11px] text-purple-200 space-y-0.5">
                      <div className="font-bold flex justify-between">
                        <span>✨ {aff.name} ({aff.type})</span>
                      </div>

                      {aff.statBonus && formatStatBonus(aff.statBonus) && (
                        <div className="text-sky-300 font-bold flex items-center space-x-1">
                          <span>📊 Stat Bonus:</span>
                          <span>{formatStatBonus(aff.statBonus)}</span>
                        </div>
                      )}

                      {aff.statusInfliction && (
                        <div className="text-amber-300 font-bold flex items-center space-x-1">
                          <span>🩸 Status Infliction:</span>
                          <span>{aff.statusInfliction.chancePercent}% chance to inflict {aff.statusInfliction.type} ({aff.statusInfliction.durationTurns} turns)</span>
                        </div>
                      )}

                      {aff.statusMitigation && (
                        <div className="text-emerald-300 font-bold flex items-center space-x-1">
                          <span>🛡️ Debuff Protection:</span>
                          <span>{aff.statusMitigation.isImmune ? `Complete Immunity to ${aff.statusMitigation.type}` : `${aff.statusMitigation.resistancePercent}% Resistance to ${aff.statusMitigation.type}`}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-zinc-500 italic text-[10px] pt-1">No magical affixes applied to this item.</div>
              )}

              {selectedInspectItem.inherentPerk && (
                <div className="text-[11px] text-amber-300/90 font-semibold pt-1 border-t border-zinc-800/60">
                  ✨ Inherent Perk: {selectedInspectItem.inherentPerk}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-1 font-mono text-xs">
              {(() => {
                const inspectWrongClass = Boolean(
                  selectedInspectItem.classReq &&
                    selectedInspectItem.classReq.length > 0 &&
                    !selectedInspectItem.classReq.includes(player.heroClass as any)
                );
                return (
                  <button
                    onClick={() => {
                      if (inspectWrongClass) {
                        notify(`🔒 Incompatible Item! (${player.heroClass} cannot equip this item.)`, 'warning', '🔒');
                        return;
                      }
                      handleEquipGear(selectedInspectItem);
                      setSelectedInspectItem(null);
                    }}
                    disabled={inspectWrongClass}
                    className={`font-bold px-4 py-1.5 rounded-lg uppercase tracking-wider ${
                      inspectWrongClass
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                        : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                    }`}
                  >
                    {inspectWrongClass ? '🔒 Wrong Class' : 'Equip Item'}
                  </button>
                );
              })()}
              <button
                onClick={() => {
                  handleSellGear(selectedInspectItem);
                  setSelectedInspectItem(null);
                }}
                className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-300 font-bold px-3 py-1.5 rounded-lg uppercase"
              >
                💰 Sell
              </button>
            </div>
          </div>
        )}

        {/* Decryption Result Modal */}
        {decryptedResult && (
          <div className="bg-gradient-to-br from-amber-950/90 via-zinc-900 to-purple-950/90 border-2 border-amber-500 rounded-xl p-5 text-center space-y-3 shadow-2xl animate-fade-in my-2">
            <div className="text-xs font-mono uppercase text-amber-400 font-semibold tracking-widest">✨ Decryption Successful!</div>
            <h3 className="text-xl font-bold font-serif text-white">{decryptedResult.name}</h3>
            <div className="inline-block bg-zinc-950 px-3 py-1 rounded text-xs font-mono text-purple-300 border border-purple-500/40">
              Rarity: {decryptedResult.rarity} | Level {decryptedResult.levelReq}
            </div>
            <p className="text-xs text-amber-200/90 font-mono">
              {decryptedResult.baseDefense ? `Base Armor: +${decryptedResult.baseDefense}` : `Damage: ${decryptedResult.baseDamageMin}-${decryptedResult.baseDamageMax}`}
              {decryptedResult.inherentPerk ? ` | ${decryptedResult.inherentPerk}` : ''}
            </p>
            <button
              onClick={() => setDecryptedResult(null)}
              className="mt-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-6 py-2 rounded-lg text-xs tracking-wider uppercase transition-all shadow font-mono"
            >
              [ Claim Gear to Bag ]
            </button>
          </div>
        )}

        {/* Gear Grid */}
        {activeTab === 'GEAR' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {gearItems.map((item, idx) => {
              const isMount = item.category === 'MOUNT' || item.category === 'BIKE';
              const isMountLocked = isMount && !player.act6Completed && !player.mountUnlocked;
              const isWeapon = ['DAGGER', 'SWORD', 'BOW', 'STAFF'].includes(item.category);

              // Class incompatibility check for ALL equipment items (weapons, armors, mounts)
              const isWrongClass = Boolean(item.classReq && item.classReq.length > 0 && !item.classReq.includes(player.heroClass as any));

              const equippedInSlot = getEquippedItemForCategory(player.equipment, item.category);
              const delta = calcItemDelta(item, equippedInSlot);

              return (
                <div
                  key={`gear_${item.id}_${idx}`}
                  onClick={() => setSelectedInspectItem(item)}
                  className={`bg-zinc-950 border rounded-xl p-3 flex flex-col justify-between space-y-2 cursor-pointer transition-all ${
                    selectedInspectItem === item
                      ? 'border-amber-400 ring-2 ring-amber-500/50'
                      : isMountLocked || isWrongClass
                      ? 'border-zinc-800/60 opacity-70'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="uppercase text-amber-500 font-semibold">{item.archetype || item.category}</span>
                      <span className="text-zinc-500 font-bold">Tier {item.tier}</span>
                    </div>
                    <h4 className="text-sm font-bold font-serif text-amber-200">{item.name}</h4>

                    {/* Class requirement label for all equipment */}
                    {item.classReq && item.classReq.length > 0 && (
                      <div className={`text-[10px] font-mono mt-0.5 ${isWrongClass ? 'text-red-400 font-bold' : 'text-emerald-400'}`}>
                        {isWrongClass ? `🔒 Requires: ${item.classReq.join(', ')}` : `✅ For: ${item.classReq.join(', ')}`}
                      </div>
                    )}

                    {isMount ? (
                      <div className="mt-1 space-y-0.5">
                        <div className="text-xs text-emerald-400 font-mono">+{item.baseDefense || 0} Armor</div>
                        <div className="text-[10px] text-zinc-300 font-mono italic bg-zinc-900/80 p-1 rounded border border-zinc-800">
                          {item.inherentPerk}
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-zinc-300 font-mono mt-0.5">
                          {item.baseDefense ? `Base Armor: +${item.baseDefense}` : `Damage: ${item.baseDamageMin}-${item.baseDamageMax}`}
                        </p>
                        {item.inherentPerk && (
                          <div className="text-[10px] text-amber-300/90 font-mono italic bg-zinc-900/80 p-1 rounded border border-zinc-800/80 mt-1">
                            ✨ {item.inherentPerk}
                          </div>
                        )}
                      </>
                    )}

                    {/* Comprehensive Real-time Stat Delta vs Equipped */}
                    <div className="text-[10px] font-mono mt-1 font-bold flex items-center gap-1 flex-wrap">
                      <span className="text-zinc-400">Delta vs Equipped:</span>
                      <span className={delta.deltaPower > 0 ? 'text-emerald-400' : delta.deltaPower < 0 ? 'text-rose-400' : 'text-zinc-400'}>
                        {delta.deltaPower > 0 ? `📈 +${delta.deltaPower}` : delta.deltaPower < 0 ? `📉 ${delta.deltaPower}` : '➡️ Equal'} Power
                      </span>
                      {delta.deltaAvgDamage !== 0 && (
                        <span className={delta.deltaAvgDamage > 0 ? 'text-emerald-300 text-[9px]' : 'text-rose-300 text-[9px]'}>
                          ({delta.deltaAvgDamage > 0 ? `+${delta.deltaAvgDamage}` : delta.deltaAvgDamage} Atk)
                        </span>
                      )}
                      {delta.deltaArmor !== 0 && (
                        <span className={delta.deltaArmor > 0 ? 'text-emerald-300 text-[9px]' : 'text-rose-300 text-[9px]'}>
                          ({delta.deltaArmor > 0 ? `+${delta.deltaArmor}` : delta.deltaArmor} Arm)
                        </span>
                      )}
                      {delta.statHighlights.length > 0 && (
                        <span className="text-purple-300 text-[9px]">
                          [{delta.statHighlights.join(', ')}]
                        </span>
                      )}
                    </div>

                    {/* Status Infliction & Mitigation Affix Badges */}
                    {renderAffixBadges(item)}
                  </div>

                  {isMountLocked ? (
                    <button
                      disabled={true}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-500 font-bold py-1 rounded text-xs font-mono uppercase tracking-wider cursor-not-allowed"
                      title="Mount slot locked until Act VI Guardian Boss (Tambanokano) is defeated."
                    >
                      🔒 Locked (Post-Act 6)
                    </button>
                  ) : isWrongClass ? (
                    <div className="flex gap-2">
                      <button
                        disabled={true}
                        className="flex-1 bg-red-950/40 border border-red-800/40 text-red-500 font-bold py-1 rounded text-xs font-mono uppercase tracking-wider cursor-not-allowed"
                        title={`Only ${item.classReq?.join(', ')} can equip this weapon type.`}
                      >
                        🔒 Wrong Class
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSellGear(item);
                        }}
                        className="px-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-300 font-bold py-1 rounded text-xs font-mono uppercase"
                        title="Sell for Cowrie Shells"
                      >
                        💰 Sell ({Math.max(15, Math.floor((item.costInCC || 30) * 0.6))})
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEquipGear(item);
                        }}
                        className="flex-1 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold py-1 rounded text-xs font-mono uppercase tracking-wider"
                      >
                        {isMount ? 'Equip Mount' : isWeapon ? 'Equip Weapon' : 'Equip Item'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSellGear(item);
                        }}
                        className="px-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-300 font-bold py-1 rounded text-xs font-mono uppercase"
                        title="Sell for Cowrie Shells"
                      >
                        💰 Sell ({Math.max(15, Math.floor((item.costInCC || 30) * 0.6))})
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Consumables Grid */}
        {activeTab === 'CONSUMABLES' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {consumableItems.map((item) => (
              <div key={item.id} className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold font-serif text-emerald-300">{item.name}</h4>
                  <p className="text-xs text-zinc-400 font-mono">{item.effectDescription}</p>
                </div>
                <button
                  onClick={() => handleUseConsumable(item)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold px-3 py-1.5 rounded text-xs uppercase font-mono"
                >
                  Drink Potion
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Encrypted Memories Grid */}
        {activeTab === 'MEMORIES' && (
          <div className="space-y-3">
            {(player.encryptedMemories || []).length === 0 ? (
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-8 text-center space-y-2">
                <div className="text-3xl">💎</div>
                <p className="text-sm text-zinc-400 font-mono">No Encrypted Memories in vault.</p>
                <p className="text-xs text-zinc-500">Defeat enemies or claim Bounty contracts to earn Encrypted Memories!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(player.encryptedMemories || []).map((mem) => {
                  const borderColors = {
                    WHITE: 'border-zinc-700 bg-zinc-950/80 text-zinc-200',
                    GREEN: 'border-emerald-600/60 bg-emerald-950/30 text-emerald-300',
                    BLUE: 'border-sky-600/60 bg-sky-950/30 text-sky-300',
                    PURPLE: 'border-purple-600/60 bg-purple-950/30 text-purple-300',
                    RED: 'border-red-600/60 bg-red-950/30 text-red-300',
                  };

                  return (
                    <div
                      key={mem.id}
                      className={`border rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-md ${borderColors[mem.rarity] || borderColors.WHITE}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-[10px] font-mono font-bold uppercase tracking-wider">{mem.rarity} MEMORY</div>
                          <h4 className="text-base font-bold font-serif mt-0.5">{mem.name}</h4>
                          <p className="text-[11px] text-zinc-400 font-mono">Level {mem.minLevel}+ Salvage</p>
                        </div>
                        <div className="text-2xl">💎</div>
                      </div>

                      <button
                        onClick={() => handleDecryptMemory(mem)}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold py-2 rounded-lg text-xs uppercase font-mono tracking-wider transition-all shadow"
                      >
                        [ Decrypt Memory ]
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
