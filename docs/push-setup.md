# Push-Erinnerungen einrichten

Einmalig, ca. 10 Minuten. Keine Installation nötig, alles im Supabase-Dashboard und bei Vercel.
Lokale Geheimnisse liegen in `.secrets/` (nicht im Repo): `supabase-secrets.txt`, `cron.sql`, `vapid-keys.json`.

1. **Tabelle anlegen:** Supabase → SQL Editor → Inhalt von `supabase/push.sql` einfügen → Run.
2. **Funktion anlegen:** Edge Functions → Deploy a new function → Via Editor → **Namen vor dem Deploy auf genau `remind` ändern** (Zufallsnamen lassen sich nicht umbenennen; sonst „Requested function was not found“).
   Inhalt von `supabase/functions/remind/index.ts` komplett einfügen → Deploy.
   In den Funktions-Einstellungen **Verify JWT ausschalten** (der Zeitplan ruft ohne Login-Token auf; Schutz über `CRON_SECRET`).
3. **Geheimnisse:** Edge Functions → Secrets → vier Einträge aus `.secrets/supabase-secrets.txt`
   (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`).
4. **Zeitplan:** SQL Editor → Inhalt von `.secrets/cron.sql` einfügen → Run (alle 5 Minuten).
5. **Vercel:** Project → Settings → Environment Variables → `VITE_VAPID_PUBLIC_KEY` (Wert aus `.env`) → Redeploy.
6. **iPhone:** App vom Home-Bildschirm öffnen (iOS 16.4+), Einstellungen → Erinnerungen → aktivieren → „Testnachricht senden“.

## Erinnerung je Gewohnheit (eigene Uhrzeit)
Zusätzlich zu den zwei allgemeinen Erinnerungen kann jede Gewohnheit eine eigene Uhrzeit haben. Einmal nötig:
1. SQL Editor → Inhalt von `supabase/push-habits.sql` einfügen → Run (neue Spalte `last_habits`).
2. Edge Functions → `remind` → Code komplett durch den Inhalt von `supabase/functions/remind/index.ts` ersetzen → Deploy (Name und „Verify JWT aus“ bleiben).
Die Funktion sendet nur, wenn die Gewohnheit heute fällig und noch offen ist (Wochentage, „X× pro Woche“, Tagesziel und Mini-Haken werden beachtet), höchstens einmal pro Gewohnheit und Tag.

## Wie es funktioniert
- Die App speichert die Push-Anmeldung und die Uhrzeiten in `push_subscriptions`.
- `remind` läuft alle 5 Minuten, sendet zur eingestellten Uhrzeit (Nachholfenster 60 Min) einmal pro Tag und Erinnerung.
- Für Gewohnheiten mit eigener Uhrzeit liest sie `habits` und `check_ins` des Nutzers und merkt sich je Gewohnheit den Tag der letzten Erinnerung in `push_subscriptions.last_habits`.
- Abgelaufene Anmeldungen (404/410) werden automatisch gelöscht.
- Fehlersuche: Supabase → Edge Functions → `remind` → Logs; `select * from cron.job_run_details order by start_time desc limit 5;`
