-- Habitat: Schema + Row Level Security
-- Im Supabase-Dashboard unter "SQL Editor" einmal ausführen.
-- Jede Zeile gehört genau einem Nutzer (user_id); der Inhalt liegt als JSON in "data".

do $$
declare t text;
begin
  foreach t in array array['habits', 'check_ins', 'goals'] loop
    execute format(
      'create table if not exists public.%I (
         id uuid primary key,
         user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
         data jsonb not null,
         updated_at timestamptz not null,
         deleted boolean not null default false
       )', t);
  end loop;
end $$;

create index if not exists habits_user_updated on public.habits (user_id, updated_at);
create index if not exists check_ins_user_updated on public.check_ins (user_id, updated_at);
create index if not exists goals_user_updated on public.goals (user_id, updated_at);

alter table public.habits enable row level security;
alter table public.check_ins enable row level security;
alter table public.goals enable row level security;

do $$
declare t text;
begin
  foreach t in array array['habits', 'check_ins', 'goals'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
