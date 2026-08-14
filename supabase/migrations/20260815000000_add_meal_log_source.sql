-- Shelf: meal_logs.source — distinguishes how an entry was logged.
-- Run this in the Supabase dashboard: Project > SQL Editor > New query > paste > Run.
--
-- Existing rows are all recipe-card logs, so they backfill to 'recipe'
-- automatically via the column default. The enum only covers 'manual' for
-- now (the first non-recipe logging method being built) — it'll be widened
-- in later migrations as search/barcode/voice/photo logging are added,
-- rather than guessing at that taxonomy ahead of building those features.
alter table public.meal_logs
  add column if not exists source text not null default 'recipe'
    check (source in ('recipe', 'manual'));
