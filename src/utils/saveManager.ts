// src/utils/saveManager.ts
// Multi-slot Local Storage & Save State Manager for Maharlika: Legends of the Archipelago

import { PlayerCharacter, HeroClass } from '../types/game';
import { calcDerivedStats } from './gameFormulas';
import { GAME_LOCATIONS } from '../data/equipmentData';

export const MAX_SAVE_SLOTS = 3;

export const SLOT_KEY_PREFIX = 'maharlika_save_slot_';
export const ACTIVE_SLOT_KEY = 'maharlika_active_slot_id';
export const SLOTS_META_KEY = 'maharlika_save_slots_meta';
export const LEGACY_SAVE_KEY = 'maharlika_player_save_v1';
export const DEVICE_ID_KEY = 'maharlika_device_uuid';

export interface SaveSlotMeta {
  slotId: number; // 1, 2, 3
  isEmpty: boolean;
  heroName?: string;
  heroClass?: HeroClass;
  level?: number;
  currentActName?: string;
  currentLocationId?: string;
  powerLevel?: number;
  updatedAt?: string; // ISO string
}

/** Generates or retrieves a unique persistent device UUID for Supabase cloud account association */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'device_server';
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return 'dev_fallback';
  }
}

/** Gets the currently selected active slot ID (defaults to 1) */
export function getActiveSlotId(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const raw = localStorage.getItem(ACTIVE_SLOT_KEY);
    const parsed = raw ? parseInt(raw, 10) : 1;
    return parsed >= 1 && parsed <= MAX_SAVE_SLOTS ? parsed : 1;
  } catch {
    return 1;
  }
}

/** Sets the active slot ID */
export function setActiveSlotId(slotId: number): void {
  if (typeof window === 'undefined') return;
  try {
    if (slotId >= 1 && slotId <= MAX_SAVE_SLOTS) {
      localStorage.setItem(ACTIVE_SLOT_KEY, slotId.toString());
    }
  } catch {
    // Ignore storage errors
  }
}

/** Resolves an Act's display name from its location ID */
function getActNameFromLocationId(locationId?: string): string {
  if (!locationId) return 'Act I: The Whispering Balete Forest';
  const found = GAME_LOCATIONS.find((l) => l.id === locationId);
  return found?.name || 'Act I: The Whispering Balete Forest';
}

/** Builds a lightweight metadata descriptor from a PlayerCharacter object */
export function createSlotMetaFromPlayer(slotId: number, player: PlayerCharacter): SaveSlotMeta {
  const derived = calcDerivedStats(player.attributes, player.level, player.equipment);
  return {
    slotId,
    isEmpty: !player.hasCreatedCharacter,
    heroName: player.name || 'Hero',
    heroClass: (player.heroClass || 'Mandirigma') as HeroClass,
    level: player.level || 1,
    currentLocationId: player.currentLocationId || 'loc_act_1',
    currentActName: getActNameFromLocationId(player.currentLocationId),
    powerLevel: derived.powerLevel,
    updatedAt: new Date().toISOString(),
  };
}

/** Reads metadata summary for all 3 save slots */
export function getSaveSlotsMeta(): SaveSlotMeta[] {
  if (typeof window === 'undefined') {
    return [
      { slotId: 1, isEmpty: true },
      { slotId: 2, isEmpty: true },
      { slotId: 3, isEmpty: true },
    ];
  }

  const result: SaveSlotMeta[] = [];

  for (let i = 1; i <= MAX_SAVE_SLOTS; i++) {
    const slotKey = `${SLOT_KEY_PREFIX}${i}`;
    const raw = localStorage.getItem(slotKey);
    if (!raw) {
      result.push({ slotId: i, isEmpty: true });
      continue;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.hasCreatedCharacter) {
        result.push(createSlotMetaFromPlayer(i, parsed));
      } else {
        result.push({ slotId: i, isEmpty: true });
      }
    } catch {
      result.push({ slotId: i, isEmpty: true });
    }
  }

  return result;
}

/** Loads player data from a specific slot */
export function loadGameSlot(slotId: number): PlayerCharacter | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${SLOT_KEY_PREFIX}${slotId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
}

/** Saves player data to a specific slot */
export function saveGameSlot(slotId: number, player: PlayerCharacter): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const slotKey = `${SLOT_KEY_PREFIX}${slotId}`;
    localStorage.setItem(slotKey, JSON.stringify(player));
    // Also update active slot pointer
    localStorage.setItem(ACTIVE_SLOT_KEY, slotId.toString());
    return true;
  } catch {
    return false;
  }
}

/** Deletes a save slot */
export function deleteGameSlot(slotId: number): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.removeItem(`${SLOT_KEY_PREFIX}${slotId}`);
    return true;
  } catch {
    return false;
  }
}

/** Finds the most recently updated slot or the active slot */
export function getMostRecentSlotId(): number | null {
  const metas = getSaveSlotsMeta();
  const occupied = metas.filter((m) => !m.isEmpty && m.updatedAt);
  if (occupied.length === 0) return null;

  occupied.sort((a, b) => {
    const timeA = new Date(a.updatedAt || 0).getTime();
    const timeB = new Date(b.updatedAt || 0).getTime();
    return timeB - timeA;
  });

  return occupied[0]?.slotId ?? null;
}

/** Automatically migrates old legacy single-save (maharlika_player_save_v1) to Slot 1 if Slot 1 is empty */
export function migrateLegacySave(): void {
  if (typeof window === 'undefined') return;
  try {
    const slot1Raw = localStorage.getItem(`${SLOT_KEY_PREFIX}1`);
    if (!slot1Raw) {
      const legacyRaw = localStorage.getItem(LEGACY_SAVE_KEY);
      if (legacyRaw) {
        localStorage.setItem(`${SLOT_KEY_PREFIX}1`, legacyRaw);
        localStorage.setItem(ACTIVE_SLOT_KEY, '1');
      }
    }
  } catch {
    // Ignore migration errors
  }
}
