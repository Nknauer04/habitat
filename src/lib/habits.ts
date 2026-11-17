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

export type HabitInput = Pick<Habit, 'name' | 'icon' | 'area' | 'timeOfDay' | 'frequency' | 'unit' | 'dailyTarget' | 'miniVersion'>

// Mini-Version ("schlechter Tag"): Check-in mit mini=true. Erreicht eine Mengen-Gewohnheit später
// ihr Tagesziel, gilt der Tag als voll.
export const isMini = (h: Habit, c: CheckIn) =>
  !c.deleted && !!c.mini && !(h.dailyTarget && c.value !== undefined && c.value >= h.dailyTarget)

// Voll erledigt: normale Gewohnheit = Check-in vorhanden; Mengen-Gewohnheit = Wert ≥ Tagesziel.
// Alte Check-ins ohne Wert (vor Umstellung auf Menge) zählen weiter als erledigt.
export const isFull = (h: Habit, c: CheckIn) =>
  !c.deleted && !isMini(h, c) && (!h.dailyTarget || c.value === undefined || c.value >= h.dailyTarget)

// Der Tag zählt (voll oder Mini) für Streak, Quote und Ziele.
export const isCheckInDone = (h: Habit, c: CheckIn) => isFull(h, c) || isMini(h, c)

// Teilwert: Menge erfasst, Ziel aber noch nicht erreicht (und kein Mini).
export const isPartial = (h: Habit, c: CheckIn) =>
  !c.deleted && !c.mini && !!h.dailyTarget && c.value !== undefined && c.value > 0 && c.value < h.dailyTarget

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
  } else if (existing.length)
    await db.checkIns.put({ ...existing[0], deleted: false, mini: false, value: amount, updatedAt: t })
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

// Löschen: Gewohnheit und alle ihre Check-ins werden weich gelöscht (damit der Sync es auf dem anderen Gerät nachzieht).
export async function deleteHabit(id: string) {
  const t = now()
  await db.transaction('rw', db.habits, db.checkIns, async () => {
    const mine = await db.checkIns.where('habitId').equals(id).filter((c) => !c.deleted).toArray()
    if (mine.length) await db.checkIns.bulkPut(mine.map((c) => ({ ...c, deleted: true, updatedAt: t })))
    await db.habits.update(id, { deleted: true, updatedAt: t })
  })
}

// Abhaken/Zurücknehmen. Check-ins werden nur weich gelöscht, damit der Sync sie erkennt.
// Auf einem Mini-Tag stuft der Tipp zur vollen Version hoch (statt zurückzunehmen).
export async function toggleCheckIn(habitId: string, date: string) {
  const existing = await db.checkIns.where('[habitId+date]').equals([habitId, date]).toArray()
  const active = existing.filter((c) => !c.deleted)
  const t = now()
  if (active.some((c) => c.mini))
    await db.checkIns.bulkPut([
      { ...active[0], mini: false, updatedAt: t },
      ...active.slice(1).map((c) => ({ ...c, deleted: true, updatedAt: t })),
    ])
  else if (active.length) await db.checkIns.bulkPut(active.map((c) => ({ ...c, deleted: true, updatedAt: t })))
  else if (existing.length) await db.checkIns.put({ ...existing[0], deleted: false, mini: false, updatedAt: t })
  else await db.checkIns.add({ id: newId(), habitId, date, deleted: false, updatedAt: t })
}

// Mini-Version an-/ausschalten (nur solange der Tag nicht voll erledigt ist).
export async function toggleMini(h: Habit, date: string) {
  const existing = await db.checkIns.where('[habitId+date]').equals([h.id, date]).toArray()
  const active = existing.filter((c) => !c.deleted)
  const t = now()
  const base = h.dailyTarget ? 0 : undefined // Menge: Wert 0, damit der Check-in nicht als "alt/voll" gilt
  if (active.length) {
    const c = active[0]
    if (c.mini) {
      if (h.dailyTarget && (c.value ?? 0) > 0) await db.checkIns.put({ ...c, mini: false, updatedAt: t })
      else await db.checkIns.bulkPut(active.map((x) => ({ ...x, deleted: true, updatedAt: t })))
    } else if (!isFull(h, c)) await db.checkIns.put({ ...c, mini: true, updatedAt: t })
  } else if (existing.length)
    await db.checkIns.put({ ...existing[0], deleted: false, mini: true, value: base, updatedAt: t })
  else await db.checkIns.add({ id: newId(), habitId: h.id, date, mini: true, value: base, deleted: false, updatedAt: t })
}

export function isDue(h: Habit, date: Date, doneToday: boolean, weekCount: number) {
  const f = h.frequency
  if (doneToday || f.type === 'daily') return true
  if (f.type === 'weekdays') return f.days.includes(weekdayIndex(date))
  return weekCount < f.count
}
