-- Shelf: initial schema for profiles + pantry_items
-- Run this in the Supabase dashboard: Project > SQL Editor > New query > paste > Run.
-- (Or apply via `supabase db push` once the CLI is linked to this project.)

-- ============================================================
-- profiles
-- One row per authenticated user, keyed to auth.users(id).
-- Nutrition target fields are left nullable - they're computed
-- application-side from the raw inputs and written back in once
-- that calculation logic exists; this migration only lays out storage.
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  weight numeric,                    -- kg
  height numeric,                    -- cm
  age integer,
  sex text check (sex in ('male', 'female')),
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  weekly_goal_rate numeric,          -- kg/week; negative = loss, positive = gain, 0 = maintenance
  target_timeframe_weeks integer,
  target_calories numeric,
  target_protein_g numeric,
  target_carbs_g numeric,
  target_fat_g numeric,
  target_fiber_g numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
  on public.profiles for delete
  using (auth.uid() = id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- pantry_items
-- Replaces the app's local-only AsyncStorage pantry list. One row
-- per ingredient string (matches the existing "2 eggs", "half an
-- onion" free-text format already used in the app - no structured
-- quantity/unit split, to keep this a storage swap, not a data
-- model redesign).
-- ============================================================
create table if not exists public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists pantry_items_user_id_idx on public.pantry_items(user_id);

alter table public.pantry_items enable row level security;

drop policy if exists "Users can view their own pantry items" on public.pantry_items;
create policy "Users can view their own pantry items"
  on public.pantry_items for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own pantry items" on public.pantry_items;
create policy "Users can insert their own pantry items"
  on public.pantry_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own pantry items" on public.pantry_items;
create policy "Users can update their own pantry items"
  on public.pantry_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own pantry items" on public.pantry_items;
create policy "Users can delete their own pantry items"
  on public.pantry_items for delete
  using (auth.uid() = user_id);
