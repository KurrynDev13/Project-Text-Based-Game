// src/utils/supabase.ts
// Supabase Client Helper for Free Cloud Database (Global Chat, GM System Broadcasts & Cloud Saves)

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export interface ChatMessage {
  sender: string;
  text: string;
  time: string;
  isAnnouncement?: boolean;
}

// Local in-memory event emitter for immediate client announcement broadcast
type AnnouncementListener = (announcementText: string) => void;
const announcementListeners: AnnouncementListener[] = [];

export function subscribeLocalAnnouncements(listener: AnnouncementListener) {
  announcementListeners.push(listener);
  return () => {
    const idx = announcementListeners.indexOf(listener);
    if (idx >= 0) announcementListeners.splice(idx, 1);
  };
}

export function triggerLocalAnnouncement(text: string) {
  announcementListeners.forEach((l) => l(text));
}

export async function fetchGlobalChatMessages(): Promise<ChatMessage[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/global_chat?select=*&order=created_at.desc&limit=50`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.reverse().map((row: any) => ({
      sender: row.sender || 'Wayfarer',
      text: row.message || row.text || '',
      time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAnnouncement: row.sender === 'GM' || (row.message || '').startsWith('📢 GM:'),
    }));
  } catch {
    return null;
  }
}

export async function sendGlobalChatMessage(sender: string, text: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/global_chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        sender,
        message: text,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Broadcasts a system GM announcement to Supabase global_chat and triggers local ticker listeners */
export async function broadcastSystemAnnouncement(text: string): Promise<boolean> {
  const formattedText = text.startsWith('📢 GM:') ? text : `📢 GM: ${text}`;
  triggerLocalAnnouncement(formattedText);
  if (isSupabaseConfigured) {
    return sendGlobalChatMessage('GM', formattedText);
  }
  return true;
}

/** Fetches recent system GM announcements for the floating ticker bar (Only today's announcements) */
export async function fetchRecentAnnouncements(): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();
    const res = await fetch(`${supabaseUrl}/rest/v1/global_chat?sender=eq.GM&created_at=gte.${encodeURIComponent(todayIso)}&order=created_at.desc&limit=10`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data
      .filter((row: any) => {
        if (!row.created_at) return true;
        const msgDate = new Date(row.created_at);
        const now = new Date();
        return (
          msgDate.getFullYear() === now.getFullYear() &&
          msgDate.getMonth() === now.getMonth() &&
          msgDate.getDate() === now.getDate()
        );
      })
      .map((row: any) => row.message || row.text || '');
  } catch {
    return [];
  }
}

export interface GlobalRaidEventData {
  id: string;
  boss_name: string;
  boss_title: string;
  current_hp: number;
  max_hp: number;
  status: 'ACTIVE' | 'DEFEATED';
  total_participants: number;
  base_hp?: number;
  per_player_contribution?: number;
  active_players_count?: number;
  rally_modifier?: number;
  cycle_number?: number;
  cycle_start_date?: string;
  cycle_end_date?: string;
  last_reset_at?: string;
  next_reset_at?: string;
}

export interface GlobalRaidContribution {
  player_name: string;
  damage_dealt: number;
  battles_count: number;
  daily_battles_count?: number;
  cycle_number?: number;
  reward_claimed?: boolean;
}

export interface WeeklyJackpotPayload {
  status: string;
  cycle_number: number;
  player_name: string;
  gold_ingots: number;
  silver_pieces: number;
  cowrie_shells: number;
  mutya_shards: number;
  exp_reward: number;
  encrypted_memory_rarity: string;
  memory_min_level: number;
}

/** Records player activity heartbeat in Supabase to factor into rolling weekly participation */
export async function recordPlayerActivity(
  playerName: string,
  level: number = 1,
  action: string = 'SESSION_HEARTBEAT'
): Promise<boolean> {
  if (!isSupabaseConfigured || !playerName) return false;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/log_player_activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        p_player_name: playerName,
        p_character_level: level,
        p_action: action,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchGlobalRaidEvent(eventId: string = 'bakunawa_eclipse_raid'): Promise<GlobalRaidEventData | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/global_raid_event?id=eq.${eventId}&select=*`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data[0] || null;
  } catch {
    return null;
  }
}

export async function submitGlobalRaidDamage(
  eventId: string,
  playerName: string,
  damageDealt: number,
  isSurgeWindow: boolean = false
): Promise<{ current_hp: number; status: string; effective_damage?: number; rally_modifier?: number } | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/deal_global_raid_damage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        p_event_id: eventId,
        p_player_name: playerName,
        p_damage: damageDealt,
        p_is_surge_window: isSurgeWindow,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

export async function fetchGlobalRaidLeaderboard(eventId: string = 'bakunawa_eclipse_raid'): Promise<GlobalRaidContribution[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/global_raid_contributions?event_id=eq.${eventId}&order=damage_dealt.desc&limit=10`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data;
  } catch {
    return [];
  }
}

/** Checks whether a player has already claimed the weekly victory jackpot for the current cycle */
export async function checkWeeklyJackpotClaimed(
  eventId: string = 'bakunawa_eclipse_raid',
  cycleNumber: number,
  playerName: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !playerName) return false;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/global_raid_claims?event_id=eq.${eventId}&cycle_number=eq.${cycleNumber}&player_name=eq.${encodeURIComponent(playerName)}&select=id`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      }
    );
    if (!res.ok) return false;
    const data = await res.json();
    return data.length > 0;
  } catch {
    return false;
  }
}

/** Claims the weekly Bakunawa Victory Jackpot via atomic Supabase RPC */
export async function claimWeeklyJackpot(
  eventId: string = 'bakunawa_eclipse_raid',
  playerName: string
): Promise<WeeklyJackpotPayload | null> {
  if (!isSupabaseConfigured || !playerName) return null;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/claim_weekly_raid_jackpot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        p_event_id: eventId,
        p_player_name: playerName,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

// ============================================================================
// CLOUD SAVE BACKUP ENGINE (Supabase Multi-Slot Synchronization)
// ============================================================================

export interface CloudSlotSummary {
  slot_id: number;
  hero_name: string;
  hero_class: string;
  character_level: number;
  current_act_name?: string;
  power_level?: number;
  updated_at: string;
}

/**
 * Uploads a character save slot to Supabase cloud backup table `player_cloud_saves`.
 */
export async function uploadCloudSave(
  deviceId: string,
  slotId: number,
  playerData: any,
  heroName: string,
  heroClass: string,
  level: number,
  currentActName?: string,
  powerLevel?: number
): Promise<boolean> {
  if (!isSupabaseConfigured || !deviceId) return false;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/player_cloud_saves`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        device_id: deviceId,
        slot_id: slotId,
        hero_name: heroName,
        hero_class: heroClass,
        character_level: level,
        current_act_name: currentActName || 'Act I',
        power_level: powerLevel || 0,
        save_data: playerData,
        updated_at: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Fetches cloud save slot summaries for the device */
export async function fetchCloudSaveSummaries(deviceId: string): Promise<CloudSlotSummary[]> {
  if (!isSupabaseConfigured || !deviceId) return [];
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/player_cloud_saves?device_id=eq.${encodeURIComponent(deviceId)}&select=slot_id,hero_name,hero_class,character_level,current_act_name,power_level,updated_at&order=slot_id.asc`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data || [];
  } catch {
    return [];
  }
}

/** Downloads complete save data for a slot from Supabase */
export async function downloadCloudSave(deviceId: string, slotId: number): Promise<any | null> {
  if (!isSupabaseConfigured || !deviceId) return null;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/player_cloud_saves?device_id=eq.${encodeURIComponent(deviceId)}&slot_id=eq.${slotId}&select=save_data`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data && data[0] ? data[0].save_data : null;
  } catch {
    return null;
  }
}
