import { useEffect, useRef } from 'react'
import { celebrateSound, dismissCelebration, useCurrentCelebration } from '../lib/celebrate'
import { IconGlyph } from './ItemIcon'

const COLORS = ['#1fdcf0', '#2b6bff', '#a78bfa', '#f472b6', '#facc15', '#60a5fa']
const SHOW_MS = 3400

// Kurzer, dezenter Jubel-Ton (Web Audio), nur wenn in den Einstellungen eingeschaltet
function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = f
      const t = ctx.currentTime + i * 0.11
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.16, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + 0.4)
    })
    setTimeout(() => void ctx.close(), 1500)
  } catch {
    /* Ton nicht verfügbar */
  }
}

// Konfetti auf einem Canvas (ohne Bibliothek): Teilchen fallen mit Schwerkraft und Luftwiderstand
function runConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = (canvas.width = window.innerWidth * dpr)
  const h = (canvas.height = window.innerHeight * dpr)
  const parts = Array.from({ length: 150 }, () => {
    const fromLeft = Math.random() < 0.5
    return {
      x: (fromLeft ? 0.1 : 0.9) * w + (Math.random() - 0.5) * 0.15 * w,
      y: h * 0.55,
      vx: (fromLeft ? 1 : -1) * (2 + Math.random() * 7) * dpr,
      vy: -(8 + Math.random() * 13) * dpr,
      size: (5 + Math.random() * 6) * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      round: Math.random() < 0.3,
    }
  })
  let raf = 0
  const start = performance.now()
  const tick = (now: number) => {
    const age = now - start
    ctx.clearRect(0, 0, w, h)
    for (const p of parts) {
      p.vy += 0.38 * dpr
      p.vx *= 0.99
      p.vy *= 0.992
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      ctx.save()
      ctx.globalAlpha = Math.max(0, Math.min(1, (SHOW_MS - age) / 700))
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      if (p.round) {
        ctx.beginPath()
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
        ctx.fill()
      } else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
      ctx.restore()
    }
    if (age < SHOW_MS) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

// Glückwunsch-Karte mit Konfetti; mehrere Erfolge laufen nacheinander
export default function CelebrationHost() {
  const c = useCurrentCelebration()
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!c) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const stop = !reduce && canvas.current ? runConfetti(canvas.current) : () => {}
    if (celebrateSound()) chime()
    try {
      navigator.vibrate?.([40, 60, 40]) // iOS erlaubt das für Web-Apps nicht; anderswo ein kurzes Brummen
    } catch {
      /* nicht verfügbar */
    }
    const timer = setTimeout(dismissCelebration, SHOW_MS)
    return () => {
      stop()
      clearTimeout(timer)
    }
  }, [c])

  if (!c) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[80]" role="status" aria-live="polite">
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-hidden />
      <div className="absolute inset-0 flex items-center justify-center px-8">
        <button
          type="button"
          onClick={dismissCelebration}
          className="animate-pop pointer-events-auto w-full max-w-sm rounded-[2rem] border border-slate-700 p-7 text-center shadow-2xl"
          style={{ background: `radial-gradient(120% 120% at 50% 0%, color-mix(in srgb, ${c.color} 22%, transparent), transparent 60%), var(--color-slate-900)`, boxShadow: `0 0 60px -10px ${c.color}` }}
        >
          <span aria-hidden className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl" style={{ color: c.color, background: `color-mix(in srgb, ${c.color} 16%, transparent)` }}>
            <IconGlyph name={c.glyph} size={44} />
          </span>
          <span className="mt-5 block text-3xl font-bold tracking-tight">{c.title}</span>
          {c.text && <span className="mt-2 block text-base text-slate-300">{c.text}</span>}
        </button>
      </div>
    </div>
  )
}
