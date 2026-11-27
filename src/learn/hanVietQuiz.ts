// "Guess the meaning via Hán Việt" quiz logic (pure, no React).
import type { Word, BundleCharacter } from '../core'
import { TRAP_BY_WORD } from './hanVietTraps'
import type { HanVietTrap } from './hanVietTraps'

export type WordClass = 'trong-suot' | 'lech' | 'bay'
export interface CharPart { hanzi: string; hanViet: string | null; meaning: string | null }
export interface QuizQuestion {
  word: Word
  parts: CharPart[]
  options: string[]
  answerIndex: number
  cls: WordClass
  trap: HanVietTrap | null
}
export type QuizScope =
  | { kind: 'level'; level: number }
  | { kind: 'learned'; maxLevel: number; known?: readonly string[] }
  | { kind: 'favorites'; hanzi: string[] }
  | { kind: 'char'; hanzi: string }

const MAX_LEN = 60

// ---------- text helpers ----------
function norm(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
}
/** Split on ; , but not inside parentheses (so "mở (cửa hàng, khóa học)" stays one sense). */
function splitTop(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(' || ch === '（') depth++
    else if ((ch === ')' || ch === '）') && depth > 0) depth--
    if (depth === 0 && /[;,，；]/.test(ch)) { out.push(cur); cur = '' } else cur += ch
  }
  out.push(cur)
  return out.map((x) => x.trim()).filter(Boolean)
}
function senses(s: string): string[] {
  return splitTop(s)
}
function hasPhrase(hay: string, needle: string): boolean {
  return needle.length > 0 && (' ' + hay + ' ').includes(' ' + needle + ' ')
}
function jaccard(a: string, b: string): number {
  const A = new Set(a.split(' ').filter(Boolean))
  const B = new Set(b.split(' ').filter(Boolean))
  if (!A.size || !B.size) return 0
  let i = 0
  for (const t of A) if (B.has(t)) i++
  return i / (A.size + B.size - i)
}
const stripTone = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '')
/** Remove parenthetical notes that would give the answer away or look odd: ones containing Chinese
 *  characters (e.g. "(外来语 từ ngoại lai)") and pinyin-only hints (e.g. "(dàyi)"). */
function cleanMeaning(m: string, pinyin: string | undefined): string {
  const py = stripTone(pinyin ?? '')
  const out = m.replace(/[(（]([^()（）]*)[)）]/g, (all, inner: string) => {
    if (/[\u3400-\u9fff]/.test(inner)) return ''
    if (py && stripTone(inner) === py) return ''
    return all
  })
  return out.replace(/\s+/g, ' ').replace(/^[\s;,，；]+|[\s;,，；]+$/g, '').replace(/([;,，；])\s*(?=[;,，；])/g, '').trim() || m.trim()
}
/** Full meaning, but cut at a sense boundary when longer than MAX_LEN. */
function displayMeaning(m: string, pinyin?: string): string {
  const t = cleanMeaning(m.trim(), pinyin)
  if (t.length <= MAX_LEN) return t
  const parts = splitTop(t)
  let acc = ''
  for (const p of parts) {
    const next = acc ? acc + '; ' + p : p
    if (next.length > MAX_LEN) break
    acc = next
  }
  return acc || parts[0] || t
}

interface Info { hv: string; mean: string; first: string; sense: Set<string> }
const infoCache = new WeakMap<Word, Info>()
function info(w: Word): Info {
  let i = infoCache.get(w)
  if (!i) {
    const ss = senses(w.meaningVi).map(norm).filter(Boolean)
    i = { hv: norm(w.hanViet ?? ''), mean: norm(w.meaningVi), first: ss[0] ?? '', sense: new Set(ss) }
    infoCache.set(w, i)
  }
  return i
}

// ---------- eligibility / scope ----------
export function eligibleWords(words: readonly Word[]): Word[] {
  return words.filter((w) => [...w.word].length >= 2 && !!w.hanViet?.trim() && !!w.meaningVi?.trim())
}

export function wordsForScope(words: readonly Word[], scope: QuizScope): Word[] {
  const el = eligibleWords(words)
  switch (scope.kind) {
    case 'level': return el.filter((w) => w.hsk3Level === scope.level)
    case 'learned': {
      // Known characters (Team 1's "Đã thuộc") win: words made only of known chars; else the HSK range.
      if (scope.known && scope.known.length) {
        const k = new Set(scope.known)
        return el.filter((w) => Array.from(w.word).every((ch) => k.has(ch)))
      }
      return el.filter((w) => w.hsk3Level != null && w.hsk3Level <= scope.maxLevel)
    }
    case 'favorites': {
      const fav = new Set(scope.hanzi)
      return fav.size ? el.filter((w) => [...w.word].some((c) => fav.has(c))) : []
    }
    case 'char': return el.filter((w) => w.word.includes(scope.hanzi))
  }
}

// ---------- classification ----------
export function classifyWord(word: Word): WordClass {
  const trap = TRAP_BY_WORD.get(word.word)
  if (trap) return trap.kind
  const { hv, mean } = info(word)
  if (!hv) return 'lech'
  if (hasPhrase(mean, hv)) return 'trong-suot'
  const syl = hv.split(' ')
  if (syl.length >= 2 && syl.every((s) => hasPhrase(mean, s))) return 'trong-suot'
  return 'lech'
}

// ---------- char parts ----------
export function charParts(word: Word, charMap: ReadonlyMap<string, BundleCharacter>): CharPart[] {
  const chars = [...word.word]
  const syl = (word.hanViet ?? '').trim().split(/\s+/).filter(Boolean)
  const useSyl = syl.length === chars.length
  return chars.map((hanzi, i) => {
    const c = charMap.get(hanzi)
    const r = c?.readings?.find((x) => x.isPrimary) ?? c?.readings?.[0]
    const hv = (useSyl ? syl[i] : r?.hanViet) || r?.hanViet || null
    return { hanzi, hanViet: hv || null, meaning: r?.meaningVi || null }
  })
}

// ---------- memory ----------
const KEY = 'hibu_quiz_v1'
const CAP = 200
type WrongMap = Record<string, { n: number; t: number }>
function readWrong(): WrongMap {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const o = JSON.parse(raw)
    return o && o.v === 1 && o.wrong && typeof o.wrong === 'object' ? (o.wrong as WrongMap) : {}
  } catch { return {} }
}
function writeWrong(wrong: WrongMap): void {
  try {
    const keys = Object.keys(wrong)
    if (keys.length > CAP) {
      keys.sort((a, b) => wrong[a].t - wrong[b].t)
      for (const k of keys.slice(0, keys.length - CAP)) delete wrong[k]
    }
    localStorage.setItem(KEY, JSON.stringify({ v: 1, wrong }))
  } catch { /* ignore */ }
}
export function recordAnswer(word: string, correct: boolean): void {
  try {
    const wrong = readWrong()
    const cur = wrong[word]
    if (correct) {
      if (!cur) return
      if (cur.n <= 1) delete wrong[word]
      else wrong[word] = { n: cur.n - 1, t: Date.now() }
    } else {
      wrong[word] = { n: (cur?.n ?? 0) + 1, t: Date.now() }
    }
    writeWrong(wrong)
  } catch { /* ignore */ }
}
export function loadWrongWords(): string[] {
  const w = readWrong()
  return Object.keys(w).sort((a, b) => w[b].t - w[a].t)
}

// ---------- session ----------
function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function tooSimilar(a: Info, b: Info): boolean {
  if (!a.mean || !b.mean) return true
  if (a.mean === b.mean || a.mean.includes(b.mean) || b.mean.includes(a.mean)) return true
  if (a.first && b.first && (a.first.includes(b.first) || b.first.includes(a.first))) return true
  if (jaccard(a.first, b.first) >= 0.5) return true
  for (const s of a.sense) if (b.sense.has(s)) return true
  return false
}

function pickDistractors(answer: Word, pool: readonly Word[], rng: () => number): Word[] {
  const ai = info(answer)
  const aLen = answer.meaningVi.length
  const aChars = [...answer.word].length
  const lvl = answer.hsk3Level
  const cands: { w: Word; score: number }[] = []
  for (const w of pool) {
    if (w.word === answer.word) continue
    const wi = info(w)
    if (wi.hv === ai.hv) continue
    if (hasPhrase(wi.mean, ai.hv)) continue
    if (tooSimilar(ai, wi)) continue
    const ld = lvl != null && w.hsk3Level != null ? Math.abs(w.hsk3Level - lvl) : 9
    const tier = ld === 0 ? 0 : ld === 1 ? 1 : 2
    const score = tier * 1000 + Math.abs(w.meaningVi.length - aLen) + Math.abs([...w.word].length - aChars) * 6 + rng() * 12
    cands.push({ w, score })
  }
  cands.sort((x, y) => x.score - y.score)
  const out: Word[] = []
  const infos: Info[] = []
  for (const { w } of cands.slice(0, 60)) {
    const wi = info(w)
    if (infos.some((o) => tooSimilar(o, wi) || o.hv === wi.hv)) continue
    out.push(w); infos.push(wi)
    if (out.length === 3) break
  }
  return out
}

export function buildSession(opts: {
  words: readonly Word[]
  characters: readonly BundleCharacter[]
  scope: QuizScope
  size?: number
  rng?: () => number
}): QuizQuestion[] {
  const rng = opts.rng ?? Math.random
  const size = opts.size ?? 10
  const pool = eligibleWords(opts.words)
  const inScope = wordsForScope(opts.words, opts.scope)
  const charMap = new Map<string, BundleCharacter>()
  for (const c of opts.characters) {
    charMap.set(c.hanzi, c)
    if (c.traditional && !charMap.has(c.traditional)) charMap.set(c.traditional, c)
  }

  const byWord = new Map(inScope.map((w) => [w.word, w]))
  const chosen: Word[] = []
  const used = new Set<string>()
  const add = (w: Word | undefined) => {
    if (w && !used.has(w.word) && chosen.length < size) { used.add(w.word); chosen.push(w) }
  }
  // previously wrong first (up to half)
  const half = Math.ceil(size / 2)
  for (const k of shuffle(loadWrongWords().filter((x) => byWord.has(x)), rng).slice(0, half)) add(byWord.get(k))
  // traps present in scope (up to ~third of session)
  const traps = shuffle(inScope.filter((w) => TRAP_BY_WORD.has(w.word)), rng)
  const trapQuota = Math.min(traps.length, Math.max(1, Math.floor(size / 3)))
  let t = 0
  for (const w of traps) { if (t >= trapQuota) break; if (!used.has(w.word)) { add(w); t++ } }
  for (const w of shuffle(inScope, rng)) add(w)

  const questions: QuizQuestion[] = []
  for (const w of shuffle(chosen, rng)) {
    const ds = pickDistractors(w, pool, rng)
    if (ds.length < 3) continue
    const opts4 = shuffle([w, ...ds], rng)
    questions.push({
      word: w,
      parts: charParts(w, charMap),
      options: opts4.map((x) => displayMeaning(x.meaningVi, x.pinyin)),
      answerIndex: opts4.indexOf(w),
      cls: classifyWord(w),
      trap: TRAP_BY_WORD.get(w.word) ?? null,
    })
  }
  return questions
}
