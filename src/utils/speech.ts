// Chinese audio engine.
// Single Pinyin syllables play native-speaker MP3 recordings (davinfifield/mp3-chinese-pinyin-sound,
// The Unlicense) shipped with the app under /audio/pinyin/ (pre-trimmed and loudness-normalised by
// data-tools/build-pinyin-audio.mts), decoded once and played through a shared Web Audio context.
// The manifest lists the shipped syllables, so a syllable without a file never costs a request.
// Fallbacks: the jsDelivr mirror of the same set, allsetlearning recordings (HTMLAudio), then the
// OS Chinese voice (speech synthesis).

import { PINYIN_AUDIO_KEYS, PINYIN_AUDIO_VERSION, PINYIN_AUDIO_WARM } from './pinyinAudioManifest'
import { parsePinyin, VALID_SYLLABLES } from './pinyinData'

const LOCAL_PINYIN_BASE = `${import.meta.env.BASE_URL}audio/pinyin/`
const LOCAL_KEYS = new Set(PINYIN_AUDIO_KEYS.split(' ').filter(Boolean))
const localUrl = (key: string) => `${LOCAL_PINYIN_BASE}${key}.mp3?v=${PINYIN_AUDIO_VERSION}`
const JSDELIVR_PINYIN_BASE = 'https://cdn.jsdelivr.net/gh/davinfifield/mp3-chinese-pinyin-sound@master/mp3/'
const ALLSET_PINYIN_BASE = 'https://resources.allsetlearning.com/pronwiki/resources/pinyin-audio/'

// Canonical pronunciation mapping for isolated consonants (Thanh mẫu khi đứng độc lập)
const INITIAL_CONSONANT_MAP: Record<string, { pinyin: string; tone: number }> = {
  b: { pinyin: 'bo', tone: 1 },
  p: { pinyin: 'po', tone: 1 },
  m: { pinyin: 'mo', tone: 1 },
  f: { pinyin: 'fo', tone: 1 },
  d: { pinyin: 'de', tone: 1 },
  t: { pinyin: 'te', tone: 1 },
  n: { pinyin: 'ne', tone: 1 },
  l: { pinyin: 'le', tone: 1 },
  g: { pinyin: 'ge', tone: 1 },
  k: { pinyin: 'ke', tone: 1 },
  h: { pinyin: 'he', tone: 1 },
  j: { pinyin: 'ji', tone: 1 },
  q: { pinyin: 'qi', tone: 1 },
  x: { pinyin: 'xi', tone: 1 },
  zh: { pinyin: 'zhi', tone: 1 },
  ch: { pinyin: 'chi', tone: 1 },
  sh: { pinyin: 'shi', tone: 1 },
  r: { pinyin: 'ri', tone: 4 },
  z: { pinyin: 'zi', tone: 1 },
  c: { pinyin: 'ci', tone: 1 },
  s: { pinyin: 'si', tone: 1 },
  y: { pinyin: 'yi', tone: 1 },
  w: { pinyin: 'wu', tone: 1 },
}

// Conventional reading syllable for an initial, with tone mark (e.g. "b" -> "bō", "r" -> "rì")
export function getInitialSamplePinyin(initial: string): string {
  const entry = INITIAL_CONSONANT_MAP[initial]
  if (!entry) return initial
  return parsePinyin(entry.pinyin).toneVariants[entry.tone - 1]?.pinyin || entry.pinyin
}

// Map tone vowels to base character and tone number
const TONE_DECODER: Record<string, { base: string; tone: number }> = {
  ā: { base: 'a', tone: 1 }, á: { base: 'a', tone: 2 }, ǎ: { base: 'a', tone: 3 }, à: { base: 'a', tone: 4 },
  ō: { base: 'o', tone: 1 }, ó: { base: 'o', tone: 2 }, ǒ: { base: 'o', tone: 3 }, ò: { base: 'o', tone: 4 },
  ē: { base: 'e', tone: 1 }, é: { base: 'e', tone: 2 }, ě: { base: 'e', tone: 3 }, è: { base: 'e', tone: 4 },
  ī: { base: 'i', tone: 1 }, í: { base: 'i', tone: 2 }, ǐ: { base: 'i', tone: 3 }, ì: { base: 'i', tone: 4 },
  ū: { base: 'u', tone: 1 }, ú: { base: 'u', tone: 2 }, ǔ: { base: 'u', tone: 3 }, ù: { base: 'u', tone: 4 },
  ǖ: { base: 'uu', tone: 1 }, ǘ: { base: 'uu', tone: 2 }, ǚ: { base: 'uu', tone: 3 }, ǜ: { base: 'uu', tone: 4 },
}

// Convert a Pinyin string (with diacritics or tone numbers) into standard CDN filename e.g. "ca1.mp3", "beng4.mp3"
function normalizePinyinAudioKey(rawText: string): { pinyin: string; tone: number } {
  const clean = rawText.trim().toLowerCase()

  // 1. Check if it's an isolated initial consonant (e.g. "b", "c", "zh")
  if (INITIAL_CONSONANT_MAP[clean]) {
    return INITIAL_CONSONANT_MAP[clean]
  }

  // 2. Decode tone marks from vowels
  let tone = 1
  let normalized = ''

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (TONE_DECODER[ch]) {
      tone = TONE_DECODER[ch].tone
      normalized += TONE_DECODER[ch].base
    } else {
      normalized += ch
    }
  }

  // Dataset spelling of ü is "uu" (e.g. "nuu3", "luu4", "nuue4"); convert before reading a tone digit.
  normalized = normalized.replace(/ü/g, 'uu').replace(/v/g, 'uu')

  // Check if user passed tone number at end (e.g. "ca4" or "beng1")
  const toneNumMatch = normalized.match(/([a-z]+)([1-5])$/)
  if (toneNumMatch) {
    normalized = toneNumMatch[1]
    tone = parseInt(toneNumMatch[2], 10)
  }

  // After j/q/x/y the dataset writes ü as plain u ("ju", "xue", "yu").
  normalized = normalized.replace(/^([jqxy])uu/, '$1u')

  // If normalized ends up being just consonant like "c"
  if (INITIAL_CONSONANT_MAP[normalized]) {
    return { ...INITIAL_CONSONANT_MAP[normalized], tone }
  }

  return { pinyin: normalized, tone: tone || 1 }
}

// ---------------------------------------------------------------------------
// Playback engine
//
// Measured on the jsDelivr set (80 files, 20 syllables x 4 tones): speech loudness
// spans 23.6 dB (tone 1 about -20 dBFS, tones 2/3 about -34 dBFS) and the allsetlearning
// fallback is another ~20 dB louder with 60-310 ms of leading silence. So every syllable is
// fetched once, decoded, trimmed and gain-normalised into an AudioBuffer, then played through
// one shared AudioContext. Each call takes a token; only the latest call may make a sound.
// The shipped files are already trimmed and at the target loudness, so for them this pass is a
// safety net (gain ≈ 0 dB); it still matters for the CDN fallback.
// ---------------------------------------------------------------------------

/** Target speech loudness (≈ LUFS) and the peak ceiling for normalised syllables. */
const TARGET_RMS_DB = -20
const PEAK_CEILING = 0.89 // -1 dBFS
const MAX_GAIN_DB = 24
const MIN_GAIN_DB = -12
/** allsetlearning files sit around -12 dBFS; this brings them near the target (HTMLAudio, no CORS). */
const ALLSET_VOLUME = 0.4
/** Wait this long for a syllable before falling back to the next source. */
const LOAD_TIMEOUT_MS = 2500
const BUFFER_CACHE_LIMIT = 120
const PREFETCH_CONCURRENCY = 4

const dbToGain = (db: number) => Math.pow(10, db / 20)
const gainToDb = (g: number) => 20 * Math.log10(Math.max(g, 1e-9))

export interface NormalizedSpeech {
  samples: Float32Array
  gainDb: number
  trimStartMs: number
  trimEndMs: number
}

// RBJ biquad, used for an approximate ITU-R BS.1770 K-weighting (high shelf +4 dB @ 1.5 kHz,
// high-pass @ 38 Hz) so loudness tracks perception rather than raw energy.
function biquad(x: Float32Array, sr: number, type: 'highshelf' | 'highpass', f0: number, q: number, gainDb = 0): Float32Array {
  const A = Math.pow(10, gainDb / 40)
  const w = (2 * Math.PI * f0) / sr
  const cw = Math.cos(w)
  const alpha = Math.sin(w) / (2 * q)
  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number
  if (type === 'highpass') {
    b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2
    a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha
  } else {
    const s = 2 * Math.sqrt(A) * alpha
    b0 = A * (A + 1 + (A - 1) * cw + s); b1 = -2 * A * (A - 1 + (A + 1) * cw); b2 = A * (A + 1 + (A - 1) * cw - s)
    a0 = A + 1 - (A - 1) * cw + s; a1 = 2 * (A - 1 - (A + 1) * cw); a2 = A + 1 - (A - 1) * cw - s
  }
  const y = new Float32Array(x.length)
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v
  }
  return y
}

function windowRms(x: Float32Array, W: number): number[] {
  const wins: number[] = []
  for (let i = 0; i + W <= x.length; i += W) {
    let s = 0
    for (let j = i; j < i + W; j++) s += x[j] * x[j]
    wins.push(Math.sqrt(s / W))
  }
  return wins
}

/**
 * Trim leading/trailing silence and scale a mono speech clip to TARGET_RMS_DB.
 * Loudness is a BS.1770-style K-weighted, gated measure (≈ LUFS), so tones with different
 * envelopes come out equally loud; the gain is capped so the peak stays below -1 dBFS.
 */
export function normalizeSpeechSamples(x: Float32Array, sampleRate: number): NormalizedSpeech {
  const W = Math.max(1, Math.round(sampleRate * 0.01))
  const wins = windowRms(x, W)
  let maxW = 0
  for (const w of wins) if (w > maxW) maxW = w
  if (maxW < 1e-4) return { samples: x, gainDb: 0, trimStartMs: 0, trimEndMs: 0 }

  const edge = Math.max(maxW * dbToGain(-40), dbToGain(-60))
  let first = 0
  while (first < wins.length && wins[first] <= edge) first++
  let last = wins.length - 1
  while (last > first && wins[last] <= edge) last--

  const start = Math.max(0, first * W - Math.round(sampleRate * 0.01))
  const end = Math.min(x.length, (last + 1) * W + Math.round(sampleRate * 0.06))

  // BS.1770-style integrated loudness over 400 ms blocks (100 ms hop), absolute gate -70,
  // relative gate -10 LU. Clips shorter than one block use the whole clip.
  const k = biquad(biquad(x.subarray(start, end), sampleRate, 'highshelf', 1500, Math.SQRT1_2, 4), sampleRate, 'highpass', 38, 0.5)
  const B = Math.min(k.length, Math.round(sampleRate * 0.4))
  const H = Math.max(1, Math.round(sampleRate * 0.1))
  const blocks: number[] = []
  for (let i = 0; i + B <= k.length; i += H) {
    let q = 0
    for (let j = i; j < i + B; j++) q += k[j] * k[j]
    blocks.push(q / B)
  }
  const mean = (a: number[]) => a.reduce((p, v) => p + v, 0) / Math.max(1, a.length)
  const abs = blocks.filter((m) => m > dbToGain(-70) ** 2)
  const relGate = mean(abs) * dbToGain(-10) ** 2
  const gated = abs.filter((m) => m >= relGate)
  const rms = Math.sqrt(mean(gated.length ? gated : blocks))
  let peak = 0
  for (let i = start; i < end; i++) { const a = Math.abs(x[i]); if (a > peak) peak = a }

  let gain = dbToGain(TARGET_RMS_DB) / rms
  gain = Math.min(Math.max(gain, dbToGain(MIN_GAIN_DB)), dbToGain(MAX_GAIN_DB), PEAK_CEILING / Math.max(peak, 1e-6))

  const out = new Float32Array(end - start)
  for (let i = 0; i < out.length; i++) out[i] = x[start + i] * gain
  // Short fades so the cut never clicks.
  const fadeIn = Math.min(out.length, Math.round(sampleRate * 0.005))
  for (let i = 0; i < fadeIn; i++) out[i] *= i / fadeIn
  const fadeOut = Math.min(out.length, Math.round(sampleRate * 0.03))
  for (let i = 0; i < fadeOut; i++) out[out.length - 1 - i] *= i / fadeOut

  return {
    samples: out,
    gainDb: gainToDb(gain),
    trimStartMs: (start / sampleRate) * 1000,
    trimEndMs: ((x.length - end) / sampleRate) * 1000,
  }
}

type AC = typeof AudioContext
const getAudioContextClass = (): AC | undefined =>
  typeof window === 'undefined'
    ? undefined
    : window.AudioContext ?? (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext

let ctx: AudioContext | null = null
let master: GainNode | null = null

function getContext(): AudioContext | null {
  if (ctx) return ctx
  const C = getAudioContextClass()
  if (!C) return null
  try {
    ctx = new C({ latencyHint: 'interactive' })
    master = ctx.createGain()
    master.gain.value = 1
    master.connect(ctx.destination)
  } catch {
    ctx = null
  }
  return ctx
}

// Create/resume the shared context on the first user gesture anywhere, so the first
// "play" click does not also pay for audio-device start-up.
function installUnlock() {
  if (typeof document === 'undefined') return
  const events = ['pointerdown', 'keydown', 'touchend'] as const
  const unlock = () => {
    const c = getContext()
    if (!c) return done()
    if (c.state === 'running') return done()
    c.resume().then(() => { if (c.state === 'running') done() }, () => {})
  }
  const done = () => events.forEach((e) => document.removeEventListener(e, unlock, true))
  events.forEach((e) => document.addEventListener(e, unlock, true))
}
installUnlock()
// Chrome loads voices lazily; ask early so the first fallback utterance has them.
if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.getVoices()

// Decoding does not need a running context; before the first gesture use an offline one
// so prefetching never trips the autoplay policy.
let offline: OfflineAudioContext | null = null
function decodeContext(): BaseAudioContext | null {
  if (ctx) return ctx
  if (offline) return offline
  if (typeof OfflineAudioContext === 'undefined') return null
  try { offline = new OfflineAudioContext(1, 1, 44100) } catch { offline = null }
  return offline
}

// ---- Buffer cache (LRU) ----------------------------------------------------

type LoadResult = { ok: true; buffer: AudioBuffer } | { ok: false; reason: 'missing' | 'network' | 'decode' }

const ready = new Map<string, AudioBuffer>() // resolved, for synchronous playback
const pending = new Map<string, Promise<LoadResult>>()
const missing = new Set<string>() // not shipped, or 404 on the CDN
const wavUrls = new Map<string, string>()
let cdnDownUntil = 0
let secondaryDownUntil = 0
const secondaryMissing = new Set<string>() // allsetlearning had nothing playable for this key

function touchReady(key: string, buf: AudioBuffer) {
  ready.delete(key)
  ready.set(key, buf)
  while (ready.size > BUFFER_CACHE_LIMIT) {
    const oldest = ready.keys().next().value as string
    ready.delete(oldest)
    const url = wavUrls.get(oldest)
    if (url) { URL.revokeObjectURL(url); wavUrls.delete(oldest) }
  }
}

type Fetched = { ok: true; bytes: ArrayBuffer } | { ok: false; reason: 'missing' | 'network' }

async function fetchAudio(url: string, low: boolean, cors: boolean): Promise<Fetched> {
  const init: RequestInit & { priority?: 'high' | 'low' } = { priority: low ? 'low' : 'high' }
  if (cors) { init.mode = 'cors'; init.credentials = 'omit' }
  try {
    const res = await fetch(url, init)
    if (res.status === 404) return { ok: false, reason: 'missing' }
    if (!res.ok) return { ok: false, reason: 'network' }
    // A static host with an SPA fallback answers a missing file with index.html and 200.
    if (/text\/html/i.test(res.headers.get('content-type') ?? '')) return { ok: false, reason: 'missing' }
    return { ok: true, bytes: await res.arrayBuffer() }
  } catch {
    return { ok: false, reason: 'network' }
  }
}

async function decodeNormalized(bytes: ArrayBuffer): Promise<AudioBuffer | null> {
  const dc = decodeContext()
  if (!dc) return null
  try {
    const decoded = await dc.decodeAudioData(bytes)
    const mono = new Float32Array(decoded.length)
    for (let c = 0; c < decoded.numberOfChannels; c++) {
      const ch = decoded.getChannelData(c)
      for (let i = 0; i < ch.length; i++) mono[i] += ch[i] / decoded.numberOfChannels
    }
    const norm = normalizeSpeechSamples(mono, decoded.sampleRate)
    const buf = dc.createBuffer(1, Math.max(1, norm.samples.length), decoded.sampleRate)
    buf.copyToChannel(norm.samples as Float32Array<ArrayBuffer>, 0)
    return buf
  } catch {
    return null
  }
}

function loadSyllable(key: string, low = false): Promise<LoadResult> {
  const hit = ready.get(key)
  if (hit) { touchReady(key, hit); return Promise.resolve({ ok: true, buffer: hit }) }
  // Only shipped syllables are fetched: the CDN mirrors the same set (minus the mislabelled
  // files the build drops), so anything else would just be a 404 round trip.
  if (missing.has(key) || !LOCAL_KEYS.has(key)) return Promise.resolve({ ok: false, reason: 'missing' })
  const inflight = pending.get(key)
  if (inflight) return inflight

  const p = (async (): Promise<LoadResult> => {
    let reason: 'missing' | 'network' | 'decode' = 'missing'
    // 1. Same-origin file (HTTP-cached, works offline once cached).
    const local = await fetchAudio(localUrl(key), low, false)
    if (local.ok) {
      const buf = await decodeNormalized(local.bytes)
      if (buf) { touchReady(key, buf); return { ok: true, buffer: buf } }
      reason = 'decode'
    } else reason = local.reason
    // 2. CDN mirror of the same recordings (e.g. a deploy without the audio folder).
    if (Date.now() >= cdnDownUntil && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
      const cdn = await fetchAudio(`${JSDELIVR_PINYIN_BASE}${key}.mp3`, low, true)
      if (cdn.ok) {
        const buf = await decodeNormalized(cdn.bytes)
        if (buf) { touchReady(key, buf); return { ok: true, buffer: buf } }
        return { ok: false, reason: 'decode' }
      }
      if (cdn.reason === 'network') cdnDownUntil = Date.now() + 30_000
      if (reason === 'missing' && cdn.reason === 'missing') missing.add(key)
      else reason = 'network'
    }
    return { ok: false, reason }
  })()
  pending.set(key, p)
  p.finally(() => pending.delete(key))
  return p
}

// Low-priority warm-up queue.
const prefetchQueue: string[] = []
let prefetchActive = 0
let foreground = 0 // syllables the user is waiting for; prefetch yields bandwidth to them
function pumpPrefetch() {
  while (foreground === 0 && prefetchActive < PREFETCH_CONCURRENCY && prefetchQueue.length) {
    const key = prefetchQueue.shift() as string
    if (ready.has(key) || pending.has(key) || missing.has(key) || !LOCAL_KEYS.has(key)) continue
    prefetchActive++
    loadSyllable(key, true).finally(() => { prefetchActive--; pumpPrefetch() })
  }
}
function queuePrefetch(key: string, front = false) {
  if (navigator.onLine === false) return
  if (!LOCAL_KEYS.has(key) || ready.has(key) || pending.has(key) || missing.has(key) || prefetchQueue.includes(key)) return
  if (front) prefetchQueue.unshift(key)
  else prefetchQueue.push(key)
  if (prefetchQueue.length > 64) prefetchQueue.length = 64
  pumpPrefetch()
}

// Idle warm-up of the HTTP cache with the most frequently played syllables (≈ 2 MB), so their
// first tap needs no network and they still play offline. Bytes only; nothing is decoded.
function warmHttpCache() {
  if (typeof window === 'undefined' || location.protocol === 'file:') return
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  if (conn?.saveData || /2g/.test(conn?.effectiveType ?? '')) return
  const keys = PINYIN_AUDIO_WARM.split(' ').filter((k) => LOCAL_KEYS.has(k))
  let i = 0
  let failures = 0 // consecutive; the folder is missing or the network is gone, so stop
  const next = (): void => {
    if (i >= keys.length || failures >= 3 || navigator.onLine === false) return
    if (foreground > 0 || prefetchActive > 0) { setTimeout(next, 400); return }
    const url = localUrl(keys[i++])
    fetch(url, { priority: 'low' } as RequestInit)
      .then((r) => {
        const ok = r.ok && !/text\/html/i.test(r.headers.get('content-type') ?? '')
        return r.arrayBuffer().then(() => ok)
      })
      .catch(() => false)
      .then((ok) => { failures = ok ? 0 : failures + 1; next() })
  }
  const start = () => { next(); next() }
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
  const later = () => (idle ? idle(start, { timeout: 5000 }) : setTimeout(start, 3000))
  if (document.readyState === 'complete') setTimeout(later, 2000)
  else window.addEventListener('load', () => setTimeout(later, 2000), { once: true })
}
warmHttpCache()

// ---- Output ----------------------------------------------------------------

let playToken = 0
let currentSource: AudioBufferSourceNode | null = null
let currentEl: HTMLAudioElement | null = null
let currentUtterance: SpeechSynthesisUtterance | null = null // kept referenced (Chrome GC bug)

function stopAll() {
  if (currentSource) {
    try { currentSource.stop() } catch { /* already stopped */ }
    currentSource.disconnect()
    currentSource = null
  }
  if (currentEl) {
    currentEl.pause()
    currentEl.removeAttribute('src')
    currentEl.load()
    currentEl = null
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const s = window.speechSynthesis
    if (s.speaking || s.pending) s.cancel()
  }
  currentUtterance = null
}

/** Stop whatever Chinese audio is playing and drop any pending playback. */
export function stopChinese(): void {
  playToken++
  stopAll()
}

function encodeWav(buf: AudioBuffer): Blob {
  const data = buf.getChannelData(0)
  const sr = buf.sampleRate
  const out = new DataView(new ArrayBuffer(44 + data.length * 2))
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); out.setUint32(4, 36 + data.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ')
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true)
  out.setUint32(24, sr, true); out.setUint32(28, sr * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true)
  str(36, 'data'); out.setUint32(40, data.length * 2, true)
  for (let i = 0; i < data.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 0x7fff, true)
  return new Blob([out.buffer], { type: 'audio/wav' })
}

function playElement(src: string, rate: number, volume: number, token: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (token !== playToken) return resolve(false)
    const el = new Audio()
    el.preload = 'auto'
    el.volume = volume
    el.preservesPitch = true // slow playback must keep the tone's pitch
    el.src = src
    // Loading resets playbackRate to defaultPlaybackRate, so set both after src.
    el.defaultPlaybackRate = rate
    el.playbackRate = rate
    currentEl = el
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (!ok && currentEl === el) { el.pause(); currentEl = null }
      resolve(ok)
    }
    const timer = setTimeout(() => finish(false), LOAD_TIMEOUT_MS)
    el.addEventListener('playing', () => finish(true), { once: true })
    el.addEventListener('error', () => finish(false), { once: true })
    el.play().catch(() => finish(false))
  })
}

/** Play a normalised buffer. rate != 1 goes through HTMLAudio so the pitch is preserved. */
function playBuffer(key: string, buf: AudioBuffer, rate: number, token: number): Promise<boolean> {
  if (token !== playToken) return Promise.resolve(false)
  const c = getContext()
  if (Math.abs(rate - 1) < 0.01 && c && master) {
    const src = c.createBufferSource()
    src.buffer = buf
    src.connect(master)
    src.onended = () => { if (currentSource === src) currentSource = null; src.disconnect() }
    src.start()
    currentSource = src
    if (c.state === 'running') return Promise.resolve(true)
    // Context still locked (no user gesture yet): do not let this sound surface later on some
    // unrelated click; give the resume a moment, then use a media element instead.
    return new Promise((resolve) => {
      const t = setTimeout(() => {
        if (token !== playToken) return resolve(false)
        if (c.state === 'running') return resolve(true)
        try { src.stop() } catch { /* not started */ }
        if (currentSource === src) currentSource = null
        resolve(playWav(key, buf, rate, token))
      }, 300)
      c.resume().then(() => { if (c.state === 'running') { clearTimeout(t); resolve(token === playToken) } }, () => {})
    })
  }
  return playWav(key, buf, rate, token)
}

function playWav(key: string, buf: AudioBuffer, rate: number, token: number): Promise<boolean> {
  let url = wavUrls.get(key)
  if (!url) { url = URL.createObjectURL(encodeWav(buf)); wavUrls.set(key, url) }
  return playElement(url, rate, 1, token)
}

// ---- Speech synthesis fallback -------------------------------------------

let zhVoice: SpeechSynthesisVoice | null | undefined
function pickZhVoice(): SpeechSynthesisVoice | null | undefined {
  if (zhVoice !== undefined) return zhVoice
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return undefined
  const rank = (v: SpeechSynthesisVoice) => {
    const lang = v.lang.replace('_', '-').toLowerCase()
    if (lang === 'zh-cn' || lang.startsWith('cmn-hans')) return 0
    if (lang.startsWith('zh') && !/hk|tw|yue/.test(lang)) return 1
    if (/普通话|mandarin|chinese/i.test(v.name)) return 2
    if (lang.startsWith('zh')) return 3
    return 9
  }
  const best = [...voices].sort((a, b) => rank(a) - rank(b) || Number(b.localService) - Number(a.localService))[0]
  zhVoice = best && rank(best) < 9 ? best : null
  return zhVoice
}

function waitForVoices(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const s = window.speechSynthesis
    const t = setTimeout(done, ms)
    function done() { clearTimeout(t); s.removeEventListener('voiceschanged', done); resolve() }
    s.addEventListener('voiceschanged', done)
  })
}

function speakSynth(text: string, rate: number, token: number): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || token !== playToken) return
  const go = () => {
    if (token !== playToken) return
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'
    const v = pickZhVoice()
    if (v) u.voice = v
    u.rate = Math.min(1.2, Math.max(0.5, 0.9 * rate))
    u.pitch = 1
    u.volume = 1
    u.onend = u.onerror = () => { if (currentUtterance === u) currentUtterance = null }
    currentUtterance = u
    window.speechSynthesis.speak(u)
  }
  // Speak synchronously when voices are known (iOS needs the call inside the gesture);
  // otherwise wait briefly for them so the first utterance does not get a random voice.
  if (pickZhVoice() !== undefined) go()
  else waitForVoices(800).then(() => {
    // Still nothing: use the default voice from now on instead of waiting on every call.
    if (pickZhVoice() === undefined) {
      zhVoice = null
      window.speechSynthesis.addEventListener('voiceschanged', () => { zhVoice = undefined }, { once: true })
    }
    go()
  })
}

// ---- Public API ------------------------------------------------------------

/** Pinyin text that is a single syllable, e.g. "hǎo", "hao3", "lǜ", "zh". */
function singleSyllable(s: string): boolean {
  const t = s.trim().toLowerCase()
  if (!t || /[\s'’\-·]/.test(t)) return false
  if (!/^[a-zāáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜüv:]+[1-5]?$/.test(t)) return false
  const marks = t.match(/[āáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ]/g)
  return !marks || marks.length <= 1
}

function syllableKey(s: string): string {
  const { pinyin, tone } = normalizePinyinAudioKey(s.replace(/u:/g, 'ü'))
  return `${pinyin}${tone}`
}

/**
 * Warm the cache for syllables likely to be played next (when a character, chart cell or
 * modal is shown, or on hover). Hanzi and multi-syllable strings are ignored.
 */
export function prefetchChinese(...items: (string | null | undefined)[]): void {
  if (typeof window === 'undefined') return
  for (const it of items) {
    const s = it?.trim()
    if (s && !/[\u4e00-\u9fff]/.test(s) && singleSyllable(s)) queuePrefetch(syllableKey(s), true)
  }
}

function prefetchSiblingTones(key: string) {
  const m = key.match(/^([a-z]+)([1-5])$/)
  if (!m || INITIAL_CONSONANT_MAP[m[1]]) return
  for (const t of [1, 2, 3, 4]) if (String(t) !== m[2]) queuePrefetch(`${m[1]}${t}`)
}

function allsetMayHave(key: string): boolean {
  const m = key.match(/^([a-z]+)([1-4])$/) // no neutral tone (5) there either
  return !!m && !m[1].includes('uu') && VALID_SYLLABLES.has(m[1]) && !secondaryMissing.has(key)
}

async function playSyllable(key: string, fallbackText: string, rate: number, token: number) {
  const hit = ready.get(key)
  let res: LoadResult
  if (hit) {
    touchReady(key, hit)
    res = { ok: true, buffer: hit }
  } else {
    foreground++
    const load = loadSyllable(key)
    load.finally(() => { foreground--; pumpPrefetch() })
    const timeout = new Promise<LoadResult>((r) => setTimeout(() => r({ ok: false, reason: 'network' }), LOAD_TIMEOUT_MS))
    res = await Promise.race([load, timeout])
  }
  if (token !== playToken) return
  if (res.ok && (await playBuffer(key, res.buffer, rate, token))) return
  if (token !== playToken) return
  // Secondary studio CDN: no CORS, so it plays as a plain element at a fixed compensating volume.
  // It has no ü syllables (it spells them differently) and nothing outside the syllable table.
  if (navigator.onLine !== false && Date.now() >= secondaryDownUntil && allsetMayHave(key)) {
    if (await playElement(`${ALLSET_PINYIN_BASE}${key}.mp3`, rate, ALLSET_VOLUME, token)) return
    if (token === playToken) {
      if (!res.ok && res.reason === 'network') secondaryDownUntil = Date.now() + 30_000
      else secondaryMissing.add(key) // reachable but not playable (404 / ORB): don't ask again
    }
  }
  if (token !== playToken) return
  speakSynth(fallbackText, rate, token)
}

/**
 * Universal audio player for Chinese (Hanzi & Pinyin).
 * - A single Pinyin syllable (e.g. "xī", "hǎo", "ca4") plays a native-speaker recording,
 *   normalised to a common loudness with leading silence trimmed.
 * - Hanzi, or a multi-syllable reading, uses the OS Chinese voice (speech synthesis).
 * Only the most recent call is ever heard: a newer call stops and supersedes older ones.
 * @param text Chinese character(s) or Pinyin syllable
 * @param rate Playback speed (1.0 normal, 0.65 slow); pitch is preserved
 * @param pinyinHint Optional exact Pinyin reading to guarantee recording accuracy
 */
export function speakChinese(text: string, rate: number = 1.0, pinyinHint?: string): void {
  if (typeof window === 'undefined') return
  const token = ++playToken
  stopAll()

  const clean = (pinyinHint || text).trim()
  if (!clean) return
  const c = getContext()
  if (c && c.state !== 'running') c.resume().catch(() => {})

  const isHanzi = /[\u4e00-\u9fff]/.test(clean)
  // A hanzi whose reading carries no tone mark or digit is neutral tone (的 de, 吗 ma, 儿 r):
  // there are no neutral-tone recordings, and a tone-1 file would sound wrong, so let the voice say it.
  const neutralHanzi = /[\u4e00-\u9fff]/.test(text) && !!pinyinHint && !/[1-5āáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ]/.test(pinyinHint)
  if (!isHanzi && !neutralHanzi && singleSyllable(clean)) {
    const key = syllableKey(clean)
    const spoken = /[\u4e00-\u9fff]/.test(text) ? text : clean
    // Other tones of the same syllable are the likeliest next clicks; fetch them once this one is in.
    void playSyllable(key, spoken, rate, token).finally(() => prefetchSiblingTones(key))
    return
  }
  // Words / multi-syllable readings: the synthesised voice handles tone sandhi and flow.
  const spoken = /[\u4e00-\u9fff]/.test(text) ? text : clean
  speakSynth(spoken, rate, token)
}
