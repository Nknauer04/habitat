import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { dayKey, db } from './db'
import { computeProgress } from './progress'

export function useProgress(today: Date) {
  const habits = useLiveQuery(() => db.habits.filter((h) => !h.deleted).toArray(), [])
  const checks = useLiveQuery(() => db.checkIns.filter((c) => !c.deleted).toArray(), [])
  const goals = useLiveQuery(() => db.goals.filter((g) => !g.deleted).toArray(), [])
  const plans = useLiveQuery(() => db.plans.filter((p) => !p.deleted).toArray(), [])
  const planEntries = useLiveQuery(() => db.planEntries.filter((e) => !e.deleted).toArray(), [])
  const key = dayKey(today)
  return useMemo(
    () => (habits && checks && goals && plans && planEntries
        ? computeProgress(habits, checks, today, goals, { plans, entries: planEntries })
        : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [habits, checks, goals, plans, planEntries, key],
  )
}
