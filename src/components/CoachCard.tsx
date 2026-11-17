import type { Tip } from '../lib/coach'

// Tipp des Tages (regelbasiert, ohne KI)
export default function CoachCard({ tips, onDismiss }: { tips: Tip[]; onDismiss: () => void }) {
  return (
    <section aria-label="Tipp des Tages" className="mt-5 rounded-3xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-accent-400">Tipp des Tages</h2>
        <button
          onClick={onDismiss}
          aria-label="Tipp für heute ausblenden"
          className="-mr-1 px-1 text-lg leading-none text-slate-500 active:text-white"
        >
          ✕
        </button>
      </div>
      <ul className="mt-2 flex flex-col gap-2.5">
        {tips.map((t) => (
          <li key={t.id} className="flex gap-3">
            <span className="text-xl leading-snug">{t.icon}</span>
            <span className="text-[15px] leading-snug text-slate-200">{t.text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
