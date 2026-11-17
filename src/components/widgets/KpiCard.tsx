import { IconGlyph } from '../ItemIcon'
import ProgressRing from './ProgressRing'

// Kennzahl-Widget: Icon, Beschriftung, große Zahl, optional Ring (0–100)
export default function KpiCard({ glyph, color, label, value, sub, ring }: { glyph: string; color: string; label: string; value: string; sub?: string; ring?: number | null }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-2 text-slate-300">
        <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
          <IconGlyph name={glyph} size={16} />
        </span>
        <span className="text-[15px] font-medium">{label}</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <div className="text-3xl font-semibold tabular-nums">{value}</div>
          {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
        </div>
        {ring !== undefined && <ProgressRing pct={ring} size={46} stroke={5} color={color} />}
      </div>
    </div>
  )
}
