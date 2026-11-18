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
- [-] Schlaf-Logging und Musik-Session-Timer (von Niklas verworfen, 2026-11-17)
- [ ] Widgets/Shortcuts-Anbindung (Apple Kurzbefehle)
- [x] Insights (Wochentage je Gewohnheit, Morgen vs Abend, Serien-Abbruchtage; Karte im Verlauf)

## Neu (Wunschliste Niklas, Stand 2026-11-17)
- [x] Wochenrückblick + Insights (bewusst schlicht gehalten, Design folgt)
- [x] Design-Überarbeitung nach Pattrn-Vorlage (alle 3 Etappen fertig: Design-System + Profil + Heute mit Wochenstreifen; Ziele mit Cyan-Pillen/Trend/Archiv; Statistik mit Bogen-Anzeige, Konstanz, Heatmap-Auswahl). Feinschliff nach Feedback möglich. Vorlage: Pattrn-Screenshots von Niklas. Ursprünglich: „cooler“, weniger minimalistisch. Niklas schickt Screenshots als Vorlage, sobald Wochenrückblick + Insights fertig sind; danach in einem Zug umsetzen
- [~] Coach: regelbasiert umgesetzt (Tagestipp in Heute, Wochenfazit im Rückblick, ohne KI/Kosten). Echte KI per API bewusst verworfen (laufende Kosten). Mögliche Ergänzung: „Coach-Bericht kopieren“ für die Claude-App. Ursprünglich: KI-Coach (Claude API): Tipps für den Tag, Feedback zur Woche. Voraussetzungen klären: API-Key + Abrechnung bei Anthropic (laufende Kosten, nicht im Abo enthalten), Key nur serverseitig in einer Supabase Edge Function, Datenschutz (Gewohnheitsdaten gehen an die API), Ausgabenlimit setzen
- [x] Gewohnheiten löschen (Dialog „Löschen“ mit Rückfrage; Gewohnheit + Check-ins weich gelöscht, Sync zieht auf dem anderen Gerät nach)
- [x] Einheiten + Mengen-Ziele mit Etappen: Einheit (z. B. Laufen in km) hat nur Ist-Werte (optional Erinnerungs-Wochentage, Karte in „Heute“, Verwalten im Ziele-Tab). Ziel-Art „Menge aus Einheiten“ enthält das Soll (z. B. 500 km bis März), Start, Frist und manuelle Etappenziele (Zwischenstand bis Datum, Auf Kurs/Rückstand, Coach-Hinweis); Halbkreis je Ziel in der Statistik; 10 XP je Einheit-Eintrag. Speicher: Tabellen `plans`/`plan_entries` (supabase/plans.sql, Name aus der ersten Version)
- [x] Redesign Etappe 1: Vollbild-Assistenten (eine Frage pro Seite) für Ziel (mit Frist-Rechnung „noch X Tage / Y pro Woche“), Gewohnheit und Einheit; ~35 Linien-Icons (`i:<name>`, alte Emojis bleiben gültig); Bereichsfarben. Offen: Etappe 2 (Karten/Widgets in Heute + Ziele, Bearbeiten-Dialoge im neuen Stil), Etappe 3 (Statistik, Profil)
- [x] Redesign Etappe 2: Hero-Widget in Heute (Tages-Ring, Level, Streak, Bereichs-Level), neue Gewohnheits-/Einheiten-Karten (Bereichsfarbe, Fortschrittsbalken, Wochen-Punkte/-Balken, Streak-Chip), Ziel-Karten mit Ring, Frist-Chip und Etappen-Markern, Einheiten mit 14-Tage-Balken, Bearbeiten als Vollbild-Seite, Emojis in Coach/Abzeichen durch Linien-Icons. Offen: Etappe 3 (Statistik, Profil)
- [x] Redesign Etappe 3: Statistik (Kennzahl-Widgets mit Ring, Cyan-Balken, Heatmap in Bereichsfarbe, Kartenüberschriften mit Icon-Kacheln, Schnellzugriff) und Profil (Level-Ring um den Avatar, Zahlen-Kacheln, Bereichs-Ringe, Menü mit Icons). Redesign damit abgeschlossen
- [x] Umbenennung in „Be Happy“ + neues Icon (blauer Leucht-Smile auf Dunkelblau). Intern bleibt „habitat“ (Datenbank, Backup-Feld, Adresse). Noch: Titel der Test-Mitteilung in der Edge Function (kommt mit Etappe 5)
- [ ] Wunschliste Niklas (2026-11-17), in Etappen: 2 Gewohnheiten sortieren · 3 Feier-Moment (Konfetti bei Tag komplett, Etappe, Ziel, Streak-Stufe, Level-Up) · 4 Bereiche anpassen (eigene Bereiche, synchron, neues SQL) · 5 Eigene Uhrzeit je Gewohnheit (Push nur wenn offen, Edge Function neu einfügen)
- [x] Gewohnheiten und Einheiten sortieren (Wunschliste Etappe 2): Sortier-Knopf in „Heute“, Ziehgriff + Pfeile, Reihenfolge je Tageszeit, Feld `sortOrder` (synchron, kein neues SQL)
- [x] Feier-Moment (Wunschliste Etappe 3): Konfetti + Glückwunsch-Karte bei Tag komplett, Etappe, Ziel, neuem Abzeichen/Streak-Stufe, Level-Up; Schalter „Feier-Moment“ und „Ton“ in den Einstellungen (nur lokal); „schon gefeiert“ merkt sich das Gerät. Vibration gibt es auf iOS nicht.
- [x] Bereiche anpassen (Wunschliste Etappe 4): Seite „Bereiche“ (Profil/Einstellungen): Standard-Bereiche umbenennen/umfärben/Symbol/ausblenden/zurücksetzen, eigene Bereiche anlegen/löschen (Einträge wandern nach „Sonstiges“); überall genutzt. Synchron über Tabelle `areas`: supabase/areas.sql in Supabase ausführen
- [x] Eigene Uhrzeit je Gewohnheit (Wunschliste Etappe 5): Feld `reminderTime`, Assistent-Schritt + Abschnitt beim Bearbeiten; Edge Function `remind` sendet nur wenn fällig und offen (Wochentage, X× pro Woche, Tagesziel, Mini), je Gewohnheit einmal pro Tag. Einmalig: supabase/push-habits.sql ausführen und Edge Function `remind` neu einfügen (docs/push-setup.md). Wunschliste damit komplett.
- [x] 90-Tage-Muster (Wunsch Etappe 1): Karte „x/90 Tage“ mit Info-Legende und Filter (Alle / einzelne Gewohnheit), 15×6 Kacheln, Bereichsfarbe; ersetzt die 12-Wochen-Heatmap
- [ ] Wunsch Niklas (2026-11-17), Etappe 2: „Bericht kopieren“ (Zeitraum Woche/30/90 Tage, Auftrag an Claude + Kennzahlen, Gewohnheiten, Ziele, Notizen) · Etappe 3: negative Gewohnheiten („Vermeiden“: Tage sauber, automatisch geschafft, „Rückfall melden“, Streak/XP nach Tagesende)
- [x] „Bericht kopieren“ (Wunsch Etappe 2): Karte in Statistik (7/30/90 Tage) und im Wochenrückblick (genau diese Woche); Text mit Auftrag an Claude, Gesamt, Gewohnheiten, Einheiten, Ziele, Wochennotizen, Insights; Vorschau, Kopieren in die Zwischenablage (nichts wird gesendet)
- [x] Negative Gewohnheiten (Wunsch Etappe 3): Art „Vermeiden“ (Assistent-Frage „Was möchtest du?“); saubere Tage zählen automatisch (lib/avoid.ts, nur Rückfälle werden gespeichert: CheckIn.slip), heute zählt für Streak/XP/Ziele erst am Folgetag; Heute-Karte mit „Tage sauber“ + „Rückfall“/„Rückgängig“; Nachtragen im 90-Tage-Muster; Auswertungen laufen über useCheckIns
- [~] Strava-Anbindung (Etappe 1 fertig): Edge Function `strava` (verbinden, abrufen, trennen), Tabellen strava_connection/strava_activities (supabase/strava.sql), Einstellungen → Strava, Zuordnung Strava-Art → Einheit (Einheit.stravaKinds), Einträge in km pro Tag mit source „strava“, Abruf beim Öffnen/per Knopf. Einrichtung: docs/strava-setup.md. Etappe 2: Auswertung (Wochenstrecke, Tempo, Herzfrequenz, Bericht)
- [x] Einheit „Schritte“ (Chip überall, nur Zahlenfeld ohne Plus/Minus, ganze Zahlen, Anzeige mit Tausenderpunkt 8.432; Eingabe manuell, kein Strava)
