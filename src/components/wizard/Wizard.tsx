import { useEffect, useState, type FormEvent, type ReactNode } from 'react'

export interface WizardStep {
  key: string
  question: string // große Frage oben
  hint?: string // kleine Erklärung darunter
  optional?: boolean
  validate?: () => string | null // Fehlermeldung oder null
  content: ReactNode
}

// Vollbild-Assistent: eine Frage pro Seite, Fortschrittsbalken, großer Weiter-Button.
// Mac: Inhalt zentriert in einer breiten Spalte.
export default function Wizard({
  steps,
  finishLabel,
  onFinish,
  onClose,
}: {
  steps: WizardStep[]
  finishLabel: string
  onFinish: () => Promise<string | null | void> | string | null | void // Fehlertext oder nichts
  onClose: () => void
}) {
  const [idx, setIdx] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const step = steps[Math.min(idx, steps.length - 1)]
  const last = idx >= steps.length - 1

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function next(e?: FormEvent) {
    e?.preventDefault()
    const problem = step.validate?.() ?? null
    if (problem) return setError(problem)
    setError('')
    if (!last) return setIdx((i) => i + 1)
    setBusy(true)
    try {
      const fail = await onFinish()
      if (typeof fail === 'string' && fail) setError(fail)
    } finally {
      setBusy(false)
    }
  }

  const back = () => {
    setError('')
    setIdx((i) => Math.max(0, i - 1))
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black" role="dialog" aria-modal="true" aria-label={step.question}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-[30rem]"
        style={{ background: 'radial-gradient(60% 50% at 50% 30%, rgb(31 220 240 / 0.20), transparent 75%)' }}
      />

      <header className="relative flex items-center gap-4 px-5 pb-2 pt-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Abbrechen"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-xl text-slate-300 active:bg-slate-800"
        >
          ✕
        </button>
        <div className="flex flex-1 gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={idx + 1} aria-label="Fortschritt">
          {steps.map((s, i) => (
            <span key={s.key} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= idx ? 'bg-accent-500' : 'bg-slate-800'}`} />
          ))}
        </div>
        <span className="w-11 shrink-0 text-right text-sm tabular-nums text-slate-500">
          {idx + 1}/{steps.length}
        </span>
      </header>

      <form onSubmit={next} className="relative flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-6">
          <div className="mx-auto flex min-h-full w-full max-w-xl flex-col lg:justify-center">
            <h1 className="text-[2rem] font-bold leading-[1.1] tracking-tight sm:text-5xl">{step.question}</h1>
            {step.hint && <p className="mt-3 text-base text-slate-400">{step.hint}</p>}
            <div className="mt-8">{step.content}</div>
            {error && (
              <p role="alert" className="mt-5 text-base text-red-400">
                {error}
              </p>
            )}
          </div>
        </div>

        <footer className="px-6 pb-[max(var(--safe-bottom),1.25rem)] pt-3">
          <div className="mx-auto flex w-full max-w-xl gap-3">
            {idx > 0 && (
              <button
                type="button"
                onClick={back}
                aria-label="Zurück"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-slate-700 text-2xl text-slate-200 active:bg-slate-800"
              >
                ‹
              </button>
            )}
            <button
              type="submit"
              disabled={busy}
              className="glow-accent h-14 flex-1 rounded-full bg-accent-500 text-lg font-semibold text-black transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {last ? finishLabel : step.optional ? 'Weiter / Überspringen' : 'Weiter'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}
