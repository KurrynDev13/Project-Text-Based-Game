import { PrimaryAttributes, DerivedStats, Wallet, EquipmentSlots } from '../types/game';

// Exponential Level & EXP Progression Formula
export function calcExpRequired(level: number): number {
  return Math.floor(120 * Math.pow(1.28, level - 1) + 80 * level);
}

// Process EXP Gain: After leveling up, EXP resets to zero
export function processExpGain(
  currentLevel: number,
  currentExp: number,
  expGained: number
): { newLevel: number; newExp: number; levelsGained: number; apGained: number } {
  let level = currentLevel;
  let exp = currentExp + expGained;
  let levelsGained = 0;
  let apGained = 0;

  while (true) {
    const required = calcExpRequired(level);
    if (exp >= required) {
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
    equipment.bike,
  ].filter(Boolean);

  equippedItems.forEach((item) => {
    if (item) {
      if (item.baseDefense) bonusArmor += item.baseDefense;
      if (item.affixes) {
        item.affixes.forEach((affix) => {
          if (affix.statBonus.flatArmor) bonusArmor += affix.statBonus.flatArmor;
          if (affix.statBonus.flatHp) bonusHp += affix.statBonus.flatHp;
          if (affix.statBonus.flatMp) bonusMp += affix.statBonus.flatMp;
          if (affix.statBonus.dodgePercent) bonusDodge += affix.statBonus.dodgePercent;
          if (affix.statBonus.critPercent) bonusCrit += affix.statBonus.critPercent;
          if (affix.statBonus.str) bonusHp += affix.statBonus.str * 10;
        });
      }
    }
  });

  // Formulas from Game Design Document:
  // Max HP: 100 + (VIT * 25) + (Level * 15)
  const maxHp = Math.floor(100 + vit * 25 + level * 15 + bonusHp);

  // Max MP: 50 + (INT * 10) + (Level * 8)
  const maxMp = Math.floor(50 + int * 10 + level * 8 + bonusMp);

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

  // Power Level Score (Titan Conquest Style Gear Rating)
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

// Currency Helper Functions (1 GS = 100 SS = 10,000 CC)
export function totalCopperFromWallet(wallet: Wallet): number {
  return (
    wallet.goldSovereigns * 10000 +
    wallet.silverShillings * 100 +
    wallet.copperCoins
  );
}

export function copperToWallet(totalCopper: number, shards: number = 0): Wallet {
  const safeCopper = Math.max(0, totalCopper);
  const goldSovereigns = Math.floor(safeCopper / 10000);
  const remainderAfterGold = safeCopper % 10000;
  const silverShillings = Math.floor(remainderAfterGold / 100);
  const copperCoins = remainderAfterGold % 100;

  return {
    goldSovereigns,
    silverShillings,
    copperCoins,
    prismaticShards: shards,
  };
}

export function formatCurrencyShort(wallet: Wallet): string {
  const parts: string[] = [];
  if (wallet.goldSovereigns > 0) parts.push(`${wallet.goldSovereigns} GS`);
  if (wallet.silverShillings > 0 || wallet.goldSovereigns > 0) parts.push(`${wallet.silverShillings} SS`);
  parts.push(`${wallet.copperCoins} CC`);
  return parts.join(' ');
}

export function formatCostInCC(costInCC: number): string {
  const tempWallet = copperToWallet(costInCC);
  return formatCurrencyShort(tempWallet);
}
