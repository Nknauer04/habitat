import type { ReactNode } from 'react'
import { pickableAreas } from '../../lib/areas'
import { WEEKDAYS } from '../../lib/habits'
import type { Area } from '../../lib/types'
import { areaColor } from '../../lib/areas'
import ItemIcon, { ICON_KEYS, ICON_SHAPES, IconGlyph } from '../ItemIcon'

export const bigField =
  'w-full border-0 border-b-2 border-slate-700 bg-transparent px-0 py-3 text-3xl font-semibold tracking-tight text-white outline-none placeholder:text-slate-600 focus:border-accent-500'

export function BigInput({ value, onChange, placeholder, inputMode, autoFocus = true, suffix }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  inputMode?: 'decimal' | 'numeric' | 'text'
  autoFocus?: boolean
  suffix?: string
}) {
  return (
    <div className="flex items-end gap-3">
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className={bigField}
      />
      {suffix && <span className="pb-3 text-2xl font-semibold text-slate-400">{suffix}</span>}
    </div>
  )
}

// Große Auswahl-Kachel (eine oder mehrere wählbar)
export function Tile({ active, onClick, icon, iconRaw, title, text, color, disabled }: {
  active: boolean
  onClick: () => void
  icon?: ReactNode
  iconRaw?: boolean // Icon bringt schon eine eigene Kachel mit (ItemIcon)
  title: string
  text?: string
  color?: string
  disabled?: boolean
}) {
  const c = color ?? 'var(--color-accent-500)'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className="flex w-full items-center gap-4 rounded-3xl border p-4 text-left transition-colors active:scale-[0.99] disabled:opacity-40"
      style={{
        borderColor: active ? c : 'var(--color-slate-800)',
        background: active ? `color-mix(in srgb, ${c} 14%, var(--color-slate-900))` : 'var(--color-slate-900)',
        boxShadow: active ? `0 0 24px -6px ${c}` : undefined,
      }}
    >
      {icon && iconRaw && icon}
      {icon && !iconRaw && (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ color: c, background: `color-mix(in srgb, ${c} 16%, transparent)` }}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold">{title}</span>
        {text && <span className="mt-0.5 block text-sm text-slate-400">{text}</span>}
      </span>
      <span
        aria-hidden
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm font-bold text-black"
        style={{ borderColor: active ? c : 'var(--color-slate-600)', background: active ? c : 'transparent' }}
      >
        {active ? '✓' : ''}
      </span>
    </button>
  )
}

export const Tiles = ({ children }: { children: ReactNode }) => <div className="flex flex-col gap-3">{children}</div>

export function AreaTiles({ value, onChange }: { value: Area; onChange: (a: Area) => void }) {
  const list = pickableAreas(value)
  return (
    <div className="grid grid-cols-2 gap-3">
      {list.map((a, i) => {
        const on = value === a.key
        const c = a.color
        return (
          <button
            key={a.key}
            type="button"
            onClick={() => onChange(a.key)}
            aria-pressed={on}
            className={`flex flex-col items-start gap-3 rounded-3xl border p-4 text-left transition-colors active:scale-[0.99] ${i === list.length - 1 && list.length % 2 === 1 ? 'col-span-2' : ''}`}
            style={{
              borderColor: on ? c : 'var(--color-slate-800)',
              background: on ? `color-mix(in srgb, ${c} 14%, var(--color-slate-900))` : 'var(--color-slate-900)',
              boxShadow: on ? `0 0 24px -6px ${c}` : undefined,
            }}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ color: c, background: `color-mix(in srgb, ${c} 16%, transparent)` }}>
              <IconGlyph name={a.glyph} size={26} />
            </span>
            <span className="text-lg font-semibold">{a.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// Symbol-Raster
export function IconGrid({ value, area, color, onChange }: { value: string; area: Area; color?: string; onChange: (icon: string) => void }) {
  const c = color ?? areaColor(area)
  return (
    <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-6">
      {ICON_KEYS.map((k) => {
        const icon = `i:${k}`
        const on = value === icon
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(icon)}
            aria-pressed={on}
            aria-label={ICON_SHAPES[k].label}
            title={ICON_SHAPES[k].label}
            className="flex aspect-square items-center justify-center rounded-2xl border transition-colors active:scale-95"
            style={{
              borderColor: on ? c : 'var(--color-slate-800)',
              background: on ? `color-mix(in srgb, ${c} 18%, var(--color-slate-900))` : 'var(--color-slate-900)',
              color: on ? c : 'var(--color-slate-300)',
            }}
          >
            <IconGlyph name={k} size={26} />
          </button>
        )
      })}
    </div>
  )
}

export const PreviewIcon = ({ icon, area }: { icon: string; area: Area }) => (
  <div className="mb-6 flex justify-center">
    <ItemIcon icon={icon} area={area} size={84} />
  </div>
)

export function WeekdayChips({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {WEEKDAYS.map((d, i) => {
        const on = value.includes(i)
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== i) : [...value, i])}
            aria-pressed={on}
            className={`flex h-14 items-center justify-center rounded-2xl border text-base font-semibold transition-colors ${
              on ? 'border-accent-500 bg-accent-500/15 text-accent-300' : 'border-slate-800 bg-slate-900 text-slate-300'
            }`}
          >
            {d}
          </button>
        )
      })}
    </div>
  )
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-4 py-2.5 text-[15px] font-medium transition-colors ${
        active ? 'border-accent-500 bg-accent-500/15 text-accent-300' : 'border-slate-700 text-slate-300 active:bg-slate-800'
      }`}
    >
      {children}
    </button>
  )
}

export function Stepper({ value, min = 1, max = 99, onChange }: { value: number; min?: number; max?: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-6">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label="Weniger" className="h-16 w-16 rounded-full border border-slate-700 text-3xl active:bg-slate-800">
        −
      </button>
      <span className="min-w-16 text-center text-6xl font-bold tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label="Mehr" className="h-16 w-16 rounded-full border border-slate-700 text-3xl active:bg-slate-800">
        +
      </button>
    </div>
  )
}
