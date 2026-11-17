import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { copyText } from '../lib/copy'
import { db } from '../lib/db'
import { buildReport, recentRange } from '../lib/report'
import SectionTitle from './widgets/SectionTitle'
import { useCheckIns } from '../lib/useCheckIns'

const PERIODS = [
  [7, '7 Tage'],
  [30, '30 Tage'],
  [90, '90 Tage'],
] as const

// „Bericht kopieren“: Textbericht für die Claude-App; entsteht auf dem Gerät, nichts wird gesendet.
// Mit `fixed` (Wochenrückblick) gilt genau dieser Zeitraum, sonst Auswahl 7/30/90 Tage.
export default function ReportCard({ today, fixed }: { today: Date; fixed?: { from: string; to: string; label: string } }) {
  const [n, setN] = useState<number>(7)
  const [preview, setPreview] = useState(false)
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle')

  const habits = useLiveQuery(() => db.habits.filter((h) => !h.deleted).toArray(), [])
  const checkIns = useCheckIns()
  const goals = useLiveQuery(() => db.goals.filter((g) => !g.deleted).toArray(), [])
  const activities = useLiveQuery(() => db.plans.filter((a) => !a.deleted).toArray(), [])
  const entries = useLiveQuery(() => db.planEntries.filter((e) => !e.deleted).toArray(), [])
  const reviews = useLiveQuery(() => db.reviews.filter((r) => !r.deleted).toArray(), [])

  const range = fixed ?? recentRange(today, n)
  const text = useMemo(
    () =>
      habits && checkIns && goals && activities && entries && reviews
        ? buildReport({ habits, checkIns, goals, activities, entries, reviews, today, from: range.from, to: range.to })
        : '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [habits, checkIns, goals, activities, entries, reviews, range.from, range.to],
  )

  async function copy() {
    const ok = await copyText(text)
    setState(ok ? 'ok' : 'fail')
    setTimeout(() => setState('idle'), 3000)
  }

  return (
    <section className="mt-3 rounded-3xl border border-slate-800 bg-slate-900 p-5" aria-label="Bericht kopieren">
      <SectionTitle glyph="list" color="#a78bfa" title="Bericht kopieren" />
      <p className="mt-3 text-sm text-slate-400">
        {fixed ? `Bericht für ${fixed.label}` : 'Ein Textbericht deiner Zahlen mit fertigem Auftrag'} – zum Einfügen in die Claude-App. Er wird nur in die Zwischenablage kopiert, nichts wird gesendet.
      </p>

      {!fixed && (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Zeitraum">
          {PERIODS.map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setN(v)}
              aria-pressed={n === v}
              className={`rounded-full border px-4 py-2 text-[15px] font-medium ${n === v ? 'border-accent-500 bg-accent-500/15 text-accent-300' : 'border-slate-700 text-slate-300'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void copy()} disabled={!text} className="rounded-full bg-accent-500 px-6 py-3 font-semibold text-black disabled:opacity-50">
          {state === 'ok' ? 'Kopiert ✓' : 'Bericht kopieren'}
        </button>
        <button type="button" onClick={() => setPreview((v) => !v)} aria-expanded={preview} className="rounded-full px-3 py-2.5 text-sm text-slate-300 active:bg-slate-800">
          {preview ? 'Vorschau ausblenden' : 'Vorschau anzeigen'}
        </button>
      </div>
      <p role="status" className="mt-2 min-h-5 text-sm text-slate-400">
        {state === 'ok' && 'In der Zwischenablage. Jetzt in der Claude-App einfügen.'}
        {state === 'fail' && 'Kopieren hat nicht geklappt – öffne die Vorschau und kopiere den Text von Hand.'}
      </p>

      {preview && (
        <textarea
          readOnly
          value={text}
          rows={14}
          aria-label="Berichtstext"
          onFocus={(e) => e.currentTarget.select()}
          className="mt-2 w-full resize-y rounded-2xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-300 outline-none focus:border-accent-500"
        />
      )}
    </section>
  )
}
