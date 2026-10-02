import React from 'react';
import { EncryptedMemory } from '../types/game';

interface RaidSurgeRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  damageDealt: number;
  cowriesEarned: number;
  silverEarned: number;
  mutyaEarned: number;
  expEarned: number;
  memoryDropped?: EncryptedMemory | null;
  rallyModifier?: number;
}

export const RaidSurgeRewardModal: React.FC<RaidSurgeRewardModalProps> = ({
  isOpen,
  onClose,
  damageDealt,
  cowriesEarned,
  silverEarned,
  mutyaEarned,
  expEarned,
  memoryDropped,
  rallyModifier = 1.0,
}) => {
  if (!isOpen) return null;

  const rallyPct = Math.round((rallyModifier - 1.0) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-zinc-950/95 border-2 border-amber-500/80 rounded-2xl p-6 shadow-2xl space-y-5 text-amber-100 overflow-hidden">
        {/* Shimmering Celestial Background Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center space-y-1 relative">
          <div className="inline-flex items-center space-x-1.5 bg-purple-950/80 border border-purple-500/50 px-3 py-1 rounded-full text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider">
            <span>⚡</span>
            <span>RUSH-HOUR CELESTIAL SURGE</span>
            <span>⚡</span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-amber-200 mt-2">
            Surge Spoils Unleashed!
          </h2>
          <p className="text-xs text-zinc-400 font-sans">
            Striking during the 7:00–9:00 AM/PM celestial alignment amplified your damage and unlocked empowered raid rewards!
          </p>
        </div>

        {/* Active Multiplier Badges */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono font-bold">
          <div className="bg-purple-950/60 border border-purple-700/60 rounded-lg p-2 text-purple-300 flex items-center space-x-2">
            <span className="text-base">⚡</span>
            <div>
              <div className="text-white">+20% Surge DMG</div>
              <div className="text-purple-400 text-[9px] font-normal">Active Rush Hour</div>
            </div>
          </div>
          <div className="bg-amber-950/60 border border-amber-700/60 rounded-lg p-2 text-amber-300 flex items-center space-x-2">
            <span className="text-base">✨</span>
            <div>
              <div className="text-white">1.5x Mutya Shards</div>
              <div className="text-amber-400 text-[9px] font-normal">Empowered Infusion</div>
            </div>
          </div>
          {rallyPct > 0 && (
            <div className="col-span-2 bg-red-950/60 border border-red-700/60 rounded-lg p-2 text-red-300 flex items-center space-x-2">
              <span className="text-base">🔥</span>
              <div>
                <div className="text-white">+{rallyPct}% Community Rally Modifier</div>
                <div className="text-red-400 text-[9px] font-normal">Ancestral Spirits Empower All Attacks</div>
              </div>
            </div>
          )}
        </div>

        {/* Loot Breakdown Card */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-3 font-mono text-xs">
          <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2">
            <span className="text-zinc-400">Total Raid Impact:</span>
            <span className="text-purple-300 font-bold text-sm">
              ⚔️ {damageDealt.toLocaleString()} DMG
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800/60">
              <div className="text-[10px] text-zinc-400">Treasury Reward</div>
              <div className="text-amber-300 font-bold text-xs mt-0.5">
                +{silverEarned} Silver, +{cowriesEarned} Shells
              </div>
            </div>
            <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800/60">
              <div className="text-[10px] text-zinc-400">Sacred Pearls</div>
              <div className="text-cyan-300 font-bold text-xs mt-0.5">
                +{mutyaEarned} Mutya Shards
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-1 text-[11px]">
            <span className="text-zinc-400">Battle Clear EXP:</span>
            <span className="text-emerald-400 font-bold">+{expEarned.toLocaleString()} EXP</span>
          </div>

          {/* Encrypted Memory Roll Result */}
          {memoryDropped ? (
            <div className="bg-gradient-to-r from-purple-950 to-indigo-950 border border-purple-500/80 rounded-lg p-3 text-center space-y-1">
              <div className="text-[10px] text-purple-300 font-bold uppercase tracking-wider flex items-center justify-center space-x-1">
                <span>🔮</span>
                <span>MYTHIC FRAGMENT DISCOVERED!</span>
                <span>🔮</span>
              </div>
              <div className="text-amber-200 font-serif font-bold text-sm">
                {memoryDropped.name}
              </div>
              <div className="text-[10px] text-zinc-400">
                Tier: <strong className="text-purple-300">{memoryDropped.rarity}</strong> • Min Level: {memoryDropped.minLevel}
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-zinc-500 text-center italic">
              Encrypted Memory roll missed (25% chance). Strike again during surge!
            </div>
          )}
        </div>

        {/* Claim / Dismiss Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-zinc-950 font-serif font-bold text-sm rounded-xl uppercase tracking-wider shadow-lg transition-all active:scale-98"
        >
          Collect Surge Spoils
        </button>
      </div>
    </div>
  );
};

