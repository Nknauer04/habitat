import type { ReactNode } from 'react'
import { IconGlyph } from '../ItemIcon'

// Kartenüberschrift mit farbiger Icon-Kachel
export default function SectionTitle({ glyph, color = 'var(--color-accent-500)', title, right }: { glyph: string; color?: string; title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
        <IconGlyph name={glyph} size={20} />
      </span>
      <h2 className="min-w-0 flex-1 text-lg font-semibold">{title}</h2>
      {right}
    </div>
  )
}
