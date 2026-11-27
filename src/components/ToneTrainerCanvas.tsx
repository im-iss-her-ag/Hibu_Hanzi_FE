import { useEffect, useRef } from 'react'
import type { ContourPoint, PitchFrame } from '../voice/types'
import { TONE_TEMPLATES } from '../voice/types'

/** Mutable live state written by the trainer on every engine frame; read by the canvas each rAF. */
export interface LiveTrace {
  /** current (or last) utterance frames, already mapped to Chao (null = unvoiced) */
  points: { t: number; chao: number | null }[]
  lastChao: number | null
  lastAt: number
  level: number
}

export const LIVE_WINDOW_MS = 1100
const LANE_START = 0.04
const LANE_END_LIVE = 0.62 // template spans ~640 ms of the live window

interface Props {
  live: React.MutableRefObject<LiveTrace>
  tone: 1 | 2 | 3 | 4 | null
  /** when set, draws the finished comparison instead of the live trace */
  result: ContourPoint[] | null
  /** fade the mic-driven dot when not listening */
  listening: boolean
  label: string
  onPointer?: (chao: number | null) => void
}

export function templateAt(tone: 1 | 2 | 3 | 4, x: number): number {
  const pts = TONE_TEMPLATES[tone]
  if (x <= 0) return pts[0].y
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i].x) {
      const a = pts[i - 1]
      const b = pts[i]
      return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x || 1)
    }
  }
  return pts[pts.length - 1].y
}

function readColors(el: HTMLElement, tone: number | null) {
  const cs = getComputedStyle(el)
  const v = (n: string) => cs.getPropertyValue(n).trim()
  return {
    ink: v('--ink'),
    ink3: v('--ink-3'),
    ink4: v('--ink-4'),
    rule: v('--rule'),
    sheet: v('--sheet'),
    tone: tone ? v(`--tone-${tone}`) : v('--ink-3'),
    seal: v('--seal'),
  }
}

export function ToneTrainerCanvas({ live, tone, result, listening, label, onPointer }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const propsRef = useRef({ tone, result, listening })
  propsRef.current = { tone, result, listening }

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let n = 0
    let colors = readColors(canvas, propsRef.current.tone)
    let lastTone = propsRef.current.tone
    let dotY = NaN

    const draw = () => {
      raf = requestAnimationFrame(draw)
      const { tone, result, listening } = propsRef.current
      if (++n % 30 === 0 || tone !== lastTone) {
        colors = readColors(canvas, tone)
        lastTone = tone
      }
      const dpr = window.devicePixelRatio || 1
      const cw = canvas.clientWidth
      const ch = canvas.clientHeight
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
        canvas.width = Math.round(cw * dpr)
        canvas.height = Math.round(ch * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cw, ch)

      const gutter = 34
      const padR = 12
      const top = 14
      const bottom = ch - 14
      const pw = cw - gutter - padR
      const X = (x: number) => gutter + x * pw
      const Y = (c: number) => top + ((5.5 - Math.max(0.5, Math.min(5.5, c))) / 5) * (bottom - top)
      const laneW = Math.max(14, (bottom - top) / 5 * 0.62)

      // grid + labels
      ctx.font = '600 11px "Be Vietnam Pro", system-ui, sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      for (let c = 1; c <= 5; c++) {
        const y = Math.round(Y(c)) + 0.5
        ctx.strokeStyle = colors.rule
        ctx.lineWidth = 1
        ctx.setLineDash(c === 3 ? [] : [2, 4])
        ctx.beginPath()
        ctx.moveTo(gutter, y)
        ctx.lineTo(cw - padR, y)
        ctx.stroke()
        ctx.fillStyle = colors.ink3
        ctx.fillText(String(c), gutter - 12, y)
      }
      ctx.setLineDash([])

      // ghost lane
      const x0 = LANE_START
      const x1 = result ? 0.96 : LANE_END_LIVE
      if (tone) {
        ctx.save()
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = colors.tone
        ctx.globalAlpha = 0.16
        ctx.lineWidth = laneW
        ctx.beginPath()
        for (let i = 0; i <= 40; i++) {
          const x = i / 40
          const px = X(x0 + x * (x1 - x0))
          const py = Y(templateAt(tone, x))
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
        ctx.globalAlpha = 0.55
        ctx.lineWidth = 1.5
        ctx.setLineDash([5, 5])
        ctx.stroke()
        ctx.restore()
      }

      // user line
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      if (result && result.length > 1) {
        ctx.strokeStyle = colors.ink
        ctx.lineWidth = 3
        ctx.beginPath()
        result.forEach((p, i) => {
          const px = X(x0 + p.x * (x1 - x0))
          const py = Y(p.y)
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        })
        ctx.stroke()
        const a = result[0]
        const b = result[result.length - 1]
        ctx.fillStyle = colors.ink
        for (const p of [a, b]) {
          ctx.beginPath()
          ctx.arc(X(x0 + p.x * (x1 - x0)), Y(p.y), 3.5, 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        const pts = live.current.points
        const lastT = pts.length ? pts[pts.length - 1].t : 0
        const span = Math.max(LIVE_WINDOW_MS, lastT / (1 - x0 - 0.02))
        ctx.strokeStyle = colors.ink
        ctx.lineWidth = 3
        let pen = false
        let gap = 0
        ctx.beginPath()
        for (const p of pts) {
          if (p.chao == null) {
            // bridge short dropouts (fast tone-4 falls) instead of breaking the line
            if (++gap > 4) pen = false
            continue
          }
          gap = 0
          const px = X(x0 + p.t / span)
          const py = Y(p.chao)
          if (!pen) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
          pen = true
        }
        ctx.stroke()
      }

      // current pitch dot on the Y axis (eased so it glides)
      const L = live.current
      const fresh = listening && L.lastChao != null && performance.now() - L.lastAt < 400
      if (fresh) {
        const ty = Y(L.lastChao!)
        dotY = Number.isNaN(dotY) ? ty : dotY + (ty - dotY) * 0.45
      }
      if (!Number.isNaN(dotY) && !result) {
        ctx.globalAlpha = fresh ? 1 : 0.25
        ctx.fillStyle = colors.seal
        ctx.beginPath()
        ctx.arc(gutter - 3, dotY, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [live])

  const toChao = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    const y = (e.clientY - r.top - 14) / (r.height - 28)
    return 5.5 - y * 5
  }

  return (
    <canvas
      ref={ref}
      className="tt-canvas"
      role="img"
      aria-label={label}
      onPointerDown={onPointer ? (e) => { (e.target as Element).setPointerCapture(e.pointerId); onPointer(toChao(e)) } : undefined}
      onPointerMove={onPointer ? (e) => e.buttons && onPointer(toChao(e)) : undefined}
      onPointerUp={onPointer ? () => onPointer(null) : undefined}
    />
  )
}

export type { PitchFrame }
