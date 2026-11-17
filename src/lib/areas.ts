import { useSyncExternalStore } from 'react'
import type { Area, AreaRow } from './types'

// Bereiche: fünf Standard-Bereiche (umbenennen, umfärben, ausblenden) plus eigene. Die Seiten lesen sie über dieses Register;
// es wird in der App-Hülle aus der Datenbank befüllt (useAreaRegistry) und ändert beim Wechsel `areaVersion`.
export interface AreaDef {
  key: Area
  label: string
  color: string // #rrggbb
  glyph: string // Icon-Name (siehe ItemIcon)
  hidden: boolean
  builtin: boolean
}

export const DEFAULT_AREAS: AreaDef[] = [
  { key: 'sport', label: 'Sport', color: '#1fdcf0', glyph: 'dumbbell', hidden: false, builtin: true },
  { key: 'lernen', label: 'Lernen', color: '#a78bfa', glyph: 'book', hidden: false, builtin: true },
  { key: 'schlaf', label: 'Schlaf', color: '#60a5fa', glyph: 'moon', hidden: false, builtin: true },
  { key: 'musik', label: 'Musik', color: '#f472b6', glyph: 'music', hidden: false, builtin: true },
  { key: 'sonstiges', label: 'Sonstiges', color: '#a1a1aa', glyph: 'sparkle', hidden: false, builtin: true },
]

export const AREA_PALETTE = ['#1fdcf0', '#60a5fa', '#a78bfa', '#f472b6', '#4ade80', '#fb923c', '#facc15', '#a1a1aa'] as const

export const FALLBACK_AREA: Area = 'sonstiges'

// Feste IDs der Standard-Bereiche (UUID-Form, weil die Supabase-Tabelle uuid verlangt)
export const builtinAreaId = (key: Area) => {
  const i = DEFAULT_AREAS.findIndex((d) => d.key === key)
  return i < 0 ? null : `00000000-0000-4000-8000-00000000000${i + 1}`
}
export const isBuiltinArea = (key: Area) => DEFAULT_AREAS.some((d) => d.key === key)

// Wirksame Bereiche: Standard (ggf. überschrieben) + eigene nach Anlegen sortiert
export function buildAreaDefs(rows: AreaRow[]): AreaDef[] {
  const live = rows.filter((r) => !r.deleted)
  const base = DEFAULT_AREAS.map((d) => {
    const o = live.find((r) => r.key === d.key)
    return o ? { ...d, label: o.name, color: o.color, glyph: o.glyph, hidden: o.hidden } : d
  })
  const custom = live
    .filter((r) => !isBuiltinArea(r.key))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((r): AreaDef => ({ key: r.key, label: r.name, color: r.color, glyph: r.glyph, hidden: r.hidden, builtin: false }))
  return [...base, ...custom]
}

let defs: AreaDef[] = buildAreaDefs([])
let version = 0
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function setAreaRows(rows: AreaRow[]) {
  const next = buildAreaDefs(rows)
  if (JSON.stringify(next) === JSON.stringify(defs)) return
  defs = next
  version++
  listeners.forEach((l) => l())
}

export const useAreaVersion = () => useSyncExternalStore(subscribe, () => version)

export const getAreas = (includeHidden = false) => (includeHidden ? defs : defs.filter((d) => !d.hidden))
// Unbekannte oder gelöschte Bereiche erscheinen als „Sonstiges“
export const areaDef = (key: Area): AreaDef => defs.find((d) => d.key === key) ?? defs.find((d) => d.key === FALLBACK_AREA)!
export const areaLabel = (key: Area) => areaDef(key).label
export const areaColor = (key?: Area) => (key ? areaDef(key).color : '#1fdcf0')
export const areaGlyph = (key: Area) => areaDef(key).glyph

// Auswahl-Liste: sichtbare Bereiche, plus der aktuell gewählte (auch wenn er ausgeblendet ist)
export const pickableAreas = (current?: Area) => defs.filter((d) => !d.hidden || d.key === current)

// Reihenfolge für Auswertungen (Profil): alle Bereiche in Listenreihenfolge
export const areaKeys = () => defs.map((d) => d.key)
