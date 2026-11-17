import { dayKey } from '../lib/db'
import { weekdayIndex } from '../lib/habits'

const WEEKS = 12

const color = (s: number | null) =>
  s === null ? 'bg-slate-800/60' : s >= 80 ? 'bg-done' : s >= 50 ? 'bg-done/60' : s > 0 ? 'bg-amber-500/70' : 'bg-slate-700'

// Heatmap über alle Gewohnheiten: Farbe = Tages-Score des Tages
export default function HeatmapAll({ scores, today }: { scores: Map<string, number | null>; today: Date }) {
  const todayKey = dayKey(today)
  const start = new Date(today)
  start.setDate(today.getDate() - weekdayIndex(today) - (WEEKS - 1) * 7)

  const cells = Array.from({ length: WEEKS * 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = dayKey(d)
    return { d, key, future: key > todayKey, score: scores.get(key) ?? null }
  })

  return (
    <div
      className="grid max-w-sm gap-1"
      style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))`, gridTemplateRows: 'repeat(7, auto)', gridAutoFlow: 'column' }}
    >
      {cells.map(({ d, key, future, score }) => {
        if (future) return <span key={key} className="aspect-square" />
        const label = `${d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}: ${
          score === null ? 'nichts fällig' : `Score ${score} %`
        }`
        return (
          <span
            key={key}
            title={label}
            aria-label={label}
            className={`aspect-square w-full rounded-[3px] ${color(score)} ${key === todayKey ? 'ring-1 ring-slate-300' : ''}`}
          />
        )
      })}
    </div>
  )
}
