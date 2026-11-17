import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import GoalDialog from '../components/GoalDialog'
import { dayKey, db } from '../lib/db'
import { completeGoal, goalProgress, reopenGoal, toggleStep } from '../lib/goals'
import { areaLabel } from '../lib/habits'
import { GOAL_DONE_XP } from '../lib/progress'
import type { Goal } from '../lib/types'
import { useToday } from '../lib/useToday'

const fmt = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })

function deadline(g: Goal, todayKey: string) {
  if (!g.targetDate || g.done) return null
  const overdue = g.targetDate < todayKey
  return { text: `${overdue ? 'überfällig seit' : 'Frist'} ${fmt(g.targetDate)}`, overdue }
}

export default function Goals() {
  const today = useToday()
  const todayKey = dayKey(today)
  const [dialog, setDialog] = useState<{ goal?: Goal } | null>(null)

  const goals = useLiveQuery(() => db.goals.filter((g) => !g.deleted).sortBy('createdAt'), [])
  const checks = useLiveQuery(() => db.checkIns.filter((c) => !c.deleted).toArray(), [])
  const allHabits = useLiveQuery(() => db.habits.filter((h) => !h.deleted).toArray(), [])

  const open = (goals ?? []).filter((g) => !g.done)
  const done = (goals ?? []).filter((g) => g.done)

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-accent-400">Ziele</h1>
          <p className="mt-1 text-sm text-slate-400">
            Ein abgeschlossenes Ziel bringt {GOAL_DONE_XP} XP in seinen Bereich.
          </p>
        </div>
        <button
          onClick={() => setDialog({})}
          aria-label="Neues Ziel"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-500 text-2xl leading-none text-black"
        >
          +
        </button>
      </div>

      {goals && goals.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
          Noch keine Ziele.
          <br />
          Tippe auf <span className="text-accent-400">+</span>, um das erste anzulegen.
        </div>
      )}

      <ul className="mt-5 flex flex-col gap-3">
        {open.map((g) => {
          const p = goalProgress(g, checks ?? [], todayKey, allHabits ?? [])
          const dl = deadline(g, todayKey)
          return (
            <li key={g.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <button onClick={() => setDialog({ goal: g })} className="block w-full text-left">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{g.title}</span>
                  <span className="shrink-0 text-sm text-slate-400">
                    {p.value} / {p.total}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {areaLabel(g.area)}
                  {g.kind === 'count' && g.startDate && ` · seit ${fmt(g.startDate)}`}
                  {dl && (
                    <span className={dl.overdue ? 'text-red-400' : ''}> · {dl.text}</span>
                  )}
                </div>
                {g.note && <p className="mt-2 text-sm text-slate-400">{g.note}</p>}
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"
                  role="progressbar"
                  aria-valuenow={p.value}
                  aria-valuemax={p.total}
                >
                  <div className="h-full rounded-full bg-accent-500" style={{ width: `${p.ratio * 100}%` }} />
                </div>
              </button>

              {g.kind === 'steps' && (
                <ul className="mt-3 flex flex-col gap-1">
                  {g.steps.map((s) => (
                    <li key={s.id}>
                      <label className="flex min-h-9 cursor-pointer items-center gap-3 rounded-lg px-1 hover:bg-slate-800/50">
                        <input
                          type="checkbox"
                          checked={s.done}
                          onChange={() => void toggleStep(g.id, s.id)}
                          className="h-5 w-5 accent-accent-500"
                        />
                        <span className={s.done ? 'text-slate-500 line-through' : ''}>{s.text}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}

              {p.ratio >= 1 && (
                <button
                  onClick={() => void completeGoal(g.id)}
                  className="mt-4 w-full rounded-full bg-accent-500 px-4 py-2 font-medium text-black"
                >
                  Abschließen (+{GOAL_DONE_XP} XP)
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {done.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm text-slate-400">Erledigt ({done.length})</summary>
          <ul className="mt-3 flex flex-col gap-2">
            {done.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-done/30 bg-done/10 p-3"
              >
                <div className="min-w-0">
                  <div className="truncate">✓ {g.title}</div>
                  <div className="text-xs text-slate-500">
                    {areaLabel(g.area)}
                    {g.doneAt && ` · ${fmt(g.doneAt)}`}
                  </div>
                </div>
                <button
                  onClick={() => void reopenGoal(g.id)}
                  className="shrink-0 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                >
                  Wieder öffnen
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {dialog && <GoalDialog goal={dialog.goal} onClose={() => setDialog(null)} />}
    </div>
  )
}
