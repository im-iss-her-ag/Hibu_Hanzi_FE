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
  readonly stats: EngineStats
  /**
   * Input health while listening: 'muted' = the mic track is muted by the OS/browser (phone call, privacy switch),
   * 'interrupted' = the AudioContext is not running (iOS interruption, autoplay suspend). Fires only on change;
   * the engine retries resume() on the next user gesture, so the UI only needs to tell the user to tap / unmute.
   */
  onHealth(cb: (h: EngineHealth) => void): () => void
}

export type EngineHealth = 'ok' | 'muted' | 'interrupted'

export interface EngineStats {
  path: 'worklet' | 'analyser' | null
  /** AudioContext sample rate (never forced; the tracker uses this value) */
  sampleRate: number
  frames: number
  fps: number
  baseLatencyMs: number
  /** AudioContext.outputLatency in ms (0 when the browser does not report it, e.g. Safari/Firefox). Large (>100) on Bluetooth. */
  outputLatencyMs: number
  /** native rate of the mic track (MediaStreamTrack.getSettings().sampleRate), 0 when unknown */
  micSampleRate: number
  /** label of the mic in use (available after permission is granted) */
  micLabel: string
  /** true when the mic looks like a Bluetooth headset in hands-free (HFP) mode: <= 16 kHz, narrow-band */
  lowBandMic: boolean
  ctxState: string
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

/**
 * Map a getUserMedia / AudioContext error to an EngineError.
 * Names per https://developer.mozilla.org/docs/Web/API/MediaDevices/getUserMedia#exceptions
 * (PermissionDeniedError / DevicesNotFoundError / TrackStartError are legacy Chrome/Edge names).
 */
export function classifyMediaError(e: unknown): EngineError {
  const name = (e as { name?: string })?.name ?? ''
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
    case 'PermissionDeniedError':
      return 'permission-denied'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError': // only reached if even `{ audio: true }` failed: effectively no usable device
      return 'no-microphone'
    case 'NotReadableError':
    case 'AbortError':
    case 'TrackStartError':
      return 'mic-busy'
    default:
      return 'unknown'
  }
}

const GESTURE_EVENTS = ['pointerdown', 'touchend', 'click', 'keydown'] as const
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export function createPitchEngine(opts: PitchEngineOptions = {}): PitchEngineExt {
  const frameCbs = new Set<(f: PitchFrame) => void>()
  const uttCbs = new Set<(f: PitchFrame[]) => void>()
  const stateCbs = new Set<(s: EngineState) => void>()
  const healthCbs = new Set<(h: EngineHealth) => void>()
  let state: EngineState = 'idle'
  let error: EngineError | null = null
  let ctx: AudioContext | null = null
  let stream: MediaStream | null = null
  let nodes: AudioNode[] = []
  let timer: ReturnType<typeof setInterval> | null = null
  let tracker: PitchTracker | null = null
  let cleanups: (() => void)[] = []
  let muted = false
  let lastHealth: EngineHealth = 'ok'
  let gen = 0
  const stats = {
    path: null as 'worklet' | 'analyser' | null,
    sampleRate: 0, frames: 0, fps: 0, baseLatencyMs: 0, outputLatencyMs: 0,
    micSampleRate: 0, micLabel: '', lowBandMic: false, ctxState: 'closed',
  }
  let fpsT0 = 0

  const setState = (s: EngineState) => {
    if (s === state) return
    state = s
    stateCbs.forEach(cb => cb(s))
  }
  const emitHealth = () => {
    const live = state === 'listening' || state === 'voiced'
    const h: EngineHealth = !live || !ctx ? 'ok' : muted ? 'muted' : ctx.state === 'running' ? 'ok' : 'interrupted'
    if (h === lastHealth) return
    lastHealth = h
    healthCbs.forEach(cb => cb(h))
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
    cleanups.forEach(f => { try { f() } catch { /* ignore */ } })
    cleanups = []
    nodes.forEach(n => {
      try { n.disconnect() } catch { /* ignore */ }
      if ((n as AudioWorkletNode).port) (n as AudioWorkletNode).port.onmessage = null
    })
    nodes = []
    stream?.getTracks().forEach(t => t.stop())
    stream = null
    if (ctx) {
      ctx.onstatechange = null
      if (ctx.state !== 'closed') ctx.close().catch(() => {}) // iOS Safari keeps only a handful of live contexts
    }
    ctx = null
    tracker = null
    muted = false
    lastHealth = 'ok' // UI resets its health on idle/error; keep both in sync so a still-muted restart re-emits
  }

  /** Create an AudioContext. Never forces `sampleRate` unless asked to (Firefox rate-mismatch retry). */
  function makeContext(AC: typeof AudioContext, sampleRate?: number): AudioContext {
    try {
      return new AC(sampleRate ? { latencyHint: 'interactive', sampleRate } : { latencyHint: 'interactive' })
    } catch (e) {
      if (sampleRate) throw e
      return new AC() // very old webkitAudioContext rejects the options bag
    }
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

    // Create + resume the context synchronously inside the user gesture (iOS Safari autoplay policy):
    // https://webkit.org/blog/6784/new-video-policies-for-ios/ . Do not add an `await` above this line.
    let c: AudioContext
    try { c = makeContext(AC) } catch { return fail('unsupported') }
    ctx = c
    let resumeP: Promise<unknown> = c.resume().catch(() => {})
    setState('requesting-permission')

    const vp = opts.voiceProcessing ?? false
    const gum = (audio: MediaTrackConstraints | true) => navigator.mediaDevices.getUserMedia({ audio })
    let ms: MediaStream
    try {
      try {
        ms = await gum({ echoCancellation: vp, noiseSuppression: vp, autoGainControl: vp, channelCount: 1 })
      } catch (e) {
        if ((e as { name?: string })?.name !== 'OverconstrainedError') throw e
        ms = await gum(true) // some devices/drivers reject the constraint set: take whatever the browser gives
      }
    } catch (e) {
      if (my !== gen) return
      return fail(classifyMediaError(e))
    }
    if (my !== gen) { ms.getTracks().forEach(t => t.stop()); return }
    if (document.hidden) { ms.getTracks().forEach(t => t.stop()); teardown(); return setState('idle') }
    stream = ms
    const track = ms.getAudioTracks()[0]

    try {
      // WebKit can leave resume() pending until a gesture; do not hang start() on it (gesture handler below retries).
      await Promise.race([resumeP, sleep(1500)])
      if (my !== gen) return
      if (c.state === 'suspended') await Promise.race([c.resume().catch(() => {}), sleep(1500)])
      if (my !== gen) return

      let src: MediaStreamAudioSourceNode
      try {
        src = c.createMediaStreamSource(ms)
      } catch (e) {
        // Firefox throws NotSupportedError when the mic's native rate differs from the context rate. Rebuild the
        // context at the mic's rate (only now, never up front: forcing a rate can make iOS Safari resample badly).
        // getSettings().sampleRate is not reported everywhere, so fall back to the usual capture rates.
        const known = track?.getSettings?.().sampleRate
        const tries = (known ? [known] : [48000, 44100, 16000]).filter(r => r !== c.sampleRate)
        let made: MediaStreamAudioSourceNode | null = null
        for (const rate of tries) {
          c.onstatechange = null
          c.close().catch(() => {})
          try {
            c = makeContext(AC, rate)
            ctx = c
            resumeP = c.resume().catch(() => {})
            await Promise.race([resumeP, sleep(1500)])
            if (my !== gen) { c.close().catch(() => {}); return }
            made = c.createMediaStreamSource(ms)
            break
          } catch { /* try the next rate */ }
        }
        if (!made) throw e
        src = made
      }
      nodes.push(src)

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
      const live = c
      stats.sampleRate = live.sampleRate
      stats.frames = 0
      stats.fps = 0
      fpsT0 = 0
      stats.baseLatencyMs = (live.baseLatency ?? 0) * 1000
      const set = track?.getSettings?.() ?? {}
      stats.micSampleRate = set.sampleRate ?? 0
      stats.micLabel = track?.label ?? ''
      // Bluetooth headsets drop to HFP/SCO (8-16 kHz, narrow band) once the mic opens.
      stats.lowBandMic = (stats.micSampleRate > 0 && stats.micSampleRate <= 16000) || live.sampleRate <= 16000 || /hands-?free|hfp|\bsco\b/i.test(stats.micLabel)

      const mute = live.createGain()
      mute.gain.value = 0
      mute.connect(live.destination)
      nodes.push(mute)

      let ok = false
      if (!opts.forceFallback && live.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
        try {
          const url = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'application/javascript' }))
          try { await live.audioWorklet.addModule(url) } finally { URL.revokeObjectURL(url) }
          if (my !== gen) return
          const node = new AudioWorkletNode(live, 'hibu-tap', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: 'explicit' })
          node.port.onmessage = (ev: MessageEvent<Float32Array>) => { if (my === gen) tracker?.push(ev.data) }
          src.connect(node)
          node.connect(mute) // keep the graph pulled
          nodes.push(node)
          stats.path = 'worklet'
          ok = true
        } catch { /* blob: module blocked by CSP / old Safari: fall back */ }
      }
      if (!ok) {
        const an = live.createAnalyser()
        an.fftSize = 8192 // ~170 ms of history: survives main-thread jank between 10 ms polls
        src.connect(an)
        an.connect(mute)
        nodes.push(an)
        const buf = new Float32Array(an.fftSize)
        // Safari < 14.1 has no getFloatTimeDomainData
        const bytes = typeof an.getFloatTimeDomainData === 'function' ? null : new Uint8Array(an.fftSize)
        const fbuf = bytes ? new Float32Array(an.fftSize) : buf
        let lastT = live.currentTime
        // Poll at ~100 Hz; push only the samples that are new since last poll.
        // (Background tabs clamp timers to >= 1 s, which would drop samples; the visibility handler below stops us first.)
        timer = setInterval(() => {
          if (my !== gen) return
          const now = live.currentTime
          const n = Math.min(buf.length, Math.round((now - lastT) * live.sampleRate))
          lastT = now
          if (n <= 0) return
          if (bytes) {
            an.getByteTimeDomainData(bytes)
            for (let i = 0; i < bytes.length; i++) fbuf[i] = (bytes[i] - 128) / 128
          } else an.getFloatTimeDomainData(buf)
          tracker?.push(fbuf.subarray(fbuf.length - n))
        }, 10)
        stats.path = 'analyser'
      }

      // --- lifecycle / robustness hooks (all removed in teardown) ---
      const kick = () => { if (my === gen && ctx && ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume().catch(() => {}) }
      live.onstatechange = () => { if (my !== gen) return; kick(); emitHealth() }
      GESTURE_EVENTS.forEach(ev => {
        window.addEventListener(ev, kick, { capture: true, passive: true })
        cleanups.push(() => window.removeEventListener(ev, kick, { capture: true }))
      })
      // Background / hidden tab: iOS kills the mic anyway, and timers throttle. Release everything; the user taps to restart.
      const onHide = () => {
        if (my !== gen || !document.hidden) return
        tracker?.reset()
        teardown()
        setState('idle')
      }
      document.addEventListener('visibilitychange', onHide)
      window.addEventListener('pagehide', onHide)
      cleanups.push(() => { document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', onHide) })
      // iOS mutes the track during phone calls / Siri; unplugging or revoking ends it.
      const onMute = () => { if (my !== gen) return; muted = true; emitHealth() }
      const onUnmute = () => { if (my !== gen) return; muted = false; kick(); emitHealth() }
      const onEnded = () => { if (my === gen) fail('no-microphone') }
      track?.addEventListener('mute', onMute)
      track?.addEventListener('unmute', onUnmute)
      track?.addEventListener('ended', onEnded)
      cleanups.push(() => { track?.removeEventListener('mute', onMute); track?.removeEventListener('unmute', onUnmute); track?.removeEventListener('ended', onEnded) })
      muted = !!track?.muted

      setState('listening')
      emitHealth()
    } catch {
      if (my === gen) fail('unknown')
    }
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
    get stats(): EngineStats {
      if (ctx) {
        stats.baseLatencyMs = (ctx.baseLatency ?? 0) * 1000
        stats.outputLatencyMs = ((ctx as AudioContext & { outputLatency?: number }).outputLatency ?? 0) * 1000
        stats.ctxState = ctx.state
      } else stats.ctxState = 'closed'
      return { ...stats }
    },
    onFrame: cb => sub(frameCbs, cb),
    onUtterance: cb => sub(uttCbs, cb),
    onState: cb => sub(stateCbs, cb),
    onHealth: cb => sub(healthCbs, cb),
  }
}
