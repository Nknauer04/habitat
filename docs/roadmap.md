# Roadmap

Status: Alle Must-Punkte, Ziele, Mengen, Mini-Version, Statistik, Push-Erinnerungen und Abzeichen fertig. Nächstes: weitere Nice-Features. Annahmen: Tracken: Sport, Lernen, Schlaf, Musikproduktion · Motivation: Streaks + Level · Nutzung: morgens/abends, iPhone + Mac.

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
- [x] Offline + Sync zwischen iPhone und Mac (Browser-Test: Service Worker, Laden ohne Server, Anlegen/Abhaken; iPhone-Flugmodus-Test von Niklas bestätigt)
- [x] JSON-Export/-Import (Zusammenführen, Neueres gewinnt; Teilen-Menü auf iPhone)

## Should
- [x] Ziele (z. B. „Song fertigstellen“, „10 h/Woche lernen“) mit Fortschritt, verknüpft mit Gewohnheiten
- [x] Mengen-Gewohnheiten (Einheit + Tagesziel; Tag zählt ab Ziel; Teilwerte addieren sich)
- [x] Mini-Version/2-Minuten-Variante je Gewohnheit („schlechter Tag“): hält Streak, halbe XP
- [x] Wochen-/Monatsstatistik, Tages-Score (Verlauf oben; Score in Heute; Wochenziele separat)
- [x] Erinnerungen per Web-Push (Morgen/Abend): Testnachricht und geplanter Versand auf dem iPhone bestätigt; Einrichtung in docs/push-setup.md
- [ ] Habit-Stacking („Nach X …“) und Notiz/Kontext je Check-in

## Nice
- [ ] App-Icon-Badge (offene Habits heute)
- [x] Abzeichen/Meilensteine (Streak 7/30/66 Tage je Gewohnheit, Level 5/10/20, Ziele 1/5/10; Hinweis in Heute, Sammlung im Verlauf)
- [x] Update-Hinweis in der App („Neue Version verfügbar“) + Versionsangabe in den Einstellungen
- [x] Wochenrückblick (Auswertung der Woche + freie Notiz; Hinweis in Heute So/Mo; Tabelle `reviews`: supabase/reviews.sql in Supabase ausführen)
- [ ] Schlaf-Logging (Zubettgeh-/Aufstehzeit) und Musik-Session-Timer
- [ ] Widgets/Shortcuts-Anbindung (Apple Kurzbefehle)
- [x] Insights (Wochentage je Gewohnheit, Morgen vs Abend, Serien-Abbruchtage; Karte im Verlauf)

## Neu (Wunschliste Niklas, Stand 2026-11-17)
- [x] Wochenrückblick + Insights (bewusst schlicht gehalten, Design folgt)
- [~] Design-Überarbeitung (Etappe 1 fertig: Design-System, Tab-Leiste, Profil mit Bereichs-Scores, Heute mit Wochenstreifen; Einstellungen unter Profil. Etappe 2: Ziele, Etappe 3: Statistik offen). Vorlage: Pattrn-Screenshots von Niklas. Ursprünglich: „cooler“, weniger minimalistisch. Niklas schickt Screenshots als Vorlage, sobald Wochenrückblick + Insights fertig sind; danach in einem Zug umsetzen
- [ ] KI-Coach (Claude API): Tipps für den Tag, Feedback zur Woche. Voraussetzungen klären: API-Key + Abrechnung bei Anthropic (laufende Kosten, nicht im Abo enthalten), Key nur serverseitig in einer Supabase Edge Function, Datenschutz (Gewohnheitsdaten gehen an die API), Ausgabenlimit setzen
