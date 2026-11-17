// Supabase Edge Function "remind": verschickt Push-Erinnerungen (Morgen/Abend und je Gewohnheit zu eigener Uhrzeit).
// - Zeitplan (pg_cron) ruft sie alle 5 Minuten mit Header x-cron-secret auf.
// - Die App ruft sie mit {"test": true} und dem Login-Token auf, um eine Testnachricht zu senden.
// Einzelne Datei, damit sie sich im Dashboard einfügen lässt (Verify JWT muss AUS sein).

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

// --- logic:start ---------------------------------------------------------------
type Kind = 'morning' | 'evening'

interface Sub {
  timezone: string
  morning_on: boolean
  morning_time: string
  evening_on: boolean
  evening_time: string
  last_morning: string | null
  last_evening: string | null
  last_habits?: Record<string, string> | null // je Gewohnheit: an welchem Tag zuletzt erinnert
}

const CATCH_UP_MIN = 60 // verpasst der Zeitplan eine Runde, wird bis zu 60 Minuten später nachgeholt

const MESSAGES: Record<Kind, { title: string; body: string }> = {
  morning: { title: 'Guten Morgen!', body: 'Zeit für deine Gewohnheiten heute.' },
  evening: { title: 'Abend-Check', body: 'Hast du heute alles erledigt?' },
}

function localParts(now: Date, timezone: string): { date: string; minutes: number; weekday: number } {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      weekday: 'short',
    }).formatToParts(now)
  } catch {
    return localParts(now, 'Europe/Berlin') // ungültige Zeitzone
  }
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday')) // 0 = Montag
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')), weekday }
}

const toMinutes = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

// Welche Erinnerungen sind jetzt fällig (Uhrzeit erreicht, heute noch nicht gesendet)?
function dueKinds(sub: Sub, now: Date): { kind: Kind; date: string }[] {
  const { date, minutes } = localParts(now, sub.timezone)
  const out: { kind: Kind; date: string }[] = []
  const check = (kind: Kind, on: boolean, time: string, last: string | null) => {
    const t = toMinutes(time)
    if (on && t !== null && minutes >= t && minutes < t + CATCH_UP_MIN && last !== date) out.push({ kind, date })
  }
  check('morning', sub.morning_on, sub.morning_time, sub.last_morning)
  check('evening', sub.evening_on, sub.evening_time, sub.last_evening)
  return out
}

// ---------- Erinnerung je Gewohnheit ----------

interface HabitRow {
  id: string
  data: {
    name?: string
    frequency?: { type?: string; days?: number[]; count?: number }
    reminderTime?: string
    archived?: boolean
    deleted?: boolean
    dailyTarget?: number
  }
}
interface CheckRow {
  data: { habitId?: string; date?: string; value?: number; mini?: boolean; deleted?: boolean }
}

const shiftDate = (date: string, days: number) => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

// Ist die Gewohnheit an diesem Tag erledigt? (wie in der App: Mini zählt, Mengen müssen das Tagesziel erreichen)
function doneOn(h: HabitRow, checks: CheckRow[], date: string): boolean {
  const mine = checks.filter((c) => c.data.habitId === h.id && c.data.date === date && !c.data.deleted)
  if (!mine.length) return false
  if (mine.some((c) => c.data.mini)) return true
  const target = h.data.dailyTarget
  if (!target) return true
  return mine.reduce((sum, c) => sum + (c.data.value ?? target), 0) >= target
}

// Welche Gewohnheiten mit eigener Uhrzeit sind jetzt fällig (Uhrzeit erreicht, heute fällig und noch offen, heute noch nicht erinnert)?
function dueHabitReminders(sub: Sub, habits: HabitRow[], checks: CheckRow[], now: Date): { id: string; name: string; date: string }[] {
  const { date, minutes, weekday } = localParts(now, sub.timezone)
  const weekStart = shiftDate(date, -weekday)
  const out: { id: string; name: string; date: string }[] = []
  for (const h of habits) {
    const d = h.data
    const t = d.reminderTime ? toMinutes(d.reminderTime) : null
    if (t === null || d.deleted || d.archived) continue
    if (!(minutes >= t && minutes < t + CATCH_UP_MIN)) continue
    if (sub.last_habits?.[h.id] === date) continue
    const f = d.frequency
    if (f?.type === 'weekdays' && !(f.days ?? []).includes(weekday)) continue
    if (doneOn(h, checks, date)) continue
    if (f?.type === 'perWeek') {
      let doneDays = 0
      for (let i = 0; i <= weekday; i++) if (doneOn(h, checks, shiftDate(weekStart, i))) doneDays++
      if (doneDays >= (f.count ?? 1)) continue
    }
    out.push({ id: h.id, name: d.name || 'Gewohnheit', date })
  }
  return out
}
// --- logic:end -----------------------------------------------------------------

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const REQUIRED_SECRETS = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT', 'CRON_SECRET']

// Jeder Fehler kommt als lesbare JSON-Meldung zurück (steht dann direkt in der App).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    return await handle(req)
  } catch (e) {
    console.error(e)
    return json({ error: `Unerwarteter Fehler: ${(e as Error).message}` }, 500)
  }
})

async function handle(req: Request): Promise<Response> {
  const missing = REQUIRED_SECRETS.filter((k) => !Deno.env.get(k))
  if (missing.length) return json({ error: `Fehlende Geheimnisse in Supabase: ${missing.join(', ')}` }, 500)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )

  const cronSecret = Deno.env.get('CRON_SECRET')
  const isCron = !!cronSecret && req.headers.get('x-cron-secret') === cronSecret

  type Row = Sub & { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }
  type Target = { row: Row; message: { title: string; body: string }; kind?: Kind; date?: string; habitIds?: string[] }
  const targets: Target[] = []

  if (isCron) {
    const { data, error } = await supabase.from('push_subscriptions').select('*')
    if (error) return json({ error: error.message }, 500)
    const now = new Date()
    const rows = (data ?? []) as Row[]
    for (const row of rows)
      for (const { kind, date } of dueKinds(row, now)) targets.push({ row, message: MESSAGES[kind], kind, date })

    // Erinnerungen je Gewohnheit: Daten des Nutzers nur laden, wenn überhaupt eine Uhrzeit gesetzt ist (je Nutzer einmal)
    const cache = new Map<string, { habits: HabitRow[]; checks: CheckRow[] } | null>()
    for (const row of rows) {
      if (!cache.has(row.user_id)) {
        const { data: hs, error: hErr } = await supabase.from('habits').select('id, data').eq('user_id', row.user_id).eq('deleted', false)
        if (hErr) {
          console.error('habits', hErr.message)
          cache.set(row.user_id, null)
          continue
        }
        const withTime = ((hs ?? []) as HabitRow[]).filter((h) => !!h.data?.reminderTime)
        if (!withTime.length) {
          cache.set(row.user_id, { habits: [], checks: [] })
          continue
        }
        const since = new Date(now.getTime() - 8 * 86_400_000).toISOString().slice(0, 10)
        const { data: cs, error: cErr } = await supabase
          .from('check_ins')
          .select('data')
          .eq('user_id', row.user_id)
          .eq('deleted', false)
          .gte('data->>date', since)
        if (cErr) {
          console.error('check_ins', cErr.message)
          cache.set(row.user_id, null)
          continue
        }
        cache.set(row.user_id, { habits: withTime, checks: (cs ?? []) as CheckRow[] })
      }
      const info = cache.get(row.user_id)
      if (!info || !info.habits.length) continue
      const due = dueHabitReminders(row, info.habits, info.checks, now)
      if (!due.length) continue
      targets.push({
        row,
        message: { title: due.map((x) => x.name).join(', '), body: 'Jetzt ist deine Zeit dafür.' },
        kind: undefined,
        date: due[0].date,
        habitIds: due.map((x) => x.id),
      })
    }
  } else {
    // Testnachricht: nur mit gültigem Login, nur an die eigenen Geräte
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: userData } = await supabase.auth.getUser(token)
    const user = userData?.user
    if (!user) return json({ error: 'nicht angemeldet' }, 401)
    const body = await req.json().catch(() => ({}))
    if (!body?.test) return json({ error: 'nichts zu tun' }, 400)
    const { data } = await supabase.from('push_subscriptions').select('*').eq('user_id', user.id)
    for (const row of (data ?? []) as Row[])
      targets.push({ row, message: { title: 'Be Happy', body: 'Testnachricht: Erinnerungen funktionieren. ✅' } })
  }

  let sent = 0
  let removed = 0
  const failed: string[] = []
  for (const { row, message, kind, date, habitIds } of targets) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        JSON.stringify({ ...message, url: '/', tag: kind ?? (habitIds ? `habit-${habitIds[0]}` : 'test') }),
        { TTL: 3600 },
      )
      sent++
      if (kind && date) await supabase.from('push_subscriptions').update({ [`last_${kind}`]: date }).eq('id', row.id)
      if (habitIds && date) {
        // merken, dass heute erinnert wurde; Einträge älter als 7 Tage fallen weg
        const cutoff = new Date(Date.parse(date) - 7 * 86_400_000).toISOString().slice(0, 10)
        const kept = Object.fromEntries(Object.entries(row.last_habits ?? {}).filter(([, d]) => d > cutoff))
        for (const id of habitIds) kept[id] = date
        await supabase.from('push_subscriptions').update({ last_habits: kept }).eq('id', row.id)
        row.last_habits = kept // mehrere Mitteilungen in einem Lauf
      }
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', row.id) // abgemeldetes Gerät
        removed++
      } else failed.push(`${status ?? 'Fehler'}: ${(e as Error).message}`)
    }
  }
  return json({ sent, removed, failed })
}
