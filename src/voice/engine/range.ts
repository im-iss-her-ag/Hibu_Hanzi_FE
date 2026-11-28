/**
 * Speaker pitch range: default guess → calibration → adaptive update.
 * Persisted in localStorage "hibu_voice_range_v1".
 */
import type { PitchFrame, SpeakerRange } from '../types'
import { extractContour } from '../scoring/chao'

export const RANGE_STORAGE_KEY = 'hibu_voice_range_v1'
export type VoiceGuess = 'unknown' | 'male' | 'female' | 'child'

const DEFAULTS: Record<VoiceGuess, [number, number]> = {
  unknown: [80, 220],
  male: [85, 180],
  female: [160, 340],
  child: [220, 450],
}

interface Stored { range: SpeakerRange; history: number[] }
const MAX_HISTORY = 1500 // ~30 s of voiced frames at 50 Hz
const MIN_SPAN_RATIO = 1.5 // ~7 semitones: never collapse range below this

let mem: Stored | null = null

function load(): Stored {
  if (mem) return mem
  try {
    const raw = localStorage.getItem(RANGE_STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Stored
      if (p?.range && p.range.lowHz > 0 && p.range.highHz > p.range.lowHz) {
        mem = { range: p.range, history: Array.isArray(p.history) ? p.history.slice(-MAX_HISTORY) : [] }
        return mem
      }
    }
  } catch { /* ignore */ }
  mem = { range: defaultRange(), history: [] }
  return mem
}

function save() {
  try { if (mem) localStorage.setItem(RANGE_STORAGE_KEY, JSON.stringify(mem)) } catch { /* ignore */ }
}

export function defaultRange(guess: VoiceGuess = 'unknown'): SpeakerRange {
  const [lowHz, highHz] = DEFAULTS[guess]
  return { lowHz, highHz, source: 'default' }
}

export function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return NaN
  const i = (sorted.length - 1) * p
  const lo = Math.floor(i), hi = Math.ceil(i)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo)
}

/** Robust 5%/95% range from Hz samples, widened to at least MIN_SPAN_RATIO around the geometric centre. */
export function rangeFromHz(hz: number[], source: SpeakerRange['source']): SpeakerRange | null {
  const s = hz.filter(h => h > 50 && h < 700).sort((a, b) => a - b)
  if (s.length < 15) return null
  let lowHz = percentile(s, 0.05)
  let highHz = percentile(s, 0.95)
  if (highHz / lowHz < MIN_SPAN_RATIO) {
    const c = Math.sqrt(lowHz * highHz), k = Math.sqrt(MIN_SPAN_RATIO)
    lowHz = c / k
    highHz = c * k
  }
  return { lowHz: Math.round(lowHz), highHz: Math.round(highHz), source }
}

const voicedHz = (frames: PitchFrame[]) => frames.flatMap(f => (f.hz != null ? [f.hz] : []))

export function getRange(): SpeakerRange { return { ...load().range } }

/** Explicit calibration from a few utterances (e.g. user says ma1 ma2 ma3 ma4). Replaces the history. */
export function calibrate(utterances: PitchFrame[][]): SpeakerRange {
  const hz = utterances.flatMap(voicedHz)
  const r = rangeFromCalibration(utterances) ?? rangeFromHz(hz, 'calibrated')
  const st = load()
  if (r) { st.range = r; st.history = hz.slice(-MAX_HISTORY); save() }
  return getRange()
}

const REF: SpeakerRange = { lowHz: 100, highHz: 400, source: 'default' }
const semis = (u: PitchFrame[]) => extractContour(u, REF, { points: 32 }).semis
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? percentile(s, 0.5) : NaN }

/**
 * Tone-anchored range from the calibration syllables mā má mǎ mà (in that order):
 * Chao 5 = the tone-1 level (with tone-2 end / tone-4 onset as fallbacks), Chao 1 = the tone-3 bottom
 * (tone-4 end as fallback). Uses cleaned contours, so a tone-4 onset spike or an octave error
 * cannot inflate the range the way raw percentiles do. Returns null when the input doesn't look
 * like 4 tone utterances.
 */
export function rangeFromCalibration(utterances: PitchFrame[][]): SpeakerRange | null {
  if (utterances.length !== 4) return null
  const c = utterances.map(semis)
  if (c.some((x) => x.length < 8)) return null
  const [t1, t2, t3, t4] = c
  const n = t1.length, q = Math.round(n * 0.2)
  const t1Level = med(t1)
  const t2End = med(t2.slice(n - q)), t4Start = med(t4.slice(0, q))
  const t3Min = Math.min(...t3), t4End = med(t4.slice(n - q))
  // high anchor (Chao 5): median of tone-1 level, tone-2 end and tone-4 onset — all ≈5, so one odd
  // syllable (a low mā, a tone-4 onset spike) can't skew it
  const hi = med([t1Level, t2End, t4Start])
  // tone 4 ends ~1–2: if it ends below tone 3's bottom, the dip was shallow → meet halfway
  let lo = t4End < t3Min ? (t3Min + t4End) / 2 : t3Min
  let span = hi - lo
  if (!(span > 0)) return null
  // keep the scale sane: 7..24 semitones for 4 Chao steps
  if (span < 7) { lo = hi - 7; span = 7 }
  if (span > 24) { lo = hi - 24; span = 24 }
  const toHz = (x: number) => Math.round(REF.lowHz * Math.pow(2, x / 12))
  return { lowHz: toHz(lo), highHz: toHz(hi), source: 'calibrated' }
}

/** Adaptive update after every utterance; only moves once enough data exists. */
export function observeUtterance(frames: PitchFrame[]): SpeakerRange {
  const st = load()
  const hz = voicedHz(frames)
  if (!hz.length) return getRange()
  st.history = st.history.concat(hz).slice(-MAX_HISTORY)
  if (st.history.length >= 60 && st.range.source !== 'calibrated') {
    const r = rangeFromHz(st.history, 'adaptive')
    if (r) {
      // smooth towards the new estimate (in log domain) so one odd utterance can't jerk the scale
      const a = st.range.source === 'default' ? 1 : 0.3
      const mix = (o: number, n: number) => Math.round(Math.exp(Math.log(o) * (1 - a) + Math.log(n) * a))
      st.range = { lowHz: mix(st.range.lowHz, r.lowHz), highHz: mix(st.range.highHz, r.highHz), source: r.source }
    }
  }
  save()
  return getRange()
}

export function setDefaultGuess(guess: VoiceGuess) {
  const st = load()
  st.range = defaultRange(guess)
  st.history = []
  save()
}

export function resetRange() {
  mem = { range: defaultRange(), history: [] }
  try { localStorage.removeItem(RANGE_STORAGE_KEY) } catch { /* ignore */ }
}
