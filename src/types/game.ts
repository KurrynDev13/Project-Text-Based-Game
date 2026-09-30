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

// Hero Classes (Pre-Colonial Philippine Archetypes)
export type HeroClass = 'Mandirigma' | 'Bagani' | 'Mangangaso' | 'Babaylan';

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
  statBonus?: Partial<PrimaryAttributes> & {
    flatArmor?: number;
    flatHp?: number;
    flatMp?: number;
    critPercent?: number;
    dodgePercent?: number;
    magicResist?: number;
  };
  statusInfliction?: {
    type: StatusEffectType;
    chancePercent: number;
    durationTurns: number;
  };
  statusMitigation?: {
    type: StatusEffectType;
    resistancePercent: number;
    isImmune?: boolean;
  };
}

export interface EquipmentItem {
  id: string;
  name: string;
  category: WeaponCategory | ArmorCategory | VehicleCategory;
  /** @deprecated weaponSlot is no longer used; kept optional for backward compatibility */
  weaponSlot?: WeaponSlotType;
  classReq?: HeroClass[]; // Which hero classes can equip this item
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
  icon?: string;
  affixes?: Affix[];
  blessingAttempts?: number; // Tracks Mutya blessing attempts to scale break risk (5%, 10%, 15%...)
}

export type ConsumableCategory = 'POTION' | 'FOOD' | 'ELIXIR' | 'VIAL' | 'TINCTURE' | 'PANACEA' | 'VITALITY';

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
  actReq?: number; // Act tier 1 to 8
  actId?: string; // Location ID e.g. 'loc_act_1'
  shieldPercent?: number; // % of Max HP as Spirit Shield
  icon?: string;
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
  weapon: EquipmentItem | null; // Single active weapon slot
  mount: EquipmentItem | null; // Unlocked post-Act 6
  /** @deprecated Use `weapon` instead */
  primaryWeapon?: EquipmentItem | null;
  /** @deprecated Use `weapon` instead */
  specialWeapon?: EquipmentItem | null;
  /** @deprecated Use `weapon` instead */
  heavyWeapon?: EquipmentItem | null;
  bike?: EquipmentItem | null; // Backward-compatible alias
}

// World Locations & Exploration (Titan Conquest Location Points System)
export interface GameLocation {
  id: string;
  name: string;
  subtitle: string;
  minLevel: number;
  bossLevelReq?: number; // Climax Level required to challenge the Act Guardian
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
  targetMonsterId?: string; // Monster ID that advances progress when slain
  progressCurrent: number;
  progressRequired: number;
  rewardText: string;
  rewardExp?: number;
  rewardCowries?: number;
  rewardMutya?: number;
  isDiscovered?: boolean; // Discovered via venturing forward in the world
  isCompleted: boolean;
  isClaimed: boolean;
  isForfeited?: boolean; // True if player advanced to next Act without finishing
}

// Skills System
export type SkillDamageType = 'PHYSICAL' | 'MAGIC' | 'FIRE' | 'FROST' | 'LIGHTNING' | 'SHADOW' | 'RADIANT' | 'HEAL';

export interface Skill {
  id: string;
  name: string;
  icon: string; // emoji
  classReq: HeroClass;
  tier: number; // 1-4 (tier 1 = basic, tier 4 = ultimate)
  minLevel?: number; // Minimum character level required to unlock (Lv 1, 8, 16, 25)
  mutyaCost: number; // 0 for basic attack, 1-3 for others
  description: string;
  flavorText: string; // pre-colonial lore quote
  mpCost: number;
  cooldownTurns: number;
  damageType: SkillDamageType;
  baseDamageMultiplier: number; // Multiplier on weapon base damage
  isDefaultUnlocked?: boolean; // true if granted at class creation
  isBasicAttack?: boolean; // true for the free default basic attack
  effectType?: StatusEffectType;
  healsPercent?: number; // % of max HP restored
  shieldPercent?: number; // % of max HP as shield
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
  act8Completed?: boolean;
  ngPlusLevel?: number;
  highestSurvivalWave?: number;
  mountUnlocked?: boolean;
  isEmpoweredNextTurn?: boolean;
  isCoveredNextTurn?: boolean;
  hasCreatedCharacter?: boolean; // True after character creation flow is complete
  unlockedSkillIds?: string[]; // IDs of purchased Mutya skills
  equippedSkillIds?: string[]; // Max 3 active skill IDs in combat
  skillRanks?: Record<string, number>; // Map of skillId -> Rank (1 to 5)
  tutorialsSeen?: string[]; // Tutorial IDs that have been shown
  unlockedActStoryIds?: string[]; // Act story overlays already shown
  discoveredBossIds?: string[]; // Boss IDs where warning card was shown
  narratorLogs?: string[]; // Sector narrative feed log history (persisted across tabs)
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
  isBoss?: boolean;
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
  fleeAttempts?: number;
  survivalKillStreak?: number;
  survivalBossThreshold?: number;
  survivalWaveTier?: number;
}

export interface BattleLogEntry {
  id: string;
  turn: number;
  actor: 'PLAYER' | 'ENEMY' | 'SYSTEM' | 'EFFECT';
  text: string;
  type: 'INFO' | 'DAMAGE' | 'HEAL' | 'BUFF' | 'DEBUFF' | 'CRIT' | 'PERK' | 'DROP';
}
