import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ArcGauge from '../components/ArcGauge'
import BadgesCard from '../components/BadgesCard'
import Heat90Card from '../components/Heat90Card'
import { HEAT_DAYS } from '../lib/heat'
import { IconGlyph } from '../components/ItemIcon'
import KpiCard from '../components/widgets/KpiCard'
import InsightsCard from '../components/InsightsCard'
import GoalAmountStats from '../components/GoalAmountStats'
import QuantitySheet from '../components/QuantitySheet'
import ReviewLinksCard from '../components/ReviewLinksCard'
import StatsCard from '../components/StatsCard'
import { dayKey, db } from '../lib/db'
import { checkInValue, isCheckInDone, isMini, isPartial, toggleCheckIn } from '../lib/habits'
import type { HabitProgress } from '../lib/progress'
import { computeDayScores, computeStats, consistency, summarize } from '../lib/stats'
import { useProgress } from '../lib/useProgress'
import { useToday } from '../lib/useToday'

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

  // Score je Tag der letzten 90 Tage (Muster „Alle Gewohnheiten“)
  const allScores = useMemo(() => {
    const m = new Map<string, number | null>()
    if (!habits || !checks) return m
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (HEAT_DAYS - 1))
    for (const d of computeDayScores(habits, checks, start, today)) m.set(d.date, d.score)
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits, checks, todayKey])
  const avg90 = useMemo(() => summarize([...allScores.entries()].filter(([k]) => k < todayKey).map(([date, score]) => ({ date, score, due: 0 }))).avg, [allScores, todayKey])

  // Einzelne Gewohnheit
  const selChecks = selected ? (checks ?? []).filter((c) => c.habitId === selected.id) : []
  const dates = new Set(selected ? selChecks.filter((c) => isCheckInDone(selected, c)).map((c) => c.date) : [])
  const partial = new Set(selected ? selChecks.filter((c) => isPartial(selected, c)).map((c) => c.date) : [])
  const minis = new Set(selected ? selChecks.filter((c) => isMini(selected, c)).map((c) => c.date) : [])
  const valueOn = (date: string) =>
    selected ? selChecks.filter((c) => c.date === date).reduce((s, c) => s + checkInValue(selected, c), 0) : 0

  const gaugeValue = stats7?.current.avg ?? null
  const doneChecks = (checks ?? []).filter((c) => { const h = (habits ?? []).find((x) => x.id === c.habitId); return !!h && isCheckInDone(h, c) }).length
  const unitEntries = useLiveQuery(() => db.planEntries.filter((e) => !e.deleted).toArray(), [])
  const units30 = (unitEntries ?? []).filter((e) => e.date > dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30)) && e.date <= todayKey).length

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
        <Link to="/rueckblick" className={`${card} flex flex-col items-center gap-3 px-3 py-5 text-center active:bg-slate-800`}>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ color: 'var(--color-accent-500)', background: 'color-mix(in srgb, var(--color-accent-500) 15%, transparent)' }}>
            <IconGlyph name="pencil" size={26} />
          </span>
          <span className="text-[17px] font-semibold">Wochenrückblick</span>
        </Link>
        <button
          onClick={() => document.getElementById('abzeichen')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className={`${card} flex flex-col items-center gap-3 px-3 py-5 text-center active:bg-slate-800`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ color: '#facc15', background: 'color-mix(in srgb, #facc15 15%, transparent)' }}>
            <IconGlyph name="medal" size={26} />
          </span>
          <span className="text-[17px] font-semibold">Abzeichen</span>
        </button>
      </div>

      {/* Kennzahlen */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <KpiCard glyph="trend" color="var(--color-accent-500)" label="Ø Score" value={stats30?.current.avg == null ? '–' : `${stats30.current.avg} %`} sub="letzte 30 Tage" ring={stats30?.current.avg ?? null} />
        <KpiCard glyph="calendar" color="var(--color-area-lernen)" label="Konstanz" value={konstanz?.rate == null ? '–' : `${konstanz.rate} %`} sub="Haken-Tage, 30 T" ring={konstanz?.rate ?? null} />
        <KpiCard glyph="check" color="var(--color-done)" label="Haken" value={String(doneChecks)} sub="gesamt abgehakt" />
        <KpiCard glyph="run" color="var(--color-area-musik)" label="Einheiten" value={String(units30)} sub="Einträge, 30 Tage" />
      </div>

      <GoalAmountStats today={today} />

      {habits && habits.length === 0 && (
        <div className="mt-5 rounded-3xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
          Noch keine Gewohnheiten – lege sie unter „Heute“ an.
        </div>
      )}

      {/* 90-Tage-Muster mit Auswahl */}
      {habits && habits.length > 0 && (
        <Heat90Card
          habits={habits}
          selId={selected ? selected.id : 'all'}
          onSelect={setSel}
          allScores={allScores}
          selected={selected}
          dates={dates}
          partial={partial}
          minis={minis}
          today={today}
          onToggle={selected && !selected.archived ? (key) => (selected.dailyTarget ? setSheetDate(key) : void toggleCheckIn(selected.id, key)) : undefined}
        >
          {selected ? (
            <HabitStats p={progress?.byHabit.get(selected.id)} />
          ) : (
            <p className="mt-4 text-xs text-slate-500">
              Farbe = Tages-Score aller Gewohnheiten{avg90 === null ? '' : ` · Ø ${avg90} % in 90 Tagen`}. Zum Nachtragen wähle oben eine Gewohnheit.
            </p>
          )}
        </Heat90Card>
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
