import React, { useState, useEffect } from 'react';
import {
  PlayerCharacter,
  BattleState,
  EnemyMonster,
} from './types/game';
import {
  UPPER_ARMORS,
  LOWER_ARMORS,
  DAGGERS,
  BOWS,
  STAVES,
  BIKES,
  CONSUMABLES,
  INITIAL_BOUNTIES,
  INITIAL_SIDE_QUESTS,
} from './data/equipmentData';
import { calcDerivedStats } from './utils/gameFormulas';

import { Navbar, NavTab } from './components/Navbar';
import { PersistentHUD } from './components/PersistentHUD';
import { TownHub } from './components/TownHub';
import { WorldHuntView } from './components/WorldHuntView';
import { InventoryView } from './components/InventoryView';
import { CharacterSheet } from './components/CharacterSheet';
import { GameLogView } from './components/GameLogView';
import { TitanRaidView } from './components/TitanRaidView';

const LOCAL_STORAGE_KEY = 'maharlika_player_save_v1';

const createInitialPlayer = (): PlayerCharacter => {
  const starterPrimary = DAGGERS[0]; // Rusted Farm Sickle
  const starterSpecial = BOWS[0]; // Bamboo Hunting Bow
  const starterHeavy = STAVES[0]; // Hardened Bamboo Cane
  const starterUpper = UPPER_ARMORS[0]; // Woven Cotton Shirt
  const starterLower = LOWER_ARMORS[0]; // Simple Woven Breeches

  const startingAttributes = { str: 10, agi: 10, int: 10, vit: 10 };
  const initialEquipment = {
    primaryWeapon: starterPrimary,
    specialWeapon: starterSpecial,
    heavyWeapon: starterHeavy,
    upperArmor: starterUpper,
    lowerArmor: starterLower,
    mount: null, // Mounts unlock strictly post-Act 6!
    bike: null,
  };

  const derived = calcDerivedStats(startingAttributes, 1, initialEquipment);

  return {
    name: 'Maharlika Blade',
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
      silverPieces: 45,
      goldIngots: 12,
      mutyaShards: 4,
      copperCoins: 80,
      silverShillings: 45,
      goldSovereigns: 12,
      prismaticShards: 4,
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
  };
};

const mergePlayerWithMasterBounties = (savedPlayer: PlayerCharacter): PlayerCharacter => {
  const existingMap = new Map((savedPlayer.bounties || []).map((b) => [b.id, b]));
  const mergedBounties = INITIAL_BOUNTIES.map((master, idx) => {
    const existing = existingMap.get(master.id);
    if (existing) {
      return {
        ...master,
        currentCount: existing.currentCount ?? 0,
        isAccepted: existing.isAccepted ?? (idx === 0),
        isCompleted: existing.isCompleted ?? false,
        isClaimed: existing.isClaimed ?? false,
      };
    }
    return master;
  });
  return {
    ...savedPlayer,
    bounties: mergedBounties,
  };
};

export function App() {
  const [player, setPlayer] = useState<PlayerCharacter>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return mergePlayerWithMasterBounties(parsed);
      } catch {
        return createInitialPlayer();
      }
    }
    return createInitialPlayer();
  });

  // Default to HAVEN homepage safe zone
  const [currentTab, setCurrentTab] = useState<NavTab>('HAVEN');
  const [showRaidView, setShowRaidView] = useState<boolean>(false);

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

  const handleUnequipItem = (
    slot: 'upperArmor' | 'lowerArmor' | 'primaryWeapon' | 'specialWeapon' | 'heavyWeapon' | 'mount' | 'bike'
  ) => {
    const item = player.equipment[slot];
    if (!item) return;

    const newEquipment = { ...player.equipment, [slot]: null };
    const newInventory = [...player.inventory, item];

    setPlayer((prev) => ({
      ...prev,
      equipment: newEquipment,
      inventory: newInventory,
    }));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-amber-100 flex flex-col font-sans select-none overflow-hidden">
      {/* [TOP] PERSISTENT HUD */}
      <PersistentHUD player={player} inCombat={battle.inCombat} />

      {/* [CENTER] MAIN VIEWPORT & CONTEXTUAL ACTION PADS */}
      <main className="flex-1 max-w-7xl w-full mx-auto overflow-hidden pb-16 md:pb-0 flex flex-col">
        {showRaidView ? (
          <TitanRaidView
            player={player}
            onUpdatePlayer={setPlayer}
            onNavigateToHaven={() => setShowRaidView(false)}
          />
        ) : (
          <>
            {currentTab === 'HAVEN' && (
              <TownHub
                player={player}
                onUpdatePlayer={setPlayer}
                onNavigateToWorld={() => setCurrentTab('WORLD')}
                onNavigateToTitanRaid={() => setShowRaidView(true)}
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
              />
            )}

            {currentTab === 'INVENTORY' && (
              <InventoryView
                player={player}
                onUpdatePlayer={setPlayer}
                onNavigateCodebreaker={() => setCurrentTab('WORLD')}
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
              />
            )}
          </>
        )}
      </main>

      {/* [FOOTER] GLOBAL NAVIGATION BAR */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setShowRaidView(false);
          setCurrentTab(tab);
        }}
        player={player}
        inCombat={battle.inCombat}
      />
    </div>
  );
}

export default App;
