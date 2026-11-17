import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { setAreaRows, useAreaVersion } from './areas'
import { db } from './db'

// Befüllt das Bereichs-Register aus der Datenbank; gibt eine Versionsnummer zurück, die sich bei Änderungen erhöht.
export function useAreaRegistry() {
  const rows = useLiveQuery(() => db.areas.toArray(), [])
  useEffect(() => {
    if (rows) setAreaRows(rows)
  }, [rows])
  return useAreaVersion()
}
