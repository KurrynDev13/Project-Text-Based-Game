import React, { useState } from 'react';
import { getSkillsByClass, ALL_SKILLS } from '../data/skillsData';
import { PlayerCharacter, Skill, HeroClass } from '../types/game';

// =============================================================================
// MAHARLIKA: LEGENDS OF THE ARCHIPELAGO — Skill Tree View
// Shown in the Hero panel; supports unlock, equip, and loadout management.
// =============================================================================

interface SkillTreeViewProps {
  player: PlayerCharacter;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
}

// Tier metadata
const TIER_LABELS: Record<number, string> = {
  1: 'Tier 1 (Basic)',
  2: 'Tier 2 (Adept)',
  3: 'Tier 3 (Master)',
  4: 'Tier 4 (Legendary)',
};

// SkillStatusBadge — small pill indicating the skill's current status
const SkillStatusBadge: React.FC<{
  skill: Skill;
  unlocked: boolean;
  equipped: boolean;
}> = ({ skill, unlocked, equipped }) => {
  if (equipped) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
        Equipped
      </span>
    );
  }
  if (unlocked) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-600/40 text-zinc-300 border border-zinc-500/40">
        Unlocked
      </span>
    );
  }
  if (skill.isBasicAttack || skill.isDefaultUnlocked) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
        Basic
      </span>
    );
  }
  return (
    <span className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-800/60 text-zinc-500 border border-zinc-700/40">
      Locked
    </span>
  );
};

// TierBadge — displayed in the detail panel
const TierBadge: React.FC<{ tier: number }> = ({ tier }) => {
  const colours: Record<number, string> = {
    1: 'bg-zinc-700 text-zinc-300',
    2: 'bg-sky-900/60 text-sky-300',
    3: 'bg-purple-900/60 text-purple-300',
    4: 'bg-amber-900/60 text-amber-300',
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colours[tier] ?? colours[1]}`}
    >
      {TIER_LABELS[tier] ?? `Tier ${tier}`}
    </span>
  );
};

// =============================================================================
// Main Component
// =============================================================================
const SkillTreeView: React.FC<SkillTreeViewProps> = ({ player, onUpdatePlayer }) => {
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  const heroClass = player.heroClass as HeroClass;
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
    if (player.wallet.mutyaShards < skill.mutyaCost) return;
    if (unlockedSkillIds.includes(skill.id)) return;

    const updated: PlayerCharacter = {
      ...player,
      wallet: {
        ...player.wallet,
        mutyaShards: player.wallet.mutyaShards - skill.mutyaCost,
        prismaticShards: player.wallet.prismaticShards - skill.mutyaCost,
      },
      unlockedSkillIds: [...unlockedSkillIds, skill.id],
    };
    onUpdatePlayer(updated);
    setSelectedSkill({ ...skill }); // keep detail open, reflect new state
  };

  const handleEquipSkill = (skill: Skill) => {
    const isEquipped = equippedSkillIds.includes(skill.id);
    let newEquipped: string[];

    if (isEquipped) {
      // Unequip
      newEquipped = equippedSkillIds.filter((id) => id !== skill.id);
    } else {
      // Equip — max 3 slots
      if (equippedSkillIds.length >= 3) return;
      newEquipped = [...equippedSkillIds, skill.id];
    }

    onUpdatePlayer({ ...player, equippedSkillIds: newEquipped });
    setSelectedSkill({ ...skill });
  };

  // -------------------------------------------------------------------------
  // Detail Panel
  // -------------------------------------------------------------------------
  const renderDetailPanel = () => {
    if (!selectedSkill) return null;

    const skill = selectedSkill;
    const isUnlocked =
      unlockedSkillIds.includes(skill.id) ||
      skill.isDefaultUnlocked ||
      skill.isBasicAttack;
    const isEquipped = equippedSkillIds.includes(skill.id);
    const isDefault = !!(skill.isBasicAttack || skill.isDefaultUnlocked);
    const canAfford = player.wallet.mutyaShards >= skill.mutyaCost;
    const loadoutFull = equippedSkillIds.length >= 3;

    return (
      <div className="flex flex-col gap-3 p-4 bg-zinc-900/80 border border-zinc-700/60 rounded-xl">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="text-4xl">{skill.icon}</span>
          <div className="flex flex-col gap-1">
            <span className="font-serif text-lg text-amber-100 leading-tight">{skill.name}</span>
            <TierBadge tier={skill.tier} />
          </div>
          <button
            onClick={() => setSelectedSkill(null)}
            className="ml-auto text-zinc-500 hover:text-zinc-300 text-xl leading-none"
            aria-label="Close detail panel"
          >
            ✕
          </button>
        </div>

        {/* Flavor text */}
        <p className="italic text-amber-300 text-sm border-l-2 border-amber-500/40 pl-3">
          "{skill.flavorText}"
        </p>

        {/* Description */}
        <p className="text-zinc-300 text-sm leading-relaxed">{skill.description}</p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-400">
          <span>
            <span className="text-zinc-500">MP Cost:</span>{' '}
            <span className="text-sky-300">{skill.mpCost}</span>
          </span>
          <span>
            <span className="text-zinc-500">Damage Type:</span>{' '}
            <span className="text-rose-300">{skill.damageType}</span>
          </span>
          {skill.baseDamageMultiplier > 0 && (
            <span>
              <span className="text-zinc-500">Damage Mult:</span>{' '}
              <span className="text-orange-300">×{skill.baseDamageMultiplier.toFixed(1)}</span>
            </span>
          )}
          {skill.healsPercent !== undefined && skill.healsPercent > 0 && (
            <span>
              <span className="text-zinc-500">Heals:</span>{' '}
              <span className="text-green-300">{(skill.healsPercent * 100).toFixed(0)}% Max HP</span>
            </span>
          )}
          {skill.shieldPercent !== undefined && skill.shieldPercent > 0 && (
            <span>
              <span className="text-zinc-500">Shield:</span>{' '}
              <span className="text-blue-300">{(skill.shieldPercent * 100).toFixed(0)}% Max HP</span>
            </span>
          )}
          {skill.mutyaCost > 0 && (
            <span>
              <span className="text-zinc-500">Mutya Cost:</span>{' '}
              <span className={canAfford ? 'text-amber-300' : 'text-rose-400'}>
                💎 {skill.mutyaCost}
              </span>
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 mt-1">
          {/* Case 1: default/basic skill already unlocked */}
          {isDefault && unlockedSkillIds.includes(skill.id) && (
            <button
              disabled
              className="w-full py-2 rounded-lg text-sm bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed"
            >
              Default Skill (Always Active)
            </button>
          )}

          {/* Case 2: not yet unlocked (non-default) */}
          {!isUnlocked && (
            <button
              onClick={() => handleUnlockSkill(skill)}
              disabled={!canAfford}
              className={`w-full py-2 rounded-lg text-sm font-semibold border transition-colors ${
                canAfford
                  ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500'
                  : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
              }`}
            >
              Unlock Skill ({skill.mutyaCost} Mutya)
            </button>
          )}

          {/* Case 3/4: unlocked — equip / unequip (skip for default skills that are shown above) */}
          {isUnlocked && !(isDefault && unlockedSkillIds.includes(skill.id)) && (
            <>
              {isEquipped ? (
                <button
                  onClick={() => handleEquipSkill(skill)}
                  className="w-full py-2 rounded-lg text-sm font-semibold bg-zinc-700 hover:bg-zinc-600 text-zinc-200 border border-zinc-500 transition-colors"
                >
                  Unequip from Loadout
                </button>
              ) : (
                <button
                  onClick={() => handleEquipSkill(skill)}
                  disabled={loadoutFull}
                  className={`w-full py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    loadoutFull
                      ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                      : 'bg-sky-700 hover:bg-sky-600 text-white border-sky-500'
                  }`}
                >
                  {loadoutFull ? 'Loadout Full (max 3)' : 'Equip to Loadout'}
                </button>
              )}
            </>
          )}

          {/* Unlocked default skills that aren't the basic attack can also be equipped */}
          {isDefault && !skill.isBasicAttack && isUnlocked && !unlockedSkillIds.includes(skill.id) && (
            <>
              {isEquipped ? (
                <button
                  onClick={() => handleEquipSkill(skill)}
                  className="w-full py-2 rounded-lg text-sm font-semibold bg-zinc-700 hover:bg-zinc-600 text-zinc-200 border border-zinc-500 transition-colors"
                >
                  Unequip from Loadout
                </button>
              ) : (
                <button
                  onClick={() => handleEquipSkill(skill)}
                  disabled={loadoutFull}
                  className={`w-full py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    loadoutFull
                      ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                      : 'bg-sky-700 hover:bg-sky-600 text-white border-sky-500'
                  }`}
                >
                  {loadoutFull ? 'Loadout Full (max 3)' : 'Equip to Loadout'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Equipped Loadout Bar (bottom)
  // -------------------------------------------------------------------------
  const renderLoadoutBar = () => {
    const slots = [0, 1, 2];
    return (
      <div className="mt-4 p-3 bg-zinc-900/60 border border-amber-700/30 rounded-xl">
        <p className="text-xs text-amber-400 font-semibold mb-2 tracking-wide uppercase">
          Equipped Loadout
        </p>
        <div className="flex gap-2">
          {slots.map((i) => {
            const skillId = equippedSkillIds[i];
            const skill = skillId ? ALL_SKILLS.find((s) => s.id === skillId) : null;
            return (
              <button
                key={i}
                onClick={() => skill && handleEquipSkill(skill)}
                title={skill ? `Remove ${skill.name} from loadout` : 'Empty slot'}
                className={`flex-1 h-12 flex flex-col items-center justify-center rounded-lg border transition-colors ${
                  skill
                    ? 'bg-amber-900/20 border-amber-500/50 hover:bg-red-900/30 hover:border-red-500/50 cursor-pointer'
                    : 'bg-zinc-800/40 border-zinc-700/40 cursor-default'
                }`}
              >
                {skill ? (
                  <>
                    <span className="text-xl leading-none">{skill.icon}</span>
                    <span className="text-[10px] text-amber-300 truncate max-w-full px-1 leading-tight">
                      {skill.name}
                    </span>
                  </>
                ) : (
                  <span className="text-zinc-600 text-lg">＋</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-4">
      {/* Top info bar */}
      <div className="flex flex-wrap items-center gap-3 px-1 text-sm">
        <span className="text-amber-300 font-semibold">
          💎 {player.wallet.mutyaShards} Mutya
        </span>
        <span className="text-zinc-400">|</span>
        <span className="text-zinc-300">
          Skills Equipped:{' '}
          <span className="text-amber-200 font-semibold">
            {equippedSkillIds.length} / 3
          </span>
        </span>
        <span className="text-zinc-400">|</span>
        <span className="text-sky-300 font-semibold">{heroClass}</span>
      </div>

      {/* Title */}
      <h2 className="font-serif text-xl text-amber-100">
        {heroClass} Skill Tree
      </h2>

      {/* Two-column layout on desktop */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Skill tier rows */}
        <div className="flex-1 flex flex-col gap-4">
          {tiers.map((tier, tierIdx) => {
            const tierSkills = tierMap.get(tier) ?? [];
            if (tierSkills.length === 0) return null;
            return (
              <div key={tier}>
                {/* Divider between tiers (not before the first one) */}
                {tierIdx > 0 && (
                  <div className="border-t border-zinc-700/40 mb-4" />
                )}

                {/* Tier label */}
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-widest mb-2">
                  {TIER_LABELS[tier]}
                </p>

                {/* Skill cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tierSkills.map((skill) => {
                    const isUnlocked =
                      unlockedSkillIds.includes(skill.id) ||
                      !!(skill.isDefaultUnlocked || skill.isBasicAttack);
                    const isEquipped = equippedSkillIds.includes(skill.id);
                    const isSelected = selectedSkill?.id === skill.id;

                    return (
                      <button
                        key={skill.id}
                        onClick={() =>
                          setSelectedSkill(isSelected ? null : skill)
                        }
                        className={`
                          min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-lg border text-left
                          transition-all duration-150
                          ${!isUnlocked ? 'opacity-50' : ''}
                          ${
                            isEquipped
                              ? 'border-amber-500/60 bg-amber-900/20 shadow-[0_0_8px_rgba(251,191,36,0.2)]'
                              : isUnlocked
                              ? 'border-zinc-600/50 bg-zinc-800/40 hover:bg-zinc-700/40'
                              : 'border-zinc-700/40 bg-zinc-800/20 hover:bg-zinc-800/40'
                          }
                          ${isSelected ? 'ring-1 ring-sky-500/60' : ''}
                        `}
                      >
                        {/* Icon */}
                        <span className="text-2xl flex-shrink-0">{skill.icon}</span>

                        {/* Name + badge */}
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-sm text-zinc-100 truncate leading-tight">
                            {skill.name}
                          </span>
                          <SkillStatusBadge
                            skill={skill}
                            unlocked={isUnlocked}
                            equipped={isEquipped}
                          />
                        </div>

                        {/* Lock icon for locked skills */}
                        {!isUnlocked && (
                          <span className="ml-auto text-zinc-600 flex-shrink-0">🔒</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Equipped loadout bar */}
          {renderLoadoutBar()}
        </div>

        {/* Detail panel — sidebar on desktop, bottom-sheet feel on mobile */}
        {selectedSkill && (
          <div className="lg:w-72 xl:w-80 flex-shrink-0">
            {renderDetailPanel()}
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillTreeView;
