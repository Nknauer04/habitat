import type { ComponentType, SVGProps } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BarsIcon, CalendarIcon, PersonIcon, TrendIcon } from './icons'

type Item = { to: string; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; match: (path: string) => boolean }

const items: Item[] = [
  { to: '/', label: 'Heute', Icon: CalendarIcon, match: (p) => p === '/' },
  { to: '/ziele', label: 'Ziele', Icon: TrendIcon, match: (p) => p.startsWith('/ziele') },
  { to: '/verlauf', label: 'Verlauf', Icon: BarsIcon, match: (p) => p.startsWith('/verlauf') || p.startsWith('/rueckblick') },
  { to: '/profil', label: 'Profil', Icon: PersonIcon, match: (p) => p.startsWith('/profil') || p.startsWith('/einstellungen') },
]

export default function Layout() {
  const { pathname } = useLocation()

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Seitenleiste ab 1024 px */}
      <nav aria-label="Hauptnavigation" className="hidden w-64 shrink-0 flex-col gap-1 border-r border-slate-800 p-5 lg:flex">
        <div className="mb-5 px-3 text-xl font-bold tracking-tight text-accent-400">Habitat</div>
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

      <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] lg:px-10 lg:pb-10 lg:pt-10">
        <div className="mx-auto max-w-2xl">
          <Outlet />
        </div>
      </main>

      {/* Feste Tab-Leiste am unteren Rand unter 1024 px (reicht bis unter die Home-Anzeige des iPhones) */}
      <nav
        aria-label="Hauptnavigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
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
