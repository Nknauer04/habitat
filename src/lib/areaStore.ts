import { db, newId, now } from './db'
import { areaDef, builtinAreaId, FALLBACK_AREA, isBuiltinArea } from './areas'
import type { Area } from './types'

export interface AreaInput {
  name: string
  color: string
  glyph: string
}

// Anlegen (key = neue id) oder ändern; bei Standard-Bereichen wird eine Überschreibung mit fester id gespeichert.
export async function saveArea(input: AreaInput, key?: Area): Promise<Area> {
  const t = now()
  if (key && isBuiltinArea(key)) {
    const id = builtinAreaId(key)!
    const cur = areaDef(key)
    const existing = await db.areas.get(id)
    await db.areas.put({ id, key, ...input, hidden: existing?.hidden ?? cur.hidden, createdAt: existing?.createdAt ?? t, updatedAt: t, deleted: false })
    return key
  }
  if (key) {
    await db.areas.update(key, { ...input, updatedAt: t })
    return key
  }
  const id = newId()
  await db.areas.add({ id, key: id, ...input, hidden: false, createdAt: t, updatedAt: t, deleted: false })
  return id
}

export async function setAreaHidden(key: Area, hidden: boolean) {
  const t = now()
  if (isBuiltinArea(key)) {
    const id = builtinAreaId(key)!
    const cur = areaDef(key)
    const existing = await db.areas.get(id)
    await db.areas.put({ id, key, name: existing?.name ?? cur.label, color: existing?.color ?? cur.color, glyph: existing?.glyph ?? cur.glyph, hidden, createdAt: existing?.createdAt ?? t, updatedAt: t, deleted: false })
  } else await db.areas.update(key, { hidden, updatedAt: t })
}

// Eigenen Bereich löschen: Einträge wandern nach „Sonstiges“
export async function deleteArea(key: Area) {
  if (isBuiltinArea(key)) return
  const t = now()
  await db.transaction('rw', [db.areas, db.habits, db.goals, db.plans], async () => {
    const hs = await db.habits.filter((r) => r.area === key).toArray()
    if (hs.length) await db.habits.bulkPut(hs.map((r) => ({ ...r, area: FALLBACK_AREA, updatedAt: t })))
    const gs = await db.goals.filter((r) => r.area === key).toArray()
    if (gs.length) await db.goals.bulkPut(gs.map((r) => ({ ...r, area: FALLBACK_AREA, updatedAt: t })))
    const as = await db.plans.filter((r) => r.area === key).toArray()
    if (as.length) await db.plans.bulkPut(as.map((r) => ({ ...r, area: FALLBACK_AREA, updatedAt: t })))
    await db.areas.update(key, { deleted: true, updatedAt: t })
  })
}

// Wie viele Einträge hängen an einem Bereich (für die Rückfrage)
export async function areaUsage(key: Area) {
  const [h, g, a] = await Promise.all([
    db.habits.filter((x) => !x.deleted && x.area === key).count(),
    db.goals.filter((x) => !x.deleted && x.area === key).count(),
    db.plans.filter((x) => !x.deleted && x.area === key).count(),
  ])
  return { habits: h, goals: g, activities: a }
}
