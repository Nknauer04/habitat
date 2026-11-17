import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import GoalDialog from '../components/GoalDialog'
import PlanDialog from '../components/PlanDialog'
import PlanEntrySheet from '../components/PlanEntrySheet'
import { InboxIcon, LinkIcon, PlusIcon } from '../components/icons'
import { dayKey, db } from '../lib/db'
import { completeGoal, goalProgress, goalTrend, reopenGoal, toggleStep, type GoalTrend } from '../lib/goals'
import { areaLabel, fmtQty } from '../lib/habits'
import { planProgress } from '../lib/plans'
import { GOAL_DONE_XP } from '../lib/progress'
import type { Goal, Plan } from '../lib/types'
import { useToday } from '../lib/useToday'

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
  const [planDialog, setPlanDialog] = useState<{ plan?: Plan } | null>(null)
  const [entrySheet, setEntrySheet] = useState<{ plan: Plan; date: string } | null>(null)
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

  const plans = useLiveQuery(() => db.plans.filter((p) => !p.deleted).sortBy('createdAt'), [])
  const planEntries = useLiveQuery(() => db.planEntries.filter((e) => !e.deleted).toArray(), [])

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
        <section className="mt-6" aria-label="Pläne">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pläne</h2>
            <button
              onClick={() => setPlanDialog({})}
              className="rounded-full border border-slate-700 px-3.5 py-1.5 text-sm font-medium text-accent-400 active:bg-slate-800"
            >
              + Plan
            </button>
          </div>
          {plans && plans.length === 0 && (
            <p className="rounded-3xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">
              Pläne sind Wochenpläne mit Gesamtziel, z. B. „100 km laufen“ mit Soll je Wochentag. Du trägst nach jeder Einheit den Ist-Wert ein.
            </p>
          )}
          <ul className="flex flex-col gap-4">
            {(plans ?? []).map((pl) => {
              const mine = (planEntries ?? []).filter((e) => e.planId === pl.id)
              const pr = planProgress(pl, mine, todayKey)
              const recent = mine.filter((e) => e.date >= pl.startDate).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6)
              return (
                <li key={pl.id} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
                  <button onClick={() => setPlanDialog({ plan: pl })} className="block w-full text-left">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-3">
                      <div className="min-w-0 max-w-full">
                        <div className="text-[22px] font-bold leading-tight tracking-tight">
                          {pl.icon} {pl.name}
                        </div>
                        <div className="mt-1 text-base text-slate-400">
                          {pl.targetDate ? `Frist ${fmt(pl.targetDate)}` : areaLabel(pl.area)}
                          {` · ${fmtQty(pl.schedule.reduce((a, b) => a + b, 0))} ${pl.unit}/Woche geplant`}
                        </div>
                      </div>
                      <span className="glow-accent ml-auto shrink-0 rounded-full bg-accent-500 px-3.5 py-1.5 text-sm font-semibold text-black">
                        {Math.round(pr.ratio * 100)} %
                      </span>
                    </div>
                    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-700" role="progressbar" aria-valuenow={pr.total} aria-valuemax={pr.target}>
                      <div className="h-full rounded-full bg-accent-500" style={{ width: `${pr.ratio * 100}%` }} />
                    </div>
                  </button>
                  <div className="mt-3 flex items-center justify-between gap-3 text-[15px] text-slate-300">
                    <span>
                      {fmtQty(pr.total)} von {fmtQty(pr.target)} {pl.unit}
                    </span>
                    {pr.reached ? (
                      <span className="text-done">✓ Ziel erreicht</span>
                    ) : pr.onTrack === null ? (
                      <span className="text-slate-500">noch {fmtQty(pr.remaining)} {pl.unit}</span>
                    ) : pr.onTrack ? (
                      <span className="text-done">↗ Auf Kurs</span>
                    ) : (
                      <span className="text-amber-400">↘ Plan reicht nicht</span>
                    )}
                  </div>
                  {pr.daysLeft !== null && !pr.reached && (
                    <p className="mt-1 text-xs text-slate-500">
                      Noch {pr.daysLeft} {pr.daysLeft === 1 ? 'Tag' : 'Tage'} · nötig {pr.perWeekNeeded === null ? '–' : fmtQty(pr.perWeekNeeded)} {pl.unit}/Woche · laut Plan noch {fmtQty(pr.plannedLeft ?? 0)} {pl.unit}
                    </p>
                  )}
                  {recent.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {recent.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => setEntrySheet({ plan: pl, date: e.date })}
                          className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 active:bg-slate-800"
                        >
                          {new Date(`${e.date}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' })} · {fmtQty(e.value)} {pl.unit}
                        </button>
                      ))}
                    </div>
                  )}
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
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold">✓ {g.title}</div>
                <div className="mt-0.5 text-sm text-slate-400">
                  {areaLabel(g.area)}
                  {g.doneAt && ` · erledigt am ${fmt(g.doneAt)}`}
                </div>
              </div>
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
            const p = goalProgress(g, checks ?? [], todayKey, allHabits ?? [])
            const percent = Math.round(p.ratio * 100)
            const overdue = !!g.targetDate && g.targetDate < todayKey
            const trend = TREND[goalTrend(g, p.ratio, todayKey)]
            return (
              <li key={g.id} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
                <button onClick={() => setDialog({ goal: g })} className="block w-full text-left">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-3">
                    <div className="min-w-0 max-w-full">
                      <div className="text-[22px] font-bold leading-tight tracking-tight">{g.title}</div>
                      <div className="mt-1 text-base text-slate-400">
                        {g.targetDate ? (
                          <span className={overdue ? 'text-red-400' : ''}>
                            {overdue ? 'Überfällig seit ' : 'Frist '}
                            {fmt(g.targetDate)}
                          </span>
                        ) : (
                          areaLabel(g.area)
                        )}
                      </div>
                    </div>
                    <span className="glow-accent ml-auto shrink-0 rounded-full bg-accent-500 px-3.5 py-1.5 text-sm font-semibold text-black">
                      {percent} % abgeschlossen
                    </span>
                  </div>
                  {g.note && <p className="mt-3 text-sm text-slate-400">{g.note}</p>}
                  <div
                    className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-700"
                    role="progressbar"
                    aria-valuenow={p.value}
                    aria-valuemax={p.total}
                  >
                    <div className="h-full rounded-full bg-accent-500" style={{ width: `${p.ratio * 100}%` }} />
                  </div>
                </button>

                {g.kind === 'steps' && (
                  <ul className="mt-4 flex flex-col gap-1">
                    {g.steps.map((s) => (
                      <li key={s.id}>
                        <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-1 active:bg-slate-800">
                          <input
                            type="checkbox"
                            checked={s.done}
                            onChange={() => void toggleStep(g.id, s.id)}
                            className="h-5 w-5 accent-accent-500"
                          />
                          <span className={s.done ? 'text-slate-500 line-through' : ''}>{s.text}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 flex items-center justify-between gap-3 text-[15px] text-slate-300">
                  <span className="flex items-center gap-2">
                    {g.kind === 'count' ? (
                      <>
                        <LinkIcon width={20} height={20} />
                        {g.habitIds.length} {g.habitIds.length === 1 ? 'Gewohnheit' : 'Gewohnheiten'} · {p.value} / {p.total}
                      </>
                    ) : (
                      <>
                        ☑ {p.value} von {p.total} Schritten
                      </>
                    )}
                  </span>
                  <span className={trend.cls}>{trend.text}</span>
                </div>

                {p.ratio >= 1 && (
                  <button
                    onClick={() => void completeGoal(g.id)}
                    className="mt-4 w-full rounded-full bg-accent-500 px-4 py-3 font-semibold text-black"
                  >
                    Abschließen (+{GOAL_DONE_XP} XP)
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {planDialog && <PlanDialog plan={planDialog.plan} onClose={() => setPlanDialog(null)} />}
      {entrySheet && (
        <PlanEntrySheet
          plan={entrySheet.plan}
          date={entrySheet.date}
          current={(planEntries ?? []).find((e) => e.planId === entrySheet.plan.id && e.date === entrySheet.date)?.value ?? 0}
          onClose={() => setEntrySheet(null)}
        />
      )}
      {dialog && <GoalDialog goal={dialog.goal} onClose={() => setDialog(null)} />}
    </div>
  )
}
