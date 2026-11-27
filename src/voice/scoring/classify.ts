import type { FeedbackCode, PitchFrame, SpeakerRange, Tone, ToneResult } from '../types'
import { extractContour, toContourPoints, type ContourOptions } from './chao'

type T4 = 1 | 2 | 3 | 4
const N = 32

/** Piecewise-linear [x, chao] knots. Several realizations per tone (citation + common variants). */
const VARIANTS: Record<T4, [number, number][][]> = {
  1: [[[0, 5], [1, 5]], [[0, 4.5], [1, 4.5]]],
  2: [[[0, 3], [1, 5]], [[0, 3], [0.3, 2.7], [1, 5]], [[0, 2.5], [0.35, 2.3], [1, 4.5]]],
  3: [
    [[0, 2], [0.5, 1], [1, 4]], // full 214
    [[0, 2.2], [0.6, 1], [1, 2.5]], // isolated low dip 21(3)
    [[0, 2.5], [0.7, 1], [1, 1.5]], // 21 low fall (half third)
    [[0, 2.2], [0.55, 1], [1, 3.2]],
  ],
  4: [[[0, 5], [1, 1]], [[0, 5], [1, 2]], [[0, 5], [0.2, 5], [1, 1.5]]],
}

function sample(knots: [number, number][], n: number): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1)
    let j = 0
    while (j < knots.length - 2 && knots[j + 1][0] < x) j++
    const [x0, y0] = knots[j], [x1, y1] = knots[j + 1]
    out.push(y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1))
  }
  return out
}
const TEMPLATES: Record<T4, number[][]> = {
  1: VARIANTS[1].map((k) => sample(k, N)),
  2: VARIANTS[2].map((k) => sample(k, N)),
  3: VARIANTS[3].map((k) => sample(k, N)),
  4: VARIANTS[4].map((k) => sample(k, N)),
}

/** Weight on absolute level mismatch (range calibration is imperfect, so level is only partly trusted). */
const LEVEL_W = 0.35
const SIGMA = 0.7

function dist(y: number[], t: number[]): number {
  const n = y.length
  let md = 0
  for (let i = 0; i < n; i++) md += y[i] - t[i]
  md /= n
  let e = 0
  for (let i = 0; i < n; i++) e += (y[i] - t[i] - md) ** 2
  return Math.sqrt(e / n + LEVEL_W * md * md)
}

export interface ToneFeatures {
  start: number
  end: number
  mean: number
  min: number
  max: number
  /** 0..1 position of the minimum */
  minPos: number
  /** least-squares slope in Chao per unit time */
  slope: number
  /** residual std around the linear fit */
  wobble: number
  durationMs: number
}

export function features(y: number[], durationMs: number): ToneFeatures {
  const n = y.length
  const q = Math.max(1, Math.round(n * 0.15))
  const avg = (a: number[]) => a.reduce((p, c) => p + c, 0) / a.length
  const xs = y.map((_, i) => i / (n - 1))
  const mx = avg(xs), my = avg(y)
  let sxy = 0, sxx = 0
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (y[i] - my); sxx += (xs[i] - mx) ** 2 }
  const slope = sxy / sxx
  let r = 0
  for (let i = 0; i < n; i++) r += (y[i] - (my + slope * (xs[i] - mx))) ** 2
  let mi = 0
  for (let i = 1; i < n; i++) if (y[i] < y[mi]) mi = i
  return {
    start: avg(y.slice(0, q)), end: avg(y.slice(n - q)), mean: my,
    min: y[mi], max: Math.max(...y), minPos: mi / (n - 1), slope,
    wobble: Math.sqrt(r / n), durationMs,
  }
}

function feedbackFor(target: Tone, f: ToneFeatures, detected: T4): FeedbackCode[] {
  const fb: FeedbackCode[] = []
  const rise = f.end - f.min
  switch (target) {
    case 1:
      if (f.mean < 4) fb.push('start-higher')
      if (f.wobble > 0.3 || Math.abs(f.slope) > 0.9) fb.push('flatter')
      break
    case 2:
      if (f.start > 3.8) fb.push('start-lower')
      if (rise < 1.3 || f.slope < 1) fb.push('rise-more')
      else if (f.minPos > 0.45) fb.push('rise-more') // rising too late → sounds like tone 3
      if (f.end < 4.2 && !fb.includes('rise-more')) fb.push('end-higher')
      break
    case 3:
      if (f.min > 1.8) fb.push('dip-lower')
      if (f.start > 3.3) fb.push('start-lower')
      if (detected === 2 && !fb.includes('dip-lower')) fb.push('dip-lower')
      break
    case 4:
      if (f.start < 4.2) fb.push('start-higher')
      if (f.start - f.end < 2.5) fb.push('fall-deeper')
      else if (f.end > 2.3) fb.push('end-lower')
      break
    case 5:
      if (f.durationMs > 350) fb.push('too-short') // reused: neutral tone should be short; UI text explains
      if (f.mean > 3.5) fb.push('end-lower')
      break
  }
  return fb
}

/** Score an utterance against a target tone. Pure; safe on any input. */
export function scoreTone(frames: PitchFrame[], target: Tone, range: SpeakerRange, opts?: ContourOptions): ToneResult {
  const c = extractContour(frames, range, { points: N, ...opts })
  const zero = { 1: 0, 2: 0, 3: 0, 4: 0 }
  if (c.y.length === 0) {
    return { target, detected: null, score: 0, similarity: zero, contour: [], feedback: [c.voicedFrames === 0 ? 'no-voice' : 'too-short'] }
  }
  const contour = toContourPoints(c.y)
  if (c.durationMs < 100 || c.voicedFrames < 5) {
    return { target, detected: null, score: 0, similarity: zero, contour, feedback: ['too-short'] }
  }
  const d = {} as Record<T4, number>
  for (const k of [1, 2, 3, 4] as T4[]) d[k] = Math.min(...TEMPLATES[k].map((t) => dist(c.y, t)))
  const f = features(c.y, c.durationMs)
  // Tone 2 vs 3 disambiguation: a late, deep minimum is tone 3; an early shallow one is tone 2.
  const fallIn = f.start - f.min, riseOut = f.end - f.min
  if (fallIn > 0.7 && f.minPos > 0.35) d[2] += 0.3
  if (fallIn < 0.35 && riseOut > 0.6) d[3] += 0.3
  // pitch rate in semitones/second: level tones hardly move, fast falls are tone 4 even if truncated
  const semiSlope = (c.semis[c.semis.length - 1] - c.semis[0]) / Math.max(0.05, c.durationMs / 1000)
  if (Math.abs(semiSlope) > 10) d[1] += 0.4
  if (semiSlope < -15 && f.start > 3.5) d[4] -= 0.15
  const similarity = {} as Record<T4, number>
  for (const k of [1, 2, 3, 4] as T4[]) similarity[k] = Math.round(Math.exp(-(d[k] ** 2) / (2 * SIGMA * SIGMA)) * 1000) / 1000
  const detected = ([1, 2, 3, 4] as T4[]).reduce((a, b) => (d[b] < d[a] ? b : a))

  let score: number
  if (target === 5) {
    // neutral tone: short and not high/dynamic
    score = Math.round(100 * Math.min(1, 250 / Math.max(250, c.durationMs)) * (f.mean > 3.5 ? 0.6 : 1))
  } else {
    score = Math.round(100 * Math.exp(-(d[target] ** 2) / (2 * 0.9 * 0.9)))
    if (detected !== target) score = Math.min(score, 55)
  }
  let feedback = feedbackFor(target, f, detected)
  if (feedback.length === 0) feedback = score >= 70 || target === 5 ? ['good'] : (target === 1 ? ['flatter'] : [])
  if (feedback.length === 0) feedback = ['good']
  return { target, detected, score, similarity, contour, feedback }
}
