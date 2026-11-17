import { useState, type ReactNode } from 'react'
import { areaColor } from '../lib/areas'
import { dayKey } from '../lib/db'
import { weekdayIndex } from '../lib/habits'
import { doneDaysIn, fullDays, heatAlpha, heatKeys, HEAT_COLUMNS, HEAT_DAYS } from '../lib/heat'
import type { Habit } from '../lib/types'
import { ChevronDownIcon } from './icons'
import { iconText } from './ItemIcon'

const CYAN = '#1fdcf0'
const EMPTY = 'var(--color-slate-700)' // fällig, aber nichts geschafft
const OFF = 'rgb(255 255 255 / 0.045)' // nichts fällig / noch nicht angelegt

const isDue = (h: Habit, d: Date) => h.frequency.type === 'daily' || (h.frequency.type === 'weekdays' && h.frequency.days.includes(weekdayIndex(d)))
const mix = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`

const InfoIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.8h.01" strokeWidth="2.4" />
  </svg>
)

// 90-Tage-Muster: „Alle Gewohnheiten“ (Farbe = Tages-Score) oder eine einzelne (Farbe = ihr Bereich)
export default function Heat90Card({
  habits,
  selId,
  onSelect,
  allScores,
  selected,
  dates,
  partial,
  minis,
  today,
  onToggle,
  children,
}: {
  habits: Habit[]
  selId: string
  onSelect: (id: string) => void
  allScores: Map<string, number | null>
  selected: Habit | null
  dates: Set<string>
  partial: Set<string>
  minis: Set<string>
  today: Date
  onToggle?: (key: string) => void
  children?: ReactNode
}) {
  const [info, setInfo] = useState(false)
  const todayKey = dayKey(today)
  const keys = heatKeys(today)
  const count = selected ? doneDaysIn(dates, keys) : fullDays(allScores, keys)
  const color = selected ? areaColor(selected.area) : CYAN
  const active = habits.filter((h) => !h.archived)
  const archived = habits.filter((h) => h.archived)

  return (
    <section className="mt-3 rounded-[2rem] border border-slate-800 bg-slate-900 p-5" aria-label="90-Tage-Muster">
      <div className="flex items-center justify-between gap-3">
        <div className="flex shrink-0 items-center gap-2">
          <h2 className="whitespace-nowrap text-[22px] font-bold tabular-nums tracking-tight">
            {count}/{HEAT_DAYS} Tage
          </h2>
          <button type="button" onClick={() => setInfo((v) => !v)} aria-expanded={info} aria-label="Erklärung zum Muster" className="text-slate-400 active:text-white">
            <InfoIcon />
          </button>
        </div>
        <label className="relative">
          <span className="sr-only">Gewohnheit wählen</span>
          <select
            value={selId}
            onChange={(e) => onSelect(e.target.value)}
            className="max-w-[9.5rem] appearance-none truncate rounded-full border border-slate-700 bg-slate-950 py-2.5 pl-4 pr-9 text-[15px] font-medium text-white outline-none focus:border-accent-500"
          >
            <option value="all">Alle Gewohnheiten</option>
            {active.map((h) => (
              <option key={h.id} value={h.id}>
                {iconText(h.icon)} {h.name}
              </option>
            ))}
            {archived.length > 0 && (
              <optgroup label="Archiviert">
                {archived.map((h) => (
                  <option key={h.id} value={h.id}>
                    {iconText(h.icon)} {h.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <ChevronDownIcon width={18} height={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </label>
      </div>

      {info && (
        <div role="note" className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
          <p>
            Jede Kachel ist ein Tag, die letzten {HEAT_DAYS} Tage von oben links bis heute unten rechts (mit Rahmen).{' '}
            {selected ? 'Zahl oben: deine erledigten Tage dieser Gewohnheit.' : 'Zahl oben: Tage, an denen du alles Fällige erledigt hast.'}
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {(selected
              ? ([
                  [color, 'erledigt'],
                  [mix(color, 55), 'Mini-Version'],
                  [mix(color, 35), 'Menge teilweise'],
                  [EMPTY, 'fällig, aber nichts geschafft'],
                  [OFF, 'nichts fällig'],
                ] as const)
              : ([
                  [CYAN, 'alles erledigt (100 %)'],
                  [mix(CYAN, 55), 'teilweise erledigt'],
                  [EMPTY, 'nichts geschafft'],
                  [OFF, 'nichts fällig'],
                ] as const)
            ).map(([c, label]) => (
              <li key={label} className="flex items-center gap-3">
                <span className="h-4 w-4 shrink-0 rounded-[5px] border border-white/10" style={{ background: c }} />
                {label}
              </li>
            ))}
          </ul>
          {selected && !selected.archived && <p className="mt-3 text-slate-400">Tippe auf eine Kachel, um den Tag nachzutragen oder zurückzunehmen.</p>}
        </div>
      )}

      <div className="mt-5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${HEAT_COLUMNS}, minmax(0, 1fr))` }} role="list">
        {keys.map((key) => {
          const d = new Date(`${key}T12:00:00`)
          let bg = OFF
          let label: string
          if (selected) {
            const created = key >= dayKey(new Date(selected.createdAt))
            const done = dates.has(key)
            const state = done ? (minis.has(key) ? 'Mini' : 'erledigt') : partial.has(key) ? 'teilweise' : created && isDue(selected, d) ? 'verpasst' : 'nicht fällig'
            bg = done ? (minis.has(key) ? mix(color, 55) : color) : partial.has(key) ? mix(color, 35) : created && isDue(selected, d) ? EMPTY : OFF
            label = `${d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}: ${state}`
          } else {
            const score = allScores.get(key) ?? null
            bg = score === null ? OFF : score <= 0 ? EMPTY : mix(CYAN, heatAlpha(score) * 100)
            label = `${d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}: ${score === null ? 'nichts fällig' : `Score ${score} %`}`
          }
          const cls = `aspect-square w-full rounded-[28%] ${key === todayKey ? 'ring-2 ring-slate-300' : ''}`
          return onToggle && selected ? (
            <button key={key} type="button" role="listitem" title={label} aria-label={label} aria-pressed={dates.has(key)} onClick={() => onToggle(key)} className={`${cls} hover:brightness-125`} style={{ background: bg }} />
          ) : (
            <span key={key} role="listitem" title={label} aria-label={label} className={cls} style={{ background: bg }} />
          )
        })}
      </div>

      {children}
    </section>
  )
}
