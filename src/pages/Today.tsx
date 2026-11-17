import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import HabitDialog from '../components/HabitDialog'
import LevelCard from '../components/LevelCard'
import QuantitySheet from '../components/QuantitySheet'
import { useProgress } from '../lib/useProgress'
import { dayKey, db } from '../lib/db'
import {
  TIMES,
  areaLabel,
  checkInValue,
  fmtQty,
  isCheckInDone,
  isDue,
  isMini,
  toggleCheckIn,
  toggleMini,
  weekRange,
} from '../lib/habits'
import type { HabitProgress } from '../lib/progress'
import type { Habit } from '../lib/types'
import { computeDayScores } from '../lib/stats'
import { TIER_ICONS } from '../lib/badges'
import { useBadges, useNewBadges } from '../lib/useBadges'
import { useToday } from '../lib/useToday'

function streakText(p?: HabitProgress) {
  if (!p || p.streak === 0) return ''
  const unit = p.unit === 'Tage' ? 'T' : 'Wo.'
  return ` · 🔥 ${p.streak} ${unit}${p.freezes > 0 ? ` · ❄️ ${p.freezes}` : ''}`
}

export default function Today() {
  const today = useToday()
  const key = dayKey(today)
  const [weekStart, weekEnd] = weekRange(today)
  const [dialog, setDialog] = useState<{ habit?: Habit } | null>(null)
  const [sheetId, setSheetId] = useState<string | null>(null)
  const progress = useProgress(today)
  const { fresh: freshBadges, dismiss: dismissBadges } = useNewBadges(useBadges(today))

  const habits = useLiveQuery(
    () => db.habits.filter((h) => !h.deleted && !h.archived).sortBy('createdAt'),
    [],
  )
  const checks = useLiveQuery(
    () =>
      db.checkIns
        .where('date')
        .between(weekStart, weekEnd, true, true)
        .filter((c) => !c.deleted)
        .toArray(),
    [weekStart, weekEnd],
  )

  const rows = (habits ?? [])
    .map((h) => {
      const mine = (checks ?? []).filter((c) => c.habitId === h.id)
      const doneDays = mine.filter((c) => isCheckInDone(h, c))
      const doneToday = doneDays.some((c) => c.date === key)
      const weekCount = new Set(doneDays.map((c) => c.date)).size
      const current = mine.filter((c) => c.date === key).reduce((sum, c) => sum + checkInValue(h, c), 0)
      const miniToday = mine.some((c) => c.date === key && isMini(h, c))
      return { h, doneToday, miniToday, weekCount, current, due: isDue(h, today, doneToday, weekCount) }
    })
    .filter((r) => r.due)

  const done = rows.filter((r) => r.doneToday).length
  const todayScore = computeDayScores(habits ?? [], checks ?? [], today, today)[0]?.score ?? null
  const dateText = today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Heute</h1>
          <p className="mt-1 text-sm text-slate-400">
            {dateText}
            {rows.length > 0 && ` · ${done} von ${rows.length} erledigt`}
            {todayScore !== null && ` · Score ${todayScore} %`}
          </p>
        </div>
        <button
          onClick={() => setDialog({})}
          aria-label="Neue Gewohnheit"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-2xl leading-none text-slate-950"
        >
          +
        </button>
      </div>

      {freshBadges.length > 0 && (
        <div
          role="status"
          className="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3"
        >
          <span className="text-2xl">🏆</span>
          <div className="min-w-0 flex-1 text-sm">
            <div className="font-medium">
              {freshBadges.length === 1 ? 'Neues Abzeichen' : `${freshBadges.length} neue Abzeichen`}
            </div>
            <ul className="mt-0.5 text-slate-300">
              {freshBadges.slice(0, 3).map((b) => (
                <li key={b.id} className="truncate">
                  {TIER_ICONS[b.tier]} {b.label}
                </li>
              ))}
              {freshBadges.length > 3 && <li className="text-slate-400">+ {freshBadges.length - 3} weitere (siehe Verlauf)</li>}
            </ul>
          </div>
          <button
            onClick={dismissBadges}
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-amber-200 hover:bg-amber-500/20"
          >
            OK
          </button>
        </div>
      )}

      {progress && habits && habits.length > 0 && <LevelCard progress={progress} />}

      {habits && habits.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
          Noch keine Gewohnheiten.
          <br />
          Tippe auf <span className="text-emerald-400">+</span>, um die erste anzulegen.
        </div>
      )}

      {habits && habits.length > 0 && rows.length === 0 && (
        <p className="mt-8 text-center text-slate-400">Heute ist nichts fällig. 🎉</p>
      )}

      {TIMES.map((t) => {
        const section = rows.filter((r) => r.h.timeOfDay === t.value)
        if (!section.length) return null
        return (
          <section key={t.value} className="mt-6">
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{t.label}</h2>
            <ul className="flex flex-col gap-2">
              {section.map(({ h, doneToday, miniToday, weekCount, current }) => (
                <li
                  key={h.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    doneToday
                      ? miniToday
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-slate-800 bg-slate-900/40'
                  }`}
                >
                  <button
                    onClick={() => (h.dailyTarget ? setSheetId(h.id) : void toggleCheckIn(h.id, key))}
                    aria-label={
                      h.dailyTarget
                        ? `${h.name}: Menge eintragen`
                        : doneToday
                          ? `${h.name} zurücknehmen`
                          : `${h.name} abhaken`
                    }
                    aria-pressed={doneToday}
                    style={
                      h.dailyTarget && !doneToday
                        ? {
                            background: `conic-gradient(#10b981 ${Math.min(100, (current / h.dailyTarget) * 100)}%, #475569 0)`,
                          }
                        : undefined
                    }
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl ${
                      doneToday
                        ? miniToday
                          ? 'border-2 border-emerald-500/60 bg-emerald-500/30 text-emerald-200'
                          : 'border-2 border-emerald-500 bg-emerald-500 text-slate-950'
                        : h.dailyTarget
                          ? ''
                          : 'border-2 border-slate-600 text-transparent hover:border-emerald-500'
                    }`}
                  >
                    {h.dailyTarget && !doneToday ? (
                      <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#0b0f14] text-xs text-slate-300">
                        {Math.round((current / h.dailyTarget) * 100)}%
                      </span>
                    ) : (
                      '✓'
                    )}
                  </button>
                  <button
                    onClick={() => setDialog({ habit: h })}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="text-2xl">{h.icon}</span>
                    <span className="min-w-0">
                      <span className={`block truncate ${doneToday ? 'text-slate-400 line-through' : ''}`}>
                        {h.name}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {areaLabel(h.area)}
                        {h.dailyTarget && ` · ${fmtQty(current)}/${fmtQty(h.dailyTarget)} ${h.unit ?? ''}`}
                        {miniToday && ' · Mini'}
                        {h.frequency.type === 'perWeek' && ` · ${weekCount}/${h.frequency.count} diese Woche`}
                        {streakText(progress?.byHabit.get(h.id))}
                      </span>
                    </span>
                  </button>
                  {h.miniVersion && (!doneToday || miniToday) && (
                    <button
                      onClick={() => void toggleMini(h, key)}
                      title={h.miniVersion}
                      aria-label={`Mini-Version: ${h.miniVersion}`}
                      aria-pressed={miniToday}
                      className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs ${
                        miniToday
                          ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-200'
                          : 'border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      Mini{miniToday ? ' ✓' : ''}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {dialog && <HabitDialog habit={dialog.habit} onClose={() => setDialog(null)} />}
      {sheetId &&
        (() => {
          const r = rows.find((x) => x.h.id === sheetId)
          return r ? <QuantitySheet habit={r.h} date={key} current={r.current} onClose={() => setSheetId(null)} /> : null
        })()}
    </div>
  )
}
