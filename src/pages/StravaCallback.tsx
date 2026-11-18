import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { autoMapKinds, connectStrava, foundKinds, syncStrava } from '../lib/strava'

// Rücksprung von Strava (/strava?code=…): Verbindung speichern, erste 90 Tage abrufen, Einheiten zuordnen
export default function StravaCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [msg, setMsg] = useState('Verbinde mit Strava …')
  const [error, setError] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const code = params.get('code')
    if (params.get('error') || !code) {
      setError(true)
      return setMsg(params.get('error') === 'access_denied' ? 'Du hast den Zugriff bei Strava nicht erlaubt.' : 'Strava hat keinen Code geschickt.')
    }
    void (async () => {
      try {
        await connectStrava(code, params.get('scope') ?? '')
        setMsg('Aktivitäten der letzten 90 Tage werden geladen …')
        await syncStrava(90)
        await autoMapKinds(Object.keys(await foundKinds()))
        navigate('/einstellungen', { replace: true })
      } catch (e) {
        setError(true)
        setMsg((e as Error).message)
      }
    })()
  }, [params, navigate])

  return (
    <div className="mt-16 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-accent-400">Strava</h1>
      <p role="status" className={`mt-4 ${error ? 'text-red-400' : 'text-slate-300'}`}>
        {msg}
      </p>
      {error && (
        <Link to="/einstellungen" className="mt-6 inline-block rounded-full border border-slate-700 px-5 py-3 text-slate-200">
          Zurück zu den Einstellungen
        </Link>
      )}
    </div>
  )
}
