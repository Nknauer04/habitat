import { dayKey } from './db'
import { isCheckInDone, isFull, isMini, weekRange, weekdayIndex } from './habits'
import type { CheckIn, Habit } from './types'

// Tages-Score = Summe der Anteile erledigter Fälligkeiten / Anzahl fälliger Gewohnheiten (0–100 %).
// Voll = 1, Mini = 0,5, Teilwert bei Mengen = Wert / Tagesziel. Es zählen aktive Gewohnheiten
// (täglich oder bestimmte Wochentage), die an dem Tag schon existierten. "X× pro Woche" fließt nicht ein.

export interface DayScore {
  date: string
  score: number | null // null = nichts fällig
  due: number
}

const parse = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const MINI_CREDIT = 0.5

// Anteil (0–1), den eine Gewohnheit an einem Tag erfüllt hat; cis = Check-ins dieser Gewohnheit an dem Tag.
export function dayCredit(h: Habit, cis: CheckIn[]): number {
  const active = cis.filter((c) => !c.deleted)
  if (active.some((c) => isFull(h, c))) return 1
  let credit = 0
  if (active.some((c) => isMini(h, c))) credit = MINI_CREDIT
  if (h.dailyTarget) {
    const sum = active.reduce((s, c) => s + (c.value ?? 0), 0)
    credit = Math.max(credit, Math.min(0.99, sum / h.dailyTarget))
  }
  return credit
}

export function computeDayScores(habits: Habit[], checkIns: CheckIn[], from: Date, to: Date): DayScore[] {
  const scored = habits.filter(
    (h) => !h.deleted && !h.archived && (h.frequency.type === 'daily' || h.frequency.type === 'weekdays'),
  )
  const byKey = new Map<string, CheckIn[]>()
  for (const c of checkIns) {
    if (c.deleted) continue
    const k = `${c.habitId}|${c.date}`
    if (!byKey.has(k)) byKey.set(k, [])
    byKey.get(k)!.push(c)
  }

  const result: DayScore[] = []
  for (const d = new Date(from); dayKey(d) <= dayKey(to); d.setDate(d.getDate() + 1)) {
    const key = dayKey(d)
    let due = 0
    let credit = 0
    for (const h of scored) {
      if (dayKey(new Date(h.createdAt)) > key) continue
      const f = h.frequency
      if (f.type === 'weekdays' && !f.days.includes(weekdayIndex(d))) continue
      due++
      credit += dayCredit(h, byKey.get(`${h.id}|${key}`) ?? [])
    }
    result.push({ date: key, due, score: due ? Math.round((credit / due) * 100) : null })
  }
  return result
}

export interface Summary {
  avg: number | null
  best: DayScore | null
  days: number // Tage mit Score
}

export function summarize(scores: DayScore[]): Summary {
  const valid = scores.filter((s) => s.score !== null)
  if (!valid.length) return { avg: null, best: null, days: 0 }
  const avg = valid.reduce((s, x) => s + x.score!, 0) / valid.length
  // Bester Tag; bei Gleichstand der jüngste
  const best = valid.reduce((b, x) => (x.score! >= b.score! ? x : b))
  return { avg: Math.round(avg), best, days: valid.length }
}

export interface Stats {
  days: DayScore[] // letzte n Tage inkl. heute (für das Diagramm)
  current: Summary // letzte n abgeschlossene Tage (ohne heute)
  previous: Summary // die n abgeschlossenen Tage davor
  delta: number | null // Punkte: current.avg - previous.avg
}

const shift = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function computeStats(habits: Habit[], checkIns: CheckIn[], today: Date, n: number): Stats {
  const all = computeDayScores(habits, checkIns, shift(today, -(2 * n)), today)
  const todayKey = dayKey(today)
  const inRange = (from: number, to: number) => {
    const a = dayKey(shift(today, from))
    const b = dayKey(shift(today, to))
    return all.filter((s) => s.date >= a && s.date <= b)
  }
  const current = summarize(inRange(-n, -1))
  const previous = summarize(inRange(-2 * n, -n - 1))
  return {
    days: all.filter((s) => s.date >= dayKey(shift(today, -(n - 1))) && s.date <= todayKey),
    current,
    previous,
    delta: current.avg !== null && previous.avg !== null ? current.avg - previous.avg : null,
  }
}

export interface WeeklyGoals {
  reached: number
  total: number
}

// mode "week": aktuelle Woche (läuft noch); "month": die letzten 4 vollen Wochen.
export function weeklyGoals(habits: Habit[], checkIns: CheckIn[], today: Date, mode: 'week' | 'month'): WeeklyGoals {
  const goals = habits.filter((h) => !h.deleted && !h.archived && h.frequency.type === 'perWeek')
  const currentStart = parse(weekRange(today)[0])
  const offsets = mode === 'week' ? [0] : [-28, -21, -14, -7]
  let reached = 0
  let total = 0
  for (const h of goals) {
    if (h.frequency.type !== 'perWeek') continue
    const target = h.frequency.count
    const createdWeek = weekRange(new Date(h.createdAt))[0]
    for (const off of offsets) {
      const start = shift(currentStart, off)
      const [ws, we] = weekRange(start)
      if (ws < createdWeek) continue
      const days = new Set(
        checkIns.filter((c) => c.habitId === h.id && c.date >= ws && c.date <= we && isCheckInDone(h, c)).map((c) => c.date),
      )
      total++
      if (days.size >= target) reached++
    }
  }
  return { reached, total }
}
