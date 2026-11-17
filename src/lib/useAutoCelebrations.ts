import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { celebrate, highestSeenLevel, readSeen, reachedMilestones, writeSeen } from './celebrate'
import { dayKey, db } from './db'
import { levelFor } from './progress'
import { useProgress } from './useProgress'
import { useToday } from './useToday'

const fmtDate = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
const fmtQty = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',')

// Feiert neue Level und Etappen auf jeder Seite. Beim allerersten Start auf einem Gerät gilt alles Bestehende als schon gefeiert.
export function useAutoCelebrations() {
  const today = useToday()
  const progress = useProgress(today)
  const goals = useLiveQuery(() => db.goals.filter((g) => !g.deleted).toArray(), [])
  const entries = useLiveQuery(() => db.planEntries.filter((e) => !e.deleted).toArray(), [])

  useEffect(() => {
    if (!progress || !goals || !entries) return
    const reached = reachedMilestones(goals, entries, dayKey(today))
    const level = levelFor(progress.totalXp).level
    const seen = readSeen()
    if (seen === null) {
      writeSeen(new Set([...reached.map((r) => r.key), `level:${level}`]))
      return
    }
    let changed = false
    for (const r of reached) {
      if (seen.has(r.key)) continue
      seen.add(r.key)
      changed = true
      const unit = r.goal.unit ? ` ${r.goal.unit}` : ''
      celebrate({ id: r.key, title: 'Etappe geschafft!', text: `${r.goal.title}: ${fmtQty(r.m.value)}${unit} bis ${fmtDate(r.m.date)}`, glyph: 'flag', color: '#2b6bff' })
    }
    if (level > highestSeenLevel(seen) && !seen.has(`level:${level}`)) {
      seen.add(`level:${level}`)
      changed = true
      celebrate({ id: `level:${level}`, title: `Level ${level}!`, text: 'Neues Level erreicht – weiter so.', glyph: 'star', color: '#facc15' })
    }
    if (changed) writeSeen(seen)
  }, [progress, goals, entries, today])
}
