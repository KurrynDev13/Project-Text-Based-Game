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
  const [sortMode, setSortMode] = useState<'POWER' | 'CLASS' | 'TYPE'>('POWER');

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
            <div key={idx} className="text-[9px] font-mono bg-purple-950/70 border border-purple-800/40 rounded px-1.5 py-0.5 flex justify-between items-center text-purple-200">
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
                  <span className="text-sky-300 text-[8.5px]">{statText || '+Stat'}</span>
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
      name: generatedAffixes.length > 0
        ? `${generatedAffixes[0]?.name || ''} ${baseItem.name} ${generatedAffixes[1]?.name || ''}`.trim()
        : baseItem.name,
      rarity: itemRarity,
      affixes: generatedAffixes,
    };

    const updatedMemories = (player.encryptedMemories || []).filter((m) => m.id !== memory.id);
    const updatedInventory = sortInventory([...player.inventory, newItem], sortMode);

    onUpdatePlayer({
      ...player,
      encryptedMemories: updatedMemories,
      inventory: updatedInventory,
    });

    setDecryptedResult(newItem);
  };

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

    notify(`⚔️ Equipped: ${item.name}`, 'success', '⚔️');
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

  const handleAutoSort = () => {
    soundFX.playClickSound();

    let nextMode: 'POWER' | 'CLASS' | 'TYPE' = 'POWER';
    if (sortMode === 'POWER') nextMode = 'CLASS';
    else if (sortMode === 'CLASS') nextMode = 'TYPE';
    else nextMode = 'POWER';

    setSortMode(nextMode);
    const sorted = sortInventory(player.inventory, nextMode);

    const modeLabels = {
      POWER: 'Power Rating',
      CLASS: 'Hero Class',
      TYPE: 'Equipment Type',
    };

    notify(`🔄 Sorted by ${modeLabels[nextMode]}`, 'info', '🔄');
    onUpdatePlayer({ ...player, inventory: sorted });
  };

  const gearItems = player.inventory.filter((i): i is EquipmentItem => 'category' in i && ['UPPER', 'LOWER', 'DAGGER', 'SWORD', 'BOW', 'STAFF', 'MOUNT', 'BIKE'].includes(i.category));
  const consumableItems = player.inventory.filter((i): i is ConsumableItem => 'category' in i && ['POTION', 'FOOD', 'ELIXIR', 'VIAL'].includes(i.category));

  return (
    <div className="flex flex-col h-full bg-transparent text-amber-100 p-2.5 sm:p-4 md:p-6 space-y-3 sm:space-y-4 overflow-y-auto">
      {/* ── TOP ACTION & FILTER CONTROLS BAR (Compact & Ergonomic) ─────────── */}
      <div className="bg-zinc-950/85 backdrop-blur-md border border-amber-900/50 rounded-xl p-2.5 sm:p-3 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
        {/* Category Tabs */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setActiveTab('GEAR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'GEAR'
                ? 'bg-amber-600 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white bg-zinc-900'
            }`}
          >
            ⚔️ Gear ({gearItems.length})
          </button>
          <button
            onClick={() => setActiveTab('CONSUMABLES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'CONSUMABLES'
                ? 'bg-amber-600 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white bg-zinc-900'
            }`}
          >
            🧪 Potions ({consumableItems.length})
          </button>
          <button
            onClick={() => setActiveTab('MEMORIES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center space-x-1 ${
              activeTab === 'MEMORIES'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-purple-400 hover:text-purple-300 bg-zinc-900'
            }`}
          >
            <span>💎 Memories</span>
            <span className="bg-purple-950 px-1 py-0.2 rounded text-[9.5px]">{(player.encryptedMemories || []).length}</span>
          </button>
        </div>

        {/* Batch Actions & Sorting Toolbar */}
        <div className="flex items-center space-x-1.5 font-mono text-[11px] w-full sm:w-auto justify-end">
          <button
            onClick={handleSellAllCommons}
            className="bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-200 font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all"
            title="Sell all Common items for Cowrie Shells"
          >
            💰 Sell
          </button>
          <button
            onClick={handleSalvageAllCommons}
            className="bg-red-950/90 hover:bg-red-900 border border-red-600/50 text-red-200 font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all"
            title="Salvage all Common items for Mutya Shards"
          >
            🔨 Salvage
          </button>
          <button
            onClick={handleAutoSort}
            className="bg-zinc-850 hover:bg-zinc-750 text-zinc-200 font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all border border-zinc-700 flex items-center gap-1"
          >
            <span>🔄</span>
            <span>Sort: <strong className="text-amber-300">{sortMode === 'POWER' ? 'Pwr' : sortMode === 'CLASS' ? 'Class' : 'Type'}</strong></span>
          </button>

          <span className="text-[10px] text-zinc-400 pl-1 shrink-0">
            <strong>{player.inventory.length}</strong>/{derived.inventoryCapacity}
          </span>
        </div>
      </div>

      {/* ── 2:1 RATIO MAIN WORKSPACE ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* ════ LEFT PANE (2fr): INVENTORY ITEM GRID ═════════════════════════ */}
        <div className="lg:col-span-2 space-y-3">
          {/* GEAR TAB */}
          {activeTab === 'GEAR' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {gearItems.length === 0 ? (
                <div className="col-span-full bg-zinc-950/60 border border-dashed border-zinc-800 p-8 rounded-xl text-center font-mono text-xs text-zinc-500">
                  Your gear bag is currently empty. Venture into the wild to discover equipment!
                </div>
              ) : (
                gearItems.map((item, idx) => {
                  const isMount = item.category === 'MOUNT' || item.category === 'BIKE';
                  const isMountLocked = isMount && !player.act6Completed && !player.mountUnlocked;
                  const isWeapon = ['DAGGER', 'SWORD', 'BOW', 'STAFF'].includes(item.category);
                  const isWrongClass = Boolean(item.classReq && item.classReq.length > 0 && !item.classReq.includes(player.heroClass as any));

                  const equippedInSlot = getEquippedItemForCategory(player.equipment, item.category);
                  const delta = calcItemDelta(item, equippedInSlot);

                  return (
                    <div
                      key={`gear_${item.id}_${idx}`}
                      onClick={() => setSelectedInspectItem(item)}
                      className={`bg-zinc-950/90 border rounded-xl p-2.5 flex flex-col justify-between space-y-1.5 cursor-pointer transition-all ${
                        selectedInspectItem === item
                          ? 'border-amber-400 ring-2 ring-amber-500/50 shadow-lg'
                          : isMountLocked || isWrongClass
                          ? 'border-zinc-800/60 opacity-65'
                          : 'border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center text-[9.5px] font-mono">
                          <span className="uppercase text-amber-500 font-bold">{item.archetype || item.category}</span>
                          <span className="text-zinc-500 font-semibold">Tier {item.tier} · {item.rarity}</span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold font-serif text-amber-200 truncate leading-snug">
                          {item.name}
                        </h4>

                        {/* Class requirement label */}
                        {item.classReq && item.classReq.length > 0 && (
                          <div className={`text-[9px] font-mono mt-0.5 ${isWrongClass ? 'text-red-400 font-bold' : 'text-emerald-400'}`}>
                            {isWrongClass ? `🔒 Requires: ${item.classReq.join(', ')}` : `✅ For: ${item.classReq.join(', ')}`}
                          </div>
                        )}

                        <div className="text-[10px] text-zinc-300 font-mono mt-0.5">
                          {item.baseDefense ? `Armor: +${item.baseDefense}` : `Damage: ${item.baseDamageMin}-${item.baseDamageMax}`}
                        </div>

                        {/* Stat Delta Tag */}
                        <div className="text-[9px] font-mono mt-0.5 flex items-center gap-1">
                          <span className={delta.deltaPower > 0 ? 'text-emerald-400 font-bold' : delta.deltaPower < 0 ? 'text-rose-400' : 'text-zinc-400'}>
                            {delta.deltaPower > 0 ? `📈 +${delta.deltaPower}` : delta.deltaPower < 0 ? `📉 ${delta.deltaPower}` : 'Equal'} PWR
                          </span>
                        </div>

                        {renderAffixBadges(item)}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-1 flex gap-1.5 font-mono text-[10px]">
                        {isMountLocked ? (
                          <button
                            disabled={true}
                            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-600 font-bold py-1 rounded uppercase tracking-wider cursor-not-allowed"
                          >
                            🔒 Locked (Post-Act 6)
                          </button>
                        ) : isWrongClass ? (
                          <>
                            <button
                              disabled={true}
                              className="flex-1 bg-red-950/40 border border-red-800/40 text-red-500 font-bold py-1 rounded uppercase cursor-not-allowed"
                            >
                              🔒 Wrong Class
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSellGear(item);
                              }}
                              className="px-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-300 font-bold py-1 rounded"
                            >
                              💰 Sell
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEquipGear(item);
                              }}
                              className="flex-1 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold py-1 rounded uppercase tracking-wider active:scale-95"
                            >
                              Equip
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSellGear(item);
                              }}
                              className="px-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-300 font-bold py-1 rounded"
                            >
                              💰 Sell
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* CONSUMABLES TAB */}
          {activeTab === 'CONSUMABLES' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {consumableItems.length === 0 ? (
                <div className="col-span-full bg-zinc-950/60 border border-dashed border-zinc-800 p-8 rounded-xl text-center font-mono text-xs text-zinc-500">
                  No potions or consumables in bag.
                </div>
              ) : (
                consumableItems.map((item) => (
                  <div key={item.id} className="bg-zinc-950/90 border border-zinc-800 p-2.5 rounded-xl flex justify-between items-center">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold font-serif text-emerald-300">{item.name}</h4>
                      <p className="text-[10px] text-zinc-400 font-mono">{item.effectDescription}</p>
                    </div>
                    <button
                      onClick={() => handleUseConsumable(item)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold px-3 py-1.5 rounded text-xs uppercase font-mono active:scale-95"
                    >
                      Use
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* MEMORIES TAB */}
          {activeTab === 'MEMORIES' && (
            <div className="space-y-2">
              {(player.encryptedMemories || []).length === 0 ? (
                <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-8 text-center space-y-2 font-mono">
                  <div className="text-3xl">💎</div>
                  <p className="text-xs text-zinc-400">No Encrypted Memories in vault.</p>
                  <p className="text-[10px] text-zinc-500">Complete Bounties or defeat bosses to discover Memories!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(player.encryptedMemories || []).map((mem) => {
                    const borderColors: Record<string, string> = {
                      WHITE: 'border-zinc-700 bg-zinc-950/80 text-zinc-200',
                      GREEN: 'border-emerald-600/60 bg-emerald-950/30 text-emerald-300',
                      BLUE: 'border-sky-600/60 bg-sky-950/30 text-sky-300',
                      PURPLE: 'border-purple-600/60 bg-purple-950/30 text-purple-300',
                      RED: 'border-red-600/60 bg-red-950/30 text-red-300',
                    };

                    return (
                      <div
                        key={mem.id}
                        className={`border rounded-xl p-3 flex flex-col justify-between space-y-2 shadow-md ${borderColors[mem.rarity] || borderColors.WHITE}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-[9px] font-mono font-bold uppercase tracking-wider">{mem.rarity} MEMORY</div>
                            <h4 className="text-xs sm:text-sm font-bold font-serif mt-0.5">{mem.name}</h4>
                            <p className="text-[10px] text-zinc-400 font-mono">Level {mem.minLevel}+ Item</p>
                          </div>
                          <span className="text-xl">💎</span>
                        </div>

                        <button
                          onClick={() => handleDecryptMemory(mem)}
                          className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold py-1.5 rounded-lg text-xs uppercase font-mono tracking-wider transition-all shadow active:scale-95"
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

        {/* ════ RIGHT PANE (1fr): COMPACT PAPER DOLL & ITEM INSPECTOR ═══════ */}
        <div className="lg:col-span-1 space-y-3">
          {/* Compact Paper Doll Inspector */}
          <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3 space-y-2 shadow-xl">
            <div className="flex justify-between items-center pb-1 border-b border-zinc-800">
              <span className="text-[10px] font-mono uppercase text-amber-500 font-bold tracking-wider">
                EQUIPPED GEAR
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Paper Doll</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
              {/* Upper Armor */}
              <div className="bg-zinc-900/90 border border-zinc-800 p-2 rounded-lg">
                <div className="text-[8.5px] uppercase text-zinc-500 font-semibold">Upper Armor</div>
                <div className="font-bold text-amber-200 truncate text-[11px]">
                  {player.equipment.upperArmor?.name || 'Empty'}
                </div>
                <div className="text-[9px] text-amber-400">+{player.equipment.upperArmor?.baseDefense || 0} Armor</div>
              </div>

              {/* Lower Armor */}
              <div className="bg-zinc-900/90 border border-zinc-800 p-2 rounded-lg">
                <div className="text-[8.5px] uppercase text-zinc-500 font-semibold">Lower Armor</div>
                <div className="font-bold text-amber-200 truncate text-[11px]">
                  {player.equipment.lowerArmor?.name || 'Empty'}
                </div>
                <div className="text-[9px] text-amber-400">+{player.equipment.lowerArmor?.baseDefense || 0} Armor</div>
              </div>

              {/* Weapon */}
              <div className="bg-zinc-900/90 border border-zinc-800 p-2 rounded-lg">
                <div className="text-[8.5px] uppercase text-zinc-500 font-semibold">Weapon</div>
                {(() => {
                  const w = player.equipment.weapon ?? player.equipment.primaryWeapon ?? null;
                  return w ? (
                    <>
                      <div className="font-bold text-amber-200 truncate text-[11px]">{w.name}</div>
                      <div className="text-[9px] text-sky-400">{w.baseDamageMin}-{w.baseDamageMax} DMG</div>
                    </>
                  ) : (
                    <div className="font-bold text-zinc-600 truncate text-[11px]">No Weapon</div>
                  );
                })()}
              </div>

              {/* Mount */}
              <div className="bg-zinc-900/90 border border-zinc-800 p-2 rounded-lg">
                <div className="text-[8.5px] uppercase text-zinc-500 font-semibold">Mythical Mount</div>
                {player.equipment.mount || player.equipment.bike ? (
                  <>
                    <div className="font-bold text-amber-200 truncate text-[11px]">
                      {(player.equipment.mount || player.equipment.bike)?.name}
                    </div>
                    <div className="text-[9px] text-emerald-400">Tier {(player.equipment.mount || player.equipment.bike)?.tier} Steed</div>
                  </>
                ) : (
                  <div className="font-bold text-zinc-600 truncate text-[10px]">
                    {player.act6Completed || player.mountUnlocked ? 'No Steed' : '🔒 Locked'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Item Inspector (Side Card) */}
          {selectedInspectItem && (
            <div className="bg-zinc-900 border-2 border-amber-500/80 rounded-xl p-3 space-y-2.5 shadow-2xl relative animate-fade-in font-mono text-xs">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5">
                <span className="text-[9.5px] font-bold text-amber-400 uppercase tracking-wider">
                  ITEM INSPECTOR
                </span>
                <button
                  onClick={() => setSelectedInspectItem(null)}
                  className="text-zinc-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <div>
                <div className="text-[10px] text-zinc-400 uppercase font-semibold">
                  {selectedInspectItem.rarity} {selectedInspectItem.category} · Tier {selectedInspectItem.tier}
                </div>
                <h3 className="text-sm font-bold font-serif text-amber-200 leading-snug">
                  {selectedInspectItem.name}
                </h3>
              </div>

              <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 space-y-1 text-[11px]">
                {selectedInspectItem.baseDefense !== undefined && (
                  <div className="flex justify-between text-zinc-300">
                    <span>Base Armor:</span>
                    <strong className="text-emerald-400">+{selectedInspectItem.baseDefense} Armor</strong>
                  </div>
                )}
                {selectedInspectItem.baseDamageMin !== undefined && (
                  <div className="flex justify-between text-zinc-300">
                    <span>Damage Range:</span>
                    <strong className="text-amber-300">{selectedInspectItem.baseDamageMin}-{selectedInspectItem.baseDamageMax} ({selectedInspectItem.damageType || 'PHYSICAL'})</strong>
                  </div>
                )}
                {selectedInspectItem.inherentPerk && (
                  <div className="text-[10px] text-amber-400/90 italic pt-0.5 border-t border-zinc-800/60">
                    ✨ {selectedInspectItem.inherentPerk}
                  </div>
                )}
              </div>

              {/* Status Affixes */}
              {selectedInspectItem.affixes && selectedInspectItem.affixes.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[9px] uppercase font-bold text-purple-400">Affixes:</div>
                  {renderAffixBadges(selectedInspectItem)}
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {(() => {
                  const isWrongClass = Boolean(
                    selectedInspectItem.classReq &&
                      selectedInspectItem.classReq.length > 0 &&
                      !selectedInspectItem.classReq.includes(player.heroClass as any)
                  );
                  return (
                    <button
                      onClick={() => {
                        if (isWrongClass) {
                          notify(`🔒 Incompatible! (${player.heroClass} cannot equip this.)`, 'warning', '🔒');
                          return;
                        }
                        handleEquipGear(selectedInspectItem);
                        setSelectedInspectItem(null);
                      }}
                      disabled={isWrongClass}
                      className="py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-zinc-950 font-bold uppercase text-[11px] active:scale-95"
                    >
                      {isWrongClass ? '🔒 Locked' : 'Equip Item'}
                    </button>
                  );
                })()}

                <button
                  onClick={() => {
                    handleSellGear(selectedInspectItem);
                    setSelectedInspectItem(null);
                  }}
                  className="py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-300 font-bold uppercase text-[11px] active:scale-95"
                >
                  💰 Sell Gear
                </button>
              </div>
            </div>
          )}

          {/* Decryption Notification Modal */}
          {decryptedResult && (
            <div className="bg-gradient-to-br from-amber-950/90 via-zinc-900 to-purple-950/90 border-2 border-amber-500 rounded-xl p-3 text-center space-y-2 shadow-2xl animate-fade-in font-mono text-xs">
              <span className="text-[9px] uppercase text-amber-400 font-bold tracking-widest">✨ Decrypted Item</span>
              <h3 className="text-sm font-bold font-serif text-white">{decryptedResult.name}</h3>
              <p className="text-[10px] text-amber-200">
                {decryptedResult.baseDefense ? `Armor +${decryptedResult.baseDefense}` : `${decryptedResult.baseDamageMin}-${decryptedResult.baseDamageMax} DMG`}
              </p>
              <button
                onClick={() => setDecryptedResult(null)}
                className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold py-1 rounded text-[11px] uppercase"
              >
                Claim to Bag
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryView;
