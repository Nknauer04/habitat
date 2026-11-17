import { dayKey, db, newId, now } from './db'
import type { Area, Habit, TimeOfDay } from './types'

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

export type HabitInput = Pick<Habit, 'name' | 'icon' | 'area' | 'timeOfDay' | 'frequency'>

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
