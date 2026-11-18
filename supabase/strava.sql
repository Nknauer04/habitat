-- Be Happy: Strava-Anbindung – Verbindung (nur für die Edge Function lesbar) und Aktivitäten (synchron wie die anderen Tabellen)
-- Im Supabase-Dashboard unter "SQL Editor" einmal ausführen.

-- Zugangsdaten zu Strava: Row Level Security an, bewusst OHNE Policy. Nur die Edge Function (Service-Rolle) kommt heran, die App nie.
create table if not exists public.strava_connection (
  user_id uuid primary key references auth.users(id) on delete cascade,
  athlete_id bigint not null,
  athlete_name text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  last_sync timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.strava_connection enable row level security;

-- Aktivitäten (von der Edge Function geschrieben, von der App gelesen)
create table if not exists public.strava_activities (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null,
  deleted boolean not null default false
);
create index if not exists strava_activities_user_updated on public.strava_activities (user_id, updated_at);
alter table public.strava_activities enable row level security;

drop policy if exists "own rows" on public.strava_activities;
create policy "own rows" on public.strava_activities for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
