-- Shelf: meal planning — meal_plans (one recipe/dish per day+slot) and
-- shopping_list_items (the consolidated, checkable list generated from a
-- week's plan). Run this in the Supabase dashboard: Project > SQL Editor >
-- New query > paste > Run.
--
-- recipe_json stores the full generated recipe object (ingredients, missing,
-- usesFromShelf, steps, time, difficulty) — recipes are never persisted
-- anywhere else (find-recipes generates them fresh per search and the
-- client discards them), so this is the only copy once one is assigned to
-- a day. Null for manual entries, which have nothing beyond the title/macro
-- columns below.
--
-- Per-serving macros are duplicated out as flat columns (same convention as
-- meal_logs) rather than requiring every reader to parse recipe_json — this
-- is what keeps the weekly macro summary a plain SUM(), not a jsonb-parsing
-- query.
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  plan_date date not null,
  meal_slot text not null check (meal_slot in ('breakfast', 'lunch', 'dinner')),

  recipe_source text not null check (recipe_source in ('generated', 'manual')),
  recipe_title text not null,
  recipe_json jsonb,

  calories_per_serving numeric check (calories_per_serving >= 0),
  protein_g_per_serving numeric check (protein_g_per_serving >= 0),
  carbs_g_per_serving numeric check (carbs_g_per_serving >= 0),
  fat_g_per_serving numeric check (fat_g_per_serving >= 0),
  fiber_g_per_serving numeric check (fiber_g_per_serving >= 0),

  servings numeric not null default 1 check (servings > 0),

  -- Set once this planned meal is actually logged via the existing
  -- logMeal() pipeline — on delete set null (not cascade) so deleting the
  -- resulting log entry later just reverts the plan to "not yet logged"
  -- rather than silently deleting the plan itself.
  meal_log_id uuid references public.meal_logs(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, plan_date, meal_slot)
);

create index if not exists meal_plans_user_date_idx on public.meal_plans(user_id, plan_date);

alter table public.meal_plans enable row level security;

drop policy if exists "Users can view their own meal plans" on public.meal_plans;
create policy "Users can view their own meal plans"
  on public.meal_plans for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own meal plans" on public.meal_plans;
create policy "Users can insert their own meal plans"
  on public.meal_plans for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own meal plans" on public.meal_plans;
create policy "Users can update their own meal plans"
  on public.meal_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own meal plans" on public.meal_plans;
create policy "Users can delete their own meal plans"
  on public.meal_plans for delete
  using (auth.uid() = user_id);

drop trigger if exists meal_plans_set_updated_at on public.meal_plans;
create trigger meal_plans_set_updated_at
  before update on public.meal_plans
  for each row execute function public.set_updated_at();

-- ============================================================
-- shopping_list_items
-- One row per consolidated ingredient for a given week. week_start_date is
-- whatever date the client considers "day 1" of the currently-viewed
-- rolling week (today, at generation time) — not a fixed Monday. Regenerating
-- a list replaces its rows for that week_start_date; the client reconciles
-- `checked` state across a regenerate by matching on item_name.
-- ============================================================
create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  week_start_date date not null,
  item_name text not null,
  item_note text,
  checked boolean not null default false,

  created_at timestamptz not null default now()
);

create index if not exists shopping_list_items_user_week_idx on public.shopping_list_items(user_id, week_start_date);

alter table public.shopping_list_items enable row level security;

drop policy if exists "Users can view their own shopping list items" on public.shopping_list_items;
create policy "Users can view their own shopping list items"
  on public.shopping_list_items for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own shopping list items" on public.shopping_list_items;
create policy "Users can insert their own shopping list items"
  on public.shopping_list_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own shopping list items" on public.shopping_list_items;
create policy "Users can update their own shopping list items"
  on public.shopping_list_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own shopping list items" on public.shopping_list_items;
create policy "Users can delete their own shopping list items"
  on public.shopping_list_items for delete
  using (auth.uid() = user_id);
