import React from 'react';
import { PlayerCharacter, Bounty } from '../types/game';
import { MONSTER_TEMPLATES } from '../data/monstersData';
import {
  calcDerivedStats,
  calcMonsterPowerRating,
  formatCostInCowries,
} from '../utils/gameFormulas';
import { soundFX } from '../utils/audio';

interface BountyNoticeBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerCharacter;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error', icon?: string) => void;
}

export const BountyNoticeBoardModal: React.FC<BountyNoticeBoardModalProps> = ({
  isOpen,
  onClose,
  player,
  onUpdatePlayer,
  onShowToast,
}) => {
  if (!isOpen) return null;

  const derived = calcDerivedStats(player.attributes, player.level, player.equipment);
  const playerPower = derived.powerLevel;

  // Map of monsters for power rating calculation
  const monsterMap = new Map(MONSTER_TEMPLATES.map((m) => [m.id, m]));

  const getBountyPower = (bounty: Bounty): number => {
    const tmpl = monsterMap.get(bounty.targetMonsterId);
    if (tmpl) {
      return calcMonsterPowerRating(tmpl, 0, player.ngPlusLevel || 0);
    }
    return (bounty.minLevel || 1) * 35;
  };

  const currentActId = player.currentLocationId || 'loc_act_1';
  const currentActNumber =
    currentActId === 'loc_act_infinite' ? '∞' : currentActId.replace('loc_act_', '');

  // Filter available bounties strictly by current Act & appropriate for character's current power rating
  const availableBounties = (player.bounties || []).filter((b) => {
    if (b.isAccepted || b.isCompleted || b.isClaimed || b.isForfeited) return false;
    // Current Act filter
    const matchesAct = b.actId ? b.actId === currentActId : true;
    if (!matchesAct) return false;

    // Power Rating check: monster power rating should not drastically exceed player power (+35% upper limit)
    const bountyPower = getBountyPower(b);
    const matchesPower = bountyPower <= Math.max(150, playerPower * 1.35) && (b.minLevel ?? 1) <= player.level + 2;
    return matchesPower;
  });

  const activeBounties = (player.bounties || []).filter((b) => b.isAccepted && !b.isCompleted && !b.isClaimed);

  const handleAcceptBounty = (bountyId: string) => {
    if (activeBounties.length >= 3) {
      onShowToast?.(
        '⚠️ Maximum 3 active bounties held at once! Complete or abandon an active contract in [Log & Chat] first.',
        'warning',
        '📜'
      );
      return;
    }

    const updated = (player.bounties || []).map((b) => {
      if (b.id === bountyId) {
        return { ...b, isAccepted: true };
      }
      return b;
    });

    onUpdatePlayer({ ...player, bounties: updated });
    soundFX.playClick();
    onShowToast?.(
      '⚔️ Bounty contract accepted! Track progress and claim rewards in [Log & Chat].',
      'success',
      '🎯'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-900 border border-purple-800/80 rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-950/80 via-zinc-900 to-purple-950/80 p-4 border-b border-purple-800/40 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">📜</span>
            <div>
              <h3 className="text-lg font-bold font-serif text-purple-200 flex items-center space-x-2">
                <span>Sanctuary Bounty Notice Board</span>
                <span className="text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-700/50 px-2 py-0.5 rounded-full">
                  Act {currentActNumber} Bracket
                </span>
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                Contracts filtered to current Act and Titan Power Rating ({playerPower} Power)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center font-bold text-sm transition-all"
            aria-label="Close Modal"
          >
            ✕
          </button>
        </div>

        {/* Sub-header Bar: Available Contracts Status & Capacity */}
        <div className="bg-zinc-950/90 px-4 py-2.5 border-b border-zinc-800 flex justify-between items-center text-xs font-mono shrink-0">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-purple-300">
              Available Contracts ({availableBounties.length})
            </span>
            <span className="text-[10px] text-zinc-500 hidden sm:inline">
              • Active bounties & claims tracked in [Log & Chat]
            </span>
          </div>

          <div className="text-zinc-400">
            Active Capacity:{' '}
            <span className={`font-bold ${activeBounties.length >= 3 ? 'text-red-400' : 'text-amber-300'}`}>
              {activeBounties.length}/3 Max
            </span>
          </div>
        </div>

        {/* Bounty Scrollable Content List (Strictly Available Contracts) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {availableBounties.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 font-mono space-y-2">
              <div className="text-3xl">🕊️</div>
              <div className="text-sm font-bold text-zinc-400">Notice Board Cleared!</div>
              <p className="text-xs max-w-sm mx-auto">
                No new bounties matching your current Act and Power Rating ({playerPower}). Level up or advance to higher expedition zones to unlock new bounties.
              </p>
            </div>
          ) : (
            availableBounties.map((bounty) => {
              const bPower = getBountyPower(bounty);
              const cowrieReward = bounty.rewardCowries ?? bounty.rewardCC ?? 100;
              return (
                <div
                  key={bounty.id}
                  className="bg-zinc-950 border border-zinc-800 hover:border-purple-600/60 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all shadow-md"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold font-serif text-purple-300">
                        {bounty.title}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800/40">
                        Target Power: ~{bPower}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-300 font-mono">
                      Target: <strong className="text-amber-200">{bounty.targetMonsterName}</strong> (Slay {bounty.targetCount}x)
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 flex items-center space-x-3">
                      <span className="text-amber-400 font-bold">💰 {formatCostInCowries(cowrieReward)}</span>
                      <span className="text-cyan-400">⚡ +{bounty.rewardExp} EXP</span>
                      {bounty.rewardMemoryRarity && (
                        <span className="text-purple-400 font-bold">🔮 {bounty.rewardMemoryRarity} Memory</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAcceptBounty(bounty.id)}
                    disabled={activeBounties.length >= 3}
                    className={`w-full sm:w-auto px-4 py-2 rounded-lg font-mono font-bold text-xs uppercase tracking-wider transition-all shadow shrink-0 ${
                      activeBounties.length >= 3
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                        : 'bg-purple-600 hover:bg-purple-500 text-white active:scale-95'
                    }`}
                  >
                    {activeBounties.length >= 3 ? 'Cap Reached (3/3)' : 'Accept Contract'}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-zinc-950 px-4 py-2.5 border-t border-zinc-800 flex justify-between items-center text-xs font-mono shrink-0">
          <div className="text-zinc-500">
            Player Power: <span className="text-purple-300 font-bold">{playerPower}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-mono"
          >
            Close Notice Board
          </button>
        </div>
      </div>
    </div>
  );
};
export default BountyNoticeBoardModal;

