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

const RADICAL_PINYIN_MAP: Record<string, string> = {
  '一': 'yī', '丨': 'gǔn', '丶': 'zhǔ', '丿': 'piě', '乙': 'yǐ', '亅': 'jué',
  '二': 'èr', '亠': 'tóu', '人': 'rén', '亻': 'rén', '儿': 'ér', '入': 'rù',
  '八': 'bā', '冂': 'jiōng', '冖': 'mì', '冫': 'bīng', '几': 'jī', '凵': 'kǎn',
  '刀': 'dāo', '刂': 'dāo', '力': 'lì', '勹': 'bāo', '匕': 'bǐ', '匚': 'fāng',
  '十': 'shí', '卜': 'bǔ', '卩': 'jié', '厂': 'chǎng', '厶': 'sī', '又': 'yòu',
  '口': 'kǒu', '囗': 'wéi', '土': 'tǔ', '士': 'shì', '夂': 'zhǐ', '夕': 'xī',
  '大': 'dà', '女': 'nǚ', '子': 'zǐ', '宀': 'mián', '寸': 'cùn', '小': 'xiǎo',
  '⺌': 'xiǎo', '尣': 'wāng', '尸': 'shī', '屮': 'chè', '山': 'shān', '巛': 'chuān',
  '工': 'gōng', '己': 'jǐ', '巾': 'jīn', '干': 'gān', '幺': 'yāo', '广': 'guǎng',
  '廴': 'yǐn', '廾': 'gǒng', '弋': 'yì', '弓': 'gōng', '彐': 'jì', '彡': 'shān',
  '彳': 'chì', '心': 'xīn', '忄': 'xīn', '戈': 'gē', '戶': 'hù', '户': 'hù',
  '手': 'shǒu', '扌': 'shǒu', '支': 'zhī', '攴': 'pū', '攵': 'pū', '文': 'wén',
  '斗': 'dǒu', '斤': 'jīn', '方': 'fāng', '无': 'wú', '日': 'rì', '曰': 'yuē',
  '月': 'yuè', '木': 'mù', '欠': 'qiàn', '止': 'zhǐ', '歹': 'dǎi', '殳': 'shū',
  '毋': 'wú', '比': 'bǐ', '毛': 'máo', '氏': 'shì', '气': 'qì', '水': 'shuǐ',
  '氵': 'shuǐ', '火': 'huǒ', '灬': 'huǒ', '爪': 'zhǎo', '父': 'fù', '爻': 'yáo',
  '爿': 'qiáng', '片': 'piàn', '牙': 'yá', '牛': 'niú', '牜': 'niú', '犬': 'quǎn',
  '犭': 'quǎn', '玄': 'xuán', '玉': 'yù', '瓜': 'guā', '瓦': 'wǎ', '甘': 'gān',
  '生': 'shēng', '用': 'yòng', '田': 'tián', '疋': 'pǐ', '疒': 'nì', '癶': 'bō',
  '白': 'bái', '皮': 'pí', '皿': 'mǐn', '目': 'mù', '矛': 'máo', '矢': 'shǐ',
  '石': 'shí', '示': 'shì', '礻': 'shì', '禾': 'hé', '穴': 'xué', '立': 'lì',
  '竹': 'zhú', '⺮': 'zhú', '米': 'mǐ', '糸': 'mì', '纟': 'sī', '缶': 'fǒu',
  '网': 'wǎng', '罒': 'wǎng', '羊': 'yáng', '羽': 'yǔ', '老': 'lǎo', '耂': 'lǎo',
  '而': 'ér', '耒': 'lěi', '耳': 'ěr', '聿': 'yù', '肉': 'ròu', '臣': 'chén',
  '自': 'zì', '至': 'zhì', '臼': 'jiù', '舌': 'shé', '舛': 'chuǎn', '舟': 'zhōu',
  '艮': 'gèn', '色': 'sè', '艹': 'cǎo', '虍': 'hū', '虫': 'chóng', '血': 'xuè',
  '行': 'xíng', '衣': 'yī', '衤': 'yī', '襾': 'yà', '见': 'jiàn', '角': 'jiǎo',
  '言': 'yán', '讠': 'yán', '谷': 'gǔ', '豆': 'dòu', '豕': 'shǐ', '豸': 'zhì',
  '贝': 'bèi', '赤': 'chì', '走': 'zǒu', '足': 'zú', '身': 'shēn', '车': 'chē',
  '辛': 'xīn', '辰': 'chén', '酉': 'yǒu', '里': 'lǐ', '阝': 'fù / yì', '金': 'jīn',
  '钅': 'jīn', '雨': 'yǔ', '页': 'yè', '风': 'fēng', '飞': 'fēi', '食': 'shí',
  '饣': 'shí', '马': 'mǎ', '鸟': 'niǎo', '鱼': 'yú', '龙': 'lóng', '头': 'tóu',
  '五': 'wǔ', '辶': 'chuò',
}

// Pinyin for a chiet tu part: its reading as a character if it is one, else the radical table.
export function partPinyin(
  part: string,
  characters: readonly Pick<Character, 'hanzi' | 'readings'>[] = CHARACTERS_DATA,
): string | null {
  const char = characters.find((c) => c.hanzi === part)
  const reading = char?.readings.find((r) => r.isPrimary) ?? char?.readings[0]
  return reading?.pinyin || RADICAL_PINYIN_MAP[part] || null
}

export const RADICAL_CHARACTERS: BundleCharacter[] = COMPONENTS_DATA.map((c) => {
  const charInChars = CHARACTERS_DATA.find((ch) => ch.hanzi === c.form)
  const pinyin = charInChars?.readings[0]?.pinyin || RADICAL_PINYIN_MAP[c.form] || ''

  return {
    hanzi: c.form,
    traditional: null,
    hsk2Level: null,
    hsk3Level: null,
    readings: [
      {
        pinyin,
        hanViet: c.hanViet,
        meaningVi: c.meaningVi || c.nameVi || '',
        isPrimary: true,
      },
    ],
  }
})

export function getLocalCharacterDetail(hanzi: string): CharacterDetail | null {
  let character = CHARACTERS_DATA.find((c) => c.hanzi === hanzi || c.traditional === hanzi)

  // Fallback for radicals / components if not in CHARACTERS_DATA
  if (!character) {
    const comp = COMPONENTS_DATA.find((k) => k.form === hanzi)
    if (!comp) return null

    const pinyin = RADICAL_PINYIN_MAP[comp.form] || ''
    character = {
      id: 20000 + comp.id,
      hanzi: comp.form,
      traditional: comp.variantOf,
      radical: comp.isRadical ? comp.form : (comp.variantOf || null),
      chietTu: comp.meaningVi ? `${comp.nameVi || comp.form}: ${comp.meaningVi}` : null,
      chietTuType: 'mnemonic',
      mnemonicVi: null,
      strokeCount: comp.strokeCount,
      hsk2Level: null,
      hsk3Level: null,
      readings: [
        {
          pinyin,
          hanViet: comp.hanViet,
          meaningVi: comp.meaningVi || comp.nameVi || '',
          isPrimary: true,
        },
      ],
      parts: comp.variantOf ? [{ part: comp.variantOf, position: 0 }] : [],
    }
  }

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

  // Find all compound words that contain this character or radical
  let words = WORDS_DATA.filter(
    (w) =>
      w.word.includes(character!.hanzi) ||
      (character!.traditional && w.word.includes(character!.traditional)),
  )

  // If words is empty and this is a component, find words containing characters that use this radical
  if (words.length === 0) {
    const charsWithRadical = CHARACTERS_DATA.filter(
      (c) =>
        c.radical === character!.hanzi ||
        c.parts.some((p) => p.part === character!.hanzi),
    ).slice(0, 5)

    const relatedWords: Word[] = []
    for (const c of charsWithRadical) {
      const match = WORDS_DATA.find((w) => w.word.includes(c.hanzi))
      if (match && !relatedWords.some((rw) => rw.id === match.id)) {
        relatedWords.push(match)
      }
    }
    words = relatedWords
  }

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
