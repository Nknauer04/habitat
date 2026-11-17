import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { dayKey, db } from '../lib/db'
import { weekFeedback } from '../lib/coach'
import { computeInsights } from '../lib/insights'
import {
  isoWeek,
  nextWeek,
  prevWeek,
  reviewId,
  reviewWeekFor,
  saveReviewNote,
  weekEndOf,
  weekStartOf,
  weekSummary,
} from '../lib/review'
import { useToday } from '../lib/useToday'
import { TierMedal } from '../components/widgets/glyphs'
import ReportCard from '../components/ReportCard'

const fmt = (key: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${key}T12:00:00`).toLocaleDateString('de-DE', opts)

const barColor = (s: number | null) =>
  s === null ? 'bg-slate-800' : s >= 80 ? 'bg-done' : s >= 50 ? 'bg-done/60' : s > 0 ? 'bg-amber-500/70' : 'bg-slate-600'

function NoteEditor({ weekStart, initial }: { weekStart: string; initial: string }) {
  const [text, setText] = useState(initial)
  const [saved, setSaved] = useState(initial !== '')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pending = useRef<string | null>(null)

  const flush = () => {
    clearTimeout(timer.current)
    if (pending.current !== null) {
      const v = pending.current
      pending.current = null
      void saveReviewNote(weekStart, v).then(() => setSaved(true))
    }
  }

  // Beim Verlassen der Seite oder Wochenwechsel sofort speichern
  useEffect(() => () => flush(), []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <label htmlFor="review-note" className="text-sm text-slate-400">
        Notiz zur Woche
      </label>
      <textarea
        id="review-note"
        value={text}
        rows={5}
        placeholder="Was lief gut? Was war schwer? Was ändere ich nächste Woche?"
        onChange={(e) => {
          setText(e.target.value)
          setSaved(false)
          pending.current = e.target.value
          clearTimeout(timer.current)
          timer.current = setTimeout(flush, 700)
        }}
        onBlur={flush}
        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base outline-none focus:border-accent-500"
      />
      <p className="mt-1 h-4 text-xs text-slate-500">{saved && text.trim() ? 'Gespeichert ✓' : ''}</p>
    </div>
  )
}

export default function Review() {
  const today = useToday()
  const navigate = useNavigate()
  const params = useParams()
  const currentWeek = weekStartOf(today)
  const requested = params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week) ? weekStartOf(new Date(`${params.week}T12:00:00`)) : null
  const weekStart = requested && requested <= currentWeek ? requested : reviewWeekFor(today)

  const habits = useLiveQuery(() => db.habits.filter((h) => !h.deleted).toArray(), [])
  const checks = useLiveQuery(() => db.checkIns.filter((c) => !c.deleted).toArray(), [])
  const goals = useLiveQuery(() => db.goals.filter((g) => !g.deleted).toArray(), [])
  const activities = useLiveQuery(() => db.plans.filter((a) => !a.deleted).toArray(), [])
  const actEntries = useLiveQuery(() => db.planEntries.filter((e) => !e.deleted).toArray(), [])
  // Ergebnis trägt seine Woche: beim Blättern liefert useLiveQuery kurz noch den Stand der vorigen Woche
  const review = useLiveQuery(async () => {
    const r = await db.reviews.get(reviewId(weekStart))
    return { week: weekStart, note: r && !r.deleted ? r.note : '' }
  }, [weekStart])
  const reviewReady = review !== undefined && review.week === weekStart

  const todayKey = dayKey(today)
  const summary = useMemo(
    () =>
      habits && checks && goals && activities && actEntries
        ? weekSummary(habits, checks, goals, weekStart, today, { activities, entries: actEntries })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [habits, checks, goals, activities, actEntries, weekStart, todayKey],
  )
  const insights = useMemo(
    () => (habits && checks ? computeInsights(habits, checks, today) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [habits, checks, todayKey],
  )

  const go = (w: string) => navigate(`/rueckblick/${w}`, { replace: true })
  const canNext = nextWeek(weekStart) <= currentWeek
  const label = `${fmt(weekStart, { day: 'numeric', month: 'short' })} – ${fmt(weekEndOf(weekStart), { day: 'numeric', month: 'short', year: 'numeric' })}`

  return (
    <div>
      <Link to="/verlauf" className="text-sm text-slate-400 hover:text-slate-200">
        ‹ Statistik
      </Link>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-accent-400">Wochenrückblick</h1>

      <div className="mt-3 flex items-center justify-between gap-2 rounded-3xl border border-slate-800 bg-slate-900 px-2 py-1">
        <button
          onClick={() => go(prevWeek(weekStart))}
          aria-label="Vorige Woche"
          className="h-10 w-10 rounded-lg text-lg text-slate-300 hover:bg-slate-800"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="font-medium">KW {isoWeek(weekStart)}</div>
          <div className="text-xs text-slate-400">
            {label}
            {summary?.inProgress && ' · läuft noch'}
          </div>
        </div>
        <button
          onClick={() => go(nextWeek(weekStart))}
          disabled={!canNext}
          aria-label="Nächste Woche"
          className="h-10 w-10 rounded-lg text-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {summary && (
        <>
          <section className="mt-5 rounded-3xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-xs text-slate-500">Score der Woche (Ø)</div>
                <div className="text-4xl font-semibold">{summary.avg === null ? '–' : `${summary.avg} %`}</div>
              </div>
              {summary.delta !== null && (
                <div
                  className={`rounded-full px-3 py-1 text-sm ${
                    summary.delta > 0
                      ? 'bg-done/15 text-done'
                      : summary.delta < 0
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {summary.delta > 0 ? '+' : ''}
                  {summary.delta} Punkte zur Vorwoche
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1.5" role="list" aria-label="Score je Tag">
              {Array.from({ length: 7 }, (_, i) => {
                const d = summary.days[i]
                const dateKey = dayKey(new Date(new Date(`${weekStart}T12:00:00`).getTime() + i * 86_400_000))
                return (
                  <div key={i} role="listitem" className="flex flex-col items-center gap-1" title={d ? `${d.score ?? 'nichts fällig'}` : ''}>
                    <div className="flex h-20 w-full items-end rounded-sm bg-slate-900">
                      {d && (
                        <div
                          className={`w-full rounded-sm ${barColor(d.score)}`}
                          style={{ height: d.score === null ? '6%' : `${Math.max(d.score, 4)}%` }}
                        />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {fmt(dateKey, { weekday: 'short' }).slice(0, 2)}
                    </span>
                  </div>
                )
              })}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-slate-500">Haken</dt>
                <dd className="text-lg font-semibold">{summary.checkins}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Verdiente XP</dt>
                <dd className="text-lg font-semibold">+{summary.xp}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Bester Tag</dt>
                <dd className="text-lg font-semibold">{summary.best ? `${summary.best.score} %` : '–'}</dd>
                {summary.best && <dd className="text-xs text-slate-500">{fmt(summary.best.date, { weekday: 'short', day: 'numeric', month: 'short' })}</dd>}
              </div>
              <div>
                <dt className="text-xs text-slate-500">Wochenziele</dt>
                <dd className="text-lg font-semibold">
                  {summary.weeklyGoals.total ? `${summary.weeklyGoals.reached}/${summary.weeklyGoals.total}` : '–'}
                </dd>
              </div>
            </dl>
          </section>

          {summary.newBadges.length > 0 && (
            <section className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <h2 className="font-medium">🏆 Neue Abzeichen</h2>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {summary.newBadges.map((b) => (
                  <li key={b.id}>
                    <TierMedal tier={b.tier} size={16} /> {b.label}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {summary && insights && habits && (
        <section className="mt-4 rounded-3xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="font-medium">Wochenfazit</h2>
          <ul className="mt-2 flex flex-col gap-2 text-sm text-slate-200">
            {weekFeedback(summary, insights, habits).map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-accent-400">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <Link to="/verlauf" className="mt-3 inline-block text-xs text-accent-400">
            Alle Insights in der Statistik
          </Link>
        </section>
      )}

      <section className="mt-4 rounded-3xl border border-slate-800 bg-slate-900 p-4">
        {reviewReady && <NoteEditor key={weekStart} weekStart={weekStart} initial={review.note} />}
      </section>

      <ReportCard
        key={weekStart}
        today={today}
        fixed={{ from: weekStart, to: weekEndOf(weekStart) < todayKey ? weekEndOf(weekStart) : todayKey, label: `KW ${isoWeek(weekStart)} (${label})` }}
      />
    </div>
  )
}
