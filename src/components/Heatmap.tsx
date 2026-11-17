import { dayKey } from '../lib/db'
import { weekdayIndex } from '../lib/habits'
import type { Habit } from '../lib/types'

const WEEKS = 12

const isDue = (h: Habit, d: Date) =>
  h.frequency.type === 'daily' || (h.frequency.type === 'weekdays' && h.frequency.days.includes(weekdayIndex(d)))

export default function Heatmap({
  habit,
  dates,
  today,
  onToggle,
}: {
  habit: Habit
  dates: Set<string>
  today: Date
  onToggle?: (key: string) => void
}) {
  const todayKey = dayKey(today)
  const start = new Date(today)
  start.setDate(today.getDate() - weekdayIndex(today) - (WEEKS - 1) * 7)

  const cells = Array.from({ length: WEEKS * 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = dayKey(d)
    return { d, key, future: key > todayKey, done: dates.has(key), due: isDue(habit, d) }
  })

  return (
    <div
      className="grid max-w-sm gap-1"
      style={{
        gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))`,
        gridTemplateRows: 'repeat(7, auto)',
        gridAutoFlow: 'column',
      }}
    >
      {cells.map(({ d, key, future, done, due }) => {
        if (future) return <span key={key} className="aspect-square" />
        const state = done ? 'erledigt' : due ? 'verpasst' : 'nicht fällig'
        const color = done
          ? 'bg-emerald-500'
          : due
            ? 'bg-slate-700'
            : 'bg-slate-800/60'
        const label = `${d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}: ${state}`
        const cls = `aspect-square w-full rounded-[3px] ${color} ${key === todayKey ? 'ring-1 ring-slate-300' : ''}`
        return onToggle ? (
          <button
            key={key}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={done}
            onClick={() => onToggle(key)}
            className={`${cls} hover:brightness-125`}
          />
        ) : (
          <span key={key} title={label} className={cls} />
        )
      })}
    </div>
  )
}
