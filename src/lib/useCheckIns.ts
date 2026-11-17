import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { withCleanDays } from './avoid'
import { dayKey, db } from './db'
import type { CheckIn } from './types'
import { useToday } from './useToday'

// Check-ins für Auswertungen: gespeicherte Haken plus berechnete saubere Tage der „Vermeiden“-Gewohnheiten (ohne Rückfälle)
export function useCheckIns(): CheckIn[] | undefined {
  const today = useToday()
  const todayKey = dayKey(today)
  const habits = useLiveQuery(() => db.habits.filter((h) => !h.deleted).toArray(), [])
  const raw = useLiveQuery(() => db.checkIns.filter((c) => !c.deleted).toArray(), [])
  return useMemo(() => (habits && raw ? withCleanDays(habits, raw, todayKey) : undefined), [habits, raw, todayKey])
}
