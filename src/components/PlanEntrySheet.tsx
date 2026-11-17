import { useEffect, useState, type FormEvent } from 'react'
import { dayKey } from '../lib/db'
import { fmtQty } from '../lib/habits'
import { plannedOn, setPlanEntry } from '../lib/plans'
import type { Plan } from '../lib/types'

// Ist-Wert für einen Plan-Tag eintragen (ersetzt den bisherigen Wert).
export default function PlanEntrySheet({
  plan,
  date,
  current,
  onClose,
}: {
  plan: Plan
  date: string
  current: number // bisher eingetragen (0 = nichts)
  onClose: () => void
}) {
  const soll = plannedOn(plan, date)
  const step = plan.unit === 'h' ? 0.5 : plan.unit === 'km' ? 0.5 : 1
  const [amount, setAmount] = useState(fmtQty(current > 0 ? current : soll > 0 ? soll : step))
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const parsed = Number(amount.replace(',', '.'))
  const bump = (d: number) => setAmount(fmtQty(Math.max(0, (Number.isFinite(parsed) ? parsed : 0) + d)))
  const dateText =
    date === dayKey()
      ? 'Heute'
      : new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!Number.isFinite(parsed) || parsed <= 0) return setError('Bitte einen Wert größer 0 eingeben.')
    await setPlanEntry(plan.id, date, parsed)
    onClose()
  }

  async function reset() {
    await setPlanEntry(plan.id, date, 0)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-2xl border border-slate-800 bg-slate-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
      >
        <h2 className="text-lg font-semibold">
          {plan.icon} {plan.name}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {dateText}: {soll > 0 ? `Soll ${fmtQty(soll)} ${plan.unit}` : 'freier Tag (Zusatz-Einheit)'}
          {current > 0 && ` · Ist ${fmtQty(current)} ${plan.unit}`}
        </p>

        <label className="mt-5 block text-sm text-slate-400">
          Tatsächlich ({plan.unit})
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={() => bump(-step)} aria-label="Weniger" className="h-11 w-11 shrink-0 rounded-lg border border-slate-700 text-lg">
              −
            </button>
            <input
              autoFocus
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-center text-xl outline-none focus:border-accent-500"
            />
            <button type="button" onClick={() => bump(step)} aria-label="Mehr" className="h-11 w-11 shrink-0 rounded-lg border border-slate-700 text-lg">
              +
            </button>
          </div>
        </label>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex items-center gap-2">
          {current > 0 && (
            <button type="button" onClick={reset} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800">
              Zurücknehmen
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800">
            Abbrechen
          </button>
          <button className="rounded-full bg-accent-500 px-4 py-2 font-medium text-black">Speichern</button>
        </div>
      </form>
    </div>
  )
}
