/**
 * YIN pitch detector (de Cheveigné & Kawahara 2002), tuned for speech 70–500 Hz.
 * Pure functions, no DOM — used by the realtime engine and by offline tests.
 */

export interface YinResult {
  /** Hz, or null when no periodicity found */
  hz: number | null
  /** 1 - d'(tau) at the chosen lag, 0..1 */
  clarity: number
}

export interface YinOptions {
  sampleRate: number
  minHz?: number
  maxHz?: number
  /** absolute threshold on the CMND function (0.10–0.20 typical) */
  threshold?: number
}

/**
 * Run YIN on `buf` (the whole buffer is used: window W = buf.length - tauMax).
 * `scratch` may be passed to avoid allocation per frame.
 */
export function yin(buf: Float32Array, opts: YinOptions, scratch?: Float32Array): YinResult {
  const sr = opts.sampleRate
  const minHz = opts.minHz ?? 70
  const maxHz = opts.maxHz ?? 500
  const thr = opts.threshold ?? 0.15
  const tauMin = Math.max(2, Math.floor(sr / maxHz))
  const tauMax = Math.min(Math.ceil(sr / minHz), Math.floor(buf.length / 2))
  const W = buf.length - tauMax
  if (W < tauMax || tauMax <= tauMin) return { hz: null, clarity: 0 }
  const d = scratch && scratch.length >= tauMax + 1 ? scratch : new Float32Array(tauMax + 1)

  // difference function
  for (let tau = 1; tau <= tauMax; tau++) {
    let s = 0
    for (let i = 0; i < W; i++) {
      const x = buf[i] - buf[i + tau]
      s += x * x
    }
    d[tau] = s
  }
  // cumulative mean normalized difference
  d[0] = 1
  let run = 0
  for (let tau = 1; tau <= tauMax; tau++) {
    run += d[tau]
    d[tau] = run > 0 ? (d[tau] * tau) / run : 1
  }

  // first dip below threshold (take its local minimum); else global minimum
  let best = -1
  for (let tau = tauMin; tau <= tauMax; tau++) {
    if (d[tau] < thr) {
      while (tau + 1 <= tauMax && d[tau + 1] < d[tau]) tau++
      best = tau
      break
    }
  }
  if (best < 0) {
    // No dip under the threshold: take the global minimum, but prefer an earlier
    // local minimum that is nearly as deep (avoids picking 2·T0 → octave-down errors).
    let mv = Infinity
    for (let tau = tauMin; tau <= tauMax; tau++) if (d[tau] < mv) { mv = d[tau]; best = tau }
    const tol = mv + 0.1
    for (let tau = tauMin + 1; tau < best; tau++) {
      if (d[tau] <= tol && d[tau] <= d[tau - 1] && d[tau] <= d[tau + 1]) { best = tau; break }
    }
  }
  if (best <= tauMin || best >= tauMax) {
    return { hz: null, clarity: Math.max(0, 1 - d[best] ) * 0.5 }
  }
  // parabolic interpolation
  const a = d[best - 1], b = d[best], c = d[best + 1]
  const den = a - 2 * b + c
  const shift = den !== 0 ? (0.5 * (a - c)) / den : 0
  const tauF = best + Math.max(-1, Math.min(1, shift))
  const clarity = Math.max(0, Math.min(1, 1 - b))
  return { hz: sr / tauF, clarity }
}

/** Decimate by an integer factor with a simple boxcar+triangle low-pass (good enough for f0 < 500 Hz). */
export function decimate(input: Float32Array, factor: number, out?: Float32Array): Float32Array {
  if (factor <= 1) return input
  const n = Math.floor(input.length / factor)
  const o = out && out.length === n ? out : new Float32Array(n)
  for (let j = 0; j < n; j++) {
    const base = j * factor
    let s = 0, w = 0
    for (let k = -factor + 1; k < factor; k++) {
      const idx = base + k
      if (idx < 0 || idx >= input.length) continue
      const wk = factor - Math.abs(k)
      s += input[idx] * wk
      w += wk
    }
    o[j] = s / w
  }
  return o
}
