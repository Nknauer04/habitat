# Recherche (Phase 0)

Stand: 2026-11-17 · 8 Suchen. Vieles stammt aus Blogs/Aggregatoren → Zahlen als „unbestätigt“ behandeln.

## Pattrn (Vorbild)
- Minimalistischer Habit-/Ziel-Tracker (iOS), Fokus auf Klarheit statt Spielerei; Lockscreen-Widgets, SMART-Ziele, „Focus Score“, AI-Coach, Abo-pflichtig. Quellen widersprüchlich/auto-generiert.
- Zielgruppe: Selbstoptimierer (Creator, Athleten). → Wenig Chrome, schnelle Eingabe, Tages-Score statt nur Häkchen.
- [App Store](https://apps.apple.com/us/app/-/id6740924171) · [AlternativeTo](https://alternativeto.net/software/pattrn/about/) · [saasbrowser](https://saasbrowser.com/en/saas/1164818/pattrn-habit-goal-and-productivity-ai-tracker)

## Gewohnheitsbildung (Forschung)
- Lally et al. 2010: Ø **66 Tage** bis Automatismus (Spanne 18–254). **Ein verpasster Tag schadet kaum**; sehr viele Lücken senken aber das Endniveau. („Egal“ wäre überzogen.)
  → [BPS Research Digest](https://bps.org.uk/research-digest/how-form-habit) · [PsyBlog](https://www.spring.org.uk/2023/01/form-a-habit.php)
- Konsistenter **Kontext** (gleiche Zeit/Ort/Auslöser) zählt mehr als eine lückenlose Zahl.
- Selbstmonitoring erhöht Zielerreichung (Harkin et al. 2016, nur sekundär zitiert).
- Atomic Habits: **Implementation Intention** („Ich mache X um Y an Ort Z“), **Habit Stacking** („Nach A mache ich B“), **2-Minuten-Regel** (Mini-Version zum Starten), **„Nie zweimal auslassen“**. Der „2–3× wahrscheinlicher“-Wert ist unbestätigt (Quelle: Gollwitzer prüfen).
  → [Zusammenfassung](https://habi.app/insights/atomic-habits-summary/) · [Two-day rule](https://goalsandprogress.com/two-day-rule-habit-recovery/)

## Streaks & Gamification
- Streaks motivieren, v. a. wenn man sich selbst verantwortlich fühlt; **gebrochene Streaks demotivieren** („What-the-hell“-Effekt). [INSEAD](https://knowledge.insead.edu/marketing/consumer-streaks-are-motivating-key-keeping-them-alive)
- Extrinsische Belohnungen (Punkte/Badges) können intrinsische Motivation untergraben; Gamification hilft nur, wenn sie die Gewohnheit selbst verstärkt. [DEV: Gamification alone](https://dev.to/eastkap/why-gamification-alone-doesnt-build-habits-and-what-does-2fj0)
- Habitica: sofortige Belohnung (XP/Gold) nach Abhaken; Level-Titel an **Identität** koppeln wirkt stärker als reine Zahlen. [Uxcel](https://app.uxcel.com/courses/gamification-in-design-context/best-industry-examples-of-gamification-787/habitica-habits-tracking-6449) · [Review](https://www.choosingtherapy.com/habitica-app-review/)
- Verzeihende Mechaniken: **Streak-Freeze** (z. B. 1 pro Woche oder alle 7 Tage eins verdienen, max. 3), Leben/Herzen, Wochenziele („3×/Woche“), **Score statt Streak** (Häufigkeit der letzten Wochen). [Beispiele](https://goalsandprogress.com/habit-tracker-trigger-action-reward-two-day-rule/)
- Keine belastbare Evidenz zu Freezes/What-the-hell gefunden → Designentscheidung, keine Studienlage.

## PWA auf iOS
- **Web-Push nur ab iOS 16.4 und nur aus der Home-Screen-App**, nicht im Safari-Tab; Badging-API (App-Icon-Zahl) kam mit 16.4. Kein Install-Prompt → manuell über Teilen-Menü. [MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) · [Pushpad](https://pushpad.xyz/blog/ios-special-requirements-for-web-push-notifications)
- Zuverlässigkeit von Push/Zeitpunkt auf iOS eher mittel; Erinnerungen exakt „um 07:30“ nicht garantiert. (unbestätigt, beim Bauen testen)
- Speicher: Der 7-Tage-Löschzyklus gilt für **Safari-Tabs**, **nicht für Home-Screen-Apps**; `navigator.storage.persist()` anfragen. → Supabase bleibt Wahrheit, IndexedDB nur Cache. [WebKit Storage Policy](https://webkit.org/?p=14403) · [Apple Forum](https://developer.apple.com/forums/thread/710157)
- Einzelquellen zu iOS 26 / Declarative Web Push / EU-Verhalten **nicht verifiziert** (EU-Thema für mich irrelevant, außer du bist in der EU – ggf. prüfen).
- Mac: Safari „Zum Dock hinzufügen“ unterstützt PWAs und Web-Push (macOS 13+; nicht separat recherchiert).

## Folgerungen für die App
1. Eingabe in ≤ 2 Taps, Heute-Ansicht ist der Kern (morgens/abends Routinen).
2. Streak **mit** Verzeihung (Freeze/Wochenziel) statt harter Null-Setzung; „nie zweimal“-Hinweis.
3. Level/XP an Identität koppeln („Athlet“, „Producer“), nicht nur Zahlen.
4. Habit-Stacking/Zeitfenster (Morgen/Abend) als Struktur statt freier Uhrzeiten.
5. Erinnerungen: Push als Bonus, App muss ohne funktionieren.
