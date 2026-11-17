import { dayKey, db } from './db'
import { AREAS, TIMES } from './habits'
import { scheduleSync } from './sync'
import type { CheckIn, Goal, Habit } from './types'

export const BACKUP_VERSION = 1

export interface BackupFile {
  app: 'habitat'
  version: number
  exportedAt: string
  habits: Habit[]
  checkIns: CheckIn[]
  goals: Goal[]
}

// Alles, auch Archiviertes und weich Gelöschtes (damit Löschungen beim Zusammenführen erhalten bleiben).
export async function buildBackup(): Promise<BackupFile> {
  const [habits, checkIns, goals] = await Promise.all([
    db.habits.toArray(),
    db.checkIns.toArray(),
    db.goals.toArray(),
  ])
  return { app: 'habitat', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), habits, checkIns, goals }
}

export const backupFileName = () => `habitat-backup-${dayKey()}.json`

// ---------- Validierung ----------

type Row = Record<string, unknown>
const isObj = (v: unknown): v is Row => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const isDate = (v: unknown): v is string => isStr(v) && !Number.isNaN(Date.parse(v))
const isDay = (v: unknown): v is string => isStr(v) && /^\d{4}-\d{2}-\d{2}$/.test(v)

function checkSync(r: Row): string | null {
  if (!isStr(r.id)) return 'id fehlt'
  if (!isDate(r.updatedAt)) return 'updatedAt ungültig'
  if (typeof r.deleted !== 'boolean') return 'deleted fehlt'
  return null
}

function checkFrequency(f: unknown): boolean {
  if (!isObj(f)) return false
  if (f.type === 'daily') return true
  if (f.type === 'weekdays')
    return Array.isArray(f.days) && f.days.every((d) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6)
  if (f.type === 'perWeek') return Number.isInteger(f.count) && (f.count as number) >= 1 && (f.count as number) <= 7
  return false
}

function checkHabit(r: Row): string | null {
  return (
    checkSync(r) ??
    (!isStr(r.name) ? 'name fehlt' : null) ??
    (typeof r.icon !== 'string' ? 'icon fehlt' : null) ??
    (!AREAS.some((a) => a.value === r.area) ? 'area ungültig' : null) ??
    (!TIMES.some((t) => t.value === r.timeOfDay) ? 'timeOfDay ungültig' : null) ??
    (!checkFrequency(r.frequency) ? 'frequency ungültig' : null) ??
    (r.unit !== undefined && typeof r.unit !== 'string' ? 'unit ungültig' : null) ??
    (r.miniVersion !== undefined && typeof r.miniVersion !== 'string' ? 'miniVersion ungültig' : null) ??
    (r.dailyTarget !== undefined && !(typeof r.dailyTarget === 'number' && r.dailyTarget > 0)
      ? 'dailyTarget ungültig'
      : null) ??
    (typeof r.archived !== 'boolean' ? 'archived fehlt' : null) ??
    (!isDate(r.createdAt) ? 'createdAt ungültig' : null)
  )
}

function checkCheckIn(r: Row): string | null {
  return (
    checkSync(r) ??
    (!isStr(r.habitId) ? 'habitId fehlt' : null) ??
    (!isDay(r.date) ? 'date ungültig' : null) ??
    (r.value !== undefined && !(typeof r.value === 'number' && r.value >= 0) ? 'value ungültig' : null) ??
    (r.mini !== undefined && typeof r.mini !== 'boolean' ? 'mini ungültig' : null)
  )
}

function checkGoal(r: Row): string | null {
  return (
    checkSync(r) ??
    (!isStr(r.title) ? 'title fehlt' : null) ??
    (!AREAS.some((a) => a.value === r.area) ? 'area ungültig' : null) ??
    (r.kind !== 'steps' && r.kind !== 'count' ? 'kind ungültig' : null) ??
    (!Array.isArray(r.steps) || !r.steps.every((s) => isObj(s) && isStr(s.id) && typeof s.text === 'string' && typeof s.done === 'boolean')
      ? 'steps ungültig'
      : null) ??
    (!Array.isArray(r.habitIds) ? 'habitIds fehlt' : null) ??
    (r.target !== undefined && !(typeof r.target === 'number' && r.target >= 1) ? 'target ungültig' : null) ??
    (r.startDate !== undefined && !isDay(r.startDate) ? 'startDate ungültig' : null) ??
    (r.targetDate !== undefined && !isDay(r.targetDate) ? 'targetDate ungültig' : null) ??
    (typeof r.done !== 'boolean' ? 'done fehlt' : null) ??
    (!isDate(r.createdAt) ? 'createdAt ungültig' : null)
  )
}

// Wirft einen Error mit verständlicher Meldung; verändert nichts.
export function parseBackup(text: string): BackupFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.')
  }
  if (!isObj(data) || data.app !== 'habitat') throw new Error('Das ist keine Habitat-Sicherung.')
  if (data.version !== BACKUP_VERSION)
    throw new Error(`Nicht unterstützte Version (${String(data.version)}). Erwartet: ${BACKUP_VERSION}.`)

  const tables: [string, (r: Row) => string | null][] = [
    ['habits', checkHabit],
    ['checkIns', checkCheckIn],
    ['goals', checkGoal],
  ]
  for (const [name, check] of tables) {
    const rows = data[name]
    if (!Array.isArray(rows)) throw new Error(`„${name}“ fehlt in der Datei.`)
    rows.forEach((r, i) => {
      const problem = isObj(r) ? check(r) : 'kein Objekt'
      if (problem) throw new Error(`Fehler in „${name}“, Eintrag ${i + 1}: ${problem}.`)
    })
  }
  return data as unknown as BackupFile
}

// ---------- Zusammenführen: pro Eintrag gewinnt der neuere updatedAt ----------

export interface ImportResult {
  habits: number
  checkIns: number
  goals: number
  skipped: number
}

export async function mergeBackup(file: BackupFile): Promise<ImportResult> {
  const result: ImportResult = { habits: 0, checkIns: 0, goals: 0, skipped: 0 }

  await db.transaction('rw', db.habits, db.checkIns, db.goals, async () => {
    for (const name of ['habits', 'checkIns', 'goals'] as const) {
      const tbl = db.table(name)
      const rows = file[name] as { id: string; updatedAt: string }[]
      const existing = await tbl.bulkGet(rows.map((r) => r.id))
      const toPut = rows.filter((r, i) => !existing[i] || Date.parse(r.updatedAt) > Date.parse(existing[i].updatedAt))
      if (toPut.length) await tbl.bulkPut(toPut)
      result[name] = toPut.length
      result.skipped += rows.length - toPut.length
    }
  })

  // Importierte Einträge können älter als das Push-Wasserzeichen sein → alles beim nächsten Sync erneut senden.
  await db.meta.where('key').startsWith('push:').delete()
  scheduleSync(500)
  return result
}
