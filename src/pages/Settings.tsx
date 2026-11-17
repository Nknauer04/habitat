import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/useSession'

export default function Settings() {
  const { session, loading } = useSession()
  const [email, setEmail] = useState('')
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
            <button
              onClick={() => void supabase!.auth.signOut()}
              className="mt-3 rounded-lg bg-slate-800 px-3 py-2 hover:bg-slate-700"
            >
              Abmelden
            </button>
          </div>
        ) : status === 'sent' ? (
          <p className="mt-2 text-sm text-emerald-400">
            Link gesendet. Öffne die E-Mail auf diesem Gerät und tippe auf den Link.
          </p>
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
