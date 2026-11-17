import { useState, useSyncExternalStore, type FormEvent } from 'react'
import { getSyncStatus, subscribeSync, syncNow, type SyncStatus } from '../lib/sync'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/useSession'

function syncText(s: SyncStatus) {
  switch (s.state) {
    case 'syncing':
      return 'Synchronisiere …'
    case 'offline':
      return 'Offline – Änderungen werden später übertragen.'
    case 'error':
      return `Sync-Fehler: ${s.error}`
    case 'ok':
      return `Synchronisiert um ${new Date(s.lastSync!).toLocaleTimeString('de-DE')} (↓ ${s.pulled}, ↑ ${s.pushed})`
    default:
      return 'Noch nicht synchronisiert.'
  }
}

const input =
  'min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base outline-none focus:border-emerald-500'
const primary =
  'rounded-lg bg-emerald-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-50'

export default function Settings() {
  const { session, loading } = useSession()
  const sync = useSyncExternalStore(subscribeSync, getSyncStatus)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function signIn(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else setPassword('')
    setBusy(false)
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError('')
    setInfo('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setError(error.message)
    else {
      setInfo('Passwort gespeichert.')
      setNewPassword('')
    }
    setBusy(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Einstellungen</h1>

      <section className="mt-6 rounded-xl border border-slate-800 p-4">
        <h2 className="font-medium">Konto & Sync</h2>
        {!supabase ? (
          <p className="mt-2 text-sm text-amber-400">
            Supabase ist nicht konfiguriert (<code>.env</code> prüfen). Die App läuft nur lokal.
          </p>
        ) : loading ? (
          <p className="mt-2 text-sm text-slate-400">Lade …</p>
        ) : session ? (
          <div className="mt-2 text-sm">
            <p className="text-slate-300">Angemeldet als {session.user.email}</p>
            <p className="mt-2 text-slate-400">{syncText(sync)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => void syncNow()}
                disabled={sync.state === 'syncing'}
                className={primary}
              >
                Jetzt synchronisieren
              </button>
              <button
                onClick={() => void supabase!.auth.signOut()}
                className="rounded-lg bg-slate-800 px-3 py-2 hover:bg-slate-700"
              >
                Abmelden
              </button>
            </div>

            <form onSubmit={changePassword} className="mt-5 border-t border-slate-800 pt-4">
              <label className="text-slate-300">Passwort festlegen oder ändern</label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Neues Passwort (mind. 8 Zeichen)"
                  className={input}
                />
                <button disabled={busy} className={primary}>
                  Speichern
                </button>
              </div>
              {info && <p className="mt-2 text-emerald-400">{info}</p>}
            </form>
          </div>
        ) : (
          <form onSubmit={signIn} className="mt-3 flex flex-col gap-2">
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-Mail-Adresse"
              className={input}
            />
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort"
              className={input}
            />
            <button disabled={busy} className={primary}>
              Anmelden
            </button>
          </form>
        )}
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </section>
    </div>
  )
}
