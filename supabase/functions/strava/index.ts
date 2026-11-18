// Supabase Edge Function "strava": verbindet dein Strava-Konto und holt Aktivitäten.
// Aktionen (POST JSON mit Login-Token der App): status, connect {code}, sync {days?}, disconnect.
// Das Strava-Geheimnis (STRAVA_CLIENT_SECRET) bleibt hier; die Zugangsdaten liegen in strava_connection (für die App unlesbar).
// Einzelne Datei, damit sie sich im Dashboard einfügen lässt. „Verify JWT“ bleibt AN (Standard).

import { createClient } from 'npm:@supabase/supabase-js@2'

// --- logic:start ---------------------------------------------------------------
interface StravaApiActivity {
  id: number
  name?: string
  type?: string
  sport_type?: string
  start_date?: string
  start_date_local?: string
  distance?: number
  moving_time?: number
  elapsed_time?: number
  total_elevation_gain?: number
  average_speed?: number
  max_speed?: number
  has_heartrate?: boolean
  average_heartrate?: number
  max_heartrate?: number
}

// Feste ID aus der Strava-ID (UUID-Form, weil die Tabelle uuid verlangt); dieselbe Aktivität ergibt immer dieselbe ID
const stravaUuid = (id: number) => `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`

// Aktivität → Zeile der Tabelle strava_activities (Feld data). `now` = Zeitpunkt des Abrufs.
function toActivityData(a: StravaApiActivity, nowIso: string) {
  const local = a.start_date_local ?? a.start_date ?? ''
  return {
    id: stravaUuid(a.id),
    stravaId: a.id,
    name: a.name ?? '',
    type: a.type ?? '',
    sportType: a.sport_type ?? a.type ?? '',
    date: local.slice(0, 10), // lokaler Tag
    startDate: a.start_date ?? local,
    distance: Math.round(a.distance ?? 0), // m
    movingTime: Math.round(a.moving_time ?? 0), // s
    elapsedTime: Math.round(a.elapsed_time ?? 0), // s
    elevation: Math.round((a.total_elevation_gain ?? 0) * 10) / 10, // m
    avgSpeed: Math.round((a.average_speed ?? 0) * 1000) / 1000, // m/s
    maxSpeed: Math.round((a.max_speed ?? 0) * 1000) / 1000,
    ...(a.has_heartrate && a.average_heartrate ? { avgHr: Math.round(a.average_heartrate), maxHr: Math.round(a.max_heartrate ?? 0) || undefined } : {}),
    updatedAt: nowIso,
    deleted: false,
  }
}

// ---------- Signierter Verbindungs-Code (state) ----------
// Die App (angemeldet) holt ihn mit „prepare“. Strava reicht ihn beim Rücksprung zurück; dort ist man auf dem iPhone oft NICHT
// angemeldet (anderes Safari-Fenster). Die Signatur (HMAC mit dem Strava-Geheimnis) beweist, dass der Code von deiner App kommt.
const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

async function hmac(secret: string, payload: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)))
}

async function makeState(secret: string, userId: string, expiresAtMs: number) {
  const payload = `${userId}.${expiresAtMs}`
  return `${payload}.${await hmac(secret, payload)}`
}

// Gibt die Nutzer-ID zurück, wenn Signatur stimmt und der Code noch gültig ist, sonst null
async function verifyState(secret: string, state: string, nowMs: number): Promise<string | null> {
  const parts = state.split('.')
  if (parts.length !== 3) return null
  const [userId, exp, sig] = parts
  if (!/^[0-9a-f-]{36}$/.test(userId) || !(Number(exp) > nowMs)) return null
  return sig === (await hmac(secret, `${userId}.${exp}`)) ? userId : null
}
// --- logic:end -----------------------------------------------------------------

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const REQUIRED_SECRETS = ['STRAVA_CLIENT_ID', 'STRAVA_CLIENT_SECRET']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    return await handle(req)
  } catch (e) {
    console.error(e)
    return json({ error: `Unerwarteter Fehler: ${(e as Error).message}` }, 500)
  }
})

interface Conn {
  user_id: string
  athlete_id: number
  athlete_name: string | null
  access_token: string
  refresh_token: string
  expires_at: string
  last_sync: string | null
}

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: Deno.env.get('STRAVA_CLIENT_ID')!, client_secret: Deno.env.get('STRAVA_CLIENT_SECRET')!, ...params }),
  })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body }
}

async function handle(req: Request): Promise<Response> {
  const missing = REQUIRED_SECRETS.filter((k) => !Deno.env.get(k))
  if (missing.length) return json({ error: `Fehlende Geheimnisse in Supabase: ${missing.join(', ')}` }, 500)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const body = await req.json().catch(() => ({}))
  const action = body?.action as string
  const secret = Deno.env.get('STRAVA_CLIENT_SECRET')!

  // Wer ruft auf? „connect“ mit signiertem Code funktioniert auch ohne Login (Rücksprung von Strava im Safari-Fenster).
  let user: { id: string } | null = null
  if (action === 'connect' && body?.state) {
    const id = await verifyState(secret, String(body.state), Date.now())
    if (!id) return json({ error: 'Der Verbindungs-Code ist abgelaufen oder ungültig. Starte „Mit Strava verbinden“ bitte neu.' }, 400)
    user = { id }
  } else {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: userData } = await supabase.auth.getUser(token)
    user = userData?.user ?? null
  }
  if (!user) return json({ error: 'nicht angemeldet' }, 401)
  const loadConn = async () => (await supabase.from('strava_connection').select('*').eq('user_id', user.id).maybeSingle()).data as Conn | null

  if (action === 'prepare') {
    return json({ state: await makeState(secret, user.id, Date.now() + 15 * 60_000) })
  }

  if (action === 'status') {
    const c = await loadConn()
    return json({ connected: !!c, athleteName: c?.athlete_name ?? null, lastSync: c?.last_sync ?? null })
  }

  if (action === 'connect') {
    const code = String(body?.code ?? '')
    if (!code) return json({ error: 'Kein Code von Strava erhalten.' }, 400)
    const r = await tokenRequest({ code, grant_type: 'authorization_code' })
    if (!r.ok) return json({ error: `Strava hat den Login abgelehnt (${r.status}). ${r.body?.message ?? ''}` }, 400)
    const scope = String(body?.scope ?? '')
    if (scope && !scope.includes('activity:read')) return json({ error: 'Bitte erlaube Strava den Zugriff auf deine Aktivitäten („Alle Aktivitäten ansehen“).' }, 400)
    const a = r.body.athlete ?? {}
    const { error } = await supabase.from('strava_connection').upsert({
      user_id: user.id,
      athlete_id: a.id,
      athlete_name: [a.firstname, a.lastname].filter(Boolean).join(' ') || null,
      access_token: r.body.access_token,
      refresh_token: r.body.refresh_token,
      expires_at: new Date(r.body.expires_at * 1000).toISOString(),
      scope,
      last_sync: null,
      updated_at: new Date().toISOString(),
    })
    if (error) return json({ error: error.message }, 500)
    return json({ connected: true, athleteName: [a.firstname, a.lastname].filter(Boolean).join(' ') || null })
  }

  if (action === 'disconnect') {
    const c = await loadConn()
    if (c) {
      await fetch('https://www.strava.com/oauth/deauthorize', { method: 'POST', headers: { Authorization: `Bearer ${c.access_token}` } }).catch(() => {})
      await supabase.from('strava_connection').delete().eq('user_id', user.id)
    }
    return json({ connected: false })
  }

  if (action === 'sync') {
    let c = await loadConn()
    if (!c) return json({ error: 'Strava ist nicht verbunden.' }, 400)
    if (Date.parse(c.expires_at) < Date.now() + 60_000) {
      const r = await tokenRequest({ grant_type: 'refresh_token', refresh_token: c.refresh_token })
      if (!r.ok) {
        if (r.status === 400 || r.status === 401) await supabase.from('strava_connection').delete().eq('user_id', user.id) // Zugriff entzogen
        return json({ error: 'Die Strava-Verbindung ist abgelaufen. Bitte neu verbinden.', disconnected: true }, 401)
      }
      c = { ...c, access_token: r.body.access_token, refresh_token: r.body.refresh_token, expires_at: new Date(r.body.expires_at * 1000).toISOString() }
      await supabase.from('strava_connection').update({ access_token: c.access_token, refresh_token: c.refresh_token, expires_at: c.expires_at, updated_at: new Date().toISOString() }).eq('user_id', user.id)
    }

    // Ab wann: erster Abruf = letzte 90 Tage (oder `days`), danach seit dem letzten Abruf (mit 3 Tagen Puffer)
    const days = Number(body?.days) > 0 ? Math.min(Number(body.days), 365) : 90
    const after = c.last_sync ? Math.floor((Date.parse(c.last_sync) - 3 * 86_400_000) / 1000) : Math.floor((Date.now() - days * 86_400_000) / 1000)
    const nowIso = new Date().toISOString()
    const rows: { id: string; user_id: string; data: ReturnType<typeof toActivityData>; updated_at: string; deleted: boolean }[] = []
    for (let page = 1; page <= 10; page++) {
      const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100&page=${page}`, { headers: { Authorization: `Bearer ${c.access_token}` } })
      if (res.status === 429) return json({ error: 'Strava begrenzt gerade die Abrufe. Versuche es in ein paar Minuten nochmal.' }, 429)
      if (res.status === 401) return json({ error: 'Strava hat den Zugriff abgelehnt. Bitte neu verbinden.', disconnected: true }, 401)
      if (!res.ok) return json({ error: `Strava-Fehler ${res.status}` }, 502)
      const list = (await res.json()) as StravaApiActivity[]
      for (const a of list) {
        const data = toActivityData(a, nowIso)
        rows.push({ id: data.id, user_id: user.id, data, updated_at: nowIso, deleted: false })
      }
      if (list.length < 100) break
    }
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase.from('strava_activities').upsert(rows.slice(i, i + 200))
      if (error) return json({ error: error.message }, 500)
    }
    await supabase.from('strava_connection').update({ last_sync: nowIso }).eq('user_id', user.id)
    return json({ fetched: rows.length, lastSync: nowIso })
  }

  return json({ error: 'unbekannte Aktion' }, 400)
}
