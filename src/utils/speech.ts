// Web Speech API for Chinese pronunciation

export function speakChinese(text: string, rate = 0.85): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = rate
  utterance.pitch = 1.0

  // Try to find a high quality Chinese voice if available
  const voices = window.speechSynthesis.getVoices()
  const zhVoice = voices.find(
    (v) => v.lang.startsWith('zh') || v.lang.includes('cmn') || v.lang.includes('Chinese'),
  )
  if (zhVoice) {
    utterance.voice = zhVoice
  }

  window.speechSynthesis.speak(utterance)
}
