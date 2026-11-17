import { useMemo, useState } from 'react'
import { dayKey } from '../lib/db'
import { computeStats, weeklyGoals } from '../lib/stats'
import type { CheckIn, Habit } from '../lib/types'
import SectionTitle from './widgets/SectionTitle'

type Mode = 'week' | 'month'

const fmtDay = (key: string, long = false) =>
  new Date(`${key}T12:00:00`).toLocaleDateString('de-DE', {
    weekday: long ? 'long' : 'short',
    day: 'numeric',
    month: long ? 'long' : 'short',
  })

// Cyan-Balken; schwache Tage gelb, leere Tage grau
const barStyle = (s: number | null) =>
  s === null
    ? { background: 'transparent', border: '1px dashed var(--color-slate-700)' }
    : s >= 50
      ? { background: `linear-gradient(to top, var(--color-accent-600), var(--color-accent-400))`, opacity: s >= 80 ? 1 : 0.65, boxShadow: s >= 80 ? '0 0 10px rgb(31 220 240 / 0.45)' : undefined }
      : s > 0
        ? { background: '#f59e0b', opacity: 0.8 }
        : { background: 'var(--color-slate-700)' }

export default function StatsCard({ habits, checkIns, today }: { habits: Habit[]; checkIns: CheckIn[]; today: Date }) {
  const [mode, setMode] = useState<Mode>('week')
  const [picked, setPicked] = useState<string | null>(null)
  const n = mode === 'week' ? 7 : 30
  const todayKey = dayKey(today)

  const stats = useMemo(() => computeStats(habits, checkIns, today, n), [habits, checkIns, todayKey, n]) // eslint-disable-line
  const goals = useMemo(() => weeklyGoals(habits, checkIns, today, mode), [habits, checkIns, todayKey, mode]) // eslint-disable-line

  const hasData = stats.days.some((d) => d.score !== null)
  if (!hasData && goals.total === 0) return null

  const selected = stats.days.find((d) => d.date === (picked ?? todayKey))
  const { best } = stats.current

  return (
    <section className="mt-3 rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle glyph="trend" title="Score" />
        <div className="flex rounded-full border border-slate-700 p-0.5 text-sm" role="group" aria-label="Zeitraum">
          {(['week', 'month'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m)
                setPicked(null)
              }}
              aria-pressed={mode === m}
              className={`rounded-full px-3.5 py-1 ${mode === m ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
            >
              {m === 'week' ? 'Woche' : 'Monat'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex h-28 items-end gap-[3px]" role="list" aria-label={`Score der letzten ${n} Tage`}>
        {stats.days.map((d) => {
          const isToday = d.date === todayKey
          return (
            <button
              key={d.date}
              role="listitem"
              onClick={() => setPicked(d.date)}
              aria-label={`${fmtDay(d.date, true)}: ${d.score === null ? 'nichts fällig' : `${d.score} %`}`}
              className="flex h-full min-w-0 flex-1 items-end"
            >
              <span
                className={`block w-full rounded-full ${isToday ? 'ring-1 ring-slate-300' : ''} ${picked === d.date ? 'outline outline-1 outline-slate-200' : ''}`}
                style={{ height: d.score === null ? '8%' : `${Math.max(d.score, 6)}%`, ...barStyle(d.score) }}
              />
            </button>
          )
        })}
      </div>

      {mode === 'week' && (
        <div className="mt-1 flex gap-[3px] text-center text-[10px] text-slate-500">
          {stats.days.map((d) => (
            <span key={d.date} className="min-w-0 flex-1">
              {new Date(`${d.date}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'short' }).slice(0, 2)}
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 min-h-5 text-sm text-slate-300">
        {selected &&
          `${selected.date === todayKey ? 'Heute' : fmtDay(selected.date, true)}: ${
            selected.score === null ? 'nichts fällig' : `${selected.score} %`
          }${selected.date === todayKey && selected.score !== null ? ' (bisher)' : ''}`}
      </p>

      <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Ø {n} Tage</dt>
          <dd className="text-lg font-semibold">{stats.current.avg === null ? '–' : `${stats.current.avg} %`}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Bester Tag</dt>
          <dd className="text-lg font-semibold">{best ? `${best.score} %` : '–'}</dd>
          {best && <dd className="text-xs text-slate-500">{fmtDay(best.date)}</dd>}
        </div>
        <div>
          <dt className="text-xs text-slate-500">Vorperiode</dt>
          <dd
            className={`text-lg font-semibold ${
              stats.delta === null ? '' : stats.delta > 0 ? 'text-done' : stats.delta < 0 ? 'text-amber-400' : ''
            }`}
          >
            {stats.delta === null ? '–' : `${stats.delta > 0 ? '+' : ''}${stats.delta}`}
          </dd>
          <dd className="text-xs text-slate-500">Punkte</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-slate-500">Ø, bester Tag und Vergleich zählen nur abgeschlossene Tage (ohne heute).</p>

      {goals.total > 0 && (
        <p className="mt-3 border-t border-slate-800 pt-3 text-sm text-slate-300">
          {mode === 'week' ? 'Wochenziele diese Woche' : 'Wochenziele der letzten 4 Wochen'}:{' '}
          <span className="font-medium">
            {goals.reached} von {goals.total} erreicht
          </span>
        </p>
      )}
    </section>
  )
}
