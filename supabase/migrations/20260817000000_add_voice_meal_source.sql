-- Shelf: meal_logs.source — widen to include 'voice' (typed/spoken
-- description estimation). Run this in the Supabase dashboard:
-- Project > SQL Editor > New query > paste > Run.
--
-- Same dynamic constraint-name lookup as the previous source-enum widening
-- (20260816000000_add_food_search.sql), rather than assuming Postgres's
-- default naming convention.
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
    add constraint meal_logs_source_check check (source in ('recipe', 'manual', 'search', 'custom', 'voice'));
end $$;

-- Marks a logged entry as AI-estimated rather than from a database/label —
-- used by voice/typed-description logging now, and reusable as-is for
-- photo-based estimation later without another schema change.
alter table public.meal_logs
  add column if not exists is_estimated boolean not null default false;
