export type Area = 'sport' | 'lernen' | 'schlaf' | 'musik' | 'sonstiges'
export type TimeOfDay = 'morgen' | 'abend' | 'beliebig'

export type Frequency =
  | { type: 'daily' }
  | { type: 'weekdays'; days: number[] } // 0 = Montag … 6 = Sonntag
  | { type: 'perWeek'; count: number }

// Gemeinsame Sync-Felder: "last write wins" über updatedAt, Löschen als Soft-Delete.
export interface Syncable {
  id: string // UUID, clientseitig erzeugt
  updatedAt: string // ISO-Zeitstempel
  deleted: boolean
}

export interface Habit extends Syncable {
  name: string
  icon: string // Emoji
  area: Area
  timeOfDay: TimeOfDay
  frequency: Frequency
  miniVersion?: string // 2-Minuten-Variante für schlechte Tage
  unit?: string // Mengen-Gewohnheit: Einheit (min, h, Seiten …)
  dailyTarget?: number // Mengen-Gewohnheit: Tagesziel; Tag gilt ab diesem Wert als erledigt
  archived: boolean
  createdAt: string
}

export interface CheckIn extends Syncable {
  habitId: string
  date: string // YYYY-MM-DD (lokaler Tag)
  value?: number // optional für Mengen (Minuten, Stunden …)
  mini?: boolean
}

export interface GoalStep {
  id: string
  text: string
  done: boolean
}

export interface Goal extends Syncable {
  title: string
  note?: string
  area: Area
  kind: 'steps' | 'count' // Teilschritte-Checkliste oder Zählziel aus Gewohnheiten
  steps: GoalStep[] // kind = steps
  habitIds: string[] // kind = count
  target?: number // kind = count: Anzahl Check-ins
  startDate?: string // kind = count: Zählen ab (YYYY-MM-DD)
  targetDate?: string // Frist (YYYY-MM-DD)
  done: boolean
  doneAt?: string // YYYY-MM-DD
  createdAt: string
}

// Plan: Wochenplan mit Soll je Wochentag und Gesamtziel (z. B. 100 km laufen). Eingetragen wird der Ist-Wert je Tag.
export interface Plan extends Syncable {
  name: string
  icon: string // Emoji
  area: Area
  unit: string // km, h, Seiten …
  target: number // Gesamtziel in Einheiten
  startDate: string // Zählen ab (YYYY-MM-DD)
  targetDate?: string // Frist (YYYY-MM-DD)
  schedule: number[] // Soll je Wochentag, Index 0 = Montag … 6 = Sonntag; 0 = frei
  createdAt: string
}

// Ist-Wert eines Plans an einem Tag (höchstens ein aktiver Eintrag je Plan und Tag).
export interface PlanEntry extends Syncable {
  planId: string
  date: string // YYYY-MM-DD
  value: number // > 0
}

// Wochenrückblick: eine Notiz pro Woche (weekStart = Montag, YYYY-MM-DD).
// Die id ist aus weekStart abgeleitet, damit zwei Geräte dieselbe Woche zusammenführen (siehe lib/review.ts).
export interface Review extends Syncable {
  weekStart: string
  note: string
}
