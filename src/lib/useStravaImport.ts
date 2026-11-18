import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef } from 'react'
import { db, now } from './db'
import { autoSyncStrava } from './strava'
import { planStravaEntries } from './stravaCore'

// Hält die Einträge der Einheiten aus den Strava-Aktivitäten aktuell (läuft in der App-Hülle, auf jeder Seite)
export function useStravaImport() {
  const strava = useLiveQuery(() => db.stravaActivities.toArray(), [])
  const activities = useLiveQuery(() => db.plans.filter((a) => !a.deleted).toArray(), [])
  const entries = useLiveQuery(() => db.planEntries.toArray(), []) // auch gelöschte: Entfernt bleibt entfernt
  const busy = useRef(false)

  useEffect(() => {
    if (!strava || !activities || !entries || busy.current) return
    const puts = planStravaEntries(strava, activities, entries, now())
    if (!puts.length) return
    busy.current = true
    void db.planEntries.bulkPut(puts).finally(() => {
      busy.current = false
    })
  }, [strava, activities, entries])

  // Neue Aktivitäten beim Start und beim Zurückkehren zur App holen
  useEffect(() => {
    void autoSyncStrava()
    const onVisible = () => document.visibilityState === 'visible' && void autoSyncStrava()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])
}
