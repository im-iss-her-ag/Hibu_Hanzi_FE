import { useEffect, useRef } from 'react'
import type { ContourPoint, PitchFrame } from '../voice/types'
import { NATIVE_TEMPLATES, NATIVE_BAND, contourAt } from '../voice/scoring/nativeTemplates'

/** Mutable live state written by the trainer on every engine frame; read by the canvas each rAF. */
export interface LiveTrace {
  /** current (or last) utterance frames, already mapped to Chao (null = unvoiced) */
  points: { t: number; chao: number | null }[]
  lastChao: number | null
  lastAt: number
  level: number
  /** t of the first pitched frame of the current utterance */
  onset: number | null
}

/** expected syllable duration: the lane spans this until the user speaks longer, then everything compresses */
export const EXPECTED_MS = 640
const LANE_START = 0.04
const LANE_END = 0.96

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

/** Native mean contour (data-driven, see scoring/nativeTemplates.ts) — used for the lane and the live start hint. */
export function templateAt(tone: 1 | 2 | 3 | 4, x: number): number {
  return contourAt(NATIVE_TEMPLATES[tone], x)
}

/** Lane edges: native band (per-speaker 5–95%, union), widened to at least ±0.5 Chao around the mean. */
function bandAt(tone: 1 | 2 | 3 | 4, x: number): [number, number] {
  const m = templateAt(tone, x)
  return [Math.min(m - 0.5, contourAt(NATIVE_BAND[tone].lo, x)), Math.max(m + 0.5, contourAt(NATIVE_BAND[tone].hi, x))]
}

function readColors(el: HTMLElement, tone: number | null) {
  const cs = getComputedStyle(el)
  const v = (n: string) => cs.getPropertyValue(n).trim()
  return {
    ink: v('--ink'),
    ink3: v('--ink-3'),
    rule: v('--rule'),
    tone: tone ? v(`--tone-${tone}`) : v('--ink-3'),
    seal: v('--seal'),
  }
}

type XY = { x: number; y: number }

/** A display copy of the user's line in normalized lane space (x 0..1, y Chao). Never used for scoring. */
interface Stroke {
  pts: XY[]
  /** ms span the x axis currently represents (eased toward max(EXPECTED_MS, duration)) */
  span: number
}

/** frames → display stroke: drop pre-roll, bridge short unvoiced gaps, light smoothing (display only). */
function buildStroke(src: { t: number; chao: number | null }[], span: number): { pts: XY[]; dur: number; voiced: number } {
  const i0 = src.findIndex((p) => p.chao != null)
  if (i0 < 0) return { pts: [], dur: 0, voiced: 0 }
  const onset = src[i0].t
  const raw: { t: number; c: number; brk: boolean }[] = []
  let gap = 0
  let voiced = 0
  for (let i = i0; i < src.length; i++) {
    const p = src[i]
    if (p.chao == null) { gap++; continue }
    // gaps up to ~8 frames (≈160 ms) are bridged with a straight segment; longer gaps break the pen
    raw.push({ t: p.t - onset, c: p.chao, brk: gap > 8 })
    gap = 0
    voiced++
  }
  const dur = raw.length ? raw[raw.length - 1].t : 0
  // 5-point weighted moving average on the Chao value (keeps the shape, hides per-frame jitter)
  const pts: XY[] = []
  for (let i = 0; i < raw.length; i++) {
    let acc = 0
    let w = 0
    for (let k = -2; k <= 2; k++) {
      const j = i + k
      if (j < 0 || j >= raw.length) continue
      const wk = k === 0 ? 3 : Math.abs(k) === 1 ? 2 : 1
      acc += raw[j].c * wk
      w += wk
    }
    pts.push({ x: raw[i].t / span, y: acc / w, ...(raw[i].brk ? { brk: true } : {}) } as XY)
  }
  return { pts, dur, voiced }
}

export function ToneTrainerCanvas({ live, tone, result, listening, label, onPointer }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const propsRef = useRef({ tone, result, listening })
  propsRef.current = { tone, result, listening }

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let raf = 0
    let colors = readColors(canvas, propsRef.current.tone)
    let lastTone = propsRef.current.tone
    let colorTick = 0
    let dotY = NaN
    let lastNow = performance.now()

    // Size the backing store only when the box or DPR actually changes (assigning width clears the canvas).
    let cw = 0
    let ch = 0
    let dpr = 0
    const fit = () => {
      const d = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w === cw && h === ch && d === dpr) return
      cw = w; ch = h; dpr = d
      canvas.width = Math.max(1, Math.round(w * d))
      canvas.height = Math.max(1, Math.round(h * d))
    }
    const ro = new ResizeObserver(fit)
    ro.observe(canvas)

    // Display state, decoupled from the trainer's mutable buffer:
    // the trainer resets live.points on every VAD "voiced" (also on noise blips that never become an
    // utterance). We keep showing the previous line until the new buffer has real voice in it.
    let srcArr: unknown = null
    let cur: Stroke | null = null // what is on screen as "your voice"
    let ghost: XY[] | null = null // previous attempt, faint
    let curAlpha = 0
    let resultShown: ContourPoint[] | null = null
    let resultAlpha = 0

    const draw = () => {
      raf = requestAnimationFrame(draw)
      const now = performance.now()
      const dt = Math.min(100, now - lastNow)
      lastNow = now
      const still = !!reduce?.matches
      const ease = (k: number) => (still ? 1 : 1 - Math.exp(-dt / k)) // k = time constant in ms
      const { tone, result, listening } = propsRef.current
      if (++colorTick % 30 === 0 || tone !== lastTone) {
        colors = readColors(canvas, tone)
        lastTone = tone
      }
      fit()
      if (!cw || !ch) return

      // ---- update display model ----
      const L = live.current
      if (result && result.length > 1) {
        if (result !== resultShown) {
          resultShown = result
          resultAlpha = still ? 1 : 0
        }
        resultAlpha += (1 - resultAlpha) * ease(140)
      } else {
        if (resultShown) {
          // result dismissed (retry / next): it becomes the ghost until the next attempt draws
          ghost = resultShown.map((p) => ({ x: p.x, y: p.y }))
          resultShown = null
          cur = null
        }
        const pts = L.points
        const b = buildStroke(pts, cur?.span ?? EXPECTED_MS)
        const isNew = pts !== srcArr
        // a fresh buffer only takes over once it holds a few voiced frames (ignores clicks/breaths)
        if (b.voiced >= 4 || (!isNew && cur)) {
          if (isNew) {
            if (cur && cur.pts.length > 1) ghost = cur.pts
            srcArr = pts
            cur = { pts: [], span: EXPECTED_MS }
            curAlpha = still ? 1 : 0.35
          }
          const target = Math.max(EXPECTED_MS, b.dur + 20)
          cur!.span += (target - cur!.span) * ease(90)
          if (Math.abs(target - cur!.span) < 1) cur!.span = target
          cur!.pts = buildStroke(pts, cur!.span).pts
        }
        curAlpha += (1 - curAlpha) * ease(80)
      }

      // ---- layout ----
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cw, ch)
      const small = cw < 420
      const gutter = small ? 26 : 30
      const padR = 10
      const top = 12
      const bottom = ch - (small ? 22 : 24)
      const pw = cw - gutter - padR
      const X = (x: number) => gutter + (LANE_START + x * (LANE_END - LANE_START)) * pw
      const Y = (c: number) => top + ((5.5 - Math.max(0.5, Math.min(5.5, c))) / 5) * (bottom - top)

      // grid: faint level lines, mid level solid-ish
      ctx.font = '600 11px "Be Vietnam Pro", system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let c = 1; c <= 5; c++) {
        const y = Math.round(Y(c)) + 0.5
        ctx.strokeStyle = colors.rule
        ctx.lineWidth = 1
        ctx.globalAlpha = c === 3 ? 1 : 0.8
        ctx.setLineDash(c === 3 ? [] : [1, 4])
        ctx.beginPath()
        ctx.moveTo(gutter, y)
        ctx.lineTo(cw - padR, y)
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.fillStyle = colors.ink3
        ctx.fillText(String(c), gutter / 2, y)
      }
      ctx.setLineDash([])

      // lane: soft band + dashed native mean, in the tone colour
      if (tone) {
        ctx.save()
        ctx.fillStyle = colors.tone
        ctx.globalAlpha = 0.13
        ctx.beginPath()
        for (let i = 0; i <= 48; i++) {
          const x = i / 48
          const [, hi] = bandAt(tone, x)
          if (i === 0) ctx.moveTo(X(x), Y(hi))
          else ctx.lineTo(X(x), Y(hi))
        }
        for (let i = 48; i >= 0; i--) ctx.lineTo(X(i / 48), Y(bandAt(tone, i / 48)[0]))
        ctx.closePath()
        ctx.fill()
        ctx.beginPath()
        for (let i = 0; i <= 48; i++) {
          const x = i / 48
          if (i === 0) ctx.moveTo(X(x), Y(templateAt(tone, x)))
          else ctx.lineTo(X(x), Y(templateAt(tone, x)))
        }
        ctx.strokeStyle = colors.tone
        ctx.globalAlpha = 0.85
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.setLineDash([6, 5])
        ctx.stroke()
        ctx.restore()
      }

      // user line helpers
      const path = (pts: XY[]) => {
        ctx.beginPath()
        pts.forEach((p, i) => {
          const px = X(Math.min(1, p.x))
          const py = Y(p.y)
          if (i === 0 || (p as XY & { brk?: boolean }).brk) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        })
      }
      const stroke = (pts: XY[], alpha: number, width: number) => {
        if (pts.length < 2 || alpha <= 0.01) return
        ctx.save()
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = colors.ink
        ctx.globalAlpha = alpha
        // slight taper: thin lead-in, full weight for the body
        const n = pts.length
        const lead = Math.min(n - 1, 4)
        if (lead > 0) {
          ctx.lineWidth = width * 0.6
          path(pts.slice(0, lead + 1))
          ctx.stroke()
        }
        ctx.lineWidth = width
        path(pts.slice(lead))
        ctx.stroke()
        ctx.restore()
      }
      const head = (p: XY, alpha: number, glow: boolean) => {
        const px = X(Math.min(1, p.x))
        const py = Y(p.y)
        ctx.save()
        ctx.globalAlpha = alpha
        if (glow) {
          ctx.globalAlpha = alpha * 0.22
          ctx.fillStyle = colors.seal
          ctx.beginPath()
          ctx.arc(px, py, 9, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = alpha
        }
        ctx.fillStyle = glow ? colors.seal : colors.ink
        ctx.beginPath()
        ctx.arc(px, py, glow ? 4 : 3.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      const fresh = listening && L.lastChao != null && now - L.lastAt < 300
      if (resultShown) {
        const rp = resultShown.map((p) => ({ x: p.x, y: p.y }))
        // live line fades out while the scored contour fades in, so there is never an empty frame
        if (cur && resultAlpha < 0.99) stroke(cur.pts, Math.min(1, 4 * (1 - resultAlpha)), 3)
        stroke(rp, resultAlpha, 3)
        head(rp[0], resultAlpha, false)
        head(rp[rp.length - 1], resultAlpha, false)
      } else {
        if (ghost) stroke(ghost, cur && cur.pts.length > 1 ? 0.18 : 0.32, 2.5)
        if (cur && cur.pts.length > 1) {
          stroke(cur.pts, curAlpha, 3)
          const last = cur.pts[cur.pts.length - 1]
          const drawing = fresh && srcArr === L.points
          head(last, curAlpha, drawing)
        }
      }

      // current pitch marker on the axis (eased so it glides)
      if (fresh) {
        const ty = Y(L.lastChao!)
        dotY = Number.isNaN(dotY) || still ? ty : dotY + (ty - dotY) * ease(40)
      }
      if (!Number.isNaN(dotY) && !resultShown) {
        ctx.globalAlpha = fresh ? 1 : 0.25
        ctx.fillStyle = colors.seal
        ctx.beginPath()
        ctx.moveTo(gutter + 1, dotY)
        ctx.lineTo(gutter - 5, dotY - 4)
        ctx.lineTo(gutter - 5, dotY + 4)
        ctx.closePath()
        ctx.fill()
        ctx.globalAlpha = 1
      }

      // legend (bottom-right): dashed tone = Mẫu, solid ink = Giọng bạn
      ctx.font = '500 11px "Be Vietnam Pro", system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      const ly = ch - 10
      const items: [string, () => void][] = [
        ['Mẫu', () => { ctx.strokeStyle = colors.tone; ctx.lineWidth = 2; ctx.setLineDash([4, 3]) }],
        ['Giọng bạn', () => { ctx.strokeStyle = colors.ink; ctx.lineWidth = 2.5; ctx.setLineDash([]) }],
      ]
      let lx = cw - padR
      for (let i = items.length - 1; i >= 0; i--) {
        const [txt, style] = items[i]
        const tw = ctx.measureText(txt).width
        lx -= tw
        ctx.fillStyle = colors.ink3
        ctx.fillText(txt, lx, ly)
        lx -= 22
        if (tone || i === 1) {
          ctx.save()
          style()
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(lx, ly)
          ctx.lineTo(lx + 16, ly)
          ctx.stroke()
          ctx.restore()
        }
        lx -= 12
      }
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [live])

  const toChao = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    const y = (e.clientY - r.top - 12) / (r.height - 12 - (r.width < 420 ? 22 : 24))
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
