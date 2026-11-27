/**
 * Speaker pitch range: default guess → calibration → adaptive update.
 * Persisted in localStorage "hibu_voice_range_v1".
 */
import type { PitchFrame, SpeakerRange } from '../types'

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
  const r = rangeFromHz(hz, 'calibrated')
  const st = load()
  if (r) { st.range = r; st.history = hz.slice(-MAX_HISTORY); save() }
  return getRange()
}

/** Adaptive update after every utterance; only moves once enough data exists. */
export function observeUtterance(frames: PitchFrame[]): SpeakerRange {
  const st = load()
  const hz = voicedHz(frames)
  if (!hz.length) return getRange()
  st.history = st.history.concat(hz).slice(-MAX_HISTORY)
  if (st.history.length >= 60) {
    const r = rangeFromHz(st.history, st.range.source === 'default' ? 'adaptive' : st.range.source === 'calibrated' ? 'calibrated' : 'adaptive')
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
