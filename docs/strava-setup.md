# Strava einrichten (einmalig, ca. 15 Minuten)

Alles kostenlos. Strava-API für Privatnutzung kostet nichts; eine neue Strava-App ist anfangs auf einen Athleten (dich) begrenzt, das reicht.

## 1. Garmin → Strava (falls du eine Garmin-Uhr nutzt)
Garmin Connect (App oder connect.garmin.com) → Einstellungen → Verbindungen / Partner-Apps → **Strava** verbinden.
Danach lädt Garmin jede Aktivität automatisch zu Strava hoch. Be Happy liest dann Strava.

## 2. Strava-API-Anwendung anlegen
1. Bei Strava einloggen → https://www.strava.com/settings/api
2. Anwendung anlegen: Name `Be Happy`, Kategorie beliebig, Website `https://habitat-ft3o.vercel.app`,
   **Authorization Callback Domain: `habitat-ft3o.vercel.app`** (nur die Domain, ohne https://).
   Zum Testen am Mac zusätzlich geht `localhost` als Domain (nur eine Domain pro App; für den Alltag die Vercel-Domain).
3. Notiere **Client ID** (Zahl) und **Client Secret** (geheim, nie in Chats oder ins Repo).

## 3. Supabase
1. **SQL:** SQL Editor → Inhalt von `supabase/strava.sql` einfügen → Run.
2. **Funktion:** Edge Functions → Deploy a new function → Via Editor → **Name genau `strava`** → Inhalt von
   `supabase/functions/strava/index.ts` komplett einfügen → Deploy. „Verify JWT“ bleibt **an** (Standard).
3. **Geheimnisse:** Edge Functions → Secrets → zwei Einträge: `STRAVA_CLIENT_ID` und `STRAVA_CLIENT_SECRET`.

## 4. Vercel
Project → Settings → Environment Variables → `VITE_STRAVA_CLIENT_ID` = deine Client ID (nur die Zahl) → danach **Redeploy**.
(Lokal zum Testen: dieselbe Zeile in `.env`.)

## 5. In der App
Einstellungen → Strava → **Mit Strava verbinden** → bei Strava „Autorisieren“ (Aktivitäten ansehen erlauben).
Die App lädt die letzten 90 Tage, legt für Läufe/Fahrten/… passende Einheiten in km an und trägt die Kilometer ein.
Danach holt sie neue Aktivitäten beim Öffnen (höchstens alle 15 Minuten) oder per „Jetzt abrufen“.

## Hinweis iPhone
Der Rücksprung von Strava öffnet auf dem iPhone ein Safari-Fenster, in dem du nicht angemeldet bist. Das ist gewollt abgesichert: Die App holt vor dem Wechsel zu Strava einen signierten, 15 Minuten gültigen Code von der Funktion, damit die Verbindung auch dort deinem Konto zugeordnet wird.
Nach „Strava ist verbunden“ schließt du das Fenster, öffnest Be Happy und tippst in den Einstellungen bei Strava auf „Jetzt abrufen“.

## Wie es funktioniert
- Das Geheimnis bleibt in Supabase. Die Zugangsdaten liegen in `strava_connection`, die App kann sie nicht lesen.
- Aktivitäten (Strecke, Zeit, Tempo, Höhenmeter, mittlere/maximale Herzfrequenz) liegen in `strava_activities` und synchronisieren wie alles andere.
- Die Zuordnung Strava-Art → Einheit steht an der Einheit (Feld `stravaKinds`), gilt also auf beiden Geräten.
- Pro Einheit und Tag entsteht ein Eintrag mit der Summe der Kilometer. Einträge, die du selbst änderst, überschreibt Strava nicht; gelöschte kommen nicht zurück.
- Fehlersuche: Supabase → Edge Functions → `strava` → Logs. Strava begrenzt die Abrufe (100 pro 15 Min., 1000 pro Tag für neue Apps), der normale Betrieb liegt weit darunter.
