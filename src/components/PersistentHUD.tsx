import React from 'react';
import { PlayerCharacter } from '../types/game';
import { calcDerivedStats, calcMaxStamina } from '../utils/gameFormulas';

interface PersistentHUDProps {
  player: PlayerCharacter;
  inCombat?: boolean;
}

export const PersistentHUD: React.FC<PersistentHUDProps> = ({ player, inCombat }) => {
  const derived = calcDerivedStats(player.attributes, player.level, player.equipment);

  const hpPercent = Math.max(0, Math.min(100, Math.floor((player.currentHp / derived.maxHp) * 100)));
  const mpPercent = Math.max(0, Math.min(100, Math.floor((player.currentMp / derived.maxMp) * 100)));

  const maxStamina = calcMaxStamina(player.level);
  const currentStamina = Math.min(maxStamina, player.stamina ?? maxStamina);

  return (
    <div data-tutorial-target="persistent-hud" className="fixed top-0 left-0 right-0 bg-zinc-950/95 backdrop-blur-md border-b border-amber-900/60 text-amber-100 px-3 py-2 shadow-2xl font-mono text-xs select-none z-40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        {/* Top Line: Wayfarer Level & Name & Combat Indicator */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-between">
          <div className="flex items-center space-x-2">
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold px-2 py-0.5 rounded text-[11px]">
              LVL {player.level} {player.heroClass || 'Wayfarer'}
            </span>
            <span className="font-bold text-white tracking-wide truncate max-w-[120px] md:max-w-none">{player.name}</span>
            {inCombat && (
              <span className="bg-red-900/80 text-red-200 border border-red-500/60 font-bold px-2 py-0.5 rounded text-[10px] animate-pulse">
                ⚔️ COMBAT ENGAGED
              </span>
            )}
          </div>

          <div className="md:hidden text-[11px] text-emerald-400 font-bold">
            ⚡ {currentStamina}/{maxStamina}
          </div>
        </div>

        {/* Meters: HP & MP */}
        <div className="grid grid-cols-2 md:flex items-center gap-2 md:gap-4 w-full md:w-auto">
          {/* HP Bar */}
          <div className="flex items-center space-x-2 bg-zinc-900/80 px-2 py-1 rounded border border-red-900/40 flex-1 md:w-48">
            <span className="text-red-400 font-bold text-[10px] shrink-0">HP</span>
            <div className="w-full h-2.5 bg-zinc-950 rounded overflow-hidden border border-red-900/50">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-300"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-300 shrink-0 font-mono">
              {player.currentHp}/{derived.maxHp}
            </span>
          </div>

          {/* MP Bar */}
          <div className="flex items-center space-x-2 bg-zinc-900/80 px-2 py-1 rounded border border-sky-900/40 flex-1 md:w-40">
            <span className="text-sky-400 font-bold text-[10px] shrink-0">MP</span>
            <div className="w-full h-2.5 bg-zinc-950 rounded overflow-hidden border border-sky-900/50">
              <div
                className="h-full bg-gradient-to-r from-sky-600 to-cyan-400 transition-all duration-300"
                style={{ width: `${mpPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-300 shrink-0 font-mono">
              {player.currentMp}/{derived.maxMp}
            </span>
          </div>
        </div>

        {/* Wallet & Stamina Summary */}
        <div className="flex items-center space-x-3 text-[11px] bg-zinc-900 px-3 py-1 rounded border border-zinc-800 w-full md:w-auto justify-between md:justify-end">
          {/* Pre-Colonial Currency Tiers */}
          <div className="flex items-center space-x-2 font-bold">
            <span className="text-yellow-400">{player.wallet.goldIngots ?? player.wallet.goldSovereigns ?? 0} Gold</span>
            <span className="text-slate-300">{player.wallet.silverPieces ?? player.wallet.silverShillings ?? 0} Silver</span>
            <span className="text-amber-500">{player.wallet.cowrieShells ?? player.wallet.copperCoins ?? 0} Shells</span>
          </div>

          <div className="text-purple-300 font-bold border-l border-zinc-700 pl-2">
            🔮 {player.wallet.mutyaShards ?? player.wallet.prismaticShards ?? 0} Mutya
          </div>

          <div className="hidden md:flex items-center space-x-1 text-emerald-400 font-bold border-l border-zinc-700 pl-2">
            ⚡ {currentStamina}/{maxStamina}
          </div>
        </div>
      </div>
    </div>
  );
};
