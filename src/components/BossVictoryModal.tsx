// BossVictoryModal.tsx
// Grand cinematic Act Guardian Boss Victory Modal
// Displays boss trophy header, Next Act unlock announcement, dropped Legendary Boss Gear,
// PURPLE/RED Encrypted Memory, Mutya Shards, and rewards claim button.

import React, { useEffect } from 'react';
import { EquipmentItem, EncryptedMemory } from '../types/game';
import { formatCostInCowries } from '../utils/gameFormulas';
import { soundFX } from '../utils/audio';
import { ACT8_VICTORY_STORY, NG_PLUS_BOSS_GLYPH_FRAGMENTS } from '../data/actStoryData';

interface BossVictoryModalProps {
  bossId?: string;
  bossName: string;
  bossTitle: string;
  nextActName?: string;
  expEarned: number;
  cowriesEarned: number;
  mutyaShardsEarned: number;
  droppedItem?: EquipmentItem;
  droppedMemory?: EncryptedMemory;
  isNgPlus?: boolean;
  onClaim: () => void;
}

export const BossVictoryModal: React.FC<BossVictoryModalProps> = ({
  bossId,
  bossName,
  bossTitle,
  nextActName,
  expEarned,
  cowriesEarned,
  mutyaShardsEarned,
  droppedItem,
  droppedMemory,
  isNgPlus,
  onClaim,
}) => {
  useEffect(() => {
    soundFX.playLevelUpSound();
  }, []);

  const glyphFragment = isNgPlus && bossId ? NG_PLUS_BOSS_GLYPH_FRAGMENTS[bossId] : null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-gradient-to-b from-amber-950/90 via-zinc-950 to-zinc-950 border-2 border-amber-500/80 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-3.5 sm:p-6 space-y-3 sm:space-y-4 shadow-2xl shadow-amber-950/80 animate-fade-in text-center my-auto">
        {/* Victory Header Badge */}
        <div className="flex items-center justify-center space-x-2">
          <span className="text-2xl animate-bounce">👑</span>
          <span className="text-xs font-mono font-bold tracking-widest uppercase px-3 py-1 bg-amber-950 border border-amber-500/50 text-amber-300 rounded-full shadow-lg">
            ACT GUARDIAN SLAIN & CONQUERED!
          </span>
          <span className="text-2xl animate-bounce">👑</span>
        </div>

        <div>
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-amber-200">{bossName}</h2>
          <p className="text-xs font-mono text-amber-400 mt-1 uppercase tracking-wider">{bossTitle}</p>
        </div>

        {/* Next Act Unlock Banner / Act 8 Campaign Victory */}
        {bossName.includes('Bakunawa') || bossId === 'boss_act_8' ? (
          <div className="bg-gradient-to-r from-purple-950 via-amber-950 to-purple-950 border-2 border-amber-400 p-3.5 rounded-xl shadow-xl space-y-2 text-left">
            <div className="text-[10px] font-mono uppercase text-amber-400 font-bold tracking-widest text-center">👑 SUPREME CAMPAIGN CONQUEST!</div>
            <div className="text-sm font-bold font-serif text-amber-200 text-center">
              🌕 The Seven Moons Restored! Darkness Banished!
            </div>
            
            {/* Act VIII Epic Victory Lore Cutscene Box */}
            <div className="bg-zinc-950/90 border border-amber-500/40 p-3 rounded-lg text-xs font-mono text-amber-100 max-h-44 overflow-y-auto leading-relaxed shadow-inner">
              <p className="whitespace-pre-line text-zinc-200 leading-normal">{ACT8_VICTORY_STORY}</p>
            </div>

            <div className="text-[11px] font-mono text-zinc-300 pt-1 text-center">
              Unlocked: <strong className="text-purple-300">The Celestial Ether of Bathala</strong> (Infinite Survival Mode) &amp; <strong className="text-emerald-400">Anito Cycle Rebirth</strong> (New Game+)!
            </div>
          </div>
        ) : nextActName ? (
          <div className="bg-gradient-to-r from-emerald-950 via-zinc-900 to-emerald-950 border border-emerald-500/60 p-3 rounded-xl shadow-lg">
            <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold tracking-widest">MAP PROGRESSION UNLOCKED</div>
            <div className="text-sm font-bold font-serif text-emerald-200 mt-0.5">
              🗺️ {nextActName} is now accessible!
            </div>
          </div>
        ) : null}

        {/* NG+ Fragmented Anito Glyph Lore Reveal */}
        {glyphFragment && (
          <div className="bg-gradient-to-r from-purple-950/90 via-zinc-900 to-purple-950/90 border-2 border-purple-500/70 p-3.5 rounded-xl text-left space-y-1.5 shadow-xl animate-fade-in">
            <div className="text-[10px] font-mono font-bold uppercase text-purple-300 tracking-wider flex items-center justify-between border-b border-purple-500/30 pb-1">
              <span>🔮 FRAGMENTED ANITO GLYPH REVEALED</span>
              <span>NG+ COSMIC RITUAL</span>
            </div>
            <h4 className="text-xs font-bold font-serif text-amber-200">{glyphFragment.title}</h4>
            <p className="text-[11px] font-mono text-purple-100 leading-relaxed italic bg-purple-950/40 p-2.5 rounded border border-purple-800/40">
              "{glyphFragment.text}"
            </p>
          </div>
        )}

        {/* Climax Boss Loot Chest Section */}
        <div className="bg-zinc-950/90 border border-amber-900/60 rounded-xl p-4 space-y-3 text-left">
          <div className="text-xs font-mono font-bold uppercase text-amber-400 border-b border-zinc-800 pb-1 flex justify-between items-center">
            <span>🎁 CLIMAX BOSS LOOT CHEST</span>
            <span className="text-[10px] text-amber-300 font-normal">GUARANTEED DROPS</span>
          </div>

          {/* Dropped Legendary Boss Artifact Gear */}
          {droppedItem && (
            <div className="bg-zinc-900/90 border border-amber-500/50 p-3 rounded-lg flex items-center space-x-3 shadow-md">
              <span className="text-3xl shrink-0">{droppedItem.icon || '⚔️'}</span>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold font-serif text-amber-300">{droppedItem.name}</h4>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-amber-950 text-amber-400 border border-amber-500/30">
                    {droppedItem.rarity}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                  {droppedItem.category} • Req Lv {droppedItem.levelReq}
                  {droppedItem.baseDamageMax ? ` • Dmg ${droppedItem.baseDamageMin}-${droppedItem.baseDamageMax}` : ''}
                  {droppedItem.baseDefense ? ` • Def +${droppedItem.baseDefense}` : ''}
                </div>
              </div>
            </div>
          )}

          {/* Dropped Encrypted Memory */}
          {droppedMemory && (
            <div className="bg-purple-950/60 border border-purple-500/50 p-2.5 rounded-lg flex items-center justify-between shadow-md">
              <div className="flex items-center space-x-2.5">
                <span className="text-2xl">💎</span>
                <div>
                  <div className="text-xs font-bold text-purple-200 font-serif">{droppedMemory.name}</div>
                  <div className="text-[10px] font-mono text-zinc-400">Decrypt in Inventory -&gt; Memories vault</div>
                </div>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-purple-900 text-purple-200 border border-purple-400">
                {droppedMemory.rarity}
              </span>
            </div>
          )}

          {/* Currency, Mutya Shards & EXP Breakdown */}
          <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px] text-center">
            <div className="bg-zinc-900/80 border border-zinc-800 p-2 rounded-lg">
              <div className="text-emerald-400 font-bold">+{expEarned} EXP</div>
              <div className="text-[9px] text-zinc-500">Climax XP</div>
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800 p-2 rounded-lg">
              <div className="text-amber-400 font-bold">+{formatCostInCowries(cowriesEarned)}</div>
              <div className="text-[9px] text-zinc-500">Cowrie Wealth</div>
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800 p-2 rounded-lg">
              <div className="text-purple-300 font-bold">+{mutyaShardsEarned} Mutya</div>
              <div className="text-[9px] text-zinc-500">Pearl Shards</div>
            </div>
          </div>
        </div>

        {/* Claim Rewards Action Button */}
        <button
          onClick={onClaim}
          className="w-full bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold py-3 rounded-xl uppercase font-mono tracking-wider transition-all shadow-xl active:scale-95 text-xs flex items-center justify-center space-x-2"
        >
          <span>🏆</span>
          <span>Claim Rewards &amp; Continue Expedition</span>
        </button>
      </div>
    </div>
  );
};

export default BossVictoryModal;

