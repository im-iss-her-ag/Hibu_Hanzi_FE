import type { ChaoValue, ContourPoint, PitchFrame, SpeakerRange } from '../types'

/** Default range used before calibration (a mid voice, ~1.3 octaves). */
export const DEFAULT_RANGE: SpeakerRange = { lowHz: 110, highHz: 330, source: 'default' }

const st = (hz: number, ref: number) => 12 * Math.log2(hz / ref)

/** Hz → Chao 1..5 on a semitone scale spanning the speaker range. Clamped to [0.5, 5.5]. */
export function hzToChao(hz: number, range: SpeakerRange): ChaoValue {
  const span = Math.max(3, st(range.highHz, range.lowHz))
  const y = 1 + (4 * st(hz, range.lowHz)) / span
  return Math.min(5.5, Math.max(0.5, y))
}

/** Inverse of hzToChao (unclamped), handy for drawing. */
export function chaoToHz(y: ChaoValue, range: SpeakerRange): number {
  const span = Math.max(3, st(range.highHz, range.lowHz))
  return range.lowHz * Math.pow(2, ((y - 1) * span) / 4 / 12)
}

export interface ContourOptions {
  minClarity?: number
  /** fraction trimmed from each end of the voiced span */
  trim?: number
  /** resample size */
  points?: number
  /** max unvoiced gap (ms) bridged inside one syllable */
  maxGapMs?: number
}

export interface Contour {
  /** resampled Chao values (length = points), empty when not enough voice */
  y: number[]
  /** same in semitones relative to range.lowHz */
  semis: number[]
  /** voiced duration in ms (before trimming) */
  durationMs: number
  voicedFrames: number
}

function median(a: number[]): number {
  const s = [...a].sort((p, q) => p - q)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function medianFilter(a: number[], w: number): number[] {
  const h = w >> 1
  return a.map((_, i) => median(a.slice(Math.max(0, i - h), Math.min(a.length, i + h + 1))))
}

function movingAvg(a: number[], w: number): number[] {
  const h = w >> 1
  return a.map((_, i) => {
    const s = a.slice(Math.max(0, i - h), Math.min(a.length, i + h + 1))
    return s.reduce((p, q) => p + q, 0) / s.length
  })
}

/** Linear-interpolate (x,v) samples (x ascending) onto n evenly spaced points over [x0,x1]. */
function resample(xs: number[], vs: number[], n: number): number[] {
  const out: number[] = []
  const x0 = xs[0], x1 = xs[xs.length - 1]
  let j = 0
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? x0 : x0 + ((x1 - x0) * i) / (n - 1)
    while (j < xs.length - 2 && xs[j + 1] < x) j++
    const a = xs[j], b = xs[j + 1] ?? a
    const f = b > a ? Math.min(1, Math.max(0, (x - a) / (b - a))) : 0
    out.push(vs[j] + f * ((vs[j + 1] ?? vs[j]) - vs[j]))
  }
  return out
}

/**
 * PitchFrame[] → cleaned, normalized contour.
 * Steps: keep confident voiced frames → take the main voiced region (bridging short gaps)
 * → octave-jump repair against the median → outlier removal → trim onset/offset
 * → smoothing → resample to N points.
 */
export function extractContour(frames: PitchFrame[], range: SpeakerRange, opts: ContourOptions = {}): Contour {
  const minClarity = opts.minClarity ?? 0.5
  const trim = opts.trim ?? 0.1
  const n = opts.points ?? 32
  const maxGap = opts.maxGapMs ?? 120
  const empty: Contour = { y: [], semis: [], durationMs: 0, voicedFrames: 0 }
  const v = frames.filter((f) => f.hz != null && f.hz > 40 && f.hz < 1200 && f.clarity >= minClarity)
  if (v.length < 3) return { ...empty, voicedFrames: v.length }

  // group into runs separated by gaps > maxGap; keep the run with most frames (+ neighbours close enough)
  const runs: PitchFrame[][] = [[v[0]]]
  for (let i = 1; i < v.length; i++) {
    if (v[i].t - v[i - 1].t > maxGap) runs.push([])
    runs[runs.length - 1].push(v[i])
  }
  const run = runs.reduce((a, b) => (b.length > a.length ? b : a))
  if (run.length < 3) return { ...empty, voicedFrames: run.length }

  const ts = run.map((f) => f.t)
  let s: number[] = run.map((f) => st(f.hz as number, range.lowHz))
  // octave repair: a frame-to-frame jump of ~an octave (>9 st) is a detector error, not a tone
  // (real tone-4 falls are steep but continuous). Fold it back towards the previous frame.
  for (let i = 1; i < s.length; i++) {
    while (s[i] - s[i - 1] > 9) s[i] -= 12
    while (s[i - 1] - s[i] > 9) s[i] += 12
  }
  // if the folding drifted the whole contour off by an octave, re-centre on the raw median
  const rawMed = median(run.map((f) => st(f.hz as number, range.lowHz)))
  const shiftOct = Math.round((rawMed - median(s)) / 12) * 12
  if (shiftOct) s = s.map((x) => x + shiftOct)
  // spike removal: replace frames > 3 st off a 5-pt median with the median
  const mf = medianFilter(s, 5)
  s = s.map((x, i) => (Math.abs(x - mf[i]) > 3 ? mf[i] : x))

  const durationMs = ts[ts.length - 1] - ts[0]
  // trim unreliable onset/offset
  // the onset carries consonant transitions; the offset carries creak / decay but also the end of
  // rises, so trim it less
  let a = Math.floor(s.length * trim), b = s.length - Math.floor(s.length * trim * 0.5)
  if (b - a < 3) { a = 0; b = s.length }
  const tt = ts.slice(a, b)
  let ss = s.slice(a, b)
  ss = movingAvg(medianFilter(ss, 3), 3)
  const semis = resample(tt, ss, n)
  const span = Math.max(3, st(range.highHz, range.lowHz))
  const y = semis.map((x) => Math.min(5.5, Math.max(0.5, 1 + (4 * x) / span)))
  return { y, semis, durationMs, voicedFrames: run.length }
}

export function toContourPoints(y: number[]): ContourPoint[] {
  return y.map((v, i) => ({ x: y.length > 1 ? i / (y.length - 1) : 0, y: v }))
}

/** Estimate a speaker range from several utterances (e.g. a calibration set): 5th..95th percentile of voiced Hz. */
export function estimateRange(utterances: PitchFrame[][], minClarity = 0.5): SpeakerRange {
  const hz = utterances.flatMap((u) => u.filter((f) => f.hz != null && f.clarity >= minClarity).map((f) => f.hz as number))
  if (hz.length < 10) return DEFAULT_RANGE
  const s = hz.sort((p, q) => p - q)
  const lo = s[Math.floor(s.length * 0.05)], hi = s[Math.floor(s.length * 0.95)]
  return { lowHz: lo, highHz: Math.max(hi, lo * 1.4), source: 'calibrated' }
}
