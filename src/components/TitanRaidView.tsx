import React, { useState } from 'react';
import { PlayerCharacter } from '../types/game';
import { calcDerivedStats } from '../utils/gameFormulas';
import { soundFX } from '../utils/audio';

interface TitanRaidViewProps {
  player: PlayerCharacter;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onNavigateToHaven: () => void;
}

export const TitanRaidView: React.FC<TitanRaidViewProps> = ({ player, onUpdatePlayer, onNavigateToHaven }) => {
  const [globalTitanHp, setGlobalTitanHp] = useState<number>(38450);
  const maxGlobalHp = 50000;
  const [isTelegraphedShockwave, setIsTelegraphedShockwave] = useState<boolean>(true);
  const [raidLog, setRaidLog] = useState<string[]>([
    '🔥 WORLD TITAN RAID ACTIVE: Gorgoroth, the Earth-Breaker has manifested!',
    '⚠️ TELEGRAPHED WARNING: Gorgoroth raises continental fists! Brace for Tremor Shockwave!',
  ]);

  const derived = calcDerivedStats(player.attributes, player.level, player.equipment);

  const addRaidLog = (text: string) => {
    setRaidLog((prev) => [text, ...prev.slice(0, 19)]);
  };

  // RAID ACTION 1: Strike Colossus
  const handleStrikeColossus = () => {
    soundFX.playAttackSound();

    let strikeDmg = Math.floor(45 + derived.meleeDamage * 1.5 + derived.rangedDamage * 1.2);
    if (isTelegraphedShockwave) {
      // Striking during shockwave telegraph takes severe damage!
      const shockwaveDmg = 85;
      const newPlayerHp = Math.max(0, player.currentHp - shockwaveDmg);
      addRaidLog(`💥 TREMOR SHOCKWAVE HIT YOU! Took ${shockwaveDmg} damage for failing to defend!`);

      onUpdatePlayer({
        ...player,
        currentHp: newPlayerHp,
      });
    }

    const newTitanHp = Math.max(0, globalTitanHp - strikeDmg);
    setGlobalTitanHp(newTitanHp);
    addRaidLog(`⚔️ You struck Gorgoroth for ${strikeDmg} damage! Global Raid HP: ${newTitanHp}/${maxGlobalHp}`);

    // Toggle shockwave status randomly
    setIsTelegraphedShockwave(Math.random() < 0.4);
  };

  // RAID ACTION 2: Defend Shockwave
  const handleDefendShockwave = () => {
    soundFX.playPotionSound();
    setIsTelegraphedShockwave(false);
    addRaidLog(`🛡️ Raised Kinetic Barrier! Absorbed Gorgoroth's Tremor Shockwave with 0 damage taken.`);
  };

  // RAID ACTION 3: Aid Fallen Ally
  const handleAidFallenAlly = () => {
    soundFX.playSpellSound();
    const healMp = 20;
    if (player.currentMp < healMp) {
      alert('Not enough MP to aid ally! Costs 20 MP.');
      return;
    }

    onUpdatePlayer({
      ...player,
      currentMp: player.currentMp - healMp,
      locationPoints: player.locationPoints + 25,
      wallet: {
        ...player.wallet,
        prismaticShards: player.wallet.prismaticShards + 1,
      },
    });

    addRaidLog(`✨ Aided a fallen Wayfarer! Granted team shield & earned +1 Prismatic Shard & +25 LP.`);
  };

  const titanHpPercent = Math.max(0, Math.min(100, Math.floor((globalTitanHp / maxGlobalHp) * 100)));

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-amber-100 p-3 md:p-6 space-y-4 overflow-y-auto">
      {/* World Boss Banner */}
      <div className="bg-zinc-900/90 border border-red-900/60 rounded-xl p-4 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="text-[10px] font-mono text-red-500 uppercase tracking-widest font-bold">
            GLOBAL TITAN RAID EVENT • LEVEL 50 PRIME COLOSSUS
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-red-300">Gorgoroth, the Earth-Breaker</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Pooled Server Health Bar. Sunder structural limbs to claim Triumphant Red Memories!</p>
        </div>

        <button
          onClick={onNavigateToHaven}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs font-bold px-3 py-1.5 rounded"
        >
          Retreat to Haven
        </button>
      </div>

      {/* Global Titan HP Pool Meter */}
      <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl space-y-2 shadow-inner">
        <div className="flex justify-between text-xs font-mono font-bold">
          <span className="text-red-400">POOLED GLOBAL SERVER HEALTH</span>
          <span>{globalTitanHp} / {maxGlobalHp} HP ({titanHpPercent}%)</span>
        </div>
        <div className="w-full h-4 bg-zinc-950 rounded-full border border-red-900/60 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-700 via-amber-600 to-yellow-500 transition-all duration-300"
            style={{ width: `${titanHpPercent}%` }}
          />
        </div>
      </div>

      {/* Telegraphed Warning Alert */}
      {isTelegraphedShockwave && (
        <div className="bg-red-950/90 border-2 border-red-600 text-red-100 p-3 rounded-xl flex items-center space-x-3 shadow-lg animate-pulse">
          <span className="text-2xl">⚠️</span>
          <div className="text-xs font-mono">
            <strong className="text-red-300 uppercase block">Telegraphed High-Damage Shockwave Warning!</strong>
            Gorgoroth is channeling Continental Tremor! Tap <strong>[ Defend Shockwave ]</strong> before striking!
          </div>
        </div>
      )}

      {/* Raid Event Feed */}
      <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-3 h-48 overflow-y-auto font-mono text-xs space-y-1 shadow-inner">
        <div className="text-[10px] text-zinc-500 uppercase border-b border-zinc-800 pb-1 mb-1">GLOBAL RAID LOG FEED</div>
        {raidLog.map((log, idx) => (
          <div key={idx} className="p-1 rounded bg-zinc-900/60 text-zinc-200">
            {log}
          </div>
        ))}
      </div>

      {/* [BOTTOM] TITAN RAID CONTEXTUAL ACTION PAD */}
      <div className="bg-zinc-950 border border-amber-900/60 p-2 md:p-3 rounded-xl shadow-2xl">
        <div className="text-[10px] font-mono text-red-500 uppercase font-semibold mb-1.5 text-center md:text-left">
          TITAN RAID CONTEXTUAL ACTION PAD
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-xs font-bold">
          <button
            onClick={handleStrikeColossus}
            className="p-3 bg-red-900 hover:bg-red-800 border border-red-500/50 text-red-100 rounded-lg uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <span>⚔️</span>
            <span>[ Strike Colossus ]</span>
          </button>

          <button
            onClick={handleDefendShockwave}
            className="p-3 bg-amber-600 hover:bg-amber-500 text-zinc-950 rounded-lg uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <span>🛡️</span>
            <span>[ Defend Shockwave ]</span>
          </button>

          <button
            onClick={handleAidFallenAlly}
            className="p-3 bg-sky-900 hover:bg-sky-800 border border-sky-500/50 text-sky-100 rounded-lg uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <span>✨</span>
            <span>[ Aid Fallen Ally ] (20 MP)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
