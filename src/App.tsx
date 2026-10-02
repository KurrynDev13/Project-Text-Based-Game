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
import { TownHub } from './components/TownHub';
import { WorldHuntView } from './components/WorldHuntView';
import { InventoryView } from './components/InventoryView';
import { CharacterSheet } from './components/CharacterSheet';
import { GameLogView } from './components/GameLogView';
import { TitanRaidView } from './components/TitanRaidView';
import CharacterCreationModal from './components/CharacterCreationModal';
import OpeningStoryModal from './components/OpeningStoryModal';
import InteractiveOnboardingTutorial from './components/InteractiveOnboardingTutorial';
import { ToastBanner, ToastMessage } from './components/ToastBanner';
import { BackgroundLayer } from './components/BackgroundLayer';
import { bgmManager } from './utils/musicManager';
// SkillTreeView is used inside CharacterSheet now

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
  const [player, setPlayer] = useState<PlayerCharacter>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return mergePlayerWithMasterData(parsed);
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

  // Check onboarding trigger on load or when player character state changes
  useEffect(() => {
    if (player.hasCreatedCharacter && !(player.tutorialsSeen ?? []).includes('tut_onboarding')) {
      setShowOnboardingTutorial(true);
    }
  }, [player.hasCreatedCharacter, player.tutorialsSeen]);

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

  // Auto Save
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(player));
  }, [player]);

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
    setShowOpeningStory(true);
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

  const handleLaunchRaidBattle = (currentBakunawaHp: number) => {
    setShowRaidView(false);
    setCurrentTab('WORLD');

    const bakunawaMonster: EnemyMonster = {
      id: 'boss_bakunawa_raid',
      name: 'Bakunawa, The Moon-Devouring Serpent',
      title: 'Celestial Titan of the Great Eclipse',
      level: 55,
      maxHp: 50000000,
      currentHp: currentBakunawaHp > 0 ? currentBakunawaHp : 50000000,
      attackMin: 180,
      attackMax: 260,
      armor: 140,
      damageType: 'SHADOW',
      expReward: 15000,
      copperReward: 10000,
      shardChance: 1.0,
      isBoss: true,
      spriteIcon: '🐉',
      activeEffects: [],
    };

    setBattle({
      inCombat: true,
      turnNumber: 1,
      playerActionGauge: 100,
      enemyActionGauge: 0,
      enemy: bakunawaMonster,
      logs: [
        {
          id: `log_raid_start_${Date.now()}`,
          turn: 1,
          actor: 'SYSTEM',
          text: '🐉 CELESTIAL RAID ENGAGEMENT: Bakunawa coils across the eclipsed heavens! Utilize your weapon attacks, Mutya skills, consumables, guard, or retreat!',
          type: 'INFO',
        },
      ],
      winner: null,
    });
  };

  return (
    <div className="min-h-screen text-amber-100 flex flex-col font-sans select-none overflow-hidden relative">
      {/* Smooth Dynamic Blurred Backdrop from ./src/bg/ */}
      <BackgroundLayer
        currentTab={currentTab}
        townDistrict={townDistrictOverride?.district || currentDistrict}
        locationId={selectedWorldLocationId}
        showRaidView={showRaidView}
      />
      {/* Character Creation Modal — shown for new players before anything else */}
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
        <PersistentHUD player={player} inCombat={battle.inCombat} />
      )}

      {/* [CENTER] MAIN VIEWPORT & CONTEXTUAL ACTION PADS */}
      <main className="flex-1 max-w-7xl w-full mx-auto overflow-y-auto pt-[96px] sm:pt-[100px] md:pt-[64px] pb-16 md:pb-28 flex flex-col">
        {showRaidView ? (
          <TitanRaidView
            player={player}
            onUpdatePlayer={setPlayer}
            onNavigateToHaven={() => setShowRaidView(false)}
            onShowToast={showToast}
            onLaunchRaidBattle={handleLaunchRaidBattle}
          />
        ) : (
          <>
            {currentTab === 'HAVEN' && (
              <TownHub
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
          inCombat={battle.inCombat}
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
    </div>
  );
}

export default App;
