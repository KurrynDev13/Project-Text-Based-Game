import { HeroClass, PlayerCharacter, Skill, SkillNodeType } from '../types/game';

// =============================================================================
// MAHARLIKA: LEGENDS OF THE ARCHIPELAGO — 3-PILLAR ARPG SKILL TREE DATABASE
// 4 Hero Classes x 3 Thematic Specialization Pillars (+ 4 Default Basic Strikes)
// Active Skills: Ranks 1 to 5 (1 SP per Rank)
// Passive Keystones: Single Allocation (1 SP)
// Mutya Shards are strictly decoupled and reserved for Forge Affix Blessings.
// =============================================================================

export interface PillarMetadata {
  id: string;
  name: string;
  shortName?: string;
  classReq: HeroClass;
  icon: string;
  tagline: string;
  synergyFocus: string[];
}

export const CLASS_PILLARS: Record<HeroClass, PillarMetadata[]> = {
  Mandirigma: [
    {
      id: 'pillar_mand_1',
      name: 'The Blood-Cleaver',
      shortName: 'Cleaver',
      classReq: 'Mandirigma',
      icon: '🩸',
      tagline: 'Ruthless Kampilan slashes, escalating Bleed rends & berserker execute strikes.',
      synergyFocus: ['[Combo: Bleed]', '[Rend]', '[Executioner]', '[True Damage]'],
    },
    {
      id: 'pillar_mand_2',
      name: "The Rajah's Bastion",
      shortName: 'Bastion',
      classReq: 'Mandirigma',
      icon: '🛡️',
      tagline: 'Impenetrable Kalasag shields, fortified armor poise & crushing parry ripostes.',
      synergyFocus: ['[Barrier]', '[Fortified]', '[Poise]', '[Counter]', '[Guard]'],
    },
    {
      id: 'pillar_mand_3',
      name: "The Sun God's Wrath",
      shortName: 'Wrath',
      classReq: 'Mandirigma',
      icon: '☀️',
      tagline: 'War shouts of the Datu, divine Apolaki sunfire cleaves & incinerating solar flame.',
      synergyFocus: ['[Empowered]', '[Solar Flame]', '[Burn]', '[Consumes: Burn]'],
    },
  ],
  Bagani: [
    {
      id: 'pillar_baga_1',
      name: 'The Venom-Kris',
      shortName: 'Venom',
      classReq: 'Bagani',
      icon: '🐍',
      tagline: 'Caustic Dahong Palay venom, armor-melting spores & lethal toxic detonations.',
      synergyFocus: ['[Combo: Poison]', '[Corrosion]', '[Venom]', '[Consumes: Poison]'],
    },
    {
      id: 'pillar_baga_2',
      name: 'The Ghost Shadow',
      shortName: 'Shadow',
      classReq: 'Bagani',
      icon: '👤',
      tagline: 'Untouchable acrobatic evasion, blinding smoke screens & reflexive mirage ripostes.',
      synergyFocus: ['[Evasion]', '[Haste]', '[Counter]', '[Smoke]'],
    },
    {
      id: 'pillar_baga_3',
      name: 'The Executioner',
      shortName: 'Execute',
      classReq: 'Bagani',
      icon: '💀',
      tagline: 'Surgical Balisong flurries, devastating critical multipliers & true shadow strikes.',
      synergyFocus: ['[Combo: Crit]', '[True Damage]', '[Executioner]', '[Life Steal]'],
    },
  ],
  Mangangaso: [
    {
      id: 'pillar_manga_1',
      name: 'The Deadeye Marksman',
      shortName: 'Marksman',
      classReq: 'Mangangaso',
      icon: '🎯',
      tagline: 'Pinpoint warbow snipes, armor-shattering penetration & godly tension piercers.',
      synergyFocus: ['[Armor-Pierce]', '[Precision]', '[Deadeye]'],
    },
    {
      id: 'pillar_manga_2',
      name: 'The Jungle Trapper',
      shortName: 'Trapper',
      classReq: 'Mangangaso',
      icon: '🌿',
      tagline: 'Envenomed blowgun sumpit darts, rattan cords, caltrops & field survival poultices.',
      synergyFocus: ['[Snare]', '[Weaken]', '[Survivalist]', '[Consumable]'],
    },
    {
      id: 'pillar_manga_3',
      name: 'The Spirit of the Beast',
      shortName: 'Spirit',
      classReq: 'Mangangaso',
      icon: '🦅',
      tagline: 'Sacred Sarimanok plumage fire, tempest hawk arrows & eclipse dragon volleys.',
      synergyFocus: ['[Solar Flame]', '[Tempest]', '[Burn]', '[Consumes: Burn]'],
    },
  ],
  Babaylan: [
    {
      id: 'pillar_baba_1',
      name: 'Ancestral Restoration',
      shortName: 'Restore',
      classReq: 'Babaylan',
      icon: '❇️',
      tagline: 'Life-giving chants of the Diwata, shimmering spirit shields & divine purification.',
      synergyFocus: ['[Restoration]', '[Barrier]', '[Purify]', '[Regen]'],
    },
    {
      id: 'pillar_baba_2',
      name: 'Storm of Kadaklan',
      shortName: 'Storm',
      classReq: 'Babaylan',
      icon: '⚡',
      tagline: 'Wrath of the thunder god, high-voltage cane shocks & cataclysmic tempest cyclones.',
      synergyFocus: ['[Shock]', '[Tempest]', '[Crit]', '[Consumes: Shock]'],
    },
    {
      id: 'pillar_baba_3',
      name: 'The Shadow Curse',
      shortName: 'Curse',
      classReq: 'Babaylan',
      icon: '🔮',
      tagline: 'Pre-colonial Aswang hexes, vital soul siphons & debilitating eclipse severances.',
      synergyFocus: ['[Curse]', '[Soul-Drain]', '[Exhaustion]', '[Shadow]'],
    },
  ],
};

export const ALL_SKILLS: Skill[] = [

  // ===========================================================================
  // 1. MANDIRIGMA (Heavy Blade Warrior)
  // ===========================================================================

  // Default Basic Attack (Free, automatically equipped at start)
  {
    id: 'skill_mand_basic',
    name: 'Kampilan Basic Strike',
    icon: '🗡️',
    classReq: 'Mandirigma',
    tier: 1,
    minLevel: 1,
    spCost: 0,
    mutyaCost: 0,
    maxRank: 1,
    type: 'ACTIVE',
    synergyTags: ['[Strike]'],
    description: 'A straightforward strike with the Kampilan blade, dealing standard weapon damage (+5 MP on hit).',
    flavorText: 'Every warrior begins with a single strike.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 1.0,
    isDefaultUnlocked: true,
    isBasicAttack: true,
  },

  // --- PILLAR 1: THE BLOOD-CLEAVER ---
  {
    id: 'skill_mand_1',
    name: 'Kampilan Heavy Strike',
    icon: '⚔️',
    classReq: 'Mandirigma',
    pillarId: 'pillar_mand_1',
    pillarName: 'The Blood-Cleaver',
    tier: 1,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Strike]', '[Barrier]'],
    description: 'A crushing overhead blow that cuts through defenses, dealing 1.6x base physical damage and converting 15% of damage dealt into a temporary protective barrier.',
    flavorText: "A warrior's blade is the extension of his oath.",
    mpCost: 20,
    cooldownTurns: 1,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 1.6,
    barrierPercent: 0.15,
  },
  {
    id: 'skill_mand_p1_1',
    parentSkillId: 'skill_mand_1',
    name: 'Crimson Oath',
    icon: '🩸',
    classReq: 'Mandirigma',
    pillarId: 'pillar_mand_1',
    pillarName: 'The Blood-Cleaver',
    tier: 1,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Combo: Bleed]', '[Crit]'],
    description: 'Inflicting Bleed increases your Critical Hit Chance by +1.5% per active Bleed stack on the target (up to +15% Max).',
    flavorText: 'The scent of spilled blood awakens ancient ancestors.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_mand_3',
    name: 'Whirlwind Panabas Cleave',
    icon: '🌀',
    classReq: 'Mandirigma',
    pillarId: 'pillar_mand_1',
    pillarName: 'The Blood-Cleaver',
    tier: 2,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Combo: Bleed]', '[Rend]'],
    description: 'Spin with the massive Panabas cleaver, delivering a sweeping blow dealing 1.9x physical damage and afflicting the enemy with Bleed for 3 turns.',
    flavorText: 'The cleave of the Panabas spares none who stand before it.',
    mpCost: 35,
    cooldownTurns: 2,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 1.9,
    effectType: 'BLEED',
  },
  {
    id: 'skill_mand_p1_2',
    parentSkillId: 'skill_mand_3',
    name: 'Taste of Iron',
    icon: '🗡️',
    classReq: 'Mandirigma',
    pillarId: 'pillar_mand_1',
    pillarName: 'The Blood-Cleaver',
    tier: 2,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Combo: Bleed]', '[Life Steal]'],
    description: 'Critical strikes against Bleeding enemies restore 10% of critical damage dealt as immediate Health.',
    flavorText: 'War feeds the warrior who embraces its cruelty.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_mand_5',
    name: 'Savage Blood Price',
    icon: '🩸',
    classReq: 'Mandirigma',
    pillarId: 'pillar_mand_1',
    pillarName: 'The Blood-Cleaver',
    tier: 3,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Consumes: Bleed]', '[True Damage]'],
    description: 'A savage rupture that consumes all active Bleed stacks on the target to deliver 2.3x True Physical Damage that ignores enemy armor.',
    flavorText: 'Those who draw the blade accept its cost in blood.',
    mpCost: 50,
    cooldownTurns: 3,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 2.3,
  },
  {
    id: 'skill_mand_p1_cap',
    parentSkillId: 'skill_mand_5',
    name: "Berserker's Prowess",
    icon: '🔱',
    classReq: 'Mandirigma',
    pillarId: 'pillar_mand_1',
    pillarName: 'The Blood-Cleaver',
    tier: 4,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Berserker]', '[Rend]', '[True Damage]'],
    description: 'Pinnacle Capstone: While below 40% HP, gain +35% bonus Physical Damage, and all basic Kampilan strikes automatically apply Bleed.',
    flavorText: 'Cornered like a wounded tamaraw, the Mandirigma knows no fear.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },

  // --- PILLAR 2: THE RAJAH'S BASTION ---
  {
    id: 'skill_mand_4',
    name: "Rajah's Iron Shield Brace",
    icon: '🛡️',
    classReq: 'Mandirigma',
    pillarId: 'pillar_mand_2',
    pillarName: "The Rajah's Bastion",
    tier: 1,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Barrier]', '[Fortified]', '[Guard]'],
    description: 'Adopt the iron stance of the Rajah, granting Fortified (+30% Armor) and generating a Spirit Shield equal to 25% of maximum HP for 3 turns.',
    flavorText: "A Rajah's guard is his people's last wall.",
    mpCost: 25,
    cooldownTurns: 2,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
    shieldPercent: 0.25,
    effectType: 'FORTIFIED',
  },
  {
    id: 'skill_mand_p2_1',
    parentSkillId: 'skill_mand_4',
    name: 'Iron Sinew',
    icon: '🦾',
    classReq: 'Mandirigma',
    pillarId: 'pillar_mand_2',
    pillarName: "The Rajah's Bastion",
    tier: 1,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Poise]', '[Armor]'],
    description: 'Increases bonus Armor gained from Strength and Vitality by +30%, and grants +50 Flat Max HP.',
    flavorText: 'Toughened like century-old molave timber.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_mand_p2_bash',
    name: 'Kalasag Shield Bash',
    icon: '💥',
    classReq: 'Mandirigma',
    pillarId: 'pillar_mand_2',
    pillarName: "The Rajah's Bastion",
    tier: 2,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Strike]', '[Weaken]'],
    description: 'Slam the hardwood Kalasag shield into the enemy, dealing 1.5x damage scaled by current Armor and weakening enemy attack damage by 25% for 2 turns.',
    flavorText: 'The Kalasag is not merely protection—it is an engine of concussion.',
    mpCost: 30,
    cooldownTurns: 2,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 1.5,
  },
  {
    id: 'skill_mand_p2_2',
    parentSkillId: 'skill_mand_p2_bash',
    name: 'Stalwart Bulwark',
    icon: '🏰',
    classReq: 'Mandirigma',
    pillarId: 'pillar_mand_2',
    pillarName: "The Rajah's Bastion",
    tier: 2,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Guard]', '[Poise]'],
    description: 'Executing Guard absorbs an additional +20% damage, blocks elemental attacks, and restores +10 MP on impact.',
    flavorText: 'The storm breaks against the mountain, not the mountain against the storm.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_mand_p2_parry',
    name: "Chieftain's Retaliation",
    icon: '⚔️',
    classReq: 'Mandirigma',
    pillarId: 'pillar_mand_2',
    pillarName: "The Rajah's Bastion",
    tier: 3,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Counter]', '[Parry]'],
    description: 'Assume a counter-striking stance; any incoming melee attack this turn is parried for 0 damage, riposting with 2.2x weapon damage.',
    flavorText: 'Wait for the enemy to overextend, then strike the exposed flank.',
    mpCost: 45,
    cooldownTurns: 3,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 2.2,
  },
  {
    id: 'skill_mand_p2_cap',
    parentSkillId: 'skill_mand_p2_parry',
    name: 'Unbroken Sovereign',
    icon: '👑',
    classReq: 'Mandirigma',
    pillarId: 'pillar_mand_2',
    pillarName: "The Rajah's Bastion",
    tier: 4,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Cheat-Death]', '[Barrier]'],
    description: 'Pinnacle Capstone: Once per combat upon receiving fatal damage, prevent death, survive at 1 HP, and instantly gain a Spirit Shield equal to 50% Max HP for 3 turns.',
    flavorText: 'The sovereign falls only when the heavens themselves shatter.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },

  // --- PILLAR 3: THE SUN GOD'S WRATH ---
  {
    id: 'skill_mand_2',
    name: 'Battle Cry of the Datu',
    icon: '📣',
    classReq: 'Mandirigma',
    pillarId: 'pillar_mand_3',
    pillarName: "The Sun God's Wrath",
    tier: 1,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Empowered]', '[Buff]'],
    description: 'Release a thunderous roar that shakes the canopy, granting Empowered (+50% bonus damage on next attack) and generating +10 MP.',
    flavorText: 'Let your battle cry shake the heavens and shatter enemy resolve.',
    mpCost: 15,
    cooldownTurns: 2,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
    effectType: 'EMPOWERED',
  },
  {
    id: 'skill_mand_p3_1',
    parentSkillId: 'skill_mand_2',
    name: 'Ignited Zeal',
    icon: '🔥',
    classReq: 'Mandirigma',
    pillarId: 'pillar_mand_3',
    pillarName: "The Sun God's Wrath",
    tier: 1,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Solar Flame]', '[Buff]'],
    description: 'Dealing Fire damage boosts Melee Physical Damage by +15% and increases Critical Damage by +20% for 3 turns.',
    flavorText: 'Apolaki stokes the flame within the warrior heart.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_mand_6',
    name: "Apolaki's Sunfire Cleave",
    icon: '☀️',
    classReq: 'Mandirigma',
    pillarId: 'pillar_mand_3',
    pillarName: "The Sun God's Wrath",
    tier: 2,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Solar Flame]', '[Burn]'],
    description: "Channel the Sun God's blazing fury into the blade, unleashing a scorching eruption dealing 2.4x Fire damage and applying Burn.",
    flavorText: 'Strike with the blazing fury of Apolaki himself.',
    mpCost: 40,
    cooldownTurns: 2,
    damageType: 'FIRE',
    baseDamageMultiplier: 2.4,
    effectType: 'BURN',
  },
  {
    id: 'skill_mand_p3_2',
    parentSkillId: 'skill_mand_6',
    name: 'Radiant Brand',
    icon: '✨',
    classReq: 'Mandirigma',
    pillarId: 'pillar_mand_3',
    pillarName: "The Sun God's Wrath",
    tier: 2,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Burn]', '[Resource]'],
    description: 'Whenever an enemy suffers a Burn damage tick, restore +4 MP to the Mandirigma.',
    flavorText: 'The embers of victory feed the warrior spirit.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_mand_p3_cata',
    name: 'Solar Flare Cataclysm',
    icon: '🌋',
    classReq: 'Mandirigma',
    pillarId: 'pillar_mand_3',
    pillarName: "The Sun God's Wrath",
    tier: 3,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Consumes: Burn]', '[Solar Flame]'],
    description: 'Call down the blinding solar wrath of Apolaki, consuming all active Burn stacks to detonate an explosion dealing 2.9x Radiant/Fire damage.',
    flavorText: 'The sky burns red as the Sun God answers the prayer of blood.',
    mpCost: 55,
    cooldownTurns: 3,
    damageType: 'FIRE',
    baseDamageMultiplier: 2.9,
  },
  {
    id: 'skill_mand_p3_cap',
    parentSkillId: 'skill_mand_p3_cata',
    name: 'Avatar of Apolaki',
    icon: '🌞',
    classReq: 'Mandirigma',
    pillarId: 'pillar_mand_3',
    pillarName: "The Sun God's Wrath",
    tier: 4,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Solar Flame]', '[Burst]'],
    description: 'Pinnacle Capstone: Every 3rd melee attack automatically triggers a sacred solar explosion, dealing +50% bonus Fire damage and renewing Burn.',
    flavorText: 'The mortal blade shines with the unbearable brilliance of dawn.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },

  // ===========================================================================
  // 2. BAGANI (Shadow Assassin)
  // ===========================================================================

  // Default Basic Attack
  {
    id: 'skill_baga_basic',
    name: 'Balisong Quick Jab',
    icon: '🔪',
    classReq: 'Bagani',
    tier: 1,
    minLevel: 1,
    spCost: 0,
    mutyaCost: 0,
    maxRank: 1,
    type: 'ACTIVE',
    synergyTags: ['[Strike]'],
    description: 'A rapid flick of the Balisong butterfly knife, dealing standard weapon damage (+5 MP on hit).',
    flavorText: 'Swifter than the eye can follow.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 1.0,
    isDefaultUnlocked: true,
    isBasicAttack: true,
  },

  // --- PILLAR 1: THE VENOM-KRIS ---
  {
    id: 'skill_baga_3',
    name: 'Dahong Palay Poison Kris',
    icon: '🐍',
    classReq: 'Bagani',
    pillarId: 'pillar_baga_1',
    pillarName: 'The Venom-Kris',
    tier: 1,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Combo: Poison]', '[Venom]'],
    description: 'Strike with the wavy Kris blade coated in green Dahong Palay pit-viper venom, dealing 1.6x physical damage and applying Poison for 3 turns.',
    flavorText: 'The Dahong Palay vine yields the archipelago’s deadliest venom.',
    mpCost: 20,
    cooldownTurns: 1,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 1.6,
    effectType: 'POISON',
  },
  {
    id: 'skill_baga_p1_1',
    parentSkillId: 'skill_baga_3',
    name: 'Virulent Toxins',
    icon: '🧪',
    classReq: 'Bagani',
    pillarId: 'pillar_baga_1',
    pillarName: 'The Venom-Kris',
    tier: 1,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Venom]', '[Corrosion]'],
    description: 'Poison ticks deal +25% increased damage and scale with both Agility and Intelligence.',
    flavorText: 'The serpent’s gift works quietly beneath the flesh.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_baga_p1_dart',
    name: 'Caustic Spore Dart',
    icon: '🍄',
    classReq: 'Bagani',
    pillarId: 'pillar_baga_1',
    pillarName: 'The Venom-Kris',
    tier: 2,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Corrosion]', '[Debuff]'],
    description: 'Fling an envenomed spine reducing enemy Armor by 25% and amplifying all incoming damage over time by 30% for 3 turns.',
    flavorText: 'Rot the carapace before carving the heart.',
    mpCost: 30,
    cooldownTurns: 2,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 1.4,
  },
  {
    id: 'skill_baga_p1_2',
    parentSkillId: 'skill_baga_p1_dart',
    name: 'Numbing Neurotoxin',
    icon: '🕸️',
    classReq: 'Bagani',
    pillarId: 'pillar_baga_1',
    pillarName: 'The Venom-Kris',
    tier: 2,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Weaken]', '[Venom]'],
    description: 'Poisoned enemies suffer -20% Attack Damage and -15% Dodge Chance.',
    flavorText: 'Limbs grow sluggish as the venom seeps into the sinew.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_baga_p1_erupt',
    name: 'Venomous Eruption',
    icon: '💥',
    classReq: 'Bagani',
    pillarId: 'pillar_baga_1',
    pillarName: 'The Venom-Kris',
    tier: 3,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Consumes: Poison]', '[Burst]'],
    description: 'Strike vital pressure points, detonating all active Poison stacks into an immediate acidic explosion dealing 2.5x Nature/Physical damage.',
    flavorText: 'One incision ignites the dormant bile.',
    mpCost: 45,
    cooldownTurns: 3,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 2.5,
  },
  {
    id: 'skill_baga_p1_cap',
    parentSkillId: 'skill_baga_p1_erupt',
    name: "Serpent's Kiss",
    icon: '🐍',
    classReq: 'Bagani',
    pillarId: 'pillar_baga_1',
    pillarName: 'The Venom-Kris',
    tier: 4,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Infinite-Venom]', '[Corrosion]'],
    description: 'Pinnacle Capstone: Poison debuffs on Bosses never expire; each tick permanently softens the target’s resistances by 1% (up to 25% Max).',
    flavorText: 'An incurable bite passed down from the primordial swamps.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },

  // --- PILLAR 2: THE GHOST SHADOW ---
  {
    id: 'skill_baga_2',
    name: 'Shadow Shroud',
    icon: '👤',
    classReq: 'Bagani',
    pillarId: 'pillar_baga_2',
    pillarName: 'The Ghost Shadow',
    tier: 1,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Haste]', '[Barrier]', '[Evasion]'],
    description: 'Melt into the shadows, gaining Haste (+25% action speed) and generating a shadow barrier that absorbs 20% Max HP for 3 turns.',
    flavorText: 'The Bagani moves unseen before the killing blow.',
    mpCost: 25,
    cooldownTurns: 2,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
    shieldPercent: 0.20,
    effectType: 'HASTE',
  },
  {
    id: 'skill_baga_p2_1',
    parentSkillId: 'skill_baga_2',
    name: 'Ghostly Fleetness',
    icon: '💨',
    classReq: 'Bagani',
    pillarId: 'pillar_baga_2',
    pillarName: 'The Ghost Shadow',
    tier: 1,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Evasion]', '[Resource]'],
    description: 'Successfully dodging an attack restores +10 MP and immediately grants +10% bonus Dodge on the next incoming hit.',
    flavorText: 'Where the blade struck, only moonlight remains.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_baga_5',
    name: 'Smoke & Mirrors Obscuration',
    icon: '🌫️',
    classReq: 'Bagani',
    pillarId: 'pillar_baga_2',
    pillarName: 'The Ghost Shadow',
    tier: 2,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Smoke]', '[Evasion]'],
    description: 'Shatter a pot of blinding ash and dried brimstone, boosting Dodge Chance by +30% for 3 turns and blinding the enemy.',
    flavorText: 'Let them strike your silhouette while you sever their throat.',
    mpCost: 35,
    cooldownTurns: 3,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_baga_p2_2',
    parentSkillId: 'skill_baga_5',
    name: 'Shadow Reflexes',
    icon: '⚡',
    classReq: 'Bagani',
    pillarId: 'pillar_baga_2',
    pillarName: 'The Ghost Shadow',
    tier: 2,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Evasion]', '[Counter]'],
    description: 'Permanently increases Base Dodge Rate by +5% and increases Riposte Counter damage by +35%.',
    flavorText: 'Trained to react to the rustle of a single falling leaf.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_baga_p2_counter',
    name: 'Mirage Blade Counter',
    icon: '🗡️',
    classReq: 'Bagani',
    pillarId: 'pillar_baga_2',
    pillarName: 'The Ghost Shadow',
    tier: 3,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Counter]', '[Evasion]'],
    description: 'Prepare an evasive riposte; if targeted this turn, take 0 damage, evade behind the enemy, and counter-strike for 2.2x physical damage.',
    flavorText: 'The shadow cuts when the body is untouched.',
    mpCost: 45,
    cooldownTurns: 3,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 2.2,
  },
  {
    id: 'skill_baga_p2_cap',
    parentSkillId: 'skill_baga_p2_counter',
    name: 'Phantom Stalker',
    icon: '👥',
    classReq: 'Bagani',
    pillarId: 'pillar_baga_2',
    pillarName: 'The Ghost Shadow',
    tier: 4,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Guaranteed-Crit]', '[Armor-Pierce]'],
    description: 'Pinnacle Capstone: After dodging 2 attacks, your next active skill is guaranteed to Critically Strike and bypasses 100% of the target’s armor.',
    flavorText: 'The ghost materializes only when the execution is sealed.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },

  // --- PILLAR 3: THE EXECUTIONER ---
  {
    id: 'skill_baga_1',
    name: 'Balisong Flurry Strike',
    icon: '🌬️',
    classReq: 'Bagani',
    pillarId: 'pillar_baga_3',
    pillarName: 'The Executioner',
    tier: 1,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Combo: Crit]', '[Multi-Hit]'],
    description: 'A lightning-fast fan of butterfly knife thrusts dealing 1.6x damage with +20% bonus Critical Hit Chance and applying Bleed.',
    flavorText: 'Swift as the monsoon wind, deadly as its lightning.',
    mpCost: 20,
    cooldownTurns: 1,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 1.6,
    effectType: 'BLEED',
  },
  {
    id: 'skill_baga_p3_1',
    parentSkillId: 'skill_baga_1',
    name: 'Lethal Anatomist',
    icon: '🎯',
    classReq: 'Bagani',
    pillarId: 'pillar_baga_3',
    pillarName: 'The Executioner',
    tier: 1,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Crit-Damage]', '[Combo: Crit]'],
    description: 'Critical Strike Damage Multiplier is increased by +25% (further boosted by Strength).',
    flavorText: 'Knowing where the armor separates turns a scratch into a funeral.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_baga_4',
    name: 'Night Ambush Strike',
    icon: '🌙',
    classReq: 'Bagani',
    pillarId: 'pillar_baga_3',
    pillarName: 'The Executioner',
    tier: 2,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Executioner]', '[Burst]'],
    description: 'Drive the dagger straight into vulnerable vitals, dealing 2.3x damage and dealing +50% bonus damage if the target is below 50% HP.',
    flavorText: 'Darkness is the Bagani’s deadliest ally.',
    mpCost: 35,
    cooldownTurns: 2,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 2.3,
  },
  {
    id: 'skill_baga_p3_2',
    parentSkillId: 'skill_baga_4',
    name: 'Blood Tithe',
    icon: '🩸',
    classReq: 'Bagani',
    pillarId: 'pillar_baga_3',
    pillarName: 'The Executioner',
    tier: 2,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Life Steal]', '[Sustain]'],
    description: 'Critical strikes heal the Bagani for 12% of total critical damage dealt.',
    flavorText: 'Every severed vein sustains the killer.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_baga_7',
    name: 'Void Kalis Executioner',
    icon: '💀',
    classReq: 'Bagani',
    pillarId: 'pillar_baga_3',
    pillarName: 'The Executioner',
    tier: 3,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[True Damage]', '[Executioner]'],
    description: 'A void-empowered death thrust that deals 3.0x True Shadow Damage, completely ignoring armor and afflicting Exhaustion.',
    flavorText: 'There is no mercy in the void between heartbeats.',
    mpCost: 55,
    cooldownTurns: 4,
    damageType: 'SHADOW',
    baseDamageMultiplier: 3.0,
    effectType: 'EXHAUSTION',
  },
  {
    id: 'skill_baga_p3_cap',
    parentSkillId: 'skill_baga_7',
    name: 'Death Mark',
    icon: '⚰️',
    classReq: 'Bagani',
    pillarId: 'pillar_baga_3',
    pillarName: 'The Executioner',
    tier: 4,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Execution]', '[True Damage]'],
    description: 'Pinnacle Capstone: Enemies below 25% HP are marked for death; your strikes deal +45% bonus damage and ignore damage reduction.',
    flavorText: 'The ancestors have signed their warrant.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },

  // ===========================================================================
  // 3. MANGANGASO (Wilderness Marksman & Trapper)
  // ===========================================================================

  // Default Basic Attack
  {
    id: 'skill_manga_basic',
    name: 'Bamboo Shaft Shot',
    icon: '🏹',
    classReq: 'Mangangaso',
    tier: 1,
    minLevel: 1,
    spCost: 0,
    mutyaCost: 0,
    maxRank: 1,
    type: 'ACTIVE',
    synergyTags: ['[Strike]'],
    description: 'A clean bowshot with a fire-hardened bamboo arrow, dealing standard ranged damage (+5 MP on hit).',
    flavorText: 'A quiet string releases a silent death.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 1.0,
    isDefaultUnlocked: true,
    isBasicAttack: true,
  },

  // --- PILLAR 1: THE DEADEYE MARKSMAN ---
  {
    id: 'skill_manga_p1_shot',
    name: 'Ironwood Penetrator',
    icon: '🎯',
    classReq: 'Mangangaso',
    pillarId: 'pillar_manga_1',
    pillarName: 'The Deadeye Marksman',
    tier: 1,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Armor-Pierce]', '[Precision]'],
    description: 'Fire a heavy ironwood-tipped arrow that punches through thick armor, dealing 1.6x physical damage and ignoring 25% enemy armor.',
    flavorText: 'Ironwood leaves no room for thick hide.',
    mpCost: 18,
    cooldownTurns: 1,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 1.6,
  },
  {
    id: 'skill_manga_p1_1',
    parentSkillId: 'skill_manga_p1_shot',
    name: 'Hawkeye',
    icon: '🦅',
    classReq: 'Mangangaso',
    pillarId: 'pillar_manga_1',
    pillarName: 'The Deadeye Marksman',
    tier: 1,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Armor-Pierce]', '[Precision]'],
    description: 'Increases Armor Penetration by +0.3% per point of Agility and grants +5% Base Critical Chance.',
    flavorText: 'Sight sharpened by tracking hawks across the highland canopy.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_manga_2',
    name: "Falcon's Eye Focus",
    icon: '👁️',
    classReq: 'Mangangaso',
    pillarId: 'pillar_manga_1',
    pillarName: 'The Deadeye Marksman',
    tier: 2,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Precision]', '[Buff]'],
    description: 'Calm the breath and sharpen focus, increasing Critical Hit Chance by +30% and granting +40% Armor Penetration on your next attack.',
    flavorText: 'The hunter watches before the hand releases.',
    mpCost: 25,
    cooldownTurns: 2,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_manga_p1_2',
    parentSkillId: 'skill_manga_2',
    name: 'Point-Blank Ballistics',
    icon: '🏹',
    classReq: 'Mangangaso',
    pillarId: 'pillar_manga_1',
    pillarName: 'The Deadeye Marksman',
    tier: 2,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Damage-Ramp]'],
    description: 'If the enemy attacks in melee range, your next bow shot deals +20% bonus damage and cannot be dodged.',
    flavorText: 'Even cornered, the bow finds its mark.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_manga_6',
    name: 'Pinaka Warbow Piercer',
    icon: '🏹',
    classReq: 'Mangangaso',
    pillarId: 'pillar_manga_1',
    pillarName: 'The Deadeye Marksman',
    tier: 3,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Armor-Pierce]', '[Deadeye]'],
    description: 'Draw the mythical Pinaka Warbow to full tension, releasing a thunderous arrow dealing 2.6x damage and ignoring 50% enemy armor.',
    flavorText: 'The bow of the gods pierces dragon scale.',
    mpCost: 45,
    cooldownTurns: 3,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 2.6,
  },
  {
    id: 'skill_manga_p1_cap',
    parentSkillId: 'skill_manga_6',
    name: 'Heart-Seeker Arrow',
    icon: '🎯',
    classReq: 'Mangangaso',
    pillarId: 'pillar_manga_1',
    pillarName: 'The Deadeye Marksman',
    tier: 4,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Deadeye]', '[Executioner]'],
    description: 'Pinnacle Capstone: Attacks against enemies above 80% HP or below 30% HP deal +40% bonus damage and can never be evaded.',
    flavorText: 'The arrow flies true, guided by the spirits of ancient hunters.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },

  // --- PILLAR 2: THE JUNGLE TRAPPER ---
  {
    id: 'skill_manga_1',
    name: 'Sumpit Envenomed Dart',
    icon: '🎯',
    classReq: 'Mangangaso',
    pillarId: 'pillar_manga_2',
    pillarName: 'The Jungle Trapper',
    tier: 1,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Weaken]', '[Poison]'],
    description: 'A silent blowgun dart coated in frog toxin that deals 1.5x damage, applies Poison for 3 turns, and weakens the enemy (-20% attack damage for 2 turns).',
    flavorText: 'A silent whisper from the bamboo tube.',
    mpCost: 20,
    cooldownTurns: 1,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 1.5,
    effectType: 'POISON',
  },
  {
    id: 'skill_manga_p2_1',
    parentSkillId: 'skill_manga_1',
    name: "Herbalist's Wisdom",
    icon: '🌿',
    classReq: 'Mangangaso',
    pillarId: 'pillar_manga_2',
    pillarName: 'The Jungle Trapper',
    tier: 1,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Consumable]', '[Sustain]'],
    description: 'Consumables (Potions, Draughts, Food) restore +30% additional HP/MP and grant +10% bonus Armor for 2 turns.',
    flavorText: 'Forest wisdom teaches which roots bind wounds.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_manga_4',
    name: 'Rattan Snare Trap',
    icon: '🪢',
    classReq: 'Mangangaso',
    pillarId: 'pillar_manga_2',
    pillarName: 'The Jungle Trapper',
    tier: 2,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Snare]', '[Debuff]'],
    description: 'Conceal a spring-loaded rattan cord trap dealing 1.4x physical damage, delaying enemy action, and dropping their Dodge Chance to 0% for 2 turns.',
    flavorText: 'Tough highland rattan holds beasts ten times your size.',
    mpCost: 30,
    cooldownTurns: 2,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 1.4,
  },
  {
    id: 'skill_manga_p2_2',
    parentSkillId: 'skill_manga_4',
    name: 'Thorn Trap Caltrops',
    icon: '🌵',
    classReq: 'Mangangaso',
    pillarId: 'pillar_manga_2',
    pillarName: 'The Jungle Trapper',
    tier: 2,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Retaliation]', '[Damage-Cut]'],
    description: 'Whenever an enemy hits you, sharp ironwood thorns reflect physical damage equal to (Level * 8 + Agility).',
    flavorText: 'Step into the hunter’s territory at your own peril.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_manga_p2_salve',
    name: 'Jungle Field Bandage',
    icon: '🩹',
    classReq: 'Mangangaso',
    pillarId: 'pillar_manga_2',
    pillarName: 'The Jungle Trapper',
    tier: 3,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Restoration]', '[Cleanse]'],
    description: 'Apply crushed healing herbs to staunch wounds, cleansing all debuffs and restoring 25% Max HP over 3 turns.',
    flavorText: 'Sap of the balete seals even deep lacerations.',
    mpCost: 35,
    cooldownTurns: 3,
    damageType: 'HEAL',
    baseDamageMultiplier: 0,
    healsPercent: 0.25,
  },
  {
    id: 'skill_manga_p2_cap',
    parentSkillId: 'skill_manga_p2_salve',
    name: 'Master Survivalist',
    icon: '🏕️',
    classReq: 'Mangangaso',
    pillarId: 'pillar_manga_2',
    pillarName: 'The Jungle Trapper',
    tier: 4,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Survivalist]', '[Damage-Cut]'],
    description: 'Pinnacle Capstone: In combat, gain passive +2.5% HP recovery per turn and take 15% less damage from all beast and fiend monsters.',
    flavorText: 'The wilderness does not conquer the hunter—the hunter belongs to it.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },

  // --- PILLAR 3: THE SPIRIT OF THE BEAST ---
  {
    id: 'skill_manga_7',
    name: 'Sarimanok Flame Arrow',
    icon: '🔥',
    classReq: 'Mangangaso',
    pillarId: 'pillar_manga_3',
    pillarName: 'The Spirit of the Beast',
    tier: 1,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Solar Flame]', '[Burn]'],
    description: 'Imbue the arrow with sacred plumage fire, dealing 1.8x Fire damage and applying Burn for 4 turns.',
    flavorText: 'A streak of divine fire blazes through the canopy.',
    mpCost: 25,
    cooldownTurns: 2,
    damageType: 'FIRE',
    baseDamageMultiplier: 1.8,
    effectType: 'BURN',
  },
  {
    id: 'skill_manga_p3_1',
    parentSkillId: 'skill_manga_7',
    name: 'Wild Anito Blessing',
    icon: '✨',
    classReq: 'Mangangaso',
    pillarId: 'pillar_manga_3',
    pillarName: 'The Spirit of the Beast',
    tier: 1,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Mana-Efficiency]', '[Solar Flame]'],
    description: 'Elemental and magical arrows deal +15% more damage and cost -5 less MP to fire.',
    flavorText: 'Forest spirits guide the arc of the shaft.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_manga_3',
    name: 'Storm Hawk Tempest Gale',
    icon: '🌪️',
    classReq: 'Mangangaso',
    pillarId: 'pillar_manga_3',
    pillarName: 'The Spirit of the Beast',
    tier: 2,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Tempest]', '[Haste]'],
    description: 'Loose a volley of wind-cutting arrows dealing 1.9x Lightning damage and granting Haste (+25% action speed) for 2 turns.',
    flavorText: 'Swift as the storm hawk descending from Mount Arayat.',
    mpCost: 35,
    cooldownTurns: 2,
    damageType: 'LIGHTNING',
    baseDamageMultiplier: 1.9,
    effectType: 'HASTE',
  },
  {
    id: 'skill_manga_p3_2',
    parentSkillId: 'skill_manga_3',
    name: 'Feathered Fleetness',
    icon: '🪶',
    classReq: 'Mangangaso',
    pillarId: 'pillar_manga_3',
    pillarName: 'The Spirit of the Beast',
    tier: 2,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Evasion]', '[Buff]'],
    description: 'Dealing elemental damage increases your Dodge Chance by +12% for 2 turns.',
    flavorText: 'Light as down feathers dancing in the draft.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_manga_p3_volley',
    name: 'Bakunawa Eclipse Volley',
    icon: '🌑',
    classReq: 'Mangangaso',
    pillarId: 'pillar_manga_3',
    pillarName: 'The Spirit of the Beast',
    tier: 3,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Consumes: Burn]', '[Eclipse]'],
    description: 'Rain down celestial shadow arrows that consume active Burn to deal 2.8x hybrid Fire and Shadow damage.',
    flavorText: 'The moon serpent devours the light, leaving only embers and void.',
    mpCost: 55,
    cooldownTurns: 3,
    damageType: 'SHADOW',
    baseDamageMultiplier: 2.8,
  },
  {
    id: 'skill_manga_p3_cap',
    parentSkillId: 'skill_manga_p3_volley',
    name: 'Flight of the Sarimanok',
    icon: '🦚',
    classReq: 'Mangangaso',
    pillarId: 'pillar_manga_3',
    pillarName: 'The Spirit of the Beast',
    tier: 4,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Proc]', '[Burst]'],
    description: 'Pinnacle Capstone: Arrow hits have a 25% chance to manifest the radiant Sarimanok spirit avatar, duplicating 50% of the attack damage as holy flame.',
    flavorText: 'The golden bird blazes across the heavens, blessing the righteous arrow.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'PHYSICAL',
    baseDamageMultiplier: 0,
  },

  // ===========================================================================
  // 4. BABAYLAN (Mystic Shaman)
  // ===========================================================================

  // Default Basic Attack
  {
    id: 'skill_baba_basic',
    name: 'Shamanic Cane Blast',
    icon: '✨',
    classReq: 'Babaylan',
    tier: 1,
    minLevel: 1,
    spCost: 0,
    mutyaCost: 0,
    maxRank: 1,
    type: 'ACTIVE',
    synergyTags: ['[Strike]', '[Shock]'],
    description: 'Release a bolt of spiritual energy from the yantok cane, dealing Magic damage (+5 MP on hit).',
    flavorText: 'The ancestors speak through the shaman wood.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'MAGIC',
    baseDamageMultiplier: 1.0,
    isDefaultUnlocked: true,
    isBasicAttack: true,
  },

  // --- PILLAR 1: ANCESTRAL RESTORATION ---
  {
    id: 'skill_baba_1',
    name: 'Ancestral Healing Oration',
    icon: '❇️',
    classReq: 'Babaylan',
    pillarId: 'pillar_baba_1',
    pillarName: 'Ancestral Restoration',
    tier: 1,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Restoration]', '[Cleanse]'],
    description: 'Chant an ancient restoration prayer, restoring 20% (+2% per rank) of maximum HP and cleansing 1 negative debuff.',
    flavorText: 'The breath of life flows from ancestral spirits.',
    mpCost: 25,
    cooldownTurns: 2,
    damageType: 'HEAL',
    baseDamageMultiplier: 0,
    healsPercent: 0.20,
  },
  {
    id: 'skill_baba_p1_1',
    parentSkillId: 'skill_baba_1',
    name: 'Spiritual Grace',
    icon: '🛡️',
    classReq: 'Babaylan',
    pillarId: 'pillar_baba_1',
    pillarName: 'Ancestral Restoration',
    tier: 1,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Barrier]', '[Shield-Convert]'],
    description: 'Any overhealing from your spells is converted into a temporary spirit shield lasting 2 turns (up to 20% Max HP).',
    flavorText: 'No drop of spirit water is ever wasted.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'MAGIC',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_baba_4',
    name: 'Spirit Ward of Bathala',
    icon: '🛡️',
    classReq: 'Babaylan',
    pillarId: 'pillar_baba_1',
    pillarName: 'Ancestral Restoration',
    tier: 2,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Barrier]', '[Fortified]'],
    description: 'Project a shimmering spirit barrier that absorbs 25% of Max HP in incoming damage for 4 turns.',
    flavorText: 'The sacred shield of the supreme sky god protects his chosen.',
    mpCost: 35,
    cooldownTurns: 3,
    damageType: 'MAGIC',
    baseDamageMultiplier: 0,
    shieldPercent: 0.25,
    effectType: 'FORTIFIED',
  },
  {
    id: 'skill_baba_p1_2',
    parentSkillId: 'skill_baba_4',
    name: 'Ancestral Communion',
    icon: '🔮',
    classReq: 'Babaylan',
    pillarId: 'pillar_baba_1',
    pillarName: 'Ancestral Restoration',
    tier: 2,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Resource]', '[Restoration]'],
    description: 'Casting any restoration skill restores +15 MP over the next 3 turns.',
    flavorText: 'When giving life, the shaman’s wellspring refills.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'MAGIC',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_baba_p1_diwata',
    name: 'Breath of the Diwata',
    icon: '🌸',
    classReq: 'Babaylan',
    pillarId: 'pillar_baba_1',
    pillarName: 'Ancestral Restoration',
    tier: 3,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Restoration]', '[Regen]'],
    description: 'Life chant restoring 30% HP instantly and granting Regeneration (+5% Max HP restored per combat turn) for 3 turns.',
    flavorText: 'The forest diwatas breathe vital spirit back into mortal clay.',
    mpCost: 50,
    cooldownTurns: 4,
    damageType: 'HEAL',
    baseDamageMultiplier: 0,
    healsPercent: 0.30,
    effectType: 'REGENERATION',
  },
  {
    id: 'skill_baba_p1_cap',
    parentSkillId: 'skill_baba_p1_diwata',
    name: 'Living Conduit',
    icon: '🕊️',
    classReq: 'Babaylan',
    pillarId: 'pillar_baba_1',
    pillarName: 'Ancestral Restoration',
    tier: 4,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Cheat-Death]', '[Auto-Heal]'],
    description: 'Pinnacle Capstone: When you drop below 30% HP, immediately trigger a free Ancestral Healing without spending MP (once per battle).',
    flavorText: 'The thread between flesh and spirit refuses to sever.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'MAGIC',
    baseDamageMultiplier: 0,
  },

  // --- PILLAR 2: STORM OF KADAKLAN ---
  {
    id: 'skill_baba_3',
    name: 'Kadaklan Lightning Spear',
    icon: '⚡',
    classReq: 'Babaylan',
    pillarId: 'pillar_baba_2',
    pillarName: 'Storm of Kadaklan',
    tier: 1,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Shock]', '[Tempest]'],
    description: 'Call down a crackling spear of celestial lightning from the Thunder God, dealing 1.8x Lightning damage with high critical chance.',
    flavorText: 'Kadaklan speaks through the lightning bolt.',
    mpCost: 25,
    cooldownTurns: 1,
    damageType: 'LIGHTNING',
    baseDamageMultiplier: 1.8,
  },
  {
    id: 'skill_baba_p2_1',
    parentSkillId: 'skill_baba_3',
    name: 'Storm Surge',
    icon: '🌩️',
    classReq: 'Babaylan',
    pillarId: 'pillar_baba_2',
    pillarName: 'Storm of Kadaklan',
    tier: 1,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Crit]', '[Tempest]'],
    description: 'Lightning damage gains +15% Critical Hit Chance and +30% Critical Damage Multiplier.',
    flavorText: 'Lightning strikes with absolute conviction.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'MAGIC',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_baba_p2_thunder',
    name: "Kadaklan's Thunderstrike",
    icon: '⚡',
    classReq: 'Babaylan',
    pillarId: 'pillar_baba_2',
    pillarName: 'Storm of Kadaklan',
    tier: 2,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Tempest]', '[Shock]'],
    description: 'Call a deafening thunderbolt from the clouds, dealing 2.3x Lightning damage and building Shock charges.',
    flavorText: 'The sky tears open as the storm god roars.',
    mpCost: 35,
    cooldownTurns: 2,
    damageType: 'LIGHTNING',
    baseDamageMultiplier: 2.3,
  },
  {
    id: 'skill_baba_p2_2',
    parentSkillId: 'skill_baba_p2_thunder',
    name: 'Conductive Aether',
    icon: '🌐',
    classReq: 'Babaylan',
    pillarId: 'pillar_baba_2',
    pillarName: 'Storm of Kadaklan',
    tier: 2,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Damage-Amp]', '[Shock]'],
    description: 'Shocked targets take +12% increased damage from all magic and physical attacks.',
    flavorText: 'Charged aether leaves the target vulnerable to subsequent devastation.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'MAGIC',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_baba_6',
    name: 'Cataclysmic Cyclone',
    icon: '🌪️',
    classReq: 'Babaylan',
    pillarId: 'pillar_baba_2',
    pillarName: 'Storm of Kadaklan',
    tier: 3,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Consumes: Shock]', '[Burst]'],
    description: 'Summon a violent tropical cyclone that consumes Shock charges to stun the target for 1 turn and deal 2.8x Magic damage.',
    flavorText: 'The monsoon wind knows no master.',
    mpCost: 55,
    cooldownTurns: 3,
    damageType: 'LIGHTNING',
    baseDamageMultiplier: 2.8,
  },
  {
    id: 'skill_baba_p2_cap',
    parentSkillId: 'skill_baba_6',
    name: "Kadaklan's Avatar",
    icon: '⚡',
    classReq: 'Babaylan',
    pillarId: 'pillar_baba_2',
    pillarName: 'Storm of Kadaklan',
    tier: 4,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Thunder-Proc]', '[Burst]'],
    description: 'Pinnacle Capstone: Every critical magic strike triggers a secondary divine thunderbolt for 40% damage and restores +5 MP.',
    flavorText: 'The shaman stands enveloped in the terrifying majesty of the tempest.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'MAGIC',
    baseDamageMultiplier: 0,
  },

  // --- PILLAR 3: THE SHADOW CURSE ---
  {
    id: 'skill_baba_p3_drain',
    name: 'Soul-Siphon Chant',
    icon: '🔮',
    classReq: 'Babaylan',
    pillarId: 'pillar_baba_3',
    pillarName: 'The Shadow Curse',
    tier: 1,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Soul-Drain]', '[Sustain]'],
    description: 'Curse the target’s vital spirit, dealing 1.6x Shadow damage and siphoning 40% of damage dealt as Health back to the Babaylan.',
    flavorText: 'The vital thread is redirected into the shaman’s heart.',
    mpCost: 20,
    cooldownTurns: 1,
    damageType: 'SHADOW',
    baseDamageMultiplier: 1.6,
  },
  {
    id: 'skill_baba_p3_1',
    parentSkillId: 'skill_baba_p3_drain',
    name: 'Soul Tithe',
    icon: '🕯️',
    classReq: 'Babaylan',
    pillarId: 'pillar_baba_3',
    pillarName: 'The Shadow Curse',
    tier: 1,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Soul-Drain]', '[Resource]'],
    description: 'Whenever an enemy suffers damage from a Curse or DoT, you gain +3 MP and +5 HP.',
    flavorText: 'The decay of evil nourishes the righteous vessel.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'MAGIC',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_baba_p3_hex',
    name: 'Gloom Hex of the Aswang',
    icon: '🦇',
    classReq: 'Babaylan',
    pillarId: 'pillar_baba_3',
    pillarName: 'The Shadow Curse',
    tier: 2,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Curse]', '[Exhaustion]'],
    description: 'Afflict the target with Exhaustion, halving their mana/action recovery and reducing Magic Defense by 30% for 3 turns.',
    flavorText: 'Dark whisperings invoke the dread of the nocturnal fiends.',
    mpCost: 35,
    cooldownTurns: 2,
    damageType: 'SHADOW',
    baseDamageMultiplier: 1.4,
    effectType: 'EXHAUSTION',
  },
  {
    id: 'skill_baba_p3_2',
    parentSkillId: 'skill_baba_p3_hex',
    name: 'Shadowveil',
    icon: '🖤',
    classReq: 'Babaylan',
    pillarId: 'pillar_baba_3',
    pillarName: 'The Shadow Curse',
    tier: 2,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Weaken]', '[Retaliation]'],
    description: 'Taking damage has a 25% chance to curse the attacker, reducing their damage by 20% for 2 turns.',
    flavorText: 'Strike the shaman, and the curse will tether to your hand.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'MAGIC',
    baseDamageMultiplier: 0,
  },
  {
    id: 'skill_baba_7',
    name: 'Eclipse Severance',
    icon: '🌑',
    classReq: 'Babaylan',
    pillarId: 'pillar_baba_3',
    pillarName: 'The Shadow Curse',
    tier: 3,
    type: 'ACTIVE',
    maxRank: 5,
    spCost: 1,
    synergyTags: ['[Shadow]', '[Execution]'],
    description: 'Sever spiritual tethers, dealing 2.6x Shadow damage amplified by +20% for each active debuff on the enemy.',
    flavorText: 'The shadow cuts clean where all lights fail.',
    mpCost: 50,
    cooldownTurns: 3,
    damageType: 'SHADOW',
    baseDamageMultiplier: 2.6,
  },
  {
    id: 'skill_baba_p3_cap',
    parentSkillId: 'skill_baba_7',
    name: 'Master Hexer',
    icon: '👁️‍🗨️',
    classReq: 'Babaylan',
    pillarId: 'pillar_baba_3',
    pillarName: 'The Shadow Curse',
    tier: 4,
    type: 'PASSIVE',
    maxRank: 1,
    spCost: 1,
    synergyTags: ['[Curse-Mastery]'],
    description: 'Pinnacle Capstone: Curses and debuffs can stack twice, and target resistances against your spells are reduced to 0.',
    flavorText: 'The boundary between shaman and sorcerer dissolves into absolute supremacy.',
    mpCost: 0,
    cooldownTurns: 0,
    damageType: 'MAGIC',
    baseDamageMultiplier: 0,
  },
];

// ---------------------------------------------------------------------------
// Helper Functions & Scaling Engine
// ---------------------------------------------------------------------------

/** Returns all skills belonging to the given hero class (excluding basic attacks from skill tree) */
export const getSkillsByClass = (heroClass: HeroClass): Skill[] =>
  ALL_SKILLS.filter(s => s.classReq === heroClass && !s.isBasicAttack);

/** Returns the 3 Thematic Pillars for a given class */
export const getPillarsByClass = (heroClass: HeroClass): PillarMetadata[] =>
  CLASS_PILLARS[heroClass] ?? [];

/** Returns IDs of all default starter skills for a given class (Basic Attack only) */
export const getDefaultSkillIds = (heroClass: HeroClass): string[] => {
  const basicId = getBasicAttackId(heroClass);
  return basicId ? [basicId] : [];
};

/** Returns the ID of the basic attack skill for a given hero class */
export const getBasicAttackId = (heroClass: HeroClass): string =>
  ALL_SKILLS.find(s => s.classReq === heroClass && s.isBasicAttack)?.id ?? '';

/** Gets the current Rank (0 to 5) for a given skill ID */
export const getSkillRank = (player: PlayerCharacter, skillId: string): number => {
  return player.skillRanks?.[skillId] ?? 0;
};

/**
 * Returns SP cost per rank/keystone based on Tier
 */
export const getSkillTierCost = (tier?: number): number => {
  if (!tier || tier === 1) return 1;
  if (tier === 2) return 2;
  if (tier === 3) return 3;
  return 5; // Tier 4 Pinnacle Capstone
};

/**
 * Calculates total Skill Points spent within a specific pillar.
 */
export const getPillarSpentSP = (player: PlayerCharacter, pillarId: string): number => {
  if (!pillarId || !player.skillRanks) return 0;
  const pillarSkills = ALL_SKILLS.filter(s => s.pillarId === pillarId && !s.isBasicAttack);
  let total = 0;
  for (const s of pillarSkills) {
    const rank = player.skillRanks[s.id] ?? 0;
    total += rank * getSkillTierCost(s.tier);
  }
  return total;
};

/** Total SP spent across all pillars on this character */
export const getTotalSpentSP = (player: PlayerCharacter): number => {
  if (!player.skillRanks) return 0;
  let total = 0;
  for (const s of ALL_SKILLS) {
    if (s.isBasicAttack) continue;
    const rank = player.skillRanks[s.id] ?? 0;
    total += rank * getSkillTierCost(s.tier);
  }
  return total;
};

/** Deprecated: Level requirements removed in favor of smart SP investment */
export const TIER_LEVEL_REQUIREMENTS: Record<number, number> = {
  1: 1,
  2: 1,
  3: 1,
  4: 1,
};

/** Required SP spent in pillar per tier */
export const TIER_PILLAR_SP_REQUIREMENTS: Record<number, number> = {
  1: 0,
  2: 3,  // 3 SP in Tier 1 unlocks Tier 2
  3: 8,  // 8 SP in Pillar unlocks Tier 3
  4: 16, // 16 SP in Pillar unlocks Capstone
};

/** Alternative: Required Total SP spent across character (supports flexible hybrid builds) */
export const TIER_TOTAL_SP_REQUIREMENTS: Record<number, number> = {
  1: 0,
  2: 5,
  3: 12,
  4: 20,
};

/**
 * Checks gating requirements for learning/upgrading a skill node:
 * 1. Smart SP investment gate (Pillar SP threshold OR Character Total SP threshold)
 * 2. Prerequisite parent active skill check (for passives, requires parent rank >= 1)
 */
export const checkSkillGating = (
  skill: Skill,
  player: PlayerCharacter
): { isLocked: boolean; reason: string | null } => {
  // Basic attacks are never locked by tree gating
  if (skill.isBasicAttack) {
    return { isLocked: false, reason: null };
  }

  const tier = skill.tier || 1;

  // 1. Smart Flexible SP Gate (Pillar SP or Total Character SP)
  if (skill.pillarId) {
    const requiredPillarSP = TIER_PILLAR_SP_REQUIREMENTS[tier] ?? 0;
    const requiredTotalSP = TIER_TOTAL_SP_REQUIREMENTS[tier] ?? 0;
    const currentPillarSP = getPillarSpentSP(player, skill.pillarId);
    const currentTotalSP = getTotalSpentSP(player);

    const meetsPillar = currentPillarSP >= requiredPillarSP;
    const meetsTotal = currentTotalSP >= requiredTotalSP;

    if (!meetsPillar && !meetsTotal) {
      const remainingPillar = requiredPillarSP - currentPillarSP;
      return {
        isLocked: true,
        reason: `Requires ${requiredPillarSP} SP in this Pillar (${currentPillarSP}/${requiredPillarSP}, need ${remainingPillar} more) or ${requiredTotalSP} Total SP (${currentTotalSP}/${requiredTotalSP})`,
      };
    }
  }

  // 2. Prerequisite Parent Check (for Passives)
  if (skill.type === 'PASSIVE' && skill.parentSkillId) {
    const parentSkill = ALL_SKILLS.find(s => s.id === skill.parentSkillId);
    const parentRank = getSkillRank(player, skill.parentSkillId);
    if (parentRank < 1) {
      const parentName = parentSkill ? parentSkill.name : 'Parent Technique';
      return {
        isLocked: true,
        reason: `Requires ${parentName} (Rank 1+)`,
      };
    }
  }

  return { isLocked: false, reason: null };
};

/**
 * Returns Skill Point (SP) cost required to unlock or rank up a skill.
 * Progressively scales by Tier: Tier 1 = 1 SP, Tier 2 = 2 SP, Tier 3 = 3 SP, Tier 4 = 5 SP.
 * Returns 0 if at max rank or basic attack.
 */
export const getSkillUpgradeCostSP = (
  skillOrRank: Skill | number,
  currentRankOrMax?: number,
  maxRankInput: number = 5
): number => {
  if (typeof skillOrRank === 'number') {
    const currentRank = skillOrRank;
    const maxRank = currentRankOrMax ?? maxRankInput;
    if (currentRank >= maxRank) return 0;
    return 1;
  }
  const skill = skillOrRank;
  const currentRank = currentRankOrMax ?? 0;
  const maxRank = skill.maxRank ?? (skill.type === 'PASSIVE' ? 1 : 5);
  if (currentRank >= maxRank) return 0;
  if (skill.isBasicAttack) return 0;
  return getSkillTierCost(skill.tier);
};

/** Backward-compatible alias */
export const getSkillUpgradeCost = (currentRank: number): number => {
  return getSkillUpgradeCostSP(currentRank, 5);
};

/** Returns damage multiplier scaled by skill rank (+15% per rank above 1) */
export const getScaledSkillDamageMult = (skill: Skill, rank: number): number => {
  if (!skill.baseDamageMultiplier || skill.baseDamageMultiplier === 0) return 0;
  const safeRank = Math.max(1, rank);
  const bonusFactor = 1 + (safeRank - 1) * 0.15;
  return Number((skill.baseDamageMultiplier * bonusFactor).toFixed(2));
};

/** Returns heal percentage scaled by skill rank (+15% per rank above 1) */
export const getScaledSkillHeal = (skill: Skill, rank: number): number => {
  if (!skill.healsPercent) return 0;
  const safeRank = Math.max(1, rank);
  const bonusFactor = 1 + (safeRank - 1) * 0.15;
  return Number((skill.healsPercent * bonusFactor).toFixed(3));
};

/** Returns shield percentage scaled by skill rank (+15% per rank above 1) */
export const getScaledSkillShield = (skill: Skill, rank: number): number => {
  if (!skill.shieldPercent) return 0;
  const safeRank = Math.max(1, rank);
  const bonusFactor = 1 + (safeRank - 1) * 0.15;
  return Number((skill.shieldPercent * bonusFactor).toFixed(3));
};

/** Returns barrier percentage scaled by skill rank (+15% per rank above 1) */
export const getScaledSkillBarrier = (skill: Skill, rank: number): number => {
  if (!skill.barrierPercent) return 0;
  const safeRank = Math.max(1, rank);
  const bonusFactor = 1 + (safeRank - 1) * 0.15;
  return Number((skill.barrierPercent * bonusFactor).toFixed(3));
};

/** Formats a side-by-side progression preview for the Skill Inspector Modal */
export const getSkillDeltaPreview = (skill: Skill, currentRank: number): {
  currentText: string;
  nextText: string;
  isMaxRank: boolean;
} => {
  const maxRank = skill.maxRank ?? 5;
  if (skill.type === 'PASSIVE') {
    const isAllocated = currentRank >= 1;
    const cost = getSkillTierCost(skill.tier);
    return {
      currentText: isAllocated ? 'Allocated (1/1)' : 'Not Allocated (0/1)',
      nextText: isAllocated ? 'Max Rank Reached' : `Allocates Keystone (${cost} SP)`,
      isMaxRank: isAllocated,
    };
  }

  const isMax = currentRank >= maxRank;
  const currMult = getScaledSkillDamageMult(skill, currentRank);
  const nextMult = getScaledSkillDamageMult(skill, currentRank + 1);

  let currentText = '';
  let nextText = '';

  if (skill.damageType === 'HEAL' && skill.healsPercent) {
    const currHeal = Math.round(getScaledSkillHeal(skill, currentRank) * 100);
    const nextHeal = Math.round(getScaledSkillHeal(skill, currentRank + 1) * 100);
    currentText = `Heals ${currHeal}% Max HP`;
    nextText = isMax ? 'Max Rank Reached' : `Heals ${nextHeal}% Max HP (+${nextHeal - currHeal}%)`;
  } else if (skill.shieldPercent) {
    const currShield = Math.round(getScaledSkillShield(skill, currentRank) * 100);
    const nextShield = Math.round(getScaledSkillShield(skill, currentRank + 1) * 100);
    currentText = `Shield ${currShield}% Max HP`;
    nextText = isMax ? 'Max Rank Reached' : `Shield ${nextShield}% Max HP (+${nextShield - currShield}%)`;
  } else if (skill.barrierPercent) {
    const currBarr = Math.round(getScaledSkillBarrier(skill, currentRank) * 100);
    const nextBarr = Math.round(getScaledSkillBarrier(skill, currentRank + 1) * 100);
    currentText = `${currMult}x DMG · ${currBarr}% Barrier`;
    nextText = isMax ? 'Max Rank Reached' : `${nextMult}x DMG · ${nextBarr}% Barrier`;
  } else {
    currentText = `${currMult}x Weapon DMG`;
    nextText = isMax ? 'Max Rank Reached' : `${nextMult}x Weapon DMG (+15%)`;
  }

  return { currentText, nextText, isMaxRank: isMax };
};

