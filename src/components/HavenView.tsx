import React, { useState, useEffect, useRef } from 'react';
import {
  PlayerCharacter,
  EquipmentItem,
  ConsumableItem,
  GameLocation,
  HeroClass,
} from '../types/game';
import {
  CONSUMABLES,
  MOUNTS,
  GAME_LOCATIONS,
  INITIAL_SIDE_QUESTS,
  INITIAL_BOUNTIES,
} from '../data/equipmentData';
import {
  calcDerivedStats,
  calcMaxStamina,
  calcHavenStaminaRegenRate,
  totalCowriesFromWallet,
  cowriesToWallet,
  calcItemPowerRating,
  sortInventory,
  calcRequiredActPower,
} from '../utils/gameFormulas';
import { getScaledForgeCatalog, getInitialStoreStock } from '../utils/equipmentGenerator';
import { soundFX } from '../utils/audio';
import { broadcastSystemAnnouncement } from '../utils/supabase';
import { NG_PLUS_REBIRTH_STORY, getActStory } from '../data/actStoryData';

import BountyNoticeBoardModal from './BountyNoticeBoardModal';
import ActStoryOverlayModal from './ActStoryOverlayModal';
import HearthRestCarousel, { RestOption } from './HearthRestCarousel';
import ForgePurchaseModal, { formatPreColonialCurrencyBadge } from './ForgePurchaseModal';
import MutyaAffixBlessingModal from './MutyaAffixBlessingModal';
import FeatureTutorialModal, { TutorialStep } from './FeatureTutorialModal';
import { ConfirmModal } from './ConfirmModal';

export type DistrictTab = 'TAVERN' | 'FORGE' | 'ALCHEMIST' | 'GATE' | 'STASH' | 'STABLES';

export interface HavenViewProps {
  player: PlayerCharacter;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onNavigateToWorld: () => void;
  onNavigateToTitanRaid?: () => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error', icon?: string) => void;
  activeDistrictOverride?: {
    district: DistrictTab;
    key: number;
  } | null;
  onDistrictChange?: (district: DistrictTab) => void;
}

const REST_OPTIONS: RestOption[] = [
  {
    actId: 'loc_act_1',
    actName: 'Act I',
    title: 'Hearthside Straw Mat',
    minLevel: 1,
    costInCC: 40,
    hpPercent: 0.30,
    mpPercent: 0.30,
    staminaRestore: 4,
    description: 'Rest on hand-woven banig mats by the balete hearth fire.',
    icon: '🌾',
  },
  {
    actId: 'loc_act_2',
    actName: 'Act II',
    title: "Siren's Salt Bath",
    minLevel: 7,
    costInCC: 120,
    hpPercent: 0.45,
    mpPercent: 0.45,
    staminaRestore: 7,
    description: 'Immerse in warm mineral tide-salts that wash away sea fatigue.',
    icon: '🌊',
  },
  {
    actId: 'loc_act_3',
    actName: 'Act III',
    title: 'Ancestral Herbal Steam',
    minLevel: 13,
    costInCC: 300,
    hpPercent: 0.60,
    mpPercent: 0.60,
    staminaRestore: 10,
    description: 'Inhale vapors of mountain eucalyptus and sacred balete resin.',
    icon: '🌿',
  },
  {
    actId: 'loc_act_4',
    actName: 'Act IV',
    title: 'Caldera Thermal Springs',
    minLevel: 19,
    costInCC: 650,
    hpPercent: 0.75,
    mpPercent: 0.75,
    staminaRestore: 13,
    description: 'Soak in sulfur volcanic waters that mend fractured bones.',
    icon: '🌋',
  },
  {
    actId: 'loc_act_5',
    actName: 'Act V',
    title: 'Blood Coast Anointing',
    minLevel: 26,
    costInCC: 1200,
    hpPercent: 0.85,
    mpPercent: 0.85,
    staminaRestore: 16,
    description: 'Babaylan anointing oils imbued with sacred coconut milk.',
    icon: '🥥',
  },
  {
    actId: 'loc_act_6',
    actName: 'Act VI',
    title: 'Abyssal Pearl Chamber',
    minLevel: 33,
    costInCC: 2500,
    hpPercent: 0.90,
    mpPercent: 0.90,
    staminaRestore: 18,
    description: 'Breathe in radiant luminescence of deep-trench mother-of-pearl.',
    icon: '🔮',
  },
  {
    actId: 'loc_act_7',
    actName: 'Act VII',
    title: 'Sky-Citadel Cloud Pavilion',
    minLevel: 40,
    costInCC: 5000,
    hpPercent: 0.95,
    mpPercent: 0.95,
    staminaRestore: 19,
    description: 'High meditation in Mount Arayat’s cloud-vaulted celestial pavilion.',
    icon: '☁️',
  },
  {
    actId: 'loc_act_8',
    actName: 'Act VIII',
    title: 'Bakunawa Eclipse Sanctuary',
    minLevel: 47,
    costInCC: 10000,
    hpPercent: 1.00,
    mpPercent: 1.00,
    staminaRestore: 20,
    description: 'The supreme ritual of the seven moons. Completely cleanses spirit & debuffs.',
    icon: '🌑',
  },
];

export const HavenView: React.FC<HavenViewProps> = ({
  player,
  onUpdatePlayer,
  onNavigateToWorld,
  onNavigateToTitanRaid,
  onShowToast,
  activeDistrictOverride,
  onDistrictChange,
}) => {
  const [district, setDistrict] = useState<DistrictTab>('TAVERN');

  // Hearth Carousel index with localStorage persistence
  const [currentHearthIndex, setCurrentHearthIndexState] = useState<number>(() => {
    const saved = localStorage.getItem('maharlika_last_rest_option_index');
    return saved ? Math.max(0, parseInt(saved, 10) || 0) : 0;
  });

  const setCurrentHearthIndex = (idx: number) => {
    setCurrentHearthIndexState(idx);
    localStorage.setItem('maharlika_last_rest_option_index', String(idx));
  };

  // Modals state
  const [showBountyModal, setShowBountyModal] = useState<boolean>(false);
  const [storyLocation, setStoryLocation] = useState<GameLocation | null>(null);
  const [inspectPurchaseItem, setInspectPurchaseItem] = useState<EquipmentItem | null>(null);
  const [inspectBlessingItem, setInspectBlessingItem] = useState<EquipmentItem | null>(null);
  const [showNgPlusConfirm, setShowNgPlusConfirm] = useState<boolean>(false);
  const [showRebirthStoryModal, setShowRebirthStoryModal] = useState<boolean>(false);
  const [activeTutorial, setActiveTutorial] = useState<{ id: string; name: string; steps: TutorialStep[] } | null>(null);

  // Sub-mode toggles (to eliminate vertical page scrolling on mobile)
  const [tavernSubMode, setTavernSubMode] = useState<'HEARTH' | 'NOTICE'>('HEARTH');
  const [forgeSubMode, setForgeSubMode] = useState<'ARMORY' | 'MUTYA'>('ARMORY');
  const [forgeCategory, setForgeCategory] = useState<'ALL' | 'WEAPONS' | 'ARMOR'>('ALL');
  const [forgeStock, setForgeStock] = useState<Record<string, number>>({});
  const [alchemistFilter, setAlchemistFilter] = useState<'ALL' | 'POTION' | 'ELIXIR' | 'PANACEA'>('ALL');
  const [stashMobileView, setStashMobileView] = useState<'BACKPACK' | 'VAULT'>('BACKPACK');
  const [stashSortMode, setStashSortMode] = useState<'POWER' | 'TYPE' | 'CLASS'>('POWER');

  // Stables state: list of tamed mount IDs
  const [tamedMountIds, setTamedMountIds] = useState<string[]>(() => {
    const list: string[] = [];
    if (player.equipment.mount?.id) list.push(player.equipment.mount.id);
    player.inventory.forEach((i) => {
      if (i.category === 'MOUNT' && !list.includes(i.id)) list.push(i.id);
    });
    return list;
  });

  const notify = (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', icon?: string) => {
    onShowToast?.(msg, type, icon);
  };

  // Synchronize district change upstream
  useEffect(() => {
    onDistrictChange?.(district);
  }, [district, onDistrictChange]);

  // Handle external district overrides (e.g. from Onboarding Tutorial)
  useEffect(() => {
    if (activeDistrictOverride?.district) {
      setDistrict(activeDistrictOverride.district);
    }
  }, [activeDistrictOverride?.key, activeDistrictOverride?.district]);

  const isNgPlus = (player.ngPlusLevel || 0) > 0;
  const bountyUnlockLevel = isNgPlus ? ((player.ngPlusStartLevel || 0) + 3) : 3;
  const isBountyBoardUnlocked = player.level >= bountyUnlockLevel;

  // Tutorial trigger checks
  useEffect(() => {
    if (district === 'TAVERN') {
      const unlockedRestCount = REST_OPTIONS.filter((o) => player.level >= o.minLevel).length;
      if (unlockedRestCount >= 2 && !(player.tutorialsSeen ?? []).includes('tut_rest_tiers')) {
        setActiveTutorial({
          id: 'tut_rest_tiers',
          name: 'Shaman Rest Deck',
          steps: [
            {
              title: 'New Shaman Resting Tier Unlocked!',
              icon: '🛌',
              description: 'As your hero levels up and conquers regional Acts, higher-tier Shaman resting quarters become unlocked at Haven Citadel Inn!',
              tip: 'Use the ◀ / ▶ controls or swipe the cards on the Resting Deck to flip between budget mats and premium shaman baths.',
            },
          ],
        });
      }
    }
  }, [district, player.level, player.tutorialsSeen]);

  const handleSelectDistrict = (tab: DistrictTab) => {
    setDistrict(tab);
    soundFX.playClick();
    if (tab === 'STABLES' && player.mountUnlocked && !(player.tutorialsSeen ?? []).includes('tut_stables')) {
      setActiveTutorial({
        id: 'tut_stables',
        name: 'Beastmaster Stables',
        steps: [
          {
            title: 'Mythical Beast Stables Unlocked',
            icon: '🐃',
            description: 'Defeating Tambanokano has granted you access to the Beastmaster Stables! Mythical mounts provide massive combat bonuses.',
            tip: 'Equipping a mount increases your Max HP, Armor, Speed, and Dodge rate.',
          },
        ],
      });
    }
  };

  const handleOpenBountyBoard = () => {
    if (!isBountyBoardUnlocked) {
      notify(`🔒 Poblacion Bounty Board Locked! Reach Character Level ${bountyUnlockLevel} to accept monster contracts.`, 'warning', '🔒');
      return;
    }
    soundFX.playClick();
    setShowBountyModal(true);
    if (!(player.tutorialsSeen ?? []).includes('tut_bounties')) {
      setActiveTutorial({
        id: 'tut_bounties',
        name: 'Poblacion Bounty Board',
        steps: [
          {
            title: 'Monster Bounties System',
            icon: '📜',
            description: 'Accept contracts from the Poblacion Sanctuary Notice Board to slay specific monsters for Cowries, EXP, and Mutya Shards.',
            tip: `You can hold up to 3 active bounties concurrently. Level ${bountyUnlockLevel} character required.`,
          },
        ],
      });
    }
  };

  const handleCompleteTutorial = (tutId: string) => {
    setActiveTutorial(null);
    const seen = Array.from(new Set([...(player.tutorialsSeen ?? []), tutId]));
    onUpdatePlayer({ ...player, tutorialsSeen: seen });
  };

  const derived = calcDerivedStats(player.attributes, player.level, player.equipment);
  const totalCowries = totalCowriesFromWallet(player.wallet);
  const maxStam = calcMaxStamina(player.level);
  const currentStam = player.stamina ?? maxStam;
  const isFullyRested = player.currentHp >= derived.maxHp && player.currentMp >= derived.maxMp && currentStam >= maxStam;

  // Keep a ref of player and onUpdatePlayer to allow passive stamina regeneration without stale closures
  const playerRef = useRef(player);
  playerRef.current = player;
  const onUpdatePlayerRef = useRef(onUpdatePlayer);
  onUpdatePlayerRef.current = onUpdatePlayer;

  // Passive Stamina Regeneration while in Haven (Sanctuary Citadel Safe Zone)
  // 1 ST / 5sec at Level 1, scaling up to at least 6 ST / 5sec at Level 50 (+ extra VIT scaling)
  useEffect(() => {
    const timer = setInterval(() => {
      const p = playerRef.current;
      const currentMaxStamina = calcMaxStamina(p.level);
      const curStam = p.stamina ?? currentMaxStamina;

      if (curStam < currentMaxStamina) {
        const regenRate = calcHavenStaminaRegenRate(p.level, p.attributes?.vit ?? 10);
        const nextStamina = Math.min(currentMaxStamina, curStam + regenRate);
        onUpdatePlayerRef.current({
          ...p,
          stamina: nextStamina,
        });
      }
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const currentActId = player.currentLocationId || 'loc_act_1';
  const actMatch = currentActId.match(/\d+/);
  const currentActNumber = actMatch ? parseInt(actMatch[0], 10) : 1;

  // Filter resting options to only show unlocked Hearths
  const unlockedRestOptions = REST_OPTIONS.filter((opt) => player.level >= opt.minLevel);
  const activeHearthIndex = Math.min(currentHearthIndex, Math.max(0, unlockedRestOptions.length - 1));

  // ─── TAVERN REST HANDLER ────────────────────────────────────────────────────
  const handleRest = (opt: RestOption) => {
    if (isFullyRested) {
      notify('✨ You are already fully rested! (HP, MP, and Stamina are at maximum).', 'info', '✨');
      return;
    }
    if (totalCowries < opt.costInCC) {
      const price = formatPreColonialCurrencyBadge(opt.costInCC);
      notify(`❌ Not enough funds! Requires ${price.formatted}.`, 'error', '💰');
      return;
    }
    const newWallet = cowriesToWallet(
      totalCowries - opt.costInCC,
      player.wallet.mutyaShards ?? player.wallet.prismaticShards ?? 0
    );

    const healedHp = Math.min(derived.maxHp, player.currentHp + Math.floor(derived.maxHp * opt.hpPercent));
    const healedMp = Math.min(derived.maxMp, player.currentMp + Math.floor(derived.maxMp * opt.mpPercent));
    const newStamina = Math.min(maxStam, currentStam + opt.staminaRestore);

    onUpdatePlayer({
      ...player,
      currentHp: healedHp,
      currentMp: healedMp,
      stamina: newStamina,
      wallet: { ...player.wallet, ...newWallet },
      activeEffects: opt.actId === 'loc_act_8' ? [] : player.activeEffects,
    });

    soundFX.playSpellCast();
    notify(`🌿 Rested at ${opt.title}! HP & MP restored, +${opt.staminaRestore} Stamina.`, 'success', '✨');
  };

  // ─── FORGE LOGIC ─────────────────────────────────────────────────────────────
  const forgeCatalog = getScaledForgeCatalog(
    player.level,
    player.heroClass as HeroClass,
    forgeCategory,
    false,
    player.currentLocationId || 'loc_act_1',
    player.ngPlusLevel || 0
  );

  // ─── ALCHEMIST BREWING LOGIC ────────────────────────────────────────────────
  const availablePotions = CONSUMABLES.filter((potion) => {
    const actReq = potion.actReq ?? 1;
    if (actReq > currentActNumber) return false;
    if (alchemistFilter === 'POTION') return potion.category === 'POTION' || potion.category === 'VITALITY';
    if (alchemistFilter === 'ELIXIR') return potion.category === 'ELIXIR' || potion.category === 'TINCTURE';
    if (alchemistFilter === 'PANACEA') return potion.category === 'PANACEA';
    return true;
  });

  const handleBrewPotion = (potion: ConsumableItem) => {
    if (player.inventory.length >= derived.inventoryCapacity) {
      notify('🎒 Inventory Full! Stash items before brewing.', 'warning', '🎒');
      return;
    }
    if (totalCowries < potion.costInCC) {
      const price = formatPreColonialCurrencyBadge(potion.costInCC);
      notify(`❌ Not enough funds to brew (${price.formatted} needed).`, 'error', '💰');
      return;
    }

    const newWallet = cowriesToWallet(
      totalCowries - potion.costInCC,
      player.wallet.mutyaShards ?? player.wallet.prismaticShards ?? 0
    );

    const craftedItem: ConsumableItem = {
      ...potion,
      id: `${potion.id}_${Date.now()}`,
    };

    onUpdatePlayer({
      ...player,
      wallet: { ...player.wallet, ...newWallet },
      inventory: [...player.inventory, craftedItem],
    });

    soundFX.playPotionUse();
    notify(`🧪 Brewed ${potion.name}! Added to Inventory.`, 'success', '🌿');
  };

  // ─── STASH LOGIC ─────────────────────────────────────────────────────────────
  const sortedInventory = sortInventory(
    player.inventory.filter((i) => 'tier' in i) as EquipmentItem[],
    stashSortMode
  );
  const sortedStash = sortInventory(
    (player.stash || []).filter((i) => 'tier' in i) as EquipmentItem[],
    stashSortMode
  );

  const handleDepositToVault = (item: EquipmentItem) => {
    const updatedInventory = player.inventory.filter((i) => i.id !== item.id);
    const updatedStash = [...(player.stash || []), item];

    onUpdatePlayer({
      ...player,
      inventory: updatedInventory,
      stash: updatedStash,
    });
    soundFX.playClick();
    notify(`🏛️ Stored [${item.name}] into Royal Vault.`, 'info', '📦');
  };

  const handleWithdrawFromVault = (item: EquipmentItem) => {
    if (player.inventory.length >= derived.inventoryCapacity) {
      notify('🎒 Backpack is at maximum capacity!', 'warning', '🎒');
      return;
    }
    const updatedStash = (player.stash || []).filter((i) => i.id !== item.id);
    const updatedInventory = [...player.inventory, item];

    onUpdatePlayer({
      ...player,
      stash: updatedStash,
      inventory: updatedInventory,
    });
    soundFX.playClick();
    notify(`🎒 Retrieved [${item.name}] from Royal Vault.`, 'info', '📥');
  };

  // ─── STABLES LOGIC ──────────────────────────────────────────────────────────
  const getMountCosts = (mount: EquipmentItem) => {
    const costInCC = mount.costInCC || 10000;
    const mutyaCost =
      mount.id === 'mount_5' ? 10 :
      mount.id === 'mount_4' ? 5 :
      mount.id === 'mount_3' ? 2 : 0;
    return { costInCC, mutyaCost };
  };

  const handleBondMount = (mount: EquipmentItem) => {
    if (player.level < (mount.levelReq || 39)) {
      notify(`🔒 Character Level ${mount.levelReq} required to bond with ${mount.name}!`, 'warning', '🔒');
      return;
    }
    if (tamedMountIds.includes(mount.id)) {
      notify(`Already bonded with ${mount.name}!`, 'info', '🐃');
      return;
    }

    const { costInCC, mutyaCost } = getMountCosts(mount);
    if (totalCowries < costInCC) {
      notify(`Insufficient tribute! Requires ${formatPreColonialCurrencyBadge(costInCC).formatted}.`, 'error', '🪙');
      return;
    }

    const currentMutya = player.wallet.mutyaShards ?? 0;
    if (currentMutya < mutyaCost) {
      notify(`Insufficient Mutya Pearls! Requires ${mutyaCost} 🔮 Mutya Pearls.`, 'error', '🔮');
      return;
    }

    const updatedWallet = cowriesToWallet(totalCowries - costInCC);
    const finalWallet = {
      ...player.wallet,
      ...updatedWallet,
      mutyaShards: currentMutya - mutyaCost,
      prismaticShards: currentMutya - mutyaCost,
    };

    setTamedMountIds([...tamedMountIds, mount.id]);
    onUpdatePlayer({
      ...player,
      wallet: finalWallet,
      equipment: {
        ...player.equipment,
        mount: mount,
      },
      mountUnlocked: true,
    });

    soundFX.playLevelUpSound();
    notify(`🎉 Sacred Bond forged with ${mount.name}! Equipped as active mount.`, 'success', '🐃');
  };

  const handleEquipMount = (mount: EquipmentItem) => {
    onUpdatePlayer({
      ...player,
      equipment: {
        ...player.equipment,
        mount: mount,
      },
      mountUnlocked: true,
    });
    soundFX.playClick();
    notify(`🏇 Equipped ${mount.name} as active mount!`, 'success', '🏇');
  };

  const handleUnequipMount = () => {
    onUpdatePlayer({
      ...player,
      equipment: {
        ...player.equipment,
        mount: null,
      },
    });
    notify('Mount returned to the stable stalls.', 'info', '🐃');
  };

  // ─── ANITO CYCLE REBIRTH (NG+) HANDLER ──────────────────────────────────────
  const handleConfirmRebirth = () => {
    soundFX.playLevelUpSound();
    const nextNgLevel = (player.ngPlusLevel || 0) + 1;

    const isNotMount = (item: EquipmentItem | ConsumableItem) =>
      !('category' in item && (item.category === 'MOUNT' || item.category === 'BIKE')) &&
      !item.id.startsWith('mount_');

    const cleanInventory = (player.inventory || []).filter(isNotMount);
    const cleanStash = (player.stash || []).filter(isNotMount);
    const updatedStash = [...cleanStash, ...cleanInventory];

    onUpdatePlayer({
      ...player,
      ngPlusLevel: nextNgLevel,
      ngPlusStartLevel: player.level,
      currentLocationId: 'loc_act_1',
      unlockedLocationIds: ['loc_act_1'],
      unlockedActStoryIds: [],
      inventory: [],
      stash: updatedStash,
      sideQuests: INITIAL_SIDE_QUESTS,
      forfeitedQuestIds: [],
      completedBossIds: [],
      discoveredBossIds: [],
      bounties: INITIAL_BOUNTIES,
      act6Completed: false,
      act8Completed: false,
      mountUnlocked: false,
      equipment: {
        ...player.equipment,
        mount: null,
        bike: null,
      },
      wallet: cowriesToWallet(100, 0),
    });

    setDistrict('TAVERN');
    setShowNgPlusConfirm(false);
    setShowRebirthStoryModal(true);
    const playerTitle = `${player.name} [Lv. ${player.level} ${player.heroClass || 'Wayfarer'}]`;
    broadcastSystemAnnouncement(`${playerTitle} initiated Anito Cycle Rebirth (New Game+ ${nextNgLevel})!`);
    notify(`🌟 ANITO CYCLE REBIRTH COMPLETE! Advanced to New Game+ ${nextNgLevel}! All Acts reset with scaled monster power. Your stats and gear remain!`, 'success', '🌟');
  };

  const availableContractsCount = (player.bounties || []).filter(
    (b) => b.actId === currentActId && !b.isCompleted && !b.isAccepted
  ).length;

  const isStablesUnlocked = Boolean(player.act6Completed || player.mountUnlocked);

  // Auto-reset district if player is in Stables when it becomes locked
  useEffect(() => {
    if (!isStablesUnlocked && district === 'STABLES') {
      setDistrict('TAVERN');
    }
  }, [isStablesUnlocked, district]);

  // Touch gesture swipe state for screen-wide district switching
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Minimum swipe threshold 45px and predominantly horizontal
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      const activeTabsList = districtTabs.map((t) => t.id);
      const currentIndex = activeTabsList.indexOf(district);
      if (deltaX < 0 && currentIndex < activeTabsList.length - 1) {
        // Swipe Left: Next district
        handleSelectDistrict(activeTabsList[currentIndex + 1]);
      } else if (deltaX > 0 && currentIndex > 0) {
        // Swipe Right: Prev district
        handleSelectDistrict(activeTabsList[currentIndex - 1]);
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  interface DistrictTabInfo {
    id: DistrictTab;
    baybayin: string;
    subtitle: string;
    icon: string;
    tutTarget?: string;
  }

  const districtTabs: DistrictTabInfo[] = [
    {
      id: 'TAVERN',
      baybayin: 'ᜐᜒᜎᜓᜅᜈ᜔',
      subtitle: 'Hearth',
      icon: '🔥',
    },
    {
      id: 'FORGE',
      baybayin: 'ᜉᜈ᜔ᜇᜌᜈ᜔',
      subtitle: 'Forge',
      icon: '⚒️',
      tutTarget: 'district-forge',
    },
    {
      id: 'ALCHEMIST',
      baybayin: 'ᜄᜋᜓᜆᜈ᜔',
      subtitle: 'Potions',
      icon: '🌿',
      tutTarget: 'district-alchemist',
    },
    {
      id: 'GATE',
      baybayin: 'ᜎᜄᜓᜐᜈ᜔',
      subtitle: 'Gate',
      icon: '🌀',
    },
    {
      id: 'STASH',
      baybayin: 'ᜃᜊᜈ᜔',
      subtitle: 'Vault',
      icon: '🏛️',
    },
    ...(isStablesUnlocked
      ? [
          {
            id: 'STABLES' as const,
            baybayin: 'ᜃᜓᜏᜇ᜔ᜇ',
            subtitle: 'Stables',
            icon: '🐃',
          },
        ]
      : []),
  ];

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="w-full flex-1 flex flex-col h-full overflow-hidden bg-[#07090e]/80 backdrop-blur-md text-zinc-100 select-none font-sans relative"
    >
      {/* ─── SANCTUARY HEADER ───── */}
      <header
        data-tutorial-target="town-banner"
        className="bg-gradient-to-r from-[#090c12]/85 via-[#111622]/85 to-[#090c12]/85 backdrop-blur-md border-b border-amber-500/25 px-3 py-1.5 shrink-0 flex items-center justify-between shadow-2xl relative z-20"
      >
        <div className="flex items-center space-x-2.5 truncate">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-500/20 via-zinc-900 to-black border border-amber-500/40 flex items-center justify-center text-sm shadow-inner shrink-0 text-amber-300">
            🏛️
          </div>
          <div className="truncate">
            <div className="flex items-center space-x-2">
              <span className="text-[8.5px] font-mono tracking-widest text-amber-400 font-bold uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                ᜉᜓᜊ᜔ᜎᜐ᜔ᜌᜓᜈ᜔ • SAFE SANCTUARY
              </span>
              <span className="text-[9.5px] font-mono text-zinc-400 font-semibold hidden xs:inline">
                • {player.heroClass}
              </span>
            </div>
            <h2 className="text-xs sm:text-sm font-bold font-serif text-amber-100 tracking-wide truncate flex items-center gap-1.5">
              <span>Poblacion Citadel Safe Zone</span>
              <span className="text-[8.5px] font-mono font-normal text-amber-400/70 border border-amber-500/20 px-1 rounded bg-black/30 hidden sm:inline">
                +Passive Stamina Regen
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={() => {
              const seen = (player.tutorialsSeen ?? []).filter((t) => t !== 'tut_onboarding');
              onUpdatePlayer({ ...player, tutorialsSeen: seen });
              notify('Onboarding tutorial reset! Follow the guided tour.', 'info', '🧭');
            }}
            className="bg-zinc-900/90 hover:bg-zinc-800 text-amber-300/90 hover:text-amber-200 px-2 py-1 rounded-xl border border-amber-500/30 text-[10px] font-mono font-bold transition-all min-h-[30px] flex items-center space-x-1 shadow-sm active:scale-95 cursor-pointer"
            title="Replay Interactive Onboarding Tutorial"
          >
            <span>🧭</span>
            <span className="hidden sm:inline">Tour</span>
          </button>

          <div className="bg-emerald-950/80 border border-emerald-600/50 px-2 py-1 rounded-xl text-[9px] font-mono text-emerald-300 font-bold min-h-[30px] flex items-center shadow-sm">
            🛡️ Safe
          </div>
        </div>
      </header>

      {/* ─── SINGLE-ROW BAYBAYIN DISTRICT NAVIGATION TABS (NO HORIZONTAL SWIPING) ─── */}
      <nav
        aria-label="Haven Districts"
        className={`bg-[#090c12]/80 backdrop-blur-md border-b border-zinc-800/90 px-1 py-1 shrink-0 grid ${
          isStablesUnlocked ? 'grid-cols-6' : 'grid-cols-5'
        } gap-1 w-full font-mono z-20 shadow-md`}
      >
        {districtTabs.map((tab) => {
          const isActive = district === tab.id;
          return (
            <button
              key={tab.id}
              data-tutorial-target={tab.tutTarget}
              onClick={() => handleSelectDistrict(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all min-h-[44px] cursor-pointer active:scale-[0.96] ${
                isActive
                  ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-zinc-950 shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-300 font-bold'
                  : 'bg-zinc-900/80 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800/80'
              }`}
            >
              <div className="flex items-center gap-1 leading-none truncate max-w-full">
                <span className="text-xs sm:text-sm shrink-0">{tab.icon}</span>
                <span className={`text-[10.5px] sm:text-xs font-bold tracking-tight truncate ${isActive ? 'text-zinc-950' : 'text-amber-200'}`}>
                  {tab.baybayin}
                </span>
              </div>
              <span className={`text-[7.5px] sm:text-[8.5px] uppercase tracking-tighter truncate leading-tight mt-0.5 ${isActive ? 'text-zinc-900/90 font-bold' : 'text-zinc-400'}`}>
                {tab.subtitle}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ─── DISTRICT CANVAS (STRICTLY CONTAINED TO SCREEN HEIGHT) ─── */}
      <div className="flex-1 overflow-hidden flex flex-col p-2 sm:p-2.5 pb-20 md:pb-4 min-h-0">
        {/* ===================================================================== */}
        {/* DISTRICT 1: TAVERN (BALAY SILUNGAN)                                   */}
        {/* ===================================================================== */}
        {district === 'TAVERN' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* If Bounty board unlocked, show compact sub-tab switch on mobile */}
            {isBountyBoardUnlocked && (
              <div className="flex lg:hidden justify-center mb-1.5 shrink-0">
                <div className="flex bg-zinc-950/80 p-0.5 rounded-xl border border-zinc-800 text-[10px] font-mono font-bold">
                  <button
                    onClick={() => {
                      setTavernSubMode('HEARTH');
                      soundFX.playClick();
                    }}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      tavernSubMode === 'HEARTH'
                        ? 'bg-amber-600 text-zinc-950 shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    🔥 Ancestral Hearth
                  </button>
                  <button
                    onClick={() => {
                      setTavernSubMode('NOTICE');
                      soundFX.playClick();
                    }}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      tavernSubMode === 'NOTICE'
                        ? 'bg-purple-700 text-white shadow'
                        : 'text-zinc-400 hover:text-purple-300'
                    }`}
                  >
                    📜 Notice Board ({availableContractsCount})
                  </button>
                </div>
              </div>
            )}

            {/* Tavern Content Canvas (Zero-scroll, side-by-side on lg: viewports) */}
            <div className="flex-1 flex flex-col lg:flex-row items-center justify-center overflow-hidden gap-2.5 sm:gap-3 min-h-0">
              {/* Shaman's Resting Deck */}
              <div
                data-tutorial-target="inn-card"
                className={`flex-1 w-full flex-col items-center justify-center overflow-hidden min-h-0 ${
                  !isBountyBoardUnlocked || tavernSubMode === 'HEARTH' ? 'flex' : 'hidden lg:flex'
                }`}
              >
                <div className="text-center mb-0.5 shrink-0">
                  <div className="flex items-center justify-center space-x-1.5">
                    <span className="text-amber-400">🔥</span>
                    <h3 className="font-serif font-bold text-amber-200 text-xs sm:text-sm tracking-wide">
                      Ancestral Hearth Rest Deck
                    </h3>
                  </div>
                  <p className="text-[9px] font-mono text-zinc-400">
                    Rest by the sacred fire to replenish HP, MP, and travel stamina.
                  </p>
                </div>

                <HearthRestCarousel
                  options={unlockedRestOptions}
                  currentIndex={activeHearthIndex}
                  onChangeIndex={setCurrentHearthIndex}
                  onRest={handleRest}
                  playerLevel={player.level}
                  playerCowries={totalCowries}
                  isFullyRested={isFullyRested}
                />
              </div>

              {/* Bounty Notice Board Terminal (Strictly Hidden Until Unlocked at Lv. 3+) */}
              {isBountyBoardUnlocked && (
                <div
                  data-tutorial-target="tavern-card"
                  className={`w-full lg:w-80 bg-gradient-to-b from-[#12101e]/90 via-[#0d0a17]/95 to-[#08070e]/95 backdrop-blur-md border border-purple-700/50 rounded-2xl p-3 sm:p-4 flex-col justify-between shrink-0 shadow-2xl gap-2 sm:gap-3 ${
                    tavernSubMode === 'NOTICE' ? 'flex' : 'hidden lg:flex'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-lg shadow-inner">
                          📜
                        </div>
                        <div>
                          <div className="text-[8px] font-mono uppercase text-purple-400 font-bold tracking-widest">
                            CHIEFTAIN'S CONTRACTS
                          </div>
                          <h4 className="font-serif font-bold text-purple-100 text-xs sm:text-sm tracking-wide">
                            Poblacion Notice Board
                          </h4>
                          <div className="text-[9px] font-mono text-zinc-400">
                            Act {currentActNumber} Wanted Beasts
                          </div>
                        </div>
                      </div>

                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700/60 shadow-inner">
                        {availableContractsCount} Available
                      </span>
                    </div>

                    <p className="text-[9.5px] font-mono text-zinc-300/90 leading-relaxed bg-black/40 p-2 rounded-xl border border-purple-950">
                      Track down terrorizing beasts across regional territories for Cowries, EXP, and sacred Mutya Shards.
                    </p>
                  </div>

                  <button
                    onClick={handleOpenBountyBoard}
                    className="w-full py-2.5 font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all text-center min-h-[44px] flex items-center justify-center space-x-2 cursor-pointer bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-600 hover:from-purple-600 hover:to-indigo-500 text-white shadow-lg shadow-purple-950/80 active:scale-[0.98]"
                  >
                    <span>Inspect Wanted Contracts</span>
                    <span>➔</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* DISTRICT 2: FORGE (PANDAYAN NI PANDAY PIRA)                           */}
        {/* ===================================================================== */}
        {district === 'FORGE' && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-1.5 min-h-0">
            {/* Forge Header & Mode Navigation Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 border-b border-zinc-800/80 pb-1 shrink-0">
              <div className="flex items-center space-x-1.5 w-full sm:w-auto justify-between sm:justify-start">
                {/* Sub-Mode Switcher: Armory vs Mutya Altar */}
                <div className="flex bg-zinc-950/80 p-0.5 rounded-xl border border-zinc-800 text-[10px] font-mono font-bold">
                  <button
                    onClick={() => {
                      setForgeSubMode('ARMORY');
                      soundFX.playClick();
                    }}
                    className={`px-3 py-1 rounded-lg transition-all min-h-[30px] flex items-center gap-1 cursor-pointer ${
                      forgeSubMode === 'ARMORY'
                        ? 'bg-amber-600 text-zinc-950 shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>⚒️ Armory Store</span>
                    <span className="text-[8.5px] opacity-80">({forgeCatalog.length})</span>
                  </button>
                  <button
                    onClick={() => {
                      setForgeSubMode('MUTYA');
                      soundFX.playClick();
                    }}
                    className={`px-3 py-1 rounded-lg transition-all min-h-[30px] flex items-center gap-1 cursor-pointer ${
                      forgeSubMode === 'MUTYA'
                        ? 'bg-purple-700 text-white shadow'
                        : 'text-zinc-400 hover:text-purple-300'
                    }`}
                  >
                    <span>🔮 Mutya Altar</span>
                    <span className="text-[8.5px] opacity-80">({player.inventory.filter((i) => 'tier' in i).length})</span>
                  </button>
                </div>

                <span className="text-[9.5px] font-mono text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded-xl border border-purple-800/50 font-bold shrink-0">
                  🔮 {player.wallet.mutyaShards ?? 0} Mutya
                </span>
              </div>

              {/* Category Filter Chips for Armory */}
              {forgeSubMode === 'ARMORY' && (
                <div className="flex space-x-1 self-end sm:self-auto">
                  {(['ALL', 'WEAPONS', 'ARMOR'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setForgeCategory(cat);
                        soundFX.playClick();
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold transition-all min-h-[26px] cursor-pointer ${
                        forgeCategory === cat
                          ? 'bg-amber-500 text-zinc-950 shadow'
                          : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Main Forge Canvas: Tabbed on mobile, Side-by-side on lg: */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden gap-2 min-h-0">
              {/* SECTION A: ARMORY STORE */}
              <div
                className={`flex-1 flex-col overflow-hidden bg-[#0c0e14]/90 backdrop-blur-md border border-amber-900/40 rounded-2xl p-2 sm:p-2.5 shadow-xl min-h-0 ${
                  forgeSubMode === 'ARMORY' ? 'flex' : 'hidden lg:flex lg:w-2/3'
                }`}
              >
                <div className="flex justify-between items-center mb-1 shrink-0 text-xs font-mono">
                  <div className="flex items-center space-x-1">
                    <span className="text-amber-400">⚒️</span>
                    <span className="font-bold text-amber-200 uppercase tracking-wide text-[10.5px] font-serif">
                      Panday Pira's Scaled Armory
                    </span>
                  </div>
                  <span className="text-zinc-400 text-[9.5px]">{forgeCatalog.length} In Catalog</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
                  {forgeCatalog.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-500 font-mono text-xs">
                      <span>✨ All available items in this category purchased!</span>
                    </div>
                  ) : (
                    forgeCatalog.map((item) => {
                      const power = calcItemPowerRating(item);
                      const itemStock = forgeStock[item.id] !== undefined ? forgeStock[item.id] : getInitialStoreStock(item);
                      const isSoldOut = itemStock <= 0;
                      const priceBadge = formatPreColonialCurrencyBadge(item.costInCC);

                      const icon =
                        item.category === 'SWORD' ? '⚔️' :
                        item.category === 'DAGGER' ? '🗡️' :
                        item.category === 'BOW' ? '🏹' :
                        item.category === 'STAFF' ? '🔮' :
                        item.category === 'UPPER' ? '🥋' :
                        item.category === 'LOWER' ? '👖' : '🛡️';

                      const statSummary = item.baseDefense !== undefined
                        ? `+${item.baseDefense} Armor`
                        : item.baseDamageMin !== undefined
                        ? `${item.baseDamageMin}–${item.baseDamageMax} Dmg`
                        : item.archetype;

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            soundFX.playClick();
                            setInspectPurchaseItem(item);
                          }}
                          className={`px-2.5 py-1.5 border rounded-xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group shadow min-h-[44px] shrink-0 backdrop-blur-sm ${
                            isSoldOut
                              ? 'bg-zinc-950/40 border-zinc-900 opacity-55'
                              : 'bg-zinc-900/70 hover:bg-zinc-850 border-zinc-800 hover:border-amber-500/70'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <span className="text-base w-7 h-7 rounded-lg bg-black/40 border border-zinc-800 flex items-center justify-center shrink-0">
                              {icon}
                            </span>
                            <div className="truncate">
                              <h4 className={`font-serif font-bold text-xs truncate leading-tight ${isSoldOut ? 'text-zinc-500 line-through' : 'text-zinc-100 group-hover:text-amber-200'}`}>
                                {item.name}
                              </h4>
                              <div className="text-[8.5px] font-mono text-zinc-400 truncate leading-none mt-0.5">
                                Tier {item.tier} • {statSummary} • <span className="text-amber-300 font-semibold">{priceBadge.formatted}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-lg border ${
                              isSoldOut
                                ? 'bg-zinc-900 text-zinc-600 border-zinc-800'
                                : 'bg-amber-950/90 text-amber-300 border-amber-800/40'
                            }`}>
                              {isSoldOut ? 'Sold Out' : `${itemStock} left`}
                            </span>
                            <span className="text-[9px] font-mono font-bold bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded-lg border border-purple-800/40">
                              ⚡ {power}
                            </span>
                            <span className="text-zinc-500 group-hover:text-amber-300 text-sm font-bold">›</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* SECTION B: MUTYA AFFIX BLESSING ALTAR */}
              <div
                className={`flex-1 flex-col overflow-hidden bg-[#100d1a]/90 backdrop-blur-md border border-purple-800/50 rounded-2xl p-2 sm:p-2.5 shadow-xl min-h-0 ${
                  forgeSubMode === 'MUTYA' ? 'flex' : 'hidden lg:flex lg:w-1/3'
                }`}
              >
                <div className="flex justify-between items-center mb-1 shrink-0 text-xs font-mono">
                  <div className="flex items-center space-x-1">
                    <span className="text-purple-400">🔮</span>
                    <span className="font-bold text-purple-200 uppercase tracking-wide text-[10.5px] font-serif">
                      Mutya Blessing Altar
                    </span>
                  </div>
                  <span className="text-amber-400/90 text-[8.5px] font-mono font-bold">Escalating Risk</span>
                </div>

                <div className="bg-purple-950/40 border border-purple-900/50 p-1.5 rounded-xl mb-1.5 shrink-0">
                  <p className="text-[9px] font-mono text-purple-200/90 leading-relaxed">
                    Imbue backpack equipment with ancestral mutya affixes. Consecutive blessings carry escalating fracture risk!
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
                  {player.inventory.filter((i): i is EquipmentItem => 'tier' in i).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-500 font-mono text-xs">
                      <span>No equipment in backpack to bless.</span>
                    </div>
                  ) : (
                    player.inventory
                      .filter((i): i is EquipmentItem => 'tier' in i)
                      .map((item) => {
                        const power = calcItemPowerRating(item);
                        const icon =
                          item.category === 'SWORD' ? '⚔️' :
                          item.category === 'DAGGER' ? '🗡️' :
                          item.category === 'BOW' ? '🏹' :
                          item.category === 'STAFF' ? '🔮' :
                          item.category === 'UPPER' ? '🥋' :
                          item.category === 'LOWER' ? '👖' : '🛡️';

                        const statSummary = item.baseDefense !== undefined
                          ? `+${item.baseDefense} Armor`
                          : item.baseDamageMin !== undefined
                          ? `${item.baseDamageMin}–${item.baseDamageMax} Dmg`
                          : item.archetype;

                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              soundFX.playClick();
                              setInspectBlessingItem(item);
                            }}
                            className="px-2.5 py-1.5 bg-zinc-900/70 hover:bg-purple-950/60 border border-zinc-800 hover:border-purple-500/70 rounded-xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group shadow min-h-[44px] shrink-0 backdrop-blur-sm"
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <span className="text-base w-7 h-7 rounded-lg bg-black/40 border border-zinc-800 flex items-center justify-center shrink-0">
                                {icon}
                              </span>
                              <div className="truncate">
                                <h4 className="font-serif font-bold text-xs text-white group-hover:text-purple-200 truncate leading-tight">
                                  {item.name}
                                </h4>
                                <div className="text-[8.5px] font-mono text-zinc-400 truncate leading-none mt-0.5">
                                  Tier {item.tier} • {statSummary}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0">
                              <span className="text-[9px] font-mono font-bold bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded-lg border border-purple-800/40">
                                ⚡ {power}
                              </span>
                              <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-lg bg-amber-950/90 text-amber-300 border border-amber-800/40">
                                {item.blessingAttempts || 0}/5
                              </span>
                              <span className="text-zinc-500 group-hover:text-purple-300 text-sm font-bold">›</span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* DISTRICT 3: ALCHEMIST (GAMUTAN NG BABAYLAN)                           */}
        {/* ===================================================================== */}
        {district === 'ALCHEMIST' && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-1.5 min-h-0">
            {/* Header & Filter Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 border-b border-zinc-800/80 pb-1 shrink-0">
              <div>
                <h3 className="font-serif font-bold text-emerald-200 text-xs sm:text-sm flex items-center gap-1">
                  <span>🌿</span>
                  <span>Shamanic Botanical Apothecary</span>
                </h3>
                <p className="text-[9px] text-zinc-400 font-mono">Act {currentActNumber} Regional Remedies</p>
              </div>

              <div className="flex space-x-1 self-end sm:self-auto">
                {(['ALL', 'POTION', 'ELIXIR', 'PANACEA'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setAlchemistFilter(cat);
                      soundFX.playClick();
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold transition-all min-h-[26px] cursor-pointer ${
                      alchemistFilter === cat
                        ? 'bg-emerald-600 text-zinc-950 shadow'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Potion Brewing Grid */}
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 content-start min-h-0">
              {availablePotions.map((potion) => {
                const price = formatPreColonialCurrencyBadge(potion.costInCC);
                const canAfford = totalCowries >= potion.costInCC;

                return (
                  <div
                    key={potion.id}
                    className="bg-gradient-to-b from-[#0a120f]/90 via-[#060e0a]/95 to-[#040805]/95 backdrop-blur-md border border-emerald-800/50 hover:border-emerald-500/70 p-2.5 rounded-2xl flex flex-col justify-between shadow-xl transition-all group min-h-[115px]"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 truncate">
                          <span className="text-lg w-7 h-7 rounded-xl bg-emerald-950/90 border border-emerald-600/40 flex items-center justify-center shrink-0 shadow-inner">
                            {potion.icon || '🌿'}
                          </span>
                          <h4 className="text-xs font-serif font-bold text-emerald-100 truncate group-hover:text-emerald-300">
                            {potion.name}
                          </h4>
                        </div>
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50 font-bold shrink-0">
                          {potion.category}
                        </span>
                      </div>
                      <p className="text-[9px] font-mono text-zinc-300 leading-relaxed line-clamp-2">
                        {potion.effectDescription}
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-1.5 mt-1 border-t border-emerald-950/80">
                      <span className="text-[9.5px] font-mono font-bold text-amber-300">{price.formatted}</span>
                      <button
                        onClick={() => handleBrewPotion(potion)}
                        disabled={!canAfford}
                        className={`px-3 py-1 font-mono font-bold text-[9.5px] rounded-xl uppercase tracking-wider transition-all shadow min-h-[32px] flex items-center gap-1 cursor-pointer ${
                          !canAfford
                            ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                            : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-zinc-950 active:scale-95'
                        }`}
                      >
                        <span>Brew</span>
                        <span>➔</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* DISTRICT 4: GATE (BANTAYAN NG MGA LAGUSAN)                            */}
        {/* ===================================================================== */}
        {district === 'GATE' && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-2 min-h-0">
            {/* Gate Header Bar */}
            <div className="border-b border-zinc-800/80 pb-1 shrink-0 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span className="text-lg">🌀</span>
                <div>
                  <h3 className="font-serif font-bold text-cyan-200 text-xs sm:text-sm tracking-wide">
                    Poblacion Sanctuary Waystones
                  </h3>
                  <p className="text-[8.5px] sm:text-[9px] font-mono text-zinc-400">
                    Spirit arches connecting regional territories
                  </p>
                </div>
              </div>

              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-800/50 font-bold">
                📍 Act {currentActNumber} Active
              </span>
            </div>

            {/* Scrollable Waystones Area (Zero outer scroll trapping) */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 pb-2 min-h-0">
              {/* ── ANITO CYCLE REBIRTH SHRINE CARD (NG+) ── */}
              {((player.completedBossIds || []).includes('boss_act_8')) && (
                <div className="bg-gradient-to-r from-[#171206]/95 via-[#231b08]/90 to-[#171206]/95 backdrop-blur-md border-2 border-amber-400/90 p-3 rounded-2xl space-y-1.5 shadow-2xl flex flex-col sm:flex-row justify-between items-center gap-2.5">
                  <div className="space-y-0.5 text-center sm:text-left">
                    <div className="flex items-center space-x-1.5 justify-center sm:justify-start">
                      <span className="text-lg">🌟</span>
                      <span className="text-[10.5px] font-mono font-bold uppercase text-amber-300 tracking-wider">
                        ANITO CYCLE REBIRTH SHRINE (NG+)
                      </span>
                      <span className="bg-amber-950 text-amber-300 border border-amber-500/40 text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded">
                        Tier {player.ngPlusLevel || 0}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold font-serif text-amber-100">
                      Initiate Anito Rebirth Cycle (NG+ {(player.ngPlusLevel || 0) + 1})
                    </h4>
                    <p className="text-[9.5px] font-mono text-zinc-300 max-w-xl leading-relaxed">
                      Transcend into the next rebirth cycle. Monster HP and Damage scale up; character stats, gear, and vault remain intact!
                    </p>
                  </div>

                  <button
                    onClick={() => setShowNgPlusConfirm(true)}
                    className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-3 py-2 rounded-xl uppercase font-mono text-[10px] shadow-xl transition-all active:scale-95 shrink-0 cursor-pointer min-h-[38px]"
                  >
                    ⚡ Start NG+ {(player.ngPlusLevel || 0) + 1}
                  </button>
                </div>
              )}

              {/* ── BAKUNAWA CELESTIAL RAID CARD ── */}
              <div
                className={`p-3 rounded-2xl border transition-all relative overflow-hidden shadow-2xl backdrop-blur-md ${
                  player.level >= 40
                    ? 'bg-gradient-to-r from-purple-950/80 via-indigo-950/70 to-purple-950/80 border-purple-500/70 shadow-purple-950/50'
                    : 'bg-zinc-950/70 border-purple-900/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 relative z-10">
                  <div className="space-y-0.5 max-w-xl">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🌑</span>
                      <span className="text-[9px] font-mono uppercase font-bold tracking-wider text-purple-300">
                        {player.level >= 40 ? 'Celestial Titan Raid' : '??? Cosmic Phenomenon'}
                      </span>
                      <span
                        className={`text-[8.5px] font-mono px-1.5 py-0.2 rounded-full font-bold border ${
                          player.level >= 40
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                            : 'bg-purple-950 text-purple-300 border-purple-800/40'
                        }`}
                      >
                        {player.level >= 40 ? '⚔️ Raid Open' : '🔒 Lv. 40 Required'}
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-xs sm:text-sm text-white tracking-wide">
                      {player.level >= 40
                        ? 'Bakunawa: The Great Moon-Devouring Serpent'
                        : '??? Celestial Eclipse Rift'}
                    </h4>

                    <p className="text-[9.5px] font-mono text-zinc-300 leading-relaxed">
                      {player.level >= 40
                        ? 'Defend the seven moons in an epic 10-turn celestial clash against the dragon of the cosmos.'
                        : 'An ominous celestial rift pulses in the sky. Ancient tablets prophesy a beast that consumes moonlight.'}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center">
                    {player.level >= 40 ? (
                      <button
                        onClick={() => {
                          soundFX.playClick();
                          onNavigateToTitanRaid?.();
                        }}
                        className="w-full sm:w-auto px-3.5 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono font-bold text-[10.5px] uppercase tracking-wider rounded-xl shadow-lg shadow-purple-950/70 active:scale-95 transition-all text-center min-h-[40px] flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <span>Challenge Bakunawa</span>
                        <span>➔</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-[9px] font-mono text-zinc-400">
                        <span>🔒</span>
                        <span>Req Lv. 40 (Lv. {player.level}/40)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── REALM WAYSTONES (8 ACTS + ACT IX INFINITE SURVIVAL REALM) ── */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1.5">
                  <span className="font-bold text-zinc-300 uppercase tracking-wider">Archipelago Realms</span>
                  <span>Waystone Network</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {GAME_LOCATIONS.map((loc, idx) => {
                    const isInfiniteRealm = loc.id === 'loc_act_infinite';
                    const actRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][idx] || `${idx + 1}`;
                    const prevBossId = idx > 0 ? `boss_act_${idx}` : null;

                    const isUnlocked = isInfiniteRealm
                      ? Boolean(player.act8Completed || (player.completedBossIds || []).includes('boss_act_8') || (player.unlockedLocationIds || []).includes('loc_act_infinite'))
                      : idx === 0 || (player.unlockedLocationIds || []).includes(loc.id) || (prevBossId ? (player.completedBossIds || []).includes(prevBossId) : false);

                    const isCurrent = player.currentLocationId === loc.id;
                    const reqPower = calcRequiredActPower(loc.id, player.ngPlusLevel || 0);

                    const actIcons = ['🌿', '🌊', '🕯️', '🌋', '🩸', '🔮', '⚡', '🌑', '🌌'];
                    const actIcon = actIcons[idx] || '🗺️';

                    if (!isUnlocked) {
                      return (
                        <div
                          key={loc.id}
                          className="p-2.5 rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-between gap-2.5 text-zinc-500"
                        >
                          <div className="flex items-center space-x-2.5 truncate">
                            <span className="text-lg opacity-35 shrink-0">🔒</span>
                            <div className="truncate space-y-0.5">
                              <div className="text-[8.5px] font-mono uppercase tracking-wider text-zinc-600 font-bold">
                                Act {actRoman} • Shrouded Realm
                              </div>
                              <h4 className="font-serif font-bold text-[11px] text-zinc-400 truncate">
                                ??? Unknown Territory
                              </h4>
                              <p className="text-[8.5px] font-mono text-zinc-600 truncate">
                                Veiled by ancestral mists until previous Act Guardian is slain
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800 font-bold block">
                              🔒 {reqPower} Pwr
                            </span>
                            <span className="text-[8px] font-mono text-zinc-600 mt-0.5 block">
                              Lv. {loc.minLevel}+
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={loc.id}
                        className={`p-2.5 rounded-2xl border bg-gradient-to-b from-[#0b0e14]/90 via-[#07090f]/95 to-black/95 backdrop-blur-md flex flex-col justify-between space-y-1.5 transition-all shadow-md ${
                          isCurrent
                            ? 'border-cyan-400 ring-1 ring-cyan-400/60 shadow-cyan-950/40'
                            : 'border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center space-x-2 truncate">
                            <span className="text-xl shrink-0 p-1 rounded-xl bg-zinc-900 border border-zinc-700/50">
                              {actIcon}
                            </span>
                            <div className="truncate space-y-0.5">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[8.5px] font-mono uppercase font-bold text-cyan-400">
                                  Act {actRoman}
                                </span>
                                <span className="text-[8.5px] font-mono text-zinc-400 font-bold">
                                  • Lv. {loc.minLevel}{loc.bossLevelReq ? `–${loc.bossLevelReq}` : '+'}
                                </span>
                              </div>
                              <h4 className="font-serif font-bold text-xs text-white truncate">
                                {loc.name}
                              </h4>
                            </div>
                          </div>

                          <span
                            className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full shrink-0 font-bold ${
                              isCurrent
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 animate-pulse'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                            }`}
                          >
                            {isCurrent ? '📍 Active' : 'Discovered'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5 pt-1 border-t border-zinc-800/60">
                          {!isInfiniteRealm && (
                            <button
                              onClick={() => {
                                soundFX.playClick();
                                setStoryLocation(loc);
                              }}
                              className="px-2 py-1 text-[9.5px] font-mono bg-zinc-900 hover:bg-zinc-800 text-amber-200 border border-amber-800/40 rounded-xl flex items-center space-x-1 shrink-0 transition-all active:scale-95 cursor-pointer min-h-[30px]"
                              title="Replay Realm Lore"
                            >
                              <span>📜</span>
                              <span className="font-bold">Lore</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              soundFX.playClick();
                              if (isCurrent) {
                                notify(`Traveling into ${loc.name}...`, 'info', '🌌');
                                onNavigateToWorld();
                              } else {
                                onUpdatePlayer({ ...player, currentLocationId: loc.id });
                                notify(`⚡ Waystone tuned to ${loc.name}!`, 'success', '🌀');
                              }
                            }}
                            className={`flex-1 py-1 px-2.5 rounded-xl font-mono font-bold text-[9.5px] uppercase tracking-wider transition-all min-h-[30px] flex items-center justify-center space-x-1 shadow active:scale-95 cursor-pointer ${
                              isCurrent
                                ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-zinc-950 font-extrabold'
                                : 'bg-zinc-850 hover:bg-zinc-800 text-cyan-300 border border-cyan-800/50'
                            }`}
                          >
                            <span>{isCurrent ? '⚡ Enter Realm / Hunt' : '🌀 Tune Waystone'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* DISTRICT 5: STASH (KABAN NG KAYAMANAN)                                 */}
        {/* ===================================================================== */}
        {district === 'STASH' && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-1.5 min-h-0">
            {/* Stash Header & Navigation Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 border-b border-zinc-800/80 pb-1 shrink-0">
              <div className="flex items-center space-x-2">
                <span className="font-serif font-bold text-amber-200 text-xs sm:text-sm flex items-center gap-1">
                  <span>🏛️</span>
                  <span>Royal Relic Sanctum & Vault</span>
                </span>

                {/* Mobile View Toggle: Backpack vs Vault */}
                <div className="flex md:hidden bg-zinc-950/80 p-0.5 rounded-xl border border-zinc-800 text-[9px] font-mono font-bold">
                  <button
                    onClick={() => {
                      setStashMobileView('BACKPACK');
                      soundFX.playClick();
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      stashMobileView === 'BACKPACK'
                        ? 'bg-amber-600 text-zinc-950 shadow'
                        : 'text-zinc-400'
                    }`}
                  >
                    🎒 Bag ({player.inventory.length}/{derived.inventoryCapacity})
                  </button>
                  <button
                    onClick={() => {
                      setStashMobileView('VAULT');
                      soundFX.playClick();
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      stashMobileView === 'VAULT'
                        ? 'bg-cyan-600 text-zinc-950 shadow'
                        : 'text-zinc-400'
                    }`}
                  >
                    🏛️ Vault ({sortedStash.length})
                  </button>
                </div>
              </div>

              {/* Sort Modes */}
              <div className="flex items-center space-x-1 text-[9px] font-mono self-end sm:self-auto">
                <span className="text-zinc-500">Sort:</span>
                {(['POWER', 'TYPE', 'CLASS'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setStashSortMode(mode);
                      soundFX.playClick();
                    }}
                    className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                      stashSortMode === mode
                        ? 'bg-amber-600 text-zinc-950 shadow'
                        : 'bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-700/50'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Stash Columns: Tabbed on mobile, Side-by-side on desktop */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 overflow-hidden min-h-0">
              {/* BACKPACK COLUMN */}
              <div
                className={`bg-[#0c0f16]/90 backdrop-blur-md border border-amber-900/40 rounded-2xl p-2 sm:p-2.5 flex-col overflow-hidden shadow-xl min-h-0 ${
                  stashMobileView === 'BACKPACK' ? 'flex' : 'hidden md:flex'
                }`}
              >
                <div className="flex justify-between items-center text-[9.5px] font-mono mb-1 shrink-0">
                  <span className="text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1">
                    <span>🎒</span>
                    <span>Backpack Inventory</span>
                  </span>
                  <span className={`px-2 py-0.2 rounded-full border ${
                    player.inventory.length >= derived.inventoryCapacity
                      ? 'bg-red-950 text-red-300 border-red-700 font-bold animate-pulse'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                  }`}>
                    {player.inventory.length} / {derived.inventoryCapacity} slots
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
                  {sortedInventory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-4 text-center text-zinc-600 font-mono text-xs">
                      <span>Backpack is empty.</span>
                    </div>
                  ) : (
                    sortedInventory.map((item) => {
                      const power = calcItemPowerRating(item);
                      const icon =
                        item.category === 'SWORD' ? '⚔️' :
                        item.category === 'DAGGER' ? '🗡️' :
                        item.category === 'BOW' ? '🏹' :
                        item.category === 'STAFF' ? '🔮' :
                        item.category === 'UPPER' ? '🥋' :
                        item.category === 'LOWER' ? '👖' : '🛡️';

                      return (
                        <div
                          key={item.id}
                          className="p-1.5 bg-zinc-900/70 hover:bg-zinc-850 border border-zinc-800/80 rounded-xl flex justify-between items-center text-xs font-mono min-h-[42px] transition-all"
                        >
                          <div className="flex items-center space-x-2 truncate pr-2">
                            <span className="text-sm">{icon}</span>
                            <div className="truncate">
                              <span className="font-bold text-zinc-200 truncate block text-[10.5px] font-serif">
                                {item.name}
                              </span>
                              <div className="text-[8.5px] text-zinc-400">
                                Tier {item.tier} • <span className="text-purple-300">⚡ {power}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDepositToVault(item)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold rounded-lg uppercase text-[9px] shrink-0 cursor-pointer transition-all active:scale-95 shadow"
                          >
                            Store ➔
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* VAULT COLUMN */}
              <div
                className={`bg-[#0a111a]/90 backdrop-blur-md border border-cyan-900/40 rounded-2xl p-2 sm:p-2.5 flex-col overflow-hidden shadow-xl min-h-0 ${
                  stashMobileView === 'VAULT' ? 'flex' : 'hidden md:flex'
                }`}
              >
                <div className="flex justify-between items-center text-[9.5px] font-mono mb-1 shrink-0">
                  <span className="text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1">
                    <span>🏛️</span>
                    <span>Royal Stash Vault</span>
                  </span>
                  <span className="px-2 py-0.2 rounded-full bg-zinc-900 text-cyan-300 border border-cyan-800/40">
                    {sortedStash.length} relics stored
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
                  {sortedStash.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-4 text-center text-zinc-600 font-mono text-xs">
                      <span>Vault is empty. Deposit rare relics from your backpack.</span>
                    </div>
                  ) : (
                    sortedStash.map((item) => {
                      const power = calcItemPowerRating(item);
                      const icon =
                        item.category === 'SWORD' ? '⚔️' :
                        item.category === 'DAGGER' ? '🗡️' :
                        item.category === 'BOW' ? '🏹' :
                        item.category === 'STAFF' ? '🔮' :
                        item.category === 'UPPER' ? '🥋' :
                        item.category === 'LOWER' ? '👖' : '🛡️';

                      return (
                        <div
                          key={item.id}
                          className="p-1.5 bg-zinc-900/70 hover:bg-zinc-850 border border-zinc-800/80 rounded-xl flex justify-between items-center text-xs font-mono min-h-[42px] transition-all"
                        >
                          <div className="flex items-center space-x-2 truncate pr-2">
                            <span className="text-sm">{icon}</span>
                            <div className="truncate">
                              <span className="font-bold text-zinc-200 truncate block text-[10.5px] font-serif">
                                {item.name}
                              </span>
                              <div className="text-[8.5px] text-zinc-400">
                                Tier {item.tier} • <span className="text-cyan-300">⚡ {power}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleWithdrawFromVault(item)}
                            className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold rounded-lg uppercase text-[9px] shrink-0 cursor-pointer transition-all active:scale-95 shadow"
                          >
                            Withdraw
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* DISTRICT 6: STABLES (KUADRA NG MGA HALIMAW)                           */}
        {/* ===================================================================== */}
        {district === 'STABLES' && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-1.5 min-h-0">
            {/* Stables Header Bar */}
            <div className="flex justify-between items-center border-b border-zinc-800/80 pb-1 shrink-0">
              <span className="font-serif font-bold text-amber-200 text-xs sm:text-sm flex items-center gap-1">
                <span>🐃</span>
                <span>Beastmaster Mythical Stables</span>
              </span>
              {player.equipment.mount && (
                <div className="flex items-center space-x-2 text-[9.5px] font-mono">
                  <span className="text-emerald-400 font-bold">Riding: {player.equipment.mount.name}</span>
                  <button
                    onClick={handleUnequipMount}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[8.5px] border border-zinc-700 cursor-pointer"
                  >
                    Unequip
                  </button>
                </div>
              )}
            </div>

            {!player.act6Completed && !player.mountUnlocked ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2 bg-[#0c0d12]/90 backdrop-blur-md rounded-2xl border border-amber-900/40">
                <div className="text-3xl">🔒 🐃</div>
                <h4 className="font-serif font-bold text-amber-300 text-xs sm:text-sm">Beastmaster Stables Sealed</h4>
                <p className="text-[9.5px] sm:text-[10px] text-zinc-400 font-mono max-w-sm leading-relaxed">
                  Slay the Act VI Guardian (Tambanokano, The Moon-Crusher) in Trench of the Abyssal Tide to unlock mythical mount taming.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-2.5 content-start min-h-0">
                {MOUNTS.map((mount) => {
                  const isBonded = tamedMountIds.includes(mount.id);
                  const isEquipped = player.equipment.mount?.id === mount.id;
                  const canMeetLevel = player.level >= (mount.levelReq || 39);
                  const { costInCC, mutyaCost } = getMountCosts(mount);
                  const price = formatPreColonialCurrencyBadge(costInCC);
                  const canAffordCurrency = totalCowries >= costInCC;
                  const canAffordMutya = (player.wallet.mutyaShards ?? 0) >= mutyaCost;
                  const canBond = canMeetLevel && canAffordCurrency && canAffordMutya;

                  return (
                    <div
                      key={mount.id}
                      className={`p-3 rounded-2xl border flex flex-col justify-between space-y-2 transition-all shadow-md backdrop-blur-md ${
                        isEquipped
                          ? 'bg-gradient-to-b from-[#0a1410]/95 to-black/95 border-emerald-500 ring-1 ring-emerald-500 shadow-emerald-950/50'
                          : isBonded
                          ? 'bg-gradient-to-b from-[#0a121a]/95 to-black/95 border-cyan-800/60 shadow'
                          : 'bg-zinc-950/70 border-zinc-800/80'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-[8.5px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                            Tier {mount.tier} • {mount.rarity}
                          </div>
                          <h4 className="font-serif font-bold text-xs sm:text-sm text-white">{mount.name}</h4>
                        </div>
                        <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800/40">
                          +{mount.baseDefense} Armor
                        </span>
                      </div>

                      <p className="text-[9.5px] font-mono text-zinc-300 bg-zinc-900/80 p-2 rounded-xl border border-zinc-850 leading-relaxed">
                        {mount.inherentPerk}
                      </p>

                      {/* Required Bonding Tribute & Mutya Cost */}
                      {!isBonded && (
                        <div className="flex items-center justify-between text-[9.5px] font-mono bg-zinc-950/80 px-2 py-1 rounded-xl border border-zinc-800">
                          <span className="text-zinc-400">Bonding Tribute:</span>
                          <div className="flex items-center space-x-1 font-bold">
                            <span className="text-amber-300">{price.formatted}</span>
                            {mutyaCost > 0 && (
                              <span className="text-purple-300 bg-purple-950/90 px-1 py-0.2 rounded-lg border border-purple-700/50">
                                +{mutyaCost} 🔮 Mutya
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="pt-1 border-t border-zinc-850">
                        {isEquipped ? (
                          <div className="w-full py-1.5 text-center font-mono font-bold text-[9.5px] text-emerald-300 bg-emerald-950/60 rounded-xl border border-emerald-700/50 min-h-[36px] flex items-center justify-center">
                            ✅ Active Mount Mounted
                          </div>
                        ) : isBonded ? (
                          <button
                            onClick={() => handleEquipMount(mount)}
                            className="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-zinc-950 font-mono font-bold text-[9.5px] uppercase tracking-wider rounded-xl transition-all shadow min-h-[36px] cursor-pointer active:scale-95 flex items-center justify-center space-x-1"
                          >
                            <span>Mount Steed</span>
                            <span>➔</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBondMount(mount)}
                            disabled={!canBond}
                            className={`w-full py-1.5 rounded-xl font-mono font-bold text-[9.5px] uppercase tracking-wider transition-all min-h-[36px] cursor-pointer flex items-center justify-center ${
                              !canMeetLevel
                                ? 'bg-zinc-850 text-zinc-600 cursor-not-allowed border border-zinc-800'
                                : !canAffordCurrency || !canAffordMutya
                                ? 'bg-zinc-900 text-red-400 border border-red-900/40 cursor-not-allowed'
                                : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 shadow-amber-950/50 active:scale-95'
                            }`}
                          >
                            {!canMeetLevel
                              ? `🔒 Req Lv ${mount.levelReq}`
                              : !canAffordCurrency || !canAffordMutya
                              ? `Insufficient Tribute (${price.formatted}${mutyaCost > 0 ? ` + ${mutyaCost} 🔮` : ''})`
                              : `🤝 Bond Beast (${price.formatted}${mutyaCost > 0 ? ` + ${mutyaCost} 🔮` : ''})`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── MODALS ───────────────────────────────────────────────────────────── */}
      {/* 1. Bounty Notice Board Modal */}
      <BountyNoticeBoardModal
        isOpen={showBountyModal}
        onClose={() => setShowBountyModal(false)}
        player={player}
        onUpdatePlayer={onUpdatePlayer}
        onShowToast={notify}
      />

      {/* 2. Forge Purchase Modal */}
      <ForgePurchaseModal
        item={inspectPurchaseItem}
        stock={inspectPurchaseItem ? (forgeStock[inspectPurchaseItem.id] !== undefined ? forgeStock[inspectPurchaseItem.id] : getInitialStoreStock(inspectPurchaseItem)) : 0}
        onPurchaseSuccess={(purchased) => {
          setForgeStock((prev) => {
            const cur = prev[purchased.id] !== undefined ? prev[purchased.id] : getInitialStoreStock(purchased);
            return { ...prev, [purchased.id]: Math.max(0, cur - 1) };
          });
        }}
        onClose={() => setInspectPurchaseItem(null)}
        player={player}
        onUpdatePlayer={onUpdatePlayer}
        onShowToast={notify}
      />

      {/* 3. Mutya Affix Blessing Modal */}
      <MutyaAffixBlessingModal
        item={inspectBlessingItem}
        onClose={() => setInspectBlessingItem(null)}
        player={player}
        onUpdatePlayer={onUpdatePlayer}
        onShowToast={notify}
      />

      {/* 4. Act Lore Replay Modal */}
      {storyLocation && (
        <ActStoryOverlayModal
          actId={storyLocation.id}
          actName={storyLocation.name}
          actSubtitle={storyLocation.subtitle}
          actLore={getActStory(storyLocation.id)}
          onClose={() => setStoryLocation(null)}
        />
      )}

      {/* 5. NG+ Rebirth Confirmation Modal */}
      {showNgPlusConfirm && (
        <ConfirmModal
          isOpen={showNgPlusConfirm}
          title="🌟 INITIATE ANITO CYCLE REBIRTH (NEW GAME+)?"
          message={`Are you ready to transcend the mortal veil and begin New Game+ Cycle ${(player.ngPlusLevel || 0) + 1}?\n\n• Monster stats across all Archipelago Acts will scale upwards with severe ferocity.\n• Your Character Level, AP, Attributes, Gear, Mounts, Mutya Skills, and Royal Vault Stash are preserved.\n• Exploration Acts, story chronicles, and side quests will reset to Act I.`}
          confirmLabel={`⚡ Transcend to NG+ ${(player.ngPlusLevel || 0) + 1}`}
          cancelLabel="Not Yet"
          variant="warning"
          onConfirm={handleConfirmRebirth}
          onCancel={() => setShowNgPlusConfirm(false)}
        />
      )}

      {/* 6. NG+ Rebirth Lore Story Overlay */}
      {showRebirthStoryModal && (
        <ActStoryOverlayModal
          actId="ng_plus_rebirth"
          actName="The Eternal Cycle of Anitos"
          actSubtitle="A Transcendent Soul Reborn"
          actLore={NG_PLUS_REBIRTH_STORY}
          onClose={() => setShowRebirthStoryModal(false)}
        />
      )}

      {/* 7. Contextual Feature Tutorials */}
      {activeTutorial && (
        <FeatureTutorialModal
          tutorialId={activeTutorial.id}
          featureName={activeTutorial.name}
          steps={activeTutorial.steps}
          onComplete={() => handleCompleteTutorial(activeTutorial.id)}
          onSkip={() => handleCompleteTutorial(activeTutorial.id)}
        />
      )}
    </div>
  );
};

export default HavenView;

