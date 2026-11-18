import { FunctionsHttpError } from '@supabase/supabase-js'
import { saveActivity } from './activities'
import { getAreas } from './areas'
import { db, now } from './db'
import { kindOf, STRAVA_KINDS } from './stravaCore'
import { supabase } from './supabase'
import { syncNow } from './sync'

// Strava-Anbindung (Client): Login über Strava, Abruf über die Edge Function „strava“, Zuordnung Strava-Art → Einheit.
export const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID as string | undefined
export const stravaConfigured = () => !!supabase && !!STRAVA_CLIENT_ID

const FLAG = 'habitat:stravaConnected'
const LAST_AUTO = 'habitat:stravaLastAuto'
export const stravaFlag = () => {
  try {
    return localStorage.getItem(FLAG) === '1'
  } catch {
    return false
  }
}
const setFlag = (on: boolean) => {
  try {
    if (on) localStorage.setItem(FLAG, '1')
    else localStorage.removeItem(FLAG)
  } catch {
    /* Speicher nicht verfügbar */
  }
}

const authorizeUrl = (state: string) =>
  `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${location.origin}/strava`)}&response_type=code&approval_prompt=auto&scope=activity:read_all&state=${encodeURIComponent(state)}`

// Adresse für „Mit Strava verbinden“. Der signierte Code kommt von der Funktion (nur mit Login); er sorgt dafür, dass der Rücksprung
// auch in einem Fenster ohne Login (iPhone: Safari-Fenster statt installierter App) die Verbindung deinem Konto zuordnen kann.
export async function startStravaConnect(): Promise<string> {
  const r = await call<{ state: string }>('prepare')
  return authorizeUrl(r.state)
}

export interface StravaStatus {
  connected: boolean
  athleteName: string | null
  lastSync: string | null
}

async function call<T>(action: string, body: object = {}): Promise<T> {
  if (!supabase) throw new Error('Nicht konfiguriert.')
  // Ohne Login schickt die App nur den öffentlichen Schlüssel mit; die Funktion kennt dich dann nicht
  if (action !== 'connect' && !(await supabase.auth.getSession()).data.session)
    throw new Error('Du bist in der App nicht angemeldet. Melde dich weiter unten bei „Konto & Sync“ an und versuche es dann nochmal.')
  const { data, error } = await supabase.functions.invoke('strava', { body: { action, ...body } })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      let detail = `Status ${error.context.status}`
      let disconnected = false
      try {
        const b = (await error.context.json()) as { error?: string; disconnected?: boolean }
        detail = b.error ?? detail
        disconnected = !!b.disconnected
      } catch {
        /* keine JSON-Antwort */
      }
      if (disconnected) setFlag(false)
      throw new Error(detail)
    }
    throw new Error(`Die Funktion „strava“ ist nicht erreichbar (${error.message}). Ist sie in Supabase eingerichtet?`)
  }
  return data as T
}

export async function getStravaStatus(): Promise<StravaStatus> {
  const s = await call<StravaStatus>('status')
  setFlag(s.connected)
  return s
}

export async function connectStrava(code: string, scope: string, state: string): Promise<StravaStatus> {
  const r = await call<{ connected: boolean; athleteName: string | null }>('connect', { code, scope, state })
  setFlag(true)
  return { connected: r.connected, athleteName: r.athleteName, lastSync: null }
}

export async function disconnectStrava() {
  await call('disconnect')
  setFlag(false)
}

// Neue Aktivitäten bei Strava holen und auf dieses Gerät übernehmen (Einträge der Einheiten entstehen danach automatisch)
export async function syncStrava(days?: number): Promise<number> {
  const r = await call<{ fetched: number }>('sync', days ? { days } : {})
  await syncNow()
  return r.fetched
}

// Beim Start / Zurückkehren zur App höchstens alle 15 Minuten
export async function autoSyncStrava() {
  if (!stravaFlag() || !stravaConfigured()) return
  try {
    const last = Number(localStorage.getItem(LAST_AUTO) ?? 0)
    if (Date.now() - last < 15 * 60_000) return
    localStorage.setItem(LAST_AUTO, String(Date.now()))
    await syncStrava()
  } catch {
    /* still: im Strava-Bereich der Einstellungen lässt sich der Abruf von Hand wiederholen */
  }
}

// ---------- Zuordnung Strava-Art → Einheit (liegt an der Einheit, damit sie auf beiden Geräten gilt) ----------

// Eine Art gehört zu höchstens einer Einheit
export async function setKindMapping(kind: string, activityId: string | null) {
  const t = now()
  await db.transaction('rw', db.plans, async () => {
    for (const a of await db.plans.filter((x) => !x.deleted).toArray()) {
      const has = (a.stravaKinds ?? []).includes(kind)
      const want = a.id === activityId
      if (has === want) continue
      const kinds = want ? [...(a.stravaKinds ?? []), kind] : (a.stravaKinds ?? []).filter((k) => k !== kind)
      await db.plans.update(a.id, { stravaKinds: kinds.length ? kinds : undefined, updatedAt: t })
    }
  })
}

// Für Arten ohne Einheit eine passende Einheit (km) anlegen und zuordnen
export async function autoMapKinds(kinds: string[]) {
  const acts = await db.plans.filter((a) => !a.deleted).toArray()
  for (const key of kinds) {
    if (acts.some((a) => (a.stravaKinds ?? []).includes(key))) continue
    const def = STRAVA_KINDS.find((k) => k.key === key)
    if (!def) continue
    await saveActivity({ name: def.label, icon: `i:${def.glyph}`, area: getAreas()[0]?.key ?? 'sonstiges', unit: 'km', days: [], stravaKinds: [key] })
  }
}

// Welche Arten kommen in den geladenen Aktivitäten vor (mit Anzahl)?
export async function foundKinds(): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  for (const s of await db.stravaActivities.filter((x) => !x.deleted).toArray()) {
    const k = kindOf(s)
    if (k) out[k] = (out[k] ?? 0) + 1
  }
  return out
}
