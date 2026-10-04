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
  totalCowriesFromWallet,
  cowriesToWallet,
  calcItemPowerRating,
  sortInventory,
  calcRequiredActPower,
} from '../utils/gameFormulas';
import { getScaledForgeCatalog, getBaseTemplateId } from '../utils/equipmentGenerator';
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
    description: 'Rest on hand-woven mats by the balete hearth fire.',
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
    description: 'The supreme ritual of the seven moons. Completely cleanses spirit.',
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

  // Forge state
  const [forgeCategory, setForgeCategory] = useState<'ALL' | 'WEAPONS' | 'ARMOR'>('ALL');

  // Alchemist state
  const [alchemistFilter, setAlchemistFilter] = useState<'ALL' | 'POTION' | 'ELIXIR' | 'PANACEA'>('ALL');

  // Stash state
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
    if (player.level < bountyUnlockLevel) {
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

  const currentActId = player.currentLocationId || 'loc_act_1';
  const actMatch = currentActId.match(/\d+/);
  const currentActNumber = actMatch ? parseInt(actMatch[0], 10) : 1;

  // Filter resting options to only show unlocked Hearths
  const unlockedRestOptions = REST_OPTIONS.filter((opt) => player.level >= opt.minLevel);
  const activeHearthIndex = Math.min(currentHearthIndex, Math.max(0, unlockedRestOptions.length - 1));

  // ─── TAVERN REST HANDLER ────────────────────────────────────────────────────
  const handleRest = (opt: RestOption) => {
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
  // Build set of currently owned base IDs to cleanly hide sold-out items
  const ownedBaseIds = new Set<string>();
  const recordOwned = (item: EquipmentItem | ConsumableItem | null | undefined) => {
    if (!item) return;
    ownedBaseIds.add(item.id);
    ownedBaseIds.add(getBaseTemplateId(item.id));
  };
  player.inventory.forEach(recordOwned);
  recordOwned(player.equipment.weapon);
  recordOwned(player.equipment.upperArmor);
  recordOwned(player.equipment.lowerArmor);

  const forgeCatalog = getScaledForgeCatalog(
    player.level,
    player.heroClass as HeroClass,
    forgeCategory,
    false,
    player.currentLocationId || 'loc_act_1',
    player.ngPlusLevel || 0,
    ownedBaseIds
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

  const districtTabs: { id: DistrictTab; label: string; icon: string; tutTarget?: string }[] = [
    { id: 'TAVERN', label: 'Tavern', icon: '🍺' },
    { id: 'FORGE', label: 'Forge', icon: '⚒️', tutTarget: 'district-forge' },
    { id: 'ALCHEMIST', label: 'Alchemist', icon: '🧪', tutTarget: 'district-alchemist' },
    { id: 'GATE', label: 'Gate', icon: '🌀' },
    { id: 'STASH', label: 'Stash', icon: '🏛️' },
    ...(isStablesUnlocked ? [{ id: 'STABLES' as const, label: 'Stables', icon: '🐃' }] : []),
  ];

  // Mobile Touch Swipe Gesture: Tavern > Forge > Alchemist > Gate > Stash > Stables (if unlocked)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (e.changedTouches.length === 0) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - start.x;
    const diffY = endY - start.y;

    // Predominantly horizontal swipe of at least 45px
    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
      const availableTabs = districtTabs.map((t) => t.id);
      const currentIndex = availableTabs.indexOf(district);
      if (currentIndex === -1) return;

      if (diffX < 0) {
        // Swiped left -> Next district
        if (currentIndex < availableTabs.length - 1) {
          handleSelectDistrict(availableTabs[currentIndex + 1]);
        }
      } else {
        // Swiped right -> Previous district
        if (currentIndex > 0) {
          handleSelectDistrict(availableTabs[currentIndex - 1]);
        }
      }
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col h-full overflow-hidden bg-black/25 text-zinc-100 select-none font-sans">
      {/* ─── AUTHENTIC PRE-COLONIAL SANCTUARY BANNER (TUTORIAL COMPATIBLE) ───── */}
      <header
        data-tutorial-target="town-banner"
        className="bg-zinc-950/80 backdrop-blur-md border-b border-amber-900/40 px-3 py-2 shrink-0 flex items-center justify-between shadow-md"
      >
        <div className="flex items-center space-x-2.5 truncate">
          <span className="text-xl shrink-0">🏛️</span>
          <div className="truncate">
            <div className="flex items-center space-x-2">
              <span className="text-[9px] font-mono uppercase text-amber-500 font-bold tracking-widest">
                SAFE ZONE
              </span>
              <span className="text-[10px] font-mono text-zinc-400 font-bold">
                • {player.heroClass}
              </span>
              <span className="text-purple-300 font-bold bg-purple-950/80 px-1.5 py-0.2 rounded border border-purple-800/40 text-[9px] font-mono shadow-inner">
                ⚡ {derived.powerLevel} Power
              </span>
            </div>
            <h2 className="text-xs sm:text-sm font-bold font-serif text-amber-200 tracking-wide truncate">
              Poblacion Sanctuary Citadel
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
            className="bg-zinc-800/80 hover:bg-zinc-700 text-amber-300 px-2 py-1 rounded-lg border border-amber-500/30 text-[10px] font-mono font-bold transition-all min-h-[30px] flex items-center space-x-1 backdrop-blur-sm"
            title="Replay Interactive Onboarding Tutorial"
          >
            <span>❓</span>
            <span className="hidden sm:inline">Tutorial</span>
          </button>
          <div className="bg-emerald-950/70 border border-emerald-700/50 px-2 py-1 rounded-lg text-[10px] font-mono text-emerald-300 font-bold min-h-[30px] flex items-center backdrop-blur-sm">
            ⚡ Safe
          </div>
        </div>
      </header>

      {/* ─── HAVEN DISTRICT NAVIGATION TABS ─────────────────────────────────── */}
      <nav
        className={`bg-zinc-950/75 backdrop-blur-md border-b border-zinc-800/80 px-1 sm:px-2 py-1 shrink-0 grid ${
          isStablesUnlocked ? 'grid-cols-6' : 'grid-cols-5'
        } gap-1 w-full font-mono`}
      >
        {districtTabs.map((tab) => {
          const isActive = district === tab.id;
          return (
            <button
              key={tab.id}
              data-tutorial-target={tab.tutTarget}
              onClick={() => handleSelectDistrict(tab.id)}
              className={`flex flex-col sm:flex-row items-center justify-center py-1 sm:py-1.5 px-0.5 sm:px-1 rounded-xl font-bold transition-all truncate text-center backdrop-blur-sm ${
                isActive
                  ? 'bg-amber-600/95 text-zinc-950 shadow-md ring-1 ring-amber-400'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800/60'
              }`}
            >
              <span className="text-xs sm:text-sm">{tab.icon}</span>
              <span className="text-[9px] sm:text-[11px] truncate tracking-tight sm:ml-1">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ─── DISTRICT CANVAS (WITH SWIPE GESTURE SUPPORT) ───────────────────── */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-hidden flex flex-col p-2 sm:p-2.5 pb-20 md:pb-4 min-h-0"
      >
        {/* ===================================================================== */}
        {/* DISTRICT 1: TAVERN                                                    */}
        {/* ===================================================================== */}
        {district === 'TAVERN' && (
          <div className="flex-1 flex flex-col lg:flex-row items-center justify-between lg:justify-center overflow-hidden gap-2 sm:gap-4 p-0.5 sm:p-2 min-h-0">
            {/* Hearth Carousel (Full Vertical Rectangle Card Deck with Peeking Sides) */}
            <div data-tutorial-target="inn-card" className="flex-1 w-full flex flex-col items-center justify-center overflow-hidden min-h-0">
              <div className="text-center mb-0.5 shrink-0">
                <h3 className="font-serif font-bold text-amber-200 text-xs sm:text-sm tracking-wide flex items-center justify-center space-x-1.5">
                  <span className="text-amber-400">🔥</span>
                  <span>Shamans' Hearth & Sanctuary Inn</span>
                </h3>
                <p className="text-[9px] sm:text-[10px] font-mono text-zinc-400">
                  Select an ancestral hearth to replenish HP, MP & Stamina.
                </p>
              </div>

              <HearthRestCarousel
                options={unlockedRestOptions}
                currentIndex={activeHearthIndex}
                onChangeIndex={setCurrentHearthIndex}
                onRest={handleRest}
                playerLevel={player.level}
                playerCowries={totalCowries}
              />
            </div>

            {/* Bounty Notice Board Card (Bounty Contract Tracker - Strictly Unlocked at Level 3+) */}
            {player.level >= 3 && (
              <div
                data-tutorial-target="tavern-card"
                className="w-full lg:w-80 bg-zinc-950/70 backdrop-blur-md border border-purple-800/60 rounded-3xl p-3 sm:p-4 flex flex-col justify-between shrink-0 shadow-xl gap-2 sm:gap-2.5"
              >
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">📜</span>
                      <div>
                        <h4 className="font-serif font-bold text-purple-200 text-sm tracking-wide">
                          Poblacion Notice Board
                        </h4>
                        <div className="text-[10px] font-mono text-zinc-400">
                          Act {currentActNumber} Wanted Contracts
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/50">
                      {availableContractsCount} Available
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleOpenBountyBoard}
                  className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-600 hover:from-purple-600 hover:to-indigo-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-950/60 active:scale-95 transition-all text-center min-h-[42px] sm:min-h-[44px] flex items-center justify-center space-x-1.5"
                >
                  <span>Inspect Notice Board</span>
                  <span>➔</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* DISTRICT 2: FORGE (STRICT 2/3 STORE & 1/3 MUTYA RATIO)                */}
        {/* ===================================================================== */}
        {district === 'FORGE' && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-1.5">
            {/* Header Filter Bar */}
            <div className="flex justify-between items-center border-b border-zinc-800/60 pb-1 shrink-0">
              <div className="flex space-x-1">
                {(['ALL', 'WEAPONS', 'ARMOR'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setForgeCategory(cat)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all backdrop-blur-sm ${
                      forgeCategory === cat
                        ? 'bg-amber-600 text-zinc-950 shadow'
                        : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-700/50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <span className="text-[10px] font-mono text-purple-300 bg-purple-950/70 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-purple-800/40">
                🔮 {player.wallet.mutyaShards ?? 0} Mutya
              </span>
            </div>

            {/* Split Canvas: 2/3 Store and 1/3 Mutya Affix Blessing */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden gap-1.5 sm:gap-2 min-h-0">
              {/* SECTION A: 2/3 RATIO - ARMORY STORE (6 items visible before scroll) */}
              <div className="flex-[2] md:w-2/3 bg-zinc-950/70 backdrop-blur-md border border-amber-900/40 rounded-2xl p-2 sm:p-2.5 flex flex-col overflow-hidden shadow-xl min-h-0 max-h-[265px] md:max-h-none">
                <div className="flex justify-between items-center mb-1 shrink-0 text-xs font-mono">
                  <span className="font-bold text-amber-300 uppercase tracking-wide text-[11px]">
                    Panday Pira's Armory
                  </span>
                  <span className="text-zinc-400 text-[10px]">{forgeCatalog.length} In Stock</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0 max-h-[230px] md:max-h-none">
                  {forgeCatalog.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-3 text-zinc-500 font-mono text-xs">
                      <span>✨ All available items in this bracket purchased!</span>
                    </div>
                  ) : (
                    forgeCatalog.map((item) => {
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
                        ? `${item.baseDamageMin}-${item.baseDamageMax} Dmg`
                        : item.archetype;

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            soundFX.playClick();
                            setInspectPurchaseItem(item);
                          }}
                          className="px-2 py-1 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-amber-500/80 rounded-xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group shadow h-[35px] shrink-0 backdrop-blur-sm"
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <span className="text-sm w-5 text-center shrink-0">{icon}</span>
                            <div className="truncate">
                              <h4 className="font-serif font-semibold text-[11px] text-white group-hover:text-amber-200 truncate leading-tight">
                                {item.name}
                              </h4>
                              <div className="text-[8.5px] font-mono text-zinc-400 truncate leading-none">
                                Tier {item.tier} • {statSummary}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            <span className="text-[9px] font-mono font-bold bg-purple-950/90 text-purple-300 px-1.5 py-0.2 rounded border border-purple-800/40">
                              ⚡ {power}
                            </span>
                            <span className="text-zinc-500 group-hover:text-amber-400 text-xs font-bold">›</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* SECTION B: 1/3 RATIO - MUTYA AFFIX BLESSING (3 items visible before scroll) */}
              <div className="flex-[1] md:w-1/3 bg-zinc-950/70 backdrop-blur-md border border-purple-900/50 rounded-2xl p-2 sm:p-2.5 flex flex-col overflow-hidden shadow-xl min-h-0 max-h-[150px] md:max-h-none">
                <div className="flex justify-between items-center mb-1 shrink-0 text-xs font-mono">
                  <span className="font-bold text-purple-300 uppercase tracking-wide text-[11px]">
                    Mutya Blessing
                  </span>
                  <span className="text-amber-400/90 text-[9px]">Escalating Risk</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0 max-h-[115px] md:max-h-none">
                  {player.inventory.filter((i): i is EquipmentItem => 'tier' in i).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-2 text-zinc-500 font-mono text-xs">
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
                          ? `${item.baseDamageMin}-${item.baseDamageMax} Dmg`
                          : item.archetype;

                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              soundFX.playClick();
                              setInspectBlessingItem(item);
                            }}
                            className="px-2 py-1 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-purple-500/80 rounded-xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group shadow h-[35px] shrink-0 backdrop-blur-sm"
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <span className="text-sm w-5 text-center shrink-0">{icon}</span>
                              <div className="truncate">
                                <h4 className="font-serif font-semibold text-[11px] text-white group-hover:text-purple-200 truncate leading-tight">
                                  {item.name}
                                </h4>
                                <div className="text-[8.5px] font-mono text-zinc-400 truncate leading-none">
                                  Tier {item.tier} • {statSummary}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0">
                              <span className="text-[9px] font-mono font-bold bg-purple-950/90 text-purple-300 px-1.5 py-0.2 rounded border border-purple-800/40">
                                ⚡ {power}
                              </span>
                              <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/40">
                                {item.blessingAttempts || 0}/5
                              </span>
                              <span className="text-zinc-500 group-hover:text-purple-400 text-xs font-bold">›</span>
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
        {/* DISTRICT 3: ALCHEMIST (COMPACT DENSE ROWS)                            */}
        {/* ===================================================================== */}
        {district === 'ALCHEMIST' && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-2">
            <div className="flex justify-between items-center border-b border-zinc-800/60 pb-1.5 shrink-0">
              <div>
                <h3 className="font-serif font-bold text-emerald-200 text-xs">Shaman's Apothecary</h3>
                <p className="text-[10px] text-zinc-400 font-mono">Act {currentActNumber} Botanical Remedies</p>
              </div>

              <div className="flex space-x-1">
                {(['ALL', 'POTION', 'ELIXIR', 'PANACEA'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setAlchemistFilter(cat)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all backdrop-blur-sm ${
                      alchemistFilter === cat
                        ? 'bg-emerald-600 text-zinc-950 shadow'
                        : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-700/50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Dense, Compact Potion Grid */}
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 content-start">
              {availablePotions.map((potion) => {
                const price = formatPreColonialCurrencyBadge(potion.costInCC);
                return (
                  <div
                    key={potion.id}
                    className="bg-zinc-950/70 backdrop-blur-md border border-emerald-900/50 hover:border-emerald-500/70 p-3 rounded-2xl flex flex-col justify-between shadow-lg transition-all group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 truncate">
                          <span className="text-xl w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/40 flex items-center justify-center shrink-0">
                            {potion.icon || '🌿'}
                          </span>
                          <h4 className="text-xs font-serif font-bold text-emerald-100 truncate group-hover:text-emerald-300">
                            {potion.name}
                          </h4>
                        </div>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/40 font-bold shrink-0">
                          {potion.category}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-zinc-300 leading-relaxed line-clamp-2">
                        {potion.effectDescription}
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-zinc-850/70">
                      <span className="text-[10px] font-mono font-bold text-amber-300">{price.formatted}</span>
                      <button
                        onClick={() => handleBrewPotion(potion)}
                        className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-zinc-950 font-mono font-bold text-[10px] rounded-xl uppercase tracking-wider transition-all shadow active:scale-95 min-h-[32px]"
                      >
                        Brew ➔
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* DISTRICT 4: GATE (SANCTUARY WAYSTONES & TITAN RAID PORTALS)           */}
        {/* ===================================================================== */}
        {district === 'GATE' && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-2.5">
            {/* Gate Header Bar */}
            <div className="border-b border-zinc-800/60 pb-2 shrink-0 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🌀</span>
                <div>
                  <h3 className="font-serif font-bold text-cyan-200 text-xs sm:text-sm tracking-wide">
                    Poblacion Sanctuary Waystones
                  </h3>
                  <p className="text-[9px] sm:text-[10px] font-mono text-zinc-400">
                    Spirit arches connecting the realms of the archipelago
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 backdrop-blur-sm text-cyan-300 border border-cyan-800/40 font-bold">
                  📍 Act {currentActNumber} Active
                </span>
              </div>
            </div>

            {/* Scrollable Waystones Area */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-3">
              {/* ── ANITO CYCLE REBIRTH SHRINE CARD (NG+) ── */}
              {((player.completedBossIds || []).includes('boss_act_8')) && (
                <div className="bg-zinc-950/75 backdrop-blur-md border-2 border-amber-400/90 p-3 sm:p-4 rounded-2xl space-y-2 shadow-2xl flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="flex items-center space-x-2 justify-center sm:justify-start">
                      <span className="text-xl">🌟</span>
                      <span className="text-xs font-mono font-bold uppercase text-amber-300 tracking-wider">
                        ANITO CYCLE REBIRTH SHRINE (NG+ SYSTEM)
                      </span>
                      <span className="bg-amber-950 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold px-2 py-0.5 rounded">
                        NG+ Tier {player.ngPlusLevel || 0}
                      </span>
                    </div>
                    <h4 className="text-sm sm:text-base font-bold font-serif text-amber-100">
                      Initiate Anito Rebirth Cycle (NG+ {(player.ngPlusLevel || 0) + 1})
                    </h4>
                    <p className="text-[10px] sm:text-xs font-mono text-zinc-300 max-w-xl leading-relaxed">
                      Transcend into the next cosmic rebirth cycle. Monster HP and Damage across Acts I-VIII scale up, while your Character Level, AP, Attributes, Gear, Mutya Skills, Mounts, and Vault Stash remain intact!
                    </p>
                  </div>

                  <button
                    onClick={() => setShowNgPlusConfirm(true)}
                    className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-4 py-2 rounded-xl uppercase font-mono text-xs shadow-xl transition-all active:scale-95 shrink-0"
                  >
                    ⚡ Start NG+ {(player.ngPlusLevel || 0) + 1} Rebirth
                  </button>
                </div>
              )}

              {/* ── BAKUNAWA CELESTIAL RAID CARD ── */}
              <div
                className={`p-3 sm:p-4 rounded-2xl border transition-all relative overflow-hidden shadow-xl backdrop-blur-md ${
                  player.level >= 40
                    ? 'bg-purple-950/65 border-purple-500/70 shadow-purple-950/40'
                    : 'bg-zinc-950/65 border-purple-900/40'
                }`}
              >
                <div className="pointer-events-none absolute -right-8 -top-8 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">🌑</span>
                      <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-purple-300">
                        {player.level >= 40 ? 'Celestial Titan Raid' : '??? Cosmic Phenomenon'}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.2 rounded-full font-bold border ${
                          player.level >= 40
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800/50'
                            : 'bg-purple-950 text-purple-300 border-purple-800/40'
                        }`}
                      >
                        {player.level >= 40 ? '⚔️ Raid Chamber Open' : '🔒 Unlocks at Lv. 40'}
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-sm sm:text-base text-white tracking-wide">
                      {player.level >= 40
                        ? 'Bakunawa: The Great Moon-Devouring Serpent'
                        : '??? Celestial Eclipse Rift'}
                    </h4>

                    <p className="text-[10px] sm:text-[11px] font-mono text-zinc-300 leading-relaxed">
                      {player.level >= 40
                        ? 'The sky blackens as the cosmic serpent ascends from the abyss to swallow the seven moons. Defend the heavens in a multi-phase titan battle.'
                        : 'An ominous celestial rift pulses in the northern sky. Ancient astronomical tablets prophesy a beast that consumes celestial light.'}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center">
                    {player.level >= 40 ? (
                      <button
                        onClick={() => {
                          soundFX.playClick();
                          onNavigateToTitanRaid?.();
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-purple-950/60 active:scale-95 transition-all text-center min-h-[40px] flex items-center justify-center space-x-1.5"
                      >
                        <span>Challenge Bakunawa</span>
                        <span>➔</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-[10px] font-mono text-zinc-400">
                        <span>🔒</span>
                        <span>Requires Level 40 (Lv. {player.level}/40)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── REALM WAYSTONES (8 ACTS + ACT IX INFINITE SURVIVAL REALM) ── */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-2">
                  <span className="font-bold text-zinc-300 uppercase tracking-wider">Archipelago Realms</span>
                  <span>Pre-Colonial Territories</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {GAME_LOCATIONS.map((loc, idx) => {
                    const isInfiniteRealm = loc.id === 'loc_act_infinite';
                    const actRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][idx] || `${idx + 1}`;
                    const prevBossId = idx > 0 ? `boss_act_${idx}` : null;

                    const isUnlocked = isInfiniteRealm
                      ? Boolean(player.act8Completed || (player.completedBossIds || []).includes('boss_act_8') || (player.unlockedLocationIds || []).includes('loc_act_infinite'))
                      : idx === 0 || (player.unlockedLocationIds || []).includes(loc.id) || (prevBossId ? (player.completedBossIds || []).includes(prevBossId) : false);

                    const isCurrent = player.currentLocationId === loc.id;
                    const reqPower = calcRequiredActPower(loc.id, player.ngPlusLevel || 0);

                    // Realm thematic badges & icons
                    const actIcons = ['🌿', '🌊', '🕯️', '🌋', '🩸', '🔮', '⚡', '🌑', '🌌'];
                    const actIcon = actIcons[idx] || '🗺️';

                    if (!isUnlocked) {
                      // ── MYSTERIOUS SHROUDED TABLET (ANTI-SPOILER SAFE) ──
                      return (
                        <div
                          key={loc.id}
                          className="p-3 rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-between gap-3 text-zinc-500 transition-all hover:border-zinc-800"
                        >
                          <div className="flex items-center space-x-3 truncate">
                            <span className="text-xl opacity-30 shrink-0">🔒</span>
                            <div className="truncate space-y-0.5">
                              <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-600 font-bold">
                                Act {actRoman} • Shrouded Realm
                              </div>
                              <h4 className="font-serif font-bold text-xs text-zinc-400 truncate">
                                ??? Unknown Territory
                              </h4>
                              <p className="text-[9px] font-mono text-zinc-600 truncate">
                                {isInfiniteRealm
                                  ? 'Requires defeating Act VIII Guardian (Bakunawa) to unveil'
                                  : 'Veiled by ancestral mists until previous Act Guardian is slain'}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800 font-bold block">
                              🔒 {reqPower} Pwr
                            </span>
                            <span className="text-[8px] font-mono text-zinc-600 mt-0.5 block">
                              Lv. {loc.minLevel}+
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // ── DISCOVERED / ACTIVE REALM TABLET ──
                    return (
                      <div
                        key={loc.id}
                        className={`p-3 rounded-2xl border bg-zinc-950/70 backdrop-blur-md flex flex-col justify-between space-y-2 transition-all shadow-md ${
                          isCurrent
                            ? 'border-cyan-400 ring-1 ring-cyan-400/60 shadow-cyan-950/40'
                            : 'border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center space-x-2.5 truncate">
                            <span className="text-2xl shrink-0 p-1.5 rounded-xl bg-zinc-900/80 border border-zinc-700/50">
                              {actIcon}
                            </span>
                            <div className="truncate space-y-0.5">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[9px] font-mono uppercase font-bold text-cyan-400">
                                  Act {actRoman}
                                </span>
                                <span className="text-[9px] font-mono text-zinc-400 font-bold">
                                  • Lv. {loc.minLevel}{loc.bossLevelReq ? `–${loc.bossLevelReq}` : '+'}
                                </span>
                              </div>
                              <h4 className="font-serif font-bold text-xs sm:text-sm text-white truncate">
                                {loc.name}
                              </h4>
                              <div className="text-[9px] font-mono text-zinc-400 truncate">
                                {loc.subtitle || 'Mythical Philippine Territory'}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-[9px] font-mono px-2 py-0.5 rounded-full shrink-0 font-bold ${
                              isCurrent
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 animate-pulse'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                            }`}
                          >
                            {isCurrent ? '📍 Active Realm' : 'Discovered'}
                          </span>
                        </div>

                        {/* Action buttons: Lore Replay & Portal Travel */}
                        <div className="flex items-center space-x-2 pt-1 border-t border-zinc-800/60">
                          {!isInfiniteRealm && (
                            <button
                              onClick={() => {
                                soundFX.playClick();
                                setStoryLocation(loc);
                              }}
                              className="px-2.5 py-1.5 text-[10px] font-mono bg-zinc-900/80 hover:bg-zinc-800 text-amber-200 border border-amber-800/40 rounded-xl flex items-center space-x-1 shrink-0 transition-all active:scale-95"
                              title="Replay Realm Lore & Legend"
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
                            className={`flex-1 py-1.5 px-3 rounded-xl font-mono font-bold text-[10px] uppercase tracking-wider transition-all min-h-[32px] flex items-center justify-center space-x-1 shadow active:scale-95 ${
                              isCurrent
                                ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-zinc-950'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-cyan-800/40'
                            }`}
                          >
                            <span>{isCurrent ? '⚡ Enter Realm / Hunt' : '🌀 Travel Waystone'}</span>
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
        {/* DISTRICT 5: STASH (ROYAL VAULT)                                       */}
        {/* ===================================================================== */}
        {district === 'STASH' && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-2">
            <div className="flex justify-between items-center border-b border-zinc-800/60 pb-1.5 shrink-0">
              <span className="font-serif font-bold text-amber-200 text-xs">Royal Vault</span>

              <div className="flex items-center space-x-1 text-[10px] font-mono">
                <span className="text-zinc-500">Sort:</span>
                {(['POWER', 'TYPE', 'CLASS'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setStashSortMode(mode);
                      soundFX.playClick();
                    }}
                    className={`px-1.5 py-0.2 rounded font-bold transition-all backdrop-blur-sm ${
                      stashSortMode === mode
                        ? 'bg-amber-600 text-zinc-950 shadow'
                        : 'bg-zinc-800/80 text-zinc-400 hover:text-white border border-zinc-700/40'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-2 overflow-hidden">
              {/* Bag */}
              <div className="bg-zinc-950/70 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-2 flex flex-col overflow-hidden shadow-xl">
                <div className="flex justify-between items-center text-[10px] font-mono mb-1 shrink-0">
                  <span className="text-amber-300 font-bold">Backpack</span>
                  <span className="text-zinc-400">{player.inventory.length}/{derived.inventoryCapacity}</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                  {sortedInventory.length === 0 ? (
                    <div className="p-2 text-center text-zinc-600 font-mono text-[10px]">Empty</div>
                  ) : (
                    sortedInventory.map((item) => (
                      <div key={item.id} className="p-1.5 bg-zinc-900/60 hover:bg-zinc-800/70 backdrop-blur-sm border border-zinc-800/60 rounded-xl flex justify-between items-center text-[10px] font-mono">
                        <div className="truncate pr-1">
                          <span className="font-bold text-zinc-200 truncate block">{item.name}</span>
                          <span className="text-[9px] text-purple-400">⚡ {calcItemPowerRating(item)}</span>
                        </div>
                        <button
                          onClick={() => handleDepositToVault(item)}
                          className="px-2 py-0.5 bg-amber-600 text-zinc-950 font-bold rounded uppercase text-[9px] shrink-0"
                        >
                          Store
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Vault */}
              <div className="bg-zinc-950/70 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-2 flex flex-col overflow-hidden shadow-xl">
                <div className="flex justify-between items-center text-[10px] font-mono mb-1 shrink-0">
                  <span className="text-cyan-300 font-bold">Royal Vault</span>
                  <span className="text-zinc-400">{sortedStash.length}</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                  {sortedStash.length === 0 ? (
                    <div className="p-2 text-center text-zinc-600 font-mono text-[10px]">Empty</div>
                  ) : (
                    sortedStash.map((item) => (
                      <div key={item.id} className="p-1.5 bg-zinc-900/60 hover:bg-zinc-800/70 backdrop-blur-sm border border-zinc-800/60 rounded-xl flex justify-between items-center text-[10px] font-mono">
                        <div className="truncate pr-1">
                          <span className="font-bold text-zinc-200 truncate block">{item.name}</span>
                          <span className="text-[9px] text-cyan-400">⚡ {calcItemPowerRating(item)}</span>
                        </div>
                        <button
                          onClick={() => handleWithdrawFromVault(item)}
                          className="px-2 py-0.5 bg-cyan-600 text-zinc-950 font-bold rounded uppercase text-[9px] shrink-0"
                        >
                          Take
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* DISTRICT 6: STABLES                                                   */}
        {/* ===================================================================== */}
        {district === 'STABLES' && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-2">
            <div className="flex justify-between items-center border-b border-zinc-800/60 pb-1 shrink-0">
              <span className="font-serif font-bold text-amber-200 text-xs">Beastmaster Stables</span>
              {player.equipment.mount && (
                <div className="flex items-center space-x-1.5 text-[10px] font-mono">
                  <span className="text-emerald-400">Riding: {player.equipment.mount.name}</span>
                  <button
                    onClick={handleUnequipMount}
                    className="px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded text-[9px]"
                  >
                    Unequip
                  </button>
                </div>
              )}
            </div>

            {!player.act6Completed && !player.mountUnlocked ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-2 bg-zinc-950/60 backdrop-blur-md rounded-2xl border border-amber-900/40">
                <div className="text-3xl">🔒 🐃</div>
                <h4 className="font-serif font-bold text-amber-300 text-sm">Beastmaster Stables Sealed</h4>
                <p className="text-[10px] text-zinc-400 font-mono max-w-xs">
                  Slay the Act VI Guardian (Tambanokano, The Moon-Crusher) in Trench of the Abyssal Tide to unlock mythical mount taming.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
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
                      className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-2 transition-all shadow-md backdrop-blur-md ${
                        isEquipped
                          ? 'bg-zinc-950/75 border-emerald-500 ring-1 ring-emerald-500 shadow-emerald-950/40'
                          : isBonded
                          ? 'bg-zinc-950/70 border-cyan-800/60 shadow'
                          : 'bg-zinc-950/55 border-zinc-800/60'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-[9px] font-mono text-amber-400 font-bold uppercase">
                            Tier {mount.tier} • {mount.rarity}
                          </div>
                          <h4 className="font-serif font-bold text-xs sm:text-sm text-white">{mount.name}</h4>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800/40">
                          +{mount.baseDefense} Armor
                        </span>
                      </div>

                      <p className="text-[10px] font-mono text-zinc-400 bg-zinc-900/80 p-2 rounded-xl border border-zinc-850 leading-relaxed">
                        {mount.inherentPerk}
                      </p>

                      {/* Required Bonding Tribute & Mutya Cost */}
                      {!isBonded && (
                        <div className="flex items-center justify-between text-[10px] font-mono bg-zinc-950/60 px-2.5 py-1.5 rounded-xl border border-zinc-800">
                          <span className="text-zinc-400">Bonding Tribute:</span>
                          <div className="flex items-center space-x-1.5 font-bold">
                            <span className="text-amber-300">{price.formatted}</span>
                            {mutyaCost > 0 && (
                              <span className="text-purple-300 bg-purple-950/90 px-1.5 py-0.5 rounded-lg border border-purple-700/50">
                                +{mutyaCost} 🔮 Mutya
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="pt-1.5 border-t border-zinc-850">
                        {isEquipped ? (
                          <div className="w-full py-1.5 text-center font-mono font-bold text-[10px] text-emerald-400 bg-emerald-950/50 rounded-xl border border-emerald-800/50">
                            ✅ Active Mount
                          </div>
                        ) : isBonded ? (
                          <button
                            onClick={() => handleEquipMount(mount)}
                            className="w-full py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-zinc-950 font-mono font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow min-h-[36px]"
                          >
                            Equip Mount ➔
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBondMount(mount)}
                            disabled={!canBond}
                            className={`w-full py-2 rounded-xl font-mono font-bold text-[10px] uppercase tracking-wider transition-all min-h-[36px] ${
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
          isOpen={true}
          featureName={activeTutorial.name}
          steps={activeTutorial.steps}
          onClose={() => handleCompleteTutorial(activeTutorial.id)}
        />
      )}
    </div>
  );
};

export default HavenView;

