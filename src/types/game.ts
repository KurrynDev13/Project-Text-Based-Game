// Character Attributes & Stats
export interface PrimaryAttributes {
  str: number; // Strength (+2.5 Phys DMG Melee, +1 Inv Cap per 2 pts)
  agi: number; // Agility (+2.5 Phys DMG Bows/Daggers, +0.3% Dodge, +0.5% Crit)
  int: number; // Intelligence (+3.0 Magic DMG Staves, +10 Max MP, +0.5 Magic Def)
  vit: number; // Vitality (+25 Max HP, +0.8 Armor, +1 HP regen outside combat)
}

export interface DerivedStats {
  maxHp: number;
  maxMp: number;
  physicalArmor: number;
  magicDefense: number;
  damageReductionPercent: number; // [Armor / (Armor + 150)] * 100
  dodgeChancePercent: number;
  critChancePercent: number;
  meleeDamage: number;
  rangedDamage: number;
  magicDamage: number;
  inventoryCapacity: number;
  expRequiredNextLevel: number;
  powerLevel: number; // Overall gear & stat score (Titan Conquest style)
}

// Currency System
export interface Wallet {
  copperCoins: number; // CC
  silverShillings: number; // SS (1 SS = 100 CC)
  goldSovereigns: number; // GS (1 GS = 100 SS = 10,000 CC)
  prismaticShards: number; // PS (Dungeon/Memory salvage for affix rerolling)
}

// Memory & Decryption (Titan Conquest Codebreaker System)
export type MemoryRarity = 'WHITE' | 'GREEN' | 'BLUE' | 'PURPLE' | 'RED';

export interface EncryptedMemory {
  id: string;
  name: string;
  rarity: MemoryRarity;
  minLevel: number;
  acquiredAtLocation: string;
}

// Equipment Types & Catalogs
export type WeaponSlotType = 'PRIMARY' | 'SPECIAL' | 'HEAVY';
export type WeaponCategory = 'DAGGER' | 'SWORD' | 'BOW' | 'STAFF';
export type ArmorCategory = 'UPPER' | 'LOWER';
export type VehicleCategory = 'BIKE' | 'MOUNT';
export type ItemRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'TRIUMPHANT';

export interface Affix {
  id: string;
  name: string;
  type: 'PREFIX' | 'SUFFIX';
  statBonus: Partial<PrimaryAttributes> & {
    flatArmor?: number;
    flatHp?: number;
    flatMp?: number;
    critPercent?: number;
    dodgePercent?: number;
    magicResist?: number;
  };
}

export interface EquipmentItem {
  id: string;
  name: string;
  category: WeaponCategory | ArmorCategory | VehicleCategory;
  weaponSlot?: WeaponSlotType; // Primary, Special, or Heavy
  tier: number; // Tier 1-10
  levelReq: number;
  baseDefense?: number;
  baseDamageMin?: number;
  baseDamageMax?: number;
  damageType?: 'PHYSICAL' | 'MAGIC' | 'FIRE' | 'FROST' | 'LIGHTNING' | 'SHADOW' | 'RADIANT';
  inherentPerk: string;
  archetype: string;
  costInCC: number;
  rarity: ItemRarity;
  affixes?: Affix[];
}

export type ConsumableCategory = 'POTION' | 'FOOD' | 'ELIXIR' | 'VIAL';

export interface ConsumableItem {
  id: string;
  name: string;
  category: ConsumableCategory;
  costInCC: number;
  effectDescription: string;
  durationTurns: number; // 0 for instant
  hpRestore?: number;
  mpRestore?: number;
  cleansesDebuffs?: boolean;
  grantsBuff?: StatusEffectType;
}

// Status Effects (Buffs & Debuffs)
export type StatusEffectType = 
  | 'FORTIFIED' // Buff: +20% total Armor
  | 'HASTE' // Buff: +25% action speed (extra turn every 4 rounds)
  | 'REGENERATION' // Buff: Restores 4% Max HP per combat turn
  | 'EMPOWERED' // Buff: Next spell/skill deals 50% more base dmg
  | 'BLEED' // Debuff: 5% Max HP pure physical dmg (ignores armor), 3 turns
  | 'BURN' // Debuff: Flat fire dmg per turn, halves healing, 4 turns
  | 'POISON' // Debuff: Escalating nature dmg (1x, 2x, 3x), 3 turns
  | 'EXHAUSTION'; // Debuff: -50% stamina/mana regen, -15% dodge

export interface ActiveStatusEffect {
  type: StatusEffectType;
  name: string;
  isBuff: boolean;
  durationTurnsLeft: number;
  magnitude: number;
  stackCount: number;
}

// Character Equipment Slots (Titan Conquest Inspired)
export interface EquipmentSlots {
  upperArmor: EquipmentItem | null;
  lowerArmor: EquipmentItem | null;
  primaryWeapon: EquipmentItem | null;
  specialWeapon: EquipmentItem | null;
  heavyWeapon: EquipmentItem | null;
  bike: EquipmentItem | null;
}

// World Locations & Exploration (Titan Conquest Location Points System)
export interface GameLocation {
  id: string;
  name: string;
  subtitle: string;
  minLevel: number;
  lpRequired: number; // Location Points needed to unlock
  description: string;
  bgGradient: string;
  monsters: string[]; // monster IDs
  memoryDropRates: { rarity: MemoryRarity; chance: number }[];
}

export interface Bounty {
  id: string;
  bountyNumber?: number;
  title: string;
  minLevel?: number;
  actId?: string;
  targetMonsterName: string;
  targetMonsterId: string;
  targetCount: number;
  currentCount: number;
  rewardExp: number;
  rewardCC: number;
  rewardMemoryRarity: MemoryRarity;
  isAccepted?: boolean;
  isCompleted: boolean;
  isClaimed: boolean;
}

export interface SideQuest {
  id: string;
  title: string;
  giver: string;
  description: string;
  objectiveText: string;
  progressCurrent: number;
  progressRequired: number;
  rewardText: string;
  isCompleted: boolean;
  isClaimed: boolean;
}

// Player Character State
export interface PlayerCharacter {
  name: string;
  heroClass: string;
  level: number;
  exp: number;
  availableAP: number; // Attribute Points
  attributes: PrimaryAttributes;
  currentHp: number;
  currentMp: number;
  stamina: number; // Energy / Stamina (e.g. 18)
  maxStamina: number; // Max Stamina (e.g. 20)
  wallet: Wallet;
  equipment: EquipmentSlots;
  inventory: Array<EquipmentItem | ConsumableItem>;
  stash: Array<EquipmentItem | ConsumableItem>; // Account Vault / Stash at Haven's Rest
  encryptedMemories: EncryptedMemory[]; // Codebreaker decrypt queue
  activeEffects: ActiveStatusEffect[];
  locationPoints: number; // LP earned through battles
  currentLocationId: string;
  unlockedLocationIds: string[];
  bounties: Bounty[];
  sideQuests?: SideQuest[];
  isEmpoweredNextTurn?: boolean;
  isCoveredNextTurn?: boolean;
}

// Monster / Enemy State
export interface EnemyMonster {
  id: string;
  name: string;
  title: string;
  level: number;
  maxHp: number;
  currentHp: number;
  armor: number;
  attackMin: number;
  attackMax: number;
  damageType: 'PHYSICAL' | 'MAGIC' | 'FIRE' | 'FROST' | 'LIGHTNING' | 'SHADOW';
  expReward: number;
  copperReward: number;
  shardChance: number;
  memoryDropRarity?: MemoryRarity;
  specialAbility?: string;
  activeEffects: ActiveStatusEffect[];
  spriteIcon: string;
}

// Combat State
export interface BattleState {
  inCombat: boolean;
  turnNumber: number;
  playerActionGauge: number;
  enemyActionGauge: number;
  enemy: EnemyMonster | null;
  logs: BattleLogEntry[];
  winner: 'PLAYER' | 'ENEMY' | null;
}

export interface BattleLogEntry {
  id: string;
  turn: number;
  actor: 'PLAYER' | 'ENEMY' | 'SYSTEM' | 'EFFECT';
  text: string;
  type: 'INFO' | 'DAMAGE' | 'HEAL' | 'BUFF' | 'DEBUFF' | 'CRIT' | 'PERK' | 'DROP';
}
