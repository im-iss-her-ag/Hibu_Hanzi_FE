// High-Fidelity Chinese Audio Engine
// Uses native speaker studio MP3 audio recordings for standard Hanyu Pinyin syllables & tones (1, 2, 3, 4)
// with Cloudflare Edge caching (<30ms response) and instant local SpeechSynthesis fallback.

const JSDELIVR_PINYIN_BASE = 'https://cdn.jsdelivr.net/gh/davinfifield/mp3-chinese-pinyin-sound@master/mp3/'
const ALLSET_PINYIN_BASE = 'https://resources.allsetlearning.com/pronwiki/resources/pinyin-audio/'

// Canonical pronunciation mapping for isolated consonants (Thanh mẫu khi đứng độc lập)
const INITIAL_CONSONANT_MAP: Record<string, { pinyin: string; tone: number }> = {
  b: { pinyin: 'bo', tone: 1 },
  p: { pinyin: 'po', tone: 1 },
  m: { pinyin: 'mo', tone: 1 },
  f: { pinyin: 'fo', tone: 1 },
  d: { pinyin: 'de', tone: 1 },
  t: { pinyin: 'te', tone: 1 },
  n: { pinyin: 'ne', tone: 1 },
  l: { pinyin: 'le', tone: 1 },
  g: { pinyin: 'ge', tone: 1 },
  k: { pinyin: 'ke', tone: 1 },
  h: { pinyin: 'he', tone: 1 },
  j: { pinyin: 'ji', tone: 1 },
  q: { pinyin: 'qi', tone: 1 },
  x: { pinyin: 'xi', tone: 1 },
  zh: { pinyin: 'zhi', tone: 1 },
  ch: { pinyin: 'chi', tone: 1 },
  sh: { pinyin: 'shi', tone: 1 },
  r: { pinyin: 'ri', tone: 4 },
  z: { pinyin: 'zi', tone: 1 },
  c: { pinyin: 'ci', tone: 1 },
  s: { pinyin: 'si', tone: 1 },
  y: { pinyin: 'yi', tone: 1 },
  w: { pinyin: 'wu', tone: 1 },
}

// Map tone vowels to base character and tone number
const TONE_DECODER: Record<string, { base: string; tone: number }> = {
  ā: { base: 'a', tone: 1 }, á: { base: 'a', tone: 2 }, ǎ: { base: 'a', tone: 3 }, à: { base: 'a', tone: 4 },
  ō: { base: 'o', tone: 1 }, ó: { base: 'o', tone: 2 }, ǒ: { base: 'o', tone: 3 }, ò: { base: 'o', tone: 4 },
  ē: { base: 'e', tone: 1 }, é: { base: 'e', tone: 2 }, ě: { base: 'e', tone: 3 }, è: { base: 'e', tone: 4 },
  ī: { base: 'i', tone: 1 }, í: { base: 'i', tone: 2 }, ǐ: { base: 'i', tone: 3 }, ì: { base: 'i', tone: 4 },
  ū: { base: 'u', tone: 1 }, ú: { base: 'u', tone: 2 }, ǔ: { base: 'u', tone: 3 }, ù: { base: 'u', tone: 4 },
  ǖ: { base: 'uu', tone: 1 }, ǘ: { base: 'uu', tone: 2 }, ǚ: { base: 'uu', tone: 3 }, ǜ: { base: 'uu', tone: 4 },
}

// Convert a Pinyin string (with diacritics or tone numbers) into standard CDN filename e.g. "ca1.mp3", "beng4.mp3"
function normalizePinyinAudioKey(rawText: string): { pinyin: string; tone: number } {
  const clean = rawText.trim().toLowerCase()

  // 1. Check if it's an isolated initial consonant (e.g. "b", "c", "zh")
  if (INITIAL_CONSONANT_MAP[clean]) {
    return INITIAL_CONSONANT_MAP[clean]
  }

  // 2. Decode tone marks from vowels
  let tone = 1
  let normalized = ''

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (TONE_DECODER[ch]) {
      tone = TONE_DECODER[ch].tone
      normalized += TONE_DECODER[ch].base
    } else {
      normalized += ch
    }
  }

  // Check if user passed tone number at end (e.g. "ca4" or "beng1")
  const toneNumMatch = normalized.match(/([a-z]+)([1-5])$/)
  if (toneNumMatch) {
    normalized = toneNumMatch[1]
    tone = parseInt(toneNumMatch[2], 10)
  }

  // Special cases in dataset: ü is represented as "uu" (e.g. "nuu3", "luu4", "nuue4")
  normalized = normalized.replace(/ü/g, 'uu').replace(/v/g, 'uu')

  // If normalized ends up being just consonant like "c"
  if (INITIAL_CONSONANT_MAP[normalized]) {
    return { ...INITIAL_CONSONANT_MAP[normalized], tone }
  }

  return { pinyin: normalized, tone: tone || 1 }
}

// In-memory audio cache for instant playback on repeat clicks
const audioCache = new Map<string, HTMLAudioElement>()

// Active audio element singleton
let currentAudio: HTMLAudioElement | null = null

// Fallback to local Web Speech API (0ms latency, native OS voice)
function speechSynthesizerFallback(text: string, rate: number = 1.0): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = Math.max(0.4, 0.85 * rate)

  const voices = window.speechSynthesis.getVoices()
  const zhVoice = voices.find(
    (v) =>
      v.lang.startsWith('zh-CN') ||
      v.lang.startsWith('cmn-Hans-CN') ||
      v.lang.startsWith('zh') ||
      v.name.includes('Chinese') ||
      v.name.includes('普通话'),
  )

  if (zhVoice) {
    utterance.voice = zhVoice
  }

  window.speechSynthesis.speak(utterance)
}

/**
 * Universal High-Fidelity Audio Player for Chinese (Hanzi & Pinyin)
 * - Pinyin (e.g. "xī", "hǎo", "ca4"):
 *   Plays authentic native Chinese studio recordings from high-speed Cloudflare edge CDN (<30ms).
 * - Hanzi (e.g. "息", "你好"):
 *   Plays native studio audio if pinyinHint is provided, otherwise plays native OS Chinese voice instantly without delay.
 * @param text Chinese character(s) or Pinyin syllable
 * @param rate Playback speed rate (1.0 for normal, 0.65 for slow reading)
 * @param pinyinHint Optional exact Pinyin reading to guarantee studio accuracy
 */
export function speakChinese(text: string, rate: number = 1.0, pinyinHint?: string): void {
  if (typeof window === 'undefined') return

  const clean = (pinyinHint || text).trim()
  if (!clean) return

  // Stop any currently playing audio immediately
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }

  // Check if target is Chinese Hanzi characters vs Pinyin
  const isHanzi = /[\u4e00-\u9fa5]/.test(clean)

  if (!isHanzi) {
    // Standard Pinyin Syllable with Tone: High-fidelity studio native speaker MP3
    const { pinyin, tone } = normalizePinyinAudioKey(clean)
    const primaryUrl = `${JSDELIVR_PINYIN_BASE}${pinyin}${tone}.mp3`
    const secondaryUrl = `${ALLSET_PINYIN_BASE}${pinyin}${tone}.mp3`

    let audio = audioCache.get(primaryUrl)
    if (!audio) {
      audio = new Audio(primaryUrl)
      audioCache.set(primaryUrl, audio)
    }

    audio.currentTime = 0
    audio.playbackRate = rate
    currentAudio = audio

    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback to secondary studio CDN
        const fallbackAudio = new Audio(secondaryUrl)
        fallbackAudio.playbackRate = rate
        currentAudio = fallbackAudio
        fallbackAudio.play().catch(() => {
          // If network is completely offline, fallback to local Web Speech API
          speechSynthesizerFallback(text, rate)
        })
      })
    }
  } else {
    // Pure Hanzi text without pinyin: Use instant Web Speech API or fast CDN
    // Using native OS speech synthesis eliminates network lag and plays instantly
    speechSynthesizerFallback(clean, rate)
  }
}
