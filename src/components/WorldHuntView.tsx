import React, { useState, useEffect } from 'react';
import { PlayerCharacter, BattleState, BattleLogEntry, EnemyMonster, GameLocation, ConsumableItem, Skill, EquipmentItem, HeroClass, EncryptedMemory, MemoryRarity } from '../types/game';
import { GAME_LOCATIONS, MOUNTS } from '../data/equipmentData';
import { generateMonsterForLocation } from '../data/monstersData';
import { calcDerivedStats, processExpGain, totalCowriesFromWallet, cowriesToWallet, formatCostInCowries, formatCowriesShort, calcMaxStamina, getActStaminaCosts } from '../utils/gameFormulas';
import { ALL_SKILLS, getDefaultSkillIds } from '../data/skillsData';
import { getScaledForgeCatalog, calcCostInCowries } from '../utils/equipmentGenerator';
import { soundFX } from '../utils/audio';
import ActStoryOverlayModal from './ActStoryOverlayModal';
import BossDiscoveryModal from './BossDiscoveryModal';
import BossVictoryModal from './BossVictoryModal';

export interface InteractiveEncounter {
  id: string;
  type: 'TRADER' | 'CURSED_CHEST';
  title: string;
  description: string;
  traderItem?: EquipmentItem;
  traderCostCC?: number;
  chestHpCost?: number;
  chestMpCost?: number;
  chestRewardCC?: number;
  chestRewardMutya?: number;
}

export interface BossVictoryRewardData {
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
    if (found && player.level >= found.minLevel) return found;
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

  // Resolution handlers for Wandering Trader and Cursed Spirit Chest choices
  const handleBuyTraderItem = () => {
    if (!activeInteractiveEncounter?.traderItem || !activeInteractiveEncounter.traderCostCC) return;
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

    const rewardCC = activeInteractiveEncounter.chestRewardCC || 200;
    const rewardMutya = activeInteractiveEncounter.chestRewardMutya || 1;

    const totalCC = totalCowriesFromWallet(player.wallet) + rewardCC;
    const updatedWallet = cowriesToWallet(totalCC, (player.wallet.mutyaShards || 0) + rewardMutya);

    const updatedNarratorLogs = [
      `🔮 UNSEALED CURSED CHEST: Sacrificed (${sacrificeDesc}) to unlock the spirit chest! Received +${formatCostInCowries(rewardCC)} & +${rewardMutya} Mutya Pearl Shard!`,
      ...(player.narratorLogs || [])
    ].slice(0, 15);

    onUpdatePlayer({
      ...player,
      currentHp: newHp,
      currentMp: newMp,
      wallet: updatedWallet,
      narratorLogs: updatedNarratorLogs,
    });
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
    if (battle.inCombat) return;
    const bossId = selectedLocation.bossId;
    if (!bossId) return;

    const bossReq = selectedLocation.bossLevelReq ?? (selectedLocation.minLevel + 5);
    const isDiscovered = (player.discoveredBossIds ?? []).includes(bossId);

    if (player.level >= bossReq && !isDiscovered) {
      setShowBossDiscoveryModal(true);
      const discovered = Array.from(new Set([...(player.discoveredBossIds ?? []), bossId]));
      onUpdatePlayer({
        ...player,
        discoveredBossIds: discovered,
      });
    }
  }, [selectedLocation.id, selectedLocation.bossId, selectedLocation.bossLevelReq, player.level, player.discoveredBossIds, battle.inCombat]);

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
  const bossLevelReq = selectedLocation.bossLevelReq ?? (selectedLocation.minLevel + 5);
  const isBossLevelLocked = player.level < bossLevelReq;

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

  // Select Location with Strict Level, Act Boss Gate, and Forfeit Gate Validation
  const handleSelectLocation = (loc: GameLocation) => {
    if (loc.id === selectedLocation.id) return;

    if (player.level < loc.minLevel) {
      notify(`🔒 Act Locked! Character Level ${loc.minLevel} required to enter ${loc.name}. (Your Level: ${player.level})`, 'warning', '🔒');
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

  const { ventureCost, searchCost, bossCost } = getActStaminaCosts(selectedLocation.id);
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

    const boss = generateMonsterForLocation(selectedLocation.minLevel, selectedLocation.bossId);

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
      notify(`🔒 Act Climax Gate Locked! Reach Level ${bossLevelReq} to confront ${selectedLocation.name}'s Guardian. (Your Level: ${player.level})`, 'warning', '🔒');
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
    if (player.level < selectedLocation.minLevel) {
      notify(`🔒 Act Locked! Reach Level ${selectedLocation.minLevel} to explore ${selectedLocation.name}.`, 'warning', '🔒');
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
      // Enemy encounter! Prioritize active contract target monster if available in location
      const activeTargetId = player.bounties.find(
        (b) => b.isAccepted !== false && !b.isCompleted && selectedLocation.monsters.includes(b.targetMonsterId)
      )?.targetMonsterId;

      const monsterToSpawn = (activeTargetId && Math.random() < 0.85) ? activeTargetId : undefined;
      const monster = generateMonsterForLocation(selectedLocation.minLevel, monsterToSpawn, selectedLocation.monsters);

      const logText = `⚠️ ENEMY AMBUSH: A level ${monster.level} ${monster.name} (${monster.title}) lunges from the shadow thicket!`;
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
            text: `[EXPLORATION] Ambushed by ${monster.name} (${monster.title}) in ${selectedLocation.name}!`,
            type: 'INFO',
          },
        ],
        winner: null,
      });
    } else if (roll < 0.85) {
      // 35% Chance to trigger an Interactive Sector Encounter (Wandering Trader or Cursed Spirit Chest)
      if (Math.random() < 0.35) {
        const catalog = getScaledForgeCatalog(player.level, (player.heroClass || 'Mandirigma') as HeroClass);
        const isTrader = Math.random() < 0.5 && catalog.length > 0;

        if (isTrader) {
          const randomItem = catalog[Math.floor(Math.random() * catalog.length)];
          const cost = Math.max(50, Math.floor(calcCostInCowries(randomItem.levelReq, randomItem.rarity) * 0.85));
          const encounter: InteractiveEncounter = {
            id: `trader_${Date.now()}`,
            type: 'TRADER',
            title: '🛒 Wandering Maharlika Merchant',
            description: `A traveling artisan offers a discounted high-tier artifact: [${randomItem.name}]!`,
            traderItem: randomItem,
            traderCostCC: cost,
          };
          setActiveInteractiveEncounter(encounter);
          soundFX.playCoinSound();
          onUpdatePlayer({
            ...player,
            stamina: newStamina,
            narratorLogs: addNarratorLog(`🛍️ WANDERING MERCHANT: Met a traveling artisan offering [${randomItem.name}] for ${formatCostInCowries(cost)}!`),
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

  // EXPLORATION ACTION 2: Search Area (High risk)
  const handleSearchArea = () => {
    if (player.level < selectedLocation.minLevel) {
      notify(`🔒 Act Locked! Reach Level ${selectedLocation.minLevel} to search ${selectedLocation.name}.`, 'warning', '🔒');
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

    // Search Area guarantees an Elite Enemy or Rare Chest, prioritizing active bounty contract target
    const activeTargetId = player.bounties.find(
      (b) => b.isAccepted !== false && !b.isCompleted && selectedLocation.monsters.includes(b.targetMonsterId)
    )?.targetMonsterId;

    const monsterToSpawn = (activeTargetId && Math.random() < 0.85) ? activeTargetId : undefined;
    const monster = generateMonsterForLocation(selectedLocation.minLevel + 3, monsterToSpawn, selectedLocation.monsters);
    monster.maxHp = Math.floor(monster.maxHp * 1.5);
    monster.currentHp = monster.maxHp;
    if (!monster.name.startsWith('Elite')) {
      monster.name = `Elite ${monster.name}`;
    }

    const logText = `💀 HIGH RISK SEARCH: Confronting ruthless ${monster.name}! Increased Mutya Shard drop rate.`;
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
      enemyActionGauge: 80,
      enemy: monster,
      logs: [
        {
          id: `init_search_${Date.now()}`,
          turn: 1,
          actor: 'SYSTEM',
          text: `[HIGH RISK SEARCH] Elite ${monster.name} detected! Increased Mutya Shard drop chance.`,
          type: 'INFO',
        },
      ],
      winner: null,
    });
  };

  // COMBAT ACTION 1: Basic Attack (Restores +5 MP on hit!)
  const handleAttack = () => {
    if (!battle.enemy || !battle.inCombat || battle.winner !== null) return;

    soundFX.playAttackSound();
    let logs = battle.logs;
    const enemy = { ...battle.enemy };

    const primary = player.equipment.primaryWeapon;
    const minDmg = primary?.baseDamageMin || 8;
    const maxDmg = primary?.baseDamageMax || 14;
    let baseDmg = Math.floor(minDmg + Math.random() * (maxDmg - minDmg + 1)) + Math.floor(derived.meleeDamage * 0.4);

    // Basic Attack restores +5 MP per strike
    const regenedMp = Math.min(derived.maxMp, player.currentMp + 5);

    const isCrit = Math.random() * 100 < derived.critChancePercent;
    if (isCrit) {
      baseDmg = Math.floor(baseDmg * 1.6);
      soundFX.playCritSound();
      logs = addLog(logs, `⚡ CRITICAL STRIKE! Dealt ${baseDmg} physical damage to ${enemy.name}! (+5 MP restored)`, 'CRIT', 'PLAYER');
    } else {
      logs = addLog(logs, `⚔️ You struck ${enemy.name} with ${primary?.name || 'Weapon'} for ${baseDmg} damage! (+5 MP restored)`, 'DAMAGE', 'PLAYER');
    }

    const enemyDR = enemy.armor / (enemy.armor + 150);
    const finalDmg = Math.max(1, Math.floor(baseDmg * (1 - enemyDR)));
    enemy.currentHp -= finalDmg;

    const updatedPlayer = { ...player, currentMp: regenedMp };
    onUpdatePlayer(updatedPlayer);

    if (enemy.currentHp <= 0) {
      enemy.currentHp = 0;
      handleVictory(enemy, logs);
      return;
    }

    const enemyTurnResult = executeEnemyTurn(enemy, logs, updatedPlayer);
    if (enemyTurnResult.isDefeated) return;
    onUpdateBattle({ ...battle, turnNumber: battle.turnNumber + 1, enemy, logs: enemyTurnResult.logs });
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

    // --- HEAL SKILLS ---
    if (skill.damageType === 'HEAL') {
      soundFX.playSpellSound();
      const healHp = Math.floor(derived.maxHp * (skill.healsPercent ?? 0.25));
      updatedPlayer.currentHp = Math.min(derived.maxHp, player.currentHp + healHp);
      logs = addLog(logs, `${skill.icon} Used [${skill.name}]! Restored +${healHp} HP!`, 'BUFF', 'PLAYER');

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

    let baseDmg = Math.floor((weaponRoll + Math.floor(derivedBonus * 0.4)) * (skill.baseDamageMultiplier || 1.0));

    if (player.isEmpoweredNextTurn) {
      baseDmg = Math.floor(baseDmg * 1.5);
      updatedPlayer.isEmpoweredNextTurn = false;
      logs = addLog(logs, `🔥 EMPOWERED BURST! +50% bonus strike damage applied!`, 'BUFF', 'PLAYER');
    }

    // Crit check
    const isCrit = Math.random() * 100 < derived.critChancePercent;
    if (isCrit) {
      baseDmg = Math.floor(baseDmg * 1.6);
      soundFX.playCritSound();
      logs = addLog(logs, `⚡ CRITICAL HIT! ${skill.icon} [${skill.name}] dealt ${baseDmg} damage to ${enemy.name}!`, 'CRIT', 'PLAYER');
    } else {
      logs = addLog(logs, `${skill.icon} Executed [${skill.name}] for ${baseDmg} damage on ${enemy.name}!`, 'DAMAGE', 'PLAYER');
    }

    const enemyDR = skill.damageType === 'PHYSICAL' ? enemy.armor / (enemy.armor + 150) : enemy.armor / (enemy.armor + 300);
    const finalDmg = Math.max(1, Math.floor(baseDmg * (1 - enemyDR)));
    enemy.currentHp -= finalDmg;

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
    onUpdateBattle({ ...battle, turnNumber: battle.turnNumber + 1, enemy, logs: enemyTurnResult.logs });
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

    soundFX.playPotionSound();
    let logs = battle.logs;

    // Guarding restores +10 MP (focusing breath) and grants Defensive Stance
    const regenedMp = Math.min(derived.maxMp, player.currentMp + 10);
    const parryChance = Math.min(50, Math.floor(25 + player.attributes.agi * 0.4));

    logs = addLog(
      logs,
      `🛡️ Raised Guard & Focused Breath! (+10 MP restored, -40% DR & ${parryChance}% Parry Riposte active)`,
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
    onUpdateBattle({ ...battle, turnNumber: battle.turnNumber + 1, enemy, logs: enemyTurnResult.logs });
  };

  // COMBAT ACTION 5: Flee
  const handleFlee = () => {
    if (!battle.inCombat) return;

    // Agility check to flee
    const fleeChance = Math.min(90, 50 + player.attributes.agi * 1.5);
    const roll = Math.random() * 100;

    if (roll <= fleeChance) {
      notify('🏃 Escape Successful! Retreating back to sector entrance.', 'info', '🏃');
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
    } else {
      let logs = battle.logs;
      logs = addLog(logs, `❌ Flee Failed! The enemy blocked your escape route!`, 'DEBUFF', 'PLAYER');
      const enemy = { ...battle.enemy! };
      const enemyTurnResult = executeEnemyTurn(enemy, logs);
      if (enemyTurnResult.isDefeated) return;
      onUpdateBattle({ ...battle, turnNumber: battle.turnNumber + 1, enemy, logs: enemyTurnResult.logs });
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
    const enemyDmg = Math.floor(enemy.attackMin + Math.random() * (enemy.attackMax - enemy.attackMin + 1));

    // Parry & Riposte Check when Guarding
    if (p.isCoveredNextTurn) {
      const parryChance = Math.min(50, Math.floor(25 + p.attributes.agi * 0.4));
      const isParried = Math.random() * 100 < parryChance;

      if (isParried) {
        soundFX.playCritSound();
        const riposteDmg = Math.max(1, Math.floor(enemyDmg * 0.75));
        enemy.currentHp = Math.max(0, enemy.currentHp - riposteDmg);

        logs = addLog(
          logs,
          `⚔️ PERFECT PARRY! Deflected ${enemy.name}'s attack (0 damage taken) and riposted for ${riposteDmg} counter damage!`,
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
      playerDR = Math.min(0.9, playerDR + 0.4);
    }

    const finalEnemyDmg = Math.max(1, Math.floor(enemyDmg * (1 - playerDR)));
    const newPlayerHp = Math.max(0, p.currentHp - finalEnemyDmg);

    if (p.isCoveredNextTurn) {
      logs = addLog(logs, `🛡️ GUARDED! Blocked ${enemy.name}'s strike (took ${finalEnemyDmg} damage).`, 'DAMAGE', 'ENEMY');
    } else {
      logs = addLog(logs, `⚔️ ${enemy.name} attacked you for ${finalEnemyDmg} damage!`, 'DAMAGE', 'ENEMY');
    }

    if (newPlayerHp <= 0) {
      logs = addLog(logs, `💀 You were defeated in battle! Transported back to Haven's Rest.`, 'DEBUFF', 'SYSTEM');
      notify('💀 Slain in Battle! Transporting back to Haven\'s Rest.', 'error', '💀');

      onUpdatePlayer({
        ...p,
        currentHp: Math.floor(derived.maxHp * 0.5),
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
    const actClimaxCap = !isBossDefeated ? (selectedLocation.bossLevelReq ?? (selectedLocation.minLevel + 5)) : undefined;

    const currentTotalCowries = totalCowriesFromWallet(player.wallet);
    const bossCowrieReward = 1500; // 15 Silver Pieces
    const bossMutyaReward = 4;
    const shardDropped = Math.random() < enemy.shardChance;

    const updatedWallet = cowriesToWallet(
      currentTotalCowries + (isBoss ? bossCowrieReward : enemy.copperReward),
      (player.wallet.mutyaShards || 0) + (isBoss ? bossMutyaReward : (shardDropped ? 1 : 0))
    );

    const expGained = isBoss ? 450 : enemy.expReward;
    const expResult = processExpGain(player.level, player.exp, expGained, isBoss ? undefined : actClimaxCap);
    const newLevel = expResult.newLevel;
    const newExp = expResult.newExp;
    const newAP = player.availableAP + expResult.apGained;

    if (!isBoss && actClimaxCap && player.level >= actClimaxCap && expResult.levelsGained === 0) {
      logs = addLog(logs, `⚠️ [ACT CLIMAX LEVEL CAP] Regular mob EXP is held at Level ${actClimaxCap} Cap! Defeat ${selectedLocation.name}'s Guardian to break the level cap!`, 'DEBUFF', 'SYSTEM');
    }

    if (expResult.levelsGained > 0) {
      logs = addLog(logs, `🌟 LEVEL UP! Reached Level ${newLevel}! Earned +${expResult.apGained} Attribute Points. EXP reset to 0.`, 'CRIT', 'SYSTEM');
    }

    // Act Guardian Defeat Check
    let updatedCompletedBossIds = player.completedBossIds || [];
    let act6Done = player.act6Completed;
    let mountUnlocked = player.mountUnlocked;
    let updatedUnlockedLocs = player.unlockedLocationIds || ['loc_act_1'];
    let updatedEquipment = { ...player.equipment };
    let updatedInventory = [...player.inventory];
    let updatedMemories = [...(player.encryptedMemories || [])];

    if (isBoss) {
      if (!updatedCompletedBossIds.includes(enemy.id)) {
        updatedCompletedBossIds = [...updatedCompletedBossIds, enemy.id];
      }
      logs = addLog(logs, `👑 ACT GUARDIAN SLAIN: ${enemy.name} has fallen! The way forward opens!`, 'CRIT', 'SYSTEM');

      // 1. Generate Legendary Boss Equipment Artifact Drop
      const catalog = getScaledForgeCatalog(player.level + 1, (player.heroClass || 'Mandirigma') as HeroClass);
      let bossItem: EquipmentItem | undefined = undefined;
      if (catalog.length > 0) {
        const template = catalog[Math.floor(Math.random() * catalog.length)];
        bossItem = {
          ...template,
          id: `boss_artifact_${Date.now()}`,
          name: `Legendary ${template.name}`,
          rarity: 'LEGENDARY',
          baseDamageMin: template.baseDamageMin ? Math.floor(template.baseDamageMin * 1.25) : undefined,
          baseDamageMax: template.baseDamageMax ? Math.floor(template.baseDamageMax * 1.25) : undefined,
          baseDefense: template.baseDefense ? Math.floor(template.baseDefense * 1.25) : undefined,
        };
        updatedInventory = [...updatedInventory, bossItem];
        logs = addLog(logs, `🗡️ LEGENDARY BOSS ARTIFACT DROPPED: [${bossItem.name}]!`, 'CRIT', 'SYSTEM');
      }

      // 2. Generate High-Rarity Encrypted Memory Drop (PURPLE or RED)
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

      // 3. Unlock Next Realm Location
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
            logs = addLog(logs, `🐃 FIRST MYTHICAL MOUNT AWARDED: You have tamed the legendary [${firstMount.name}] (Tier 6 Warbeast)! Automatically equipped to your Mount slot.`, 'CRIT', 'SYSTEM');
          } else {
            updatedInventory = [...updatedInventory, firstMount];
            logs = addLog(logs, `🐃 FIRST MYTHICAL MOUNT AWARDED: The legendary [${firstMount.name}] (Tier 6 Warbeast) has been added to your Bag!`, 'CRIT', 'SYSTEM');
          }
        }

        logs = addLog(logs, `🏆 BEASTMASTER STABLES UNLOCKED! Slaying Tambanokano has granted access to Mythical Mounts!`, 'BUFF', 'SYSTEM');
      }

      // Trigger Climax Boss Victory Modal only on initial Act Guardian defeat
      if (!isBossDefeated) {
        setActiveBossVictoryReward({
          bossName: enemy.name,
          bossTitle: enemy.title,
          nextActName,
          expEarned: 450,
          cowriesEarned: bossCowrieReward,
          mutyaShardsEarned: bossMutyaReward,
          droppedItem: bossItem,
          droppedMemory: bossMemory,
        });
      }
    }

    onUpdatePlayer({
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
      mountUnlocked: mountUnlocked,
    });

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
    <div className="flex flex-col h-full bg-zinc-950 text-amber-100 p-3 md:p-6 space-y-4 overflow-y-auto">
      {/* Sector Header & Location Selector */}
      {!battle.inCombat && (
        <div className="bg-zinc-900/90 border border-amber-900/50 rounded-xl p-4 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <div className="text-[10px] font-mono uppercase text-amber-500 tracking-widest font-semibold">ACTIVE EXPEDITION ZONE</div>
            <h2 className="text-2xl font-bold font-serif text-amber-200">{selectedLocation.name}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{selectedLocation.description}</p>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedLocation.id}
              onChange={(e) => {
                const loc = GAME_LOCATIONS.find((l) => l.id === e.target.value);
                if (loc) handleSelectLocation(loc);
              }}
              className="bg-zinc-950 border border-amber-500/40 text-amber-200 rounded px-3 py-1.5 text-xs font-mono font-bold cursor-pointer"
            >
              {GAME_LOCATIONS.map((loc, idx) => {
                const isLevelLocked = player.level < loc.minLevel;
                const prevLoc = idx > 0 ? GAME_LOCATIONS[idx - 1] : null;
                const isBossLocked = prevLoc?.bossId ? !(player.completedBossIds || []).includes(prevLoc.bossId) : false;
                const isLocked = isLevelLocked || isBossLocked;
                const actRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][idx] || `${idx + 1}`;
                let lockLabel = '';
                if (isLocked) {
                  lockLabel = `🔒 Act ${actRoman}: ??? Unknown Territory (${isBossLocked ? `Defeat Act ${idx} Guardian` : `Req: Lv ${loc.minLevel}`})`;
                } else {
                  lockLabel = `✅ ${loc.name} (Req: Lv ${loc.minLevel})`;
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
        <div className="bg-zinc-950/80 border border-zinc-800 p-3 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-xs font-mono">
          <div className="flex items-center space-x-2">
            <span className="text-red-400 font-bold">👑 Act Guardian:</span>
            <span className="text-zinc-200">
              {isBossDefeated || !isBossLevelLocked || (player.discoveredBossIds || []).includes(selectedLocation.bossId || '')
                ? (selectedLocation.name.split(':')[1]?.trim() || 'Act Guardian')
                : '??? Undiscovered Act Guardian'}
            </span>
            <span className="text-[10px] text-amber-400 font-semibold">(Climax Gate: Lv {bossLevelReq})</span>
            {isBossDefeated ? (
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                Conquered ✓
              </span>
            ) : isBossLevelLocked ? (
              <span className="bg-zinc-900 text-zinc-400 border border-zinc-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                Locked (Lv {bossLevelReq})
              </span>
            ) : (
              <span className="bg-red-950 text-red-300 border border-red-500/60 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">
                Ready to Challenge
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-zinc-400">
              Regional Quests: <strong className={actQuestsCompleted >= 3 ? 'text-emerald-400' : 'text-amber-400'}>{actQuestsCompleted}/3 Completed</strong> ({actQuestsDiscovered}/3 Discovered)
            </span>
          </div>
        </div>
      )}

      {/* DEDICATED ACT GUARDIAN BOSS BUTTON (Above Sector Narrative Feed) */}
      {!battle.inCombat && (
        <button
          onClick={handleInitiateBossChallenge}
          disabled={isBossLevelLocked}
          className={`w-full p-3.5 border font-bold font-mono text-xs uppercase tracking-wider rounded-xl shadow-xl transition-all active:scale-[0.99] flex items-center justify-center space-x-2 ${
            isBossLevelLocked
              ? 'bg-zinc-950/90 border-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
              : isBossDefeated
              ? 'bg-zinc-900 border-amber-600/50 text-amber-300 hover:bg-zinc-850'
              : 'bg-gradient-to-r from-red-950 via-red-900 to-red-950 hover:from-red-900 hover:to-red-850 border-2 border-red-500 text-red-100 ring-2 ring-red-500/30 animate-pulse'
          }`}
        >
          <span className="text-base">{isBossLevelLocked ? '🔒' : '👑'}</span>
          <span>
            {isBossLevelLocked
              ? `[ Act Guardian Locked — Requires Character Level ${bossLevelReq} ]`
              : isBossDefeated
              ? `[ Re-challenge ${selectedLocation.name.split(':')[1]?.trim() || 'Act Guardian'} ]`
              : `[ CONFRONT ACT GUARDIAN — ${selectedLocation.name.split(':')[1]?.trim() || 'Act Boss'} ] (${bossCost} Stamina)`}
          </span>
        </button>
      )}

      {/* Exploration Event Feed (When NOT in combat) */}
      {!battle.inCombat && (
        <div className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between shadow-xl min-h-[220px]">
          <div>
            <div className="text-xs font-mono uppercase text-amber-500 font-bold mb-2 flex justify-between items-center border-b border-zinc-800/80 pb-1">
              <span>SECTOR NARRATIVE FEED</span>
              <span className="text-[10px] text-zinc-500 font-normal">PERSISTED LORE LOG</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {(player.narratorLogs && player.narratorLogs.length > 0) ? (
                player.narratorLogs.map((log, idx) => (
                  <p key={idx} className={`text-xs font-mono leading-relaxed ${idx === 0 ? 'text-amber-200 font-bold border-l-2 border-amber-500 pl-2 bg-amber-950/20 py-1 rounded-r' : 'text-zinc-400 pl-2 opacity-80'}`}>
                    {log}
                  </p>
                ))
              ) : (
                <p className="text-xs font-mono text-amber-200/90 leading-relaxed border-l-2 border-amber-500 pl-2 py-1 bg-amber-950/20 rounded-r">
                  {`You are treading carefully through ${selectedLocation.name}. Ambient Aether hums in the stone. Venture forward to scout the sector or search for hidden chests.`}
                </p>
              )}
            </div>
          </div>

          <div className="text-xs font-mono text-zinc-400 border-t border-zinc-800 pt-2.5 mt-2 flex justify-between">
            <span>Danger Rating: <strong className="text-amber-300">Level {selectedLocation.minLevel}+</strong></span>
            <span>Energy / Stamina: <strong className="text-emerald-400">{player.stamina ?? maxStamina}/{maxStamina}</strong></span>
          </div>
        </div>
      )}

      {/* INTERACTIVE SECTOR ENCOUNTER CARD */}
      {!battle.inCombat && activeInteractiveEncounter && (
        <div className="bg-gradient-to-r from-amber-950/80 via-zinc-900 to-amber-950/80 border-2 border-amber-500/70 rounded-xl p-4 shadow-2xl space-y-3 animate-fade-in">
          <div className="flex justify-between items-start border-b border-amber-500/30 pb-2">
            <div>
              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">SPECIAL SECTOR ENCOUNTER</span>
              <h3 className="text-lg font-bold font-serif text-amber-200">{activeInteractiveEncounter.title}</h3>
            </div>
            <button onClick={handlePassEncounter} className="text-xs text-zinc-400 hover:text-white font-mono px-2 py-1 bg-zinc-900 rounded border border-zinc-700">✕ Dismiss</button>
          </div>

          <p className="text-xs text-zinc-300 font-mono leading-relaxed">
            {activeInteractiveEncounter.description}
          </p>

          {activeInteractiveEncounter.type === 'TRADER' && activeInteractiveEncounter.traderItem && (
            <div className="bg-zinc-950/90 border border-amber-500/40 p-3 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{activeInteractiveEncounter.traderItem.icon}</span>
                <div>
                  <div className="text-xs font-bold text-amber-300 font-serif">{activeInteractiveEncounter.traderItem.name}</div>
                  <div className="text-[10px] font-mono text-zinc-400">
                    {activeInteractiveEncounter.traderItem.category} • Req Lv {activeInteractiveEncounter.traderItem.levelReq}
                    {activeInteractiveEncounter.traderItem.baseDamageMax ? ` • Dmg ${activeInteractiveEncounter.traderItem.baseDamageMin}-${activeInteractiveEncounter.traderItem.baseDamageMax}` : ''}
                    {activeInteractiveEncounter.traderItem.baseDefense ? ` • Def +${activeInteractiveEncounter.traderItem.baseDefense}` : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 w-full md:w-auto">
                <button
                  onClick={handleBuyTraderItem}
                  className="flex-1 md:flex-none bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold px-4 py-2 rounded text-xs uppercase font-mono shadow-md active:scale-95"
                >
                  Buy ({formatCostInCowries(activeInteractiveEncounter.traderCostCC || 0)})
                </button>
                <button
                  onClick={handlePassEncounter}
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold px-3 py-2 rounded text-xs uppercase font-mono border border-zinc-700"
                >
                  Pass
                </button>
              </div>
            </div>
          )}

          {activeInteractiveEncounter.type === 'CURSED_CHEST' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-xs">
              <button
                onClick={() => handleOpenCursedChest('HP')}
                className="bg-red-950/90 hover:bg-red-900 border border-red-500/60 text-red-200 p-2.5 rounded-lg text-center space-y-1 transition-all active:scale-95"
              >
                <div className="font-bold text-red-400">🩸 Sacrifice Health</div>
                <div className="text-[10px] text-zinc-400">Pay -{activeInteractiveEncounter.chestHpCost} HP</div>
              </button>
              <button
                onClick={() => handleOpenCursedChest('MP')}
                className="bg-purple-950/90 hover:bg-purple-900 border border-purple-500/60 text-purple-200 p-2.5 rounded-lg text-center space-y-1 transition-all active:scale-95"
              >
                <div className="font-bold text-purple-300">✨ Sacrifice Mana</div>
                <div className="text-[10px] text-zinc-400">Pay -{activeInteractiveEncounter.chestMpCost} MP</div>
              </button>
              <button
                onClick={handlePassEncounter}
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 p-2.5 rounded-lg text-center flex items-center justify-center font-bold"
              >
                🚶 Leave Chest Alone
              </button>
            </div>
          )}
        </div>
      )}

      {/* IN-LINE COMBAT VIEWPORT (When in combat) */}
      {battle.inCombat && battle.enemy && (
        <div className="flex-1 space-y-3">
          {/* Target Enemy Display Card */}
          <div className="bg-zinc-900/90 border border-red-900/60 rounded-xl p-4 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-zinc-950 border border-amber-500/40 rounded-xl flex items-center justify-center text-4xl shadow-inner shrink-0">
                {battle.winner === 'PLAYER' ? '💀' : battle.enemy.spriteIcon}
              </div>
              <div>
                <div className="text-[10px] font-mono text-amber-500 uppercase tracking-widest font-bold">
                  {battle.winner === 'PLAYER' ? 'TARGET DEFEATED' : `BATTLE TARGET • LEVEL ${battle.enemy.level}`}
                </div>
                <h3 className="text-xl md:text-2xl font-bold font-serif text-amber-200">{battle.enemy.name}</h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">{battle.enemy.title}</p>
              </div>
            </div>

            {/* Enemy HP Meter */}
            <div className="w-full md:w-64 space-y-1">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span className="text-red-400">HP</span>
                <span>{battle.enemy.currentHp} / {battle.enemy.maxHp}</span>
              </div>
              <div className="w-full h-3 bg-zinc-950 rounded-full border border-red-900/50 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, (battle.enemy.currentHp / battle.enemy.maxHp) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* VICTORY & LOOT REWARD CARD (When Winner === 'PLAYER') */}
          {battle.winner === 'PLAYER' && (
            <div className="bg-gradient-to-r from-amber-950 via-zinc-900 to-amber-950 border-2 border-amber-500/80 rounded-2xl p-5 shadow-2xl text-center space-y-3 animate-fade-in">
              <div className="text-3xl">🎉</div>
              <h3 className="text-2xl font-bold font-serif text-amber-200">VICTORY & LOOT SECURED!</h3>
              <p className="text-xs font-mono text-zinc-300">
                Defeated <strong>{battle.enemy.name}</strong>! Earned <strong className="text-emerald-400">+{battle.enemy.expReward} EXP</strong> and <strong className="text-yellow-400">+{battle.enemy.copperReward} Cowrie Shells</strong>.
              </p>

              {/* Live Active Contract Progress Badge */}
              {player.bounties.filter((b) => b.isAccepted && !b.isClaimed).map((b) => (
                <div key={b.id} className="bg-purple-950/80 border border-purple-500/60 p-2 rounded-lg text-xs font-mono text-purple-200 flex justify-between items-center max-w-md mx-auto">
                  <span>🎯 Contract Progress: <strong>{b.title}</strong> ({b.targetMonsterName})</span>
                  <span className={`font-bold ${b.isCompleted ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {b.isCompleted ? '✅ COMPLETED!' : `${b.currentCount} / ${b.targetCount}`}
                  </span>
                </div>
              ))}

              <button
                onClick={handleClaimRewardsAndExit}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-mono text-xs uppercase px-8 py-2.5 rounded-xl shadow-lg transition-all active:scale-95"
              >
                [ Claim Rewards & Continue Expedition ]
              </button>
            </div>
          )}

          {/* Real-time Battle Combat Terminal Feed */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 h-44 overflow-y-auto font-mono text-xs space-y-1 shadow-inner">
            <div className="text-[10px] text-zinc-500 uppercase border-b border-zinc-800 pb-1 mb-1 flex justify-between">
              <span>REAL-TIME COMBAT FEED</span>
              <span>TURN #{battle.turnNumber}</span>
            </div>
            {battle.logs.map((log) => (
              <div
                key={log.id}
                className={`p-1 rounded ${
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
      <div className="bg-zinc-950 border border-amber-900/60 p-2 md:p-3 rounded-xl shadow-2xl">
        <div className="text-[10px] font-mono text-amber-500 uppercase font-semibold mb-1.5 text-center md:text-left">
          {battle.inCombat ? 'COMBAT FAST-TAP ACTION PAD' : 'SECTOR EXPLORATION ACTION PAD'}
        </div>

        {/* Exploration Action Pad */}
        {!battle.inCombat ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <button
              onClick={handleVentureForward}
              className="p-3 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold font-mono text-xs uppercase tracking-wider rounded-lg shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
            >
              <span>🧭</span>
              <span>[ Venture Forward ] ({ventureCost} Stamina)</span>
            </button>

            <button
              onClick={handleSearchArea}
              className="p-3 bg-purple-900 hover:bg-purple-800 border border-purple-500/50 text-purple-100 font-bold font-mono text-xs uppercase tracking-wider rounded-lg shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
            >
              <span>🔍</span>
              <span>[ Search Area ] ({searchCost} Stamina)</span>
            </button>
          </div>
        ) : (
          /* Combat Action Pad */
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 font-mono text-xs font-bold">
            <button
              onClick={handleAttack}
              disabled={battle.winner !== null}
              className="p-3 bg-amber-600 hover:bg-amber-500 text-zinc-950 rounded-lg uppercase tracking-wider shadow-md transition-all active:scale-95 flex flex-col items-center justify-center disabled:opacity-40"
            >
              <span>1. Attack</span>
              <span className="text-[9px] font-normal opacity-80">{player.equipment.primaryWeapon?.name || 'Primary Strike'}</span>
            </button>

            <button
              onClick={() => setShowSpellPicker(true)}
              disabled={battle.winner !== null}
              className="p-3 bg-sky-900 hover:bg-sky-800 border border-sky-500/50 text-sky-100 rounded-lg uppercase tracking-wider shadow-md transition-all active:scale-95 flex flex-col items-center justify-center disabled:opacity-40"
            >
              <span>2. Skill / Spell</span>
              <span className="text-[9px] font-normal opacity-80">Select Ability</span>
            </button>

            <button
              onClick={() => setShowItemPicker(true)}
              disabled={battle.winner !== null}
              className="p-3 bg-emerald-900 hover:bg-emerald-800 border border-emerald-500/50 text-emerald-100 rounded-lg uppercase tracking-wider shadow-md transition-all active:scale-95 flex flex-col items-center justify-center disabled:opacity-40"
            >
              <span>3. Use Item</span>
              <span className="text-[9px] font-normal opacity-80">Select Consumable</span>
            </button>

            <button
              onClick={handleGuard}
              disabled={battle.winner !== null}
              className="p-3 bg-indigo-900 hover:bg-indigo-800 border border-indigo-500/50 text-indigo-100 rounded-lg uppercase tracking-wider shadow-md transition-all active:scale-95 flex flex-col items-center justify-center disabled:opacity-40"
            >
              <span>4. Guard / Parry</span>
              <span className="text-[9px] font-normal opacity-80">-40% DR & Riposte</span>
            </button>

            <button
              onClick={handleFlee}
              disabled={battle.winner !== null}
              className="col-span-2 md:col-span-1 p-3 bg-red-950 hover:bg-red-900 border border-red-600/50 text-red-200 rounded-lg uppercase tracking-wider shadow-md transition-all active:scale-95 flex flex-col items-center justify-center disabled:opacity-40"
            >
              <span>5. Flee</span>
              <span className="text-[9px] font-normal opacity-80">Agility Escape</span>
            </button>
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
          onClose={handleCloseActStory}
        />
      )}

      {/* Boss Discovery Warning Card Modal (Phase 8.2) */}
      {showBossDiscoveryModal && selectedLocation.bossId && (() => {
        const boss = generateMonsterForLocation(selectedLocation.minLevel, selectedLocation.bossId);
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
          bossName={activeBossVictoryReward.bossName}
          bossTitle={activeBossVictoryReward.bossTitle}
          nextActName={activeBossVictoryReward.nextActName}
          expEarned={activeBossVictoryReward.expEarned}
          cowriesEarned={activeBossVictoryReward.cowriesEarned}
          mutyaShardsEarned={activeBossVictoryReward.mutyaShardsEarned}
          droppedItem={activeBossVictoryReward.droppedItem}
          droppedMemory={activeBossVictoryReward.droppedMemory}
          onClaim={() => {
            setActiveBossVictoryReward(null);
            handleClaimRewardsAndExit();
          }}
        />
      )}
    </div>
  );
};
