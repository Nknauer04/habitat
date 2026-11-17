import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { moveId } from '../../lib/order'

interface Drag {
  id: string
  startY: number
  dy: number
  mids: { id: string; mid: number }[]
}

const Chevron = ({ up }: { up: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={up ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
  </svg>
)

// Liste mit Sortier-Modus: Ziehgriff (Finger/Maus) und Pfeile hoch/runter. Ohne `active` eine normale Liste.
export default function SortableList<T extends { id: string }>({
  items,
  active,
  onReorder,
  className,
  renderItem,
}: {
  items: T[]
  active: boolean
  onReorder: (ids: string[]) => void
  className?: string
  renderItem: (item: T, controls: ReactNode) => ReactNode
}) {
  const els = useRef(new Map<string, HTMLLIElement>())
  const [drag, setDrag] = useState<Drag | null>(null)
  const ids = items.map((i) => i.id)

  // Zielposition unter den übrigen Einträgen: so viele Mittelpunkte liegen über dem gezogenen Eintrag
  const targetOf = (d: Drag) => {
    const mid = d.mids.find((m) => m.id === d.id)!.mid + d.dy
    const others = d.mids.filter((m) => m.id !== d.id)
    return { others, target: others.filter((m) => m.mid < mid).length }
  }

  function start(id: string, e: PointerEvent<HTMLButtonElement>) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId) // Maus/Finger bleiben am Griff, auch außerhalb
    } catch {
      /* kein aktiver Zeiger (z. B. in Tests) */
    }
    const mids = ids.map((x) => {
      const r = els.current.get(x)!.getBoundingClientRect()
      return { id: x, mid: r.top + r.height / 2 }
    })
    setDrag({ id, startY: e.clientY, dy: 0, mids })
  }
  const move = (e: PointerEvent<HTMLButtonElement>) => drag && setDrag({ ...drag, dy: e.clientY - drag.startY })
  function end() {
    if (!drag) return
    const { others, target } = targetOf(drag)
    const next = others.map((o) => o.id)
    next.splice(target, 0, drag.id)
    setDrag(null)
    if (next.some((x, i) => x !== ids[i])) onReorder(next)
  }

  const drop = drag ? targetOf(drag) : null

  return (
    <ul className={className}>
      {items.map((item, i) => {
        const dragging = drag?.id === item.id
        const marker =
          drop && !dragging
            ? drop.others[drop.target]?.id === item.id
              ? 'top'
              : drop.target === drop.others.length && drop.others[drop.others.length - 1]?.id === item.id
                ? 'bottom'
                : null
            : null
        const controls = active ? (
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => onReorder(moveId(ids, i, i - 1))} disabled={i === 0} aria-label="Nach oben" className="flex h-10 w-9 items-center justify-center rounded-xl text-slate-300 active:bg-slate-800 disabled:opacity-25">
              <Chevron up />
            </button>
            <button type="button" onClick={() => onReorder(moveId(ids, i, i + 1))} disabled={i === items.length - 1} aria-label="Nach unten" className="flex h-10 w-9 items-center justify-center rounded-xl text-slate-300 active:bg-slate-800 disabled:opacity-25">
              <Chevron up={false} />
            </button>
            <button
              type="button"
              aria-label="Ziehen zum Sortieren"
              onPointerDown={(e) => start(item.id, e)}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={() => setDrag(null)}
              className="flex h-10 w-10 cursor-grab touch-none items-center justify-center rounded-xl text-slate-400 active:cursor-grabbing active:bg-slate-800"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                {[7, 12, 17].flatMap((y) => [9, 15].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.6" />))}
              </svg>
            </button>
          </div>
        ) : null
        return (
          <li
            key={item.id}
            ref={(el) => {
              if (el) els.current.set(item.id, el)
              else els.current.delete(item.id)
            }}
            className="relative"
            style={dragging ? { transform: `translateY(${drag!.dy}px) scale(1.02)`, zIndex: 30, filter: 'drop-shadow(0 8px 18px rgb(0 0 0 / 0.6))', pointerEvents: 'none' } : undefined}
          >
            {marker && <span aria-hidden className={`absolute inset-x-3 z-20 h-1 rounded-full bg-accent-500 shadow-[0_0_10px_rgb(31_220_240_/_0.8)] ${marker === 'top' ? '-top-2' : '-bottom-2'}`} />}
            {renderItem(item, controls)}
          </li>
        )
      })}
    </ul>
  )
}
