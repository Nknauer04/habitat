import { useSyncExternalStore } from 'react'
import { goalProgress, milestoneStates } from './goals'
import type { ActivityEntry, Goal, Milestone } from './types'

// Feier-Moment: Konfetti + Glückwunsch bei neuen Erfolgen. Einstellungen und „schon gefeiert“ nur lokal auf diesem Gerät.
export interface Celebration {
  id: string
  title: string
  text?: string
  glyph: string // Icon-Name (siehe ItemIcon)
  color: string
}

const OFF_KEY = 'habitat:celebrateOff'
const SOUND_KEY = 'habitat:celebrateSound'
const SEEN_KEY = 'habitat:celebrated'

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

const get = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const set = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k)
    else localStorage.setItem(k, v)
  } catch {
    /* Speicher nicht verfügbar */
  }
  notify()
}

export const celebrateEnabled = () => get(OFF_KEY) !== '1'
export const celebrateSound = () => get(SOUND_KEY) === '1'
export const setCelebrateEnabled = (on: boolean) => set(OFF_KEY, on ? null : '1')
export const setCelebrateSound = (on: boolean) => set(SOUND_KEY, on ? '1' : null)
export const useCelebrateEnabled = () => useSyncExternalStore(subscribe, celebrateEnabled)
export const useCelebrateSound = () => useSyncExternalStore(subscribe, celebrateSound)

// ---------- „Schon gefeiert“ (verhindert Wiederholungen) ----------

export function readSeen(): Set<string> | null {
  try {
    const v = get(SEEN_KEY)
    return v ? new Set(JSON.parse(v) as string[]) : null
  } catch {
    return null
  }
}
export const writeSeen = (s: Set<string>) => set(SEEN_KEY, JSON.stringify([...s]))
export function markSeen(id: string) {
  const s = readSeen() ?? new Set<string>()
  s.add(id)
  writeSeen(s)
}
export const hasSeen = (id: string) => readSeen()?.has(id) ?? false

// ---------- Warteschlange ----------

let queue: Celebration[] = []
let current: Celebration | null = null

function advance() {
  current = queue.shift() ?? null
  notify()
}

export function celebrate(c: Celebration) {
  if (!celebrateEnabled()) return
  if (current?.id === c.id || queue.some((q) => q.id === c.id)) return
  queue.push(c)
  if (!current) advance()
}

export function dismissCelebration() {
  advance()
}

export const useCurrentCelebration = () => useSyncExternalStore(subscribe, () => current)

// ---------- Erkennung ----------

export interface ReachedMilestone {
  key: string
  goal: Goal
  m: Milestone
}

// Alle erreichten Etappen offener Mengen-Ziele
export function reachedMilestones(goals: Goal[], entries: ActivityEntry[], todayKey: string): ReachedMilestone[] {
  const out: ReachedMilestone[] = []
  for (const g of goals) {
    if (g.deleted || g.done || g.kind !== 'amount' || !g.milestones?.length) continue
    const p = goalProgress(g, [], todayKey, [], entries)
    for (const s of milestoneStates(g, p.value, todayKey)) if (s.reached) out.push({ key: `ms:${g.id}:${s.m.id}`, goal: g, m: s.m })
  }
  return out
}

// Höchstes bisher gefeiertes Level
export function highestSeenLevel(seen: Set<string>): number {
  let max = 0
  for (const id of seen) if (id.startsWith('level:')) max = Math.max(max, Number(id.slice(6)) || 0)
  return max
}
