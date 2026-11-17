import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { db } from './db'
import { computeBadges, newBadges, reachedBadges, type BadgeGroup } from './badges'
import { useProgress } from './useProgress'

export function useBadges(today: Date): BadgeGroup[] | null {
  const habits = useLiveQuery(() => db.habits.filter((h) => !h.deleted).sortBy('createdAt'), [])
  const progress = useProgress(today)
  return useMemo(() => (habits && progress ? computeBadges(habits, progress) : null), [habits, progress])
}

// "Gesehen" merkt sich jedes Gerät für sich (nur eine Anzeige-Bequemlichkeit, nichts Wichtiges).
const KEY = 'habitat:seenBadges'

function read(): string[] | null {
  try {
    const v = localStorage.getItem(KEY)
    return v ? (JSON.parse(v) as string[]) : null
  } catch {
    return null
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    /* Speicher nicht verfügbar */
  }
}

// Neu erreichte Abzeichen für den Hinweis in "Heute". Beim ersten Start gilt alles Bestehende als gesehen.
export function useNewBadges(groups: BadgeGroup[] | null) {
  const [seen, setSeen] = useState<string[] | null>(read)

  useEffect(() => {
    if (groups && seen === null) {
      const ids = reachedBadges(groups).map((b) => b.id)
      write(ids)
      setSeen(ids)
    }
  }, [groups, seen])

  const fresh = groups ? newBadges(groups, seen) : []

  const dismiss = () => {
    const ids = [...new Set([...(seen ?? []), ...fresh.map((b) => b.id)])]
    write(ids)
    setSeen(ids)
  }

  return { fresh, dismiss }
}
