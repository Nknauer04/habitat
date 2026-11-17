import { useEffect, useState, type FormEvent } from 'react'
import { AREAS, TIMES, WEEKDAYS, archiveHabit, saveHabit } from '../lib/habits'
import type { Area, Frequency, Habit, TimeOfDay } from '../lib/types'

const EMOJIS = ['🏃', '💪', '🧘', '🚴', '📚', '🎓', '🎹', '🎸', '🎧', '😴', '🌅', '💧', '✍️', '🥗', '🧠', '✅']

const chip = (active: boolean) =>
  `rounded-lg border px-3 py-2 text-sm ${
    active
      ? 'border-accent-500 bg-accent-500/15 text-accent-300'
      : 'border-slate-700 text-slate-300 hover:border-slate-500'
  }`

const label = 'mb-2 block text-sm text-slate-400'

export default function HabitDialog({ habit, onClose }: { habit?: Habit; onClose: () => void }) {
  const [name, setName] = useState(habit?.name ?? '')
  const [icon, setIcon] = useState(habit?.icon ?? '✅')
  const [area, setArea] = useState<Area>(habit?.area ?? 'sport')
  const [time, setTime] = useState<TimeOfDay>(habit?.timeOfDay ?? 'morgen')
  const [freq, setFreq] = useState<Frequency['type']>(habit?.frequency.type ?? 'daily')
  const [days, setDays] = useState<number[]>(
    habit?.frequency.type === 'weekdays' ? habit.frequency.days : [0, 1, 2, 3, 4],
  )
  const [count, setCount] = useState(habit?.frequency.type === 'perWeek' ? habit.frequency.count : 3)
  const [miniText, setMiniText] = useState(habit?.miniVersion ?? '')
  const [qty, setQty] = useState(!!habit?.dailyTarget)
  const [unit, setUnit] = useState(habit?.unit ?? 'min')
  const [target, setTarget] = useState(String(habit?.dailyTarget ?? 30).replace('.', ','))
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Bitte einen Namen eingeben.')
    if (freq === 'weekdays' && days.length === 0) return setError('Bitte mindestens einen Wochentag wählen.')
    const frequency: Frequency =
      freq === 'daily'
        ? { type: 'daily' }
        : freq === 'weekdays'
          ? { type: 'weekdays', days: [...days].sort() }
          : { type: 'perWeek', count }
    const dailyTarget = Number(target.replace(',', '.'))
    if (qty && !(dailyTarget > 0)) return setError('Bitte ein Tagesziel größer 0 eingeben.')
    await saveHabit(
      {
        name: name.trim(),
        icon: icon.trim() || '✅',
        area,
        timeOfDay: time,
        frequency,
        unit: qty ? unit.trim() || undefined : undefined,
        dailyTarget: qty ? dailyTarget : undefined,
        miniVersion: miniText.trim() || undefined,
      },
      habit?.id,
    )
    onClose()
  }

  async function archive() {
    if (!habit) return
    await archiveHabit(habit.id)
    onClose()
  }

  const toggleDay = (i: number) =>
    setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-800 bg-slate-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
      >
        <h2 className="text-lg font-semibold">{habit ? 'Gewohnheit bearbeiten' : 'Neue Gewohnheit'}</h2>

        <div className="mt-4 flex gap-2">
          <input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            aria-label="Icon"
            className="w-14 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-center text-xl outline-none focus:border-accent-500"
          />
          <input
            autoFocus={!habit}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name, z. B. Laufen"
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base outline-none focus:border-accent-500"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {EMOJIS.map((e) => (
            <button
              type="button"
              key={e}
              onClick={() => setIcon(e)}
              className={`h-9 w-9 rounded-lg text-lg ${icon === e ? 'bg-accent-500/20' : 'hover:bg-slate-800'}`}
            >
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

        <span className={`${label} mt-5`}>Tageszeit</span>
        <div className="flex flex-wrap gap-2">
          {TIMES.map((t) => (
            <button type="button" key={t.value} onClick={() => setTime(t.value)} className={chip(time === t.value)}>
              {t.label}
            </button>
          ))}
        </div>

        <span className={`${label} mt-5`}>Häufigkeit</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setFreq('daily')} className={chip(freq === 'daily')}>
            Täglich
          </button>
          <button type="button" onClick={() => setFreq('weekdays')} className={chip(freq === 'weekdays')}>
            Wochentage
          </button>
          <button type="button" onClick={() => setFreq('perWeek')} className={chip(freq === 'perWeek')}>
            X× pro Woche
          </button>
        </div>
        {freq === 'weekdays' && (
          <div className="mt-3 flex gap-1.5">
            {WEEKDAYS.map((d, i) => (
              <button
                type="button"
                key={d}
                onClick={() => toggleDay(i)}
                className={`${chip(days.includes(i))} flex-1 px-0 text-center`}
              >
                {d}
              </button>
            ))}
          </div>
        )}
        {freq === 'perWeek' && (
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCount((c) => Math.max(1, c - 1))}
              className="h-10 w-10 rounded-lg border border-slate-700 text-lg"
            >
              −
            </button>
            <span className="w-24 text-center">{count}× pro Woche</span>
            <button
              type="button"
              onClick={() => setCount((c) => Math.min(7, c + 1))}
              className="h-10 w-10 rounded-lg border border-slate-700 text-lg"
            >
              +
            </button>
          </div>
        )}

        <span className={`${label} mt-5`}>Menge</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setQty(false)} className={chip(!qty)}>
            Nur abhaken
          </button>
          <button type="button" onClick={() => setQty(true)} className={chip(qty)}>
            Menge erfassen
          </button>
        </div>
        {qty && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-2">
              {['min', 'h', 'Seiten', 'Wdh.'].map((u) => (
                <button type="button" key={u} onClick={() => setUnit(u)} className={chip(unit === u)}>
                  {u}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm text-slate-400">
                Tagesziel
                <input
                  inputMode="decimal"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base outline-none focus:border-accent-500"
                />
              </label>
              <label className="text-sm text-slate-400">
                Einheit
                <input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base outline-none focus:border-accent-500"
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Der Tag zählt erst, wenn das Tagesziel erreicht ist (für Streak, XP, Verlauf und Ziele).
            </p>
          </div>
        )}

        <label className={`${label} mt-5`}>
          Mini-Version für schlechte Tage (optional)
          <input
            value={miniText}
            onChange={(e) => setMiniText(e.target.value)}
            placeholder="z. B. 2 Minuten dehnen"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base outline-none focus:border-accent-500"
          />
          <span className="mt-1 block text-xs text-slate-500">
            Hält die Streak, bringt aber nur halbe XP.
          </span>
        </label>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex items-center gap-2">
          {habit && (
            <button
              type="button"
              onClick={archive}
              className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800"
            >
              Archivieren
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800">
            Abbrechen
          </button>
          <button className="rounded-full bg-accent-500 px-4 py-2 font-medium text-white">Speichern</button>
        </div>
      </form>
    </div>
  )
}
