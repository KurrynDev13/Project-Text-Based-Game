import React, { useState } from 'react';
import { soundFX } from '../utils/audio';

interface RaidJackpotModalProps {
  isOpen: boolean;
  onClose: () => void;
  cycleNumber: number;
  onClaimJackpot: () => Promise<boolean>;
  isClaiming: boolean;
}

export const RaidJackpotModal: React.FC<RaidJackpotModalProps> = ({
  isOpen,
  onClose,
  cycleNumber,
  onClaimJackpot,
  isClaiming,
}) => {
  const [hasClaimedSuccess, setHasClaimedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleClaim = async () => {
    soundFX.playVictorySound();
    const success = await onClaimJackpot();
    if (success) {
      setHasClaimedSuccess(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-zinc-950/95 border-2 border-yellow-500/90 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6 text-amber-100 overflow-hidden text-center">
        {/* Golden Celestial Victory Glow */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-yellow-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-amber-600/25 rounded-full blur-3xl pointer-events-none" />

        {/* Victory Header */}
        <div className="space-y-2 relative">
          <div className="inline-flex items-center space-x-2 bg-yellow-950/80 border border-yellow-500/60 px-4 py-1 rounded-full text-xs font-mono text-yellow-300 font-bold uppercase tracking-widest animate-pulse">
            <span>🏆</span>
            <span>WEEKLY RAID VICTORY JACKPOT • CYCLE {cycleNumber}</span>
            <span>🏆</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-yellow-200">
            Bakunawa Banished!
          </h2>
          <p className="text-xs md:text-sm text-zinc-300 font-sans max-w-md mx-auto">
            The seven moons shine bright across the archipelago! Your valiant combat contributions have earned you the sacred weekly treasury bounty!
          </p>
        </div>

        {/* Itemized Bounty Showcase */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-left font-mono">
          {/* Gold Ingots */}
          <div className="bg-zinc-900/90 border border-yellow-600/50 rounded-xl p-3 space-y-1">
            <div className="flex items-center space-x-1.5 text-yellow-400 font-bold text-xs">
              <span className="text-lg">🪙</span>
              <span>Gold Ingots</span>
            </div>
            <div className="text-xl font-bold text-yellow-200">+3 Ingots</div>
            <div className="text-[10px] text-zinc-400">Value: 30,000 Shells</div>
          </div>

          {/* Silver Pieces */}
          <div className="bg-zinc-900/90 border border-zinc-700 rounded-xl p-3 space-y-1">
            <div className="flex items-center space-x-1.5 text-zinc-200 font-bold text-xs">
              <span className="text-lg">🥈</span>
              <span>Silver Pieces</span>
            </div>
            <div className="text-xl font-bold text-zinc-100">+40 Silver</div>
            <div className="text-[10px] text-zinc-400">Value: 4,000 Shells</div>
          </div>

          {/* Cowrie Shells */}
          <div className="bg-zinc-900/90 border border-amber-700/50 rounded-xl p-3 space-y-1">
            <div className="flex items-center space-x-1.5 text-amber-400 font-bold text-xs">
              <span className="text-lg">🐚</span>
              <span>Cowrie Shells</span>
            </div>
            <div className="text-xl font-bold text-amber-200">+5,000 CC</div>
            <div className="text-[10px] text-zinc-400">Daily Trade Coin</div>
          </div>

          {/* Mutya Shards */}
          <div className="bg-zinc-900/90 border border-cyan-700/50 rounded-xl p-3 space-y-1">
            <div className="flex items-center space-x-1.5 text-cyan-400 font-bold text-xs">
              <span className="text-lg">✨</span>
              <span>Mutya Shards</span>
            </div>
            <div className="text-xl font-bold text-cyan-200">+20 Shards</div>
            <div className="text-[10px] text-zinc-400">For Blessings &amp; Skills</div>
          </div>

          {/* Clear EXP */}
          <div className="bg-zinc-900/90 border border-emerald-700/50 rounded-xl p-3 space-y-1">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-xs">
              <span className="text-lg">⚡</span>
              <span>Victory EXP</span>
            </div>
            <div className="text-xl font-bold text-emerald-200">+35,000 EXP</div>
            <div className="text-[10px] text-zinc-400">Massive Level Progress</div>
          </div>

          {/* Mythic RED Encrypted Memory */}
          <div className="bg-gradient-to-br from-red-950/80 to-purple-950/80 border border-red-500/70 rounded-xl p-3 space-y-1">
            <div className="flex items-center space-x-1.5 text-red-400 font-bold text-xs">
              <span className="text-lg">🔮</span>
              <span>RED Memory</span>
            </div>
            <div className="text-base font-bold text-red-200">1x Mythic Memory</div>
            <div className="text-[10px] text-zinc-300">Decodes into Triumphant Gear</div>
          </div>
        </div>

        {/* Action Button */}
        {hasClaimedSuccess ? (
          <div className="space-y-3">
            <div className="p-3 bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-mono text-xs rounded-xl">
              ✅ Weekly Victory Jackpot successfully claimed and added to your Hero inventory!
            </div>
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-mono font-bold text-xs rounded-xl uppercase tracking-wider transition-all"
            >
              Return to Raid Dispatch
            </button>
          </div>
        ) : (
          <button
            onClick={handleClaim}
            disabled={isClaiming}
            className="w-full py-4 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-400 hover:to-amber-500 text-zinc-950 font-serif font-bold text-base rounded-xl uppercase tracking-wider shadow-2xl transition-all active:scale-98 disabled:opacity-50"
          >
            {isClaiming ? 'Claiming Celestial Bounty...' : 'Claim Celestial Victory Bounty!'}
          </button>
        )}
      </div>
    </div>
  );
};
