import { useMemo } from 'react'
import { dayKey } from '../lib/db'
import { WEEKDAYS } from '../lib/habits'
import { computeInsights, MIN_DAYS } from '../lib/insights'
import type { CheckIn, Habit } from '../lib/types'
import ItemIcon from './ItemIcon'
import SectionTitle from './widgets/SectionTitle'
import { EmojiGlyph } from './widgets/glyphs'

const rateColor = (r: number | null) =>
  r === null ? 'bg-slate-800' : r >= 80 ? 'bg-done' : r >= 50 ? 'bg-done/60' : r > 0 ? 'bg-amber-500/70' : 'bg-slate-600'

export default function InsightsCard({ habits, checkIns, today }: { habits: Habit[]; checkIns: CheckIn[]; today: Date }) {
  const todayKey = dayKey(today)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const insights = useMemo(() => computeInsights(habits, checkIns, today), [habits, checkIns, todayKey])

  if (insights.habits.length === 0) return null

  return (
    <section className="mt-3 rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <SectionTitle glyph="bulb" color="#fde047" title="Insights" />

      {!insights.enoughData ? (
        <p className="mt-2 text-sm text-slate-400">
          Noch zu wenig Daten: Insights erscheinen nach {MIN_DAYS / 7} Wochen (bisher {insights.daysOfData} Tage).
        </p>
      ) : (
        <>
          {insights.sentences.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {insights.sentences.map((s) => (
                <li key={s} className="flex gap-2">
                  <EmojiGlyph emoji="💡" size={28} />
                  <span className="text-slate-200">{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Keine Auffälligkeiten – deine Gewohnheiten laufen gleichmäßig.</p>
          )}

          <div className="mt-4 flex flex-col gap-4 border-t border-slate-800 pt-4">
            {insights.habits.map((i) => (
              <div key={i.habit.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <ItemIcon icon={i.habit.icon} area={i.habit.area} size={26} />
                    <span className="truncate">{i.habit.name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">Ø {i.overall ?? '–'} %</span>
                </div>
                <div className="mt-2 grid grid-cols-7 gap-1.5" role="list" aria-label={`Erfolgsquote je Wochentag: ${i.habit.name}`}>
                  {i.byWeekday.map((s, w) => (
                    <div
                      key={w}
                      role="listitem"
                      title={`${WEEKDAYS[w]}: ${s.rate === null ? 'zu wenig Daten' : `${s.rate} %`}`}
                      aria-label={`${WEEKDAYS[w]}: ${s.rate === null ? 'zu wenig Daten' : `${s.rate} Prozent`}`}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="flex h-12 w-full items-end rounded-sm bg-slate-900">
                        <div
                          className={`w-full rounded-sm ${rateColor(s.rate)}`}
                          style={{ height: s.rate === null ? '6%' : `${Math.max(s.rate, 6)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500">{WEEKDAYS[w]}</span>
                      <span className="text-[10px] text-slate-400">{s.rate === null ? '–' : `${s.rate}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">Basis: die letzten 12 abgeschlossenen Wochen (ohne heute).</p>
        </>
      )}
    </section>
  )
}
