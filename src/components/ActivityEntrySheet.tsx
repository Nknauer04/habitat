import { useEffect, useState, type FormEvent } from 'react'
import { dayKey } from '../lib/db'
import { fmtInput, fmtQty } from '../lib/habits'
import { setActivityEntry } from '../lib/activities'
import type { Activity } from '../lib/types'
import ItemIcon from './ItemIcon'

// Ist-Wert einer Einheit für einen Tag eintragen (ersetzt den bisherigen Wert).
export default function ActivityEntrySheet({
  activity,
  date,
  current,
  onClose,
}: {
  activity: Activity
  date: string
  current: number // bisher eingetragen (0 = nichts)
  onClose: () => void
}) {
  const step = activity.unit === 'h' || activity.unit === 'km' ? 0.5 : 1
  const [amount, setAmount] = useState(current > 0 ? fmtInput(current) : '')
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const isSteps = activity.unit === 'Schritte' // nur Zahlenfeld, ganze Zahlen
  const parsed = Number(isSteps ? amount.replace(/\./g, '') : amount.replace(',', '.'))
  const bump = (d: number) => setAmount(fmtInput(Math.max(0, (Number.isFinite(parsed) ? parsed : 0) + d)))
  const dateText =
    date === dayKey()
      ? 'Heute'
      : new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!Number.isFinite(parsed) || parsed <= 0) return setError('Bitte einen Wert größer 0 eingeben.')
    await setActivityEntry(activity.id, date, isSteps ? Math.round(parsed) : parsed)
    onClose()
  }

  async function reset() {
    await setActivityEntry(activity.id, date, 0)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-2xl border border-slate-800 bg-slate-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
      >
        <h2 className="flex items-center gap-3 text-lg font-semibold">
          <ItemIcon icon={activity.icon} area={activity.area} size={32} />
          {activity.name}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {dateText}
          {current > 0 ? ` · bisher ${fmtQty(current)} ${activity.unit}` : ''}
        </p>

        <label className="mt-5 block text-sm text-slate-400">
          Wie viel? ({activity.unit})
          <div className="mt-2 flex items-center gap-2">
            {!isSteps && (
              <button type="button" onClick={() => bump(-step)} aria-label="Weniger" className="h-11 w-11 shrink-0 rounded-lg border border-slate-700 text-lg">
                −
              </button>
            )}
            <input
              autoFocus
              onFocus={(e) => e.target.select()}
              placeholder={activity.unit}
              inputMode={isSteps ? 'numeric' : 'decimal'}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-center text-xl outline-none focus:border-accent-500"
            />
            {!isSteps && (
              <button type="button" onClick={() => bump(step)} aria-label="Mehr" className="h-11 w-11 shrink-0 rounded-lg border border-slate-700 text-lg">
                +
              </button>
            )}
          </div>
        </label>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-3">
          {current > 0 && (
            <button type="button" onClick={reset} className="rounded-lg px-2 py-2 text-sm text-slate-400 hover:bg-slate-800">
              Zurücknehmen
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800">
              Abbrechen
            </button>
            <button className="rounded-full bg-accent-500 px-4 py-2 font-medium text-black">Speichern</button>
          </div>
        </div>
      </form>
    </div>
  )
}
