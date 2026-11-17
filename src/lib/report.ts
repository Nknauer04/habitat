import { areaLabel } from './areas'
import { dayKey } from './db'
import { goalProgress, goalTrend, milestoneStates } from './goals'
import { WEEKDAYS, fmtQty, isMini, weekRange } from './habits'
import { computeInsights } from './insights'
import { computeProgress, levelFor, type Progress } from './progress'
import { isoWeek } from './review'
import { computeDayScores, dayCredit, summarize } from './stats'
import type { Activity, ActivityEntry, CheckIn, Goal, Habit, Review } from './types'

// „Bericht kopieren“: ein Textbericht für die Claude-App (oder zum Lesen). Entsteht komplett auf dem Gerät.
export interface ReportInput {
  habits: Habit[]
  checkIns: CheckIn[]
  goals: Goal[]
  activities: Activity[]
  entries: ActivityEntry[]
  reviews: Review[]
  today: Date
  from: string // YYYY-MM-DD
  to: string // YYYY-MM-DD, höchstens heute
}

const parse = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const shift = (k: string, n: number) => {
  const d = parse(k)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}
const days = (from: string, to: string) => Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000) + 1
const fmt = (k: string) => parse(k).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
const fmtShort = (k: string) => parse(k).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })

export const REPORT_TASK =
  'Du bist mein Gewohnheits-Coach. Unten steht mein Bericht aus meiner Gewohnheits-App. Bitte antworte auf Deutsch, knapp und ohne Floskeln: ' +
  '1) kurze Gesamteinschätzung, 2) was gut läuft, 3) die größte Schwachstelle und mögliche Ursachen, 4) drei konkrete, kleine Tipps für die nächste Woche. ' +
  'Beziehe dich auf die Zahlen und stelle mir höchstens eine Rückfrage.'

function habitLines(i: ReportInput, progress: Progress, todayKey: string): string[] {
  const out: string[] = []
  const live = i.habits.filter((h) => !h.deleted && !h.archived)
  for (const h of live) {
    const mine = i.checkIns.filter((c) => c.habitId === h.id && !c.deleted)
    const p = progress.byHabit.get(h.id)
    const word = (n: number) => (p?.unit === 'Tage' ? (n === 1 ? 'Tag' : 'Tage') : n === 1 ? 'Woche' : 'Wochen')
    const streak = p && p.streak > 0 ? `, Streak ${p.streak} ${word(p.streak)} (längste ${p.longest})` : p && p.longest > 0 ? `, längste Streak ${p.longest} ${word(p.longest)}` : ''
    const minis = mine.filter((c) => c.date >= i.from && c.date <= i.to && isMini(h, c)).length
    const miniText = minis ? `, Mini-Version ${minis}×` : ''
    const created = dayKey(new Date(h.createdAt))

    if (h.frequency.type === 'perWeek') {
      // Wochen (Mo–So), die komplett abgeschlossen sind und in den Zeitraum fallen
      let reached = 0
      let total = 0
      for (let w = weekRange(parse(i.from))[0]; w <= i.to; w = shift(w, 7)) {
        const end = shift(w, 6)
        if (end >= todayKey || end < i.from || end < created) continue
        const doneDays = new Set(mine.filter((c) => c.date >= w && c.date <= end && dayCredit(h, [c]) >= 1).map((c) => c.date)).size
        total++
        if (doneDays >= h.frequency.count) reached++
      }
      out.push(`- ${h.name} (${areaLabel(h.area)}, ${h.frequency.count}× pro Woche): Ziel in ${reached} von ${total} abgeschlossenen Wochen erreicht${streak}${miniText}`)
      continue
    }

    let due = 0
    let credit = 0
    let fullDays = 0
    for (let d = i.from; d <= i.to; d = shift(d, 1)) {
      if (d >= todayKey || d < created) continue // nur abgeschlossene Tage nach Anlegen
      const isDue = h.frequency.type === 'daily' || (h.frequency.type === 'weekdays' && h.frequency.days.includes((parse(d).getDay() + 6) % 7))
      if (!isDue) continue
      due++
      const c = dayCredit(h, mine.filter((x) => x.date === d))
      credit += c
      if (c >= 1) fullDays++
    }
    const rhythm = h.frequency.type === 'daily' ? 'täglich' : `an ${(h.frequency as { days: number[] }).days.map((x) => WEEKDAYS[x]).join(', ')}`
    const qty = h.dailyTarget ? `, Tagesziel ${fmtQty(h.dailyTarget)} ${h.unit ?? ''}`.trimEnd() : ''
    const rate = due ? `${Math.round((credit / due) * 100)} % (${fullDays} von ${due} Tagen voll erledigt)` : 'nicht bewertbar (noch keine fälligen Tage)'
    out.push(`- ${h.name} (${areaLabel(h.area)}, ${rhythm}${qty}): Quote ${rate}${streak}${miniText}`)
  }
  return out
}

export function buildReport(i: ReportInput): string {
  const todayKey = dayKey(i.today)
  const n = days(i.from, i.to)
  const lines: string[] = []
  const add = (...l: string[]) => lines.push(...l)

  add(REPORT_TASK, '', '=== Bericht ===')
  add(`Zeitraum: ${fmt(i.from)} bis ${fmt(i.to)} (${n} ${n === 1 ? 'Tag' : 'Tage'})${i.to >= todayKey ? ', heute läuft noch und zählt nicht in die Durchschnitte' : ''}`)
  add('Hinweis: Tages-Score = Anteil der erledigten Fälligkeiten des Tages in Prozent (Mini-Version zählt halb, bei Mengen zählt der Teil des Tagesziels).')

  // Gesamt
  const completed = computeDayScores(i.habits, i.checkIns, parse(i.from), parse(i.to)).filter((d) => d.date < todayKey)
  const cur = summarize(completed)
  const prevTo = shift(i.from, -1)
  const prevFrom = shift(i.from, -n)
  const prev = summarize(computeDayScores(i.habits, i.checkIns, parse(prevFrom), parse(prevTo)).filter((d) => d.date < todayKey))
  const full = completed.filter((d) => d.score === 100).length
  add('', '## Gesamt')
  add(`- Ø Tages-Score: ${cur.avg === null ? 'keine Daten' : `${cur.avg} %`}${prev.avg !== null ? ` (Vorperiode: ${prev.avg} %${cur.avg !== null ? `, ${cur.avg - prev.avg >= 0 ? '+' : ''}${cur.avg - prev.avg} Punkte` : ''})` : ''}`)
  add(`- Tage mit allem Fälligen erledigt: ${full} von ${cur.days} Tagen mit Fälligem`)
  if (cur.best) add(`- Bester Tag: ${fmtShort(cur.best.date)} mit ${cur.best.score} %`)
  const act = { activities: i.activities, entries: i.entries }
  const pEnd = computeProgress(i.habits, i.checkIns, parse(i.to), i.goals, act)
  const pBefore = computeProgress(i.habits, i.checkIns, parse(shift(i.from, -1)), i.goals, act)
  const lvl = levelFor(pEnd.totalXp)
  add(`- Level ${lvl.level} (${pEnd.totalXp} XP), im Zeitraum +${pEnd.totalXp - pBefore.totalXp} XP`)

  const progress = computeProgress(i.habits, i.checkIns, i.today, i.goals, act)
  const hl = habitLines(i, progress, todayKey)
  add('', '## Gewohnheiten', ...(hl.length ? hl : ['- (keine)']))

  // Einheiten
  const actLines: string[] = []
  for (const a of i.activities.filter((x) => !x.deleted)) {
    const mine = i.entries.filter((e) => e.planId === a.id && !e.deleted)
    const inP = mine.filter((e) => e.date >= i.from && e.date <= i.to)
    const inPrev = mine.filter((e) => e.date >= prevFrom && e.date <= prevTo)
    const sum = inP.reduce((s, e) => s + e.value, 0)
    const sumPrev = inPrev.reduce((s, e) => s + e.value, 0)
    actLines.push(`- ${a.name} (${areaLabel(a.area)}): ${fmtQty(sum)} ${a.unit} in ${inP.length} ${inP.length === 1 ? 'Eintrag' : 'Einträgen'} (Vorperiode: ${fmtQty(sumPrev)} ${a.unit})`)
  }
  if (actLines.length) add('', '## Einheiten', ...actLines)

  // Ziele
  const goalLines: string[] = []
  for (const g of i.goals.filter((x) => !x.deleted)) {
    if (g.done && !(g.doneAt && g.doneAt >= i.from && g.doneAt <= i.to)) continue
    if (g.done) {
      goalLines.push(`- ${g.title} (${areaLabel(g.area)}): im Zeitraum abgeschlossen am ${fmt(g.doneAt!)}`)
      continue
    }
    const p = goalProgress(g, i.checkIns, todayKey, i.habits, i.entries)
    const unit = g.kind === 'amount' ? ` ${g.unit ?? ''}`.trimEnd() : g.kind === 'count' ? ' Haken' : ' Schritte'
    const trend = { ahead: 'auf Kurs', behind: 'im Rückstand', none: '' }[goalTrend(g, p.ratio, todayKey)]
    const frist = g.targetDate ? `, Frist ${fmt(g.targetDate)}` : ''
    const ms = milestoneStates(g, p.value, todayKey)
    const msText = ms.length ? `, Etappen: ${ms.map((s) => `${fmtQty(s.m.value)}${g.unit ? ` ${g.unit}` : ''} bis ${fmtShort(s.m.date)} ${s.reached ? '✓' : s.overdue ? '(überfällig)' : '(offen)'}`).join('; ')}` : ''
    goalLines.push(`- ${g.title} (${areaLabel(g.area)}): ${fmtQty(p.value)} von ${fmtQty(p.total)}${unit} (${Math.round(p.ratio * 100)} %)${frist}${trend ? `, ${trend}` : ''}${msText}`)
  }
  if (goalLines.length) add('', '## Ziele', ...goalLines)

  // Wochennotizen
  const notes = i.reviews
    .filter((r) => !r.deleted && r.note.trim() && r.weekStart <= i.to && shift(r.weekStart, 6) >= i.from)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
  if (notes.length) add('', '## Meine Wochennotizen', ...notes.map((r) => `- KW ${isoWeek(r.weekStart)} (${fmtShort(r.weekStart)}–${fmtShort(shift(r.weekStart, 6))}): „${r.note.trim().replace(/\s+/g, ' ')}“`))

  // Auffälligkeiten
  const ins = computeInsights(i.habits, i.checkIns, i.today)
  if (ins.enoughData && ins.sentences.length) add('', '## Auffälligkeiten (letzte 12 Wochen)', ...ins.sentences.map((s) => `- ${s}`))

  return lines.join('\n')
}

// Zeiträume für den Knopf in der Statistik: die letzten 7 / 30 / 90 Tage inklusive heute
export function recentRange(today: Date, n: number): { from: string; to: string } {
  return { from: shift(dayKey(today), -(n - 1)), to: dayKey(today) }
}
