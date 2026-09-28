import React, { useState } from 'react';
import { PlayerCharacter, EncryptedMemory, EquipmentItem, ItemRarity } from '../types/game';
import { UPPER_ARMORS, LOWER_ARMORS, DAGGERS, SWORDS, BOWS, STAVES, BIKES, ENCHANTER_PREFIXES, ENCHANTER_SUFFIXES } from '../data/equipmentData';
import { soundFX } from '../utils/audio';

interface CodebreakerViewProps {
  player: PlayerCharacter;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
}

export const CodebreakerView: React.FC<CodebreakerViewProps> = ({ player, onUpdatePlayer }) => {
  const [decryptedResult, setDecryptedResult] = useState<EquipmentItem | null>(null);

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
    const updatedMemories = player.encryptedMemories.filter((m) => m.id !== memory.id);
    const updatedInventory = [...player.inventory, newItem];

    onUpdatePlayer({
      ...player,
      encryptedMemories: updatedMemories,
      inventory: updatedInventory,
    });

    setDecryptedResult(newItem);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-amber-100 p-4 md:p-6 space-y-6 overflow-y-auto">
      {/* Codebreaker Header */}
      <div className="bg-zinc-900 border border-amber-900/50 rounded-xl p-5 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-xs font-mono uppercase text-amber-500 tracking-wider">Titan Codebreaker Terminal</div>
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-amber-200">Memory Decryptor</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Decrypt salvaged Encrypted Memories acquired from defeating Titans to generate weapons, armor, and vehicles!
          </p>
        </div>
        <div className="bg-zinc-950 px-4 py-2 rounded-lg border border-zinc-800 text-xs font-mono">
          Encrypted Memories Stored: <span className="text-amber-400 font-bold text-sm">{player.encryptedMemories.length}</span>
        </div>
      </div>

      {/* Decryption Animation / Result Modal */}
      {decryptedResult && (
        <div className="bg-gradient-to-br from-amber-950/80 via-zinc-900 to-purple-950/80 border-2 border-amber-500 rounded-xl p-6 text-center space-y-3 shadow-2xl animate-fade-in">
          <div className="text-xs font-mono uppercase text-amber-400 font-semibold tracking-widest">✨ Decryption Successful!</div>
          <h3 className="text-2xl font-bold font-serif text-white">{decryptedResult.name}</h3>
          <div className="inline-block bg-zinc-950 px-3 py-1 rounded text-xs font-mono text-purple-300 border border-purple-500/40">
            Rarity: {decryptedResult.rarity} | Level {decryptedResult.levelReq}
          </div>
          <p className="text-xs text-amber-200/90 font-mono">
            {decryptedResult.baseDefense ? `Base Armor: +${decryptedResult.baseDefense}` : `Damage: ${decryptedResult.baseDamageMin}-${decryptedResult.baseDamageMax}`}
            {decryptedResult.inherentPerk ? ` | ${decryptedResult.inherentPerk}` : ''}
          </p>
          <button
            onClick={() => setDecryptedResult(null)}
            className="mt-2 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold px-6 py-2 rounded-lg text-xs tracking-wider uppercase transition-all shadow"
          >
            Claim to Inventory
          </button>
        </div>
      )}

      {/* Memories Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-mono uppercase text-zinc-400">Encrypted Memories in Storage</h3>

        {player.encryptedMemories.length === 0 ? (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-8 text-center space-y-2">
            <div className="text-3xl">💎</div>
            <p className="text-sm text-zinc-400 font-mono">No Encrypted Memories in vault.</p>
            <p className="text-xs text-zinc-500">Defeat enemies in Titan locations or clear daily bounties to acquire memories!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {player.encryptedMemories.map((mem) => {
              const borderColors = {
                WHITE: 'border-zinc-700 bg-zinc-900/60 text-zinc-200',
                GREEN: 'border-emerald-600/60 bg-emerald-950/30 text-emerald-300',
                BLUE: 'border-sky-600/60 bg-sky-950/30 text-sky-300',
                PURPLE: 'border-purple-600/60 bg-purple-950/30 text-purple-300',
                RED: 'border-red-600/60 bg-red-950/30 text-red-300',
              };

              return (
                <div
                  key={mem.id}
                  className={`border rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-md ${borderColors[mem.rarity]}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs font-mono font-bold uppercase">{mem.rarity} MEMORY</div>
                      <h4 className="text-base font-bold font-serif mt-0.5">{mem.name}</h4>
                      <p className="text-[11px] text-zinc-400">Level {mem.minLevel}+ Salvage</p>
                    </div>
                    <div className="text-2xl">💎</div>
                  </div>

                  <button
                    onClick={() => handleDecryptMemory(mem)}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold py-2 rounded-lg text-xs uppercase font-mono tracking-wider transition-all shadow"
                  >
                    Decrypt Memory
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
