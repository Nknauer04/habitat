import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { dayKey, db } from './db'
import { computeProgress } from './progress'

export function useProgress(today: Date) {
  const habits = useLiveQuery(() => db.habits.filter((h) => !h.deleted).toArray(), [])
  const checks = useLiveQuery(() => db.checkIns.filter((c) => !c.deleted).toArray(), [])
  const key = dayKey(today)
  return useMemo(() => (habits && checks ? computeProgress(habits, checks, today) : null), [habits, checks, key])
}
