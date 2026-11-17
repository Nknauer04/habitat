import { useState, useSyncExternalStore, type FormEvent } from 'react'
import { db, newId, now } from '../lib/db'
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

// Nur für Tests in der Entwicklung: legt eine Gewohnheit an, um den Sync zu prüfen.
function addTestHabit() {
  const t = now()
  void db.habits.add({
    id: newId(),
    name: `Test ${new Date().toLocaleTimeString('de-DE')}`,
    icon: '🧪',
    area: 'sonstiges',
    timeOfDay: 'beliebig',
    frequency: { type: 'daily' },
    archived: false,
    createdAt: t,
    updatedAt: t,
    deleted: false,
  })
}

export default function Settings() {
  const { session, loading } = useSession()
  const sync = useSyncExternalStore(subscribeSync, getSyncStatus)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function sendLink(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setStatus('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      setError(error.message)
      setStatus('error')
    } else {
      setStatus('sent')
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setCodeError('')
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    if (error) setCodeError(error.message)
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
                className="rounded-lg bg-emerald-500 px-3 py-2 font-medium text-slate-950 disabled:opacity-50"
              >
                Jetzt synchronisieren
              </button>
              <button
                onClick={() => void supabase!.auth.signOut()}
                className="rounded-lg bg-slate-800 px-3 py-2 hover:bg-slate-700"
              >
                Abmelden
              </button>
              {import.meta.env.DEV && (
                <button onClick={addTestHabit} className="rounded-lg bg-slate-800 px-3 py-2 hover:bg-slate-700">
                  Testgewohnheit (nur Dev)
                </button>
              )}
            </div>
          </div>
        ) : status === 'sent' ? (
          <div className="mt-2 text-sm">
            <p className="text-emerald-400">
              E-Mail gesendet. Tippe auf den Link – oder gib hier den Code aus der E-Mail ein (nötig
              in der installierten iPhone-App).
            </p>
            <form onSubmit={verifyCode} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.trim())}
                placeholder="Code"
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base tracking-widest outline-none focus:border-emerald-500"
              />
              <button className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-slate-950">
                Anmelden
              </button>
            </form>
            {codeError && <p className="mt-2 text-red-400">{codeError}</p>}
          </div>
        ) : (
          <form onSubmit={sendLink} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-Mail-Adresse"
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base outline-none focus:border-emerald-500"
            />
            <button
              disabled={status === 'sending'}
              className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-50"
            >
              Magic Link senden
            </button>
          </form>
        )}
        {status === 'error' && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </section>
    </div>
  )
}
