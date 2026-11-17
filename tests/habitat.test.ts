import { computeProgress, levelFor } from '../src/lib/progress'
import type { CheckIn, Habit } from '../src/lib/types'

const today = new Date(2026, 10, 17) // Dienstag
const mk = (frequency: Habit['frequency']): Habit => ({ id: 'h', name: 'x', icon: 'x', area: 'sport', timeOfDay: 'morgen', frequency, archived: false, createdAt: '2026-01-01T12:00:00', updatedAt: '', deleted: false })
const ci = (dates: string[]): CheckIn[] => dates.map((date, i) => ({ id: 'c' + i, habitId: 'h', date, updatedAt: '', deleted: false }))
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => `2026-11-${String(a + i).padStart(2, '0')}`)
let fail = 0
const eq = (name: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log(ok ? 'OK  ' : 'FAIL', name, ok ? '' : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`) }
const run = (f: Habit['frequency'], dates: string[]) => { const p = computeProgress([mk(f)], ci(dates), today).byHabit.get('h')!; return { streak: p.streak, freezes: p.freezes, xp: p.xp } }

eq('10 Tage am Stück', run({ type: 'daily' }, range(8, 17)), { streak: 10, freezes: 1, xp: 120 })
eq('Lücke ohne Freeze bricht', run({ type: 'daily' }, [...range(8, 13), ...range(15, 17)]), { streak: 3, freezes: 0, xp: 90 })
eq('Freeze rettet Lücke', run({ type: 'daily' }, [...range(1, 10), ...range(12, 17)]), { streak: 16, freezes: 0, xp: 180 })
eq('Heute offen bricht nicht', run({ type: 'daily' }, range(11, 16)), { streak: 6, freezes: 0, xp: 60 })
eq('Wochentage: Wochenende zählt nicht', run({ type: 'weekdays', days: [0, 1, 2, 3, 4] }, ['2026-11-13', '2026-11-16']), { streak: 2, freezes: 0, xp: 20 })
eq('perWeek: 2 Wochen + 1 in aktueller', run({ type: 'perWeek', count: 3 }, ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-16']), { streak: 2, freezes: 0, xp: 70 })
eq('perWeek: verfehlte Woche bricht', run({ type: 'perWeek', count: 3 }, ['2026-11-02', '2026-11-09', '2026-11-16']), { streak: 0, freezes: 0, xp: 30 })
eq('Level 0 XP', levelFor(0), { level: 1, into: 0, needed: 100 })
eq('Level 99 XP', levelFor(99).level, 1)
eq('Level 100 XP', levelFor(100), { level: 2, into: 0, needed: 200 })
eq('Level 300 XP', levelFor(300).level, 3)
const run2 = (f: Habit['frequency'], dates: string[]) => { const p = computeProgress([mk(f)], ci(dates), today).byHabit.get('h')!; return { streak: p.streak, longest: p.longest, rate: p.rate === null ? null : Math.round(p.rate * 1000) / 1000 } }
eq('Längste Streak bleibt', run2({ type: 'daily' }, [...range(1, 8), ...range(10, 13)]), { streak: 0, longest: 8, rate: 0.19 === 0 ? 0 : run2({ type: 'daily' }, [...range(1, 8), ...range(10, 13)]).rate })
eq('Quote daily 10/30', run2({ type: 'daily' }, range(8, 17)).rate, 0.333)
eq('Quote perWeek 2/4', run2({ type: 'perWeek', count: 3 }, ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-09', '2026-11-10', '2026-11-11']).rate, 0.5)
eq('Quote ohne Daten', run2({ type: 'daily' }, []).rate, 0)
import { goalProgress } from '../src/lib/goals'
import type { Goal } from '../src/lib/types'
const goal = (over: Partial<Goal>): Goal => ({ id: 'g', title: 't', area: 'musik', kind: 'steps', steps: [], habitIds: [], done: false, deleted: false, createdAt: '', updatedAt: '', ...over })
const xpOf = (g: Goal[]) => { const p = computeProgress([mk({ type: 'daily' })], [], today, g); return { total: p.totalXp, musik: p.areaXp.musik } }
eq('Ziel erledigt: +100 XP in Bereich', xpOf([goal({ done: true })]), { total: 100, musik: 100 })
eq('Ziel offen: 0 XP', xpOf([goal({ done: false })]), { total: 0, musik: undefined })
eq('Gelöschtes Ziel: 0 XP', xpOf([goal({ done: true, deleted: true })]), { total: 0, musik: undefined })
eq('Zwei Ziele', xpOf([goal({ done: true }), goal({ id: 'g2', done: true, area: 'sport' })]).total, 200)
const steps = goal({ steps: [{ id: 'a', text: 'a', done: true }, { id: 'b', text: 'b', done: false }, { id: 'c', text: 'c', done: true }] })
eq('Teilschritte 2/3', goalProgress(steps, [], '2026-11-17').value + '/' + goalProgress(steps, [], '2026-11-17').total, '2/3')
eq('Teilschritte leer: Ratio 0', goalProgress(goal({}), [], '2026-11-17').ratio, 0)
const cg = goal({ kind: 'count', habitIds: ['h', 'h2'], target: 4, startDate: '2026-11-10' })
const cis: CheckIn[] = [
  { id: '1', habitId: 'h', date: '2026-11-09', deleted: false, updatedAt: '' }, // vor Start
  { id: '2', habitId: 'h', date: '2026-11-10', deleted: false, updatedAt: '' },
  { id: '3', habitId: 'h2', date: '2026-11-10', deleted: false, updatedAt: '' },
  { id: '4', habitId: 'h', date: '2026-11-11', deleted: true, updatedAt: '' }, // gelöscht
  { id: '5', habitId: 'x', date: '2026-11-12', deleted: false, updatedAt: '' }, // andere Gewohnheit
  { id: '6', habitId: 'h', date: '2026-11-12', deleted: false, updatedAt: '' },
  { id: '7', habitId: 'h', date: '2026-11-12', deleted: false, updatedAt: '' }, // Duplikat
]
eq('Zählziel 3/4', goalProgress(cg, cis, '2026-11-17').value, 3)
eq('Zählziel Ratio 0.75', goalProgress(cg, cis, '2026-11-17').ratio, 0.75)
eq('Zählziel gedeckelt bei 1', goalProgress({ ...cg, target: 2 }, cis, '2026-11-17').ratio, 1)
import { isCheckInDone, isPartial } from '../src/lib/habits'
const qh: Habit = { ...mk({ type: 'daily' }), dailyTarget: 30, unit: 'min' }
const qci = (date: string, value?: number): CheckIn => ({ id: date, habitId: 'h', date, value, deleted: false, updatedAt: '' })
const qrun = (cis: CheckIn[], goals: Goal[] = []) => { const p = computeProgress([qh], cis, today, goals).byHabit.get('h')!; return { streak: p.streak, xp: p.xp } }
eq('Menge: Teilwert zählt nicht', qrun([qci('2026-11-17', 20)]), { streak: 0, xp: 0 })
eq('Menge: Ziel erreicht', qrun([qci('2026-11-17', 30)]), { streak: 1, xp: 10 })
eq('Menge: über Ziel', qrun([qci('2026-11-17', 45)]), { streak: 1, xp: 10 })
eq('Menge: alter Check-in ohne Wert = erledigt', qrun([qci('2026-11-16'), qci('2026-11-17')]), { streak: 2, xp: 20 })
eq('Menge: Teilwert gestern bricht Streak', qrun([qci('2026-11-15', 30), qci('2026-11-16', 10), qci('2026-11-17', 30)]), { streak: 1, xp: 20 })
eq('isPartial 20/30', isPartial(qh, qci('2026-11-17', 20)), true)
eq('isPartial 30/30', isPartial(qh, qci('2026-11-17', 30)), false)
eq('isCheckInDone 29,9', isCheckInDone(qh, qci('2026-11-17', 29.9)), false)
eq('Ziel nachträglich entfernt: Teilwert zählt wieder', (() => { const p = computeProgress([{ ...qh, dailyTarget: undefined }], [qci('2026-11-17', 5)], today).byHabit.get('h')!; return p.streak })(), 1)
eq('Zählziel ignoriert Teilwerte', goalProgress(goal({ kind: 'count', habitIds: ['h'], target: 3, startDate: '2026-11-01' }), [qci('2026-11-16', 10), qci('2026-11-17', 30)], '2026-11-17', [qh]).value, 1)
import { isMini } from '../src/lib/habits'
const pci = (date: string, mini = false): CheckIn => ({ id: date, habitId: 'h', date, mini: mini || undefined, deleted: false, updatedAt: '' })
const plain = mk({ type: 'daily' })
const prun = (h: Habit, cis: CheckIn[]) => { const p = computeProgress([h], cis, today).byHabit.get('h')!; return { streak: p.streak, xp: p.xp, freezes: p.freezes } }
eq('Mini hält Streak, halbe XP', prun(plain, [pci('2026-11-15'), pci('2026-11-16', true), pci('2026-11-17')]), { streak: 3, xp: 25, freezes: 0 })
eq('Nur Mini: 5 XP', prun(plain, [pci('2026-11-17', true)]), { streak: 1, xp: 5, freezes: 0 })
eq('Mini verbraucht keinen Freeze', prun(plain, [...range(1, 10), pci('2026-11-11', true), ...range(12, 17)].map(x => typeof x === 'string' ? pci(x) : x)), { streak: 17, xp: 170 - 5 + 20, freezes: 1 })
eq('Mini + Bonus an Tag 7', prun(plain, [...range(11, 16), '2026-11-17'].map((x, i) => pci(x, i === 6))), { streak: 7, xp: 6 * 10 + 5 + 20, freezes: 0 })
eq('Wochenziel: Mini zählt halbe XP', (() => { const p = computeProgress([mk({ type: 'perWeek', count: 2 })], [pci('2026-11-16'), pci('2026-11-17', true)], today).byHabit.get('h')!; return { streak: p.streak, xp: p.xp } })(), { streak: 1, xp: 15 })
const qm = (date: string, value: number, mini: boolean): CheckIn => ({ id: date, habitId: 'h', date, value, mini: mini || undefined, deleted: false, updatedAt: '' })
eq('Menge: Mini mit Wert 0 zählt', prun(qh, [qm('2026-11-17', 0, true)]), { streak: 1, xp: 5, freezes: 0 })
eq('Menge: Mini + Ziel erreicht = voll', prun(qh, [qm('2026-11-17', 30, true)]), { streak: 1, xp: 10, freezes: 0 })
eq('Menge: Mini mit Teilwert zählt als Mini', prun(qh, [qm('2026-11-17', 10, true)]), { streak: 1, xp: 5, freezes: 0 })
eq('isMini voll-Check-in', isMini(plain, pci('2026-11-17')), false)
eq('isPartial ignoriert Mini', isPartial(qh, qm('2026-11-17', 10, true)), false)
eq('Heute: Mini zählt für Zählziel', goalProgress(goal({ kind: 'count', habitIds: ['h'], target: 2, startDate: '2026-11-01' }), [pci('2026-11-16', true), pci('2026-11-17')], '2026-11-17', [plain]).value, 2)
import { computeDayScores, computeStats, summarize, weeklyGoals } from '../src/lib/stats'
const hb = (id: string, over: Partial<Habit> = {}): Habit => ({ ...mk({ type: 'daily' }), id, ...over })
const sc = (habits: Habit[], cis: CheckIn[], date: string) => computeDayScores(habits, cis, parseKey(date), parseKey(date))[0].score
const parseKey = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d) }
const c1 = (habitId: string, date: string, extra: Partial<CheckIn> = {}): CheckIn => ({ id: habitId + date, habitId, date, deleted: false, updatedAt: '', ...extra })
eq('Score: voll = 100', sc([hb('a')], [c1('a', '2026-11-16')], '2026-11-16'), 100)
eq('Score: nichts erledigt = 0', sc([hb('a')], [], '2026-11-16'), 0)
eq('Score: Mini = 50', sc([hb('a')], [c1('a', '2026-11-16', { mini: true })], '2026-11-16'), 50)
eq('Score: Teilwert 20/30 = 67', sc([hb('q', { dailyTarget: 30, unit: 'min' })], [c1('q', '2026-11-16', { value: 20 })], '2026-11-16'), 67)
eq('Score: eine von zwei = 50', sc([hb('a'), hb('b')], [c1('a', '2026-11-16')], '2026-11-16'), 50)
eq('Score: Wochentage-Habit am Samstag = null', sc([hb('w', { frequency: { type: 'weekdays', days: [0, 1, 2, 3, 4] } })], [], '2026-11-14'), null)
eq('Score: vor Anlegen = null', sc([hb('n', { createdAt: '2026-11-10T08:00:00' })], [], '2026-11-05'), null)
eq('Score: perWeek zählt nicht', sc([hb('p', { frequency: { type: 'perWeek', count: 3 } })], [c1('p', '2026-11-16')], '2026-11-16'), null)
eq('Score: archiviert zählt nicht', sc([hb('x', { archived: true })], [], '2026-11-16'), null)
eq('Score: Mini + Teilwert nimmt das Größere', sc([hb('q', { dailyTarget: 30 })], [c1('q', '2026-11-16', { value: 24, mini: true })], '2026-11-16'), 80)
eq('Summe: Ø ohne null, bester Tag jüngster', (() => { const s = summarize([{ date: 'a', score: 100, due: 1 }, { date: 'b', score: null, due: 0 }, { date: 'c', score: 100, due: 1 }, { date: 'd', score: 40, due: 1 }]); return { avg: s.avg, best: s.best?.date, days: s.days } })(), { avg: 80, best: 'c', days: 3 })
eq('Summe: leer', summarize([]).avg, null)
const stat = computeStats([hb('a')], range(11, 16).map((d) => c1('a', d)), today, 7)
eq('Stats: 7 Balken bis heute', { n: stat.days.length, first: stat.days[0].date, last: stat.days[6].date }, { n: 7, first: '2026-11-11', last: '2026-11-17' })
eq('Stats: Ø ohne heute, Vorperiode, Delta', { cur: stat.current.avg, prev: stat.previous.avg, delta: stat.delta }, { cur: 86, prev: 0, delta: 86 })
eq('Stats: heute zählt nicht in Ø', computeStats([hb('a')], [], today, 7).current.avg, 0)
eq('Stats: keine Daten → Delta null', computeStats([], [], today, 7).delta, null)
const pw = hb('p', { frequency: { type: 'perWeek', count: 2 } })
eq('Wochenziele: diese Woche 1/1', weeklyGoals([pw], [c1('p', '2026-11-16'), c1('p', '2026-11-17')], today, 'week'), { reached: 1, total: 1 })
eq('Wochenziele: Woche offen 0/1', weeklyGoals([pw], [c1('p', '2026-11-16')], today, 'week'), { reached: 0, total: 1 })
eq('Wochenziele: 4 Wochen 1/4', weeklyGoals([pw], [c1('p', '2026-11-09'), c1('p', '2026-11-10'), c1('p', '2026-11-02')], today, 'month'), { reached: 1, total: 4 })
eq('Wochenziele: erst seit kurzem 1 Woche', weeklyGoals([{ ...pw, createdAt: '2026-11-09T10:00:00' }], [c1('p', '2026-11-09'), c1('p', '2026-11-10')], today, 'month'), { reached: 1, total: 1 })
eq('Wochenziele: ohne perWeek total 0', weeklyGoals([hb('a')], [], today, 'week').total, 0)
import { computeBadges, newBadges, nextBadge, reachedBadges } from '../src/lib/badges'
const bprog = (habits: Habit[], cis: CheckIn[], goals: Goal[] = []) => computeProgress(habits, cis, today, goals)
const bids = (habits: Habit[], cis: CheckIn[], goals: Goal[] = []) => reachedBadges(computeBadges(habits, bprog(habits, cis, goals), )).map((b) => b.id)
const daily = hb('h')
const days = (from: number, to: number) => range(from, to).map((d) => c1('h', d))
eq('Streak 6 Tage: kein Abzeichen', bids([daily], days(11, 16)).filter((i) => i.startsWith('streak')), [])
eq('Streak 7 Tage: Stufe 1', bids([daily], days(10, 16)).filter((i) => i.startsWith('streak')), ['streak:h:7'])
eq('Streak 30: Stufe 1+2', bids([daily], Array.from({ length: 30 }, (_, i) => { const d = new Date(2026, 10, 17 - i); return c1('h', `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`) })).filter((i) => i.startsWith('streak')), ['streak:h:7', 'streak:h:30'])
eq('Längste Streak bleibt nach Bruch', bids([daily], [...days(1, 8), ...days(12, 13)]).filter((i) => i.startsWith('streak')), ['streak:h:7'])
const pwh = hb('p', { frequency: { type: 'perWeek', count: 1 } })
const pwc = ['2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09'].map((d) => c1('p', d))
eq('Wochen-Gewohnheit: 4 Wochen = Stufe 1', bids([pwh], pwc).filter((i) => i.startsWith('streak')), ['streak:p:4'])
eq('Wochen-Gewohnheit: Einheit Wochen', computeBadges([pwh], bprog([pwh], pwc))[0].unit, 'Wochen')
eq('Archivierte Gewohnheit behält Abzeichen', bids([{ ...daily, archived: true }], days(10, 16)).filter((i) => i.startsWith('streak')), ['streak:h:7'])
eq('Gelöschte Gewohnheit: keine Gruppe', computeBadges([{ ...daily, deleted: true }], bprog([], [])).map((g) => g.key), ['level', 'goals'])
const withXp = (totalXp: number, goalsDone = 0) => ({ byHabit: new Map(), areaXp: {}, totalXp, goalsDone })
eq('Level 4 (999 XP): kein Level-Abzeichen', reachedBadges(computeBadges([], withXp(999))).map((b) => b.id), [])
eq('Level 5 (1000 XP)', reachedBadges(computeBadges([], withXp(1000))).map((b) => b.id), ['level:5'])
eq('Level 20 (19000 XP): alle drei', reachedBadges(computeBadges([], withXp(19000))).map((b) => b.id), ['level:5', 'level:10', 'level:20'])
eq('Ziele 1, 5, 10', [1, 4, 5, 10].map((n) => reachedBadges(computeBadges([], withXp(0, n))).filter((b) => b.id.startsWith('goals')).length), [1, 1, 2, 3])
const gdone = (id: string): Goal => goal({ id, done: true })
eq('Ziele zählen aus echten Daten', bids([], [], [gdone('a'), gdone('b')]).filter((i) => i.startsWith('goals')), ['goals:1'])
const gr = computeBadges([daily], bprog([daily], days(10, 16)))
eq('Neu: erster Start (seen = null) → nichts', newBadges(gr, null).length, 0)
eq('Neu: alles gesehen → nichts', newBadges(gr, reachedBadges(gr).map((b) => b.id)).length, 0)
eq('Neu: ungesehenes Abzeichen', newBadges(gr, []).map((b) => b.id), ['streak:h:7'])
eq('Nächste Stufe: noch 1 Tag bis 7 (6 Tage)', (() => { const g = computeBadges([daily], bprog([daily], days(11, 16)))[0]; const n = nextBadge(g)!; return { id: n.badge.id, remaining: n.remaining } })(), { id: 'streak:h:7', remaining: 1 })
eq('Nächste Stufe: nach allen = null', nextBadge(computeBadges([], withXp(19000))[0]), null)
import { isReviewDay, isoWeek, nextWeek, prevWeek, reviewId, reviewWeekFor, weekEndOf, weekStartOf, weekSummary } from '../src/lib/review'
import { computeInsights } from '../src/lib/insights'
const D = (k: string) => parseKey(k)
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const dates = (from: string, to: string) => { const out: string[] = []; for (const d = D(from); key(d) <= to; d.setDate(d.getDate() + 1)) out.push(key(d)); return out }
// --- Wochenlogik
eq('weekStartOf Dienstag 17.11.', weekStartOf(D('2026-11-17')), '2026-11-16')
eq('weekEndOf', weekEndOf('2026-11-09'), '2026-11-15')
eq('prev/next', [prevWeek('2026-11-09'), nextWeek('2026-11-09')], ['2026-11-02', '2026-11-16'])
eq('Rückblick-Woche: Sonntag = laufende', reviewWeekFor(D('2026-11-15')), '2026-11-09')
eq('Rückblick-Woche: Montag = beendete', reviewWeekFor(D('2026-11-16')), '2026-11-09')
eq('Rückblick-Woche: Dienstag = letzte beendete', reviewWeekFor(D('2026-11-17')), '2026-11-09')
eq('Hinweistage: So/Mo ja, Di nein', [isReviewDay(D('2026-11-15')), isReviewDay(D('2026-11-16')), isReviewDay(D('2026-11-17'))], [true, true, false])
eq('reviewId ist UUID-Format', /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(reviewId('2026-11-09')), true)
eq('reviewId stabil je Woche', [reviewId('2026-11-09') === reviewId('2026-11-09'), reviewId('2026-11-09') === reviewId('2026-11-16')], [true, false])
eq('ISO-Woche 2026-11-09 = 46', isoWeek('2026-11-09'), 46)
eq('ISO-Woche 2025-12-29 = 1', isoWeek('2025-12-29'), 1)
// --- Wochenauswertung
const lh = hb('h', { name: 'Laufen' })
const sum = weekSummary([lh], dates('2026-11-06', '2026-11-12').map((d) => c1('h', d)), [], '2026-11-09', today)
eq('Woche: Score, Vorwoche, Delta', { avg: sum.avg, prev: sum.prevAvg, delta: sum.delta, days: sum.days.length }, { avg: 57, prev: 43, delta: 14, days: 7 })
eq('Woche: bester Tag, Haken, XP', { best: sum.best?.score, checkins: sum.checkins, xp: sum.xp }, { best: 100, checkins: 4, xp: 60 })
eq('Woche: neues Abzeichen (7-Tage-Streak)', sum.newBadges.map((b) => b.id), ['streak:h:7'])
eq('Woche: beendet', sum.inProgress, false)
const cur = weekSummary([lh], [c1('h', '2026-11-16'), c1('h', '2026-11-17')], [], '2026-11-16', today)
eq('Laufende Woche: nur bis heute, inProgress', { days: cur.days.length, inProgress: cur.inProgress, avg: cur.avg }, { days: 2, inProgress: true, avg: 100 })
const gInWeek = goal({ id: 'g1', done: true, doneAt: '2026-11-12' })
const gLater = goal({ id: 'g2', done: true, doneAt: '2026-11-20' })
const sg = weekSummary([lh], [], [gInWeek, gLater], '2026-11-09', today)
eq('Ziel in der Woche: +100 XP und Abzeichen', { xp: sg.xp, badges: sg.newBadges.map((b) => b.id).filter((i) => i.startsWith('goals')) }, { xp: 100, badges: ['goals:1'] })
const sprev = weekSummary([lh], [], [gInWeek], '2026-11-16', today)
eq('Ziel aus Vorwoche zählt nicht erneut', { xp: sprev.xp, badges: sprev.newBadges.length }, { xp: 0, badges: 0 })
// --- Insights
const wStart = '2026-08-25'
const noMondays = dates(wStart, '2026-11-16').filter((d) => D(d).getDay() !== 1).map((d) => c1('h', d))
const mondaysInWindow = dates(wStart, '2026-11-16').filter((d) => D(d).getDay() === 1).length
const ins = computeInsights([lh], noMondays, today)
eq('Insights: genug Daten', ins.enoughData, true)
eq('Insights: schwächster Tag Montag', { w: ins.habits[0].weakest?.weekday, rate: ins.habits[0].weakest?.rate, rest: ins.habits[0].weakest?.rest }, { w: 0, rate: 0, rest: 100 })
eq('Insights: Satz Wochentag', ins.sentences.includes('Laufen klappt montags nur zu 0 % (sonst Ø 100 %).'), true)
eq('Insights: Abbruchtag Montag', { top: ins.breakDays[0]?.weekday, count: ins.breakDays[0]?.count }, { top: 0, count: mondaysInWindow })
eq('Insights: Satz Abbruchtage', ins.sentences[0], `Deine Serien enden am häufigsten montags (${mondaysInWindow}×).`)
const allDays = dates(wStart, '2026-11-16').map((d) => c1('h', d))
const stable = computeInsights([lh], allDays, today)
eq('Insights: stabile Gewohnheit', { stable: stable.habits[0].stable, sentence: stable.sentences.includes('Laufen läuft an jedem Wochentag stabil (Ø 100 %).'), weakest: stable.habits[0].weakest }, { stable: true, sentence: true, weakest: null })
const young = computeInsights([hb('y', { createdAt: '2026-11-10T08:00:00' })], [], today)
eq('Insights: zu wenig Daten (7 Tage)', { enough: young.enoughData, days: young.daysOfData, sentences: young.sentences.length }, { enough: false, days: 7, sentences: 0 })
eq('Insights: perWeek ausgenommen', computeInsights([hb('p', { frequency: { type: 'perWeek', count: 3 } })], [], today).habits.length, 0)
const tod = computeInsights([hb('m', { name: 'Dehnen', timeOfDay: 'morgen' }), hb('a', { name: 'Lesen', timeOfDay: 'abend' })], dates(wStart, '2026-11-16').map((d) => c1('m', d)), today)
eq('Insights: Morgen vs Abend', { tod: tod.timeOfDay, sentence: tod.sentences.includes('Morgen-Gewohnheiten gelingen dir zu 100 %, Abend-Gewohnheiten nur zu 0 %.') }, { tod: { morgen: 100, abend: 0 }, sentence: true })
const wk = computeInsights([hb('w', { frequency: { type: 'weekdays', days: [0, 1, 2, 3, 4] } })], [], today)
eq('Insights: Wochenende nie fällig', { due: wk.habits[0].byWeekday[5].due, rate: wk.habits[0].byWeekday[5].rate }, { due: 0, rate: null })
// --- Sync: fehlende Tabelle erkennen (Funktion direkt aus sync.ts)
import { readFileSync } from 'node:fs'
const syncSrc = readFileSync(new URL('../src/lib/sync.ts', import.meta.url), 'utf8')
const fnSrc = syncSrc.slice(syncSrc.indexOf('export function isMissingTable'), syncSrc.indexOf('let running'))
import { stripTypeScriptTypes } from 'node:module'
const jsFn = stripTypeScriptTypes(fnSrc.replace('export function', 'function'))
const isMissingTable = new Function(`${jsFn}; return isMissingTable`)() as (e: unknown) => boolean
eq('Sync: 42P01 erkannt', isMissingTable({ code: '42P01', message: 'x' }), true)
eq('Sync: PGRST205 erkannt', isMissingTable({ code: 'PGRST205', message: "Could not find the table 'public.reviews' in the schema cache" }), true)
eq('Sync: Text "does not exist"', isMissingTable({ message: 'relation "public.reviews" does not exist' }), true)
eq('Sync: Netzwerkfehler ist kein Tabellenfehler', isMissingTable(new Error('Failed to fetch')), false)
eq('Sync: RLS-Fehler ist kein Tabellenfehler', isMissingTable({ code: '42501', message: 'new row violates row-level security policy' }), false)
// ISO-Wochen rund um die Zeitumstellung (EU: 29.03. und 25.10.2026) – lückenlos und korrekt
eq('ISO-Woche 19.10. (vor Winterzeit) = 43', isoWeek('2026-10-19'), 43)
eq('ISO-Woche 26.10. (nach Winterzeit) = 44', isoWeek('2026-10-26'), 44)
eq('ISO-Woche 06.04. (nach Sommerzeit) = 15', isoWeek('2026-04-06'), 15)
eq('ISO-Woche 23.03. (vor Sommerzeit) = 13', isoWeek('2026-03-23'), 13)
eq('ISO-Woche 2026-12-28 = 53', isoWeek('2026-12-28'), 53)
eq('ISO-Wochen lückenlos über das ganze Jahr 2026', (() => { let w = '2025-12-29', prev = 0; for (let i = 0; i < 53; i++) { const n = isoWeek(w); if (n !== prev + 1) return `Lücke bei ${w}: ${n} nach ${prev}`; prev = n; w = nextWeek(w) } return 'ok' })(), 'ok')
eq('ISO-Wochen lückenlos 2027', (() => { let w = '2027-01-04', prev = 0; for (let i = 0; i < 52; i++) { const n = isoWeek(w); if (n !== prev + 1) return `Lücke bei ${w}: ${n} nach ${prev}`; prev = n; w = nextWeek(w) } return 'ok' })(), 'ok')
import { areaScores } from '../src/lib/stats'
const hsp = (id: string, over: Partial<Habit> = {}) => hb(id, { area: 'sport', ...over })
const asc = (h: Habit[], cis: CheckIn[], mode: 'current' | 'start') => areaScores(h, cis, today, mode).map((a) => ({ area: a.area, rate: a.rate, days: a.days }))
const days30 = dates('2026-10-18', '2026-11-16')
eq('Bereichs-Score: alle 30 Tage = 100', asc([hsp('s')], days30.map((d) => c1('s', d)), 'current'), [{ area: 'sport', rate: 100, days: 30 }])
eq('Bereichs-Score: jeder zweite Tag = 50', asc([hsp('s')], days30.filter((_, i) => i % 2 === 0).map((d) => c1('s', d)), 'current')[0].rate, 50)
eq('Bereichs-Score: heute zählt nicht', asc([hsp('s')], [c1('s', '2026-11-17')], 'current')[0].rate, 0)
const sep = dates('2026-09-01', '2026-09-30').map((d) => c1('s', d))
const old = hsp('s', { createdAt: '2026-09-01T08:00:00' })
eq('Anfang: erste 30 Tage = 100', asc([old], sep, 'start')[0], { area: 'sport', rate: 100, days: 30 })
eq('Aktuell: danach nichts mehr = 0', asc([old], sep, 'current')[0].rate, 0)
eq('Anfang bei junger Gewohnheit: nur vorhandene Tage', asc([hsp('s', { createdAt: '2026-11-10T08:00:00' })], dates('2026-11-10', '2026-11-12').map((d) => c1('s', d)), 'start')[0], { area: 'sport', rate: 43, days: 7 })
eq('Anfang: heute angelegt = null', asc([hsp('s', { createdAt: '2026-11-17T08:00:00' })], [], 'start')[0], { area: 'sport', rate: null, days: 0 })
eq('Bereiche: nur mit täglich/Wochentage-Gewohnheiten, Reihenfolge', asc([hsp('m', { area: 'musik' }), hsp('s'), hsp('p', { frequency: { type: 'perWeek', count: 2 }, area: 'lernen' }), hsp('a', { area: 'schlaf', archived: true })], [], 'current').map((a) => a.area), ['sport', 'musik'])
eq('Bereichs-Score: zwei Gewohnheiten im Bereich (50 %)', asc([hsp('a'), hsp('b')], days30.map((d) => c1('a', d)), 'current')[0].rate, 50)
import { goalTrend } from '../src/lib/goals'
const tg = (over: Partial<Goal>) => goal({ kind: 'count', startDate: '2026-11-01', targetDate: '2026-11-21', habitIds: ['h'], target: 10, ...over })
eq('Trend: ohne Frist = none', goalTrend(tg({ targetDate: undefined }), 0.9, '2026-11-11'), 'none')
eq('Trend: vor Plan = ahead', goalTrend(tg({}), 0.6, '2026-11-11'), 'ahead')
eq('Trend: hinter Plan = behind', goalTrend(tg({}), 0.4, '2026-11-11'), 'behind')
eq('Trend: genau im Plan = ahead', goalTrend(tg({}), 0.5, '2026-11-11'), 'ahead')
eq('Trend: Frist vorbei, nicht fertig = behind', goalTrend(tg({}), 0.9, '2026-11-25'), 'behind')
eq('Trend: Frist vorbei, fertig = ahead', goalTrend(tg({}), 1, '2026-11-25'), 'ahead')
eq('Trend: erledigtes Ziel = none', goalTrend(tg({ done: true }), 1, '2026-11-11'), 'none')
eq('Trend: Start in der Zukunft = none', goalTrend(tg({ startDate: '2026-11-20' }), 0, '2026-11-11'), 'none')
eq('Trend: Frist vor Start = none', goalTrend(tg({ targetDate: '2026-10-01' }), 0, '2026-11-11'), 'none')
eq('Trend: Teilschritte nutzen createdAt', goalTrend(goal({ kind: 'steps', createdAt: '2026-11-01T10:00:00', targetDate: '2026-11-21' }), 0.2, '2026-11-11'), 'behind')
eq('Trend: Sommerzeit-Grenze stabil', goalTrend(tg({ startDate: '2026-10-20', targetDate: '2026-10-30' }), 0.5, '2026-10-25'), 'ahead')
import { consistency } from '../src/lib/stats'
const cs = (h: Habit[], c: CheckIn[]) => { const r = consistency(h, c, today); return { rate: r.rate, days: r.days, active: r.active } }
const last30 = dates('2026-10-19', '2026-11-17') // 30 Tage inkl. heute
eq('Konstanz: 10 von 30 Tagen = 33 %', cs([hb('a')], last30.filter((_, i) => i % 3 === 0).map((d) => c1('a', d))), { rate: 33, days: 30, active: 10 })
eq('Konstanz: alle Tage = 100 %', cs([hb('a')], last30.map((d) => c1('a', d))).rate, 100)
eq('Konstanz: zwei Gewohnheiten am selben Tag zählen einmal', cs([hb('a'), hb('b')], [c1('a', '2026-11-16'), c1('b', '2026-11-16')]), { rate: 3, days: 30, active: 1 })
eq('Konstanz: Mini zählt', cs([hb('a')], [c1('a', '2026-11-16', { mini: true })]).active, 1)
eq('Konstanz: Mengen-Teilwert zählt nicht', cs([hb('q', { dailyTarget: 30 })], [c1('q', '2026-11-16', { value: 10 })]).active, 0)
eq('Konstanz: heute zählt mit', cs([hb('a')], [c1('a', '2026-11-17')]).active, 1)
eq('Konstanz: junge Gewohnheit (6 Tage inkl. heute)', cs([hb('a', { createdAt: '2026-11-12T08:00:00' })], dates('2026-11-12', '2026-11-14').map((d) => c1('a', d))), { rate: 50, days: 6, active: 3 })
eq('Konstanz: ohne Gewohnheiten = null', cs([], []).rate, null)
eq('Konstanz: gelöschte Gewohnheit ignoriert', cs([hb('a', { deleted: true })], [c1('a', '2026-11-16')]).rate, null)
eq('Konstanz: Haken außerhalb des Fensters zählen nicht', cs([hb('a')], [c1('a', '2026-10-01')]).active, 0)
import { dailyTips, weekFeedback } from '../src/lib/coach'
import type { WeekSummary } from '../src/lib/review'
const at = (day: string, hour = 10) => { const d = D(day); d.setHours(hour, 0, 0, 0); return d }
const coach = (habits: Habit[], cis: CheckIn[], goals: Goal[], when: Date, limit = 5) => {
  const progress = computeProgress(habits, cis, when, goals)
  const insights = computeInsights(habits, cis, when)
  return dailyTips({ habits, checkIns: cis, goals, progress, insights, today: when }, limit)
}
const ids = (t: ReturnType<typeof coach>) => t.map((x) => x.id)
const TUE = '2026-11-17'
// 1) Streak in Gefahr
const lauf = hb('l', { name: 'Laufen', createdAt: '2026-01-01T08:00:00' })
const streak7 = dates('2026-11-10', '2026-11-16').map((d) => c1('l', d))
const t1 = coach([lauf], streak7, [], at(TUE))
eq('Tipp: Streak in Gefahr zuerst', t1[0].id, 'streak-risk')
eq('Tipp: Streak-Text mit Tagen und Name', t1[0].text.startsWith('Deine 7-Tage-Streak bei Laufen endet, wenn du heute nichts machst.'), true)
eq('Tipp: Mini-Version wird genannt', coach([{ ...lauf, miniVersion: '2 Min dehnen' }], streak7, [], at(TUE))[0].text.includes('Mini-Version („2 Min dehnen“)'), true)
const streak12 = Array.from({ length: 12 }, (_, i) => { const d = new Date(2026, 10, 16 - i); return c1('l', key(d)) })
eq('Tipp: Freeze-Hinweis ohne Mini', coach([lauf], streak12, [], at(TUE))[0].text.includes('Freeze'), true)
eq('Tipp: nicht wenn heute erledigt', ids(coach([lauf], [...streak7, c1('l', TUE)], [], at(TUE))).includes('streak-risk'), false)
eq('Tipp: Streak unter 3 Tagen kein Alarm', ids(coach([lauf], [c1('l', '2026-11-15'), c1('l', '2026-11-16')], [], at(TUE))).includes('streak-risk'), false)
// 2) Alles erledigt
const done = coach([lauf], [...streak7, c1('l', TUE)], [], at(TUE))
eq('Tipp: alles erledigt', { id: done[0].id, streak: done[0].text.includes('8 Tage') }, { id: 'all-done', streak: true })
// 3) Abend / Morgen
const two = [hb('a', { name: 'Lesen' }), hb('b', { name: 'Dehnen' })]
const ev = coach(two, [], [], at(TUE, 19))
eq('Tipp: Abend-Check mit Namen', ev.find((t) => t.id === 'evening-open')?.text, 'Abend-Check: noch 2 Gewohnheiten offen – Lesen, Dehnen.')
eq('Tipp: Abend-Check nicht am Morgen', ids(coach(two, [], [], at(TUE, 8))).includes('evening-open'), false)
eq('Tipp: Morgenplan', coach(two, [], [], at(TUE, 8))[0].id, 'morning-plan')
eq('Tipp: Morgenplan nur ohne wichtigere Tipps', ids(coach([lauf], streak7, [], at(TUE, 8))).includes('morning-plan'), false)
// 4) Schwächster Wochentag
const noTue = dates('2026-08-25', '2026-11-16').filter((d) => D(d).getDay() !== 2).map((d) => c1('l', d))
const weakTips = coach([lauf], noTue, [], at(TUE), 6)
eq('Tipp: schwächster Wochentag erkannt', weakTips.find((t) => t.id === 'weak-weekday')?.text.startsWith('Heute ist Dienstag: bei Laufen ist das dein schwächster Tag (0 %, sonst Ø'), true)
eq('Tipp: Wochentag-Regel nur am passenden Tag', ids(coach([lauf], noTue, [], at('2026-11-18'), 6)).includes('weak-weekday'), false)
// 5) Ziel im Rückstand
const cgoal = goal({ id: 'g', title: '10 Läufe', kind: 'count', habitIds: ['l'], target: 10, startDate: '2026-11-01', targetDate: '2026-11-21', done: false })
const gt = coach([lauf], [c1('l', '2026-11-02'), c1('l', '2026-11-03')], [cgoal], at(TUE))
eq('Tipp: Ziel im Rückstand', gt.find((t) => t.id === 'goal-behind')?.text, 'Dein Ziel „10 Läufe“ liegt hinter dem Zeitplan: noch 8 Haken bis 21. November.')
eq('Tipp: Ziel im Plan kein Hinweis', ids(coach([lauf], dates('2026-11-01', '2026-11-12').map((d) => c1('l', d)), [cgoal], at(TUE))).includes('goal-behind'), false)
// 6) Menge offen
const lern = hb('q', { name: 'Lernen', dailyTarget: 30, unit: 'min' })
eq('Tipp: Menge offen', coach([lern], [c1('q', TUE, { value: 20 })], [], at(TUE)).find((t) => t.id === 'qty-open')?.text, 'Noch 10 min bis zum Tagesziel bei Lernen.')
eq('Tipp: Menge ohne Anfang kein Menge-Tipp', ids(coach([lern], [], [], at(TUE))).includes('qty-open'), false)
// 7) Wochenziel
const yoga = hb('y', { name: 'Yoga', frequency: { type: 'perWeek', count: 3 } })
eq('Tipp: Wochenziel normal (Dienstag)', coach([yoga], [], [], at(TUE)).find((t) => t.id === 'week-goal')?.text, 'Yoga: noch 3× diese Woche, 6 Tage übrig.')
const sun = coach([yoga], [], [], at('2026-11-22'))
eq('Tipp: Wochenziel dringend (Sonntag)', { id: sun[0].id, text: sun[0].text }, { id: 'week-goal', text: 'Yoga: noch 3× diese Woche, aber nur noch 1 Tag – heute ist ein guter Tag dafür.' })
eq('Tipp: Wochenziel erreicht kein Hinweis', ids(coach([yoga], ['2026-11-16', '2026-11-17', '2026-11-18'].map((d) => c1('y', d)), [], at('2026-11-19'))).includes('week-goal'), false)
// 8) Meilenstein / Rekord
const streak5 = dates('2026-11-12', '2026-11-16').map((d) => c1('l', d))
eq('Tipp: Meilenstein in Reichweite', coach([lauf], streak5, [], at(TUE), 6).find((t) => t.id === 'milestone-near')?.text, 'Noch 2 Tage bis 🥉 7 Tage bei Laufen.')
const streak4 = dates('2026-11-13', '2026-11-16').map((d) => c1('l', d))
eq('Tipp: Rekord in Reichweite', ids(coach([lauf], streak4, [], at(TUE), 6)).includes('record-near'), true)
eq('Tipp: Rekord nicht bei längerer früherer Serie', ids(coach([lauf], [...dates('2026-10-01', '2026-10-20').map((d) => c1('l', d)), ...streak4], [], at(TUE), 6)).includes('record-near'), false)
// 9) Leere Zustände
eq('Tipp: ohne Gewohnheiten', coach([], [], [], at(TUE))[0].id, 'empty')
eq('Tipp: nichts fällig (nur Sa/So)', coach([hb('w', { frequency: { type: 'weekdays', days: [5, 6] } })], [], [], at(TUE))[0].id, 'nothing-due')
// 10) Reihenfolge, Limit, Archiv
const many = coach([lauf, yoga, lern, ...two], streak7, [cgoal], at(TUE, 19), 10)
eq('Tipps: aufsteigend nach Priorität', many.every((t, i) => i === 0 || many[i - 1].priority <= t.priority), true)
eq('Tipps: keine doppelten IDs', new Set(ids(many)).size, many.length)
eq('Tipps: Limit 2 Standard', coach([lauf, yoga, lern, ...two], streak7, [cgoal], at(TUE, 19), 2).length, 2)
eq('Tipps: archivierte/gelöschte ignoriert', coach([{ ...lauf, archived: true }, { ...yoga, deleted: true }], streak7, [], at(TUE))[0].id, 'empty')
// --- Wochenfazit
const mkSum = (over: Partial<WeekSummary> = {}): WeekSummary => ({
  weekStart: '2026-11-09', weekEnd: '2026-11-15', inProgress: false,
  days: [{ date: '2026-11-09', score: 100, due: 1 }, { date: '2026-11-10', score: 40, due: 1 }, { date: '2026-11-11', score: null, due: 0 }],
  avg: 70, prevAvg: 58, delta: 12, best: { date: '2026-11-09', score: 100, due: 1 },
  checkins: 9, xp: 120, weeklyGoals: { reached: 2, total: 3 }, newBadges: [{ id: 'x', tier: 0, label: 'Laufen · 7 Tage', threshold: 7, reached: true }], ...over,
})
const noIns = computeInsights([], [], at(TUE))
const wf = (o: Partial<WeekSummary> = {}) => weekFeedback(mkSum(o), noIns, [lauf])
eq('Fazit: starke Woche', wf()[0], 'Starke Woche: 70 % (+12 Punkte zur Vorwoche).')
eq('Fazit: gute Woche', wf({ delta: 5 })[0], 'Gute Woche: 70 %, 5 Punkte besser als davor.')
eq('Fazit: stabile Woche', wf({ delta: 0 })[0], 'Stabile Woche: 70 %, ähnlich wie die Vorwoche.')
eq('Fazit: etwas schwächer', wf({ delta: -5 })[0], 'Etwas schwächer als die Vorwoche: 70 % (-5 Punkte).')
eq('Fazit: schwächere Woche', wf({ delta: -15 })[0].startsWith('Schwächere Woche: 70 % (-15 Punkte).'), true)
eq('Fazit: ohne Vorwoche', wf({ delta: null, prevAvg: null })[0], 'Dein Score liegt bei 70 %.')
eq('Fazit: ohne Daten', wf({ avg: null, delta: null })[0], 'Für diese Woche gibt es noch keine Auswertung.')
eq('Fazit: Zwischenstand zuerst', wf({ inProgress: true })[0], 'Die Woche läuft noch – das ist ein Zwischenstand.')
const full = wf()
eq('Fazit: bester/schwächster Tag', full.includes('Bester Tag: Montag (100 %), schwächster: Dienstag (40 %).'), true)
eq('Fazit: Wochenziele, Abzeichen, Haken/XP', [full.includes('Wochenziele: 2 von 3 erreicht.'), full.includes('Neue Abzeichen: 🥉 Laufen · 7 Tage.'), full.includes('9 Haken und +120 XP.')], [true, true, true])
eq('Fazit: Idee am Ende', full[full.length - 1].startsWith('Idee für nächste Woche'), true)
eq('Fazit: kein bester/schlechtester Tag bei einem Tag', wf({ days: [{ date: '2026-11-09', score: 100, due: 1 }] }).some((s) => s.startsWith('Bester Tag')), false)
eq('Fazit: Idee bei Rückgang', wf({ delta: -8, avg: 60 }).at(-1), 'Idee für nächste Woche: Wähle eine Gewohnheit und sichere sie jeden Tag mit der Mini-Version ab.')
eq('Fazit: Idee bei sehr gutem Score', wf({ avg: 95, delta: 4 }).at(-1), 'Idee für nächste Woche: Du bist stark unterwegs – erhöhe bei einer Gewohnheit das Tagesziel ein wenig.')
const insW = computeInsights([{ ...lauf, miniVersion: '2 Min dehnen' }], noTue, at(TUE))
eq('Fazit: Idee aus schwächstem Wochentag mit Mini-Version', weekFeedback(mkSum(), insW, [{ ...lauf, miniVersion: '2 Min dehnen' }]).at(-1), 'Idee für nächste Woche: Sichere Laufen dienstags mit der Mini-Version („2 Min dehnen“) ab.')
eq('Fazit: höchstens 7 Sätze', wf({ inProgress: true }).length <= 7, true)
// Lücke geschlossen: tagsüber offene Gewohnheiten ohne Anlass bekommen einen Tipp
eq('Tipp: nachmittags offen -> day-open', coach(two, [], [], at(TUE, 14))[0], { id: 'day-open', icon: '⏳', priority: 75, text: 'Noch offen heute: Lesen, Dehnen. Schon ein kleiner Schritt zählt.' })
eq('Tipp: nachmittags mit Mini-Version', coach([{ ...two[0], miniVersion: '5 Min' }], [], [], at(TUE, 14))[0].text.endsWith('nutze bei Bedarf die Mini-Version.'), true)
eq('Tipp: 12:00 Grenze = day-open', coach(two, [], [], at(TUE, 12))[0].id, 'day-open')
eq('Tipp: 11:00 = morning-plan', coach(two, [], [], at(TUE, 11))[0].id, 'morning-plan')
eq('Tipp: 17:00 = day-open, 18:00 = evening-open', [coach(two, [], [], at(TUE, 17))[0].id, coach(two, [], [], at(TUE, 18))[0].id], ['day-open', 'evening-open'])
eq('Tipp: Lücke geschlossen, zu jeder Stunde bei offener Gewohnheit mindestens ein Tipp', Array.from({ length: 24 }, (_, h) => coach(two, [], [], at(TUE, h)).length).every((n) => n >= 1), true)
eq('Tipp: alles erledigt zu jeder Stunde ein Tipp', Array.from({ length: 24 }, (_, h) => coach(two, [c1('a', TUE), c1('b', TUE)], [], at(TUE, h)).length).every((n) => n >= 1), true)
// --- Einheiten (nur Ist) und Mengen-Ziele mit Etappen
import { activityDays, activityXp, entriesSum, isActivityDay } from '../src/lib/activities'
import { goalProgress as gp2, goalTrend as gt2, milestoneStates, nextMilestone } from '../src/lib/goals'
import { computeProgress as computeProgressP } from '../src/lib/progress'
import type { Activity, ActivityEntry, Goal } from '../src/lib/types'
const act: Activity = { id: 'a1', name: 'Laufen', icon: '🏃', area: 'sport', unit: 'km', days: [1, 3, 5], createdAt: '2026-11-01T10:00:00', updatedAt: '', deleted: false }
const ae = (date: string, value: number, extra: Partial<ActivityEntry> = {}): ActivityEntry => ({ id: 'e' + date + value, planId: 'a1', date, value, updatedAt: '', deleted: false, ...extra })
const aEntries: ActivityEntry[] = [
  ae('2026-11-01', 4), // vor dem Start
  ae('2026-11-03', 5), ae('2026-11-04', 3), ae('2026-11-05', 8), ae('2026-11-07', 10), ae('2026-11-10', 6),
  ae('2026-11-12', 8), ae('2026-11-14', 12), ae('2026-11-17', 4.5),
  ae('2026-11-18', 9), // Zukunft
  ae('2026-11-13', 7, { deleted: true }), // gelöscht
  { ...ae('2026-11-03', 99), planId: 'andere' }, // andere Einheit
]
const amountGoal: Goal = { id: 'g1', title: '500 km laufen', area: 'sport', kind: 'amount', steps: [], habitIds: [], target: 500, startDate: '2026-11-02', targetDate: '2027-03-31', activityIds: ['a1'], unit: 'km', milestones: [{ id: 'm2', date: '2026-12-31', value: 250 }, { id: 'm1', date: '2026-11-30', value: 100 }], done: false, createdAt: '2026-11-01T10:00:00', updatedAt: '', deleted: false }
eq('Einheit: Erinnerungstage aus days', activityDays(act), [1, 3, 5])
eq('Einheit: Altdaten (Wochenplan) ergeben Tage', activityDays({ ...act, days: undefined, schedule: [0, 5, 0, 8, 0, 12, 0] }), [1, 3, 5])
eq('Einheit: Dienstag ist Tag, Mittwoch nicht', [isActivityDay(act, '2026-11-17'), isActivityDay(act, '2026-11-18')], [true, false])
eq('Einheit: Summe im Zeitraum ohne Vorher/Zukunft/gelöscht/fremd', entriesSum(aEntries, ['a1'], '2026-11-02', '2026-11-17'), 56.5)
eq('Einheit: Summe ohne Auswahl ist 0', entriesSum(aEntries, [], '2026-11-02', '2026-11-17'), 0)
eq('Einheit-XP: 10 je Eintrag (8 gültige, ohne Vorher-Tag zählt hier mit)', activityXp([act], aEntries, '2026-11-17'), { areaXp: { sport: 90 }, total: 90 })
eq('Einheit-XP: gelöschte Einheit zählt nicht', activityXp([{ ...act, deleted: true }], aEntries, '2026-11-17').total, 0)
eq('Einheit-XP in Gesamt-Fortschritt', computeProgressP([], [], new Date(2026, 10, 17), [], { activities: [act], entries: aEntries }).totalXp, 90)
eq('Einheit-XP: ohne Daten unverändert', computeProgressP([], [], new Date(2026, 10, 17)).totalXp, 0)
const gp = gp2(amountGoal, [], '2026-11-17', [], aEntries)
eq('Menge-Ziel: Fortschritt', { v: gp.value, t: gp.total, r: gp.ratio }, { v: 56.5, t: 500, r: 0.113 })
eq('Menge-Ziel: Fortschritt ohne Einträge', gp2(amountGoal, [], '2026-11-17', [], []).value, 0)
eq('Menge-Ziel: Startdatum begrenzt', gp2({ ...amountGoal, startDate: '2026-11-10' }, [], '2026-11-17', [], aEntries).value, 30.5)
eq('Menge-Ziel: gedeckelt bei 100 %', gp2({ ...amountGoal, target: 50 }, [], '2026-11-17', [], aEntries).ratio, 1)
const ms = milestoneStates(amountGoal, 56.5, '2026-11-17')
eq('Etappen: nach Datum sortiert, offen', ms.map((x) => [x.m.id, x.reached, x.overdue]), [['m1', false, false], ['m2', false, false]])
eq('Etappen: nächste offene', nextMilestone(ms)?.m.id, 'm1')
eq('Etappen: erreicht + nächste', (() => { const x = milestoneStates(amountGoal, 120, '2026-11-17'); return [x.map((y) => y.reached), nextMilestone(x)?.m.id] })(), [[true, false], 'm2'])
eq('Etappen: überfällig nach Datum', milestoneStates(amountGoal, 56.5, '2026-12-01').map((x) => x.overdue), [true, false])
eq('Etappen: am Stichtag noch nicht überfällig', milestoneStates(amountGoal, 56.5, '2026-11-30')[0].overdue, false)
eq('Etappen: alle erreicht, keine nächste', nextMilestone(milestoneStates(amountGoal, 300, '2026-11-17')), null)
eq('Etappen: bei Nicht-Mengenziel leer', milestoneStates({ ...amountGoal, kind: 'count' }, 1, '2026-11-17'), [])
eq('Trend Menge: auf Kurs bei offener Etappe in der Zukunft', gt2(amountGoal, gp.ratio, '2026-11-17'), 'ahead')
eq('Trend Menge: Rückstand bei überfälliger Etappe', gt2(amountGoal, gp.ratio, '2026-12-01'), 'behind')
eq('Trend Menge: Etappe erreicht = kein Rückstand', gt2({ ...amountGoal, milestones: [{ id: 'm1', date: '2026-11-10', value: 50 }] }, gp.ratio, '2026-11-17'), 'ahead')
eq('Trend Menge ohne Etappen: lange Frist = auf Kurs', gt2({ ...amountGoal, milestones: undefined }, gp.ratio, '2026-11-17'), 'ahead')
eq('Trend Menge ohne Etappen: kurze Frist = Rückstand (linear)', gt2({ ...amountGoal, milestones: undefined, targetDate: '2026-12-02' }, gp.ratio, '2026-11-17'), 'behind')
eq('Trend Menge ohne Etappen und ohne Frist: kein Trend', gt2({ ...amountGoal, milestones: undefined, targetDate: undefined }, gp.ratio, '2026-11-17'), 'none')
eq('Trend Menge: erledigt = kein Trend', gt2({ ...amountGoal, done: true }, gp.ratio, '2026-12-01'), 'none')
const coachAmt = (g: Goal, when: Date) => dailyTips({ habits: [lauf], checkIns: [], goals: [g], activityEntries: aEntries, progress: computeProgress([lauf], [], when, [g]), insights: computeInsights([lauf], [], when), today: when }, 10)
eq('Tipp Menge: überfällige Etappe wird genannt', coachAmt(amountGoal, at('2026-12-01')).find((t) => t.id === 'goal-behind')?.text, 'Bei „500 km laufen“ ist die Etappe 100 km (bis 30. November) noch offen: es fehlen 34,5 km.')
eq('Tipp Menge: ohne Rückstand kein Hinweis', coachAmt(amountGoal, at(TUE)).some((t) => t.id === 'goal-behind'), false)
// Wochenrückblick zählt Einheiten-XP mit (zwei Einträge in der Woche 16.–22.11., einer davor)
const wkAct = weekSummary([lh], [], [], '2026-11-16', today, { activities: [act], entries: [ae('2026-11-10', 3), ae('2026-11-16', 5), ae('2026-11-17', 6)] })
eq('Rückblick: Einheiten-XP der Woche', wkAct.xp, 20)
eq('Rückblick: ohne Einheiten-Daten unverändert', weekSummary([lh], [], [], '2026-11-16', today).xp, 0)
// Verknüpfung Einheit ↔ Ziel: setActivityGoalLinks nutzt db (IndexedDB), hier nur die Zählung über activityIds
eq('Ziel ohne verknüpfte Einheit zählt 0', gp2({ ...amountGoal, activityIds: [] }, [], '2026-11-17', [], aEntries).value, 0)
eq('Ziel zählt nur verknüpfte Einheiten', gp2({ ...amountGoal, activityIds: ['a1', 'a2'] }, [], '2026-11-17', [], [...aEntries, ae('2026-11-16', 7, { planId: 'a2' })]).value, 63.5)
// Frist-Rechnung im Ziel-Assistenten
import { addMonthsKey, deadlineInfo } from '../src/lib/goals'
eq('Frist: 14 Tage = 2 Wochen', deadlineInfo('2026-12-01', '2026-11-17'), { days: 14, weeks: 2 })
eq('Frist: über Zeitumstellung (Okt→Nov) rundet korrekt', deadlineInfo('2026-11-02', '2026-10-24').days, 9)
eq('Frist: heute = 0 Tage, vergangen negativ', [deadlineInfo('2026-11-17', '2026-11-17').days, deadlineInfo('2026-11-10', '2026-11-17').days], [0, -7])
eq('+1 Monat', addMonthsKey('2026-11-17', 1), '2026-12-17')
eq('+3 Monate über Jahreswechsel', addMonthsKey('2026-11-17', 3), '2027-02-17')
eq('31.01. + 1 Monat = 28.02.', addMonthsKey('2027-01-31', 1), '2027-02-28')
eq('+12 Monate', addMonthsKey('2026-11-17', 12), '2027-11-17')
// Eigene Reihenfolge
import { byOrder, mergeVisibleOrder, moveId, nextSortOrder, orderChanges } from '../src/lib/order'
const o = (id: string, sortOrder: number | undefined, createdAt: string) => ({ id, sortOrder, createdAt })
eq('Reihenfolge: ohne sortOrder nach Anlegen', [o('b', undefined, '2026-01-02'), o('a', undefined, '2026-01-01')].sort(byOrder).map((x) => x.id), ['a', 'b'])
eq('Reihenfolge: sortOrder schlägt Anlegen, ohne Wert zuerst', [o('x', 1, '2026-01-01'), o('y', 0, '2026-01-09'), o('z', undefined, '2026-01-05')].sort(byOrder).map((x) => x.id), ['z', 'y', 'x'])
eq('Reihenfolge: neuer Eintrag ans Ende', [nextSortOrder([]), nextSortOrder([{}, {}]), nextSortOrder([{ sortOrder: 4 }, { sortOrder: 1 }, {}])], [0, 0, 5])
eq('moveId nach unten/oben', [moveId(['a', 'b', 'c'], 0, 2), moveId(['a', 'b', 'c'], 2, 0), moveId(['a', 'b', 'c'], 1, 1)], [['b', 'c', 'a'], ['c', 'a', 'b'], ['a', 'b', 'c']])
eq('moveId ungültig bleibt unverändert', moveId(['a', 'b'], 5, 0), ['a', 'b'])
eq('Sichtbare tauschen, versteckte behalten Platz', mergeVisibleOrder(['a', 'h1', 'b', 'h2', 'c'], ['c', 'a', 'b']), ['c', 'h1', 'a', 'h2', 'b'])
eq('Nur geänderte Positionen werden geschrieben', orderChanges([o('a', 0, 'x'), o('b', 1, 'x'), o('c', 2, 'x')], ['a', 'c', 'b']), [{ id: 'c', sortOrder: 1 }, { id: 'b', sortOrder: 2 }])
eq('Erste Sortierung nummeriert alle (auch ohne Wert)', orderChanges([o('a', undefined, 'x'), o('b', undefined, 'x')], ['b', 'a']), [{ id: 'b', sortOrder: 0 }, { id: 'a', sortOrder: 1 }])
// Feier-Moment: Erkennung
import { highestSeenLevel, reachedMilestones } from '../src/lib/celebrate'
const rm = (value: number) => reachedMilestones([amountGoal], [ae('2026-11-17', value)], '2026-11-17').map((x) => x.key)
eq('Feier: Etappe erst bei Erreichen', [rm(40), rm(100)], [[], ['ms:g1:m1']])
eq('Feier: beide Etappen erreicht', rm(300), ['ms:g1:m1', 'ms:g1:m2'])
eq('Feier: Ziel ohne Etappen/erledigt/gelöscht feiert nichts', [reachedMilestones([{ ...amountGoal, milestones: undefined }], [ae('2026-11-17', 300)], '2026-11-17').length, reachedMilestones([{ ...amountGoal, done: true }], [ae('2026-11-17', 300)], '2026-11-17').length, reachedMilestones([{ ...amountGoal, deleted: true }], [ae('2026-11-17', 300)], '2026-11-17').length], [0, 0, 0])
eq('Feier: höchstes gefeiertes Level', [highestSeenLevel(new Set(['level:2', 'level:5', 'ms:x'])), highestSeenLevel(new Set())], [5, 0])
// Bereiche
import { areaColor as areaColorR, areaLabel as areaLabelR, buildAreaDefs, builtinAreaId, DEFAULT_AREAS, getAreas, pickableAreas, setAreaRows } from '../src/lib/areas'
import type { AreaRow } from '../src/lib/types'
const arow = (key: string, extra: Partial<AreaRow> = {}): AreaRow => ({ id: 'id-' + key, key, name: key, color: '#112233', glyph: 'star', hidden: false, createdAt: '2026-11-01T10:00:00', updatedAt: '', deleted: false, ...extra })
eq('Bereiche: ohne Zeilen die fünf Standard-Bereiche', buildAreaDefs([]).map((d) => d.key), ['sport', 'lernen', 'schlaf', 'musik', 'sonstiges'])
eq('Bereiche: Überschreibung ändert Name/Farbe/Symbol/ausgeblendet', (() => { const d = buildAreaDefs([arow('schlaf', { name: 'Erholung', color: '#445566', glyph: 'bed', hidden: true })]).find((x) => x.key === 'schlaf')!; return [d.label, d.color, d.glyph, d.hidden, d.builtin] })(), ['Erholung', '#445566', 'bed', true, true])
eq('Bereiche: eigene Bereiche hinten, nach Anlegen sortiert', buildAreaDefs([arow('b', { createdAt: '2026-11-03T10:00:00' }), arow('a', { createdAt: '2026-11-02T10:00:00' })]).slice(5).map((d) => d.key), ['a', 'b'])
eq('Bereiche: gelöschte eigene und gelöschte Überschreibung zählen nicht', [buildAreaDefs([arow('x', { deleted: true })]).length, buildAreaDefs([arow('sport', { name: 'X', deleted: true })])[0].label], [5, 'Sport'])
eq('Bereiche: feste IDs sind eindeutig und UUID-förmig', (() => { const ids = DEFAULT_AREAS.map((d) => builtinAreaId(d.key)!); return [new Set(ids).size, ids.every((x) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/.test(x)), builtinAreaId('eigener')] })(), [5, true, null])
setAreaRows([arow('schlaf', { name: 'Erholung', hidden: true }), arow('eigen', { name: 'Garten', color: '#4ade80' })])
eq('Register: Label/Farbe, unbekannt = Sonstiges', [areaLabelR('eigen'), areaColorR('eigen'), areaLabelR('gibt-es-nicht'), areaLabelR('schlaf')], ['Garten', '#4ade80', 'Sonstiges', 'Erholung'])
eq('Register: ausgeblendet nicht in Auswahl, aber wenn aktuell gewählt', [getAreas().some((d) => d.key === 'schlaf'), pickableAreas('schlaf').some((d) => d.key === 'schlaf'), pickableAreas('sport').some((d) => d.key === 'schlaf')], [false, true, false])
setAreaRows([])
eq('Register: zurückgesetzt', areaLabelR('schlaf'), 'Schlaf')
// 90-Tage-Muster
import { doneDaysIn, fullDays, heatAlpha, heatKeys } from '../src/lib/heat'
const hk = heatKeys(new Date(2026, 10, 17))
eq('Heat: 90 Tage, heute zuletzt, älteste zuerst', [hk.length, hk[89], hk[0], hk[88]], [90, '2026-11-17', '2026-08-20', '2026-11-16'])
eq('Heat: über Zeitumstellung keine Lücke/Doppelung', new Set(hk).size, 90)
eq('Heat: volle Tage zählen nur Score 100', fullDays(new Map<string, number | null>([['2026-11-17', 100], ['2026-11-16', 99], ['2026-11-15', null], ['2026-11-14', 100]]), hk), 2)
eq('Heat: Tage außerhalb des Zeitraums zählen nicht', fullDays(new Map<string, number | null>([['2025-01-01', 100]]), hk), 0)
eq('Heat: erledigte Tage einer Gewohnheit', doneDaysIn(new Set(['2026-11-17', '2026-11-16', '2020-01-01']), hk), 2)
eq('Heat: Deckkraft 0 / 50 / 100 / über 100', [heatAlpha(0), heatAlpha(50), heatAlpha(100), heatAlpha(150)], [0, 0.64, 1, 1])
process.exit(fail ? 1 : 0)
