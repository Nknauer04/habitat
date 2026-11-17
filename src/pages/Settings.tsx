import { useRef, useState, useSyncExternalStore, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import DisplayInfo from '../components/DisplayInfo'
import RemindersCard from '../components/RemindersCard'
import { setCoachEnabled, useCoachEnabled } from '../lib/coachPrefs'
import { setProfileName, useProfileName } from '../lib/profile'
import { backupFileName, buildBackup, mergeBackup, parseBackup } from '../lib/backup'
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
  'min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base outline-none focus:border-accent-500'
const primary =
  'rounded-full bg-accent-500 px-4 py-2 font-medium text-black disabled:opacity-50'

export default function Settings() {
  const profileName = useProfileName()
  const coachOn = useCoachEnabled()
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

  const fileRef = useRef<HTMLInputElement>(null)
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function exportBackup() {
    setBackupMsg(null)
    try {
      const backup = await buildBackup()
      const file = new File([JSON.stringify(backup, null, 2)], backupFileName(), { type: 'application/json' })
      // iPhone/iPad: Teilen-Menü (Dateien, iCloud …); sonst normaler Download.
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] })
        } catch (e) {
          if ((e as DOMException).name === 'AbortError') return
          throw e
        }
      } else {
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      }
      setBackupMsg({
        ok: true,
        text: `Exportiert: ${backup.habits.length} Gewohnheiten, ${backup.checkIns.length} Check-ins, ${backup.goals.length} Ziele, ${backup.reviews?.length ?? 0} Rückblicke.`,
      })
    } catch (e) {
      setBackupMsg({ ok: false, text: `Export fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}` })
    }
  }

  async function importBackup(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = '' // erlaubt, dieselbe Datei erneut zu wählen
    if (!f) return
    setBackupMsg(null)
    try {
      const r = await mergeBackup(parseBackup(await f.text()))
      setBackupMsg({
        ok: true,
        text: `Importiert: ${r.habits} Gewohnheiten, ${r.checkIns} Check-ins, ${r.goals} Ziele, ${r.reviews} Rückblicke übernommen, ${r.skipped} unverändert übersprungen.`,
      })
    } catch (err) {
      setBackupMsg({ ok: false, text: `Import abgebrochen: ${err instanceof Error ? err.message : String(err)}` })
    }
  }

  return (
    <div>
      <Link to="/profil" className="text-sm text-slate-400 hover:text-slate-200">
        ‹ Profil
      </Link>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-accent-400">Einstellungen</h1>

      <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="font-medium">Profil</h2>
        <label className="mt-3 block text-sm text-slate-400">
          Name (wird im Profil angezeigt)
          <input
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            maxLength={30}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base text-white outline-none focus:border-accent-500"
          />
        </label>
      </section>

      <section className="mt-4 rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="font-medium">Coach</h2>
        <label className="mt-3 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={coachOn}
            onChange={(e) => setCoachEnabled(e.target.checked)}
            className="mt-0.5 h-5 w-5 accent-accent-500"
          />
          <span className="text-sm text-slate-300">
            Tipp des Tages in „Heute“ anzeigen
            <span className="mt-0.5 block text-xs text-slate-500">
              Regelbasiert, ohne KI: entsteht aus deinen eigenen Zahlen auf diesem Gerät. Es werden keine Daten gesendet.
            </span>
          </span>
        </label>
      </section>

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
            {sync.warning && <p className="mt-2 text-amber-400">{sync.warning}</p>}
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
                className="rounded-full bg-slate-800 px-3 py-2 hover:bg-slate-700"
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
              {info && <p className="mt-2 text-accent-400">{info}</p>}
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

      <RemindersCard />

      <section className="mt-4 rounded-xl border border-slate-800 p-4">
        <h2 className="font-medium">Backup</h2>
        <p className="mt-1 text-sm text-slate-400">
          Sichert alle Gewohnheiten, Check-ins und Ziele als Datei. Beim Importieren wird zusammengeführt, der
          neuere Eintrag gewinnt – nichts wird gelöscht.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => void exportBackup()} className={primary}>
            Exportieren
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-full bg-slate-800 px-4 py-2 hover:bg-slate-700"
          >
            Importieren
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => void importBackup(e)}
          />
        </div>
        {backupMsg && (
          <p className={`mt-3 text-sm ${backupMsg.ok ? 'text-accent-400' : 'text-red-400'}`}>{backupMsg.text}</p>
        )}
      </section>

      <p className="mt-6 text-center text-xs text-slate-500">
        Version vom{' '}
        {new Date(__BUILD_TIME__).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
      </p>

      <DisplayInfo />
    </div>
  )
}
