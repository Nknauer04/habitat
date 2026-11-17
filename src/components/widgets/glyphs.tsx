import { IconGlyph } from '../ItemIcon'

// Emoji-Symbole der Texte (Coach, Abzeichen) → Linien-Icons mit Farbe, damit die Oberfläche einheitlich bleibt.
const MAP: Record<string, { glyph: string; color: string }> = {
  '🔥': { glyph: 'fire', color: '#fb923c' },
  '📉': { glyph: 'trend', color: '#f87171' },
  '🗓️': { glyph: 'calendar', color: '#60a5fa' },
  '🌙': { glyph: 'moon', color: '#a5b4fc' },
  '🎯': { glyph: 'target', color: '#1fdcf0' },
  '⏱️': { glyph: 'clock', color: '#fbbf24' },
  '⏳': { glyph: 'clock', color: '#fbbf24' },
  '🥉': { glyph: 'medal', color: '#d97706' },
  '🥈': { glyph: 'medal', color: '#cbd5e1' },
  '🥇': { glyph: 'medal', color: '#facc15' },
  '🏅': { glyph: 'medal', color: '#facc15' },
  '🏆': { glyph: 'trophy', color: '#facc15' },
  '☀️': { glyph: 'sun', color: '#fbbf24' },
  '🎉': { glyph: 'sparkle', color: '#f472b6' },
  '💡': { glyph: 'bulb', color: '#fde047' },
  '😌': { glyph: 'leaf', color: '#4ade80' },
  '📋': { glyph: 'list', color: '#1fdcf0' },
  '⭐': { glyph: 'star', color: '#facc15' },
}

// Rundes Symbol für ein Emoji aus den Texten; unbekannte Emojis bleiben Emojis
export function EmojiGlyph({ emoji, size = 36 }: { emoji: string; size?: number }) {
  const m = MAP[emoji]
  if (!m) return <span style={{ fontSize: size * 0.55, lineHeight: 1 }}>{emoji}</span>
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size, borderRadius: size * 0.34, color: m.color, background: `color-mix(in srgb, ${m.color} 15%, transparent)` }}
    >
      <IconGlyph name={m.glyph} size={Math.round(size * 0.55)} />
    </span>
  )
}

export const TIER_COLORS = ['#d97706', '#cbd5e1', '#facc15'] as const

// Medaille je Stufe (0 = Bronze, 1 = Silber, 2 = Gold)
export const TierMedal = ({ tier, size = 20 }: { tier: 0 | 1 | 2; size?: number }) => (
  <span style={{ color: TIER_COLORS[tier] }} className="inline-flex align-middle" aria-hidden>
    <IconGlyph name="medal" size={size} />
  </span>
)

export const StreakChip = ({ streak, unit, freezes }: { streak: number; unit: 'Tage' | 'Wochen'; freezes: number }) =>
  streak > 0 ? (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1 font-semibold text-orange-400">
        <IconGlyph name="fire" size={15} />
        {streak} {unit === 'Tage' ? 'T' : 'Wo.'}
      </span>
      {freezes > 0 && (
        <span className="inline-flex items-center gap-0.5 font-semibold text-sky-300">
          <IconGlyph name="snow" size={14} />
          {freezes}
        </span>
      )}
    </span>
  ) : null
