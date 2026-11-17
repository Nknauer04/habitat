import { dayKey, db, newId, now } from './db'
import type { CheckIn, Habit } from './types'

// „Vermeiden“-Gewohnheiten (z. B. „Kein Zucker“): Jeder Tag seit dem Anlegen ohne Rückfall zählt automatisch als geschafft.
// Gespeichert werden nur die Rückfälle (CheckIn mit slip = true). Die sauberen Tage entstehen hier als berechnete Check-ins,
// damit Streak, XP, Score, Ziele, Coach und Berichte unverändert damit rechnen können.
export const CLEAN_PREFIX = 'clean:'

export const isAvoid = (h: Habit) => h.kind === 'avoid'

// Berechneter sauberer Tag, der noch nicht zählt: heute wird für Streak, XP und Ziele erst am Folgetag gutgeschrieben
export const isPendingClean = (c: CheckIn, todayKey: string) => c.id.startsWith(CLEAN_PREFIX) && c.date >= todayKey

const next = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return dayKey(new Date(y, m - 1, d + 1))
}

// Check-ins für die Auswertung: Rückfälle raus, saubere Tage (von `from` bis heute) für jede „Vermeiden“-Gewohnheit dazu
export function withCleanDays(habits: Habit[], checkIns: CheckIn[], todayKey: string, from?: string): CheckIn[] {
  const out = checkIns.filter((c) => !c.slip)
  const slips = new Set(checkIns.filter((c) => c.slip && !c.deleted).map((c) => `${c.habitId}|${c.date}`))
  for (const h of habits) {
    if (h.deleted || !isAvoid(h)) continue
    let start = dayKey(new Date(h.createdAt))
    if (from && from > start) start = from
    for (let d = start; d <= todayKey; d = next(d)) {
      if (slips.has(`${h.id}|${d}`)) continue
      out.push({ id: `${CLEAN_PREFIX}${h.id}:${d}`, habitId: h.id, date: d, deleted: false, updatedAt: '' })
    }
  }
  return out
}

// Rückfall für einen Tag setzen oder zurücknehmen (Soft-Delete, damit der Sync es erkennt)
export async function toggleSlip(habitId: string, date: string) {
  const t = now()
  const existing = await db.checkIns.where('[habitId+date]').equals([habitId, date]).filter((c) => !!c.slip).toArray()
  const active = existing.filter((c) => !c.deleted)
  if (active.length) await db.checkIns.bulkPut(active.map((c) => ({ ...c, deleted: true, updatedAt: t })))
  else if (existing.length) await db.checkIns.put({ ...existing[0], deleted: false, updatedAt: t })
  else await db.checkIns.add({ id: newId(), habitId, date, slip: true, deleted: false, updatedAt: t })
}
