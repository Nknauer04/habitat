-- Be Happy: Erinnerungen je Gewohnheit – eine Spalte, die merkt, an welchem Tag welche Gewohnheit zuletzt erinnert wurde.
-- Im Supabase-Dashboard unter "SQL Editor" einmal ausführen (nach push.sql).

alter table public.push_subscriptions
  add column if not exists last_habits jsonb not null default '{}'::jsonb;
