import { useEffect, useState } from 'react'
import { dayKey } from './db'

// Liefert "heute" und aktualisiert sich nach Mitternacht bzw. beim Zurückkehren zur App.
export function useToday() {
  const [today, setToday] = useState(() => new Date())
  useEffect(() => {
    const update = () => setToday((prev) => (dayKey(prev) === dayKey() ? prev : new Date()))
    const id = setInterval(update, 60_000)
    document.addEventListener('visibilitychange', update)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])
  return today
}
