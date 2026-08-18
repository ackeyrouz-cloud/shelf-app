-- Shelf: water tracking — one row per user per day, not per-log-entry like
-- meal_logs (there's no need for that structure here, it's just a running
-- total). Run this in the Supabase dashboard: Project > SQL Editor > New
-- query > paste > Run.
create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  log_date date not null,
  amount_ml numeric not null default 0 check (amount_ml >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, log_date)
);

alter table public.water_logs enable row level security;

drop policy if exists "Users can view their own water logs" on public.water_logs;
create policy "Users can view their own water logs"
  on public.water_logs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own water logs" on public.water_logs;
create policy "Users can insert their own water logs"
  on public.water_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own water logs" on public.water_logs;
create policy "Users can update their own water logs"
  on public.water_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own water logs" on public.water_logs;
create policy "Users can delete their own water logs"
  on public.water_logs for delete
  using (auth.uid() = user_id);

drop trigger if exists water_logs_set_updated_at on public.water_logs;
create trigger water_logs_set_updated_at
  before update on public.water_logs
  for each row execute function public.set_updated_at();

-- Atomic increment (or decrement, via a negative amount — used by the
-- custom-amount "undo" case) so two quick-add taps in a row can't lose an
-- update to a race between two overlapping read-then-write calls from the
-- client. Runs as the caller (not security definer) so it's governed by
-- the RLS policies above, same as every other table in this schema.
create or replace function public.increment_water(p_log_date date, p_amount_ml numeric)
returns numeric
language plpgsql
as $$
declare
  new_total numeric;
begin
  insert into public.water_logs (user_id, log_date, amount_ml)
  values (auth.uid(), p_log_date, greatest(p_amount_ml, 0))
  on conflict (user_id, log_date)
  do update set amount_ml = greatest(water_logs.amount_ml + p_amount_ml, 0), updated_at = now()
  returning amount_ml into new_total;
  return new_total;
end;
$$;

-- profiles.target_water_ml — a flat 2000ml default works reasonably as
-- both a metric (2L) and imperial (~67.6oz, close to the common 64oz
-- guideline) starting point, so this doesn't need locale detection the way
-- the app's *display* units do.
alter table public.profiles
  add column if not exists target_water_ml numeric not null default 2000 check (target_water_ml > 0);
