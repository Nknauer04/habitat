import { useEffect, type FormEvent, type ReactNode } from 'react'

// Vollbild-Seite zum Bearbeiten (Gewohnheit, Ziel, Einheit): große Überschrift, Abschnitte, fester Fußbereich.
// Mac: Inhalt zentriert in einer breiten Spalte.
export default function EditShell({
  title,
  subtitle,
  onClose,
  onSubmit,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  onSubmit: (e: FormEvent) => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black" role="dialog" aria-modal="true" aria-label={title}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-40 h-[28rem]" style={{ background: 'radial-gradient(60% 50% at 50% 30%, rgb(31 220 240 / 0.16), transparent 75%)' }} />
      <header className="relative flex items-center gap-4 px-5 pb-2 pt-5">
        <button type="button" onClick={onClose} aria-label="Schließen" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-xl text-slate-300 active:bg-slate-800">
          ✕
        </button>
      </header>
      <form onSubmit={onSubmit} className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-xl px-6 pt-4">
          <h1 className="text-[2rem] font-bold leading-[1.1] tracking-tight sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-slate-400">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </form>
    </div>
  )
}

export const editLabel = 'mb-3 mt-8 block text-xs font-semibold uppercase tracking-wider text-slate-500'
export const editField =
  'w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3.5 text-lg outline-none focus:border-accent-500'
export const editChip = (active: boolean) =>
  `rounded-full border px-4 py-2.5 text-[15px] font-medium transition-colors ${
    active ? 'border-accent-500 bg-accent-500/15 text-accent-300' : 'border-slate-700 text-slate-300 hover:border-slate-500'
  }`
export const editFooter =
  'sticky bottom-0 -mx-6 mt-10 flex flex-wrap items-center gap-x-2 gap-y-3 bg-black/90 px-6 pb-[max(var(--safe-bottom),1rem)] pt-4 backdrop-blur'
export const primaryBtn = 'glow-accent rounded-full bg-accent-500 px-7 py-3 text-base font-semibold text-black'
