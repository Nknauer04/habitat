import type { Activity, ActivityEntry, StravaActivity } from './types'

// Strava-Arten, die in Einheiten (km) zählen können. Alles andere (Krafttraining, Yoga …) wird ignoriert.
export const STRAVA_KINDS = [
  { key: 'run', label: 'Laufen', glyph: 'run', types: ['Run', 'TrailRun', 'VirtualRun'] },
  { key: 'ride', label: 'Radfahren', glyph: 'bike', types: ['Ride', 'GravelRide', 'MountainBikeRide', 'EBikeRide', 'EMountainBikeRide', 'VirtualRide', 'Handcycle', 'Velomobile'] },
  { key: 'swim', label: 'Schwimmen', glyph: 'swim', types: ['Swim'] },
  { key: 'walk', label: 'Wandern & Gehen', glyph: 'mountain', types: ['Walk', 'Hike'] },
] as const

export type StravaKind = (typeof STRAVA_KINDS)[number]['key']

export const kindLabel = (key: string) => STRAVA_KINDS.find((k) => k.key === key)?.label ?? key

// Art einer Aktivität (sport_type vor type), null = wird nicht übernommen
export function kindOf(a: Pick<StravaActivity, 'type' | 'sportType'>): StravaKind | null {
  const t = a.sportType || a.type
  return STRAVA_KINDS.find((k) => (k.types as readonly string[]).includes(t))?.key ?? STRAVA_KINDS.find((k) => (k.types as readonly string[]).includes(a.type))?.key ?? null
}

// Feste ID für den Eintrag einer Einheit an einem Tag (zwei Geräte erzeugen dann denselben Eintrag, nie Doppelte)
export const stravaEntryId = (planId: string, date: string) => `${date.replace(/-/g, '')}-0000-4000-8000-${planId.replace(/-/g, '').slice(-12)}`

// Kilometer mit zwei Nachkommastellen
const km = (m: number) => Math.round(m / 10) / 100

// Aus Strava-Aktivitäten die Einträge der Einheiten berechnen (Summe je Einheit und Tag).
// Von Hand angelegte oder geänderte Einträge (ohne source) bleiben unberührt, ebenso von dir gelöschte Strava-Einträge.
export function planStravaEntries(strava: StravaActivity[], activities: Activity[], entries: ActivityEntry[], nowIso: string): ActivityEntry[] {
  const planOfKind = new Map<string, string>()
  for (const a of activities) if (!a.deleted) for (const k of a.stravaKinds ?? []) if (!planOfKind.has(k)) planOfKind.set(k, a.id)

  const sums = new Map<string, { planId: string; date: string; meters: number }>()
  for (const s of strava) {
    if (s.deleted || !s.date) continue
    const kind = kindOf(s)
    const planId = kind ? planOfKind.get(kind) : undefined
    if (!planId) continue
    const key = `${planId}|${s.date}`
    const cur = sums.get(key) ?? { planId, date: s.date, meters: 0 }
    cur.meters += s.distance
    sums.set(key, cur)
  }

  const out: ActivityEntry[] = []
  for (const { planId, date, meters } of sums.values()) {
    const value = km(meters)
    if (!(value > 0)) continue
    const existing = entries.filter((e) => e.planId === planId && e.date === date)
    const active = existing.find((e) => !e.deleted)
    if (active) {
      if (active.source !== 'strava') continue // von Hand: Hand gewinnt
      if (active.value !== value) out.push({ ...active, value, updatedAt: nowIso })
      continue
    }
    const removed = existing.find((e) => e.deleted)
    if (removed?.source === 'strava') continue // von dir entfernt: nicht zurückholen
    out.push({ id: removed?.id ?? stravaEntryId(planId, date), planId, date, value, source: 'strava', deleted: false, updatedAt: nowIso })
  }
  return out
}

// Tempo als „m:ss /km“ aus Geschwindigkeit in m/s
export function paceText(avgSpeed: number): string {
  if (!(avgSpeed > 0)) return '–'
  const sec = Math.round(1000 / avgSpeed)
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} /km`
}
