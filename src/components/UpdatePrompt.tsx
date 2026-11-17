import { useRegisterSW } from 'virtual:pwa-register/react'

const CHECK_EVERY_MS = 60 * 60 * 1000 // stündlich nach einer neuen Version suchen

// Hinweis „Neue Version verfügbar“. Die neue Version wartet im Hintergrund und wird erst
// durch „Aktualisieren“ aktiv (lädt die App neu), damit nichts mitten in der Eingabe verschwindet.
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        if (!navigator.onLine) return
        registration.update().catch(() => {})
      }
      // iPhone-Apps bleiben oft tagelang im Hintergrund: beim Zurückkehren und stündlich prüfen.
      setInterval(check, CHECK_EVERY_MS)
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
    },
  })

  if (!needRefresh) return null

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
    >
      <div className="flex w-full max-w-md flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-accent-500/40 bg-slate-900 p-3 shadow-lg">
        <div className="min-w-[11rem] flex-1 text-sm">
          <div className="font-medium">Neue Version verfügbar</div>
          <div className="text-slate-400">Aktualisieren lädt die App neu.</div>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setNeedRefresh(false)}
            className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Später
          </button>
          <button
            onClick={() => void updateServiceWorker(true)}
            className="rounded-full bg-accent-500 px-3 py-2 text-sm font-medium text-black"
          >
            Aktualisieren
          </button>
        </div>
      </div>
    </div>
  )
}
