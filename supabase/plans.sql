-- Habitat: Pläne (Wochenplan mit Soll/Ist) – zwei Tabellen + Row Level Security
-- Im Supabase-Dashboard unter "SQL Editor" einmal ausführen (wie schema.sql).

create table if not exists public.plans (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null,
  deleted boolean not null default false
);

create table if not exists public.plan_entries (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null,
  deleted boolean not null default false
);

create index if not exists plans_user_updated on public.plans (user_id, updated_at);
create index if not exists plan_entries_user_updated on public.plan_entries (user_id, updated_at);

alter table public.plans enable row level security;
alter table public.plan_entries enable row level security;

drop policy if exists "own rows" on public.plans;
create policy "own rows" on public.plans for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own rows" on public.plan_entries;
create policy "own rows" on public.plan_entries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
