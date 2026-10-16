import { COMPONENTS_DATA } from './components'
import { CHARACTERS_DATA } from './characters'
import { WORDS_DATA } from './words'
import { describePart, readingInWord, splitWord } from '../lookup'
import type { Bundle, BundleCharacter, Character, CharacterDetail, Word, WordDetail } from '../types'

export function getAllCharacters(): Character[] {
  return CHARACTERS_DATA
}

export function getAllWords(): Word[] {
  return WORDS_DATA
}

export function getAllComponents() {
  return COMPONENTS_DATA
}

export function getLocalBundle(): Bundle {
  const characters: BundleCharacter[] = CHARACTERS_DATA.map((c) => ({
    hanzi: c.hanzi,
    traditional: c.traditional,
    hsk2Level: c.hsk2Level,
    hsk3Level: c.hsk3Level,
    readings: c.readings,
  }))

  return {
    version: '1.0.0',
    characters,
    words: WORDS_DATA,
    removed: { characters: [], words: [] },
  }
}

export function getLocalCharacterDetail(hanzi: string): CharacterDetail | null {
  const character = CHARACTERS_DATA.find((c) => c.hanzi === hanzi || c.traditional === hanzi)
  if (!character) return null

  const forms = [
    ...new Set([
      ...character.parts.map((p) => p.part),
      ...(character.radical ? [character.radical] : []),
    ]),
  ]

  const components = COMPONENTS_DATA.filter((k) => forms.includes(k.form))
  const partChars = CHARACTERS_DATA.filter((c) => forms.includes(c.hanzi))

  const radical = character.radical
    ? describePart(character.radical, components, partChars)
    : null

  const parts = character.parts.map((p) => describePart(p.part, components, partChars))

  // Find all compound words that contain this character
  const words = WORDS_DATA.filter((w) => w.word.includes(character.hanzi) || (character.traditional && w.word.includes(character.traditional)))

  return {
    character,
    radical,
    parts,
    words,
  }
}

export function getLocalWordDetail(text: string): WordDetail | null {
  const word = WORDS_DATA.find((w) => w.word === text || w.traditional === text)
  if (!word) return null

  const hanziList = splitWord(text)
  const characters = hanziList.map((h, i) => {
    const character = CHARACTERS_DATA.find((c) => c.hanzi === h || c.traditional === h) ?? null
    return {
      hanzi: h,
      character,
      reading: character ? readingInWord(character, word, i) : null,
    }
  })

  return {
    word,
    characters,
  }
}

export function searchLocal(query: string, level?: number | null) {
  const q = query.trim().toLowerCase()
  if (!q && (level === undefined || level === null)) {
    return { characters: CHARACTERS_DATA, words: WORDS_DATA }
  }

  const characters = CHARACTERS_DATA.filter((c) => {
    if (level && c.hsk2Level !== level && c.hsk3Level !== level) return false
    if (!q) return true

    return (
      c.hanzi.includes(q) ||
      (c.traditional && c.traditional.includes(q)) ||
      (c.chietTu && c.chietTu.toLowerCase().includes(q)) ||
      c.readings.some(
        (r) =>
          r.pinyin.toLowerCase().includes(q) ||
          (r.hanViet && r.hanViet.toLowerCase().includes(q)) ||
          r.meaningVi.toLowerCase().includes(q),
      )
    )
  })

  const words = WORDS_DATA.filter((w) => {
    if (level && w.hsk2Level !== level && w.hsk3Level !== level) return false
    if (!q) return true

    return (
      w.word.includes(q) ||
      (w.traditional && w.traditional.includes(q)) ||
      w.pinyin.toLowerCase().includes(q) ||
      (w.hanViet && w.hanViet.toLowerCase().includes(q)) ||
      w.meaningVi.toLowerCase().includes(q)
    )
  })

  return { characters, words }
}
