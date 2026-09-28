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

// Currency System (Pre-Colonial Philippine 100:1 Ratio)
export interface Wallet {
  cowrieShells: number; // Base everyday trade currency (replaces CC)
  silverPieces: number; // 1 Silver Piece = 100 Cowrie Shells (replaces SS)
  goldIngots: number; // 1 Gold Ingot = 100 Silver Pieces = 10,000 Cowrie Shells (replaces GS)
  mutyaShards: number; // Sacred dungeon pearls & anting-anting fragments for affix rerolling (replaces PS)
  // Mirror fields for seamless type compatibility across all components
  copperCoins: number;
  silverShillings: number;
  goldSovereigns: number;
  prismaticShards: number;
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
export type MountCategory = 'MOUNT';
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

// Character Equipment Slots (Philippine Folklore Paper Doll)
export interface EquipmentSlots {
  upperArmor: EquipmentItem | null;
  lowerArmor: EquipmentItem | null;
  primaryWeapon: EquipmentItem | null;
  specialWeapon: EquipmentItem | null;
  heavyWeapon: EquipmentItem | null;
  mount: EquipmentItem | null; // Unlocked post-Act 6
  bike?: EquipmentItem | null; // Backward-compatible alias
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
  bossId?: string; // Mandatory Act Boss ID
  memoryDropRates: { rarity: MemoryRarity; chance: number }[];
}

export interface Bounty {
  id: string;
  bountyNumber?: number;
  title: string;
  minLevel?: number; // Minimum character level required
  actId?: string; // Act bracket (e.g. 'loc_act_1')
  targetMonsterName: string;
  targetMonsterId: string;
  targetCount: number;
  currentCount: number;
  rewardExp: number;
  rewardCC: number;
  rewardCowries?: number;
  rewardMemoryRarity: MemoryRarity;
  isAccepted?: boolean;
  isCompleted: boolean;
  isClaimed: boolean;
}

export interface SideQuest {
  id: string;
  actId?: string; // Belongs to specific Act
  title: string;
  giver: string;
  description: string;
  objectiveText: string;
  progressCurrent: number;
  progressRequired: number;
  rewardText: string;
  isCompleted: boolean;
  isClaimed: boolean;
  isForfeited?: boolean; // True if player advanced to next Act without finishing
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
  stash: Array<EquipmentItem | ConsumableItem>; // Account Vault / Stash at Sanctuary
  encryptedMemories: EncryptedMemory[]; // Codebreaker decrypt queue
  activeEffects: ActiveStatusEffect[];
  locationPoints: number; // LP earned through battles
  currentLocationId: string;
  unlockedLocationIds: string[];
  bounties: Bounty[];
  sideQuests?: SideQuest[];
  forfeitedQuestIds?: string[];
  completedBossIds?: string[];
  act6Completed?: boolean;
  mountUnlocked?: boolean;
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
