import { computeBadges, reachedBadges, type Badge } from './badges'
import { dayKey, db, now } from './db'
import { isCheckInDone, weekRange, weekdayIndex } from './habits'
import { computeProgress } from './progress'
import { computeDayScores, summarize, weeklyGoals, type DayScore, type WeeklyGoals } from './stats'
import type { CheckIn, Goal, Habit, Review } from './types'

const parse = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const shift = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export const weekStartOf = (d: Date) => weekRange(d)[0]
export const weekEndOf = (weekStart: string) => dayKey(shift(parse(weekStart), 6))
export const prevWeek = (weekStart: string) => dayKey(shift(parse(weekStart), -7))
export const nextWeek = (weekStart: string) => dayKey(shift(parse(weekStart), 7))

// Welche Woche gehört zum Rückblick? Sonntag: die laufende Woche, sonst die zuletzt beendete.
export function reviewWeekFor(today: Date): string {
  const current = weekStartOf(today)
  return weekdayIndex(today) === 6 ? current : prevWeek(current)
}

// Hinweis in „Heute“ nur am Sonntag und Montag.
export const isReviewDay = (today: Date) => weekdayIndex(today) === 6 || weekdayIndex(today) === 0

// Feste id je Woche: zwei Geräte, die dieselbe Woche notieren, laufen im Sync zusammen (Last write wins).
export const reviewId = (weekStart: string) => `${weekStart.replace(/-/g, '')}-0000-4000-8000-000000000000`

// ISO-Kalenderwoche für eine Woche, die am Montag beginnt.
export function isoWeek(weekStart: string): number {
  const thursday = shift(parse(weekStart), 3)
  const jan1 = new Date(thursday.getFullYear(), 0, 1)
  // round: Sommer-/Winterzeit verschiebt die Differenz um ±1 Stunde (sonst fällt die Woche um 1 zu klein aus)
  const dayOfYearIndex = Math.round((thursday.getTime() - jan1.getTime()) / 86_400_000)
  return Math.floor(dayOfYearIndex / 7) + 1
}

export async function saveReviewNote(weekStart: string, note: string) {
  const id = reviewId(weekStart)
  const existing = await db.reviews.get(id)
  const trimmed = note.trim()
  if (!existing && !trimmed) return // keine leere Notiz anlegen
  await db.reviews.put({ id, weekStart, note, deleted: false, updatedAt: now() })
}

// Goals "as of": ein Ziel zählt nur, wenn es bis zu diesem Tag abgeschlossen wurde.
const goalsAsOf = (goals: Goal[], key: string): Goal[] =>
  goals.map((g) => (g.done && g.doneAt && g.doneAt > key ? { ...g, done: false } : g))

export interface WeekSummary {
  weekStart: string
  weekEnd: string
  inProgress: boolean // Woche läuft noch (Sonntag)
  days: DayScore[]
  avg: number | null
  prevAvg: number | null
  delta: number | null
  best: DayScore | null
  checkins: number // erledigte Haken (voll + Mini) in dieser Woche
  xp: number // in dieser Woche verdiente XP
  weeklyGoals: WeeklyGoals
  newBadges: Badge[]
}

export function weekSummary(
  habits: Habit[],
  checkIns: CheckIn[],
  goals: Goal[],
  weekStart: string,
  today: Date,
): WeekSummary {
  const start = parse(weekStart)
  const weekEnd = weekEndOf(weekStart)
  const todayKey = dayKey(today)
  const last = weekEnd < todayKey ? parse(weekEnd) : today // nicht in die Zukunft rechnen
  const lastKey = dayKey(last)

  const days = start <= last ? computeDayScores(habits, checkIns, start, last) : []
  const prevStart = parse(prevWeek(weekStart))
  const prevDays = computeDayScores(habits, checkIns, prevStart, shift(prevStart, 6))
  const cur = summarize(days)
  const prev = summarize(prevDays)

  const habitById = new Map(habits.filter((h) => !h.deleted).map((h) => [h.id, h]))
  const checkins = checkIns.filter((c) => {
    if (c.deleted || c.date < weekStart || c.date > lastKey) return false
    const h = habitById.get(c.habitId)
    return !!h && isCheckInDone(h, c)
  }).length

  const dayBefore = shift(start, -1)
  const progressEnd = computeProgress(habits, checkIns, last, goalsAsOf(goals, lastKey))
  const progressBefore = computeProgress(habits, checkIns, dayBefore, goalsAsOf(goals, dayKey(dayBefore)))
  const before = new Set(reachedBadges(computeBadges(habits, progressBefore)).map((b) => b.id))
  const newBadges = reachedBadges(computeBadges(habits, progressEnd)).filter((b) => !before.has(b.id))

  return {
    weekStart,
    weekEnd,
    inProgress: weekEnd >= todayKey,
    days,
    avg: cur.avg,
    prevAvg: prev.avg,
    delta: cur.avg !== null && prev.avg !== null ? cur.avg - prev.avg : null,
    best: cur.best,
    checkins,
    xp: progressEnd.totalXp - progressBefore.totalXp,
    weeklyGoals: weeklyGoals(habits, checkIns, start, 'week'),
    newBadges,
  }
}

export type { Review }
