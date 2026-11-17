import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { dayKey, db } from '../lib/db'
import { goalProgress, milestoneStates, nextMilestone } from '../lib/goals'
import { fmtQty } from '../lib/habits'
import ArcGauge from './ArcGauge'

const fmtDate = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })

// Statistik: ein Halbkreis je offenem Mengen-Ziel (Summe der Einheiten im Verhältnis zum Soll) mit nächster Etappe
export default function GoalAmountStats({ today }: { today: Date }) {
  const todayKey = dayKey(today)
  const goals = useLiveQuery(() => db.goals.filter((g) => !g.deleted && !g.done && g.kind === 'amount').sortBy('createdAt'), [])
  const entries = useLiveQuery(() => db.planEntries.filter((e) => !e.deleted).toArray(), [])
  if (!goals || !entries || goals.length === 0) return null

  return (
    <section className="mt-3" aria-label="Mengen-Ziele">
      <h2 className="mb-3 mt-5 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Mengen-Ziele</h2>
      <div className="grid gap-3 lg:grid-cols-2">
        {goals.map((g) => {
          const p = goalProgress(g, [], todayKey, [], entries)
          const pct = Math.round(p.ratio * 100)
          const unit = g.unit ? ` ${g.unit}` : ''
          const states = milestoneStates(g, p.value, todayKey)
          const next = nextMilestone(states)
          return (
            <Link key={g.id} to="/ziele" className="block rounded-3xl border border-slate-800 bg-slate-900 p-5 active:bg-slate-800">
              <div className="mb-4 truncate text-center text-[17px] font-semibold">{g.title}</div>
              <ArcGauge value={pct} display={`${pct} %`} label={p.ratio >= 1 ? 'erreicht' : 'Fortschritt'} />
              <p className="mt-3 text-center text-sm text-slate-300">
                {fmtQty(p.value)} von {fmtQty(p.total)}
                {unit}
                {p.ratio < 1 && ` · noch ${fmtQty(p.total - p.value)}${unit}`}
              </p>
              {next && (
                <p className="mt-1 text-center text-xs text-slate-500">
                  Nächste Etappe: {fmtQty(next.m.value)}
                  {unit} bis {fmtDate(next.m.date)} ·{' '}
                  <span className={next.overdue ? 'text-amber-400' : 'text-done'}>
                    {next.overdue ? 'überfällig' : `noch ${fmtQty(Math.max(0, next.m.value - p.value))}${unit}`}
                  </span>
                </p>
              )}
              {!next && g.targetDate && p.ratio < 1 && (
                <p className="mt-1 text-center text-xs text-slate-500">Frist {fmtDate(g.targetDate)}</p>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
