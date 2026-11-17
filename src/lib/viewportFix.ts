// iOS 26 (installierte Web-App): Beim Start ist das Fenster (window.innerHeight) um die Höhe der
// Statusleiste (ca. 62 px) kürzer als der Bildschirm, obwohl die App unter die Statusleiste reicht.
// Erst eine Scroll-Geste lässt iOS neu messen. Hier lösen wir diese Neumessung selbst aus, bis das
// Fenster die volle Höhe hat. Auf Desktop-Browsern und im normalen Safari-Tab passiert nichts.

let attempts = 0
export const viewportFixAttempts = () => attempts

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

const isPortrait = () => window.matchMedia('(orientation: portrait)').matches

// Fehlende Höhe in Pixeln (0 = Fenster hat die volle Höhe)
export const viewportGap = () => (isPortrait() ? Math.max(0, window.screen.height - window.innerHeight) : 0)

// Meta-Viewport kurz ändern und die Seite um 1 px scrollen: beides zwingt WebKit zur Neumessung.
export function nudgeViewport() {
  attempts++
  const meta = document.querySelector('meta[name="viewport"]')
  const original = meta?.getAttribute('content') ?? null
  if (meta && original) {
    meta.setAttribute('content', `${original}, maximum-scale=10`)
    requestAnimationFrame(() => meta.setAttribute('content', original))
  }
  window.scrollTo(0, 1)
  requestAnimationFrame(() => window.scrollTo(0, 0))
}

export function installViewportFix() {
  if (!isStandalone()) return
  const check = () => {
    if (viewportGap() > 20) nudgeViewport()
  }
  for (const t of [0, 120, 400, 900, 1800, 3500]) setTimeout(check, t)
  window.addEventListener('pageshow', check)
  window.addEventListener('orientationchange', () => setTimeout(check, 300))
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
}
