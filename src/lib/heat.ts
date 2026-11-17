import { dayKey } from './db'

// 90-Tage-Muster in der Statistik
export const HEAT_DAYS = 90
export const HEAT_COLUMNS = 15 // 15 × 6 Kacheln

// Die letzten n Tage, älteste zuerst, heute zuletzt
export function heatKeys(today: Date, n = HEAT_DAYS): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (n - 1 - i))
    return dayKey(d)
  })
}

// „Alle Gewohnheiten“: Tage, an denen alles Fällige erledigt war (Score 100)
export const fullDays = (scores: Map<string, number | null>, keys: string[]) => keys.filter((k) => scores.get(k) === 100).length

// Einzelne Gewohnheit: ihre erledigten Tage im Zeitraum
export const doneDaysIn = (dates: Set<string>, keys: string[]) => keys.filter((k) => dates.has(k)).length

// Deckkraft der Cyan-Kachel je Tages-Score (0 = grau, 100 = voll)
export const heatAlpha = (score: number) => (score <= 0 ? 0 : Math.round((0.28 + 0.72 * (Math.min(score, 100) / 100)) * 100) / 100)
