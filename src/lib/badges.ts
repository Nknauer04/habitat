import { levelFor, type Progress } from './progress'
import type { Habit } from './types'

// Abzeichen werden komplett aus den Daten berechnet (nichts gespeichert → iPhone und Mac stimmen überein).
// Drei Stufen: 🥉 🥈 🥇. Die längste Streak zählt, ein erreichtes Abzeichen bleibt also erhalten.

export const TIER_ICONS = ['🥉', '🥈', '🥇'] as const
export const STREAK_DAYS = [7, 30, 66] as const // 66 Tage = durchschnittliche Gewohnheitsbildung (Lally 2010)
export const STREAK_WEEKS = [4, 12, 26] as const // für „X× pro Woche“
export const LEVELS = [5, 10, 20] as const
export const GOALS = [1, 5, 10] as const

export interface Badge {
  id: string
  tier: 0 | 1 | 2
  label: string // z. B. „Laufen · 7 Tage“
  threshold: number
  reached: boolean
}

export interface BadgeGroup {
  key: string
  icon: string
  title: string
  value: number // aktueller Stand (Streak-Länge, Level, Anzahl Ziele)
  unit: string // „Tage“, „Wochen“, „Level“, „Ziele“
  badges: Badge[]
}

const tiers = (key: string, thresholds: readonly number[], value: number, label: (t: number) => string): Badge[] =>
  thresholds.map((t, i) => ({
    id: `${key}:${t}`,
    tier: i as 0 | 1 | 2,
    label: label(t),
    threshold: t,
    reached: value >= t,
  }))

export function computeBadges(habits: Habit[], progress: Progress): BadgeGroup[] {
  const groups: BadgeGroup[] = []

  for (const h of habits) {
    if (h.deleted) continue
    const p = progress.byHabit.get(h.id)
    const weekly = h.frequency.type === 'perWeek'
    const value = p?.longest ?? 0
    const unit = weekly ? 'Wochen' : 'Tage'
    groups.push({
      key: `streak:${h.id}`,
      icon: h.icon,
      title: h.name,
      value,
      unit,
      badges: tiers(`streak:${h.id}`, weekly ? STREAK_WEEKS : STREAK_DAYS, value, (t) => `${h.name} · ${t} ${unit}`),
    })
  }

  const level = levelFor(progress.totalXp).level
  groups.push({
    key: 'level',
    icon: '⭐',
    title: 'Gesamt-Level',
    value: level,
    unit: 'Level',
    badges: tiers('level', LEVELS, level, (t) => `Level ${t}`),
  })

  groups.push({
    key: 'goals',
    icon: '🎯',
    title: 'Abgeschlossene Ziele',
    value: progress.goalsDone,
    unit: 'Ziele',
    badges: tiers('goals', GOALS, progress.goalsDone, (t) => (t === 1 ? '1 Ziel erreicht' : `${t} Ziele erreicht`)),
  })

  return groups
}

export const reachedBadges = (groups: BadgeGroup[]) => groups.flatMap((g) => g.badges.filter((b) => b.reached))

// Neu = erreicht, aber noch nicht als gesehen markiert. seen === null: erster Start → nichts ist neu.
export function newBadges(groups: BadgeGroup[], seen: string[] | null): Badge[] {
  if (seen === null) return []
  const known = new Set(seen)
  return reachedBadges(groups).filter((b) => !known.has(b.id))
}

// Nächste offene Stufe einer Gruppe (für „noch X bis …“)
export function nextBadge(g: BadgeGroup): { badge: Badge; remaining: number } | null {
  const badge = g.badges.find((b) => !b.reached)
  return badge ? { badge, remaining: badge.threshold - g.value } : null
}
