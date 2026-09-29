import React, { useState } from 'react';
import { PlayerCharacter } from '../types/game';
import { calcDerivedStats } from '../utils/gameFormulas';
import { soundFX } from '../utils/audio';

interface TitanRaidViewProps {
  player: PlayerCharacter;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onNavigateToHaven: () => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error', icon?: string) => void;
}

export const TitanRaidView: React.FC<TitanRaidViewProps> = ({ player, onUpdatePlayer, onNavigateToHaven, onShowToast }) => {
  const [globalBakunawaHp, setGlobalBakunawaHp] = useState<number>(38450);
  const maxGlobalHp = 50000;
  const [isTelegraphedEclipseRoar, setIsTelegraphedEclipseRoar] = useState<boolean>(true);
  const [raidLog, setRaidLog] = useState<string[]>([
    '🌕 CELESTIAL RAID ACTIVE: Bakunawa, The Moon-Devouring Serpent has coiled around the sky!',
    '⚠️ TELEGRAPHED WARNING: Bakunawa opens its abyssal jaws! Brace for Total Eclipse Roar!',
  ]);

  const derived = calcDerivedStats(player.attributes, player.level, player.equipment);

  const addRaidLog = (text: string) => {
    setRaidLog((prev) => [text, ...prev.slice(0, 19)]);
  };

  // RAID ACTION 1: Kampilan Sundering Strike
  const handleStrikeSerpent = () => {
    soundFX.playAttackSound();

    let strikeDmg = Math.floor(55 + derived.meleeDamage * 1.6 + derived.rangedDamage * 1.3);
    if (isTelegraphedEclipseRoar) {
      // Striking during eclipse roar without shielding takes severe damage!
      const shockwaveDmg = 85;
      const newPlayerHp = Math.max(0, player.currentHp - shockwaveDmg);
      addRaidLog(`💥 ECLIPSE ROAR DEVASTATION! Took ${shockwaveDmg} damage for failing to invoke Shaman Shield!`);

      onUpdatePlayer({
        ...player,
        currentHp: newPlayerHp,
      });
    }

    const newSerpentHp = Math.max(0, globalBakunawaHp - strikeDmg);
    setGlobalBakunawaHp(newSerpentHp);
    addRaidLog(`⚔️ Kampilan Cleave struck Bakunawa for ${strikeDmg} damage! Global Serpent HP: ${newSerpentHp}/${maxGlobalHp}`);

    // Toggle shockwave status randomly
    setIsTelegraphedEclipseRoar(Math.random() < 0.45);
  };

  // RAID ACTION 2: Shaman Tidal Shield
  const handleDefendEclipseRoar = () => {
    soundFX.playPotionSound();
    setIsTelegraphedEclipseRoar(false);
    addRaidLog(`🛡️ Invoked Babaylan Shaman Shield! Absorbed Bakunawa's Eclipse Roar with 0 damage taken.`);
  };

  // RAID ACTION 3: Rally Tribal Warriors & Aid Allies
  const handleRallyWarriors = () => {
    soundFX.playSpellSound();
    const healMp = 20;
    if (player.currentMp < healMp) {
      onShowToast?.('Not enough MP to rally warriors! Costs 20 MP.', 'warning', '⚡');
      return;
    }

    onUpdatePlayer({
      ...player,
      currentMp: player.currentMp - healMp,
      locationPoints: player.locationPoints + 25,
      wallet: {
        ...player.wallet,
        mutyaShards: (player.wallet.mutyaShards || 0) + 1,
        prismaticShards: (player.wallet.mutyaShards || 0) + 1,
      },
    });

    addRaidLog(`✨ Rallied Maharlika Tribal Warriors! Granted team defense & earned +1 Mutya Shard & +25 LP.`);
  };

  const serpentHpPercent = Math.max(0, Math.min(100, Math.floor((globalBakunawaHp / maxGlobalHp) * 100)));

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-amber-100 p-3 md:p-6 space-y-4 overflow-y-auto">
      {/* World Boss Banner */}
      <div className="bg-zinc-900/90 border border-purple-900/60 rounded-xl p-4 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold">
            GLOBAL CELESTIAL RAID EVENT • LEVEL 55 MYTHIC SERPENT
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-amber-200">Bakunawa: The Great Moon Serpent</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Sever the celestial coils of the moon-devourer to protect the seven moons and claim Triumphant Red Memories!</p>
        </div>

        <button
          onClick={onNavigateToHaven}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs font-bold px-3 py-1.5 rounded"
        >
          Retreat to Sanctuary
        </button>
      </div>

      {/* Global Titan HP Pool Meter */}
      <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl space-y-2 shadow-inner">
        <div className="flex justify-between text-xs font-mono font-bold">
          <span className="text-purple-400">POOLED GLOBAL BAKUNAWA HEALTH</span>
          <span>{globalBakunawaHp} / {maxGlobalHp} HP ({serpentHpPercent}%)</span>
        </div>
        <div className="w-full h-4 bg-zinc-950 rounded-full border border-purple-900/60 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-700 via-amber-600 to-yellow-500 transition-all duration-300"
            style={{ width: `${serpentHpPercent}%` }}
          />
        </div>
      </div>

      {/* Telegraphed Warning Alert */}
      {isTelegraphedEclipseRoar && (
        <div className="bg-purple-950/90 border-2 border-purple-600 text-purple-100 p-3 rounded-xl flex items-center space-x-3 shadow-lg animate-pulse">
          <span className="text-2xl">⚠️</span>
          <div className="text-xs font-mono">
            <strong className="text-purple-300 uppercase block">Telegraphed Eclipse Roar Warning!</strong>
            Bakunawa is channeling Total Lunar Eclipse! Tap <strong>[ Shaman Tidal Shield ]</strong> before striking!
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
        <div className="text-[10px] font-mono text-purple-400 uppercase font-semibold mb-1.5 text-center md:text-left">
          BAKUNAWA CELESTIAL RAID ACTION PAD
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-xs font-bold">
          <button
            onClick={handleStrikeSerpent}
            className="p-3 bg-red-900 hover:bg-red-800 border border-red-500/50 text-red-100 rounded-lg uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <span>🗡️</span>
            <span>[ Kampilan Strike ]</span>
          </button>

          <button
            onClick={handleDefendEclipseRoar}
            className="p-3 bg-amber-600 hover:bg-amber-500 text-zinc-950 rounded-lg uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <span>🛡️</span>
            <span>[ Shaman Tidal Shield ]</span>
          </button>

          <button
            onClick={handleRallyWarriors}
            className="p-3 bg-purple-900 hover:bg-purple-800 border border-purple-500/50 text-purple-100 rounded-lg uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <span>✨</span>
            <span>[ Rally Warriors ] (20 MP)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
