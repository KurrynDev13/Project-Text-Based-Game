import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PlayerCharacter, Skill } from '../types/game';
import {
  getSkillRank,
  getSkillUpgradeCostSP,
  getScaledSkillDamageMult,
  getScaledSkillHeal,
  getScaledSkillBarrier,
  checkSkillGating,
} from '../data/skillsData';
import { soundFX } from '../utils/audio';
import { registerBackHandler } from '../utils/navigationStack';

interface SkillInspectorModalProps {
  skill: Skill | null;
  onClose: () => void;
  player: PlayerCharacter;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error', icon?: string) => void;
  highlightedTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
}

export const SkillInspectorModal: React.FC<SkillInspectorModalProps> = ({
  skill,
  onClose,
  player,
  onUpdatePlayer,
  onShowToast,
  highlightedTag,
  onSelectTag,
}) => {
  if (!skill) return null;

  const unlockedSkillIds = player.unlockedSkillIds ?? [];
  const equippedSkillIds = player.equippedSkillIds ?? [];

  useEffect(() => {
    return registerBackHandler(() => {
      onClose();
      return true;
    });
  }, [onClose]);

  const currentRank = getSkillRank(player, skill.id);
  const maxRank = skill.maxRank ?? (skill.type === 'PASSIVE' ? 1 : 5);
  const isUnlocked = currentRank > 0;
  const isEquipped = equippedSkillIds.includes(skill.id);

  // Check strict tree gating
  const gating = checkSkillGating(skill, player);
  const isLocked = gating.isLocked && currentRank === 0;

  const isMaxRank = currentRank >= maxRank;
  const spCost = getSkillUpgradeCostSP(skill, currentRank);
  const hasEnoughSP = (player.skillPoints ?? 0) >= spCost;

  // Handle Learn / Upgrade using Skill Points (SP)
  const handleUpgrade = () => {
    if (isLocked) {
      onShowToast?.(`🔒 ${gating.reason || 'Requirements not met!'}`, 'warning', '🔒');
      return;
    }
    if (isMaxRank) {
      onShowToast?.(`✨ ${skill.name} is already at Maximum Rank!`, 'info', '⭐');
      return;
    }
    if (!hasEnoughSP) {
      onShowToast?.(`❌ Insufficient Skill Points! Need ${spCost} SP.`, 'error', '⚡');
      return;
    }

    soundFX.playLevelUpSound?.();
    const newSP = (player.skillPoints ?? 0) - spCost;
    const newUnlocked = isUnlocked
      ? unlockedSkillIds
      : Array.from(new Set([...unlockedSkillIds, skill.id]));

    const newRanks = {
      ...(player.skillRanks ?? {}),
      [skill.id]: currentRank + 1,
    };

    const updated: PlayerCharacter = {
      ...player,
      skillPoints: newSP,
      unlockedSkillIds: newUnlocked,
      skillRanks: newRanks,
    };

    onUpdatePlayer(updated);
    onShowToast?.(
      currentRank === 0
        ? `🎉 Mastered [${skill.name}]! (Rank 1/${maxRank})`
        : `⚡ Upgraded [${skill.name}] to Rank ${currentRank + 1}/${maxRank}!`,
      'success',
      '✨'
    );
  };

  // Handle Equip to a specific combat slot (0, 1, or 2)
  const handleEquipToSlot = (targetSlot: number) => {
    if (skill.type === 'PASSIVE') {
      onShowToast?.(`Passive keystones are always active and do not occupy combat slots.`, 'info', '🛡️');
      return;
    }
    if (!isUnlocked) {
      onShowToast?.(`Learn this skill first with Skill Points!`, 'warning', '🔒');
      return;
    }

    soundFX.playEquipSound?.();
    let currentEquipped = [...equippedSkillIds];

    // If already equipped in another slot, remove it first
    currentEquipped = currentEquipped.filter((id) => id !== skill.id);

    // Pad or place in slot
    while (currentEquipped.length < targetSlot) {
      currentEquipped.push('');
    }
    currentEquipped[targetSlot] = skill.id;

    // Filter out empties and clamp to 3
    const finalEquipped = currentEquipped.filter(Boolean).slice(0, 3);

    onUpdatePlayer({
      ...player,
      equippedSkillIds: finalEquipped,
    });
    onShowToast?.(`⚔️ Assigned [${skill.name}] to Combat Slot ${targetSlot + 1}!`, 'success', '⚔️');
  };

  // Handle Unequip
  const handleUnequip = () => {
    soundFX.playUnequipSound?.();
    const newEquipped = equippedSkillIds.filter((id) => id !== skill.id);
    onUpdatePlayer({
      ...player,
      equippedSkillIds: newEquipped,
    });
    onShowToast?.(`Removed [${skill.name}] from combat loadout.`, 'info', '🛡️');
  };

  // Rank Preview Details
  const currentMult = getScaledSkillDamageMult(skill, currentRank);
  const nextMult = getScaledSkillDamageMult(skill, currentRank + 1);
  const currentHeal = getScaledSkillHeal(skill, currentRank);
  const nextHeal = getScaledSkillHeal(skill, currentRank + 1);
  const currentBarrier = getScaledSkillBarrier(skill, currentRank);
  const nextBarrier = getScaledSkillBarrier(skill, currentRank + 1);

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-stone-900 border border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-4 sm:p-5 border-b border-amber-900/40 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl shadow-lg border ${
                skill.type === 'ACTIVE'
                  ? 'bg-amber-950/60 border-amber-500/70 rotate-0'
                  : 'bg-indigo-950/60 border-indigo-500/70 rounded-full'
              }`}
            >
              {skill.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-amber-100">{skill.name}</h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                    skill.type === 'ACTIVE'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                      : 'bg-indigo-950/80 text-indigo-300 border-indigo-500/50'
                  }`}
                >
                  {skill.type}
                </span>
              </div>
              <p className="text-xs text-amber-400/80 font-medium mt-0.5">
                {skill.pillarName || `Pillar ${skill.pillarId}`} • Tier {skill.tier}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center transition-colors text-base"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs text-stone-300">
          {/* Strict Gating Lock Alert */}
          {isLocked && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-200 flex items-start gap-2.5 shadow-inner">
              <span className="text-xl">🔒</span>
              <div>
                <p className="font-bold text-rose-300 text-xs">LOCKED REQUIREMENT</p>
                <p className="text-xs text-rose-200 font-semibold mt-0.5">
                  {gating.reason}
                </p>
              </div>
            </div>
          )}

          {/* Lore Snippet / Flavor Text */}
          {skill.flavorText && (
            <div className="p-3 rounded-xl bg-stone-950/50 border border-stone-800 italic text-stone-400 text-[11px] leading-relaxed">
              &quot;{skill.flavorText}&quot;
            </div>
          )}

          {/* Description */}
          <div className="p-3 rounded-xl bg-stone-800/40 border border-stone-700/50">
            <h4 className="text-[11px] font-bold uppercase text-amber-400 tracking-wider mb-1">
              Skill Overview
            </h4>
            <p className="text-stone-200 text-xs leading-relaxed">{skill.description}</p>
          </div>

          {/* Mana and Properties Grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-lg bg-stone-800/60 border border-stone-700/60">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Mana Cost</span>
              <span className="text-xs font-bold text-sky-400">
                {skill.mpCost > 0 ? `${skill.mpCost} MP` : 'Passive (0 MP)'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-stone-800/60 border border-stone-700/60">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Cooldown</span>
              <span className="text-xs font-bold text-amber-200">
                {skill.cooldownTurns && skill.cooldownTurns > 0 ? `${skill.cooldownTurns} turns` : 'None'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-stone-800/60 border border-stone-700/60">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Mastery</span>
              <span className="text-xs font-bold text-amber-300">
                Rank {currentRank} / {maxRank}
              </span>
            </div>
          </div>

          {/* Rank Scaling / Next Rank Preview Delta */}
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-amber-400 tracking-wider">
                Rank Scaling & Preview
              </span>
              <span className="text-[11px] text-stone-400">
                {isMaxRank ? 'MAXED' : currentRank === 0 ? 'Rank 1 Preview' : `Next: Rank ${currentRank + 1}`}
              </span>
            </div>

            {/* Damage Delta */}
            {skill.baseDamageMultiplier && skill.baseDamageMultiplier > 0 ? (
              <div className="flex items-center justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-300">Damage Multiplier:</span>
                <span className="font-mono font-bold text-amber-300">
                  {currentRank === 0 ? `${Math.round(skill.baseDamageMultiplier * 100)}% (Base)` : `${Math.round(currentMult * 100)}%`}
                  {!isMaxRank && currentRank > 0 && (
                    <span className="text-emerald-400 ml-1.5 font-normal">
                      → {Math.round(nextMult * 100)}%
                    </span>
                  )}
                </span>
              </div>
            ) : null}

            {/* Heal Delta */}
            {skill.healsPercent && (
              <div className="flex items-center justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-300">Max HP Healing:</span>
                <span className="font-mono font-bold text-emerald-300">
                  {Math.round((currentRank === 0 ? skill.healsPercent : currentHeal) * 100)}%
                  {!isMaxRank && currentRank > 0 && (
                    <span className="text-emerald-400 ml-1.5 font-normal">
                      → {Math.round(nextHeal * 100)}%
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Barrier Delta */}
            {skill.barrierPercent && (
              <div className="flex items-center justify-between py-1 border-b border-stone-800/60">
                <span className="text-stone-300">Barrier Generation:</span>
                <span className="font-mono font-bold text-sky-300">
                  {Math.round((currentRank === 0 ? skill.barrierPercent : currentBarrier) * 100)}% DMG
                  {!isMaxRank && currentRank > 0 && (
                    <span className="text-sky-400 ml-1.5 font-normal">
                      → {Math.round(nextBarrier * 100)}%
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Passive Keystone info */}
            {skill.type === 'PASSIVE' && (
              <div className="text-[11px] text-indigo-300 py-1">
                <span className="font-semibold">Keystone Status: </span>
                {currentRank > 0 ? 'Active (Provides permanent passive boon in combat & attributes)' : 'Unallocated (Costs 1 SP)'}
              </div>
            )}

            {/* Custom Next Rank Preview */}
            {skill.nextRankPreview && !isMaxRank && (
              <div className="text-[11px] text-amber-300/90 pt-1">
                <span className="font-semibold text-amber-200">Rank Bonus: </span>
                {skill.nextRankPreview}
              </div>
            )}
          </div>

          {/* Synergy Tags */}
          {skill.synergyTags && skill.synergyTags.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider">
                  Synergy Tags (Tap to highlight related nodes)
                </span>
                {highlightedTag && (
                  <button
                    onClick={() => onSelectTag?.(null)}
                    className="text-[10px] text-amber-400 hover:underline"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {skill.synergyTags.map((tag) => {
                  const isTagActive = highlightedTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onSelectTag?.(isTagActive ? null : tag)}
                      className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border transition-all ${
                        isTagActive
                          ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                          : 'bg-stone-800/80 text-amber-300/90 border-stone-700 hover:border-amber-500/50'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-stone-800 bg-stone-950/70 space-y-2.5">
          {/* Unlock / Upgrade Button */}
          {!isMaxRank && (
            <div>
              {isLocked ? (
                <div className="w-full py-2.5 px-4 rounded-xl font-serif text-xs font-bold bg-stone-900 border border-rose-900/60 text-rose-400 flex items-center justify-center gap-2 cursor-not-allowed text-center">
                  <span>🔒</span>
                  <span>{gating.reason}</span>
                </div>
              ) : (
                <button
                  onClick={handleUpgrade}
                  disabled={!hasEnoughSP}
                  className={`w-full py-2.5 px-4 rounded-xl font-serif text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                    hasEnoughSP
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-amber-950 border-amber-400 shadow-lg cursor-pointer'
                      : 'bg-stone-800 text-stone-500 border-stone-700 cursor-not-allowed'
                  }`}
                >
                  <span>
                    {skill.type === 'PASSIVE'
                      ? `⚡ Allocate Passive (${spCost} SP)`
                      : currentRank === 0
                      ? `✨ Learn Technique (${spCost} SP)`
                      : `⚡ Rank Up Technique (${spCost} SP)`}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-black/25">
                    {player.skillPoints !== undefined && `${player.skillPoints} SP available`}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Combat Hotbar Assignment (STRICTLY for Active learned skills with rank > 0) */}
          {skill.type === 'ACTIVE' && isUnlocked && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider block text-center">
                Assign to 3-Slot Combat Hotbar
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((slotIdx) => {
                  const isAssignedHere = equippedSkillIds[slotIdx] === skill.id;
                  return (
                    <button
                      key={slotIdx}
                      onClick={() => handleEquipToSlot(slotIdx)}
                      className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all ${
                        isAssignedHere
                          ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-650'
                      }`}
                    >
                      {isAssignedHere ? `Slot ${slotIdx + 1} ✓` : `Slot ${slotIdx + 1}`}
                    </button>
                  );
                })}
              </div>

              {isEquipped && (
                <button
                  onClick={handleUnequip}
                  className="w-full mt-1.5 py-1.5 rounded-lg text-xs text-rose-300 hover:bg-rose-950/30 border border-rose-900/40 transition-colors"
                >
                  Unequip from Active Hotbar
                </button>
              )}
            </div>
          )}

          {/* Close modal button */}
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl text-xs font-semibold bg-stone-850 hover:bg-stone-800 text-stone-400 border border-stone-750 transition-colors"
          >
            ✕ Close
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
export default SkillInspectorModal;

