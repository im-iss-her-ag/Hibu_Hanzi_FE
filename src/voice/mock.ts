/**
 * Mock engine + scorer for building / screenshot-testing the tone trainer UI without a mic.
 * Enable with `?voicemock=1` (optionally `&mocktone=1..4`). While listening, it "speaks" the scripted
 * tone every few seconds; holding the pointer down on the trainer canvas drives pitch by mouse Y.
 */
import type {
  EngineError,
  EngineState,
  FeedbackCode,
  PitchEngine,
  PitchFrame,
  SpeakerRange,
  Tone,
  ToneResult,
  ContourPoint,
} from './types'
import { TONE_TEMPLATES } from './types'

type Listener<T> = (v: T) => void

export const mockPointer = { active: false, chao: 3 }

export function isMockVoice(): boolean {
  try {
    return new URLSearchParams(location.search).has('voicemock')
  } catch {
    return false
  }
}

function chaoToHz(chao: number, r: SpeakerRange): number {
  return r.lowHz * Math.pow(r.highHz / r.lowHz, (chao - 1) / 4)
}

function templateAt(tone: 1 | 2 | 3 | 4, x: number): number {
  const pts = TONE_TEMPLATES[tone]
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i].x) {
      const a = pts[i - 1]
      const b = pts[i]
      return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x || 1)
    }
  }
  return pts[pts.length - 1].y
}

export function createMockPitchEngine(range: () => SpeakerRange, scriptedTone: () => 1 | 2 | 3 | 4): PitchEngine {
  let state: EngineState = 'idle'
  const frameL = new Set<Listener<PitchFrame>>()
  const uttL = new Set<Listener<PitchFrame[]>>()
  const stateL = new Set<Listener<EngineState>>()
  let timer: number | null = null
  let t0 = 0
  let uttStart = -1
  let utt: PitchFrame[] = []
  let silentSince = 0
  const set = (s: EngineState) => {
    state = s
    stateL.forEach((f) => f(s))
  }
  const tick = () => {
    const now = performance.now()
    const el = now - t0
    // scripted: voice from 1.0s to 1.6s of each 3.5s cycle
    const cyc = el % 3500
    let chao: number | null = null
    if (mockPointer.active) chao = mockPointer.chao
    else if (cyc > 1000 && cyc < 1600) {
      const x = (cyc - 1000) / 600
      chao = templateAt(scriptedTone(), x) + Math.sin(x * 9) * 0.15 - 0.3
    }
    const hz = chao == null ? null : chaoToHz(chao, range())
    if (hz != null && uttStart < 0) {
      uttStart = now
      utt = []
      set('voiced')
    }
    const f: PitchFrame = {
      t: uttStart < 0 ? 0 : now - uttStart,
      hz,
      clarity: hz ? 0.92 : 0.1,
      level: hz ? 0.18 + Math.random() * 0.05 : 0.004 + Math.random() * 0.003,
    }
    frameL.forEach((cb) => cb(f))
    if (uttStart >= 0) {
      utt.push(f)
      if (hz == null) {
        if (!silentSince) silentSince = now
        if (now - silentSince > 250) {
          const frames = utt.filter((x) => x.hz != null)
          uttStart = -1
          silentSince = 0
          set('listening')
          uttL.forEach((cb) => cb(frames))
        }
      } else silentSince = 0
    }
  }
  return {
    async start() {
      if (state === 'listening' || state === 'voiced') return
      set('requesting-permission')
      await new Promise((r) => setTimeout(r, 200))
      t0 = performance.now()
      timer = window.setInterval(tick, 1000 / 50)
      set('listening')
    },
    stop() {
      if (timer != null) clearInterval(timer)
      timer = null
      uttStart = -1
      set('idle')
    },
    get state() {
      return state
    },
    get error(): EngineError | null {
      return null
    },
    onFrame(cb) {
      frameL.add(cb)
      return () => frameL.delete(cb)
    },
    onUtterance(cb) {
      uttL.add(cb)
      return () => uttL.delete(cb)
    },
    onState(cb) {
      stateL.add(cb)
      return () => stateL.delete(cb)
    },
  }
}

export function mockHzToChao(hz: number, r: SpeakerRange): number {
  return 1 + (4 * Math.log(hz / r.lowHz)) / Math.log(r.highHz / r.lowHz)
}

export function mockScoreTone(frames: PitchFrame[], target: Tone, range: SpeakerRange): ToneResult {
  const voiced = frames.filter((f) => f.hz != null)
  const empty: ToneResult = {
    target,
    detected: null,
    score: 0,
    similarity: { 1: 0, 2: 0, 3: 0, 4: 0 },
    contour: [],
    feedback: [voiced.length === 0 ? 'no-voice' : 'too-short'],
  }
  if (voiced.length < 6) return empty
  const N = 20
  const contour: ContourPoint[] = []
  for (let i = 0; i < N; i++) {
    const f = voiced[Math.round((i / (N - 1)) * (voiced.length - 1))]
    contour.push({ x: i / (N - 1), y: Math.max(0.5, Math.min(5.5, mockHzToChao(f.hz!, range))) })
  }
  const sim = {} as Record<1 | 2 | 3 | 4, number>
  for (const t of [1, 2, 3, 4] as const) {
    let e = 0
    for (const p of contour) e += (p.y - templateAt(t, p.x)) ** 2
    sim[t] = Math.exp(-Math.sqrt(e / N) / 1.2)
  }
  const detected = ([1, 2, 3, 4] as const).reduce((a, b) => (sim[b] > sim[a] ? b : a))
  const tt = target === 5 ? detected : target
  const score = Math.round(sim[tt] * 100)
  const fb: FeedbackCode[] = []
  const d0 = contour[0].y - templateAt(tt, 0)
  const d1 = contour[N - 1].y - templateAt(tt, 1)
  if (d0 < -0.8) fb.push('start-higher')
  if (d0 > 0.8) fb.push('start-lower')
  if (d1 < -0.8) fb.push(tt === 2 ? 'rise-more' : 'end-higher')
  if (d1 > 0.8) fb.push(tt === 4 ? 'fall-deeper' : 'end-lower')
  if (!fb.length) fb.push('good')
  return { target, detected, score, similarity: sim, contour, feedback: fb }
}

export const MOCK_FEEDBACK_VI: Record<FeedbackCode, string> = {
  'too-short': 'Âm hơi ngắn — kéo dài tiếng thêm một chút.',
  'no-voice': 'Chưa nghe thấy giọng. Nói to và gần micro hơn.',
  'start-higher': 'Cần bắt đầu cao hơn.',
  'start-lower': 'Cần bắt đầu thấp hơn.',
  'end-higher': 'Cuối âm cần lên cao hơn.',
  'end-lower': 'Cuối âm cần hạ thấp hơn.',
  'fall-deeper': 'Thanh 4 cần rơi mạnh và sâu hơn, dứt khoát như ra lệnh.',
  'rise-more': 'Thanh 2 cần lên rõ hơn, như khi hỏi "hả?".',
  flatter: 'Thanh 1 cần giữ cao và phẳng, đừng lượn.',
  'dip-lower': 'Thanh 3 cần xuống thấp hơn ở giữa.',
  good: 'Tốt lắm — đường giọng khớp với mẫu.',
}
