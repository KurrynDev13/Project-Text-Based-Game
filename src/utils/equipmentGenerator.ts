// equipmentGenerator.ts
// Dynamic procedural equipment generator algorithm for Maharlika: Legends of the Archipelago.
// Generates dense, level-appropriate weapons and armors across levels 1 to 55+
// aligned strictly with the 4 Hero Classes (Mandirigma, Bagani, Mangangaso, Babaylan).

import { EquipmentItem, HeroClass, ItemRarity, WeaponCategory, ArmorCategory, Affix } from '../types/game';
import { DAGGERS, SWORDS, BOWS, STAVES, UPPER_ARMORS, LOWER_ARMORS, WEAPON_STATUS_AFFIXES, ARMOR_STATUS_AFFIXES, ENCHANTER_PREFIXES, ENCHANTER_SUFFIXES } from '../data/equipmentData';

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
export function calcCostInCowries(level: number, rarity: ItemRarity): number {
  const rarityMult: Record<ItemRarity, number> = {
    COMMON: 1.0,
    UNCOMMON: 1.5,
    RARE: 2.2,
    EPIC: 3.5,
    LEGENDARY: 6.0,
    TRIUMPHANT: 10.0,
  };
  const baseCost = 25 * Math.pow(1.18, Math.min(level, 50)) + level * 40;
  return Math.floor(baseCost * (rarityMult[rarity] || 1.0));
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
  filterByHeroClassOnly: boolean = true
): EquipmentItem[] {
  // 1. Level-gating: show items up to [Current Level] + 2
  const maxVisibleLevel = playerLevel + 2;
  const fullCatalog = getFullEquipmentCatalog();

  return fullCatalog.filter((item: EquipmentItem) => {
    // 1. Level-gating: show items up to [Current Level] + 5
    if (item.levelReq > maxVisibleLevel) return false;

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
}

