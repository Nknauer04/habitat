import { db, newId, now } from './db'
import type { Activity, ActivityEntry, Area } from './types'

// Einheiten (z. B. Laufen in km): nur Ist-Werte je Tag. Das Soll steckt in Zielen der Art „Menge“ (siehe goals.ts).
// Speicherung unter den Namen `plans` / `planEntries` (siehe types.ts).
export const XP_PER_ACTIVITY_ENTRY = 10 // je Eintrag (Tag)

export type ActivityInput = Pick<Activity, 'name' | 'icon' | 'area' | 'unit' | 'days'>

const parse = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Erinnerungs-Wochentage; Altdaten der ersten Version hatten sie im Wochenplan (Soll > 0)
export const activityDays = (a: Activity): number[] =>
  a.days ?? (a.schedule ?? []).flatMap((v, i) => (v > 0 ? [i] : []))

export const isActivityDay = (a: Activity, date: string) => activityDays(a).includes((parse(date).getDay() + 6) % 7)

// ---------- Speichern ----------

export async function saveActivity(input: ActivityInput, id?: string) {
  const t = now()
  if (id)
    // Altfelder der ersten Version entfernen
    await db.plans.update(id, { ...input, schedule: undefined, target: undefined, startDate: undefined, targetDate: undefined, updatedAt: t })
  else await db.plans.add({ ...input, id: newId(), deleted: false, createdAt: t, updatedAt: t })
}

// Einheit und alle ihre Einträge weich löschen (Sync zieht es nach). Ziele behalten ihre Verknüpfung, die ins Leere läuft.
export async function deleteActivity(id: string) {
  const t = now()
  await db.transaction('rw', db.plans, db.planEntries, async () => {
    const mine = await db.planEntries.where('planId').equals(id).filter((e) => !e.deleted).toArray()
    if (mine.length) await db.planEntries.bulkPut(mine.map((e) => ({ ...e, deleted: true, updatedAt: t })))
    await db.plans.update(id, { deleted: true, updatedAt: t })
  })
}

// Ist-Wert für einen Tag setzen (ersetzt den bisherigen); value ≤ 0 nimmt den Eintrag zurück.
export async function setActivityEntry(activityId: string, date: string, value: number) {
  const t = now()
  await db.transaction('rw', db.planEntries, async () => {
    const existing = await db.planEntries.where('[planId+date]').equals([activityId, date]).toArray()
    const active = existing.filter((e) => !e.deleted)
    if (value > 0) {
      if (active.length) {
        await db.planEntries.bulkPut([
          { ...active[0], value, updatedAt: t },
          ...active.slice(1).map((e) => ({ ...e, deleted: true, updatedAt: t })), // Dubletten von zwei Geräten bereinigen
        ])
      } else if (existing.length) await db.planEntries.put({ ...existing[0], deleted: false, value, updatedAt: t })
      else await db.planEntries.add({ id: newId(), planId: activityId, date, value, deleted: false, updatedAt: t })
    } else if (active.length) {
      await db.planEntries.bulkPut(active.map((e) => ({ ...e, deleted: true, updatedAt: t })))
    }
  })
}

// ---------- Berechnung ----------

// Summe der Ist-Werte der gewählten Einheiten im Zeitraum [from, to]
export function entriesSum(entries: ActivityEntry[], activityIds: string[], from: string, to: string) {
  let sum = 0
  for (const e of entries) if (!e.deleted && activityIds.includes(e.planId) && e.date >= from && e.date <= to) sum += e.value
  return Math.round(sum * 1000) / 1000
}

// XP je Bereich: 10 XP je Eintrag (Tag) einer nicht gelöschten Einheit, bis heute
export function activityXp(activities: Activity[], entries: ActivityEntry[], todayKey: string) {
  const byId = new Map(activities.filter((a) => !a.deleted).map((a) => [a.id, a]))
  const areaXp: Partial<Record<Area, number>> = {}
  let total = 0
  for (const e of entries) {
    const a = byId.get(e.planId)
    if (!a || e.deleted || e.value <= 0 || e.date > todayKey) continue
    areaXp[a.area] = (areaXp[a.area] ?? 0) + XP_PER_ACTIVITY_ENTRY
    total += XP_PER_ACTIVITY_ENTRY
  }
  return { areaXp, total }
}
