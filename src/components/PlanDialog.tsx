import { useEffect, useState, type FormEvent } from 'react'
import { dayKey } from '../lib/db'
import { AREAS, WEEKDAYS, fmtQty } from '../lib/habits'
import { deletePlan, savePlan } from '../lib/plans'
import type { Area, Plan } from '../lib/types'

const EMOJIS = ['🏃', '🚴', '🏊', '💪', '🧘', '📚', '🎹', '🎸', '🎧', '✍️', '🥾', '⚽', '🎯', '✅']
const UNITS = ['km', 'h', 'min', 'Seiten', 'Einheiten']

const chip = (active: boolean) =>
  `rounded-lg border px-3 py-2 text-sm ${
    active ? 'border-accent-500 bg-accent-500/15 text-accent-300' : 'border-slate-700 text-slate-300 hover:border-slate-500'
  }`
const field = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base outline-none focus:border-accent-500'
const label = 'mb-2 block text-sm text-slate-400'

const num = (s: string) => Number(s.replace(',', '.'))

export default function PlanDialog({ plan, onClose }: { plan?: Plan; onClose: () => void }) {
  const [name, setName] = useState(plan?.name ?? '')
  const [icon, setIcon] = useState(plan?.icon ?? '🏃')
  const [area, setArea] = useState<Area>(plan?.area ?? 'sport')
  const [unit, setUnit] = useState(plan?.unit ?? 'km')
  const [target, setTarget] = useState(plan ? fmtQty(plan.target) : '')
  const [startDate, setStartDate] = useState(plan?.startDate ?? dayKey())
  const [targetDate, setTargetDate] = useState(plan?.targetDate ?? '')
  const [sched, setSched] = useState<string[]>(() => (plan?.schedule ?? [0, 0, 0, 0, 0, 0, 0]).map((v) => (v > 0 ? fmtQty(v) : '')))
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const schedule = sched.map((s) => (s.trim() === '' ? 0 : num(s)))
  const weekSum = schedule.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Bitte einen Namen eingeben.')
    if (!unit.trim()) return setError('Bitte eine Einheit angeben.')
    const t = num(target)
    if (!(t > 0)) return setError('Bitte ein Gesamtziel größer 0 eingeben.')
    if (schedule.some((v) => !Number.isFinite(v) || v < 0)) return setError('Die Wochenplan-Werte müssen Zahlen ab 0 sein.')
    if (schedule.every((v) => v === 0)) return setError('Bitte mindestens einen Wochentag mit Soll eintragen.')
    if (!startDate) return setError('Bitte ein Startdatum wählen.')
    if (targetDate && targetDate < startDate) return setError('Die Frist liegt vor dem Start.')
    await savePlan(
      { name: name.trim(), icon: icon.trim() || '🏃', area, unit: unit.trim(), target: t, startDate, targetDate: targetDate || undefined, schedule },
      plan?.id,
    )
    onClose()
  }

  async function remove() {
    if (!plan) return
    await deletePlan(plan.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-800 bg-slate-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
      >
        <h2 className="text-lg font-semibold">{plan ? 'Plan bearbeiten' : 'Neuer Plan'}</h2>

        <input autoFocus={!plan} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, z. B. Laufen" className={`${field} mt-4`} />

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

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="text-sm text-slate-400">
            Gesamtziel
            <input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="z. B. 100" className={`${field} mt-1`} />
          </label>
          <label className="text-sm text-slate-400">
            Einheit
            <input value={unit} onChange={(e) => setUnit(e.target.value)} className={`${field} mt-1`} />
          </label>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {UNITS.map((u) => (
            <button type="button" key={u} onClick={() => setUnit(u)} className={`${chip(unit === u)} py-1`}>
              {u}
            </button>
          ))}
        </div>

        <span className={`${label} mt-5`}>Wochenplan: Soll je Tag ({unit || 'Einheit'}), leer = frei</span>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d, i) => (
            <label key={d} className="text-center text-xs text-slate-400">
              {d}
              <input
                inputMode="decimal"
                value={sched[i]}
                onChange={(e) => setSched((s) => s.map((x, j) => (j === i ? e.target.value : x)))}
                aria-label={`Soll ${d}`}
                className="mt-1 w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-1 py-2 text-center text-base outline-none focus:border-accent-500"
              />
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Pro Woche geplant: {fmtQty(weekSum)} {unit}
          {num(target) > 0 && weekSum > 0 && ` · Gesamtziel in ca. ${Math.ceil(num(target) / weekSum)} Wochen`}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="text-sm text-slate-400">
            Zählen ab
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${field} mt-1`} />
          </label>
          <label className="text-sm text-slate-400">
            Frist (optional)
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={`${field} mt-1`} />
          </label>
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        {confirmDelete && (
          <p className="mt-4 text-sm text-red-300">
            „{plan?.name}“ wird samt allen Einträgen gelöscht (auch auf deinem anderen Gerät). Das lässt sich nicht rückgängig machen.
          </p>
        )}

        <div className="mt-6 flex items-center gap-2">
          {plan && !confirmDelete && (
            <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-slate-800">
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
          <div className="flex-1" />
          {!confirmDelete && (
            <>
              <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800">
                Abbrechen
              </button>
              <button className="rounded-full bg-accent-500 px-4 py-2 font-medium text-black">Speichern</button>
            </>
          )}
        </div>
      </form>
    </div>
  )
}
