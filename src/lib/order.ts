import { db, now } from './db'

// Eigene Reihenfolge: optionales Feld `sortOrder` (kleiner = weiter oben). Ohne Wert gilt die Anlege-Reihenfolge davor.
export interface Orderable {
  id: string
  sortOrder?: number
  createdAt: string
}

export const byOrder = (a: Orderable, b: Orderable) => (a.sortOrder ?? -1) - (b.sortOrder ?? -1) || a.createdAt.localeCompare(b.createdAt)

// Neue Einträge kommen ans Ende
export const nextSortOrder = (items: { sortOrder?: number }[]) => items.reduce((m, i) => Math.max(m, i.sortOrder ?? -1), -1) + 1

// Eintrag von Position `from` nach `to` verschieben
export function moveId(ids: string[], from: number, to: number): string[] {
  if (from === to || from < 0 || from >= ids.length) return ids
  const out = [...ids]
  const [x] = out.splice(from, 1)
  out.splice(Math.max(0, Math.min(out.length, to)), 0, x)
  return out
}

// Sichtbare Einträge (z. B. heute fällige) in neuer Reihenfolge; nicht sichtbare behalten ihre Plätze in der Gesamtliste.
export function mergeVisibleOrder(fullIds: string[], newVisible: string[]): string[] {
  const visible = new Set(newVisible)
  let k = 0
  return fullIds.map((id) => (visible.has(id) ? newVisible[k++] : id))
}

// Nur Einträge, deren Position sich ändert (Position = neuer sortOrder 0…n)
export function orderChanges(items: Orderable[], newIds: string[]): { id: string; sortOrder: number }[] {
  const byId = new Map(items.map((i) => [i.id, i]))
  const out: { id: string; sortOrder: number }[] = []
  newIds.forEach((id, i) => {
    if (byId.get(id) && byId.get(id)!.sortOrder !== i) out.push({ id, sortOrder: i })
  })
  return out
}

export async function saveOrder(table: 'habits' | 'plans', changes: { id: string; sortOrder: number }[]) {
  if (!changes.length) return
  const t = now()
  await db.transaction('rw', db[table], async () => {
    for (const c of changes) await db[table].update(c.id, { sortOrder: c.sortOrder, updatedAt: t })
  })
}
