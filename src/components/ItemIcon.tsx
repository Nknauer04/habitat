import type { ReactNode } from 'react'
import type { Area } from '../lib/types'

// Symbol-Bibliothek: schlichte Linien-Icons (24×24, Strich in currentColor), gespeichert als `i:<key>` im Feld `icon`.
// Alte Einträge mit Emoji bleiben gültig und werden als Emoji in derselben Kachel gezeigt.
const circle = (cx: number, cy: number, r: number) => <circle key={`${cx}${cy}${r}`} cx={cx} cy={cy} r={r} />
const p = (d: string) => <path key={d} d={d} />

export const ICON_SHAPES: Record<string, { label: string; shape: ReactNode }> = {
  run: { label: 'Laufen', shape: <>{circle(14.5, 4.5, 1.8)}{p('M13 8.5l-2.2 5 3.7 2.500 1 5')}{p('M10.800 13.500l-3 2.500-2.800 .5')}{p('M8.500 10.500l4.500-2 3 2.500 3 .5')}</> },
  walk: { label: 'Gehen', shape: <>{circle(12, 4.5, 1.8)}{p('M12 8v6l-2 7')}{p('M12 14l3 3 1 4')}{p('M8 11l4-2 4 2')}</> },
  dumbbell: { label: 'Kraft', shape: <>{p('M6.500 6.500v11M17.500 6.500v11M3.500 9v6M20.500 9v6M6.500 12h11')}</> },
  bike: { label: 'Rad', shape: <>{circle(6, 16, 3.500)}{circle(18, 16, 3.500)}{p('M6 16l4-8h5l3 8')}{p('M10 8l3 8')}{p('M13.500 5H16')}</> },
  swim: { label: 'Schwimmen', shape: <>{p('M2 8c2-2 3-2 5 0s3 2 5 0 3-2 5 0 3 2 5 0')}{p('M2 14c2-2 3-2 5 0s3 2 5 0 3-2 5 0 3 2 5 0')}{p('M2 20c2-2 3-2 5 0s3 2 5 0 3-2 5 0 3 2 5 0')}</> },
  heart: { label: 'Gesundheit', shape: p('M12 20s-7-4.500-7-10a4 4 0 0 1 7-2.500A4 4 0 0 1 19 10c0 5.500-7 10-7 10z') },
  mountain: { label: 'Wandern', shape: p('M2 20l7-12 4 7 3-4 6 9z') },
  fire: { label: 'Feuer', shape: p('M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z') },
  bolt: { label: 'Energie', shape: p('M13 2L4 14h7l-1 8 9-12h-7z') },
  book: { label: 'Lesen', shape: <>{p('M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z')}{p('M5 18a2 2 0 0 1 2-2h12')}</> },
  cap: { label: 'Lernen', shape: <>{p('M2 9l10-5 10 5-10 5z')}{p('M6 11.500V16c0 1.500 3 3 6 3s6-1.500 6-3v-4.500')}</> },
  pencil: { label: 'Schreiben', shape: <>{p('M4 20l1-4L16 5l3 3L8 19z')}{p('M14 7l3 3')}</> },
  bulb: { label: 'Idee', shape: <>{p('M9 18h6M10 21h4')}{p('M12 3a6 6 0 0 0-4 10.500V15h8v-1.500A6 6 0 0 0 12 3z')}</> },
  code: { label: 'Code', shape: <>{p('M8 7l-5 5 5 5')}{p('M16 7l5 5-5 5')}{p('M14 4l-4 16')}</> },
  music: { label: 'Musik', shape: <>{p('M9 18V6l10-2v12')}{circle(6.500, 18, 2.500)}{circle(16.500, 16, 2.500)}</> },
  headphones: { label: 'Hören', shape: <>{p('M4 14v-2a8 8 0 0 1 16 0v2')}{p('M4 14h3v6H5a1 1 0 0 1-1-1z')}{p('M20 14h-3v6h2a1 1 0 0 0 1-1z')}</> },
  piano: { label: 'Klavier', shape: <><rect x="3" y="5" width="18" height="14" rx="2" />{p('M8 19v-5M12 19v-5M16 19v-5')}{p('M9.500 5v5M14.500 5v5')}</> },
  camera: { label: 'Foto', shape: <>{p('M4 8h3l2-3h6l2 3h3v11H4z')}{circle(12, 13, 3.500)}</> },
  moon: { label: 'Schlaf', shape: p('M20 14.500A8 8 0 1 1 9.500 4a6.500 6.500 0 0 0 10.500 10.500z') },
  bed: { label: 'Bett', shape: <>{p('M3 19V8')}{p('M3 14h18v5')}{p('M21 14v-2a3 3 0 0 0-3-3h-7v5')}</> },
  sun: { label: 'Morgen', shape: <>{circle(12, 12, 4)}{p('M12 2v2M12 20v2M2 12h2M20 12h2M4.900 4.900l1.400 1.400M17.700 17.700l1.400 1.400M4.900 19.100l1.400-1.400M17.700 6.300l1.400-1.400')}</> },
  drop: { label: 'Wasser', shape: p('M12 3s6 6.500 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11z') },
  apple: { label: 'Ernährung', shape: <>{p('M12 7c-3-2-7 0-7 5 0 4 3 8 5 8 1 0 1.500-.5 2-.5s1 .5 2 .5c2 0 5-4 5-8 0-5-4-7-7-5z')}{p('M12 7c0-2 1-3 3-3')}</> },
  leaf: { label: 'Natur', shape: <>{p('M5 19C5 10 10 5 20 4c0 10-4 15-13 15z')}{p('M5 19l8-8')}</> },
  coffee: { label: 'Kaffee', shape: <>{p('M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z')}{p('M16 10h2a2 2 0 0 1 0 4h-2')}{p('M8 3v2M12 3v2')}</> },
  target: { label: 'Ziel', shape: <>{circle(12, 12, 9)}{circle(12, 12, 5)}{circle(12, 12, 1)}</> },
  flag: { label: 'Etappe', shape: <>{p('M5 21V4')}{p('M5 4h11l-2 4 2 4H5')}</> },
  trophy: { label: 'Erfolg', shape: <>{p('M8 4h8v5a4 4 0 0 1-8 0z')}{p('M8 6H4v2a3 3 0 0 0 4 2.800')}{p('M16 6h4v2a3 3 0 0 1-4 2.800')}{p('M12 13v4M8 20h8M10 17h4')}</> },
  star: { label: 'Stern', shape: p('M12 3l2.700 5.500 6 .9-4.400 4.200 1 6-5.300-2.800L6.700 19.600l1-6L3.300 9.400l6-.9z') },
  clock: { label: 'Zeit', shape: <>{circle(12, 12, 9)}{p('M12 7v5l3 2')}</> },
  calendar: { label: 'Kalender', shape: <><rect x="3" y="5" width="18" height="16" rx="2.500" />{p('M3 10h18M8 3v4M16 3v4')}</> },
  list: { label: 'Liste', shape: <>{p('M9 6h11M9 12h11M9 18h11')}{p('M4 6h.01M4 12h.01M4 18h.01')}</> },
  check: { label: 'Haken', shape: p('M5 12.500l4.500 4.500L19 7.500') },
  medal: { label: 'Medaille', shape: <>{circle(12, 14, 5.500)}{p('M8.500 3l3.500 6 3.500-6')}{p('M10 14l1.500 1.500L14.500 12.500')}</> },
  snow: { label: 'Freeze', shape: <>{p('M12 2v20M3.500 7l17 10M3.500 17l17-10')}{p('M9.500 3.500L12 6l2.500-2.500M9.500 20.500L12 18l2.500 2.500')}</> },
  trend: { label: 'Trend', shape: <>{p('M3.500 4v16h17')}{p('M7 15l4-4.500 3 2.500 5-6')}</> },
  sort: { label: 'Sortieren', shape: <>{p('M8 4v16M4.500 7.500L8 4l3.500 3.500')}{p('M16 20V4M12.500 16.500L16 20l3.500-3.500')}</> },
  sparkle: { label: 'Funken', shape: p('M12 3l2.200 6.300L21 12l-6.800 2.700L12 21l-2.200-6.300L3 12l6.800-2.700z') },
}

// Nur im Symbol-Picker anbieten, was als Gewohnheits-Symbol taugt (Medaille, Freeze, Trend sind reine Oberflächen-Symbole)
export const ICON_KEYS = Object.keys(ICON_SHAPES).filter((k) => !['medal', 'snow', 'trend', 'sort'].includes(k))

export const iconKey = (icon: string) => (icon.startsWith('i:') && ICON_SHAPES[icon.slice(2)] ? icon.slice(2) : null)

// Für reine Textstellen (z. B. <option>): Emoji wie gehabt, Linien-Icons haben dort keinen Text.
export const iconText = (icon: string) => (icon.startsWith('i:') ? '' : icon)

// Bereichsfarben (Tokens in index.css)
export const areaColor = (area?: Area) => (area ? `var(--color-area-${area})` : 'var(--color-accent-500)')

export function IconGlyph({ name, size = 24, strokeWidth = 1.8 }: { name: string; size?: number; strokeWidth?: number }) {
  const shape = ICON_SHAPES[name]?.shape
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {shape}
    </svg>
  )
}

// Runde Kachel mit Symbol in der Farbe des Bereichs (Linien-Icon oder altes Emoji).
export default function ItemIcon({ icon, area, size = 44, className = '' }: { icon: string; area?: Area; size?: number; className?: string }) {
  const color = areaColor(area)
  const key = iconKey(icon)
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.34,
        color,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 22%, transparent)`,
      }}
    >
      {key ? <IconGlyph name={key} size={Math.round(size * 0.52)} /> : <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>{icon}</span>}
    </span>
  )
}
