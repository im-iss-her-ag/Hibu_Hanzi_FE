// Tone scoring evaluation. Plain JS (kept out of tsc + bundle); run with:
//   npx tsx src/voice/scoring/__tests__/eval.mjs [framesDir] [outDir]
// framesDir/<speaker>/<syllable><tone>.json = PitchFrame[] (e.g. produced by Team A's PitchTracker from native MP3s).
import fs from 'node:fs'
import path from 'node:path'
import { scoreTone, estimateRange, chaoToHz, resultMessages } from '../index.ts'
import { rangeFromCalibration } from '../../engine/range.ts'

const SP = '/tmp/claude-1000/-mnt-sda1-hieubm-Hibu-Hanzi/88cd1e47-1511-4ce0-b36f-1dc12fc21aa0/scratchpad/tone'
const DIR = process.argv[2] ?? SP + '/frames'
const OUT = process.argv[3] ?? SP + '/scoring'
fs.mkdirSync(OUT, { recursive: true })
let seed = 7
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647

const sets = {}
if (fs.existsSync(DIR)) for (const sp of fs.readdirSync(DIR)) {
  const d = path.join(DIR, sp); if (!fs.statSync(d).isDirectory()) continue
  sets[sp] = fs.readdirSync(d).flatMap((f) => { const m = f.match(/^([a-z]+)([1-4])\.json$/); return m ? [{ name: m[1] + m[2], tone: +m[2], frames: JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')) }] : [] })
}

function run(items, range, xf = (f) => f) {
  const cm = [1, 2, 3, 4].map(() => [0, 0, 0, 0, 0]); const errors = []; let sc = 0; const fbCount = {}; let accepted = 0; const rejects = []
  for (const it of items) {
    const r = scoreTone(xf(it.frames), it.tone, range)
    cm[it.tone - 1][r.detected ?? 0]++; sc += r.score
    for (const c of r.feedback) fbCount[c] = (fbCount[c] ?? 0) + 1
    if (r.detected !== it.tone) errors.push(`${it.name}->${r.detected}`)
    if (r.score >= 90 && r.feedback[0] === 'good') accepted++; else rejects.push(`${it.name}:${r.score}:${r.feedback.join('+')}`)
  }
  const perTone = cm.map((row, i) => +(row[i + 1] / Math.max(1, row.reduce((a, b) => a + b, 0))).toFixed(3))
  return { n: items.length, accuracy: +(cm.reduce((a, row, i) => a + row[i + 1], 0) / Math.max(1, items.length)).toFixed(4), perTone, meanScore: +(sc / Math.max(1, items.length)).toFixed(1), confusion: cm, feedback: fbCount, goodAndGe90: +(accepted / Math.max(1, items.length)).toFixed(4), errors, rejects }
}
const scaleHz = (k) => (f) => f.map((x) => ({ ...x, hz: x.hz == null ? null : x.hz * k }))
const scaleR = (r, k) => ({ ...r, lowHz: r.lowHz * k, highHz: r.highHz * k })
const jitter = (st, drop) => (f) => f.map((x) => x.hz == null ? x : rnd() < drop ? { ...x, hz: null, clarity: 0.2 } : rnd() < 0.03 ? { ...x, hz: x.hz * (rnd() < 0.5 ? 2 : 0.5) } : { ...x, hz: x.hz * 2 ** (((rnd() * 2 - 1) * st) / 12) })
const truncStart = (p) => (f) => { const v = f.map((x, i) => [x, i]).filter(([x]) => x.hz != null); if (!v.length) return f; const a = v[0][1], b = v.at(-1)[1]; return f.slice(a + Math.floor((b - a) * p)) }

const report = { framesDir: DIR, speakers: {} }
const all = []
for (const [sp, items] of Object.entries(sets)) {
  // end-to-end: calibrate from this speaker's mā má mǎ mà exactly like the UI does
  const byName = Object.fromEntries(items.map((i) => [i.name, i.frames]))
  const calib = (xf = (f) => f) => rangeFromCalibration(['ma1', 'ma2', 'ma3', 'ma4'].map((n) => xf(byName[n])))
  const range = calib() ?? estimateRange(items.map((i) => i.frames))
  all.push(...items.map((i) => ({ ...i, sp, range })))
  const R = { calibratedRange: range, range: [Math.round(range.lowHz), Math.round(range.highHz)], native: run(items, range) }
  R['percentile range (old)'] = run(items, estimateRange(items.map((i) => i.frames)))
  for (const k of [0.6, 1.4]) R['pitch×' + k + ' re-calibrated'] = run(items, calib(scaleHz(k)), scaleHz(k))
  R['pitch×0.8 range NOT adapted'] = run(items, range, scaleHz(0.8))
  R['pitch×0.6 default range'] = run(items, { lowHz: 90, highHz: 260, source: 'default' }, scaleHz(0.6))
  R['jitter±0.6st +15% drop +3% octave'] = run(items, range, jitter(0.6, 0.15))
  R['start truncated 20%'] = run(items, range, truncStart(0.2))
  report.speakers[sp] = R
}
if (all.length) {
  const tot = [1, 2, 3, 4].map(() => [0, 0, 0, 0, 0])
  for (const sp of Object.values(report.speakers)) sp.native.confusion.forEach((row, i) => row.forEach((v, j) => (tot[i][j] += v)))
  report.nativeTotal = { n: all.length, accuracy: +(tot.reduce((a, r, i) => a + r[i + 1], 0) / all.length).toFixed(4), confusion: tot }
}

// synthetic learner errors (Chao contours → frames), default mid range
const R0 = { lowHz: 120, highHz: 300, source: 'calibrated' }
function synth(fn, ms = 450) { const fr = []; for (let t = 0; t <= ms; t += 20) { const x = t / ms; fr.push({ t, hz: chaoToHz(fn(x), R0) * 2 ** (((rnd() * 2 - 1) * 0.2) / 12), clarity: 0.9, level: 0.1 }) } return fr }
const cases = {
  'T1 ideal 55': [1, (x) => 5],
  'T1 too low 33': [1, (x) => 3],
  'T1 wobbly': [1, (x) => 4.7 + 0.5 * Math.sin(x * 12)],
  'T2 ideal 35': [2, (x) => 3 + 2 * x],
  'T2 rising too late': [2, (x) => (x < 0.6 ? 2.6 - 0.6 * x : 2.24 + ((x - 0.6) / 0.4) * 2.2)],
  'T2 weak rise 3→3.5': [2, (x) => 3 + x * 0.5],
  'T3 full 214': [3, (x) => (x < 0.5 ? 2 - 2 * x : 1 + (x - 0.5) * 6)],
  'T3 low dip 211': [3, (x) => (x < 0.6 ? 2.2 - 2 * x : 1 + (x - 0.6))],
  'T3 not low (323)': [3, (x) => (x < 0.5 ? 3.2 - 1.2 * x : 2.6 + (x - 0.5) * 1.5)],
  'T4 ideal 51': [4, (x) => 5 - 4 * x],
  'T4 falls only 5→3': [4, (x) => 5 - 2 * x],
  'T4 starts mid 3→1': [4, (x) => 3.2 - 2.2 * x],
  'wrong tone: T2 said for T4': [4, (x) => 3 + 2 * x],
  'wrong tone: T4 said for T1': [1, (x) => 5 - 4 * x],
  'wrong tone: T3 said for T2': [2, (x) => (x < 0.5 ? 2 - 2 * x : 1 + (x - 0.5) * 6)],
  'T5 neutral short': [5, (x) => 2.5 - 0.5 * x, 180],
}
report.learner = {}
for (const [name, [tone, fn, ms]] of Object.entries(cases)) {
  const r = scoreTone(synth(fn, ms), tone, R0)
  report.learner[name] = { detected: r.detected, score: r.score, feedback: r.feedback, messages: resultMessages(r) }
}
report.edge = { empty: scoreTone([], 2, R0).feedback, unvoiced: scoreTone([{ t: 0, hz: null, clarity: 0, level: 0 }], 4, R0).feedback, short: scoreTone(synth(() => 4, 60), 1, R0).feedback }

fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(report, null, 1))
for (const [sp, R] of Object.entries(report.speakers)) for (const [k, r] of Object.entries(R)) if (r.n) console.log(sp.padEnd(7), k.padEnd(34), 'acc', r.accuracy, 'good&≥90', r.goodAndGe90, 'per', r.perTone.join(' '), 'score', r.meanScore, process.env.V ? r.rejects.slice(0, +process.env.V).join(' ') : '')
if (report.nativeTotal) console.log('NATIVE TOTAL', JSON.stringify(report.nativeTotal))
for (const [k, v] of Object.entries(report.learner)) console.log(k.padEnd(20), 'det', v.detected, 'score', v.score, v.feedback.join(','), '|', v.messages.join(' '))
console.log('edge', JSON.stringify(report.edge))
