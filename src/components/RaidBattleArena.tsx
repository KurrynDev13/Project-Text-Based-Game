import React, { useState } from 'react';
import { PlayerCharacter, Skill, EquipmentItem, BattleLogEntry, ActiveStatusEffect } from '../types/game';
import { ALL_SKILLS, getDefaultSkillIds, getSkillRank, getScaledSkillDamageMult, getScaledSkillHeal } from '../data/skillsData';
import { calcDerivedStats, calculateStatDrivenDoTDamage, processExpGain, totalCowriesFromWallet, cowriesToWallet, isRaidSurgeWindowActive } from '../utils/gameFormulas';
import { submitGlobalRaidDamage } from '../utils/supabase';
import { soundFX } from '../utils/audio';

export interface RaidAttemptResult {
  damageDealt: number;
  cowriesEarned: number;
  silverEarned: number;
  mutyaEarned: number;
  expEarned: number;
  isSurge: boolean;
  bossDefeated: boolean;
  newGlobalHp?: number;
}

interface RaidBattleArenaProps {
  player: PlayerCharacter;
  globalBakunawaHp: number;
  maxGlobalHp: number;
  rallyModifier: number;
  cycleNumber: number;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onFinishAttempt: (result: RaidAttemptResult) => void;
  onCancelAttempt: () => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error', icon?: string) => void;
}

export const RaidBattleArena: React.FC<RaidBattleArenaProps> = ({
  player,
  globalBakunawaHp,
  maxGlobalHp,
  rallyModifier,
  cycleNumber,
  onUpdatePlayer,
  onFinishAttempt,
  onCancelAttempt,
  onShowToast,
}) => {
  const MAX_TURNS = 10;
  const [turn, setTurn] = useState<number>(1);
  const [attemptDamage, setAttemptDamage] = useState<number>(0);
  const [currentBossHp, setCurrentBossHp] = useState<number>(globalBakunawaHp);
  const [playerHp, setPlayerHp] = useState<number>(player.currentHp > 0 ? player.currentHp : 100);
  const [playerMp, setPlayerMp] = useState<number>(player.currentMp);
  const [isGuarded, setIsGuarded] = useState<boolean>(false);
  const [guardedLastTurn, setGuardedLastTurn] = useState<boolean>(false);
  const [isActionPending, setIsActionPending] = useState<boolean>(false);
  const [cooldownCountdown, setCooldownCountdown] = useState<number>(0);
  const [activeDoTs, setActiveDoTs] = useState<ActiveStatusEffect[]>([]);
  const [isAttemptOver, setIsAttemptOver] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const derived = calcDerivedStats(player.attributes, player.level, player.equipment);
  const activeWeapon: EquipmentItem | null = player.equipment.weapon ?? player.equipment.primaryWeapon ?? null;
  const isSurge = isRaidSurgeWindowActive();
  const rallyPct = Math.round((rallyModifier - 1.0) * 100);
  const effectiveMultiplier = (isSurge ? 1.20 : 1.0) * (rallyModifier || 1.0);

  // Initial Battle Log
  const [logs, setLogs] = useState<BattleLogEntry[]>([
    {
      id: `log_init_${Date.now()}`,
      turn: 1,
      actor: 'SYSTEM',
      text: '🐉 CELESTIAL RAID COMMENCED: Maharlika! The blood moon rises once again! Bakunawa coils across the eclipsed heavens! Deal maximum damage within 10 turns!',
      type: 'INFO',
    },
  ]);

  const addLog = (text: string, type: 'DAMAGE' | 'HEAL' | 'BUFF' | 'DEBUFF' | 'CRIT' | 'INFO', actor: 'PLAYER' | 'ENEMY' | 'SYSTEM') => {
    const newEntry: BattleLogEntry = {
      id: `log_${Date.now()}_${Math.random()}`,
      turn,
      actor,
      text,
      type,
    };
    setLogs((prev) => [newEntry, ...prev.slice(0, 39)]);
  };

  // 1.5s Anti-Spam Action Pad Lockout
  const triggerActionLockout = () => {
    setIsActionPending(true);
    setCooldownCountdown(1.5);
    const interval = setInterval(() => {
      setCooldownCountdown((prev) => {
        if (prev <= 0.2) {
          clearInterval(interval);
          setIsActionPending(false);
          return 0;
        }
        return Math.round((prev - 0.1) * 10) / 10;
      });
    }, 100);
  };

  // Resolve Player's Equipped Skills (Up to 3)
  const rawSkillIds = player.equippedSkillIds && player.equippedSkillIds.length > 0
    ? player.equippedSkillIds
    : getDefaultSkillIds((player.heroClass || 'Mandirigma') as any);

  const equippedSkills: Skill[] = rawSkillIds
    .map((id) => ALL_SKILLS.find((s) => s.id === id))
    .filter((s): s is Skill => s !== undefined)
    .slice(0, 3);

  // End Attempt and submit damage to Supabase
  const handleConcludeAttempt = async (reason: 'TURNS_EXHAUSTED' | 'PLAYER_FALLEN' | 'BOSS_DEFEATED' | 'RETREAT') => {
    if (isAttemptOver || isSubmitting) return;
    setIsAttemptOver(true);
    setIsSubmitting(true);

    const totalDmgDealt = attemptDamage;
    soundFX.playVictorySound();

    let concludeText = '';
    if (reason === 'TURNS_EXHAUSTED') {
      concludeText = `🌌 10 TURNS CONCLUDED: Bakunawa plunges into the celestial abyss! Total Attempt Contribution: ${totalDmgDealt.toLocaleString()} DMG!`;
    } else if (reason === 'PLAYER_FALLEN') {
      concludeText = `🛡️ TACTICAL RETREAT: Withstood Bakunawa's cosmic assault! Total Attempt Contribution: ${totalDmgDealt.toLocaleString()} DMG! (Zero Death Penalty)`;
    } else if (reason === 'BOSS_DEFEATED') {
      concludeText = `🏆 TITAN VANQUISHED: Bakunawa's coils shatter! You struck the decisive finishing blow for ${totalDmgDealt.toLocaleString()} DMG!`;
    } else {
      concludeText = `🏃 TACTICAL DISENGAGE: Withdrew with honors! Total Attempt Contribution: ${totalDmgDealt.toLocaleString()} DMG!`;
    }
    addLog(concludeText, 'INFO', 'SYSTEM');

    // Submit damage to Supabase RPC
    let newRemoteHp = currentBossHp;
    let isDefeated = false;
    try {
      const submitRes = await submitGlobalRaidDamage('bakunawa_eclipse_raid', player.name, totalDmgDealt, isSurge);
      if (submitRes) {
        newRemoteHp = submitRes.current_hp;
        isDefeated = submitRes.status === 'DEFEATED';
      }
    } catch {
      // Fallback
    }

    // Attempt Economy Rewards
    let rewardCC = Math.floor(350 + (totalDmgDealt / 100));
    let rewardSilver = 0;
    let rewardMutya = 1;
    let rewardExp = Math.floor(800 + player.level * 20 + (totalDmgDealt / 250));

    if (isSurge) {
      rewardCC = Math.floor(1500 + player.level * 25 + (totalDmgDealt / 80));
      rewardSilver = Math.floor(5 + Math.random() * 6);
      rewardMutya = Math.floor(2 + Math.random() * 2);
      rewardExp = Math.floor(2200 + player.level * 35 + (totalDmgDealt / 150));
    }

    // Apply persistent currency & EXP, restore normal HP/MP upon returning to camp
    const totalNewCowries = totalCowriesFromWallet(player.wallet) + rewardCC + (rewardSilver * 100);
    const newWallet = cowriesToWallet(totalNewCowries, (player.wallet.mutyaShards || 0) + rewardMutya);
    const expResult = processExpGain(player.level, player.exp, rewardExp);

    onUpdatePlayer({
      ...player,
      currentHp: derived.maxHp,
      currentMp: derived.maxMp,
      level: expResult.newLevel,
      exp: expResult.newExp,
      availableAP: player.availableAP + expResult.apGained,
      wallet: newWallet,
    });

    setIsSubmitting(false);

    // Notify parent
    onFinishAttempt({
      damageDealt: totalDmgDealt,
      cowriesEarned: rewardCC,
      silverEarned: rewardSilver,
      mutyaEarned: rewardMutya,
      expEarned: rewardExp,
      isSurge,
      bossDefeated: isDefeated,
      newGlobalHp: newRemoteHp,
    });
  };

  // Bakunawa's Turn Counter-Attack
  const executeBossTurn = (nextTurn: number, playerCurrentHp: number, guardedThisTurn: boolean) => {
    // 1. Process DoT ticks on Bakunawa
    let dotDmgTotal = 0;
    const remainingDoTs: ActiveStatusEffect[] = [];
    const activeWpn = player.equipment.weapon ?? player.equipment.primaryWeapon ?? null;
    const wpnRoll = activeWpn?.baseDamageMin || 25;
    const physBonus = Math.max(derived.meleeDamage, derived.rangedDamage);

    for (const dot of activeDoTs) {
      if (dot.durationTurnsLeft > 0) {
        let tickDmg = 0;
        if (dot.type === 'BLEED') {
          tickDmg = calculateStatDrivenDoTDamage('BLEED', player.level, physBonus, wpnRoll);
          addLog(`🩸 Bakunawa suffers ${tickDmg.toLocaleString()} Bleed damage from rending cuts!`, 'DAMAGE', 'SYSTEM');
        } else if (dot.type === 'POISON') {
          tickDmg = calculateStatDrivenDoTDamage('POISON', player.level, derived.rangedDamage, wpnRoll);
          addLog(`🤢 Bakunawa suffers ${tickDmg.toLocaleString()} Poison damage from caustic venom!`, 'DAMAGE', 'SYSTEM');
        } else if (dot.type === 'BURN') {
          tickDmg = calculateStatDrivenDoTDamage('BURN', player.level, derived.magicDamage, wpnRoll);
          addLog(`🔥 Bakunawa suffers ${tickDmg.toLocaleString()} Burn damage from searing embers!`, 'DAMAGE', 'SYSTEM');
        }
        dotDmgTotal += tickDmg;
        if (dot.durationTurnsLeft - 1 > 0) {
          remainingDoTs.push({ ...dot, durationTurnsLeft: dot.durationTurnsLeft - 1 });
        }
      }
    }
    setActiveDoTs(remainingDoTs);

    if (dotDmgTotal > 0) {
      setAttemptDamage((prev) => prev + dotDmgTotal);
      setCurrentBossHp((prev) => Math.max(0, prev - dotDmgTotal));
    }

    // 2. Boss Offensive Action - Supreme Celestial World Titan
    let bossBaseAttack = 750 + Math.floor(Math.random() * 100);
    let bossAttackName = 'Lunar Constriction';
    let isTelegraphedImpact = false;

    if (turn === 4) {
      bossBaseAttack = 2200 + Math.floor(Math.random() * 200);
      bossAttackName = '💥 CELESTIAL VOID PULSE (Telegraphed Devastation)';
      isTelegraphedImpact = true;
    } else if (turn === 8) {
      bossBaseAttack = 3000 + Math.floor(Math.random() * 300);
      bossAttackName = '🌑 MAW OF THE ECLIPSE (Astral Cataclysm)';
      isTelegraphedImpact = true;
    } else if (turn >= 9) {
      bossBaseAttack = 1350 + Math.floor(Math.random() * 200);
      bossAttackName = 'Eclipse Supernova Rampage';
    } else if (turn >= 7) {
      bossBaseAttack = 1180 + Math.floor(Math.random() * 150);
      bossAttackName = 'Cosmic Singularity Pull';
    } else if (turn >= 5) {
      bossBaseAttack = 1020 + Math.floor(Math.random() * 150);
      bossAttackName = 'Nether-Flame Breath';
    } else if (turn >= 3) {
      bossBaseAttack = 920 + Math.floor(Math.random() * 120);
      bossAttackName = 'Shadow Venom Spit';
    } else if (turn === 2) {
      bossBaseAttack = 820 + Math.floor(Math.random() * 100);
      bossAttackName = 'Abyssal Tail Lash';
    }

    // Cosmic Penetration: Bakunawa's celestial shadow magic penetrates 45% of mortal armor
    const celestialPenetratedArmor = Math.floor(derived.physicalArmor * 0.55);
    const celestialDR = celestialPenetratedArmor / (celestialPenetratedArmor + 180);

    let rawBossDmg = Math.floor(bossBaseAttack * (1 - celestialDR));
    if (guardedThisTurn) {
      rawBossDmg = Math.floor(rawBossDmg * 0.50); // Tactical Brace cuts damage in half (50% reduction)
    }

    const netBossDmg = Math.max(35, rawBossDmg);
    const newPlayerHp = Math.max(0, playerCurrentHp - netBossDmg);
    setPlayerHp(newPlayerHp);

    if (guardedThisTurn) {
      addLog(`🛡️ TACTICAL BRACE! Blocked 50% damage: Took ${netBossDmg} from Bakunawa's [${bossAttackName}]!`, 'BUFF', 'SYSTEM');
    } else {
      addLog(
        isTelegraphedImpact
          ? `💥 DIRECT HIT! Bakunawa's [${bossAttackName}] struck for ${netBossDmg} damage (Unmitigated)!`
          : `🐉 Bakunawa struck with [${bossAttackName}] for ${netBossDmg} damage!`,
        isTelegraphedImpact ? 'CRIT' : 'DAMAGE',
        'ENEMY'
      );
    }

    // 3. Telegraph next turn warnings (Turn 3 warns for Turn 4, Turn 7 warns for Turn 8)
    if (nextTurn === 4) {
      addLog(`⚠️ [COSMIC SURGE] Bakunawa coils tightly, channeling Celestial Void Pulse! Brace next turn to halve incoming devastation!`, 'CRIT', 'ENEMY');
    } else if (nextTurn === 8) {
      addLog(`⚠️ [ASTRAL CATACLYSM] The moons vanish! Bakunawa opens the Maw of the Eclipse! Brace next turn to survive!`, 'CRIT', 'ENEMY');
    }

    // 4. Check if player fell
    if (newPlayerHp <= 0) {
      handleConcludeAttempt('PLAYER_FALLEN');
      return;
    }

    // 5. Check if 10 turns reached
    if (nextTurn > MAX_TURNS) {
      handleConcludeAttempt('TURNS_EXHAUSTED');
      return;
    }

    setTurn(nextTurn);
  };

  // --- ACTION 1: EQUIPPED WEAPON ATTACK ---
  const handleWeaponAttack = () => {
    if (isActionPending || isAttemptOver) return;
    triggerActionLockout();
    soundFX.playAttackSound();

    const wMin = activeWeapon?.baseDamageMin ?? 25;
    const wMax = activeWeapon?.baseDamageMax ?? 45;
    const wRoll = Math.floor(wMin + Math.random() * (wMax - wMin + 1));

    // Resolve derived stat
    const wCat = activeWeapon?.category;
    let statBonus = derived.meleeDamage;
    if (wCat === 'BOW' || wCat === 'DAGGER' || player.heroClass === 'Mangangaso' || player.heroClass === 'Bagani') {
      statBonus = derived.rangedDamage;
    } else if (wCat === 'STAFF' || player.heroClass === 'Babaylan') {
      statBonus = derived.magicDamage;
    }

    const baseRaw = wRoll + Math.floor(statBonus * 0.5);
    const bossDR = 140 / (140 + 150); // ~48% DR
    let finalDmg = Math.max(1, Math.floor(baseRaw * (1 - bossDR)));

    // Crit check
    const isCrit = Math.random() * 100 < derived.critChancePercent;
    if (isCrit) {
      finalDmg = Math.floor(finalDmg * 2.0);
      soundFX.playCritSound();
    }

    // Surge & Rally multipliers
    const effectiveDmg = Math.floor(finalDmg * effectiveMultiplier);
    const newAttemptDmg = attemptDamage + effectiveDmg;
    const newBossHp = Math.max(0, currentBossHp - effectiveDmg);

    setAttemptDamage(newAttemptDmg);
    setCurrentBossHp(newBossHp);

    // +5 MP regen on basic attack
    const newMp = Math.min(derived.maxMp, playerMp + 5);
    setPlayerMp(newMp);

    // Log strike
    if (isCrit) {
      addLog(
        `⚡ CRITICAL STRIKE! [${activeWeapon?.name || 'Weapon'}] hit Bakunawa for ${effectiveDmg.toLocaleString()} DMG! (+5 MP)${
          isSurge ? ' (⚡ Surge +20%)' : ''
        }${rallyPct > 0 ? ` (🔥 Rally +${rallyPct}%)` : ''}`,
        'CRIT',
        'PLAYER'
      );
      // Crit applies Bleed (stat-driven, NOT % Max HP)
      const bleedDoT: ActiveStatusEffect = {
        type: 'BLEED',
        name: 'BLEED',
        isBuff: false,
        durationTurnsLeft: 3,
        magnitude: 1,
        stackCount: 1,
      };
      setActiveDoTs((prev) => [...prev.filter((d) => d.type !== 'BLEED'), bleedDoT]);
      addLog(`🩸 Critical Wound! Bakunawa is BLEEDING (3 turns of physical rending)!`, 'DEBUFF', 'PLAYER');
    } else {
      addLog(
        `⚔️ [${activeWeapon?.name || 'Weapon'}] hit Bakunawa for ${effectiveDmg.toLocaleString()} DMG! (+5 MP)${
          isSurge ? ' (⚡ Surge +20%)' : ''
        }${rallyPct > 0 ? ` (🔥 Rally +${rallyPct}%)` : ''}`,
        'DAMAGE',
        'PLAYER'
      );
    }

    // Weapon Affix Procs
    for (const affix of activeWeapon?.affixes || []) {
      if (affix.statusInfliction) {
        const { type: statusType, chancePercent, durationTurns } = affix.statusInfliction;
        if (Math.random() * 100 < chancePercent) {
          const newEffect: ActiveStatusEffect = {
            type: statusType,
            name: statusType,
            isBuff: false,
            durationTurnsLeft: durationTurns,
            magnitude: 1,
            stackCount: 1,
          };
          setActiveDoTs((prev) => [...prev.filter((d) => d.type !== statusType), newEffect]);
          addLog(`✨ [${activeWeapon?.name}] (${affix.name}) afflicted Bakunawa with ${statusType} for ${durationTurns} turns!`, 'DEBUFF', 'PLAYER');
        }
      }
    }

    // Check finishing blow
    if (newBossHp <= 0) {
      handleConcludeAttempt('BOSS_DEFEATED');
      return;
    }

    // Reset guard status and trigger boss turn
    setGuardedLastTurn(false);
    setIsGuarded(false);
    executeBossTurn(turn + 1, playerHp, false);
  };

  // --- ACTION 2: EQUIPPED CLASS SKILL ---
  const handleUseSkill = (skill: Skill) => {
    if (isActionPending || isAttemptOver) return;

    if (playerMp < skill.mpCost) {
      onShowToast?.(`Not enough MP for ${skill.name}! Requires ${skill.mpCost} MP.`, 'warning', '⚡');
      return;
    }

    triggerActionLockout();
    const updatedMp = playerMp - skill.mpCost;
    setPlayerMp(updatedMp);

    const skillRank = getSkillRank(player, skill.id);
    const rankLabel = skillRank > 1 ? ` [Rank ${skillRank}]` : '';

    // Heal Skills
    if (skill.damageType === 'HEAL') {
      soundFX.playSpellSound();
      const scaledHeal = getScaledSkillHeal(skill, skillRank) || (skill.healsPercent ?? 0.25);
      const healHp = Math.floor(derived.maxHp * scaledHeal);
      const newHp = Math.min(derived.maxHp, playerHp + healHp);
      setPlayerHp(newHp);
      addLog(`${skill.icon} Used [${skill.name}]${rankLabel}! Restored +${healHp} HP!`, 'HEAL', 'PLAYER');

      setGuardedLastTurn(false);
      setIsGuarded(false);
      executeBossTurn(turn + 1, newHp, false);
      return;
    }

    // Damage Skills
    soundFX.playAttackSound();
    const wMin = activeWeapon?.baseDamageMin ?? 25;
    const wMax = activeWeapon?.baseDamageMax ?? 45;
    const wRoll = Math.floor(wMin + Math.random() * (wMax - wMin + 1));

    let statBonus = derived.meleeDamage;
    if (['MAGIC', 'LIGHTNING', 'SHADOW', 'RADIANT'].includes(skill.damageType)) {
      statBonus = derived.magicDamage;
    } else if (['FIRE', 'FROST'].includes(skill.damageType)) {
      statBonus = derived.magicDamage * 0.8 + derived.rangedDamage * 0.2;
    } else if (skill.classReq === 'Mangangaso' || skill.classReq === 'Bagani') {
      statBonus = Math.max(derived.meleeDamage, derived.rangedDamage);
    }

    const scaledMult = getScaledSkillDamageMult(skill, skillRank) || skill.baseDamageMultiplier || 1.2;
    const baseSkillDmg = Math.floor((wRoll + Math.floor(statBonus * 0.5)) * scaledMult);
    const bossDR = 140 / (140 + 250); // Elemental DR
    let finalSkillDmg = Math.max(1, Math.floor(baseSkillDmg * (1 - bossDR)));

    const isCrit = Math.random() * 100 < derived.critChancePercent;
    if (isCrit) {
      finalSkillDmg = Math.floor(finalSkillDmg * 2.0);
      soundFX.playCritSound();
    }

    const effectiveDmg = Math.floor(finalSkillDmg * effectiveMultiplier);
    const newAttemptDmg = attemptDamage + effectiveDmg;
    const newBossHp = Math.max(0, currentBossHp - effectiveDmg);

    setAttemptDamage(newAttemptDmg);
    setCurrentBossHp(newBossHp);

    if (isCrit) {
      addLog(
        `⚡ CRITICAL SKILL! ${skill.icon} [${skill.name}]${rankLabel} hit Bakunawa for ${effectiveDmg.toLocaleString()} DMG!${
          isSurge ? ' (⚡ Surge +20%)' : ''
        }${rallyPct > 0 ? ` (🔥 Rally +${rallyPct}%)` : ''}`,
        'CRIT',
        'PLAYER'
      );
    } else {
      addLog(
        `✨ ${skill.icon} [${skill.name}]${rankLabel} hit Bakunawa for ${effectiveDmg.toLocaleString()} DMG!${
          isSurge ? ' (⚡ Surge +20%)' : ''
        }${rallyPct > 0 ? ` (🔥 Rally +${rallyPct}%)` : ''}`,
        'DAMAGE',
        'PLAYER'
      );
    }

    // Skill status infliction
    if (skill.effectType) {
      const newEffect: ActiveStatusEffect = {
        type: skill.effectType,
        name: skill.effectType,
        isBuff: false,
        durationTurnsLeft: 3,
        magnitude: 1,
        stackCount: 1,
      };
      setActiveDoTs((prev) => [...prev.filter((d) => d.type !== skill.effectType), newEffect]);
      addLog(`🩸 Bakunawa is afflicted with ${skill.effectType}!`, 'DEBUFF', 'PLAYER');
    }

    if (newBossHp <= 0) {
      handleConcludeAttempt('BOSS_DEFEATED');
      return;
    }

    setGuardedLastTurn(false);
    setIsGuarded(false);
    executeBossTurn(turn + 1, playerHp, false);
  };

  // --- ACTION 3: TACTICAL BRACE / GUARD (1-TURN COOLDOWN, NON-SPAMMABLE) ---
  const handleGuard = () => {
    if (isActionPending || isAttemptOver || guardedLastTurn) return;
    triggerActionLockout();
    soundFX.playPotionSound();

    const healHp = Math.floor(derived.maxHp * 0.15);
    const healMp = Math.floor(derived.maxMp * 0.15);
    const newHp = Math.min(derived.maxHp, playerHp + healHp);
    const newMp = Math.min(derived.maxMp, playerMp + healMp);

    setPlayerHp(newHp);
    setPlayerMp(newMp);
    setIsGuarded(true);
    setGuardedLastTurn(true);

    addLog(`🛡️ Assumed Tactical Brace Stance! Recovered +${healHp} HP & +${healMp} MP. Incoming attack damage reduced by 50%!`, 'BUFF', 'PLAYER');

    executeBossTurn(turn + 1, newHp, true);
  };

  // --- ACTION 4: QUICK POTION USE ---
  const handleUsePotion = () => {
    if (isActionPending || isAttemptOver) return;

    const potionIndex = player.inventory.findIndex(
      (item) => 'hpRestore' in item || 'mpRestore' in item
    );

    if (potionIndex === -1) {
      onShowToast?.('No healing or mana tinctures in your inventory!', 'warning', '🧪');
      return;
    }

    triggerActionLockout();
    soundFX.playPotionSound();

    const potion = player.inventory[potionIndex] as any;
    const healHp = potion.hpRestore || 0;
    const healMp = potion.mpRestore || 0;

    const newHp = Math.min(derived.maxHp, playerHp + healHp);
    const newMp = Math.min(derived.maxMp, playerMp + healMp);
    setPlayerHp(newHp);
    setPlayerMp(newMp);

    // Consume item from inventory
    const updatedInventory = player.inventory.filter((_, idx) => idx !== potionIndex);
    onUpdatePlayer({ ...player, inventory: updatedInventory });

    addLog(`🧪 Drank [${potion.name}]! Restored +${healHp} HP and +${healMp} MP!`, 'HEAL', 'PLAYER');

    setGuardedLastTurn(false);
    setIsGuarded(false);
    executeBossTurn(turn + 1, newHp, false);
  };

  const bossHpPercent = maxGlobalHp > 0 ? Math.max(0, Math.min(100, Math.round((currentBossHp / maxGlobalHp) * 100))) : 0;
  const playerHpPercent = Math.max(0, Math.min(100, Math.round((playerHp / derived.maxHp) * 100)));
  const playerMpPercent = Math.max(0, Math.min(100, Math.round((playerMp / derived.maxMp) * 100)));

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-amber-100 p-3 md:p-6 space-y-3 overflow-y-auto select-none">
      {/* Top Header: Encounter Info & Turn Tracker */}
      <div className="bg-zinc-900/90 border border-purple-900/60 rounded-xl p-3 shadow-2xl flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-2xl animate-pulse">🐉</span>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-wider">
                WEEKLY RAID • CELESTIAL ECLIPSE ACTIVE
              </span>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-200 border border-purple-500/50">
                TURN {turn} / {MAX_TURNS}
              </span>
              {isSurge && (
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/50 animate-pulse">
                  ⚡ SURGE +20% DMG
                </span>
              )}
              {rallyPct > 0 && (
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-500/50">
                  🔥 RALLY +{rallyPct}%
                </span>
              )}
            </div>
            <h2 className="text-lg md:text-xl font-serif font-bold text-amber-200">
              Bakunawa, The Moon-Devouring Serpent
            </h2>
          </div>
        </div>

        {/* Live Contribution Tracker & Disengage Button */}
        <div className="flex items-center space-x-3">
          <div className="bg-zinc-950 border border-amber-600/50 px-3 py-1.5 rounded-lg text-right">
            <div className="text-[9px] font-mono text-zinc-400 uppercase">Attempt Damage</div>
            <div className="text-sm font-mono font-bold text-amber-300">
              {attemptDamage.toLocaleString()} DMG
            </div>
          </div>
          <button
            onClick={() => handleConcludeAttempt('RETREAT')}
            disabled={isActionPending || isSubmitting}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-600 font-mono text-xs font-bold rounded-lg transition-all active:scale-95"
          >
            Disengage
          </button>
        </div>
      </div>

      {/* Bakunawa Boss Stage (Health Meter & Cosmic Presence) */}
      <div className="bg-gradient-to-b from-purple-950/40 via-zinc-900/80 to-zinc-950 border border-purple-900/40 rounded-xl p-4 shadow-inner space-y-2">
        <div className="flex justify-between items-center text-xs font-mono font-bold">
          <span className="text-purple-400">GLOBAL ECLIPSE HEALTH BAR</span>
          <span className="text-amber-200">{currentBossHp.toLocaleString()} / {maxGlobalHp.toLocaleString()} HP ({bossHpPercent}%)</span>
        </div>
        <div className="w-full h-3 bg-zinc-950 rounded-full border border-purple-900/60 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-700 via-amber-600 to-yellow-500 transition-all duration-300"
            style={{ width: `${bossHpPercent}%` }}
          />
        </div>
        {/* Active Boss DoT Badges */}
        {activeDoTs.length > 0 && (
          <div className="flex items-center space-x-2 pt-1">
            <span className="text-[10px] text-zinc-400 font-mono">Active Afflictions:</span>
            {activeDoTs.map((dot, idx) => (
              <span
                key={idx}
                className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-700/60"
              >
                {dot.type === 'BLEED' ? '🩸 BLEED' : dot.type === 'POISON' ? '🤢 POISON' : '🔥 BURN'} ({dot.durationTurnsLeft}t)
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Player Vitals Bar */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 grid grid-cols-1 md:grid-cols-2 gap-2 shadow-inner">
        <div>
          <div className="flex justify-between text-[11px] font-mono font-bold mb-1">
            <span className="text-emerald-400">HERO HEALTH (HP)</span>
            <span>{playerHp} / {derived.maxHp}</span>
          </div>
          <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-emerald-900/50">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${playerHpPercent}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[11px] font-mono font-bold mb-1">
            <span className="text-blue-400">MANA RESERVES (MP)</span>
            <span>{playerMp} / {derived.maxMp}</span>
          </div>
          <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-blue-900/50">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${playerMpPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Combat Battle Log */}
      <div className="flex-1 min-h-[160px] max-h-[260px] bg-zinc-950/90 border border-zinc-800 rounded-xl p-3 flex flex-col space-y-1.5 overflow-y-auto shadow-inner font-mono text-xs">
        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest border-b border-zinc-800 pb-1">
          Celestial Combat Transmission • Live Tactical Stream
        </div>
        {logs.map((log) => {
          const isPulsingWarning = log.text.includes('⚠️');
          return (
            <div
              key={log.id}
              className={`p-2 rounded text-xs leading-relaxed transition-all ${
                isPulsingWarning
                  ? 'border-2 border-red-500 bg-red-950/80 text-amber-200 font-bold animate-pulse shadow-lg'
                  : log.type === 'CRIT'
                  ? 'bg-amber-950/40 border border-amber-600/50 text-amber-200'
                  : log.type === 'DEBUFF'
                  ? 'bg-purple-950/40 border border-purple-800/40 text-purple-200'
                  : log.type === 'HEAL' || log.type === 'BUFF'
                  ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-200'
                  : log.actor === 'ENEMY'
                  ? 'bg-red-950/30 border border-red-900/40 text-red-200'
                  : 'bg-zinc-900/40 border border-zinc-800/40 text-zinc-300'
              }`}
            >
              <span className="text-[9px] text-zinc-500 mr-2">[Turn {log.turn}]</span>
              {log.text}
            </div>
          );
        })}
      </div>

      {/* TACTICAL ACTION PAD */}
      <div className="bg-zinc-900/95 border border-amber-800/60 rounded-xl p-3 shadow-2xl space-y-2">
        <div className="flex justify-between items-center text-[10px] font-mono uppercase text-zinc-400">
          <span>TACTICAL ACTION PAD</span>
          {isActionPending && (
            <span className="text-amber-400 font-bold animate-pulse">
              ⏳ CHANNELING ({cooldownCountdown}s)
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {/* Action 1: Basic Weapon Attack */}
          <button
            onClick={handleWeaponAttack}
            disabled={isActionPending || isAttemptOver}
            className="p-3 bg-gradient-to-b from-amber-900/60 to-zinc-900 hover:from-amber-800/80 hover:to-zinc-800 disabled:opacity-40 border border-amber-600/60 text-amber-200 rounded-xl font-mono text-xs font-bold transition-all active:scale-95 flex flex-col items-center justify-center space-y-1 shadow-md"
          >
            <span>⚔️ Weapon Strike</span>
            <span className="text-[9px] text-zinc-400 font-normal font-sans">
              {activeWeapon?.name || 'Basic'} (+5 MP)
            </span>
          </button>

          {/* Action 2, 3, 4: Equipped Class Skills */}
          {equippedSkills.map((skill, idx) => {
            const hasMp = playerMp >= skill.mpCost;
            return (
              <button
                key={skill.id || idx}
                onClick={() => handleUseSkill(skill)}
                disabled={isActionPending || isAttemptOver || !hasMp}
                className={`p-3 bg-gradient-to-b from-purple-900/60 to-zinc-900 hover:from-purple-800/80 hover:to-zinc-800 disabled:opacity-40 border border-purple-600/60 rounded-xl font-mono text-xs font-bold transition-all active:scale-95 flex flex-col items-center justify-center space-y-1 shadow-md ${
                  hasMp ? 'text-purple-200' : 'text-zinc-500'
                }`}
              >
                <span>{skill.icon || '✨'} {skill.name}</span>
                <span className="text-[9px] text-purple-300 font-normal font-sans">
                  {skill.mpCost} MP • {skill.damageType}
                </span>
              </button>
            );
          })}

          {/* Action: Tactical Brace / Guard (1-Turn Non-Spammable Cooldown) */}
          <button
            onClick={handleGuard}
            disabled={isActionPending || isAttemptOver || guardedLastTurn}
            className={`p-3 bg-gradient-to-b from-blue-900/60 to-zinc-900 hover:from-blue-800/80 hover:to-zinc-800 disabled:opacity-40 border border-blue-600/60 rounded-xl font-mono text-xs font-bold transition-all active:scale-95 flex flex-col items-center justify-center space-y-1 shadow-md ${
              guardedLastTurn ? 'text-zinc-500 border-zinc-700' : 'text-blue-200'
            }`}
          >
            <span>🛡️ Tactical Brace</span>
            <span className="text-[9px] font-normal font-sans text-zinc-400">
              {guardedLastTurn ? 'On Cooldown (1t)' : '-50% DMG, +15% HP/MP'}
            </span>
          </button>

          {/* Action: Use Potion */}
          <button
            onClick={handleUsePotion}
            disabled={isActionPending || isAttemptOver}
            className="p-3 bg-gradient-to-b from-emerald-900/60 to-zinc-900 hover:from-emerald-800/80 hover:to-zinc-800 disabled:opacity-40 border border-emerald-600/60 text-emerald-200 rounded-xl font-mono text-xs font-bold transition-all active:scale-95 flex flex-col items-center justify-center space-y-1 shadow-md col-span-2 md:col-span-1"
          >
            <span>🧪 Drink Potion</span>
            <span className="text-[9px] text-zinc-400 font-normal font-sans">Inventory Tincture</span>
          </button>
        </div>
      </div>
    </div>
  );
};
