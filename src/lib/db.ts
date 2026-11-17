import Dexie, { type EntityTable } from 'dexie'
import type { Activity, ActivityEntry, AreaRow, CheckIn, Goal, Habit, Review } from './types'

export const db = new Dexie('habitat') as Dexie & {
  habits: EntityTable<Habit, 'id'>
  checkIns: EntityTable<CheckIn, 'id'>
  goals: EntityTable<Goal, 'id'>
  reviews: EntityTable<Review, 'id'>
  plans: EntityTable<Activity, 'id'> // Einheiten (Name aus der ersten Version)
  planEntries: EntityTable<ActivityEntry, 'id'> // Ist-Werte der Einheiten
  areas: EntityTable<AreaRow, 'id'>
  meta: EntityTable<{ key: string; value: string }, 'key'>
}

db.version(1).stores({
  habits: 'id, area, timeOfDay, archived, updatedAt',
  checkIns: 'id, habitId, date, [habitId+date], updatedAt',
  goals: 'id, done, updatedAt',
})

// Sync-Wasserzeichen (letzter Pull/Push je Tabelle)
db.version(2).stores({ meta: 'key' })

// Wochenrückblick-Notizen
db.version(3).stores({ reviews: 'id, weekStart, updatedAt' })

// Einheiten (Tabelle heißt plans) und ihre Ist-Einträge
db.version(4).stores({
  plans: 'id, updatedAt',
  planEntries: 'id, planId, date, [planId+date], updatedAt',
})

// Eigene Bereiche und Überschreibungen der Standard-Bereiche
db.version(5).stores({ areas: 'id, key, updatedAt' })

export const newId = () => crypto.randomUUID()
export const now = () => new Date().toISOString()

// Lokaler Tag als YYYY-MM-DD (nicht UTC!)
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Persistenten Speicher anfragen (iOS entscheidet nach Heuristik).
export const requestPersistentStorage = () =>
  navigator.storage?.persist?.().catch(() => false)
