import { useEffect, useState } from 'react'

interface Info {
  innerW: number
  innerH: number
  screenW: number
  screenH: number
  visualH: number | null
  safeTop: number
  safeBottom: number
  standalone: boolean
  barBottom: number | null
}

// Misst Sicherheitsabstände, indem ein unsichtbares Element mit env()-Padding gelesen wird.
function measureSafe(side: 'top' | 'bottom') {
  const el = document.createElement('div')
  el.style.cssText = `position:fixed;visibility:hidden;padding-${side}:env(safe-area-inset-${side});`
  document.body.appendChild(el)
  const v = parseFloat(getComputedStyle(el)[side === 'top' ? 'paddingTop' : 'paddingBottom']) || 0
  el.remove()
  return Math.round(v)
}

function read(): Info {
  const bar = document.querySelector('nav[aria-label="Hauptnavigation"].fixed')
  const r = bar && getComputedStyle(bar).display !== 'none' ? bar.getBoundingClientRect() : null
  return {
    innerW: window.innerWidth,
    innerH: window.innerHeight,
    screenW: window.screen.width,
    screenH: window.screen.height,
    visualH: window.visualViewport ? Math.round(window.visualViewport.height) : null,
    safeTop: measureSafe('top'),
    safeBottom: measureSafe('bottom'),
    standalone:
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    barBottom: r ? Math.round(r.bottom) : null,
  }
}

// Kleine Fehlersuche-Anzeige für das Layout auf dem Gerät (z. B. wenn die Tab-Leiste nicht ganz unten sitzt).
export default function DisplayInfo() {
  const [info, setInfo] = useState<Info | null>(null)

  useEffect(() => {
    const update = () => setInfo(read())
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  if (!info) return null
  return (
    <details className="mt-4 text-xs text-slate-500">
      <summary className="cursor-pointer text-center">Anzeige-Details (für die Fehlersuche)</summary>
      <dl className="mx-auto mt-2 grid max-w-xs grid-cols-2 gap-x-3 gap-y-1 text-left">
        <dt>Fenster</dt>
        <dd>
          {info.innerW} × {info.innerH}
        </dd>
        <dt>Bildschirm</dt>
        <dd>
          {info.screenW} × {info.screenH}
        </dd>
        <dt>Sichtbare Höhe</dt>
        <dd>{info.visualH ?? '–'}</dd>
        <dt>Abstand oben / unten</dt>
        <dd>
          {info.safeTop} / {info.safeBottom}
        </dd>
        <dt>Tab-Leiste unten bei</dt>
        <dd>{info.barBottom ?? '–'}</dd>
        <dt>Installierte App</dt>
        <dd>{info.standalone ? 'ja' : 'nein'}</dd>
      </dl>
    </details>
  )
}
