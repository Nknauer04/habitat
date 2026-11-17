import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ArcGauge from '../components/ArcGauge'
import BadgesCard from '../components/BadgesCard'
import Heatmap from '../components/Heatmap'
import HeatmapAll from '../components/HeatmapAll'
import { ChevronDownIcon, MedalIcon, PenIcon } from '../components/icons'
import InsightsCard from '../components/InsightsCard'
import GoalAmountStats from '../components/GoalAmountStats'
import QuantitySheet from '../components/QuantitySheet'
import ReviewLinksCard from '../components/ReviewLinksCard'
import StatsCard from '../components/StatsCard'
import { dayKey, db } from '../lib/db'
import { checkInValue, isCheckInDone, isMini, isPartial, toggleCheckIn, weekdayIndex } from '../lib/habits'
import type { HabitProgress } from '../lib/progress'
import { computeDayScores, computeStats, consistency, summarize } from '../lib/stats'
import { useProgress } from '../lib/useProgress'
import { useToday } from '../lib/useToday'
import { iconText } from '../components/ItemIcon'

const card = 'rounded-3xl border border-slate-800 bg-slate-900'

function HabitStats({ p }: { p?: HabitProgress }) {
  if (!p) return null
  const unit = p.unit === 'Tage' ? 'T' : 'Wo.'
  const window = p.unit === 'Tage' ? '30 T' : '4 Wo.'
  return (
    <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
      <div>
        <dt className="text-xs text-slate-500">Streak</dt>
        <dd className="text-lg font-semibold">
          🔥 {p.streak} {unit}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500">Längste</dt>
        <dd className="text-lg font-semibold">
          🏆 {p.longest} {unit}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500">Quote ({window})</dt>
        <dd className="text-lg font-semibold">{p.rate === null ? '–' : `${Math.round(p.rate * 100)} %`}</dd>
      </div>
    </dl>
  )
}

export default function History() {
  const today = useToday()
  const todayKey = dayKey(today)
  const progress = useProgress(today)
  const habits = useLiveQuery(() => db.habits.filter((h) => !h.deleted).sortBy('createdAt'), [])
  const checks = useLiveQuery(() => db.checkIns.filter((c) => !c.deleted).toArray(), [])
  const [sel, setSel] = useState<string>('all')
  const [sheetDate, setSheetDate] = useState<string | null>(null)

  const active = (habits ?? []).filter((h) => !h.archived)
  const archived = (habits ?? []).filter((h) => h.archived)
  const selected = sel === 'all' ? null : (habits ?? []).find((h) => h.id === sel) ?? null

  // Kennzahlen für Bogen und Karten
  const stats7 = useMemo(
    () => (habits && checks ? computeStats(habits, checks, today, 7) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [habits, checks, todayKey],
  )
  const stats30 = useMemo(
    () => (habits && checks ? computeStats(habits, checks, today, 30) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [habits, checks, todayKey],
  )
  const konstanz = useMemo(
    () => (habits && checks ? consistency(habits, checks, today, 30) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [habits, checks, todayKey],
  )

  // Score je Tag der letzten 12 Wochen (Heatmap "Alle Gewohnheiten")
  const allScores = useMemo(() => {
    const m = new Map<string, number | null>()
    if (!habits || !checks) return m
    const start = new Date(today)
    start.setDate(today.getDate() - weekdayIndex(today) - 11 * 7)
    for (const d of computeDayScores(habits, checks, start, today)) m.set(d.date, d.score)
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits, checks, todayKey])
  const avg12 = useMemo(() => summarize([...allScores.entries()].filter(([k]) => k < todayKey).map(([date, score]) => ({ date, score, due: 0 }))).avg, [allScores, todayKey])

  // Einzelne Gewohnheit
  const selChecks = selected ? (checks ?? []).filter((c) => c.habitId === selected.id) : []
  const dates = new Set(selected ? selChecks.filter((c) => isCheckInDone(selected, c)).map((c) => c.date) : [])
  const partial = new Set(selected ? selChecks.filter((c) => isPartial(selected, c)).map((c) => c.date) : [])
  const minis = new Set(selected ? selChecks.filter((c) => isMini(selected, c)).map((c) => c.date) : [])
  const valueOn = (date: string) =>
    selected ? selChecks.filter((c) => c.date === date).reduce((s, c) => s + checkInValue(selected, c), 0) : 0

  const gaugeValue = stats7?.current.avg ?? null

  return (
    <div>
      <h1 className="sr-only">Statistik</h1>

      {/* Kopfbereich mit Bogen-Anzeige und Leuchten */}
      <section className="relative -mx-5 -mt-5 overflow-hidden px-5 pb-6 pt-14 lg:mx-0 lg:mt-0 lg:rounded-3xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-32 h-[34rem]"
          style={{
            background:
              'radial-gradient(70% 50% at 50% 28%, rgb(31 220 240 / 0.30), rgb(31 220 240 / 0.09) 55%, transparent 78%)',
          }}
        />
        <div className="relative">
          <ArcGauge value={gaugeValue} display={gaugeValue === null ? '–' : `${gaugeValue} %`} label="7-Tage-Score" />
          <p className="mt-3 text-center text-xs text-slate-500">Ø Tages-Score der letzten 7 abgeschlossenen Tage</p>
        </div>
      </section>

      {/* Schnellzugriff */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/rueckblick" className={`${card} flex flex-col items-center gap-2 px-3 py-5 text-center active:bg-slate-800`}>
          <PenIcon width={26} height={26} className="text-accent-400" />
          <span className="text-[17px] font-semibold">Wochenrückblick</span>
        </Link>
        <button
          onClick={() => document.getElementById('abzeichen')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className={`${card} flex flex-col items-center gap-2 px-3 py-5 text-center active:bg-slate-800`}
        >
          <MedalIcon width={26} height={26} className="text-accent-400" />
          <span className="text-[17px] font-semibold">Abzeichen</span>
        </button>
      </div>

      {/* Kennzahlen */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className={`${card} p-4`}>
          <div className="text-[15px] font-medium text-slate-300">Ø Score</div>
          <div className="mt-2 border-t border-slate-800 pt-3 text-3xl font-semibold tabular-nums">
            {stats30?.current.avg == null ? '–' : `${stats30.current.avg} %`}
          </div>
          <div className="mt-1 text-xs text-slate-500">letzte 30 Tage</div>
        </div>
        <div className={`${card} p-4`}>
          <div className="text-[15px] font-medium text-slate-300">Konstanz</div>
          <div className="mt-2 border-t border-slate-800 pt-3 text-3xl font-semibold tabular-nums">
            {konstanz?.rate == null ? '–' : `${konstanz.rate} %`}
          </div>
          <div className="mt-1 text-xs text-slate-500">Tage mit Haken, 30 Tage</div>
        </div>
      </div>

      <GoalAmountStats today={today} />

      {habits && habits.length === 0 && (
        <div className="mt-5 rounded-3xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
          Noch keine Gewohnheiten – lege sie unter „Heute“ an.
        </div>
      )}

      {/* Heatmap mit Auswahl */}
      {habits && habits.length > 0 && (
        <section className={`${card} mt-3 p-5`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">12 Wochen</h2>
            <label className="relative">
              <span className="sr-only">Gewohnheit wählen</span>
              <select
                value={selected ? selected.id : 'all'}
                onChange={(e) => setSel(e.target.value)}
                className="max-w-[11.5rem] appearance-none truncate rounded-full border border-slate-700 bg-slate-950 py-2 pl-4 pr-9 text-[15px] font-medium text-white outline-none focus:border-accent-500"
              >
                <option value="all">Alle Gewohnheiten</option>
                {active.map((h) => (
                  <option key={h.id} value={h.id}>
                    {iconText(h.icon)} {h.name}
                  </option>
                ))}
                {archived.length > 0 && (
                  <optgroup label="Archiviert">
                    {archived.map((h) => (
                      <option key={h.id} value={h.id}>
                        {iconText(h.icon)} {h.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <ChevronDownIcon width={18} height={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </label>
          </div>

          <div className="mt-4">
            {selected ? (
              <>
                <Heatmap
                  habit={selected}
                  dates={dates}
                  partial={partial}
                  mini={minis}
                  today={today}
                  onToggle={
                    selected.archived
                      ? undefined
                      : (key) => (selected.dailyTarget ? setSheetDate(key) : void toggleCheckIn(selected.id, key))
                  }
                />
                <HabitStats p={progress?.byHabit.get(selected.id)} />
                {!selected.archived && <p className="mt-3 text-xs text-slate-500">Tippe auf ein Feld, um einen Tag nachzutragen oder zurückzunehmen.</p>}
              </>
            ) : (
              <>
                <HeatmapAll scores={allScores} today={today} />
                <p className="mt-3 text-xs text-slate-500">
                  Farbe = Tages-Score aller Gewohnheiten{avg12 === null ? '' : ` · Ø ${avg12} % in 12 Wochen`}. Für Nachtragen wähle oben eine Gewohnheit.
                </p>
              </>
            )}
          </div>
        </section>
      )}

      {habits && checks && <StatsCard habits={habits} checkIns={checks} today={today} />}

      {habits && checks && <InsightsCard habits={habits} checkIns={checks} today={today} />}

      <div id="abzeichen" className="scroll-mt-5">
        <BadgesCard today={today} />
      </div>

      <ReviewLinksCard today={today} />

      {selected && sheetDate && (
        <QuantitySheet habit={selected} date={sheetDate} current={valueOn(sheetDate)} onClose={() => setSheetDate(null)} />
      )}
    </div>
  )
}
