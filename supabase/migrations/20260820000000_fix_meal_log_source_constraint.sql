-- Shelf: meal_logs.source — repairs a regression introduced by re-running
-- 20260816000000_add_food_search.sql during troubleshooting. That file's
-- constraint-widening block unconditionally drops whatever constraint
-- currently exists and replaces it with the value list that was correct
-- when IT was written ('recipe','manual','search','custom') — re-running it
-- silently reverted the later widenings from 20260817 (voice) and 20260818
-- (photo), even though neither of those files was itself re-run. Confirmed
-- live: real authenticated inserts with source='voice' and source='photo'
-- both failed with a 23514 check-constraint violation before this fix.
-- Run this in the Supabase dashboard: Project > SQL Editor > New query >
-- paste > Run.
do $$
declare
  existing_constraint text;
begin
  select con.conname into existing_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(con.conkey)
  where rel.relname = 'meal_logs' and con.contype = 'c' and att.attname = 'source';

  if existing_constraint is not null then
    execute format('alter table public.meal_logs drop constraint %I', existing_constraint);
  end if;

  alter table public.meal_logs
    add constraint meal_logs_source_check check (source in ('recipe', 'manual', 'search', 'custom', 'voice', 'photo'));
end $$;
