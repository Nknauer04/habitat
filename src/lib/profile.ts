import { useSyncExternalStore } from 'react'

// Anzeigename im Profil (nur lokal gespeichert, reine Anzeige)
const KEY = 'habitat:name'
const DEFAULT_NAME = 'Niklas'
const listeners = new Set<() => void>()

const read = () => {
  try {
    return localStorage.getItem(KEY) || DEFAULT_NAME
  } catch {
    return DEFAULT_NAME
  }
}

export function setProfileName(name: string) {
  try {
    const v = name.trim()
    if (v) localStorage.setItem(KEY, v)
    else localStorage.removeItem(KEY)
  } catch {
    /* Speicher nicht verfügbar */
  }
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const useProfileName = () => useSyncExternalStore(subscribe, read)
