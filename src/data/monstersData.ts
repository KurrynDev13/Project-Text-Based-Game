import { EnemyMonster, MemoryRarity } from '../types/game';

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
}

export const MONSTER_TEMPLATES: MonsterTemplate[] = [
  {
    id: 'm_scavenger',
    name: 'Scavenger Drone',
    title: 'Automated Scrap Gatherer',
    baseHp: 35,
    baseArmor: 2,
    baseMinDmg: 4,
    baseMaxDmg: 8,
    damageType: 'PHYSICAL',
    expMult: 1.0,
    copperMult: 1.0,
    spriteIcon: '🤖',
    memoryDropRarity: 'WHITE',
  },
  {
    id: 'm_rogue_drone',
    name: 'Rogue Security Drone',
    title: 'Corrupted Outpost Patrol',
    baseHp: 55,
    baseArmor: 5,
    baseMinDmg: 8,
    baseMaxDmg: 14,
    damageType: 'PHYSICAL',
    expMult: 1.2,
    copperMult: 1.3,
    spriteIcon: '🛩️',
    specialAbility: 'Applies Bleed on crit',
    memoryDropRarity: 'GREEN',
  },
  {
    id: 'm_wasteland_stalker',
    name: 'Wasteland Stalker',
    title: 'Mutated Earth Predator',
    baseHp: 80,
    baseArmor: 10,
    baseMinDmg: 12,
    baseMaxDmg: 20,
    damageType: 'PHYSICAL',
    expMult: 1.5,
    copperMult: 1.5,
    spriteIcon: '🐺',
    memoryDropRarity: 'GREEN',
  },
  {
    id: 'm_void_revenant',
    name: 'Void Revenant',
    title: 'Ethereal Lunar Spectre',
    baseHp: 130,
    baseArmor: 18,
    baseMinDmg: 18,
    baseMaxDmg: 28,
    damageType: 'SHADOW',
    expMult: 2.0,
    copperMult: 2.2,
    spriteIcon: '👻',
    specialAbility: 'Applies Burn debuff',
    memoryDropRarity: 'BLUE',
  },
  {
    id: 'm_lunar_sentinel',
    name: 'Lunar Sentinel',
    title: 'Heavy Defense Automaton',
    baseHp: 200,
    baseArmor: 35,
    baseMinDmg: 25,
    baseMaxDmg: 40,
    damageType: 'LIGHTNING',
    expMult: 2.8,
    copperMult: 3.0,
    spriteIcon: '🤖',
    specialAbility: 'Applies Exhaustion',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_marauder_captain',
    name: 'Marauder Captain',
    title: 'Lunar Outlaw Boss',
    baseHp: 320,
    baseArmor: 45,
    baseMinDmg: 35,
    baseMaxDmg: 55,
    damageType: 'PHYSICAL',
    expMult: 3.8,
    copperMult: 4.5,
    spriteIcon: '🏴‍☠️',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_methane_abomination',
    name: 'Methane Abomination',
    title: 'Sub-Zero Trench Horror',
    baseHp: 450,
    baseArmor: 50,
    baseMinDmg: 50,
    baseMaxDmg: 80,
    damageType: 'FROST',
    expMult: 5.0,
    copperMult: 6.0,
    spriteIcon: '👾',
    specialAbility: 'Applies Poison & Chill',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'm_abyss_titan',
    name: 'Abyss Titan',
    title: 'Ancient Methane Leviathan',
    baseHp: 750,
    baseArmor: 70,
    baseMinDmg: 70,
    baseMaxDmg: 110,
    damageType: 'SHADOW',
    expMult: 7.5,
    copperMult: 9.0,
    spriteIcon: '🦑',
    memoryDropRarity: 'RED',
  },
  {
    id: 'm_titan_overseer',
    name: 'Titan Overseer',
    title: 'Pantheon Sub-Commander',
    baseHp: 1000,
    baseArmor: 90,
    baseMinDmg: 90,
    baseMaxDmg: 140,
    damageType: 'FIRE',
    expMult: 10.0,
    copperMult: 12.0,
    spriteIcon: '👁️',
    specialAbility: 'Consumes Player Mana',
    memoryDropRarity: 'RED',
  },
  {
    id: 'm_ares_guard',
    name: 'Ares Citadel Guard',
    title: 'Warmaster Legionnaire',
    baseHp: 1300,
    baseArmor: 110,
    baseMinDmg: 120,
    baseMaxDmg: 180,
    damageType: 'PHYSICAL',
    expMult: 14.0,
    copperMult: 16.0,
    spriteIcon: '⚔️',
    memoryDropRarity: 'RED',
  },
  {
    id: 'm_celestial_colossus',
    name: 'Celestial Colossus',
    title: 'Star-Forged War Construct',
    baseHp: 1800,
    baseArmor: 140,
    baseMinDmg: 150,
    baseMaxDmg: 230,
    damageType: 'MAGIC',
    expMult: 18.0,
    copperMult: 22.0,
    spriteIcon: '🗿',
    memoryDropRarity: 'RED',
  },
  // Campaign Act Anchor Bosses (Story Bible)
  {
    id: 'boss_malphas',
    name: 'Root-Hulk Malphas',
    title: 'Act I Anchor Boss - Ironwood Ancient',
    baseHp: 300,
    baseArmor: 25,
    baseMinDmg: 20,
    baseMaxDmg: 35,
    damageType: 'PHYSICAL',
    expMult: 4.0,
    copperMult: 5.0,
    spriteIcon: '🪵',
    specialAbility: 'Root Entanglement (Applies Bleed)',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'boss_valthea',
    name: 'High Priestess Valthea',
    title: 'Act II Anchor Boss - Leader of Ash-Sworn',
    baseHp: 650,
    baseArmor: 45,
    baseMinDmg: 40,
    baseMaxDmg: 65,
    damageType: 'SHADOW',
    expMult: 7.0,
    copperMult: 8.0,
    spriteIcon: '🧙‍♀️',
    specialAbility: 'Shard Shatter Curse',
    memoryDropRarity: 'PURPLE',
  },
  {
    id: 'boss_ignis',
    name: 'Ignis the Pyre Wyrm',
    title: 'Act III Anchor Boss - Geothermal Hearth Dragon',
    baseHp: 1200,
    baseArmor: 80,
    baseMinDmg: 75,
    baseMaxDmg: 110,
    damageType: 'FIRE',
    expMult: 12.0,
    copperMult: 15.0,
    spriteIcon: '🐉',
    specialAbility: 'Magma Inferno (Applies Burn)',
    memoryDropRarity: 'RED',
  },
  {
    id: 'boss_xarkoth',
    name: 'Void-Gazer Xar\'koth',
    title: 'Act IV Anchor Boss - Astral Sanity Feeder',
    baseHp: 2200,
    baseArmor: 120,
    baseMinDmg: 130,
    baseMaxDmg: 190,
    damageType: 'MAGIC',
    expMult: 20.0,
    copperMult: 25.0,
    spriteIcon: '👁️',
    specialAbility: 'Sanity Drain (Consumes Player MP)',
    memoryDropRarity: 'RED',
  },
  {
    id: 'boss_gorgoroth',
    name: 'Gorgoroth, the Earth-Breaker',
    title: 'Act V World Titan - Prime Colossus Raid',
    baseHp: 5000,
    baseArmor: 200,
    baseMinDmg: 250,
    baseMaxDmg: 400,
    damageType: 'LIGHTNING',
    expMult: 50.0,
    copperMult: 100.0,
    spriteIcon: '🗿',
    specialAbility: 'Continental Tremor Sunder',
    memoryDropRarity: 'RED',
  },
];

export function generateMonsterForLocation(
  locationMinLevel: number,
  specificMonsterId?: string,
  allowedMonsterIds?: string[]
): EnemyMonster {
  let template = MONSTER_TEMPLATES.find((m) => m.id === specificMonsterId);

  if (!template && allowedMonsterIds && allowedMonsterIds.length > 0) {
    const validTemplates = MONSTER_TEMPLATES.filter((m) => allowedMonsterIds.includes(m.id));
    if (validTemplates.length > 0) {
      template = validTemplates[Math.floor(Math.random() * validTemplates.length)];
    }
  }

  if (!template) {
    const candidateTemplates = MONSTER_TEMPLATES.filter(
      (m) => Math.abs(m.baseHp - locationMinLevel * 25) < 300
    );
    template = candidateTemplates.length > 0
      ? candidateTemplates[Math.floor(Math.random() * candidateTemplates.length)]
      : MONSTER_TEMPLATES[Math.min(MONSTER_TEMPLATES.length - 1, Math.floor(locationMinLevel / 4))];
  }

  const levelScale = Math.pow(1.15, locationMinLevel - 1);
  const statScale = 1 + (locationMinLevel - 1) * 0.25;
  const maxHp = Math.floor(template.baseHp * statScale);
  const armor = Math.floor(template.baseArmor * statScale);
  const attackMin = Math.floor(template.baseMinDmg * statScale);
  const attackMax = Math.floor(template.baseMaxDmg * statScale);
  const expReward = Math.max(12, Math.floor(18 * levelScale * template.expMult));
  const copperReward = Math.floor(30 * (1 + (locationMinLevel - 1) * 0.35) * template.copperMult);

  return {
    id: template.id,
    name: template.name,
    title: template.title,
    level: locationMinLevel,
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
