// Utility helper to safely resolve asset URLs with fallbacks for heroes, monsters, bosses, events, and act backgrounds.

const rawBase = import.meta.env.BASE_URL || './';
const BASE_URL = rawBase.endsWith('/') ? rawBase : rawBase + '/';

export function formatAssetUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${BASE_URL}${cleanPath}`;
}

export function getHeroImageUrl(heroClass?: string): string {
  const c = (heroClass || 'mandirigma').toLowerCase().trim();
  if (c.includes('mandirigma')) return formatAssetUrl('assets/heroes/hero_mandirigma.jpg');
  if (c.includes('bagani')) return formatAssetUrl('assets/heroes/hero_bagani.jpg');
  if (c.includes('mangangaso')) return formatAssetUrl('assets/heroes/hero_mangangaso.jpg');
  if (c.includes('babaylan')) return formatAssetUrl('assets/heroes/hero_babaylan.jpg');
  return formatAssetUrl('assets/heroes/hero_mandirigma.jpg');
}

export function getMonsterImageUrl(monsterId?: string, isBoss?: boolean): string {
  if (!monsterId) return formatAssetUrl('assets/monsters/m_tiyanak.jpg');
  const cleanId = monsterId.toLowerCase().trim();

  // Boss mapping
  if (isBoss || cleanId.startsWith('boss_')) {
    if (cleanId === 'boss_act_8_raid' || cleanId.includes('raid')) {
      return formatAssetUrl('assets/raid/boss_bakunawa_raid_titan.jpg');
    }
    return formatAssetUrl(`assets/bosses/${cleanId}.jpg`);
  }

  // Regular monster mapping
  return formatAssetUrl(`assets/monsters/${cleanId}.jpg`);
}

export function getEventImageUrl(eventType: 'TRADER' | 'CURSED_CHEST' | 'SHRINE' | 'CACHE' | 'SURGE' | 'JACKPOT' | 'TRIAL'): string {
  switch (eventType) {
    case 'TRADER':
      return formatAssetUrl('assets/events/event_trader.jpg');
    case 'CURSED_CHEST':
      return formatAssetUrl('assets/events/event_chest.jpg');
    case 'SHRINE':
      return formatAssetUrl('assets/events/event_shrine.jpg');
    case 'CACHE':
      return formatAssetUrl('assets/events/event_cache.jpg');
    case 'SURGE':
      return formatAssetUrl('assets/events/event_lunar_surge.jpg');
    case 'JACKPOT':
      return formatAssetUrl('assets/events/event_raid_jackpot.jpg');
    case 'TRIAL':
      return formatAssetUrl('assets/events/event_bathala_trial.jpg');
    default:
      return formatAssetUrl('assets/events/event_chest.jpg');
  }
}

export function getLocationBgUrl(locationId?: string): string {
  if (!locationId) return formatAssetUrl('assets/backgrounds/act_1_balete.jpg');
  const id = locationId.toLowerCase().trim();

  if (id.includes('act_1')) return formatAssetUrl('assets/backgrounds/act_1_balete.jpg');
  if (id.includes('act_2')) return formatAssetUrl('assets/backgrounds/act_2_lagoon.jpg');
  if (id.includes('act_3')) return formatAssetUrl('assets/backgrounds/act_3_cave.jpg');
  if (id.includes('act_4')) return formatAssetUrl('assets/backgrounds/act_4_caldera.jpg');
  if (id.includes('act_5')) return formatAssetUrl('assets/backgrounds/act_5_blood_coast.jpg');
  if (id.includes('act_6')) return formatAssetUrl('assets/backgrounds/act_6_trench.jpg');
  if (id.includes('act_7')) return formatAssetUrl('assets/backgrounds/act_7_sky_citadel.jpg');
  if (id.includes('act_8')) return formatAssetUrl('assets/backgrounds/act_8_eclipse_maw.jpg');
  if (id.includes('infinite') || id.includes('bathala')) return formatAssetUrl('assets/backgrounds/act_infinite_bathala.jpg');
  if (id.includes('raid')) return formatAssetUrl('assets/backgrounds/raid_bakunawa_abyss.jpg');

  return formatAssetUrl('assets/backgrounds/act_1_balete.jpg');
}

export function getQuestGiverImageUrl(giverNameOrId?: string): string {
  if (!giverNameOrId) return formatAssetUrl('assets/heroes/hero_babaylan.jpg');
  const name = giverNameOrId.toLowerCase();

  if (name.includes('tala')) return formatAssetUrl('assets/npcs/npc_tala.jpg');
  if (name.includes('nuno')) return formatAssetUrl('assets/npcs/npc_nuno_elder.jpg');
  if (name.includes('ligaya')) return formatAssetUrl('assets/npcs/npc_ligaya.jpg');
  if (name.includes('fisherman') || name.includes('datu')) return formatAssetUrl('assets/npcs/npc_fisherman_datu.jpg');
  if (name.includes('lualhati')) return formatAssetUrl('assets/npcs/npc_lualhati.jpg');
  if (name.includes('urduja')) return formatAssetUrl('assets/npcs/npc_herbalist_urduja.jpg');
  if (name.includes('kadunung')) return formatAssetUrl('assets/npcs/npc_kadunung.jpg');
  if (name.includes('marikit')) return formatAssetUrl('assets/npcs/npc_marikit.jpg');
  if (name.includes('amihan')) return formatAssetUrl('assets/npcs/npc_amihan.jpg');
  if (name.includes('malakas')) return formatAssetUrl('assets/npcs/npc_fire_malakas.jpg');
  if (name.includes('danum')) return formatAssetUrl('assets/npcs/npc_noble_danum.jpg');
  if (name.includes('silayan')) return formatAssetUrl('assets/npcs/npc_scout_silayan.jpg');
  if (name.includes('bayani')) return formatAssetUrl('assets/npcs/npc_bayani.jpg');
  if (name.includes('sinag')) return formatAssetUrl('assets/npcs/npc_matron_sinag.jpg');
  if (name.includes('katana')) return formatAssetUrl('assets/npcs/npc_katana_babaylan.jpg');
  if (name.includes('makisig')) return formatAssetUrl('assets/npcs/npc_diver_makisig.jpg');
  if (name.includes('alon') || name.includes('cartographer')) return formatAssetUrl('assets/npcs/npc_cartographer_alon.jpg');
  if (name.includes('bulalakaw')) return formatAssetUrl('assets/npcs/npc_bulalakaw.jpg');
  if (name.includes('apolinario')) return formatAssetUrl('assets/npcs/npc_apolinario.jpg');
  if (name.includes('dayang')) return formatAssetUrl('assets/npcs/npc_paladin_dayang.jpg');
  if (name.includes('arch-babaylan') || name.includes('arch_maharlika')) return formatAssetUrl('assets/npcs/npc_arch_maharlika.jpg');
  if (name.includes('bathala')) return formatAssetUrl('assets/npcs/npc_voice_bathala.jpg');
  if (name.includes('mayari')) return formatAssetUrl('assets/npcs/npc_mayari_warden.jpg');
  if (name.includes('arbiter')) return formatAssetUrl('assets/npcs/npc_celestial_arbiter.jpg');

  return formatAssetUrl('assets/heroes/hero_babaylan.jpg');
}

export function getAmbientImageUrl(eventType: string, locationId?: string): string {
  const norm = eventType.toLowerCase();
  const loc = (locationId || '').toLowerCase();

  if (norm.includes('balete') || norm.includes('whisper')) {
    return formatAssetUrl('assets/ambient/ambient_balete_whispers.jpg');
  }
  if (norm.includes('volcanic') || norm.includes('ash')) {
    return formatAssetUrl('assets/ambient/ambient_volcanic_ash.jpg');
  }
  if (norm.includes('war') || norm.includes('drum')) {
    return formatAssetUrl('assets/ambient/ambient_war_drums.jpg');
  }
  if (norm.includes('eagle')) {
    if (loc.includes('act_2')) return formatAssetUrl('assets/ambient/ambient_eagle_lagoon.jpg');
    if (loc.includes('act_3')) return formatAssetUrl('assets/ambient/ambient_eagle_caves.jpg');
    if (loc.includes('act_4')) return formatAssetUrl('assets/ambient/ambient_eagle_caldera.jpg');
    if (loc.includes('act_5')) return formatAssetUrl('assets/ambient/ambient_eagle_blood_coast.jpg');
    if (loc.includes('act_6')) return formatAssetUrl('assets/ambient/ambient_eagle_trench.jpg');
    if (loc.includes('act_7')) return formatAssetUrl('assets/ambient/ambient_eagle_sky_citadel.jpg');
    if (loc.includes('act_8') || loc.includes('infinite') || loc.includes('bathala')) {
      return formatAssetUrl('assets/ambient/ambient_eagle_eclipse.jpg');
    }
    // Default Act 1
    return formatAssetUrl('assets/ambient/ambient_eagle_balete.jpg');
  }
  return formatAssetUrl('assets/ambient/ambient_eagle_balete.jpg');
}

