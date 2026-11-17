import { NavLink, Outlet } from 'react-router-dom'

const items = [
  { to: '/', label: 'Heute', icon: '✓' },
  { to: '/ziele', label: 'Ziele', icon: '◎' },
  { to: '/verlauf', label: 'Verlauf', icon: '▦' },
  { to: '/einstellungen', label: 'Einstellungen', icon: '⚙' },
]

const link = (isActive: boolean) =>
  isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'

export default function Layout() {
  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Seitenleiste ab 1024 px */}
      <nav className="hidden w-60 shrink-0 flex-col gap-1 border-r border-slate-800 p-4 lg:flex">
        <div className="mb-4 px-3 text-lg font-semibold">Habitat</div>
        {items.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 ${link(isActive)} ${isActive ? 'bg-slate-800/60' : ''}`
            }
          >
            <span className="w-5 text-center">{i.icon}</span>
            {i.label}
          </NavLink>
        ))}
      </nav>

      <main className="min-h-0 flex-1 overflow-y-auto p-4 pt-[max(1rem,env(safe-area-inset-top))] lg:p-8">
        <div className="mx-auto max-w-2xl">
          <Outlet />
        </div>
      </main>

      {/* Tab-Bar unter 1024 px */}
      <nav className="flex shrink-0 border-t border-slate-800 bg-[#0b0f14] pb-[env(safe-area-inset-bottom)] lg:hidden">
        {items.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${link(isActive)}`
            }
          >
            <span className="text-lg leading-none">{i.icon}</span>
            {i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
