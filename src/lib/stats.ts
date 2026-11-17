import { dayKey } from './db'
import { isCheckInDone, isFull, isMini, weekRange, weekdayIndex } from './habits'
import { areaKeys } from './areas'
import type { Area, CheckIn, Habit } from './types'

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

// ---------- Bereichs-Scores (Profil) ----------

export type ScoreMode = 'current' | 'start'

export interface AreaScore {
  area: Area
  rate: number | null // Ø Tages-Score der Gewohnheiten dieses Bereichs, 0–100
  days: number // Tage mit Score
}

const AREA_WINDOW = 30

// "current": die letzten 30 abgeschlossenen Tage. "start": die ersten 30 Tage seit Anlegen der
// ersten Gewohnheit des Bereichs. Heute zählt nie mit. Nur Bereiche mit täglich/Wochentage-Gewohnheiten.
export function areaScores(habits: Habit[], checkIns: CheckIn[], today: Date, mode: ScoreMode): AreaScore[] {
  const yesterday = shift(today, -1)
  const out: AreaScore[] = []
  for (const area of areaKeys()) {
    const hs = habits.filter(
      (h) => h.area === area && !h.deleted && !h.archived && (h.frequency.type === 'daily' || h.frequency.type === 'weekdays'),
    )
    if (!hs.length) continue
    let from: Date
    let to: Date
    if (mode === 'current') {
      to = yesterday
      from = shift(yesterday, -(AREA_WINDOW - 1))
    } else {
      const first = hs.map((h) => dayKey(new Date(h.createdAt))).sort()[0]
      from = parse(first)
      to = shift(from, AREA_WINDOW - 1)
      if (to > yesterday) to = yesterday
    }
    if (to < from) {
      out.push({ area, rate: null, days: 0 })
      continue
    }
    const s = summarize(computeDayScores(hs, checkIns, from, to))
    out.push({ area, rate: s.avg, days: s.days })
  }
  return out
}

// ---------- Konstanz (Statistik) ----------

export interface Consistency {
  rate: number | null // 0–100: Anteil der Tage mit mindestens einem erledigten Haken
  days: number // betrachtete Tage
  active: number // Tage mit Haken
}

// Letzte `windowDays` Tage inkl. heute, aber nicht vor Anlegen der ersten Gewohnheit.
// Voll und Mini zählen; ein Mengen-Teilwert unter dem Ziel zählt nicht.
export function consistency(habits: Habit[], checkIns: CheckIn[], today: Date, windowDays = 30): Consistency {
  const live = habits.filter((h) => !h.deleted)
  if (!live.length) return { rate: null, days: 0, active: 0 }
  const earliest = live.map((h) => dayKey(new Date(h.createdAt))).sort()[0]
  const windowStart = dayKey(shift(today, -(windowDays - 1)))
  const start = earliest > windowStart ? earliest : windowStart
  const todayKey = dayKey(today)
  if (start > todayKey) return { rate: null, days: 0, active: 0 }
  const days = Math.round((parse(todayKey).getTime() - parse(start).getTime()) / 86_400_000) + 1
  const byId = new Map(live.map((h) => [h.id, h]))
  const activeDays = new Set<string>()
  for (const c of checkIns) {
    if (c.deleted || c.date < start || c.date > todayKey) continue
    const h = byId.get(c.habitId)
    if (h && isCheckInDone(h, c)) activeDays.add(c.date)
  }
  return { rate: Math.round((activeDays.size / days) * 100), days, active: activeDays.size }
}
