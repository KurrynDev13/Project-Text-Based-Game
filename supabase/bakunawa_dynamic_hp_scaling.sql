-- ============================================================================
-- BAKUNAWA GLOBAL RAID: 7-DAY WEEKLY CYCLE & PG_CRON ARCHITECTURE
-- Database Migration & pg_cron Scheduling Script
-- Target Database: Supabase PostgreSQL 15+
-- Schedule Target:
--   1. Weekly Reset: Every Monday 12:00 Midnight Local Time (PHT UTC+8 -> Sunday 16:00 UTC)
--   2. Daily Rally & Attempt Reset: Every Night 12:00 Midnight Local Time (PHT UTC+8 -> Daily 16:00 UTC)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Enable Required PostgreSQL Extensions
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA extensions;

GRANT USAGE ON SCHEMA extensions TO postgres;
GRANT USAGE ON SCHEMA extensions TO service_role;

-- ----------------------------------------------------------------------------
-- STEP 2: Player Activity Logs (7-Day Active Participant Tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_name TEXT NOT NULL,
    character_level INT NOT NULL DEFAULT 1,
    action_type TEXT NOT NULL DEFAULT 'SESSION_HEARTBEAT',
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.player_activity_logs ADD COLUMN IF NOT EXISTS player_name TEXT NOT NULL DEFAULT 'Wayfarer';
ALTER TABLE public.player_activity_logs ADD COLUMN IF NOT EXISTS character_level INT NOT NULL DEFAULT 1;
ALTER TABLE public.player_activity_logs ADD COLUMN IF NOT EXISTS action_type TEXT NOT NULL DEFAULT 'SESSION_HEARTBEAT';
ALTER TABLE public.player_activity_logs ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE public.player_activity_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_player_activity_last_active 
    ON public.player_activity_logs (last_active_at DESC, player_name);

CREATE INDEX IF NOT EXISTS idx_player_activity_dedup 
    ON public.player_activity_logs (player_name, last_active_at DESC);

ALTER TABLE public.player_activity_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_activity_logs' AND policyname = 'Public read player activity') THEN
        CREATE POLICY "Public read player activity" ON public.player_activity_logs FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_activity_logs' AND policyname = 'Public insert player activity') THEN
        CREATE POLICY "Public insert player activity" ON public.player_activity_logs FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Helper RPC: Player Activity Heartbeat
CREATE OR REPLACE FUNCTION public.log_player_activity(
    p_player_name TEXT,
    p_character_level INT DEFAULT 1,
    p_action TEXT DEFAULT 'SESSION_HEARTBEAT'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.player_activity_logs (
        player_name, character_level, action_type, last_active_at
    ) VALUES (
        p_player_name,
        COALESCE(p_character_level, 1),
        COALESCE(p_action, 'SESSION_HEARTBEAT'),
        timezone('utc'::text, now())
    );

    -- Retain 14 days of logs for rolling weekly calculations
    DELETE FROM public.player_activity_logs 
    WHERE last_active_at < timezone('utc'::text, now()) - INTERVAL '14 days';
END;
$$;

-- ----------------------------------------------------------------------------
-- STEP 3: Weekly Global Raid Boss Table (`global_raid_event`)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.global_raid_event (
    id TEXT PRIMARY KEY,
    boss_name TEXT NOT NULL DEFAULT 'Bakunawa',
    boss_title TEXT NOT NULL DEFAULT 'The Great Moon-Devouring Serpent',
    base_hp BIGINT NOT NULL DEFAULT 1500000,                  -- Solo trial floor: 1,500,000 HP
    per_player_contribution BIGINT NOT NULL DEFAULT 1600000,  -- Target weekly contribution (42 attempts * ~38k dmg)
    max_hp BIGINT NOT NULL DEFAULT 1500000,                   -- Locked at Monday Midnight
    current_hp BIGINT NOT NULL DEFAULT 1500000,               -- Remaining health
    rally_modifier NUMERIC(4, 2) NOT NULL DEFAULT 1.00,       -- Mid-week community rally buff (1.00 - 1.50)
    cycle_number INT NOT NULL DEFAULT 1,                      -- Mon-to-Mon cycle counter
    cycle_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    cycle_end_date DATE NOT NULL DEFAULT (CURRENT_DATE + 7),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DEFEATED')),
    active_players_count INT NOT NULL DEFAULT 0,
    total_participants INT NOT NULL DEFAULT 0,
    last_reset_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    next_reset_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure all columns exist on pre-existing table
ALTER TABLE public.global_raid_event ADD COLUMN IF NOT EXISTS boss_name TEXT NOT NULL DEFAULT 'Bakunawa';
ALTER TABLE public.global_raid_event ADD COLUMN IF NOT EXISTS boss_title TEXT NOT NULL DEFAULT 'The Great Moon-Devouring Serpent';
ALTER TABLE public.global_raid_event ADD COLUMN IF NOT EXISTS base_hp BIGINT NOT NULL DEFAULT 1500000;
ALTER TABLE public.global_raid_event ADD COLUMN IF NOT EXISTS per_player_contribution BIGINT NOT NULL DEFAULT 1600000;
ALTER TABLE public.global_raid_event ADD COLUMN IF NOT EXISTS max_hp BIGINT NOT NULL DEFAULT 1500000;
ALTER TABLE public.global_raid_event ADD COLUMN IF NOT EXISTS current_hp BIGINT NOT NULL DEFAULT 1500000;
ALTER TABLE public.global_raid_event ADD COLUMN IF NOT EXISTS rally_modifier NUMERIC(4, 2) NOT NULL DEFAULT 1.00;
ALTER TABLE public.global_raid_event ADD COLUMN IF NOT EXISTS cycle_number INT NOT NULL DEFAULT 1;
ALTER TABLE public.global_raid_event ADD COLUMN IF NOT EXISTS cycle_start_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.global_raid_event ADD COLUMN IF NOT EXISTS cycle_end_date DATE NOT NULL DEFAULT (CURRENT_DATE + 7);
ALTER TABLE public.global_raid_event ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE public.global_raid_event ADD COLUMN IF NOT EXISTS active_players_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.global_raid_event ADD COLUMN IF NOT EXISTS total_participants INT NOT NULL DEFAULT 0;
ALTER TABLE public.global_raid_event ADD COLUMN IF NOT EXISTS last_reset_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE public.global_raid_event ADD COLUMN IF NOT EXISTS next_reset_at TIMESTAMPTZ;
ALTER TABLE public.global_raid_event ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Seed initial Bakunawa Raid Event row
INSERT INTO public.global_raid_event (
    id, boss_name, boss_title, base_hp, per_player_contribution, max_hp, current_hp, rally_modifier, cycle_number, status, active_players_count, total_participants, last_reset_at
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
    'ACTIVE',
    0,
    0,
    timezone('utc'::text, now())
) ON CONFLICT (id) DO UPDATE SET
    base_hp = 1500000,
    per_player_contribution = 1600000;

ALTER TABLE public.global_raid_event ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'global_raid_event' AND policyname = 'Public read raid event') THEN
        CREATE POLICY "Public read raid event" ON public.global_raid_event FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'global_raid_event' AND policyname = 'Public update raid event') THEN
        CREATE POLICY "Public update raid event" ON public.global_raid_event FOR UPDATE USING (true);
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 4: Weekly Contributions, Claims & History Archives
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.global_raid_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL REFERENCES public.global_raid_event(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    damage_dealt BIGINT NOT NULL DEFAULT 0,
    battles_count INT NOT NULL DEFAULT 0,
    daily_battles_count INT NOT NULL DEFAULT 0,
    last_attack_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    cycle_number INT NOT NULL DEFAULT 1,
    cycle_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reward_claimed BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.global_raid_contributions ADD COLUMN IF NOT EXISTS damage_dealt BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.global_raid_contributions ADD COLUMN IF NOT EXISTS battles_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.global_raid_contributions ADD COLUMN IF NOT EXISTS daily_battles_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.global_raid_contributions ADD COLUMN IF NOT EXISTS last_attack_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE public.global_raid_contributions ADD COLUMN IF NOT EXISTS cycle_number INT NOT NULL DEFAULT 1;
ALTER TABLE public.global_raid_contributions ADD COLUMN IF NOT EXISTS cycle_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.global_raid_contributions ADD COLUMN IF NOT EXISTS reward_claimed BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure cycle_date on contributions is safely defaulted
ALTER TABLE public.global_raid_contributions ALTER COLUMN cycle_date DROP NOT NULL;
ALTER TABLE public.global_raid_contributions ALTER COLUMN cycle_date SET DEFAULT CURRENT_DATE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_raid_player_cycle_num 
    ON public.global_raid_contributions (event_id, player_name, cycle_number);

CREATE INDEX IF NOT EXISTS idx_raid_contrib_ranking 
    ON public.global_raid_contributions (event_id, cycle_number, damage_dealt DESC);

ALTER TABLE public.global_raid_contributions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'global_raid_contributions' AND policyname = 'Public read raid contributions') THEN
        CREATE POLICY "Public read raid contributions" ON public.global_raid_contributions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'global_raid_contributions' AND policyname = 'Public insert/update raid contributions') THEN
        CREATE POLICY "Public insert/update raid contributions" ON public.global_raid_contributions FOR ALL USING (true);
    END IF;
END $$;

-- Weekly Jackpot Claims Table
CREATE TABLE IF NOT EXISTS public.global_raid_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL,
    cycle_number INT NOT NULL,
    player_name TEXT NOT NULL,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.global_raid_claims ADD COLUMN IF NOT EXISTS event_id TEXT NOT NULL DEFAULT 'bakunawa_eclipse_raid';
ALTER TABLE public.global_raid_claims ADD COLUMN IF NOT EXISTS cycle_number INT NOT NULL DEFAULT 1;
ALTER TABLE public.global_raid_claims ADD COLUMN IF NOT EXISTS player_name TEXT NOT NULL DEFAULT 'Wayfarer';
ALTER TABLE public.global_raid_claims ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_raid_claim') THEN
        ALTER TABLE public.global_raid_claims ADD CONSTRAINT uq_raid_claim UNIQUE (event_id, cycle_number, player_name);
    END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE public.global_raid_claims ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'global_raid_claims' AND policyname = 'Public read raid claims') THEN
        CREATE POLICY "Public read raid claims" ON public.global_raid_claims FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'global_raid_claims' AND policyname = 'Public insert raid claims') THEN
        CREATE POLICY "Public insert raid claims" ON public.global_raid_claims FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Weekly Archive History Table
CREATE TABLE IF NOT EXISTS public.global_raid_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL,
    cycle_date DATE DEFAULT CURRENT_DATE,
    cycle_number INT NOT NULL DEFAULT 1,
    cycle_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    cycle_end_date DATE NOT NULL DEFAULT (CURRENT_DATE + 7),
    final_hp BIGINT NOT NULL DEFAULT 0,
    max_hp BIGINT NOT NULL DEFAULT 1500000,
    active_players_count INT NOT NULL DEFAULT 0,
    total_participants INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    top_contributor TEXT DEFAULT 'None',
    top_damage BIGINT DEFAULT 0,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- CRITICAL FIX: Ensure all columns exist and remove NOT NULL on legacy cycle_date
ALTER TABLE public.global_raid_history ADD COLUMN IF NOT EXISTS event_id TEXT NOT NULL DEFAULT 'bakunawa_eclipse_raid';
ALTER TABLE public.global_raid_history ADD COLUMN IF NOT EXISTS cycle_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.global_raid_history ADD COLUMN IF NOT EXISTS cycle_number INT NOT NULL DEFAULT 1;
ALTER TABLE public.global_raid_history ADD COLUMN IF NOT EXISTS cycle_start_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.global_raid_history ADD COLUMN IF NOT EXISTS cycle_end_date DATE NOT NULL DEFAULT (CURRENT_DATE + 7);
ALTER TABLE public.global_raid_history ADD COLUMN IF NOT EXISTS final_hp BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.global_raid_history ADD COLUMN IF NOT EXISTS max_hp BIGINT NOT NULL DEFAULT 1500000;
ALTER TABLE public.global_raid_history ADD COLUMN IF NOT EXISTS active_players_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.global_raid_history ADD COLUMN IF NOT EXISTS total_participants INT NOT NULL DEFAULT 0;
ALTER TABLE public.global_raid_history ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE public.global_raid_history ADD COLUMN IF NOT EXISTS top_contributor TEXT DEFAULT 'None';
ALTER TABLE public.global_raid_history ADD COLUMN IF NOT EXISTS top_damage BIGINT DEFAULT 0;
ALTER TABLE public.global_raid_history ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Drop NOT NULL constraint on cycle_date to prevent constraint violations
ALTER TABLE public.global_raid_history ALTER COLUMN cycle_date DROP NOT NULL;
ALTER TABLE public.global_raid_history ALTER COLUMN cycle_date SET DEFAULT CURRENT_DATE;

ALTER TABLE public.global_raid_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'global_raid_history' AND policyname = 'Public read raid history') THEN
        CREATE POLICY "Public read raid history" ON public.global_raid_history FOR SELECT USING (true);
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 5: Core Procedure 1 — Weekly Monday Reset (`reset_weekly_bakunawa_raid`)
-- ----------------------------------------------------------------------------
-- Executes every Monday at 12:00 Midnight Local Time (Sunday 16:00 UTC).
-- Locks Bakunawa's Max HP for the entire 7 days based on preceding 7-day activity.
CREATE OR REPLACE FUNCTION public.reset_weekly_bakunawa_raid()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id CONSTANT TEXT := 'bakunawa_eclipse_raid';
    v_active_players INT := 0;
    v_base_hp BIGINT := 1500000;                  -- Solo trial floor: 1,500,000 HP
    v_target_weekly_quota BIGINT := 1600000;      -- 42 attempts * ~38k dmg/attempt
    v_locked_max_hp BIGINT := 1500000;
    v_prev_cycle INT := 1;
    v_prev_start_date DATE := CURRENT_DATE - 7;
    v_prev_end_date DATE := CURRENT_DATE;
    v_prev_current_hp BIGINT := 1500000;
    v_prev_max_hp BIGINT := 1500000;
    v_prev_active_players INT := 0;
    v_prev_total_participants INT := 0;
    v_prev_status TEXT := 'ACTIVE';
    v_new_cycle INT := 2;
    v_top_slayer RECORD;
    v_announcement_text TEXT;
BEGIN
    -- 1. Fetch previous cycle info into explicit variables to prevent record field mismatches
    SELECT 
        COALESCE(cycle_number, 1),
        COALESCE(cycle_start_date, CURRENT_DATE - 7),
        COALESCE(cycle_end_date, CURRENT_DATE),
        COALESCE(current_hp, 1500000),
        COALESCE(max_hp, 1500000),
        COALESCE(active_players_count, 0),
        COALESCE(total_participants, 0),
        COALESCE(status, 'ACTIVE'),
        COALESCE(base_hp, 1500000),
        COALESCE(per_player_contribution, 1600000)
    INTO
        v_prev_cycle,
        v_prev_start_date,
        v_prev_end_date,
        v_prev_current_hp,
        v_prev_max_hp,
        v_prev_active_players,
        v_prev_total_participants,
        v_prev_status,
        v_base_hp,
        v_target_weekly_quota
    FROM public.global_raid_event
    WHERE id = v_event_id;

    IF FOUND THEN
        v_new_cycle := v_prev_cycle + 1;

        -- Fetch top contributor of concluding week
        SELECT player_name, damage_dealt INTO v_top_slayer
        FROM public.global_raid_contributions
        WHERE event_id = v_event_id AND cycle_number = v_prev_cycle
        ORDER BY damage_dealt DESC
        LIMIT 1;

        -- Archive concluded weekly cycle into global_raid_history (including cycle_date)
        INSERT INTO public.global_raid_history (
            event_id, cycle_date, cycle_number, cycle_start_date, cycle_end_date, final_hp, max_hp,
            active_players_count, total_participants, status, top_contributor, top_damage, archived_at
        ) VALUES (
            v_event_id, CURRENT_DATE, v_prev_cycle, v_prev_start_date, v_prev_end_date,
            v_prev_current_hp, v_prev_max_hp, v_prev_active_players,
            v_prev_total_participants, v_prev_status,
            COALESCE(v_top_slayer.player_name, 'None'), COALESCE(v_top_slayer.damage_dealt, 0),
            timezone('utc'::text, now())
        );
    END IF;

    -- 2. Count distinct active players over the past 7 days
    SELECT COUNT(DISTINCT player_name)
    INTO v_active_players
    FROM public.player_activity_logs
    WHERE last_active_at >= (timezone('utc'::text, now()) - INTERVAL '7 days');

    v_active_players := GREATEST(0, COALESCE(v_active_players, 0));

    -- 3. Weekly Locked HP Formula:
    -- Base HP Floor (1.5M) + (Active Players * 1.6M Target Weekly Damage)
    -- Guarded between 1.5M (Solo Trial Floor) and 1,000,000,000 HP (Safety Ceiling)
    IF v_active_players <= 1 THEN
        v_locked_max_hp := v_base_hp;
    ELSE
        v_locked_max_hp := LEAST(1000000000::BIGINT, v_base_hp + ((v_active_players - 1)::BIGINT * v_target_weekly_quota));
    END IF;

    -- 4. Lock Bakunawa's HP for the entire week
    UPDATE public.global_raid_event
    SET
        max_hp = v_locked_max_hp,
        current_hp = v_locked_max_hp,
        rally_modifier = 1.00,
        cycle_number = v_new_cycle,
        cycle_start_date = CURRENT_DATE,
        cycle_end_date = CURRENT_DATE + 7,
        status = 'ACTIVE',
        active_players_count = v_active_players,
        total_participants = 0,
        last_reset_at = timezone('utc'::text, now()),
        next_reset_at = timezone('utc'::text, now()) + INTERVAL '7 days',
        updated_at = timezone('utc'::text, now())
    WHERE id = v_event_id;

    -- 5. Broadcast Monday Weekly Reset Announcement
    v_announcement_text := '📢 Announcement! 🌕 Maharlika! The blood moon rises once again! Bakunawa has descended for the 7-day celestial siege! Defend the seven moons!';

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'global_chat') THEN
        INSERT INTO public.global_chat (sender, message, created_at)
        VALUES ('GM', v_announcement_text, timezone('utc'::text, now()));
    END IF;

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'cycle_number', v_new_cycle,
        'active_players_7d', v_active_players,
        'locked_max_hp', v_locked_max_hp,
        'cycle_start', CURRENT_DATE,
        'cycle_end', CURRENT_DATE + 7
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- STEP 6: Core Procedure 2 — Daily Midnight Rally & Attempt Reset
-- ----------------------------------------------------------------------------
-- Executes every night at 12:00 Midnight Local Time (Daily 16:00 UTC).
-- Evaluates community lagging pace and applies a server rally damage modifier (1.00 - 1.50).
-- Resets daily attempt counters for all participants.
CREATE OR REPLACE FUNCTION public.evaluate_daily_raid_rally_and_reset_attempts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id CONSTANT TEXT := 'bakunawa_eclipse_raid';
    v_status TEXT := 'ACTIVE';
    v_max_hp BIGINT := 1500000;
    v_current_hp BIGINT := 1500000;
    v_cycle_start DATE := CURRENT_DATE;
    v_days_elapsed INT := 1;
    v_target_ratio NUMERIC := 0.14;
    v_actual_ratio NUMERIC := 0.00;
    v_progress_deficit NUMERIC := 0.00;
    v_rally_modifier NUMERIC(4, 2) := 1.00;
    v_announcement_text TEXT;
BEGIN
    SELECT 
        COALESCE(status, 'ACTIVE'),
        COALESCE(max_hp, 1500000),
        COALESCE(current_hp, 1500000),
        COALESCE(cycle_start_date, CURRENT_DATE)
    INTO 
        v_status,
        v_max_hp,
        v_current_hp,
        v_cycle_start
    FROM public.global_raid_event
    WHERE id = v_event_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Raid event % not found', v_event_id;
    END IF;

    -- Reset daily attempt counters for all players in current cycle
    UPDATE public.global_raid_contributions
    SET daily_battles_count = 0
    WHERE event_id = v_event_id;

    -- Only evaluate rally if boss is still ACTIVE
    IF v_status = 'ACTIVE' AND v_max_hp > 0 THEN
        v_days_elapsed := GREATEST(1, LEAST(7, (CURRENT_DATE - v_cycle_start) + 1));
        v_target_ratio := v_days_elapsed::NUMERIC / 7.0;
        v_actual_ratio := (v_max_hp - v_current_hp)::NUMERIC / v_max_hp::NUMERIC;
        v_progress_deficit := GREATEST(0.0, v_target_ratio - v_actual_ratio);

        -- Calculate Server Rally Damage Modifier
        IF v_progress_deficit > 0.25 THEN
            v_rally_modifier := 1.50; -- +50% Ancestral Awakening
        ELSIF v_progress_deficit > 0.15 THEN
            v_rally_modifier := 1.30; -- +30% Tribal Warhorns
        ELSIF v_progress_deficit > 0.05 THEN
            v_rally_modifier := 1.15; -- +15% Community Rally Boost
        ELSE
            v_rally_modifier := 1.00; -- On track
        END IF;

        UPDATE public.global_raid_event
        SET 
            rally_modifier = v_rally_modifier,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_event_id;

        IF v_rally_modifier > 1.00 THEN
            v_announcement_text := format(
                '📢 Announcement! 🔥 [COMMUNITY RALLY ACTIVATED] Bakunawa resists! Tribal shamans invoke Ancestral Spirits! Server-wide Raid Damage is boosted by +%s%%!',
                ROUND((v_rally_modifier - 1.00) * 100)
            );
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'global_chat') THEN
                INSERT INTO public.global_chat (sender, message, created_at)
                VALUES ('GM', v_announcement_text, timezone('utc'::text, now()));
            END IF;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'days_elapsed', v_days_elapsed,
        'target_progress_percent', ROUND(v_target_ratio * 100, 1),
        'actual_progress_percent', ROUND(v_actual_ratio * 100, 1),
        'deficit_percent', ROUND(v_progress_deficit * 100, 1),
        'rally_modifier', v_rally_modifier,
        'daily_attempts_reset', true
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- STEP 7: Core Procedure 3 — Submit Raid Damage & Track Attempts
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deal_global_raid_damage(
    p_event_id TEXT,
    p_player_name TEXT,
    p_damage BIGINT,
    p_is_surge_window BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event RECORD;
    v_contrib RECORD;
    v_effective_dmg BIGINT;
    v_new_hp BIGINT;
    v_new_status TEXT;
    v_surge_multiplier NUMERIC := 1.00;
    v_max_daily_attempts CONSTANT INT := 6;
BEGIN
    SELECT * INTO v_event
    FROM public.global_raid_event
    WHERE id = p_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event % not found', p_event_id;
    END IF;

    IF v_event.status = 'DEFEATED' THEN
        RETURN jsonb_build_object(
            'status', 'DEFEATED',
            'current_hp', 0,
            'max_hp', v_event.max_hp,
            'message', 'Bakunawa has already been banished for this weekly cycle!'
        );
    END IF;

    -- Check daily attempt limit (6 battles/day)
    SELECT * INTO v_contrib
    FROM public.global_raid_contributions
    WHERE event_id = p_event_id AND player_name = p_player_name AND cycle_number = v_event.cycle_number;

    IF FOUND AND v_contrib.daily_battles_count >= v_max_daily_attempts THEN
        RAISE EXCEPTION 'Daily battle limit reached (6/6 attempts used today). Resets at midnight.';
    END IF;

    -- Apply Rush-Hour Surge multiplier (+20%) and Server Rally multiplier
    IF p_is_surge_window THEN
        v_surge_multiplier := 1.20;
    END IF;

    v_effective_dmg := ROUND(p_damage * v_surge_multiplier * COALESCE(v_event.rally_modifier, 1.00));
    v_new_hp := GREATEST(0, v_event.current_hp - v_effective_dmg);
    v_new_status := CASE WHEN v_new_hp <= 0 THEN 'DEFEATED' ELSE 'ACTIVE' END;

    -- Update boss health
    UPDATE public.global_raid_event
    SET
        current_hp = v_new_hp,
        status = v_new_status,
        total_participants = CASE 
            WHEN NOT FOUND OR v_contrib IS NULL THEN v_event.total_participants + 1 
            ELSE v_event.total_participants 
        END,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_event_id;

    -- Upsert player's contribution
    INSERT INTO public.global_raid_contributions (
        event_id, player_name, damage_dealt, battles_count, daily_battles_count, last_attack_at, cycle_number, cycle_date
    ) VALUES (
        p_event_id, p_player_name, v_effective_dmg, 1, 1, timezone('utc'::text, now()), v_event.cycle_number, CURRENT_DATE
    )
    ON CONFLICT (event_id, player_name, cycle_number)
    DO UPDATE SET
        damage_dealt = global_raid_contributions.damage_dealt + EXCLUDED.damage_dealt,
        battles_count = global_raid_contributions.battles_count + 1,
        daily_battles_count = global_raid_contributions.daily_battles_count + 1,
        last_attack_at = EXCLUDED.last_attack_at;

    PERFORM public.log_player_activity(p_player_name, 55, 'RAID_ATTEMPT');

    -- Victory broadcast
    IF v_event.status = 'ACTIVE' AND v_new_status = 'DEFEATED' THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'global_chat') THEN
            INSERT INTO public.global_chat (sender, message, created_at)
            VALUES (
                'GM',
                format('🏆 Announcement! 🌕 [BAKUNAWA BANISHED!] The great moon serpent has fallen! %s struck the decisive finishing blow! All participants may now claim the Weekly Victory Jackpot at the Raid Dispatch!', p_player_name),
                timezone('utc'::text, now())
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'current_hp', v_new_hp,
        'max_hp', v_event.max_hp,
        'effective_damage', v_effective_dmg,
        'status', v_new_status,
        'rally_modifier', v_event.rally_modifier,
        'surge_active', p_is_surge_window
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- STEP 8: Core Procedure 4 — Weekly Victory Jackpot Claim
-- ----------------------------------------------------------------------------
-- Distributes substantial Gold/Silver, bulk Mutya, massive EXP, and RED Encrypted Memory
-- to all players who logged at least 1 valid attempt during the winning week.
CREATE OR REPLACE FUNCTION public.claim_weekly_raid_jackpot(
    p_event_id TEXT,
    p_player_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event RECORD;
    v_contrib RECORD;
    v_already_claimed BOOLEAN := FALSE;
BEGIN
    SELECT * INTO v_event
    FROM public.global_raid_event
    WHERE id = p_event_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event % not found', p_event_id;
    END IF;

    IF v_event.status != 'DEFEATED' THEN
        RAISE EXCEPTION 'Bakunawa has not been defeated yet! Continue the celestial fight!';
    END IF;

    -- Verify player participation in current cycle
    SELECT * INTO v_contrib
    FROM public.global_raid_contributions
    WHERE event_id = p_event_id AND player_name = p_player_name AND cycle_number = v_event.cycle_number;

    IF NOT FOUND OR v_contrib.battles_count < 1 THEN
        RAISE EXCEPTION 'No recorded raid participation for this weekly cycle. Must battle at least once to qualify for the jackpot!';
    END IF;

    -- Check if already claimed
    SELECT EXISTS (
        SELECT 1 FROM public.global_raid_claims 
        WHERE event_id = p_event_id AND cycle_number = v_event.cycle_number AND player_name = p_player_name
    ) INTO v_already_claimed;

    IF v_already_claimed THEN
        RAISE EXCEPTION 'Weekly victory jackpot has already been claimed for Cycle %!', v_event.cycle_number;
    END IF;

    -- Record claim
    INSERT INTO public.global_raid_claims (
        event_id, cycle_number, player_name, claimed_at
    ) VALUES (
        p_event_id, v_event.cycle_number, p_player_name, timezone('utc'::text, now())
    );

    UPDATE public.global_raid_contributions
    SET reward_claimed = TRUE
    WHERE event_id = p_event_id AND cycle_number = v_event.cycle_number AND player_name = p_player_name;

    -- Return full economy jackpot payload
    RETURN jsonb_build_object(
        'status', 'CLAIMED',
        'cycle_number', v_event.cycle_number,
        'player_name', p_player_name,
        'gold_ingots', 3,            -- 3 Gold Ingots = 30,000 Cowrie Shells
        'silver_pieces', 40,         -- 40 Silver Pieces = 4,000 Cowrie Shells
        'cowrie_shells', 5000,       -- 5,000 Base Cowries (Total CC equivalent = 39,000 CC)
        'mutya_shards', 20,          -- Bulk 20 Mutya Shards for affix blessing & skills
        'exp_reward', 35000,         -- Massive 35,000 Character EXP
        'encrypted_memory_rarity', 'RED', -- High-tier Mythic RED Memory
        'memory_min_level', 50
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- STEP 9: pg_cron Automated Scheduling
-- ----------------------------------------------------------------------------
-- 1. Weekly Reset: Every Monday at 00:00 PHT (UTC+8) -> Sunday 16:00 UTC ('0 16 * * 0')
SELECT cron.unschedule('weekly-bakunawa-reset')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-bakunawa-reset');

SELECT cron.schedule(
    'weekly-bakunawa-reset',
    '0 16 * * 0',
    $$SELECT public.reset_weekly_bakunawa_raid();$$
);

-- 2. Daily Rally & Attempt Reset: Every Night at 00:00 PHT (UTC+8) -> Daily 16:00 UTC ('0 16 * * *')
SELECT cron.unschedule('daily-bakunawa-rally-reset')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-bakunawa-rally-reset');

SELECT cron.schedule(
    'daily-bakunawa-rally-reset',
    '0 16 * * *',
    $$SELECT public.evaluate_daily_raid_rally_and_reset_attempts();$$
);

-- Remove legacy single-purpose job if exists
SELECT cron.unschedule('daily-bakunawa-hp-reset')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-bakunawa-hp-reset');

