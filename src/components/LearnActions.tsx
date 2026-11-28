import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, CalendarPlus, CalendarCheck, ListPlus } from 'lucide-react'
import { addManyToReview, addToReview, getLearnData, isInReview, isKnown, isWordKey, removeFromReview, toggleKnown, useLearnData } from '../learn/srs'

const DAY = 86_400_000

/**
 * "Đã thuộc" toggle + "Thêm vào ôn tập" for the current character (StudioCenter meta row).
 * For a multi-character word key only the review toggle shows: "đã thuộc" stays character-level.
 * `hskWords` (character view only) adds a one-tap "add the HSK words containing this character".
 */
export function LearnActions({ hanzi, hskWords }: { hanzi: string; hskWords?: readonly string[] }) {
  const isWord = isWordKey(hanzi)
  const data = useLearnData()
  const known = isKnown(hanzi, data)
  const inReview = isInReview(hanzi, data)

  // Both toggles change the review schedule silently, so say what just happened.
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const say = (text: string) => {
    window.clearTimeout(timer.current)
    setToast({ id: Date.now(), text })
    timer.current = window.setTimeout(() => setToast(null), 2800)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onKnown = () => {
    toggleKnown(hanzi)
    if (known) return say(`Đã bỏ đánh dấu thuộc ${hanzi}`)
    const due = getLearnData().cards[hanzi]?.due
    const days = due ? Math.max(1, Math.round((due - Date.now()) / DAY)) : 30
    say(`Đã thuộc ${hanzi} — ôn lại sau ${days} ngày`)
  }
  const onReview = () => {
    if (inReview) {
      removeFromReview(hanzi)
      say(`Đã bỏ ${hanzi} khỏi danh sách ôn tập`)
    } else {
      addToReview(hanzi)
      say(`Đã thêm ${hanzi} vào ôn tập — mở “Ôn tập” để học`)
    }
  }

  const onAddWords = () => {
    const n = addManyToReview([...(hskWords ?? [])])
    say(n > 0 ? `Đã thêm ${n} từ HSK chứa ${hanzi} vào ôn tập` : `Các từ HSK chứa ${hanzi} đã có sẵn trong ôn tập`)
  }

  return (
    <>
      {!isWord && (
      <button
        type="button"
        className={`st-icon-btn la-btn kn-toggle${known ? ' on' : ''}`}
        onClick={onKnown}
        title={known ? 'Bỏ đánh dấu đã thuộc (K)' : 'Đánh dấu đã thuộc (K)'}
        aria-pressed={known}
      >
        <Check size={17} aria-hidden="true" />
        <span className="la-label">Đã thuộc</span>
      </button>
      )}
      <button
        type="button"
        className={`st-icon-btn la-btn rv-add${inReview ? ' on' : ''}`}
        onClick={onReview}
        title={inReview ? 'Đang trong ôn tập — bấm để bỏ ra' : 'Thêm vào ôn tập'}
        aria-label={inReview ? 'Bỏ khỏi ôn tập' : 'Thêm vào ôn tập'}
        aria-pressed={inReview}
      >
        {inReview ? <CalendarCheck size={17} aria-hidden="true" /> : <CalendarPlus size={17} aria-hidden="true" />}
        <span className="la-label" aria-hidden="true">Ôn tập</span>
      </button>
      {!isWord && !!hskWords?.length && (
        <button
          type="button"
          className="st-icon-btn la-btn rv-add-words"
          onClick={onAddWords}
          title={`Thêm cả ${hskWords.length} từ HSK chứa ${hanzi} vào ôn tập`}
          aria-label={`Thêm cả ${hskWords.length} từ HSK chứa ${hanzi} vào ôn tập`}
        >
          <ListPlus size={17} aria-hidden="true" />
          <span className="la-label" aria-hidden="true">Từ HSK</span>
        </button>
      )}
      {/* Portalled: inside the word banner, a containing block would pin the fixed toast to the banner. */}
      {createPortal(
        <div className="la-toast" role="status" aria-live="polite">
          {toast && <span key={toast.id}>{toast.text}</span>}
        </div>,
        document.body,
      )}
    </>
  )
}
