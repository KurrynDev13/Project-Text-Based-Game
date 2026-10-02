-- ============================================================================
-- BAKUNAWA GLOBAL RAID: COMPLETE DATA RESET (START FRESH)
-- ============================================================================
-- Run this script in the Supabase SQL Editor to wipe raid battle contributions,
-- claims, and history, resetting Bakunawa to a fresh Cycle 1 state.

BEGIN;

-- 1. Truncate contributions, claims, and history
TRUNCATE TABLE public.global_raid_contributions CASCADE;
TRUNCATE TABLE public.global_raid_claims CASCADE;
TRUNCATE TABLE public.global_raid_history CASCADE;

-- 2. Optional: Clean up activity logs so active player counts start fresh
TRUNCATE TABLE public.player_activity_logs CASCADE;

-- 3. Reset the primary Global Raid Event record to pristine Cycle 1 state
UPDATE public.global_raid_event
SET
    boss_name = 'Bakunawa',
    boss_title = 'The Great Moon-Devouring Serpent',
    base_hp = 1500000,
    per_player_contribution = 1600000,
    max_hp = 1500000,
    current_hp = 1500000,
    rally_modifier = 1.00,
    cycle_number = 1,
    cycle_start_date = CURRENT_DATE,
    cycle_end_date = CURRENT_DATE + 7,
    status = 'ACTIVE',
    active_players_count = 0,
    total_participants = 0,
    last_reset_at = timezone('utc'::text, now()),
    next_reset_at = timezone('utc'::text, now()) + INTERVAL '7 days',
    updated_at = timezone('utc'::text, now())
WHERE id = 'bakunawa_eclipse_raid';

-- If no row existed, insert it fresh
INSERT INTO public.global_raid_event (
    id, boss_name, boss_title, base_hp, per_player_contribution,
    max_hp, current_hp, rally_modifier, cycle_number,
    cycle_start_date, cycle_end_date, status, active_players_count,
    total_participants, last_reset_at, next_reset_at, updated_at
) VALUES (
    'bakunawa_eclipse_raid',
    'Bakunawa',
    'The Great Moon-Devouring Serpent',
    1500000,
    1600000,
    1500000,
    1500000,
    1.00,
    1,
    CURRENT_DATE,
    CURRENT_DATE + 7,
    'ACTIVE',
    0,
    0,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()) + INTERVAL '7 days',
    timezone('utc'::text, now())
)
ON CONFLICT (id) DO UPDATE SET
    max_hp = 1500000,
    current_hp = 1500000,
    rally_modifier = 1.00,
    cycle_number = 1,
    cycle_start_date = CURRENT_DATE,
    cycle_end_date = CURRENT_DATE + 7,
    status = 'ACTIVE',
    active_players_count = 0,
    total_participants = 0,
    last_reset_at = timezone('utc'::text, now()),
    next_reset_at = timezone('utc'::text, now()) + INTERVAL '7 days',
    updated_at = timezone('utc'::text, now());

-- 4. Clean up any prior raid announcement messages in global_chat if desired
DELETE FROM public.global_chat 
WHERE sender = 'GM' AND (message LIKE '%Bakunawa%' OR message LIKE '%BAKUNAWA%' OR message LIKE '%Maharlika%');

-- 5. Broadcast fresh event announcement
INSERT INTO public.global_chat (sender, message, created_at)
VALUES (
    'GM',
    '📢 Announcement! 🌕 Maharlika! The blood moon rises once again! Bakunawa has descended for the 7-day celestial siege! Defend the seven moons!',
    timezone('utc'::text, now())
);

COMMIT;

-- Verify reset status:
SELECT id, status, current_hp, max_hp, rally_modifier, cycle_number, active_players_count
FROM public.global_raid_event
WHERE id = 'bakunawa_eclipse_raid';

