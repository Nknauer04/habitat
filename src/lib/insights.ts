import { dayKey } from './db'
import { isCheckInDone, weekdayIndex } from './habits'
import { dayCredit } from './stats'
import type { CheckIn, Habit, TimeOfDay } from './types'

// Insights: wo hakt es? Basis sind die letzten 12 abgeschlossenen Wochen (ohne heute) und aktive
// Gewohnheiten, die täglich oder an bestimmten Wochentagen fällig sind ("X× pro Woche" ist ausgenommen).

export const WINDOW_DAYS = 84
export const MIN_DAYS = 21 // ab 3 Wochen Daten
const MIN_DUE_PER_WEEKDAY = 3
const WEAK_GAP = 20 // so viele Punkte unter dem Rest, damit ein Wochentag auffällt
const TIME_GAP = 10

const WEEKDAYS_ADV = ['montags', 'dienstags', 'mittwochs', 'donnerstags', 'freitags', 'samstags', 'sonntags']

export interface WeekdayStat {
  due: number
  credit: number
  rate: number | null // 0–100, null = zu wenig Daten
}

export interface HabitInsight {
  habit: Habit
  byWeekday: WeekdayStat[] // 7 Einträge, Montag zuerst
  overall: number | null
  weakest: { weekday: number; rate: number; rest: number } | null
  stable: boolean // alle Wochentage ≥ 80 %
}

export interface Insights {
  enoughData: boolean
  daysOfData: number
  habits: HabitInsight[]
  timeOfDay: Partial<Record<TimeOfDay, number>> // Quote je Tageszeit (0–100)
  breakDays: { weekday: number; count: number }[] // Serien-Enden je Wochentag, häufigste zuerst
  sentences: string[] // fertige Klartext-Sätze, wichtigste zuerst
}

const parse = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const shift = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function computeInsights(habits: Habit[], checkIns: CheckIn[], today: Date): Insights {
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

  const todayKey = dayKey(today)
  const windowStart = dayKey(shift(today, -WINDOW_DAYS))
  const yesterday = shift(today, -1)
  const breaks = new Array<number>(7).fill(0)
  const timeAgg: Partial<Record<TimeOfDay, { due: number; credit: number }>> = {}
  let earliest: string | null = null
  const result: HabitInsight[] = []

  for (const h of scored) {
    const created = dayKey(new Date(h.createdAt))
    const from = created > windowStart ? created : windowStart
    if (!earliest || from < earliest) earliest = from
    const stats: { due: number; credit: number }[] = Array.from({ length: 7 }, () => ({ due: 0, credit: 0 }))
    let prevDue: boolean | null = null // war der vorige fällige Tag erledigt?

    for (const d = parse(from); dayKey(d) <= dayKey(yesterday); d.setDate(d.getDate() + 1)) {
      const key = dayKey(d)
      const w = weekdayIndex(d)
      if (h.frequency.type === 'weekdays' && !h.frequency.days.includes(w)) continue
      const cis = byKey.get(`${h.id}|${key}`) ?? []
      const done = cis.some((c) => isCheckInDone(h, c))
      stats[w].due++
      stats[w].credit += dayCredit(h, cis)
      const agg = (timeAgg[h.timeOfDay] ??= { due: 0, credit: 0 })
      agg.due++
      agg.credit += dayCredit(h, cis)
      if (!done && prevDue === true) breaks[w]++ // Serie endet an diesem Tag
      prevDue = done
    }

    const byWeekday: WeekdayStat[] = stats.map((s) => ({
      ...s,
      rate: s.due >= MIN_DUE_PER_WEEKDAY ? Math.round((s.credit / s.due) * 100) : null,
    }))
    const totalDue = stats.reduce((a, s) => a + s.due, 0)
    const totalCredit = stats.reduce((a, s) => a + s.credit, 0)

    // Schwächster Wochentag im Vergleich zum Rest (gewichtet nach Anzahl fälliger Tage)
    let weakest: HabitInsight['weakest'] = null
    for (let w = 0; w < 7; w++) {
      const r = byWeekday[w].rate
      if (r === null) continue
      const restDue = totalDue - stats[w].due
      if (restDue < MIN_DUE_PER_WEEKDAY) continue
      const rest = Math.round(((totalCredit - stats[w].credit) / restDue) * 100)
      if (rest - r >= WEAK_GAP && (!weakest || rest - r > weakest.rest - weakest.rate)) weakest = { weekday: w, rate: r, rest }
    }
    const rates = byWeekday.map((s) => s.rate).filter((r): r is number => r !== null)
    result.push({
      habit: h,
      byWeekday,
      overall: totalDue ? Math.round((totalCredit / totalDue) * 100) : null,
      weakest,
      stable: rates.length >= 3 && rates.every((r) => r >= 80),
    })
  }

  const daysOfData = earliest ? Math.max(0, Math.round((parse(todayKey).getTime() - parse(earliest).getTime()) / 86_400_000)) : 0
  const enoughData = daysOfData >= MIN_DAYS && scored.length > 0

  const timeOfDay: Insights['timeOfDay'] = {}
  for (const t of ['morgen', 'abend', 'beliebig'] as const) {
    const a = timeAgg[t]
    if (a && a.due > 0) timeOfDay[t] = Math.round((a.credit / a.due) * 100)
  }

  const breakDays = breaks
    .map((count, weekday) => ({ weekday, count }))
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count)

  const sentences: string[] = []
  if (enoughData) {
    const top = breakDays[0]
    if (top && top.count >= 3 && top.count > (breakDays[1]?.count ?? 0))
      sentences.push(`Deine Serien enden am häufigsten ${WEEKDAYS_ADV[top.weekday]} (${top.count}×).`)
    for (const i of [...result].filter((x) => x.weakest).sort((a, b) => b.weakest!.rest - b.weakest!.rate - (a.weakest!.rest - a.weakest!.rate))) {
      const w = i.weakest!
      sentences.push(`${i.habit.name} klappt ${WEEKDAYS_ADV[w.weekday]} nur zu ${w.rate} % (sonst Ø ${w.rest} %).`)
    }
    const m = timeOfDay.morgen
    const a = timeOfDay.abend
    if (m !== undefined && a !== undefined && Math.abs(m - a) >= TIME_GAP)
      sentences.push(
        m > a
          ? `Morgen-Gewohnheiten gelingen dir zu ${m} %, Abend-Gewohnheiten nur zu ${a} %.`
          : `Abend-Gewohnheiten gelingen dir zu ${a} %, Morgen-Gewohnheiten nur zu ${m} %.`,
      )
    for (const i of result.filter((x) => x.stable)) sentences.push(`${i.habit.name} läuft an jedem Wochentag stabil (Ø ${i.overall} %).`)
  }

  return { enoughData, daysOfData, habits: result, timeOfDay, breakDays, sentences }
}
