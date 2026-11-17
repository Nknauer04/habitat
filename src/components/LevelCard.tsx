import { AREAS } from '../lib/habits'
import { areaTitle, levelFor, type Progress } from '../lib/progress'

export default function LevelCard({ progress }: { progress: Progress }) {
  const total = levelFor(progress.totalXp)
  const areas = AREAS.filter((a) => (progress.areaXp[a.value] ?? 0) > 0)

  return (
    <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold tracking-tight">Level {total.level}</span>
        <span className="text-sm text-slate-400">
          {total.into} / {total.needed} XP
        </span>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-valuenow={total.into}
        aria-valuemax={total.needed}
      >
        <div
          className="h-full rounded-full bg-accent-500 transition-all"
          style={{ width: `${Math.min(100, (total.into / total.needed) * 100)}%` }}
        />
      </div>
      {areas.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {areas.map((a) => {
            const l = levelFor(progress.areaXp[a.value]!).level
            return (
              <span key={a.value} className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                {a.label} · {areaTitle(a.value, l)} · Lv {l}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
