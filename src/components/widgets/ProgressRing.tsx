import type { ReactNode } from 'react'

// Kreis-Fortschritt (0–100) mit Inhalt in der Mitte
export default function ProgressRing({
  pct,
  size = 96,
  stroke = 9,
  color = 'var(--color-accent-500)',
  glow = false,
  children,
}: {
  pct: number | null
  size?: number
  stroke?: number
  color?: string
  glow?: boolean
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = pct === null ? 0 : Math.max(0, Math.min(100, pct))
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden style={glow && p > 0 ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth={stroke} />
        {p > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(c * p) / 100} ${c}`} />
        )}
      </svg>
      <span className="relative flex flex-col items-center justify-center leading-none">{children}</span>
    </span>
  )
}
