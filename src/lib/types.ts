// Bereich = Schlüssel: 'sport' | 'lernen' | 'schlaf' | 'musik' | 'sonstiges' (Standard) oder die ID eines eigenen Bereichs (siehe lib/areas.ts)
export type Area = string
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
  kind?: 'avoid' // „Vermeiden“: Tage ohne Rückfall zählen automatisch; fehlt = normale Gewohnheit
  reminderTime?: string // eigene Erinnerung, HH:MM (Mitteilung nur wenn fällig und noch offen)
  unit?: string // Mengen-Gewohnheit: Einheit (min, h, Seiten …)
  dailyTarget?: number // Mengen-Gewohnheit: Tagesziel; Tag gilt ab diesem Wert als erledigt
  archived: boolean
  sortOrder?: number // eigene Reihenfolge in „Heute“ (kleiner = weiter oben)
  createdAt: string
}

export interface CheckIn extends Syncable {
  habitId: string
  date: string // YYYY-MM-DD (lokaler Tag)
  value?: number // optional für Mengen (Minuten, Stunden …)
  mini?: boolean
  slip?: boolean // Rückfall bei „Vermeiden“-Gewohnheiten (kein Haken, siehe lib/avoid.ts)
}

export interface GoalStep {
  id: string
  text: string
  done: boolean
}

// Strava-Aktivität (von der Edge Function geschrieben, hier nur gelesen; Tabelle strava_activities)
export interface StravaActivity extends Syncable {
  stravaId: number
  name: string
  type: string
  sportType: string
  date: string // lokaler Tag YYYY-MM-DD
  startDate: string
  distance: number // m
  movingTime: number // s
  elapsedTime: number // s
  elevation: number // m
  avgSpeed: number // m/s
  maxSpeed: number // m/s
  avgHr?: number // mittlere Herzfrequenz (nur mit Pulsmessung)
  maxHr?: number
}

// Bereich (synchron): überschreibt einen Standard-Bereich (key = 'sport' …) oder ist ein eigener Bereich (key = id)
export interface AreaRow extends Syncable {
  key: string
  name: string
  color: string // #rrggbb
  glyph: string // Icon-Name (siehe ItemIcon)
  hidden: boolean // nicht mehr zur Auswahl anbieten
  createdAt: string
}

// Etappenziel: Zwischenstand (kumuliert), optional bis zu einem Datum, z. B. 100 km bis 30.11.
export interface Milestone {
  id: string
  date?: string // YYYY-MM-DD, optional (ohne Datum nie überfällig)
  value: number // kumulativer Wert in der Einheit des Ziels
}

export interface Goal extends Syncable {
  title: string
  note?: string
  area: Area
  kind: 'steps' | 'count' | 'amount' // Teilschritte, Zählziel aus Gewohnheiten oder Menge aus Einheiten (z. B. 500 km)
  steps: GoalStep[] // kind = steps
  habitIds: string[] // kind = count
  target?: number // count: Anzahl Check-ins; amount: Soll in `unit`
  startDate?: string // count/amount: Zählen ab (YYYY-MM-DD)
  activityIds?: string[] // kind = amount: Einheiten, deren Ist-Werte das Ziel füllen
  unit?: string // kind = amount: Einheit des Ziels (aus den Einheiten übernommen)
  milestones?: Milestone[] // kind = amount: Etappenziele (optional)
  targetDate?: string // Frist (YYYY-MM-DD)
  done: boolean
  doneAt?: string // YYYY-MM-DD
  createdAt: string
}

// Einheit: etwas, das du tust (z. B. Laufen in km). Hat nur Ist-Werte, kein Soll – das Soll steckt im Ziel (kind = 'amount').
// Speicherung: Dexie-Tabelle `plans`, Supabase-Tabelle `plans` (Name stammt aus der ersten Version und bleibt, damit kein neues SQL nötig ist).
export interface Activity extends Syncable {
  name: string
  icon: string // Emoji
  area: Area
  unit: string // km, h, Seiten …
  sortOrder?: number // eigene Reihenfolge in „Heute“
  stravaKinds?: string[] // Strava-Arten ('run' | 'ride' | 'swim' | 'walk'), deren Strecke automatisch in diese Einheit zählt
  days?: number[] // Erinnerungs-Wochentage, 0 = Montag … 6 = Sonntag (optional; ohne Soll)
  createdAt: string
  // Altdaten der ersten Version („Plan“ mit Soll) – werden ignoriert
  schedule?: number[]
  target?: number
  startDate?: string
  targetDate?: string
}

// Ist-Wert einer Einheit an einem Tag (höchstens ein aktiver Eintrag je Einheit und Tag).
// Speicherung: Tabelle `planEntries` / Supabase `plan_entries`.
export interface ActivityEntry extends Syncable {
  planId: string // = Activity.id
  date: string // YYYY-MM-DD
  value: number // > 0
  source?: 'strava' // automatisch aus Strava; von Hand geändert = Feld fällt weg
}

// Wochenrückblick: eine Notiz pro Woche (weekStart = Montag, YYYY-MM-DD).
// Die id ist aus weekStart abgeleitet, damit zwei Geräte dieselbe Woche zusammenführen (siehe lib/review.ts).
export interface Review extends Syncable {
  weekStart: string
  note: string
}
