import React, { useState } from 'react';
import { PlayerCharacter, Bounty, SideQuest } from '../types/game';
import { GAME_LOCATIONS } from '../data/equipmentData';
import { totalCowriesFromWallet, cowriesToWallet, processExpGain } from '../utils/gameFormulas';
import { soundFX } from '../utils/audio';

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

  const [activeTab, setActiveTab] = useState<JournalTab>('BOUNTIES');
  const [actFilter, setActFilter] = useState<string>('CURRENT'); // 'CURRENT' or 'ALL' or specific act id

  const activeBounties = (player.bounties || []).filter((b) => b.isAccepted && !b.isClaimed);
  const completedBounties = (player.bounties || []).filter((b) => b.isClaimed);
  const sideQuests = player.sideQuests || [];
  const completedSideQuests = sideQuests.filter((q) => q.isClaimed);

  // Current Act data
  const currentLoc = GAME_LOCATIONS.find((l) => l.id === player.currentLocationId) || GAME_LOCATIONS[0];
  const currentActQuests = sideQuests.filter((q) => q.actId === currentLoc.id);
  const currentActCompletedCount = currentActQuests.filter((q) => q.isCompleted || q.isClaimed).length;
  const currentActDiscoveredCount = currentActQuests.filter((q) => q.isDiscovered).length;

  // Filtered side quests for display (Anti-spoiler: Only show quests for unlocked Acts!)
  const unlockedLocationIds = GAME_LOCATIONS.filter((l) => player.level >= l.minLevel).map((l) => l.id);

  const displayedSideQuests = sideQuests.filter((q) => {
    // Hide side quests belonging to locked Acts
    if (!q.actId || !unlockedLocationIds.includes(q.actId)) return false;

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
    const currentTotalCowries = totalCowriesFromWallet(player.wallet);
    const updatedWallet = cowriesToWallet(currentTotalCowries + rewardCowries);
    updatedWallet.mutyaShards = (player.wallet.mutyaShards || 0) + 1;
    updatedWallet.prismaticShards = updatedWallet.mutyaShards;

    const expResult = processExpGain(player.level, player.exp, bounty.rewardExp);

    onUpdatePlayer({
      ...player,
      level: expResult.newLevel,
      exp: expResult.newExp,
      availableAP: player.availableAP + expResult.apGained,
      encryptedMemories: newMemories,
      bounties: updatedBounties,
      wallet: updatedWallet,
    });

    if (expResult.levelsGained > 0) {
      notify(`🎉 Bounty Claimed! Earned +${bounty.rewardExp} EXP, +${rewardCowries} Cowries, and 1x Mutya Shard!\n\n🌟 LEVEL UP! Reached Level ${expResult.newLevel}! Earned +${expResult.apGained} Attribute Points.`, 'success', '🎉');
    } else {
      notify(`🎉 Bounty Claimed! Earned +${bounty.rewardExp} EXP, +${rewardCowries} Cowries, and 1x Mutya Shard!`, 'success', '🎉');
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
    const rewardExp = sq.rewardExp ?? 300;
    const rewardMutya = sq.rewardMutya ?? 1;

    const currentTotalCowries = totalCowriesFromWallet(player.wallet);
    const updatedWallet = cowriesToWallet(currentTotalCowries + rewardCowries);
    updatedWallet.mutyaShards = (player.wallet.mutyaShards || 0) + rewardMutya;
    updatedWallet.prismaticShards = updatedWallet.mutyaShards;

    const expResult = processExpGain(player.level, player.exp, rewardExp);

    onUpdatePlayer({
      ...player,
      level: expResult.newLevel,
      exp: expResult.newExp,
      availableAP: player.availableAP + expResult.apGained,
      sideQuests: updatedSideQuests,
      wallet: updatedWallet,
    });

    if (expResult.levelsGained > 0) {
      notify(`✨ Side Quest Claimed! ${sq.rewardText}\n\n🌟 LEVEL UP! Reached Level ${expResult.newLevel}! Earned +${expResult.apGained} Attribute Points.`, 'success', '✨');
    } else {
      notify(`✨ Side Quest Claimed! ${sq.rewardText}`, 'success', '✨');
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Dynamic Main Campaign & Act Objective Banner */}
      <div className="bg-zinc-950 border border-amber-900/50 p-4 rounded-xl shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-zinc-800/80 pb-2">
          <div>
            <div className="text-[10px] uppercase text-amber-500 font-bold tracking-wider">
              Main Campaign Objective • {currentLoc.name}
            </div>
            <h3 className="text-base font-bold font-serif text-amber-200">{currentLoc.subtitle}</h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-zinc-900 text-zinc-300 px-2.5 py-1 rounded border border-zinc-700 text-[10px]">
              Quests: <strong className={currentActCompletedCount >= 3 ? 'text-emerald-400' : 'text-amber-400'}>{currentActCompletedCount}/3 Completed</strong> ({currentActDiscoveredCount}/3 Discovered)
            </span>
            <span className="bg-purple-950/80 text-purple-300 px-2.5 py-1 rounded border border-purple-500/40 text-[10px]">
              Active Bounties: <strong className="text-amber-300">{activeBounties.length}/3</strong>
            </span>
          </div>
        </div>

        <p className="text-zinc-300 text-xs leading-relaxed">
          {currentLoc.description}
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
          <span className="text-zinc-400">Act Guardian Gate:</span>
          <span className="bg-red-950/80 text-red-300 border border-red-500/50 px-2 py-0.5 rounded font-bold">
            ⚔️ Defeat the Act Guardian to unlock next Act
          </span>
          <span className="bg-amber-950/60 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold">
            ⚠️ 3 Side Quests Required (Unfinished Quests Forfeit on Act Advancement)
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 gap-1 text-xs">
        <button
          onClick={() => setActiveTab('BOUNTIES')}
          className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'BOUNTIES'
              ? 'bg-purple-700 text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <span>📜 Active Bounties</span>
          <span className="bg-purple-950 px-1.5 py-0.5 rounded-full text-[10px]">
            {activeBounties.length}/3
          </span>
        </button>

        <button
          onClick={() => setActiveTab('SIDE_QUESTS')}
          className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'SIDE_QUESTS'
              ? 'bg-cyan-700 text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <span>⚔️ Side Quests</span>
          <span className="bg-cyan-950 px-1.5 py-0.5 rounded-full text-[10px]">
            {completedSideQuests.length}/24
          </span>
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'COMPLETED'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <span>🏆 Completed Log</span>
          <span className="bg-emerald-950 px-1.5 py-0.5 rounded-full text-[10px]">
            {completedBounties.length + completedSideQuests.length}
          </span>
        </button>
      </div>

      {/* TAB 1: ACTIVE BOUNTIES */}
      {activeTab === 'BOUNTIES' && (
        <div className="space-y-3">
          {player.level < 3 ? (
            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl text-center space-y-2">
              <div className="text-3xl">🔒</div>
              <h4 className="text-sm font-bold font-serif text-amber-300">Bounties Notice Board Locked</h4>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Bounties unlock strictly upon reaching <strong className="text-amber-300">Character Level 3</strong>. Slay beasts in Act I or complete initial side quests to level up!
              </p>
              <div className="text-[10px] text-zinc-500 pt-1 font-mono">Current Progress: Level {player.level} / 3</div>
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
                    <div>+{bounty.rewardExp} EXP | +{bounty.rewardCowries ?? bounty.rewardCC} Cowries</div>
                    <div className="text-purple-300 font-bold">+1x Mutya Shard</div>
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

                  <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end shrink-0">
                    <div className="text-right text-[10px] text-zinc-400 max-w-[160px]">
                      {sq.rewardText}
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

