import React, { useState } from 'react';
import { PlayerCharacter, Bounty, SideQuest } from '../types/game';
import { GAME_LOCATIONS } from '../data/equipmentData';
import {
  totalCowriesFromWallet,
  cowriesToWallet,
  processExpGain,
  calcBountyExpReward,
  calcSideQuestExpReward,
  formatCompactNumber,
  formatCostInCowries,
} from '../utils/gameFormulas';
import { soundFX } from '../utils/audio';
import { getQuestGiverImageUrl } from '../utils/assetHelper';

interface JournalViewProps {
  player: PlayerCharacter;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error', icon?: string) => void;
}

type JournalTab = 'BOUNTIES' | 'SIDE_QUESTS' | 'COMPLETED';

export const JournalView: React.FC<JournalViewProps> = ({ player, onUpdatePlayer, onShowToast }) => {
  const notify = (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', icon?: string) => {
    onShowToast?.(msg, type, icon);
  };

  const isNgPlus = (player.ngPlusLevel || 0) > 0;
  const bountyUnlockLevel = isNgPlus ? ((player.ngPlusStartLevel || 0) + 3) : 3;

  const [activeTab, setActiveTab] = useState<JournalTab>('BOUNTIES');
  const [actFilter, setActFilter] = useState<string>('CURRENT'); // 'CURRENT' or 'ALL' or specific act id

  const activeBounties = (player.bounties || []).filter((b) => b.isAccepted && !b.isClaimed);
  const completedBounties = (player.bounties || []).filter((b) => b.isClaimed);
  const sideQuests = player.sideQuests || [];
  const activeSideQuests = sideQuests.filter((q) => q.isDiscovered && !q.isClaimed && !q.isForfeited);
  const completedSideQuests = sideQuests.filter((q) => q.isClaimed);

  // Filtered unlocked location IDs for display & tracking (respects NG+ rebirth reset)
  const playerUnlockedLocationIds = (player.unlockedLocationIds && player.unlockedLocationIds.length > 0)
    ? player.unlockedLocationIds
    : ['loc_act_1'];

  // Latest Unlocked Act location for Main Campaign Objective header (stays at latest unlocked frontier)
  const latestUnlockedLoc = [...GAME_LOCATIONS].reverse().find((l) => playerUnlockedLocationIds.includes(l.id)) || GAME_LOCATIONS[0];
  const latestActQuests = sideQuests.filter((q) => q.actId === latestUnlockedLoc.id);
  const latestActCompletedCount = latestActQuests.filter((q) => q.isCompleted || q.isClaimed).length;
  const latestActDiscoveredCount = latestActQuests.filter((q) => q.isDiscovered).length;

  // Current selected location (for tab filtering when inspecting specific acts)
  const currentLoc = GAME_LOCATIONS.find((l) => l.id === player.currentLocationId) || GAME_LOCATIONS[0];

  // Filtered side quests for display (Anti-spoiler: Only show quests for unlocked Acts!)
  const displayedSideQuests = sideQuests.filter((q) => {
    // Hide side quests belonging to locked Acts
    if (!q.actId || !playerUnlockedLocationIds.includes(q.actId)) return false;

    if (actFilter === 'CURRENT') return q.actId === currentLoc.id;
    if (actFilter === 'ALL') return true;
    return q.actId === actFilter;
  });

  const handleClaimBounty = (bounty: Bounty) => {
    if (!bounty.isCompleted || bounty.isClaimed) return;

    soundFX.playLevelUpSound();

    const newMemories = [
      ...player.encryptedMemories,
      {
        id: `bounty_mem_${Date.now()}`,
        name: `Bounty Memory (${bounty.rewardMemoryRarity})`,
        rarity: bounty.rewardMemoryRarity,
        minLevel: player.level,
        acquiredAtLocation: player.currentLocationId,
      },
    ];

    const updatedBounties = player.bounties.map((b) =>
      b.id === bounty.id ? { ...b, isClaimed: true } : b
    );

    const rewardCowries = bounty.rewardCowries ?? bounty.rewardCC ?? 150;
    const rewardExp = calcBountyExpReward(player.level);
    const currentTotalCowries = totalCowriesFromWallet(player.wallet);
    const updatedWallet = cowriesToWallet(currentTotalCowries + rewardCowries);
    const bountyLoc = GAME_LOCATIONS.find((l) => l.id === bounty.actId);
    const isBossDefeated = bountyLoc?.bossId ? (player.completedBossIds || []).includes(bountyLoc.bossId) : false;
    const baseCap = bountyLoc ? (bountyLoc.bossLevelReq ?? (bountyLoc.minLevel + 5)) : undefined;
    const isNgPlus = (player.ngPlusLevel || 0) > 0;
    const startLvl = player.ngPlusStartLevel || player.level;
    const actClimaxCap = (!isBossDefeated && baseCap) ? (isNgPlus ? startLvl + baseCap - 1 : baseCap) : undefined;

    const expResult = processExpGain(player.level, player.exp, rewardExp, actClimaxCap);

    onUpdatePlayer({
      ...player,
      level: expResult.newLevel,
      exp: expResult.newExp,
      availableAP: player.availableAP + expResult.apGained,
      skillPoints: (player.skillPoints || 0) + (expResult.spGained || 0),
      encryptedMemories: newMemories,
      bounties: updatedBounties,
      wallet: updatedWallet,
    });

    if (expResult.levelsGained > 0) {
      notify(`🎉 Bounty Claimed! Earned +${rewardExp} EXP, +${rewardCowries} Cowries, and 1x Mutya Shard!\n\n🌟 LEVEL UP! Reached Level ${expResult.newLevel}! Earned +${expResult.apGained} AP & +${expResult.spGained} Skill Point!`, 'success', '🎉');
    } else {
      notify(`🎉 Bounty Claimed! Earned +${rewardExp} EXP, +${rewardCowries} Cowries, and 1x Mutya Shard!`, 'success', '🎉');
    }
  };

  const handleAbandonBounty = (bountyId: string) => {
    soundFX.playClickSound();
    const updatedBounties = player.bounties.map((b) =>
      b.id === bountyId ? { ...b, isAccepted: false, currentCount: 0 } : b
    );
    onUpdatePlayer({ ...player, bounties: updatedBounties });
  };

  const handleClaimSideQuest = (sq: SideQuest) => {
    if (!sq.isCompleted || sq.isClaimed || sq.isForfeited) return;

    soundFX.playLevelUpSound();
    const updatedSideQuests = (player.sideQuests || []).map((q) =>
      q.id === sq.id ? { ...q, isClaimed: true } : q
    );

    const rewardCowries = sq.rewardCowries ?? 300;
    const rewardExp = calcSideQuestExpReward(player.level);
    const rewardMutya = sq.rewardMutya ?? 1;

    const currentTotalCowries = totalCowriesFromWallet(player.wallet);
    const updatedWallet = cowriesToWallet(currentTotalCowries + rewardCowries);
    updatedWallet.mutyaShards = (player.wallet.mutyaShards || 0) + rewardMutya;
    updatedWallet.prismaticShards = updatedWallet.mutyaShards;

    const questLoc = GAME_LOCATIONS.find((l) => l.id === sq.actId);
    const isQuestBossDefeated = questLoc?.bossId ? (player.completedBossIds || []).includes(questLoc.bossId) : false;
    const baseQuestCap = questLoc ? (questLoc.bossLevelReq ?? (questLoc.minLevel + 5)) : undefined;
    const isNgPlusQuest = (player.ngPlusLevel || 0) > 0;
    const startLvlQuest = player.ngPlusStartLevel || player.level;
    const actClimaxCapQuest = (!isQuestBossDefeated && baseQuestCap) ? (isNgPlusQuest ? startLvlQuest + baseQuestCap - 1 : baseQuestCap) : undefined;

    const expResult = processExpGain(player.level, player.exp, rewardExp, actClimaxCapQuest);

    onUpdatePlayer({
      ...player,
      level: expResult.newLevel,
      exp: expResult.newExp,
      availableAP: player.availableAP + expResult.apGained,
      skillPoints: (player.skillPoints || 0) + (expResult.spGained || 0),
      sideQuests: updatedSideQuests,
      wallet: updatedWallet,
    });

    if (expResult.levelsGained > 0) {
      notify(`✨ Side Quest Claimed! Earned +${rewardExp} EXP, +${rewardCowries} Cowries & +${rewardMutya}x Mutya Shard!\n\n🌟 LEVEL UP! Reached Level ${expResult.newLevel}! Earned +${expResult.apGained} AP & +${expResult.spGained} Skill Point!`, 'success', '✨');
    } else {
      notify(`✨ Side Quest Claimed! Earned +${rewardExp} EXP, +${rewardCowries} Cowries & +${rewardMutya}x Mutya Shard!`, 'success', '✨');
    }
  };

  return (
    <div className="space-y-3 font-mono text-xs">
      {/* Dynamic Main Campaign & Act Objective Banner */}
      <div className="bg-[#090c12]/95 border border-amber-500/25 p-3.5 sm:p-4 rounded-2xl shadow-xl space-y-2.5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-zinc-800/80 pb-2">
          <div>
            <div className="text-[9.5px] uppercase text-amber-400 font-bold tracking-wider flex items-center gap-1 font-mono">
              <span>ᜆᜓᜅᜓᜑᜒᜈ᜔</span>
              <span>• Main Campaign Objective • {latestUnlockedLoc.name}</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold font-serif text-amber-100">{latestUnlockedLoc.subtitle}</h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-[#0c0f16]/90 text-zinc-300 px-2.5 py-1 rounded-xl border border-zinc-700/80 text-[10px] font-bold shadow-sm">
              Quests: <strong className={latestActCompletedCount >= 3 ? 'text-emerald-400' : 'text-amber-400'}>{latestActCompletedCount}/3 Completed</strong>
            </span>
            <span className="bg-purple-950/80 text-purple-300 px-2.5 py-1 rounded-xl border border-purple-500/40 text-[10px] font-bold shadow-sm">
              Active Bounties: <strong className="text-amber-300">{activeBounties.length}/3</strong>
            </span>
          </div>
        </div>

        <p className="text-zinc-300 text-[11px] leading-relaxed">
          {latestUnlockedLoc.description}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
          <span className="text-zinc-400">Act Gate:</span>
          <span className="bg-red-950/80 text-red-300 border border-red-500/50 px-2 py-0.5 rounded-lg font-bold">
            ⚔️ Defeat Act Guardian to advance
          </span>
          <span className="bg-amber-950/70 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-lg font-bold">
            ⚠️ 3 Side Quests Required
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-[#0c0f16]/90 p-1 rounded-xl border border-zinc-800 gap-1 text-xs shadow-inner">
        <button
          onClick={() => setActiveTab('BOUNTIES')}
          className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95 ${
            activeTab === 'BOUNTIES'
              ? 'bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-600 text-white shadow-md ring-1 ring-purple-300'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span>📜 Bounties</span>
          <span className="bg-purple-950 px-1.5 py-0.2 rounded-full text-[9px] border border-purple-800/60">
            {activeBounties.length}/3
          </span>
        </button>

        <button
          onClick={() => setActiveTab('SIDE_QUESTS')}
          className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95 ${
            activeTab === 'SIDE_QUESTS'
              ? 'bg-gradient-to-r from-cyan-600 to-emerald-600 text-zinc-950 font-extrabold shadow-md ring-1 ring-cyan-300'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span>⚔️ Side Quests</span>
          <span className="bg-cyan-950 text-cyan-300 px-1.5 py-0.2 rounded-full text-[9px] border border-cyan-800/60">
            {activeSideQuests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95 ${
            activeTab === 'COMPLETED'
              ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-zinc-950 font-bold shadow-md ring-1 ring-amber-300'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span>🏆 Completed</span>
          <span className="bg-zinc-950 text-zinc-300 px-1.5 py-0.2 rounded-full text-[9px] border border-zinc-800">
            {completedBounties.length + completedSideQuests.length}
          </span>
        </button>
      </div>

      {/* TAB 1: ACTIVE BOUNTIES */}
      {activeTab === 'BOUNTIES' && (
        <div className="space-y-3">
          {player.level < bountyUnlockLevel ? (
            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl text-center space-y-2">
              <div className="text-3xl">🔒</div>
              <h4 className="text-sm font-bold font-serif text-amber-300">Bounties Notice Board Locked</h4>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Bounties unlock strictly upon reaching <strong className="text-amber-300">Character Level {bountyUnlockLevel}</strong> in this cycle. Slay beasts in Act I or complete initial side quests to level up!
              </p>
              <div className="text-[10px] text-zinc-500 pt-1 font-mono">Current Progress: Level {player.level} / {bountyUnlockLevel}</div>
            </div>
          ) : activeBounties.length === 0 ? (
            <div className="bg-zinc-950 border border-dashed border-zinc-800 p-6 rounded-xl text-center space-y-2">
              <div className="text-2xl">📜</div>
              <h4 className="text-sm font-bold font-serif text-amber-200">No Active Contracts</h4>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                You can hold up to 3 active bounties at a time. Visit the <strong>Bounty Notice Board</strong> at the Sanctuary Tavern to accept new contracts!
              </p>
            </div>
          ) : (
            activeBounties.map((bounty) => (
              <div
                key={bounty.id}
                className={`p-3.5 border rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-all ${
                  bounty.isCompleted
                    ? 'bg-emerald-950/40 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/30'
                    : 'bg-zinc-900/90 border-purple-900/50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold uppercase text-amber-400">{bounty.title}</span>
                    <span className="text-[10px] text-zinc-400">• Level {bounty.minLevel ?? 1}+</span>
                    {bounty.isCompleted && (
                      <span className="bg-emerald-500 text-zinc-950 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                        Ready to Claim
                      </span>
                    )}
                  </div>
                  <h5 className="text-sm font-bold text-white font-serif">Target: {bounty.targetMonsterName}</h5>
                  <div className="flex items-center space-x-2 text-[11px] text-zinc-400">
                    <span>Progress:</span>
                    <strong className="text-amber-300 font-mono">{bounty.currentCount} / {bounty.targetCount}</strong>
                    <div className="w-24 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-400 h-full transition-all"
                        style={{ width: `${Math.min(100, (bounty.currentCount / bounty.targetCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right text-[10px] text-zinc-300 font-mono">
                    <div>+{formatCompactNumber(calcBountyExpReward(player.level))} EXP | +{formatCostInCowries(bounty.rewardCowries ?? bounty.rewardCC ?? 150)}</div>
                    <div className="text-purple-300 font-bold">+1🔮</div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {bounty.isCompleted ? (
                      <button
                        onClick={() => handleClaimBounty(bounty)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase px-3 py-1.5 rounded text-[10px] transition-all shadow-md active:scale-95 animate-bounce"
                      >
                        Claim Reward
                      </button>
                    ) : (
                      <>
                        <span className="bg-purple-950 text-purple-300 border border-purple-500/40 px-2.5 py-1 rounded text-[10px] font-bold">
                          ⏳ In Progress
                        </span>
                        <button
                          onClick={() => handleAbandonBounty(bounty.id)}
                          className="text-zinc-500 hover:text-red-400 text-[10px] underline px-1"
                          title="Abandon Contract to free 1 of 3 active slots"
                        >
                          Abandon
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: SIDE QUESTS */}
      {activeTab === 'SIDE_QUESTS' && (
        <div className="space-y-3">
          {/* Act Filter Bar */}
          <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl">
            <span className="text-[11px] text-zinc-400">Filter Quests:</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActFilter('CURRENT')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                  actFilter === 'CURRENT'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                Current Act ({currentLoc.name.split(':')[0]})
              </button>
              <button
                onClick={() => setActFilter('ALL')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                  actFilter === 'ALL'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                Unlocked Acts
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {displayedSideQuests.map((sq) => {
              const actLoc = GAME_LOCATIONS.find((l) => l.id === sq.actId);
              const isCurrentAct = sq.actId === currentLoc.id;

              // Hide quest details if not yet discovered
              if (!sq.isDiscovered && !sq.isCompleted && !sq.isClaimed && !sq.isForfeited) {
                return (
                  <div
                    key={sq.id}
                    className="p-3.5 border border-dashed border-zinc-800/80 bg-zinc-950/60 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 opacity-75 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">
                          {actLoc?.name.split(':')[0] || 'Act'} • ??? Undiscovered Quest
                        </span>
                        <span className="bg-zinc-900 text-amber-500/80 border border-amber-900/40 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                          Undiscovered
                        </span>
                      </div>
                      <p className="text-zinc-500 text-xs italic">
                        Venture deeper into {actLoc?.name.split(':')[0] || 'this realm'} to cross paths with this quest giver.
                      </p>
                      <div className="text-[11px] text-zinc-600 font-mono">
                        Objective: [Hidden until discovered]
                      </div>
                    </div>

                    <div className="text-right text-[10px] text-zinc-600 font-mono italic">
                      Rewards Hidden
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={sq.id}
                  className={`p-3.5 border rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-all ${
                    sq.isForfeited
                      ? 'bg-red-950/20 border-red-900/40 opacity-60'
                      : sq.isClaimed
                      ? 'bg-zinc-950 border-zinc-800 opacity-60'
                      : sq.isCompleted
                      ? 'bg-emerald-950/40 border-emerald-500/80 ring-1 ring-emerald-500/30'
                      : isCurrentAct
                      ? 'bg-zinc-900/95 border-cyan-800/60'
                      : 'bg-zinc-950 border-zinc-800/80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={getQuestGiverImageUrl(sq.giver)}
                      alt={sq.giver}
                      className="w-12 h-12 rounded-lg object-cover border border-amber-600/60 shadow-md shrink-0 bg-zinc-950"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase">
                          {actLoc?.name.split(':')[0] || 'Act'} • {sq.title}
                        </span>
                        <span className="text-[10px] text-zinc-400">Giver: {sq.giver}</span>
                      {sq.isForfeited ? (
                        <span className="bg-red-900/80 text-red-200 border border-red-500/50 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                          Permanently Forfeited
                        </span>
                      ) : sq.isClaimed ? (
                        <span className="bg-zinc-800 text-zinc-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                          Completed
                        </span>
                      ) : sq.isCompleted ? (
                        <span className="bg-emerald-500 text-zinc-950 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                          Ready to Claim
                        </span>
                      ) : (
                        <span className="bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-300 text-xs">{sq.description}</p>
                    <div className="flex items-center space-x-2 text-[11px] text-zinc-400">
                      <span>Progress:</span>
                      <strong className={sq.isCompleted ? 'text-emerald-400' : 'text-amber-300'}>
                        {sq.progressCurrent} / {sq.progressRequired} {sq.objectiveText}
                      </strong>
                    </div>
                  </div>
                  </div>

                  <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end shrink-0">
                    <div className="text-right text-[10px] text-zinc-400 max-w-[160px] font-mono">
                      <div>+{formatCompactNumber(calcSideQuestExpReward(player.level))} EXP | +{formatCostInCowries(sq.rewardCowries ?? 300)}</div>
                      <div className="text-amber-400 font-bold">+{sq.rewardMutya ?? 1}🔮</div>
                    </div>

                    {sq.isForfeited ? (
                      <span className="text-red-400 text-[10px] italic">Forfeited</span>
                    ) : sq.isClaimed ? (
                      <span className="text-zinc-500 text-[10px] font-bold">Claimed ✓</span>
                    ) : sq.isCompleted ? (
                      <button
                        onClick={() => handleClaimSideQuest(sq)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase px-3.5 py-1.5 rounded text-[10px] shadow-md transition-all active:scale-95 animate-bounce"
                      >
                        Claim Reward
                      </button>
                    ) : (
                      <span className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded text-[10px] font-bold">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: COMPLETED LOG */}
      {activeTab === 'COMPLETED' && (
        <div className="space-y-3">
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold font-serif text-emerald-300">Slayer & Quest Achievement Record</h4>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                Archived history of all claimed contracts and completed regional folklore quests.
              </p>
            </div>
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded font-bold text-xs">
              {completedBounties.length + completedSideQuests.length} Claimed
            </span>
          </div>

          <div className="space-y-2">
            {completedSideQuests.map((q) => (
              <div key={q.id} className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-cyan-400 font-bold uppercase">Side Quest • {q.title}</span>
                  <div className="text-zinc-300 text-[11px]">{q.rewardText}</div>
                </div>
                <span className="text-emerald-400 font-bold text-[10px]">Claimed ✓</span>
              </div>
            ))}

            {completedBounties.map((b) => (
              <div key={b.id} className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-purple-400 font-bold uppercase">Bounty Contract • {b.title}</span>
                  <div className="text-zinc-300 text-[11px]">Target: {b.targetMonsterName} (Slain: {b.targetCount}/{b.targetCount})</div>
                </div>
                <span className="text-emerald-400 font-bold text-[10px]">Claimed ✓</span>
              </div>
            ))}

            {completedBounties.length === 0 && completedSideQuests.length === 0 && (
              <div className="bg-zinc-950 border border-dashed border-zinc-800 p-6 rounded-xl text-center text-zinc-500 italic">
                No completed records yet. Complete and claim bounties or side quests to fill this ledger.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

