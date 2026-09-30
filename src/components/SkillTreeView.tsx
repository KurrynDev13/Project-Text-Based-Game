import React, { useState } from 'react';
import {
  getSkillsByClass,
  ALL_SKILLS,
  getSkillRank,
  getSkillUpgradeCost,
  getScaledSkillDamageMult,
  getScaledSkillHeal,
  getScaledSkillShield,
} from '../data/skillsData';
import { PlayerCharacter, Skill, HeroClass } from '../types/game';

// =============================================================================
// MAHARLIKA: LEGENDS OF THE ARCHIPELAGO — Skill Tree View
// Features: Top loadout bar, inline accordion cards, level gating & Mutya upgrades
// =============================================================================

interface SkillTreeViewProps {
  player: PlayerCharacter;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
}

// Tier metadata with minimum level requirements
const TIER_META: Record<number, { label: string; minLevel: number }> = {
  1: { label: 'Tier 1 (Basic)', minLevel: 1 },
  2: { label: 'Tier 2 (Adept)', minLevel: 8 },
  3: { label: 'Tier 3 (Master)', minLevel: 16 },
  4: { label: 'Tier 4 (Legendary)', minLevel: 25 },
};

const SkillStatusBadge: React.FC<{
  skill: Skill;
  unlocked: boolean;
  equipped: boolean;
  levelLocked: boolean;
}> = ({ skill, unlocked, equipped, levelLocked }) => {
  if (equipped) {
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
        Equipped
      </span>
    );
  }
  if (levelLocked) {
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-950/40 text-rose-300 border border-rose-800/40">
        🔒 Lv {skill.minLevel ?? 1} Req
      </span>
    );
  }
  if (unlocked) {
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
        Unlocked
      </span>
    );
  }
  if (skill.isBasicAttack || skill.isDefaultUnlocked) {
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
        Basic
      </span>
    );
  }
  return (
    <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800/60 text-zinc-400 border border-zinc-700/40">
      Locked
    </span>
  );
};

const StarRating: React.FC<{ rank: number }> = ({ rank }) => {
  return (
    <div className="flex items-center gap-0.5 text-amber-400 text-sm">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star}>{star <= rank ? '★' : '☆'}</span>
      ))}
    </div>
  );
};

const SkillTreeView: React.FC<SkillTreeViewProps> = ({ player, onUpdatePlayer }) => {
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);

  const heroClass = (player.heroClass || 'Mandirigma') as HeroClass;
  const skills = getSkillsByClass(heroClass);
  const classSkillIds = new Set(skills.map((s) => s.id));

  const unlockedSkillIds: string[] = Array.from(new Set(player.unlockedSkillIds ?? []));
  const equippedSkillIds: string[] = Array.from(
    new Set((player.equippedSkillIds ?? []).filter((id) => classSkillIds.has(id)))
  );

  // Group skills by tier
  const tierMap = new Map<number, Skill[]>();
  skills.forEach((skill) => {
    if (!tierMap.has(skill.tier)) tierMap.set(skill.tier, []);
    tierMap.get(skill.tier)!.push(skill);
  });
  const tiers = [1, 2, 3, 4];

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleUnlockSkill = (skill: Skill) => {
    const minLevel = skill.minLevel ?? 1;
    if (player.level < minLevel) return;
    if (player.wallet.mutyaShards < skill.mutyaCost) return;
    if (unlockedSkillIds.includes(skill.id)) return;

    const updated: PlayerCharacter = {
      ...player,
      wallet: {
        ...player.wallet,
        mutyaShards: player.wallet.mutyaShards - skill.mutyaCost,
        prismaticShards: Math.max(0, (player.wallet.prismaticShards || player.wallet.mutyaShards) - skill.mutyaCost),
      },
      unlockedSkillIds: [...unlockedSkillIds, skill.id],
    };
    onUpdatePlayer(updated);
  };

  const handleUpgradeSkill = (skill: Skill) => {
    const currentRank = getSkillRank(player, skill.id);
    if (currentRank >= 5) return;
    const cost = getSkillUpgradeCost(currentRank);
    if (player.wallet.mutyaShards < cost) return;

    const newRanks = {
      ...(player.skillRanks ?? {}),
      [skill.id]: currentRank + 1,
    };

    const updated: PlayerCharacter = {
      ...player,
      wallet: {
        ...player.wallet,
        mutyaShards: player.wallet.mutyaShards - cost,
        prismaticShards: Math.max(0, (player.wallet.prismaticShards || player.wallet.mutyaShards) - cost),
      },
      skillRanks: newRanks,
    };
    onUpdatePlayer(updated);
  };

  const handleEquipSkill = (skill: Skill) => {
    const isEquipped = equippedSkillIds.includes(skill.id);
    let newEquipped: string[];

    if (isEquipped) {
      newEquipped = equippedSkillIds.filter((id) => id !== skill.id);
    } else {
      if (equippedSkillIds.length >= 3) return;
      newEquipped = [...equippedSkillIds, skill.id];
    }

    onUpdatePlayer({ ...player, equippedSkillIds: newEquipped });
  };

  // -------------------------------------------------------------------------
  // Top Loadout Bar (Moved to the very top for instant access)
  // -------------------------------------------------------------------------
  const renderTopLoadoutBar = () => {
    const slots = [0, 1, 2];
    return (
      <div className="p-3 bg-zinc-900/80 border border-amber-500/30 rounded-xl shadow-inner">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-amber-400 font-semibold tracking-wide uppercase flex items-center gap-1.5">
            <span>⚡</span> Equipped Active Loadout ({equippedSkillIds.length}/3)
          </p>
          <span className="text-[11px] text-zinc-400">Tap slot to unequip</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {slots.map((i) => {
            const skillId = equippedSkillIds[i];
            const skill = skillId ? ALL_SKILLS.find((s) => s.id === skillId) : null;
            const rank = skill ? getSkillRank(player, skill.id) : 1;
            return (
              <button
                key={i}
                onClick={() => skill && handleEquipSkill(skill)}
                title={skill ? `Remove ${skill.name} from loadout` : 'Empty combat slot'}
                className={`h-14 flex flex-col items-center justify-center rounded-lg border transition-all ${
                  skill
                    ? 'bg-amber-950/30 border-amber-500/50 hover:bg-red-950/40 hover:border-red-500/60 cursor-pointer shadow-[0_0_6px_rgba(245,158,11,0.15)]'
                    : 'bg-zinc-800/30 border-zinc-700/40 cursor-default'
                }`}
              >
                {skill ? (
                  <>
                    <div className="flex items-center gap-1">
                      <span className="text-xl leading-none">{skill.icon}</span>
                      {rank > 1 && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 rounded border border-amber-500/30 font-bold">
                          R{rank}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-amber-200 truncate max-w-full px-1 font-medium leading-tight mt-0.5">
                      {skill.name}
                    </span>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-zinc-500">
                    <span className="text-base font-bold leading-none">+</span>
                    <span className="text-[10px]">Slot {i + 1}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Inline Accordion Card Details Component
  // -------------------------------------------------------------------------
  const renderInlineCardDetails = (skill: Skill) => {
    const minLevel = skill.minLevel ?? 1;
    const isLevelLocked = player.level < minLevel;

    // Hide details completely if level requirement is not reached
    if (isLevelLocked) {
      return (
        <div className="mt-3 pt-3 border-t border-zinc-800 flex flex-col gap-2 text-left">
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-start gap-2.5">
            <span className="text-base flex-shrink-0">🔒</span>
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-rose-200">Requires Hero Level {minLevel}</span>
              <span className="text-zinc-400 text-[11px] leading-relaxed">
                The ancient technique and combat secrets of this skill remain locked until you reach Hero Level {minLevel}. (Your Level: {player.level})
              </span>
            </div>
          </div>
        </div>
      );
    }

    const isUnlocked =
      unlockedSkillIds.includes(skill.id) ||
      skill.isDefaultUnlocked ||
      skill.isBasicAttack;
    const isEquipped = equippedSkillIds.includes(skill.id);
    const isDefault = !!(skill.isBasicAttack || skill.isDefaultUnlocked);

    const rank = getSkillRank(player, skill.id);
    const upgradeCost = getSkillUpgradeCost(rank);
    const canAffordUnlock = player.wallet.mutyaShards >= skill.mutyaCost;
    const canAffordUpgrade = player.wallet.mutyaShards >= upgradeCost;
    const loadoutFull = equippedSkillIds.length >= 3;

    const scaledMult = getScaledSkillDamageMult(skill, rank);
    const scaledHeal = getScaledSkillHeal(skill, rank);
    const scaledShield = getScaledSkillShield(skill, rank);

    const nextScaledMult = rank < 5 ? getScaledSkillDamageMult(skill, rank + 1) : scaledMult;
    const nextScaledHeal = rank < 5 ? getScaledSkillHeal(skill, rank + 1) : scaledHeal;
    const nextScaledShield = rank < 5 ? getScaledSkillShield(skill, rank + 1) : scaledShield;

    return (
      <div className="mt-3 pt-3 border-t border-zinc-700/60 flex flex-col gap-3 text-left">
        {/* Lore Quote */}
        <p className="italic text-amber-300 text-xs border-l-2 border-amber-500/40 pl-2.5 py-0.5">
          "{skill.flavorText}"
        </p>

        {/* Skill Description */}
        <p className="text-zinc-300 text-xs leading-relaxed">{skill.description}</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs">
          <div>
            <span className="text-zinc-500">MP Cost:</span>{' '}
            <span className="text-sky-300 font-semibold">{skill.mpCost}</span>
          </div>
          <div>
            <span className="text-zinc-500">Type:</span>{' '}
            <span className="text-rose-300 font-semibold">{skill.damageType}</span>
          </div>

          {skill.baseDamageMultiplier > 0 && (
            <div className="col-span-2 flex items-center justify-between">
              <span className="text-zinc-500">Damage Multiplier:</span>
              <span className="text-orange-300 font-bold">
                ×{scaledMult.toFixed(2)}{' '}
                {rank > 1 && <span className="text-[10px] text-amber-400">({(1 + (rank - 1) * 0.15) * 100}% Base)</span>}
              </span>
            </div>
          )}

          {skill.healsPercent !== undefined && skill.healsPercent > 0 && (
            <div className="col-span-2 flex items-center justify-between">
              <span className="text-zinc-500">Healing Power:</span>
              <span className="text-emerald-300 font-bold">
                {(scaledHeal * 100).toFixed(1)}% Max HP
              </span>
            </div>
          )}

          {skill.shieldPercent !== undefined && skill.shieldPercent > 0 && (
            <div className="col-span-2 flex items-center justify-between">
              <span className="text-zinc-500">Shield Barrier:</span>
              <span className="text-blue-300 font-bold">
                {(scaledShield * 100).toFixed(1)}% Max HP
              </span>
            </div>
          )}
        </div>

        {/* Mutya Skill Rank Upgrade Section (Available for Unlocked Skills) */}
        {isUnlocked && (
          <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-600/30 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-200 uppercase tracking-wide">
                  Skill Rank {rank}/5
                </span>
                <StarRating rank={rank} />
              </div>
              {rank >= 5 ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  MAX RANK
                </span>
              ) : (
                <span className="text-[11px] text-amber-300/80">
                  +15% Power per Rank
                </span>
              )}
            </div>

            {rank < 5 && (
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                  <span>Next Rank ({rank + 1}):</span>
                  <span className="text-amber-300">
                    {skill.baseDamageMultiplier > 0 && `Mult: ×${nextScaledMult.toFixed(2)} `}
                    {skill.healsPercent && `Heal: ${(nextScaledHeal * 100).toFixed(1)}% `}
                    {skill.shieldPercent && `Shield: ${(nextScaledShield * 100).toFixed(1)}%`}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpgradeSkill(skill);
                  }}
                  disabled={!canAffordUpgrade}
                  className={`w-full py-1.5 px-3 rounded-md text-xs font-bold border transition-all ${
                    canAffordUpgrade
                      ? 'bg-amber-600 hover:bg-amber-500 text-amber-950 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                  }`}
                >
                  Upgrade to Rank {rank + 1} (Costs 💎 {upgradeCost} Mutya)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons: Unlock / Equip / Unequip */}
        <div className="flex flex-col gap-2 mt-1">
          {/* Default Basic Attack */}
          {isDefault && skill.isBasicAttack && (
            <button
              disabled
              className="w-full py-2 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed"
            >
              Default Skill (Always Active in Combat)
            </button>
          )}

          {/* Not Yet Unlocked */}
          {!isUnlocked && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUnlockSkill(skill);
              }}
              disabled={!canAffordUnlock}
              className={`w-full py-2 rounded-lg text-xs font-bold border transition-colors ${
                canAffordUnlock
                  ? 'bg-amber-600 hover:bg-amber-500 text-amber-950 border-amber-400 shadow-md'
                  : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
              }`}
            >
              {canAffordUnlock
                ? `Unlock Skill (Costs 💎 ${skill.mutyaCost} Mutya)`
                : `Insufficient Mutya (Requires 💎 ${skill.mutyaCost})`}
            </button>
          )}

          {/* Unlocked Skill: Equip / Unequip */}
          {isUnlocked && !skill.isBasicAttack && (
            <>
              {isEquipped ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEquipSkill(skill);
                  }}
                  className="w-full py-2 rounded-lg text-xs font-semibold bg-zinc-700 hover:bg-zinc-600 text-zinc-100 border border-zinc-500 transition-colors"
                >
                  Unequip from Loadout Slot
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEquipSkill(skill);
                  }}
                  disabled={loadoutFull}
                  className={`w-full py-2 rounded-lg text-xs font-bold border transition-colors ${
                    loadoutFull
                      ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                      : 'bg-sky-600 hover:bg-sky-500 text-white border-sky-400 shadow-md'
                  }`}
                >
                  {loadoutFull ? 'Loadout Full (Max 3 Active Skills)' : 'Equip to Active Loadout'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Main Render
  // -------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-4">
      {/* Top info bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs sm:text-sm bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
        <span className="text-amber-300 font-bold flex items-center gap-1">
          💎 {player.wallet.mutyaShards} Mutya Pearl Shards
        </span>
        <span className="text-zinc-400">|</span>
        <span className="text-zinc-300">
          Equipped:{' '}
          <span className="text-amber-300 font-bold">
            {equippedSkillIds.length} / 3
          </span>
        </span>
        <span className="text-zinc-400">|</span>
        <span className="text-sky-300 font-bold">{heroClass}</span>
      </div>

      {/* Relocated Equipped Loadout Bar at the TOP */}
      {renderTopLoadoutBar()}

      {/* Title */}
      <div className="flex items-center justify-between border-b border-amber-900/40 pb-2">
        <h2 className="font-serif text-xl text-amber-100 flex items-center gap-2">
          <span>📜</span> {heroClass} Mutya Skills
        </h2>
        <span className="text-xs text-zinc-400">Tap card to expand details</span>
      </div>

      {/* Skill Tier Rows with Mobile Accordion Cards */}
      <div className="flex flex-col gap-4">
        {tiers.map((tier, tierIdx) => {
          const tierSkills = tierMap.get(tier) ?? [];
          if (tierSkills.length === 0) return null;
          const meta = TIER_META[tier];
          const isTierLevelLocked = player.level < meta.minLevel;

          return (
            <div key={tier} className="flex flex-col gap-2">
              {tierIdx > 0 && <div className="border-t border-zinc-800/80 my-1" />}

              {/* Tier Header with Level Gate Badge */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-amber-400/90 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span>{meta.label}</span>
                </p>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                    isTierLevelLocked
                      ? 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {isTierLevelLocked ? `🔒 Requires Level ${meta.minLevel}` : `Unlocked at Lv ${meta.minLevel}`}
                </span>
              </div>

              {/* Skill Cards Grid (Card expands inline when tapped; items-start prevents neighbor stretching) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-start">
                {tierSkills.map((skill) => {
                  const isUnlocked =
                    unlockedSkillIds.includes(skill.id) ||
                    !!(skill.isDefaultUnlocked || skill.isBasicAttack);
                  const isEquipped = equippedSkillIds.includes(skill.id);
                  const isExpanded = expandedSkillId === skill.id;
                  const minLevel = skill.minLevel ?? 1;
                  const isLevelLocked = player.level < minLevel;
                  const rank = getSkillRank(player, skill.id);

                  return (
                    <div
                      key={skill.id}
                      onClick={() => setExpandedSkillId(isExpanded ? null : skill.id)}
                      className={`
                        flex flex-col p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer
                        ${!isUnlocked && isLevelLocked ? 'bg-zinc-900/40 border-zinc-800 opacity-60' : ''}
                        ${!isUnlocked && !isLevelLocked ? 'bg-zinc-900/70 border-zinc-700/60 hover:border-zinc-500' : ''}
                        ${
                          isUnlocked && isEquipped
                            ? 'bg-amber-950/20 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                            : isUnlocked
                            ? 'bg-zinc-900/90 border-zinc-700/70 hover:border-amber-500/40'
                            : ''
                        }
                        ${isExpanded ? 'ring-2 ring-amber-500/70 shadow-lg' : ''}
                      `}
                    >
                      {/* Card Header Row */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-3xl flex-shrink-0">{skill.icon}</span>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-serif text-sm font-bold text-amber-100 truncate">
                                {skill.name}
                              </span>
                              {isUnlocked && rank > 1 && (
                                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded border border-amber-500/30 font-bold">
                                  R{rank}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <SkillStatusBadge
                                skill={skill}
                                unlocked={isUnlocked}
                                equipped={isEquipped}
                                levelLocked={isLevelLocked}
                              />
                              <span className="text-[11px] text-sky-300 font-medium">
                                {skill.mpCost} MP
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Chevron toggle indicator */}
                        <span className="text-zinc-400 text-sm flex-shrink-0 font-bold">
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>

                      {/* Inline Accordion Details (renders right below card header when tapped) */}
                      {isExpanded && renderInlineCardDetails(skill)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SkillTreeView;

