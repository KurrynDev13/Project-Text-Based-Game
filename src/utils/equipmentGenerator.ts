// equipmentGenerator.ts
// Dynamic procedural equipment generator algorithm for Maharlika: Legends of the Archipelago.
// Generates dense, level-appropriate weapons and armors across levels 1 to 55+
// aligned strictly with the 4 Hero Classes (Mandirigma, Bagani, Mangangaso, Babaylan).

import { EquipmentItem, HeroClass, ItemRarity, WeaponCategory, ArmorCategory, Affix } from '../types/game';
import { DAGGERS, SWORDS, BOWS, STAVES, UPPER_ARMORS, LOWER_ARMORS, WEAPON_STATUS_AFFIXES, ARMOR_STATUS_AFFIXES, ENCHANTER_PREFIXES, ENCHANTER_SUFFIXES, GAME_LOCATIONS } from '../data/equipmentData';

export type ForgeCategoryFilter = 'ALL' | 'WEAPONS' | 'ARMOR' | 'DAGGERS' | 'SWORDS' | 'BOWS' | 'STAVES' | 'UPPER' | 'LOWER';

// Helper to determine item rarity based on item level requirement
export function getRarityForLevel(level: number): ItemRarity {
  if (level <= 5) return 'COMMON';
  if (level <= 12) return 'UNCOMMON';
  if (level <= 22) return 'RARE';
  if (level <= 34) return 'EPIC';
  if (level <= 44) return 'LEGENDARY';
  return 'TRIUMPHANT';
}

// Prefixes for equipment level variants
const WEAKENING_PREFIXES = ['Novice', 'Crude', 'Worn', 'Rustic', 'Faded', 'Weathered'];
const EMPOWERING_PREFIXES = ['Refined', 'Tempered', 'Masterwork', "Ancestor's", 'Blessed', 'Dominant'];

/**
 * Calculates level-scaled physical or magic weapon min/max damage.
 */
export function calcWeaponDamageForLevel(level: number, tier: number): { min: number; max: number } {
  const baseScale = 3 + level * 2.1 + Math.pow(level, 1.35) * 0.45 + (tier - 1) * 2;
  const min = Math.max(3, Math.floor(baseScale * 0.85));
  const max = Math.max(6, Math.floor(baseScale * 1.25));
  return { min, max };
}

/**
 * Calculates level-scaled armor defense points.
 */
export function calcArmorDefenseForLevel(level: number, category: ArmorCategory, tier: number): number {
  const multiplier = category === 'UPPER' ? 1.5 : 1.0;
  const def = (3 + level * 1.3 + Math.pow(level, 1.25) * 0.35 + (tier - 1) * 1.5) * multiplier;
  return Math.max(category === 'UPPER' ? 4 : 2, Math.floor(def));
}

/**
 * Calculates level-appropriate cost in Cowries (CC).
 */
export function calcCostInCowries(levelOrItem: number | EquipmentItem, rarity?: ItemRarity): number {
  let level = 1;
  let itemRarity: ItemRarity = 'COMMON';

  if (typeof levelOrItem === 'object' && levelOrItem !== null) {
    level = levelOrItem.levelReq || 1;
    itemRarity = levelOrItem.rarity || getRarityForLevel(level);
  } else if (typeof levelOrItem === 'number') {
    level = levelOrItem;
    itemRarity = rarity || getRarityForLevel(level);
  }

  const rarityMult: Record<ItemRarity, number> = {
    COMMON: 1.0,
    UNCOMMON: 1.5,
    RARE: 2.2,
    EPIC: 3.5,
    LEGENDARY: 6.0,
    TRIUMPHANT: 10.0,
  };
  const baseCost = 25 * Math.pow(1.18, Math.min(level, 50)) + level * 40;
  return Math.max(80, Math.floor(baseCost * (rarityMult[itemRarity] || 1.0)));
}

// Base template items grouped by category
const BASE_WEAPON_MAP: Record<'DAGGER' | 'SWORD' | 'BOW' | 'STAFF', { items: EquipmentItem[]; classReq: HeroClass[] }> = {
  DAGGER: { items: DAGGERS, classReq: ['Bagani'] },
  SWORD: { items: SWORDS, classReq: ['Mandirigma'] },
  BOW: { items: BOWS, classReq: ['Mangangaso'] },
  STAFF: { items: STAVES, classReq: ['Babaylan'] },
};

const BASE_ARMOR_MAP: Record<'UPPER' | 'LOWER', { items: EquipmentItem[]; classReq: HeroClass[] }> = {
  UPPER: { items: UPPER_ARMORS, classReq: ['Mandirigma', 'Bagani', 'Mangangaso', 'Babaylan'] },
  LOWER: { items: LOWER_ARMORS, classReq: ['Mandirigma', 'Bagani', 'Mangangaso', 'Babaylan'] },
};

/**
 * Dynamically generates a complete catalog of level-scaled equipment (Levels 1 to maxLevel).
 * Creates item entries for every level so players always have level-appropriate upgrades.
 */
export function generateFullEquipmentCatalog(maxLevel: number = 50): EquipmentItem[] {
  const generatedCatalog: EquipmentItem[] = [];

  // 1. Generate Weapons for every level
  (Object.keys(BASE_WEAPON_MAP) as ('DAGGER' | 'SWORD' | 'BOW' | 'STAFF')[]).forEach((cat) => {
    const { items, classReq } = BASE_WEAPON_MAP[cat];

    for (let lvl = 1; lvl <= maxLevel; lvl++) {
      const baseIndex = Math.min(items.length - 1, Math.floor(((lvl - 1) / maxLevel) * items.length));
      const baseItem = items[baseIndex];

      if (!baseItem) continue;

      const rarity = getRarityForLevel(lvl);
      const { min, max } = calcWeaponDamageForLevel(lvl, baseItem.tier || 1);
      const costInCC = calcCostInCowries(lvl, rarity);

      let itemName = baseItem.name;
      if (lvl < baseItem.levelReq) {
        const prefix = WEAKENING_PREFIXES[(baseItem.levelReq - lvl) % WEAKENING_PREFIXES.length];
        itemName = `${prefix} ${baseItem.name}`;
      } else if (lvl > baseItem.levelReq + 3) {
        const prefix = EMPOWERING_PREFIXES[(lvl - baseItem.levelReq) % EMPOWERING_PREFIXES.length];
        itemName = `${prefix} ${baseItem.name}`;
      }

      // Procedural Affixes for Weapons (Inflictions for UNCOMMON+)
      const itemAffixes: Affix[] = [];
      if (rarity !== 'COMMON') {
        const wAffix = WEAPON_STATUS_AFFIXES[(lvl - 1) % WEAPON_STATUS_AFFIXES.length];
        itemAffixes.push(wAffix);
        if (['EPIC', 'LEGENDARY', 'TRIUMPHANT'].includes(rarity)) {
          const pAffix = ENCHANTER_PREFIXES[(lvl + 1) % ENCHANTER_PREFIXES.length];
          itemAffixes.push(pAffix);
        }
      }

      generatedCatalog.push({
        id: `gen_${cat.toLowerCase()}_lvl_${lvl}`,
        name: itemAffixes.length > 0 ? `${itemAffixes[0].name} ${itemName}` : itemName,
        category: cat,
        classReq,
        tier: Math.min(10, Math.max(1, Math.ceil(lvl / 5))),
        levelReq: lvl,
        baseDamageMin: min,
        baseDamageMax: max,
        damageType: baseItem.damageType || 'PHYSICAL',
        inherentPerk: baseItem.inherentPerk,
        archetype: baseItem.archetype,
        costInCC,
        rarity,
        affixes: itemAffixes.length > 0 ? itemAffixes : undefined,
      });
    }
  });

  // 2. Generate Armors for every level
  (Object.keys(BASE_ARMOR_MAP) as ('UPPER' | 'LOWER')[]).forEach((cat) => {
    const { items, classReq } = BASE_ARMOR_MAP[cat];

    for (let lvl = 1; lvl <= maxLevel; lvl++) {
      const baseIndex = Math.min(items.length - 1, Math.floor(((lvl - 1) / maxLevel) * items.length));
      const baseItem = items[baseIndex];

      if (!baseItem) continue;

      const rarity = getRarityForLevel(lvl);
      const baseDefense = calcArmorDefenseForLevel(lvl, cat, baseItem.tier || 1);
      const costInCC = calcCostInCowries(lvl, rarity);

      let itemName = baseItem.name;
      if (lvl < baseItem.levelReq) {
        const prefix = WEAKENING_PREFIXES[(baseItem.levelReq - lvl) % WEAKENING_PREFIXES.length];
        itemName = `${prefix} ${baseItem.name}`;
      } else if (lvl > baseItem.levelReq + 3) {
        const prefix = EMPOWERING_PREFIXES[(lvl - baseItem.levelReq) % EMPOWERING_PREFIXES.length];
        itemName = `${prefix} ${baseItem.name}`;
      }

      // Procedural Affixes for Armors (Mitigations for UNCOMMON+)
      const itemAffixes: Affix[] = [];
      if (rarity !== 'COMMON') {
        const aAffix = ARMOR_STATUS_AFFIXES[(lvl - 1) % ARMOR_STATUS_AFFIXES.length];
        itemAffixes.push(aAffix);
        if (['EPIC', 'LEGENDARY', 'TRIUMPHANT'].includes(rarity)) {
          const sAffix = ENCHANTER_SUFFIXES[(lvl + 2) % ENCHANTER_SUFFIXES.length];
          itemAffixes.push(sAffix);
        }
      }

      generatedCatalog.push({
        id: `gen_${cat.toLowerCase()}_lvl_${lvl}`,
        name: itemAffixes.length > 0 ? `${itemAffixes[0].name} ${itemName}` : itemName,
        category: cat,
        classReq,
        tier: Math.min(10, Math.max(1, Math.ceil(lvl / 5))),
        levelReq: lvl,
        baseDefense,
        inherentPerk: baseItem.inherentPerk,
        archetype: baseItem.archetype,
        costInCC,
        rarity,
        affixes: itemAffixes.length > 0 ? itemAffixes : undefined,
      });
    }
  });

  return generatedCatalog;
}

// Cached full equipment catalog
let _cachedCatalog: EquipmentItem[] | null = null;

export function getFullEquipmentCatalog(): EquipmentItem[] {
  if (!_cachedCatalog) {
    _cachedCatalog = generateFullEquipmentCatalog(55);
  }
  return _cachedCatalog;
}

/**
 * Returns filtered, level-gated equipment for Panday Pira's Forge store.
 * Constrained by: levelReq <= playerLevel + 5
 */
export function getScaledForgeCatalog(
  playerLevel: number,
  heroClass: HeroClass,
  categoryFilter: ForgeCategoryFilter = 'ALL',
  filterByHeroClassOnly: boolean = true,
  currentLocationId: string = 'loc_act_1',
  ngPlusLevel: number = 0
): EquipmentItem[] {
  const fullCatalog = getFullEquipmentCatalog();

  const locIndex = GAME_LOCATIONS.findIndex((l) => l.id === currentLocationId);
  const actIndex = locIndex >= 0 ? locIndex : 0;
  const currentLoc = GAME_LOCATIONS[actIndex] || GAME_LOCATIONS[0];
  const actMinLvl = currentLoc.minLevel || 1;
  const actMaxLvl = (currentLoc.bossLevelReq ?? (actMinLvl + 5)) + 1;

  const candidates = fullCatalog.filter((item: EquipmentItem) => {
    // 1. Act & Level Gating:
    if (ngPlusLevel <= 0) {
      const minShow = Math.max(1, Math.min(playerLevel - 2, actMinLvl));
      const maxShow = Math.min(playerLevel + 2, actMaxLvl);
      if (item.levelReq < minShow || item.levelReq > maxShow) return false;
    } else {
      // In NG+: Offer high-grade items scaled to player level range
      const minShow = Math.max(45, playerLevel - 3);
      const maxShow = Math.min(55, playerLevel + 2);
      if (item.levelReq < minShow || item.levelReq > maxShow) return false;
    }

    // 2. Class suitability filtering
    if (filterByHeroClassOnly && item.classReq && item.classReq.length > 0) {
      if (!item.classReq.includes(heroClass)) return false;
    }

    // 3. Category Filter
    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'WEAPONS') return ['DAGGER', 'SWORD', 'BOW', 'STAFF'].includes(item.category);
    if (categoryFilter === 'ARMOR') return ['UPPER', 'LOWER'].includes(item.category);
    if (categoryFilter === 'DAGGERS') return item.category === 'DAGGER';
    if (categoryFilter === 'SWORDS') return item.category === 'SWORD';
    if (categoryFilter === 'BOWS') return item.category === 'BOW';
    if (categoryFilter === 'STAVES') return item.category === 'STAFF';
    if (categoryFilter === 'UPPER') return item.category === 'UPPER';
    if (categoryFilter === 'LOWER') return item.category === 'LOWER';

    return true;
  });

  // Sort by level descending and return a curated set of the top 9 items
  return candidates.sort((a, b) => b.levelReq - a.levelReq).slice(0, 9);
}

/**
 * Selects a high-quality, worthwhile merchant offer for the Wandering Artisan Merchant encounter.
 * Ensures the offered item is class-appropriate, level-scaled, non-junk, and priced realistically at a discount.
 */
export function getWanderingMerchantOffer(
  playerLevel: number,
  heroClass: HeroClass,
  playerEquipment?: {
    weapon?: EquipmentItem | null;
    primaryWeapon?: EquipmentItem | null;
    upperArmor?: EquipmentItem | null;
    lowerArmor?: EquipmentItem | null;
  }
): { item: EquipmentItem; costCC: number; originalCostCC: number; discountPercent: number } {
  const fullCatalog = getFullEquipmentCatalog();

  // 1. Filter items by Hero Class suitability
  const classItems = fullCatalog.filter((item) => {
    if (item.classReq && item.classReq.length > 0) {
      return item.classReq.includes(heroClass);
    }
    return true;
  });

  // 2. Strict level band: [playerLevel - 2, playerLevel + 3]
  const minLvl = Math.max(1, playerLevel - 2);
  const maxLvl = playerLevel + 3;

  let candidates = classItems.filter(
    (item) => item.levelReq >= minLvl && item.levelReq <= maxLvl
  );

  if (candidates.length === 0) {
    candidates = classItems.filter((item) => item.levelReq <= maxLvl);
  }
  if (candidates.length === 0) {
    candidates = classItems;
  }

  // Filter out COMMON junk unless pool is tiny
  const nonCommon = candidates.filter((item) => item.rarity !== 'COMMON');
  const poolToEvaluate = nonCommon.length > 0 ? nonCommon : candidates;

  // 3. Score candidate items by quality and upgrade potential over equipped gear
  const scored = poolToEvaluate.map((item) => {
    let score = 10;

    const rarityScores: Record<ItemRarity, number> = {
      COMMON: 0,
      UNCOMMON: 10,
      RARE: 25,
      EPIC: 45,
      LEGENDARY: 70,
      TRIUMPHANT: 100,
    };
    score += rarityScores[item.rarity] || 0;

    // Prefer items at or slightly above player level
    const levelDiff = item.levelReq - playerLevel;
    if (levelDiff >= 0 && levelDiff <= 2) {
      score += 20;
    } else if (levelDiff > 2) {
      score += 10;
    } else {
      score += Math.max(0, 10 - Math.abs(levelDiff) * 3);
    }

    // Equipment Upgrade Check
    if (playerEquipment) {
      let equipped: EquipmentItem | null = null;
      if (['DAGGER', 'SWORD', 'BOW', 'STAFF'].includes(item.category)) {
        equipped = playerEquipment.weapon ?? playerEquipment.primaryWeapon ?? null;
      } else if (item.category === 'UPPER') {
        equipped = playerEquipment.upperArmor ?? null;
      } else if (item.category === 'LOWER') {
        equipped = playerEquipment.lowerArmor ?? null;
      }

      if (!equipped) {
        // Empty slot bonus
        score += 35;
      } else {
        // Compare damage/defense stats
        if (item.baseDamageMax && equipped.baseDamageMax && item.baseDamageMax > equipped.baseDamageMax) {
          score += 30;
        }
        if (item.baseDefense !== undefined && equipped.baseDefense !== undefined && item.baseDefense > equipped.baseDefense) {
          score += 30;
        }
        if (item.levelReq > equipped.levelReq) {
          score += 15;
        }
      }
    }

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Pick one from top scored items (top 3 for variety)
  const topPool = scored.slice(0, Math.min(3, scored.length));
  const chosen = topPool[Math.floor(Math.random() * topPool.length)].item;

  const discountPercent = 25; // 25% artisan discount
  const originalCostCC = calcCostInCowries(chosen);
  const costCC = Math.max(80, Math.floor(originalCostCC * (1 - discountPercent / 100)));

  return {
    item: chosen,
    costCC,
    originalCostCC,
    discountPercent,
  };
}

// Mythical Boss-specific prefix mapping
const BOSS_PREFIX_MAP: Record<string, string> = {
  boss_act_1: "Ancient Kapre's Ember-Bound",
  boss_act_2: "Siren Matriarch's Abyssal",
  boss_act_3: "Sun God's Solar-Forged",
  boss_act_4: "Caldera Core's Obsidian-Wreathed",
  boss_act_5: "Blood Warlord's Vampiric",
  boss_act_6: "Moon-Crusher's Tidal",
  boss_act_7: "Celestial Arbiter's Apex",
  boss_act_8: "Eclipse Serpent's Void-Shattering",
};

export interface GenerateBossLootOptions {
  bossId: string;
  bossLevelReq: number;
  playerLevel: number;
  heroClass: HeroClass;
  isFirstWin: boolean;
  playerEquipment: {
    weapon?: EquipmentItem | null;
    primaryWeapon?: EquipmentItem | null;
    upperArmor?: EquipmentItem | null;
    lowerArmor?: EquipmentItem | null;
  };
}

/**
 * Generates a guaranteed high-grade Act Guardian Boss Equipment Artifact.
 * - First-time win: Guaranteed LEGENDARY/TRIUMPHANT upgrade (+25% to +35% stats over currently equipped gear in that slot).
 * - Re-attempts: Guaranteed EPIC/LEGENDARY loot equal to or better (0% to +15% stats over currently equipped gear).
 */
export function generateBossLootArtifact(options: GenerateBossLootOptions): EquipmentItem {
  const { bossId, bossLevelReq, playerLevel, heroClass, isFirstWin, playerEquipment } = options;

  const equippedWeapon = playerEquipment.weapon ?? playerEquipment.primaryWeapon ?? null;
  const equippedUpper = playerEquipment.upperArmor ?? null;
  const equippedLower = playerEquipment.lowerArmor ?? null;

  // Decide target slot: WEAPON (50% chance), UPPER ARMOR (25% chance), LOWER ARMOR (25% chance)
  const rand = Math.random();
  let targetCategory: 'WEAPON' | 'UPPER' | 'LOWER' = 'WEAPON';
  if (rand > 0.5 && rand <= 0.75) targetCategory = 'UPPER';
  else if (rand > 0.75) targetCategory = 'LOWER';

  const fullCatalog = getFullEquipmentCatalog();
  const bossPrefix = BOSS_PREFIX_MAP[bossId] || 'Ancestral Guardian';

  const targetLevel = isFirstWin
    ? Math.max(playerLevel + 2, bossLevelReq + 2)
    : Math.max(playerLevel, bossLevelReq);

  const rarity: ItemRarity = isFirstWin
    ? targetLevel >= 40 ? 'TRIUMPHANT' : 'LEGENDARY'
    : Math.random() < 0.5 ? 'EPIC' : 'LEGENDARY';

  if (targetCategory === 'WEAPON') {
    // Pick weapon matching player's Hero Class
    const classWeapons = fullCatalog.filter(
      (i) => ['DAGGER', 'SWORD', 'BOW', 'STAFF'].includes(i.category) && i.classReq?.includes(heroClass)
    );
    const baseTemplate = classWeapons[Math.floor(Math.random() * classWeapons.length)] || fullCatalog[0];

    const { max: baseMax } = calcWeaponDamageForLevel(targetLevel, 5);

    // Guaranteed superiority over equipped weapon
    const equippedMaxDmg = equippedWeapon?.baseDamageMax || 14;
    const statBoostMult = isFirstWin ? 1.30 : 1.10;
    const finalMaxDmg = Math.max(Math.floor(baseMax * statBoostMult), Math.floor(equippedMaxDmg * (isFirstWin ? 1.25 : 1.05)) + 4);
    const finalMinDmg = Math.max(3, Math.floor(finalMaxDmg * 0.75));

    const itemAffixes: Affix[] = [
      WEAPON_STATUS_AFFIXES[(targetLevel - 1) % WEAPON_STATUS_AFFIXES.length],
      ENCHANTER_PREFIXES[(targetLevel + 1) % ENCHANTER_PREFIXES.length],
    ];

    return {
      id: `boss_artifact_${bossId}_${Date.now()}`,
      name: `[${bossPrefix}] ${baseTemplate.name}`,
      category: baseTemplate.category,
      classReq: baseTemplate.classReq,
      tier: Math.min(10, Math.ceil(targetLevel / 5)),
      levelReq: Math.min(playerLevel, targetLevel),
      baseDamageMin: finalMinDmg,
      baseDamageMax: finalMaxDmg,
      damageType: baseTemplate.damageType || 'PHYSICAL',
      inherentPerk: baseTemplate.inherentPerk,
      archetype: baseTemplate.archetype,
      costInCC: calcCostInCowries(targetLevel, rarity),
      rarity,
      affixes: itemAffixes,
    };
  } else {
    // Armor (UPPER or LOWER)
    const categoryName = targetCategory;
    const armors = fullCatalog.filter((i) => i.category === categoryName);
    const baseTemplate = armors[Math.floor(Math.random() * armors.length)] || fullCatalog[0];

    const baseDefense = calcArmorDefenseForLevel(targetLevel, categoryName, 5);
    const equippedDef = categoryName === 'UPPER' ? (equippedUpper?.baseDefense || 8) : (equippedLower?.baseDefense || 6);

    const statBoostMult = isFirstWin ? 1.30 : 1.10;
    const finalDefense = Math.max(Math.floor(baseDefense * statBoostMult), Math.floor(equippedDef * (isFirstWin ? 1.25 : 1.05)) + 3);

    const itemAffixes: Affix[] = [
      ARMOR_STATUS_AFFIXES[(targetLevel - 1) % ARMOR_STATUS_AFFIXES.length],
      ENCHANTER_SUFFIXES[(targetLevel + 2) % ENCHANTER_SUFFIXES.length],
    ];

    return {
      id: `boss_artifact_${bossId}_${Date.now()}`,
      name: `[${bossPrefix}] ${baseTemplate.name}`,
      category: categoryName,
      classReq: baseTemplate.classReq,
      tier: Math.min(10, Math.ceil(targetLevel / 5)),
      levelReq: Math.min(playerLevel, targetLevel),
      baseDefense: finalDefense,
      inherentPerk: baseTemplate.inherentPerk,
      archetype: baseTemplate.archetype,
      costInCC: calcCostInCowries(targetLevel, rarity),
      rarity,
      affixes: itemAffixes,
    };
  }
}


