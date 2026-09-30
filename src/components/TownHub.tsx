import React, { useState, useRef } from 'react';
import { PlayerCharacter, EquipmentItem, ConsumableItem, Bounty, GameLocation, HeroClass } from '../types/game';
import { UPPER_ARMORS, LOWER_ARMORS, DAGGERS, SWORDS, BOWS, STAVES, MOUNTS, CONSUMABLES, ENCHANTER_PREFIXES, ENCHANTER_SUFFIXES, GAME_LOCATIONS } from '../data/equipmentData';
import { calcDerivedStats, formatCostInCC, totalCopperFromWallet, totalCowriesFromWallet, cowriesToWallet, processExpGain, formatCostInCowries, formatCowriesShort, calcMaxStamina } from '../utils/gameFormulas';
import { getScaledForgeCatalog } from '../utils/equipmentGenerator';
import { soundFX } from '../utils/audio';
import FeatureTutorialModal, { TutorialStep } from './FeatureTutorialModal';
import { ConfirmModal } from './ConfirmModal';

type DistrictTab = 'TAVERN' | 'FORGE' | 'ALCHEMIST' | 'STABLES' | 'GATE' | 'STASH';
type ForgeCategoryFilter = 'ALL' | 'WEAPONS' | 'ARMOR' | 'DAGGERS' | 'SWORDS' | 'BOWS' | 'STAVES' | 'UPPER' | 'LOWER';

interface TownHubProps {
  player: PlayerCharacter;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onNavigateToWorld: () => void;
  onNavigateToTitanRaid?: () => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error', icon?: string) => void;
  activeDistrictOverride?: {
    district: DistrictTab;
    key: number;
  } | null;
}

export const TownHub: React.FC<TownHubProps> = ({ player, onUpdatePlayer, onNavigateToWorld, onNavigateToTitanRaid, onShowToast, activeDistrictOverride }) => {
  const [activeDistrict, setActiveDistrict] = useState<DistrictTab>('TAVERN');

  const notify = (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', icon?: string) => {
    onShowToast?.(msg, type, icon);
  };

  React.useEffect(() => {
    if (activeDistrictOverride?.district) {
      setActiveDistrict(activeDistrictOverride.district);
    }
  }, [activeDistrictOverride?.key, activeDistrictOverride?.district]);

  React.useEffect(() => {
    if (activeDistrict === 'TAVERN') {
      const unlockedRestCount = REST_OPTIONS.filter((o) => player.level >= o.minLevel).length;
      if (unlockedRestCount >= 2 && !(player.tutorialsSeen ?? []).includes('tut_rest_tiers')) {
        setActiveTutorial({
          id: 'tut_rest_tiers',
          name: 'Shaman Rest Deck',
          steps: [
            {
              title: 'New Shaman Resting Tier Unlocked!',
              icon: '🛌',
              description: 'As your hero levels up and conquers new regional Acts, higher-tier Shaman resting quarters become unlocked at Haven Citadel Inn!',
              tip: 'Use the ◀ / ▶ controls or tap the stacked cards on the Resting Deck to flip between budget mats and premium shaman baths.',
            },
          ],
        });
      }
    }
  }, [activeDistrict, player.level, player.tutorialsSeen]);
  const [selectedEnchantItem, setSelectedEnchantItem] = useState<EquipmentItem | null>(null);
  const [showBountyBoard, setShowBountyBoard] = useState<boolean>(false);
  const [bountyBoardTab, setBountyBoardTab] = useState<'AVAILABLE' | 'COMPLETED'>('AVAILABLE');
  const [activeRestCardIndex, setActiveRestCardIndex] = useState<number>(0);
  const restCarouselRef = useRef<HTMLDivElement>(null);
  const [activeTutorial, setActiveTutorial] = useState<{ id: string; name: string; steps: TutorialStep[] } | null>(null);

  const handleSelectDistrict = (tab: DistrictTab) => {
    setActiveDistrict(tab);
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
    setShowBountyBoard(true);
    if (!(player.tutorialsSeen ?? []).includes('tut_bounties')) {
      setActiveTutorial({
        id: 'tut_bounties',
        name: 'Poblacion Bounty Board',
        steps: [
          {
            title: 'Monster Bounties System',
            icon: '📜',
            description: 'Accept contracts from the Poblacion Sanctuary Notice Board to slay specific monsters for Cowries, EXP, and Mutya Shards.',
            tip: 'You can hold up to 3 active bounties concurrently. Level 3 character required.',
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

  // Forge Store State
  const [forgeCategory, setForgeCategory] = useState<ForgeCategoryFilter>('ALL');
  const [filterByHeroClassOnly, setFilterByHeroClassOnly] = useState<boolean>(true);
  const [inspectedShopItem, setInspectedShopItem] = useState<EquipmentItem | null>(null);
  const [selectedForgeItemId, setSelectedForgeItemId] = useState<string | null>(null);

  // Alchemist Apothecary State
  const [alchemistCategory, setAlchemistCategory] = useState<'ALL' | 'VITALITY' | 'ELIXIR' | 'PANACEA'>('ALL');
  const [showNgPlusConfirm, setShowNgPlusConfirm] = useState<boolean>(false);

  const handleConfirmRebirth = () => {
    soundFX.playLevelUpSound();
    const nextNgLevel = (player.ngPlusLevel || 0) + 1;

    onUpdatePlayer({
      ...player,
      ngPlusLevel: nextNgLevel,
      currentLocationId: 'loc_act_1',
      unlockedLocationIds: ['loc_act_1'],
      sideQuests: [],
      forfeitedQuestIds: [],
      completedBossIds: [],
      wallet: cowriesToWallet(100, 0),
    });

    setShowNgPlusConfirm(false);
    notify(`🌟 ANITO CYCLE REBIRTH COMPLETE! Advanced to New Game+ ${nextNgLevel}! All Acts reset with scaled monster power. Your stats and gear remain!`, 'success', '🌟');
  };

  const derived = calcDerivedStats(player.attributes, player.level, player.equipment);

interface RestOption {
  actId: string;
  actName: string;
  title: string;
  minLevel: number;
  costInCC: number;
  hpPercent: number;
  mpPercent: number;
  staminaRestore: number;
  description: string;
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
    description: 'A cozy straw mat by the hearth fire. Restores 30% HP, 30% MP, and +4 Stamina.',
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
    description: 'Soak in warm coastal sea salts. Restores 45% HP, 45% MP, and +7 Stamina.',
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
    description: 'Inhale purifying mountain herb steam. Restores 60% HP, 60% MP, and +10 Stamina.',
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
    description: 'Bathe in mineral volcanic springs. Restores 75% HP, 75% MP, and +13 Stamina.',
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
    description: 'Anoint with sacred coconut oils. Restores 85% HP, 85% MP, and +16 Stamina.',
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
    description: 'Rest inside a glowing pearl chamber. Restores 90% HP, 90% MP, and +18 Stamina.',
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
    description: 'Meditate in the sky pavilion. Restores 95% HP, 95% MP, and +19 Stamina.',
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
    description: 'Supreme eclipse ritual bath. Fully restores HP, MP, +20 Stamina & cleanses all debuffs.',
  },
];

  // Rest handler for 8-Act Tiered Rest Options
  const handleRestOption = (option: RestOption) => {
    const maxStam = calcMaxStamina(player.level);
    const curStam = player.stamina ?? maxStam;
    const isFullyRestored = player.currentHp >= derived.maxHp && player.currentMp >= derived.maxMp && curStam >= maxStam;

    if (isFullyRestored) {
      notify("✨ You are already at 100% Health, Mana, and Stamina! Rest is not required.", 'info', '✨');
      return;
    }

    const playerTotalCC = totalCopperFromWallet(player.wallet);
    if (playerTotalCC < option.costInCC) {
      notify(`Insufficient funds! ${option.title} requires ${formatCostInCowries(option.costInCC)}. (You have ${formatCowriesShort(player.wallet)})`, 'error', '💰');
      return;
    }

    soundFX.playPotionSound();
    const remainingCC = playerTotalCC - option.costInCC;
    const newWallet = cowriesToWallet(remainingCC, player.wallet.mutyaShards || player.wallet.prismaticShards || 0);

    const newHp = Math.min(derived.maxHp, player.currentHp + Math.floor(derived.maxHp * option.hpPercent));
    const newMp = Math.min(derived.maxMp, player.currentMp + Math.floor(derived.maxMp * option.mpPercent));

    onUpdatePlayer({
      ...player,
      currentHp: newHp,
      currentMp: newMp,
      stamina: Math.min(maxStam, curStam + option.staminaRestore),
      activeEffects: [],
      wallet: newWallet,
    });

    notify(`Rested at ${option.title}! Restored HP (+${Math.floor(derived.maxHp * option.hpPercent)}), MP (+${Math.floor(derived.maxMp * option.mpPercent)}), and +${option.staminaRestore} Stamina.`, 'success', '✨');
  };

  const handleAcceptBounty = (bountyId: string) => {
    if (player.level < 3) {
      notify('🔒 Bounties Locked! Reach Character Level 3 to unlock the Bounty Notice Board.', 'warning', '🔒');
      return;
    }
    const activeCount = (player.bounties || []).filter((b) => b.isAccepted && !b.isClaimed).length;
    if (activeCount >= 3) {
      notify('⚠️ Maximum 3 Active Bounties! You can only accept 3 bounties concurrently. Complete or abandon an active contract before accepting another.', 'warning', '⚠️');
      return;
    }
    soundFX.playClickSound();
    const updatedBounties = player.bounties.map((b) =>
      b.id === bountyId ? { ...b, isAccepted: true } : b
    );
    onUpdatePlayer({ ...player, bounties: updatedBounties });
    notify('📜 Contract Accepted! Check your Active Quest & Bounty Journal under Log & Chat tab.', 'success', '📜');
  };

  const handleAbandonBounty = (bountyId: string) => {
    soundFX.playClickSound();
    const updatedBounties = player.bounties.map((b) =>
      b.id === bountyId ? { ...b, isAccepted: false, currentCount: 0 } : b
    );
    onUpdatePlayer({ ...player, bounties: updatedBounties });
  };

  const handleClaimBounty = (bounty: Bounty) => {
    if (!bounty.isCompleted || bounty.isClaimed) return;

    soundFX.playLevelUpSound();

    const newMemories = [
      ...player.encryptedMemories,
      {
        id: `bounty_mem_${Date.now()}`,
        name: `Bounty Memory (${bounty.rewardMemoryRarity})`,
        rarity: bounty.rewardMemoryRarity,
        minLevel: player.level,
        acquiredAtLocation: player.currentLocationId,
      },
    ];

    const updatedBounties = player.bounties.map((b) =>
      b.id === bounty.id ? { ...b, isClaimed: true } : b
    );

    const rewardCowries = bounty.rewardCowries ?? bounty.rewardCC ?? 150;
    const currentTotalCowries = totalCowriesFromWallet(player.wallet);
    const updatedWallet = cowriesToWallet(currentTotalCowries + rewardCowries);
    updatedWallet.mutyaShards = (player.wallet.mutyaShards || 0) + 1;
    updatedWallet.prismaticShards = updatedWallet.mutyaShards;

    const expResult = processExpGain(player.level, player.exp, bounty.rewardExp);

    onUpdatePlayer({
      ...player,
      level: expResult.newLevel,
      exp: expResult.newExp,
      availableAP: player.availableAP + expResult.apGained,
      encryptedMemories: newMemories,
      bounties: updatedBounties,
      wallet: updatedWallet,
    });

    const memText = `💎 1x Encrypted Memory (${bounty.rewardMemoryRarity})`;
    if (expResult.levelsGained > 0) {
      notify(`🎉 Bounty Claimed! Earned +${bounty.rewardExp} EXP, +${rewardCowries} Cowrie Shells, 1x Mutya Shard, and ${memText}!\n\n(Visit Inventory -> Memories to decrypt gear!)\n\n🌟 LEVEL UP! Reached Level ${expResult.newLevel}! Earned +${expResult.apGained} Attribute Points. EXP reset to 0.`, 'success', '🎉');
    } else {
      notify(`🎉 Bounty Claimed! Earned +${bounty.rewardExp} EXP, +${rewardCowries} Cowrie Shells, 1x Mutya Shard, and ${memText}!\n\n(Visit Inventory -> Memories to decrypt gear!)`, 'success', '🎉');
    }
  };

  const handleBuyItem = (item: EquipmentItem | ConsumableItem) => {
    const playerTotalCC = totalCowriesFromWallet(player.wallet);

    if (playerTotalCC < item.costInCC) {
      notify('Insufficient currency to purchase this item!', 'error', '🪙');
      return;
    }

    if (player.inventory.length >= derived.inventoryCapacity) {
      notify('Inventory capacity reached! Move items to Stash or unequip/salvage first.', 'warning', '🎒');
      return;
    }

    soundFX.playCoinSound();

    const remainingCC = playerTotalCC - item.costInCC;
    const updatedWallet = cowriesToWallet(remainingCC, player.wallet.mutyaShards || player.wallet.prismaticShards || 0);

    onUpdatePlayer({
      ...player,
      inventory: [...player.inventory, { ...item, id: `bought_${Date.now()}_${Math.random()}` }],
      wallet: updatedWallet,
    });
  };

  const handleBuyMultipleConsumables = (item: ConsumableItem, count: number = 5) => {
    const totalCost = item.costInCC * count;
    const playerTotalCC = totalCowriesFromWallet(player.wallet);

    if (playerTotalCC < totalCost) {
      notify(`Insufficient currency for ${count}x ${item.name}! (Requires ${formatCostInCC(totalCost)})`, 'error', '🪙');
      return;
    }

    if (player.inventory.length + count > derived.inventoryCapacity) {
      notify(`Not enough inventory space for ${count} potions!`, 'warning', '🎒');
      return;
    }

    soundFX.playCoinSound();

    const remainingCC = playerTotalCC - totalCost;
    const updatedWallet = cowriesToWallet(remainingCC, player.wallet.mutyaShards || player.wallet.prismaticShards || 0);

    const brewedItems = Array.from({ length: count }, (_, i) => ({
      ...item,
      id: `bought_${Date.now()}_${i}_${Math.random()}`,
    }));

    onUpdatePlayer({
      ...player,
      inventory: [...player.inventory, ...brewedItems],
      wallet: updatedWallet,
    });

    notify(`🧪 Successfully brewed ${count}x ${item.name}! Added to Inventory.`, 'success', '🧪');
  };
  const calcMutyaBreakRisk = (attempts: number): { breakRisk: number; isTooFragile: boolean } => {
    const risks = [5, 15, 30, 50, 80];
    if (attempts >= 5) {
      return { breakRisk: 100, isTooFragile: true };
    }
    return { breakRisk: risks[attempts], isTooFragile: false };
  };

  const calcMutyaCost = (attempts: number): number => {
    // Attempt 1 (0 prev): 1 Mutya
    // Attempt 2 (1 prev): 1 Mutya
    // Attempt 3 (2 prev): 2 Mutya
    // Attempt 4 (3 prev): 2 Mutya
    // Attempt 5 (4 prev): 3 Mutya
    const costs = [1, 1, 2, 2, 3];
    return costs[Math.min(attempts, 4)];
  };

  const [confirmBlessingData, setConfirmBlessingData] = useState<{
    item: EquipmentItem;
    requiredMutya: number;
    breakRisk: number;
    currentAttempts: number;
    currentMutya: number;
  } | null>(null);

  const handleRerollEnchantment = () => {
    if (!selectedEnchantItem) return;

    const currentMutya = player.wallet.mutyaShards ?? player.wallet.prismaticShards ?? 0;
    const currentAttempts = selectedEnchantItem.blessingAttempts || 0;
    const { breakRisk, isTooFragile } = calcMutyaBreakRisk(currentAttempts);
    const requiredMutya = calcMutyaCost(currentAttempts);

    if (isTooFragile) {
      notify(
        `⛔ EQUIPMENT HAS BECOME TOO FRAGILE TO ATTEMPT!\n\n` +
        `[${selectedEnchantItem.name}] has been blessed ${currentAttempts} times and reached maximum structural brittleness.\n\n` +
        `Further Mutya blessing is no longer possible because it has a 100% chance to break into dust.`,
        'error',
        '⛔'
      );
      return;
    }

    if (currentMutya < requiredMutya) {
      notify(`Insufficient Mutya Shards! Blessing attempt #${currentAttempts + 1} requires ${requiredMutya} Mutya Shard(s). (You have ${currentMutya})`, 'warning', '🔮');
      return;
    }

    setConfirmBlessingData({
      item: selectedEnchantItem,
      requiredMutya,
      breakRisk,
      currentAttempts,
      currentMutya,
    });
  };

  const executeMutyaBlessing = () => {
    if (!confirmBlessingData) return;
    const { item, requiredMutya, breakRisk, currentAttempts, currentMutya } = confirmBlessingData;
    setConfirmBlessingData(null);

    const newMutya = Math.max(0, currentMutya - requiredMutya);

    // Roll for Destruction Failure
    const isDestroyed = Math.random() * 100 < breakRisk;

    if (isDestroyed) {
      soundFX.playDefeatSound();

      const updatedInventory = player.inventory.filter((inv) => inv.id !== item.id);
      let updatedEquipment = { ...player.equipment };
      if (updatedEquipment.upperArmor?.id === item.id) updatedEquipment.upperArmor = null;
      if (updatedEquipment.lowerArmor?.id === item.id) updatedEquipment.lowerArmor = null;
      if (updatedEquipment.weapon?.id === item.id) updatedEquipment.weapon = null;
      if (updatedEquipment.primaryWeapon?.id === item.id) updatedEquipment.primaryWeapon = null;
      if (updatedEquipment.mount?.id === item.id) updatedEquipment.mount = null;
      if (updatedEquipment.bike?.id === item.id) updatedEquipment.bike = null;

      onUpdatePlayer({
        ...player,
        equipment: updatedEquipment,
        inventory: updatedInventory,
        wallet: {
          ...player.wallet,
          mutyaShards: newMutya,
          prismaticShards: newMutya,
        },
      });

      const destroyedName = item.name;
      setSelectedEnchantItem(null);
      notify(`💥 RITUAL FAILED (${breakRisk}% Break Risk)! The surge of primordial Mutya energy shattered [${destroyedName}] into glowing dust! The item has been destroyed.`, 'error', '💥');
      return;
    }

    // Success! Roll affixes based on category
    soundFX.playSpellSound();

    const isWeapon = ['DAGGER', 'SWORD', 'BOW', 'STAFF'].includes(item.category);
    let chosenPrefix: typeof ENCHANTER_PREFIXES[0];
    let chosenSuffix: typeof ENCHANTER_SUFFIXES[0];

    if (isWeapon) {
      if (Math.random() < 0.5) {
        const attrPrefixes = ENCHANTER_PREFIXES.filter((p) => !p.statusInfliction && !p.statusMitigation);
        const inflictionSuffixes = ENCHANTER_SUFFIXES.filter((s) => s.statusInfliction);
        chosenPrefix = attrPrefixes[Math.floor(Math.random() * attrPrefixes.length)] || ENCHANTER_PREFIXES[0];
        chosenSuffix = inflictionSuffixes[Math.floor(Math.random() * inflictionSuffixes.length)] || ENCHANTER_SUFFIXES[0];
      } else {
        const attrPrefixes = ENCHANTER_PREFIXES.filter((p) => !p.statusInfliction && !p.statusMitigation);
        const attrSuffixes = ENCHANTER_SUFFIXES.filter((s) => !s.statusInfliction && !s.statusMitigation);
        chosenPrefix = attrPrefixes[Math.floor(Math.random() * attrPrefixes.length)] || ENCHANTER_PREFIXES[0];
        chosenSuffix = attrSuffixes[Math.floor(Math.random() * attrSuffixes.length)] || ENCHANTER_SUFFIXES[0];
      }
    } else {
      if (Math.random() < 0.5) {
        const mitigationPrefixes = ENCHANTER_PREFIXES.filter((p) => p.statusMitigation);
        const attrSuffixes = ENCHANTER_SUFFIXES.filter((s) => !s.statusInfliction && !s.statusMitigation);
        chosenPrefix = mitigationPrefixes[Math.floor(Math.random() * mitigationPrefixes.length)] || ENCHANTER_PREFIXES[0];
        chosenSuffix = attrSuffixes[Math.floor(Math.random() * attrSuffixes.length)] || ENCHANTER_SUFFIXES[0];
      } else {
        const attrPrefixes = ENCHANTER_PREFIXES.filter((p) => !p.statusInfliction && !p.statusMitigation);
        const attrSuffixes = ENCHANTER_SUFFIXES.filter((s) => !s.statusInfliction && !s.statusMitigation);
        chosenPrefix = attrPrefixes[Math.floor(Math.random() * attrPrefixes.length)] || ENCHANTER_PREFIXES[0];
        chosenSuffix = attrSuffixes[Math.floor(Math.random() * attrSuffixes.length)] || ENCHANTER_SUFFIXES[0];
      }
    }

    // 45% Chance to trigger a Sacred Mutya Stat Surge (increasing base damage or base armor)
    let newBaseDefense = item.baseDefense;
    let newBaseDamageMin = item.baseDamageMin;
    let newBaseDamageMax = item.baseDamageMax;
    let statSurgeMsg = '';

    const rollStatSurge = Math.random() < 0.45;
    if (rollStatSurge) {
      if (isWeapon && item.baseDamageMin !== undefined && item.baseDamageMax !== undefined) {
        const minBoost = Math.max(1, Math.round(item.baseDamageMin * 0.12));
        const maxBoost = Math.max(2, Math.round(item.baseDamageMax * 0.12));
        newBaseDamageMin = item.baseDamageMin + minBoost;
        newBaseDamageMax = item.baseDamageMax + maxBoost;
        statSurgeMsg = `\n⚔️ BASE DAMAGE INCREASED! (+${minBoost} Min Dmg, +${maxBoost} Max Dmg)`;
      } else if (item.baseDefense !== undefined && item.baseDefense > 0) {
        const armorBoost = Math.max(1, Math.round(item.baseDefense * 0.12));
        newBaseDefense = item.baseDefense + armorBoost;
        statSurgeMsg = `\n🛡️ BASE ARMOR INCREASED! (+${armorBoost} Base Defense)`;
      }
    }

    const cleanBaseName = item.name.replace(/.*?\s(.*)/, '$1');
    const updatedItem: EquipmentItem = {
      ...item,
      name: `${chosenPrefix.name} ${cleanBaseName} ${chosenSuffix.name}`,
      baseDefense: newBaseDefense,
      baseDamageMin: newBaseDamageMin,
      baseDamageMax: newBaseDamageMax,
      affixes: [chosenPrefix, chosenSuffix],
      blessingAttempts: currentAttempts + 1,
    };

    const updatedInventory = player.inventory.map((inv) =>
      inv.id === item.id ? updatedItem : inv
    );

    let updatedEquipment = { ...player.equipment };
    if (updatedEquipment.upperArmor?.id === item.id) updatedEquipment.upperArmor = updatedItem;
    if (updatedEquipment.lowerArmor?.id === item.id) updatedEquipment.lowerArmor = updatedItem;
    if (updatedEquipment.weapon?.id === item.id) updatedEquipment.weapon = updatedItem;
    if (updatedEquipment.primaryWeapon?.id === item.id) updatedEquipment.primaryWeapon = updatedItem;
    if (updatedEquipment.mount?.id === item.id) updatedEquipment.mount = updatedItem;
    if (updatedEquipment.bike?.id === item.id) updatedEquipment.bike = updatedItem;

    onUpdatePlayer({
      ...player,
      equipment: updatedEquipment,
      inventory: updatedInventory,
      wallet: {
        ...player.wallet,
        mutyaShards: newMutya,
        prismaticShards: newMutya,
      },
    });

    setSelectedEnchantItem(updatedItem);
    const nextRisk = 5 + (currentAttempts + 1) * 5;
    notify(`✨ Mutya Blessing Success! Applied to ${updatedItem.name}!${statSurgeMsg}\nPrefix: ${chosenPrefix.name}, Suffix: ${chosenSuffix.name}.\n(Next blessing risk: ${nextRisk}%)`, 'success', '✨');
  };

  const handleMoveToStash = (item: EquipmentItem | ConsumableItem) => {
    const newInventory = player.inventory.filter((i) => i.id !== item.id);
    const newStash = [...(player.stash || []), item];

    onUpdatePlayer({
      ...player,
      inventory: newInventory,
      stash: newStash,
    });
    soundFX.playCoinSound();
  };

  const handleWithdrawFromStash = (item: EquipmentItem | ConsumableItem) => {
    if (player.inventory.length >= derived.inventoryCapacity) {
      notify('Inventory is full! Free up space first.', 'warning', '🎒');
      return;
    }

    const newStash = (player.stash || []).filter((i) => i.id !== item.id);
    const newInventory = [...player.inventory, item];

    onUpdatePlayer({
      ...player,
      inventory: newInventory,
      stash: newStash,
    });
    soundFX.playCoinSound();
  };

  // POST-ACT 6 BEASTMASTER STABLES HANDLERS
  const handleBuyMount = (mount: EquipmentItem) => {
    const totalCowries = totalCowriesFromWallet(player.wallet);
    const cost = mount.costInCC || 10000;

    if (totalCowries < cost) {
      notify(`Insufficient funds! ${mount.name} requires ${formatCostInCowries(cost)}. (You have ${formatCowriesShort(player.wallet)})`, 'error', '🪙');
      return;
    }

    if (player.inventory.length >= derived.inventoryCapacity) {
      notify('Inventory capacity reached! Free up space in your bag first.', 'warning', '🎒');
      return;
    }

    soundFX.playCoinSound();

    const newTotalCowries = totalCowries - cost;
    const updatedWallet = cowriesToWallet(newTotalCowries, player.wallet.mutyaShards || player.wallet.prismaticShards || 0);

    let updatedEquipment = { ...player.equipment };
    let updatedInventory = [...player.inventory];

    if (!updatedEquipment.mount && !updatedEquipment.bike) {
      updatedEquipment.mount = mount;
      updatedEquipment.bike = mount;
      notify(`🐃 Beast Tamed! You tamed and equipped the [${mount.name}]!`, 'success', '🐃');
    } else {
      updatedInventory.push(mount);
      notify(`🐃 Beast Tamed! You purchased the [${mount.name}]! It is now in your gear bag.`, 'success', '🐃');
    }

    onUpdatePlayer({
      ...player,
      equipment: updatedEquipment,
      inventory: updatedInventory,
      wallet: updatedWallet,
    });
  };

  const handleEquipMountFromStables = (mount: EquipmentItem) => {
    soundFX.playClickSound();
    const prevMount = player.equipment.mount || player.equipment.bike || null;
    let newInventory = player.inventory.filter((i) => i.id !== mount.id);
    if (prevMount) {
      newInventory.push(prevMount);
    }
    onUpdatePlayer({
      ...player,
      equipment: {
        ...player.equipment,
        mount: mount,
        bike: mount,
      },
      inventory: newInventory,
    });
  };

  const handleUnequipMount = () => {
    const currentMount = player.equipment.mount || player.equipment.bike;
    if (!currentMount) return;
    if (player.inventory.length >= derived.inventoryCapacity) {
      notify('Cannot unequip mount: inventory is full!', 'warning', '🎒');
      return;
    }
    soundFX.playClickSound();
    onUpdatePlayer({
      ...player,
      equipment: {
        ...player.equipment,
        mount: null,
        bike: null,
      },
      inventory: [...player.inventory, currentMount],
    });
  };
  const getEquippedItemForShopItem = (shopItem: EquipmentItem): EquipmentItem | null => {
    if (shopItem.category === 'UPPER') return player.equipment.upperArmor || null;
    if (shopItem.category === 'LOWER') return player.equipment.lowerArmor || null;
    if (['DAGGER', 'SWORD', 'BOW', 'STAFF'].includes(shopItem.category)) {
      return player.equipment.weapon ?? player.equipment.primaryWeapon ?? null;
    }
    return null;
  };

  // DYNAMIC LEVEL-SCALED FORGE EQUIPMENT CATALOG (STAT UPGRADES ONLY)
  const rawForgeItems = getScaledForgeCatalog(
    player.level,
    player.heroClass as HeroClass,
    forgeCategory,
    filterByHeroClassOnly
  );

  const filteredForgeItems = rawForgeItems.filter((item) => {
    const equipped = getEquippedItemForShopItem(item);
    if (!equipped) return true;
    if (item.baseDefense !== undefined && equipped.baseDefense !== undefined) {
      return item.baseDefense > equipped.baseDefense;
    }
    if (item.baseDamageMax !== undefined && equipped.baseDamageMax !== undefined) {
      return item.baseDamageMax > equipped.baseDamageMax;
    }
    return true;
  });

  const renderItemComparison = (shopItem: EquipmentItem) => {
    const equipped = getEquippedItemForShopItem(shopItem);
    if (!equipped) return <span className="text-emerald-400 font-mono text-[10px] font-bold">✨ New Slot Gear</span>;

    if (shopItem.baseDefense !== undefined) {
      const eqDef = equipped.baseDefense || 0;
      const diff = shopItem.baseDefense - eqDef;
      if (diff > 0) return <span className="text-emerald-400 font-mono text-[10px] font-bold">📈 +{diff} Armor vs Equipped</span>;
      if (diff < 0) return <span className="text-rose-400 font-mono text-[10px] font-bold">📉 {diff} Armor vs Equipped</span>;
      return <span className="text-zinc-500 font-mono text-[10px]">➡️ Equal Armor</span>;
    }

    if (shopItem.baseDamageMin !== undefined && shopItem.baseDamageMax !== undefined) {
      const shopAvg = (shopItem.baseDamageMin + shopItem.baseDamageMax) / 2;
      const eqAvg = equipped.baseDamageMin && equipped.baseDamageMax ? (equipped.baseDamageMin + equipped.baseDamageMax) / 2 : 0;
      const diff = Math.round(shopAvg - eqAvg);
      if (diff > 0) return <span className="text-emerald-400 font-mono text-[10px] font-bold">📈 +{diff} Avg Atk vs Equipped</span>;
      if (diff < 0) return <span className="text-rose-400 font-mono text-[10px] font-bold">📉 {diff} Avg Atk vs Equipped</span>;
      return <span className="text-zinc-500 font-mono text-[10px]">➡️ Equal Atk</span>;
    }

    return null;
  };

  // Filter bounties based on current player level and unlocked acts
  const unlockedLocationIds = GAME_LOCATIONS.filter((l) => player.level >= l.minLevel).map((l) => l.id);

  // Eligible bounties for current level and unlocked acts (not yet claimed)
  const eligibleBounties = (player.bounties || []).filter((b) => {
    if (b.isClaimed) return false;
    const minLvl = b.minLevel ?? 1;
    if (player.level < minLvl) return false;
    if (b.actId && !unlockedLocationIds.includes(b.actId)) return false;
    return true;
  });

  // Pick up to 3 bounties to show at a time:
  // Active bounties managed in Log & Chat / Journal; Notice Board displays unaccepted contracts only
  const activeAcceptedBounties = eligibleBounties.filter((b) => b.isAccepted && !b.isClaimed);
  const availableBounties = eligibleBounties.filter((b) => !b.isAccepted && !b.isClaimed);
  const displayedBounties: Bounty[] = availableBounties.slice(0, 3);

  // Completed bounties for the Completed tab
  const completedBounties = (player.bounties || []).filter((b) => b.isClaimed);

  // Find next locked bounty to tell the player when more become available
  const nextLockedBounty = (player.bounties || []).find((b) => !b.isClaimed && (b.minLevel ?? 1) > player.level);

  const inherentPerkInInspect = (item: EquipmentItem) => {
    if (!item.inherentPerk) return null;
    return (
      <div className="flex justify-between border-b border-zinc-800/40 pb-1">
        <span className="text-zinc-400">Special Inherent Perk:</span>
        <strong className="text-purple-300">{item.inherentPerk}</strong>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-amber-100 p-2 md:p-6 space-y-2.5 md:space-y-4 overflow-y-auto">
      {/* Town Banner */}
      <div data-tutorial-target="town-banner" className="bg-zinc-900/90 border border-amber-900/50 rounded-lg md:rounded-xl p-2.5 md:p-4 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-3">
        <div>
          <div className="text-[9px] md:text-[10px] font-mono uppercase text-amber-500 tracking-widest font-semibold">SAFE ZONE • PRE-COLONIAL SANCTUARY</div>
          <h2 className="text-lg md:text-2xl font-bold font-serif text-amber-200">Poblacion Sanctuary</h2>
          <p className="text-[11px] md:text-xs text-zinc-400 mt-0.5 line-clamp-2 md:line-clamp-none">
            Pre-colonial sanctuary hub of the archipelago. Stamina regenerates, Panday Pira crafts, Shaman brews potions, and Datu guards the vault.
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <button
            onClick={() => {
              const seen = (player.tutorialsSeen ?? []).filter((t) => t !== 'tut_onboarding');
              onUpdatePlayer({ ...player, tutorialsSeen: seen });
            }}
            className="flex-1 md:flex-none bg-zinc-800 hover:bg-zinc-700 text-amber-300 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg border border-amber-500/30 text-[10px] md:text-xs font-mono font-bold transition-all min-h-[32px] md:min-h-[36px]"
            title="Replay 14-Step Interactive Onboarding Tutorial"
          >
            ❓ Replay Tutorial
          </button>
          <div className="bg-zinc-950 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg border border-amber-500/30 text-[10px] md:text-xs font-mono text-emerald-400 font-bold min-h-[32px] md:min-h-[36px] flex items-center justify-center">
            ⚡ Stamina Restored
          </div>
        </div>
      </div>

      {/* HAVEN DISTRICT ACTION PAD — Positioned directly below Poblacion Sanctuary Banner */}
      <div className="bg-zinc-950 border border-amber-900/60 p-1.5 md:p-3 rounded-lg md:rounded-xl shadow-2xl">
        <div className="text-[8px] md:text-[10px] font-mono text-amber-500 uppercase font-semibold mb-1 text-center md:text-left tracking-wider">
          HAVEN DISTRICT ACTION PAD
        </div>
        <div className={`grid grid-cols-3 ${player.act6Completed || player.mountUnlocked ? 'md:grid-cols-6' : 'md:grid-cols-5'} gap-1 md:gap-2`}>
          <button
            onClick={() => handleSelectDistrict('TAVERN')}
            className={`py-1.5 px-1.5 md:py-2.5 md:px-3 rounded-md md:rounded-lg border font-mono text-[10px] md:text-xs font-bold uppercase transition-all flex items-center justify-center space-x-1 min-h-[36px] ${
              activeDistrict === 'TAVERN'
                ? 'bg-amber-600 text-zinc-950 border-amber-400 shadow-md ring-1 ring-amber-400'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-amber-600/50'
            }`}
          >
            <span className="text-xs md:text-base">🍺</span>
            <span className="truncate">Tavern</span>
          </button>

          <button
            data-tutorial-target="district-forge"
            onClick={() => handleSelectDistrict('FORGE')}
            className={`py-1.5 px-1.5 md:py-2.5 md:px-3 rounded-md md:rounded-lg border font-mono text-[10px] md:text-xs font-bold uppercase transition-all flex items-center justify-center space-x-1 min-h-[36px] ${
              activeDistrict === 'FORGE'
                ? 'bg-amber-600 text-zinc-950 border-amber-400 shadow-md ring-1 ring-amber-400'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-amber-600/50'
            }`}
          >
            <span className="text-xs md:text-base">⚒️</span>
            <span className="truncate">Forge</span>
          </button>

          <button
            data-tutorial-target="district-alchemist"
            onClick={() => handleSelectDistrict('ALCHEMIST')}
            className={`py-1.5 px-1.5 md:py-2.5 md:px-3 rounded-md md:rounded-lg border font-mono text-[10px] md:text-xs font-bold uppercase transition-all flex items-center justify-center space-x-1 min-h-[36px] ${
              activeDistrict === 'ALCHEMIST'
                ? 'bg-amber-600 text-zinc-950 border-amber-400 shadow-md ring-1 ring-amber-400'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-amber-600/50'
            }`}
          >
            <span className="text-xs md:text-base">🧪</span>
            <span className="truncate">Alchemist</span>
          </button>

          <button
            onClick={() => handleSelectDistrict('GATE')}
            className={`py-1.5 px-1.5 md:py-2.5 md:px-3 rounded-md md:rounded-lg border font-mono text-[10px] md:text-xs font-bold uppercase transition-all flex items-center justify-center space-x-1 min-h-[36px] ${
              activeDistrict === 'GATE'
                ? 'bg-amber-600 text-zinc-950 border-amber-400 shadow-md ring-1 ring-amber-400'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-amber-600/50'
            }`}
          >
            <span className="text-xs md:text-base">🌀</span>
            <span className="truncate">Gate</span>
          </button>

          <button
            onClick={() => handleSelectDistrict('STASH')}
            className={`py-1.5 px-1.5 md:py-2.5 md:px-3 rounded-md md:rounded-lg border font-mono text-[10px] md:text-xs font-bold uppercase transition-all flex items-center justify-center space-x-1 min-h-[36px] ${
              activeDistrict === 'STASH'
                ? 'bg-amber-600 text-zinc-950 border-amber-400 shadow-md ring-1 ring-amber-400'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-amber-600/50'
            }`}
          >
            <span className="text-xs md:text-base">🏛️</span>
            <span className="truncate">Stash</span>
          </button>

          {(player.act6Completed || player.mountUnlocked) && (
            <button
              onClick={() => handleSelectDistrict('STABLES')}
              className={`py-1.5 px-1.5 md:py-2.5 md:px-3 rounded-md md:rounded-lg border font-mono text-[10px] md:text-xs font-bold uppercase transition-all flex items-center justify-center space-x-1 min-h-[36px] ${
                activeDistrict === 'STABLES'
                  ? 'bg-amber-600 text-zinc-950 border-amber-400 shadow-md ring-1 ring-amber-400'
                  : 'bg-emerald-950/80 text-emerald-200 border-emerald-500/50 hover:border-emerald-400 animate-pulse'
              }`}
            >
              <span className="text-xs md:text-base">🐃</span>
              <span className="truncate">Stables</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport Content based on Selected District */}
      <div className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-lg md:rounded-xl p-2.5 md:p-6 space-y-3 md:space-y-4 shadow-xl min-h-[240px]">
        {/* DISTRICT 1: TAVERN & INN */}
        {activeDistrict === 'TAVERN' && (
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center space-x-2 md:space-x-3 border-b border-zinc-800 pb-2 md:pb-3">
              <span className="text-2xl md:text-3xl">🍺</span>
              <div>
                <h3 className="text-base md:text-xl font-bold font-serif text-amber-200">Sanctuary Inn & Shaman's Hearth</h3>
                <p className="text-[10px] md:text-xs text-zinc-400">Rest by the hearth fire, clear fatigue, or inspect regional Bounties at the Notice Board.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {/* Shaman & Inn Resting Card Carousel Deck */}
            {(() => {
              const displayOptions = REST_OPTIONS.filter((o) => player.level >= o.minLevel);

              const safeIndex = Math.min(activeRestCardIndex, Math.max(0, displayOptions.length - 1));

              const scrollToCard = (index: number) => {
                soundFX.playClickSound();
                const newIdx = (index + displayOptions.length) % displayOptions.length;
                setActiveRestCardIndex(newIdx);
                if (restCarouselRef.current) {
                  const container = restCarouselRef.current;
                  const cardEl = container.children[newIdx] as HTMLElement;
                  if (cardEl) {
                    cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                  }
                }
              };

              const handleScroll = () => {
                if (!restCarouselRef.current) return;
                const container = restCarouselRef.current;
                const children = Array.from(container.children) as HTMLElement[];
                if (children.length === 0) return;

                const containerCenter = container.scrollLeft + container.clientWidth / 2;
                let closestIndex = 0;
                let minDistance = Infinity;

                children.forEach((child, idx) => {
                  const childCenter = child.offsetLeft + child.clientWidth / 2;
                  const dist = Math.abs(containerCenter - childCenter);
                  if (dist < minDistance) {
                    minDistance = dist;
                    closestIndex = idx;
                  }
                });

                if (closestIndex !== activeRestCardIndex) {
                  setActiveRestCardIndex(closestIndex);
                }
              };

              return (
                <div data-tutorial-target="inn-card" className="space-y-2 md:space-y-3 bg-zinc-950/90 border border-zinc-800/90 p-2.5 md:p-4 rounded-xl md:rounded-2xl shadow-2xl">
                  <div className="flex justify-between items-center border-b border-zinc-800/80 pb-1.5 md:pb-2">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-[11px] md:text-xs font-bold uppercase font-mono tracking-wider text-amber-400 flex items-center space-x-1.5">
                        <span>🛌 Shaman Resting Quarters</span>
                      </h4>
                      <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 hidden sm:inline">
                        👈 Swipe left / right 👉
                      </span>
                    </div>
                    {displayOptions.length > 1 && (
                      <div className="flex items-center space-x-1.5 md:space-x-2">
                        <span className="text-[9px] md:text-[10px] font-mono text-amber-300 font-semibold">
                          Option {safeIndex + 1} of {displayOptions.length}
                        </span>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => scrollToCard(safeIndex - 1)}
                            className="bg-zinc-900 hover:bg-zinc-800 text-amber-300 px-1.5 py-0.5 rounded text-[10px] border border-amber-500/30 font-mono active:scale-95 transition-all"
                            title="Previous Rest Option"
                          >
                            ◀
                          </button>
                          <button
                            onClick={() => scrollToCard(safeIndex + 1)}
                            className="bg-zinc-900 hover:bg-zinc-800 text-amber-300 px-1.5 py-0.5 rounded text-[10px] border border-amber-500/30 font-mono active:scale-95 transition-all"
                            title="Next Rest Option"
                          >
                            ▶
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Real Swipeable Horizontal Card Carousel */}
                  <div
                    ref={restCarouselRef}
                    onScroll={handleScroll}
                    className="flex space-x-2.5 overflow-x-auto snap-x snap-mandatory scroll-smooth py-1 px-0.5 scrollbar-thin scrollbar-thumb-amber-900/60 scrollbar-track-zinc-950 touch-pan-x select-none"
                  >
                    {displayOptions.map((opt, idx) => {
                      const isUnlocked = player.level >= opt.minLevel;
                      const isActive = idx === safeIndex;
                      const maxStam = calcMaxStamina(player.level);
                      const curStam = player.stamina ?? maxStam;
                      const isFullyRestored = player.currentHp >= derived.maxHp && player.currentMp >= derived.maxMp && curStam >= maxStam;

                      return (
                        <div
                          key={opt.actId}
                          onClick={() => {
                            if (!isActive) scrollToCard(idx);
                          }}
                          className={`w-[88%] sm:w-[310px] md:w-[330px] shrink-0 snap-center rounded-xl md:rounded-2xl p-3 md:p-4 transition-all duration-300 flex flex-col justify-between min-h-[175px] md:min-h-[195px] cursor-pointer border ${
                            isActive
                              ? 'bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 border-2 border-amber-500/80 shadow-2xl shadow-amber-950/50 scale-[1.01] ring-1 ring-amber-500/40'
                              : 'bg-zinc-900/60 border-zinc-800/90 opacity-70 hover:opacity-95 hover:border-zinc-700'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center space-x-1.5">
                                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border ${
                                  isUnlocked
                                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                }`}>
                                  {opt.actName}
                                </span>
                                {!isUnlocked && (
                                  <span className="text-[9px] font-mono bg-red-950 text-red-300 border border-red-500/30 px-1 py-0.5 rounded font-bold">
                                    🔒 Lv {opt.minLevel}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-amber-400 font-bold bg-zinc-950 px-2 py-0.5 rounded-lg border border-amber-500/30 shadow-inner">
                                {formatCostInCowries(opt.costInCC)}
                              </span>
                            </div>

                            <h5 className="text-sm md:text-base font-bold font-serif text-amber-200">
                              {opt.title}
                            </h5>

                            <p className="text-[11px] md:text-xs text-zinc-300 leading-snug md:leading-relaxed font-sans line-clamp-2 md:line-clamp-3">
                              {opt.description}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-zinc-800/80 mt-1.5 space-y-1.5">
                            <div className="text-[9px] md:text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center justify-between">
                              <span>✨ +{Math.round(opt.hpPercent * 100)}% HP • +{Math.round(opt.mpPercent * 100)}% MP</span>
                              <span className="text-amber-300 font-bold">+{opt.staminaRestore} ST</span>
                            </div>

                            {isUnlocked ? (
                              isFullyRestored ? (
                                <button
                                  disabled
                                  className="w-full bg-zinc-800 text-zinc-400 font-bold py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs uppercase font-mono tracking-wider cursor-not-allowed border border-zinc-700/50 flex items-center justify-center space-x-1 opacity-80"
                                  title="Health, Mana, and Stamina are all 100% full!"
                                >
                                  <span>✨ HP, MP & ST Full</span>
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRestOption(opt);
                                  }}
                                  className="w-full bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs uppercase font-mono tracking-wider transition-all shadow-lg active:scale-95 flex items-center justify-center"
                                >
                                  <span>Rest & Regenerate</span>
                                </button>
                              )
                            ) : (
                              <button
                                disabled
                                className="w-full bg-zinc-800 text-zinc-500 font-bold py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs uppercase font-mono tracking-wider cursor-not-allowed border border-zinc-700/50 flex items-center justify-center space-x-1 opacity-75"
                              >
                                <span>🔒 Requires Character Level {opt.minLevel}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Carousel Pagination Indicator Dots */}
                  {displayOptions.length > 1 && (
                    <div className="flex items-center space-x-1.5 justify-center pt-0.5">
                      {displayOptions.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => scrollToCard(idx)}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            idx === safeIndex
                              ? 'w-5 bg-amber-400 shadow-sm shadow-amber-400/50'
                              : 'w-1.5 bg-zinc-700 hover:bg-zinc-500'
                          }`}
                          title={`Go to Rest Option ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

              {/* Tavern Bounties Notice */}
              {player.level < 3 ? (
                <div data-tutorial-target="tavern-card" className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl space-y-1.5 opacity-80">
                  <div className="flex items-center space-x-2">
                    <span className="text-zinc-500 font-bold text-xs uppercase font-mono">🔒 Bounty Board Locked</span>
                    <span className="bg-zinc-800 text-amber-400 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold">Unlocks at Lv 3</span>
                  </div>
                  <p className="text-[11px] md:text-xs text-zinc-400 font-mono">
                    The Town Elders require warriors to reach <strong className="text-amber-300">Character Level 3</strong> before taking on lethal creature bounties.
                  </p>
                  <div className="text-[10px] font-mono text-zinc-500">Progress: Level {player.level} / 3</div>
                </div>
              ) : (
                <div data-tutorial-target="tavern-card" className="bg-zinc-950 border border-zinc-800 p-3 md:p-4 rounded-xl space-y-2 md:space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs md:text-sm font-bold font-serif text-purple-300">Bounty Notice Board</h4>
                    <span className="text-[9px] md:text-[10px] font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                      {activeAcceptedBounties.length}/3 Active
                    </span>
                  </div>
                  <p className="text-[11px] md:text-xs text-zinc-400">
                    Inspect posted contracts for hunting dangerous mythological beasts in the wilderness.
                  </p>
                  <button
                    onClick={handleOpenBountyBoard}
                    className="w-full bg-purple-900/80 hover:bg-purple-800 border border-purple-500/40 text-purple-200 font-bold py-1.5 md:py-2 rounded text-[10px] md:text-xs uppercase font-mono tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2"
                  >
                    <span>📜 Inspect Bounty Notice Board</span>
                    <span className="bg-purple-950 px-2 py-0.5 rounded-full text-[9px] md:text-[10px] border border-purple-400/40">
                      {displayedBounties.length} Available
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Dedicated Bounty Board Panel inside Tavern */}
            {showBountyBoard && (
              <div className="bg-zinc-950 border border-purple-900/60 p-2.5 md:p-6 rounded-xl md:rounded-2xl space-y-3 md:space-y-4 shadow-2xl animate-fade-in mt-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-800 pb-2 md:pb-3 gap-2">
                  <div className="flex justify-between items-start w-full sm:w-auto">
                    <div>
                      <h4 className="text-sm md:text-lg font-bold font-serif text-purple-200 flex items-center space-x-1.5">
                        <span>📜 Haven Citadel Bounty Notice Board</span>
                      </h4>
                      <p className="text-[10px] md:text-xs text-zinc-400 font-mono mt-0.5">
                        Unaccepted contracts scaled to your level. Active contracts are managed in Log &amp; Chat.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowBountyBoard(false)}
                      className="text-zinc-400 hover:text-white text-xs font-mono px-2 py-1 bg-zinc-900 rounded border border-zinc-800 sm:hidden shrink-0"
                    >
                      ✕ Close
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Notice Board Tabs */}
                    <div className="flex bg-zinc-900 p-0.5 md:p-1 rounded-lg border border-zinc-800 text-[10px] md:text-xs font-mono w-full sm:w-auto">
                      <button
                        onClick={() => setBountyBoardTab('AVAILABLE')}
                        className={`flex-1 sm:flex-none px-2.5 py-1 rounded-md font-bold transition-all text-center ${
                          bountyBoardTab === 'AVAILABLE'
                            ? 'bg-purple-600 text-white shadow'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        📋 Available ({displayedBounties.length})
                      </button>
                      <button
                        onClick={() => setBountyBoardTab('COMPLETED')}
                        className={`flex-1 sm:flex-none px-2.5 py-1 rounded-md font-bold transition-all text-center ${
                          bountyBoardTab === 'COMPLETED'
                            ? 'bg-emerald-600 text-white shadow'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        ✅ Completed ({completedBounties.length})
                      </button>
                    </div>

                    <button
                      onClick={() => setShowBountyBoard(false)}
                      className="text-zinc-400 hover:text-white text-xs font-mono px-2 py-1 bg-zinc-900 rounded border border-zinc-800 hidden sm:inline shrink-0"
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>

                {/* TAB 1: AVAILABLE BOUNTIES (UNACCEPTED ONLY) */}
                {bountyBoardTab === 'AVAILABLE' && (
                  <div className="space-y-2.5 md:space-y-3">
                    {displayedBounties.length === 0 ? (
                      <div className="bg-zinc-900/60 border border-dashed border-zinc-800 p-6 md:p-8 rounded-xl text-center space-y-2">
                        <div className="text-2xl md:text-3xl">📜</div>
                        <h5 className="text-sm md:text-base font-bold font-serif text-amber-300">
                          {activeAcceptedBounties.length >= 3
                            ? 'Maximum 3 Active Bounties Accepted!'
                            : 'No new bounties available, level up and come back later'}
                        </h5>
                        <p className="text-[11px] md:text-xs font-mono text-zinc-400 max-w-md mx-auto">
                          {activeAcceptedBounties.length >= 3
                            ? 'You are currently carrying 3 active bounty contracts! Complete or claim them in Log & Chat to free up slots.'
                            : `You have accepted or completed all available contracts for Character Level ${player.level}.`}
                        </p>
                        {nextLockedBounty && (
                          <div className="text-[11px] md:text-xs font-mono text-purple-300 pt-1.5 font-bold">
                            🔒 Next Contract ({nextLockedBounty.title}) unlocks at Level {nextLockedBounty.minLevel}!
                          </div>
                        )}
                      </div>
                    ) : (
                      displayedBounties.map((bounty) => (
                        <div
                          key={bounty.id}
                          className="p-2.5 md:p-4 border rounded-xl flex flex-col space-y-2 md:space-y-2.5 transition-all bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                        >
                          {/* Top Row: Title & Level Requirement */}
                          <div className="flex justify-between items-start gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                <span className="text-[11px] md:text-xs font-mono font-bold uppercase text-amber-400">{bounty.title}</span>
                                <span className="text-[9px] md:text-[10px] font-mono text-zinc-400">
                                  • Level {bounty.minLevel ?? 1}+ Req
                                </span>
                              </div>
                              <h5 className="text-sm md:text-base font-bold font-serif text-white">Target: {bounty.targetMonsterName}</h5>
                            </div>
                            <span className="bg-purple-950 text-purple-300 border border-purple-500/40 text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase shrink-0">
                              Target: {bounty.targetCount}x
                            </span>
                          </div>

                          {/* Middle Row: Target Count & Rewards */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs font-mono bg-zinc-950/60 p-2 rounded-lg border border-purple-900/30 gap-1">
                            <div className="text-[11px] md:text-xs text-zinc-400">
                              Required Slay Count: <strong className="text-amber-300">{bounty.targetCount} Monsters</strong>
                            </div>

                            <div className="text-[10px] md:text-xs text-zinc-300 flex items-center space-x-1 flex-wrap">
                              <span className="text-zinc-400 font-semibold">Rewards: </span>
                              <span className="text-emerald-400 font-bold">+{bounty.rewardExp} EXP</span>
                              <span className="text-zinc-500">•</span>
                              <span className="text-yellow-400 font-bold">+{bounty.rewardCC} CC</span>
                              <span className="text-zinc-500">•</span>
                              <span className="text-purple-300 font-bold">1x Memory ({bounty.rewardMemoryRarity})</span>
                            </div>
                          </div>

                          {/* Bottom Row: Actions */}
                          <div className="flex items-center justify-end space-x-2 pt-0.5">
                            <button
                              onClick={() => handleAcceptBounty(bounty.id)}
                              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-bold font-mono px-4 py-1.5 rounded-lg text-[10px] md:text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                            >
                              [ Accept Contract ]
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 2: COMPLETED BOUNTIES HISTORY */}
                {bountyBoardTab === 'COMPLETED' && (
                  <div className="space-y-2 md:space-y-3 max-h-96 overflow-y-auto pr-1">
                    {completedBounties.length === 0 ? (
                      <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-xl text-center text-xs font-mono text-zinc-400">
                        No completed contracts yet. Complete and claim contracts to build your slayer record!
                      </div>
                    ) : (
                      completedBounties.map((bounty) => (
                        <div
                          key={bounty.id}
                          className="bg-zinc-900/40 border border-zinc-800 p-2.5 md:p-3 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-1.5 md:gap-2 opacity-80 text-[10px] md:text-xs"
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-emerald-400 font-bold">✅ {bounty.title}</span>
                              <span className="font-mono text-zinc-500">• Level {bounty.minLevel ?? 1}</span>
                            </div>
                            <div className="font-serif text-zinc-300">Target Slain: {bounty.targetMonsterName} ({bounty.targetCount}x)</div>
                          </div>
                          <div className="text-right font-mono text-zinc-400">
                            <span>Claimed: +{bounty.rewardExp} EXP | +{bounty.rewardCC} CC | 1x {bounty.rewardMemoryRarity} Memory</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* DISTRICT 2: PANDAY PIRA'S FORGE */}
        {activeDistrict === 'FORGE' && (
          <div data-tutorial-target="forge-view" className="space-y-4">
            <div className="flex items-center space-x-3 border-b border-zinc-800 pb-3">
              <span className="text-3xl">⚒️</span>
              <div>
                <h3 className="text-xl font-bold font-serif text-amber-200">Panday Pira's Ancient Forge</h3>
                <p className="text-xs text-zinc-400">Panday Pira's Forge: Buy 10 tiers of pre-colonial weapons & armors, or reroll affixes using Mutya Shards.</p>
              </div>
            </div>

            {/* Enchanter Panel */}
            <div className="bg-zinc-950 border border-purple-900/50 p-4 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold font-serif text-purple-300">Mutya Pearl Affix Blessing</h4>
                <span className="text-xs font-mono font-bold text-purple-300 bg-purple-950 px-2.5 py-1 rounded border border-purple-500/40">
                  🔮 {player.wallet.mutyaShards ?? player.wallet.prismaticShards ?? 0} Mutya Available
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {player.inventory.filter((i): i is EquipmentItem => 'tier' in i).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedEnchantItem(item)}
                    className={`p-2 rounded border text-left text-xs font-mono transition-all ${
                      selectedEnchantItem?.id === item.id
                        ? 'border-purple-500 bg-purple-950/60 text-purple-200 ring-1 ring-purple-500 shadow-md'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-bold flex justify-between items-center">
                      <span>{item.name}</span>
                      <span className="text-[10px] font-mono text-purple-400">
                        {item.baseDefense ? `🛡️ +${item.baseDefense}` : `⚔️ ${item.baseDamageMin}-${item.baseDamageMax}`}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500">{item.archetype} • Tier {item.tier}</div>
                  </button>
                ))}
              </div>

              {/* Selected Equipment Detailed Stats Breakdown */}
              {selectedEnchantItem && (
                <div className="bg-zinc-900 border border-purple-500/40 rounded-xl p-3 text-xs font-mono space-y-1.5 shadow-inner animate-fade-in">
                  <div className="flex justify-between items-center text-purple-300 font-bold border-b border-zinc-800 pb-1">
                    <span>📊 Selected Gear Specs: <strong>{selectedEnchantItem.name}</strong></span>
                    <span className="text-amber-400 text-[10px]">Tier {selectedEnchantItem.tier} • {selectedEnchantItem.archetype}</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    {selectedEnchantItem.baseDefense !== undefined && (
                      <span className="text-emerald-400 font-bold">🛡️ Base Physical Armor: +{selectedEnchantItem.baseDefense}</span>
                    )}
                    {selectedEnchantItem.baseDamageMin !== undefined && (
                      <span className="text-amber-300 font-bold">⚔️ Attack Damage: {selectedEnchantItem.baseDamageMin} - {selectedEnchantItem.baseDamageMax} ({selectedEnchantItem.damageType || 'PHYSICAL'})</span>
                    )}
                    <span className="text-zinc-400">Lvl Req: {selectedEnchantItem.levelReq}</span>
                  </div>

                  {/* Affixes Breakdown */}
                  {selectedEnchantItem.affixes && selectedEnchantItem.affixes.length > 0 ? (
                    <div className="space-y-1 pt-1">
                      <div className="text-[10px] font-bold uppercase text-purple-400">Current Blessed Affixes:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {selectedEnchantItem.affixes.map((aff, idx) => (
                          <div key={idx} className="bg-purple-950/60 border border-purple-700/40 p-1.5 rounded text-[11px] text-purple-200">
                            <div className="font-bold">✨ {aff.name} ({aff.type})</div>
                            {aff.statusInfliction && (
                              <div className="text-[10px] text-amber-300">🩸 Inflicts {aff.statusInfliction.type} ({aff.statusInfliction.chancePercent}% chance)</div>
                            )}
                            {aff.statusMitigation && (
                              <div className="text-[10px] text-emerald-300">🛡️ {aff.statusMitigation.type} {aff.statusMitigation.isImmune ? 'Immunity' : `Resist ${aff.statusMitigation.resistancePercent}%`}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-zinc-500 italic text-[10px] pt-1">No Mutya affixes currently applied.</div>
                  )}

                  {selectedEnchantItem.inherentPerk && (
                    <div className="text-[10px] text-amber-300/90 font-semibold pt-1 border-t border-zinc-800/60">
                      ✨ Inherent Perk: {selectedEnchantItem.inherentPerk}
                    </div>
                  )}
                </div>
              )}

              {selectedEnchantItem && (() => {
                const currentAttempts = selectedEnchantItem.blessingAttempts || 0;
                const { breakRisk, isTooFragile } = calcMutyaBreakRisk(currentAttempts);
                const requiredMutya = calcMutyaCost(currentAttempts);
                const hasEnoughMutya = (player.wallet.mutyaShards ?? player.wallet.prismaticShards ?? 0) >= requiredMutya;

                return (
                  <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center border-t border-zinc-800 gap-2">
                    <div className="flex flex-col space-y-0.5">
                      <div className="text-[10px] font-mono text-amber-400 font-semibold flex items-center space-x-2 flex-wrap gap-1">
                        <span>Blessings: {currentAttempts}/5 Max</span>
                        <span className="text-purple-300">• Cost: {requiredMutya} Mutya</span>
                        {isTooFragile ? (
                          <span className="bg-red-950 text-red-300 border border-red-500/40 px-1.5 py-0.5 rounded font-bold">
                            🚫 Has become too fragile to attempt (100% Break Risk)
                          </span>
                        ) : (
                          <span className="bg-amber-950/80 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold">
                            ⚠️ Risk: {breakRisk}% Break Chance
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleRerollEnchantment}
                      disabled={!hasEnoughMutya || isTooFragile}
                      className={`font-bold px-4 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-all shadow-md ${
                        isTooFragile
                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                          : !hasEnoughMutya
                          ? 'bg-zinc-800 text-purple-300/60 border border-purple-900/40 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-500 text-white active:scale-95'
                      }`}
                    >
                      {isTooFragile ? 'Too Fragile' : `Bless (${requiredMutya} Mutya)`}
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Categorized Armory Store */}
            <div className="space-y-3">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-zinc-800 pb-2">
                <div className="flex items-center space-x-2">
                  <h4 className="text-xs font-mono uppercase text-amber-400 font-bold flex items-center space-x-1.5">
                    <span>⚒️ FORGE WEAPONS & ARMOR STORE</span>
                    <span className="text-zinc-500 text-[10px]">({filteredForgeItems.length} Items)</span>
                  </h4>

                  {/* 4-Class Fit Filter Toggle */}
                  <button
                    type="button"
                    onClick={() => setFilterByHeroClassOnly(!filterByHeroClassOnly)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center space-x-1 transition-all ${
                      filterByHeroClassOnly
                        ? 'bg-purple-950 text-purple-200 border border-purple-500/60 shadow-md ring-1 ring-purple-500'
                        : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    <span>{filterByHeroClassOnly ? '🎯' : '🌐'}</span>
                    <span>{filterByHeroClassOnly ? `Class Fit: ${player.heroClass}` : 'Show All Classes'}</span>
                  </button>
                </div>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'ALL', label: 'All Gear', icon: '✨' },
                    { id: 'WEAPONS', label: 'Weapons', icon: '⚔️' },
                    { id: 'ARMOR', label: 'Armors', icon: '🛡️' },
                    { id: 'DAGGERS', label: 'Daggers', icon: '🗡️' },
                    { id: 'SWORDS', label: 'Swords', icon: '⚔️' },
                    { id: 'BOWS', label: 'Bows', icon: '🏹' },
                    { id: 'STAVES', label: 'Staves', icon: '🔮' },
                    { id: 'UPPER', label: 'Upper', icon: '🦺' },
                    { id: 'LOWER', label: 'Lower', icon: '👖' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setForgeCategory(tab.id as ForgeCategoryFilter)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center space-x-1 transition-all ${
                        forgeCategory === tab.id
                          ? 'bg-amber-500 text-zinc-950 shadow-md ring-1 ring-amber-300'
                          : 'bg-zinc-950 text-zinc-400 hover:text-amber-200 hover:bg-zinc-800 border border-zinc-800'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Equipment Item Store Grid - Sleek & Clutter-Free (Stats expand when selected) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
                {filteredForgeItems.map((item) => {
                  const meetsLevelReq = player.level >= item.levelReq;
                  const equipped = getEquippedItemForShopItem(item);
                  const isSelected = selectedForgeItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedForgeItemId(isSelected ? null : item.id)}
                      className={`bg-zinc-950 border rounded-xl p-3 flex flex-col justify-between space-y-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-400 ring-2 ring-amber-500/40 bg-zinc-900/90'
                          : !meetsLevelReq
                          ? 'border-zinc-800/80 opacity-85'
                          : item.rarity === 'LEGENDARY'
                          ? 'border-amber-500/80 bg-amber-950/10'
                          : item.rarity === 'EPIC'
                          ? 'border-purple-500/60 bg-purple-950/10'
                          : item.rarity === 'RARE'
                          ? 'border-cyan-500/60 bg-cyan-950/10'
                          : item.rarity === 'UNCOMMON'
                          ? 'border-emerald-500/60 bg-emerald-950/10'
                          : 'border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {/* Item Header */}
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                              <span
                                className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                                  item.rarity === 'LEGENDARY'
                                    ? 'bg-amber-950 text-amber-300 border-amber-500/60'
                                    : item.rarity === 'EPIC'
                                    ? 'bg-purple-950 text-purple-300 border-purple-500/60'
                                    : item.rarity === 'RARE'
                                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60'
                                    : item.rarity === 'UNCOMMON'
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60'
                                    : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                                }`}
                              >
                                {item.rarity}
                              </span>

                              {/* Hero Class Badge */}
                              {item.classReq && item.classReq.length === 1 && (
                                <span className="text-[9px] font-mono font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-600/40">
                                  {item.classReq[0] === 'Mandirigma' && '⚔️ Mandirigma'}
                                  {item.classReq[0] === 'Bagani' && '🗡️ Bagani'}
                                  {item.classReq[0] === 'Mangangaso' && '🏹 Mangangaso'}
                                  {item.classReq[0] === 'Babaylan' && '🔮 Babaylan'}
                                </span>
                              )}
                            </div>

                            <h5 className="text-sm font-bold font-serif text-amber-200 mt-1">{item.name}</h5>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                meetsLevelReq
                                  ? 'bg-zinc-900 text-emerald-400 border border-emerald-900'
                                  : 'bg-amber-950/80 text-amber-300 border border-amber-600/80'
                              }`}
                            >
                              {meetsLevelReq ? `Req Lvl ${item.levelReq}` : `🔒 Lv ${item.levelReq}`}
                            </span>
                          </div>
                        </div>

                        <div className="text-[10px] font-mono text-zinc-400 mt-1 flex justify-between">
                          <span>{item.archetype}</span>
                          <span>Tier {item.tier}</span>
                        </div>
                      </div>

                      {/* Primary Stats Display: EXPANDED ONLY WHEN SELECTED to reduce clutter */}
                      {isSelected ? (
                        <div className="bg-zinc-900/90 border border-amber-500/30 rounded-lg p-2 space-y-1 text-xs font-mono animate-fade-in">
                          {item.baseDefense !== undefined && (
                            <div className="flex justify-between items-center text-emerald-300 font-bold">
                              <span>🛡️ Base Armor:</span>
                              <span>+{item.baseDefense} Defense</span>
                            </div>
                          )}

                          {item.baseDamageMin !== undefined && item.baseDamageMax !== undefined && (
                            <div className="flex justify-between items-center text-amber-300 font-bold">
                              <span>⚔️ Weapon Damage:</span>
                              <span>{item.baseDamageMin} - {item.baseDamageMax} ({item.damageType})</span>
                            </div>
                          )}

                          {item.inherentPerk && (
                            <div className="text-[11px] text-purple-300 font-semibold pt-1 border-t border-zinc-800/60">
                              ✨ {item.inherentPerk}
                            </div>
                          )}

                          {/* Equipped Gear Comparison Indicator */}
                          <div className="flex justify-between items-center text-[10px] font-mono pt-1 border-t border-zinc-800">
                            {renderItemComparison(item)}
                            <span className="text-zinc-400">vs {equipped ? equipped.name : 'Empty'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center text-[11px] font-mono bg-zinc-900/60 border border-zinc-800/60 px-2 py-1 rounded">
                          <span className="text-zinc-300 font-semibold">
                            {item.baseDefense !== undefined ? `🛡️ +${item.baseDefense} Armor` : `⚔️ ${item.baseDamageMin}-${item.baseDamageMax} DMG`}
                          </span>
                          <span className="text-amber-400 text-[10px] underline">Tap to View Stats</span>
                        </div>
                      )}

                      {/* Cost & Action Buttons */}
                      <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                        <div className="text-xs font-mono font-bold text-amber-400">
                          {formatCostInCC(item.costInCC)}
                        </div>

                        <div className="flex space-x-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setInspectedShopItem(item)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-amber-200 font-bold text-[10px] font-mono px-2.5 py-1 rounded transition-all"
                          >
                            🔍 Specs
                          </button>
                          <button
                            onClick={() => handleBuyItem(item)}
                            disabled={!meetsLevelReq}
                            className={`font-bold font-mono text-[10px] uppercase px-3 py-1 rounded shadow transition-all ${
                              meetsLevelReq
                                ? 'bg-amber-600 hover:bg-amber-500 text-zinc-950 active:scale-95'
                                : 'bg-zinc-800 text-amber-400/80 border border-amber-900/40 cursor-not-allowed'
                            }`}
                          >
                            {meetsLevelReq ? 'Buy' : `🔒 Lv ${item.levelReq}`}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DETAILED EQUIPMENT INSPECTION & BUY MODAL */}
            {inspectedShopItem && (
              <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-zinc-900 border-2 border-amber-500/80 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative">
                  {/* Close Modal Button */}
                  <button
                    onClick={() => setInspectedShopItem(null)}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-white text-sm font-mono"
                  >
                    ✕ Close
                  </button>

                  <div className="flex items-center space-x-3">
                    <div className="w-14 h-14 bg-zinc-950 border border-amber-500/40 rounded-xl flex items-center justify-center text-3xl shadow-inner">
                      {['DAGGER', 'SWORD', 'BOW', 'STAFF'].includes(inspectedShopItem.category) ? '⚔️' : '🛡️'}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono font-bold uppercase text-amber-400">{inspectedShopItem.category}</span>
                        <span className="text-[10px] font-mono text-zinc-400">• Tier {inspectedShopItem.tier}</span>
                      </div>
                      <h3 className="text-xl font-bold font-serif text-amber-200">{inspectedShopItem.name}</h3>
                      <p className="text-xs text-zinc-400 font-mono">{inspectedShopItem.archetype}</p>
                    </div>
                  </div>

                  {/* Level Requirement Check */}
                  <div
                    className={`p-2.5 rounded-xl border text-xs font-mono font-bold flex justify-between items-center ${
                      player.level >= inspectedShopItem.levelReq
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                        : 'bg-red-950/80 text-red-300 border-red-500/60'
                    }`}
                  >
                    <span>Character Level Requirement:</span>
                    <span>Level {inspectedShopItem.levelReq} (Your Level: {player.level})</span>
                  </div>

                  {/* Complete Stat Specifications */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2 text-xs font-mono">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold border-b border-zinc-800 pb-1 mb-2">
                      ITEM SPECIFICATIONS
                    </div>

                    {inspectedShopItem.baseDefense !== undefined && (
                      <div className="flex justify-between border-b border-zinc-800/40 pb-1">
                        <span className="text-zinc-400">Base Physical Armor:</span>
                        <strong className="text-emerald-300">+{inspectedShopItem.baseDefense} Defense</strong>
                      </div>
                    )}

                    {inspectedShopItem.baseDamageMin !== undefined && (
                      <div className="flex justify-between border-b border-zinc-800/40 pb-1">
                        <span className="text-zinc-400">Weapon Attack Range:</span>
                        <strong className="text-amber-300">{inspectedShopItem.baseDamageMin} - {inspectedShopItem.baseDamageMax} ({inspectedShopItem.damageType})</strong>
                      </div>
                    )}

                    {inherentPerkInInspect(inspectedShopItem)}

                    <div className="flex justify-between pt-1">
                      <span className="text-zinc-400">Merchant Retail Price:</span>
                      <strong className="text-amber-400">{formatCostInCC(inspectedShopItem.costInCC)}</strong>
                    </div>
                  </div>

                  {/* Side-by-Side Comparison against Equipped Gear */}
                  <div className="bg-zinc-950/90 border border-amber-900/40 rounded-xl p-3 space-y-1 text-xs font-mono">
                    <div className="text-[10px] text-amber-500 uppercase font-bold">VS CURRENTLY EQUIPPED GEAR</div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-zinc-300">
                        {getEquippedItemForShopItem(inspectedShopItem)?.name || 'Empty Gear Slot'}
                      </span>
                      {renderItemComparison(inspectedShopItem)}
                    </div>
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      onClick={() => setInspectedShopItem(null)}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        handleBuyItem(inspectedShopItem);
                        setInspectedShopItem(null);
                      }}
                      disabled={player.level < inspectedShopItem.levelReq}
                      className={`px-6 py-2.5 font-mono font-bold text-xs uppercase rounded-xl shadow-lg transition-all ${
                        player.level >= inspectedShopItem.levelReq
                          ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 active:scale-95'
                          : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                      }`}
                    >
                      Buy & Add to Inventory
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DISTRICT 3: BABAYLAN SHAMAN'S APOTHECARY */}
        {activeDistrict === 'ALCHEMIST' && (
          <div data-tutorial-target="alchemist-view" className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">🧪</span>
                <div>
                  <h3 className="text-xl font-bold font-serif text-amber-200">Babaylan Shaman's Apothecary</h3>
                  <p className="text-xs text-zinc-400">
                    Apothecary brewing sacred botanical remedies, vitality draughts, clarity elixirs, and panacea vials scaled across the 8 Acts.
                  </p>
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'ALL', label: 'All Potions', icon: '✨' },
                  { id: 'VITALITY', label: 'Vitality Brews', icon: '🌿' },
                  { id: 'ELIXIR', label: 'Elixirs & Tinctures', icon: '🧪' },
                  { id: 'PANACEA', label: 'Mythic Panaceas', icon: '👑' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAlchemistCategory(tab.id as 'ALL' | 'VITALITY' | 'ELIXIR' | 'PANACEA')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center space-x-1 transition-all ${
                      alchemistCategory === tab.id
                        ? 'bg-emerald-600 text-zinc-950 shadow-md ring-1 ring-emerald-400'
                        : 'bg-zinc-950 text-zinc-400 hover:text-emerald-200 hover:bg-zinc-800 border border-zinc-800'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Consumables Catalog Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {CONSUMABLES.filter((potion) => {
                const unlockedLocationIds = player.unlockedLocationIds || ['loc_act_1'];
                const targetLoc = GAME_LOCATIONS.find((l) => l.id === potion.actId);
                const minLvl = targetLoc?.minLevel ?? (potion.actReq ? potion.actReq * 6 - 5 : 1);
                const isUnlocked = unlockedLocationIds.includes(potion.actId || '') || player.level >= minLvl;
                if (!isUnlocked) return false;

                if (alchemistCategory === 'VITALITY') return potion.category === 'VITALITY' || potion.category === 'POTION';
                if (alchemistCategory === 'ELIXIR') return potion.category === 'ELIXIR' || potion.category === 'TINCTURE';
                if (alchemistCategory === 'PANACEA') return potion.category === 'PANACEA';
                return true;
              }).map((potion) => {
                const actRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][(potion.actReq ?? 1) - 1] || `${potion.actReq}`;
                const unlockedLocationIds = player.unlockedLocationIds || ['loc_act_1'];
                const targetLoc = GAME_LOCATIONS.find((l) => l.id === potion.actId);
                const minLvl = targetLoc?.minLevel ?? (potion.actReq ? potion.actReq * 6 - 5 : 1);
                const isUnlocked = true;

                return (
                  <div
                    key={potion.id}
                    className={`bg-zinc-950 border rounded-xl p-3.5 flex flex-col justify-between space-y-3 transition-all ${
                      isUnlocked
                        ? 'border-emerald-900/60 hover:border-emerald-500/80 bg-zinc-950 shadow-lg'
                        : 'border-zinc-800/80 opacity-60 bg-zinc-950/60'
                    }`}
                  >
                    <div className="space-y-2">
                      {/* Header Badge Row */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-zinc-900 text-emerald-400 border border-emerald-900/40">
                            {potion.category}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase border ${
                              isUnlocked
                                ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                                : 'bg-red-950/80 text-red-400 border border-red-900/60'
                            }`}
                          >
                            {isUnlocked ? `Act ${actRoman} Unlocked` : `🔒 Req Act ${actRoman}`}
                          </span>
                        </div>

                        <span className="text-xl">{potion.icon || '🧪'}</span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="text-sm font-bold font-serif text-emerald-300">{potion.name}</h4>
                        <p className="text-xs text-zinc-300 font-mono mt-1 leading-snug">{potion.effectDescription}</p>
                      </div>

                      {/* Key Stats Pill */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {potion.hpRestore !== undefined && (
                          <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                            ❤️ +{potion.hpRestore >= 9999 ? '100% Full' : potion.hpRestore} HP
                          </span>
                        )}
                        {potion.mpRestore !== undefined && (
                          <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                            🔮 +{potion.mpRestore >= 9999 ? '100% Full' : potion.mpRestore} MP
                          </span>
                        )}
                        {potion.shieldPercent !== undefined && (
                          <span className="text-[10px] font-mono bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                            🛡️ {Math.round(potion.shieldPercent * 100)}% Max HP Shield
                          </span>
                        )}
                        {potion.cleansesDebuffs && (
                          <span className="text-[10px] font-mono bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                            ✨ Cleanses Debuffs
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price & Action Buttons */}
                    <div className="pt-2 border-t border-zinc-800/80 flex justify-between items-center gap-2">
                      <div className="text-xs font-mono font-bold text-amber-400">
                        {formatCostInCC(potion.costInCC)}
                      </div>

                      {isUnlocked ? (
                        <div className="flex space-x-1.5">
                          <button
                            onClick={() => handleBuyItem(potion)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold px-3 py-1.5 rounded text-xs uppercase font-mono tracking-wider transition-all shadow active:scale-95"
                            title={`Brew 1x ${potion.name}`}
                          >
                            Brew x1
                          </button>
                          <button
                            onClick={() => handleBuyMultipleConsumables(potion, 5)}
                            className="bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 font-bold px-2.5 py-1.5 rounded text-xs font-mono transition-all shadow active:scale-95"
                            title={`Brew 5x ${potion.name}`}
                          >
                            x5
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled
                          className="bg-zinc-900 text-zinc-500 border border-zinc-800 font-bold px-3 py-1.5 rounded text-xs uppercase font-mono tracking-wider cursor-not-allowed"
                        >
                          🔒 Locked (Act {actRoman})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DISTRICT 4: POBLACION SANCTUARY GATE */}
        {activeDistrict === 'GATE' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center border-b border-zinc-800 pb-3 text-center">
              <span className="text-4xl">🌀</span>
              <h3 className="text-2xl font-bold font-serif text-cyan-200 mt-1">Poblacion Sanctuary Gate</h3>
              <p className="text-xs text-zinc-400 max-w-md mt-1">
                Ancient ward-portal connecting Poblacion Sanctuary to unlocked expedition realms and the Bakunawa Moon Serpent Raid.
              </p>
            </div>

            {/* ANITO CYCLE REBIRTH SHRINE CARD (UNLOCKED AFTER ACT VIII DEFEAT) */}
            {(player.act8Completed || (player.completedBossIds || []).includes('boss_act_8')) && (
              <div className="bg-gradient-to-r from-purple-950 via-zinc-950 to-purple-950 border-2 border-amber-400 p-4 md:p-5 rounded-2xl space-y-3 shadow-2xl animate-fade-in text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 justify-center sm:justify-start">
                    <span className="text-xl">🌟</span>
                    <span className="text-xs font-mono font-bold uppercase text-amber-300 tracking-wider">
                      ANITO CYCLE REBIRTH SHRINE (NG+ SYSTEM)
                    </span>
                    <span className="bg-amber-950 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold px-2 py-0.5 rounded">
                      NG+ Tier {player.ngPlusLevel || 0}
                    </span>
                  </div>
                  <h4 className="text-base md:text-lg font-bold font-serif text-amber-100">
                    Initiate Anito Rebirth Cycle (NG+ {(player.ngPlusLevel || 0) + 1})
                  </h4>
                  <p className="text-xs font-mono text-zinc-300 max-w-xl">
                    Transcend into the next cosmic rebirth cycle. Monster HP and Damage across Acts I-VIII scale up (+150% per NG+ tier), while your Character Level, AP, Attributes, Gear, Mutya Skills, Mounts, and Vault Stash remain intact!
                  </p>
                </div>

                <button
                  onClick={() => setShowNgPlusConfirm(true)}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-5 py-2.5 rounded-xl uppercase font-mono text-xs shadow-xl transition-all active:scale-95 shrink-0"
                >
                  ⚡ Start NG+ {(player.ngPlusLevel || 0) + 1} Rebirth
                </button>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase text-cyan-400 font-bold flex items-center space-x-1">
                <span>🌌 EXPEDITION REALMS & ACT ZONES</span>
                <span className="text-zinc-500 font-normal">({unlockedLocationIds.filter(id => id !== 'loc_act_infinite').length} / 8 Acts Unlocked)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {GAME_LOCATIONS.map((loc, idx) => {
                  const isInfiniteRealm = loc.id === 'loc_act_infinite';
                  const isUnlocked = isInfiniteRealm
                    ? (player.act8Completed || (player.completedBossIds || []).includes('boss_act_8') || (player.unlockedLocationIds || []).includes('loc_act_infinite'))
                    : (player.level >= loc.minLevel);
                  const isCurrent = player.currentLocationId === loc.id;
                  const actRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][idx];

                  const headerSubtitle = isInfiniteRealm
                    ? (isUnlocked ? loc.subtitle : '🔒 ENDGAME SURVIVAL REALM')
                    : (isUnlocked ? loc.subtitle : '??? UNDISCOVERED REGION');

                  const cardTitle = isInfiniteRealm
                    ? (isUnlocked ? loc.name : 'The Celestial Ether of Bathala')
                    : (isUnlocked ? loc.name : `Act ${actRoman}: ??? Unknown Territory`);

                  const cardDesc = isInfiniteRealm
                    ? (isUnlocked ? loc.description : 'An infinite cosmic realm of Bathala where malevolent titan spirits continuously spawn. Requires defeating Act VIII Guardian (Bakunawa) to unlock.')
                    : (isUnlocked ? loc.description : `Unexplored territory shrouded in ancient fog. Requires Character Level ${loc.minLevel} and defeating the previous Act Guardian.`);

                  const reqText = isInfiniteRealm
                    ? (isUnlocked ? '✅ Unlocked' : '🔒 Req: Defeat Act VIII Guardian')
                    : (isUnlocked ? '✅ Unlocked' : `🔒 Req: Lv ${loc.minLevel}`);

                  return (
                    <div
                      key={loc.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                        isCurrent
                          ? 'bg-zinc-950 border-cyan-400 ring-2 ring-cyan-500/40 shadow-xl'
                          : isUnlocked
                          ? 'bg-zinc-950 border-cyan-500/40 hover:border-cyan-400 shadow-lg'
                          : 'bg-zinc-950/60 border-zinc-800/80 opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono font-bold uppercase text-cyan-400">
                            {headerSubtitle}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              isUnlocked
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                : 'bg-red-950 text-red-400 border border-red-900/60'
                            }`}
                          >
                            {reqText}
                          </span>
                        </div>
                        <h4 className="text-base font-bold font-serif text-white mt-1">
                          {cardTitle}
                        </h4>
                        <p className="text-xs text-zinc-400 font-mono mt-1 line-clamp-2">
                          {cardDesc}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          if (!isUnlocked) {
                            if (isInfiniteRealm) {
                              notify(`🔒 Infinite Survival Realm Locked! Defeat Act VIII Guardian (Bakunawa) to access The Celestial Ether of Bathala.`, 'warning', '🔒');
                            } else {
                              notify(`🔒 Act Locked! Reach Level ${loc.minLevel} to access Act ${actRoman}. (Your Level: ${player.level})`, 'warning', '🔒');
                            }
                            return;
                          }
                          onUpdatePlayer({ ...player, currentLocationId: loc.id });
                          onNavigateToWorld();
                        }}
                        disabled={!isUnlocked}
                        className={`w-full py-2 rounded-lg font-mono font-bold text-xs uppercase tracking-wider transition-all shadow ${
                          isUnlocked
                            ? 'bg-cyan-600 hover:bg-cyan-500 text-zinc-950 active:scale-95'
                            : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800'
                        }`}
                      >
                        {isCurrent ? '⚡ Enter Active Zone' : isUnlocked ? (isInfiniteRealm ? 'Enter Survival Realm' : 'Step Through Portal') : (isInfiniteRealm ? '🔒 Locked (Defeat Act VIII Boss)' : `🔒 Locked (Level ${loc.minLevel})`)}
                      </button>
                    </div>
                  );
                })}

                {/* Bakunawa Moon Serpent Raid Gate Card */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                  player.level >= 40
                    ? 'bg-gradient-to-b from-purple-950/60 to-zinc-950 border-purple-500/60 shadow-xl'
                    : 'bg-zinc-950/60 border-zinc-800/80 opacity-60'
                }`}>
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold uppercase text-purple-400">
                        {player.level >= 40 ? 'CELESTIAL RAID EVENT' : '??? CELESTIAL THREAT'}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        player.level >= 40 ? 'bg-purple-950 text-purple-300 border border-purple-500/40' : 'bg-zinc-900 text-zinc-500'
                      }`}>
                        {player.level >= 40 ? '⚔️ Raid Ready' : '🔒 Req: Lv 40'}
                      </span>
                    </div>
                    <h4 className="text-base font-bold font-serif text-purple-200 mt-1">
                      {player.level >= 40 ? 'Bakunawa: The Great Moon Serpent' : '??? Celestial Raid Event'}
                    </h4>
                    <p className="text-xs text-zinc-400 font-mono mt-1">
                      {player.level >= 40
                        ? 'Multi-phase global celestial eclipse raid event for ultimate endgame rewards.'
                        : 'Mysterious celestial threat lurking beyond the void. Unlocks at Character Level 40.'}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (player.level < 40) {
                        notify('🔒 Bakunawa Raid Locked! Requires Character Level 40+.', 'warning', '🔒');
                        return;
                      }
                      onNavigateToTitanRaid?.();
                    }}
                    disabled={player.level < 40}
                    className={`w-full py-2 rounded-lg font-mono font-bold text-xs uppercase tracking-wider transition-all shadow ${
                      player.level >= 40
                        ? 'bg-purple-700 hover:bg-purple-600 text-white active:scale-95'
                        : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800'
                    }`}
                  >
                    {player.level >= 40 ? 'Challenge Bakunawa Raid' : '🔒 Locked (Level 40)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DISTRICT 5: DATU'S ROYAL STASH & VAULT */}
        {activeDistrict === 'STASH' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 border-b border-zinc-800 pb-3">
              <span className="text-3xl">🏛️</span>
              <div>
                <h3 className="text-xl font-bold font-serif text-amber-200">Datu's Royal Stash & Account Vault</h3>
                <p className="text-xs text-zinc-400">Store excess bladed weapons, armor tunics, and potions safely in your royal account vault.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Backpack Items -> Move to Stash */}
              <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl space-y-2">
                <h4 className="text-xs font-mono uppercase text-amber-400 font-bold">Bag Inventory ({player.inventory.length}/{derived.inventoryCapacity})</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {player.inventory.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">Bag is empty.</p>
                  ) : (
                    player.inventory.map((item) => (
                      <div key={item.id} className="bg-zinc-900 p-2 rounded flex justify-between items-center text-xs font-mono">
                        <span className="font-bold text-amber-200 truncate max-w-[160px]">{item.name}</span>
                        <button
                          onClick={() => handleMoveToStash(item)}
                          className="bg-amber-600/80 hover:bg-amber-500 text-zinc-950 font-bold px-2 py-0.5 rounded text-[10px] uppercase shrink-0"
                        >
                          Store ➔
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Stash Items -> Withdraw to Bag */}
              <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl space-y-2">
                <h4 className="text-xs font-mono uppercase text-cyan-400 font-bold">Vault Stash ({player.stash?.length || 0})</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {!player.stash || player.stash.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">Vault is empty.</p>
                  ) : (
                    player.stash.map((item) => (
                      <div key={item.id} className="bg-zinc-900 p-2 rounded flex justify-between items-center text-xs font-mono">
                        <span className="font-bold text-cyan-200 truncate max-w-[160px]">{item.name}</span>
                        <button
                          onClick={() => handleWithdrawFromStash(item)}
                          className="bg-cyan-600/80 hover:bg-cyan-500 text-zinc-950 font-bold px-2 py-0.5 rounded text-[10px] uppercase shrink-0"
                        >
                          🛈 Take
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DISTRICT: BEASTMASTER STABLES (POST-ACT 6) */}
        {activeDistrict === 'STABLES' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 border-b border-zinc-800 pb-3">
              <span className="text-3xl">🐃</span>
              <div>
                <h3 className="text-xl font-bold font-serif text-amber-200">Beastmaster Stables & Corrals</h3>
                <p className="text-xs text-zinc-400">Tame, purchase, and equip mythical beasts of the pre-colonial Philippine archipelago.</p>
              </div>
            </div>

            {!player.act6Completed && !player.mountUnlocked ? (
              /* Locked Stables Gate */
              <div className="bg-zinc-950 border-2 border-amber-900/60 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
                <div className="text-4xl">🔒 🐃</div>
                <h4 className="text-lg font-bold font-serif text-amber-300">
                  Beastmaster Stables Locked (Post-Act VI Gate)
                </h4>
                <p className="text-xs font-mono text-zinc-300 max-w-md mx-auto leading-relaxed">
                  The high training corrals and pens are sealed by the ancient beastmasters. The mythical beasts will only submit to a warrior who has conquered the deep ocean trenches.
                </p>
                <div className="inline-block bg-red-950/80 border border-red-500/60 rounded-xl px-4 py-2 text-xs font-mono font-bold text-red-200">
                  ⚔️ Requirement: Slay Act VI Guardian Boss (Tambanokano, The Moon-Crusher) in Trench of the Abyssal Tide
                </div>
              </div>
            ) : (
              /* Unlocked Stables View */
              <div className="space-y-4">
                {/* Active Equipped Mount Status Card */}
                <div className="bg-zinc-950 border border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">🏇</span>
                    <div>
                      <div className="text-[10px] font-mono uppercase text-amber-500 font-bold tracking-wider">Currently Stabled & Ridden</div>
                      <div className="text-base font-bold font-serif text-amber-200">
                        {player.equipment.mount?.name || player.equipment.bike?.name || 'No Mount Equipped'}
                      </div>
                      <div className="text-xs font-mono text-zinc-400">
                        {(player.equipment.mount || player.equipment.bike)?.inherentPerk || 'Equip a tamed beast below to gain movement speed and combat buffs.'}
                      </div>
                    </div>
                  </div>

                  {(player.equipment.mount || player.equipment.bike) && (
                    <button
                      onClick={handleUnequipMount}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono font-bold text-xs uppercase px-3 py-1.5 rounded-lg transition-all"
                    >
                      Unequip Mount
                    </button>
                  )}
                </div>

                {/* Stables Marketplace Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {MOUNTS.map((mount) => {
                    const isEquipped = (player.equipment.mount?.id === mount.id) || (player.equipment.bike?.id === mount.id);
                    const isInBag = player.inventory.some((i) => i.id === mount.id);
                    const totalCowries = totalCowriesFromWallet(player.wallet);
                    const cost = mount.costInCC || 10000;
                    const canAfford = totalCowries >= cost;

                    return (
                      <div
                        key={mount.id}
                        className={`bg-zinc-950 border rounded-xl p-4 flex flex-col justify-between space-y-3 transition-all ${
                          isEquipped
                            ? 'border-emerald-500/80 ring-1 ring-emerald-500/30'
                            : isInBag
                            ? 'border-cyan-500/60'
                            : 'border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start text-[10px] font-mono">
                            <span className="uppercase text-amber-400 font-bold">Tier {mount.tier} • {mount.rarity}</span>
                            <span className="text-zinc-400 font-semibold">Req: Lv {mount.levelReq || 39}</span>
                          </div>
                          <h4 className="text-sm font-bold font-serif text-amber-200 mt-1">{mount.name}</h4>
                          <div className="text-xs text-emerald-400 font-mono mt-1">
                            +{mount.baseDefense || 0} Armor
                          </div>
                          <p className="text-xs text-zinc-300 font-mono mt-1 bg-zinc-900 p-2 rounded border border-zinc-800">
                            {mount.inherentPerk}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-zinc-900 flex justify-between items-center">
                          <div className="text-[11px] font-mono">
                            <span className="text-zinc-500 block text-[9px] uppercase">Stables Price</span>
                            <span className="text-amber-300 font-bold">{formatCostInCowries(cost)}</span>
                          </div>

                          <div>
                            {isEquipped ? (
                              <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/50 text-xs px-3 py-1.5 rounded-lg font-mono font-bold uppercase">
                                ✅ Equipped
                              </span>
                            ) : isInBag ? (
                              <button
                                onClick={() => handleEquipMountFromStables(mount)}
                                className="bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-mono font-bold text-xs uppercase px-3 py-1.5 rounded-lg transition-all"
                              >
                                Equip Now
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBuyMount(mount)}
                                disabled={!canAfford}
                                className={`font-mono font-bold text-xs uppercase px-3 py-1.5 rounded-lg transition-all ${
                                  canAfford
                                    ? 'bg-amber-600 hover:bg-amber-500 text-zinc-950 shadow-md active:scale-95'
                                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                                }`}
                              >
                                {canAfford ? 'Tame & Buy' : 'Need Funds'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feature Tutorial Modal (Phase 9.2) */}
      {activeTutorial && (
        <FeatureTutorialModal
          tutorialId={activeTutorial.id}
          featureName={activeTutorial.name}
          steps={activeTutorial.steps}
          onComplete={() => handleCompleteTutorial(activeTutorial.id)}
          onSkip={() => handleCompleteTutorial(activeTutorial.id)}
        />
      )}

      {/* Mutya Blessing Ritual Confirmation Modal */}
      {confirmBlessingData && (
        <ConfirmModal
          title="MUTYA PEARL AFFIX BLESSING RITUAL"
          message={`Item: [${confirmBlessingData.item.name}]\nAttempt: #${confirmBlessingData.currentAttempts + 1} of 5 Max\nCost: ${confirmBlessingData.requiredMutya} Mutya Shard(s)\n⚠️ Break Risk: ${confirmBlessingData.breakRisk}% Failure Chance!\n\nIf the ritual fails, [${confirmBlessingData.item.name}] will shatter into dust and be PERMANENTLY DESTROYED!\n\nSpend ${confirmBlessingData.requiredMutya} Mutya Shard(s) to proceed?`}
          confirmText="Begin Ritual"
          cancelText="Cancel"
          type="danger"
          onConfirm={executeMutyaBlessing}
          onCancel={() => setConfirmBlessingData(null)}
        />
      )}

      {/* Anito Cycle Rebirth (NG+) Confirmation Modal */}
      {showNgPlusConfirm && (
        <ConfirmModal
          title={`🌟 INITIATE ANITO CYCLE REBIRTH (NG+ ${(player.ngPlusLevel || 0) + 1})`}
          message={`Are you ready to initiate the Anito Rebirth Ritual?\n\n• World Cycle: New Game+ ${(player.ngPlusLevel || 0) + 1}\n• Carried Over: Level (${player.level}), AP, Attributes, Equipped Gear, Inventory, Vault Stash, Mounts, Skills & Highest Survival Record (${player.highestSurvivalWave || 0} Waves).\n• Resets: Currency (resets to 100 Cowrie Shells), Act World Progression (resets to Act I) & Side Quests.\n• Scaling: Monsters across all 8 Acts deal +150% increased damage and HP in NG+${(player.ngPlusLevel || 0) + 1}.\n\nDo you wish to begin the new cosmic cycle?`}
          confirmText={`Initiate NG+ ${(player.ngPlusLevel || 0) + 1}`}
          cancelText="Return to Sanctuary"
          type="warning"
          onConfirm={handleConfirmRebirth}
          onCancel={() => setShowNgPlusConfirm(false)}
        />
      )}
    </div>
  );
};
