import { getAreas } from '../../lib/areas'
import { areaTitle, levelFor, type Progress } from '../../lib/progress'
import ProgressRing from './ProgressRing'
import { StreakChip } from './glyphs'

// Hero-Widget in „Heute“: Tages-Ring, Level mit XP-Balken, beste laufende Streak, Bereichs-Level
export default function DayHero({ progress, done, total }: { progress: Progress; done: number; total: number }) {
  const lvl = levelFor(progress.totalXp)
  const pct = total > 0 ? (done / total) * 100 : null
  const areas = getAreas().filter((a) => (progress.areaXp[a.key] ?? 0) > 0)
  let best: { streak: number; unit: 'Tage' | 'Wochen'; freezes: number } | null = null
  for (const p of progress.byHabit.values()) if (p.streak > 0 && (!best || p.streak > best.streak)) best = p

  return (
    <section
      aria-label="Tagesübersicht"
      className="relative mt-5 overflow-hidden rounded-[2rem] border border-slate-800 p-5"
      style={{ background: 'radial-gradient(120% 140% at 0% 0%, rgb(31 220 240 / 0.14), transparent 55%), var(--color-slate-900)' }}
    >
      <div className="flex items-center gap-5">
        <ProgressRing pct={pct} size={104} stroke={10} glow color={done >= total && total > 0 ? 'var(--color-done)' : 'var(--color-accent-500)'}>
          <span className="text-3xl font-bold tabular-nums">{done}</span>
          <span className="mt-1 text-xs text-slate-400">von {total}</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold tracking-tight">Level {lvl.level}</span>
            <span className="text-xs tabular-nums text-slate-400">
              {lvl.into} / {lvl.needed} XP
            </span>
          </div>
          <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={lvl.into} aria-valuemax={lvl.needed} aria-label="Level-Fortschritt">
            <div className="h-full rounded-full bg-accent-500 shadow-[0_0_12px_rgb(31_220_240_/_0.7)] transition-all" style={{ width: `${Math.min(100, (lvl.into / lvl.needed) * 100)}%` }} />
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm text-slate-300">
            {best ? <StreakChip {...best} /> : <span className="text-slate-500">Noch keine Streak</span>}
          </div>
        </div>
      </div>
      {areas.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {areas.map((a) => {
            const l = levelFor(progress.areaXp[a.key]!).level
            const c = a.color
            return (
              <span
                key={a.key}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ color: c, background: `color-mix(in srgb, ${c} 14%, transparent)` }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
                {a.label} · {areaTitle(a.key, l)} · Lv {l}
              </span>
            )
          })}
        </div>
      )}
    </section>
  )
}
