# Roadmap

Status: Phase 1 fertig. Must-Punkte, Ziele und Mengen-Gewohnheiten fertig. Nächstes: weitere Should-Features (Vorschlag: Mini-Version "schlechter Tag"). Annahmen: Tracken: Sport, Lernen, Schlaf, Musikproduktion · Motivation: Streaks + Level · Nutzung: morgens/abends, iPhone + Mac.

## Phase 1 – Grundgerüst (Stopp danach)
- [x] Vite + React + TS + Tailwind, Dark Mode, Layout (Tab-Bar 390 px / Seitenleiste ≥ 1024 px)
- [x] PWA (Manifest, Service Worker, Icons, Splash)
- [x] Datenmodell (Habits, Check-ins, Ziele) + Dexie
- [x] Supabase: Login (E-Mail + Passwort), RLS, Sync (last write wins) – Sync noch nicht mit zwei Geräten getestet
- [x] Vercel-Deployment via GitHub (https://habitat-ft3o.vercel.app)

## Must
- [x] Gewohnheiten anlegen/bearbeiten/archivieren (Name, Icon, Bereich: Sport/Lernen/Schlaf/Musik, Tageszeit Morgen/Abend)
- [x] „Heute“-Ansicht: Abhaken in 1–2 Taps, gruppiert nach Morgen/Abend
- [x] Häufigkeit: täglich, bestimmte Wochentage, X× pro Woche
- [x] Streak mit Verzeihung (1 Freeze alle 10 Streak-Tage, max. 3)
- [x] XP + Level mit Identitäts-Titeln (10 XP, Bonus 7/30/66 Tage; Gesamt-Level + Titel je Bereich)
- [x] Verlauf: Heatmap (12 Wochen) pro Gewohnheit, Nachtragen per Tipp, Streak/Längste/Quote
- [ ] Offline + Sync zwischen iPhone und Mac
- [x] JSON-Export/-Import (Zusammenführen, Neueres gewinnt; Teilen-Menü auf iPhone)

## Should
- [x] Ziele (z. B. „Song fertigstellen“, „10 h/Woche lernen“) mit Fortschritt, verknüpft mit Gewohnheiten
- [x] Mengen-Gewohnheiten (Einheit + Tagesziel; Tag zählt ab Ziel; Teilwerte addieren sich)
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
