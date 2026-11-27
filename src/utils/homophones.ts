import type { BundleCharacter } from '../core'
import { normalizeFolded } from './search'
import { toneOf } from './tone'

/** One homophone candidate: the character plus the reading that made it match. */
export interface HomophoneHit {
  c: BundleCharacter
  pinyin: string
  hanViet: string | null
  meaningVi: string
}

export type HomophoneMode = 'hv' | 'hvLoose' | 'py' | 'pyLoose'

interface HomophoneIndex {
  maps: Record<HomophoneMode, Map<string, BundleCharacter[]>>
  rank: Map<string, number>
}

/** Hán Việt fields may hold several readings ("hành, hàng"); split them. */
function hvParts(hv: string | null): string[] {
  if (!hv) return []
  return hv
    .split(/[,;/]/)
    .map((s) => s.trim().toLowerCase().normalize('NFC'))
    .filter(Boolean)
}

/** Single-syllable pinyin only (multi-syllable readings are not homophones of a char). */
function pyKeys(py: string): { exact: string; loose: string } | null {
  const s = py.trim().toLowerCase()
  if (!s || /\s/.test(s)) return null
  const loose = normalizeFolded(s).replace(/v/g, 'u')
  return { exact: `${loose}${toneOf(s)}`, loose }
}

export function readingKeys(pinyin: string, hanViet: string | null): Partial<Record<HomophoneMode, string[]>> {
  const hv = hvParts(hanViet)
  const py = pyKeys(pinyin)
  return {
    hv,
    hvLoose: [...new Set(hv.map((h) => normalizeFolded(h)))],
    py: py ? [py.exact] : [],
    pyLoose: py ? [py.loose] : [],
  }
}

let cache: { src: readonly BundleCharacter[]; idx: HomophoneIndex } | null = null

function buildIndex(chars: readonly BundleCharacter[]): HomophoneIndex {
  if (cache && cache.src === chars) return cache.idx
  const maps: HomophoneIndex['maps'] = { hv: new Map(), hvLoose: new Map(), py: new Map(), pyLoose: new Map() }
  // Bundle order is the frequency proxy (data is imported frequency-first within each level).
  const rank = new Map<string, number>()
  chars.forEach((c, i) => {
    const lvl = c.hsk3Level ?? c.hsk2Level ?? 99
    rank.set(c.hanzi, lvl * 100000 + i)
    for (const r of c.readings) {
      const keys = readingKeys(r.pinyin, r.hanViet)
      for (const mode of Object.keys(maps) as HomophoneMode[]) {
        for (const k of keys[mode] ?? []) {
          let list = maps[mode].get(k)
          if (!list) maps[mode].set(k, (list = []))
          if (list[list.length - 1] !== c) list.push(c)
        }
      }
    }
  })
  for (const m of Object.values(maps)) for (const list of m.values()) list.sort((a, b) => rank.get(a.hanzi)! - rank.get(b.hanzi)!)
  const idx = { maps, rank }
  cache = { src: chars, idx }
  return idx
}

/** The reading of `c` that matched `key` under `mode`, so the panel shows the relevant pinyin/meaning. */
function matchingReading(c: BundleCharacter, mode: HomophoneMode, key: string) {
  return c.readings.find((r) => readingKeys(r.pinyin, r.hanViet)[mode]?.includes(key)) ?? c.readings[0]
}

/**
 * Characters sharing a reading with `target` (all readings considered), excluding `target`.
 * Deduped, sorted by HSK level then frequency.
 */
export function findHomophones(chars: readonly BundleCharacter[], target: BundleCharacter, mode: HomophoneMode, onlyReading?: { pinyin: string; hanViet: string | null }): HomophoneHit[] {
  const idx = buildIndex(chars)
  const readings = onlyReading ? [onlyReading] : target.readings
  const seen = new Set<string>([target.hanzi])
  const out: HomophoneHit[] = []
  for (const r of readings) {
    for (const k of readingKeys(r.pinyin, r.hanViet)[mode] ?? []) {
      for (const c of idx.maps[mode].get(k) ?? []) {
        if (seen.has(c.hanzi)) continue
        seen.add(c.hanzi)
        const m = matchingReading(c, mode, k)
        out.push({ c, pinyin: m?.pinyin ?? '', hanViet: m?.hanViet ?? null, meaningVi: m?.meaningVi ?? '' })
      }
    }
  }
  return out.sort((a, b) => idx.rank.get(a.c.hanzi)! - idx.rank.get(b.c.hanzi)!)
}

/** All characters whose Hán Việt equals `query` (folded) — for the search "Đồng âm" header. */
export function charsByHanViet(chars: readonly BundleCharacter[], query: string): BundleCharacter[] {
  const q = normalizeFolded(query)
  if (!q || /\s/.test(q)) return []
  return buildIndex(chars).maps.hvLoose.get(q) ?? []
}
