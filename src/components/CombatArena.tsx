import React, { useState } from 'react';
import { PlayerCharacter, BattleState, BattleLogEntry, EnemyMonster, Skill, StatusEffectType, ActiveStatusEffect, EquipmentItem } from '../types/game';
import { calcDerivedStats, totalCowriesFromWallet, cowriesToWallet } from '../utils/gameFormulas';
import { ALL_SKILLS, getDefaultSkillIds } from '../data/skillsData';
import { soundFX } from '../utils/audio';

interface CombatArenaProps {
  player: PlayerCharacter;
  battle: BattleState;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onUpdateBattle: (updated: BattleState) => void;
  onMonsterKilled: (monster: EnemyMonster) => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error', icon?: string) => void;
}

export const CombatArena: React.FC<CombatArenaProps> = ({
  player,
  battle,
  onUpdatePlayer,
  onUpdateBattle,
  onMonsterKilled,
  onShowToast,
}) => {
  const [selectedPotionId, setSelectedPotionId] = useState<string>('');

  const derived = calcDerivedStats(player.attributes, player.level, player.equipment);

  const addLog = (
    currentLogs: BattleLogEntry[],
    text: string,
    type: BattleLogEntry['type'],
    actor: BattleLogEntry['actor'] = 'SYSTEM'
  ): BattleLogEntry[] => {
    const newEntry: BattleLogEntry = {
      id: `log_${Date.now()}_${Math.random()}`,
      turn: battle.turnNumber,
      actor,
      text,
      type,
    };
    return [newEntry, ...currentLogs.slice(0, 49)];
  };

  /**
   * Handles using an equipped skill in combat.
   * Basic attacks use weapon base damage + derived stat.
   * Non-basic skills apply baseDamageMultiplier on top of weapon + derived stat.
   * Heal skills restore % of maxHp instead of damaging the enemy.
   */
  const handleUseSkill = (skill: Skill) => {
    if (!battle.enemy || !battle.inCombat) return;

    // MP gating
    if (player.currentMp < skill.mpCost) {
      onShowToast?.(`Not enough Mana for ${skill.name}! Need ${skill.mpCost} MP.`, 'warning', '⚡');
      return;
    }

    // Resolve active weapon (new unified slot with backward-compat fallback)
    const activeWeapon = player.equipment.weapon ?? player.equipment.primaryWeapon ?? null;

    let logs = battle.logs;
    const enemy = { ...battle.enemy };

    let updatedPlayer = { ...player, currentMp: player.currentMp - skill.mpCost };

    // Process Active Debuff Ticks on Player at start of turn
    if (updatedPlayer.activeEffects && updatedPlayer.activeEffects.length > 0) {
      const remainingEffects: typeof updatedPlayer.activeEffects = [];

      for (const effect of updatedPlayer.activeEffects) {
        if (!effect.isBuff && effect.durationTurnsLeft > 0) {
          if (effect.type === 'BLEED') {
            const bleedDmg = Math.max(1, Math.floor(derived.maxHp * 0.05));
            updatedPlayer.currentHp = Math.max(0, updatedPlayer.currentHp - bleedDmg);
            logs = addLog(logs, `🩸 Bleed tick: Lost -${bleedDmg} HP (5% Max HP pure physical damage)!`, 'DAMAGE', 'SYSTEM');
          } else if (effect.type === 'POISON') {
            const elapsedTurns = (3 - effect.durationTurnsLeft + 1);
            const poisonDmg = Math.max(2, Math.floor((10 + player.level * 2) * elapsedTurns));
            updatedPlayer.currentHp = Math.max(0, updatedPlayer.currentHp - poisonDmg);
            logs = addLog(logs, `🤢 Poison tick (Turn ${elapsedTurns}): Lost -${poisonDmg} Nature damage!`, 'DAMAGE', 'SYSTEM');
          } else if (effect.type === 'BURN') {
            const burnDmg = Math.max(2, Math.floor(8 + player.level * 1.5));
            updatedPlayer.currentHp = Math.max(0, updatedPlayer.currentHp - burnDmg);
            logs = addLog(logs, `🔥 Burn tick: Lost -${burnDmg} Fire damage (Healing reduced while burning)!`, 'DAMAGE', 'SYSTEM');
          } else if (effect.type === 'EXHAUSTION') {
            logs = addLog(logs, `🌀 Exhausted: Mana regen & Dodge reduced by 15%!`, 'DEBUFF', 'SYSTEM');
          }

          if (effect.durationTurnsLeft - 1 > 0) {
            remainingEffects.push({ ...effect, durationTurnsLeft: effect.durationTurnsLeft - 1 });
          } else {
            logs = addLog(logs, `✨ ${effect.name} status effect expired.`, 'INFO', 'SYSTEM');
          }
        } else {
          remainingEffects.push(effect);
        }
      }
      updatedPlayer.activeEffects = remainingEffects;
    }

    // --- HEAL SKILLS ---
    if (skill.damageType === 'HEAL') {
      const isBurning = (updatedPlayer.activeEffects || []).some((e) => e.type === 'BURN');
      const healMult = isBurning ? 0.5 : 1.0;
      const healAmount = Math.floor((skill.healsPercent ?? 0) * derived.maxHp * healMult);
      updatedPlayer = {
        ...updatedPlayer,
        currentHp: Math.min(derived.maxHp, updatedPlayer.currentHp + healAmount),
      };
      soundFX.playPotionSound();
      if (isBurning) {
        logs = addLog(logs, `🔥 Burn halved healing! ${skill.icon} ${skill.name} restored +${healAmount} HP!`, 'HEAL', 'PLAYER');
      } else {
        logs = addLog(logs, `${skill.icon} ${skill.name} restored +${healAmount} HP!`, 'HEAL', 'PLAYER');
      }

      // Apply status effect if any
      if (skill.effectType) {
        logs = addLog(logs, `✨ ${skill.effectType} effect applied!`, 'BUFF', 'PLAYER');
      }

      logs = executeEnemyTurn(enemy, logs);

      onUpdatePlayer(updatedPlayer);
      onUpdateBattle({ ...battle, turnNumber: battle.turnNumber + 1, enemy, logs });
      return;
    }

    // --- DAMAGE SKILLS ---
    soundFX.playAttackSound();

    const weaponMin = activeWeapon?.baseDamageMin ?? 8;
    const weaponMax = activeWeapon?.baseDamageMax ?? 14;
    const weaponRoll = Math.floor(weaponMin + Math.random() * (weaponMax - weaponMin + 1));

    // Pick the relevant derived damage stat based on skill's damage type
    let derivedBonus = derived.meleeDamage;
    if (skill.damageType === 'MAGIC' || skill.damageType === 'LIGHTNING' || skill.damageType === 'SHADOW' || skill.damageType === 'RADIANT') {
      derivedBonus = derived.magicDamage;
    } else if (skill.damageType === 'FIRE' || skill.damageType === 'FROST') {
      derivedBonus = derived.magicDamage * 0.8 + derived.rangedDamage * 0.2;
    } else if (!skill.isBasicAttack) {
      // Non-basic physical: blend melee and ranged
      derivedBonus = Math.max(derived.meleeDamage, derived.rangedDamage);
    }

    let baseDamage: number;
    if (skill.isBasicAttack) {
      // Basic attack: raw weapon roll + 40% of relevant derived stat
      baseDamage = weaponRoll + Math.floor(derivedBonus * 0.4);
    } else {
      // Skill attack: weapon roll × multiplier + derived bonus
      baseDamage = Math.floor((weaponRoll + Math.floor(derivedBonus * 0.4)) * skill.baseDamageMultiplier);
    }

    // Crit check
    const isCrit = Math.random() * 100 < derived.critChancePercent;
    if (isCrit) {
      baseDamage = Math.floor(baseDamage * 1.6);
      soundFX.playCritSound();
      logs = addLog(logs, `⚡ CRITICAL HIT! ${skill.icon} ${skill.name} struck ${enemy.name} for ${baseDamage} DMG!`, 'CRIT', 'PLAYER');
    } else {
      logs = addLog(logs, `${skill.icon} ${skill.name} hit ${enemy.name} for ${baseDamage} damage!`, 'DAMAGE', 'PLAYER');
    }

    // Apply Enemy Armor DR (physical only; magic pierces partially)
    const isPurePhysical = skill.damageType === 'PHYSICAL';
    const enemyDR = isPurePhysical ? enemy.armor / (enemy.armor + 150) : enemy.armor / (enemy.armor + 300);
    const finalDmg = Math.max(1, Math.floor(baseDamage * (1 - enemyDR)));
    enemy.currentHp -= finalDmg;

    // Apply status effect if skill triggers one
    if (skill.effectType) {
      logs = addLog(logs, `🩸 ${enemy.name} is afflicted with ${skill.effectType}!`, 'DEBUFF', 'PLAYER');
    }

    // Player Weapon Affix Status Infliction Proc Check
    for (const affix of activeWeapon?.affixes || []) {
      if (affix.statusInfliction) {
        const { type: statusType, chancePercent, durationTurns } = affix.statusInfliction;
        if (Math.random() * 100 < chancePercent) {
          logs = addLog(logs, `✨ [${activeWeapon?.name}] (${affix.name}) afflicted ${enemy.name} with ${statusType} for ${durationTurns} turns!`, 'DEBUFF', 'PLAYER');
        }
      }
    }

    if (enemy.currentHp <= 0) {
      enemy.currentHp = 0;
      onUpdatePlayer(updatedPlayer);
      handleVictory(enemy, logs);
      return;
    }

    // Enemy Turn Counter Attack
    logs = executeEnemyTurn(enemy, logs);

    onUpdatePlayer(updatedPlayer);
    onUpdateBattle({
      ...battle,
      turnNumber: battle.turnNumber + 1,
      enemy,
      logs,
    });
  };

  const handleTakeCover = () => {
    if (!battle.enemy || !battle.inCombat) return;

    soundFX.playPotionSound();
    let logs = battle.logs;
    const enemy = { ...battle.enemy };

    // Restore 15% HP & MP while taking cover
    const healHp = Math.floor(derived.maxHp * 0.15);
    const healMp = Math.floor(derived.maxMp * 0.15);

    const updatedPlayer = {
      ...player,
      currentHp: Math.min(derived.maxHp, player.currentHp + healHp),
      currentMp: Math.min(derived.maxMp, player.currentMp + healMp),
      isCoveredNextTurn: true,
    };

    logs = addLog(logs, `🛡️ Took Cover! Recovered +${healHp} HP and +${healMp} MP while bracing for defense.`, 'HEAL', 'PLAYER');

    logs = executeEnemyTurn(enemy, logs, true);

    onUpdatePlayer(updatedPlayer);
    onUpdateBattle({
      ...battle,
      turnNumber: battle.turnNumber + 1,
      enemy,
      logs,
    });
  };

  const checkArmorMitigation = (statusType: StatusEffectType): { blocked: boolean; reason?: string } => {
    const equippedArmors = [
      player.equipment.upperArmor,
      player.equipment.lowerArmor,
      player.equipment.mount,
    ].filter(Boolean) as EquipmentItem[];

    for (const armor of equippedArmors) {
      for (const affix of armor.affixes || []) {
        if (affix.statusMitigation && affix.statusMitigation.type === statusType) {
          if (affix.statusMitigation.isImmune) {
            return { blocked: true, reason: `🛡️ IMMUNE! [${armor.name}] (${affix.name}) granted complete immunity to ${statusType}!` };
          }
          const resChance = affix.statusMitigation.resistancePercent;
          if (Math.random() * 100 < resChance) {
            return { blocked: true, reason: `🛡️ RESISTED! [${armor.name}] (${affix.name}) resisted incoming ${statusType} (${resChance}% chance)!` };
          }
        }
      }
    }
    return { blocked: false };
  };

  const executeEnemyTurn = (enemy: EnemyMonster, currentLogs: BattleLogEntry[], isPlayerCovered = false): BattleLogEntry[] => {
    let logs = currentLogs;

    // Dodge check
    if (Math.random() * 100 < derived.dodgeChancePercent) {
      logs = addLog(logs, `💨 You dodged ${enemy.name}'s incoming attack!`, 'INFO', 'PLAYER');
      return logs;
    }

    const enemyRawDmg = Math.floor(enemy.attackMin + Math.random() * (enemy.attackMax - enemy.attackMin + 1));
    let netDmg = Math.floor(enemyRawDmg * (1 - derived.damageReductionPercent / 100));

    if (isPlayerCovered) {
      netDmg = Math.floor(netDmg * 0.5);
      logs = addLog(logs, `🛡️ Cover reduced incoming attack damage by 50%!`, 'BUFF', 'SYSTEM');
    }

    netDmg = Math.max(1, netDmg);

    const newHp = Math.max(0, player.currentHp - netDmg);

    // Enemy Status Infliction Proc Check (17.5% regular status monsters, 80% Bosses)
    const isBoss = enemy.isBoss || enemy.id.startsWith('boss_');
    const procChance = isBoss ? 80 : 17.5;
    const hasStatusTrait = isBoss || enemy.specialAbility !== undefined || ['m_nuno', 'm_berbalang', 'm_santelmo', 'm_manananggal', 'm_tiktik', 'm_syokoy_chieftain', 'm_corrupted_shaman_lich'].includes(enemy.id);

    let updatedActiveEffects = player.activeEffects || [];

    if (hasStatusTrait && Math.random() * 100 < procChance) {
      let inflictedStatus: StatusEffectType = 'POISON';
      const abilityLower = (enemy.specialAbility || enemy.name || '').toLowerCase();

      if (abilityLower.includes('burn') || abilityLower.includes('fire') || abilityLower.includes('cigar') || abilityLower.includes('lava') || abilityLower.includes('santelmo')) {
        inflictedStatus = 'BURN';
      } else if (abilityLower.includes('bleed') || abilityLower.includes('rend') || abilityLower.includes('manananggal') || abilityLower.includes('berbalang') || abilityLower.includes('aswang')) {
        inflictedStatus = 'BLEED';
      } else if (abilityLower.includes('exhaust') || abilityLower.includes('shadow') || abilityLower.includes('curse')) {
        inflictedStatus = 'EXHAUSTION';
      } else {
        inflictedStatus = 'POISON';
      }

      const mitigationResult = checkArmorMitigation(inflictedStatus);
      if (mitigationResult.blocked) {
        logs = addLog(logs, mitigationResult.reason || `🛡️ Incoming ${inflictedStatus} was resisted!`, 'BUFF', 'PLAYER');
      } else {
        const duration = inflictedStatus === 'BURN' ? 4 : 3;
        const existing = updatedActiveEffects.filter((e) => e.type !== inflictedStatus);
        const newEffect: ActiveStatusEffect = {
          type: inflictedStatus,
          name: inflictedStatus,
          isBuff: false,
          durationTurnsLeft: duration,
          magnitude: 1,
          stackCount: 1,
        };
        updatedActiveEffects = [...existing, newEffect];
        logs = addLog(logs, `🤢 ${enemy.name} afflicted you with ${inflictedStatus} for ${duration} turns!`, 'DEBUFF', 'ENEMY');
      }
    }

    onUpdatePlayer({ ...player, currentHp: newHp, activeEffects: updatedActiveEffects });

    logs = addLog(logs, `🩸 ${enemy.name} attacked for ${netDmg} damage!`, 'DAMAGE', 'ENEMY');

    if (newHp <= 0) {
      soundFX.playDefeatSound();
      logs = addLog(logs, `💀 You were defeated in battle by ${enemy.name}! Reviving at Outpost...`, 'DEBUFF', 'SYSTEM');
      onUpdateBattle({ ...battle, inCombat: false, winner: 'ENEMY', logs });
    }

    return logs;
  };

  const handleVictory = (enemy: EnemyMonster, logs: BattleLogEntry[]) => {
    soundFX.playVictorySound();

    let finalLogs = addLog(logs, `🏆 VICTORY! Defeated ${enemy.name}!`, 'INFO', 'SYSTEM');
    finalLogs = addLog(finalLogs, `✨ Gained +${enemy.expReward} EXP, +${enemy.copperReward} Cowrie Shells`, 'DROP', 'SYSTEM');

    // Grant Encrypted Memory Drop (Titan Conquest Codebreaker drop)
    const newMemories = [...player.encryptedMemories];
    const dropRarity = enemy.memoryDropRarity || 'WHITE';
    if (Math.random() < 0.65) {
      newMemories.push({
        id: `mem_${Date.now()}`,
        name: `Encrypted Memory (${dropRarity})`,
        rarity: dropRarity,
        minLevel: enemy.level,
        acquiredAtLocation: player.currentLocationId,
      });
      finalLogs = addLog(finalLogs, `💎 DROPPED: Encrypted Memory (${dropRarity})! Take to Codebreaker to decrypt gear.`, 'DROP', 'SYSTEM');
    }

    // EXP check & Level up
    let newExp = player.exp + enemy.expReward;
    let newLevel = player.level;
    let newAP = player.availableAP;

    if (newExp >= derived.expRequiredNextLevel) {
      newExp -= derived.expRequiredNextLevel;
      newLevel += 1;
      newAP += 3;
      soundFX.playLevelUpSound();
      finalLogs = addLog(finalLogs, `🌟 LEVEL UP! You reached Level ${newLevel}! +3 Attribute Points earned!`, 'BUFF', 'SYSTEM');
    }

    // Award cowries via unified currency helper
    const newTotalCowries = totalCowriesFromWallet(player.wallet) + enemy.copperReward;
    const newWallet = cowriesToWallet(newTotalCowries, player.wallet.mutyaShards);

    onUpdatePlayer({
      ...player,
      level: newLevel,
      exp: newExp,
      availableAP: newAP,
      locationPoints: player.locationPoints + 10,
      encryptedMemories: newMemories,
      wallet: newWallet,
    });

    onMonsterKilled(enemy);

    onUpdateBattle({
      ...battle,
      inCombat: false,
      winner: 'PLAYER',
      logs: finalLogs,
    });
  };

  const currentEnemy = battle.enemy;

  // Resolve the player's equipped skill objects (up to 3 slots, with fallback to default class skills)
  const rawSkillIds = player.equippedSkillIds && player.equippedSkillIds.length > 0
    ? player.equippedSkillIds
    : getDefaultSkillIds((player.heroClass || 'Mandirigma') as any);

  const equippedSkills: Skill[] = rawSkillIds
    .map(id => ALL_SKILLS.find(s => s.id === id))
    .filter((s): s is Skill => s !== undefined)
    .slice(0, 3);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-amber-100 p-3 md:p-6 space-y-4">
      {/* Enemy Stage / Battle Display */}
      {currentEnemy ? (
        <div className="bg-zinc-900/90 border border-amber-900/50 rounded-xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-800 rounded-lg border border-amber-500/30 flex items-center justify-center text-4xl shadow-inner">
              {currentEnemy.spriteIcon || '👾'}
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-amber-500 font-semibold">{currentEnemy.title}</div>
              <h3 className="text-xl md:text-2xl font-bold font-serif text-amber-200">{currentEnemy.name}</h3>
              <p className="text-xs text-zinc-400">Armor: {currentEnemy.armor} | DMG: {currentEnemy.attackMin}-{currentEnemy.attackMax} ({currentEnemy.damageType})</p>
            </div>
          </div>

          {/* Enemy HP Meter */}
          <div className="w-full md:w-64 space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-red-400 font-semibold">HP</span>
              <span>{currentEnemy.currentHp} / {currentEnemy.maxHp}</span>
            </div>
            <div className="w-full h-3 bg-zinc-950 rounded-full border border-red-900/50 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-700 to-amber-500 transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, (currentEnemy.currentHp / currentEnemy.maxHp) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center space-y-2">
          <p className="text-zinc-400 font-mono">No target engaged in sector.</p>
          <p className="text-xs text-amber-500/80">Select a Location or press Engage Battle to encounter enemies.</p>
        </div>
      )}

      {/* Combat Action Dock — 3 Skill Buttons + Take Cover */}
      <div className="grid grid-cols-2 gap-2 md:gap-3">
        {/* Equipped Skill Buttons (up to 3) */}
        {equippedSkills.map((skill, idx) => {
          const colorMap = [
            { bg: 'bg-amber-950/80 hover:bg-amber-900', border: 'border-amber-600/50', text: 'text-amber-100', label: 'text-amber-400' },
            { bg: 'bg-sky-950/80 hover:bg-sky-900', border: 'border-sky-500/50', text: 'text-sky-100', label: 'text-sky-400' },
            { bg: 'bg-purple-950/80 hover:bg-purple-900', border: 'border-purple-500/50', text: 'text-purple-100', label: 'text-purple-400' },
          ];
          const colors = colorMap[idx] ?? colorMap[0];

          return (
            <button
              key={skill.id}
              onClick={() => handleUseSkill(skill)}
              disabled={!battle.inCombat || !currentEnemy || player.currentMp < skill.mpCost}
              className={`${colors.bg} border ${colors.border} ${colors.text} p-3 rounded-lg flex flex-col items-center justify-center space-y-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-md`}
            >
              <span className={`text-xs font-mono uppercase ${colors.label} font-semibold`}>
                {idx + 1}. {skill.mpCost > 0 ? `${skill.mpCost} MP` : 'Free'}
              </span>
              <span className="text-base">{skill.icon}</span>
              <span className="text-sm font-bold font-serif text-center leading-tight">{skill.name}</span>
              <span className="text-[10px] text-zinc-400">{skill.damageType}</span>
            </button>
          );
        })}

        {/* Placeholder slots when fewer than 3 skills equipped */}
        {Array.from({ length: Math.max(0, 3 - equippedSkills.length) }).map((_, i) => (
          <div
            key={`empty_skill_${i}`}
            className="bg-zinc-900/40 border border-dashed border-zinc-800 p-3 rounded-lg flex flex-col items-center justify-center space-y-1 opacity-40"
          >
            <span className="text-xs font-mono uppercase text-zinc-600">{equippedSkills.length + i + 1}. Empty Slot</span>
            <span className="text-sm text-zinc-600">—</span>
          </div>
        ))}

        {/* Take Cover / Brace & Heal */}
        <button
          onClick={handleTakeCover}
          disabled={!battle.inCombat || !currentEnemy}
          className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-100 p-3 rounded-lg flex flex-col items-center justify-center space-y-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-md"
        >
          <span className="text-xs font-mono uppercase text-emerald-400 font-semibold">4. Take Cover</span>
          <span className="text-base">🛡️</span>
          <span className="text-sm font-bold font-serif">Brace & Heal</span>
          <span className="text-[10px] text-zinc-400">+15% HP/MP & 50% DR</span>
        </button>
      </div>

      {/* Battle Log Terminal */}
      <div className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 flex flex-col min-h-[200px] overflow-hidden shadow-inner">
        <div className="flex justify-between items-center pb-2 border-b border-zinc-800 text-xs font-mono text-zinc-400">
          <span>REAL-TIME COMBAT TERMINAL</span>
          <span>Turn #{battle.turnNumber}</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 mt-2 text-xs font-mono pr-1">
          {battle.logs.length === 0 ? (
            <p className="text-zinc-600 italic">No combat events logged yet.</p>
          ) : (
            battle.logs.map((log) => (
              <div
                key={log.id}
                className={`p-1.5 rounded ${
                  log.type === 'CRIT'
                    ? 'bg-amber-950/60 text-amber-300 font-bold border-l-2 border-amber-500'
                    : log.type === 'DAMAGE'
                    ? log.actor === 'PLAYER'
                      ? 'text-sky-300'
                      : 'text-red-400'
                    : log.type === 'HEAL'
                    ? 'text-emerald-400'
                    : log.type === 'DROP'
                    ? 'text-purple-300 font-semibold bg-purple-950/30'
                    : 'text-zinc-300'
                }`}
              >
                {log.text}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
