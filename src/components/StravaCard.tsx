import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '../lib/db'
import { autoMapKinds, disconnectStrava, foundKinds, getStravaStatus, setKindMapping, startStravaConnect, stravaConfigured, syncStrava, type StravaStatus } from '../lib/strava'
import { STRAVA_KINDS } from '../lib/stravaCore'
import { supabase } from '../lib/supabase'

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'noch nie')

// Einstellungen → Strava: verbinden, abrufen, trennen, Sportarten den Einheiten zuordnen
export default function StravaCard() {
  const [status, setStatus] = useState<StravaStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [found, setFound] = useState<Record<string, number>>({})
  const activities = useLiveQuery(() => db.plans.filter((a) => !a.deleted).toArray(), [])
  const stravaCount = useLiveQuery(() => db.stravaActivities.filter((s) => !s.deleted).count(), [])

  useEffect(() => {
    if (!stravaConfigured()) return
    getStravaStatus().then(setStatus).catch((e: Error) => setMsg({ ok: false, text: e.message }))
  }, [])
  useEffect(() => {
    void foundKinds().then(setFound)
  }, [stravaCount])
  // Zurück aus dem Strava-Fenster (iPhone): Status neu lesen
  useEffect(() => {
    if (!stravaConfigured()) return
    const onVisible = () => document.visibilityState === 'visible' && getStravaStatus().then(setStatus).catch(() => {})
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  async function run<T>(fn: () => Promise<T>, ok: (r: T) => string) {
    setBusy(true)
    setMsg(null)
    try {
      const r = await fn()
      setMsg({ ok: true, text: ok(r) })
      setStatus(await getStravaStatus())
      setFound(await foundKinds())
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const card = 'mt-4 rounded-3xl border border-slate-800 bg-slate-900 p-5'

  if (!supabase) return null
  if (!stravaConfigured())
    return (
      <section className={card}>
        <h2 className="font-medium">Strava</h2>
        <p className="mt-2 text-sm text-slate-400">Noch nicht eingerichtet. Die Anleitung steht in <code>docs/strava-setup.md</code> (Strava-API-Anwendung, Supabase, Vercel-Variable <code>VITE_STRAVA_CLIENT_ID</code>).</p>
      </section>
    )

  return (
    <section className={card}>
      <h2 className="font-medium">Strava</h2>
      {!status?.connected ? (
        <>
          <p className="mt-2 text-sm text-slate-400">Holt Strecke, Tempo, Höhenmeter und Herzfrequenz deiner Läufe, Fahrten und mehr automatisch und trägt die Kilometer in deine Einheiten ein.</p>
          <button
            onClick={async () => {
              setBusy(true)
              setMsg(null)
              try {
                window.location.href = await startStravaConnect()
              } catch (e) {
                setMsg({ ok: false, text: (e as Error).message })
                setBusy(false)
              }
            }}
            disabled={busy}
            className="mt-4 rounded-full bg-[#fc4c02] px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Einen Moment …' : 'Mit Strava verbinden'}
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-300">
            Verbunden{status.athleteName ? ` als ${status.athleteName}` : ''} · zuletzt abgerufen: {when(status.lastSync)} · {stravaCount ?? 0} Aktivitäten
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() =>
                run(async () => {
                  const n = await syncStrava()
                  await autoMapKinds(Object.keys(await foundKinds())) // neue Arten bekommen automatisch eine Einheit
                  return n
                }, (n) => `Abgerufen: ${n} Aktivitäten geprüft.`)
              }
              disabled={busy}
              className="rounded-full bg-accent-500 px-5 py-2.5 font-semibold text-black disabled:opacity-50"
            >
              {busy ? 'Einen Moment …' : 'Jetzt abrufen'}
            </button>
            <button onClick={() => confirm('Strava trennen? Bereits übernommene Einträge bleiben erhalten.') && run(disconnectStrava, () => 'Strava getrennt.')} disabled={busy} className="rounded-full px-3 py-2.5 text-sm text-slate-400 active:bg-slate-800">
              Trennen
            </button>
          </div>

          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Sportarten → Einheiten</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {STRAVA_KINDS.map((k) => {
              const mapped = (activities ?? []).find((a) => (a.stravaKinds ?? []).includes(k.key))
              return (
                <li key={k.key} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 text-[15px]">
                    {k.label}
                    <span className="ml-2 text-xs text-slate-500">{found[k.key] ?? 0} Aktivitäten</span>
                  </span>
                  <select
                    value={mapped?.id ?? ''}
                    onChange={(e) => void setKindMapping(k.key, e.target.value || null)}
                    aria-label={`Einheit für ${k.label}`}
                    className="max-w-[11rem] shrink-0 rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-accent-500"
                  >
                    <option value="">nicht übernehmen</option>
                    {(activities ?? []).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.unit})
                      </option>
                    ))}
                  </select>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-xs text-slate-500">Die Kilometer eines Tages landen als Eintrag in der Einheit. Einträge, die du selbst änderst, überschreibt Strava nicht mehr.</p>
        </>
      )}
      {msg && (
        <p role="status" className={`mt-3 text-sm ${msg.ok ? 'text-done' : 'text-red-400'}`}>
          {msg.text}
        </p>
      )}
    </section>
  )
}
