-- Shelf: meal_logs — daily calorie/macro/fiber tracking.
-- Run this in the Supabase dashboard: Project > SQL Editor > New query > paste > Run.
--
-- Each row is a self-contained snapshot of what was logged, not a reference
-- to a recipe row — recipes are generated fresh by the LLM per search and
-- never stored, so there's nothing stable to reference. Storing the exact
-- per-serving macros at log time means a logged entry never drifts even if
-- the model estimates a similar recipe differently on a future search.
--
-- log_date is computed CLIENT-SIDE from local device time and stored
-- directly (not derived from logged_at, which is UTC) — this is what makes
-- "today's total" and the midnight rollover correct regardless of the
-- user's timezone, with no server-side reset job needed at all.
create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  log_date date not null,
  logged_at timestamptz not null default now(),

  recipe_title text not null,
  servings_logged numeric not null default 1 check (servings_logged > 0),

  -- Per-serving snapshot; totals are servings_logged * these. protein/carbs/fat
  -- are required because the app only offers the log button once the backend
  -- has produced all three (see RecipeCard's canLog gate) - an incomplete
  -- macro set is never loggable, so these columns should never actually be
  -- null in practice. fiber stays nullable since the backend gracefully
  -- drops it alone if the model's estimate for that one field is malformed.
  calories_per_serving numeric not null check (calories_per_serving >= 0),
  protein_g_per_serving numeric not null check (protein_g_per_serving >= 0),
  carbs_g_per_serving numeric not null check (carbs_g_per_serving >= 0),
  fat_g_per_serving numeric not null check (fat_g_per_serving >= 0),
  fiber_g_per_serving numeric check (fiber_g_per_serving >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meal_logs_user_date_idx on public.meal_logs(user_id, log_date);

alter table public.meal_logs enable row level security;

drop policy if exists "Users can view their own meal logs" on public.meal_logs;
create policy "Users can view their own meal logs"
  on public.meal_logs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own meal logs" on public.meal_logs;
create policy "Users can insert their own meal logs"
  on public.meal_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own meal logs" on public.meal_logs;
create policy "Users can update their own meal logs"
  on public.meal_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own meal logs" on public.meal_logs;
create policy "Users can delete their own meal logs"
  on public.meal_logs for delete
  using (auth.uid() = user_id);

-- Reuses the set_updated_at() trigger function already defined for profiles.
drop trigger if exists meal_logs_set_updated_at on public.meal_logs;
create trigger meal_logs_set_updated_at
  before update on public.meal_logs
  for each row execute function public.set_updated_at();
