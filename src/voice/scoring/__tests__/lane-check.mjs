// Fraction of native tokens rated 'good' whose contour lies mostly (≥70% of points) inside the UI lane.
import fs from 'node:fs'
import path from 'node:path'
import { scoreTone, NATIVE_TEMPLATES, NATIVE_BAND, contourAt } from '../index.ts'
import { rangeFromCalibration } from '../../engine/range.ts'
const DIR = process.argv[2] ?? '/tmp/claude-1000/-mnt-sda1-hieubm-Hibu-Hanzi/88cd1e47-1511-4ce0-b36f-1dc12fc21aa0/scratchpad/tone/frames'
const band = (t, x) => { const m = contourAt(NATIVE_TEMPLATES[t], x); return [Math.min(m - 0.5, contourAt(NATIVE_BAND[t].lo, x)), Math.max(m + 0.5, contourAt(NATIVE_BAND[t].hi, x))] }
for (const sp of fs.readdirSync(DIR)) {
  const d = path.join(DIR, sp); const L = (n) => JSON.parse(fs.readFileSync(path.join(d, n + '.json'), 'utf8'))
  const range = rangeFromCalibration(['ma1', 'ma2', 'ma3', 'ma4'].map(L))
  const st = { 1: [0, 0], 2: [0, 0], 3: [0, 0], 4: [0, 0] }; const tol = 0.25
  for (const f of fs.readdirSync(d)) { const m = f.match(/^([a-z]+)([1-4])\.json$/); if (!m) continue; const t = +m[2]; const r = scoreTone(L(m[1] + m[2]), t, range); if (r.feedback[0] !== 'good') continue
    const inside = r.contour.filter((p) => { const [lo, hi] = band(t, p.x); return p.y >= lo - tol && p.y <= hi + tol }).length / r.contour.length
    st[t][1]++; if (inside >= 0.7) st[t][0]++ }
  console.log(sp, Object.entries(st).map(([t, [a, n]]) => `T${t} ${(a / n * 100).toFixed(1)}% (${n})`).join('  '))
}
