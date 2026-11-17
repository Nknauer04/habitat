import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AreaIcon, ChevronRightIcon, GearIcon, PersonIcon } from '../components/icons'
import { dayKey, db } from '../lib/db'
import { areaLabel } from '../lib/habits'
import { areaTitle, levelFor } from '../lib/progress'
import { useProfileName } from '../lib/profile'
import { areaScores, type ScoreMode } from '../lib/stats'
import { useProgress } from '../lib/useProgress'
import { useToday } from '../lib/useToday'

const roundBtn =
  'flex h-12 w-12 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-white active:bg-slate-800'

export default function Profile() {
  const today = useToday()
  const name = useProfileName()
  const progress = useProgress(today)
  const [mode, setMode] = useState<ScoreMode>('current')

  const habits = useLiveQuery(() => db.habits.filter((h) => !h.deleted).toArray(), [])
  const checks = useLiveQuery(() => db.checkIns.filter((c) => !c.deleted).toArray(), [])

  const todayKey = dayKey(today)
  const scores = useMemo(
    () => (habits && checks ? areaScores(habits, checks, today, mode) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [habits, checks, todayKey, mode],
  )
  const total = progress ? levelFor(progress.totalXp) : null

  return (
    <div>
      <div className="flex justify-end">
        <Link to="/einstellungen" aria-label="Einstellungen" className={roundBtn}>
          <GearIcon width={24} height={24} />
        </Link>
      </div>

      <div className="mt-2 flex flex-col items-center text-center">
        <div className="flex h-28 w-28 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-500">
          <PersonIcon width={58} height={58} />
        </div>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-accent-400">{name}</h1>
        {total && (
          <p className="mt-1 text-sm text-slate-400">
            Level {total.level} · {total.into} / {total.needed} XP bis Level {total.level + 1}
          </p>
        )}
        {total && (
          <div className="mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={total.into} aria-valuemax={total.needed}>
            <div className="h-full rounded-full bg-accent-500" style={{ width: `${Math.min(100, (total.into / total.needed) * 100)}%` }} />
          </div>
        )}
      </div>

      <div className="mt-9 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Bewertungen</h2>
        <div className="flex rounded-full border border-slate-800 bg-slate-900 p-1 text-sm" role="group" aria-label="Zeitraum">
          {(
            [
              ['current', 'Aktuell'],
              ['start', 'Anfang'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`rounded-full px-4 py-1.5 font-medium ${mode === m ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {scores && scores.length === 0 && (
        <p className="mt-4 rounded-3xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">
          Noch keine täglichen Gewohnheiten. Lege unter „Heute“ eine an, dann erscheint hier dein Score je Bereich.
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        {scores?.map((s) => {
          const level = progress ? levelFor(progress.areaXp[s.area] ?? 0).level : 1
          return (
            <div key={s.area} className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-center gap-2 text-slate-300">
                <AreaIcon area={s.area} width={20} height={20} />
                <span className="text-[15px] font-medium">{areaLabel(s.area)}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400"
                  style={{ width: `${s.rate ?? 0}%` }}
                />
              </div>
              <div className="mt-3 text-3xl font-semibold tabular-nums">{s.rate === null ? '–' : `${s.rate} %`}</div>
              <div className="mt-1 text-xs text-slate-500">
                {areaTitle(s.area, level)} · Lv {level}
              </div>
            </div>
          )
        })}
      </div>
      {scores && scores.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          {mode === 'current'
            ? 'Ø Tages-Score der letzten 30 abgeschlossenen Tage.'
            : 'Ø Tages-Score der ersten 30 Tage seit Beginn des Bereichs.'}
        </p>
      )}

      <div className="mt-8 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
        {(
          [
            ['/rueckblick', 'Wochenrückblick', 'Wie lief deine Woche?'],
            ['/verlauf', 'Statistik, Insights und Abzeichen', 'Score, Heatmaps, Auffälligkeiten, Medaillen'],
            ['/einstellungen', 'Einstellungen', 'Konto, Erinnerungen, Backup'],
          ] as const
        ).map(([to, title, sub], i) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center justify-between gap-3 px-5 py-4 active:bg-slate-800 ${i > 0 ? 'border-t border-slate-800' : ''}`}
          >
            <span className="min-w-0">
              <span className="block text-[17px] font-medium">{title}</span>
              <span className="block text-sm text-slate-500">{sub}</span>
            </span>
            <ChevronRightIcon width={20} height={20} className="shrink-0 text-slate-500" />
          </Link>
        ))}
      </div>
    </div>
  )
}
