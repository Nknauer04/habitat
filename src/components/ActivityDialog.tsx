import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type FormEvent } from 'react'
import { activityDays, deleteActivity, saveActivity, setActivityGoalLinks } from '../lib/activities'
import { db } from '../lib/db'
import { AREAS, WEEKDAYS } from '../lib/habits'
import type { Activity, Area } from '../lib/types'
import { IconGrid } from './wizard/parts'

const UNITS = ['km', 'h', 'min', 'Seiten', 'Einheiten']

const chip = (active: boolean) =>
  `rounded-lg border px-3 py-2 text-sm ${
    active ? 'border-accent-500 bg-accent-500/15 text-accent-300' : 'border-slate-700 text-slate-300 hover:border-slate-500'
  }`
const field = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base outline-none focus:border-accent-500'
const label = 'mb-2 block text-sm text-slate-400'

// Einheit anlegen/bearbeiten (z. B. „Laufen“ in km). Hat nur Ist-Werte; das Soll legst du in einem Ziel fest.
export default function ActivityDialog({ activity, onClose }: { activity?: Activity; onClose: () => void }) {
  const [name, setName] = useState(activity?.name ?? '')
  const [icon, setIcon] = useState(activity?.icon ?? 'i:run')
  const [area, setArea] = useState<Area>(activity?.area ?? 'sport')
  const [unit, setUnit] = useState(activity?.unit ?? 'km')
  const [days, setDays] = useState<number[]>(activity ? activityDays(activity) : [])
  const [linked, setLinked] = useState<string[] | null>(null) // null = unverändert (aus den Zielen abgeleitet)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Offene Mengen-Ziele, in die diese Einheit zählen kann (gleiche Einheit)
  const goals = useLiveQuery(() => db.goals.filter((g) => !g.deleted && !g.done && g.kind === 'amount').sortBy('createdAt'), [])
  const currentLinked = (goals ?? []).filter((g) => !!activity && (g.activityIds ?? []).includes(activity.id)).map((g) => g.id)
  const effLinked = linked ?? currentLinked
  const toggleGoal = (id: string) => setLinked(effLinked.includes(id) ? effLinked.filter((x) => x !== id) : [...effLinked, id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Bitte einen Namen eingeben.')
    if (!unit.trim()) return setError('Bitte eine Einheit angeben.')
    const id = await saveActivity({ name: name.trim(), icon: icon || 'i:run', area, unit: unit.trim(), days: [...days].sort() }, activity?.id)
    if (linked !== null && goals) await setActivityGoalLinks(id, unit.trim(), linked, goals)
    onClose()
  }

  async function remove() {
    if (!activity) return
    await deleteActivity(activity.id)
    onClose()
  }

  const toggleDay = (i: number) => setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-800 bg-slate-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
      >
        <h2 className="text-lg font-semibold">{activity ? 'Einheit bearbeiten' : 'Neue Einheit'}</h2>
        <p className="mt-1 text-sm text-slate-400">Eine Einheit hat nur einen Ist-Wert (z. B. gelaufene km). Das Soll legst du in einem Ziel fest.</p>

        <input autoFocus={!activity} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, z. B. Laufen" className={`${field} mt-4`} />

        <span className={`${label} mt-5`}>Symbol</span>
        <IconGrid value={icon} area={area} onChange={setIcon} />

        <span className={`${label} mt-5`}>Bereich</span>
        <div className="flex flex-wrap gap-2">
          {AREAS.map((a) => (
            <button type="button" key={a.value} onClick={() => setArea(a.value)} className={chip(area === a.value)}>
              {a.label}
            </button>
          ))}
        </div>

        <label className="mt-5 block text-sm text-slate-400">
          Einheit
          <input value={unit} onChange={(e) => setUnit(e.target.value)} className={`${field} mt-1`} />
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {UNITS.map((u) => (
            <button type="button" key={u} onClick={() => setUnit(u)} className={`${chip(unit === u)} py-1`}>
              {u}
            </button>
          ))}
        </div>

        <span className={`${label} mt-5`}>Erinnerung in „Heute“ an diesen Tagen (optional)</span>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d, i) => (
            <button type="button" key={d} onClick={() => toggleDay(i)} aria-pressed={days.includes(i)} className={chip(days.includes(i))}>
              {d}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">An freien Tagen kannst du trotzdem jederzeit eintragen (Heute, oder nachträglich im Ziele-Tab).</p>

        <span className={`${label} mt-5`}>Zählt für Ziel (optional)</span>
        {goals && goals.length === 0 ? (
          <p className="text-sm text-slate-400">Noch kein Mengen-Ziel. Lege im Ziele-Tab ein Ziel „Menge aus Einheiten“ an (oder später hier verknüpfen).</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(goals ?? []).map((g) => {
              const on = effLinked.includes(g.id)
              const blocked = !on && !!g.unit && g.unit !== unit.trim()
              return (
                <button
                  type="button"
                  key={g.id}
                  onClick={() => toggleGoal(g.id)}
                  disabled={blocked}
                  aria-pressed={on}
                  title={blocked ? `Das Ziel zählt in ${g.unit}` : undefined}
                  className={`${chip(on)} disabled:opacity-40`}
                >
                  🎯 {g.title}
                  {g.unit ? ` (${g.unit})` : ''}
                </button>
              )
            })}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        {confirmDelete && (
          <p className="mt-4 text-sm text-red-300">
            „{activity?.name}“ wird samt allen Einträgen gelöscht (auch auf deinem anderen Gerät). Ziele, die darauf zählen, verlieren diese Werte.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-3">
          {activity && !confirmDelete && (
            <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-lg px-2 py-2 text-sm text-red-400 hover:bg-slate-800">
              Löschen
            </button>
          )}
          {confirmDelete && (
            <>
              <button type="button" onClick={remove} className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white">
                Endgültig löschen
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
                Zurück
              </button>
            </>
          )}
          {!confirmDelete && (
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800">
                Abbrechen
              </button>
              <button className="rounded-full bg-accent-500 px-4 py-2 font-medium text-black">Speichern</button>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
