import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { saveActivity } from '../../lib/activities'
import { dayKey, db, newId } from '../../lib/db'
import { addMonthsKey, deadlineInfo, saveGoal } from '../../lib/goals'
import { areaLabel, fmtQty } from '../../lib/habits'
import type { Area, GoalStep, Milestone } from '../../lib/types'
import ItemIcon, { IconGlyph, areaColor } from '../ItemIcon'
import Wizard, { type WizardStep } from './Wizard'
import { AreaTiles, BigInput, Chip, Tile, Tiles, bigField } from './parts'
import { getAreas } from '../../lib/areas'

type Kind = 'amount' | 'count' | 'steps'
const num = (v: string) => Number(v.replace(',', '.'))
const fmtDate = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })

// Ziel anlegen: eine Frage pro Seite (Art → Titel → Wert → Bereich → Frist → Etappen → Zusammenfassung)
export default function GoalWizard({ onClose }: { onClose: () => void }) {
  const today = dayKey()
  const activities = useLiveQuery(() => db.plans.filter((a) => !a.deleted).sortBy('createdAt'), [])
  const habits = useLiveQuery(() => db.habits.filter((h) => !h.deleted && !h.archived).sortBy('createdAt'), [])

  const [kind, setKind] = useState<Kind | null>(null)
  const [title, setTitle] = useState('')
  const [activityIds, setActivityIds] = useState<string[]>([])
  const [amountTarget, setAmountTarget] = useState('')
  const [habitIds, setHabitIds] = useState<string[]>([])
  const [countTarget, setCountTarget] = useState('')
  const [steps, setSteps] = useState<GoalStep[]>([{ id: newId(), text: '', done: false }])
  const [area, setArea] = useState<Area>(() => getAreas()[0]?.key ?? 'sonstiges')
  const [areaTouched, setAreaTouched] = useState(false)
  const [targetDate, setTargetDate] = useState('')
  const [milestones, setMilestones] = useState<{ id: string; date: string; value: string }[]>([])
  // Neue Einheit direkt im Assistenten anlegen
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUnit, setNewUnit] = useState('km')

  // Solange noch keine Art gewählt ist, zeigt der Fortschrittsbalken die Länge der häufigsten Art (Menge)
  const k: Kind = kind ?? 'amount'
  const unit = (activities ?? []).find((a) => activityIds.includes(a.id))?.unit
  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  const pickArea = (a: Area) => {
    setArea(a)
    setAreaTouched(true)
  }
  const dl = targetDate ? deadlineInfo(targetDate, today) : null
  const total = k === 'amount' ? num(amountTarget) : k === 'count' ? num(countTarget) : 0

  async function createActivity() {
    if (!newName.trim()) return
    const id = await saveActivity({ name: newName.trim(), icon: 'i:run', area, unit: newUnit.trim() || 'km', days: [] })
    setActivityIds((l) => [...l, id])
    setCreating(false)
    setNewName('')
  }

  const placeholder = k === 'amount' ? 'z. B. 500 km laufen' : k === 'count' ? 'z. B. 100 Workouts' : 'z. B. Song fertigstellen'

  const list: WizardStep[] = [
    {
      key: 'kind',
      question: 'Wie willst du dein Ziel messen?',
      hint: 'Du kannst es später nicht umstellen – such dir die passende Art aus.',
      validate: () => (kind ? null : 'Bitte eine Art wählen.'),
      content: (
        <Tiles>
          <Tile active={kind === 'amount'} onClick={() => setKind('amount')} icon={<IconGlyph name="target" size={26} />} title="Menge erreichen" text="z. B. 500 km laufen, 40 Stunden üben" />
          <Tile active={kind === 'count'} onClick={() => setKind('count')} icon={<IconGlyph name="check" size={26} />} title="Gewohnheit zählen" text="z. B. 100× Training abhaken" />
          <Tile active={kind === 'steps'} onClick={() => setKind('steps')} icon={<IconGlyph name="list" size={26} />} title="Teilschritte abarbeiten" text="z. B. Song bauen, mischen, veröffentlichen" />
        </Tiles>
      ),
    },
    {
      key: 'title',
      question: 'Welches Ziel hast du?',
      validate: () => (title.trim() ? null : 'Bitte gib deinem Ziel einen Namen.'),
      content: <BigInput value={title} onChange={setTitle} placeholder={placeholder} />,
    },
  ]

  if (k === 'amount') {
    list.push(
      {
        key: 'acts',
        question: 'Was zählt darauf ein?',
        hint: 'Wähle die Einheiten, deren Ist-Werte zusammengezählt werden.',
        validate: () => (activityIds.length ? null : 'Bitte mindestens eine Einheit wählen oder anlegen.'),
        content: (
          <Tiles>
            {(activities ?? []).map((a) => {
              const blocked = !!unit && a.unit !== unit && !activityIds.includes(a.id)
              return (
                <Tile
                  key={a.id}
                  active={activityIds.includes(a.id)}
                  disabled={blocked}
                  onClick={() => {
                    if (!areaTouched && activityIds.length === 0) setArea(a.area)
                    toggle(activityIds, setActivityIds, a.id)
                  }}
                  iconRaw
                  icon={<ItemIcon icon={a.icon} area={a.area} size={48} />}
                  title={a.name}
                  text={blocked ? `Andere Einheit (${a.unit})` : `Wert in ${a.unit}`}
                  color={areaColor(a.area)}
                />
              )
            })}
            {creating ? (
              <div className="rounded-3xl border border-slate-700 bg-slate-900 p-4">
                <BigInput value={newName} onChange={setNewName} placeholder="Name, z. B. Laufen" />
                <div className="mt-4 flex flex-wrap gap-2">
                  {['km', 'h', 'min', 'Seiten', 'Schritte'].map((u) => (
                    <Chip key={u} active={newUnit === u} onClick={() => setNewUnit(u)}>
                      {u}
                    </Chip>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => setCreating(false)} className="rounded-full px-4 py-2.5 text-slate-300 active:bg-slate-800">
                    Abbrechen
                  </button>
                  <button type="button" onClick={() => void createActivity()} className="rounded-full bg-accent-500 px-5 py-2.5 font-semibold text-black">
                    Einheit anlegen
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setCreating(true)} className="flex items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-600 p-4 text-lg font-semibold text-accent-400 active:bg-slate-900">
                + Neue Einheit anlegen
              </button>
            )}
          </Tiles>
        ),
      },
      {
        key: 'target',
        question: 'Wie hoch soll es sein?',
        hint: 'Das Gesamtziel, das du erreichen willst.',
        validate: () => (num(amountTarget) > 0 ? null : 'Bitte eine Zahl größer 0 eingeben.'),
        content: <BigInput value={amountTarget} onChange={setAmountTarget} inputMode="decimal" placeholder="500" suffix={unit} />,
      },
    )
  } else if (k === 'count') {
    list.push(
      {
        key: 'habits',
        question: 'Welche Gewohnheiten zählen?',
        hint: 'Jeder erledigte Tag dieser Gewohnheiten zählt einmal.',
        validate: () => (habitIds.length ? null : 'Bitte mindestens eine Gewohnheit wählen.'),
        content: (
          <Tiles>
            {habits && habits.length === 0 && <p className="text-slate-400">Lege zuerst unter „Heute“ eine Gewohnheit an.</p>}
            {(habits ?? []).map((h) => (
              <Tile
                key={h.id}
                active={habitIds.includes(h.id)}
                onClick={() => {
                  if (!areaTouched && habitIds.length === 0) setArea(h.area)
                  toggle(habitIds, setHabitIds, h.id)
                }}
                iconRaw
                icon={<ItemIcon icon={h.icon} area={h.area} size={48} />}
                title={h.name}
                text={areaLabel(h.area)}
                color={areaColor(h.area)}
              />
            ))}
          </Tiles>
        ),
      },
      {
        key: 'target',
        question: 'Wie viele Haken sollen es sein?',
        validate: () => (num(countTarget) >= 1 ? null : 'Bitte mindestens 1 eingeben.'),
        content: <BigInput value={countTarget} onChange={setCountTarget} inputMode="numeric" placeholder="100" suffix="Haken" />,
      },
    )
  } else if (k === 'steps') {
    list.push({
      key: 'steps',
      question: 'Welche Teilschritte gehören dazu?',
      hint: 'Hake sie später in der Zielkarte ab.',
      validate: () => (steps.some((s) => s.text.trim()) ? null : 'Bitte mindestens einen Teilschritt eintragen.'),
      content: (
        <div className="flex flex-col gap-3">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <input
                autoFocus={i === steps.length - 1 && i > 0}
                value={s.text}
                onChange={(e) => setSteps((l) => l.map((x) => (x.id === s.id ? { ...x, text: e.target.value } : x)))}
                placeholder={`Schritt ${i + 1}`}
                className="h-14 min-w-0 flex-1 rounded-2xl border border-slate-800 bg-slate-900 px-4 text-lg outline-none focus:border-accent-500"
              />
              {steps.length > 1 && (
                <button type="button" onClick={() => setSteps((l) => l.filter((x) => x.id !== s.id))} aria-label="Schritt entfernen" className="h-14 w-12 rounded-2xl border border-slate-800 text-slate-400 active:bg-slate-800">
                  ✕
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setSteps((l) => [...l, { id: newId(), text: '', done: false }])} className="self-start rounded-full px-2 py-2 text-lg font-semibold text-accent-400">
            + Schritt hinzufügen
          </button>
        </div>
      ),
    })
  }

  {
    list.push({
      key: 'area',
      question: 'Welcher Bereich trifft zu?',
      hint: 'Die XP und die Farbe des Ziels gehören zu diesem Bereich.',
      content: <AreaTiles value={area} onChange={pickArea} />,
    })

    const quick: [string, string][] = [
      ['1 Monat', addMonthsKey(today, 1)],
      ['3 Monate', addMonthsKey(today, 3)],
      ['6 Monate', addMonthsKey(today, 6)],
      ['1 Jahr', addMonthsKey(today, 12)],
    ]
    list.push({
      key: 'date',
      question: 'Bis wann willst du es schaffen?',
      hint: 'Optional – ohne Frist gibt es keinen Zeitplan.',
      optional: true,
      validate: () => (targetDate && targetDate <= today ? 'Das Datum muss in der Zukunft liegen.' : null),
      content: (
        <div>
          <input type="date" value={targetDate} min={today} onChange={(e) => setTargetDate(e.target.value)} aria-label="Frist" className={bigField} />
          <div className="mt-5 flex flex-wrap gap-2">
            {quick.map(([label, d]) => (
              <Chip key={label} active={targetDate === d} onClick={() => setTargetDate(d)}>
                {label}
              </Chip>
            ))}
            <Chip active={!targetDate} onClick={() => setTargetDate('')}>
              Ohne Frist
            </Chip>
          </div>
          {dl && dl.days > 0 && (
            <div className="mt-6 rounded-3xl border border-accent-500/30 bg-accent-500/10 p-5">
              <div className="text-4xl font-bold tabular-nums text-accent-300">
                {dl.days} {dl.days === 1 ? 'Tag' : 'Tage'}
              </div>
              <div className="mt-1 text-slate-300">
                bleiben dir bis zum {fmtDate(targetDate)} (ca. {fmtQty(Math.round(dl.weeks * 10) / 10)} Wochen)
              </div>
              {k === 'amount' && total > 0 && unit && (
                <div className="mt-3 border-t border-accent-500/20 pt-3 text-slate-200">
                  Das sind ca. <b>{fmtQty(Math.round((total / dl.weeks) * 10) / 10)} {unit}</b> pro Woche
                  {dl.days >= 1 && <> bzw. <b>{fmtQty(Math.round((total / dl.days) * 100) / 100)} {unit}</b> pro Tag</>}.
                </div>
              )}
              {k === 'count' && total > 0 && (
                <div className="mt-3 border-t border-accent-500/20 pt-3 text-slate-200">
                  Das sind ca. <b>{fmtQty(Math.round((total / dl.weeks) * 10) / 10)} Haken</b> pro Woche.
                </div>
              )}
            </div>
          )}
        </div>
      ),
    })

    if (k === 'amount') {
      list.push({
        key: 'milestones',
        question: 'Möchtest du Etappenziele setzen?',
        hint: `Zwischenstände, z. B. ${unit ? `100 ${unit}` : '100'} bis Ende November. Optional.`,
        optional: true,
        validate: () => {
          for (const [i, m] of milestones.entries()) {
            if (!m.date && !m.value.trim()) continue
            const v = num(m.value)
            if (!m.date || !(v > 0)) return `Etappe ${i + 1}: bitte Datum und Wert angeben.`
            if (m.date <= today) return `Etappe ${i + 1} muss in der Zukunft liegen.`
            if (v > total) return `Etappe ${i + 1}: der Zwischenstand darf das Gesamtziel nicht übersteigen.`
          }
          return null
        },
        content: (
          <div className="flex flex-col gap-3">
            {milestones.map((m, i) => (
              <div key={m.id} className="grid grid-cols-[minmax(0,1fr)_6rem_3rem] items-center gap-2">
                <input
                  type="date"
                  value={m.date}
                  min={today}
                  onChange={(e) => setMilestones((l) => l.map((x) => (x.id === m.id ? { ...x, date: e.target.value } : x)))}
                  aria-label={`Etappe ${i + 1} Datum`}
                  className="h-14 min-w-0 rounded-2xl border border-slate-800 bg-slate-900 px-3 text-base outline-none focus:border-accent-500"
                />
                <input
                  inputMode="decimal"
                  value={m.value}
                  onChange={(e) => setMilestones((l) => l.map((x) => (x.id === m.id ? { ...x, value: e.target.value } : x)))}
                  placeholder={unit ?? 'Wert'}
                  aria-label={`Etappe ${i + 1} Zwischenstand`}
                  className="h-14 min-w-0 rounded-2xl border border-slate-800 bg-slate-900 px-3 text-center text-lg outline-none focus:border-accent-500"
                />
                <button type="button" onClick={() => setMilestones((l) => l.filter((x) => x.id !== m.id))} aria-label="Etappe entfernen" className="h-14 rounded-2xl border border-slate-800 text-slate-400 active:bg-slate-800">
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setMilestones((l) => [...l, { id: newId(), date: '', value: '' }])} className="self-start rounded-full px-2 py-2 text-lg font-semibold text-accent-400">
              + Etappe hinzufügen
            </button>
          </div>
        ),
      })
    }

    const rows: [string, string][] = [
      ['Ziel', title.trim()],
      ['Art', k === 'amount' ? 'Menge' : k === 'count' ? 'Gewohnheit zählen' : 'Teilschritte'],
      ...(k === 'amount'
        ? ([
            ['Soll', `${fmtQty(total)} ${unit ?? ''}`.trim()],
            ['Zählt', (activities ?? []).filter((a) => activityIds.includes(a.id)).map((a) => a.name).join(', ') || '–'],
          ] as [string, string][])
        : []),
      ...(k === 'count' ? ([['Soll', `${fmtQty(total)} Haken`]] as [string, string][]) : []),
      ...(k === 'steps' ? ([['Schritte', String(steps.filter((s) => s.text.trim()).length)]] as [string, string][]) : []),
      ['Bereich', areaLabel(area)],
      ['Frist', targetDate ? `${fmtDate(targetDate)}${dl && dl.days > 0 ? ` (${dl.days} Tage)` : ''}` : 'keine'],
      ...(k === 'amount' ? ([['Etappen', String(milestones.filter((m) => m.date && num(m.value) > 0).length)]] as [string, string][]) : []),
    ]
    list.push({
      key: 'summary',
      question: 'Passt das so?',
      content: (
        <dl className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 border-b border-slate-800 px-5 py-4 last:border-b-0">
              <dt className="text-slate-400">{k}</dt>
              <dd className="text-right text-lg font-semibold" style={k === 'Bereich' ? { color: areaColor(area) } : undefined}>
                {v}
              </dd>
            </div>
          ))}
        </dl>
      ),
    })
  }

  async function finish() {
    if (!kind) return 'Bitte eine Art wählen.'
    const cleanSteps = steps.filter((s) => s.text.trim()).map((s) => ({ ...s, text: s.text.trim() }))
    const ms: Milestone[] = milestones
      .filter((m) => m.date && num(m.value) > 0)
      .map((m) => ({ id: m.id, date: m.date, value: num(m.value) }))
      .sort((a, b) => a.date.localeCompare(b.date))
    await saveGoal({
      title: title.trim(),
      area,
      kind,
      steps: k === 'steps' ? cleanSteps : [],
      habitIds: k === 'count' ? habitIds : [],
      target: k === 'count' ? Math.round(total) : k === 'amount' ? total : undefined,
      startDate: k === 'steps' ? undefined : today,
      targetDate: targetDate || undefined,
      activityIds: k === 'amount' ? activityIds : undefined,
      unit: k === 'amount' ? unit : undefined,
      milestones: k === 'amount' && ms.length ? ms : undefined,
    })
    onClose()
  }

  return <Wizard steps={list} finishLabel="Ziel anlegen" onFinish={finish} onClose={onClose} />
}
