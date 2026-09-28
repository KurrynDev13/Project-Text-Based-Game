import React from 'react';
import { PlayerCharacter, Bounty } from '../types/game';
import { soundFX } from '../utils/audio';

interface BountiesViewProps {
  player: PlayerCharacter;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
}

export const BountiesView: React.FC<BountiesViewProps> = ({ player, onUpdatePlayer }) => {
  const handleClaimBounty = (bounty: Bounty) => {
    if (!bounty.isCompleted || bounty.isClaimed) return;

    soundFX.playLevelUpSound();

    // Reward player with EXP, CC, and Encrypted Memory
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

    // Calculate currency update
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
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-amber-100 p-4 md:p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="bg-zinc-900 border border-amber-900/50 rounded-xl p-5 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-xs font-mono uppercase text-amber-500 tracking-wider">Titan Vanguard Contracts</div>
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-amber-200">Daily Bounties</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Complete high-value target contracts across sector locations to earn purple and exotic red memory drops!
          </p>
        </div>
      </div>

      {/* Bounties List */}
      <div className="space-y-3">
        {player.bounties.map((bounty) => (
          <div
            key={bounty.id}
            className={`border rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg ${
              bounty.isClaimed
                ? 'bg-zinc-950/60 border-zinc-800 opacity-50'
                : bounty.isCompleted
                ? 'bg-emerald-950/30 border-emerald-500/80 ring-1 ring-emerald-500/40'
                : 'bg-zinc-900/80 border-zinc-800'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold uppercase text-amber-400">{bounty.title}</span>
                {bounty.isCompleted && !bounty.isClaimed && (
                  <span className="bg-emerald-500 text-zinc-950 font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    Ready to Claim
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold font-serif text-white">Target: {bounty.targetMonsterName}</h3>
              <p className="text-xs text-zinc-400">
                Progress: <strong className="text-amber-300 font-mono">{bounty.currentCount} / {bounty.targetCount}</strong> eliminated
              </p>
            </div>

            <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-end">
              <div className="text-right font-mono text-xs text-zinc-300">
                <div>Rewards: +{bounty.rewardExp} EXP | +{bounty.rewardCC} CC</div>
                <div className="text-purple-300 font-bold">1x Encrypted Memory ({bounty.rewardMemoryRarity})</div>
              </div>

              <button
                onClick={() => handleClaimBounty(bounty)}
                disabled={!bounty.isCompleted || bounty.isClaimed}
                className={`px-5 py-2 rounded-lg text-xs font-bold uppercase font-mono tracking-wider transition-all ${
                  bounty.isClaimed
                    ? 'bg-zinc-800 text-zinc-500 cursor-default'
                    : bounty.isCompleted
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md active:scale-95'
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                }`}
              >
                {bounty.isClaimed ? 'Claimed' : bounty.isCompleted ? 'Claim Reward' : 'In Progress'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
