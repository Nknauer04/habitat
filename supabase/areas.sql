-- Be Happy: Bereiche (eigene Bereiche + Überschreibungen der Standard-Bereiche) – Tabelle + Row Level Security
-- Im Supabase-Dashboard unter "SQL Editor" einmal ausführen (wie schema.sql).

create table if not exists public.areas (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null,
  deleted boolean not null default false
);

create index if not exists areas_user_updated on public.areas (user_id, updated_at);

alter table public.areas enable row level security;

drop policy if exists "own rows" on public.areas;
create policy "own rows" on public.areas for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
