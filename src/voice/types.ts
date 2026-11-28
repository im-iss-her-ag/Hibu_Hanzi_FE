/**
 * Tone trainer contract shared by the three teams.
 *  - Engine (Team A):     mic → PitchFrame stream          (src/voice/engine/*)
 *  - Scoring (Team B):    PitchFrame[] → ToneResult         (src/voice/scoring/*)
 *  - UI (Team C):         realtime canvas + feedback        (src/components/ToneTrainer*.tsx, styles/tone-trainer.css)
 * Change this file only by agreement (tell the lead); keep it backwards compatible.
 */

export type Tone = 1 | 2 | 3 | 4 | 5 // 5 = neutral (khinh thanh)

/** One analysis frame. Emitted ~30–60 times per second while listening. */
export interface PitchFrame {
  /** ms since the start of the current utterance (performance.now based) */
  t: number
  /** fundamental frequency in Hz, or null when unvoiced / silence / unreliable */
  hz: number | null
  /** detector confidence 0..1 */
  clarity: number
  /** RMS level 0..1 (for the VU meter and voice-activity detection) */
  level: number
}

/** Speaker pitch range, used to map Hz onto the Chao 1–5 scale. */
export interface SpeakerRange {
  /** comfortable low and high fundamental frequency in Hz */
  lowHz: number
  highHz: number
  /** how it was obtained */
  source: 'default' | 'calibrated' | 'adaptive'
}

/** Chao value: 1 (lowest) … 5 (highest), continuous. */
export type ChaoValue = number

export interface ContourPoint {
  /** 0..1 normalized time within the voiced part of the syllable */
  x: number
  /** Chao 1..5 */
  y: ChaoValue
}

export type EngineState =
  | 'idle'
  | 'requesting-permission'
  | 'listening' // mic open, waiting for voice
  | 'voiced' // currently inside an utterance
  | 'error'

export type EngineError =
  | 'permission-denied'
  | 'no-microphone' // NotFoundError / DevicesNotFoundError / (second) OverconstrainedError: no input device
  | 'mic-busy' // NotReadableError / AbortError / TrackStartError: device exists but is in use or failed
  | 'insecure-context'
  | 'unsupported'
  | 'unknown'

export interface PitchEngine {
  start(): Promise<void>
  stop(): void
  readonly state: EngineState
  readonly error: EngineError | null
  /** live frames (every frame, voiced or not) */
  onFrame(cb: (f: PitchFrame) => void): () => void
  /** fires when voice activity detection decides an utterance ended; frames trimmed to the utterance */
  onUtterance(cb: (frames: PitchFrame[]) => void): () => void
  onState(cb: (s: EngineState) => void): () => void
}

/** Convert Hz to Chao 1..5 for a given speaker range (log/semitone scale). Implemented by Team B in scoring/chao.ts. */
export type HzToChao = (hz: number, range: SpeakerRange) => ChaoValue

export type FeedbackCode =
  | 'too-short'
  | 'no-voice'
  | 'start-higher'
  | 'start-lower'
  | 'end-higher'
  | 'end-lower'
  | 'fall-deeper' // tone 4 not falling enough
  | 'rise-more' // tone 2 not rising enough
  | 'flatter' // tone 1 wobbling
  | 'dip-lower' // tone 3 not low enough
  | 'good'

export interface ToneResult {
  target: Tone
  /** tone the contour looks most like */
  detected: Tone | null
  /** 0..100 similarity to the target contour */
  score: number
  /** per-tone similarity 0..1, for "giữa thanh 1 và 2" style hints */
  similarity: Record<1 | 2 | 3 | 4, number>
  /** user contour, normalized, for drawing */
  contour: ContourPoint[]
  /** ordered most-important first; UI maps codes to Vietnamese text */
  feedback: FeedbackCode[]
}

/** Reference contours (Chao numerals) for drawing the ghost target. */
export const TONE_TEMPLATES: Record<1 | 2 | 3 | 4, ContourPoint[]> = {
  1: [{ x: 0, y: 5 }, { x: 1, y: 5 }],
  2: [{ x: 0, y: 3 }, { x: 1, y: 5 }],
  3: [{ x: 0, y: 2 }, { x: 0.5, y: 1 }, { x: 1, y: 4 }],
  4: [{ x: 0, y: 5 }, { x: 1, y: 1 }],
}
