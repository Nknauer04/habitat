import type { SVGProps } from 'react'
import type { Area } from '../lib/types'

// Eigene, schlichte Icons (24×24, Strich in currentColor) – keine zusätzliche Bibliothek.
type P = SVGProps<SVGSVGElement>

const base = (p: P): P => ({
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  ...p,
})

export const CalendarIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4.5" width="18" height="16" rx="3.5" />
    <path d="M3 9.5h18" />
    <path d="M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 17h.01M12 17h.01M16 17h.01" strokeWidth="2.4" />
  </svg>
)

export const TrendIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3.5 4v16h17" />
    <path d="M7 15l4-4.5 3 2.5 5-6" />
    <path d="M15.5 7h3.5v3.5" />
  </svg>
)

export const BarsIcon = (p: P) => (
  <svg {...base({ fill: 'currentColor', stroke: 'none', ...p })}>
    <rect x="3.5" y="12" width="4.6" height="8.5" rx="1.6" />
    <rect x="9.7" y="8" width="4.6" height="12.5" rx="1.6" />
    <rect x="15.9" y="3.5" width="4.6" height="17" rx="1.6" />
  </svg>
)

export const PersonIcon = (p: P) => (
  <svg {...base({ fill: 'currentColor', stroke: 'none', ...p })}>
    <circle cx="12" cy="7.6" r="4.1" />
    <path d="M4 20.2c0-4 3.5-6.3 8-6.3s8 2.3 8 6.3c0 .7-.5 1.1-1.1 1.1H5.1c-.6 0-1.1-.4-1.1-1.1z" />
  </svg>
)

// Zahnrad (Form nach Feather Icons, MIT-Lizenz)
export const GearIcon = (p: P) => (
  <svg {...base({ strokeWidth: 1.7, ...p })}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

export const PlusIcon = (p: P) => (
  <svg {...base({ strokeWidth: 2.2, ...p })}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const ChevronRightIcon = (p: P) => (
  <svg {...base({ strokeWidth: 2, ...p })}>
    <path d="M9 5l7 7-7 7" />
  </svg>
)

export const ChevronLeftIcon = (p: P) => (
  <svg {...base({ strokeWidth: 2, ...p })}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
)

export const InboxIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 13.5l2.2-7A2 2 0 0 1 8.1 5h7.8a2 2 0 0 1 1.9 1.5l2.2 7" />
    <path d="M4 13.5v4A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-4h-4.5a2 2 0 0 1-2 1.5h-3a2 2 0 0 1-2-1.5z" />
  </svg>
)

export const LinkIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </svg>
)

// Bereichs-Icons
const SportIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
  </svg>
)
const BookIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H20v14H5.5A1.5 1.5 0 0 0 4 19.5z" />
    <path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20" />
  </svg>
)
const MoonIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </svg>
)
const NoteIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 18V6l11-2v12" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="17" cy="16" r="3" />
  </svg>
)
const SparkIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3l2.2 6.3L21 12l-6.8 2.7L12 21l-2.2-6.3L3 12l6.8-2.7z" />
  </svg>
)

export const AreaIcon = ({ area, ...p }: { area: Area } & P) => {
  const Icon = { sport: SportIcon, lernen: BookIcon, schlaf: MoonIcon, musik: NoteIcon, sonstiges: SparkIcon }[area]
  return <Icon {...p} />
}

export const PenIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </svg>
)

export const MedalIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="14.5" r="5.5" />
    <path d="M8.6 10 6.5 3.5h4L12 7l1.5-3.5h4L15.4 10" />
    <path d="M12 12.2l.8 1.6 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.2z" strokeWidth="1.2" />
  </svg>
)

export const ChevronDownIcon = (p: P) => (
  <svg {...base({ strokeWidth: 2, ...p })}>
    <path d="M5 9l7 7 7-7" />
  </svg>
)
