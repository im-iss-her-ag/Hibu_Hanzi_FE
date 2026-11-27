// Tone of a single pinyin syllable (1–4, 5 = neutral), from its tone mark.
const MARKS: Record<string, 1 | 2 | 3 | 4> = {}
for (const [tone, chars] of [
  [1, 'āēīōūǖĀĒĪŌŪǕ'],
  [2, 'áéíóúǘÁÉÍÓÚǗ'],
  [3, 'ǎěǐǒǔǚǍĚǏǑǓǙ'],
  [4, 'àèìòùǜÀÈÌÒÙǛ'],
] as const) {
  for (const ch of chars) MARKS[ch] = tone
}

export type Tone = 1 | 2 | 3 | 4 | 5

export function toneOf(syllable: string): Tone {
  for (const ch of syllable.normalize('NFC')) {
    const t = MARKS[ch]
    if (t) return t
  }
  return 5
}

/** Split "yín háng" into syllables with tones, for <span className={`py t${tone}`}>. */
export function pinyinSyllables(pinyin: string): { text: string; tone: Tone }[] {
  return pinyin
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((text) => ({ text, tone: toneOf(text) }))
}
