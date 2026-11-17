import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import CoachCard from '../components/CoachCard'
import HabitDialog from '../components/HabitDialog'
import HabitWizard from '../components/wizard/HabitWizard'
import { PlusIcon } from '../components/icons'
import DayHero from '../components/widgets/DayHero'
import ActivityEntrySheet from '../components/ActivityEntrySheet'
import SortableList from '../components/widgets/SortableList'
import QuantitySheet from '../components/QuantitySheet'
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
  weekdayIndex,
} from '../lib/habits'
import { isActivityDay } from '../lib/activities'
import { byOrder, mergeVisibleOrder, orderChanges, saveOrder } from '../lib/order'
import { isoWeek, isReviewDay, reviewId, reviewWeekFor } from '../lib/review'
import { computeDayScores } from '../lib/stats'
import type { Habit } from '../lib/types'
import { dismissCoachFor, useCoachDismissedDay, useCoachEnabled } from '../lib/coachPrefs'
import { celebrate, hasSeen, markSeen } from '../lib/celebrate'
import { useBadges, useNewBadges } from '../lib/useBadges'
import { useCoachTips } from '../lib/useCoach'
import { useProgress } from '../lib/useProgress'
import { useToday } from '../lib/useToday'
import ItemIcon, { IconGlyph, areaColor } from '../components/ItemIcon'
import { EmojiGlyph, StreakChip, TierMedal } from '../components/widgets/glyphs'

const LETTERS = ['M', 'D', 'M', 'D', 'F', 'S', 'S']

const parseKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Kleiner Fortschrittsring (0–100) um die Tageszahl
function Ring({ pct, size = 36, stroke = 3.5, children }: { pct: number | null; size?: number; stroke?: number; children: React.ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = pct === null ? 0 : Math.max(0, Math.min(100, pct))
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-slate-700)" strokeWidth={stroke} />
        {p > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-done)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(c * p) / 100} ${c}`}
          />
        )}
      </svg>
      <span className="relative text-[15px] font-medium">{children}</span>
    </span>
  )
}

const CheckSvg = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)

export default function Today() {
  const today = useToday()
  const todayKey = dayKey(today)
  const [weekStart, weekEnd] = weekRange(today)
  const [picked, setPicked] = useState<string | null>(null) // null = heute
  const viewKey = picked && picked !== todayKey ? picked : todayKey
  const viewDate = parseKey(viewKey)
  const isToday = viewKey === todayKey
  const isFuture = viewKey > todayKey

  const [dialog, setDialog] = useState<{ habit?: Habit } | null>(null)
  const [sheetId, setSheetId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState(false)
  const [actSheetId, setActSheetId] = useState<string | null>(null)
  const progress = useProgress(today)
  const coachOn = useCoachEnabled()
  const coachDismissed = useCoachDismissedDay()
  const coachTips = useCoachTips()
  const { fresh: freshBadges, dismiss: dismissBadges } = useNewBadges(useBadges(today))
  const reviewWeek = reviewWeekFor(today)
  const reviewNote = useLiveQuery(async () => (await db.reviews.get(reviewId(reviewWeek)))?.note ?? '', [reviewWeek])
  const [hintDismissed, setHintDismissed] = useState(() => {
    try {
      return localStorage.getItem('habitat:reviewHintDismissed') === reviewWeek
    } catch {
      return false
    }
  })
  const showReviewHint = isReviewDay(today) && reviewNote !== undefined && reviewNote.trim() === '' && !hintDismissed

  const habits = useLiveQuery(() => db.habits.filter((h) => !h.deleted && !h.archived).sortBy('createdAt'), [])
  const checks = useLiveQuery(
    () =>
      db.checkIns
        .where('date')
        .between(weekStart, weekEnd, true, true)
        .filter((c) => !c.deleted)
        .toArray(),
    [weekStart, weekEnd],
  )

  const activities = useLiveQuery(() => db.plans.filter((a) => !a.deleted).sortBy('createdAt'), [])
  const actEntries = useLiveQuery(
    () =>
      db.planEntries
        .where('date')
        .between(weekStart, weekEnd, true, true)
        .filter((e) => !e.deleted)
        .toArray(),
    [weekStart, weekEnd],
  )

  // Einheiten (nur Ist-Wert): immer anzeigbar, damit man jederzeit eintragen kann; sie zählen zu „x von y erledigt“ nur an Erinnerungstagen
  const actRows = [...(activities ?? [])]
    .sort(byOrder)
    .map((a) => {
      const mine = (actEntries ?? []).filter((e) => e.planId === a.id)
      const entry = mine.find((e) => e.date === viewKey)
      const weekSum = mine.reduce((sum, e) => sum + e.value, 0)
      const counts = !!entry || isActivityDay(a, viewKey)
      const bars = Array.from({ length: 7 }, (_, i) => mine.filter((e) => weekdayIndex(parseKey(e.date)) === i).reduce((sum, e) => sum + e.value, 0))
      return { id: a.id, a, entry, weekSum, counts, bars }
    })
  const rows = [...(habits ?? [])]
    .sort(byOrder)
    .map((h) => {
      const mine = (checks ?? []).filter((c) => c.habitId === h.id)
      const doneDays = mine.filter((c) => isCheckInDone(h, c))
      const doneToday = doneDays.some((c) => c.date === viewKey)
      const weekCount = new Set(doneDays.map((c) => c.date)).size
      const current = mine.filter((c) => c.date === viewKey).reduce((sum, c) => sum + checkInValue(h, c), 0)
      const miniToday = mine.some((c) => c.date === viewKey && isMini(h, c))
      const existed = dayKey(new Date(h.createdAt)) <= viewKey || doneToday
      return { id: h.id, h, doneToday, miniToday, weekCount, current, show: existed && isDue(h, viewDate, doneToday, weekCount) }
    })
    .filter((r) => r.show)

  // Score je Tag der Woche (Ring im Wochenstreifen)
  const weekScores = useMemo(() => {
    const m = new Map<string, number | null>()
    if (!habits || !checks) return m
    const last = weekEnd < todayKey ? parseKey(weekEnd) : today
    for (const d of computeDayScores(habits, checks, parseKey(weekStart), last)) m.set(d.date, d.score)
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits, checks, weekStart, weekEnd, todayKey])

  // Neue Reihenfolge einer Tageszeit speichern (nicht fällige Gewohnheiten behalten ihren Platz in der Gesamtliste)
  function reorderHabits(time: Habit['timeOfDay'], visibleIds: string[]) {
    const full = [...(habits ?? [])].sort(byOrder).filter((h) => h.timeOfDay === time)
    const merged = mergeVisibleOrder(full.map((h) => h.id), visibleIds)
    void saveOrder('habits', orderChanges(full, merged))
  }
  function reorderActivities(ids: string[]) {
    void saveOrder('plans', orderChanges([...(activities ?? [])].sort(byOrder), ids))
  }

  const done = rows.filter((r) => r.doneToday).length + actRows.filter((r) => r.counts && r.entry).length
  const dueCount = rows.length + actRows.filter((r) => r.counts).length
  // Feier-Moment: Tag komplett (nur wenn es sich in dieser Sitzung ergibt, einmal pro Tag)
  const doneRef = useRef<number | null>(null)
  const dataReady = !!habits && !!checks && !!activities && !!actEntries
  useEffect(() => {
    if (!dataReady || !isToday) return
    const prev = doneRef.current
    doneRef.current = done
    if (prev !== null && prev < done && dueCount > 0 && done === dueCount && !hasSeen(`day:${todayKey}`)) {
      markSeen(`day:${todayKey}`)
      celebrate({ id: `day:${todayKey}`, title: 'Tag geschafft!', text: 'Alles Fällige für heute ist erledigt.', glyph: 'sparkle', color: '#1fdcf0' })
    }
  }, [dataReady, isToday, done, dueCount, todayKey])

  // Feier-Moment: neue Streak-Stufen/Abzeichen
  const badgeIds = freshBadges.map((b) => b.id).join(',')
  useEffect(() => {
    if (!badgeIds || !isToday) return
    const first = freshBadges[0]
    celebrate({
      id: `badge:${badgeIds}`,
      title: freshBadges.length === 1 ? 'Neues Abzeichen!' : `${freshBadges.length} neue Abzeichen!`,
      text: first.label,
      glyph: 'medal',
      color: '#facc15',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badgeIds, isToday])

  const viewScore = weekScores.get(viewKey) ?? null
  const dateText = viewDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
  const title = isToday ? 'Heute' : viewDate.toLocaleDateString('de-DE', { weekday: 'long' })
  const disabled = isFuture

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-4xl font-bold tracking-tight text-accent-400">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            {dateText}
            {dueCount > 0 && !isFuture && ` · ${done} von ${dueCount} erledigt`}
            {viewScore !== null && !isFuture && ` · Score ${viewScore} %`}
          </p>
        </div>
        <div className="flex shrink-0 gap-2.5">
          <button
            onClick={() => setSortMode((v) => !v)}
            aria-label={sortMode ? 'Sortieren beenden' : 'Reihenfolge ändern'}
            aria-pressed={sortMode}
            className={`flex h-12 w-12 items-center justify-center rounded-full border bg-slate-900 active:bg-slate-800 ${sortMode ? 'border-accent-500 text-accent-400' : 'border-slate-800 text-white'}`}
          >
            <IconGlyph name="sort" size={22} />
          </button>
          <button
            onClick={() => setDialog({})}
            aria-label="Neue Gewohnheit"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-white active:bg-slate-800"
          >
            <PlusIcon width={24} height={24} />
          </button>
        </div>
      </div>

      {sortMode && (
        <div role="status" className="mt-4 flex items-center gap-3 rounded-2xl border border-accent-500/30 bg-accent-500/10 p-3 pl-4 text-sm text-slate-200">
          <span className="min-w-0 flex-1">Ziehe an den Griffen oder nutze die Pfeile. Die Reihenfolge gilt je Tageszeit.</span>
          <button onClick={() => setSortMode(false)} className="shrink-0 rounded-full bg-accent-500 px-4 py-2 font-semibold text-black">
            Fertig
          </button>
        </div>
      )}

      {/* Wochenstreifen */}
      <div className="mt-5 grid grid-cols-7 gap-1.5" role="group" aria-label="Woche">
        {Array.from({ length: 7 }, (_, i) => {
          const d = new Date(parseKey(weekStart))
          d.setDate(d.getDate() + i)
          const key = dayKey(d)
          const selected = key === viewKey
          const future = key > todayKey
          const score = weekScores.get(key) ?? null
          return (
            <button
              key={key}
              onClick={() => setPicked(key === todayKey ? null : key)}
              aria-pressed={selected}
              aria-label={`${d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}${
                future ? '' : score === null ? ', nichts fällig' : `, Score ${score} %`
              }`}
              className={`flex flex-col items-center gap-1.5 rounded-[1.6rem] border py-3 transition-colors ${
                selected ? 'border-slate-600 bg-slate-700 text-white' : 'border-slate-800 bg-slate-900 text-slate-300 active:bg-slate-800'
              } ${future && !selected ? 'opacity-60' : ''}`}
            >
              <span className={`text-[13px] font-semibold ${selected ? 'text-white' : 'text-slate-400'}`}>{LETTERS[i]}</span>
              <Ring pct={future ? null : score}>{d.getDate()}</Ring>
            </button>
          )
        })}
      </div>

      {!isToday && (
        <p className="mt-3 text-sm text-slate-400">
          {isFuture ? 'Zukünftige Tage kannst du nur ansehen.' : 'Du siehst einen früheren Tag – hier kannst du nachtragen.'}{' '}
          <button onClick={() => setPicked(null)} className="font-medium text-accent-400">
            Zurück zu heute
          </button>
        </p>
      )}

      {coachOn && isToday && coachDismissed !== todayKey && coachTips && coachTips.length > 0 && (
        <CoachCard tips={coachTips} onDismiss={() => dismissCoachFor(todayKey)} />
      )}

      {showReviewHint && isToday && (
        <div className="mt-5 flex items-center gap-3 rounded-3xl border border-accent-500/30 bg-accent-500/10 p-4">
          <EmojiGlyph emoji="📋" size={44} />
          <div className="min-w-0 flex-1 text-sm">
            <div className="font-semibold">Wochenrückblick bereit</div>
            <div className="text-slate-300">KW {isoWeek(reviewWeek)} · wie lief deine Woche?</div>
          </div>
          <button
            onClick={() => {
              try {
                localStorage.setItem('habitat:reviewHintDismissed', reviewWeek)
              } catch {
                /* Speicher nicht verfügbar */
              }
              setHintDismissed(true)
            }}
            className="shrink-0 rounded-full px-2.5 py-1.5 text-sm text-slate-400 active:bg-slate-800"
          >
            Später
          </button>
          <Link to={`/rueckblick/${reviewWeek}`} className="shrink-0 rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-black">
            Ansehen
          </Link>
        </div>
      )}

      {freshBadges.length > 0 && isToday && (
        <div role="status" className="mt-5 flex items-start gap-3 rounded-3xl border border-amber-500/40 bg-amber-500/10 p-4">
          <EmojiGlyph emoji="🏆" size={44} />
          <div className="min-w-0 flex-1 text-sm">
            <div className="font-semibold">{freshBadges.length === 1 ? 'Neues Abzeichen' : `${freshBadges.length} neue Abzeichen`}</div>
            <ul className="mt-0.5 text-slate-300">
              {freshBadges.slice(0, 3).map((b) => (
                <li key={b.id} className="truncate">
                  <TierMedal tier={b.tier} size={16} /> {b.label}
                </li>
              ))}
              {freshBadges.length > 3 && <li className="text-slate-400">+ {freshBadges.length - 3} weitere (siehe Statistik)</li>}
            </ul>
          </div>
          <button onClick={dismissBadges} className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-amber-200 active:bg-amber-500/20">
            OK
          </button>
        </div>
      )}

      {progress && ((habits && habits.length > 0) || (activities && activities.length > 0)) && isToday && <DayHero progress={progress} done={done} total={dueCount} />}

      {habits && habits.length === 0 && activities && activities.length === 0 && (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
          Noch keine Gewohnheiten.
          <br />
          Tippe auf <span className="text-accent-400">+</span>, um die erste anzulegen.
        </div>
      )}

      {habits && habits.length > 0 && rows.length === 0 && (activities ?? []).length === 0 && (
        <p className="mt-8 text-center text-slate-400">{isFuture ? 'Hier ist noch nichts zu sehen.' : 'Heute ist nichts fällig. 🎉'}</p>
      )}

      {TIMES.map((t) => {
        const section = rows.filter((r) => r.h.timeOfDay === t.value)
        if (!section.length) return null
        return (
          <section key={t.value} className="mt-7">
            <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{t.label}</h2>
            <SortableList
              items={section}
              active={sortMode}
              className="flex flex-col gap-3"
              onReorder={(ids) => reorderHabits(t.value, ids)}
              renderItem={({ h, doneToday, miniToday, weekCount, current }, controls) => (
                <div
                  className={`flex items-center gap-3 rounded-3xl border bg-slate-900 py-4 pl-5 pr-4 ${
                    doneToday ? 'border-done/25' : 'border-slate-800'
                  }`}
                >
                  <button onClick={() => setDialog({ habit: h })} disabled={sortMode} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                    <ItemIcon icon={h.icon} area={h.area} size={52} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[19px] font-semibold ${doneToday ? 'text-slate-300' : ''}`}>{h.name}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-slate-400">
                        <span style={{ color: areaColor(h.area) }}>{areaLabel(h.area)}</span>
                        {h.dailyTarget && (
                          <span className="tabular-nums">
                            {fmtQty(current)}/{fmtQty(h.dailyTarget)} {h.unit ?? ''}
                          </span>
                        )}
                        {miniToday && <span>Mini</span>}
                        {h.frequency.type === 'perWeek' && (
                          <span className="inline-flex items-center gap-1" aria-label={`${weekCount} von ${h.frequency.count} diese Woche`}>
                            {Array.from({ length: h.frequency.count }, (_, i) => (
                              <span key={i} className="h-2 w-2 rounded-full" style={{ background: i < weekCount ? areaColor(h.area) : 'rgb(255 255 255 / 0.15)' }} />
                            ))}
                          </span>
                        )}
                        {isToday && <StreakChip {...(progress?.byHabit.get(h.id) ?? { streak: 0, unit: 'Tage' as const, freezes: 0 })} />}
                      </span>
                      {h.dailyTarget && !doneToday && (
                        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/10">
                          <span className="block h-full rounded-full" style={{ width: `${Math.min(100, (current / h.dailyTarget) * 100)}%`, background: areaColor(h.area) }} />
                        </span>
                      )}
                    </span>
                  </button>

                  {!sortMode && h.miniVersion && (!doneToday || miniToday) && (
                    <button
                      onClick={() => void toggleMini(h, viewKey)}
                      disabled={disabled}
                      title={h.miniVersion}
                      aria-label={`Mini-Version: ${h.miniVersion}`}
                      aria-pressed={miniToday}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-40 ${
                        miniToday ? 'border-done/60 bg-done/20 text-done' : 'border-slate-700 text-slate-300 active:bg-slate-800'
                      }`}
                    >
                      Mini{miniToday ? ' ✓' : ''}
                    </button>
                  )}

                  {!sortMode && (
                  <button
                    onClick={() => (h.dailyTarget ? setSheetId(h.id) : void toggleCheckIn(h.id, viewKey))}
                    disabled={disabled}
                    aria-label={
                      h.dailyTarget ? `${h.name}: Menge eintragen` : doneToday ? `${h.name} zurücknehmen` : `${h.name} abhaken`
                    }
                    aria-pressed={doneToday}
                    style={
                      h.dailyTarget && !doneToday
                        ? {
                            background: `conic-gradient(var(--color-done) ${Math.min(100, (current / h.dailyTarget) * 100)}%, var(--color-slate-700) 0)`,
                          }
                        : undefined
                    }
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
                      doneToday
                        ? miniToday
                          ? 'border-2 border-done/60 bg-done/25 text-done'
                          : 'border-2 border-done bg-done text-black'
                        : h.dailyTarget
                          ? ''
                          : 'border-2 border-slate-600 text-transparent active:border-done'
                    }`}
                  >
                    {h.dailyTarget && !doneToday ? (
                      <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-slate-900 text-[11px] font-medium text-slate-300">
                        {Math.round((current / h.dailyTarget) * 100)}%
                      </span>
                    ) : (
                      <CheckSvg />
                    )}
                  </button>
                  )}
                  {controls}
                </div>
              )}
            />
          </section>
        )
      })}

      {actRows.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Einheiten</h2>
          <SortableList
            items={actRows}
            active={sortMode}
            className="flex flex-col gap-3"
            onReorder={reorderActivities}
            renderItem={({ a, entry, weekSum, bars }, controls) => (
              <div
                className={`flex items-center gap-3 rounded-3xl border bg-slate-900 py-4 pl-5 pr-4 ${entry ? 'border-done/25' : 'border-slate-800'}`}
              >
                <Link to="/ziele" className="flex min-w-0 flex-1 items-center gap-4 text-left" onClick={(e) => sortMode && e.preventDefault()}>
                  <ItemIcon icon={a.icon} area={a.area} size={48} />
                  <span className="min-w-0">
                    <span className={`block truncate text-[19px] font-semibold ${entry ? 'text-slate-300' : ''}`}>{a.name}</span>
                    <span className="mt-0.5 block text-sm text-slate-400">
                      {entry ? `${fmtQty(entry.value)} ${a.unit}` : 'noch kein Eintrag'}
                      {` · Woche ${fmtQty(weekSum)} ${a.unit}`}
                    </span>
                  </span>
                </Link>
                {!sortMode && (
                <span className="flex h-10 shrink-0 items-end gap-[3px]" role="img" aria-label={`Diese Woche: ${fmtQty(weekSum)} ${a.unit}`}>
                  {bars.map((v, i) => (
                    <span
                      key={i}
                      className="w-[5px] rounded-full"
                      style={{ height: `${Math.max(12, (v / Math.max(...bars, 0.0001)) * 100)}%`, background: v > 0 ? areaColor(a.area) : 'rgb(255 255 255 / 0.12)' }}
                    />
                  ))}
                </span>
                )}
                {!sortMode && (
                <button
                  onClick={() => setActSheetId(a.id)}
                  disabled={disabled}
                  aria-label={`${a.name}: Wert eintragen`}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
                    entry ? 'border-2 border-done bg-done text-black' : 'border-2 border-slate-600 text-lg text-slate-300 active:border-done'
                  }`}
                >
                  {entry ? <CheckSvg /> : '+'}
                </button>
                )}
                {controls}
              </div>
            )}
          />
        </section>
      )}

      {dialog && (dialog.habit ? <HabitDialog habit={dialog.habit} onClose={() => setDialog(null)} /> : <HabitWizard onClose={() => setDialog(null)} />)}
      {actSheetId &&
        (() => {
          const r = actRows.find((x) => x.a.id === actSheetId)
          return r ? <ActivityEntrySheet activity={r.a} date={viewKey} current={r.entry?.value ?? 0} onClose={() => setActSheetId(null)} /> : null
        })()}
      {sheetId &&
        (() => {
          const r = rows.find((x) => x.h.id === sheetId)
          return r ? <QuantitySheet habit={r.h} date={viewKey} current={r.current} onClose={() => setSheetId(null)} /> : null
        })()}
    </div>
  )
}
