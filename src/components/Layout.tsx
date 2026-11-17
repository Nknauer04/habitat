import type { ComponentType, SVGProps } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAreaRegistry } from '../lib/useAreaRegistry'
import { useAutoCelebrations } from '../lib/useAutoCelebrations'
import CelebrationHost from './CelebrationHost'
import { BarsIcon, CalendarIcon, PersonIcon, TrendIcon } from './icons'

type Item = { to: string; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; match: (path: string) => boolean }

const items: Item[] = [
  { to: '/', label: 'Heute', Icon: CalendarIcon, match: (p) => p === '/' },
  { to: '/ziele', label: 'Ziele', Icon: TrendIcon, match: (p) => p.startsWith('/ziele') },
  { to: '/verlauf', label: 'Statistik', Icon: BarsIcon, match: (p) => p.startsWith('/verlauf') || p.startsWith('/rueckblick') },
  { to: '/profil', label: 'Profil', Icon: PersonIcon, match: (p) => p.startsWith('/profil') || p.startsWith('/einstellungen') || p.startsWith('/bereiche') },
]

export default function Layout() {
  const { pathname } = useLocation()
  useAutoCelebrations()
  const areaVersion = useAreaRegistry() // Seiten laden neu, wenn sich Bereiche ändern (Name, Farbe, Symbol)

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Seitenleiste ab 1024 px */}
      <nav aria-label="Hauptnavigation" className="hidden w-64 shrink-0 flex-col gap-1 border-r border-slate-800 p-5 lg:flex">
        <div className="mb-5 px-3 text-xl font-bold tracking-tight text-accent-400">Be Happy</div>
        {items.map(({ to, label, Icon, match }) => {
          const active = match(pathname)
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-full px-4 py-3 text-[15px] font-medium transition-colors ${
                active ? 'bg-slate-800 text-accent-400' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Icon width={22} height={22} />
              {label}
            </NavLink>
          )
        })}
      </nav>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-[calc(5.5rem+var(--safe-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] lg:px-10 lg:pb-10 lg:pt-10">
        <div key={areaVersion} className="mx-auto max-w-2xl">
          <Outlet />
        </div>
      </main>

      <CelebrationHost />

      {/* Feste Tab-Leiste am unteren Rand unter 1024 px (reicht bis unter die Home-Anzeige des iPhones) */}
      <nav
        aria-label="Hauptnavigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 pb-[var(--safe-bottom)] backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto flex max-w-md items-center justify-around px-3 pb-1 pt-2">
          {items.map(({ to, label, Icon, match }) => {
            const active = match(pathname)
            return (
              <NavLink
                key={to}
                to={to}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={`flex h-12 w-[4.5rem] items-center justify-center rounded-full transition-colors ${
                  active ? 'bg-slate-800 text-accent-400' : 'text-slate-400 active:bg-slate-900'
                }`}
              >
                <Icon width={26} height={26} />
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
