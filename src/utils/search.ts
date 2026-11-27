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
  // A verbatim match only outranks a folded one when the user actually typed tone marks/diacritics;
  // "hao" should treat hảo (好) and hao (耗) alike and let the HSK level decide.
  const exactScore = q === normalizeFolded(q) ? 90 : 95

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

    if (pyRaw === q || hvRaw === q) best = Math.max(best, exactScore)
    else if (pyFold === qFold || (hvFold && hvFold === qFold)) best = Math.max(best, 90)
    else if (pyFold.startsWith(qFold) || (hvFold && hvFold.startsWith(qFold))) best = Math.max(best, 75)
    else if (pyRaw.includes(q) || hvRaw.includes(q)) best = Math.max(best, 60)
    else if (pyFold.includes(qFold) || (hvFold && hvFold.includes(qFold))) best = Math.max(best, 50)
    else if (meanRaw.includes(q)) best = Math.max(best, 40)
    else if (meanFold.includes(qFold)) best = Math.max(best, 30)
  }

  return best
}

/** Lowest HSK level across both standards; unlevelled items (bộ thủ, components) go last. */
function levelRank(item: { hsk2Level?: number | null; hsk3Level?: number | null }): number {
  return Math.min(item.hsk3Level ?? 99, item.hsk2Level ?? 99)
}

export function filterAndSortCharacters(
  characters: readonly BundleCharacter[],
  rawQuery: string,
): BundleCharacter[] {
  const q = rawQuery.trim()
  if (!q) return [...characters]

  // A multi-character Hanzi query (e.g. "你好") also lists each distinct character it contains, in query order.
  const queryHan = Array.from(new Set(Array.from(q).filter((ch) => /\p{Script=Han}/u.test(ch))))
  if (queryHan.length > 1) {
    const hanIndex = new Map(queryHan.map((ch, i) => [ch, i]))
    const found = characters
      .filter((c) => hanIndex.has(c.hanzi))
      .sort((a, b) => (hanIndex.get(a.hanzi) ?? 0) - (hanIndex.get(b.hanzi) ?? 0))
    const rest = characters.filter((c) => !hanIndex.has(c.hanzi) && scoreCharacterMatch(c, q) > 0)
    return [...found, ...rest]
  }

  return characters
    .map((char) => ({ char, score: scoreCharacterMatch(char, q) }))
    .filter((entry) => entry.score > 0)
    // Same match quality: easier (lower HSK) first, so "hao" shows 好 before 耗.
    .sort((a, b) => b.score - a.score || levelRank(a.char) - levelRank(b.char))
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

  return scored
    .sort((a, b) => b.score - a.score || levelRank(a.word) - levelRank(b.word))
    .map((entry) => entry.word)
}
