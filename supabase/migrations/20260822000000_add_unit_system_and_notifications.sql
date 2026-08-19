-- Shelf: profiles.unit_system (drives weight/height/water/food-search unit
-- display consistently, replacing water tracking's locale-only guess as the
-- source of truth) and profiles.notifications_enabled (in-app preference
-- only — real OS permission state is always queried live, never cached
-- here, since it can change outside the app). Run this in the Supabase
-- dashboard: Project > SQL Editor > New query > paste > Run.
alter table public.profiles
  add column if not exists unit_system text not null default 'metric' check (unit_system in ('metric', 'imperial')),
  add column if not exists notifications_enabled boolean not null default false;
