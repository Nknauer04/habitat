import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CoachCard from '../components/CoachCard'
import HabitDialog from '../components/HabitDialog'
import { PlusIcon } from '../components/icons'
import LevelCard from '../components/LevelCard'
import PlanEntrySheet from '../components/PlanEntrySheet'
import QuantitySheet from '../components/QuantitySheet'
import { TIER_ICONS } from '../lib/badges'
import { dayKey, db } from '../lib/db'
import {
  TIMES,
  areaLabel,
  checkInValue,
  fmtQty,
  isCheckInDone,
  isDue,
  isMini,
  toggleCheckIn,
  toggleMini,
  weekRange,
} from '../lib/habits'
import { isUnitDone, planProgress, plannedOn } from '../lib/plans'
import type { HabitProgress } from '../lib/progress'
import { isoWeek, isReviewDay, reviewId, reviewWeekFor } from '../lib/review'
import { computeDayScores } from '../lib/stats'
import type { Habit } from '../lib/types'
import { dismissCoachFor, useCoachDismissedDay, useCoachEnabled } from '../lib/coachPrefs'
import { useBadges, useNewBadges } from '../lib/useBadges'
import { useCoachTips } from '../lib/useCoach'
import { useProgress } from '../lib/useProgress'
import { useToday } from '../lib/useToday'

const LETTERS = ['M', 'D', 'M', 'D', 'F', 'S', 'S']

const parseKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function streakText(p?: HabitProgress) {
  if (!p || p.streak === 0) return ''
  const unit = p.unit === 'Tage' ? 'T' : 'Wo.'
  return ` · 🔥 ${p.streak} ${unit}${p.freezes > 0 ? ` · ❄️ ${p.freezes}` : ''}`
}

// Kleiner Fortschrittsring (0–100) um die Tageszahl
function Ring({ pct, size = 36, stroke = 3.5, children }: { pct: number | null; size?: number; stroke?: number; children: React.ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = pct === null ? 0 : Math.max(0, Math.min(100, pct))
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-slate-700)" strokeWidth={stroke} />
        {p > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-done)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(c * p) / 100} ${c}`}
          />
        )}
      </svg>
      <span className="relative text-[15px] font-medium">{children}</span>
    </span>
  )
}

const CheckSvg = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)

export default function Today() {
  const today = useToday()
  const todayKey = dayKey(today)
  const [weekStart, weekEnd] = weekRange(today)
  const [picked, setPicked] = useState<string | null>(null) // null = heute
  const viewKey = picked && picked !== todayKey ? picked : todayKey
  const viewDate = parseKey(viewKey)
  const isToday = viewKey === todayKey
  const isFuture = viewKey > todayKey

  const [dialog, setDialog] = useState<{ habit?: Habit } | null>(null)
  const [sheetId, setSheetId] = useState<string | null>(null)
  const [planSheetId, setPlanSheetId] = useState<string | null>(null)
  const progress = useProgress(today)
  const coachOn = useCoachEnabled()
  const coachDismissed = useCoachDismissedDay()
  const coachTips = useCoachTips()
  const { fresh: freshBadges, dismiss: dismissBadges } = useNewBadges(useBadges(today))
  const reviewWeek = reviewWeekFor(today)
  const reviewNote = useLiveQuery(async () => (await db.reviews.get(reviewId(reviewWeek)))?.note ?? '', [reviewWeek])
  const [hintDismissed, setHintDismissed] = useState(() => {
    try {
      return localStorage.getItem('habitat:reviewHintDismissed') === reviewWeek
    } catch {
      return false
    }
  })
  const showReviewHint = isReviewDay(today) && reviewNote !== undefined && reviewNote.trim() === '' && !hintDismissed

  const habits = useLiveQuery(() => db.habits.filter((h) => !h.deleted && !h.archived).sortBy('createdAt'), [])
  const checks = useLiveQuery(
    () =>
      db.checkIns
        .where('date')
        .between(weekStart, weekEnd, true, true)
        .filter((c) => !c.deleted)
        .toArray(),
    [weekStart, weekEnd],
  )

  const plans = useLiveQuery(() => db.plans.filter((p) => !p.deleted).sortBy('createdAt'), [])
  const planEntries = useLiveQuery(() => db.planEntries.filter((e) => !e.deleted).toArray(), [])

  // Pläne: am geplanten Wochentag (oder bei vorhandenem Eintrag) anzeigen
  const planRows = (plans ?? [])
    .map((p) => {
      const mine = (planEntries ?? []).filter((e) => e.planId === p.id)
      const entry = mine.find((e) => e.date === viewKey)
      const soll = plannedOn(p, viewKey)
      const prog = planProgress(p, mine, todayKey)
      const show = p.startDate <= viewKey && (!!entry || (soll > 0 && !prog.reached))
      return { p, entry, soll, prog, done: !!entry && isUnitDone(p, entry), show }
    })
    .filter((r) => r.show)

  const rows = (habits ?? [])
    .map((h) => {
      const mine = (checks ?? []).filter((c) => c.habitId === h.id)
      const doneDays = mine.filter((c) => isCheckInDone(h, c))
      const doneToday = doneDays.some((c) => c.date === viewKey)
      const weekCount = new Set(doneDays.map((c) => c.date)).size
      const current = mine.filter((c) => c.date === viewKey).reduce((sum, c) => sum + checkInValue(h, c), 0)
      const miniToday = mine.some((c) => c.date === viewKey && isMini(h, c))
      const existed = dayKey(new Date(h.createdAt)) <= viewKey || doneToday
      return { h, doneToday, miniToday, weekCount, current, show: existed && isDue(h, viewDate, doneToday, weekCount) }
    })
    .filter((r) => r.show)

  // Score je Tag der Woche (Ring im Wochenstreifen)
  const weekScores = useMemo(() => {
    const m = new Map<string, number | null>()
    if (!habits || !checks) return m
    const last = weekEnd < todayKey ? parseKey(weekEnd) : today
    for (const d of computeDayScores(habits, checks, parseKey(weekStart), last)) m.set(d.date, d.score)
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits, checks, weekStart, weekEnd, todayKey])

  const done = rows.filter((r) => r.doneToday).length + planRows.filter((r) => r.done).length
  const dueCount = rows.length + planRows.length
  const viewScore = weekScores.get(viewKey) ?? null
  const dateText = viewDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
  const title = isToday ? 'Heute' : viewDate.toLocaleDateString('de-DE', { weekday: 'long' })
  const disabled = isFuture

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-4xl font-bold tracking-tight text-accent-400">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            {dateText}
            {dueCount > 0 && !isFuture && ` · ${done} von ${dueCount} erledigt`}
            {viewScore !== null && !isFuture && ` · Score ${viewScore} %`}
          </p>
        </div>
        <button
          onClick={() => setDialog({})}
          aria-label="Neue Gewohnheit"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-white active:bg-slate-800"
        >
          <PlusIcon width={24} height={24} />
        </button>
      </div>

      {/* Wochenstreifen */}
      <div className="mt-5 grid grid-cols-7 gap-1.5" role="group" aria-label="Woche">
        {Array.from({ length: 7 }, (_, i) => {
          const d = new Date(parseKey(weekStart))
          d.setDate(d.getDate() + i)
          const key = dayKey(d)
          const selected = key === viewKey
          const future = key > todayKey
          const score = weekScores.get(key) ?? null
          return (
            <button
              key={key}
              onClick={() => setPicked(key === todayKey ? null : key)}
              aria-pressed={selected}
              aria-label={`${d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}${
                future ? '' : score === null ? ', nichts fällig' : `, Score ${score} %`
              }`}
              className={`flex flex-col items-center gap-1.5 rounded-[1.6rem] border py-3 transition-colors ${
                selected ? 'border-slate-600 bg-slate-700 text-white' : 'border-slate-800 bg-slate-900 text-slate-300 active:bg-slate-800'
              } ${future && !selected ? 'opacity-60' : ''}`}
            >
              <span className={`text-[13px] font-semibold ${selected ? 'text-white' : 'text-slate-400'}`}>{LETTERS[i]}</span>
              <Ring pct={future ? null : score}>{d.getDate()}</Ring>
            </button>
          )
        })}
      </div>

      {!isToday && (
        <p className="mt-3 text-sm text-slate-400">
          {isFuture ? 'Zukünftige Tage kannst du nur ansehen.' : 'Du siehst einen früheren Tag – hier kannst du nachtragen.'}{' '}
          <button onClick={() => setPicked(null)} className="font-medium text-accent-400">
            Zurück zu heute
          </button>
        </p>
      )}

      {coachOn && isToday && coachDismissed !== todayKey && coachTips && coachTips.length > 0 && (
        <CoachCard tips={coachTips} onDismiss={() => dismissCoachFor(todayKey)} />
      )}

      {showReviewHint && isToday && (
        <div className="mt-5 flex items-center gap-3 rounded-3xl border border-accent-500/30 bg-accent-500/10 p-4">
          <span className="text-3xl">📋</span>
          <div className="min-w-0 flex-1 text-sm">
            <div className="font-semibold">Wochenrückblick bereit</div>
            <div className="text-slate-300">KW {isoWeek(reviewWeek)} · wie lief deine Woche?</div>
          </div>
          <button
            onClick={() => {
              try {
                localStorage.setItem('habitat:reviewHintDismissed', reviewWeek)
              } catch {
                /* Speicher nicht verfügbar */
              }
              setHintDismissed(true)
            }}
            className="shrink-0 rounded-full px-2.5 py-1.5 text-sm text-slate-400 active:bg-slate-800"
          >
            Später
          </button>
          <Link to={`/rueckblick/${reviewWeek}`} className="shrink-0 rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-black">
            Ansehen
          </Link>
        </div>
      )}

      {freshBadges.length > 0 && isToday && (
        <div role="status" className="mt-5 flex items-start gap-3 rounded-3xl border border-amber-500/40 bg-amber-500/10 p-4">
          <span className="text-3xl">🏆</span>
          <div className="min-w-0 flex-1 text-sm">
            <div className="font-semibold">{freshBadges.length === 1 ? 'Neues Abzeichen' : `${freshBadges.length} neue Abzeichen`}</div>
            <ul className="mt-0.5 text-slate-300">
              {freshBadges.slice(0, 3).map((b) => (
                <li key={b.id} className="truncate">
                  {TIER_ICONS[b.tier]} {b.label}
                </li>
              ))}
              {freshBadges.length > 3 && <li className="text-slate-400">+ {freshBadges.length - 3} weitere (siehe Statistik)</li>}
            </ul>
          </div>
          <button onClick={dismissBadges} className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-amber-200 active:bg-amber-500/20">
            OK
          </button>
        </div>
      )}

      {progress && habits && habits.length > 0 && isToday && <LevelCard progress={progress} />}

      {habits && habits.length === 0 && plans && plans.length === 0 && (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
          Noch keine Gewohnheiten.
          <br />
          Tippe auf <span className="text-accent-400">+</span>, um die erste anzulegen.
        </div>
      )}

      {habits && habits.length > 0 && rows.length === 0 && planRows.length === 0 && (
        <p className="mt-8 text-center text-slate-400">{isFuture ? 'Hier ist noch nichts zu sehen.' : 'Heute ist nichts fällig. 🎉'}</p>
      )}

      {TIMES.map((t) => {
        const section = rows.filter((r) => r.h.timeOfDay === t.value)
        if (!section.length) return null
        return (
          <section key={t.value} className="mt-7">
            <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{t.label}</h2>
            <ul className="flex flex-col gap-3">
              {section.map(({ h, doneToday, miniToday, weekCount, current }) => (
                <li
                  key={h.id}
                  className={`flex items-center gap-3 rounded-3xl border bg-slate-900 py-4 pl-5 pr-4 ${
                    doneToday ? 'border-done/25' : 'border-slate-800'
                  }`}
                >
                  <button onClick={() => setDialog({ habit: h })} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                    <span className="text-[2rem] leading-none">{h.icon}</span>
                    <span className="min-w-0">
                      <span className={`block truncate text-[19px] font-semibold ${doneToday ? 'text-slate-300' : ''}`}>{h.name}</span>
                      <span className="mt-0.5 block text-sm text-slate-400">
                        {areaLabel(h.area)}
                        {h.dailyTarget && ` · ${fmtQty(current)}/${fmtQty(h.dailyTarget)} ${h.unit ?? ''}`}
                        {miniToday && ' · Mini'}
                        {h.frequency.type === 'perWeek' && ` · ${weekCount}/${h.frequency.count} diese Woche`}
                        {isToday && streakText(progress?.byHabit.get(h.id))}
                      </span>
                    </span>
                  </button>

                  {h.miniVersion && (!doneToday || miniToday) && (
                    <button
                      onClick={() => void toggleMini(h, viewKey)}
                      disabled={disabled}
                      title={h.miniVersion}
                      aria-label={`Mini-Version: ${h.miniVersion}`}
                      aria-pressed={miniToday}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-40 ${
                        miniToday ? 'border-done/60 bg-done/20 text-done' : 'border-slate-700 text-slate-300 active:bg-slate-800'
                      }`}
                    >
                      Mini{miniToday ? ' ✓' : ''}
                    </button>
                  )}

                  <button
                    onClick={() => (h.dailyTarget ? setSheetId(h.id) : void toggleCheckIn(h.id, viewKey))}
                    disabled={disabled}
                    aria-label={
                      h.dailyTarget ? `${h.name}: Menge eintragen` : doneToday ? `${h.name} zurücknehmen` : `${h.name} abhaken`
                    }
                    aria-pressed={doneToday}
                    style={
                      h.dailyTarget && !doneToday
                        ? {
                            background: `conic-gradient(var(--color-done) ${Math.min(100, (current / h.dailyTarget) * 100)}%, var(--color-slate-700) 0)`,
                          }
                        : undefined
                    }
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
                      doneToday
                        ? miniToday
                          ? 'border-2 border-done/60 bg-done/25 text-done'
                          : 'border-2 border-done bg-done text-black'
                        : h.dailyTarget
                          ? ''
                          : 'border-2 border-slate-600 text-transparent active:border-done'
                    }`}
                  >
                    {h.dailyTarget && !doneToday ? (
                      <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-slate-900 text-[11px] font-medium text-slate-300">
                        {Math.round((current / h.dailyTarget) * 100)}%
                      </span>
                    ) : (
                      <CheckSvg />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {planRows.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Pläne</h2>
          <ul className="flex flex-col gap-3">
            {planRows.map(({ p, entry, soll, prog, done: unitDone }) => (
              <li
                key={p.id}
                className={`flex items-center gap-3 rounded-3xl border bg-slate-900 py-4 pl-5 pr-4 ${unitDone ? 'border-done/25' : 'border-slate-800'}`}
              >
                <Link to="/ziele" className="flex min-w-0 flex-1 items-center gap-4 text-left">
                  <span className="text-[2rem] leading-none">{p.icon}</span>
                  <span className="min-w-0">
                    <span className={`block truncate text-[19px] font-semibold ${unitDone ? 'text-slate-300' : ''}`}>{p.name}</span>
                    <span className="mt-0.5 block text-sm text-slate-400">
                      {soll > 0 ? `Soll ${fmtQty(soll)} ${p.unit}` : 'Zusatz-Einheit'}
                      {entry && ` · Ist ${fmtQty(entry.value)} ${p.unit}`}
                      {` · gesamt ${fmtQty(prog.total)}/${fmtQty(p.target)} ${p.unit}`}
                    </span>
                  </span>
                </Link>
                <button
                  onClick={() => setPlanSheetId(p.id)}
                  disabled={disabled}
                  aria-label={`${p.name}: Ist-Wert eintragen`}
                  aria-pressed={unitDone}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
                    unitDone
                      ? 'border-2 border-done bg-done text-black'
                      : entry
                        ? 'border-2 border-amber-400/70 text-[11px] font-medium text-amber-300'
                        : 'border-2 border-slate-600 text-lg text-slate-300 active:border-done'
                  }`}
                >
                  {unitDone ? <CheckSvg /> : entry ? `${Math.round((entry.value / soll) * 100)}%` : '+'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dialog && <HabitDialog habit={dialog.habit} onClose={() => setDialog(null)} />}
      {planSheetId &&
        (() => {
          const r = planRows.find((x) => x.p.id === planSheetId)
          return r ? <PlanEntrySheet plan={r.p} date={viewKey} current={r.entry?.value ?? 0} onClose={() => setPlanSheetId(null)} /> : null
        })()}
      {sheetId &&
        (() => {
          const r = rows.find((x) => x.h.id === sheetId)
          return r ? <QuantitySheet habit={r.h} date={viewKey} current={r.current} onClose={() => setSheetId(null)} /> : null
        })()}
    </div>
  )
}
