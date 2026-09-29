import { PrimaryAttributes, DerivedStats, Wallet, EquipmentSlots } from '../types/game';

// Exponential Level & EXP Progression Formula
export function calcExpRequired(level: number): number {
  return Math.floor(120 * Math.pow(1.28, level - 1) + 80 * level);
}

// Process EXP Gain: After leveling up, EXP resets to zero. Optionally enforces maxLevelCap prior to boss defeat.
export function processExpGain(
  currentLevel: number,
  currentExp: number,
  expGained: number,
  maxLevelCap?: number
): { newLevel: number; newExp: number; levelsGained: number; apGained: number } {
  let level = currentLevel;
  let exp = currentExp + expGained;
  let levelsGained = 0;
  let apGained = 0;

  while (true) {
    if (maxLevelCap && level >= maxLevelCap) {
      const required = calcExpRequired(maxLevelCap);
      exp = Math.min(exp, required - 1);
      break;
    }
    const required = calcExpRequired(level);
    if (exp >= required) {
      if (maxLevelCap && level + 1 > maxLevelCap) {
        level = maxLevelCap;
        exp = required - 1;
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

  // Dodge Rate: AGI * 0.3% + bonus
  const dodgeChancePercent = Math.min(60, agi * 0.3 + bonusDodge);

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

  // Power Level Score (Gear & Stat Rating)
  let gearPower = 0;
  equippedItems.forEach((item) => {
    if (item) {
      gearPower += (item.tier || 1) * 20;
      if (item.rarity === 'UNCOMMON') gearPower += 15;
      if (item.rarity === 'RARE') gearPower += 35;
      if (item.rarity === 'EPIC') gearPower += 70;
      if (item.rarity === 'LEGENDARY') gearPower += 120;
      if (item.rarity === 'TRIUMPHANT') gearPower += 200;
    }
  });

  const powerLevel = Math.floor(level * 25 + (str + agi + int + vit) * 5 + gearPower);

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

// Smart Stamina action costs per Act
export function getActStaminaCosts(locationId: string): { ventureCost: number; searchCost: number; bossCost: number } {
  switch (locationId) {
    case 'loc_act_1':
    case 'loc_act_2':
      return { ventureCost: 1, searchCost: 2, bossCost: 2 };
    case 'loc_act_3':
    case 'loc_act_4':
      return { ventureCost: 2, searchCost: 4, bossCost: 4 };
    case 'loc_act_5':
    case 'loc_act_6':
      return { ventureCost: 3, searchCost: 6, bossCost: 6 };
    case 'loc_act_7':
    case 'loc_act_8':
    default:
      return { ventureCost: 4, searchCost: 8, bossCost: 8 };
  }
}
