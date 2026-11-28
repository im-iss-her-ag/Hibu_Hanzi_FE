import type { FeedbackCode, Tone, ToneResult } from '../types'

export const TONE_NAME: Record<Tone, string> = { 1: 'thanh 1', 2: 'thanh 2', 3: 'thanh 3', 4: 'thanh 4', 5: 'thanh nhẹ' }

const TEXT: Record<FeedbackCode, string> = {
  'no-voice': 'Chưa nghe thấy giọng. Nói to và gần micro hơn.',
  'too-short': 'Âm quá ngắn. Kéo dài âm tiết khoảng nửa giây.',
  'start-higher': 'Bắt đầu cao hơn.',
  'start-lower': 'Bắt đầu thấp hơn.',
  'end-higher': 'Kết thúc cao hơn, lên hẳn tới cuối.',
  'end-lower': 'Kết thúc thấp hơn.',
  'fall-deeper': 'Rơi chưa đủ sâu: hạ dứt khoát từ cao xuống thấp, như khi nói "dạ!".',
  'rise-more': 'Lên giọng sớm và mạnh hơn, giống dấu sắc kéo dài ("má?").',
  flatter: 'Giữ giọng cao và phẳng như thanh ngang kéo dài ở cao độ cao.',
  'dip-lower': 'Hạ giọng xuống thấp hơn, trầm như dấu hỏi/dấu nặng ("mả").',
  good: 'Tốt lắm!',
}

/** Per-target overrides where the generic text is misleading. */
const TARGET_TEXT: Partial<Record<Tone, Partial<Record<FeedbackCode, string>>>> = {
  1: { 'start-higher': 'Thanh 1 phải cao hơn: giữ ở mức cao trong giọng của bạn (như thanh ngang nhưng cao hẳn).' },
  4: { 'start-higher': 'Bắt đầu từ mức cao nhất rồi mới rơi.' },
  5: {
    'end-lower': 'Thanh nhẹ đọc thấp và nhẹ, không nhấn.',
  },
}

export function feedbackText(code: FeedbackCode, target?: Tone): string {
  return (target && TARGET_TEXT[target]?.[code]) || TEXT[code]
}

/** Short hint like "Đang giống thanh 3 hơn thanh 2." or "Đang ở giữa thanh 2 và thanh 3." (null if none). */
export function confusionHint(r: ToneResult): string | null {
  if (r.target === 5 || r.detected == null) return null
  const s = r.similarity
  const target = r.target
  if (r.detected !== target) return `Đang giống ${TONE_NAME[r.detected]} hơn ${TONE_NAME[target]}.`
  const others = ([1, 2, 3, 4] as const).filter((k) => k !== target)
  const second = others.reduce((a, b) => (s[b] > s[a] ? b : a))
  if (s[second] > 0.3 && s[second] > s[target] * 0.75) return `Đang ở giữa ${TONE_NAME[target]} và ${TONE_NAME[second]}.`
  return null
}

/** All Vietnamese messages for a result, most important first. */
export function resultMessages(r: ToneResult): string[] {
  const msgs = r.feedback.filter((c) => !(c === 'good' && r.detected !== r.target && r.target !== 5)).map((c) => feedbackText(c, r.target))
  const hint = confusionHint(r)
  if (hint) msgs.splice(r.feedback[0] === 'good' ? 0 : 1, 0, hint)
  return msgs
}
