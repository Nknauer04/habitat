import Dexie, { type EntityTable } from 'dexie'
import type { CheckIn, Goal, Habit } from './types'

export const db = new Dexie('habitat') as Dexie & {
  habits: EntityTable<Habit, 'id'>
  checkIns: EntityTable<CheckIn, 'id'>
  goals: EntityTable<Goal, 'id'>
  meta: EntityTable<{ key: string; value: string }, 'key'>
}

db.version(1).stores({
  habits: 'id, area, timeOfDay, archived, updatedAt',
  checkIns: 'id, habitId, date, [habitId+date], updatedAt',
  goals: 'id, done, updatedAt',
})

// Sync-Wasserzeichen (letzter Pull/Push je Tabelle)
db.version(2).stores({ meta: 'key' })

export const newId = () => crypto.randomUUID()
export const now = () => new Date().toISOString()

// Lokaler Tag als YYYY-MM-DD (nicht UTC!)
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Persistenten Speicher anfragen (iOS entscheidet nach Heuristik).
export const requestPersistentStorage = () =>
  navigator.storage?.persist?.().catch(() => false)
