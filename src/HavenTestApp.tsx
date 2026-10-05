import React, { useState, useEffect } from 'react';
import { PlayerCharacter } from './types/game';
import {
  UPPER_ARMORS,
  LOWER_ARMORS,
  SWORDS,
  CONSUMABLES,
  INITIAL_BOUNTIES,
  INITIAL_SIDE_QUESTS,
} from './data/equipmentData';
import { calcDerivedStats } from './utils/gameFormulas';
import { Navbar, NavTab } from './components/Navbar';
import { HavenRedesignTestView } from './components/HavenRedesignTestView';
import { ToastBanner, ToastMessage } from './components/ToastBanner';
import { BackgroundLayer } from './components/BackgroundLayer';

const TEST_STORAGE_KEY = 'maharlika_haven_redesign_test_player_v4';

const createTestPlayer = (): PlayerCharacter => {
  const startingAttributes = { str: 14, agi: 9, int: 8, vit: 14 };
  const initialEquipment = {
    weapon: SWORDS[0],
    upperArmor: UPPER_ARMORS[0],
    lowerArmor: LOWER_ARMORS[0],
    mount: null,
    bike: null,
  };

  const derived = calcDerivedStats(startingAttributes, 1, initialEquipment);

  return {
    name: 'Bayani (Tester)',
    heroClass: 'Mandirigma',
    level: 1,
    exp: 0,
    availableAP: 0,
    skillPoints: 1,
    attributes: startingAttributes,
    currentHp: derived.maxHp,
    currentMp: derived.maxMp,
    stamina: 18,
    maxStamina: 20,
    wallet: {
      cowrieShells: 50,
      silverPieces: 5,
      goldIngots: 1, // 1 Gold (10,000) + 5 Silver (500) + 50 Shells = 10,550 Cowries
      mutyaShards: 8,
      copperCoins: 50,
      silverShillings: 5,
      goldSovereigns: 1,
      prismaticShards: 8,
    },
    equipment: initialEquipment,
    inventory: [
      SWORDS[1],
      UPPER_ARMORS[1],
      CONSUMABLES[0],
      CONSUMABLES[1],
      CONSUMABLES[2],
    ],
    stash: [
      SWORDS[2],
      UPPER_ARMORS[2],
      LOWER_ARMORS[1],
      CONSUMABLES[3],
    ],
    encryptedMemories: [],
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
    hasCreatedCharacter: true,
    unlockedSkillIds: ['sk_mandi_1'],
    equippedSkillIds: ['sk_mandi_1'],
    tutorialsSeen: ['tut_haven_redesign_test'],
    unlockedActStoryIds: ['loc_act_1'],
    discoveredBossIds: [],
  };
};

export const HavenTestApp: React.FC = () => {
  const [player, setPlayer] = useState<PlayerCharacter>(() => {
    try {
      const saved = localStorage.getItem(TEST_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load test player save', e);
    }
    return createTestPlayer();
  });

  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(TEST_STORAGE_KEY, JSON.stringify(player));
    } catch (e) {
      console.error('Failed to persist test player save', e);
    }
  }, [player]);

  const showToast = (
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    icon?: string
  ) => {
    setToast({
      id: `toast_${Date.now()}_${Math.random()}`,
      message,
      type,
      icon,
    });
  };

  const handleResetTestState = () => {
    const fresh = createTestPlayer();
    setPlayer(fresh);
    localStorage.removeItem(TEST_STORAGE_KEY);
    showToast('Reset test environment to default state.', 'info', '🔄');
  };

  return (
    <div className="h-screen max-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans select-none overflow-hidden">
      {/* Ambient Visual Layer */}
      <BackgroundLayer currentTab="HAVEN" />

      {/* Top Test Sandbox Ribbon Bar */}
      <header className="bg-gradient-to-r from-purple-950/90 via-zinc-900/90 to-purple-950/90 border-b border-purple-800/50 px-4 py-1.5 text-xs font-mono text-purple-200 flex justify-between items-center shadow-lg shrink-0 z-40 backdrop-blur-md">
        <div className="flex items-center space-x-2 truncate">
          <span className="animate-pulse text-base">🧪</span>
          <span className="font-bold uppercase tracking-wider text-purple-300 truncate">
            HAVEN REDESIGN TEST SANDBOX
          </span>
          <span className="text-zinc-600 hidden md:inline">|</span>
          <span className="text-zinc-400 text-[11px] hidden md:inline">
            Directly loaded at /HavenRedesignTestView.html (Main game unchanged)
          </span>
        </div>

        <button
          onClick={handleResetTestState}
          className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 px-2.5 py-1 rounded text-[10px] transition-all font-mono shrink-0 shadow"
        >
          🔄 Reset Test Data
        </button>
      </header>

      {/* Main Viewport Container: Responsive for Desktop & Mobile with generous bottom clearance above navbar */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-2 sm:p-3 flex flex-col overflow-hidden pb-20 sm:pb-24 md:pb-28 min-h-0">
        <div className="flex-1 w-full bg-zinc-950/95 border border-amber-900/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-md min-h-0 mb-2 sm:mb-3">
          <HavenRedesignTestView
            player={player}
            onUpdatePlayer={setPlayer}
            onNavigateToWorld={() => showToast('World expedition navigation simulated.', 'info', '🌌')}
            onNavigateToTitanRaid={() => showToast('Bakunawa Titan Raid arena simulated.', 'info', '🌑')}
            onShowToast={showToast}
          />
        </div>
      </main>

      {/* Global Bottom Navigation Bar (Auto-scales for mobile and desktop) */}
      <Navbar
        currentTab="HAVEN"
        onSelectTab={(tab: NavTab) => {
          if (tab !== 'HAVEN') {
            showToast(`[${tab}] navigation simulated in Haven test mode.`, 'info', '🔒');
          }
        }}
        player={player}
        inCombat={false}
        isRaidBattle={false}
        onShowToast={showToast}
      />

      {/* Global Toast Banner */}
      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};
export default HavenTestApp;
