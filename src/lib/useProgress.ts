import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { dayKey, db } from './db'
import { computeProgress } from './progress'

export function useProgress(today: Date) {
  const habits = useLiveQuery(() => db.habits.filter((h) => !h.deleted).toArray(), [])
  const checks = useLiveQuery(() => db.checkIns.filter((c) => !c.deleted).toArray(), [])
  const goals = useLiveQuery(() => db.goals.filter((g) => !g.deleted).toArray(), [])
  const key = dayKey(today)
  return useMemo(
    () => (habits && checks && goals ? computeProgress(habits, checks, today, goals) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [habits, checks, goals, key],
  )
}
