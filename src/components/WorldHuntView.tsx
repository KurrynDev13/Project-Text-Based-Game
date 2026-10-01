import React, { useState, useEffect } from 'react';
import { PlayerCharacter, BattleState, BattleLogEntry, EnemyMonster, GameLocation, ConsumableItem, Skill, EquipmentItem, HeroClass, EncryptedMemory, MemoryRarity } from '../types/game';
import { GAME_LOCATIONS, MOUNTS } from '../data/equipmentData';
import { generateMonsterForLocation, MONSTER_TEMPLATES } from '../data/monstersData';
import { calcDerivedStats, calcExpRequired, processExpGain, totalCowriesFromWallet, cowriesToWallet, formatCostInCowries, formatCowriesShort, calcMaxStamina, getActStaminaCosts, calcRequiredActPower, calcMonsterPowerRating } from '../utils/gameFormulas';
import { ALL_SKILLS, getDefaultSkillIds, getSkillRank, getScaledSkillDamageMult, getScaledSkillHeal, getScaledSkillShield } from '../data/skillsData';
import { getScaledForgeCatalog, calcCostInCowries, getWanderingMerchantOffer, generateBossLootArtifact } from '../utils/equipmentGenerator';
import { soundFX } from '../utils/audio';
import { bgmManager } from '../utils/musicManager';
import ActStoryOverlayModal from './ActStoryOverlayModal';
import BossDiscoveryModal from './BossDiscoveryModal';
import BossVictoryModal from './BossVictoryModal';
import { broadcastSystemAnnouncement } from '../utils/supabase';

export interface InteractiveEncounter {
  id: string;
  type: 'TRADER' | 'CURSED_CHEST';
  title: string;
  description: string;
  traderItem?: EquipmentItem;
  traderCostCC?: number;
  originalCostCC?: number;
  discountPercent?: number;
  chestHpCost?: number;
  chestMpCost?: number;
  chestRewardCC?: number;
  chestRewardMutya?: number;
}

export interface BossVictoryRewardData {
  bossId?: string;
  bossName: string;
  bossTitle: string;
  nextActName?: string;
  expEarned: number;
  cowriesEarned: number;
  mutyaShardsEarned: number;
  droppedItem?: EquipmentItem;
  droppedMemory?: EncryptedMemory;
}

interface WorldHuntViewProps {
  player: PlayerCharacter;
  battle: BattleState;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onUpdateBattle: (updated: BattleState) => void;
  onNavigateToHaven: () => void;
  onMonsterKilled: (monster: EnemyMonster) => void;
  suppressActStory?: boolean;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error', icon?: string) => void;
}

export const WorldHuntView: React.FC<WorldHuntViewProps> = ({
  player,
  battle,
  onUpdatePlayer,
  onUpdateBattle,
  onNavigateToHaven,
  onMonsterKilled,
  suppressActStory,
  onShowToast,
}) => {
  const notify = (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', icon?: string) => {
    onShowToast?.(msg, type, icon);
  };

  const [selectedLocation, setSelectedLocation] = useState<GameLocation>(() => {
    const found = GAME_LOCATIONS.find((l) => l.id === player.currentLocationId);
    const reqPower = found ? calcRequiredActPower(found.id, player.ngPlusLevel || 0) : 0;
    const derivedInitial = calcDerivedStats(player.attributes, player.level, player.equipment);
    if (found && derivedInitial.powerLevel >= reqPower) return found;
    return GAME_LOCATIONS[0];
  });
  const [showSpellPicker, setShowSpellPicker] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [showBossWarningModal, setShowBossWarningModal] = useState(false);
  const [showBossDiscoveryModal, setShowBossDiscoveryModal] = useState(false);
  const [showActStoryModal, setShowActStoryModal] = useState<boolean>(() => {
    if (suppressActStory) return false;
    const unlocked = player.unlockedActStoryIds ?? [];
    return !unlocked.includes(selectedLocation.id);
  });
  const [pendingAdvanceLocation, setPendingAdvanceLocation] = useState<GameLocation | null>(null);
  const [showAdvanceWarningModal, setShowAdvanceWarningModal] = useState(false);
  const [explorationEvent, setExplorationEvent] = useState<string | null>(null);
  const [activeInteractiveEncounter, setActiveInteractiveEncounter] = useState<InteractiveEncounter | null>(null);
  const [activeBossVictoryReward, setActiveBossVictoryReward] = useState<BossVictoryRewardData | null>(null);

  // Play Lore theme when Act Story or Boss Discovery modal is active
  useEffect(() => {
    if (showActStoryModal || showBossDiscoveryModal) {
      bgmManager.playTrack('LORE');
    }
  }, [showActStoryModal, showBossDiscoveryModal]);

  // Resolution handlers for Wandering Trader and Cursed Spirit Chest choices
  const handleBuyTraderItem = () => {
    if (!activeInteractiveEncounter?.traderItem || activeInteractiveEncounter.traderCostCC === undefined) return;
    const costCC = activeInteractiveEncounter.traderCostCC;
    const playerTotalCC = totalCowriesFromWallet(player.wallet);
    if (playerTotalCC < costCC) {
      notify(`Insufficient Cowrie Shells! Requires ${formatCostInCowries(costCC)}. (You have ${formatCowriesShort(player.wallet)})`, 'error', '🪙');
      return;
    }
    soundFX.playCoinSound();
    const item = activeInteractiveEncounter.traderItem;
    const remainingCC = playerTotalCC - costCC;
    const newWallet = cowriesToWallet(remainingCC, player.wallet.mutyaShards || player.wallet.prismaticShards || 0);

    const updatedNarratorLogs = [
      `🛍️ BOUGHT ARTIFACT: Purchased [${item.name}] from the Wandering Merchant for ${formatCostInCowries(costCC)}!`,
      ...(player.narratorLogs || [])
    ].slice(0, 15);

    onUpdatePlayer({
      ...player,
      wallet: newWallet,
      inventory: [...player.inventory, item],
      narratorLogs: updatedNarratorLogs,
    });
    setActiveInteractiveEncounter(null);
  };

  const handleOpenCursedChest = (costType: 'HP' | 'MP') => {
    if (!activeInteractiveEncounter) return;
    soundFX.playPotionSound();

    let newHp = player.currentHp;
    let newMp = player.currentMp;
    let sacrificeDesc = '';

    if (costType === 'HP') {
      const hpCost = activeInteractiveEncounter.chestHpCost || 20;
      newHp = Math.max(1, player.currentHp - hpCost);
      sacrificeDesc = `-${hpCost} HP`;
    } else {
      const mpCost = activeInteractiveEncounter.chestMpCost || 30;
      newMp = Math.max(0, player.currentMp - mpCost);
      sacrificeDesc = `-${mpCost} MP`;
    }

    const isBlessed = Math.random() < 0.65; // 65% Blessed Treasure, 35% Cursed Backfire

    if (isBlessed) {
      const rewardCC = activeInteractiveEncounter.chestRewardCC || (200 + player.level * 30);
      const rewardMutya = activeInteractiveEncounter.chestRewardMutya || 1;

      // 35% chance for a bonus equipment drop
      let bonusItem: EquipmentItem | null = null;
      if (Math.random() < 0.35) {
        bonusItem = getWanderingMerchantOffer(player.level, (player.heroClass || 'Mandirigma') as HeroClass, player.equipment).item;
      }

      const totalCC = totalCowriesFromWallet(player.wallet) + rewardCC;
      const updatedWallet = cowriesToWallet(totalCC, (player.wallet.mutyaShards || 0) + rewardMutya);
      const updatedInventory = bonusItem ? [...player.inventory, bonusItem] : player.inventory;

      const logText = bonusItem
        ? `🔮 BLESSED SPIRIT CHEST: Sacrificed (${sacrificeDesc}). The blood-red runes dissolve into golden embers! An ancient Diwata spirit grants +${formatCostInCowries(rewardCC)}, +${rewardMutya} Mutya Shard & [${bonusItem.name}]!`
        : `🔮 BLESSED SPIRIT CHEST: Sacrificed (${sacrificeDesc}). The obsidian runes dissolve into glowing light! An ancient ancestral spirit grants +${formatCostInCowries(rewardCC)} & +${rewardMutya} Mutya Pearl Shard!`;

      const updatedNarratorLogs = [logText, ...(player.narratorLogs || [])].slice(0, 15);

      notify(
        bonusItem
          ? `✨ Blessed Spirit Unsealed! Gained +${formatCostInCowries(rewardCC)}, +${rewardMutya} Mutya & [${bonusItem.name}]!`
          : `✨ Blessed Spirit Unsealed! Gained +${formatCostInCowries(rewardCC)} & +${rewardMutya} Mutya Pearl Shard!`,
        'success',
        '🔮'
      );

      onUpdatePlayer({
        ...player,
        currentHp: newHp,
        currentMp: newMp,
        wallet: updatedWallet,
        inventory: updatedInventory,
        narratorLogs: updatedNarratorLogs,
      });
    } else {
      // 35% CURSED BACKFIRE OUTCOME
      const cursePool = [
        { type: 'POISON' as const, name: 'Aswang Venom Curse', desc: 'toxic spirit essence seeps into your veins', turns: 4, mag: 15 + player.level * 2 },
        { type: 'BLEED' as const, name: 'Sigbin Laceration', desc: 'phantom claws tear through your vitality', turns: 3, mag: 18 + player.level * 3 },
        { type: 'BURN' as const, name: 'Kanlaon Inferno Flame', desc: 'sulfuric hellfire consumes your spiritual aura', turns: 4, mag: 12 + player.level * 2 },
        { type: 'EXHAUSTION' as const, name: 'Abyssal Soul Drain', desc: 'an ancient shade drains your stamina and focus', turns: 5, mag: 25 },
      ];

      const chosenCurse = cursePool[Math.floor(Math.random() * cursePool.length)];

      const newEffect = {
        type: chosenCurse.type,
        name: chosenCurse.name,
        isBuff: false,
        durationTurnsLeft: chosenCurse.turns,
        magnitude: chosenCurse.mag,
        stackCount: 1,
      };

      const updatedActiveEffects = [...(player.activeEffects || []).filter((e) => e.type !== chosenCurse.type), newEffect];

      const logText = `☠️ CURSED SPIRIT BACKFIRE! Sacrificed (${sacrificeDesc}). The blood-red runes explode in obsidian flames! A vengeful spirit strikes back as ${chosenCurse.desc}, inflicting [${chosenCurse.name}] (${chosenCurse.type} for ${chosenCurse.turns} turns)!`;

      const updatedNarratorLogs = [logText, ...(player.narratorLogs || [])].slice(0, 15);

      notify(`☠️ Cursed Backfire! Sacrificed (${sacrificeDesc}) but the chest lashed out with [${chosenCurse.name}]!`, 'error', '☠️');

      onUpdatePlayer({
        ...player,
        currentHp: newHp,
        currentMp: newMp,
        activeEffects: updatedActiveEffects,
        narratorLogs: updatedNarratorLogs,
      });
    }

    setActiveInteractiveEncounter(null);
  };

  const handlePassEncounter = () => {
    if (!activeInteractiveEncounter) return;
    soundFX.playClickSound();
    const logText = activeInteractiveEncounter.type === 'TRADER'
      ? `🛍️ Passed on buying from the Wandering Merchant.`
      : `🔮 Left the Cursed Spirit Chest unmolested.`;

    const updatedNarratorLogs = [logText, ...(player.narratorLogs || [])].slice(0, 15);
    onUpdatePlayer({
      ...player,
      narratorLogs: updatedNarratorLogs,
    });
    setActiveInteractiveEncounter(null);
  };

  useEffect(() => {
    if (suppressActStory) {
      setShowActStoryModal(false);
      return;
    }
    const unlocked = player.unlockedActStoryIds ?? [];
    if (!unlocked.includes(selectedLocation.id)) {
      setShowActStoryModal(true);
    } else {
      setShowActStoryModal(false);
    }
  }, [selectedLocation.id, player.unlockedActStoryIds, suppressActStory]);

  // Mandatory Automatic Act Guardian Discovery Modal trigger when player reaches Climax Level
  useEffect(() => {
    if (battle.inCombat || showActStoryModal) return;
    const bossId = selectedLocation.bossId;
    if (!bossId) return;

    const isNgPlus = (player.ngPlusLevel || 0) > 0;
    const startLvl = player.ngPlusStartLevel || 0;
    const baseBossReq = selectedLocation.bossLevelReq ?? (selectedLocation.minLevel + 5);
    const bossLevelReq = isNgPlus ? startLvl + baseBossReq - 1 : baseBossReq;

    const isDiscovered = (player.discoveredBossIds ?? []).includes(bossId);

    if (player.level >= bossLevelReq && !isDiscovered) {
      setShowBossDiscoveryModal(true);
      const discovered = Array.from(new Set([...(player.discoveredBossIds ?? []), bossId]));
      onUpdatePlayer({
        ...player,
        discoveredBossIds: discovered,
      });
    }
  }, [selectedLocation.id, selectedLocation.bossId, selectedLocation.bossLevelReq, player.level, player.ngPlusLevel, player.ngPlusStartLevel, player.discoveredBossIds, battle.inCombat, showActStoryModal]);

  const handleCloseActStory = () => {
    setShowActStoryModal(false);
    const unlocked = Array.from(new Set([...(player.unlockedActStoryIds ?? []), selectedLocation.id]));
    onUpdatePlayer({
      ...player,
      unlockedActStoryIds: unlocked,
    });
  };

  const derived = calcDerivedStats(player.attributes, player.level, player.equipment);

  const rawSkillIds = player.equippedSkillIds && player.equippedSkillIds.length > 0
    ? player.equippedSkillIds
    : getDefaultSkillIds((player.heroClass || 'Mandirigma') as any);

  const equippedSkills: Skill[] = rawSkillIds
    .map((id) => ALL_SKILLS.find((s) => s.id === id))
    .filter((s): s is Skill => s !== undefined)
    .slice(0, 3);

  const actQuests = (player.sideQuests || []).filter((q) => q.actId === selectedLocation.id);
  const actQuestsCompleted = actQuests.filter((q) => q.isCompleted || q.isClaimed).length;
  const actQuestsDiscovered = actQuests.filter((q) => q.isDiscovered).length;
  const hasUndiscovered = actQuests.some((q) => !q.isDiscovered);
  const hasUncompleted = actQuestsCompleted < actQuests.length;
  const isBossDefeated = (player.completedBossIds || []).includes(selectedLocation.bossId || '');
  const baseBossReq = selectedLocation.bossLevelReq ?? (selectedLocation.minLevel + 5);
  const isNgPlus = (player.ngPlusLevel || 0) > 0;
  const startLvl = player.ngPlusStartLevel || player.level;
  const bossLevelReq = isNgPlus ? startLvl + baseBossReq - 1 : baseBossReq;
  const frozenExpThreshold = Math.floor(calcExpRequired(bossLevelReq) * 0.65);
  const isBossQualified = isBossDefeated || player.level > bossLevelReq || (player.level === bossLevelReq && player.exp >= frozenExpThreshold);
  const isBossLevelLocked = !isBossQualified;

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

  const syncCombatLogs = (newLogs: BattleLogEntry[], p: PlayerCharacter = player): PlayerCharacter => {
    const existing = p.persistentCombatLogs || [];
    const existingIds = new Set(existing.map((l) => l.id));
    const fresh = newLogs.filter((l) => !existingIds.has(l.id));
    if (fresh.length === 0) return p;
    const merged = [...fresh, ...existing].slice(0, 100);
    return { ...p, persistentCombatLogs: merged };
  };

  // Select Location with Strict Level, Act Boss Gate, and Forfeit Gate Validation
  const handleSelectLocation = (loc: GameLocation) => {
    if (loc.id === selectedLocation.id) return;
    if (activeInteractiveEncounter) {
      setActiveInteractiveEncounter(null);
    }

    const reqPower = calcRequiredActPower(loc.id, player.ngPlusLevel || 0);
    if (derived.powerLevel < reqPower) {
      notify(`🔒 Act Locked! Titan Power Rating ${reqPower} required to enter ${loc.name}. (Your Power: ${derived.powerLevel})`, 'warning', '🔒');
      return;
    }

    const targetLocIndex = GAME_LOCATIONS.findIndex((l) => l.id === loc.id);
    const currentLocIndex = GAME_LOCATIONS.findIndex((l) => l.id === selectedLocation.id);

    if (targetLocIndex > 0) {
      const prevLoc = GAME_LOCATIONS[targetLocIndex - 1];
      if (prevLoc.bossId && !(player.completedBossIds || []).includes(prevLoc.bossId)) {
        notify(`🔒 Act Guardian Gate: You must defeat the Act Guardian Boss of ${prevLoc.name} before accessing ${loc.name}!`, 'warning', '🔒');
        return;
      }
    }

    // Check if advancing to a higher Act with incomplete side quests in current Act:
    if (targetLocIndex > currentLocIndex) {
      const pendingQuests = (player.sideQuests || []).filter(
        (q) => q.actId === selectedLocation.id && !q.isCompleted && !q.isClaimed && !q.isForfeited
      );
      if (pendingQuests.length > 0) {
        setPendingAdvanceLocation(loc);
        setShowAdvanceWarningModal(true);
        return;
      }
    }

    setSelectedLocation(loc);
    onUpdatePlayer({
      ...player,
      currentLocationId: loc.id,
    });
  };

  const handleConfirmAdvanceAndForfeit = () => {
    if (!pendingAdvanceLocation) return;
    const loc = pendingAdvanceLocation;

    const newlyForfeited: string[] = [];
    const updatedSideQuests = (player.sideQuests || []).map((q) => {
      if (q.actId === selectedLocation.id && !q.isCompleted && !q.isClaimed && !q.isForfeited) {
        newlyForfeited.push(q.id);
        return { ...q, isForfeited: true };
      }
      return q;
    });

    const updatedForfeitedIds = Array.from(new Set([...(player.forfeitedQuestIds || []), ...newlyForfeited]));

    setSelectedLocation(loc);
    setExplorationEvent(`🗺️ Advanced to ${loc.name}! ${newlyForfeited.length} uncompleted side quests in ${selectedLocation.name} were permanently forfeited.`);
    soundFX.playClickSound();

    onUpdatePlayer({
      ...player,
      currentLocationId: loc.id,
      sideQuests: updatedSideQuests,
      forfeitedQuestIds: updatedForfeitedIds,
    });

    setShowAdvanceWarningModal(false);
    setPendingAdvanceLocation(null);
  };

  const { ventureCost, searchCost, bossCost } = getActStaminaCosts(selectedLocation.id, player.ngPlusLevel || 0);
  const maxStamina = calcMaxStamina(player.level);

  // Boss Battle Starter (with option to forfeit uncompleted side quests)
  const startBossBattle = (forfeitQuests: boolean) => {
    if (!selectedLocation.bossId) return;

    let updatedSideQuests = player.sideQuests || [];
    let updatedForfeitedIds = player.forfeitedQuestIds || [];

    if (forfeitQuests) {
      const newlyForfeited: string[] = [];
      updatedSideQuests = updatedSideQuests.map((q) => {
        if (q.actId === selectedLocation.id && !q.isClaimed) {
          newlyForfeited.push(q.id);
          return { ...q, isForfeited: true };
        }
        return q;
      });
      updatedForfeitedIds = Array.from(new Set([...updatedForfeitedIds, ...newlyForfeited]));
    }

    const currentStamina = player.stamina ?? maxStamina;
    const newStamina = Math.max(0, currentStamina - bossCost);

    const boss = generateMonsterForLocation(selectedLocation.minLevel, selectedLocation.bossId, undefined, player.ngPlusLevel || 0, player.ngPlusStartLevel || 0);

    setExplorationEvent(`⚔️ CLIMAX GUARDIAN BATTLE! Challenging ${boss.name} (${boss.title})!`);
    soundFX.playCritSound();

    onUpdatePlayer({
      ...player,
      stamina: newStamina,
      sideQuests: updatedSideQuests,
      forfeitedQuestIds: updatedForfeitedIds,
    });

    onUpdateBattle({
      inCombat: true,
      turnNumber: 1,
      playerActionGauge: 100,
      enemyActionGauge: 50,
      enemy: boss,
      logs: [
        {
          id: `boss_init_${Date.now()}`,
          turn: 1,
          actor: 'SYSTEM',
          text: `⚔️ [ACT GUARDIAN ENCOUNTER] You confront ${boss.name} (${boss.title}) in ${selectedLocation.name}!`,
          type: 'CRIT',
        },
      ],
      winner: null,
    });

    setShowBossWarningModal(false);
  };

  const handleInitiateBossChallenge = () => {
    if (activeInteractiveEncounter) {
      notify('Resolve or dismiss the active sector encounter first!', 'warning', '⚠️');
      return;
    }
    const bossId = selectedLocation.bossId;
    if (bossId && !(player.discoveredBossIds ?? []).includes(bossId)) {
      setShowBossDiscoveryModal(true);
      const discovered = Array.from(new Set([...(player.discoveredBossIds ?? []), bossId]));
      onUpdatePlayer({
        ...player,
        discoveredBossIds: discovered,
      });
      return;
    }

    if (isBossLevelLocked) {
      notify("An overwhelming primordial spirit barrier shrouds the inner sanctum. The realm's guardian does not acknowledge your presence yet. Purge more malevolent spirits from this sector to awaken the guardian...", 'warning', '🌑');
      return;
    }

    const currentStamina = player.stamina ?? maxStamina;
    if (currentStamina < bossCost) {
      notify(`⚡ Confronting the Act Guardian requires at least ${bossCost} Stamina in ${selectedLocation.name}!`, 'warning', '⚡');
      return;
    }

    if (hasUncompleted) {
      setShowBossWarningModal(true);
    } else {
      startBossBattle(false);
    }
  };

  // EXPLORATION ACTION 1: Venture Forward (Dynamic Stamina Cost per Act)
  const handleVentureForward = () => {
    if (activeInteractiveEncounter) {
      notify('Resolve or dismiss the active sector encounter first!', 'warning', '⚠️');
      return;
    }
    const reqVenturePower = calcRequiredActPower(selectedLocation.id, player.ngPlusLevel || 0);
    if (derived.powerLevel < reqVenturePower) {
      notify(`🔒 Act Locked! Reach Titan Power ${reqVenturePower} to explore ${selectedLocation.name}. (Your Power: ${derived.powerLevel})`, 'warning', '🔒');
      return;
    }

    const currentStamina = player.stamina ?? maxStamina;
    if (currentStamina < ventureCost) {
      notify(`⚡ Exhausted! You need at least ${ventureCost} Stamina to venture forward in ${selectedLocation.name}. Rest at Poblacion Sanctuary Inn.`, 'warning', '⚡');
      return;
    }

    soundFX.playAttackSound();
    const newStamina = currentStamina - ventureCost;

    // Helper to push persistent narrative feed log entries
    const addNarratorLog = (logText: string): string[] => {
      const existing = player.narratorLogs || [];
      return [logText, ...existing].slice(0, 15);
    };

    // Check if there are undiscovered side quests in current Act:
    // When venturing, player has a ~12% rare chance to encounter a regional quest giver!
    const undiscoveredQuests = (player.sideQuests || []).filter(
      (q) => q.actId === selectedLocation.id && !q.isDiscovered
    );

    if (undiscoveredQuests.length > 0 && Math.random() < 0.12) {
      const quest = undiscoveredQuests[0];
      const updatedSideQuests = (player.sideQuests || []).map((q) =>
        q.id === quest.id ? { ...q, isDiscovered: true } : q
      );

      const logText = `📜 RARE ENCOUNTER: Met ${quest.giver} in ${selectedLocation.name}! Discovered Side Quest: [${quest.title}]! Objective: ${quest.objectiveText} (${quest.progressRequired} needed).`;
      soundFX.playLevelUpSound();

      onUpdatePlayer({
        ...player,
        stamina: newStamina,
        sideQuests: updatedSideQuests,
        narratorLogs: addNarratorLog(logText),
      });
      return;
    }

    // Roll encounter table: ~65% Enemy, ~20% Lore/Loot, ~15% Ambient Event
    const roll = Math.random();

    if (roll < 0.65) {
      const isSurvivalRealm = selectedLocation.id === 'loc_act_infinite';
      const curStreak = battle.survivalKillStreak ?? 0;
      const bossThreshold = battle.survivalBossThreshold ?? (Math.floor(Math.random() * 4) + 7);
      const waveTier = battle.survivalWaveTier ?? 1;

      let monster: EnemyMonster;
      let isSurvivalBoss = false;

      if (isSurvivalRealm && curStreak >= bossThreshold) {
        // Spawn Guaranteed Celestial Titan Boss
        isSurvivalBoss = true;
        const bossPool = ['boss_act_1', 'boss_act_2', 'boss_act_3', 'boss_act_4', 'boss_act_5', 'boss_act_6', 'boss_act_7', 'boss_act_8'];
        const chosenBossId = bossPool[Math.floor(Math.random() * bossPool.length)];
        monster = generateMonsterForLocation(47 + (waveTier - 1) * 3, chosenBossId, undefined, player.ngPlusLevel || 0, player.ngPlusStartLevel || 0);
        monster.name = `Celestial Titan ${monster.name} (Wave ${waveTier})`;
        monster.isBoss = true;
        monster.maxHp = Math.floor(monster.maxHp * (1 + waveTier * 0.15));
        monster.currentHp = monster.maxHp;
        monster.attackMin = Math.floor(monster.attackMin * (1 + waveTier * 0.1));
        monster.attackMax = Math.floor(monster.attackMax * (1 + waveTier * 0.1));
      } else {
        // Standard Monster Spawn
        const activeTargetId = player.bounties.find(
          (b) => b.isAccepted !== false && !b.isCompleted && selectedLocation.monsters.includes(b.targetMonsterId)
        )?.targetMonsterId;

        const monsterToSpawn = (activeTargetId && Math.random() < 0.85) ? activeTargetId : undefined;
        const spawnLvl = isSurvivalRealm ? 47 + (waveTier - 1) * 2 : selectedLocation.minLevel;
        monster = generateMonsterForLocation(spawnLvl, monsterToSpawn, selectedLocation.monsters, player.ngPlusLevel || 0, player.ngPlusStartLevel || 0);
        if (isSurvivalRealm) {
          monster.maxHp = Math.floor(monster.maxHp * (1 + waveTier * 0.08));
          monster.currentHp = monster.maxHp;
        }
      }

      const logText = isSurvivalBoss
        ? `⚡ CELESTIAL TITAN APPROACHING! Wave Tier #${waveTier} Boss ${monster.name} emerges!`
        : `⚠️ ENEMY AMBUSH: A level ${monster.level} ${monster.name} (${monster.title}) lunges from the shadow thicket!`;
      soundFX.playCritSound();

      onUpdatePlayer({
        ...player,
        stamina: newStamina,
        narratorLogs: addNarratorLog(logText),
      });
      onUpdateBattle({
        inCombat: true,
        turnNumber: 1,
        playerActionGauge: 100,
        enemyActionGauge: 50,
        enemy: monster,
        logs: [
          {
            id: `init_${Date.now()}`,
            turn: 1,
            actor: 'SYSTEM',
            text: isSurvivalBoss
              ? `⚡ [TITAN BOSS WAVE] Challenging Celestial Titan Boss ${monster.name}!`
              : `[EXPLORATION] Ambushed by ${monster.name} (${monster.title}) in ${selectedLocation.name}!`,
            type: isSurvivalBoss ? 'CRIT' : 'INFO',
          },
        ],
        winner: null,
        survivalKillStreak: curStreak,
        survivalBossThreshold: bossThreshold,
        survivalWaveTier: waveTier,
      });
    } else if (roll < 0.85) {
      // 35% Chance to trigger an Interactive Sector Encounter (Wandering Trader or Cursed Spirit Chest)
      if (Math.random() < 0.35) {
        const catalog = getScaledForgeCatalog(player.level, (player.heroClass || 'Mandirigma') as HeroClass);
        const isTrader = Math.random() < 0.5 && catalog.length > 0;

        if (isTrader) {
          const offer = getWanderingMerchantOffer(player.level, (player.heroClass || 'Mandirigma') as HeroClass, player.equipment);
          const encounter: InteractiveEncounter = {
            id: `trader_${Date.now()}`,
            type: 'TRADER',
            title: '🛍️ Wandering Artisan Merchant',
            description: `A traveling artisan offers a high-grade ${offer.item.rarity} [${offer.item.name}] at a ${offer.discountPercent}% discount!`,
            traderItem: offer.item,
            traderCostCC: offer.costCC,
            originalCostCC: offer.originalCostCC,
            discountPercent: offer.discountPercent,
          };
          setActiveInteractiveEncounter(encounter);
          soundFX.playCoinSound();
          onUpdatePlayer({
            ...player,
            stamina: newStamina,
            narratorLogs: addNarratorLog(`🛍️ WANDERING MERCHANT: Met a traveling artisan offering [${offer.item.name}] for ${formatCostInCowries(offer.costCC)}!`),
          });
          return;
        } else {
          const hpCost = Math.max(10, Math.floor(derived.maxHp * 0.2));
          const mpCost = Math.max(15, Math.floor(derived.maxMp * 0.3));
          const rewardCC = 150 + player.level * 25;
          const encounter: InteractiveEncounter = {
            id: `chest_${Date.now()}`,
            type: 'CURSED_CHEST',
            title: '🔮 Ancient Cursed Spirit Chest',
            description: 'You come across an obsidian chest wrapped in blood-red runes. It demands a sacrifice of Vitality or Mana to unseal its treasure.',
            chestHpCost: hpCost,
            chestMpCost: mpCost,
            chestRewardCC: rewardCC,
            chestRewardMutya: 1,
          };
          setActiveInteractiveEncounter(encounter);
          soundFX.playPotionSound();
          onUpdatePlayer({
            ...player,
            stamina: newStamina,
            narratorLogs: addNarratorLog(`🔮 CURSED CHEST: Discovered an ancient obsidian chest pulsating with dark spirit magic!`),
          });
          return;
        }
      }

      // Plethora of Folklore Encounters: Lore & Loot Caches
      const encounterPool = [
        {
          type: 'CHEST',
          text: `🎁 ANCIENT BURIAL JAR SALVAGE: Uncovered a pre-colonial pottery jar containing +140 Cowrie Shells and a sparkling Mutya Pearl Shard!`,
          rewardCC: 140,
          rewardMutya: 1,
        },
        {
          type: 'CHEST',
          text: `🏺 HIDDEN DATU CACHE: Discovered an abandoned ironwood chest tucked beneath roots, securing +200 Cowrie Shells!`,
          rewardCC: 200,
          rewardMutya: 0,
        },
        {
          type: 'LORE',
          text: `✨ GLOWING DIWATA ALTAR: Offered fresh fruit at a moss-covered shrine. Received ancestral blessings (+25 HP restored)!`,
          healHpPercent: 0.25,
        },
        {
          type: 'LORE',
          text: `🌿 WANDERING BABAYLAN HERBALIST: An elder shaman shared a medicinal tonic, restoring +20 MP and clearing fatigue.`,
          healMp: 20,
        },
        {
          type: 'EVENT',
          text: `🌌 BLOOD MOON MIST: Crimson fog settles across ${selectedLocation.name}. Ambient Aether hums with ancient spirit magic.`,
        },
      ];

      const enc = encounterPool[Math.floor(Math.random() * encounterPool.length)];
      soundFX.playCoinSound();

      let newHp = player.currentHp;
      let newMp = player.currentMp;
      let updatedWallet = { ...player.wallet };

      if (enc.healHpPercent) {
        newHp = Math.min(derived.maxHp, player.currentHp + Math.floor(derived.maxHp * enc.healHpPercent));
      }
      if (enc.healMp) {
        newMp = Math.min(derived.maxMp, player.currentMp + enc.healMp);
      }
      if (enc.rewardCC) {
        const totalCC = totalCowriesFromWallet(player.wallet) + enc.rewardCC;
        updatedWallet = cowriesToWallet(totalCC);
        if (enc.rewardMutya) {
          updatedWallet.mutyaShards = (player.wallet.mutyaShards || 0) + enc.rewardMutya;
          updatedWallet.prismaticShards = updatedWallet.mutyaShards;
        }
      }

      onUpdatePlayer({
        ...player,
        stamina: newStamina,
        currentHp: newHp,
        currentMp: newMp,
        wallet: updatedWallet,
        narratorLogs: addNarratorLog(enc.text),
      });
    } else {
      // Ambient Folklore Event
      const ambientEvents = [
        `🎋 ANCESTRAL BALETE WHISPER: Ancient voices hum softly in the balete vines, sharing forgotten proverbs of old Luzon.`,
        `🌋 VOLCANIC ASH DRIFT: Gray ash from Mount Kanlaon drifts through the trees like soft winter snow.`,
        `🦅 EAGLE EYE SIGHTING: A majestic Philippine Eagle circles high above the canopy, marking prey below.`,
        `🥁 ANCESTRAL WAR DRUMS: Distant drumbeats echo beyond the mountain ridge, signaling chieftain movements.`,
      ];
      const selectedEvent = ambientEvents[Math.floor(Math.random() * ambientEvents.length)];
      soundFX.playPotionSound();

      onUpdatePlayer({
        ...player,
        stamina: newStamina,
        narratorLogs: addNarratorLog(selectedEvent),
      });
    }
  };

  // EXPLORATION ACTION 2: Search Area — Redefined Tactical Scouting & Discovery System
  const handleSearchArea = () => {
    if (activeInteractiveEncounter) {
      notify('Resolve or dismiss the active sector encounter first!', 'warning', '⚠️');
      return;
    }
    const reqSearchPower = calcRequiredActPower(selectedLocation.id, player.ngPlusLevel || 0);
    if (derived.powerLevel < reqSearchPower) {
      notify(`🔒 Act Locked! Reach Titan Power ${reqSearchPower} to search ${selectedLocation.name}. (Your Power: ${derived.powerLevel})`, 'warning', '🔒');
      return;
    }

    const currentStamina = player.stamina ?? maxStamina;
    if (currentStamina < searchCost) {
      notify(`⚡ Search Area requires ${searchCost} Stamina in ${selectedLocation.name}!`, 'warning', '⚡');
      return;
    }

    const newStamina = currentStamina - searchCost;

    const addNarratorLog = (logText: string): string[] => {
      const existing = player.narratorLogs || [];
      return [logText, ...existing].slice(0, 15);
    };

    // Roll weighted 100-point table for Search Area outcomes
    const roll = Math.floor(Math.random() * 100) + 1; // 1 to 100

    // OUTCOME A (30% chance, roll 1–30): Rare Treasure & Artifact Cache
    if (roll <= 30) {
      soundFX.playCoinSound();
      const rewardCC = 180 + player.level * 30 + Math.floor(Math.random() * 150);
      const rewardMutya = Math.random() < 0.6 ? 1 : 2;
      const totalCC = totalCowriesFromWallet(player.wallet) + rewardCC;
      const updatedWallet = cowriesToWallet(totalCC, (player.wallet.mutyaShards || 0) + rewardMutya);

      const logText = `🎁 SEARCH DISCOVERY: Uncovered a buried pre-colonial pottery jar! Secured +${formatCostInCowries(rewardCC)} & +${rewardMutya} Mutya Pearl Shard!`;

      onUpdatePlayer({
        ...player,
        stamina: newStamina,
        wallet: updatedWallet,
        narratorLogs: addNarratorLog(logText),
      });
      notify(`🎁 Uncovered Ancient Artifact Cache! (+${formatCostInCowries(rewardCC)}, +${rewardMutya} Mutya)`, 'success', '🎁');
      return;
    }

    // OUTCOME B (25% chance, roll 31–55): Ancestral Diwata Shrine / Blessing
    if (roll <= 55) {
      soundFX.playSpellSound();
      const subRoll = Math.random();
      let shrineMsg = '';
      let newHp = player.currentHp;
      let newMp = player.currentMp;
      let staminaBonus = 0;
      let isEmpowered = player.isEmpoweredNextTurn;

      if (subRoll < 0.4) {
        const healHp = Math.floor(derived.maxHp * 0.35);
        const healMp = Math.floor(derived.maxMp * 0.35);
        newHp = Math.min(derived.maxHp, player.currentHp + healHp);
        newMp = Math.min(derived.maxMp, player.currentMp + healMp);
        shrineMsg = `✨ ANCESTRAL DIWATA SHRINE: Offered incense at a sacred spirit shrine. Restored +${healHp} HP and +${healMp} MP!`;
      } else if (subRoll < 0.7) {
        staminaBonus = 4;
        shrineMsg = `✨ SPIRIT REFRESHMENT: Drank from a sacred mineral spring. Recovered +4 Stamina!`;
      } else {
        isEmpowered = true;
        shrineMsg = `🔥 EMPOWERED SPIRIT AURA: Communed with ancestral spirits. Gained Empowered aura (+50% bonus strike DMG for next battle)!`;
      }

      onUpdatePlayer({
        ...player,
        stamina: Math.min(maxStamina, newStamina + staminaBonus),
        currentHp: newHp,
        currentMp: newMp,
        isEmpoweredNextTurn: isEmpowered,
        narratorLogs: addNarratorLog(shrineMsg),
      });
      notify(shrineMsg, 'success', '✨');
      return;
    }

    // OUTCOME C (30% chance, roll 56–85): Targeted Bounty Tracking & Surprise Ambush
    if (roll <= 85) {
      // Prioritize active accepted bounty monster for current sector
      const activeTargetId = player.bounties.find(
        (b) => b.isAccepted !== false && !b.isCompleted && selectedLocation.monsters.includes(b.targetMonsterId)
      )?.targetMonsterId;

      const monsterToSpawn = activeTargetId || undefined;
      const monster = generateMonsterForLocation(selectedLocation.minLevel + 2, monsterToSpawn, selectedLocation.monsters, player.ngPlusLevel || 0, player.ngPlusStartLevel || 0);
      if (!monster.name.startsWith('Elite')) {
        monster.name = `Elite ${monster.name}`;
      }
      monster.maxHp = Math.floor(monster.maxHp * 1.4);
      monster.currentHp = monster.maxHp;

      const logText = `⚔️ SURPRISE AMBUSH: Successfully tracked down ${monster.name}! Caught the enemy unaware — you strike first!`;
      soundFX.playCritSound();

      onUpdatePlayer({
        ...player,
        stamina: newStamina,
        narratorLogs: addNarratorLog(logText),
      });

      // Surprise Ambush: PlayerActionGauge = 100, EnemyActionGauge = 0!
      onUpdateBattle({
        inCombat: true,
        turnNumber: 1,
        playerActionGauge: 100,
        enemyActionGauge: 0,
        enemy: monster,
        logs: [
          {
            id: `init_ambush_${Date.now()}`,
            turn: 1,
            actor: 'SYSTEM',
            text: `⚡ [SURPRISE AMBUSH] Tracked & ambushed ${monster.name}! You gain the first initiative turn!`,
            type: 'CRIT',
          },
        ],
        winner: null,
      });
      return;
    }

    // OUTCOME D (15% chance, roll 86–100): Interactive Special Encounter
    if (Math.random() < 0.5) {
      // Wandering Merchant
      const offer = getWanderingMerchantOffer(player.level, (player.heroClass || 'Mandirigma') as HeroClass, player.equipment);

      const encounter: InteractiveEncounter = {
        id: `trader_${Date.now()}`,
        type: 'TRADER',
        title: '🛍️ Wandering Artisan Merchant',
        description: `A traveling artisan offers a high-grade ${offer.item.rarity} [${offer.item.name}] at a ${offer.discountPercent}% discount!`,
        traderItem: offer.item,
        traderCostCC: offer.costCC,
        originalCostCC: offer.originalCostCC,
        discountPercent: offer.discountPercent,
      };
      setActiveInteractiveEncounter(encounter);
      soundFX.playCoinSound();

      onUpdatePlayer({
        ...player,
        stamina: newStamina,
        narratorLogs: addNarratorLog(`🛍️ WANDERING MERCHANT: Discovered a traveling artisan offering [${offer.item.name}] for ${formatCostInCowries(offer.costCC)}!`),
      });
    } else {
      // Cursed Chest
      const hpCost = Math.max(10, Math.floor(derived.maxHp * 0.2));
      const mpCost = Math.max(15, Math.floor(derived.maxMp * 0.3));
      const rewardCC = 220 + player.level * 30;
      const encounter: InteractiveEncounter = {
        id: `chest_${Date.now()}`,
        type: 'CURSED_CHEST',
        title: '🔮 Ancient Cursed Spirit Chest',
        description: 'You come across an obsidian chest wrapped in blood-red runes. It demands a sacrifice of Vitality or Mana to unseal its treasure.',
        chestHpCost: hpCost,
        chestMpCost: mpCost,
        chestRewardCC: rewardCC,
        chestRewardMutya: 1,
      };
      setActiveInteractiveEncounter(encounter);
      soundFX.playPotionSound();

      onUpdatePlayer({
        ...player,
        stamina: newStamina,
        narratorLogs: addNarratorLog(`🔮 CURSED CHEST: Discovered an ancient obsidian chest pulsating with dark spirit magic!`),
      });
    }
  };

  // ─── ELEMENTAL ARMOR DR HELPER ──────────────────────────────────────────
  // Returns the armor damage reduction ratio based on damage type.
  // Higher denominator = more magic pierce = less mitigation.
  // PHYSICAL       → armor/(armor+150)  — heaviest mitigation
  // FIRE/FROST/POISON → armor/(armor+250) — elemental, partially blocked
  // LIGHTNING      → armor/(armor+350)  — mid-tier elemental
  // MAGIC/SHADOW/RADIANT → armor/(armor+400) — lightest mitigation
  const getEnemyDR = (
    armor: number,
    dmgType: string,
    heroClass?: string,
    weaponCategory?: string
  ): number => {
    // Babaylan / Staff basic attacks always count as MAGIC pierce
    const effectiveDmgType =
      (heroClass === 'Babaylan' || weaponCategory === 'STAFF') && dmgType === 'PHYSICAL'
        ? 'MAGIC'
        : dmgType;

    switch (effectiveDmgType) {
      case 'MAGIC':
      case 'SHADOW':
      case 'RADIANT':
        return armor / (armor + 400);
      case 'LIGHTNING':
        return armor / (armor + 350);
      case 'FIRE':
      case 'FROST':
      case 'POISON':
        return armor / (armor + 250);
      case 'PHYSICAL':
      default:
        return armor / (armor + 150);
    }
  };

  // COMBAT ACTION 1: Basic Attack (Restores +5 MP on hit!)
  const handleAttack = () => {
    if (!battle.enemy || !battle.inCombat || battle.winner !== null) return;

    soundFX.playAttackSound();
    let logs = battle.logs;
    const enemy = { ...battle.enemy };

    const activeWeapon = player.equipment.weapon || player.equipment.primaryWeapon;
    const minDmg = activeWeapon?.baseDamageMin || 10;
    const maxDmg = activeWeapon?.baseDamageMax || 18;
    const weaponCategory = activeWeapon?.category;

    // Pick class/weapon attribute damage scaling
    let statBonus = derived.meleeDamage * 0.5;
    if (weaponCategory === 'BOW' || weaponCategory === 'DAGGER' || player.heroClass === 'Mangangaso' || player.heroClass === 'Bagani') {
      statBonus = derived.rangedDamage * 0.5;
    } else if (weaponCategory === 'STAFF' || player.heroClass === 'Babaylan') {
      statBonus = derived.magicDamage * 0.5;
    }

    const weaponRoll = Math.floor(minDmg + Math.random() * (maxDmg - minDmg + 1));
    const baseDmg = weaponRoll + Math.floor(statBonus);

    // Basic Attack restores +5 MP per strike
    const regenedMp = Math.min(derived.maxMp, player.currentMp + 5);

    // Class/weapon-aware armor DR (fixes Babaylan always using physical formula)
    const enemyDR = getEnemyDR(enemy.armor, 'PHYSICAL', player.heroClass, weaponCategory);
    const finalDmg = Math.max(1, Math.floor(baseDmg * (1 - enemyDR)));

    const isCrit = Math.random() * 100 < derived.critChancePercent;
    if (isCrit) {
      // Crit: 2.0x applied to post-DR finalDmg for consistent feel regardless of enemy armor
      const critDmg = Math.floor(finalDmg * 2.0);
      enemy.currentHp -= critDmg;
      soundFX.playCritSound();
      logs = addLog(logs, `⚡ CRITICAL STRIKE! ${activeWeapon?.name || 'Strike'} devastated ${enemy.name} for ${critDmg} damage! (+5 MP)`, 'CRIT', 'PLAYER');
      // Guaranteed Bleed proc on critical hits
      const bleedEffect = { type: 'BLEED' as const, name: 'BLEED', isBuff: false, durationTurnsLeft: 3, magnitude: 0.03, stackCount: 1 };
      enemy.activeEffects = [...(enemy.activeEffects || []).filter(e => e.type !== 'BLEED'), bleedEffect];
      logs = addLog(logs, `🩸 Critical Wound! ${enemy.name} is BLEEDING (3 turns, 3% HP/turn)!`, 'DEBUFF', 'PLAYER');
    } else {
      enemy.currentHp -= finalDmg;
      logs = addLog(logs, `⚔️ ${activeWeapon?.name || 'Basic Strike'} hit ${enemy.name} for ${finalDmg} damage! (+5 MP)`, 'DAMAGE', 'PLAYER');
    }

    const updatedPlayer = { ...player, currentMp: regenedMp };
    onUpdatePlayer(updatedPlayer);

    if (enemy.currentHp <= 0) {
      enemy.currentHp = 0;
      handleVictory(enemy, logs);
      return;
    }

    const enemyTurnResult = executeEnemyTurn(enemy, logs, updatedPlayer);
    if (enemyTurnResult.isDefeated) return;
    onUpdateBattle({ ...battle, turnNumber: battle.turnNumber + 1, enemy, logs: enemyTurnResult.logs, guardedLastTurn: false });
  };

  // COMBAT ACTION 2: Skill Execution (Dynamic from player equipped skills)
  const handleExecuteSkill = (skill: Skill) => {
    if (!battle.enemy || !battle.inCombat || battle.winner !== null) return;

    if (player.currentMp < skill.mpCost) {
      notify(`Not enough MP to execute ${skill.name}! Costs ${skill.mpCost} MP.`, 'warning', '⚡');
      return;
    }

    setShowSpellPicker(false);
    let logs = battle.logs;
    const enemy = { ...battle.enemy };

    let updatedPlayer = { ...player, currentMp: player.currentMp - skill.mpCost };

    const skillRank = getSkillRank(player, skill.id);
    const rankLabel = skillRank > 1 ? ` [Rank ${skillRank}]` : '';

    // --- HEAL SKILLS ---
    if (skill.damageType === 'HEAL') {
      soundFX.playSpellSound();
      const scaledHeal = getScaledSkillHeal(skill, skillRank) || (skill.healsPercent ?? 0.25);
      const healHp = Math.floor(derived.maxHp * scaledHeal);
      updatedPlayer.currentHp = Math.min(derived.maxHp, player.currentHp + healHp);
      logs = addLog(logs, `${skill.icon} Used [${skill.name}]${rankLabel}! Restored +${healHp} HP!`, 'BUFF', 'PLAYER');

      if (skill.effectType) {
        logs = addLog(logs, `✨ ${skill.effectType} status activated!`, 'BUFF', 'PLAYER');
      }

      onUpdatePlayer(updatedPlayer);
      const enemyTurnResult = executeEnemyTurn(enemy, logs, updatedPlayer);
      if (enemyTurnResult.isDefeated) return;
      onUpdateBattle({ ...battle, turnNumber: battle.turnNumber + 1, enemy, logs: enemyTurnResult.logs });
      return;
    }

    // --- DAMAGE / UTILITY SKILLS ---
    soundFX.playAttackSound();
    const activeWeapon = player.equipment.weapon ?? player.equipment.primaryWeapon ?? null;
    const weaponMin = activeWeapon?.baseDamageMin ?? 8;
    const weaponMax = activeWeapon?.baseDamageMax ?? 14;
    const weaponRoll = Math.floor(weaponMin + Math.random() * (weaponMax - weaponMin + 1));

    let derivedBonus = derived.meleeDamage;
    if (['MAGIC', 'LIGHTNING', 'SHADOW', 'RADIANT'].includes(skill.damageType)) {
      derivedBonus = derived.magicDamage;
    } else if (['FIRE', 'FROST'].includes(skill.damageType)) {
      derivedBonus = derived.magicDamage * 0.8 + derived.rangedDamage * 0.2;
    } else if (skill.classReq === 'Mangangaso' || skill.classReq === 'Bagani') {
      derivedBonus = Math.max(derived.meleeDamage, derived.rangedDamage);
    }

    const scaledMult = getScaledSkillDamageMult(skill, skillRank) || skill.baseDamageMultiplier || 1.0;
    let baseDmg = Math.floor((weaponRoll + Math.floor(derivedBonus * 0.4)) * scaledMult);

    if (player.isEmpoweredNextTurn) {
      baseDmg = Math.floor(baseDmg * 1.5);
      updatedPlayer.isEmpoweredNextTurn = false;
      logs = addLog(logs, `🔥 EMPOWERED BURST! +50% bonus strike damage applied!`, 'BUFF', 'PLAYER');
    }

    // Crit check (must happen after finalDmg is computed so 2.0x applies post-armor)
    const enemyDR = getEnemyDR(enemy.armor, skill.damageType);
    const finalDmg = Math.max(1, Math.floor(baseDmg * (1 - enemyDR)));

    const isCrit = Math.random() * 100 < derived.critChancePercent;
    if (isCrit) {
      const critDmg = Math.floor(finalDmg * 2.0);
      enemy.currentHp -= critDmg;
      soundFX.playCritSound();
      logs = addLog(logs, `⚡ CRITICAL HIT! ${skill.icon} [${skill.name}]${rankLabel} devastated ${enemy.name} for ${critDmg}!`, 'CRIT', 'PLAYER');
      // Guaranteed Bleed proc on critical hits
      const bleedEffect = { type: 'BLEED' as const, name: 'BLEED', isBuff: false, durationTurnsLeft: 3, magnitude: 0.03, stackCount: 1 };
      enemy.activeEffects = [...(enemy.activeEffects || []).filter(e => e.type !== 'BLEED'), bleedEffect];
      logs = addLog(logs, `🩸 Critical Wound! ${enemy.name} is BLEEDING (3 turns, 3% HP/turn)!`, 'DEBUFF', 'PLAYER');
    } else {
      enemy.currentHp -= finalDmg;
      logs = addLog(logs, `${skill.icon} [${skill.name}]${rankLabel} dealt ${finalDmg} to ${enemy.name}!`, 'DAMAGE', 'PLAYER');
    }

    if (skill.effectType) {
      logs = addLog(logs, `🩸 ${enemy.name} is afflicted with ${skill.effectType}!`, 'DEBUFF', 'PLAYER');
    }

    if (enemy.currentHp <= 0) {
      enemy.currentHp = 0;
      onUpdatePlayer(updatedPlayer);
      handleVictory(enemy, logs);
      return;
    }

    onUpdatePlayer(updatedPlayer);
    const enemyTurnResult = executeEnemyTurn(enemy, logs, updatedPlayer);
    if (enemyTurnResult.isDefeated) return;
    onUpdateBattle({ ...battle, turnNumber: battle.turnNumber + 1, enemy, logs: enemyTurnResult.logs, guardedLastTurn: false });
  };

  // COMBAT ACTION 3: Use Consumable Item
  const handleUseConsumable = (item: ConsumableItem, itemIndexInBag: number) => {
    if (!battle.enemy || !battle.inCombat || battle.winner !== null) return;

    soundFX.playPotionSound();
    setShowItemPicker(false);
    let logs = battle.logs;

    let updatedHp = player.currentHp;
    let updatedMp = player.currentMp;

    if (item.hpRestore) updatedHp = Math.min(derived.maxHp, player.currentHp + item.hpRestore);
    if (item.mpRestore) updatedMp = Math.min(derived.maxMp, player.currentMp + item.mpRestore);

    const restoreSummary = [
      item.hpRestore ? `+${item.hpRestore} HP` : null,
      item.mpRestore ? `+${item.mpRestore} MP` : null,
      item.cleansesDebuffs ? `Cleansed Debuffs` : null,
    ].filter(Boolean).join(', ');

    logs = addLog(logs, `🧪 Consumed [${item.name}]! (${restoreSummary})`, 'HEAL', 'PLAYER');

    const updatedInventory = player.inventory.filter((_, idx) => idx !== itemIndexInBag);
    const updatedPlayer = {
      ...player,
      currentHp: updatedHp,
      currentMp: updatedMp,
      inventory: updatedInventory,
    };

    onUpdatePlayer(updatedPlayer);
    const enemy = { ...battle.enemy };
    const enemyTurnResult = executeEnemyTurn(enemy, logs, updatedPlayer);
    if (enemyTurnResult.isDefeated) return;
    onUpdateBattle({ ...battle, turnNumber: battle.turnNumber + 1, enemy, logs: enemyTurnResult.logs });
  };

  // COMBAT ACTION 4: Guard / Parry
  const handleGuard = () => {
    if (!battle.enemy || !battle.inCombat || battle.winner !== null) return;

    // Guard Exhaustion: cannot guard 2 turns in a row
    if (battle.guardedLastTurn) {
      notify('⚔️ Guard Exhausted! You must act offensively before raising your guard again.', 'warning', '🛡️');
      return;
    }

    soundFX.playPotionSound();
    let logs = battle.logs;

    // Guarding restores +5 MP (reduced from +10) and grants a modest Defensive Stance
    const regenedMp = Math.min(derived.maxMp, player.currentMp + 5);
    // Parry: 8% base + AGI×0.25, capped at 40% — rewards AGI-focused classes
    const parryChance = Math.min(40, Math.floor(8 + player.attributes.agi * 0.25));

    logs = addLog(
      logs,
      `🛡️ Raised Guard! (+5 MP, +15% DR, ${parryChance}% Parry active)`,
      'BUFF',
      'PLAYER'
    );

    const updatedPlayer = {
      ...player,
      currentMp: regenedMp,
      isCoveredNextTurn: true,
    };

    onUpdatePlayer(updatedPlayer);
    const enemy = { ...battle.enemy };
    const enemyTurnResult = executeEnemyTurn(enemy, logs, updatedPlayer);
    if (enemyTurnResult.isDefeated) return;
    onUpdateBattle({ ...battle, turnNumber: battle.turnNumber + 1, enemy, logs: enemyTurnResult.logs, guardedLastTurn: true });
  };

  // COMBAT ACTION 5: Flee (Max 2 attempts per battle; 2nd attempt has significantly higher fail chance)
  const handleFlee = () => {
    if (!battle.inCombat) return;

    const attempts = battle.fleeAttempts ?? 0;
    if (attempts >= 2) {
      notify('❌ Escape Route Completely Blocked! Flee is disabled for the remainder of this battle.', 'warning', '🔒');
      return;
    }

    // 1st attempt: standard flee chance (50 + AGI * 1.5)%
    // 2nd attempt: heavy penalty flee chance (15 + AGI * 0.5)% -> much higher fail chance!
    const baseChance = Math.min(90, 50 + player.attributes.agi * 1.5);
    const fleeChance = attempts === 0 ? baseChance : Math.max(10, Math.floor(15 + player.attributes.agi * 0.5));
    const roll = Math.random() * 100;

    if (roll <= fleeChance) {
      notify('🏃 Escape Successful! Retreating back to sector entrance.', 'info', '🏃');
      soundFX.playCoinSound();

      if (selectedLocation.id === 'loc_act_infinite') {
        const reachedWave = battle.survivalWaveTier ?? 1;
        if (reachedWave > (player.highestSurvivalWave || 0)) {
          notify(`🏆 NEW PERSONAL BEST RECORD! Logged highest wave reached: Tier #${reachedWave}!`, 'success', '🏆');
          onUpdatePlayer({
            ...player,
            highestSurvivalWave: reachedWave,
          });
        }
      }

      onUpdateBattle({
        inCombat: false,
        turnNumber: 0,
        playerActionGauge: 100,
        enemyActionGauge: 0,
        enemy: null,
        logs: [],
        winner: null,
        fleeAttempts: 0,
      });
    } else {
      const nextAttempts = attempts + 1;
      let logs = battle.logs;

      if (nextAttempts >= 2) {
        logs = addLog(logs, `❌ Flee Failed! The enemy cut off your retreat path! (Flee option is now EXHAUSTED)`, 'DEBUFF', 'PLAYER');
        notify('❌ Flee Failed! Escape route completely cut off — Flee is now disabled!', 'error', '🔒');
      } else {
        logs = addLog(logs, `❌ Flee Failed! The enemy blocked your escape route! (1 Flee attempt remaining)`, 'DEBUFF', 'PLAYER');
      }

      const enemy = { ...battle.enemy! };
      const enemyTurnResult = executeEnemyTurn(enemy, logs);
      if (enemyTurnResult.isDefeated) return;
      onUpdateBattle({
        ...battle,
        turnNumber: battle.turnNumber + 1,
        enemy,
        logs: enemyTurnResult.logs,
        fleeAttempts: nextAttempts,
      });
    }
  };

  // Enemy Turn Resolution (Preserves active player state & deducted MP)
  const executeEnemyTurn = (
    enemy: EnemyMonster,
    currentLogs: BattleLogEntry[],
    activePlayerState?: PlayerCharacter
  ): { logs: BattleLogEntry[]; isDefeated: boolean } => {
    const p = activePlayerState || player;
    let logs = currentLogs;

    // ── Enemy Bleed DoT tick (from player critical hits) ──────────────────
    const enemyBleed = (enemy.activeEffects || []).find(e => e.type === 'BLEED');
    if (enemyBleed && enemyBleed.durationTurnsLeft > 0) {
      const bleedDmg = Math.max(1, Math.floor(enemy.maxHp * 0.03));
      enemy.currentHp = Math.max(0, enemy.currentHp - bleedDmg);
      logs = addLog(logs, `🩸 ${enemy.name} bleeds for ${bleedDmg} HP (3% max HP)!`, 'DAMAGE', 'SYSTEM');
      enemy.activeEffects = (enemy.activeEffects || []).map(e =>
        e.type === 'BLEED' ? { ...e, durationTurnsLeft: e.durationTurnsLeft - 1 } : e
      ).filter(e => e.durationTurnsLeft > 0 || e.type !== 'BLEED');
      // Check if bleed killed the enemy
      if (enemy.currentHp <= 0) {
        onUpdatePlayer({ ...p, isCoveredNextTurn: false });
        handleVictory(enemy, logs);
        return { logs, isDefeated: true };
      }
    }

    const enemyDmg = Math.floor(enemy.attackMin + Math.random() * (enemy.attackMax - enemy.attackMin + 1));

    // ── Dodge check ──────────────────────────────────────────────────────
    if (Math.random() * 100 < derived.dodgeChancePercent) {
      // AGI counter-dodge: Bagani/Mangangaso at sufficient AGI get a counter-attack proc
      const isAgiClass = player.heroClass === 'Bagani' || player.heroClass === 'Mangangaso';
      const counterChance = isAgiClass ? Math.min(40, Math.floor(p.attributes.agi * 0.4)) : 0;
      if (isAgiClass && Math.random() * 100 < counterChance) {
        const activeWpn = p.equipment.weapon ?? p.equipment.primaryWeapon;
        const counterDmg = Math.max(1, Math.floor((activeWpn?.baseDamageMin ?? 10) * 0.6));
        enemy.currentHp -= counterDmg;
        logs = addLog(logs, `💨 EVASION COUNTER! Evaded ${enemy.name}'s strike — riposted for ${counterDmg}!`, 'CRIT', 'PLAYER');
      } else {
        logs = addLog(logs, `💨 Evaded ${enemy.name}'s strike! No damage taken.`, 'INFO', 'PLAYER');
      }
      onUpdatePlayer({ ...p, isCoveredNextTurn: false });
      return { logs, isDefeated: false };
    }

    // ── Parry & Riposte check when Guarding ──────────────────────────────
    if (p.isCoveredNextTurn) {
      // Parry: 8% base + AGI×0.25, capped at 40% — rewards AGI builds
      const parryChance = Math.min(40, Math.floor(8 + p.attributes.agi * 0.25));
      const isParried = Math.random() * 100 < parryChance;

      if (isParried) {
        soundFX.playCritSound();
        // Riposte = 50% of player's weapon baseDamageMin (class-appropriate, not inflated by enemy roll)
        const activeWpn = p.equipment.weapon ?? p.equipment.primaryWeapon;
        const riposteDmg = Math.max(1, Math.floor((activeWpn?.baseDamageMin ?? 10) * 0.5));
        enemy.currentHp = Math.max(0, enemy.currentHp - riposteDmg);

        logs = addLog(
          logs,
          `⚔️ PARRY! Deflected ${enemy.name}'s strike — countered for ${riposteDmg}!`,
          'CRIT',
          'PLAYER'
        );

        if (enemy.currentHp <= 0) {
          onUpdatePlayer({ ...p, isCoveredNextTurn: false });
          handleVictory(enemy, logs);
          return { logs, isDefeated: true };
        }

        onUpdatePlayer({ ...p, isCoveredNextTurn: false });
        return { logs, isDefeated: false };
      }
    }

    let playerDR = derived.damageReductionPercent / 100;
    if (p.isCoveredNextTurn) {
      playerDR = Math.min(0.85, playerDR + 0.15);
    }

    const finalEnemyDmg = Math.max(1, Math.floor(enemyDmg * (1 - playerDR)));
    const newPlayerHp = Math.max(0, p.currentHp - finalEnemyDmg);

    if (p.isCoveredNextTurn) {
      logs = addLog(logs, `🛡️ GUARDED! Blocked ${enemy.name}'s strike (took ${finalEnemyDmg} damage).`, 'DAMAGE', 'ENEMY');
    } else {
      logs = addLog(logs, `⚔️ ${enemy.name} attacked you for ${finalEnemyDmg} damage!`, 'DAMAGE', 'ENEMY');
    }

    if (newPlayerHp <= 0) {
      const lostCowries = Math.floor((p.wallet.cowrieShells || 0) * 0.25);
      const lostSilver = Math.floor((p.wallet.silverPieces || 0) * 0.25);
      const newCowries = Math.max(0, (p.wallet.cowrieShells || 0) - lostCowries);
      const newSilver = Math.max(0, (p.wallet.silverPieces || 0) - lostSilver);

      const updatedWallet = {
        ...p.wallet,
        cowrieShells: newCowries,
        silverPieces: newSilver,
        copperCoins: newCowries,
        silverShillings: newSilver,
      };

      const resHp = Math.max(1, Math.floor(derived.maxHp * 0.01));
      const resMp = Math.max(1, Math.floor(derived.maxMp * 0.01));
      const resStamina = Math.max(1, Math.floor(calcMaxStamina(p.level) * 0.01));

      const defeatLog = `💀 SPIRIT SEVERANCE: Banished to Poblacion Sanctuary! Resurrected at 1% HP (${resHp}), 1% MP (${resMp}), 1% ST (${resStamina}) & lost ${lostCowries} Cowries, ${lostSilver} Silver.`;
      logs = addLog(logs, defeatLog, 'DEBUFF', 'SYSTEM');
      notify(`💀 Slain in Battle! Resurrected at 1% HP/MP/ST. Lost ${lostCowries} Cowries & ${lostSilver} Silver.`, 'error', '💀');

      let highestWave = p.highestSurvivalWave || 0;
      if (selectedLocation.id === 'loc_act_infinite') {
        const reachedWave = battle.survivalWaveTier ?? 1;
        if (reachedWave > highestWave) {
          highestWave = reachedWave;
          notify(`🏆 NEW PERSONAL BEST RECORD! Logged highest wave reached: Tier #${reachedWave}!`, 'success', '🏆');
        }
      }

      onUpdatePlayer({
        ...p,
        currentHp: resHp,
        currentMp: resMp,
        stamina: resStamina,
        wallet: updatedWallet,
        highestSurvivalWave: highestWave,
        isCoveredNextTurn: false,
      });

      onUpdateBattle({
        inCombat: false,
        turnNumber: 0,
        playerActionGauge: 100,
        enemyActionGauge: 0,
        enemy: null,
        logs: [],
        winner: 'ENEMY',
      });

      onNavigateToHaven();
      return { logs, isDefeated: true };
    }

    onUpdatePlayer({
      ...p,
      currentHp: newPlayerHp,
      isCoveredNextTurn: false,
    });

    return { logs, isDefeated: false };
  };

  // Victory Resolution
  const handleVictory = (enemy: EnemyMonster, currentLogs: BattleLogEntry[]) => {
    soundFX.playLevelUpSound();
    let logs = addLog(currentLogs, `🎉 VICTORY! Defeated ${enemy.name}! Earned +${enemy.expReward} EXP and +${enemy.copperReward} CC.`, 'BUFF', 'SYSTEM');

    // Strict match: Either the cleaned enemy name matches/contains target name, or enemy ID contains target monster ID
    const cleanEnemyName = enemy.name.replace(/^Elite\s+/, '').trim().toLowerCase();
    const cleanEnemyId = enemy.id.toLowerCase();

    // Advance Active Accepted Bounties
    const updatedBounties = player.bounties.map((bounty) => {
      if (!bounty.isAccepted || bounty.isCompleted) return bounty;

      const cleanTargetName = bounty.targetMonsterName.toLowerCase();
      const cleanTargetId = bounty.targetMonsterId.toLowerCase();

      const isMatch =
        cleanEnemyName.includes(cleanTargetName) ||
        cleanTargetName.includes(cleanEnemyName) ||
        cleanEnemyId.includes(cleanTargetId);

      if (isMatch) {
        const newCount = Math.min(bounty.targetCount, bounty.currentCount + 1);
        const justCompleted = newCount >= bounty.targetCount;
        if (justCompleted && !bounty.isCompleted) {
          logs = addLog(logs, `🎯 BOUNTY CONTRACT FULFILLED: [${bounty.title}]! Claim reward in Journal or Tavern!`, 'BUFF', 'SYSTEM');
        }
        return {
          ...bounty,
          currentCount: newCount,
          isCompleted: justCompleted,
        };
      }
      return bounty;
    });

    // Advance Mandatory Regional Side Quests
    const updatedSideQuests = (player.sideQuests || []).map((sq) => {
      if (sq.isCompleted || sq.isForfeited) return sq;

      const cleanTargetId = (sq.targetMonsterId || '').toLowerCase();
      const cleanObj = sq.objectiveText.toLowerCase();

      const isMatch =
        (cleanTargetId && cleanEnemyId.includes(cleanTargetId)) ||
        cleanEnemyName.includes(cleanObj) ||
        cleanObj.includes(cleanEnemyName);

      if (isMatch) {
        const newCount = Math.min(sq.progressRequired, sq.progressCurrent + 1);
        const justCompleted = newCount >= sq.progressRequired;
        if (justCompleted && !sq.isCompleted) {
          logs = addLog(logs, `✨ SIDE QUEST OBJECTIVE COMPLETE: [${sq.title}]! Claim reward in Journal!`, 'BUFF', 'SYSTEM');
        }
        return {
          ...sq,
          progressCurrent: newCount,
          isCompleted: justCompleted,
        };
      }
      return sq;
    });

    onMonsterKilled(enemy);

    const isBoss = enemy.id === selectedLocation.bossId;
    const isBossDefeated = (player.completedBossIds || []).includes(selectedLocation.bossId || '');
    const baseCap = selectedLocation.bossLevelReq ?? (selectedLocation.minLevel + 5);
    const actClimaxCap = !isBossDefeated ? (isNgPlus ? startLvl + baseCap - 1 : baseCap) : undefined;

    const currentTotalCowries = totalCowriesFromWallet(player.wallet);
    const bossCowrieReward = 1500; // 15 Silver Pieces
    const bossMutyaReward = 4;
    const shardDropped = Math.random() < enemy.shardChance;

    const updatedWallet = cowriesToWallet(
      currentTotalCowries + (isBoss ? bossCowrieReward : enemy.copperReward),
      (player.wallet.mutyaShards || 0) + (isBoss ? bossMutyaReward : (shardDropped ? 1 : 0))
    );

    let newLevel = player.level;
    let newExp = player.exp;
    let newAP = player.availableAP;

    let updatedCompletedBossIds = player.completedBossIds || [];
    let act6Done = player.act6Completed;
    let act8Done = player.act8Completed;
    let mountUnlocked = player.mountUnlocked;
    let updatedUnlockedLocs = player.unlockedLocationIds || ['loc_act_1'];
    let updatedEquipment = { ...player.equipment };
    let updatedInventory = [...player.inventory];
    let updatedMemories = [...(player.encryptedMemories || [])];
    let updatedHighestWave = player.highestSurvivalWave || 0;

    const isSurvivalRealm = selectedLocation.id === 'loc_act_infinite';

    if (!isBoss) {
      const expGained = enemy.expReward;
      const expResult = processExpGain(player.level, player.exp, expGained, actClimaxCap);
      newLevel = expResult.newLevel;
      newExp = expResult.newExp;
      newAP = player.availableAP + expResult.apGained;

      if (actClimaxCap && player.level >= actClimaxCap && expResult.levelsGained === 0) {
        logs = addLog(logs, `🌑 [PRIMORDIAL SPIRIT BARRIER] Battle spirit is capped at 65% of Level ${actClimaxCap}! Awaken and challenge the Guardian of ${selectedLocation.name} to transcend to the next realm!`, 'DEBUFF', 'SYSTEM');
      }

      if (expResult.levelsGained > 0) {
        logs = addLog(logs, `🌟 LEVEL UP! Reached Level ${newLevel}! Earned +${expResult.apGained} Attribute Points. EXP reset to 0.`, 'CRIT', 'SYSTEM');
      }

      if (isSurvivalRealm) {
        const curStreak = (battle.survivalKillStreak ?? 0) + 1;
        onUpdateBattle({
          ...battle,
          survivalKillStreak: curStreak,
        });
        logs = addLog(logs, `⚔️ CELESTIAL SURVIVAL KILL: Slain a titan spawn in Bathala's Celestial Ether.`, 'INFO', 'SYSTEM');
      }
    } else {
      const isFirstWin = !isBossDefeated;

      if (isSurvivalRealm) {
        // Survival Realm Boss Slain!
        const curWave = battle.survivalWaveTier ?? 1;
        const nextWave = curWave + 1;
        const nextThreshold = Math.floor(Math.random() * 4) + 7;

        if (curWave > updatedHighestWave) {
          updatedHighestWave = curWave;
          notify(`🏆 NEW PERSONAL BEST RECORD! Reached Wave Tier #${curWave} in Bathala's Celestial Ether!`, 'success', '🏆');
        }

        // Guaranteed Triumphant Memory & Mutya Shards
        const triumphantMemory: EncryptedMemory = {
          id: `mem_survival_${Date.now()}`,
          name: `Prismatic Celestial Memory (RED)`,
          rarity: 'RED',
          minLevel: player.level,
          acquiredAtLocation: 'loc_act_infinite',
        };
        updatedMemories = [...updatedMemories, triumphantMemory];

        logs = addLog(logs, `🏆 CELESTIAL TITAN SLAIN! Cleared Wave Tier #${curWave}! Granted +1x Prismatic Memory & +5 Mutya Shards! Next Boss Wave threshold: ${nextThreshold} kills.`, 'CRIT', 'SYSTEM');

        onUpdateBattle({
          ...battle,
          survivalWaveTier: nextWave,
          survivalKillStreak: 0,
          survivalBossThreshold: nextThreshold,
        });
      } else if (isFirstWin) {
        if (!updatedCompletedBossIds.includes(enemy.id)) {
          updatedCompletedBossIds = [...updatedCompletedBossIds, enemy.id];
        }
        // Anti-Spoiler GM Announcement: Mask boss name, announce Act Guardian vanquished with Lvl & Class!
        const actNumStr = selectedLocation.id.replace('loc_act_', '').toUpperCase();
        const playerTitle = `${player.name} [Lv. ${player.level} ${player.heroClass || 'Wayfarer'}]`;
        broadcastSystemAnnouncement(`${playerTitle} has vanquished the Guardian of Act ${actNumStr}!`);

        // 1. Award remaining 35% EXP -> Guaranteed Level-Up into next Act
        const expForClimax = calcExpRequired(bossLevelReq);
        const missing35Exp = Math.max(0, expForClimax - player.exp);
        const firstWinExpResult = processExpGain(player.level, player.exp, missing35Exp);
        newLevel = firstWinExpResult.newLevel;
        newExp = firstWinExpResult.newExp;
        newAP = player.availableAP + firstWinExpResult.apGained;

        if (firstWinExpResult.levelsGained > 0) {
          logs = addLog(logs, `🌟 BOUNDLESS BREAKTHROUGH! Reached Level ${newLevel}! Earned +${firstWinExpResult.apGained} Attribute Points. EXP reset to 0.`, 'CRIT', 'SYSTEM');
        }

        // 2. Generate Guaranteed Superior Legendary Boss Equipment Artifact
        const bossItem = generateBossLootArtifact({
          bossId: enemy.id,
          bossLevelReq,
          playerLevel: player.level,
          heroClass: (player.heroClass || 'Mandirigma') as HeroClass,
          isFirstWin: true,
          playerEquipment: player.equipment,
        });
        updatedInventory = [...updatedInventory, bossItem];
        logs = addLog(logs, `🗡️ GUARDIAN LEGENDARY ARTIFACT DROPPED: [${bossItem.name}]!`, 'CRIT', 'SYSTEM');

        // Broadcast High-Tier Gear Discovery
        if (bossItem.rarity === 'MYTHIC' || bossItem.rarity === 'LUNAR' || bossItem.tier >= 9) {
          broadcastSystemAnnouncement(`${playerTitle} discovered Legendary ${bossItem.rarity || 'Mythic'} equipment [${bossItem.name}]!`);
        }

        // 3. Generate High-Rarity Encrypted Memory Drop (PURPLE or RED)
        const memRarity: MemoryRarity = Math.random() < 0.5 ? 'PURPLE' : 'RED';
        const bossMemory: EncryptedMemory = {
          id: `mem_boss_${Date.now()}`,
          name: `Encrypted Boss Memory (${memRarity})`,
          rarity: memRarity,
          minLevel: selectedLocation.minLevel,
          acquiredAtLocation: selectedLocation.id,
        };
        updatedMemories = [...updatedMemories, bossMemory];
        logs = addLog(logs, `💎 HIGH-RARITY MEMORY DROPPED: [${bossMemory.name}] added to vault!`, 'BUFF', 'SYSTEM');

        // 4. Unlock Next Realm Location
        let nextActName: string | undefined = undefined;
        const currentLocIdx = GAME_LOCATIONS.findIndex((l) => l.id === selectedLocation.id);
        if (currentLocIdx !== -1 && currentLocIdx + 1 < GAME_LOCATIONS.length) {
          const nextLoc = GAME_LOCATIONS[currentLocIdx + 1];
          if (!updatedUnlockedLocs.includes(nextLoc.id)) {
            updatedUnlockedLocs = [...updatedUnlockedLocs, nextLoc.id];
            logs = addLog(logs, `🗺️ NEW REALM UNLOCKED: ${nextLoc.name} is now accessible!`, 'BUFF', 'SYSTEM');
          }
          nextActName = nextLoc.name;
        }

        if (enemy.id === 'boss_act_6') {
          act6Done = true;
          mountUnlocked = true;
          const firstMount = MOUNTS[0];
          const alreadyHasMount = updatedEquipment.mount || updatedInventory.some((i) => i.id === firstMount.id);
          if (!alreadyHasMount) {
            if (!updatedEquipment.mount && !updatedEquipment.bike) {
              updatedEquipment.mount = firstMount;
              updatedEquipment.bike = firstMount;
              logs = addLog(logs, `🐃 FIRST MYTHICAL MOUNT AWARDED: You have tamed the legendary [${firstMount.name}] (Tier 6 Warbeast)! Automatically equipped.`, 'CRIT', 'SYSTEM');
            } else {
              updatedInventory = [...updatedInventory, firstMount];
              logs = addLog(logs, `🐃 FIRST MYTHICAL MOUNT AWARDED: The legendary [${firstMount.name}] (Tier 6 Warbeast) added to bag!`, 'CRIT', 'SYSTEM');
            }
          }
          logs = addLog(logs, `🏆 BEASTMASTER STABLES UNLOCKED! Slaying Tambanokano has granted access to Mythical Mounts!`, 'BUFF', 'SYSTEM');
        }

        if (enemy.id === 'boss_act_8') {
          act8Done = true;
          if (!updatedUnlockedLocs.includes('loc_act_infinite')) {
            updatedUnlockedLocs = [...updatedUnlockedLocs, 'loc_act_infinite'];
          }
          logs = addLog(logs, `👑 SUPREME CAMPAIGN VICTORY! Bakunawa defeated! Unlocked Celestial Ether Survival Realm & Anito Rebirth!`, 'CRIT', 'SYSTEM');
        }

        setActiveBossVictoryReward({
          bossId: enemy.id,
          bossName: enemy.name,
          bossTitle: enemy.title,
          nextActName,
          expEarned: missing35Exp,
          cowriesEarned: bossCowrieReward,
          mutyaShardsEarned: bossMutyaReward,
          droppedItem: bossItem,
          droppedMemory: bossMemory,
        });
      } else {
        // Re-attempt Boss Victory
        logs = addLog(logs, `👑 ACT GUARDIAN CONQUERED: Defeated ${enemy.name} in combat!`, 'CRIT', 'SYSTEM');

        // 1. Fair scaled EXP reward for re-attempt (25% of level requirement)
        const reattemptExp = Math.floor(calcExpRequired(player.level) * 0.25);
        const reattemptExpResult = processExpGain(player.level, player.exp, reattemptExp);
        newLevel = reattemptExpResult.newLevel;
        newExp = reattemptExpResult.newExp;
        newAP = player.availableAP + reattemptExpResult.apGained;

        if (reattemptExpResult.levelsGained > 0) {
          logs = addLog(logs, `🌟 LEVEL UP! Reached Level ${newLevel}! Earned +${reattemptExpResult.apGained} Attribute Points.`, 'CRIT', 'SYSTEM');
        }

        // 2. Generate Equivalent / Better Boss Loot Artifact
        const bossItem = generateBossLootArtifact({
          bossId: enemy.id,
          bossLevelReq,
          playerLevel: player.level,
          heroClass: (player.heroClass || 'Mandirigma') as HeroClass,
          isFirstWin: false,
          playerEquipment: player.equipment,
        });
        updatedInventory = [...updatedInventory, bossItem];
        logs = addLog(logs, `🗡️ GUARDIAN ARTIFACT REWARD: [${bossItem.name}] added to bag!`, 'BUFF', 'SYSTEM');
      }
    }

    onUpdatePlayer(syncCombatLogs(logs, {
      ...player,
      level: newLevel,
      exp: newExp,
      availableAP: newAP,
      locationPoints: player.locationPoints + 15,
      equipment: updatedEquipment,
      inventory: updatedInventory,
      encryptedMemories: updatedMemories,
      bounties: updatedBounties,
      sideQuests: updatedSideQuests,
      wallet: updatedWallet,
      completedBossIds: updatedCompletedBossIds,
      unlockedLocationIds: updatedUnlockedLocs,
      act6Completed: act6Done,
      act8Completed: act8Done,
      highestSurvivalWave: updatedHighestWave,
      mountUnlocked: mountUnlocked,
    }));

    // KEEP inCombat: true so the Victory Card remains visible until the user clicks Claim Rewards!
    onUpdateBattle({
      inCombat: true,
      turnNumber: battle.turnNumber,
      playerActionGauge: 100,
      enemyActionGauge: 0,
      enemy: { ...enemy, currentHp: 0 },
      logs,
      winner: 'PLAYER',
    });
  };

  // Claim Rewards and exit battle viewport safely
  const handleClaimRewardsAndExit = () => {
    soundFX.playCoinSound();
    onUpdateBattle({
      inCombat: false,
      turnNumber: 0,
      playerActionGauge: 100,
      enemyActionGauge: 0,
      enemy: null,
      logs: [],
      winner: null,
    });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-amber-100 p-1.5 md:p-6 space-y-1.5 md:space-y-4 overflow-y-auto">
      {/* Sector Header & Location Selector */}
      {!battle.inCombat && (
        <div className="bg-zinc-900/90 border border-amber-900/50 rounded-lg md:rounded-xl p-2 md:p-4 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 md:gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[8px] md:text-[10px] font-mono uppercase text-amber-500 tracking-widest font-semibold">ACTIVE EXPEDITION ZONE</div>
            <h2 className="text-base md:text-2xl font-bold font-serif text-amber-200 truncate">{selectedLocation.name}</h2>
            <p className="text-[10px] md:text-xs text-zinc-400 mt-0.5 line-clamp-1 md:line-clamp-none hidden sm:block">{selectedLocation.description}</p>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0">
            <select
              value={selectedLocation.id}
              onChange={(e) => {
                const loc = GAME_LOCATIONS.find((l) => l.id === e.target.value);
                if (loc) handleSelectLocation(loc);
              }}
              className="w-full sm:w-auto bg-zinc-950 border border-amber-500/40 text-amber-200 rounded px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-mono font-bold cursor-pointer truncate"
            >
              {GAME_LOCATIONS.map((loc, idx) => {
                const isInfinite = loc.id === 'loc_act_infinite';
                const reqPower = calcRequiredActPower(loc.id, player.ngPlusLevel || 0);
                const isPowerLocked = derived.powerLevel < reqPower;
                const prevLoc = idx > 0 ? GAME_LOCATIONS[idx - 1] : null;
                const isBossLocked = isInfinite
                  ? !(player.act8Completed || (player.completedBossIds || []).includes('boss_act_8'))
                  : (prevLoc?.bossId ? !(player.completedBossIds || []).includes(prevLoc.bossId) : false);
                const isLocked = isPowerLocked || isBossLocked;
                const actRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][idx];

                let lockLabel = '';
                if (isLocked) {
                  if (isInfinite) {
                    lockLabel = `🔒 Celestial Ether (${isBossLocked ? 'Req Act VIII' : `${reqPower} Power`})`;
                  } else {
                    lockLabel = `🔒 Act ${actRoman}: ??? (${isBossLocked ? `Req Act ${idx}` : `${reqPower} Power`})`;
                  }
                } else {
                  if (isInfinite) {
                    lockLabel = `🌌 ${loc.name} (Survival Realm)`;
                  } else {
                    lockLabel = `✅ ${loc.name} (${reqPower} Power)`;
                  }
                }

                return (
                  <option key={loc.id} value={loc.id} disabled={isLocked} className={isLocked ? 'text-zinc-500 bg-zinc-950' : 'text-amber-200 bg-zinc-900'}>
                    {lockLabel}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}

      {/* Act Boss & Regional Quests Status Bar (When NOT in combat) */}
      {!battle.inCombat && (
        <div className="bg-zinc-950/80 border border-zinc-800 p-1.5 md:p-3 rounded-lg md:rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 md:gap-2 text-[9px] md:text-xs font-mono">
          <div className="flex items-center space-x-1.5 md:space-x-2 flex-wrap gap-y-0.5">
            <span className="text-red-400 font-bold">👑 Guardian:</span>
            <span className="text-zinc-200 truncate">
              {isBossDefeated || !isBossLevelLocked || (player.discoveredBossIds || []).includes(selectedLocation.bossId || '')
                ? (selectedLocation.name.split(':')[1]?.trim() || 'Act Guardian')
                : '??? Undiscovered'}
            </span>
            {(() => {
              const tmpl = MONSTER_TEMPLATES.find((m) => m.id === selectedLocation.bossId);
              const pwr = tmpl ? calcMonsterPowerRating(tmpl, selectedLocation.minLevel, player.ngPlusLevel || 0) : 0;
              return pwr > 0 ? (
                <span className="text-[8px] md:text-[10px] text-amber-300 font-bold font-mono">⚡ {pwr} Power</span>
              ) : null;
            })()}
            {isBossDefeated ? (
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[8px] md:text-[9px] px-1 py-0.2 rounded font-bold uppercase">
                Conquered ✓
              </span>
            ) : isBossLevelLocked ? (
              <span className="bg-zinc-900 text-zinc-400 border border-zinc-700 text-[8px] md:text-[9px] px-1 py-0.2 rounded font-bold uppercase">
                Locked
              </span>
            ) : (
              <span className="bg-red-950 text-red-300 border border-red-500/60 text-[8px] md:text-[9px] px-1 py-0.2 rounded font-bold uppercase animate-pulse">
                Ready
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-zinc-400">
              Quests: <strong className={actQuestsCompleted >= 3 ? 'text-emerald-400' : 'text-amber-400'}>{actQuestsCompleted}/3 Done</strong> ({actQuestsDiscovered}/3 Discovered)
            </span>
          </div>
        </div>
      )}

      {/* DEDICATED ACT GUARDIAN BOSS BUTTON (Above Sector Narrative Feed) */}
      {!battle.inCombat && (
        <button
          onClick={handleInitiateBossChallenge}
          disabled={isBossLevelLocked || !!activeInteractiveEncounter}
          className={`w-full py-1.5 px-2 md:p-3.5 border font-bold font-mono text-[10px] md:text-xs uppercase tracking-wider rounded-lg md:rounded-xl shadow-xl transition-all flex items-center justify-center space-x-1.5 md:space-x-2 min-h-[32px] md:min-h-[44px] ${
            isBossLevelLocked || activeInteractiveEncounter
              ? 'bg-zinc-950/90 border-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
              : isBossDefeated
              ? 'bg-zinc-900 border-amber-600/50 text-amber-300 hover:bg-zinc-850'
              : 'bg-gradient-to-r from-red-950 via-red-900 to-red-950 hover:from-red-900 hover:to-red-850 border-2 border-red-500 text-red-100 ring-2 ring-red-500/30 animate-pulse'
          }`}
        >
          <span className="text-xs md:text-base">{isBossLevelLocked ? '🔒' : '👑'}</span>
          <span className="truncate">
            {isBossLevelLocked
              ? `[ Act Guardian Locked — Req Lv ${bossLevelReq} ]`
              : isBossDefeated
              ? `[ Re-challenge ${selectedLocation.name.split(':')[1]?.trim() || 'Act Guardian'} ]`
              : `[ CONFRONT ACT GUARDIAN ] (${bossCost} Stamina)`}
          </span>
        </button>
      )}

      {/* Exploration Event Feed (When NOT in combat) */}
      {!battle.inCombat && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg md:rounded-xl p-2 md:p-3.5 flex flex-col justify-between shadow-xl min-h-[105px] md:min-h-[220px]">
          <div>
            <div className="text-[10px] md:text-xs font-mono uppercase text-amber-500 font-bold mb-1 flex justify-between items-center border-b border-zinc-800/80 pb-0.5">
              <span>SECTOR NARRATIVE FEED</span>
              <span className="text-[9px] md:text-[10px] text-zinc-500 font-normal">PERSISTED LORE LOG</span>
            </div>
            <div className="space-y-1 md:space-y-2 max-h-28 md:max-h-48 overflow-y-auto pr-1">
              {(player.narratorLogs && player.narratorLogs.length > 0) ? (
                player.narratorLogs.map((log, idx) => (
                  <p key={idx} className={`text-[10px] md:text-xs font-mono leading-snug md:leading-relaxed ${idx === 0 ? 'text-amber-200 font-bold border-l-2 border-amber-500 pl-2 bg-amber-950/20 py-0.5 rounded-r' : 'text-zinc-400 pl-2 opacity-85'}`}>
                    {log}
                  </p>
                ))
              ) : (
                <p className="text-[10px] md:text-xs font-mono text-amber-200/90 leading-snug md:leading-relaxed border-l-2 border-amber-500 pl-2 py-0.5 bg-amber-950/20 rounded-r">
                  {`You are treading carefully through ${selectedLocation.name}. Ambient Aether hums in the stone. Venture forward to scout the sector.`}
                </p>
              )}
            </div>
          </div>

          <div className="text-[9.5px] md:text-xs font-mono text-zinc-400 border-t border-zinc-800 pt-1 mt-1 flex justify-between">
            <span>Danger: <strong className="text-amber-300">Level {selectedLocation.minLevel}+</strong></span>
            <span>Stamina: <strong className="text-emerald-400">{player.stamina ?? maxStamina}/{maxStamina}</strong></span>
          </div>
        </div>
      )}

      {/* INTERACTIVE SECTOR ENCOUNTER CARD */}
      {!battle.inCombat && activeInteractiveEncounter && (
        <div className="bg-gradient-to-r from-amber-950/80 via-zinc-900 to-amber-950/80 border-2 border-amber-500/70 rounded-lg md:rounded-xl p-2.5 md:p-4 shadow-2xl space-y-2 md:space-y-3 animate-fade-in">
          <div className="flex justify-between items-start border-b border-amber-500/30 pb-1.5 md:pb-2">
            <div>
              <span className="text-[9px] md:text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">SPECIAL SECTOR ENCOUNTER</span>
              <h3 className="text-base md:text-lg font-bold font-serif text-amber-200">{activeInteractiveEncounter.title}</h3>
            </div>
            <button onClick={handlePassEncounter} className="text-[10px] md:text-xs text-zinc-400 hover:text-white font-mono px-2 py-0.5 md:py-1 bg-zinc-900 rounded border border-zinc-700">✕ Dismiss</button>
          </div>

          <p className="text-[10px] md:text-xs text-zinc-300 font-mono leading-snug md:leading-relaxed">
            {activeInteractiveEncounter.description}
          </p>

          {activeInteractiveEncounter.type === 'TRADER' && activeInteractiveEncounter.traderItem && (
            <div className="bg-zinc-950/90 border border-amber-500/40 p-2.5 md:p-3.5 rounded-lg flex flex-col space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5 md:space-x-3">
                  <span className="text-2xl md:text-3xl">{activeInteractiveEncounter.traderItem.icon || '⚔️'}</span>
                  <div>
                    <div className="text-xs md:text-sm font-bold text-amber-300 font-serif flex items-center gap-1.5 flex-wrap">
                      <span>{activeInteractiveEncounter.traderItem.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold border ${
                        activeInteractiveEncounter.traderItem.rarity === 'COMMON' ? 'bg-zinc-800 text-zinc-300 border-zinc-600' :
                        activeInteractiveEncounter.traderItem.rarity === 'UNCOMMON' ? 'bg-emerald-950 text-emerald-300 border-emerald-700' :
                        activeInteractiveEncounter.traderItem.rarity === 'RARE' ? 'bg-blue-950 text-blue-300 border-blue-700' :
                        activeInteractiveEncounter.traderItem.rarity === 'EPIC' ? 'bg-purple-950 text-purple-300 border-purple-700' :
                        activeInteractiveEncounter.traderItem.rarity === 'LEGENDARY' ? 'bg-amber-950 text-amber-300 border-amber-600' :
                        'bg-red-950 text-red-300 border-red-600'
                      }`}>
                        {activeInteractiveEncounter.traderItem.rarity}
                      </span>
                    </div>
                    <div className="text-[9px] md:text-[10px] font-mono text-zinc-400 mt-0.5">
                      {activeInteractiveEncounter.traderItem.category} • Req Lv {activeInteractiveEncounter.traderItem.levelReq}
                      {activeInteractiveEncounter.traderItem.baseDamageMax ? ` • Dmg ${activeInteractiveEncounter.traderItem.baseDamageMin}-${activeInteractiveEncounter.traderItem.baseDamageMax}` : ''}
                      {activeInteractiveEncounter.traderItem.baseDefense !== undefined ? ` • Def +${activeInteractiveEncounter.traderItem.baseDefense}` : ''}
                    </div>
                  </div>
                </div>
                {activeInteractiveEncounter.discountPercent && (
                  <span className="text-[9px] md:text-[10px] font-bold font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-600/60 px-2 py-0.5 rounded-full shrink-0">
                    {activeInteractiveEncounter.discountPercent}% OFF
                  </span>
                )}
              </div>

              {/* Affixes if present */}
              {activeInteractiveEncounter.traderItem.affixes && activeInteractiveEncounter.traderItem.affixes.length > 0 && (
                <div className="flex flex-wrap gap-1 text-[9px] font-mono pt-1 border-t border-zinc-800">
                  {activeInteractiveEncounter.traderItem.affixes.map((affix, idx) => {
                    let detailText = '';
                    if (affix.statusInfliction) {
                      detailText = `🩸 ${affix.statusInfliction.type} (${affix.statusInfliction.chancePercent}%)`;
                    } else if (affix.statusMitigation) {
                      detailText = affix.statusMitigation.isImmune
                        ? `🛡️ ${affix.statusMitigation.type} IMMUNE`
                        : `🛡️ ${affix.statusMitigation.resistancePercent}% ${affix.statusMitigation.type} RESIST`;
                    }
                    return (
                      <span key={idx} className="bg-amber-950/60 border border-amber-600/40 text-amber-200 px-1.5 py-0.5 rounded">
                        ✨ {affix.name} {detailText ? `• ${detailText}` : ''}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Price & Action Row */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-1 border-t border-amber-500/20">
                <div className="text-[10px] md:text-xs font-mono text-zinc-300 flex items-center space-x-2 w-full sm:w-auto">
                  <span>Price:</span>
                  <strong className="text-amber-400 font-bold">
                    {formatCostInCowries(activeInteractiveEncounter.traderCostCC || 0)}
                  </strong>
                  {activeInteractiveEncounter.originalCostCC && (
                    <span className="text-zinc-500 line-through text-[9px]">
                      {formatCostInCowries(activeInteractiveEncounter.originalCostCC)}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <button
                    onClick={handleBuyTraderItem}
                    className="flex-1 sm:flex-none bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold px-4 py-1.5 md:py-2 rounded text-[10px] md:text-xs uppercase font-mono shadow-md active:scale-95 transition-all"
                  >
                    Buy ({formatCostInCowries(activeInteractiveEncounter.traderCostCC || 0)})
                  </button>
                  <button
                    onClick={handlePassEncounter}
                    className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold px-3 py-1.5 md:py-2 rounded text-[10px] md:text-xs uppercase font-mono border border-zinc-700"
                  >
                    Pass
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeInteractiveEncounter.type === 'CURSED_CHEST' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[10px] md:text-xs">
              <button
                onClick={() => handleOpenCursedChest('HP')}
                className="bg-red-950/90 hover:bg-red-900 border border-red-500/60 text-red-200 p-2 md:p-2.5 rounded-lg text-center space-y-0.5 transition-all active:scale-95"
              >
                <div className="font-bold text-red-400">🩸 Sacrifice Health</div>
                <div className="text-[9px] md:text-[10px] text-zinc-400">Pay -{activeInteractiveEncounter.chestHpCost} HP</div>
              </button>
              <button
                onClick={() => handleOpenCursedChest('MP')}
                className="bg-purple-950/90 hover:bg-purple-900 border border-purple-500/60 text-purple-200 p-2 md:p-2.5 rounded-lg text-center space-y-0.5 transition-all active:scale-95"
              >
                <div className="font-bold text-purple-300">✨ Sacrifice Mana</div>
                <div className="text-[9px] md:text-[10px] text-zinc-400">Pay -{activeInteractiveEncounter.chestMpCost} MP</div>
              </button>
              <button
                onClick={handlePassEncounter}
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 p-2 md:p-2.5 rounded-lg text-center flex items-center justify-center font-bold"
              >
                🚶 Leave Chest Alone
              </button>
            </div>
          )}
        </div>
      )}

      {/* IN-LINE COMBAT VIEWPORT (When in combat) */}
      {battle.inCombat && battle.enemy && (
        <div className="flex-1 space-y-2 md:space-y-3 pt-1 md:pt-2">
          {/* Target Enemy Display Card */}
          <div className="bg-zinc-900/90 border border-red-900/60 rounded-lg md:rounded-xl p-2.5 md:p-4 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4">
            <div className="flex items-center space-x-3 md:space-x-4">
              <div className="w-11 h-11 md:w-16 md:h-16 bg-zinc-950 border border-amber-500/40 rounded-lg md:rounded-xl flex items-center justify-center text-2xl md:text-4xl shadow-inner shrink-0">
                {battle.winner === 'PLAYER' ? '💀' : battle.enemy.spriteIcon}
              </div>
              <div>
                <div className="text-[9px] md:text-[10px] font-mono text-amber-500 uppercase tracking-widest font-bold">
                  {battle.winner === 'PLAYER' ? 'TARGET DEFEATED' : `BATTLE TARGET • LEVEL ${battle.enemy.level}`}
                </div>
                <h3 className="text-base md:text-2xl font-bold font-serif text-amber-200">{battle.enemy.name}</h3>
                <p className="text-[10px] md:text-xs text-zinc-400 font-mono mt-0.5">{battle.enemy.title}</p>
              </div>
            </div>

            {/* Enemy HP Meter */}
            <div className="w-full md:w-64 space-y-1">
              <div className="flex justify-between text-[10px] md:text-xs font-mono font-bold">
                <span className="text-red-400">HP</span>
                <span>{battle.enemy.currentHp} / {battle.enemy.maxHp}</span>
              </div>
              <div className="w-full h-2 md:h-3 bg-zinc-950 rounded-full border border-red-900/50 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, (battle.enemy.currentHp / battle.enemy.maxHp) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* VICTORY & LOOT REWARD CARD (When Winner === 'PLAYER') */}
          {battle.winner === 'PLAYER' && (
            <div className="bg-gradient-to-r from-amber-950 via-zinc-900 to-amber-950 border-2 border-amber-500/80 rounded-xl md:rounded-2xl p-3 md:p-5 shadow-2xl text-center space-y-2 md:space-y-3 animate-fade-in">
              <div className="text-2xl md:text-3xl">🎉</div>
              <h3 className="text-lg md:text-2xl font-bold font-serif text-amber-200">VICTORY & LOOT SECURED!</h3>
              <p className="text-[10px] md:text-xs font-mono text-zinc-300">
                Defeated <strong>{battle.enemy.name}</strong>! Earned <strong className="text-emerald-400">+{battle.enemy.expReward} EXP</strong> and <strong className="text-yellow-400">+{battle.enemy.copperReward} Cowrie Shells</strong>.
              </p>

              {/* Live Active Contract Progress Badge (Shows ONLY bounties updated in this battle or completed) */}
              {player.bounties.filter((b) => {
                if (!b.isAccepted || b.isClaimed) return false;
                if (b.isCompleted) return true;
                const cleanEnemyName = (battle.enemy?.name || '').replace(/^Elite\s+/, '').trim().toLowerCase();
                const cleanEnemyId = (battle.enemy?.id || '').toLowerCase();
                const cleanTargetName = b.targetMonsterName.toLowerCase();
                const cleanTargetId = b.targetMonsterId.toLowerCase();
                const isMatch =
                  cleanEnemyName.includes(cleanTargetName) ||
                  cleanTargetName.includes(cleanEnemyName) ||
                  cleanEnemyId.includes(cleanTargetId);
                return isMatch;
              }).map((b) => (
                <div key={b.id} className="bg-purple-950/80 border border-purple-500/60 p-1.5 md:p-2 rounded-lg text-[10px] md:text-xs font-mono text-purple-200 flex justify-between items-center max-w-md mx-auto">
                  <span>🎯 Contract Progress: <strong>{b.title}</strong> ({b.targetMonsterName})</span>
                  <span className={`font-bold ${b.isCompleted ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {b.isCompleted ? '✅ COMPLETED!' : `${b.currentCount} / ${b.targetCount}`}
                  </span>
                </div>
              ))}

              <button
                onClick={handleClaimRewardsAndExit}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-mono text-[10px] md:text-xs uppercase px-5 py-2 md:px-8 md:py-2.5 rounded-lg md:rounded-xl shadow-lg transition-all active:scale-95"
              >
                [ Claim Rewards & Continue Expedition ]
              </button>
            </div>
          )}

          {/* Real-time Battle Combat Terminal Feed */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg md:rounded-xl p-2 md:p-3 h-28 md:h-44 overflow-y-auto font-mono text-[10px] md:text-xs space-y-0.5 md:space-y-1 shadow-inner">
            <div className="text-[9px] md:text-[10px] text-zinc-500 uppercase border-b border-zinc-800 pb-1 mb-1 flex justify-between">
              <span>REAL-TIME COMBAT FEED</span>
              <span>TURN #{battle.turnNumber}</span>
            </div>
            {battle.logs.map((log) => (
              <div
                key={log.id}
                className={`p-0.5 md:p-1 rounded ${
                  log.type === 'CRIT'
                    ? 'bg-amber-950/60 text-amber-300 font-bold border-l-2 border-amber-500'
                    : log.type === 'DAMAGE'
                    ? log.actor === 'PLAYER'
                      ? 'text-sky-300'
                      : 'text-red-400'
                    : log.type === 'HEAL'
                    ? 'text-emerald-400'
                    : 'text-zinc-300'
                }`}
              >
                {log.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spell / Skill Picker Modal */}
      {showSpellPicker && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-500/50 rounded-2xl p-5 max-w-md w-full space-y-3 shadow-2xl">
            <h3 className="text-lg font-bold font-serif text-amber-300 flex justify-between items-center">
              <span>Equipped Skills ({equippedSkills.length}/3)</span>
              <button onClick={() => setShowSpellPicker(false)} className="text-zinc-500 hover:text-white">✕</button>
            </h3>
            <p className="text-xs text-zinc-400">Select an equipped Mutya skill to execute in battle:</p>

            <div className="space-y-2 font-mono">
              {equippedSkills.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-500 italic border border-dashed border-zinc-800 rounded-lg">
                  No skills equipped! Visit Hero Sheet -&gt; Mutya Skills to unlock &amp; equip skills.
                </div>
              ) : (
                equippedSkills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => handleExecuteSkill(skill)}
                    disabled={player.currentMp < skill.mpCost}
                    className="w-full bg-zinc-950 hover:bg-zinc-800 border border-amber-500/40 hover:border-amber-400 p-3 rounded-xl text-left text-xs font-bold text-amber-200 flex justify-between items-center transition-all disabled:opacity-40 shadow-md"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{skill.icon}</span>
                      <div>
                        <div className="font-serif text-amber-300 text-sm">{skill.name}</div>
                        <div className="text-[10px] font-normal text-zinc-400 font-sans line-clamp-1">{skill.description}</div>
                      </div>
                    </div>
                    <span className="font-mono text-amber-400 text-xs shrink-0 ml-2 bg-amber-950/80 px-2 py-1 rounded border border-amber-800/60">
                      {skill.mpCost > 0 ? `${skill.mpCost} MP` : 'Free'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Consumable Item Picker Modal */}
      {showItemPicker && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-emerald-500/50 rounded-2xl p-5 max-w-md w-full space-y-3 shadow-2xl">
            <h3 className="text-lg font-bold font-serif text-emerald-300 flex justify-between items-center">
              <span>🎒 Select Consumable Item</span>
              <button onClick={() => setShowItemPicker(false)} className="text-zinc-500 hover:text-white">✕</button>
            </h3>
            <p className="text-xs text-zinc-400">Select a potion or draught to consume in battle:</p>

            <div className="space-y-2 font-mono max-h-60 overflow-y-auto pr-1">
              {(() => {
                const consumables = player.inventory
                  .map((item, originalIndex) => ({ item, originalIndex }))
                  .filter(({ item }) => 'hpRestore' in item || 'mpRestore' in item || 'cleansesDebuffs' in item);

                if (consumables.length === 0) {
                  return (
                    <div className="p-4 text-center text-xs text-zinc-500 italic border border-dashed border-zinc-800 rounded-lg">
                      No consumable potions or draughts in bag inventory! Visit Poblacion Shaman Shrines or find caches.
                    </div>
                  );
                }

                return consumables.map(({ item, originalIndex }) => {
                  const cons = item as ConsumableItem;
                  return (
                    <button
                      key={`cons_${originalIndex}_${item.id}`}
                      onClick={() => handleUseConsumable(cons, originalIndex)}
                      className="w-full bg-zinc-950 hover:bg-zinc-800 border border-emerald-500/40 hover:border-emerald-400 p-3 rounded-xl text-left text-xs font-bold text-emerald-100 flex justify-between items-center transition-all shadow-md active:scale-95"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">🧪</span>
                        <div>
                          <div className="font-serif text-emerald-300 text-sm">{cons.name}</div>
                          <div className="text-[10px] font-normal text-zinc-400 font-sans line-clamp-1">
                            {cons.effectDescription || 'Consumable restorative draught.'}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 ml-2">
                        {cons.hpRestore && (
                          <span className="font-mono text-emerald-400 text-[10px] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60 font-semibold mb-0.5">
                            +{cons.hpRestore} HP
                          </span>
                        )}
                        {cons.mpRestore && (
                          <span className="font-mono text-sky-400 text-[10px] bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60 font-semibold">
                            +{cons.mpRestore} MP
                          </span>
                        )}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* [BOTTOM] CONTEXTUAL ACTION PAD (EXPLORATION VS COMBAT) */}
      <div className="bg-zinc-950 border border-amber-900/60 p-1 md:p-3 rounded-lg md:rounded-xl shadow-2xl">
        <div className="text-[8px] md:text-[10px] font-mono text-amber-500 uppercase font-semibold mb-0.5 md:mb-1.5 text-center md:text-left flex justify-between items-center">
          <span>{battle.inCombat ? 'COMBAT FAST-TAP ACTION PAD' : 'SECTOR EXPLORATION ACTION PAD'}</span>
          {!battle.inCombat && activeInteractiveEncounter && (
            <span className="text-amber-400 font-bold text-[8px] md:text-[9.5px] animate-pulse">
              [ ENCOUNTER ACTIVE — RESOLVE OR DISMISS FIRST ]
            </span>
          )}
        </div>

        {/* Exploration Action Pad */}
        {!battle.inCombat ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2">
            <button
              onClick={handleVentureForward}
              disabled={!!activeInteractiveEncounter}
              className={`p-1.5 md:p-3 font-bold font-mono text-[10.5px] md:text-xs uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center justify-center space-x-1.5 min-h-[36px] md:min-h-[44px] ${
                activeInteractiveEncounter
                  ? 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
                  : 'bg-amber-600 hover:bg-amber-500 text-zinc-950 active:scale-95'
              }`}
            >
              <span>🧭</span>
              <span>[ Venture Forward ] ({ventureCost} Stamina)</span>
            </button>

            <button
              onClick={handleSearchArea}
              disabled={!!activeInteractiveEncounter}
              className={`p-1.5 md:p-3 font-bold font-mono text-[10.5px] md:text-xs uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center justify-center space-x-1.5 min-h-[36px] md:min-h-[44px] ${
                activeInteractiveEncounter
                  ? 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
                  : 'bg-purple-900 hover:bg-purple-800 border border-purple-500/50 text-purple-100 active:scale-95'
              }`}
            >
              <span>🔍</span>
              <span>[ Search Area ] ({searchCost} Stamina)</span>
            </button>
          </div>
        ) : (
          /* Combat Action Pad */
          <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5 md:gap-2 font-mono text-[10px] md:text-xs font-bold">
            <button
              onClick={handleAttack}
              disabled={battle.winner !== null}
              className="p-1.5 md:p-3 bg-amber-600 hover:bg-amber-500 text-zinc-950 rounded-md md:rounded-lg uppercase tracking-wider shadow-md transition-all active:scale-95 flex flex-col items-center justify-center disabled:opacity-40 min-h-[44px]"
            >
              <span>1. Attack</span>
              <span className="text-[8px] md:text-[9px] font-normal opacity-80">{player.equipment.primaryWeapon?.name || 'Primary Strike'}</span>
            </button>

            <button
              onClick={() => setShowSpellPicker(true)}
              disabled={battle.winner !== null}
              className="p-1.5 md:p-3 bg-sky-900 hover:bg-sky-800 border border-sky-500/50 text-sky-100 rounded-md md:rounded-lg uppercase tracking-wider shadow-md transition-all active:scale-95 flex flex-col items-center justify-center disabled:opacity-40 min-h-[44px]"
            >
              <span>2. Skill / Spell</span>
              <span className="text-[8px] md:text-[9px] font-normal opacity-80">Select Ability</span>
            </button>

            <button
              onClick={() => setShowItemPicker(true)}
              disabled={battle.winner !== null}
              className="p-1.5 md:p-3 bg-emerald-900 hover:bg-emerald-800 border border-emerald-500/50 text-emerald-100 rounded-md md:rounded-lg uppercase tracking-wider shadow-md transition-all active:scale-95 flex flex-col items-center justify-center disabled:opacity-40 min-h-[44px]"
            >
              <span>3. Use Item</span>
              <span className="text-[8px] md:text-[9px] font-normal opacity-80">Select Consumable</span>
            </button>

            <button
              onClick={handleGuard}
              disabled={battle.winner !== null}
              className="p-1.5 md:p-3 bg-indigo-900 hover:bg-indigo-800 border border-indigo-500/50 text-indigo-100 rounded-md md:rounded-lg uppercase tracking-wider shadow-md transition-all active:scale-95 flex flex-col items-center justify-center disabled:opacity-40 min-h-[44px]"
            >
              <span>4. Guard / Parry</span>
              <span className="text-[8px] md:text-[9px] font-normal opacity-80">-40% DR & Riposte</span>
            </button>

            {(() => {
              const attempts = battle.fleeAttempts ?? 0;
              const isExhausted = attempts >= 2;
              return (
                <button
                  onClick={handleFlee}
                  disabled={battle.winner !== null || isExhausted}
                  className={`col-span-2 md:col-span-1 p-1.5 md:p-3 rounded-md md:rounded-lg uppercase tracking-wider shadow-md transition-all active:scale-95 flex flex-col items-center justify-center min-h-[44px] ${
                    isExhausted
                      ? 'bg-zinc-950 border border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
                      : 'bg-red-950 hover:bg-red-900 border border-red-600/50 text-red-200 disabled:opacity-40'
                  }`}
                >
                  <span>{isExhausted ? '5. Flee (Exhausted)' : `5. Flee ${attempts === 1 ? '(1 Left)' : ''}`}</span>
                  <span className="text-[8px] md:text-[9px] font-normal opacity-80">
                    {isExhausted ? 'Escape Blocked' : attempts === 1 ? 'High Fail Risk' : 'Agility Escape'}
                  </span>
                </button>
              );
            })()}
          </div>
        )}
      </div>

      {/* Act Boss Forfeit Warning Modal */}
      {showBossWarningModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border-2 border-amber-500/80 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-fade-in text-center">
            <div className="text-4xl">⚠️</div>
            <h3 className="text-xl font-bold font-serif text-amber-200">
              Unfinished Regional Lore Warning
            </h3>

            <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 text-xs font-mono text-amber-100 leading-relaxed text-left space-y-2">
              <p className="font-bold text-amber-300">
                There are still quests to be discovered in this Act!
              </p>
              <p className="text-zinc-300">
                You have completed <strong className="text-amber-300">{actQuestsCompleted}/{actQuests.length}</strong> side quests in {selectedLocation.name}.
                {hasUndiscovered && (
                  <span className="text-yellow-300 block mt-1 font-semibold">
                    • There are still undiscovered quest givers wandering the wilderness. Venture forward to encounter them!
                  </span>
                )}
              </p>
              <p className="text-red-300 border-t border-amber-900/60 pt-2 font-semibold">
                If you continue and conquer the Act Guardian, all uncompleted and undiscovered side quests in this Act will be <span className="underline">permanently forfeited</span>.
              </p>
            </div>

            <div className="text-xs font-mono text-zinc-300 font-bold">
              Forfeit side quests and continue to the Act Guardian battle?
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2 font-mono text-xs">
              <button
                onClick={() => setShowBossWarningModal(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold uppercase py-3 rounded-xl transition-all"
              >
                🧭 Keep Venturing (Stay in Act)
              </button>
              <button
                onClick={() => startBossBattle(true)}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold uppercase py-3 rounded-xl shadow-lg transition-all active:scale-95"
              >
                ⚔️ Forfeit Quests & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Act Progression Advancement Forfeit Warning Modal */}
      {showAdvanceWarningModal && pendingAdvanceLocation && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border-2 border-red-500/80 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-fade-in text-center">
            <div className="text-4xl animate-bounce">⚠️</div>
            <h3 className="text-xl font-bold font-serif text-amber-200">
              Act Advancement & Quest Forfeiture Warning
            </h3>

            <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-4 text-xs font-mono text-amber-100 leading-relaxed text-left space-y-2">
              <p className="font-bold text-red-300">
                You are about to advance into {pendingAdvanceLocation.name}!
              </p>
              <p className="text-zinc-300">
                You have completed <strong className="text-amber-300">{actQuestsCompleted}/{actQuests.length}</strong> side quests in {selectedLocation.name}.
              </p>
              {hasUndiscovered && (
                <p className="text-yellow-300 font-semibold">
                  • There are still undiscovered regional quests wandering the wilderness of {selectedLocation.name.split(':')[0]}!
                </p>
              )}
              <div className="text-red-200 border-t border-red-900/60 pt-2 font-semibold">
                Advancing forward will <span className="underline font-bold text-red-300">PERMANENTLY FORFEIT</span> all uncompleted or undiscovered side quests in {selectedLocation.name.split(':')[0]}. You will not be able to complete them later.
              </div>
            </div>

            <div className="text-xs font-mono text-zinc-300 font-bold">
              Are you sure you want to forfeit these quests and travel to {pendingAdvanceLocation.name.split(':')[0]}?
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2 font-mono text-xs">
              <button
                onClick={() => {
                  setShowAdvanceWarningModal(false);
                  setPendingAdvanceLocation(null);
                }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold uppercase py-3 rounded-xl transition-all"
              >
                🧭 Stay & Finish Quests
              </button>
              <button
                onClick={handleConfirmAdvanceAndForfeit}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold uppercase py-3 rounded-xl shadow-lg transition-all active:scale-95"
              >
                ⚔️ Forfeit Quests & Advance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Act Story Parchment Overlay (Phase 8.1) */}
      {showActStoryModal && (
        <ActStoryOverlayModal
          actId={selectedLocation.id}
          actName={selectedLocation.name}
          actSubtitle={selectedLocation.subtitle}
          actLore={selectedLocation.description}
          isNgPlus={(player.ngPlusLevel || 0) > 0}
          onClose={handleCloseActStory}
        />
      )}

      {/* Boss Discovery Warning Card Modal (Phase 8.2) */}
      {showBossDiscoveryModal && selectedLocation.bossId && (() => {
        const boss = generateMonsterForLocation(selectedLocation.minLevel, selectedLocation.bossId, undefined, player.ngPlusLevel || 0, player.ngPlusStartLevel || 0);
        return (
          <BossDiscoveryModal
            bossId={selectedLocation.bossId}
            bossName={boss.name}
            bossTitle={boss.title}
            bossLore={boss.specialAbility || `The legendary climax boss guarding ${selectedLocation.name}.`}
            bossLevel={boss.level}
            climaxLevelReq={bossLevelReq}
            playerLevel={player.level}
            onDismiss={() => setShowBossDiscoveryModal(false)}
            onChallenge={() => {
              setShowBossDiscoveryModal(false);
              if (isBossLevelLocked) {
                notify(`🔒 Act Climax Gate Locked! Reach Level ${bossLevelReq} to confront ${selectedLocation.name}'s Guardian.`, 'warning', '🔒');
                return;
              }
              if (hasUncompleted) {
                setShowBossWarningModal(true);
              } else {
                startBossBattle(false);
              }
            }}
          />
        );
      })()}

      {/* Act Guardian Climax Victory Loot Modal */}
      {activeBossVictoryReward && (
        <BossVictoryModal
          bossId={activeBossVictoryReward.bossId}
          bossName={activeBossVictoryReward.bossName}
          bossTitle={activeBossVictoryReward.bossTitle}
          nextActName={activeBossVictoryReward.nextActName}
          expEarned={activeBossVictoryReward.expEarned}
          cowriesEarned={activeBossVictoryReward.cowriesEarned}
          mutyaShardsEarned={activeBossVictoryReward.mutyaShardsEarned}
          droppedItem={activeBossVictoryReward.droppedItem}
          droppedMemory={activeBossVictoryReward.droppedMemory}
          isNgPlus={(player.ngPlusLevel || 0) > 0}
          onClaim={() => {
            setActiveBossVictoryReward(null);
            handleClaimRewardsAndExit();
          }}
        />
      )}
    </div>
  );
};
