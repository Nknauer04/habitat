import { useEffect } from 'react'
import { dayKey } from '../lib/db'
import { toggleSlip } from '../lib/avoid'
import type { Habit } from '../lib/types'
import ItemIcon from './ItemIcon'

// Rückfall melden (mit kurzer Rückfrage)
export default function SlipSheet({ habit, date, onClose }: { habit: Habit; date: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const dateText = date === dayKey() ? 'heute' : new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-t-3xl border border-slate-800 bg-slate-900 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
        <h2 className="flex items-center gap-3 text-lg font-semibold">
          <ItemIcon icon={habit.icon} area={habit.area} size={36} />
          Rückfall melden?
        </h2>
        <p className="mt-3 text-slate-300">
          „{habit.name}“ – {dateText}. Deine Serie startet danach neu. Das ist kein Drama: Du kannst es jederzeit zurücknehmen und morgen weitermachen.
        </p>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2.5 text-slate-300 active:bg-slate-800">
            Abbrechen
          </button>
          <button
            type="button"
            onClick={async () => {
              await toggleSlip(habit.id, date)
              onClose()
            }}
            className="rounded-full bg-rose-500 px-5 py-2.5 font-semibold text-white"
          >
            Rückfall melden
          </button>
        </div>
      </div>
    </div>
  )
}
