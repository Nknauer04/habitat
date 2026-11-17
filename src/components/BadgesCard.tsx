import { nextBadge, reachedBadges, TIER_ICONS } from '../lib/badges'
import { useBadges } from '../lib/useBadges'

// „Noch 3 Tage bis 🥉 7 Tage“, „Noch 2 Level bis 🥉 Level 5“, „Noch 1 Ziel bis 🥉 1 Ziel“
const unitLabel = (unit: string, n: number) => (unit === 'Ziele' && n === 1 ? 'Ziel' : unit === 'Tage' && n === 1 ? 'Tag' : unit === 'Wochen' && n === 1 ? 'Woche' : unit)
const targetLabel = (unit: string, t: number) =>
  unit === 'Level' ? `Level ${t}` : `${t} ${unitLabel(unit, t)}`

export default function BadgesCard({ today }: { today: Date }) {
  const groups = useBadges(today)
  if (!groups) return null

  const all = groups.flatMap((g) => g.badges)
  const reached = reachedBadges(groups).length
  // Gewohnheiten ohne Fortschritt blenden wir nicht aus: so sieht man, was noch kommt.

  return (
    <section className="mt-5 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-medium">Abzeichen</h2>
        <span className="text-sm text-slate-400">
          {reached} von {all.length} erreicht
        </span>
      </div>

      <ul className="mt-3 flex flex-col divide-y divide-slate-800">
        {groups.map((g) => {
          const next = nextBadge(g)
          return (
            <li key={g.key} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{g.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate">{g.title}</div>
                  <div className="text-xs text-slate-500">
                    {g.value} {g.unit}
                    {g.key.startsWith('streak') && ' (längste Streak)'}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1 text-2xl" role="list" aria-label={`Abzeichen ${g.title}`}>
                  {g.badges.map((b) => (
                    <span
                      key={b.id}
                      role="listitem"
                      title={`${b.label}${b.reached ? ' – erreicht' : ' – offen'}`}
                      aria-label={`${b.label}: ${b.reached ? 'erreicht' : 'offen'}`}
                      className={b.reached ? '' : 'opacity-25 grayscale'}
                    >
                      {TIER_ICONS[b.tier]}
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-1 pl-10 text-xs text-slate-500">
                {next
                  ? `Noch ${next.remaining} ${unitLabel(g.unit, next.remaining)} bis ${TIER_ICONS[next.badge.tier]} ${targetLabel(g.unit, next.badge.threshold)}`
                  : 'Alle Stufen erreicht 🎉'}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
