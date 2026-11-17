import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRightIcon, GearIcon, PersonIcon } from '../components/icons'
import { IconGlyph } from '../components/ItemIcon'
import { areaColor, areaDef } from '../lib/areas'
import ProgressRing from '../components/widgets/ProgressRing'
import { dayKey, db } from '../lib/db'
import { areaLabel, isCheckInDone } from '../lib/habits'
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
  const goals = useLiveQuery(() => db.goals.filter((g) => !g.deleted).toArray(), [])
  const activities = useLiveQuery(() => db.plans.filter((a) => !a.deleted).toArray(), [])

  const todayKey = dayKey(today)
  const scores = useMemo(
    () => (habits && checks ? areaScores(habits, checks, today, mode) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [habits, checks, todayKey, mode],
  )
  const total = progress ? levelFor(progress.totalXp) : null
  const doneChecks = (checks ?? []).filter((c) => { const h = (habits ?? []).find((x) => x.id === c.habitId); return !!h && isCheckInDone(h, c) }).length
  const stats: [string, string, string, number][] = [
    ['run', 'Gewohnheiten', 'var(--color-accent-500)', (habits ?? []).filter((h) => !h.archived).length],
    ['target', 'Ziele', 'var(--color-area-lernen)', (goals ?? []).filter((g) => !g.done).length],
    ['dumbbell', 'Einheiten', 'var(--color-area-musik)', (activities ?? []).length],
    ['check', 'Haken', 'var(--color-done)', doneChecks],
  ]

  return (
    <div>
      <div className="flex justify-end">
        <Link to="/einstellungen" aria-label="Einstellungen" className={roundBtn}>
          <GearIcon width={24} height={24} />
        </Link>
      </div>

      <div className="mt-2 flex flex-col items-center text-center">
        <div className="relative">
          <ProgressRing pct={total ? (total.into / total.needed) * 100 : 0} size={148} stroke={8} glow>
            <span className="flex h-[116px] w-[116px] items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-500">
              <PersonIcon width={58} height={58} />
            </span>
          </ProgressRing>
          {total && (
            <span className="glow-accent absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent-500 px-3.5 py-1 text-sm font-bold text-black">
              Level {total.level}
            </span>
          )}
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-accent-400">{name}</h1>
        {total && (
          <p className="mt-1 text-sm text-slate-400">
            {total.into} / {total.needed} XP bis Level {total.level + 1}
          </p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-4 gap-2">
        {stats.map(([glyph, label, color, n]) => (
          <div key={label} className="flex flex-col items-center rounded-2xl border border-slate-800 bg-slate-900 px-1 py-3">
            <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
              <IconGlyph name={glyph} size={18} />
            </span>
            <span className="mt-2 text-xl font-bold tabular-nums">{n}</span>
            <span className="text-[11px] text-slate-400">{label}</span>
          </div>
        ))}
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
        {scores?.filter((s) => !areaDef(s.area).hidden).map((s) => {
          const level = progress ? levelFor(progress.areaXp[s.area] ?? 0).level : 1
          return (
            <div key={s.area} className="flex items-center gap-3 rounded-3xl border border-slate-800 bg-slate-900 p-4">
              <ProgressRing pct={s.rate} size={64} stroke={6} color={areaColor(s.area)} glow>
                <span className="text-[15px] font-bold tabular-nums">{s.rate === null ? '–' : s.rate}</span>
              </ProgressRing>
              <div className="min-w-0">
                <div className="truncate text-[17px] font-semibold" style={{ color: areaColor(s.area) }}>
                  {areaLabel(s.area)}
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  {areaTitle(s.area, level)} · Lv {level}
                </div>
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
            ['/rueckblick', 'Wochenrückblick', 'Wie lief deine Woche?', 'pencil', 'var(--color-accent-500)'],
            ['/verlauf', 'Statistik, Insights und Abzeichen', 'Score, Muster, Auffälligkeiten, Medaillen', 'trend', '#facc15'],
            ['/bereiche', 'Bereiche', 'Farben, Namen, Symbole, ausblenden', 'target', 'var(--color-area-musik)'],
            ['/einstellungen', 'Einstellungen', 'Konto, Erinnerungen, Backup', 'bolt', 'var(--color-area-schlaf)'],
          ] as const
        ).map(([to, title, sub, glyph, color], i) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center justify-between gap-3 px-5 py-4 active:bg-slate-800 ${i > 0 ? 'border-t border-slate-800' : ''}`}
          >
            <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
              <IconGlyph name={glyph} size={22} />
            </span>
            <span className="min-w-0 flex-1">
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
