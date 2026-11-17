import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export interface ReminderPrefs {
  morning_on: boolean
  morning_time: string
  evening_on: boolean
  evening_time: string
}

export const DEFAULT_PREFS: ReminderPrefs = {
  morning_on: true,
  morning_time: '07:30',
  evening_on: true,
  evening_time: '20:30',
}

export type PushSupport = 'ok' | 'unsupported' | 'not-installed' | 'not-configured'

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export function pushSupport(): PushSupport {
  if (!supabase || !VAPID_PUBLIC_KEY) return 'not-configured'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    // iOS Safari im normalen Tab hat keine PushManager-API; erst die installierte App
    return isIOS() && !isStandalone() ? 'not-installed' : 'unsupported'
  }
  if (isIOS() && !isStandalone()) return 'not-installed'
  return 'ok'
}

const toKey = (base64: string) => {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.ready
  return { reg, sub: await reg.pushManager.getSubscription() }
}

export interface PushState {
  permission: NotificationPermission
  subscribed: boolean
  prefs: ReminderPrefs
}

export async function loadPushState(): Promise<PushState> {
  const { sub } = await currentSubscription()
  let prefs = DEFAULT_PREFS
  if (sub && supabase) {
    const { data } = await supabase
      .from('push_subscriptions')
      .select('morning_on, morning_time, evening_on, evening_time')
      .eq('endpoint', sub.endpoint)
      .maybeSingle()
    if (data) prefs = data as ReminderPrefs
  }
  return { permission: Notification.permission, subscribed: !!sub, prefs }
}

export async function enablePush(prefs: ReminderPrefs): Promise<void> {
  if (!supabase || !VAPID_PUBLIC_KEY) throw new Error('Push ist nicht konfiguriert.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Mitteilungen wurden nicht erlaubt. Du kannst das in den iPhone-Einstellungen ändern.')
  const { reg, sub: existing } = await currentSubscription()
  const sub =
    existing ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(VAPID_PUBLIC_KEY) }))
  const json = sub.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error('Ungültige Push-Anmeldung.')
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin',
      ...prefs,
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw new Error(error.message)
}

export async function disablePush(): Promise<void> {
  const { sub } = await currentSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  if (supabase) await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
}

export async function savePrefs(prefs: ReminderPrefs): Promise<void> {
  const { sub } = await currentSubscription()
  if (!sub || !supabase) return
  const { error } = await supabase
    .from('push_subscriptions')
    .update({ ...prefs, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin' })
    .eq('endpoint', sub.endpoint)
  if (error) throw new Error(error.message)
}

export async function sendTestPush(): Promise<string> {
  if (!supabase) throw new Error('Nicht konfiguriert.')
  const { data, error } = await supabase.functions.invoke('remind', { body: { test: true } })
  if (error) {
    // Antwort der Funktion lesen, damit die echte Ursache in der App steht
    if (error instanceof FunctionsHttpError) {
      let detail = `Status ${error.context.status}`
      try {
        const body = (await error.context.json()) as { error?: string; message?: string }
        detail = body.error ?? body.message ?? detail
      } catch {
        /* keine JSON-Antwort */
      }
      throw new Error(`Testnachricht fehlgeschlagen: ${detail}`)
    }
    throw new Error(`Die Funktion „remind“ ist nicht erreichbar (${error.message}). Ist sie in Supabase eingerichtet?`)
  }
  const r = data as { sent?: number; failed?: string[] }
  if (r.failed?.length) throw new Error(`Versand fehlgeschlagen: ${r.failed[0]}`)
  if (!r.sent) throw new Error('Keine registrierte Anmeldung gefunden. Aktiviere die Erinnerungen erneut.')
  return 'Testnachricht gesendet. Sie sollte in wenigen Sekunden erscheinen.'
}
