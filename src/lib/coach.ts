import { STREAK_DAYS, TIER_ICONS } from './badges'
import { dayKey } from './db'
import { checkInValue, fmtQty, isCheckInDone, isDue, weekdayIndex, weekRange } from './habits'
import { goalProgress, goalTrend } from './goals'
import type { Insights } from './insights'
import type { Progress } from './progress'
import type { WeekSummary } from './review'
import type { CheckIn, Goal, Habit } from './types'

// Regelbasierter Coach: Tipps und Fazit entstehen aus festen Regeln auf deinen eigenen Zahlen.
// Keine KI, kein Netzwerk – alles läuft auf dem Gerät.

export interface Tip {
  id: string
  icon: string
  text: string
  priority: number // kleiner = wichtiger
}

export interface CoachInput {
  habits: Habit[]
  checkIns: CheckIn[]
  goals: Goal[]
  progress: Progress
  insights: Insights
  today: Date // inkl. Uhrzeit
}

const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
const NAMES_ADV = ['montags', 'dienstags', 'mittwochs', 'donnerstags', 'freitags', 'samstags', 'sonntags']

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)
const list = (names: string[], max = 3) =>
  names.length <= max ? names.join(', ') : `${names.slice(0, max).join(', ')} und ${names.length - max} weitere`
const fmtDate = (k: string) =>
  new Date(`${k}T12:00:00`).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })

interface HabitToday {
  h: Habit
  due: boolean
  done: boolean
  value: number // heutige Menge (Mengen-Gewohnheit)
  weekCount: number // erledigte Tage diese Woche
}

function habitsToday(habits: Habit[], checkIns: CheckIn[], today: Date): HabitToday[] {
  const todayKey = dayKey(today)
  const [ws, we] = weekRange(today)
  return habits
    .filter((h) => !h.deleted && !h.archived)
    .map((h) => {
      const mine = checkIns.filter((c) => c.habitId === h.id && !c.deleted)
      const doneDays = mine.filter((c) => isCheckInDone(h, c))
      const done = doneDays.some((c) => c.date === todayKey)
      const weekCount = new Set(doneDays.filter((c) => c.date >= ws && c.date <= we).map((c) => c.date)).size
      const value = mine.filter((c) => c.date === todayKey).reduce((s, c) => s + checkInValue(h, c), 0)
      const existed = dayKey(new Date(h.createdAt)) <= todayKey
      return { h, done, value, weekCount, due: existed && isDue(h, today, done, weekCount) }
    })
}

const miniHint = (h: Habit) => (h.miniVersion ? ` Die Mini-Version („${h.miniVersion}“) reicht schon.` : '')

export function dailyTips(input: CoachInput, limit = 2): Tip[] {
  const { habits, checkIns, goals, progress, insights, today } = input
  const todayKey = dayKey(today)
  const hour = today.getHours()
  const wd = weekdayIndex(today)
  const daysLeft = 7 - wd // Tage dieser Woche inkl. heute
  const state = habitsToday(habits, checkIns, today)
  const dueOpen = state.filter((s) => s.due && !s.done)
  const dueAll = state.filter((s) => s.due)
  const tips: Tip[] = []

  // 1) Streak in Gefahr (nur Tages-Gewohnheiten; Wochen-Gewohnheiten siehe Wochenziel-Regel)
  const risk = dueOpen
    .map((s) => ({ s, p: progress.byHabit.get(s.h.id) }))
    .filter(({ s, p }) => !!p && p.unit === 'Tage' && p.streak >= 3 && s.h.frequency.type !== 'perWeek')
    .sort((a, b) => b.p!.streak - a.p!.streak)
  if (risk.length) {
    const { s, p } = risk[0]
    const more = risk.length > 1 ? ` (und ${risk.length - 1} weitere Streak${risk.length > 2 ? 's' : ''})` : ''
    const help = s.h.miniVersion ? miniHint(s.h) : p!.freezes > 0 ? ' Ein Freeze würde sie retten, aber besser sind 2 Minuten heute.' : ''
    tips.push({
      id: 'streak-risk',
      icon: '🔥',
      priority: 10,
      text: `Deine ${p!.streak}-Tage-Streak bei ${s.h.name} endet, wenn du heute nichts machst${more}.${help}`,
    })
  }

  // 2) Heute ist der schwächste Wochentag einer Gewohnheit
  if (insights.enoughData) {
    const weak = insights.habits
      .filter((i) => i.weakest && i.weakest.weekday === wd)
      .map((i) => ({ i, s: dueOpen.find((s) => s.h.id === i.habit.id) }))
      .filter((x) => !!x.s)
      .sort((a, b) => b.i.weakest!.rest - b.i.weakest!.rate - (a.i.weakest!.rest - a.i.weakest!.rate))
    if (weak.length) {
      const { i } = weak[0]
      const w = i.weakest!
      tips.push({
        id: 'weak-weekday',
        icon: '📉',
        priority: 20,
        text: `Heute ist ${DAY_NAMES[wd]}: bei ${i.habit.name} ist das dein schwächster Tag (${w.rate} %, sonst Ø ${w.rest} %). Plane es früh ein${
          i.habit.miniVersion ? ` oder starte mit „${i.habit.miniVersion}“` : ''
        }.`,
      })
    }
  }

  // 3) Wochenziel (X× pro Woche) braucht noch Tage
  const weekly = state
    .filter((s) => s.h.frequency.type === 'perWeek' && !s.done)
    .map((s) => {
      const target = s.h.frequency.type === 'perWeek' ? s.h.frequency.count : 0
      return { s, needed: target - s.weekCount }
    })
    .filter((x) => x.needed > 0)
    .sort((a, b) => b.needed - daysLeft - (a.needed - daysLeft))
  if (weekly.length) {
    const { s, needed } = weekly[0]
    const urgent = needed >= daysLeft
    tips.push({
      id: 'week-goal',
      icon: '🗓️',
      priority: urgent ? 25 : 50,
      text: urgent
        ? `${s.h.name}: noch ${needed}× diese Woche, aber nur noch ${daysLeft} ${plural(daysLeft, 'Tag', 'Tage')} – heute ist ein guter Tag dafür.`
        : `${s.h.name}: noch ${needed}× diese Woche, ${daysLeft} ${plural(daysLeft, 'Tag', 'Tage')} übrig.`,
    })
  }

  // 4) Abend: offene Gewohnheiten
  if (hour >= 18 && dueOpen.length) {
    tips.push({
      id: 'evening-open',
      icon: '🌙',
      priority: 35,
      text: `Abend-Check: noch ${dueOpen.length} ${plural(dueOpen.length, 'Gewohnheit', 'Gewohnheiten')} offen – ${list(dueOpen.map((s) => s.h.name))}.`,
    })
  }

  // 5) Ziel liegt hinter dem Zeitplan
  const behind = goals
    .filter((g) => !g.deleted && !g.done && g.targetDate)
    .map((g) => ({ g, p: goalProgress(g, checkIns, todayKey, habits) }))
    .filter(({ g, p }) => goalTrend(g, p.ratio, todayKey) === 'behind')
    .sort((a, b) => (a.g.targetDate ?? '').localeCompare(b.g.targetDate ?? ''))
  if (behind.length) {
    const { g, p } = behind[0]
    const rest = Math.max(0, p.total - p.value)
    tips.push({
      id: 'goal-behind',
      icon: '🎯',
      priority: 30,
      text: `Dein Ziel „${g.title}“ liegt hinter dem Zeitplan: noch ${rest} ${g.kind === 'steps' ? plural(rest, 'Schritt', 'Schritte') : plural(rest, 'Haken', 'Haken')} bis ${fmtDate(g.targetDate!)}.`,
    })
  }

  // 6) Mengen-Gewohnheit angefangen, Ziel noch offen
  const qty = state
    .filter((s) => s.due && !s.done && s.h.dailyTarget && s.value > 0)
    .sort((a, b) => b.value / b.h.dailyTarget! - a.value / a.h.dailyTarget!)
  if (qty.length) {
    const { h, value } = qty[0]
    tips.push({
      id: 'qty-open',
      icon: '⏱️',
      priority: 40,
      text: `Noch ${fmtQty(h.dailyTarget! - value)}${h.unit ? ` ${h.unit}` : ''} bis zum Tagesziel bei ${h.name}.`,
    })
  }

  // 7) Meilenstein oder Rekord in Reichweite
  const near = dueOpen
    .map((s) => ({ s, p: progress.byHabit.get(s.h.id) }))
    .filter(({ p }) => !!p && p.unit === 'Tage' && p.streak > 0)
    .map(({ s, p }) => {
      const next = STREAK_DAYS.find((t) => t > p!.streak)
      return { s, p: p!, next, rest: next ? next - p!.streak : Infinity }
    })
    .filter((x) => x.rest <= 2)
    .sort((a, b) => a.rest - b.rest)
  if (near.length) {
    const { s, next, rest } = near[0]
    const tier = TIER_ICONS[STREAK_DAYS.indexOf(next as (typeof STREAK_DAYS)[number])]
    tips.push({
      id: 'milestone-near',
      icon: tier ?? '🏅',
      priority: 60,
      text: `Noch ${rest} ${plural(rest, 'Tag', 'Tage')} bis ${tier ?? ''} ${next} Tage bei ${s.h.name}.`.replace('  ', ' '),
    })
  } else {
    const record = dueOpen
      .map((s) => ({ s, p: progress.byHabit.get(s.h.id) }))
      .filter(({ p }) => !!p && p.unit === 'Tage' && p.streak >= 3 && p.streak === p.longest)
      .sort((a, b) => b.p!.streak - a.p!.streak)[0]
    if (record) {
      tips.push({
        id: 'record-near',
        icon: '🏆',
        priority: 65,
        text: `Du bist bei deiner längsten Streak von ${record.p!.streak} Tagen (${record.s.h.name}). Mit dem heutigen Tag stellst du einen neuen Rekord auf.`,
      })
    }
  }

  // 8) Offene Gewohnheiten ohne besonderen Anlass: Tagesplan (morgens) oder sanfte Erinnerung (tagsüber)
  if (hour < 18 && dueOpen.length && !tips.length) {
    if (hour < 12) {
      const first = dueOpen.find((s) => s.h.timeOfDay === 'morgen') ?? dueOpen[0]
      tips.push({
        id: 'morning-plan',
        icon: '☀️',
        priority: 70,
        text: `Heute fällig: ${list(dueOpen.map((s) => s.h.name))}. Ein guter Start: ${first.h.name}.`,
      })
    } else {
      const hasMini = dueOpen.some((s) => s.h.miniVersion)
      tips.push({
        id: 'day-open',
        icon: '⏳',
        priority: 75,
        text: `Noch offen heute: ${list(dueOpen.map((s) => s.h.name))}. Schon ein kleiner Schritt zählt${hasMini ? ' – nutze bei Bedarf die Mini-Version' : ''}.`,
      })
    }
  }

  // 9) Alles erledigt
  if (dueAll.length > 0 && dueOpen.length === 0) {
    const best = dueAll
      .map((s) => progress.byHabit.get(s.h.id))
      .filter((p): p is NonNullable<typeof p> => !!p && p.streak >= 3)
      .sort((a, b) => b.streak - a.streak)[0]
    tips.push({
      id: 'all-done',
      icon: '🎉',
      priority: 90,
      text: `Alles für heute erledigt – stark!${best ? ` Deine längste laufende Streak: ${best.streak} ${best.unit === 'Tage' ? 'Tage' : 'Wochen'}.` : ''}`,
    })
  }

  // 10) Leere Zustände
  if (!state.length) {
    tips.push({
      id: 'empty',
      icon: '💡',
      priority: 95,
      text: 'Starte klein: Lege 2 bis 3 einfache Gewohnheiten an und hinterlege eine Mini-Version für schlechte Tage.',
    })
  } else if (!dueAll.length) {
    tips.push({ id: 'nothing-due', icon: '😌', priority: 96, text: 'Heute ist nichts fällig – gönn dir die Pause.' })
  }

  return tips.sort((a, b) => a.priority - b.priority).slice(0, limit)
}

// ---------- Wochenfazit ----------

export function weekFeedback(summary: WeekSummary, insights: Insights, habits: Habit[]): string[] {
  const out: string[] = []
  const dayName = (k: string) => DAY_NAMES[weekdayIndex(new Date(`${k}T12:00:00`))]

  if (summary.inProgress) out.push('Die Woche läuft noch – das ist ein Zwischenstand.')

  const { avg, delta } = summary
  if (avg === null) {
    out.push('Für diese Woche gibt es noch keine Auswertung.')
  } else if (delta === null) {
    out.push(`Dein Score liegt bei ${avg} %.`)
  } else if (delta >= 10) {
    out.push(`Starke Woche: ${avg} % (+${delta} Punkte zur Vorwoche).`)
  } else if (delta >= 3) {
    out.push(`Gute Woche: ${avg} %, ${delta} Punkte besser als davor.`)
  } else if (delta > -3) {
    out.push(`Stabile Woche: ${avg} %, ähnlich wie die Vorwoche.`)
  } else if (delta > -10) {
    out.push(`Etwas schwächer als die Vorwoche: ${avg} % (${delta} Punkte).`)
  } else {
    out.push(`Schwächere Woche: ${avg} % (${delta} Punkte). Das passiert – wichtig ist der Wiedereinstieg.`)
  }

  const scored = summary.days.filter((d) => d.score !== null)
  if (scored.length >= 2) {
    const best = scored.reduce((b, d) => (d.score! >= b.score! ? d : b))
    const worst = scored.reduce((w, d) => (d.score! < w.score! ? d : w))
    if (worst.score! < best.score!)
      out.push(`Bester Tag: ${dayName(best.date)} (${best.score} %), schwächster: ${dayName(worst.date)} (${worst.score} %).`)
  }

  if (summary.weeklyGoals.total > 0)
    out.push(`Wochenziele: ${summary.weeklyGoals.reached} von ${summary.weeklyGoals.total} erreicht.`)

  if (summary.newBadges.length)
    out.push(`Neue Abzeichen: ${summary.newBadges.map((b) => `${TIER_ICONS[b.tier]} ${b.label}`).join(', ')}.`)

  if (summary.checkins > 0) out.push(`${summary.checkins} ${plural(summary.checkins, 'Haken', 'Haken')} und +${summary.xp} XP.`)

  if (insights.enoughData && insights.sentences.length) out.push(`Auffällig: ${insights.sentences[0]}`)

  // Idee für nächste Woche
  const weak = insights.enoughData ? insights.habits.find((i) => i.weakest) : undefined
  if (weak) {
    const w = weak.weakest!
    const h = habits.find((x) => x.id === weak.habit.id)
    out.push(
      `Idee für nächste Woche: Sichere ${weak.habit.name} ${NAMES_ADV[w.weekday]} ${
        h?.miniVersion ? `mit der Mini-Version („${h.miniVersion}“)` : 'mit einer festen Uhrzeit'
      } ab.`,
    )
  } else if (delta !== null && delta < 0) {
    out.push('Idee für nächste Woche: Wähle eine Gewohnheit und sichere sie jeden Tag mit der Mini-Version ab.')
  } else if (avg !== null && avg >= 90) {
    out.push('Idee für nächste Woche: Du bist stark unterwegs – erhöhe bei einer Gewohnheit das Tagesziel ein wenig.')
  } else if (avg !== null) {
    out.push('Idee für nächste Woche: Schau dir deine besten Tage an – was hatten sie gemeinsam?')
  }

  return out.slice(0, 7)
}
