import { db, newId, now } from './db'
import { fmtQty, weekdayIndex } from './habits'
import type { Area, Plan, PlanEntry } from './types'

// Pläne: Wochenplan (Soll je Wochentag) + Gesamtziel. Alles Weitere (Summe, Fortschritt, XP) wird aus den Einträgen berechnet.
export const XP_PER_PLAN_UNIT = 10 // je erledigter Einheit (Ist ≥ Soll, oder Zusatz-Einheit an einem freien Tag)

export type PlanInput = Pick<Plan, 'name' | 'icon' | 'area' | 'unit' | 'target' | 'startDate' | 'targetDate' | 'schedule'>

const parse = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Soll am Datum (0 = frei)
export const plannedOn = (plan: Plan, date: string) => plan.schedule[weekdayIndex(parse(date))] ?? 0

// ---------- Speichern ----------

export async function savePlan(input: PlanInput, id?: string) {
  const t = now()
  if (id) await db.plans.update(id, { ...input, updatedAt: t })
  else await db.plans.add({ ...input, id: newId(), deleted: false, createdAt: t, updatedAt: t })
}

// Plan und alle seine Einträge weich löschen (Sync zieht es nach).
export async function deletePlan(id: string) {
  const t = now()
  await db.transaction('rw', db.plans, db.planEntries, async () => {
    const mine = await db.planEntries.where('planId').equals(id).filter((e) => !e.deleted).toArray()
    if (mine.length) await db.planEntries.bulkPut(mine.map((e) => ({ ...e, deleted: true, updatedAt: t })))
    await db.plans.update(id, { deleted: true, updatedAt: t })
  })
}

// Ist-Wert für einen Tag setzen (ersetzt den bisherigen); value ≤ 0 nimmt den Eintrag zurück.
export async function setPlanEntry(planId: string, date: string, value: number) {
  const t = now()
  await db.transaction('rw', db.planEntries, async () => {
    const existing = await db.planEntries.where('[planId+date]').equals([planId, date]).toArray()
    const active = existing.filter((e) => !e.deleted)
    if (value > 0) {
      if (active.length) {
        await db.planEntries.bulkPut([
          { ...active[0], value, updatedAt: t },
          ...active.slice(1).map((e) => ({ ...e, deleted: true, updatedAt: t })), // Dubletten von zwei Geräten bereinigen
        ])
      } else if (existing.length) await db.planEntries.put({ ...existing[0], deleted: false, value, updatedAt: t })
      else await db.planEntries.add({ id: newId(), planId, date, value, deleted: false, updatedAt: t })
    } else if (active.length) {
      await db.planEntries.bulkPut(active.map((e) => ({ ...e, deleted: true, updatedAt: t })))
    }
  })
}

// ---------- Berechnung ----------

// Gesamtleistung eines Plans: Summe der Ist-Werte ab Startdatum (bis heute)
export function planTotal(plan: Plan, entries: PlanEntry[], todayKey: string) {
  let sum = 0
  for (const e of entries)
    if (e.planId === plan.id && !e.deleted && e.date >= plan.startDate && e.date <= todayKey) sum += e.value
  return Math.round(sum * 1000) / 1000
}

export interface PlanProgress {
  total: number
  target: number
  ratio: number // 0–1 (gedeckelt)
  remaining: number
  reached: boolean
  daysLeft: number | null // bis zur Frist, inkl. heute (≥ 0); null = keine Frist
  perWeekNeeded: number | null // nötig je Woche bis zur Frist
  plannedLeft: number | null // laut Wochenplan bis zur Frist noch geplant (heute nur, wenn noch kein Eintrag)
  onTrack: boolean | null // null = ohne Frist oder erreicht
}

export function planProgress(plan: Plan, entries: PlanEntry[], todayKey: string): PlanProgress {
  const total = planTotal(plan, entries, todayKey)
  const remaining = Math.max(0, Math.round((plan.target - total) * 1000) / 1000)
  const reached = total >= plan.target
  let daysLeft: number | null = null
  let perWeekNeeded: number | null = null
  let plannedLeft: number | null = null
  let onTrack: boolean | null = null
  if (plan.targetDate && !reached) {
    const t0 = parse(todayKey)
    const end = parse(plan.targetDate)
    daysLeft = Math.max(0, Math.round((end.getTime() - t0.getTime()) / 86_400_000) + 1)
    if (daysLeft > 0) perWeekNeeded = Math.round((remaining / (daysLeft / 7)) * 10) / 10
    const hasToday = entries.some((e) => e.planId === plan.id && !e.deleted && e.date === todayKey)
    let planned = 0
    for (let i = hasToday ? 1 : 0; i < daysLeft; i++) {
      const d = new Date(t0)
      d.setDate(t0.getDate() + i)
      planned += plan.schedule[weekdayIndex(d)] ?? 0
    }
    plannedLeft = planned
    onTrack = planned >= remaining
  }
  return { total, target: plan.target, ratio: Math.max(0, Math.min(1, total / plan.target)), remaining, reached, daysLeft, perWeekNeeded, plannedLeft, onTrack }
}

// Eine Einheit gilt als erledigt, wenn das Soll erreicht ist; an freien Tagen zählt jede Zusatz-Einheit.
export function isUnitDone(plan: Plan, e: PlanEntry) {
  if (e.deleted || e.value <= 0) return false
  const soll = plannedOn(plan, e.date)
  return soll === 0 || e.value >= soll
}

// XP je Bereich aus erledigten Einheiten (bis heute)
export function planXp(plans: Plan[], entries: PlanEntry[], todayKey: string) {
  const byId = new Map(plans.filter((p) => !p.deleted).map((p) => [p.id, p]))
  const areaXp: Partial<Record<Area, number>> = {}
  let total = 0
  for (const e of entries) {
    const plan = byId.get(e.planId)
    if (!plan || e.date > todayKey || e.date < plan.startDate || !isUnitDone(plan, e)) continue
    areaXp[plan.area] = (areaXp[plan.area] ?? 0) + XP_PER_PLAN_UNIT
    total += XP_PER_PLAN_UNIT
  }
  return { areaXp, total }
}

export const fmtPlan = (plan: Plan, v: number) => `${fmtQty(v)} ${plan.unit}`
