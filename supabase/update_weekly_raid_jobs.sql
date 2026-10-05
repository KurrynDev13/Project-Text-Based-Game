-- ============================================================================
-- BAKUNAWA GLOBAL RAID: UPDATED WEEKLY & DAILY CRON JOBS
-- ============================================================================
-- Changes:
-- 1. Weekly raid cycle will only be set if at least 1 player has reached Level 40
--    (the Raid Event unlock level). Otherwise, status is set to 'DORMANT'.
-- 2. Bonus damage (rally modifier) evaluation runs ONLY AFTER the first full day
--    of the weekly cycle finishes (i.e., starts Monday, evaluated Tuesday midnight).
-- 3. If a small amount of players damaged the boss (<= 1 player -> +50%,
--    <= 3 players -> +30%, <= 5 players -> +15%), bonus damage is activated.
-- ============================================================================

-- 1. Update status constraint to permit 'DORMANT' status
DO $$ BEGIN
    ALTER TABLE public.global_raid_event DROP CONSTRAINT IF EXISTS global_raid_event_status_check;
    ALTER TABLE public.global_raid_event ADD CONSTRAINT global_raid_event_status_check 
        CHECK (status IN ('ACTIVE', 'DEFEATED', 'DORMANT'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- 2. Core Procedure 1: Weekly Reset (Runs Monday Midnight / Sunday 16:00 UTC)
CREATE OR REPLACE FUNCTION public.reset_weekly_bakunawa_raid()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id CONSTANT TEXT := 'bakunawa_eclipse_raid';
    v_raid_unlock_level CONSTANT INT := 40;       -- Level that unlocks the Raid Event
    v_eligible_players INT := 0;
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
    -- [GATE] Check if at least 1 player has reached Level 40 (Raid Unlock Level)
    SELECT COUNT(DISTINCT player_name)
    INTO v_eligible_players
    FROM public.player_activity_logs
    WHERE character_level >= v_raid_unlock_level;

    IF COALESCE(v_eligible_players, 0) < 1 THEN
        -- No players have unlocked the raid yet. Set status to DORMANT and skip cycle start.
        UPDATE public.global_raid_event
        SET
            status = 'DORMANT',
            rally_modifier = 1.00,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_event_id;

        RETURN jsonb_build_object(
            'status', 'SKIPPED',
            'reason', 'NO_ELIGIBLE_PLAYERS',
            'message', 'Weekly raid was not set: Requires at least 1 player at or above Raid unlock level (Level 40+).',
            'eligible_players_count', 0
        );
    END IF;

    -- Fetch previous cycle info for archiving
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

    IF FOUND AND v_prev_status != 'DORMANT' THEN
        v_new_cycle := v_prev_cycle + 1;

        -- Fetch top contributor of concluding week
        SELECT player_name, damage_dealt INTO v_top_slayer
        FROM public.global_raid_contributions
        WHERE event_id = v_event_id AND cycle_number = v_prev_cycle
        ORDER BY damage_dealt DESC
        LIMIT 1;

        -- Archive concluded weekly cycle into global_raid_history
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

    -- Count distinct active players at Level 40+ over the past 7 days
    SELECT COUNT(DISTINCT player_name)
    INTO v_active_players
    FROM public.player_activity_logs
    WHERE character_level >= v_raid_unlock_level
      AND last_active_at >= (timezone('utc'::text, now()) - INTERVAL '7 days');

    v_active_players := GREATEST(1, COALESCE(v_active_players, 1));

    -- Weekly Locked HP Formula:
    IF v_active_players <= 1 THEN
        v_locked_max_hp := v_base_hp;
    ELSE
        v_locked_max_hp := LEAST(1000000000::BIGINT, v_base_hp + ((v_active_players - 1)::BIGINT * v_target_weekly_quota));
    END IF;

    -- Set Bakunawa to ACTIVE with locked HP pool
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

    -- Broadcast Monday Weekly Reset Announcement
    v_announcement_text := '📢 Announcement! 🌕 Maharlika! The blood moon rises once again! Bakunawa has descended for the 7-day celestial siege! Defend the seven moons!';

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'global_chat') THEN
        INSERT INTO public.global_chat (sender, message, created_at)
        VALUES ('GM', v_announcement_text, timezone('utc'::text, now()));
    END IF;

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'cycle_number', v_new_cycle,
        'eligible_players_total', v_eligible_players,
        'active_players_7d', v_active_players,
        'locked_max_hp', v_locked_max_hp,
        'cycle_start', CURRENT_DATE,
        'cycle_end', CURRENT_DATE + 7
    );
END;
$$;

-- 3. Core Procedure 2: Daily Midnight Rally & Attempt Reset (Runs Daily Midnight / 16:00 UTC)
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
    v_cycle_number INT := 1;
    v_cycle_start DATE := CURRENT_DATE;
    v_days_elapsed INT := 0;
    v_target_ratio NUMERIC := 0.14;
    v_actual_ratio NUMERIC := 0.00;
    v_progress_deficit NUMERIC := 0.00;
    v_rally_modifier NUMERIC(4, 2) := 1.00;
    v_players_damaged_count INT := 0;
    v_announcement_text TEXT;
BEGIN
    SELECT 
        COALESCE(status, 'ACTIVE'),
        COALESCE(max_hp, 1500000),
        COALESCE(current_hp, 1500000),
        COALESCE(cycle_number, 1),
        COALESCE(cycle_start_date, CURRENT_DATE)
    INTO 
        v_status,
        v_max_hp,
        v_current_hp,
        v_cycle_number,
        v_cycle_start
    FROM public.global_raid_event
    WHERE id = v_event_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Raid event % not found', v_event_id;
    END IF;

    -- Always reset daily battle attempts (6/day)
    UPDATE public.global_raid_contributions
    SET daily_battles_count = 0
    WHERE event_id = v_event_id;

    -- If raid is not active, return early
    IF v_status != 'ACTIVE' OR v_max_hp <= 0 THEN
        RETURN jsonb_build_object(
            'status', v_status,
            'message', 'Raid is not active. Daily battle attempts reset.',
            'daily_attempts_reset', true
        );
    END IF;

    -- [GATE] Day-Elapsed Check:
    -- Bonus damage is evaluated ONLY AFTER the first full day finishes.
    -- Monday (cycle start): CURRENT_DATE - cycle_start_date = 0 (Day 1 in progress).
    -- Tuesday Midnight: CURRENT_DATE - cycle_start_date >= 1 (First day finished).
    v_days_elapsed := (CURRENT_DATE - v_cycle_start);

    IF v_days_elapsed < 1 THEN
        RETURN jsonb_build_object(
            'status', 'SUCCESS',
            'phase', 'DAY_1_IN_PROGRESS',
            'message', 'First day of weekly raid cycle is in progress. Bonus damage check will occur Tuesday midnight after Day 1 concludes.',
            'days_elapsed', v_days_elapsed,
            'daily_attempts_reset', true,
            'rally_modifier', 1.00
        );
    END IF;

    -- Day 1 is finished: Count how many unique players have damaged the boss in this cycle
    SELECT COUNT(DISTINCT player_name)
    INTO v_players_damaged_count
    FROM public.global_raid_contributions
    WHERE event_id = v_event_id
      AND cycle_number = v_cycle_number
      AND damage_dealt > 0;

    v_players_damaged_count := COALESCE(v_players_damaged_count, 0);

    -- Calculate expected vs actual damage pace
    v_target_ratio := LEAST(1.0, (v_days_elapsed + 1)::NUMERIC / 7.0);
    v_actual_ratio := (v_max_hp - v_current_hp)::NUMERIC / v_max_hp::NUMERIC;
    v_progress_deficit := GREATEST(0.0, v_target_ratio - v_actual_ratio);

    -- Calculate Server Bonus Damage (Rally Modifier):
    IF v_players_damaged_count <= 1 THEN
        v_rally_modifier := 1.50; -- +50% Ancestral Awakening (Only 1 or 0 warriors attacking)
    ELSIF v_players_damaged_count <= 3 THEN
        v_rally_modifier := 1.30; -- +30% Tribal Warhorns (Small strike team of 2-3 players)
    ELSIF v_players_damaged_count <= 5 OR v_progress_deficit > 0.05 THEN
        v_rally_modifier := 1.15; -- +15% Community Rally Boost
    ELSE
        IF v_progress_deficit > 0.25 THEN
            v_rally_modifier := 1.50;
        ELSIF v_progress_deficit > 0.15 THEN
            v_rally_modifier := 1.30;
        ELSE
            v_rally_modifier := 1.00;
        END IF;
    END IF;

    -- Update rally modifier
    UPDATE public.global_raid_event
    SET 
        rally_modifier = v_rally_modifier,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_event_id;

    -- Broadcast announcement if bonus damage is active
    IF v_rally_modifier > 1.00 THEN
        IF v_players_damaged_count <= 3 THEN
            v_announcement_text := format(
                '📢 Announcement! 🔥 [RALLY BONUS ACTIVATED] Only %s warrior(s) have struck Bakunawa! Ancestral spirits awaken: Server-wide Raid Damage is boosted by +%s%%!',
                v_players_damaged_count,
                ROUND((v_rally_modifier - 1.00) * 100)
            );
        ELSE
            v_announcement_text := format(
                '📢 Announcement! 🔥 [COMMUNITY RALLY ACTIVATED] Bakunawa resists! Tribal shamans invoke Ancestral Spirits! Server-wide Raid Damage is boosted by +%s%%!',
                ROUND((v_rally_modifier - 1.00) * 100)
            );
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'global_chat') THEN
            INSERT INTO public.global_chat (sender, message, created_at)
            VALUES ('GM', v_announcement_text, timezone('utc'::text, now()));
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'days_elapsed', v_days_elapsed,
        'players_damaged_count', v_players_damaged_count,
        'target_progress_percent', ROUND(v_target_ratio * 100, 1),
        'actual_progress_percent', ROUND(v_actual_ratio * 100, 1),
        'deficit_percent', ROUND(v_progress_deficit * 100, 1),
        'rally_modifier', v_rally_modifier,
        'daily_attempts_reset', true
    );
END;
$$;

-- 4. Core Procedure 3: Damage Handler with DORMANT Guard
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

    IF v_event.status = 'DORMANT' THEN
        RETURN jsonb_build_object(
            'status', 'DORMANT',
            'current_hp', v_event.current_hp,
            'max_hp', v_event.max_hp,
            'message', 'The Celestial Raid is currently dormant until at least 1 hero reaches Level 40 to unlock the event!'
        );
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

-- 5. pg_cron Automated Scheduling (Unschedule and Reschedule)
-- Weekly Reset: Every Sunday at 16:00 UTC (Monday 00:00 PHT Midnight)
SELECT cron.unschedule('weekly-bakunawa-reset')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-bakunawa-reset');

SELECT cron.schedule(
    'weekly-bakunawa-reset',
    '0 16 * * 0',
    $$SELECT public.reset_weekly_bakunawa_raid();$$
);

-- Daily Rally & Attempt Reset: Every Night at 16:00 UTC (00:00 PHT Midnight)
SELECT cron.unschedule('daily-bakunawa-rally-reset')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-bakunawa-rally-reset');

SELECT cron.schedule(
    'daily-bakunawa-rally-reset',
    '0 16 * * *',
    $$SELECT public.evaluate_daily_raid_rally_and_reset_attempts();$$
);

-- Verification:
SELECT jobid, jobname, schedule, command, active FROM cron.job WHERE jobname LIKE '%bakunawa%';

