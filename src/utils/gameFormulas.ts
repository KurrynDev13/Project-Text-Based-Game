import { PrimaryAttributes, DerivedStats, Wallet, EquipmentSlots, EquipmentItem } from '../types/game';

// Exponential Level & EXP Progression Formula
export function calcExpRequired(level: number): number {
  return Math.floor(120 * Math.pow(1.28, level - 1) + 80 * level);
}

/** Sanitizes inventory or stash items so every item is guaranteed to have a 100% unique ID */
export function sanitizeItemIds<T extends { id?: string }>(items: T[]): T[] {
  const seenIds = new Set<string>();
  return items.map((item, idx) => {
    if (!item.id || seenIds.has(item.id)) {
      const uniqueId = `${item.id || 'item'}_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
      seenIds.add(uniqueId);
      return { ...item, id: uniqueId };
    }
    seenIds.add(item.id);
    return item;
  });
}

// Formula-driven Level-scaled EXP reward helpers (scales smoothly with 1.24^level progression curve)
export function calcBountyExpReward(targetLevel: number, baseReward: number = 150): number {
  return Math.floor(baseReward * Math.pow(1.24, Math.max(0, targetLevel - 1)));
}

export function calcSideQuestExpReward(targetLevel: number, baseReward: number = 250): number {
  return Math.floor(baseReward * Math.pow(1.24, Math.max(0, targetLevel - 1)));
}

// ─── Equipment Rating & Delta vs Equipped Comparison ─────────────────────────

export function calcItemPowerRating(item: EquipmentItem | null): number {
  if (!item) return 0;

  let score = 0;

  // Tier & Rarity base power rating
  score += (item.tier || 1) * 10;
  if (item.rarity === 'UNCOMMON') score += 10;
  else if (item.rarity === 'RARE') score += 25;
  else if (item.rarity === 'EPIC') score += 50;
  else if (item.rarity === 'LEGENDARY') score += 90;
  else if (item.rarity === 'TRIUMPHANT') score += 150;

  // Base Damage (weapons)
  if (item.baseDamageMin !== undefined && item.baseDamageMax !== undefined) {
    const avgDmg = (item.baseDamageMin + item.baseDamageMax) / 2;
    score += avgDmg * 2.5;
  }

  // Base Armor (armor / mounts)
  if (item.baseDefense) {
    score += item.baseDefense * 1.5;
  }

  // Affix stat bonuses (STR, AGI, INT, VIT, Crit, Dodge, M.Res, Flat HP/MP/Armor)
  if (item.affixes) {
    item.affixes.forEach((aff) => {
      if (aff.statBonus) {
        const b = aff.statBonus;
        if (b.str) score += b.str * 4.0;
        if (b.agi) score += b.agi * 4.0;
        if (b.int) score += b.int * 4.0;
        if (b.vit) score += b.vit * 4.5;
        if (b.flatArmor) score += b.flatArmor * 1.5;
        if (b.flatHp) score += b.flatHp * 0.2;
        if (b.flatMp) score += b.flatMp * 0.2;
        if (b.critPercent) score += b.critPercent * 3.5;
        if (b.dodgePercent) score += b.dodgePercent * 3.5;
        if (b.magicResist) score += b.magicResist * 2.0;
      }
      if (aff.statusInfliction) score += 20;
      if (aff.statusMitigation) score += 20;
    });
  }

  return Math.round(score);
}

export function getEquippedItemForCategory(equipment: EquipmentSlots, category: string): EquipmentItem | null {
  if (!equipment) return null;
  if (category === 'UPPER') return equipment.upperArmor || null;
  if (category === 'LOWER') return equipment.lowerArmor || null;
  if (['DAGGER', 'SWORD', 'BOW', 'STAFF'].includes(category)) {
    return equipment.weapon ?? equipment.primaryWeapon ?? null;
  }
  if (category === 'MOUNT' || category === 'BIKE') {
    return equipment.mount ?? equipment.bike ?? null;
  }
  return null;
}

export interface ItemDeltaSummary {
  deltaPower: number;
  deltaArmor: number;
  deltaAvgDamage: number;
  statHighlights: string[];
}

export function calcItemDelta(candidate: EquipmentItem, equipped: EquipmentItem | null): ItemDeltaSummary {
  const candidatePower = calcItemPowerRating(candidate);
  const equippedPower = calcItemPowerRating(equipped);
  const deltaPower = candidatePower - equippedPower;

  // Armor delta
  const candArmor = candidate.baseDefense || 0;
  const eqArmor = equipped?.baseDefense || 0;
  const deltaArmor = candArmor - eqArmor;

  // Weapon Damage delta
  let deltaAvgDamage = 0;
  if (candidate.baseDamageMin !== undefined && candidate.baseDamageMax !== undefined) {
    const candAvg = (candidate.baseDamageMin + candidate.baseDamageMax) / 2;
    const eqAvg = equipped && equipped.baseDamageMin !== undefined && equipped.baseDamageMax !== undefined
      ? (equipped.baseDamageMin + equipped.baseDamageMax) / 2
      : 0;
    deltaAvgDamage = Math.round(candAvg - eqAvg);
  }

  // Stat highlights comparison
  const statHighlights: string[] = [];
  if (candidate.affixes) {
    candidate.affixes.forEach((aff) => {
      if (aff.statBonus) {
        const b = aff.statBonus;
        if (b.str) statHighlights.push(`+${b.str} STR`);
        if (b.agi) statHighlights.push(`+${b.agi} AGI`);
        if (b.int) statHighlights.push(`+${b.int} INT`);
        if (b.vit) statHighlights.push(`+${b.vit} VIT`);
        if (b.critPercent) statHighlights.push(`+${b.critPercent}% Crit`);
        if (b.dodgePercent) statHighlights.push(`+${b.dodgePercent}% Dodge`);
      }
    });
  }

  return {
    deltaPower,
    deltaArmor,
    deltaAvgDamage,
    statHighlights,
  };
}

// Process EXP Gain: After leveling up, EXP resets to zero. Enforces 65% freeze cap when maxLevelCap is active.
export function processExpGain(
  currentLevel: number,
  currentExp: number,
  expGained: number,
  maxLevelCap?: number,
  freezePercent: number = 0.65
): { newLevel: number; newExp: number; levelsGained: number; apGained: number } {
  let level = currentLevel;
  let exp = currentExp + expGained;
  let levelsGained = 0;
  let apGained = 0;

  while (true) {
    if (maxLevelCap && level >= maxLevelCap) {
      const required = calcExpRequired(maxLevelCap);
      const frozenCap = Math.floor(required * freezePercent);
      exp = Math.min(exp, frozenCap);
      break;
    }
    const required = calcExpRequired(level);
    if (exp >= required) {
      if (maxLevelCap && level + 1 >= maxLevelCap) {
        level = maxLevelCap;
        const requiredCap = calcExpRequired(maxLevelCap);
        exp = Math.floor(requiredCap * freezePercent);
        break;
      }
      level += 1;
      levelsGained += 1;
      apGained += 3;
      exp = 0; // Resets to zero after level up
    } else {
      break;
    }
  }

  return { newLevel: level, newExp: exp, levelsGained, apGained };
}

// Derived Stats Calculator
export function calcDerivedStats(
  attributes: PrimaryAttributes,
  level: number,
  equipment: EquipmentSlots
): DerivedStats {
  const { str, agi, int, vit } = attributes;

  // Equipment Stat Bonuses
  let bonusArmor = 0;
  let bonusHp = 0;
  let bonusMp = 0;
  let bonusDodge = 0;
  let bonusCrit = 0;
  let bonusMagicDef = 0;

  const equippedItems = [
    equipment.upperArmor,
    equipment.lowerArmor,
    equipment.primaryWeapon,
    equipment.specialWeapon,
    equipment.heavyWeapon,
    equipment.mount || equipment.bike,
  ].filter(Boolean);

  equippedItems.forEach((item) => {
    if (item) {
      if (item.baseDefense) bonusArmor += item.baseDefense;
      if (item.affixes) {
        item.affixes.forEach((affix) => {
          if (affix.statBonus) {
            if (affix.statBonus.flatArmor) bonusArmor += affix.statBonus.flatArmor;
            if (affix.statBonus.flatHp) bonusHp += affix.statBonus.flatHp;
            if (affix.statBonus.flatMp) bonusMp += affix.statBonus.flatMp;
            if (affix.statBonus.dodgePercent) bonusDodge += affix.statBonus.dodgePercent;
            if (affix.statBonus.critPercent) bonusCrit += affix.statBonus.critPercent;
            if (affix.statBonus.str) bonusHp += affix.statBonus.str * 10;
          }
        });
      }

      // Mythical Mount Stat Perk Integration
      if (item.category === 'MOUNT' || item.category === 'BIKE') {
        if (item.id === 'mount_1') {
          // Armored Tamaraw: +250 Max HP
          bonusHp += 250;
        } else if (item.id === 'mount_2') {
          // Sacred Mountain Carabao: +100 Max MP
          bonusMp += 100;
        } else if (item.id === 'mount_3') {
          // Gilded Sarimanok Drake: +20% Dodge
          bonusDodge += 20;
        } else if (item.id === 'mount_4') {
          // Tamed Shadow Sigbin: +15% Crit
          bonusCrit += 15;
        } else if (item.id === 'mount_5') {
          // Moon Dragon Wyrmling: +500 Max HP, +200 Max MP, +10% Crit, +10% Dodge
          bonusHp += 500;
          bonusMp += 200;
          bonusCrit += 10;
          bonusDodge += 10;
        }
      }
    }
  });

  // Formulas from Game Design Document:
  // Max HP: 100 + (VIT * 25) + (Level * 15)
  const maxHp = Math.floor(100 + vit * 25 + level * 15 + bonusHp);

  // Max MP: 30 + (INT * 5) + (Level * 4) (balanced to prevent skill spamming)
  const maxMp = Math.floor(30 + int * 5 + level * 4 + bonusMp);

  // Physical Armor: VIT * 0.8 + Equipment
  const totalArmor = Math.floor(vit * 0.8 + bonusArmor);

  // Damage Reduction (%): [Armor / (Armor + 150)] * 100
  const damageReductionPercent = Math.min(85, (totalArmor / (totalArmor + 150)) * 100);

  // Dodge Rate: AGI * 0.5% + bonus (increased from 0.3 for more impactful AGI builds)
  const dodgeChancePercent = Math.min(60, agi * 0.5 + bonusDodge);

  // Crit Hit Chance: AGI * 0.5% + bonus
  const critChancePercent = Math.min(75, agi * 0.5 + bonusCrit);

  // Magic Defense: INT * 0.5 + bonus
  const magicDefense = int * 0.5 + bonusMagicDef;

  // Melee Physical DMG: STR * 2.5
  const meleeDamage = str * 2.5;

  // Bows/Daggers DMG: AGI * 2.5
  const rangedDamage = agi * 2.5;

  // Magic Staves DMG: INT * 3.0
  const magicDamage = int * 3.0;

  // Inventory Capacity: Base 12 + 1 slot per 2 STR points
  const inventoryCapacity = 12 + Math.floor(str / 2);

  const expRequiredNextLevel = calcExpRequired(level);

  // Power Level Score (Titan Power Rating using exact calcItemPowerRating for gear)
  let totalEquippedGearPower = 0;
  equippedItems.forEach((item) => {
    if (item) {
      totalEquippedGearPower += calcItemPowerRating(item);
    }
  });

  const powerLevel = Math.floor(level * 20 + (str + agi + int + vit) * 4 + totalEquippedGearPower);

  return {
    maxHp,
    maxMp,
    physicalArmor: totalArmor,
    magicDefense,
    damageReductionPercent,
    dodgeChancePercent,
    critChancePercent,
    meleeDamage,
    rangedDamage,
    magicDamage,
    inventoryCapacity,
    expRequiredNextLevel,
    powerLevel,
  };
}

// Pre-Colonial Currency Helper Functions (1 Gold = 100 Silver = 10,000 Cowrie Shells)
export function totalCowriesFromWallet(wallet: Wallet): number {
  const gold = wallet.goldIngots ?? wallet.goldSovereigns ?? 0;
  const silver = wallet.silverPieces ?? wallet.silverShillings ?? 0;
  const cowries = wallet.cowrieShells ?? wallet.copperCoins ?? 0;
  return gold * 10000 + silver * 100 + cowries;
}

export function cowriesToWallet(totalCowries: number, mutya: number = 0): Wallet {
  const safeCowries = Math.max(0, totalCowries);
  const goldIngots = Math.floor(safeCowries / 10000);
  const remainderAfterGold = safeCowries % 10000;
  const silverPieces = Math.floor(remainderAfterGold / 100);
  const cowrieShells = remainderAfterGold % 100;

  return {
    goldIngots,
    silverPieces,
    cowrieShells,
    mutyaShards: mutya,
    // Backward-compatible mirror fields
    goldSovereigns: goldIngots,
    silverShillings: silverPieces,
    copperCoins: cowrieShells,
    prismaticShards: mutya,
  };
}

export function formatCowriesShort(wallet: Wallet): string {
  const gold = wallet.goldIngots ?? wallet.goldSovereigns ?? 0;
  const silver = wallet.silverPieces ?? wallet.silverShillings ?? 0;
  const cowries = wallet.cowrieShells ?? wallet.copperCoins ?? 0;

  const parts: string[] = [];
  if (gold > 0) parts.push(`${gold} Gold`);
  if (silver > 0 || gold > 0) parts.push(`${silver} Silver`);
  parts.push(`${cowries} Shells`);
  return parts.join(' ');
}

export function formatCostInCowries(costInCowries: number): string {
  const tempWallet = cowriesToWallet(costInCowries);
  return formatCowriesShort(tempWallet);
}

// Backward-compatible aliases
export const totalCopperFromWallet = totalCowriesFromWallet;
export const copperToWallet = cowriesToWallet;
export const formatCurrencyShort = formatCowriesShort;
export const formatCostInCC = formatCostInCowries;

// Max Stamina formula based on player level / unlocked Act tier
export function calcMaxStamina(playerLevel: number): number {
  if (playerLevel >= 47) return 55; // Act VIII (Bakunawa Eclipse)
  if (playerLevel >= 40) return 50; // Act VII (Sky Citadel)
  if (playerLevel >= 33) return 45; // Act VI (Abyssal Tide)
  if (playerLevel >= 26) return 40; // Act V (Blood Coast)
  if (playerLevel >= 19) return 35; // Act IV (Caldera)
  if (playerLevel >= 13) return 30; // Act III (Ancestral Dead)
  if (playerLevel >= 7)  return 25; // Act II (Sirens Lagoon)
  return 20;                        // Act I (Balete Forest)
}

// Smart Stamina action costs per Act & NG+ Tier
export function getActStaminaCosts(locationId: string, ngPlusLevel: number = 0): { ventureCost: number; searchCost: number; bossCost: number } {
  let baseVenture = 1;
  let baseSearch = 2;
  let baseBoss = 2;

  switch (locationId) {
    case 'loc_act_1':
      baseVenture = 1; baseSearch = 2; baseBoss = 2; break;
    case 'loc_act_2':
      baseVenture = 1; baseSearch = 3; baseBoss = 3; break;
    case 'loc_act_3':
      baseVenture = 2; baseSearch = 4; baseBoss = 4; break;
    case 'loc_act_4':
      baseVenture = 2; baseSearch = 5; baseBoss = 5; break;
    case 'loc_act_5':
      baseVenture = 3; baseSearch = 6; baseBoss = 6; break;
    case 'loc_act_6':
      baseVenture = 3; baseSearch = 7; baseBoss = 7; break;
    case 'loc_act_7':
      baseVenture = 4; baseSearch = 8; baseBoss = 8; break;
    case 'loc_act_8':
      baseVenture = 4; baseSearch = 9; baseBoss = 9; break;
    case 'loc_act_infinite':
      baseVenture = 5; baseSearch = 10; baseBoss = 10; break;
    default:
      baseVenture = 2; baseSearch = 4; baseBoss = 4; break;
  }

  if (ngPlusLevel > 0) {
    const ventureCost = baseVenture + 1 + ngPlusLevel;
    const searchCost = baseSearch + 2 + (ngPlusLevel * 2);
    const bossCost = baseBoss + 2 + (ngPlusLevel * 2);
    return { ventureCost, searchCost, bossCost };
  }

  return { ventureCost: baseVenture, searchCost: baseSearch, bossCost: baseBoss };
}

/** Dynamically calculates the required Titan Power Rating for an Act, scaled by NG+ level */
export function calcRequiredActPower(actId: string, ngPlusLevel: number = 0): number {
  const baseMap: Record<string, number> = {
    loc_act_1: 0,
    loc_act_2: 450,
    loc_act_3: 850,
    loc_act_4: 1450,
    loc_act_5: 2200,
    loc_act_6: 3200,
    loc_act_7: 4500,
    loc_act_8: 6000,
    loc_act_infinite: 7500,
  };
  const base = baseMap[actId] ?? 0;
  return Math.floor(base * (1 + ngPlusLevel * 0.65));
}

/** Standardized inventory auto-sorter using calcItemPowerRating (matching Delta vs Equipped) */
export function sortInventory<T extends { category?: string; tier?: number; classReq?: string[] }>(
  inventory: T[],
  mode: 'POWER' | 'CLASS' | 'TYPE' = 'POWER'
): T[] {
  const classOrder: Record<string, number> = { Mandirigma: 1, Bagani: 2, Mangangaso: 3, Babaylan: 4 };
  const catOrder: Record<string, number> = {
    UPPER: 1, LOWER: 2, DAGGER: 3, SWORD: 4, BOW: 5, STAFF: 6, MOUNT: 7, BIKE: 7,
    POTION: 8, FOOD: 9, ELIXIR: 10, VIAL: 11
  };

  return [...inventory].sort((a, b) => {
    const isEqA = 'category' in a && 'tier' in a;
    const isEqB = 'category' in b && 'tier' in b;

    if (mode === 'POWER') {
      const pA = isEqA ? calcItemPowerRating(a as unknown as EquipmentItem) : 0;
      const pB = isEqB ? calcItemPowerRating(b as unknown as EquipmentItem) : 0;
      if (pA !== pB) return pB - pA;
      const tierA = (a as unknown as EquipmentItem).tier || 1;
      const tierB = (b as unknown as EquipmentItem).tier || 1;
      return tierB - tierA;
    }

    if (mode === 'CLASS') {
      const cA = isEqA && (a as unknown as EquipmentItem).classReq?.[0] ? (classOrder[(a as unknown as EquipmentItem).classReq![0]] || 5) : 99;
      const cB = isEqB && (b as unknown as EquipmentItem).classReq?.[0] ? (classOrder[(b as unknown as EquipmentItem).classReq![0]] || 5) : 99;
      if (cA !== cB) return cA - cB;
      const pA = isEqA ? calcItemPowerRating(a as unknown as EquipmentItem) : 0;
      const pB = isEqB ? calcItemPowerRating(b as unknown as EquipmentItem) : 0;
      return pB - pA;
    }

    if (mode === 'TYPE') {
      const tA = 'category' in a && a.category ? (catOrder[a.category] || 99) : 99;
      const tB = 'category' in b && b.category ? (catOrder[b.category] || 99) : 99;
      if (tA !== tB) return tA - tB;
      const pA = isEqA ? calcItemPowerRating(a as unknown as EquipmentItem) : 0;
      const pB = isEqB ? calcItemPowerRating(b as unknown as EquipmentItem) : 0;
      return pB - pA;
    }

    return 0;
  });
}

