import React, { useState } from 'react';
import { PlayerCharacter } from '../types/game';
import { calcDerivedStats, calcMaxStamina } from '../utils/gameFormulas';
import { BgmControl } from './BgmControl';
import { AnnouncementTicker } from './AnnouncementTicker';

interface PersistentHUDProps {
  player: PlayerCharacter;
  inCombat?: boolean;
  onTickerActiveChange?: (isActive: boolean) => void;
  onOpenSettings?: () => void;
}

export const PersistentHUD: React.FC<PersistentHUDProps> = ({ player, inCombat, onTickerActiveChange, onOpenSettings }) => {
  const [tickerActive, setTickerActive] = useState<boolean>(false);

  const handleTickerChange = (active: boolean) => {
    setTickerActive(active);
    onTickerActiveChange?.(active);
  };
  const derived = calcDerivedStats(player.attributes, player.level, player.equipment);

  const hpPercent = Math.max(0, Math.min(100, Math.floor((player.currentHp / derived.maxHp) * 100)));
  const mpPercent = Math.max(0, Math.min(100, Math.floor((player.currentMp / derived.maxMp) * 100)));

  const maxStamina = calcMaxStamina(player.level);
  const currentStamina = Math.min(maxStamina, player.stamina ?? maxStamina);

  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex flex-col transition-all duration-300">
      {/* Floating Marquee Announcement Ticker Bar */}
      <AnnouncementTicker onTickerActiveChange={handleTickerChange} />

      {/* Main Persistent Status HUD Bar */}
      {inCombat ? (
        /* ULTRA-COMPACT SINGLE-LINE HUD DURING ACTIVE COMBAT */
        <div
          data-tutorial-target="persistent-hud"
          className="bg-[#07090e]/95 backdrop-blur-md border-b border-amber-500/25 text-amber-100 px-2 py-1 md:px-3 md:py-1.5 shadow-2xl font-mono text-[10px] md:text-xs select-none"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            {/* Left: Combat Engaged Indicator */}
            <div className="flex items-center gap-1.5">
              <span className="bg-red-950/90 text-red-200 border border-red-500/80 font-bold px-2 py-0.5 rounded-lg text-[9px] md:text-[10px] animate-pulse flex items-center gap-1 shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                <span>⚔️</span>
                <span>COMBAT ENGAGED</span>
              </span>
            </div>

            {/* Right: Currencies, Stamina, Audio & Settings Controls */}
            <div className="flex items-center space-x-2 md:space-x-3 text-[9.5px] md:text-[11px] bg-[#0c0f16]/90 px-2 py-0.5 md:px-2.5 md:py-1 rounded-xl border border-zinc-800">
              <div className="flex items-center space-x-1.5 md:space-x-2 font-bold font-mono">
                <span className="text-amber-300 font-semibold">{player.wallet.goldIngots ?? player.wallet.goldSovereigns ?? 0}🪙</span>
                <span className="text-zinc-300 font-semibold">{player.wallet.silverPieces ?? player.wallet.silverShillings ?? 0}🔘</span>
                <span className="text-amber-500 font-semibold">{player.wallet.cowrieShells ?? player.wallet.copperCoins ?? 0}🐚</span>
              </div>

              <div className="text-purple-300 font-bold border-l border-zinc-700/80 pl-1.5 font-mono">
                {player.wallet.mutyaShards ?? player.wallet.prismaticShards ?? 0}🔮
              </div>

              <div className="border-l border-zinc-700/80 pl-1.5 flex items-center gap-1.5">
                <BgmControl />
                {onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    title="System Settings & Cloud Saves"
                    className="px-1.5 py-0.5 rounded-lg border border-zinc-700 hover:border-amber-500/60 bg-zinc-800 text-zinc-300 hover:text-amber-300 text-[10px] transition-colors cursor-pointer"
                  >
                    ⚙️
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* STANDARD PERSISTENT HUD OUT OF COMBAT */
        <div
          data-tutorial-target="persistent-hud"
          className="bg-[#07090e]/95 backdrop-blur-md border-b border-amber-500/25 text-amber-100 px-2 py-1 md:px-3 md:py-1.5 shadow-2xl font-mono text-[10px] md:text-xs select-none"
        >
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-1 md:gap-2">
            {/* Top Line: Hero Level & Class & Name */}
            <div className="flex items-center space-x-2 md:space-x-3 w-full md:w-auto justify-between">
              <div className="flex items-center space-x-1.5 md:space-x-2">
                <span className="bg-amber-950/80 text-amber-300 border border-amber-500/40 font-bold px-2 py-0.5 rounded-lg text-[9.5px] md:text-[10.5px]">
                  LVL {player.level} {player.heroClass || 'Wayfarer'}
                </span>
                <span className="font-bold text-white tracking-wide truncate max-w-[100px] md:max-w-none text-[11px] md:text-xs font-serif">
                  {player.name}
                </span>
                {(player.availableAP ?? 0) > 0 && (
                  <span className="bg-amber-500 text-zinc-950 font-bold px-1.5 py-0.2 rounded-full text-[8.5px] animate-pulse shrink-0">
                    +{player.availableAP} AP
                  </span>
                )}
                {(player.skillPoints ?? 0) > 0 && (
                  <span className="bg-amber-500 text-zinc-950 font-bold px-1.5 py-0.2 rounded-full text-[8.5px] animate-pulse shrink-0">
                    +{player.skillPoints} SP
                  </span>
                )}
              </div>

              <div className="md:hidden text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                ⚡ {currentStamina}/{maxStamina} Stamina
              </div>
            </div>

            {/* Meters: HP & MP */}
            <div className="grid grid-cols-2 md:flex items-center gap-1.5 md:gap-4 w-full md:w-auto">
              {/* HP Bar */}
              <div className="flex items-center space-x-1.5 bg-[#0c0f16]/90 px-1.5 py-0.5 md:px-2 md:py-1 rounded-xl border border-red-900/40 flex-1 md:w-48 shadow-inner">
                <span className="text-red-400 font-bold text-[9px] md:text-[10px] shrink-0">HP</span>
                <div className="w-full h-2 md:h-2.5 bg-black/60 rounded-full overflow-hidden border border-red-900/50">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-300 rounded-full"
                    style={{ width: `${hpPercent}%` }}
                  />
                </div>
                <span className="text-[9px] md:text-[10px] text-zinc-300 shrink-0 font-mono">
                  {player.currentHp}/{derived.maxHp}
                </span>
              </div>

              {/* MP Bar */}
              <div className="flex items-center space-x-1.5 bg-[#0c0f16]/90 px-1.5 py-0.5 md:px-2 md:py-1 rounded-xl border border-sky-900/40 flex-1 md:w-40 shadow-inner">
                <span className="text-sky-400 font-bold text-[9px] md:text-[10px] shrink-0">MP</span>
                <div className="w-full h-2 md:h-2.5 bg-black/60 rounded-full overflow-hidden border border-sky-900/50">
                  <div
                    className="h-full bg-gradient-to-r from-sky-600 to-cyan-400 transition-all duration-300 rounded-full"
                    style={{ width: `${mpPercent}%` }}
                  />
                </div>
                <span className="text-[9px] md:text-[10px] text-zinc-300 shrink-0 font-mono">
                  {player.currentMp}/{derived.maxMp}
                </span>
              </div>
            </div>

            {/* Wallet & Stamina Summary */}
            <div className="flex items-center space-x-2 md:space-x-3 text-[9.5px] md:text-[11px] bg-[#0c0f16]/90 px-2 py-0.5 md:px-3 md:py-1 rounded-xl border border-zinc-800 w-full md:w-auto justify-between md:justify-end shadow-inner">
              {/* Pre-Colonial Currency Tiers */}
              <div className="flex items-center space-x-1.5 md:space-x-2 font-bold font-mono">
                <span className="text-amber-300 font-semibold">{player.wallet.goldIngots ?? player.wallet.goldSovereigns ?? 0}🪙</span>
                <span className="text-zinc-300 font-semibold">{player.wallet.silverPieces ?? player.wallet.silverShillings ?? 0}🔘</span>
                <span className="text-amber-500 font-semibold">{player.wallet.cowrieShells ?? player.wallet.copperCoins ?? 0}🐚</span>
              </div>

              <div className="text-purple-300 font-bold border-l border-zinc-700/80 pl-1.5 md:pl-2 font-mono">
                {player.wallet.mutyaShards ?? player.wallet.prismaticShards ?? 0}🔮
              </div>

              <div className="hidden md:flex items-center space-x-1 text-emerald-400 font-bold border-l border-zinc-700/80 pl-2">
                ⚡ {currentStamina}/{maxStamina} Stamina
              </div>

              <div className="border-l border-zinc-700/80 pl-1.5 md:pl-2 flex items-center gap-1.5">
                <BgmControl />
                {onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    title="System Settings & Cloud Saves"
                    className="px-1.5 py-0.5 rounded-lg border border-zinc-700 hover:border-amber-500/60 bg-zinc-800 text-zinc-300 hover:text-amber-300 text-[10px] md:text-xs transition-colors cursor-pointer"
                  >
                    ⚙️
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PersistentHUD;

