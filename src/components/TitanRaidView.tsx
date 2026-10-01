import React, { useState, useEffect } from 'react';
import { PlayerCharacter, EquipmentItem, EncryptedMemory } from '../types/game';
import { calcDerivedStats, isRaidWindowActive, getRaidWindowStatusText, formatCowriesShort, totalCowriesFromWallet, cowriesToWallet } from '../utils/gameFormulas';
import { generateBossLootArtifact } from '../utils/equipmentGenerator';
import { soundFX } from '../utils/audio';
import {
  fetchGlobalRaidEvent,
  submitGlobalRaidDamage,
  fetchGlobalRaidLeaderboard,
  GlobalRaidContribution,
} from '../utils/supabase';

interface TitanRaidViewProps {
  player: PlayerCharacter;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onNavigateToHaven: () => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error', icon?: string) => void;
  onLaunchRaidBattle?: (currentBakunawaHp: number) => void;
}

export const TitanRaidView: React.FC<TitanRaidViewProps> = ({
  player,
  onUpdatePlayer,
  onNavigateToHaven,
  onShowToast,
  onLaunchRaidBattle,
}) => {
  const MAX_GLOBAL_HP = 50000000; // 50,000,000 HP for Bakunawa
  const MAX_DAILY_ATTEMPTS = 3;

  const todayStr = new Date().toISOString().split('T')[0];
  const currentDailyAttempts = player.lastRaidAttemptDate === todayStr ? player.dailyRaidAttemptsCount || 0 : 0;
  const remainingAttempts = Math.max(0, MAX_DAILY_ATTEMPTS - currentDailyAttempts);

  const [globalBakunawaHp, setGlobalBakunawaHp] = useState<number>(38450000);
  const [isTelegraphedEclipseRoar, setIsTelegraphedEclipseRoar] = useState<boolean>(true);
  const [leaderboard, setLeaderboard] = useState<GlobalRaidContribution[]>([]);
  const [isRaidActive, setIsRaidActive] = useState<boolean>(() => isRaidWindowActive());
  const [raidStatusText, setRaidStatusText] = useState<string>(() => getRaidWindowStatusText().label);

  const [raidLog, setRaidLog] = useState<string[]>([
    '🌕 CELESTIAL RAID EVENT: Bakunawa, The Moon-Devouring Serpent has coiled around the sky!',
    '⚠️ TELEGRAPHED WARNING: Bakunawa opens its abyssal jaws! Channel Shaman Tidal Shield before striking!',
  ]);

  const derived = calcDerivedStats(player.attributes, player.level, player.equipment);

  // Sync PST window and Supabase Global Raid Event Data on mount & timer
  useEffect(() => {
    let isMounted = true;

    const syncRaidData = async () => {
      const windowInfo = getRaidWindowStatusText();
      if (isMounted) {
        setIsRaidActive(windowInfo.active);
        setRaidStatusText(windowInfo.label);
      }

      const remoteRaid = await fetchGlobalRaidEvent('bakunawa_eclipse_raid');
      if (remoteRaid && isMounted) {
        setGlobalBakunawaHp(remoteRaid.current_hp);
      }

      const remoteLeaders = await fetchGlobalRaidLeaderboard('bakunawa_eclipse_raid');
      if (remoteLeaders && isMounted && remoteLeaders.length > 0) {
        setLeaderboard(remoteLeaders);
      }
    };

    syncRaidData();
    const interval = setInterval(syncRaidData, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const addRaidLog = (text: string) => {
    setRaidLog((prev) => [text, ...prev.slice(0, 19)]);
  };

  /** Validates PST window and 3x daily attempt limit before carrying out raid actions */
  const validateAttemptAndConsume = (): boolean => {
    if (!isRaidActive) {
      onShowToast?.(
        'Celestial Raid is currently locked! Open windows are 7:00–9:00 AM & PM PST.',
        'warning',
        '🔒'
      );
      return false;
    }

    if (remainingAttempts <= 0) {
      onShowToast?.(
        'Daily challenge limit reached (3/3 attempts)! Return tomorrow during the PST raid window.',
        'error',
        '⏳'
      );
      return false;
    }

    // Record attempt if starting first action of attempt
    const newCount = currentDailyAttempts + 1;
    onUpdatePlayer({
      ...player,
      dailyRaidAttemptsCount: newCount,
      lastRaidAttemptDate: todayStr,
    });
    return true;
  };

  // RAID ACTION 1: Kampilan Sundering Strike
  const handleStrikeSerpent = async () => {
    soundFX.playAttackSound();

    let strikeDmg = Math.floor(450 + derived.meleeDamage * 3.5 + derived.rangedDamage * 2.8 + derived.magicDamage * 2.0);
    if (isTelegraphedEclipseRoar) {
      const shockwaveDmg = Math.floor(derived.maxHp * 0.35);
      const newPlayerHp = Math.max(0, player.currentHp - shockwaveDmg);
      addRaidLog(`💥 ECLIPSE ROAR DEVASTATION! Took ${shockwaveDmg} damage for striking without Shaman Shield!`);

      onUpdatePlayer({
        ...player,
        currentHp: newPlayerHp,
      });
    }

    const newSerpentHp = Math.max(0, globalBakunawaHp - strikeDmg);
    setGlobalBakunawaHp(newSerpentHp);
    addRaidLog(`⚔️ Kampilan Sundering Strike hit Bakunawa for ${strikeDmg.toLocaleString()} damage!`);

    // Submit damage to Supabase global database RPC
    const remoteResult = await submitGlobalRaidDamage('bakunawa_eclipse_raid', player.name, strikeDmg);
    if (remoteResult) {
      setGlobalBakunawaHp(remoteResult.current_hp);
    }

    // Award level-scaled currency loot & Mutya Shards for contributing
    const rewardCC = Math.floor(150 + player.level * 25);
    const newWalletCC = totalCowriesFromWallet(player.wallet) + rewardCC;
    const newWallet = cowriesToWallet(newWalletCC, (player.wallet.mutyaShards || 0) + 1);

    onUpdatePlayer({
      ...player,
      wallet: newWallet,
    });
    onShowToast?.(`Dealt ${strikeDmg.toLocaleString()} Raid Damage! Gained +${rewardCC} Cowries & +1 Mutya Shard!`, 'success', '🗡️');

    setIsTelegraphedEclipseRoar(Math.random() < 0.45);
  };

  // RAID ACTION 2: Shaman Tidal Shield
  const handleDefendEclipseRoar = () => {
    soundFX.playPotionSound();
    setIsTelegraphedEclipseRoar(false);
    addRaidLog(`🛡️ Invoked Babaylan Shaman Shield! Perfectly nullified Bakunawa's Eclipse Roar!`);
    onShowToast?.('Shaman Shield active! Eclipse Roar neutralized.', 'info', '🛡️');
  };

  // RAID ACTION 3: Rally Tribal Warriors & Aid Allies
  const handleRallyWarriors = () => {
    soundFX.playSpellSound();
    const costMp = 30;
    if (player.currentMp < costMp) {
      onShowToast?.('Not enough MP to rally warriors! Costs 30 MP.', 'warning', '⚡');
      return;
    }

    // Grant level-scaled Triumphant Loot Artifact drop on successful rally!
    const lootArtifact: EquipmentItem = generateBossLootArtifact('boss_act_8', player.level, player.heroClass);
    const redMemory: EncryptedMemory = {
      id: `mem_raid_${Date.now()}`,
      name: 'Red Encrypted Memory (Bakunawa Eclipse)',
      rarity: 'RED',
      minLevel: player.level,
      acquiredAtLocation: 'loc_act_8',
    };

    onUpdatePlayer({
      ...player,
      currentMp: player.currentMp - costMp,
      locationPoints: player.locationPoints + 100,
      inventory: [...player.inventory, lootArtifact],
      encryptedMemories: [...(player.encryptedMemories || []), redMemory],
    });

    addRaidLog(`✨ Rallied Maharlika Tribal Warriors! Earned +100 LP, Red Encrypted Memory & Triumphant ${lootArtifact.name}!`);
    onShowToast?.(`Rallied allies! Received Triumphant [${lootArtifact.name}] & Red Encrypted Memory!`, 'success', '🎁');
  };

  const serpentHpPercent = Math.max(0, Math.min(100, Math.floor((globalBakunawaHp / MAX_GLOBAL_HP) * 100)));

  return (
    <div className="flex flex-col h-full bg-transparent text-amber-100 p-3 md:p-6 space-y-4 overflow-y-auto">
      {/* World Boss Banner (Glassmorphic Container) */}
      <div className="bg-zinc-950/80 backdrop-blur-md border border-purple-900/60 rounded-xl p-4 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold">
              GLOBAL CELESTIAL RAID EVENT • LEVEL 55 MYTHIC SERPENT
            </span>
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${isRaidActive ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' : 'bg-red-950 text-red-300 border border-red-500/50'}`}>
              {isRaidActive ? '🟢 OPEN (7-9 AM/PM PST)' : '🔴 LOCKED'}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-amber-200 mt-1">Bakunawa: The Great Moon Serpent</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Sever the celestial coils of the moon-devourer to protect the seven moons and claim Red Encrypted Memories!
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right font-mono text-xs bg-zinc-900/90 border border-purple-800/50 px-3 py-1.5 rounded-lg">
            <div className="text-[9px] text-zinc-400 uppercase">Daily Challenges</div>
            <div className={`font-bold ${remainingAttempts > 0 ? 'text-amber-300' : 'text-red-400'}`}>
              {currentDailyAttempts} / {MAX_DAILY_ATTEMPTS} Used ({remainingAttempts} Left)
            </div>
          </div>
          <button
            onClick={onNavigateToHaven}
            className="bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-mono text-xs font-bold px-3 py-2 rounded-lg transition-all"
          >
            Retreat to Sanctuary
          </button>
        </div>
      </div>

      {/* PST Raid Window Banner Alert */}
      {!isRaidActive && (
        <div className="bg-red-950/80 backdrop-blur-md border border-red-700/60 text-red-200 p-3 rounded-xl flex items-center space-x-3 shadow-lg">
          <span className="text-2xl">🔒</span>
          <div className="text-xs font-mono">
            <strong className="text-red-300 uppercase block">Raid Window Locked</strong>
            {raidStatusText}. Global raid battles are only active twice daily during peak celestial alignment.
          </div>
        </div>
      )}

      {/* Global Titan HP Pool Meter */}
      <div className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800 p-4 rounded-xl space-y-2 shadow-inner">
        <div className="flex justify-between text-xs font-mono font-bold">
          <span className="text-purple-400">POOLED GLOBAL BAKUNAWA HEALTH</span>
          <span>{globalBakunawaHp.toLocaleString()} / {MAX_GLOBAL_HP.toLocaleString()} HP ({serpentHpPercent}%)</span>
        </div>
        <div className="w-full h-4 bg-zinc-950 rounded-full border border-purple-900/60 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-700 via-amber-600 to-yellow-500 transition-all duration-300"
            style={{ width: `${serpentHpPercent}%` }}
          />
        </div>
      </div>

      {/* Telegraphed Warning Alert */}
      {isTelegraphedEclipseRoar && isRaidActive && (
        <div className="bg-purple-950/80 backdrop-blur-md border-2 border-purple-600 text-purple-100 p-3 rounded-xl flex items-center space-x-3 shadow-lg animate-pulse">
          <span className="text-2xl">⚠️</span>
          <div className="text-xs font-mono">
            <strong className="text-purple-300 uppercase block">Telegraphed Eclipse Roar Warning!</strong>
            Bakunawa is channeling Total Lunar Eclipse! Tap <strong>[ Shaman Tidal Shield ]</strong> before striking!
          </div>
        </div>
      )}

      {/* Grid Layout: Raid Event Feed (Left) & Global Leaderboard (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-xl p-3 h-56 overflow-y-auto font-mono text-xs space-y-1 shadow-inner">
          <div className="text-[10px] text-zinc-500 uppercase border-b border-zinc-800 pb-1 mb-1 font-bold">
            GLOBAL RAID BATTLE LOG FEED
          </div>
          {raidLog.map((log, idx) => (
            <div key={idx} className="p-1 rounded bg-zinc-900/60 text-zinc-200">
              {log}
            </div>
          ))}
        </div>

        {/* Global Leaderboard Panel */}
        <div className="bg-zinc-950/80 backdrop-blur-md border border-amber-900/40 rounded-xl p-3 h-56 overflow-y-auto font-mono text-xs space-y-1 shadow-inner">
          <div className="text-[10px] text-amber-400 uppercase border-b border-zinc-800 pb-1 mb-1 font-bold flex justify-between">
            <span>🏆 TOP RAID CHAMPIONS</span>
            <span className="text-zinc-500">DAMAGE</span>
          </div>
          {leaderboard.length > 0 ? (
            leaderboard.map((entry, idx) => (
              <div key={idx} className="flex justify-between items-center p-1 rounded bg-zinc-900/40 text-zinc-300">
                <span className="truncate pr-2 font-semibold">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`} {entry.player_name}
                </span>
                <span className="text-amber-400 font-bold">{entry.damage_dealt.toLocaleString()}</span>
              </div>
            ))
          ) : (
            <div className="text-zinc-500 text-[11px] p-2 text-center italic">
              Be the first Maharlika champion to strike Bakunawa and claim top rank!
            </div>
          )}
        </div>
      </div>

      {/* [BOTTOM] TITAN RAID DISPATCH ACTION PAD */}
      <div className="bg-zinc-950/80 backdrop-blur-md border border-amber-900/60 p-4 rounded-xl shadow-2xl space-y-3">
        <div className="text-[10px] font-mono text-purple-400 uppercase font-semibold text-center md:text-left flex justify-between items-center">
          <span>CELESTIAL RAID DISPATCH PAD</span>
          <span className="text-zinc-400 font-normal">Daily Challenges: <strong className="text-amber-300">{currentDailyAttempts}/3 Used ({remainingAttempts} Left)</strong></span>
        </div>

        {/* PRIMARY ACTION: Full Turn-Based Battle Engine Launch */}
        <button
          onClick={() => {
            if (validateAttemptAndConsume()) {
              onLaunchRaidBattle?.(globalBakunawaHp);
            }
          }}
          disabled={!isRaidActive || remainingAttempts <= 0}
          className="w-full p-4 bg-gradient-to-r from-purple-900 via-red-900 to-amber-700 hover:from-purple-800 hover:to-amber-600 disabled:opacity-50 border-2 border-amber-500/80 text-amber-100 rounded-xl uppercase tracking-wider font-mono text-xs md:text-sm font-bold shadow-2xl transition-all active:scale-98 flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-3"
        >
          <div className="flex items-center space-x-2">
            <span className="text-xl">🐉</span>
            <span>[ CHALLENGE BAKUNAWA (ATTEMPT {currentDailyAttempts + 1}/3) ]</span>
          </div>
          <span className="text-[10px] text-amber-300 font-normal font-mono">
            (Uses actual Weapon Attacks, Mutya Skills, Potions, Guard &amp; Flee)
          </span>
        </button>
      </div>
    </div>
  );
};

