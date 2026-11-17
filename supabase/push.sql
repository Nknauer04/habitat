-- Habitat: Push-Erinnerungen (Tabelle + Row Level Security)
-- Im Supabase-Dashboard unter "SQL Editor" einmal ausführen.
-- Den Zeitplan (cron) führst du separat mit .secrets/cron.sql aus (enthält dein CRON_SECRET, nicht im Repo).

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  timezone text not null default 'Europe/Berlin',
  morning_on boolean not null default true,
  morning_time text not null default '07:30',
  evening_on boolean not null default true,
  evening_time text not null default '20:30',
  last_morning date,
  last_evening date,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "own rows" on public.push_subscriptions;
create policy "own rows" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
