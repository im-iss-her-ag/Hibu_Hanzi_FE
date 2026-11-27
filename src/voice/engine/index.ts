/**
 * Realtime PitchEngine: mic → AudioWorklet (fallback: AnalyserNode polling) → PitchTracker (YIN + VAD).
 * Contract: ../types.ts
 */
import type { EngineError, EngineState, PitchEngine, PitchFrame } from '../types'
import { PitchTracker, type TrackerOptions } from './tracker'
import { observeUtterance } from './range'

export { PitchTracker, trimVoiced } from './tracker'
export { yin } from './yin'
export * from './range'

export interface PitchEngineOptions extends Partial<Omit<TrackerOptions, 'sampleRate'>> {
  /** browser voice processing (echo cancel / noise suppression / AGC). Default false: AGC & NS distort pitch/level. */
  voiceProcessing?: boolean
  /** feed every utterance into the adaptive speaker range (default true) */
  adaptRange?: boolean
  /** force the AnalyserNode fallback (testing) */
  forceFallback?: boolean
}

/** Extra, non-contract helpers (backward compatible superset of PitchEngine). */
export interface PitchEngineExt extends PitchEngine {
  /** end the current utterance now (emits onUtterance if ≥ minUtteranceMs) but keep listening */
  endUtterance(): void
  /** stats for debugging: frames/s, audio path */
  readonly stats: { path: 'worklet' | 'analyser' | null; sampleRate: number; frames: number; fps: number; baseLatencyMs: number }
}

const WORKLET_SRC = `
class HibuTap extends AudioWorkletProcessor {
  constructor(){ super(); this.buf = new Float32Array(256); this.n = 0; }
  process(inputs){
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this.buf[this.n++] = ch[i];
        if (this.n === this.buf.length) { this.port.postMessage(this.buf, [this.buf.buffer]); this.buf = new Float32Array(256); this.n = 0; }
      }
    }
    return true;
  }
}
registerProcessor('hibu-tap', HibuTap);
`

function classify(e: unknown): EngineError {
  const name = (e as { name?: string })?.name ?? ''
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'permission-denied'
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError' || name === 'NotReadableError') return 'no-microphone'
  return 'unknown'
}

export function createPitchEngine(opts: PitchEngineOptions = {}): PitchEngineExt {
  const frameCbs = new Set<(f: PitchFrame) => void>()
  const uttCbs = new Set<(f: PitchFrame[]) => void>()
  const stateCbs = new Set<(s: EngineState) => void>()
  let state: EngineState = 'idle'
  let error: EngineError | null = null
  let ctx: AudioContext | null = null
  let stream: MediaStream | null = null
  let nodes: AudioNode[] = []
  let timer: ReturnType<typeof setInterval> | null = null
  let tracker: PitchTracker | null = null
  let gen = 0
  const stats = { path: null as 'worklet' | 'analyser' | null, sampleRate: 0, frames: 0, fps: 0, baseLatencyMs: 0 }
  let fpsT0 = 0

  const setState = (s: EngineState) => {
    if (s === state) return
    state = s
    stateCbs.forEach(cb => cb(s))
  }
  const fail = (e: EngineError) => {
    error = e
    teardown()
    setState('error')
  }

  function teardown() {
    gen++
    if (timer) clearInterval(timer)
    timer = null
    nodes.forEach(n => {
      try { n.disconnect() } catch { /* ignore */ }
      if ((n as AudioWorkletNode).port) (n as AudioWorkletNode).port.onmessage = null
    })
    nodes = []
    stream?.getTracks().forEach(t => t.stop())
    stream = null
    if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {})
    ctx = null
    tracker = null
  }

  async function start() {
    if (state === 'listening' || state === 'voiced' || state === 'requesting-permission') return
    teardown()
    error = null
    const my = gen
    if (typeof window === 'undefined') return fail('unsupported')
    if (window.isSecureContext === false) return fail('insecure-context')
    const AC: typeof AudioContext | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC || !navigator.mediaDevices?.getUserMedia) return fail('unsupported')

    // Create + resume the context synchronously inside the user gesture (iOS Safari).
    let c: AudioContext
    try { c = new AC({ latencyHint: 'interactive' }) } catch { return fail('unsupported') }
    ctx = c
    const resumeP = c.resume().catch(() => {})
    setState('requesting-permission')

    const vp = opts.voiceProcessing ?? false
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: vp, noiseSuppression: vp, autoGainControl: vp, channelCount: 1 },
      })
    } catch (e) {
      if (my !== gen) return
      return fail(classify(e))
    }
    if (my !== gen) { stream?.getTracks().forEach(t => t.stop()); return }
    await resumeP
    if (c.state === 'suspended') await c.resume().catch(() => {})

    tracker = new PitchTracker({ ...opts, sampleRate: c.sampleRate }, {
      onFrame: f => {
        stats.frames++
        const now = performance.now()
        if (!fpsT0) fpsT0 = now
        else if (now - fpsT0 > 500) stats.fps = (stats.frames * 1000) / (now - fpsT0)
        frameCbs.forEach(cb => cb(f))
      },
      onVoiced: v => setState(v ? 'voiced' : 'listening'),
      onUtterance: fr => {
        if (opts.adaptRange ?? true) observeUtterance(fr)
        uttCbs.forEach(cb => cb(fr))
      },
    })
    stats.sampleRate = c.sampleRate
    stats.frames = 0
    fpsT0 = 0
    stats.baseLatencyMs = (c.baseLatency ?? 0) * 1000

    const src = c.createMediaStreamSource(stream)
    nodes.push(src)
    const mute = c.createGain()
    mute.gain.value = 0
    mute.connect(c.destination)
    nodes.push(mute)

    let ok = false
    if (!opts.forceFallback && c.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
      try {
        const url = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'application/javascript' }))
        try { await c.audioWorklet.addModule(url) } finally { URL.revokeObjectURL(url) }
        if (my !== gen) return
        const node = new AudioWorkletNode(c, 'hibu-tap', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: 'explicit' })
        node.port.onmessage = (ev: MessageEvent<Float32Array>) => { if (my === gen) tracker?.push(ev.data) }
        src.connect(node)
        node.connect(mute) // keep the graph pulled
        nodes.push(node)
        stats.path = 'worklet'
        ok = true
      } catch { /* fall back */ }
    }
    if (!ok) {
      const an = c.createAnalyser()
      an.fftSize = 2048
      src.connect(an)
      an.connect(mute)
      nodes.push(an)
      const buf = new Float32Array(an.fftSize)
      let lastT = c.currentTime
      // Poll at ~100 Hz; push only the samples that are new since last poll.
      timer = setInterval(() => {
        if (my !== gen) return
        const now = c.currentTime
        const n = Math.min(buf.length, Math.round((now - lastT) * c.sampleRate))
        lastT = now
        if (n <= 0) return
        an.getFloatTimeDomainData(buf)
        tracker?.push(buf.subarray(buf.length - n))
      }, 10)
      stats.path = 'analyser'
    }
    stream.getAudioTracks()[0]?.addEventListener('ended', () => { if (my === gen) fail('no-microphone') })
    setState('listening')
  }

  function stop() {
    tracker?.flush() // force-end: deliver what was said so far
    teardown()
    if (state !== 'error') setState('idle')
  }

  const sub = <T>(set: Set<T>, cb: T) => { set.add(cb); return () => { set.delete(cb) } }

  return {
    start,
    stop,
    endUtterance: () => tracker?.flush(),
    get state() { return state },
    get error() { return error },
    get stats() { return { ...stats } },
    onFrame: cb => sub(frameCbs, cb),
    onUtterance: cb => sub(uttCbs, cb),
    onState: cb => sub(stateCbs, cb),
  }
}
