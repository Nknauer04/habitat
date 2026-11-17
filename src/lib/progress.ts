import { dayKey } from './db'
import { weekRange, weekdayIndex } from './habits'
import type { Area, CheckIn, Habit } from './types'

// Alles wird aus den Check-ins berechnet (nichts gespeichert) → kein Sync-Konflikt.
export const XP_PER_CHECKIN = 10
export const STREAK_BONUS: Record<number, number> = { 7: 20, 30: 100, 66: 300 }
export const FREEZE_EVERY = 10 // alle 10 Streak-Tage ein Freeze
export const MAX_FREEZES = 3

export interface HabitProgress {
  streak: number
  longest: number
  freezes: number
  unit: 'Tage' | 'Wochen'
  xp: number
  rate: number | null // Erfolgsquote 0–1: letzte 30 Tage (Tage) bzw. letzte 4 volle Wochen (Wochen)
}

const isDueOn = (h: Habit, d: Date) =>
  h.frequency.type === 'daily' || (h.frequency.type === 'weekdays' && h.frequency.days.includes(weekdayIndex(d)))

// Quote der letzten 30 Tage: fällige Tage (plus freiwillig abgehakte); heute nur, wenn schon erledigt.
function dailyRate(h: Habit, dates: Set<string>, todayKey: string): number | null {
  const today = parse(todayKey)
  const created = dayKey(new Date(h.createdAt || Date.now()))
  let counted = 0
  let hits = 0
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const k = dayKey(d)
    if (k < created) continue
    const done = dates.has(k)
    if (done || (isDueOn(h, d) && k < todayKey)) {
      counted++
      if (done) hits++
    }
  }
  return counted ? hits / counted : null
}

// Quote: Wochen mit erreichtem Ziel unter den letzten 4 vollen Wochen.
function weeklyRate(h: Habit, target: number, perWeek: Map<string, number>, today: Date): number | null {
  const currentStart = parse(weekRange(today)[0])
  const createdWeek = weekRange(new Date(h.createdAt || Date.now()))[0]
  let counted = 0
  let hits = 0
  for (let i = 4; i >= 1; i--) {
    const d = new Date(currentStart)
    d.setDate(currentStart.getDate() - 7 * i)
    const k = dayKey(d)
    if (k < createdWeek) continue
    counted++
    if ((perWeek.get(k) ?? 0) >= target) hits++
  }
  return counted ? hits / counted : null
}

const parse = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Täglich / bestimmte Wochentage: nur fällige Tage zählen, andere unterbrechen nicht.
function dailyProgress(h: Habit, dates: Set<string>, todayKey: string): HabitProgress {
  let streak = 0
  let longest = 0
  let freezes = 0
  let xp = 0
  const sorted = [...dates].sort()
  if (sorted.length) {
    for (const d = parse(sorted[0]); dayKey(d) <= todayKey; d.setDate(d.getDate() + 1)) {
      const k = dayKey(d)
      if (dates.has(k)) {
        streak++
        longest = Math.max(longest, streak)
        xp += XP_PER_CHECKIN + (STREAK_BONUS[streak] ?? 0)
        if (streak % FREEZE_EVERY === 0) freezes = Math.min(MAX_FREEZES, freezes + 1)
      } else if (k < todayKey && isDueOn(h, d)) {
        if (freezes > 0) freezes--
        else streak = 0
      }
    }
  }
  return { streak, longest, freezes, unit: 'Tage', xp, rate: dailyRate(h, dates, todayKey) }
}

// X× pro Woche: Streak zählt Wochen, in denen das Ziel erreicht wurde (keine Freezes).
function weeklyProgress(h: Habit, target: number, dates: Set<string>, today: Date): HabitProgress {
  const perWeek = new Map<string, number>()
  for (const k of dates) {
    const ws = weekRange(parse(k))[0]
    perWeek.set(ws, (perWeek.get(ws) ?? 0) + 1)
  }
  let streak = 0
  let longest = 0
  const sorted = [...perWeek.keys()].sort()
  const currentWeek = weekRange(today)[0]
  if (sorted.length) {
    for (const d = parse(sorted[0]); dayKey(d) <= currentWeek; d.setDate(d.getDate() + 7)) {
      const k = dayKey(d)
      if ((perWeek.get(k) ?? 0) >= target) {
        streak++
        longest = Math.max(longest, streak)
      } else if (k < currentWeek) streak = 0
    }
  }
  return {
    streak,
    longest,
    freezes: 0,
    unit: 'Wochen',
    xp: dates.size * XP_PER_CHECKIN,
    rate: weeklyRate(h, target, perWeek, today),
  }
}

export function levelFor(xp: number) {
  let level = 1
  while (xp >= 50 * (level + 1) * level) level++
  const base = 50 * level * (level - 1)
  const next = 50 * (level + 1) * level
  return { level, into: xp - base, needed: next - base }
}

const TITLES: Record<Area, string[]> = {
  sport: ['Starter', 'Aktiv', 'Athlet', 'Champion', 'Legende'],
  lernen: ['Neugierig', 'Schüler', 'Gelehrter', 'Experte', 'Meister'],
  schlaf: ['Nachteule', 'Ausgeruht', 'Schlafprofi', 'Erholungsprofi', 'Traumwandler'],
  musik: ['Hobbyist', 'Musiker', 'Producer', 'Hitmaker', 'Maestro'],
  sonstiges: ['Starter', 'Dranbleiber', 'Profi', 'Meister', 'Legende'],
}
const TIER_FROM_LEVEL = [1, 3, 5, 8, 12]

export function areaTitle(area: Area, level: number) {
  let tier = 0
  TIER_FROM_LEVEL.forEach((l, i) => level >= l && (tier = i))
  return TITLES[area][tier]
}

export interface Progress {
  byHabit: Map<string, HabitProgress>
  areaXp: Partial<Record<Area, number>>
  totalXp: number
}

export function computeProgress(habits: Habit[], checkIns: CheckIn[], today: Date): Progress {
  const todayKey = dayKey(today)
  const datesByHabit = new Map<string, Set<string>>()
  for (const c of checkIns) {
    if (c.deleted || c.date > todayKey) continue
    if (!datesByHabit.has(c.habitId)) datesByHabit.set(c.habitId, new Set())
    datesByHabit.get(c.habitId)!.add(c.date)
  }

  const byHabit = new Map<string, HabitProgress>()
  const areaXp: Partial<Record<Area, number>> = {}
  let totalXp = 0
  for (const h of habits) {
    if (h.deleted) continue
    const dates = datesByHabit.get(h.id) ?? new Set<string>()
    const p =
      h.frequency.type === 'perWeek'
        ? weeklyProgress(h, h.frequency.count, dates, today)
        : dailyProgress(h, dates, todayKey)
    byHabit.set(h.id, p)
    areaXp[h.area] = (areaXp[h.area] ?? 0) + p.xp
    totalXp += p.xp
  }
  return { byHabit, areaXp, totalXp }
}
