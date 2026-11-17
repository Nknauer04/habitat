import { useSyncExternalStore } from 'react'

// Einstellungen des Coachs (nur lokal): ein/aus und "heute weggeklickt"
const OFF_KEY = 'habitat:coachOff'
const DISMISS_KEY = 'habitat:coachDismissed'
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

const get = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const set = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k)
    else localStorage.setItem(k, v)
  } catch {
    /* Speicher nicht verfügbar */
  }
  notify()
}

export const setCoachEnabled = (on: boolean) => set(OFF_KEY, on ? null : '1')
export const dismissCoachFor = (dayKey: string) => set(DISMISS_KEY, dayKey)

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const useCoachEnabled = () => useSyncExternalStore(subscribe, () => get(OFF_KEY) !== '1')
export const useCoachDismissedDay = () => useSyncExternalStore(subscribe, () => get(DISMISS_KEY))
