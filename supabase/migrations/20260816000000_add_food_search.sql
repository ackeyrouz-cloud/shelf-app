-- Shelf: food search — custom_foods table + meal_logs rescaling columns.
-- Run this in the Supabase dashboard: Project > SQL Editor > New query > paste > Run.
--
-- custom_foods stores a user's own reusable food entries, normalized to
-- per-100g/ml (same convention as Open Food Facts / USDA), so they scale
-- correctly to any quantity in search later — not just the amount they were
-- first created at.
create table if not exists public.custom_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  brand text,

  calories_per_100 numeric not null check (calories_per_100 >= 0),
  protein_g_per_100 numeric not null check (protein_g_per_100 >= 0),
  carbs_g_per_100 numeric not null check (carbs_g_per_100 >= 0),
  fat_g_per_100 numeric not null check (fat_g_per_100 >= 0),
  fiber_g_per_100 numeric check (fiber_g_per_100 >= 0),

  is_beverage boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_foods_user_name_idx on public.custom_foods(user_id, name);

alter table public.custom_foods enable row level security;

drop policy if exists "Users can view their own custom foods" on public.custom_foods;
create policy "Users can view their own custom foods"
  on public.custom_foods for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own custom foods" on public.custom_foods;
create policy "Users can insert their own custom foods"
  on public.custom_foods for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own custom foods" on public.custom_foods;
create policy "Users can update their own custom foods"
  on public.custom_foods for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own custom foods" on public.custom_foods;
create policy "Users can delete their own custom foods"
  on public.custom_foods for delete
  using (auth.uid() = user_id);

drop trigger if exists custom_foods_set_updated_at on public.custom_foods;
create trigger custom_foods_set_updated_at
  before update on public.custom_foods
  for each row execute function public.set_updated_at();

-- meal_logs: widen `source` beyond 'recipe'/'manual' now that search-based
-- logging exists, and add the columns needed to rescale a search/custom-food
-- log when it's reopened from "recent" — nullable, since recipe and manual
-- entries (source in 'recipe','manual') have no per-100 base to rescale
-- from and never populate these.
--
-- Looks up the existing check constraint on meal_logs.source by name
-- dynamically rather than assuming Postgres's default naming convention, so
-- this doesn't silently no-op if that assumption is ever wrong.
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
    add constraint meal_logs_source_check check (source in ('recipe', 'manual', 'search', 'custom'));
end $$;

alter table public.meal_logs
  add column if not exists base_calories_per_100 numeric check (base_calories_per_100 >= 0),
  add column if not exists base_protein_g_per_100 numeric check (base_protein_g_per_100 >= 0),
  add column if not exists base_carbs_g_per_100 numeric check (base_carbs_g_per_100 >= 0),
  add column if not exists base_fat_g_per_100 numeric check (base_fat_g_per_100 >= 0),
  add column if not exists base_fiber_g_per_100 numeric check (base_fiber_g_per_100 >= 0),
  add column if not exists quantity numeric check (quantity > 0),
  add column if not exists quantity_unit text,
  add column if not exists off_code text,
  add column if not exists usda_id text,
  add column if not exists custom_food_id uuid references public.custom_foods(id) on delete set null;
