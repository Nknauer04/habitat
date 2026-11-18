import { db } from './db'
import { supabase } from './supabase'
import type { Syncable } from './types'

// Einfacher Sync: erst holen (Pull), dann senden (Push). "Last write wins" über updatedAt.
// Remote-Zeilen: { id, data (komplettes Objekt als JSON), updated_at, deleted }.

const TABLES = [
  { local: 'habits', remote: 'habits' },
  { local: 'checkIns', remote: 'check_ins' },
  { local: 'goals', remote: 'goals' },
  { local: 'reviews', remote: 'reviews' },
  { local: 'plans', remote: 'plans' },
  { local: 'planEntries', remote: 'plan_entries' },
  { local: 'areas', remote: 'areas' },
  { local: 'stravaActivities', remote: 'strava_activities' },
] as const

const PAGE = 500

export interface SyncStatus {
  state: 'disabled' | 'signedOut' | 'offline' | 'syncing' | 'ok' | 'error'
  lastSync?: string
  pulled: number
  pushed: number
  error?: string
  warning?: string // z. B. Tabelle in Supabase noch nicht angelegt
}

let status: SyncStatus = { state: 'signedOut', pulled: 0, pushed: 0 }
const listeners = new Set<() => void>()
const setStatus = (s: Partial<SyncStatus>) => {
  status = { ...status, ...s }
  listeners.forEach((l) => l())
}
export const getSyncStatus = () => status
export const subscribeSync = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

const getMeta = async (k: string) => (await db.meta.get(k))?.value
const setMeta = (k: string, value: string) => db.meta.put({ key: k, value })
const table = (name: string) => db.table<Syncable & Record<string, unknown>, string>(name)
const ts = (s: string) => Date.parse(s)

let applyingRemote = false

async function pull(t: (typeof TABLES)[number]) {
  const key = `pull:${t.remote}`
  const since = await getMeta(key)
  const tbl = table(t.local)
  let offset = 0
  let last: string | undefined
  let changed = 0

  for (;;) {
    let q = supabase!.from(t.remote).select('id, data, updated_at').order('updated_at').order('id')
    if (since) q = q.gte('updated_at', since)
    const { data, error } = await q.range(offset, offset + PAGE - 1)
    if (error) throw error
    if (!data.length) break

    const locals = await tbl.bulkGet(data.map((r) => r.id as string))
    const toPut = data
      .map((r, i) => ({ remote: r.data as Syncable & Record<string, unknown>, local: locals[i] }))
      .filter(({ remote, local }) => !local || ts(remote.updatedAt) > ts(local.updatedAt))
      .map(({ remote }) => remote)

    if (toPut.length) {
      applyingRemote = true
      try {
        await tbl.bulkPut(toPut)
      } finally {
        applyingRemote = false
      }
      changed += toPut.length
    }
    last = data[data.length - 1].updated_at as string
    offset += data.length
    if (data.length < PAGE) break
  }
  if (last) await setMeta(key, last)
  return changed
}

async function push(t: (typeof TABLES)[number]) {
  const key = `push:${t.remote}`
  const since = await getMeta(key)
  const tbl = table(t.local)
  const rows = since ? await tbl.where('updatedAt').above(since).toArray() : await tbl.toArray()
  if (!rows.length) return 0

  for (let i = 0; i < rows.length; i += PAGE) {
    const chunk = rows.slice(i, i + PAGE).map((o) => ({
      id: o.id,
      data: o,
      updated_at: o.updatedAt,
      deleted: o.deleted,
    }))
    const { error } = await supabase!.from(t.remote).upsert(chunk)
    if (error) throw error
  }
  const max = rows.reduce((m, o) => (o.updatedAt > m ? o.updatedAt : m), rows[0].updatedAt)
  await setMeta(key, max)
  return rows.length
}

// PostgREST: 42P01 / PGRST205 = Tabelle existiert nicht
export function isMissingTable(e: unknown): boolean {
  const err = e as { code?: string; message?: string }
  return (
    err?.code === '42P01' ||
    err?.code === 'PGRST205' ||
    /Could not find the table|does not exist/i.test(err?.message ?? '')
  )
}

let running: Promise<void> | null = null

export function syncNow(): Promise<void> {
  running ??= run().finally(() => {
    running = null
  })
  return running
}

async function run() {
  if (!supabase) return setStatus({ state: 'disabled' })
  const { data } = await supabase.auth.getSession()
  if (!data.session) return setStatus({ state: 'signedOut' })
  if (!navigator.onLine) return setStatus({ state: 'offline' })

  setStatus({ state: 'syncing', error: undefined })
  try {
    let pulled = 0
    let pushed = 0
    const missing: string[] = []
    // Fehlt eine Tabelle in Supabase (z. B. neu hinzugekommen), wird nur sie übersprungen – der Rest synchronisiert weiter.
    const tolerant = async (t: (typeof TABLES)[number], fn: () => Promise<number>) => {
      try {
        return await fn()
      } catch (e) {
        if (!isMissingTable(e)) throw e
        if (!missing.includes(t.remote)) missing.push(t.remote)
        return 0
      }
    }
    for (const t of TABLES) pulled += await tolerant(t, () => pull(t))
    for (const t of TABLES) pushed += await tolerant(t, () => push(t))
    setStatus({
      state: 'ok',
      pulled,
      pushed,
      lastSync: new Date().toISOString(),
      warning: missing.length
        ? `Tabelle „${missing.join('“, „')}“ fehlt in Supabase und wird noch nicht synchronisiert (siehe supabase/reviews.sql, plans.sql, areas.sql bzw. strava.sql).`
        : undefined,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? String(e)
    setStatus({ state: 'error', error: msg })
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
export function scheduleSync(delay = 1500) {
  clearTimeout(timer)
  timer = setTimeout(() => void syncNow(), delay)
}

let hooked = false
function hookLocalChanges() {
  if (hooked) return
  hooked = true
  for (const t of TABLES) {
    const tbl = db.table(t.local)
    const trigger = () => {
      if (!applyingRemote) scheduleSync()
    }
    tbl.hook('creating', () => void trigger())
    tbl.hook('updating', () => void trigger())
    tbl.hook('deleting', () => void trigger())
  }
}

// Einmal beim App-Start aufrufen; gibt eine Aufräumfunktion zurück.
export function startSyncEngine() {
  hookLocalChanges()
  const run = () => void syncNow()
  const onVisible = () => document.visibilityState === 'visible' && run()
  window.addEventListener('online', run)
  document.addEventListener('visibilitychange', onVisible)
  const interval = setInterval(run, 5 * 60 * 1000)
  const sub = supabase?.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') run()
  })
  run()
  return () => {
    window.removeEventListener('online', run)
    document.removeEventListener('visibilitychange', onVisible)
    clearInterval(interval)
    sub?.data.subscription.unsubscribe()
  }
}
