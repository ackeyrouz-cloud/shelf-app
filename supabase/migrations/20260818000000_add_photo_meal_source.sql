-- Shelf: meal_logs.source — widen to include 'photo' (photo-based
-- estimation). Run this in the Supabase dashboard: Project > SQL Editor >
-- New query > paste > Run.
--
-- Same dynamic constraint-name lookup as the previous two source-enum
-- widenings, rather than assuming Postgres's default naming convention.
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
