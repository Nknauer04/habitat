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
  archived: boolean
  createdAt: string
}

export interface CheckIn extends Syncable {
  habitId: string
  date: string // YYYY-MM-DD (lokaler Tag)
  value?: number // optional für Mengen (Minuten, Stunden …)
  mini?: boolean
}

export interface Goal extends Syncable {
  title: string
  note?: string
  targetDate?: string // YYYY-MM-DD
  habitIds: string[]
  done: boolean
  createdAt: string
}
