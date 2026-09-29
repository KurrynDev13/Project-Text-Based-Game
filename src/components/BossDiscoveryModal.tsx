// BossDiscoveryModal.tsx
// Dramatic warning modal shown when the player first discovers an Act Boss.
// Includes level-gated Challenge button and plays boss warning sound on mount.

import React, { useEffect } from 'react';

// Utility import — soundFX is expected to be available globally or via a module.
// If it lives in a different path, adjust the import below accordingly.
import { soundFX } from '../utils/audio';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BossDiscoveryModalProps {
  bossId: string;
  bossName: string;
  bossTitle: string;
  bossLore: string;
  bossLevel: number;
  climaxLevelReq: number;
  playerLevel: number;
  /** Close the modal without fighting — player can come back later. */
  onDismiss: () => void;
  /** Close the modal and immediately begin boss combat. */
  onChallenge: () => void;
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

const BossDiscoveryModal: React.FC<BossDiscoveryModalProps> = ({
  bossId: _bossId,
  bossName,
  bossTitle,
  bossLore,
  bossLevel: _bossLevel,
  climaxLevelReq,
  playerLevel,
  onDismiss,
  onChallenge,
}) => {
  // Play the boss warning sound effect on mount
  useEffect(() => {
    soundFX.playBossWarningSound();
  }, []);

  const isUnderLeveled = playerLevel < climaxLevelReq;

  return (
    <div className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-gradient-to-b from-red-950/90 to-zinc-950 border-2 border-red-700/60
          rounded-2xl max-w-lg w-full p-6 space-y-5
          shadow-2xl shadow-red-950/60 animate-pulse-border"
      >
        {/* ── Warning Badge ── */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs font-mono font-bold tracking-widest uppercase px-3 py-1.5
            bg-red-950/80 border border-red-700/60 text-red-400 rounded-full">
            ⚠️ GUARDIAN DISCOVERED
          </span>
        </div>

        {/* ── Pulsing Red Glow Ring ── */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative flex items-center justify-center">
            {/* Animated glow behind emoji */}
            <div className="absolute w-20 h-20 rounded-full bg-red-700/25 animate-pulse" />
            <span className="text-6xl relative z-10 drop-shadow-[0_0_12px_rgba(220,38,38,0.8)]">
              👹
            </span>
          </div>

          {/* Boss Name */}
          <h2 className="font-serif text-red-300 text-2xl font-bold tracking-wide text-center">
            {bossName}
          </h2>

          {/* Boss Title */}
          <p className="text-amber-400 text-xs font-mono font-bold uppercase tracking-widest text-center">
            {bossTitle}
          </p>
        </div>

        {/* Decorative divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-800/60 to-red-700/60" />
          <span className="text-red-800 text-xs">✦</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-red-800/60 to-red-700/60" />
        </div>

        {/* ── Boss Lore ── */}
        <p className="font-serif text-amber-100 text-sm italic leading-relaxed text-center">
          {bossLore}
        </p>

        {/* ── Level Info ── */}
        <div className="flex items-center justify-between gap-4 px-2 py-3
          bg-zinc-900/60 border border-zinc-700/50 rounded-xl text-sm">
          <div className="text-center flex-1">
            <p className="text-zinc-500 text-xs mb-0.5">Required Level</p>
            <p className="font-mono font-bold text-red-400 text-lg">{climaxLevelReq}</p>
          </div>
          <div className="w-px h-8 bg-zinc-700" />
          <div className="text-center flex-1">
            <p className="text-zinc-500 text-xs mb-0.5">Your Level</p>
            <p className={`font-mono font-bold text-lg ${isUnderLeveled ? 'text-red-400' : 'text-amber-400'}`}>
              {playerLevel}
            </p>
          </div>
        </div>

        {/* Under-leveled warning */}
        {isUnderLeveled && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-950/60 border border-red-700/40 rounded-xl">
            <span className="text-red-400 text-sm">⚠</span>
            <p className="text-red-300 text-xs font-medium">
              You are not yet strong enough to challenge this Guardian.
            </p>
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          {/* Retreat (secondary) */}
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200
              bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300"
          >
            Retreat for Now
          </button>

          {/* Challenge (primary — disabled when under-leveled) */}
          <button
            type="button"
            onClick={isUnderLeveled ? undefined : onChallenge}
            disabled={isUnderLeveled}
            className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200
              ${isUnderLeveled
                ? 'bg-zinc-800 border border-zinc-700 text-zinc-600 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-red-800 to-amber-800 hover:from-red-700 hover:to-amber-700 text-amber-100 shadow-lg shadow-red-950/50 ring-1 ring-amber-700/40'
              }`}
          >
            Challenge the Guardian
          </button>
        </div>
      </div>
    </div>
  );
};

export default BossDiscoveryModal;
