// Bogen-Anzeige (Halbkreis) mit großer Zahl, Beschriftung und Leuchten
export default function ArcGauge({
  value,
  max = 100,
  display,
  label,
}: {
  value: number | null // null = keine Daten
  max?: number
  display: string // große Zahl, z. B. "85 %"
  label: string // kleine Beschriftung unter der Zahl
}) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, (value / max) * 100))
  const arc = 'M 22 172 A 148 148 0 0 1 318 172'
  return (
    <div className="relative mx-auto w-full max-w-sm" role="img" aria-label={`${label}: ${display}`}>
      <svg viewBox="0 0 340 190" className="w-full overflow-visible" aria-hidden>
        <defs>
          <filter id="gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={arc} fill="none" stroke="rgb(255 255 255 / 0.09)" strokeWidth="14" strokeLinecap="round" pathLength={100} />
        {pct > 0 && (
          <path
            d={arc}
            fill="none"
            stroke="var(--color-accent-400)"
            strokeWidth="14"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${pct} 100`}
            filter="url(#gauge-glow)"
          />
        )}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <div className="text-6xl font-bold tabular-nums tracking-tight">{display}</div>
        <div className="mt-1 font-mono text-sm uppercase tracking-[0.25em] text-slate-300">{label}</div>
      </div>
    </div>
  )
}
