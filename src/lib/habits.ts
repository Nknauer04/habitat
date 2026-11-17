import { dayKey, db, newId, now } from './db'
import type { Area, CheckIn, Habit, TimeOfDay } from './types'

export const AREAS: { value: Area; label: string }[] = [
  { value: 'sport', label: 'Sport' },
  { value: 'lernen', label: 'Lernen' },
  { value: 'schlaf', label: 'Schlaf' },
  { value: 'musik', label: 'Musik' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

export const TIMES: { value: TimeOfDay; label: string }[] = [
  { value: 'morgen', label: 'Morgen' },
  { value: 'abend', label: 'Abend' },
  { value: 'beliebig', label: 'Beliebig' },
]

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export const areaLabel = (a: Area) => AREAS.find((x) => x.value === a)?.label ?? a

// 0 = Montag … 6 = Sonntag
export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7

export function weekRange(d: Date) {
  const start = new Date(d)
  start.setDate(d.getDate() - weekdayIndex(d))
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return [dayKey(start), dayKey(end)] as const
}

export type HabitInput = Pick<Habit, 'name' | 'icon' | 'area' | 'timeOfDay' | 'frequency' | 'unit' | 'dailyTarget'>

// Erledigt: normale Gewohnheit = Check-in vorhanden; Mengen-Gewohnheit = Wert ≥ Tagesziel.
// Alte Check-ins ohne Wert (vor Umstellung auf Menge) zählen weiter als erledigt.
export const isCheckInDone = (h: Habit, c: CheckIn) =>
  !c.deleted && (!h.dailyTarget || c.value === undefined || c.value >= h.dailyTarget)

// Teilwert: Menge erfasst, Ziel aber noch nicht erreicht.
export const isPartial = (h: Habit, c: CheckIn) =>
  !c.deleted && !!h.dailyTarget && c.value !== undefined && c.value > 0 && c.value < h.dailyTarget

export const fmtQty = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',')

// Tagesmenge einer Gewohnheit; alte Check-ins ohne Wert zählen als volles Tagesziel.
export const checkInValue = (h: Habit, c: CheckIn) => c.value ?? h.dailyTarget ?? 0

export async function resetDay(habitId: string, date: string) {
  const existing = await db.checkIns.where('[habitId+date]').equals([habitId, date]).toArray()
  const active = existing.filter((c) => !c.deleted)
  const t = now()
  if (active.length) await db.checkIns.bulkPut(active.map((c) => ({ ...c, deleted: true, updatedAt: t })))
}

// Menge zum Tageswert addieren (mehrere Teilwerte pro Tag summieren sich).
export async function addQuantity(habitId: string, date: string, amount: number) {
  const existing = await db.checkIns.where('[habitId+date]').equals([habitId, date]).toArray()
  const active = existing.filter((c) => !c.deleted)
  const t = now()
  if (active.length) {
    const sum = active.reduce((s, c) => s + (c.value ?? 0), 0) + amount
    await db.checkIns.bulkPut([
      { ...active[0], value: sum, updatedAt: t },
      ...active.slice(1).map((c) => ({ ...c, deleted: true, updatedAt: t })),
    ])
  } else if (existing.length) await db.checkIns.put({ ...existing[0], deleted: false, value: amount, updatedAt: t })
  else await db.checkIns.add({ id: newId(), habitId, date, value: amount, deleted: false, updatedAt: t })
}

export async function saveHabit(input: HabitInput, id?: string) {
  const t = now()
  if (id) await db.habits.update(id, { ...input, updatedAt: t })
  else
    await db.habits.add({
      ...input,
      id: newId(),
      archived: false,
      deleted: false,
      createdAt: t,
      updatedAt: t,
    })
}

export const archiveHabit = (id: string) => db.habits.update(id, { archived: true, updatedAt: now() })

// Abhaken/Zurücknehmen. Check-ins werden nur weich gelöscht, damit der Sync sie erkennt.
export async function toggleCheckIn(habitId: string, date: string) {
  const existing = await db.checkIns.where('[habitId+date]').equals([habitId, date]).toArray()
  const active = existing.filter((c) => !c.deleted)
  const t = now()
  if (active.length) await db.checkIns.bulkPut(active.map((c) => ({ ...c, deleted: true, updatedAt: t })))
  else if (existing.length) await db.checkIns.put({ ...existing[0], deleted: false, updatedAt: t })
  else await db.checkIns.add({ id: newId(), habitId, date, deleted: false, updatedAt: t })
}

export function isDue(h: Habit, date: Date, doneToday: boolean, weekCount: number) {
  const f = h.frequency
  if (doneToday || f.type === 'daily') return true
  if (f.type === 'weekdays') return f.days.includes(weekdayIndex(date))
  return weekCount < f.count
}
