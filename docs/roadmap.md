# Roadmap

Status: Phase 1 läuft – Grundgerüst steht, Supabase-Login + Sync + Vercel offen. Annahmen: Tracken: Sport, Lernen, Schlaf, Musikproduktion · Motivation: Streaks + Level · Nutzung: morgens/abends, iPhone + Mac.

## Phase 1 – Grundgerüst (Stopp danach)
- [x] Vite + React + TS + Tailwind, Dark Mode, Layout (Tab-Bar 390 px / Seitenleiste ≥ 1024 px)
- [x] PWA (Manifest, Service Worker, Icons, Splash)
- [x] Datenmodell (Habits, Check-ins, Ziele) + Dexie
- [ ] Supabase: Magic-Link-Login, RLS, Sync (last write wins)
- [ ] Vercel-Deployment via GitHub

## Must
- [ ] Gewohnheiten anlegen/bearbeiten/archivieren (Name, Icon, Bereich: Sport/Lernen/Schlaf/Musik, Tageszeit Morgen/Abend)
- [ ] „Heute“-Ansicht: Abhaken in 1–2 Taps, gruppiert nach Morgen/Abend
- [ ] Häufigkeit: täglich, bestimmte Wochentage, X× pro Woche
- [ ] Streak mit Verzeihung (Wochenziel-Streak + Freeze, max. 3)
- [ ] XP + Level mit Identitäts-Titeln
- [ ] Verlauf: Kalender-/Heatmap-Ansicht pro Gewohnheit
- [ ] Offline + Sync zwischen iPhone und Mac
- [ ] JSON-Export/-Import

## Should
- [ ] Ziele (z. B. „Song fertigstellen“, „10 h/Woche lernen“) mit Fortschritt, verknüpft mit Gewohnheiten
- [ ] Mengen-Gewohnheiten (Minuten, Anzahl; z. B. Schlafstunden, Lernzeit)
- [ ] Mini-Version/2-Minuten-Variante je Gewohnheit („schlechter Tag“-Modus)
- [ ] Wochen-/Monatsstatistik, Tages-Score
- [ ] Erinnerungen per Web-Push (Morgen/Abend)
- [ ] Habit-Stacking („Nach X …“) und Notiz/Kontext je Check-in

## Nice
- [ ] App-Icon-Badge (offene Habits heute)
- [ ] Abzeichen/Meilensteine (7/30/66 Tage)
- [ ] Wochenrückblick (Reflexion, 3 Fragen)
- [ ] Schlaf-Logging (Zubettgeh-/Aufstehzeit) und Musik-Session-Timer
- [ ] Widgets/Shortcuts-Anbindung (Apple Kurzbefehle)
- [ ] Insights („an welchen Tagen klappt X nicht?“)
