import React, { useState, useEffect } from 'react';
import { PlayerCharacter, EncryptedMemory } from '../types/game';
import {
  calcDerivedStats,
  getRaidSurgeStatus,
  getCurrentRaidDayKey,
  totalCowriesFromWallet,
  cowriesToWallet,
  processExpGain,
} from '../utils/gameFormulas';
import {
  fetchGlobalRaidEvent,
  fetchGlobalRaidLeaderboard,
  recordPlayerActivity,
  checkWeeklyJackpotClaimed,
  claimWeeklyJackpot,
  GlobalRaidContribution,
} from '../utils/supabase';
import { RaidSurgeRewardModal } from './RaidSurgeRewardModal';
import { RaidJackpotModal } from './RaidJackpotModal';
import { RaidBattleArena, RaidAttemptResult } from './RaidBattleArena';

interface TitanRaidViewProps {
  player: PlayerCharacter;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onNavigateToHaven: () => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error', icon?: string) => void;
  onLaunchRaidBattle?: (currentBakunawaHp: number, maxBakunawaHp?: number) => void;
  onRaidBattleStateChange?: (inBattle: boolean) => void;
}

export const TitanRaidView: React.FC<TitanRaidViewProps> = ({
  player,
  onUpdatePlayer,
  onNavigateToHaven,
  onShowToast,
  onRaidBattleStateChange,
}) => {
  const [maxGlobalHp, setMaxGlobalHp] = useState<number>(1500000);
  const [globalBakunawaHp, setGlobalBakunawaHp] = useState<number>(1500000);
  const [activeWayfarersCount, setActiveWayfarersCount] = useState<number>(0);
  const [rallyModifier, setRallyModifier] = useState<number>(1.0);
  const [cycleNumber, setCycleNumber] = useState<number>(1);
  const [raidStatus, setRaidStatus] = useState<'ACTIVE' | 'DEFEATED'>('ACTIVE');
  const [isInRaidBattle, setIsInRaidBattle] = useState<boolean>(false);

  const MAX_DAILY_ATTEMPTS = 6;
  const currentDayKey = getCurrentRaidDayKey();
  const currentDailyAttempts = player.lastRaidAttemptDate === currentDayKey ? player.dailyRaidAttemptsCount || 0 : 0;
  const remainingAttempts = Math.max(0, MAX_DAILY_ATTEMPTS - currentDailyAttempts);

  const [leaderboard, setLeaderboard] = useState<GlobalRaidContribution[]>([]);

  // Surge and Jackpot Modals
  const [showSurgeModal, setShowSurgeModal] = useState<boolean>(false);
  const [surgeModalData, setSurgeModalData] = useState<{
    damageDealt: number;
    cowriesEarned: number;
    silverEarned: number;
    mutyaEarned: number;
    expEarned: number;
    memoryDropped?: EncryptedMemory | null;
  } | null>(null);

  const [showJackpotModal, setShowJackpotModal] = useState<boolean>(false);
  const [hasClaimedJackpot, setHasClaimedJackpot] = useState<boolean>(false);
  const [isClaimingJackpot, setIsClaimingJackpot] = useState<boolean>(false);

  const [surgeStatus, setSurgeStatus] = useState(() => getRaidSurgeStatus());

  const [raidLog, setRaidLog] = useState<string[]>([
    '🌕 CELESTIAL RAID EVENT: Bakunawa, The Moon-Devouring Serpent has coiled around the sky!',
    '⚡ 24/7 Celestial Siege active! 7:00-9:00 AM & PM PST grant empowered Rush-Hour Surge rewards (+20% DMG, Silver & Memories)!',
    '🛡️ 6 Daily Tactical Challenges permitted per Wayfarer. Coordinate with your fellow slayers!',
  ]);

  const serpentHpPercent = maxGlobalHp > 0 ? Math.max(0, Math.min(100, Math.round((globalBakunawaHp / maxGlobalHp) * 100))) : 0;
  const rallyPct = Math.round((rallyModifier - 1.0) * 100);

  // Sync Supabase Global Raid Event Data and Surge timer
  const syncRaidData = async () => {
    setSurgeStatus(getRaidSurgeStatus());

    const remoteRaid = await fetchGlobalRaidEvent('bakunawa_eclipse_raid');
    if (remoteRaid) {
      setGlobalBakunawaHp(remoteRaid.current_hp);
      if (remoteRaid.max_hp) setMaxGlobalHp(remoteRaid.max_hp);
      if (remoteRaid.rally_modifier) setRallyModifier(remoteRaid.rally_modifier);
      if (remoteRaid.cycle_number) setCycleNumber(remoteRaid.cycle_number);
      if (remoteRaid.status) setRaidStatus(remoteRaid.status);
      if (typeof remoteRaid.active_players_count === 'number') {
        setActiveWayfarersCount(remoteRaid.active_players_count);
      }

      // If defeated, check if player has claimed this cycle's jackpot
      if (remoteRaid.status === 'DEFEATED' && remoteRaid.cycle_number) {
        const claimed = await checkWeeklyJackpotClaimed('bakunawa_eclipse_raid', remoteRaid.cycle_number, player.name);
        setHasClaimedJackpot(claimed);
      }
    }

    const remoteLeaders = await fetchGlobalRaidLeaderboard('bakunawa_eclipse_raid');
    if (remoteLeaders && remoteLeaders.length > 0) {
      setLeaderboard(remoteLeaders);
    }
  };

  useEffect(() => {
    let isMounted = true;
    recordPlayerActivity(player.name, player.level, 'RAID_VIEW');

    syncRaidData();
    const interval = setInterval(() => {
      if (isMounted) syncRaidData();
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [player.name, player.level]);

  const addRaidLog = (text: string) => {
    setRaidLog((prev) => [text, ...prev.slice(0, 19)]);
  };

  /** Validates daily 6x attempt limit before launching raid battle */
  const handleStartRaidBattle = () => {
    if (raidStatus === 'DEFEATED') {
      onShowToast?.('Bakunawa has already been banished for this weekly cycle! Claim your jackpot bounty!', 'success', '🏆');
      return;
    }

    if (remainingAttempts <= 0) {
      onShowToast?.(
        'Daily challenge limit reached (6/6 attempts used today)! Resets at 12:00 Midnight.',
        'error',
        '⏳'
      );
      return;
    }

    setIsInRaidBattle(true);
    onRaidBattleStateChange?.(true);
  };

  /** Callback when 10-turn raid attempt concludes */
  const handleFinishAttempt = (result: RaidAttemptResult) => {
    setIsInRaidBattle(false);
    onRaidBattleStateChange?.(false);

    // Consume 1 daily attempt count
    const newCount = currentDailyAttempts + 1;
    onUpdatePlayer({
      ...player,
      dailyRaidAttemptsCount: newCount,
      lastRaidAttemptDate: currentDayKey,
    });

    if (result.newGlobalHp !== undefined) {
      setGlobalBakunawaHp(result.newGlobalHp);
    }

    if (result.bossDefeated) {
      setRaidStatus('DEFEATED');
    }

    // Check for Encrypted Memory Roll on Surge attempts
    let droppedMemory: EncryptedMemory | null = null;
    if (result.isSurge && Math.random() < 0.25) {
      const rarities: ('WHITE' | 'GREEN' | 'BLUE')[] = ['WHITE', 'GREEN', 'BLUE'];
      const rolledRarity = rarities[Math.floor(Math.random() * rarities.length)];
      droppedMemory = {
        id: `mem_surge_${Date.now()}`,
        name: `Celestial Memory (${rolledRarity})`,
        rarity: rolledRarity,
        minLevel: Math.max(1, player.level - 5),
        acquiredAtLocation: 'loc_act_8',
      };
      onUpdatePlayer({
        ...player,
        dailyRaidAttemptsCount: newCount,
        lastRaidAttemptDate: currentDayKey,
        encryptedMemories: [...(player.encryptedMemories || []), droppedMemory],
      });
    }

    addRaidLog(
      `⚔️ Attempt #${newCount} Concluded: Inflicted ${result.damageDealt.toLocaleString()} DMG! Earned +${result.cowriesEarned} Shells, +${result.mutyaEarned} Mutya & +${result.expEarned} EXP!${
        result.isSurge ? ' (⚡ +20% Surge Boost)' : ''
      }`
    );

    if (result.isSurge) {
      setSurgeModalData({
        damageDealt: result.damageDealt,
        cowriesEarned: result.cowriesEarned,
        silverEarned: result.silverEarned,
        mutyaEarned: result.mutyaEarned,
        expEarned: result.expEarned,
        memoryDropped: droppedMemory,
      });
      setShowSurgeModal(true);
    } else {
      onShowToast?.(
        `Attempt Completed! Dealt ${result.damageDealt.toLocaleString()} Raid Damage! Gained +${result.cowriesEarned} Shells, +${result.mutyaEarned} Mutya & +${result.expEarned} EXP!`,
        'success',
        '🐉'
      );
    }

    // Refresh remote leaderboard
    syncRaidData();
  };

  // Weekly Jackpot Claim Handler
  const handleClaimWeeklyJackpot = async (): Promise<boolean> => {
    setIsClaimingJackpot(true);
    try {
      const claimResult = await claimWeeklyJackpot('bakunawa_eclipse_raid', player.name);
      if (!claimResult) {
        onShowToast?.('Failed to claim jackpot. Ensure you participated in this weekly cycle!', 'error');
        setIsClaimingJackpot(false);
        return false;
      }

      // Add Jackpot Rewards
      const totalJackpotCC = (claimResult.gold_ingots * 10000) + (claimResult.silver_pieces * 100) + claimResult.cowrie_shells;
      const newWalletCC = totalCowriesFromWallet(player.wallet) + totalJackpotCC;
      const newWallet = cowriesToWallet(newWalletCC, (player.wallet.mutyaShards || 0) + claimResult.mutya_shards);
      const expResult = processExpGain(player.level, player.exp, claimResult.exp_reward);

      const mythicRedMemory: EncryptedMemory = {
        id: `mem_jackpot_${Date.now()}`,
        name: 'Mythic Red Encrypted Memory (Bakunawa Vanquished)',
        rarity: 'RED',
        minLevel: 50,
        acquiredAtLocation: 'loc_act_8',
      };

      onUpdatePlayer({
        ...player,
        level: expResult.newLevel,
        exp: expResult.newExp,
        availableAP: player.availableAP + expResult.apGained,
        wallet: newWallet,
        encryptedMemories: [...(player.encryptedMemories || []), mythicRedMemory],
      });

      setHasClaimedJackpot(true);
      setIsClaimingJackpot(false);
      onShowToast?.('Claimed Weekly Victory Jackpot! +3 Gold, +40 Silver, +20 Mutya & Mythic RED Memory!', 'success', '🏆');
      return true;
    } catch {
      setIsClaimingJackpot(false);
      onShowToast?.('Error processing jackpot claim.', 'error');
      return false;
    }
  };

  // If in live raid combat, render dedicated RaidBattleArena
  if (isInRaidBattle) {
    return (
      <RaidBattleArena
        player={player}
        globalBakunawaHp={globalBakunawaHp}
        maxGlobalHp={maxGlobalHp}
        rallyModifier={rallyModifier}
        cycleNumber={cycleNumber}
        onUpdatePlayer={onUpdatePlayer}
        onFinishAttempt={handleFinishAttempt}
        onCancelAttempt={() => {
          setIsInRaidBattle(false);
          onRaidBattleStateChange?.(false);
        }}
        onShowToast={onShowToast}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-transparent text-amber-100 p-3 md:p-6 space-y-4 overflow-y-auto">
      {/* World Boss Header (Glassmorphic Container) */}
      <div className="bg-zinc-950/80 backdrop-blur-md border border-purple-900/60 rounded-xl p-4 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold">
              7-DAY WEEKLY CELESTIAL RAID • THE BLOOD MOON RISES ONCE AGAIN!
            </span>
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
              raidStatus === 'DEFEATED'
                ? 'bg-yellow-950 text-yellow-300 border border-yellow-500/50'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
            }`}>
              {raidStatus === 'DEFEATED' ? '🏆 BAKUNAWA BANISHED' : '🟢 24/7 OPEN'}
            </span>
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
              surgeStatus.isSurge 
                ? 'bg-purple-900 text-purple-200 border-purple-400 animate-pulse'
                : 'bg-zinc-900 text-zinc-400 border-zinc-700'
            }`}>
              {surgeStatus.badge}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-amber-200 mt-1">Bakunawa: The Great Moon Serpent</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Sever the coils of the celestial serpent to defend the seven moons and claim the Weekly Victory Jackpot!
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right font-mono text-xs bg-zinc-900/90 border border-purple-800/50 px-3 py-1.5 rounded-lg">
            <div className="text-[9px] text-zinc-400 uppercase">Daily Battles</div>
            <div className={`font-bold ${remainingAttempts > 0 ? 'text-amber-300' : 'text-red-400'}`}>
              {currentDailyAttempts} / {MAX_DAILY_ATTEMPTS} Used ({remainingAttempts} Left)
            </div>
          </div>
          <button
            onClick={() => {
              onRaidBattleStateChange?.(false);
              onNavigateToHaven();
            }}
            className="bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-mono text-xs font-bold px-3 py-2 rounded-lg transition-all"
          >
            Retreat to Sanctuary
          </button>
        </div>
      </div>

      {/* Server-Wide Rally Modifier Alert (If Community is Lagging) */}
      {rallyPct > 0 && raidStatus === 'ACTIVE' && (
        <div className="bg-gradient-to-r from-red-950/80 via-amber-950/80 to-purple-950/80 border border-amber-600/60 text-amber-200 p-3 rounded-xl flex items-center space-x-3 shadow-lg animate-pulse">
          <span className="text-2xl">🔥</span>
          <div className="text-xs font-mono">
            <strong className="text-amber-300 uppercase block">Community Ancestral Rally Active (+{rallyPct}% Damage)</strong>
            Tribal shamans chant war orations! All Wayfarer attacks inflict +{rallyPct}% boosted damage to turn the tide before the Monday eclipse!
          </div>
        </div>
      )}

      {/* Victory Celebration & Claim Banner */}
      {raidStatus === 'DEFEATED' && (
        <div className="bg-gradient-to-r from-yellow-950/90 via-amber-950/90 to-yellow-900/90 border-2 border-yellow-500 text-yellow-100 p-4 rounded-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3 text-left">
            <span className="text-3xl">🏆</span>
            <div>
              <div className="font-serif font-bold text-base text-yellow-200 uppercase tracking-wide">
                Bakunawa Has Been Vanquished!
              </div>
              <div className="text-xs text-zinc-300 font-sans">
                The weekly siege is won! Claim your Gold Ingots, Silver, bulk Mutya, and Mythic RED Memory!
              </div>
            </div>
          </div>
          {hasClaimedJackpot ? (
            <div className="px-4 py-2 bg-emerald-950 text-emerald-300 border border-emerald-500 rounded-lg text-xs font-mono font-bold">
              ✅ Weekly Jackpot Claimed
            </div>
          ) : (
            <button
              onClick={() => setShowJackpotModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-zinc-950 font-serif font-bold text-xs uppercase tracking-wider rounded-lg shadow-xl active:scale-95 transition-all"
            >
              Claim Weekly Jackpot
            </button>
          )}
        </div>
      )}

      {/* Global Titan HP Pool Meter */}
      <div className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800 p-4 rounded-xl space-y-2 shadow-inner">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs font-mono font-bold gap-1">
          <div className="flex items-center space-x-2">
            <span className="text-purple-400">LOCKED WEEKLY HEALTH POOL</span>
            {surgeStatus.isSurge && (
              <span className="text-[10px] bg-amber-900/60 text-amber-300 px-1.5 py-0.5 rounded border border-amber-600/50 animate-pulse">
                ⚡ Surge Active
              </span>
            )}
          </div>
          <span>{globalBakunawaHp.toLocaleString()} / {maxGlobalHp.toLocaleString()} HP ({serpentHpPercent}%)</span>
        </div>
        <div className="w-full h-4 bg-zinc-950 rounded-full border border-purple-900/60 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-700 via-amber-600 to-yellow-500 transition-all duration-300"
            style={{ width: `${serpentHpPercent}%` }}
          />
        </div>
        <div className="text-[10px] text-zinc-400 font-mono flex justify-between">
          <span>7-Day Cycle Resets Monday 12:00 Midnight</span>
          <span>{surgeStatus.nextSurgeText}</span>
        </div>
      </div>

      {/* Main Grid: Live Battle Log & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        {/* Battle Log Box */}
        <div className="lg:col-span-2 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-xl p-4 flex flex-col space-y-2 shadow-inner">
          <div className="text-xs font-mono uppercase font-bold text-amber-300 flex justify-between items-center border-b border-zinc-800 pb-2">
            <span>Celestial Battle Transmission</span>
            <span className="text-[10px] text-zinc-500">Live Global Sync</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-xs max-h-48 lg:max-h-64 pr-1">
            {raidLog.map((log, index) => (
              <div
                key={index}
                className={`p-2 rounded border text-xs leading-relaxed ${
                  log.includes('💥')
                    ? 'bg-red-950/50 border-red-800/40 text-red-200'
                    : log.includes('🛡️')
                    ? 'bg-blue-950/50 border-blue-800/40 text-blue-200'
                    : log.includes('⚔️')
                    ? 'bg-amber-950/40 border-amber-800/40 text-amber-200'
                    : 'bg-zinc-900/40 border-zinc-800/40 text-zinc-300'
                }`}
              >
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Leaderboard */}
        <div className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-xl p-4 flex flex-col space-y-2 shadow-inner">
          <div className="text-xs font-mono uppercase font-bold text-amber-300 border-b border-zinc-800 pb-2 flex justify-between items-center">
            <span>Celestial Slayers</span>
            <span className="text-[10px] text-purple-400">Weekly Top 10</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs pr-1">
            {leaderboard.length === 0 ? (
              <div className="text-zinc-500 italic text-center py-4">No strikes recorded yet this cycle. Be the first!</div>
            ) : (
              leaderboard.map((leader, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-2 rounded bg-zinc-900/60 border border-zinc-800/60"
                >
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-bold w-4 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-amber-600' : 'text-zinc-500'}`}>
                      #{i + 1}
                    </span>
                    <span className="font-bold text-zinc-200">{leader.player_name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-300 font-bold">{leader.damage_dealt.toLocaleString()} DMG</div>
                    <div className="text-[9px] text-zinc-500">{leader.battles_count} battles</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Raid Dispatch Action Pad */}
      <div className="bg-zinc-950/80 backdrop-blur-md border border-amber-900/60 p-4 rounded-xl shadow-2xl space-y-3">
        <div className="text-[10px] font-mono text-purple-400 uppercase font-semibold text-center md:text-left flex justify-between items-center">
          <span>CELESTIAL RAID DISPATCH PAD</span>
          <span className="text-zinc-400 font-normal">
            Daily Challenges: <strong className="text-amber-300">{currentDailyAttempts}/{MAX_DAILY_ATTEMPTS} Used ({remainingAttempts} Left)</strong>
          </span>
        </div>

        {/* PRIMARY ACTION: Full Turn-Based Battle Engine Launch */}
        <button
          onClick={handleStartRaidBattle}
          disabled={raidStatus === 'DEFEATED' || remainingAttempts <= 0}
          className="w-full p-4 bg-gradient-to-r from-purple-900 via-red-900 to-amber-700 hover:from-purple-800 hover:to-amber-600 disabled:opacity-50 border-2 border-amber-500/80 text-amber-100 rounded-xl uppercase tracking-wider font-mono text-xs md:text-sm font-bold shadow-2xl transition-all active:scale-98 flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-3"
        >
          <div className="flex items-center space-x-2">
            <span className="text-xl">🐉</span>
            <span>
              {raidStatus === 'DEFEATED'
                ? '[ BAKUNAWA ALREADY VANQUISHED FOR THIS CYCLE ]'
                : `[ CHALLENGE BAKUNAWA (ATTEMPT ${currentDailyAttempts + 1}/${MAX_DAILY_ATTEMPTS}) ]`}
            </span>
          </div>
          <span className="text-[10px] text-amber-300 font-normal font-mono">
            {surgeStatus.isSurge ? '⚡ Surge Window: +20% DMG, Silver & Memory Rolls Active!' : '(Standard 24/7 Attack Mode - 10 Turn Attempt)'}
          </span>
        </button>
      </div>

      {/* RUSH-HOUR SURGE REWARD MODAL */}
      {showSurgeModal && surgeModalData && (
        <RaidSurgeRewardModal
          isOpen={showSurgeModal}
          onClose={() => setShowSurgeModal(false)}
          damageDealt={surgeModalData.damageDealt}
          cowriesEarned={surgeModalData.cowriesEarned}
          silverEarned={surgeModalData.silverEarned}
          mutyaEarned={surgeModalData.mutyaEarned}
          expEarned={surgeModalData.expEarned}
          memoryDropped={surgeModalData.memoryDropped}
          rallyModifier={rallyModifier}
        />
      )}

      {/* WEEKLY VICTORY JACKPOT CLAIM MODAL */}
      {showJackpotModal && (
        <RaidJackpotModal
          isOpen={showJackpotModal}
          onClose={() => setShowJackpotModal(false)}
          cycleNumber={cycleNumber}
          onClaimJackpot={handleClaimWeeklyJackpot}
          isClaiming={isClaimingJackpot}
        />
      )}
    </div>
  );
};

