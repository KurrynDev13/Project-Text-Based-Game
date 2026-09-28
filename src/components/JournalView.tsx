import React from 'react';
import { PlayerCharacter, Bounty, SideQuest } from '../types/game';
import { soundFX } from '../utils/audio';

interface JournalViewProps {
  player: PlayerCharacter;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({ player, onUpdatePlayer }) => {
  const activeBounties = player.bounties.filter((b) => b.isAccepted);
  const sideQuests = player.sideQuests || [];

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

    const totalCC = player.wallet.copperCoins + bounty.rewardCC + (player.wallet.silverShillings * 100) + (player.wallet.goldSovereigns * 10000);
    const newGold = Math.floor(totalCC / 10000);
    const remGold = totalCC % 10000;
    const newSilver = Math.floor(remGold / 100);
    const newCopper = remGold % 100;

    onUpdatePlayer({
      ...player,
      exp: player.exp + bounty.rewardExp,
      encryptedMemories: newMemories,
      bounties: updatedBounties,
      wallet: {
        ...player.wallet,
        goldSovereigns: newGold,
        silverShillings: newSilver,
        copperCoins: newCopper,
      },
    });

    alert(`🎉 Bounty Claimed! Earned +${bounty.rewardExp} EXP, +${bounty.rewardCC} CC, and 1x Encrypted Memory (${bounty.rewardMemoryRarity})!`);
  };

  const handleClaimSideQuest = (sq: SideQuest) => {
    if (!sq.isCompleted || sq.isClaimed) return;

    soundFX.playLevelUpSound();
    const updatedSideQuests = (player.sideQuests || []).map((q) =>
      q.id === sq.id ? { ...q, isClaimed: true } : q
    );

    onUpdatePlayer({
      ...player,
      exp: player.exp + 300,
      sideQuests: updatedSideQuests,
    });

    alert(`✨ Side Quest Completed! ${sq.rewardText}`);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Journal Header */}
      <div className="bg-zinc-950 border border-amber-900/50 p-4 rounded-xl flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold font-serif text-amber-200">Active Quests & Bounty Journal</h3>
          <p className="text-zinc-400 text-[11px] mt-0.5">Track campaign objectives, accepted tavern bounties, and regional side quests.</p>
        </div>
        <span className="bg-amber-500/20 text-amber-300 font-bold px-3 py-1 rounded border border-amber-500/40">
          {activeBounties.length} Active Contracts
        </span>
      </div>

      {/* Main Campaign Objective */}
      <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-2">
        <div className="flex justify-between items-center text-[10px] uppercase text-amber-500 font-bold">
          <span>Main Campaign Objective</span>
          <span>Act I: The Awakening Fog</span>
        </div>
        <h4 className="text-sm font-bold font-serif text-amber-200">Cleanse the Corrupted Spring</h4>
        <p className="text-zinc-400">
          Venture into <strong>The Ashen Glade</strong>, eliminate mutated timber beasts, and confront Anchor Boss <strong>Root-Hulk Malphas</strong> to stabilize the 1st Aether Anchor!
        </p>
      </div>

      {/* Accepted Bounties List */}
      <div className="space-y-2">
        <h4 className="text-xs uppercase text-purple-400 font-bold">Accepted Colossus Bounties</h4>
        {activeBounties.length === 0 ? (
          <div className="bg-zinc-950/60 border border-zinc-800 p-4 rounded-xl text-center text-zinc-500 italic">
            No accepted bounties in journal. Visit <strong>The Rusty Goblet (Inn & Tavern)</strong> in Haven's Rest to accept new contracts!
          </div>
        ) : (
          activeBounties.map((bounty) => (
            <div
              key={bounty.id}
              className={`p-3 border rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 ${
                bounty.isClaimed
                  ? 'bg-zinc-950 border-zinc-800 opacity-50'
                  : bounty.isCompleted
                  ? 'bg-emerald-950/40 border-emerald-500/80 ring-1 ring-emerald-500/40'
                  : 'bg-zinc-900/90 border-purple-900/40'
              }`}
            >
              <div>
                <div className="text-[10px] text-purple-400 font-bold uppercase">{bounty.title}</div>
                <h5 className="text-sm font-bold text-white font-serif">Target: {bounty.targetMonsterName}</h5>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Elimination Progress: <strong className="text-amber-300">{bounty.currentCount} / {bounty.targetCount}</strong>
                </p>
              </div>

              <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
                <div className="text-right text-[10px] text-zinc-300">
                  <div>+{bounty.rewardExp} EXP | +{bounty.rewardCC} CC</div>
                  <div className="text-purple-300 font-bold">1x Memory ({bounty.rewardMemoryRarity})</div>
                </div>

                <button
                  onClick={() => handleClaimBounty(bounty)}
                  disabled={!bounty.isCompleted || bounty.isClaimed}
                  className={`px-4 py-1.5 rounded font-bold uppercase tracking-wider text-[10px] transition-all ${
                    bounty.isClaimed
                      ? 'bg-zinc-800 text-zinc-500 cursor-default'
                      : bounty.isCompleted
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md active:scale-95'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {bounty.isClaimed ? 'Claimed' : bounty.isCompleted ? 'Claim Reward' : 'In Progress'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Regional Side Quests */}
      <div className="space-y-2 pt-2">
        <h4 className="text-xs uppercase text-cyan-400 font-bold">Regional Side Quests</h4>
        <div className="space-y-2">
          {sideQuests.map((sq) => (
            <div
              key={sq.id}
              className={`p-3 border rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 ${
                sq.isClaimed
                  ? 'bg-zinc-950 border-zinc-800 opacity-50'
                  : sq.isCompleted
                  ? 'bg-emerald-950/40 border-emerald-500/80'
                  : 'bg-zinc-900/90 border-cyan-900/40'
              }`}
            >
              <div>
                <div className="text-[10px] text-cyan-400 font-bold uppercase">{sq.title} • Giver: {sq.giver}</div>
                <p className="text-zinc-300 text-[11px] mt-0.5">{sq.description}</p>
                <div className="text-[11px] text-amber-300 mt-1">
                  Progress: {sq.progressCurrent} / {sq.progressRequired} {sq.objectiveText}
                </div>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <div className="text-[10px] text-zinc-400 max-w-[140px] text-right">{sq.rewardText}</div>
                <button
                  onClick={() => handleClaimSideQuest(sq)}
                  disabled={!sq.isCompleted || sq.isClaimed}
                  className={`px-3 py-1 rounded font-bold uppercase text-[10px] ${
                    sq.isClaimed
                      ? 'bg-zinc-800 text-zinc-500'
                      : sq.isCompleted
                      ? 'bg-emerald-500 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {sq.isClaimed ? 'Claimed' : sq.isCompleted ? 'Claim' : 'Active'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
