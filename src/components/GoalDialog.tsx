import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type FormEvent } from 'react'
import { dayKey, db, newId } from '../lib/db'
import { deleteGoal, saveGoal } from '../lib/goals'
import { AREAS, fmtQty } from '../lib/habits'
import type { Area, Goal, GoalStep, Milestone } from '../lib/types'

const chip = (active: boolean) =>
  `rounded-lg border px-3 py-2 text-sm ${
    active
      ? 'border-accent-500 bg-accent-500/15 text-accent-300'
      : 'border-slate-700 text-slate-300 hover:border-slate-500'
  }`
const field =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base outline-none focus:border-accent-500'
const label = 'mb-2 block text-sm text-slate-400'

export default function GoalDialog({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const habits = useLiveQuery(() => db.habits.filter((h) => !h.deleted && !h.archived).sortBy('createdAt'), [])
  const activities = useLiveQuery(() => db.plans.filter((a) => !a.deleted).sortBy('createdAt'), [])

  const [title, setTitle] = useState(goal?.title ?? '')
  const [note, setNote] = useState(goal?.note ?? '')
  const [area, setArea] = useState<Area>(goal?.area ?? 'musik')
  const [kind, setKind] = useState<Goal['kind']>(goal?.kind ?? 'steps')
  const [steps, setSteps] = useState<GoalStep[]>(goal?.steps ?? [])
  const [activityIds, setActivityIds] = useState<string[]>(goal?.activityIds ?? [])
  const [amountTarget, setAmountTarget] = useState(goal?.kind === 'amount' && goal.target ? fmtQty(goal.target) : '')
  const [milestones, setMilestones] = useState<{ id: string; date: string; value: string }[]>(
    (goal?.milestones ?? []).map((m) => ({ id: m.id, date: m.date, value: fmtQty(m.value) })),
  )
  const [habitIds, setHabitIds] = useState<string[]>(goal?.habitIds ?? [])
  const [target, setTarget] = useState(goal?.target ?? 20)
  const [startDate, setStartDate] = useState(goal?.startDate ?? dayKey())
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '')
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const setStepText = (id: string, text: string) =>
    setSteps((s) => s.map((x) => (x.id === id ? { ...x, text } : x)))
  const toggleHabit = (id: string) =>
    setHabitIds((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]))

  const toggleActivity = (id: string) => {
    // Neues Ziel: Bereich der ersten gewählten Einheit übernehmen
    const first = (activities ?? []).find((a) => a.id === id)
    if (!goal && activityIds.length === 0 && first) setArea(first.area)
    setActivityIds((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]))
  }
  const chosenUnit = (activities ?? []).find((a) => activityIds.includes(a.id))?.unit
  const num = (v: string) => Number(v.replace(',', '.'))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setError('Bitte einen Titel eingeben.')
    const cleanSteps = steps.filter((s) => s.text.trim()).map((s) => ({ ...s, text: s.text.trim() }))
    if (kind === 'steps' && cleanSteps.length === 0) return setError('Bitte mindestens einen Teilschritt anlegen.')
    if (kind === 'count' && habitIds.length === 0) return setError('Bitte mindestens eine Gewohnheit verknüpfen.')
    if (kind === 'count' && !(target >= 1)) return setError('Das Ziel muss mindestens 1 sein.')
    let amount: number | undefined
    let cleanMilestones: Milestone[] | undefined
    if (kind === 'amount') {
      amount = num(amountTarget)
      if (activityIds.length === 0) return setError('Bitte mindestens eine Einheit verknüpfen.')
      if (!(amount > 0)) return setError('Bitte ein Soll größer 0 eingeben.')
      if (!startDate) return setError('Bitte ein Startdatum wählen.')
      if (targetDate && targetDate < startDate) return setError('Die Frist liegt vor dem Start.')
      cleanMilestones = []
      for (const [i, m] of milestones.entries()) {
        if (!m.date && !m.value.trim()) continue // leere Zeile ignorieren
        const v = num(m.value)
        if (!m.date || !(v > 0)) return setError(`Etappe ${i + 1}: bitte Datum und Wert (größer 0) angeben.`)
        if (m.date < startDate) return setError(`Etappe ${i + 1} liegt vor dem Start.`)
        if (v > amount) return setError(`Etappe ${i + 1}: der Zwischenstand darf das Soll nicht übersteigen.`)
        cleanMilestones.push({ id: m.id, date: m.date, value: v })
      }
      cleanMilestones.sort((a, b) => a.date.localeCompare(b.date))
    }
    await saveGoal(
      {
        title: title.trim(),
        note: note.trim() || undefined,
        area,
        kind,
        steps: kind === 'steps' ? cleanSteps : [],
        habitIds: kind === 'count' ? habitIds : [],
        target: kind === 'count' ? Math.round(target) : kind === 'amount' ? amount : undefined,
        startDate: kind === 'count' || kind === 'amount' ? startDate || dayKey() : undefined,
        activityIds: kind === 'amount' ? activityIds : undefined,
        unit: kind === 'amount' ? chosenUnit : undefined,
        milestones: kind === 'amount' && cleanMilestones?.length ? cleanMilestones : undefined,
        targetDate: targetDate || undefined,
      },
      goal?.id,
    )
    onClose()
  }

  async function remove() {
    if (!goal) return
    await deleteGoal(goal.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-800 bg-slate-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
      >
        <h2 className="text-lg font-semibold">{goal ? 'Ziel bearbeiten' : 'Neues Ziel'}</h2>

        <input
          autoFocus={!goal}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel, z. B. Song fertigstellen"
          className={`${field} mt-4`}
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Notiz (optional)"
          rows={2}
          className={`${field} mt-2`}
        />

        <span className={`${label} mt-5`}>Bereich</span>
        <div className="flex flex-wrap gap-2">
          {AREAS.map((a) => (
            <button type="button" key={a.value} onClick={() => setArea(a.value)} className={chip(area === a.value)}>
              {a.label}
            </button>
          ))}
        </div>

        <span className={`${label} mt-5`}>Fortschritt messen mit</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setKind('steps')} className={chip(kind === 'steps')}>
            Teilschritten
          </button>
          <button type="button" onClick={() => setKind('count')} className={chip(kind === 'count')}>
            Zählziel aus Gewohnheiten
          </button>
          <button type="button" onClick={() => setKind('amount')} className={chip(kind === 'amount')}>
            Menge aus Einheiten
          </button>
        </div>

        {kind === 'amount' ? (
          <div className="mt-3">
            {activities && activities.length === 0 ? (
              <p className="text-sm text-slate-400">Lege zuerst im Ziele-Tab unter „Einheiten“ eine Einheit an (z. B. Laufen in km).</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {(activities ?? []).map((a) => {
                    const blocked = !!chosenUnit && a.unit !== chosenUnit && !activityIds.includes(a.id)
                    return (
                      <button
                        type="button"
                        key={a.id}
                        onClick={() => toggleActivity(a.id)}
                        disabled={blocked}
                        title={blocked ? `Andere Einheit (${a.unit})` : undefined}
                        className={`${chip(activityIds.includes(a.id))} disabled:opacity-40`}
                      >
                        {a.icon} {a.name} ({a.unit})
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-500">Alle Ist-Werte dieser Einheiten zählen auf das Ziel (nur gleiche Einheit kombinierbar).</p>
              </>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-sm text-slate-400">
                Soll{chosenUnit ? ` (${chosenUnit})` : ''}
                <input
                  inputMode="decimal"
                  value={amountTarget}
                  onChange={(e) => setAmountTarget(e.target.value)}
                  placeholder="z. B. 500"
                  className={`${field} mt-1`}
                />
              </label>
              <label className="text-sm text-slate-400">
                Zählen ab
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${field} mt-1`} />
              </label>
            </div>

            <span className={`${label} mt-5`}>Etappenziele (optional)</span>
            <div className="flex flex-col gap-2">
              {milestones.map((m, i) => (
                <div key={m.id} className="grid grid-cols-[minmax(0,1fr)_5.5rem_2.5rem] items-center gap-2">
                  <input
                    type="date"
                    value={m.date}
                    onChange={(e) => setMilestones((l) => l.map((x) => (x.id === m.id ? { ...x, date: e.target.value } : x)))}
                    aria-label={`Etappe ${i + 1} Datum`}
                    className={`${field} min-w-0`}
                  />
                  <input
                    inputMode="decimal"
                    value={m.value}
                    onChange={(e) => setMilestones((l) => l.map((x) => (x.id === m.id ? { ...x, value: e.target.value } : x)))}
                    placeholder={chosenUnit ?? 'Wert'}
                    aria-label={`Etappe ${i + 1} Zwischenstand`}
                    className={`${field} min-w-0`}
                  />
                  <button
                    type="button"
                    onClick={() => setMilestones((l) => l.filter((x) => x.id !== m.id))}
                    aria-label="Etappe entfernen"
                    className="h-full min-h-10 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setMilestones((l) => [...l, { id: newId(), date: '', value: '' }])}
                className="self-start rounded-lg px-3 py-2 text-sm text-accent-400 hover:bg-slate-800"
              >
                + Etappe hinzufügen
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">Zwischenstand = Gesamtwert bis zu diesem Datum, z. B. 100 km bis 30.11.</p>
          </div>
        ) : kind === 'steps' ? (
          <div className="mt-3 flex flex-col gap-2">
            {steps.map((s, i) => (
              <div key={s.id} className="flex gap-2">
                <input
                  value={s.text}
                  onChange={(e) => setStepText(s.id, e.target.value)}
                  placeholder={`Schritt ${i + 1}`}
                  className={field}
                />
                <button
                  type="button"
                  onClick={() => setSteps((x) => x.filter((y) => y.id !== s.id))}
                  aria-label="Schritt entfernen"
                  className="w-10 shrink-0 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSteps((x) => [...x, { id: newId(), text: '', done: false }])}
              className="self-start rounded-lg px-3 py-2 text-sm text-accent-400 hover:bg-slate-800"
            >
              + Schritt hinzufügen
            </button>
          </div>
        ) : (
          <div className="mt-3">
            {habits && habits.length === 0 ? (
              <p className="text-sm text-slate-400">Lege zuerst unter „Heute“ eine Gewohnheit an.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(habits ?? []).map((h) => (
                  <button
                    type="button"
                    key={h.id}
                    onClick={() => toggleHabit(h.id)}
                    className={chip(habitIds.includes(h.id))}
                  >
                    {h.icon} {h.name}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-sm text-slate-400">
                Anzahl Haken
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  className={`${field} mt-1`}
                />
              </label>
              <label className="text-sm text-slate-400">
                Zählen ab
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`${field} mt-1`}
                />
              </label>
            </div>
          </div>
        )}

        <label className={`${label} mt-5`}>
          Frist (optional)
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className={`${field} mt-1`}
          />
        </label>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex items-center gap-2">
          {goal && (
            <button type="button" onClick={remove} className="rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-slate-800">
              Löschen
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
