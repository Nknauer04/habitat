import { useEffect, useState } from 'react'
import {
  DEFAULT_PREFS,
  disablePush,
  enablePush,
  loadPushState,
  pushSupport,
  savePrefs,
  sendTestPush,
  type PushState,
  type ReminderPrefs,
} from '../lib/push'
import { useSession } from '../lib/useSession'

const timeInput =
  'rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base outline-none focus:border-accent-500 disabled:opacity-40'
const primary = 'rounded-full bg-accent-500 px-4 py-2 font-medium text-white disabled:opacity-50'
const secondary = 'rounded-full bg-slate-800 px-4 py-2 hover:bg-slate-700 disabled:opacity-50'

export default function RemindersCard() {
  const { session } = useSession()
  const support = pushSupport()
  const [state, setState] = useState<PushState | null>(null)
  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_PREFS)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const userId = session?.user.id
  useEffect(() => {
    if (support !== 'ok' || !userId) return
    let alive = true
    loadPushState()
      .then((s) => {
        if (!alive) return
        setState(s)
        setPrefs(s.prefs)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [support, userId])

  async function run(fn: () => Promise<string | void>) {
    setBusy(true)
    setMsg(null)
    try {
      const text = await fn()
      if (text) setMsg({ ok: true, text })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
    }
    setBusy(false)
  }

  const refresh = async () => {
    const s = await loadPushState()
    setState(s)
    setPrefs(s.prefs)
  }

  async function update(p: Partial<ReminderPrefs>) {
    const next = { ...prefs, ...p }
    setPrefs(next)
    if (state?.subscribed) {
      try {
        await savePrefs(next)
      } catch (e) {
        setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
      }
    }
  }

  const subscribed = !!state?.subscribed
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

  return (
    <section className="mt-4 rounded-xl border border-slate-800 p-4">
      <h2 className="font-medium">Erinnerungen</h2>

      {support === 'not-configured' && (
        <p className="mt-2 text-sm text-amber-400">
          Push ist noch nicht eingerichtet (Schlüssel <code>VITE_VAPID_PUBLIC_KEY</code> fehlt).
        </p>
      )}
      {support === 'unsupported' && (
        <p className="mt-2 text-sm text-slate-400">Dieser Browser unterstützt keine Push-Mitteilungen.</p>
      )}
      {support === 'not-installed' && (
        <p className="mt-2 text-sm text-slate-400">
          Auf dem iPhone funktionieren Mitteilungen nur in der installierten App: In Safari auf Teilen → „Zum
          Home-Bildschirm“ tippen und die App von dort öffnen (iOS 16.4 oder neuer).
        </p>
      )}
      {support === 'ok' && !session && <p className="mt-2 text-sm text-slate-400">Bitte zuerst oben anmelden.</p>}

      {support === 'ok' && session && (
        <div className="mt-2 text-sm">
          <p className="text-slate-400">
            Eine Mitteilung am Morgen und eine am Abend, in deiner Zeitzone ({tz}). Auf dem iPhone kommen sie
            nicht minutengenau.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            {(['morning', 'evening'] as const).map((k) => (
              <label key={k} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={prefs[`${k}_on`]}
                  onChange={(e) => void update({ [`${k}_on`]: e.target.checked })}
                  className="h-5 w-5 accent-accent-500"
                />
                <span className="w-16 text-slate-300">{k === 'morning' ? 'Morgens' : 'Abends'}</span>
                <input
                  type="time"
                  value={prefs[`${k}_time`]}
                  disabled={!prefs[`${k}_on`]}
                  onChange={(e) => e.target.value && void update({ [`${k}_time`]: e.target.value })}
                  className={timeInput}
                />
              </label>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {!subscribed ? (
              <button
                disabled={busy}
                onClick={() => void run(async () => (await enablePush(prefs), await refresh(), 'Erinnerungen sind aktiv.'))}
                className={primary}
              >
                Erinnerungen aktivieren
              </button>
            ) : (
              <>
                <button disabled={busy} onClick={() => void run(sendTestPush)} className={primary}>
                  Testnachricht senden
                </button>
                <button
                  disabled={busy}
                  onClick={() => void run(async () => (await disablePush(), await refresh(), 'Erinnerungen sind aus.'))}
                  className={secondary}
                >
                  Deaktivieren
                </button>
              </>
            )}
          </div>
          {state?.permission === 'denied' && (
            <p className="mt-3 text-amber-400">
              Mitteilungen sind für diese App gesperrt. Erlaube sie in den iPhone-Einstellungen unter
              Mitteilungen → Habitat.
            </p>
          )}
        </div>
      )}

      {msg && <p className={`mt-3 text-sm ${msg.ok ? 'text-accent-400' : 'text-red-400'}`}>{msg.text}</p>}
    </section>
  )
}
