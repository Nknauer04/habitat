import { useEffect, useState, type FormEvent } from 'react'
import { activityDays, deleteActivity, saveActivity } from '../lib/activities'
import { AREAS, WEEKDAYS } from '../lib/habits'
import type { Activity, Area } from '../lib/types'

const EMOJIS = ['🏃', '🚴', '🏊', '💪', '🧘', '📚', '🎹', '🎸', '🎧', '✍️', '🥾', '⚽', '🎯', '✅']
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
  const [icon, setIcon] = useState(activity?.icon ?? '🏃')
  const [area, setArea] = useState<Area>(activity?.area ?? 'sport')
  const [unit, setUnit] = useState(activity?.unit ?? 'km')
  const [days, setDays] = useState<number[]>(activity ? activityDays(activity) : [])
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Bitte einen Namen eingeben.')
    if (!unit.trim()) return setError('Bitte eine Einheit angeben.')
    await saveActivity({ name: name.trim(), icon: icon.trim() || '🏃', area, unit: unit.trim(), days: [...days].sort() }, activity?.id)
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
        <div className="flex flex-wrap gap-2">
          {EMOJIS.map((e) => (
            <button type="button" key={e} onClick={() => setIcon(e)} aria-label={`Symbol ${e}`} className={`${chip(icon === e)} text-xl leading-none`}>
              {e}
            </button>
          ))}
        </div>

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
