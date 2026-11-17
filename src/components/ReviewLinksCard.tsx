import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../lib/db'
import { isoWeek, prevWeek, weekEndOf, weekStartOf } from '../lib/review'

const fmt = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })

// Links zu den letzten Wochenrückblicken (✎ = Notiz vorhanden)
export default function ReviewLinksCard({ today }: { today: Date }) {
  const noted = useLiveQuery(
    async () => new Set((await db.reviews.filter((r) => !r.deleted && r.note.trim() !== '').toArray()).map((r) => r.weekStart)),
    [],
  )

  const weeks: string[] = [weekStartOf(today)]
  for (let i = 0; i < 4; i++) weeks.push(prevWeek(weeks[weeks.length - 1]))

  return (
    <section className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="font-medium">Wochenrückblick</h2>
      <ul className="mt-3 flex flex-col divide-y divide-slate-800">
        {weeks.map((w, i) => (
          <li key={w}>
            <Link to={`/rueckblick/${w}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-accent-300">
              <span>
                KW {isoWeek(w)}{' '}
                <span className="text-slate-500">
                  · {fmt(w)} – {fmt(weekEndOf(w))}
                  {i === 0 && ' (läuft)'}
                </span>
              </span>
              <span className="text-slate-500">{noted?.has(w) ? '✎ ›' : '›'}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
