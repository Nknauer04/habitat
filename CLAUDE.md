# Projekt: Habit- & Ziel-App (PWA) für Niklas

Persönliche Web-App zum Aufbauen von Gewohnheiten und Erreichen von Zielen, inspiriert von „Pattrn“ (iOS).
Nur ein Nutzer (ich), läuft als PWA auf meinem **iPhone** (Safari → „Zum Home-Bildschirm“) und meinem **Mac**
(Safari → Ablage → „Zum Dock hinzufügen“). Daten müssen zwischen beiden Geräten synchron sein. Kein App Store, keine Kosten.

## Feste Basics (nicht neu diskutieren)
- Stack: React + Vite + TypeScript, Tailwind CSS
- Sync/Backend: Supabase (kostenloser Tarif) – Postgres + Auth (Login per E-Mail + Passwort, nur mein Account; Magic Link verworfen: öffnet sich auf iOS nicht in der PWA),
  Row Level Security aktiv, Zugangsdaten nur in `.env` (nie committen)
- Offline: lokaler Cache in IndexedDB (Dexie.js), Änderungen offline speichern und beim nächsten
  Online-Sein synchronisieren (einfaches „last write wins“ über `updated_at` reicht)
- Backup: JSON-Export/-Import
- PWA: vite-plugin-pwa (Manifest, Service Worker, offlinefähig, iOS-/macOS-Icons + Splash)
- Hosting: Vercel (kostenlos), Deployment über GitHub
- Oberfläche auf Deutsch, Dark Mode, responsiv: iPhone (390 px) und Mac-Fenster (ab 1024 px, z. B. Seitenleiste statt Tab-Bar)
- Git: nach jedem fertigen Schritt ein kleiner Commit mit klarer Nachricht

## Arbeitsweise – Schritt für Schritt MIT mir
1. **Phase 0 – Recherche (einmalig):** Recherchiere im Internet, was erfolgreiche Habit-/Ziel-Apps ausmacht
   (z. B. Pattrn, Streaks, Habitica, Atomic-Habits-Prinzipien, Studien zu Gewohnheitsbildung, Gamification)
   und was bei PWAs auf iOS geht (Push, Badges, Grenzen). Max. ~8 Suchen.
   Ergebnis als kurze Stichpunkte mit Quellen-Links in `docs/recherche.md`, danach daraus eine
   priorisierte Feature-Liste (Must / Should / Nice) in `docs/roadmap.md`. Mir vorstellen und auf Freigabe warten.
2. **Phase 1 – Grundgerüst:** Projekt aufsetzen, PWA installierbar, Navigation, Datenmodell,
   Supabase-Login + Sync. Mich durch die Supabase-Einrichtung (Projekt anlegen, Keys) Schritt für Schritt führen. Danach Stopp.
3. **Danach je Feature derselbe Ablauf:**
   - Mir max. 3 gezielte Fragen stellen, jeweils mit 2–3 Optionen und deiner Empfehlung
   - Kurzen Plan (≤ 8 Zeilen) zeigen → auf mein OK warten
   - Bauen, Build/Typecheck laufen lassen, Commit
   - In 2–3 Sätzen sagen, was fertig ist und wie ich es teste; `docs/roadmap.md` abhaken
   - Nächstes Feature vorschlagen, nicht automatisch anfangen
- Bei Unklarheiten fragen statt raten. Keine Features einbauen, die ich nicht freigegeben habe.

## Token sparen (wichtig)
- Antworten kurz, Deutsch, keine Wiederholungen, keine langen Erklärungen ungefragt
- Nur Dateien lesen, die für den aktuellen Schritt nötig sind; gezielt suchen (grep/glob) statt ganze Ordner lesen
- Gezielte Edits statt ganze Dateien neu schreiben; keine kompletten Dateien im Chat ausgeben
- Recherche-Ergebnisse nur als Stichpunkte in `docs/` ablegen, später dort nachlesen statt neu suchen
- Wenige, bewährte Libraries; keine Experimente
- Projektstand steht in `docs/roadmap.md` – nach `/clear` dort weitermachen statt alles neu zu analysieren

## Definition of Done pro Schritt
`npm run build` und `npm test` ohne Fehler, keine TypeScript-Fehler, auf iPhone-Breite (390 px) und Mac-Breite (1280 px) brauchbar, committet.
