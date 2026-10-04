import React, { useState, useEffect, useCallback } from 'react';
import { PlayerCharacter, BattleState, EnemyMonster, HeroClass, Skill } from './types/game';
import {
  UPPER_ARMORS,
  LOWER_ARMORS,
  DAGGERS,
  SWORDS,
  BOWS,
  STAVES,
  CONSUMABLES,
  INITIAL_BOUNTIES,
  INITIAL_SIDE_QUESTS,
} from './data/equipmentData';
import { calcDerivedStats, calcMaxStamina, cowriesToWallet, sanitizeItemIds, sortInventory } from './utils/gameFormulas';
import { getDefaultSkillIds, getBasicAttackId, getSkillsByClass } from './data/skillsData';

import { Navbar, NavTab } from './components/Navbar';
import { PersistentHUD } from './components/PersistentHUD';
import { HavenView } from './components/HavenView';
import { WorldHuntView } from './components/WorldHuntView';
import { InventoryView } from './components/InventoryView';
import { CharacterSheet } from './components/CharacterSheet';
import { GameLogView } from './components/GameLogView';
import { TitanRaidView } from './components/TitanRaidView';
import CharacterCreationModal from './components/CharacterCreationModal';
import OpeningStoryModal from './components/OpeningStoryModal';
import InteractiveOnboardingTutorial from './components/InteractiveOnboardingTutorial';
import FeatureTutorialModal, { TutorialStep } from './components/FeatureTutorialModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastBanner, ToastMessage } from './components/ToastBanner';
import { BackgroundLayer } from './components/BackgroundLayer';
import { bgmManager } from './utils/musicManager';
import TitleScreenView from './components/TitleScreenView';
import SettingsModal from './components/SettingsModal';
import { RoadmapView } from './components/RoadmapView';
import {
  migrateLegacySave,
  getActiveSlotId,
  setActiveSlotId,
  loadGameSlot,
  saveGameSlot,
} from './utils/saveManager';

const MUTYA_SKILLS_TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Mutya Skills Unlocked (Level 2)',
    icon: '✨',
    description: 'You have ascended to Character Level 2! The ancient martial techniques of the archipelago are now accessible through your Mutya Skill Tree.',
    tip: 'Invest Mutya Pearls and AP to specialize your hero.',
  },
  {
    title: 'Equipping Active Skills',
    icon: '⚔️',
    description: 'You can equip up to 3 active Mutya Skills concurrently. Equipped skills appear directly on your combat action dock during battles.',
    tip: 'Skills consume Mana (MP) to deal heavy elemental damage, heal, or provide vital tactical buffs.',
  },
];

const NOTICE_BOARD_TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Poblacion Notice Board Unlocked (Level 3)',
    icon: '📜',
    description: 'Reaching Character Level 3 opens the Chieftain\'s Wanted Contracts! The Poblacion Notice Board in Haven Tavern is now active.',
    tip: 'Accept contracts to hunt specific beasts across the islands.',
  },
  {
    title: 'Earn Cowries, EXP & Mutya',
    icon: '💰',
    description: 'You can accept up to 3 active bounties simultaneously. Completing contracts awards massive EXP, trade currency, and rare Mutya Shards.',
    tip: 'Check your Journal or inspect the Notice Board in Tavern anytime to review contract progress.',
  },
];

const STABLES_TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Beastmaster Stables Unlocked',
    icon: '🐎',
    description: 'Having vanquished the primordial titan Tambanokano, you have unlocked the legendary Beastmaster Stables in Poblacion Citadel!',
    tip: 'Tame mystical archipelago beasts to ride across the archipelago.',
  },
  {
    title: 'Mount Traversal & Passives',
    icon: '🛡️',
    description: 'Mounts provide substantial passive attribute bonuses, reduced stamina travel costs, and unique traversal auras.',
    tip: 'Equip and manage your steeds in the Stables district in Haven.',
  },
];

const LOCAL_STORAGE_KEY = 'maharlika_player_save_v1';

/**
 * Creates a blank player template — no class, no weapon assigned yet.
 * The real player is fully built in handleCharacterCreate after class selection.
 */
const createInitialPlayer = (): PlayerCharacter => {
  const starterUpper = UPPER_ARMORS[0]; // Woven Cotton Shirt
  const starterLower = LOWER_ARMORS[0]; // Simple Woven Breeches

  const startingAttributes = { str: 10, agi: 10, int: 10, vit: 10 };
  const initialEquipment = {
    weapon: null,
    upperArmor: starterUpper,
    lowerArmor: starterLower,
    mount: null, // Mounts unlock strictly post-Act 6!
    bike: null,
  };

  const derived = calcDerivedStats(startingAttributes, 1, initialEquipment);

  return {
    name: 'Maharlika',
    heroClass: 'Mandirigma',
    level: 1,
    exp: 0,
    availableAP: 0,
    attributes: startingAttributes,
    currentHp: derived.maxHp,
    currentMp: derived.maxMp,
    stamina: 18,
    maxStamina: 20,
    wallet: {
      cowrieShells: 80,
      silverPieces: 5,
      goldIngots: 0,
      mutyaShards: 2,
      copperCoins: 80,
      silverShillings: 5,
      goldSovereigns: 0,
      prismaticShards: 2,
    },
    equipment: initialEquipment,
    inventory: [CONSUMABLES[0], CONSUMABLES[1], CONSUMABLES[2]],
    stash: [CONSUMABLES[3], CONSUMABLES[4]],
    encryptedMemories: [
      { id: 'mem_starter_1', name: 'Encrypted Memory (WHITE)', rarity: 'WHITE', minLevel: 1, acquiredAtLocation: 'loc_act_1' },
      { id: 'mem_starter_2', name: 'Encrypted Memory (GREEN)', rarity: 'GREEN', minLevel: 5, acquiredAtLocation: 'loc_act_1' },
    ],
    activeEffects: [],
    locationPoints: 0,
    currentLocationId: 'loc_act_1',
    unlockedLocationIds: ['loc_act_1'],
    bounties: INITIAL_BOUNTIES,
    sideQuests: INITIAL_SIDE_QUESTS,
    act6Completed: false,
    mountUnlocked: false,
    forfeitedQuestIds: [],
    completedBossIds: [],
    hasCreatedCharacter: false,
    unlockedSkillIds: [],
    equippedSkillIds: [],
    tutorialsSeen: [],
    unlockedActStoryIds: [],
    discoveredBossIds: [],
  };
};

const mergePlayerWithMasterData = (savedPlayer: PlayerCharacter): PlayerCharacter => {
  const existingBountiesMap = new Map((savedPlayer.bounties || []).map((b) => [b.id, b]));
  const mergedBounties = INITIAL_BOUNTIES.map((master) => {
    const existing = existingBountiesMap.get(master.id);
    if (existing) {
      return {
        ...master,
        currentCount: existing.currentCount ?? 0,
        isAccepted: existing.isAccepted ?? false,
        isCompleted: existing.isCompleted ?? false,
        isClaimed: existing.isClaimed ?? false,
      };
    }
    return master;
  });

  const existingQuestsMap = new Map((savedPlayer.sideQuests || []).map((q) => [q.id, q]));
  const mergedSideQuests = INITIAL_SIDE_QUESTS.map((master) => {
    const existing = existingQuestsMap.get(master.id);
    if (existing) {
      return {
        ...master,
        isDiscovered: existing.isDiscovered ?? false,
        progressCurrent: existing.progressCurrent ?? 0,
        isCompleted: existing.isCompleted ?? false,
        isClaimed: existing.isClaimed ?? false,
        isForfeited: existing.isForfeited ?? false,
      };
    }
    return {
      ...master,
      isDiscovered: false,
    };
  });

  const heroClass = savedPlayer.heroClass || 'Mandirigma';
  const classSkills = getSkillsByClass(heroClass as any);
  const classSkillIds = new Set(classSkills.map((s: Skill) => s.id));
  const basicId = getBasicAttackId(heroClass as any);

  let sanitizedEquipped = (savedPlayer.equippedSkillIds || []).filter((id) => classSkillIds.has(id));
  if (sanitizedEquipped.length === 0 && basicId) {
    sanitizedEquipped = [basicId];
  }

  const sanitizedInventory = sanitizeItemIds(savedPlayer.inventory || []);
  const sanitizedStash = sanitizeItemIds(savedPlayer.stash || []);

  return {
    ...savedPlayer,
    inventory: sanitizedInventory,
    stash: sanitizedStash,
    bounties: mergedBounties,
    sideQuests: mergedSideQuests,
    forfeitedQuestIds: savedPlayer.forfeitedQuestIds || [],
    completedBossIds: savedPlayer.completedBossIds || [],
    // Ensure new fields are initialized for existing saves
    hasCreatedCharacter: savedPlayer.hasCreatedCharacter ?? false,
    unlockedSkillIds: savedPlayer.unlockedSkillIds ?? [],
    equippedSkillIds: Array.from(new Set(sanitizedEquipped)),
    tutorialsSeen: savedPlayer.tutorialsSeen ?? [],
    unlockedActStoryIds: savedPlayer.unlockedActStoryIds ?? [],
    discoveredBossIds: savedPlayer.discoveredBossIds ?? [],
    narratorLogs: savedPlayer.narratorLogs ?? [],
  };
};

export function App() {
  const [viewMode, setViewMode] = useState<'TITLE' | 'GAME'>('TITLE');
  const [activeSlot, setActiveSlot] = useState<number>(() => {
    migrateLegacySave();
    return getActiveSlotId();
  });
  const [isCharacterCreationOpen, setIsCharacterCreationOpen] = useState<boolean>(false);
  const [showInGameSettings, setShowInGameSettings] = useState<boolean>(false);
  const [showRoadmapModal, setShowRoadmapModal] = useState<boolean>(false);

  const [player, setPlayer] = useState<PlayerCharacter>(() => {
    migrateLegacySave();
    const curSlot = getActiveSlotId();
    const saved = loadGameSlot(curSlot);
    if (saved) {
      try {
        return mergePlayerWithMasterData(saved);
      } catch {
        return createInitialPlayer();
      }
    }
    return createInitialPlayer();
  });

  // Default to HAVEN homepage safe zone
  const [currentTab, setCurrentTab] = useState<NavTab>('HAVEN');
  const [showRaidView, setShowRaidView] = useState<boolean>(false);

  // Global Toast Notification Banner State
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback(
    (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', icon?: string, durationMs?: number) => {
      setToast({
        id: `toast_${Date.now()}_${Math.random()}`,
        message,
        type,
        icon,
        durationMs,
      });
    },
    []
  );

  // Opening story modal shown after character creation
  const [showOpeningStory, setShowOpeningStory] = useState<boolean>(false);
  const [isRaidBattleActive, setIsRaidBattleActive] = useState<boolean>(false);

  // Exploration & Battle State
  const [battle, setBattle] = useState<BattleState>({
    inCombat: false,
    turnNumber: 0,
    playerActionGauge: 100,
    enemyActionGauge: 0,
    enemy: null,
    logs: [],
    winner: null,
  });

  // Interactive Onboarding Tutorial state
  const [showOnboardingTutorial, setShowOnboardingTutorial] = useState<boolean>(() => {
    return Boolean(player.hasCreatedCharacter && !(player.tutorialsSeen ?? []).includes('tut_onboarding'));
  });
  const [townDistrictOverride, setTownDistrictOverride] = useState<{
    district: 'TAVERN' | 'FORGE' | 'ALCHEMIST' | 'STABLES' | 'GATE' | 'STASH';
    key: number;
  } | null>(null);

  const [currentDistrict, setCurrentDistrict] = useState<'TAVERN' | 'FORGE' | 'ALCHEMIST' | 'STABLES' | 'GATE' | 'STASH'>('TAVERN');
  const [selectedWorldLocationId, setSelectedWorldLocationId] = useState<string>(player.currentLocationId || 'loc_act_1');

  const handleCompleteOnboarding = useCallback(() => {
    setShowOnboardingTutorial(false);
    setTownDistrictOverride(null);
    const seen = Array.from(new Set([...(player.tutorialsSeen ?? []), 'tut_onboarding']));
    setPlayer((prev) => ({ ...prev, tutorialsSeen: seen }));
  }, [player.tutorialsSeen]);

  const handleSelectDistrictForTutorial = useCallback(
    (district: 'TAVERN' | 'FORGE' | 'ALCHEMIST' | 'STABLES' | 'GATE' | 'STASH') => {
      setTownDistrictOverride({ district, key: Date.now() });
    },
    []
  );

  const handleSelectTabForTutorial = useCallback((tab: NavTab) => {
    setShowRaidView(false);
    setCurrentTab(tab);
  }, []);

  // Persistent Announcement Ticker Active State (for dynamic viewport offset)
  const [isTickerActive, setIsTickerActive] = useState<boolean>(false);

  // Standalone Feature Tutorials Queue (Mutya Skills Lv 2, Notice Board Lv 3, Stables Post-Act 6)
  const [activeFeatureTutorial, setActiveFeatureTutorial] = useState<{
    id: string;
    featureName: string;
    steps: TutorialStep[];
    onComplete: () => void;
  } | null>(null);

  const [characterTabOverride, setCharacterTabOverride] = useState<'STATS' | 'SKILLS'>('STATS');

  // Check onboarding trigger on load or when player character state changes
  useEffect(() => {
    if (player.hasCreatedCharacter && !(player.tutorialsSeen ?? []).includes('tut_onboarding')) {
      setShowOnboardingTutorial(true);
    }
  }, [player.hasCreatedCharacter, player.tutorialsSeen]);

  // Proactive Standalone Feature Tutorials (Triggered immediately upon unlocking)
  useEffect(() => {
    if (
      !player.hasCreatedCharacter ||
      battle.inCombat ||
      isRaidBattleActive ||
      showOpeningStory ||
      showOnboardingTutorial ||
      activeFeatureTutorial
    ) {
      return;
    }

    const seen = player.tutorialsSeen ?? [];

    // 1. Mutya Skills Unlock at Level 2
    if (player.level >= 2 && !seen.includes('tut_skills')) {
      setShowRaidView(false);
      setCurrentTab('CHARACTER');
      setCharacterTabOverride('SKILLS');
      setActiveFeatureTutorial({
        id: 'tut_skills',
        featureName: 'Mutya Skill Tree',
        steps: MUTYA_SKILLS_TUTORIAL_STEPS,
        onComplete: () => {
          const updatedSeen = Array.from(new Set([...(player.tutorialsSeen ?? []), 'tut_skills']));
          setPlayer((prev) => ({ ...prev, tutorialsSeen: updatedSeen }));
          setActiveFeatureTutorial(null);
        },
      });
      return;
    }

    // 2. Poblacion Notice Board Unlock at Level 3
    if (player.level >= 3 && !seen.includes('tut_bounties')) {
      setShowRaidView(false);
      setCurrentTab('HAVEN');
      setTownDistrictOverride({ district: 'TAVERN', key: Date.now() });
      setActiveFeatureTutorial({
        id: 'tut_bounties',
        featureName: 'Poblacion Notice Board',
        steps: NOTICE_BOARD_TUTORIAL_STEPS,
        onComplete: () => {
          const updatedSeen = Array.from(new Set([...(player.tutorialsSeen ?? []), 'tut_bounties']));
          setPlayer((prev) => ({ ...prev, tutorialsSeen: updatedSeen }));
          setActiveFeatureTutorial(null);
        },
      });
      return;
    }

    // 3. Beastmaster Stables Unlock (Post-Act 6)
    const isAct6Beaten = Boolean(
      player.mountUnlocked ||
      player.act6Completed ||
      (player.completedBossIds ?? []).includes('boss_act_6')
    );
    if (isAct6Beaten && !seen.includes('tut_stables')) {
      setShowRaidView(false);
      setCurrentTab('HAVEN');
      setTownDistrictOverride({ district: 'STABLES', key: Date.now() });
      setActiveFeatureTutorial({
        id: 'tut_stables',
        featureName: 'Beastmaster Stables',
        steps: STABLES_TUTORIAL_STEPS,
        onComplete: () => {
          const updatedSeen = Array.from(new Set([...(player.tutorialsSeen ?? []), 'tut_stables']));
          setPlayer((prev) => ({ ...prev, tutorialsSeen: updatedSeen }));
          setActiveFeatureTutorial(null);
        },
      });
      return;
    }
  }, [
    player.hasCreatedCharacter,
    player.level,
    player.mountUnlocked,
    player.act6Completed,
    player.completedBossIds,
    player.tutorialsSeen,
    battle.inCombat,
    isRaidBattleActive,
    showOpeningStory,
    showOnboardingTutorial,
    activeFeatureTutorial,
  ]);

  // Auto Save to Active Slot in LocalStorage
  useEffect(() => {
    if (player.hasCreatedCharacter) {
      saveGameSlot(activeSlot, player);
    }
  }, [player, activeSlot]);

  // Out-of-Combat Passive HP & MP Regeneration Ticker (Every 10 Seconds)
  useEffect(() => {
    if (!player.hasCreatedCharacter || battle.inCombat) return;

    const regenInterval = setInterval(() => {
      setPlayer((prev) => {
        const derived = calcDerivedStats(prev.attributes, prev.level, prev.equipment);

        const hpRegen = Math.max(1, Math.floor(prev.attributes.vit * 0.1));
        const mpRegen = Math.max(1, Math.floor(prev.attributes.int * 0.08));

        const newHp = Math.min(derived.maxHp, prev.currentHp + hpRegen);
        const newMp = Math.min(derived.maxMp, prev.currentMp + mpRegen);

        if (newHp === prev.currentHp && newMp === prev.currentMp) return prev;

        return {
          ...prev,
          currentHp: newHp,
          currentMp: newMp,
        };
      });
    }, 10000);

    return () => clearInterval(regenInterval);
  }, [player.hasCreatedCharacter, battle.inCombat]);

  // Poblacion Sanctuary Passive Stamina Regeneration Ticker (Every 30 Seconds in Haven)
  useEffect(() => {
    if (!player.hasCreatedCharacter || battle.inCombat || currentTab !== 'HAVEN') return;

    const staminaRegenInterval = setInterval(() => {
      setPlayer((prev) => {
        const maxStam = calcMaxStamina(prev.level);
        const curStam = prev.stamina ?? maxStam;
        if (curStam >= maxStam) return prev;

        return {
          ...prev,
          stamina: Math.min(maxStam, curStam + 1),
        };
      });
    }, 30000);

    return () => clearInterval(staminaRegenInterval);
  }, [player.hasCreatedCharacter, battle.inCombat, currentTab]);

  // Context-Aware Ambient Background Music Controller
  useEffect(() => {
    if (showOpeningStory || !player.hasCreatedCharacter) {
      bgmManager.playTrack('LORE');
    } else if (showRaidView || (battle.inCombat && battle.enemy?.isBoss)) {
      bgmManager.playTrack('BOSS');
    } else if (battle.inCombat) {
      bgmManager.playTrack('BATTLE');
    } else {
      bgmManager.playTrack('MAIN');
    }
  }, [showOpeningStory, player.hasCreatedCharacter, showRaidView, battle.inCombat, battle.enemy?.isBoss]);

  /**
   * Called by CharacterCreationModal on completion.
   * Builds the fully-initialized player state for the chosen class and name.
   */
  const handleCharacterCreate = (heroClass: HeroClass, heroName: string) => {
    // Class-specific starting attributes
    const attrsByClass: Record<HeroClass, { str: number; agi: number; int: number; vit: number }> = {
      Mandirigma: { str: 14, agi: 9, int: 8, vit: 14 },
      Bagani:     { str: 9, agi: 15, int: 10, vit: 11 },
      Mangangaso: { str: 10, agi: 14, int: 11, vit: 10 },
      Babaylan:   { str: 8, agi: 9, int: 16, vit: 12 },
    };

    // Class-locked starter weapons
    const starterWeaponByClass = {
      Mandirigma: SWORDS[0],
      Bagani:     DAGGERS[0],
      Mangangaso: BOWS[0],
      Babaylan:   STAVES[0],
    };

    const attributes = attrsByClass[heroClass];
    const starterWeapon = starterWeaponByClass[heroClass];

    const initialEquipment = {
      weapon: starterWeapon,
      upperArmor: UPPER_ARMORS[0],
      lowerArmor: LOWER_ARMORS[0],
      mount: null,
      bike: null,
    };

    const derived = calcDerivedStats(attributes, 1, initialEquipment);

    // Skill IDs: starting character gets ONLY the basic attack unlocked & equipped (1 skill)
    const defaultIds = getDefaultSkillIds(heroClass);
    const equippedIds = [...defaultIds];

    // New player starting wallet — modest but meaningful
    const newWallet = cowriesToWallet(80 + 5 * 100, 2); // 580 cowries total, 2 Mutya Shards

    const newPlayer: PlayerCharacter = {
      ...player,
      name: heroName,
      heroClass,
      attributes,
      currentHp: derived.maxHp,
      currentMp: derived.maxMp,
      equipment: initialEquipment,
      wallet: {
        ...newWallet,
        cowrieShells: 80,
        silverPieces: 5,
        goldIngots: 0,
        mutyaShards: 2,
        copperCoins: 80,
        silverShillings: 5,
        goldSovereigns: 0,
        prismaticShards: 2,
      },
      unlockedSkillIds: defaultIds,
      equippedSkillIds: equippedIds,
      hasCreatedCharacter: true,
    };

    setPlayer(newPlayer);
    saveGameSlot(activeSlot, newPlayer);
    setIsCharacterCreationOpen(false);
    setViewMode('GAME');
    setShowOpeningStory(true);
  };

  const handleStartGame = (loadedPlayer: PlayerCharacter, slotId: number) => {
    setActiveSlot(slotId);
    setActiveSlotId(slotId);
    setPlayer(mergePlayerWithMasterData(loadedPlayer));
    setViewMode('GAME');
    setIsCharacterCreationOpen(false);
  };

  const handleNewGamePrompt = (slotId: number) => {
    setActiveSlot(slotId);
    setActiveSlotId(slotId);
    setIsCharacterCreationOpen(true);
  };

  const handleReturnToTitle = () => {
    if (player.hasCreatedCharacter) {
      saveGameSlot(activeSlot, player);
    }
    setViewMode('TITLE');
  };

  const handleMonsterKilled = (enemy: EnemyMonster) => {
    const enemyNameClean = enemy.name.replace(/^Elite\s+/, '').trim().toLowerCase();
    const enemyIdClean = enemy.id.toLowerCase();

    const updatedBounties = player.bounties.map((bounty) => {
      const targetNameClean = bounty.targetMonsterName.toLowerCase().trim();
      const targetIdClean = bounty.targetMonsterId.toLowerCase().trim();

      const isMatch =
        enemyNameClean.includes(targetNameClean) ||
        targetNameClean.includes(enemyNameClean) ||
        enemyIdClean.includes(targetIdClean);

      if (isMatch) {
        const newCount = Math.min(bounty.targetCount, bounty.currentCount + 1);
        return {
          ...bounty,
          isAccepted: true,
          currentCount: newCount,
          isCompleted: newCount >= bounty.targetCount,
        };
      }
      return bounty;
    });

    const updatedSideQuests = (player.sideQuests || []).map((sq) => {
      const newProgress = Math.min(sq.progressRequired, sq.progressCurrent + 1);
      return {
        ...sq,
        progressCurrent: newProgress,
        isCompleted: newProgress >= sq.progressRequired,
      };
    });

    setPlayer((prev) => ({
      ...prev,
      bounties: updatedBounties,
      sideQuests: updatedSideQuests,
    }));
  };

  /**
   * Unequips an item from the given slot and returns it to inventory.
   * Accepts the unified 'weapon' slot in addition to armor and mount slots.
   */
  const handleUnequipItem = (
    slot: 'weapon' | 'upperArmor' | 'lowerArmor' | 'mount' | 'bike'
  ) => {
    const item = player.equipment[slot] ??
      (slot === 'weapon' ? player.equipment.primaryWeapon : slot === 'mount' ? player.equipment.bike : null);
    if (!item) return;

    const newEquipment = { ...player.equipment, [slot]: null };
    if (slot === 'weapon') {
      newEquipment.primaryWeapon = null;
      newEquipment.specialWeapon = null;
      newEquipment.heavyWeapon = null;
    }
    if (slot === 'mount') {
      newEquipment.bike = null;
    }

    const newInventory = sortInventory([...player.inventory, item]);

    setPlayer((prev) => ({
      ...prev,
      equipment: newEquipment,
      inventory: newInventory,
    }));
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen text-amber-100 flex flex-col font-sans select-none overflow-hidden relative">
        {viewMode === 'TITLE' ? (
          <>
            <TitleScreenView
              onStartGame={handleStartGame}
              onNewGamePrompt={handleNewGamePrompt}
              onOpenRoadmap={() => setShowRoadmapModal(true)}
              onShowToast={showToast}
            />

            {/* Character Creation Modal on Title Screen */}
            {isCharacterCreationOpen && (
              <CharacterCreationModal
                onComplete={handleCharacterCreate}
                onCancel={() => setIsCharacterCreationOpen(false)}
              />
            )}

            {/* Roadmap Modal on Title Screen */}
            {showRoadmapModal && (
              <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
                <div className="bg-zinc-950 border-2 border-amber-500 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 relative shadow-2xl">
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-3">
                    <h2 className="font-serif text-amber-200 font-bold text-lg">Development Roadmap</h2>
                    <button
                      onClick={() => setShowRoadmapModal(false)}
                      className="text-zinc-400 hover:text-white w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <RoadmapView />
                </div>
              </div>
            )}

            {/* Global Toast Notification */}
            <ToastBanner toast={toast} onDismiss={() => setToast(null)} />
          </>
        ) : (
          <>
            {/* Smooth Dynamic Blurred Backdrop from ./src/bg/ */}
            <BackgroundLayer
              currentTab={currentTab}
              townDistrict={townDistrictOverride?.district || currentDistrict}
              locationId={selectedWorldLocationId}
              showRaidView={showRaidView}
            />

            {/* Character Creation Modal (Fallback if needed) */}
            {!player.hasCreatedCharacter && (
              <CharacterCreationModal onComplete={handleCharacterCreate} />
            )}

            {/* Opening Story Modal — shown once, immediately after character creation */}
            {player.hasCreatedCharacter && showOpeningStory && (
              <OpeningStoryModal
                heroClass={player.heroClass}
                heroName={player.name}
                onClose={() => setShowOpeningStory(false)}
              />
            )}

            {/* [TOP] PERSISTENT HUD */}
            {player.hasCreatedCharacter && (
              <PersistentHUD
                player={player}
                inCombat={battle.inCombat}
                onTickerActiveChange={setIsTickerActive}
                onOpenSettings={() => setShowInGameSettings(true)}
              />
            )}

            {/* In-Game Settings Modal */}
            <SettingsModal
              isOpen={showInGameSettings}
              onClose={() => setShowInGameSettings(false)}
              player={player}
              onReturnToTitle={handleReturnToTitle}
              onShowToast={showToast}
            />

        {/* [CENTER] MAIN VIEWPORT & CONTEXTUAL ACTION PADS (Dynamically pushed down when Announcement Ticker is active) */}
        <main
          className={`flex-1 max-w-7xl w-full mx-auto overflow-y-auto pb-16 md:pb-28 flex flex-col transition-all duration-300 ${
            isTickerActive
              ? 'pt-[124px] sm:pt-[128px] md:pt-[88px]'
              : 'pt-[96px] sm:pt-[100px] md:pt-[64px]'
          }`}
        >
          {showRaidView ? (
            <TitanRaidView
              player={player}
              onUpdatePlayer={setPlayer}
              onNavigateToHaven={() => {
                setIsRaidBattleActive(false);
                setShowRaidView(false);
              }}
              onShowToast={showToast}
              onRaidBattleStateChange={setIsRaidBattleActive}
            />
          ) : (
            <>
              {currentTab === 'HAVEN' && (
                <HavenView
                  player={player}
                  onUpdatePlayer={setPlayer}
                  onNavigateToWorld={() => setCurrentTab('WORLD')}
                  onNavigateToTitanRaid={() => setShowRaidView(true)}
                  onShowToast={showToast}
                  activeDistrictOverride={townDistrictOverride}
                  onDistrictChange={setCurrentDistrict}
                />
              )}

              {currentTab === 'WORLD' && (
                <WorldHuntView
                  player={player}
                  battle={battle}
                  onUpdatePlayer={setPlayer}
                  onUpdateBattle={setBattle}
                  onNavigateToHaven={() => setCurrentTab('HAVEN')}
                  onMonsterKilled={handleMonsterKilled}
                  suppressActStory={showOnboardingTutorial}
                  onShowToast={showToast}
                  onLocationChange={setSelectedWorldLocationId}
                />
              )}

              {currentTab === 'INVENTORY' && (
                <InventoryView
                  player={player}
                  onUpdatePlayer={setPlayer}
                  onNavigateCodebreaker={() => setCurrentTab('WORLD')}
                  onShowToast={showToast}
                />
              )}

              {currentTab === 'CHARACTER' && (
                <CharacterSheet
                  player={player}
                  setPlayer={setPlayer}
                  onUnequipItem={handleUnequipItem}
                  initialTab={characterTabOverride}
                />
              )}

              {currentTab === 'LOG' && (
                <GameLogView
                  player={player}
                  battleLogs={battle.logs}
                  onUpdatePlayer={setPlayer}
                  onShowToast={showToast}
                />
              )}
            </>
          )}
        </main>

        {/* Global Toast Notification Popup Banner (Swipes down from top) */}
        <ToastBanner toast={toast} onDismiss={() => setToast(null)} />

        {/* [FOOTER] GLOBAL NAVIGATION BAR */}
        {player.hasCreatedCharacter && !showOpeningStory && (
          <Navbar
            currentTab={currentTab}
            onSelectTab={(tab) => {
              setShowRaidView(false);
              setCurrentTab(tab);
            }}
            player={player}
            inCombat={battle.inCombat || isRaidBattleActive}
            isRaidBattle={isRaidBattleActive}
            onShowToast={showToast}
          />
        )}

        {/* Interactive Onboarding Tutorial Modal */}
        {player.hasCreatedCharacter && !showOpeningStory && showOnboardingTutorial && (
          <InteractiveOnboardingTutorial
            onComplete={handleCompleteOnboarding}
            onSkip={handleCompleteOnboarding}
            onSelectDistrict={handleSelectDistrictForTutorial}
            onSelectTab={handleSelectTabForTutorial}
          />
        )}

        {/* Proactive Standalone Feature Unlock Tutorial Modal */}
        {activeFeatureTutorial && (
          <FeatureTutorialModal
            tutorialId={activeFeatureTutorial.id}
            featureName={activeFeatureTutorial.featureName}
            steps={activeFeatureTutorial.steps}
            onComplete={activeFeatureTutorial.onComplete}
            onSkip={activeFeatureTutorial.onComplete}
          />
        )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
