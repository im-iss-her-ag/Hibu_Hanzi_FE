/**
 * Streaming pitch tracker + voice activity detection. Pure (no DOM), so the
 * exact same code runs in the realtime engine and in offline tests.
 *
 *   push(samples) → onFrame(PitchFrame) every hop (default 20 ms = 50 Hz)
 *                 → onUtterance(PitchFrame[]) when ~320 ms of silence follow speech
 */
import type { PitchFrame } from '../types'
import { decimate, yin } from './yin'

export interface TrackerOptions {
  sampleRate: number
  /** frame hop in ms (default 20 → 50 frames/s) */
  hopMs?: number
  /** analysis window in ms (default 45; must hold ≥3 periods of minHz) */
  windowMs?: number
  minHz?: number
  maxHz?: number
  /** frames below this clarity get hz=null (default 0.5) */
  minClarity?: number
  /** silence after speech that ends an utterance (default 320 ms) */
  endSilenceMs?: number
  /** voiced utterances shorter than this are dropped (default 120 ms) */
  minUtteranceMs?: number
  /** force-end an utterance after this long (default 3000 ms) */
  maxUtteranceMs?: number
  /** absolute minimum RMS for speech (default 0.006) */
  minRms?: number
}

export interface TrackerEvents {
  onFrame?: (f: PitchFrame) => void
  onUtterance?: (frames: PitchFrame[]) => void
  onVoiced?: (voiced: boolean) => void
}

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export class PitchTracker {
  readonly sampleRate: number
  readonly hop: number
  private readonly win: number
  private readonly factor: number
  private readonly o: Required<Omit<TrackerOptions, 'sampleRate'>>
  private ring: Float32Array
  private ringPos = 0
  private filled = 0
  private sinceHop = 0
  private scratch = new Float32Array(1024)
  private dec: Float32Array | undefined
  private lin: Float32Array

  // VAD
  private noise = 0.002
  private inUtt = false
  private onCount = 0
  private silentMs = 0
  private uttStartMs = 0
  private clockMs = 0
  private frames: PitchFrame[] = []
  private preroll: { f: PitchFrame; at: number }[] = []
  // smoothing
  private rawHz: (number | null)[] = []
  private accepted: number[] = []

  constructor(opts: TrackerOptions, private ev: TrackerEvents = {}) {
    this.sampleRate = opts.sampleRate
    this.o = {
      hopMs: opts.hopMs ?? 20,
      windowMs: opts.windowMs ?? 45,
      minHz: opts.minHz ?? 70,
      maxHz: opts.maxHz ?? 500,
      minClarity: opts.minClarity ?? 0.5,
      endSilenceMs: opts.endSilenceMs ?? 320,
      minUtteranceMs: opts.minUtteranceMs ?? 120,
      maxUtteranceMs: opts.maxUtteranceMs ?? 3000,
      minRms: opts.minRms ?? 0.006,
    }
    this.hop = Math.round((this.sampleRate * this.o.hopMs) / 1000)
    this.win = Math.round((this.sampleRate * this.o.windowMs) / 1000)
    this.factor = Math.max(1, Math.floor(this.sampleRate / 16000))
    this.ring = new Float32Array(this.win)
    this.lin = new Float32Array(this.win)
  }

  get voiced() { return this.inUtt }

  /** feed mono samples (any block size) */
  push(samples: Float32Array) {
    for (let i = 0; i < samples.length; i++) {
      this.ring[this.ringPos] = samples[i]
      this.ringPos = (this.ringPos + 1) % this.win
      if (this.filled < this.win) this.filled++
      if (++this.sinceHop >= this.hop) {
        this.sinceHop = 0
        this.clockMs += this.o.hopMs
        if (this.filled >= this.win) this.analyze()
      }
    }
  }

  /** force-end: emits the pending utterance (if long enough) and resets VAD */
  flush() {
    if (this.inUtt) this.endUtterance()
  }

  reset() {
    this.inUtt = false
    this.frames = []
    this.preroll = []
    this.rawHz = []
    this.accepted = []
    this.onCount = 0
    this.silentMs = 0
  }

  private analyze() {
    // linearize ring
    const n = this.win
    for (let i = 0; i < n; i++) this.lin[i] = this.ring[(this.ringPos + i) % n]
    // remove DC + RMS
    let mean = 0
    for (let i = 0; i < n; i++) mean += this.lin[i]
    mean /= n
    let e = 0
    for (let i = 0; i < n; i++) { this.lin[i] -= mean; e += this.lin[i] * this.lin[i] }
    const rms = Math.sqrt(e / n)

    const onThr = Math.max(this.o.minRms, this.noise * 4)
    const offThr = onThr * 0.5

    let hz: number | null = null
    let clarity = 0
    if (rms >= offThr) {
      const dec = this.factor > 1 ? (this.dec = decimate(this.lin, this.factor, this.dec)) : this.lin
      const r = yin(dec, { sampleRate: this.sampleRate / this.factor, minHz: this.o.minHz, maxHz: this.o.maxHz }, this.scratch)
      clarity = r.clarity
      if (r.hz != null && clarity >= this.o.minClarity) hz = r.hz
    }
    hz = this.correct(hz)

    // --- VAD with hysteresis ---
    if (!this.inUtt) {
      // track noise floor only while not in speech
      if (rms < onThr) this.noise = this.noise * 0.97 + Math.min(rms, this.noise * 3) * 0.03
      this.onCount = rms >= onThr ? this.onCount + 1 : 0
      if (this.onCount >= 2 || (rms >= onThr && hz != null)) {
        this.inUtt = true
        this.silentMs = 0
        this.uttStartMs = this.preroll.length ? this.preroll[0].at : this.clockMs
        this.frames = this.preroll.map(p => ({ ...p.f, t: p.at - this.uttStartMs }))
        this.preroll = []
        this.ev.onVoiced?.(true)
      }
    }

    const t = this.inUtt ? this.clockMs - this.uttStartMs : this.clockMs
    const frame: PitchFrame = { t, hz, clarity, level: Math.min(1, rms) }

    if (this.inUtt) {
      this.frames.push(frame)
      const active = rms >= offThr || hz != null
      this.silentMs = active ? 0 : this.silentMs + this.o.hopMs
      this.ev.onFrame?.(frame)
      if (this.silentMs >= this.o.endSilenceMs || t >= this.o.maxUtteranceMs) this.endUtterance()
    } else {
      this.preroll.push({ f: frame, at: this.clockMs })
      if (this.preroll.length > 3) this.preroll.shift()
      this.ev.onFrame?.(frame)
    }
  }

  /** 3-point causal median + octave-jump correction against recent voiced history */
  private correct(hz: number | null): number | null {
    // No causal octave snapping here: a wrong onset would lock the whole utterance an octave off.
    // Live frames rely on YIN + 3-point median; finished utterances get cleanOctaves().
    this.rawHz.push(hz)
    if (this.rawHz.length > 3) this.rawHz.shift()
    if (hz == null) {
      if (!this.inUtt) this.accepted = []
      return null
    }
    const vals = this.rawHz.filter((v): v is number => v != null)
    const out = vals.length >= 2 ? median(vals) : hz
    this.accepted.push(hz)
    if (this.accepted.length > 15) this.accepted.shift()
    return out
  }

  private endUtterance() {
    const fr = this.frames
    this.inUtt = false
    this.frames = []
    this.silentMs = 0
    this.onCount = 0
    this.accepted = []
    this.rawHz = []
    this.ev.onVoiced?.(false)
    const trimmed = trimVoiced(cleanOctaves(fr))
    if (!trimmed.length) return
    const dur = trimmed[trimmed.length - 1].t - trimmed[0].t + this.o.hopMs
    if (dur < this.o.minUtteranceMs) return
    this.ev.onUtterance?.(trimmed)
  }
}

/**
 * Trim to the voiced part: first..last frame with hz, after removing isolated
 * voiced blips (<3 consecutive frames) at the edges. t is re-based to 0.
 */
export function trimVoiced(frames: PitchFrame[]): PitchFrame[] {
  const v = frames.map(f => f.hz != null)
  const runOk = (i: number) => {
    let n = 0
    for (let j = i; j < v.length && v[j]; j++) n++
    return n >= 3
  }
  let a = 0
  while (a < v.length && !(v[a] && runOk(a))) a++
  let b = v.length - 1
  while (b > a && !v[b]) b--
  // drop trailing blip
  while (b > a) {
    let k = b, n = 0
    while (k >= a && v[k]) { n++; k-- }
    if (n >= 3) break
    b = k
    while (b > a && !v[b]) b--
  }
  if (a >= v.length || b < a) return []
  const t0 = frames[a].t
  return frames.slice(a, b + 1).map(f => ({ ...f, t: f.t - t0 }))
}

const MULTS = [1, 2, 0.5, 3, 1 / 3]
/** Snap hz to the octave (×2, ×½, ×3, ×⅓) closest to ref when it is clearly off (>40 %) and the snap lands within 25 %. */
export function octaveFix(hz: number, ref: number): number {
  const off = Math.abs(Math.log(hz / ref))
  if (off < Math.log(1.4)) return hz
  let best = hz, bd = off
  for (const m of MULTS) {
    const dd = Math.abs(Math.log((hz * m) / ref))
    if (dd < bd) { bd = dd; best = hz * m }
  }
  return bd < Math.log(1.25) ? best : hz
}

/**
 * Non-causal clean-up for a finished utterance: compare each voiced frame to the
 * median of its voiced neighbours (±5 frames); fix octave errors, drop outliers.
 */
export function cleanOctaves(frames: PitchFrame[]): PitchFrame[] {
  const hz = frames.map(f => f.hz)
  const out = frames.map(f => ({ ...f }))
  for (let i = 0; i < hz.length; i++) {
    const h = hz[i]
    if (h == null) continue
    const nb: number[] = []
    for (let j = Math.max(0, i - 2); j <= Math.min(hz.length - 1, i + 2); j++) if (j !== i && hz[j] != null) nb.push(hz[j] as number)
    if (!nb.length) continue
    const ref = median(nb)
    const v = octaveFix(h, ref)
    out[i].hz = nb.length >= 2 && Math.abs(Math.log(v / ref)) > Math.log(1.45) ? null : v
  }
  // run-level: a whole voiced run an octave away from the utterance median (typical: creaky tone-3 bottom → subharmonic)
  const all = out.flatMap(f => (f.hz != null ? [f.hz] : []))
  if (all.length >= 5) {
    const M = median(all)
    let i = 0
    while (i < out.length) {
      if (out[i].hz == null) { i++; continue }
      let j = i
      while (j < out.length && out[j].hz != null) j++
      const rm = median(out.slice(i, j).map(f => f.hz as number))
      const m = rm < M * 0.55 && rm * 2 < M * 1.3 ? 2 : rm > M * 1.85 && rm / 2 > M * 0.6 ? 0.5 : 1
      if (m !== 1 && j - i < all.length / 2) for (let k = i; k < j; k++) out[k].hz = (out[k].hz as number) * m
      i = j
    }
  }
  dropIsolated(out)
  return out
}

/** Null short (≤3 frame) pitch segments that connect to neither neighbouring segment (creak / glitch). */
function dropIsolated(out: PitchFrame[]) {
  const segs: [number, number][] = []
  let start = -1, last = -1
  for (let i = 0; i < out.length; i++) {
    const h = out[i].hz
    if (h == null) continue
    const cont = last >= 0 && i - last <= 3 && Math.abs(Math.log(h / (out[last].hz as number))) < Math.log(1.2)
    if (!cont) { if (start >= 0) segs.push([start, last]); start = i }
    last = i
  }
  if (start >= 0) segs.push([start, last])
  if (segs.length < 2) return
  const len = (s: [number, number]) => out.slice(s[0], s[1] + 1).filter(f => f.hz != null).length
  const near = (a: number, b: number) => Math.abs(Math.log((out[a].hz as number) / (out[b].hz as number))) < Math.log(1.25)
  const kill: [number, number][] = []
  segs.forEach((sg, k) => {
    if (len(sg) > 3) return
    const prev = segs[k - 1], next = segs[k + 1]
    const okPrev = prev && near(prev[1], sg[0])
    const okNext = next && near(sg[1], next[0])
    if (!okPrev && !okNext) kill.push(sg)
  })
  for (const [a, b] of kill) for (let i = a; i <= b; i++) out[i].hz = null
}
