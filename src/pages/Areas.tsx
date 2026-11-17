import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import AreaEditor from '../components/AreaEditor'
import { ChevronLeftIcon, PlusIcon } from '../components/icons'
import { IconGlyph } from '../components/ItemIcon'
import { getAreas } from '../lib/areas'
import { setAreaHidden } from '../lib/areaStore'
import { db } from '../lib/db'

const roundBtn = 'flex h-12 w-12 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-white active:bg-slate-800'

// Bereiche verwalten: Standard-Bereiche anpassen oder ausblenden, eigene anlegen
export default function Areas() {
  const [editing, setEditing] = useState<{ key?: string } | null>(null)
  const habits = useLiveQuery(() => db.habits.filter((h) => !h.deleted).toArray(), [])
  const goals = useLiveQuery(() => db.goals.filter((g) => !g.deleted).toArray(), [])
  const acts = useLiveQuery(() => db.plans.filter((a) => !a.deleted).toArray(), [])
  const count = (key: string) => (habits ?? []).filter((h) => h.area === key).length + (goals ?? []).filter((g) => g.area === key).length + (acts ?? []).filter((a) => a.area === key).length

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <Link to="/profil" aria-label="Zurück zum Profil" className={roundBtn}>
          <ChevronLeftIcon width={24} height={24} />
        </Link>
        <button onClick={() => setEditing({})} aria-label="Neuer Bereich" className={roundBtn}>
          <PlusIcon width={24} height={24} />
        </button>
      </div>
      <h1 className="mt-5 text-4xl font-bold tracking-tight text-accent-400">Bereiche</h1>
      <p className="mt-2 text-sm text-slate-400">Farbe, Name und Symbol deiner Bereiche. Ausgeblendete Bereiche stehen nicht mehr zur Auswahl; bestehende Einträge behalten sie.</p>

      <ul className="mt-6 flex flex-col gap-3">
        {getAreas(true).map((a) => (
          <li key={a.key} className={`flex items-center gap-3 rounded-3xl border border-slate-800 bg-slate-900 p-4 ${a.hidden ? 'opacity-60' : ''}`}>
            <button onClick={() => setEditing({ key: a.key })} aria-label={`${a.label} bearbeiten`} className="flex min-w-0 flex-1 items-center gap-4 text-left">
              <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ color: a.color, background: `color-mix(in srgb, ${a.color} 16%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${a.color} 22%, transparent)` }}>
                <IconGlyph name={a.glyph} size={28} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[19px] font-semibold">{a.label}</span>
                <span className="mt-0.5 block text-sm text-slate-400">
                  {a.builtin ? 'Standard' : 'Eigener Bereich'} · {count(a.key)} {count(a.key) === 1 ? 'Eintrag' : 'Einträge'}
                </span>
              </span>
            </button>
            <button
              onClick={() => void setAreaHidden(a.key, !a.hidden)}
              role="switch"
              aria-checked={!a.hidden}
              aria-label={`${a.label} ${a.hidden ? 'einblenden' : 'ausblenden'}`}
              className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors ${a.hidden ? 'border-slate-700 bg-slate-800' : 'border-accent-500 bg-accent-500/30'}`}
            >
              <span className={`absolute top-0.5 h-6 w-6 rounded-full transition-all ${a.hidden ? 'left-0.5 bg-slate-500' : 'left-[1.625rem] bg-accent-400'}`} />
            </button>
          </li>
        ))}
      </ul>

      {editing && <AreaEditor areaKey={editing.key} onClose={() => setEditing(null)} />}
    </div>
  )
}
