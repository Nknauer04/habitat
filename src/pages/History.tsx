import { useLiveQuery } from 'dexie-react-hooks'
import Heatmap from '../components/Heatmap'
import { db } from '../lib/db'
import { areaLabel, toggleCheckIn } from '../lib/habits'
import type { HabitProgress } from '../lib/progress'
import type { Habit } from '../lib/types'
import { useProgress } from '../lib/useProgress'
import { useToday } from '../lib/useToday'

function Stats({ p }: { p?: HabitProgress }) {
  if (!p) return null
  const unit = p.unit === 'Tage' ? 'T' : 'Wo.'
  const window = p.unit === 'Tage' ? '30 T' : '4 Wo.'
  return (
    <dl className="mt-3 flex gap-5 text-sm">
      <div>
        <dt className="text-xs text-slate-500">Streak</dt>
        <dd>
          🔥 {p.streak} {unit}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500">Längste</dt>
        <dd>
          🏆 {p.longest} {unit}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500">Quote ({window})</dt>
        <dd>{p.rate === null ? '–' : `${Math.round(p.rate * 100)} %`}</dd>
      </div>
    </dl>
  )
}

function Card({
  habit,
  dates,
  today,
  progress,
  readOnly,
}: {
  habit: Habit
  dates: Set<string>
  today: Date
  progress?: HabitProgress
  readOnly?: boolean
}) {
  return (
    <li className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="text-2xl">{habit.icon}</span>
        <div className="min-w-0">
          <div className="truncate font-medium">{habit.name}</div>
          <div className="text-xs text-slate-500">{areaLabel(habit.area)}</div>
        </div>
      </div>
      <Heatmap
        habit={habit}
        dates={dates}
        today={today}
        onToggle={readOnly ? undefined : (key) => void toggleCheckIn(habit.id, key)}
      />
      <Stats p={progress} />
    </li>
  )
}

export default function History() {
  const today = useToday()
  const progress = useProgress(today)
  const habits = useLiveQuery(() => db.habits.filter((h) => !h.deleted).sortBy('createdAt'), [])
  const checks = useLiveQuery(() => db.checkIns.filter((c) => !c.deleted).toArray(), [])

  const datesOf = (id: string) =>
    new Set((checks ?? []).filter((c) => c.habitId === id).map((c) => c.date))

  const active = (habits ?? []).filter((h) => !h.archived)
  const archived = (habits ?? []).filter((h) => h.archived)

  return (
    <div>
      <h1 className="text-2xl font-semibold">Verlauf</h1>
      <p className="mt-1 text-sm text-slate-400">
        Letzte 12 Wochen. Tippe auf ein Feld, um einen Tag nachzutragen oder zurückzunehmen.
      </p>

      {habits && habits.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
          Noch keine Gewohnheiten – lege sie unter „Heute“ an.
        </div>
      )}

      <ul className="mt-5 flex flex-col gap-3">
        {active.map((h) => (
          <Card key={h.id} habit={h} dates={datesOf(h.id)} today={today} progress={progress?.byHabit.get(h.id)} />
        ))}
      </ul>

      {archived.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm text-slate-400">Archiviert ({archived.length})</summary>
          <ul className="mt-3 flex flex-col gap-3 opacity-70">
            {archived.map((h) => (
              <Card
                key={h.id}
                habit={h}
                dates={datesOf(h.id)}
                today={today}
                progress={progress?.byHabit.get(h.id)}
                readOnly
              />
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
