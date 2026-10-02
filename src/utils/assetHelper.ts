// Utility helper to safely resolve asset URLs with fallbacks for heroes, monsters, bosses, events, and act backgrounds.

export function getHeroImageUrl(heroClass?: string): string {
  const c = (heroClass || 'mandirigma').toLowerCase().trim();
  if (c.includes('mandirigma')) return '/assets/heroes/hero_mandirigma.jpg';
  if (c.includes('bagani')) return '/assets/heroes/hero_bagani.jpg';
  if (c.includes('mangangaso')) return '/assets/heroes/hero_mangangaso.jpg';
  if (c.includes('babaylan')) return '/assets/heroes/hero_babaylan.jpg';
  return '/assets/heroes/hero_mandirigma.jpg';
}

export function getMonsterImageUrl(monsterId?: string, isBoss?: boolean): string {
  if (!monsterId) return '/assets/monsters/m_tiyanak.jpg';
  const cleanId = monsterId.toLowerCase().trim();

  // Boss mapping
  if (isBoss || cleanId.startsWith('boss_')) {
    if (cleanId === 'boss_act_8_raid' || cleanId.includes('raid')) {
      return '/assets/raid/boss_bakunawa_raid_titan.jpg';
    }
    return `/assets/bosses/${cleanId}.jpg`;
  }

  // Regular monster mapping
  return `/assets/monsters/${cleanId}.jpg`;
}

export function getEventImageUrl(eventType: 'TRADER' | 'CURSED_CHEST' | 'SHRINE' | 'CACHE' | 'SURGE' | 'JACKPOT' | 'TRIAL'): string {
  switch (eventType) {
    case 'TRADER':
      return '/assets/events/event_trader.jpg';
    case 'CURSED_CHEST':
      return '/assets/events/event_chest.jpg';
    case 'SHRINE':
      return '/assets/events/event_shrine.jpg';
    case 'CACHE':
      return '/assets/events/event_cache.jpg';
    case 'SURGE':
      return '/assets/events/event_lunar_surge.jpg';
    case 'JACKPOT':
      return '/assets/events/event_raid_jackpot.jpg';
    case 'TRIAL':
      return '/assets/events/event_bathala_trial.jpg';
    default:
      return '/assets/events/event_chest.jpg';
  }
}

export function getLocationBgUrl(locationId?: string): string {
  if (!locationId) return '/assets/backgrounds/act_1_balete.jpg';
  const id = locationId.toLowerCase().trim();

  if (id.includes('act_1')) return '/assets/backgrounds/act_1_balete.jpg';
  if (id.includes('act_2')) return '/assets/backgrounds/act_2_lagoon.jpg';
  if (id.includes('act_3')) return '/assets/backgrounds/act_3_cave.jpg';
  if (id.includes('act_4')) return '/assets/backgrounds/act_4_caldera.jpg';
  if (id.includes('act_5')) return '/assets/backgrounds/act_5_blood_coast.jpg';
  if (id.includes('act_6')) return '/assets/backgrounds/act_6_trench.jpg';
  if (id.includes('act_7')) return '/assets/backgrounds/act_7_sky_citadel.jpg';
  if (id.includes('act_8')) return '/assets/backgrounds/act_8_eclipse_maw.jpg';
  if (id.includes('infinite') || id.includes('bathala')) return '/assets/backgrounds/act_infinite_bathala.jpg';
  if (id.includes('raid')) return '/assets/backgrounds/raid_bakunawa_abyss.jpg';

  return '/assets/backgrounds/act_1_balete.jpg';
}

