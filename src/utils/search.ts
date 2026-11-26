import type { BundleCharacter, Word } from '../core'

const PINYIN_TONE_STRIP_MAP: Record<string, string> = {
  ā: 'a', á: 'a', ǎ: 'a', à: 'a',
  ō: 'o', ó: 'o', ǒ: 'o', ò: 'o',
  ē: 'e', é: 'e', ě: 'e', è: 'e',
  ī: 'i', í: 'i', ǐ: 'i', ì: 'i',
  ū: 'u', ú: 'u', ǔ: 'u', ù: 'u',
  ǖ: 'u', ǘ: 'u', ǚ: 'u', ǜ: 'u', ü: 'u',
  ń: 'n', ň: 'n', ǹ: 'n',
  ḿ: 'm',
}

/**
 * Strip Pinyin tone marks and Vietnamese diacritics so "hao" matches "hǎo" and "nhan" matches "nhân".
 */
export function normalizeFolded(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[āáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜüńňǹḿ]/g, (ch) => PINYIN_TONE_STRIP_MAP[ch] ?? ch)
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Score a character against a raw search query; returns 0 if it does not match.
 * Higher score = closer match (exact Hanzi > exact Pinyin/Hán Việt > prefix > meaning).
 */
export function scoreCharacterMatch(c: BundleCharacter, rawQuery: string): number {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return 1
  const qFold = normalizeFolded(q).replace(/v/g, 'u')

  if (c.hanzi === q || c.traditional === q) return 100
  if (c.hanzi.includes(q) || (c.traditional && c.traditional.includes(q))) return 85

  let best = 0
  for (const r of c.readings) {
    const pyRaw = r.pinyin.toLowerCase()
    const pyFold = normalizeFolded(pyRaw)
    const hvRaw = (r.hanViet ?? '').toLowerCase()
    const hvFold = normalizeFolded(hvRaw)
    const meanRaw = r.meaningVi.toLowerCase()
    const meanFold = normalizeFolded(meanRaw)

    if (pyRaw === q || hvRaw === q) best = Math.max(best, 95)
    else if (pyFold === qFold || (hvFold && hvFold === qFold)) best = Math.max(best, 90)
    else if (pyFold.startsWith(qFold) || (hvFold && hvFold.startsWith(qFold))) best = Math.max(best, 75)
    else if (pyRaw.includes(q) || hvRaw.includes(q)) best = Math.max(best, 60)
    else if (pyFold.includes(qFold) || (hvFold && hvFold.includes(qFold))) best = Math.max(best, 50)
    else if (meanRaw.includes(q)) best = Math.max(best, 40)
    else if (meanFold.includes(qFold)) best = Math.max(best, 30)
  }

  return best
}

export function filterAndSortCharacters(
  characters: readonly BundleCharacter[],
  rawQuery: string,
): BundleCharacter[] {
  const q = rawQuery.trim()
  if (!q) return [...characters]

  return characters
    .map((char) => ({ char, score: scoreCharacterMatch(char, q) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.char)
}

export function filterAndSortWords(words: readonly Word[], rawQuery: string): Word[] {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return [...words]
  const qFold = normalizeFolded(q).replace(/\s+/g, '')
  const qFoldSpaced = normalizeFolded(q)

  const scored: { word: Word; score: number }[] = []
  for (const w of words) {
    const pyRaw = w.pinyin.toLowerCase()
    const pyFold = normalizeFolded(pyRaw)
    const pyCompact = pyFold.replace(/\s+/g, '')
    const hvRaw = (w.hanViet ?? '').toLowerCase()
    const hvFold = normalizeFolded(hvRaw)
    const meanRaw = w.meaningVi.toLowerCase()
    const meanFold = normalizeFolded(meanRaw)

    let score = 0
    if (w.word === q || w.traditional === q) score = 100
    else if (w.word.includes(q) || (w.traditional && w.traditional.includes(q))) score = 85
    else if (pyCompact === qFold || hvFold === qFoldSpaced) score = 90
    else if (pyFold.startsWith(qFoldSpaced) || pyCompact.startsWith(qFold) || hvFold.startsWith(qFoldSpaced)) score = 75
    else if (pyRaw.includes(q) || hvRaw.includes(q)) score = 60
    else if (pyFold.includes(qFoldSpaced) || pyCompact.includes(qFold) || hvFold.includes(qFoldSpaced)) score = 50
    else if (meanRaw.includes(q)) score = 40
    else if (meanFold.includes(qFoldSpaced)) score = 30

    if (score > 0) scored.push({ word: w, score })
  }

  return scored.sort((a, b) => b.score - a.score).map((entry) => entry.word)
}
