import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { dailyTips, type Tip } from './coach'
import { db } from './db'
import { computeInsights } from './insights'
import { useProgress } from './useProgress'

// Aktuelle Uhrzeit, minütlich und beim Zurückkehren zur App aktualisiert (der Abend-Tipp hängt von der Uhrzeit ab).
function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setNow(new Date())
    const id = setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  return now
}

export function useCoachTips(): Tip[] | null {
  const now = useNow()
  const habits = useLiveQuery(() => db.habits.filter((h) => !h.deleted).toArray(), [])
  const checks = useLiveQuery(() => db.checkIns.filter((c) => !c.deleted).toArray(), [])
  const goals = useLiveQuery(() => db.goals.filter((g) => !g.deleted).toArray(), [])
  const activityEntries = useLiveQuery(() => db.planEntries.filter((e) => !e.deleted).toArray(), [])
  const progress = useProgress(now)
  const minuteKey = Math.floor(now.getTime() / 60_000)

  return useMemo(() => {
    if (!habits || !checks || !goals || !activityEntries || !progress) return null
    return dailyTips({ habits, checkIns: checks, goals, activityEntries, progress, insights: computeInsights(habits, checks, now), today: now })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits, checks, goals, activityEntries, progress, minuteKey])
}
