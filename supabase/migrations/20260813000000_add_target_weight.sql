-- Adds target_weight (kg) to profiles. weekly_goal_rate is now derived at
-- save time from (target_weight - weight) / target_timeframe_weeks, rather
-- than being collected directly from the user - the column itself doesn't
-- change meaning, just where its value comes from.
-- Run this in the Supabase dashboard: Project > SQL Editor > New query > paste > Run.
alter table public.profiles add column if not exists target_weight numeric;
