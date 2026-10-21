import type { BundleCharacter, Component, Word } from './types'

// Radical browsing: group a radical with its positional variants (水 / 氵), find every character
// that contains it anywhere in its structure, and match radicals from a beginner's search query.

export interface RadicalFamily {
  // The base form (水); variants point to it through variantOf.
  key: string
  // Every form of the radical: base first, then variants (水 氵 氺).
  forms: string[]
  // The form learners see most often in characters (氵 rather than 水).
  display: string
  info: Component
  count: number
}

// Lowercase without Vietnamese or pinyin diacritics, so "thuy", "thủy" and "THỦY" all match.
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/ü/g, 'u')
    .toLowerCase()
    .trim()
}

// Whole-word match inside a meaning, so "nuoc" finds "nước" but "hao" does not find "hào phóng".
function meaningHas(meaning: string, q: string): boolean {
  if (q.length < 2) return false
  const text = ` ${normalizeText(meaning).replace(/[^a-z0-9]+/g, ' ')} `
  return text.includes(` ${q.replace(/[^a-z0-9]+/g, ' ').trim()} `)
}

const familyKey = (form: string, byForm: Map<string, Component>) => byForm.get(form)?.variantOf ?? form

// Every form a character contains: its radical, its parts, and the parts of those parts when they
// are characters too (想 = 相 + 心, 相 = 木 + 目, so 想 contains 木).
export function containedForms(chars: readonly BundleCharacter[]): Map<string, Set<string>> {
  const partsOf = new Map(chars.map((c) => [c.hanzi, c.parts ?? []]))
  const memo = new Map<string, Set<string>>()

  const expand = (hanzi: string, seen: Set<string>): Set<string> => {
    const cached = memo.get(hanzi)
    if (cached) return cached
    const out = new Set<string>()
    for (const p of partsOf.get(hanzi) ?? []) {
      out.add(p)
      if (!seen.has(p) && partsOf.has(p)) {
        seen.add(p)
        for (const q of expand(p, seen)) out.add(q)
      }
    }
    memo.set(hanzi, out)
    return out
  }

  const result = new Map<string, Set<string>>()
  for (const c of chars) {
    const forms = new Set(expand(c.hanzi, new Set([c.hanzi])))
    if (c.radical) forms.add(c.radical)
    result.set(c.hanzi, forms)
  }
  return result
}

export function radicalFamilies(
  chars: readonly BundleCharacter[],
  components: readonly Component[],
  contained: Map<string, Set<string>> = containedForms(chars),
): RadicalFamily[] {
  const byForm = new Map(components.map((c) => [c.form, c]))
  const families = new Map<string, { forms: Set<string>; perForm: Map<string, number>; chars: Set<string> }>()

  for (const comp of components) {
    if (!comp.isRadical) continue
    const key = familyKey(comp.form, byForm)
    const fam = families.get(key) ?? { forms: new Set([key]), perForm: new Map(), chars: new Set() }
    fam.forms.add(comp.form)
    families.set(key, fam)
  }

  for (const [hanzi, forms] of contained) {
    for (const f of forms) {
      const fam = families.get(familyKey(f, byForm))
      if (!fam || !fam.forms.has(f)) continue
      fam.chars.add(hanzi)
      fam.perForm.set(f, (fam.perForm.get(f) ?? 0) + 1)
    }
  }

  const out: RadicalFamily[] = []
  for (const [key, fam] of families) {
    const info = byForm.get(key) ?? [...fam.forms].map((f) => byForm.get(f)).find(Boolean)
    if (!info || fam.chars.size === 0) continue
    const display = [...fam.perForm].sort((a, b) => b[1] - a[1])[0]?.[0] ?? key
    out.push({ key, forms: [key, ...[...fam.forms].filter((f) => f !== key)], display, info, count: fam.chars.size })
  }
  return out.sort((a, b) => b.count - a.count)
}

// Characters containing any form of the family, easiest (lowest HSK level) first.
export function charactersWithRadical(
  chars: readonly BundleCharacter[],
  family: RadicalFamily,
  contained: Map<string, Set<string>> = containedForms(chars),
): BundleCharacter[] {
  return chars
    .filter((c) => c.hanzi !== family.key && family.forms.some((f) => contained.get(c.hanzi)?.has(f)))
    .sort((a, b) => (a.hsk3Level ?? 9) - (b.hsk3Level ?? 9))
}

export function findFamily(families: readonly RadicalFamily[], form: string): RadicalFamily | null {
  return families.find((f) => f.forms.includes(form)) ?? null
}

// A radical matches its glyph, its Han-Viet ("thuy"), its name ("bo thuy") or its meaning ("nuoc").
export function searchRadicals(families: readonly RadicalFamily[], query: string): RadicalFamily[] {
  const raw = query.trim()
  if (!raw) return []
  const q = normalizeText(raw).replace(/^bo\s+/, '')
  return families.filter((f) => {
    if (f.forms.some((form) => raw.includes(form))) return true
    if (!q) return false
    const hv = normalizeText(f.info.hanViet ?? '')
    const name = normalizeText(f.info.nameVi ?? '').replace(/^bo\s+/, '')
    const meaning = normalizeText(f.info.meaningVi ?? '')
    return hv === q || name === q || meaningHas(meaning, q)
  })
}

// Accent-insensitive character search shared by the sidebar and the search dialog.
// Rank 0 = the glyph or a reading matches exactly, 1 = the meaning matches, null = no match.
export function characterMatchRank(c: BundleCharacter, query: string): 0 | 1 | null {
  const raw = query.trim()
  if (!raw) return 0
  // Typing a word (你好) lists the characters it is made of.
  if (raw.includes(c.hanzi) || (c.traditional && raw.includes(c.traditional))) return 0
  const q = normalizeText(raw)
  const compact = q.replace(/\s+/g, '')
  if (c.readings.some((r) => normalizeText(r.pinyin).replace(/\s+/g, '') === compact || normalizeText(r.hanViet ?? '') === q)) {
    return 0
  }
  return c.readings.some((r) => meaningHas(r.meaningVi, q)) ? 1 : null
}

export function matchesCharacter(c: BundleCharacter, query: string): boolean {
  return characterMatchRank(c, query) !== null
}

// Matching characters, exact readings first, then by HSK level.
export function searchCharacters<T extends BundleCharacter>(chars: readonly T[], query: string): T[] {
  return chars
    .map((c) => ({ c, rank: characterMatchRank(c, query) }))
    .filter((x): x is { c: T; rank: 0 | 1 } => x.rank !== null)
    .sort((a, b) => a.rank - b.rank || (a.c.hsk3Level ?? 9) - (b.c.hsk3Level ?? 9))
    .map((x) => x.c)
}

export function matchesWord(w: Word, query: string): boolean {
  const raw = query.trim()
  if (!raw) return true
  if (w.word.includes(raw) || w.traditional?.includes(raw)) return true
  const q = normalizeText(raw)
  const compact = q.replace(/\s+/g, '')
  return (
    (compact.length >= 2 && normalizeText(w.pinyin).replace(/\s+/g, '').startsWith(compact)) ||
    (q.length >= 2 && normalizeText(w.hanViet ?? '').includes(q)) ||
    meaningHas(w.meaningVi, q)
  )
}
