import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { autoMapKinds, connectStrava, foundKinds, syncStrava } from '../lib/strava'
import { supabase } from '../lib/supabase'

// Rücksprung von Strava (/strava?code=…&state=…): Verbindung speichern. Läuft das in einem Fenster ohne Login
// (iPhone: Safari-Fenster), reicht der signierte Code; der Abruf passiert dann in der App selbst.
export default function StravaCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [msg, setMsg] = useState('Verbinde mit Strava …')
  const [state, setState] = useState<'work' | 'error' | 'done'>('work')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const code = params.get('code')
    const signed = params.get('state')
    if (params.get('error') || !code || !signed) {
      setState('error')
      return setMsg(params.get('error') === 'access_denied' ? 'Du hast den Zugriff bei Strava nicht erlaubt.' : 'Strava hat keinen gültigen Code geschickt. Starte die Verbindung bitte in den Einstellungen neu.')
    }
    void (async () => {
      try {
        await connectStrava(code, params.get('scope') ?? '', signed)
        const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } }
        if (!data.session) {
          // Anderes Fenster ohne Login (iPhone): Verbindung steht, der Abruf passiert in der App
          setState('done')
          return setMsg('Strava ist verbunden. Schließe dieses Fenster, öffne Be Happy und tippe in den Einstellungen bei Strava auf „Jetzt abrufen“.')
        }
        setMsg('Aktivitäten der letzten 90 Tage werden geladen …')
        await syncStrava(90)
        await autoMapKinds(Object.keys(await foundKinds()))
        navigate('/einstellungen', { replace: true })
      } catch (e) {
        setState('error')
        setMsg((e as Error).message)
      }
    })()
  }, [params, navigate])

  return (
    <div className="mt-16 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-accent-400">Strava</h1>
      <p role="status" className={`mt-4 ${state === 'error' ? 'text-red-400' : state === 'done' ? 'text-done' : 'text-slate-300'}`}>
        {msg}
      </p>
      {state !== 'work' && (
        <Link to="/einstellungen" className="mt-6 inline-block rounded-full border border-slate-700 px-5 py-3 text-slate-200">
          Zu den Einstellungen
        </Link>
      )}
    </div>
  )
}
