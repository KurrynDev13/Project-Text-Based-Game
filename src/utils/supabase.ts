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

/** Fetches recent system GM announcements for the floating ticker bar */
export async function fetchRecentAnnouncements(): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/global_chat?sender=eq.GM&order=created_at.desc&limit=10`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((row: any) => row.message || row.text || '');
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
}

export interface GlobalRaidContribution {
  player_name: string;
  damage_dealt: number;
  battles_count: number;
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
  damageDealt: number
): Promise<{ current_hp: number; status: string } | null> {
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


