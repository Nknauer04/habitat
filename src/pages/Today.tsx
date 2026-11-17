import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import HabitDialog from '../components/HabitDialog'
import { dayKey, db } from '../lib/db'
import { TIMES, areaLabel, isDue, toggleCheckIn, weekRange } from '../lib/habits'
import type { Habit } from '../lib/types'
import { useToday } from '../lib/useToday'

export default function Today() {
  const today = useToday()
  const key = dayKey(today)
  const [weekStart, weekEnd] = weekRange(today)
  const [dialog, setDialog] = useState<{ habit?: Habit } | null>(null)

  const habits = useLiveQuery(
    () => db.habits.filter((h) => !h.deleted && !h.archived).sortBy('createdAt'),
    [],
  )
  const checks = useLiveQuery(
    () =>
      db.checkIns
        .where('date')
        .between(weekStart, weekEnd, true, true)
        .filter((c) => !c.deleted)
        .toArray(),
    [weekStart, weekEnd],
  )

  const rows = (habits ?? [])
    .map((h) => {
      const mine = (checks ?? []).filter((c) => c.habitId === h.id)
      const doneToday = mine.some((c) => c.date === key)
      const weekCount = new Set(mine.map((c) => c.date)).size
      return { h, doneToday, weekCount, due: isDue(h, today, doneToday, weekCount) }
    })
    .filter((r) => r.due)

  const done = rows.filter((r) => r.doneToday).length
  const dateText = today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Heute</h1>
          <p className="mt-1 text-sm text-slate-400">
            {dateText}
            {rows.length > 0 && ` · ${done} von ${rows.length} erledigt`}
          </p>
        </div>
        <button
          onClick={() => setDialog({})}
          aria-label="Neue Gewohnheit"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-2xl leading-none text-slate-950"
        >
          +
        </button>
      </div>

      {habits && habits.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
          Noch keine Gewohnheiten.
          <br />
          Tippe auf <span className="text-emerald-400">+</span>, um die erste anzulegen.
        </div>
      )}

      {habits && habits.length > 0 && rows.length === 0 && (
        <p className="mt-8 text-center text-slate-400">Heute ist nichts fällig. 🎉</p>
      )}

      {TIMES.map((t) => {
        const section = rows.filter((r) => r.h.timeOfDay === t.value)
        if (!section.length) return null
        return (
          <section key={t.value} className="mt-6">
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{t.label}</h2>
            <ul className="flex flex-col gap-2">
              {section.map(({ h, doneToday, weekCount }) => (
                <li
                  key={h.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    doneToday ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/40'
                  }`}
                >
                  <button
                    onClick={() => void toggleCheckIn(h.id, key)}
                    aria-label={doneToday ? `${h.name} zurücknehmen` : `${h.name} abhaken`}
                    aria-pressed={doneToday}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-xl ${
                      doneToday
                        ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                        : 'border-slate-600 text-transparent hover:border-emerald-500'
                    }`}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setDialog({ habit: h })}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="text-2xl">{h.icon}</span>
                    <span className="min-w-0">
                      <span className={`block truncate ${doneToday ? 'text-slate-400 line-through' : ''}`}>
                        {h.name}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {areaLabel(h.area)}
                        {h.frequency.type === 'perWeek' && ` · ${weekCount}/${h.frequency.count} diese Woche`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {dialog && <HabitDialog habit={dialog.habit} onClose={() => setDialog(null)} />}
    </div>
  )
}
