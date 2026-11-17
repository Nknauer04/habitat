import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { dayKey, db } from '../lib/db'
import { fmtQty } from '../lib/habits'
import { planProgress } from '../lib/plans'
import ArcGauge from './ArcGauge'

// Statistik: ein Halbkreis je Plan (Ist-Summe im Verhältnis zum Gesamtziel)
export default function PlansStatsCard({ today }: { today: Date }) {
  const todayKey = dayKey(today)
  const plans = useLiveQuery(() => db.plans.filter((p) => !p.deleted).sortBy('createdAt'), [])
  const entries = useLiveQuery(() => db.planEntries.filter((e) => !e.deleted).toArray(), [])
  if (!plans || !entries || plans.length === 0) return null

  return (
    <section className="mt-3" aria-label="Pläne">
      <h2 className="mb-3 mt-5 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Pläne</h2>
      <div className="grid gap-3 lg:grid-cols-2">
        {plans.map((pl) => {
          const pr = planProgress(pl, entries, todayKey)
          const pct = Math.round(pr.ratio * 100)
          return (
            <Link key={pl.id} to="/ziele" className="block rounded-3xl border border-slate-800 bg-slate-900 p-5 active:bg-slate-800">
              <div className="mb-4 truncate text-center text-[17px] font-semibold">
                {pl.icon} {pl.name}
              </div>
              <ArcGauge value={pct} display={`${pct} %`} label={pr.reached ? 'erreicht' : 'Fortschritt'} />
              <p className="mt-3 text-center text-sm text-slate-300">
                {fmtQty(pr.total)} von {fmtQty(pr.target)} {pl.unit}
                {!pr.reached && ` · noch ${fmtQty(pr.remaining)} ${pl.unit}`}
              </p>
              {pr.daysLeft !== null && !pr.reached && (
                <p className="mt-1 text-center text-xs text-slate-500">
                  Frist in {pr.daysLeft} {pr.daysLeft === 1 ? 'Tag' : 'Tagen'} ·{' '}
                  <span className={pr.onTrack ? 'text-done' : 'text-amber-400'}>{pr.onTrack ? 'auf Kurs' : 'Plan reicht nicht'}</span>
                </p>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
