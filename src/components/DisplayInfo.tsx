import { useEffect, useState } from 'react'

interface Info {
  innerW: number
  innerH: number
  screenW: number
  screenH: number
  visualH: number | null
  visualTop: number | null
  safeTop: number
  safeBottom: number
  standalone: boolean
  bodyH: number
  rootH: number
  barTop: number | null
  barBottom: number | null
  scrollY: number
  mainScroll: number | null
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
  const main = document.querySelector('main')
  return {
    innerW: window.innerWidth,
    innerH: window.innerHeight,
    screenW: window.screen.width,
    screenH: window.screen.height,
    visualH: window.visualViewport ? Math.round(window.visualViewport.height) : null,
    visualTop: window.visualViewport ? Math.round(window.visualViewport.offsetTop) : null,
    safeTop: measureSafe('top'),
    safeBottom: measureSafe('bottom'),
    standalone:
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    bodyH: Math.round(document.body.getBoundingClientRect().height),
    rootH: Math.round(document.getElementById('root')?.getBoundingClientRect().height ?? 0),
    barTop: r ? Math.round(r.top) : null,
    barBottom: r ? Math.round(r.bottom) : null,
    scrollY: Math.round(window.scrollY),
    mainScroll: main ? Math.round(main.scrollTop) : null,
  }
}

// Fehlersuche-Anzeige für das Layout auf dem Gerät (z. B. wenn die Tab-Leiste nicht ganz unten sitzt).
// Aktualisiert sich laufend, solange sie aufgeklappt ist, damit man den Zustand vor und nach dem Wischen sieht.
export default function DisplayInfo() {
  const [info, setInfo] = useState<Info | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const update = () => setInfo(read())
    update()
    window.addEventListener('resize', update)
    const id = open ? setInterval(update, 400) : undefined
    return () => {
      window.removeEventListener('resize', update)
      if (id) clearInterval(id)
    }
  }, [open])

  if (!info) return null
  const gap = info.barBottom === null ? null : info.screenH - info.barBottom
  const rows: [string, string][] = [
    ['Fenster', `${info.innerW} × ${info.innerH}`],
    ['Bildschirm', `${info.screenW} × ${info.screenH}`],
    ['Sichtbare Höhe', `${info.visualH ?? '–'} (Versatz ${info.visualTop ?? '–'})`],
    ['Hülle (Body / Root)', `${info.bodyH} / ${info.rootH}`],
    ['Abstand oben / unten', `${info.safeTop} / ${info.safeBottom}`],
    ['Tab-Leiste oben / unten', `${info.barTop ?? '–'} / ${info.barBottom ?? '–'}`],
    ['Leiste bis Bildschirmrand', gap === null ? '–' : String(gap)],
    ['Scroll Seite / Inhalt', `${info.scrollY} / ${info.mainScroll ?? '–'}`],
    ['Installierte App', info.standalone ? 'ja' : 'nein'],
  ]
  return (
    <details className="mt-4 text-xs text-slate-500" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer text-center">Anzeige-Details (für die Fehlersuche)</summary>
      <dl className="mx-auto mt-2 grid max-w-sm grid-cols-2 gap-x-3 gap-y-1 text-left">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt>{k}</dt>
            <dd className="tabular-nums text-slate-300">{v}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
