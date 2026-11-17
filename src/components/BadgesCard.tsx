import { nextBadge, reachedBadges } from '../lib/badges'
import { useBadges } from '../lib/useBadges'
import ItemIcon from './ItemIcon'
import { TierMedal } from './widgets/glyphs'
import SectionTitle from './widgets/SectionTitle'

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
    <section className="mt-3 rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <SectionTitle glyph="medal" color="#facc15" title="Abzeichen" right={<span className="text-sm text-slate-400">{reached} von {all.length} erreicht</span>} />

      <ul className="mt-3 flex flex-col divide-y divide-slate-800">
        {groups.map((g) => {
          const next = nextBadge(g)
          return (
            <li key={g.key} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <ItemIcon icon={g.icon} size={40} />
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
                      <TierMedal tier={b.tier} size={26} />
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-1 pl-10 text-xs text-slate-500">
                {next
                  ? `Noch ${next.remaining} ${unitLabel(g.unit, next.remaining)} bis ${targetLabel(g.unit, next.badge.threshold)}`
                  : 'Alle Stufen erreicht'}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
