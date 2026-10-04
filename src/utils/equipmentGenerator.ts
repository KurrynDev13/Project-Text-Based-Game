// equipmentGenerator.ts
// Dynamic procedural equipment generator algorithm for Maharlika: Legends of the Archipelago.
// Generates dense, level-appropriate weapons and armors across levels 1 to 55+
// aligned strictly with the 4 Hero Classes (Mandirigma, Bagani, Mangangaso, Babaylan).

import { EquipmentItem, HeroClass, ItemRarity, WeaponCategory, ArmorCategory, Affix } from '../types/game';
import { DAGGERS, SWORDS, BOWS, STAVES, UPPER_ARMORS, LOWER_ARMORS, WEAPON_STATUS_AFFIXES, ARMOR_STATUS_AFFIXES, ENCHANTER_PREFIXES, ENCHANTER_SUFFIXES, GAME_LOCATIONS } from '../data/equipmentData';
import { calcItemPowerRating } from './gameFormulas';

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
 * Standardized Equipment Naming Engine:
 * Formats: "[Single Prefix] [Base Name] [Single Suffix]"
 * Examples:
 *   - "Dominant Blunt Machete of Combustion"
 *   - "Flame-tempered Simple Woven Breeches"
 *   - "Reinforced Abaca Jerkin of Anito Protection"
 * Rules:
 *   - Strips weakening prefixes ('Novice', 'Crude', 'Worn', etc.) if empowered or blessed.
 *   - Never prepends suffixes (suffixes like 'of Combustion' follow the base name).
 *   - Never stacks multiple prefixes (e.g. no 'Novice Dominant' or 'Dominant Flame-tempered').
 */
export function formatEquipmentFullName(
  rawBaseName: string,
  affixes?: Affix[],
  qualityPrefix?: string
): string {
  const allKnownPrefixes = [...WEAKENING_PREFIXES, ...EMPOWERING_PREFIXES];
  let cleanBaseName = rawBaseName.trim();
  for (const p of allKnownPrefixes) {
    if (cleanBaseName.startsWith(p + ' ')) {
      cleanBaseName = cleanBaseName.substring(p.length + 1).trim();
      break;
    }
  }

  let prefixAffixName: string | undefined;
  let suffixAffixName: string | undefined;

  if (affixes && affixes.length > 0) {
    for (const aff of affixes) {
      if (!aff || !aff.name) continue;
      if (aff.type === 'SUFFIX' || aff.name.toLowerCase().startsWith('of ')) {
        if (!suffixAffixName) suffixAffixName = aff.name;
      } else {
        if (!prefixAffixName) prefixAffixName = aff.name;
      }
    }
  }

  let chosenPrefix = prefixAffixName || qualityPrefix;
  if (chosenPrefix && WEAKENING_PREFIXES.includes(chosenPrefix) && (prefixAffixName || suffixAffixName)) {
    chosenPrefix = prefixAffixName;
  }

  const parts: string[] = [];
  if (chosenPrefix) parts.push(chosenPrefix);
  parts.push(cleanBaseName);
  if (suffixAffixName) parts.push(suffixAffixName);

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

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

      let qualityPrefix: string | undefined = undefined;
      if (lvl < baseItem.levelReq) {
        qualityPrefix = WEAKENING_PREFIXES[(baseItem.levelReq - lvl) % WEAKENING_PREFIXES.length];
      } else if (lvl > baseItem.levelReq + 3) {
        qualityPrefix = EMPOWERING_PREFIXES[(lvl - baseItem.levelReq) % EMPOWERING_PREFIXES.length];
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
        name: formatEquipmentFullName(baseItem.name, itemAffixes, qualityPrefix),
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

      let qualityPrefix: string | undefined = undefined;
      if (lvl < baseItem.levelReq) {
        qualityPrefix = WEAKENING_PREFIXES[(baseItem.levelReq - lvl) % WEAKENING_PREFIXES.length];
      } else if (lvl > baseItem.levelReq + 3) {
        qualityPrefix = EMPOWERING_PREFIXES[(lvl - baseItem.levelReq) % EMPOWERING_PREFIXES.length];
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
        name: formatEquipmentFullName(baseItem.name, itemAffixes, qualityPrefix),
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
 * Extracts canonical base template ID by stripping any timestamp suffix (e.g. "ua_3_1728392183" -> "ua_3")
 */
export function getBaseTemplateId(id: string): string {
  return id.replace(/_\d{10,}$/, '');
}

/**
 * Calculates stock amount for store items based on rarity:
 * Common: 3-5
 * Uncommon: 2-4
 * Rare: 1-2
 * Epic / Legendary / Triumphant: 1
 */
export function getInitialStoreStock(item: EquipmentItem): number {
  const rarity = item.rarity || 'COMMON';
  const seed = Math.abs(item.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
  switch (rarity) {
    case 'COMMON':
      return 3 + (seed % 3); // 3, 4, or 5
    case 'UNCOMMON':
      return 2 + (seed % 3); // 2, 3, or 4
    case 'RARE':
      return 1 + (seed % 2); // 1 or 2
    case 'EPIC':
    case 'LEGENDARY':
    case 'TRIUMPHANT':
    default:
      return 1;
  }
}

/**
 * Returns filtered, level-gated equipment for Panday Pira's Forge store.
 * Sourced from authentic pre-colonial master catalog + level-scaled procedural items with affixes.
 * Always guarantees at least 6-12 class-appropriate weapons and level-scaled armors in stock.
 */
export function getScaledForgeCatalog(
  playerLevel: number,
  heroClass: HeroClass,
  categoryFilter: ForgeCategoryFilter = 'ALL',
  filterByHeroClassOnly: boolean = false,
  currentLocationId: string = 'loc_act_1',
  ngPlusLevel: number = 0
): EquipmentItem[] {
  const masterItems: EquipmentItem[] = [
    ...SWORDS,
    ...DAGGERS,
    ...BOWS,
    ...STAVES,
    ...UPPER_ARMORS,
    ...LOWER_ARMORS,
  ];
  const proceduralCatalog = getFullEquipmentCatalog();
  const combinedCatalog: EquipmentItem[] = [...masterItems, ...proceduralCatalog];

  const minLevel = ngPlusLevel > 0 ? Math.max(35, playerLevel - 8) : Math.max(1, playerLevel - 6);
  const maxLevel = playerLevel + 3;

  const seenIds = new Set<string>();

  let candidates = combinedCatalog.filter((item: EquipmentItem) => {
    // Prevent duplicate entries
    if (seenIds.has(item.id)) return false;

    // Level bracket filtering:
    if (item.levelReq < minLevel || item.levelReq > maxLevel) return false;

    // 3. Class suitability filtering:
    // ALWAYS enforce class compatibility for weapons
    const isWeapon = ['DAGGER', 'SWORD', 'BOW', 'STAFF'].includes(item.category);
    if (isWeapon) {
      if (!item.classReq || !item.classReq.includes(heroClass)) {
        return false;
      }
    } else {
      // For armor, if specific class requirements exist, ensure heroClass is included
      if (item.classReq && item.classReq.length > 0 && !item.classReq.includes(heroClass)) {
        return false;
      }
    }

    // 4. Category Filter
    if (categoryFilter === 'ALL') {
      seenIds.add(item.id);
      return true;
    }
    if (categoryFilter === 'WEAPONS') {
      const ok = isWeapon;
      if (ok) seenIds.add(item.id);
      return ok;
    }
    if (categoryFilter === 'ARMOR') {
      const ok = ['UPPER', 'LOWER'].includes(item.category);
      if (ok) seenIds.add(item.id);
      return ok;
    }
    if (categoryFilter === 'DAGGERS') {
      const ok = item.category === 'DAGGER';
      if (ok) seenIds.add(item.id);
      return ok;
    }
    if (categoryFilter === 'SWORDS') {
      const ok = item.category === 'SWORD';
      if (ok) seenIds.add(item.id);
      return ok;
    }
    if (categoryFilter === 'BOWS') {
      const ok = item.category === 'BOW';
      if (ok) seenIds.add(item.id);
      return ok;
    }
    if (categoryFilter === 'STAVES') {
      const ok = item.category === 'STAFF';
      if (ok) seenIds.add(item.id);
      return ok;
    }
    if (categoryFilter === 'UPPER') {
      const ok = item.category === 'UPPER';
      if (ok) seenIds.add(item.id);
      return ok;
    }
    if (categoryFilter === 'LOWER') {
      const ok = item.category === 'LOWER';
      if (ok) seenIds.add(item.id);
      return ok;
    }

    return true;
  });

  // GUARANTEED ARTISAN STOCK: If stock is depleted, Panday Pira crafts fresh commission gear for player's level
  if (candidates.length < 6) {
    const tier = Math.min(10, Math.max(1, Math.ceil(playerLevel / 5)));
    const rarity = getRarityForLevel(playerLevel);

    const weaponCategory: 'SWORD' | 'DAGGER' | 'BOW' | 'STAFF' =
      heroClass === 'Mandirigma' ? 'SWORD' :
      heroClass === 'Bagani' ? 'DAGGER' :
      heroClass === 'Mangangaso' ? 'BOW' : 'STAFF';

    const weaponArchetypes = {
      SWORD: 'Kampilan / Mandirigma',
      DAGGER: 'Kris / Bagani',
      BOW: 'Pinaka / Mangangaso',
      STAFF: 'Yantok / Babaylan',
    };

    const weaponDmg = calcWeaponDamageForLevel(playerLevel, tier);
    const upperDef = calcArmorDefenseForLevel(playerLevel, 'UPPER', tier);
    const lowerDef = calcArmorDefenseForLevel(playerLevel, 'LOWER', tier);

    const fallbackItems: EquipmentItem[] = [
      {
        id: `artisan_${weaponCategory.toLowerCase()}_lvl_${playerLevel}_a`,
        name: `Panday Pira's Honed ${weaponCategory === 'SWORD' ? 'Kampilan' : weaponCategory === 'DAGGER' ? 'Kris' : weaponCategory === 'BOW' ? 'Pinaka' : 'Staff'}`,
        category: weaponCategory,
        classReq: [heroClass],
        tier,
        levelReq: playerLevel,
        baseDamageMin: weaponDmg.min + 2,
        baseDamageMax: weaponDmg.max + 3,
        damageType: 'PHYSICAL',
        inherentPerk: '+5% Critical Strike Trait',
        archetype: weaponArchetypes[weaponCategory],
        costInCC: calcCostInCowries(playerLevel, rarity),
        rarity,
      },
      {
        id: `artisan_upper_lvl_${playerLevel}_a`,
        name: `Panday Pira's Tempered Pintados Cuirass`,
        category: 'UPPER',
        classReq: ['Mandirigma', 'Bagani', 'Mangangaso', 'Babaylan'],
        tier,
        levelReq: playerLevel,
        baseDefense: upperDef + 2,
        inherentPerk: '+15 Max Health Ward',
        archetype: 'Heavy / Artisan Cuirass',
        costInCC: calcCostInCowries(playerLevel, rarity),
        rarity,
      },
      {
        id: `artisan_lower_lvl_${playerLevel}_a`,
        name: `Panday Pira's Reinforced Abaca Greaves`,
        category: 'LOWER',
        classReq: ['Mandirigma', 'Bagani', 'Mangangaso', 'Babaylan'],
        tier,
        levelReq: playerLevel,
        baseDefense: lowerDef + 2,
        inherentPerk: '+2% Tactical Dodge',
        archetype: 'Medium / Artisan Greaves',
        costInCC: calcCostInCowries(playerLevel, rarity),
        rarity,
      },
      {
        id: `artisan_${weaponCategory.toLowerCase()}_lvl_${Math.max(1, playerLevel - 1)}_b`,
        name: `Ancestral Tempered ${weaponCategory === 'SWORD' ? 'Bolo' : weaponCategory === 'DAGGER' ? 'Balisong' : weaponCategory === 'BOW' ? 'Recurve' : 'Cane'}`,
        category: weaponCategory,
        classReq: [heroClass],
        tier,
        levelReq: Math.max(1, playerLevel - 1),
        baseDamageMin: weaponDmg.min,
        baseDamageMax: weaponDmg.max,
        damageType: 'PHYSICAL',
        inherentPerk: 'Balanced Pre-Colonial Forge',
        archetype: weaponArchetypes[weaponCategory],
        costInCC: Math.floor(calcCostInCowries(playerLevel, rarity) * 0.85),
        rarity,
      },
      {
        id: `artisan_upper_lvl_${Math.max(1, playerLevel - 1)}_b`,
        name: `Hardened Carabao Hide Vest`,
        category: 'UPPER',
        classReq: ['Mandirigma', 'Bagani', 'Mangangaso', 'Babaylan'],
        tier,
        levelReq: Math.max(1, playerLevel - 1),
        baseDefense: upperDef,
        inherentPerk: 'Poblacion Smith Armor',
        archetype: 'Medium / Warrior Vest',
        costInCC: Math.floor(calcCostInCowries(playerLevel, rarity) * 0.85),
        rarity,
      },
      {
        id: `artisan_lower_lvl_${Math.max(1, playerLevel - 1)}_b`,
        name: `Heavy Carabao Leather Trousers`,
        category: 'LOWER',
        classReq: ['Mandirigma', 'Bagani', 'Mangangaso', 'Babaylan'],
        tier,
        levelReq: Math.max(1, playerLevel - 1),
        baseDefense: lowerDef,
        inherentPerk: 'Poblacion Smith Breeches',
        archetype: 'Medium / Warrior Trousers',
        costInCC: Math.floor(calcCostInCowries(playerLevel, rarity) * 0.85),
        rarity,
      },
    ];

    fallbackItems.forEach((fb) => {
      if (!seenIds.has(fb.id)) {
        if (categoryFilter === 'ALL' ||
           (categoryFilter === 'WEAPONS' && fb.category === weaponCategory) ||
           (categoryFilter === 'ARMOR' && ['UPPER', 'LOWER'].includes(fb.category))) {
          seenIds.add(fb.id);
          candidates.push(fb);
        }
      }
    });
  }

  // Sort by level descending (highest level upgrades first), then power rating descending
  return candidates.sort((a, b) => b.levelReq - a.levelReq || calcItemPowerRating(b) - calcItemPowerRating(a));
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


