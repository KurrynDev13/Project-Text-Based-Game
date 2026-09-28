import React, { useState } from 'react';
import { PlayerCharacter, EquipmentItem, ConsumableItem } from '../types/game';
import { calcDerivedStats } from '../utils/gameFormulas';
import { soundFX } from '../utils/audio';

interface InventoryViewProps {
  player: PlayerCharacter;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onNavigateCodebreaker: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  player,
  onUpdatePlayer,
  onNavigateCodebreaker,
}) => {
  const [activeTab, setActiveTab] = useState<'GEAR' | 'CONSUMABLES' | 'MEMORIES'>('GEAR');
  const [selectedInspectItem, setSelectedInspectItem] = useState<EquipmentItem | null>(null);

  const derived = calcDerivedStats(player.attributes, player.level, player.equipment);

  const handleEquipGear = (item: EquipmentItem) => {
    soundFX.playClickSound();

    const newEquipment = { ...player.equipment };
    let unequippedItem: EquipmentItem | null = null;

    if (item.category === 'UPPER') {
      unequippedItem = newEquipment.upperArmor;
      newEquipment.upperArmor = item;
    } else if (item.category === 'LOWER') {
      unequippedItem = newEquipment.lowerArmor;
      newEquipment.lowerArmor = item;
    } else if (item.category === 'BIKE') {
      unequippedItem = newEquipment.bike;
      newEquipment.bike = item;
    } else {
      const targetSlot = item.weaponSlot || (item.category === 'DAGGER' ? 'PRIMARY' : item.category === 'BOW' ? 'SPECIAL' : 'HEAVY');
      if (targetSlot === 'PRIMARY') {
        unequippedItem = newEquipment.primaryWeapon;
        newEquipment.primaryWeapon = item;
      } else if (targetSlot === 'SPECIAL') {
        unequippedItem = newEquipment.specialWeapon;
        newEquipment.specialWeapon = item;
      } else {
        unequippedItem = newEquipment.heavyWeapon;
        newEquipment.heavyWeapon = item;
      }
    }

    let newInventory = player.inventory.filter((inv) => inv.id !== item.id);
    if (unequippedItem) {
      newInventory.push(unequippedItem);
    }

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
      alert('No Common quality equipment items found in bag!');
      return;
    }

    let totalSalvageCC = 0;
    commons.forEach((c) => {
      totalSalvageCC += Math.floor((c.costInCC || 50) * 0.5);
    });

    const remainingInventory = player.inventory.filter((i) => !('rarity' in i && i.rarity === 'COMMON'));
    const totalCC = player.wallet.copperCoins + totalSalvageCC + (player.wallet.silverShillings * 100) + (player.wallet.goldSovereigns * 10000);

    const newGold = Math.floor(totalCC / 10000);
    const remGold = totalCC % 10000;
    const newSilver = Math.floor(remGold / 100);
    const newCopper = remGold % 100;

    soundFX.playCoinSound();
    onUpdatePlayer({
      ...player,
      inventory: remainingInventory,
      wallet: {
        ...player.wallet,
        goldSovereigns: newGold,
        silverShillings: newSilver,
        copperCoins: newCopper,
        prismaticShards: player.wallet.prismaticShards + commons.length,
      },
    });

    alert(`🔨 Salvaged ${commons.length} Common items! Earned +${totalSalvageCC} CC & +${commons.length} Prismatic Shards.`);
  };

  // BATCH ACTION 2: Auto-Sort Inventory
  const handleAutoSort = () => {
    soundFX.playClickSound();
    const sorted = [...player.inventory].sort((a, b) => {
      const tierA = 'tier' in a ? a.tier : 0;
      const tierB = 'tier' in b ? b.tier : 0;
      return tierB - tierA;
    });

    onUpdatePlayer({ ...player, inventory: sorted });
  };

  const gearItems = player.inventory.filter((i): i is EquipmentItem => 'category' in i && ['UPPER', 'LOWER', 'DAGGER', 'SWORD', 'BOW', 'STAFF', 'BIKE'].includes(i.category));
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
              onClick={handleSalvageAllCommons}
              className="bg-red-950 hover:bg-red-900 border border-red-600/50 text-red-200 font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all"
            >
              🔨 Salvage Commons
            </button>
            <button
              onClick={handleAutoSort}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all"
            >
              🔄 Auto-Sort
            </button>
          </div>
        </div>

        {/* Paper Doll Slots Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 font-mono text-xs">
          {/* Upper Armor Slot */}
          <div className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-center space-y-1">
            <div className="text-[10px] uppercase text-zinc-500">Upper Armor</div>
            <div className="font-bold text-amber-200 truncate">{player.equipment.upperArmor?.name || 'Empty Slot'}</div>
            <div className="text-[10px] text-amber-400">+{player.equipment.upperArmor?.baseDefense || 0} Armor</div>
          </div>

          {/* Lower Armor Slot */}
          <div className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-center space-y-1">
            <div className="text-[10px] uppercase text-zinc-500">Lower Armor</div>
            <div className="font-bold text-amber-200 truncate">{player.equipment.lowerArmor?.name || 'Empty Slot'}</div>
            <div className="text-[10px] text-amber-400">+{player.equipment.lowerArmor?.baseDefense || 0} Armor</div>
          </div>

          {/* Main Hand Slot */}
          <div className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-center space-y-1">
            <div className="text-[10px] uppercase text-zinc-500">Main Hand (Primary)</div>
            <div className="font-bold text-amber-200 truncate">{player.equipment.primaryWeapon?.name || 'Rusted Shiv'}</div>
            <div className="text-[10px] text-sky-400">{player.equipment.primaryWeapon?.baseDamageMin || 4}-{player.equipment.primaryWeapon?.baseDamageMax || 7} DMG</div>
          </div>

          {/* Special Weapon Slot */}
          <div className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-center space-y-1">
            <div className="text-[10px] uppercase text-zinc-500">Off-Hand / Special</div>
            <div className="font-bold text-amber-200 truncate">{player.equipment.specialWeapon?.name || 'Birch Bow'}</div>
            <div className="text-[10px] text-purple-400">{player.equipment.specialWeapon?.baseDamageMin || 5}-{player.equipment.specialWeapon?.baseDamageMax || 9} DMG</div>
          </div>

          {/* Accessory / Mount Slot */}
          <div className="col-span-2 md:col-span-1 bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-center space-y-1">
            <div className="text-[10px] uppercase text-zinc-500">Vehicle / Mount</div>
            <div className="font-bold text-amber-200 truncate">{player.equipment.bike?.name || 'Sparrow Bike'}</div>
            <div className="text-[10px] text-emerald-400">Tier {player.equipment.bike?.tier || 1} Speed</div>
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
          </div>

          <span className="text-xs font-mono text-zinc-400">
            Capacity: <strong>{player.inventory.length} / {derived.inventoryCapacity}</strong>
          </span>
        </div>

        {/* Gear Grid */}
        {activeTab === 'GEAR' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {gearItems.map((item) => {
              const currentlyEquippedArmor = item.category === 'UPPER' ? player.equipment.upperArmor : player.equipment.lowerArmor;
              const currentDef = currentlyEquippedArmor?.baseDefense || 0;
              const deltaArmor = (item.baseDefense || 0) - currentDef;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedInspectItem(item)}
                  className={`bg-zinc-950 border rounded-xl p-3 flex flex-col justify-between space-y-2 cursor-pointer transition-all ${
                    selectedInspectItem?.id === item.id
                      ? 'border-amber-400 ring-2 ring-amber-500/50'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="uppercase text-amber-500 font-semibold">{item.archetype || item.category}</span>
                      <span className="text-zinc-500 font-bold">Tier {item.tier}</span>
                    </div>
                    <h4 className="text-sm font-bold font-serif text-amber-200">{item.name}</h4>
                    <p className="text-xs text-zinc-300 font-mono mt-0.5">
                      {item.baseDefense ? `Base Armor: +${item.baseDefense}` : `Damage: ${item.baseDamageMin}-${item.baseDamageMax}`}
                    </p>

                    {/* Stat Delta Tooltip Highlight */}
                    {item.baseDefense && (
                      <div className="text-[10px] font-mono mt-1 font-bold">
                        Delta vs Equipped:{' '}
                        <span className={deltaArmor >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {deltaArmor >= 0 ? `+${deltaArmor}` : deltaArmor} Armor
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEquipGear(item);
                    }}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold py-1 rounded text-xs font-mono uppercase tracking-wider"
                  >
                    Equip Item
                  </button>
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
      </div>
    </div>
  );
};
