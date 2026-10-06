import { EnemyMonster, MemoryRarity } from '../types/game';
import { calcExpRequired, calcMonsterPowerRating } from '../utils/gameFormulas';

export interface MonsterTemplate {
  id: string;
  name: string;
  title: string;
  baseHp: number;
  baseArmor: number;
  baseMinDmg: number;
  baseMaxDmg: number;
  damageType: 'PHYSICAL' | 'MAGIC' | 'FIRE' | 'FROST' | 'LIGHTNING' | 'SHADOW';
  expMult: number;
  copperMult: number;
  spriteIcon: string;
  specialAbility?: string;
  memoryDropRarity?: MemoryRarity;
  isBoss?: boolean;
}

export const MONSTER_TEMPLATES: MonsterTemplate[] = [
  // ==========================================
  // ACT I: THE WHISPERING BALETE FOREST (Levels 1–6)
  // 3 Regular Monsters + 1 Mandatory Boss
  // ==========================================
  {
    id: 'm_tiyanak',
    name: 'Bramble Tiyanak Stalker',
    title: 'Bushland Trickster Fiend',
    baseHp: 90,
    baseArmor: 4,
    baseMinDmg: 8,
    baseMaxDmg: 14,
    damageType: 'PHYSICAL',
    expMult: 1.0,
    copperMult: 1.0,
    spriteIcon: '🐺',
    memoryDropRarity: 'WHITE',
  },
  {
    id: 'm_nuno',
    name: 'Mound-Dweller Earth Sprite (Nuno)',
    title: 'Anthill Earth Dweller',
    baseHp: 120,
    baseArmor: 6,
    baseMinDmg: 12,
    baseMaxDmg: 18,
    damageType: 'MAGIC',
    expMult: 1.1,
    copperMult: 1.1,
    spriteIcon: '🍄',
    specialAbility: 'Inflicts Nature Poison on hit',
    memoryDropRarity: 'WHITE',
  },
  {
    id: 'm_tikbalang_scout',
    name: 'Canopy Tikbalang Scout',
    title: 'Tall Forest Equine Guardian',
    baseHp: 160,
    baseArmor: 10,
    baseMinDmg: 16,
    baseMaxDmg: 24,
    damageType: 'PHYSICAL',
    expMult: 1.3,
    copperMult: 1.3,
    spriteIcon: '🐴',
    specialAbility: '+15% Evasive Dodge',
    memoryDropRarity: 'GREEN',
  },
  {
    id: 'boss_act_1',
    name: 'The Ancient Kapre',
    title: 'Act I Guardian • Colossus of the Whispering Balete',
    baseHp: 560,
    baseArmor: 16,
    baseMinDmg: 18,
    baseMaxDmg: 26,
    damageType: 'FIRE',
    expMult: 5.0,
    copperMult: 6.0,
    spriteIcon: '🪵',
    specialAbility: 'Smoldering Cigar Stomp: Deals heavy fire damage & applies Burn',
    memoryDropRarity: 'RED',
    isBoss: true,
  },

  // ==========================================
  // ACT II: LAGOON OF THE SUNKEN SIRENS (Levels 7–12)
  // 3 Regular Monsters + 1 Mandatory Boss
  // ==========================================
  {
    id: 'm_syokoy_raider',
    name: 'Syokoy Murk-Raider',
    title: 'Scale-Armored Water Marauder',
    baseHp: 240,
    baseArmor: 14,
    baseMinDmg: 22,
    baseMaxDmg: 32,
    damageType: 'PHYSICAL',
    expMult: 1.5,
    copperMult: 1.5,
    spriteIcon: '🧜‍♂️',
    memoryDropRarity: 'GREEN',
  },
  {
    id: 'm_berbalang',
    name: 'Berbalang Carrion-Ghoul',
    title: 'Grave-Snatching Winged Spectre',
    baseHp: 310,
    baseArmor: 18,
    baseMinDmg: 28,
    baseMaxDmg: 38,
    damageType: 'SHADOW',
    expMult: 1.7,
    copperMult: 1.7,
    spriteIcon: '🦇',
    specialAbility: 'Vampiric Drain: Restores 10% damage dealt as health',
    memoryDropRarity: 'BLUE',
  },
  {
    id: 'm_sigbin',
    name: 'Shadow Sigbin Hound',
    title: 'Backwards-Walking Shadow Prowler',
    baseHp: 390,
    baseArmor: 24,
    baseMinDmg: 34,
    baseMaxDmg: 48,
    damageType: 'PHYSICAL',
    expMult: 2.0,
    copperMult: 2.0,
    spriteIcon: '🐕',
    specialAbility: 'Rending Bite: Applies Bleed for 3 turns',
    memoryDropRarity: 'BLUE',
  },
  {
    id: 'boss_act_2',
    name: 'Magindara, The Siren Matriarch',
    title: 'Act II Guardian • Queen of the Sunken Lagoon',
    baseHp: 1800,
    baseArmor: 45,
    baseMinDmg: 55,
    baseMaxDmg: 75,
    damageType: 'FROST',
    expMult: 8.0,
    copperMult: 9.0,
    spriteIcon: '🧜‍♀️',
    specialAbility: 'Whirlpool Maelstrom: Freezes target & halves action speed',
    memoryDropRarity: 'RED',
    isBoss: true,
  },

  // ==========================================
  // ACT III: CAVES OF THE ANCESTRAL DEAD (Levels 13–18)
  // 3 Regular Monsters + 1 Mandatory Boss
  // ==========================================
  {
    id: 'm_tomb_skeleton',
    name: 'Calumpit Tomb Skeleton',
    title: 'Restless Ancestral Burial Guard',
    baseHp: 950,
    baseArmor: 45,
    baseMinDmg: 65,
    baseMaxDmg: 88,
    damageType: 'PHYSICAL',
    expMult: 2.2,
    copperMult: 2.2,
    spriteIcon: '💀',
    memoryDropRarity: 'BLUE',
  },
  {
    id: 'm_amomongo',
    name: 'Wild Cave Ape Beast (Amomongo)',
    title: 'Feral Limestone Clawed Brute',
    baseHp: 1250,
    baseArmor: 55,
    baseMinDmg: 85,
    baseMaxDmg: 115,
    damageType: 'PHYSICAL',
    expMult: 2.5,
    copperMult: 2.5,
    spriteIcon: '🦍',
    specialAbility: 'Shattering Stun: Chance to stun player for 1 turn',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_batibat',
    name: 'Suffocating Batibat Nightmare',
    title: 'Oppressive Slumber Demon',
    baseHp: 1550,
    baseArmor: 65,
    baseMinDmg: 105,
    baseMaxDmg: 140,
    damageType: 'SHADOW',
    expMult: 2.8,
    copperMult: 2.8,
    spriteIcon: '🌑',
    specialAbility: 'Nightmare Weight: Applies Exhaustion debuff (-50% regen)',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'boss_act_3',
    name: 'Avatar of the Sun God (Shadow Apolaki)',
    title: 'Act III Guardian • Corrupted Solar Warlord',
    baseHp: 6800,
    baseArmor: 110,
    baseMinDmg: 145,
    baseMaxDmg: 195,
    damageType: 'FIRE',
    expMult: 12.0,
    copperMult: 14.0,
    spriteIcon: '☀️',
    specialAbility: 'Solar Eclipse Wrath: Unleashes dual radiant fire slash',
    memoryDropRarity: 'RED',
    isBoss: true,
  },

  // ==========================================
  // ACT IV: THE ASH-WREATHED CALDERA (Levels 19–25)
  // 4 Regular Monsters + 1 Mandatory Boss
  // ==========================================
  {
    id: 'm_santelmo',
    name: 'Santelmo Fire-Orb',
    title: 'Dancing Flame Soul of the Volcano',
    baseHp: 1650,
    baseArmor: 68,
    baseMinDmg: 115,
    baseMaxDmg: 155,
    damageType: 'FIRE',
    expMult: 3.2,
    copperMult: 3.2,
    spriteIcon: '🔥',
    specialAbility: 'Blazing Aura: Ignites attacker on physical contact',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_dalaketnon',
    name: 'Dalaketnon Shadow Infiltrator',
    title: 'Deceptive Underground Noble',
    baseHp: 1950,
    baseArmor: 76,
    baseMinDmg: 130,
    baseMaxDmg: 175,
    damageType: 'SHADOW',
    expMult: 3.5,
    copperMult: 3.5,
    spriteIcon: '🧝',
    specialAbility: 'Shadow Ambush: +25% Critical Hit Chance',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_lava_pugot',
    name: 'Lava-Crusted Headless Ogre (Pugot)',
    title: 'Molten Obsidian Brute',
    baseHp: 2280,
    baseArmor: 85,
    baseMinDmg: 148,
    baseMaxDmg: 195,
    damageType: 'FIRE',
    expMult: 3.8,
    copperMult: 3.8,
    spriteIcon: '🌋',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_bungisngis',
    name: 'Bungisngis Laughing Cyclops',
    title: 'One-Eyed Jovial Colossus',
    baseHp: 2650,
    baseArmor: 95,
    baseMinDmg: 165,
    baseMaxDmg: 220,
    damageType: 'PHYSICAL',
    expMult: 4.2,
    copperMult: 4.2,
    spriteIcon: '👁️',
    specialAbility: 'Roaring Laughter: Shatters 20% of player armor',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'boss_act_4',
    name: 'Heart of Mount Kanlaon',
    title: 'Act IV Guardian • Primordial Magma Colossus',
    baseHp: 11500,
    baseArmor: 150,
    baseMinDmg: 210,
    baseMaxDmg: 285,
    damageType: 'FIRE',
    expMult: 18.0,
    copperMult: 20.0,
    spriteIcon: '🌋',
    specialAbility: 'Pyroclastic Eruption: Scorches the ground with continuous lava',
    memoryDropRarity: 'RED',
    isBoss: true,
  },

  // ==========================================
  // ACT V: THE CURSED BLOOD COAST (Levels 26–32)
  // 5 Regular Monsters + 1 Mandatory Boss
  // ==========================================
  {
    id: 'm_manananggal',
    name: 'Manananggal Torso-Flayer',
    title: 'Severed Winged Night Predator',
    baseHp: 2850,
    baseArmor: 105,
    baseMinDmg: 175,
    baseMaxDmg: 235,
    damageType: 'PHYSICAL',
    expMult: 4.6,
    copperMult: 4.6,
    spriteIcon: '🦇',
    specialAbility: 'Airborne Rend: Crits inflict 8% Max HP bleeding',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_wakwak',
    name: 'Wakwak Night-Harpy',
    title: 'Flapping Omen of the Moon',
    baseHp: 3200,
    baseArmor: 115,
    baseMinDmg: 195,
    baseMaxDmg: 260,
    damageType: 'PHYSICAL',
    expMult: 5.0,
    copperMult: 5.0,
    spriteIcon: '🦅',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_tiktik',
    name: 'Tik-Tik Roof-Stalker',
    title: 'Silent Tongue-Hunter',
    baseHp: 3600,
    baseArmor: 125,
    baseMinDmg: 215,
    baseMaxDmg: 285,
    damageType: 'SHADOW',
    expMult: 5.4,
    copperMult: 5.4,
    spriteIcon: '🦎',
    specialAbility: 'Creeping Whisper: Stuns for 1 turn upon ambush',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_balbal',
    name: 'Bal-Bal Corpse-Snatcher',
    title: 'Graveyard Sail-Wing Fiend',
    baseHp: 4050,
    baseArmor: 135,
    baseMinDmg: 235,
    baseMaxDmg: 310,
    damageType: 'SHADOW',
    expMult: 5.8,
    copperMult: 5.8,
    spriteIcon: '🧟',
    specialAbility: 'Stench of the Grave: Decreases player dodge by 15%',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_tigmamanukan',
    name: 'Tigmamanukan Omen-Raven',
    title: 'Prophetic Blue-Feathered Oracle',
    baseHp: 4500,
    baseArmor: 145,
    baseMinDmg: 255,
    baseMaxDmg: 335,
    damageType: 'MAGIC',
    expMult: 6.2,
    copperMult: 6.2,
    spriteIcon: '🪶',
    specialAbility: 'Fateful Omen: Next spell deals 50% critical damage',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'boss_act_5',
    name: 'The Primordial Aswang Warlord',
    title: 'Act V Guardian • Patriarch of the Night Coven',
    baseHp: 18000,
    baseArmor: 195,
    baseMinDmg: 310,
    baseMaxDmg: 415,
    damageType: 'SHADOW',
    expMult: 25.0,
    copperMult: 28.0,
    spriteIcon: '🧛',
    specialAbility: 'Blood Feast: Siphons 25% of player health to restore own vitality',
    memoryDropRarity: 'RED',
    isBoss: true,
  },

  // ==========================================
  // ACT VI: TRENCH OF THE ABYSSAL TIDE (Levels 33–39)
  // 6 Regular Monsters + 1 Mandatory Boss
  // ==========================================
  {
    id: 'm_syokoy_chieftain',
    name: 'Syokoy Deep-Chieftain',
    title: 'Trident-Wielding Abyssal Lord',
    baseHp: 4600,
    baseArmor: 155,
    baseMinDmg: 270,
    baseMaxDmg: 360,
    damageType: 'PHYSICAL',
    expMult: 6.7,
    copperMult: 6.7,
    spriteIcon: '🔱',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_trench_leviathan',
    name: 'Trench Sea Leviathan',
    title: 'Sunken Trench Behemoth',
    baseHp: 5100,
    baseArmor: 168,
    baseMinDmg: 295,
    baseMaxDmg: 395,
    damageType: 'FROST',
    expMult: 7.2,
    copperMult: 7.2,
    spriteIcon: '🐋',
    specialAbility: 'Crushing Pressure: Halves player physical damage for 2 turns',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_sunken_corsair',
    name: 'Sunken Corsair Phantom',
    title: 'Ghostly Spanish Galleon Captain',
    baseHp: 5650,
    baseArmor: 180,
    baseMinDmg: 325,
    baseMaxDmg: 430,
    damageType: 'SHADOW',
    expMult: 7.8,
    copperMult: 7.8,
    spriteIcon: '⚓',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_coral_berbalang',
    name: 'Coral Berbalang Fiend',
    title: 'Calcified Reef Predator',
    baseHp: 6200,
    baseArmor: 192,
    baseMinDmg: 355,
    baseMaxDmg: 465,
    damageType: 'PHYSICAL',
    expMult: 8.4,
    copperMult: 8.4,
    spriteIcon: '🪸',
    specialAbility: 'Barbed Carapace: Reflects 15% physical damage back to attacker',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_maelstrom_spirit',
    name: 'Abyssal Maelstrom Spirit',
    title: 'Swirling Vortex Elemental',
    baseHp: 6800,
    baseArmor: 205,
    baseMinDmg: 385,
    baseMaxDmg: 505,
    damageType: 'LIGHTNING',
    expMult: 9.0,
    copperMult: 9.0,
    spriteIcon: '🌀',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_giant_kelp_leech',
    name: 'Giant Kelp Leech',
    title: 'Submerged Blood Parasite',
    baseHp: 7400,
    baseArmor: 218,
    baseMinDmg: 415,
    baseMaxDmg: 545,
    damageType: 'PHYSICAL',
    expMult: 9.6,
    copperMult: 9.6,
    spriteIcon: '🪱',
    specialAbility: 'Draining Maw: Drains 15 MP per attack',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'boss_act_6',
    name: 'Tambanokano, The Moon-Crusher',
    title: 'Act VI Guardian • Giant Moon-Devouring Crab Titan',
    baseHp: 26000,
    baseArmor: 245,
    baseMinDmg: 430,
    baseMaxDmg: 575,
    damageType: 'PHYSICAL',
    expMult: 35.0,
    copperMult: 40.0,
    spriteIcon: '🦀',
    specialAbility: 'Tectonic Tidal Pincer: Sunder structural defenses & causes tidal shockwaves',
    memoryDropRarity: 'RED',
    isBoss: true,
  },

  // ==========================================
  // ACT VII: SPIRES OF THE SKY-CITADEL (Levels 40–46)
  // 7 Regular Monsters + 1 Mandatory Boss
  // ==========================================
  {
    id: 'm_minokawa_raptor',
    name: 'Sun-Slayer Raptor (Minokawa)',
    title: 'Sky-Dwelling Sun-Chaser',
    baseHp: 6500,
    baseArmor: 220,
    baseMinDmg: 380,
    baseMaxDmg: 480,
    damageType: 'FIRE',
    expMult: 10.3,
    copperMult: 10.3,
    spriteIcon: '🦅',
    specialAbility: 'Blinding Plumage: Causes attacks to miss 30% of the time',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_sarimanok_warden',
    name: 'Sarimanok Arcane Warden',
    title: 'Rainbow Plumed Celestial Sentry',
    baseHp: 7100,
    baseArmor: 235,
    baseMinDmg: 410,
    baseMaxDmg: 520,
    damageType: 'MAGIC',
    expMult: 11.0,
    copperMult: 11.0,
    spriteIcon: '🦚',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_diwata_sentinel',
    name: 'Diwata Sky-Sentinel',
    title: 'Guardian Spirit of the Clouds',
    baseHp: 7700,
    baseArmor: 250,
    baseMinDmg: 445,
    baseMaxDmg: 565,
    damageType: 'MAGIC',
    expMult: 11.8,
    copperMult: 11.8,
    spriteIcon: '🧚',
    specialAbility: 'Divine Grace: Cleanses own debuffs every 2 turns',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_storm_bagwis',
    name: 'Storm Wind Harpy (Bagwis)',
    title: 'Gale-Force Feathered Fury',
    baseHp: 8400,
    baseArmor: 265,
    baseMinDmg: 485,
    baseMaxDmg: 610,
    damageType: 'LIGHTNING',
    expMult: 12.6,
    copperMult: 12.6,
    spriteIcon: '🌪️',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_kidlat_elemental',
    name: 'Lightning Kidlat Elemental',
    title: 'Living Arc of Thunder',
    baseHp: 9100,
    baseArmor: 280,
    baseMinDmg: 525,
    baseMaxDmg: 660,
    damageType: 'LIGHTNING',
    expMult: 13.5,
    copperMult: 13.5,
    spriteIcon: '⚡',
    specialAbility: 'Overcharge: Explodes for heavy lightning damage on defeat',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_kawal_datu',
    name: 'Warrior of the Mountain Datu',
    title: 'Celestial Guard of Sinukuan',
    baseHp: 9800,
    baseArmor: 295,
    baseMinDmg: 565,
    baseMaxDmg: 710,
    damageType: 'PHYSICAL',
    expMult: 14.4,
    copperMult: 14.4,
    spriteIcon: '🛡️',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_anito_colossus',
    name: 'Stone Anito Colossus',
    title: 'Living Monolith of Ancestral Earth',
    baseHp: 10500,
    baseArmor: 315,
    baseMinDmg: 610,
    baseMaxDmg: 760,
    damageType: 'PHYSICAL',
    expMult: 15.5,
    copperMult: 15.5,
    spriteIcon: '🗿',
    specialAbility: 'Fortified Stance: Increases armor by 50% below half HP',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'boss_act_7',
    name: 'Celestial Arbiter of Mount Arayat',
    title: 'Act VII Guardian • Divine Judge of the High Heavens',
    baseHp: 35000,
    baseArmor: 330,
    baseMinDmg: 580,
    baseMaxDmg: 780,
    damageType: 'MAGIC',
    expMult: 50.0,
    copperMult: 55.0,
    spriteIcon: '⚖️',
    specialAbility: 'Pillar of Light: Devastating radiant strike that pierces all armor',
    memoryDropRarity: 'RED',
    isBoss: true,
  },

  // ==========================================
  // ACT VIII: MAW OF THE GREAT ECLIPSE (Levels 47–55+)
  // 8 Regular Monsters + 1 Supreme World Titan Boss
  // ==========================================
  {
    id: 'm_eclipse_void_drake',
    name: 'Eclipse Void Drake',
    title: 'Winged Spawn of the Black Moon',
    baseHp: 9200,
    baseArmor: 335,
    baseMinDmg: 640,
    baseMaxDmg: 820,
    damageType: 'SHADOW',
    expMult: 16.8,
    copperMult: 16.8,
    spriteIcon: '🐉',
    memoryDropRarity: 'RED',
  },
  {
    id: 'm_cosmic_tikbalang',
    name: 'Cosmic Tikbalang Stalker',
    title: 'Interstellar Equine Phantom',
    baseHp: 10000,
    baseArmor: 355,
    baseMinDmg: 690,
    baseMaxDmg: 880,
    damageType: 'SHADOW',
    expMult: 18.0,
    copperMult: 18.0,
    spriteIcon: '🌌',
    specialAbility: 'Cosmic Shift: Evades 30% of incoming physical strikes',
    memoryDropRarity: 'RED',
  },
  {
    id: 'm_abyssal_aswang_lord',
    name: 'Abyssal Aswang Overlord',
    title: 'Crowned Lord of the Dark Hinterlands',
    baseHp: 10900,
    baseArmor: 375,
    baseMinDmg: 740,
    baseMaxDmg: 940,
    damageType: 'PHYSICAL',
    expMult: 19.4,
    copperMult: 19.4,
    spriteIcon: '👑',
    specialAbility: 'Blood Rupture: Inflicts escalating bleeding damage',
    memoryDropRarity: 'RED',
  },
  {
    id: 'm_corrupted_shaman_lich',
    name: 'Corrupted Shaman Lich',
    title: 'Fallen Babaylan Devoured by Void',
    baseHp: 11800,
    baseArmor: 395,
    baseMinDmg: 795,
    baseMaxDmg: 1010,
    damageType: 'MAGIC',
    expMult: 20.8,
    copperMult: 20.8,
    spriteIcon: '🧙‍♂️',
    specialAbility: 'Dark Orasyon: Drains 50 MP and inflicts magical rot',
    memoryDropRarity: 'RED',
  },
  {
    id: 'm_balete_void_horror',
    name: 'Balete Void Abomination',
    title: 'Twisted Root Horror of the Maw',
    baseHp: 12800,
    baseArmor: 415,
    baseMinDmg: 850,
    baseMaxDmg: 1080,
    damageType: 'MAGIC',
    expMult: 22.4,
    copperMult: 22.4,
    spriteIcon: '🌲',
    specialAbility: 'Constricting Vines: Roots player, disabling dodge',
    memoryDropRarity: 'RED',
  },
  {
    id: 'm_tidal_nether_serpent',
    name: 'Tidal Nether-Serpent',
    title: 'Frozen Coils of the Sub-Surface Abyss',
    baseHp: 13900,
    baseArmor: 435,
    baseMinDmg: 910,
    baseMaxDmg: 1150,
    damageType: 'FROST',
    expMult: 24.0,
    copperMult: 24.0,
    spriteIcon: '🐍',
    specialAbility: 'Glacial Constriction: Halves healing received',
    memoryDropRarity: 'RED',
  },
  {
    id: 'm_spectral_sky_devourer',
    name: 'Spectral Sky-Devourer',
    title: 'Astral Aberration of the Eclipse',
    baseHp: 15100,
    baseArmor: 455,
    baseMinDmg: 970,
    baseMaxDmg: 1220,
    damageType: 'SHADOW',
    expMult: 25.8,
    copperMult: 25.8,
    spriteIcon: '👻',
    specialAbility: 'Sanity Devour: Deals direct damage bypassing armor',
    memoryDropRarity: 'RED',
  },
  {
    id: 'm_bakunawa_spawn',
    name: 'Brood of the Moon Serpent',
    title: 'Venomous Hatchling of the Great Drake',
    baseHp: 16400,
    baseArmor: 475,
    baseMinDmg: 1030,
    baseMaxDmg: 1300,
    damageType: 'FIRE',
    expMult: 27.8,
    copperMult: 27.8,
    spriteIcon: '🌑',
    specialAbility: 'Eclipse Venom: Deals continuous fire and shadow damage',
    memoryDropRarity: 'RED',
  },
  {
    id: 'boss_act_8',
    name: 'Bakunawa, The Moon-Devouring Serpent',
    title: 'Act VIII Supreme World Titan • Devourer of the Seven Moons',
    baseHp: 58000,
    baseArmor: 460,
    baseMinDmg: 920,
    baseMaxDmg: 1250,
    damageType: 'SHADOW',
    expMult: 100.0,
    copperMult: 100.0,
    spriteIcon: '🐉',
    specialAbility: 'Great Eclipse Extinction: World-devouring cataclysmic dark blast',
    memoryDropRarity: 'RED',
    isBoss: true,
  },
];

export function generateMonsterForLocation(
  locationMinLevel: number,
  specificMonsterId?: string,
  allowedMonsterIds?: string[],
  ngPlusLevel: number = 0,
  ngPlusStartLevel: number = 0,
  playerContext?: {
    level?: number;
    maxHp?: number;
    effectiveDmg?: number;
    powerLevel?: number;
  }
): EnemyMonster {
  let template = MONSTER_TEMPLATES.find((m) => m.id === specificMonsterId);

  if (!template && allowedMonsterIds && allowedMonsterIds.length > 0) {
    const validTemplates = MONSTER_TEMPLATES.filter((m) => allowedMonsterIds.includes(m.id));
    if (validTemplates.length > 0) {
      template = validTemplates[Math.floor(Math.random() * validTemplates.length)];
    }
  }

  const actNumber = Math.max(1, Math.min(8, Math.ceil(locationMinLevel / 6)));
  const actStartLevel = (actNumber - 1) * 6 + 1;
  const levelOffset = Math.max(0, locationMinLevel - actStartLevel);

  if (!template) {
    const candidateTemplates = MONSTER_TEMPLATES.filter(
      (m) => !m.isBoss && Math.abs(m.baseHp - locationMinLevel * 25) < 800
    );
    template = candidateTemplates.length > 0
      ? candidateTemplates[Math.floor(Math.random() * candidateTemplates.length)]
      : MONSTER_TEMPLATES[0];
  }

  let maxHp: number;
  let armor: number;
  let attackMin: number;
  let attackMax: number;

  const playerLvl = playerContext?.level || locationMinLevel;
  const playerDmg = playerContext?.effectiveDmg || 25;
  const playerHp = playerContext?.maxHp || 250;

  if (ngPlusLevel > 0) {
    // NG+ Stat Scaling:
    // Scaled so NG+ monsters have true tactical longevity with heightened threats.
    const ngTierMult = 1.0 + (ngPlusLevel - 1) * 0.50;
    const baseNgHp = template.isBoss
      ? 18000 + (actNumber - 1) * 7500 + levelOffset * 1200
      : 3600 + (actNumber - 1) * 1800 + levelOffset * 350;
    const hpArchetypeMult = template.isBoss ? 1.0 : Math.min(2.4, Math.max(0.7, template.baseHp / 120));
    const targetNgHp = Math.floor(baseNgHp * hpArchetypeMult * ngTierMult);

    const baseNgArmor = template.isBoss
      ? 120 + (actNumber - 1) * 35 + levelOffset * 8
      : 35 + (actNumber - 1) * 12 + levelOffset * 3;
    const armorArchetypeMult = template.isBoss ? 1.0 : Math.min(2.2, Math.max(0.6, template.baseArmor / 6));
    const targetNgArmor = Math.floor(baseNgArmor * armorArchetypeMult * ngTierMult);

    const baseNgDmgMin = template.isBoss
      ? 380 + (actNumber - 1) * 85 + levelOffset * 18
      : 220 + (actNumber - 1) * 50 + levelOffset * 10;
    const baseNgDmgMax = Math.floor(baseNgDmgMin * (template.isBoss ? 1.45 : 1.35));
    const dmgArchetypeMult = template.isBoss ? 1.0 : Math.min(2.0, Math.max(0.7, template.baseMinDmg / 10));
    const targetNgDmgMin = Math.floor(baseNgDmgMin * dmgArchetypeMult * ngTierMult);
    const targetNgDmgMax = Math.floor(baseNgDmgMax * dmgArchetypeMult * ngTierMult);

    // Dynamic player-adaptive scaling in NG+ if player has surpassed standard post-game metrics
    const playerScaledHp = template.isBoss
      ? Math.floor(playerDmg * 22 * hpArchetypeMult * ngTierMult)
      : Math.floor(playerDmg * 7.5 * hpArchetypeMult * ngTierMult);
    const playerScaledDmg = Math.floor(playerHp * (template.isBoss ? 0.28 : 0.14) * dmgArchetypeMult * ngTierMult);

    maxHp = Math.max(targetNgHp, playerScaledHp);
    armor = targetNgArmor;
    attackMin = Math.max(targetNgDmgMin, playerScaledDmg);
    attackMax = Math.max(targetNgDmgMax, Math.floor(attackMin * 1.35));
  } else {
    // Normal Mode (NG0):
    // Standard per-Act baseline difficulty floor + dynamic scaling based on player character stats
    const statScale = 1.0 + levelOffset * 0.04;
    const floorHp = Math.floor(template.baseHp * statScale);
    const floorArmor = Math.floor(template.baseArmor * statScale);
    const floorDmgMin = Math.floor(template.baseMinDmg * statScale);
    const floorDmgMax = Math.floor(template.baseMaxDmg * statScale);

    // Act Guardians in Normal Mode have curated challenge stats + adapt if player over-levels or over-gears
    if (template.isBoss) {
      if (playerContext && playerLvl > locationMinLevel + 3) {
        const excessLvl = playerLvl - locationMinLevel;
        const bossHpScale = 1.0 + excessLvl * 0.05;
        const bossDmgScale = 1.0 + excessLvl * 0.04;
        maxHp = Math.floor(floorHp * bossHpScale);
        armor = Math.floor(floorArmor * (1.0 + excessLvl * 0.03));
        attackMin = Math.floor(floorDmgMin * bossDmgScale);
        attackMax = Math.floor(floorDmgMax * bossDmgScale);
      } else {
        maxHp = floorHp;
        armor = floorArmor;
        attackMin = floorDmgMin;
        attackMax = floorDmgMax;
      }
    } else {
      // Baseline expected player metrics per act tier aligned with current stat formulas
      const expectedDmg = locationMinLevel * 10 + 35;
      const expectedHp = locationMinLevel * 50 + 350;

      const dmgExcessRatio = Math.max(1.0, playerDmg / expectedDmg);
      const hpExcessRatio = Math.max(1.0, playerHp / expectedHp);

      if (playerContext && playerLvl > locationMinLevel + 2 && (dmgExcessRatio > 1.1 || hpExcessRatio > 1.1)) {
        // Scale regular monster stats up smoothly if player vastly overlevels the zone
        const hpScale = Math.min(2.0, dmgExcessRatio);
        const dmgScale = Math.min(1.6, hpExcessRatio);

        maxHp = Math.floor(floorHp * hpScale);
        attackMin = Math.floor(floorDmgMin * dmgScale);
        attackMax = Math.floor(floorDmgMax * dmgScale);
        armor = Math.floor(floorArmor * (1 + (playerLvl - locationMinLevel) * 0.05));
      } else {
        maxHp = floorHp;
        armor = floorArmor;
        attackMin = floorDmgMin;
        attackMax = floorDmgMax;
      }
    }
  }

  // Calculate Titan Power Rating dynamically
  const powerRating = calcMonsterPowerRating(
    {
      maxHp,
      armor,
      attackMin,
      attackMax,
      damageType: template.damageType,
      specialAbility: template.specialAbility,
      isBoss: template.isBoss,
    },
    levelOffset,
    ngPlusLevel,
    ngPlusStartLevel
  );

  // Dynamic Monster Level: authentically represents combat threat while staying aligned with Act & NG+ brackets
  let dynamicLevel: number;
  if (ngPlusLevel > 0) {
    const ngBaseLevel = (ngPlusStartLevel || 50) + (actNumber - 1) * 4 + levelOffset;
    const tierOffset = template.isBoss ? 4 : Math.min(3, Math.floor((template.baseHp || 100) / 120));
    dynamicLevel = ngBaseLevel + tierOffset;
  } else {
    // Dynamic level in NG0: stays within act progression, slightly scales if player overlevels
    const actExpectedLvl = locationMinLevel + (template.isBoss ? 5 : Math.min(3, Math.floor(levelOffset)));
    const playerLvlCap = playerContext?.level
      ? Math.max(actExpectedLvl, Math.min(playerContext.level, locationMinLevel + 6))
      : actExpectedLvl;
    dynamicLevel = playerLvlCap;
  }

  // EXP reward: scaled proportionally to the EXP required for dynamicLevel (~6.5% of level per kill)
  // Eliminates runaway exponential math.pow overflows!
  const levelExpRequired = calcExpRequired(dynamicLevel);
  const baseKillExp = Math.floor(levelExpRequired * 0.065);
  const expReward = Math.max(
    15,
    Math.floor(baseKillExp * (template.expMult ?? 1.0))
  );

  const ngCopperMult = ngPlusLevel > 0 ? (1 + ngPlusLevel * 0.5) : 1.0;
  const copperReward = Math.floor(30 * (1 + (dynamicLevel - 1) * 0.35) * template.copperMult * ngCopperMult);

  const monsterName = ngPlusLevel > 0 ? `[NG+${ngPlusLevel}] ${template.name}` : template.name;

  return {
    id: template.id,
    name: monsterName,
    title: template.title,
    level: dynamicLevel,
    powerRating,
    maxHp,
    currentHp: maxHp,
    armor,
    attackMin,
    attackMax,
    damageType: template.damageType,
    expReward,
    copperReward,
    shardChance: 0.2 + Math.min(0.5, locationMinLevel * 0.02),
    memoryDropRarity: template.memoryDropRarity,
    specialAbility: template.specialAbility,
    activeEffects: [],
    spriteIcon: template.spriteIcon,
  };
}

export function generateMonsterForFloor(floorLevel: number): EnemyMonster {
  return generateMonsterForLocation(floorLevel);
}

