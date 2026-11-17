import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { AREA_PALETTE, areaDef, builtinAreaId, DEFAULT_AREAS, isBuiltinArea } from '../lib/areas'
import { areaUsage, deleteArea, saveArea } from '../lib/areaStore'
import { db, now } from '../lib/db'
import type { Area } from '../lib/types'
import { IconGlyph } from './ItemIcon'
import EditShell, { editFooter, editLabel, primaryBtn } from './wizard/EditShell'
import { IconGrid } from './wizard/parts'

// Bereich anlegen oder bearbeiten (Name, Farbe, Symbol); eigene löschen, Standard-Bereiche zurücksetzen
export default function AreaEditor({ areaKey, onClose }: { areaKey?: Area; onClose: () => void }) {
  const cur = areaKey ? areaDef(areaKey) : null
  const [name, setName] = useState(cur?.label ?? '')
  const [color, setColor] = useState(cur?.color ?? AREA_PALETTE[4])
  const [glyph, setGlyph] = useState(cur?.glyph ?? 'star')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const usage = useLiveQuery(() => (areaKey ? areaUsage(areaKey) : Promise.resolve({ habits: 0, goals: 0, activities: 0 })), [areaKey])
  const builtin = !!areaKey && isBuiltinArea(areaKey)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Bitte einen Namen eingeben.')
    await saveArea({ name: name.trim(), color, glyph }, areaKey)
    onClose()
  }

  async function remove() {
    if (areaKey) await deleteArea(areaKey)
    onClose()
  }

  // Standard-Bereich zurücksetzen: die Überschreibung wird entfernt
  async function reset() {
    if (!areaKey) return
    const id = builtinAreaId(areaKey)
    if (id) await db.areas.update(id, { deleted: true, updatedAt: now() })
    onClose()
  }

  const total = (usage?.habits ?? 0) + (usage?.goals ?? 0) + (usage?.activities ?? 0)
  const original = areaKey && builtin ? DEFAULT_AREAS.find((d) => d.key === areaKey)! : null
  const changed = !!original && (original.label !== cur?.label || original.color !== cur?.color || original.glyph !== cur?.glyph)

  return (
    <EditShell title={areaKey ? 'Bereich bearbeiten' : 'Neuer Bereich'} onClose={onClose} onSubmit={submit}>
      <div className="flex items-center gap-4">
        <span aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl" style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 25%, transparent)` }}>
          <IconGlyph name={glyph} size={32} />
        </span>
        <input
          autoFocus={!areaKey}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name, z. B. Garten"
          aria-label="Name"
          className="min-w-0 flex-1 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3.5 text-lg outline-none focus:border-accent-500"
        />
      </div>

      <span className={editLabel}>Farbe</span>
      <div className="flex flex-wrap gap-3">
        {AREA_PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`Farbe ${c}`}
            aria-pressed={color === c}
            className="h-11 w-11 rounded-full border-2 transition-transform active:scale-90"
            style={{ background: c, borderColor: color === c ? '#fff' : 'transparent', boxShadow: color === c ? `0 0 14px ${c}` : undefined }}
          />
        ))}
      </div>

      <span className={editLabel}>Symbol</span>
      <IconGrid value={`i:${glyph}`} area={areaKey ?? ''} color={color} onChange={(i) => setGlyph(i.slice(2))} />

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {confirmDelete && (
        <p className="mt-4 text-sm text-red-300">
          „{cur?.label}“ wird gelöscht (auch auf deinem anderen Gerät).{' '}
          {total > 0
            ? `${[
                usage?.habits ? `${usage.habits} ${usage.habits === 1 ? 'Gewohnheit' : 'Gewohnheiten'}` : '',
                usage?.goals ? `${usage.goals} ${usage.goals === 1 ? 'Ziel' : 'Ziele'}` : '',
                usage?.activities ? `${usage.activities} ${usage.activities === 1 ? 'Einheit' : 'Einheiten'}` : '',
              ]
                .filter(Boolean)
                .join(', ')} wandern nach „Sonstiges“.`
            : 'Es hängen keine Einträge daran.'}
        </p>
      )}

      <div className={editFooter}>
        {areaKey && !builtin && !confirmDelete && (
          <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-full px-3 py-2.5 text-sm text-red-400 hover:bg-slate-800">
            Löschen
          </button>
        )}
        {builtin && changed && !confirmDelete && (
          <button type="button" onClick={reset} className="rounded-full px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-800">
            Standard wiederherstellen
          </button>
        )}
        {confirmDelete && (
          <>
            <button type="button" onClick={remove} className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white">
              Endgültig löschen
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
              Zurück
            </button>
          </>
        )}
        {!confirmDelete && (
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={onClose} className="rounded-full px-3 py-2.5 text-slate-300 hover:bg-slate-800">
              Abbrechen
            </button>
            <button className={primaryBtn}>Speichern</button>
          </div>
        )}
      </div>
    </EditShell>
  )
}
