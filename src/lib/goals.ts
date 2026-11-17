import { dayKey, db, newId, now } from './db'
import { entriesSum } from './activities'
import { isCheckInDone } from './habits'
import type { ActivityEntry, CheckIn, Goal, Habit, Milestone } from './types'

export type GoalInput = Pick<
  Goal,
  | 'title'
  | 'note'
  | 'area'
  | 'kind'
  | 'steps'
  | 'habitIds'
  | 'target'
  | 'startDate'
  | 'targetDate'
  | 'activityIds'
  | 'unit'
  | 'milestones'
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

// Teilschritte, Zählziel (verschiedene (Gewohnheit, Tag)-Check-ins ab startDate bis heute) oder Menge (Summe der Ist-Werte der Einheiten ab startDate).
export function goalProgress(
  g: Goal,
  checkIns: CheckIn[],
  todayKey: string,
  habits: Habit[] = [],
  entries: ActivityEntry[] = [],
): GoalProgress {
  const habitById = new Map(habits.map((h) => [h.id, h]))
  let value = 0
  let total = 0
  if (g.kind === 'steps') {
    value = g.steps.filter((s) => s.done).length
    total = g.steps.length
  } else if (g.kind === 'amount') {
    value = entriesSum(entries, g.activityIds ?? [], g.startDate ?? '', todayKey)
    total = g.target ?? 0
  } else {
    const seen = new Set<string>()
    for (const c of checkIns) {
      if (c.deleted || !g.habitIds.includes(c.habitId)) continue
      const habit = habitById.get(c.habitId)
      if (habit && !isCheckInDone(habit, c)) continue
      if (c.date < (g.startDate ?? '') || c.date > todayKey) continue
      seen.add(`${c.habitId}|${c.date}`)
    }
    value = seen.size
    total = g.target ?? 0
  }
  return { value, total, ratio: total > 0 ? Math.min(1, value / total) : 0 }
}

// Trend: liegt der Fortschritt vor oder hinter dem Zeitplan bis zur Frist? Ohne Frist: kein Trend.
export type GoalTrend = 'ahead' | 'behind' | 'none'

const utcDay = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

// Etappenziele eines Mengen-Ziels: erreicht, überfällig (Datum vorbei, Wert fehlt) oder noch offen; nach Datum sortiert.
export interface MilestoneState {
  m: Milestone
  reached: boolean
  overdue: boolean
}

export function milestoneStates(g: Goal, value: number, todayKey: string): MilestoneState[] {
  if (g.kind !== 'amount') return []
  return [...(g.milestones ?? [])]
    .sort((a, b) => a.date.localeCompare(b.date) || a.value - b.value)
    .map((m) => {
      const reached = value + 1e-9 >= m.value
      return { m, reached, overdue: !reached && m.date < todayKey }
    })
}

// Nächste offene Etappe (die früheste, die noch nicht erreicht ist)
export const nextMilestone = (states: MilestoneState[]) => states.find((s) => !s.reached) ?? null

export function goalTrend(g: Goal, ratio: number, todayKey: string): GoalTrend {
  if (g.done) return 'none'
  // Mengen-Ziel mit Etappen: überfällige Etappe = Rückstand, sonst auf Kurs
  if (g.kind === 'amount' && g.milestones?.length) {
    const states = milestoneStates(g, ratio * (g.target ?? 0), todayKey)
    return states.some((s) => s.overdue) ? 'behind' : 'ahead'
  }
  if (!g.targetDate) return 'none'
  const start = g.kind !== 'steps' && g.startDate ? g.startDate : dayKey(new Date(g.createdAt))
  const total = (utcDay(g.targetDate) - utcDay(start)) / 86_400_000
  const elapsed = (utcDay(todayKey) - utcDay(start)) / 86_400_000
  if (total <= 0 || elapsed <= 0) return 'none'
  const expected = Math.min(1, elapsed / total)
  return ratio + 1e-9 >= expected ? 'ahead' : 'behind'
}
