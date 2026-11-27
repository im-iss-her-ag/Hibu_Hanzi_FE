import { Check, CalendarPlus, CalendarCheck } from 'lucide-react'
import { addToReview, isInReview, isKnown, removeFromReview, toggleKnown, useLearnData } from '../learn/srs'

/** "Đã thuộc" toggle + "Thêm vào ôn tập" for the current character (StudioCenter meta row). */
export function LearnActions({ hanzi }: { hanzi: string }) {
  const data = useLearnData()
  const known = isKnown(hanzi, data)
  const inReview = isInReview(hanzi, data)
  return (
    <>
      <button
        type="button"
        className={`st-icon-btn kn-toggle${known ? ' on' : ''}`}
        onClick={() => toggleKnown(hanzi)}
        title={known ? 'Bỏ đánh dấu đã thuộc (K)' : 'Đánh dấu đã thuộc (K)'}
        aria-label="Đã thuộc"
        aria-pressed={known}
      >
        <Check size={17} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`st-icon-btn rv-add${inReview ? ' on' : ''}`}
        onClick={() => (inReview ? removeFromReview(hanzi) : addToReview(hanzi))}
        title={inReview ? 'Đang trong ôn tập — bấm để bỏ ra' : 'Thêm vào ôn tập'}
        aria-label={inReview ? 'Bỏ khỏi ôn tập' : 'Thêm vào ôn tập'}
        aria-pressed={inReview}
      >
        {inReview ? <CalendarCheck size={17} aria-hidden="true" /> : <CalendarPlus size={17} aria-hidden="true" />}
      </button>
    </>
  )
}
