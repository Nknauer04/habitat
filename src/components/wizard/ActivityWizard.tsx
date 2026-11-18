import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { saveActivity, setActivityGoalLinks } from '../../lib/activities'
import { db } from '../../lib/db'
import type { Area } from '../../lib/types'
import { IconGlyph, areaColor } from '../ItemIcon'
import Wizard, { type WizardStep } from './Wizard'
import { AreaTiles, BigInput, Chip, IconGrid, PreviewIcon, Tile, Tiles, WeekdayChips } from './parts'
import { getAreas } from '../../lib/areas'

// Einheit anlegen: Name → Bereich → Symbol → Einheit → Erinnerungstage → Ziele
export default function ActivityWizard({ onClose }: { onClose: () => void }) {
  const goals = useLiveQuery(() => db.goals.filter((g) => !g.deleted && !g.done && g.kind === 'amount').sortBy('createdAt'), [])
  const [name, setName] = useState('')
  const [area, setArea] = useState<Area>(() => getAreas()[0]?.key ?? 'sonstiges')
  const [icon, setIcon] = useState('i:run')
  const [unit, setUnit] = useState('km')
  const [days, setDays] = useState<number[]>([])
  const [linked, setLinked] = useState<string[]>([])

  const steps: WizardStep[] = [
    {
      key: 'name',
      question: 'Was machst du?',
      hint: 'Eine Einheit ist etwas, das du mit einem Wert einträgst – z. B. Laufen in km.',
      validate: () => (name.trim() ? null : 'Bitte gib der Einheit einen Namen.'),
      content: <BigInput value={name} onChange={setName} placeholder="z. B. Laufen" />,
    },
    { key: 'area', question: 'Welcher Bereich trifft zu?', content: <AreaTiles value={area} onChange={setArea} /> },
    {
      key: 'icon',
      question: 'Wähle ein Symbol',
      content: (
        <>
          <PreviewIcon icon={icon} area={area} />
          <IconGrid value={icon} area={area} onChange={setIcon} />
        </>
      ),
    },
    {
      key: 'unit',
      question: 'In welcher Einheit misst du?',
      validate: () => (unit.trim() ? null : 'Bitte eine Einheit angeben.'),
      content: (
        <div>
          <BigInput value={unit} onChange={setUnit} placeholder="km" />
          <div className="mt-5 flex flex-wrap gap-2">
            {['km', 'h', 'min', 'Seiten', 'Schritte', 'Einheiten'].map((u) => (
              <Chip key={u} active={unit === u} onClick={() => setUnit(u)}>
                {u}
              </Chip>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: 'days',
      question: 'An welchen Tagen willst du dich erinnern?',
      hint: 'Optional. Du kannst trotzdem jederzeit eintragen.',
      optional: true,
      content: <WeekdayChips value={days} onChange={setDays} />,
    },
  ]

  if (goals && goals.length > 0)
    steps.push({
      key: 'goals',
      question: 'Zählt es für ein Ziel?',
      hint: 'Optional. Alle Einträge dieser Einheit zählen dann auf das Ziel.',
      optional: true,
      content: (
        <Tiles>
          {goals.map((g) => {
            const on = linked.includes(g.id)
            const blocked = !on && !!g.unit && g.unit !== unit.trim()
            return (
              <Tile
                key={g.id}
                active={on}
                disabled={blocked}
                onClick={() => setLinked(on ? linked.filter((x) => x !== g.id) : [...linked, g.id])}
                icon={<IconGlyph name="target" size={26} />}
                title={g.title}
                text={blocked ? `Das Ziel zählt in ${g.unit}` : g.unit ? `Zählt in ${g.unit}` : undefined}
                color={areaColor(g.area)}
              />
            )
          })}
        </Tiles>
      ),
    })

  async function finish() {
    const id = await saveActivity({ name: name.trim(), icon, area, unit: unit.trim(), days: [...days].sort() })
    if (linked.length && goals) await setActivityGoalLinks(id, unit.trim(), linked, goals)
    onClose()
  }

  return <Wizard steps={steps} finishLabel="Einheit anlegen" onFinish={finish} onClose={onClose} />
}
