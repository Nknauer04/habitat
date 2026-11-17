import { useState } from 'react'
import { saveHabit } from '../../lib/habits'
import type { Area, Frequency, TimeOfDay } from '../../lib/types'
import { IconGlyph, areaColor } from '../ItemIcon'
import Wizard, { type WizardStep } from './Wizard'
import { AreaTiles, BigInput, Chip, IconGrid, PreviewIcon, Stepper, Tile, Tiles, WeekdayChips } from './parts'
import { getAreas } from '../../lib/areas'

const num = (v: string) => Number(v.replace(',', '.'))

// Gewohnheit anlegen: Name → Bereich → Symbol → Tageszeit → Häufigkeit → Messung → Mini-Version
export default function HabitWizard({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [area, setArea] = useState<Area>(() => getAreas()[0]?.key ?? 'sonstiges')
  const [icon, setIcon] = useState('i:check')
  const [time, setTime] = useState<TimeOfDay>('morgen')
  const [freq, setFreq] = useState<Frequency['type']>('daily')
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4])
  const [count, setCount] = useState(3)
  const [qty, setQty] = useState(false)
  const [target, setTarget] = useState('30')
  const [unit, setUnit] = useState('min')
  const [mini, setMini] = useState('')

  const steps: WizardStep[] = [
    {
      key: 'name',
      question: 'Was willst du dir angewöhnen?',
      validate: () => (name.trim() ? null : 'Bitte gib der Gewohnheit einen Namen.'),
      content: <BigInput value={name} onChange={setName} placeholder="z. B. Morgens dehnen" />,
    },
    {
      key: 'area',
      question: 'Welcher Bereich trifft zu?',
      hint: 'Bestimmt die Farbe und wohin die XP fließen.',
      content: <AreaTiles value={area} onChange={setArea} />,
    },
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
      key: 'time',
      question: 'Wann machst du es?',
      content: (
        <Tiles>
          <Tile active={time === 'morgen'} onClick={() => setTime('morgen')} icon={<IconGlyph name="sun" size={26} />} title="Morgens" color={areaColor(area)} />
          <Tile active={time === 'abend'} onClick={() => setTime('abend')} icon={<IconGlyph name="moon" size={26} />} title="Abends" color={areaColor(area)} />
          <Tile active={time === 'beliebig'} onClick={() => setTime('beliebig')} icon={<IconGlyph name="clock" size={26} />} title="Beliebig" text="Zu jeder Tageszeit" color={areaColor(area)} />
        </Tiles>
      ),
    },
    {
      key: 'freq',
      question: 'Wie oft?',
      validate: () => (freq === 'weekdays' && days.length === 0 ? 'Bitte mindestens einen Wochentag wählen.' : null),
      content: (
        <div>
          <Tiles>
            <Tile active={freq === 'daily'} onClick={() => setFreq('daily')} icon={<IconGlyph name="calendar" size={26} />} title="Jeden Tag" color={areaColor(area)} />
            <Tile active={freq === 'weekdays'} onClick={() => setFreq('weekdays')} icon={<IconGlyph name="list" size={26} />} title="An bestimmten Tagen" color={areaColor(area)} />
            <Tile active={freq === 'perWeek'} onClick={() => setFreq('perWeek')} icon={<IconGlyph name="flag" size={26} />} title="So oft pro Woche" text="Die Tage suchst du dir selbst aus" color={areaColor(area)} />
          </Tiles>
          {freq === 'weekdays' && (
            <div className="mt-6">
              <WeekdayChips value={days} onChange={setDays} />
            </div>
          )}
          {freq === 'perWeek' && (
            <div className="mt-8">
              <Stepper value={count} min={1} max={7} onChange={setCount} />
              <p className="mt-2 text-center text-slate-400">Mal pro Woche</p>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'qty',
      question: 'Wie misst du es?',
      validate: () => (qty && !(num(target) > 0) ? 'Bitte ein Tagesziel größer 0 eingeben.' : qty && !unit.trim() ? 'Bitte eine Einheit angeben.' : null),
      content: (
        <div>
          <Tiles>
            <Tile active={!qty} onClick={() => setQty(false)} icon={<IconGlyph name="check" size={26} />} title="Nur abhaken" text="Erledigt oder nicht" color={areaColor(area)} />
            <Tile active={qty} onClick={() => setQty(true)} icon={<IconGlyph name="clock" size={26} />} title="Menge erfassen" text="z. B. 30 Minuten, 10 Seiten" color={areaColor(area)} />
          </Tiles>
          {qty && (
            <div className="mt-6">
              <BigInput value={target} onChange={setTarget} inputMode="decimal" autoFocus={false} placeholder="30" suffix={unit} />
              <div className="mt-4 flex flex-wrap gap-2">
                {['min', 'h', 'Seiten', 'km', 'Gläser'].map((u) => (
                  <Chip key={u} active={unit === u} onClick={() => setUnit(u)}>
                    {u}
                  </Chip>
                ))}
              </div>
              <p className="mt-3 text-sm text-slate-500">Tagesziel: der Tag zählt erst, wenn dieser Wert erreicht ist.</p>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'mini',
      question: 'Gibt es eine Mini-Version für schlechte Tage?',
      hint: 'Optional. Hält deinen Streak, bringt aber nur halbe XP.',
      optional: true,
      content: <BigInput value={mini} onChange={setMini} placeholder="z. B. 2 Minuten dehnen" />,
    },
  ]

  async function finish() {
    const frequency: Frequency = freq === 'daily' ? { type: 'daily' } : freq === 'weekdays' ? { type: 'weekdays', days: [...days].sort() } : { type: 'perWeek', count }
    await saveHabit({
      name: name.trim(),
      icon,
      area,
      timeOfDay: time,
      frequency,
      unit: qty ? unit.trim() : undefined,
      dailyTarget: qty ? num(target) : undefined,
      miniVersion: mini.trim() || undefined,
    })
    onClose()
  }

  return <Wizard steps={steps} finishLabel="Gewohnheit anlegen" onFinish={finish} onClose={onClose} />
}
