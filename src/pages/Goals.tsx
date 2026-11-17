import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import GoalDialog from '../components/GoalDialog'
import ActivityDialog from '../components/ActivityDialog'
import ActivityWizard from '../components/wizard/ActivityWizard'
import GoalWizard from '../components/wizard/GoalWizard'
import ActivityEntrySheet from '../components/ActivityEntrySheet'
import { InboxIcon, LinkIcon, PlusIcon } from '../components/icons'
import { dayKey, db } from '../lib/db'
import { activityDays } from '../lib/activities'
import { completeGoal, deadlineInfo, goalProgress, goalTrend, milestoneStates, reopenGoal, toggleStep, type GoalTrend } from '../lib/goals'
import { WEEKDAYS, areaLabel, fmtQty } from '../lib/habits'
import { GOAL_DONE_XP } from '../lib/progress'
import type { Activity, Goal } from '../lib/types'
import { useToday } from '../lib/useToday'
import ItemIcon, { IconGlyph, areaColor } from '../components/ItemIcon'
import ProgressRing from '../components/widgets/ProgressRing'

const fmt = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })

const roundBtn =
  'relative flex h-12 w-12 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-white active:bg-slate-800'

const TREND: Record<GoalTrend, { text: string; cls: string }> = {
  ahead: { text: '↗ Auf Kurs', cls: 'text-done' },
  behind: { text: '↘ Im Rückstand', cls: 'text-amber-400' },
  none: { text: '– Kein Trend', cls: 'text-slate-500' },
}

const TIP_KEY = 'habitat:goalsTipDismissed'

export default function Goals() {
  const today = useToday()
  const todayKey = dayKey(today)
  const [dialog, setDialog] = useState<{ goal?: Goal } | null>(null)
  const [archive, setArchive] = useState(false)
  const [actDialog, setActDialog] = useState<{ activity?: Activity } | null>(null)
  const [entrySheet, setEntrySheet] = useState<{ activity: Activity; date: string } | null>(null)
  const [tipHidden, setTipHidden] = useState(() => {
    try {
      return localStorage.getItem(TIP_KEY) === '1'
    } catch {
      return false
    }
  })

  const goals = useLiveQuery(() => db.goals.filter((g) => !g.deleted).sortBy('createdAt'), [])
  const checks = useLiveQuery(() => db.checkIns.filter((c) => !c.deleted).toArray(), [])
  const allHabits = useLiveQuery(() => db.habits.filter((h) => !h.deleted).toArray(), [])

  const activities = useLiveQuery(() => db.plans.filter((a) => !a.deleted).sortBy('createdAt'), [])
  const actEntries = useLiveQuery(() => db.planEntries.filter((e) => !e.deleted).toArray(), [])

  const open = (goals ?? []).filter((g) => !g.done)
  const done = (goals ?? []).filter((g) => g.done)

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-4xl font-bold tracking-tight text-accent-400">{archive ? 'Erledigt' : 'Ziele'}</h1>
        <div className="flex gap-2.5">
          <button
            onClick={() => setArchive((a) => !a)}
            aria-label={archive ? 'Aktive Ziele anzeigen' : 'Erledigte Ziele anzeigen'}
            aria-pressed={archive}
            className={`${roundBtn} ${archive ? 'border-accent-500/60 text-accent-400' : ''}`}
          >
            <InboxIcon width={24} height={24} />
            {done.length > 0 && !archive && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-black">
                {done.length}
              </span>
            )}
          </button>
          <button onClick={() => setDialog({})} aria-label="Neues Ziel" className={roundBtn}>
            <PlusIcon width={24} height={24} />
          </button>
        </div>
      </div>

      {!archive && !tipHidden && (
        <div className="mt-5 flex items-start justify-between gap-3 rounded-3xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-white">Tipp:</span> Ein abgeschlossenes Ziel bringt {GOAL_DONE_XP} XP in seinen Bereich.
          </p>
          <button
            onClick={() => {
              try {
                localStorage.setItem(TIP_KEY, '1')
              } catch {
                /* Speicher nicht verfügbar */
              }
              setTipHidden(true)
            }}
            aria-label="Tipp schließen"
            className="shrink-0 text-xl leading-none text-slate-500 active:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {!archive && (
        <section className="mt-6" aria-label="Einheiten">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Einheiten</h2>
            <button
              onClick={() => setActDialog({})}
              className="rounded-full border border-slate-700 px-3.5 py-1.5 text-sm font-medium text-accent-400 active:bg-slate-800"
            >
              + Einheit
            </button>
          </div>
          {activities && activities.length === 0 && (
            <p className="rounded-3xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">
              Einheiten sind Dinge, die du tust und mit einem Wert einträgst, z. B. „Laufen“ in km. Das Soll legst du in einem Ziel „Menge aus Einheiten“ fest, z. B. 500 km bis März.
            </p>
          )}
          <ul className="flex flex-col gap-3">
            {(activities ?? []).map((a) => {
              const mine = (actEntries ?? []).filter((e) => e.planId === a.id)
              const total = mine.reduce((sum, e) => sum + e.value, 0)
              const recent = [...mine].sort((x, y) => (x.date < y.date ? 1 : -1)).slice(0, 6)
              const days = activityDays(a)
              const bars = Array.from({ length: 14 }, (_, i) => {
                const d = new Date(today)
                d.setDate(d.getDate() - 13 + i)
                const key = dayKey(d)
                return mine.filter((e) => e.date === key).reduce((sum, e) => sum + e.value, 0)
              })
              const maxBar = Math.max(...bars, 0.0001)
              return (
                <li key={a.id} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <button onClick={() => setActDialog({ activity: a })} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-3">
                        <ItemIcon icon={a.icon} area={a.area} size={40} />
                        <span className="truncate text-[19px] font-semibold">{a.name}</span>
                      </div>
                      <div className="mt-0.5 text-sm text-slate-400">
                        gesamt {fmtQty(total)} {a.unit}
                        {days.length > 0 && ` · ${days.map((d) => WEEKDAYS[d]).join(', ')}`}
                      </div>
                    </button>
                    <button
                      onClick={() => setEntrySheet({ activity: a, date: todayKey })}
                      className="shrink-0 rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-black"
                    >
                      + Heute
                    </button>
                  </div>
                  <div className="mt-4 flex h-12 items-end gap-1" role="img" aria-label="Einträge der letzten 14 Tage">
                    {bars.map((v, i) => (
                      <span
                        key={i}
                        className="flex-1 rounded-full"
                        style={{ height: `${Math.max(10, (v / maxBar) * 100)}%`, background: v > 0 ? areaColor(a.area) : 'rgb(255 255 255 / 0.1)' }}
                      />
                    ))}
                  </div>
                  {recent.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {recent.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => setEntrySheet({ activity: a, date: e.date })}
                          className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 active:bg-slate-800"
                        >
                          {new Date(`${e.date}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' })} · {fmtQty(e.value)} {a.unit}
                        </button>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setActDialog({ activity: a })} className="mt-3 text-xs text-slate-500 active:text-white">
                    Bearbeiten / Löschen
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {goals && goals.length === 0 && (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
          Noch keine Ziele.
          <br />
          Tippe auf <span className="text-accent-400">+</span>, um das erste anzulegen.
        </div>
      )}

      {archive ? (
        <ul className="mt-5 flex flex-col gap-3">
          {done.length === 0 && <li className="rounded-3xl border border-dashed border-slate-700 p-6 text-center text-slate-400">Noch keine erledigten Ziele.</li>}
          {done.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3 rounded-3xl border border-done/30 bg-slate-900 p-5">
              <button onClick={() => setDialog({ goal: g })} aria-label={`${g.title} bearbeiten oder löschen`} className="min-w-0 flex-1 text-left">
                <div className="truncate text-lg font-semibold">✓ {g.title}</div>
                <div className="mt-0.5 text-sm text-slate-400">
                  {areaLabel(g.area)}
                  {g.doneAt && ` · erledigt am ${fmt(g.doneAt)}`}
                </div>
                <div className="mt-1 text-xs text-slate-500">Bearbeiten / Löschen</div>
              </button>
              <button
                onClick={() => void reopenGoal(g.id)}
                className="shrink-0 rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 active:bg-slate-800"
              >
                Wieder öffnen
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-5 flex flex-col gap-4">
          {open.map((g) => {
            const p = goalProgress(g, checks ?? [], todayKey, allHabits ?? [], actEntries ?? [])
            const states = milestoneStates(g, p.value, todayKey)
            const unit = g.unit ? ` ${g.unit}` : ''
            const percent = Math.round(p.ratio * 100)
            const color = areaColor(g.area)
            const dl = g.targetDate ? deadlineInfo(g.targetDate, todayKey) : null
            const trend = TREND[goalTrend(g, p.ratio, todayKey)]
            return (
              <li key={g.id} className="rounded-[2rem] border border-slate-800 bg-slate-900 p-5" style={{ boxShadow: `inset 0 1px 0 color-mix(in srgb, ${color} 18%, transparent)` }}>
                <button onClick={() => setDialog({ goal: g })} className="flex w-full items-center gap-4 text-left" aria-label={`${g.title} bearbeiten`}>
                  <ProgressRing pct={percent} size={76} stroke={8} color={color} glow>
                    <span className="text-lg font-bold tabular-nums">{percent}%</span>
                  </ProgressRing>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[21px] font-bold leading-tight tracking-tight">{g.title}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-medium">
                      <span className="rounded-full px-2.5 py-1" style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
                        {areaLabel(g.area)}
                      </span>
                      {dl && (
                        <span className={`rounded-full px-2.5 py-1 ${dl.days < 0 ? 'bg-red-500/15 text-red-300' : 'bg-white/10 text-slate-300'}`}>
                          {dl.days < 0 ? `${-dl.days} ${-dl.days === 1 ? 'Tag' : 'Tage'} überfällig` : dl.days === 0 ? 'Heute fällig' : `noch ${dl.days} ${dl.days === 1 ? 'Tag' : 'Tage'}`}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
                {g.note && <p className="mt-3 text-sm text-slate-400">{g.note}</p>}

                {g.kind === 'amount' && (
                  <div className="mt-5">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-lg font-semibold tabular-nums">
                        {fmtQty(p.value)}
                        <span className="text-slate-400"> / {fmtQty(p.total)}{unit}</span>
                      </span>
                      <span className={trend.cls}>{trend.text}</span>
                    </div>
                    <div className="relative mt-3 h-2.5 rounded-full bg-white/10" role="progressbar" aria-valuenow={p.value} aria-valuemax={p.total}>
                      <div className="h-full rounded-full" style={{ width: `${p.ratio * 100}%`, background: color, boxShadow: `0 0 12px ${color}` }} />
                      {states.map(({ m, reached, overdue }) => (
                        <span
                          key={m.id}
                          title={`${fmtQty(m.value)}${unit} bis ${fmt(m.date)}`}
                          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-900"
                          style={{ left: `${Math.min(100, (m.value / p.total) * 100)}%`, background: reached ? 'var(--color-done)' : overdue ? '#fbbf24' : '#8e8e93' }}
                        />
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      Zählt:{' '}
                      {(g.activityIds ?? [])
                        .map((id) => (activities ?? []).find((a) => a.id === id))
                        .filter((a) => !!a)
                        .map((a) => a!.name)
                        .join(', ') || 'noch keine Einheit verknüpft'}
                    </p>
                    {states.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Etappenziele">
                        {states.map(({ m, reached, overdue }) => (
                          <li
                            key={m.id}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                              reached ? 'border-done/40 text-done' : overdue ? 'border-amber-400/50 text-amber-300' : 'border-slate-700 text-slate-300'
                            }`}
                          >
                            <IconGlyph name="flag" size={13} />
                            {fmtQty(m.value)}
                            {unit} bis {fmt(m.date)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {g.kind === 'count' && (
                  <div className="mt-5">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-lg font-semibold tabular-nums">
                        {p.value}
                        <span className="text-slate-400"> / {p.total} Haken</span>
                      </span>
                      <span className={trend.cls}>{trend.text}</span>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={p.value} aria-valuemax={p.total}>
                      <div className="h-full rounded-full" style={{ width: `${p.ratio * 100}%`, background: color, boxShadow: `0 0 12px ${color}` }} />
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                      <LinkIcon width={14} height={14} />
                      {g.habitIds.length} {g.habitIds.length === 1 ? 'Gewohnheit' : 'Gewohnheiten'}
                    </p>
                  </div>
                )}

                {g.kind === 'steps' && (
                  <div className="mt-4">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-lg font-semibold tabular-nums">
                        {p.value}
                        <span className="text-slate-400"> / {p.total} Schritte</span>
                      </span>
                      <span className={trend.cls}>{trend.text}</span>
                    </div>
                    <ul className="mt-3 flex flex-col gap-2">
                      {g.steps.map((s) => (
                        <li key={s.id}>
                          <label
                            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 active:bg-slate-800"
                            style={{ borderColor: s.done ? 'color-mix(in srgb, var(--color-done) 35%, transparent)' : 'var(--color-slate-800)' }}
                          >
                            <input type="checkbox" checked={s.done} onChange={() => void toggleStep(g.id, s.id)} className="h-5 w-5 accent-accent-500" />
                            <span className={s.done ? 'text-slate-500 line-through' : ''}>{s.text}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <button onClick={() => setDialog({ goal: g })} className="text-xs text-slate-500 active:text-white">
                    Bearbeiten / Löschen
                  </button>
                </div>

                {p.ratio >= 1 && (
                  <button onClick={() => void completeGoal(g.id)} className="mt-3 w-full rounded-full bg-accent-500 px-4 py-3.5 font-semibold text-black">
                    Abschließen (+{GOAL_DONE_XP} XP)
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {actDialog && (actDialog.activity ? <ActivityDialog activity={actDialog.activity} onClose={() => setActDialog(null)} /> : <ActivityWizard onClose={() => setActDialog(null)} />)}
      {entrySheet && (
        <ActivityEntrySheet
          activity={entrySheet.activity}
          date={entrySheet.date}
          current={(actEntries ?? []).find((e) => e.planId === entrySheet.activity.id && e.date === entrySheet.date)?.value ?? 0}
          onClose={() => setEntrySheet(null)}
        />
      )}
      {dialog && (dialog.goal ? <GoalDialog goal={dialog.goal} onClose={() => setDialog(null)} /> : <GoalWizard onClose={() => setDialog(null)} />)}
    </div>
  )
}
