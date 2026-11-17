import { dayKey, db, newId, now } from './db'
import type { CheckIn, Goal } from './types'

export type GoalInput = Pick<
  Goal,
  'title' | 'note' | 'area' | 'kind' | 'steps' | 'habitIds' | 'target' | 'startDate' | 'targetDate'
>

export async function saveGoal(input: GoalInput, id?: string) {
  const t = now()
  if (id) await db.goals.update(id, { ...input, updatedAt: t })
  else await db.goals.add({ ...input, id: newId(), done: false, deleted: false, createdAt: t, updatedAt: t })
}

export const deleteGoal = (id: string) => db.goals.update(id, { deleted: true, updatedAt: now() })
export const completeGoal = (id: string) => db.goals.update(id, { done: true, doneAt: dayKey(), updatedAt: now() })
export const reopenGoal = (id: string) => db.goals.update(id, { done: false, doneAt: undefined, updatedAt: now() })

// Liest den aktuellen Stand in der Transaktion, damit schnelle Taps keine Änderung überschreiben.
export const toggleStep = (goalId: string, stepId: string) =>
  db.transaction('rw', db.goals, async () => {
    const g = await db.goals.get(goalId)
    if (!g) return
    await db.goals.update(goalId, {
      steps: g.steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s)),
      updatedAt: now(),
    })
  })

export interface GoalProgress {
  value: number
  total: number
  ratio: number // 0–1
}

// Zählziel: verschiedene (Gewohnheit, Tag)-Check-ins ab startDate bis heute.
export function goalProgress(g: Goal, checkIns: CheckIn[], todayKey: string): GoalProgress {
  let value = 0
  let total = 0
  if (g.kind === 'steps') {
    value = g.steps.filter((s) => s.done).length
    total = g.steps.length
  } else {
    const seen = new Set<string>()
    for (const c of checkIns) {
      if (c.deleted || !g.habitIds.includes(c.habitId)) continue
      if (c.date < (g.startDate ?? '') || c.date > todayKey) continue
      seen.add(`${c.habitId}|${c.date}`)
    }
    value = seen.size
    total = g.target ?? 0
  }
  return { value, total, ratio: total > 0 ? Math.min(1, value / total) : 0 }
}
