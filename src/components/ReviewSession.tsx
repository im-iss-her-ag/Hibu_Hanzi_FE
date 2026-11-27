import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X, Volume2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import type { BundleCharacter } from '../core'
import { api } from '../api'
import { primaryReading } from '../core/lookup'
import { useModalA11y } from '../utils/useModalA11y'
import { speakChinese } from '../utils/speech'
import { buildQueue, grade, getLearnData, isLeech, nextDueAt, useLearnData } from '../learn/srs'
import { TonePinyin } from './TonePinyin'

interface ReviewSessionProps {
  characters: BundleCharacter[]
  onClose: () => void
  onOpenCharacter?: (hanzi: string) => void
}

const fmt = (t: number) =>
  new Date(t).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })

export function ReviewSession({ characters, onClose, onOpenCharacter }: ReviewSessionProps) {
  const dialogRef = useModalA11y<HTMLDivElement>(onClose)
  const learn = useLearnData()
  const [queue, setQueue] = useState<string[]>(() => buildQueue())
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [good, setGood] = useState(0)
  const [bad, setBad] = useState(0)
  const requeued = useRef(new Set<string>())

  const byHanzi = useMemo(() => new Map(characters.map((c) => [c.hanzi, c])), [characters])
  const done = index >= queue.length
  const hanzi = done ? null : queue[index]
  const char = hanzi ? byHanzi.get(hanzi) : undefined
  const reading = char ? primaryReading(char) : null
  const card = hanzi ? learn.cards[hanzi] : undefined
  const leech = isLeech(card)
  // Mnemonic / etymology live in the detail endpoint; fetch only for leeches.
  const leechDetail = useQuery({
    queryKey: ['detail', hanzi],
    queryFn: () => api.getCharacter(hanzi!),
    enabled: Boolean(leech && hanzi),
  })
  const leechChar = leechDetail.data?.character

  const reveal = useCallback(() => setRevealed(true), [])
  const answer = useCallback(
    (g: 1 | 2) => {
      if (!hanzi) return
      const c = getLearnData().cards[hanzi]
      const wasNew = !!c && c.state === 'new'
      grade(hanzi, g)
      if (g === 2) setGood((n) => n + 1)
      else {
        setBad((n) => n + 1)
        if (wasNew && !requeued.current.has(hanzi)) {
          requeued.current.add(hanzi)
          setQueue((q) => [...q, hanzi])
        }
      }
      setIndex((i) => i + 1)
      setRevealed(false)
    },
    [hanzi],
  )

  const stateRef = useRef({ done, revealed, reveal, answer })
  stateRef.current = { done, revealed, reveal, answer }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key
      if (k === 'Escape' || k === 'Tab') return
      const s = stateRef.current
      const onButton = (e.target as HTMLElement | null)?.tagName === 'BUTTON'
      const swallow = () => {
        e.preventDefault()
        e.stopPropagation()
      }
      if (k === ' ' || k === 'Enter') {
        if (onButton && (k === 'Enter' || s.done || s.revealed)) return
        swallow()
        if (e.repeat || s.done) return
        if (!s.revealed) s.reveal()
        return
      }
      if (k === '1' || k === '2') {
        swallow()
        if (e.repeat || s.done || !s.revealed) return
        s.answer(k === '1' ? 1 : 2)
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [])

  const next = done ? nextDueAt(learn) : null
  const hasCards = Object.keys(learn.cards).length > 0

  return (
    <div className="pm-backdrop rv-backdrop" role="dialog" aria-modal="true" aria-labelledby="rv-title">
      <div ref={dialogRef} className="pm-dialog rv-dialog">
        <div className="pm-header">
          <h2 id="rv-title" className="pm-title">Ôn tập</h2>
          {!done && (
            <span className="pm-meta rv-progress" aria-live="polite">
              {index + 1} / {queue.length}
            </span>
          )}
          <div className="pm-header-actions">
            <button type="button" className="pm-icon-btn" onClick={onClose} aria-label="Đóng" title="Đóng (Esc)">
              <X size={18} />
            </button>
          </div>
        </div>

        {done ? (
          <div className="rv-body rv-summary">
            {queue.length === 0 ? (
              <>
                <p className="rv-lead">{hasCards ? 'Không có chữ nào cần ôn' : 'Chưa có chữ nào để ôn'}</p>
                <p className="rv-note">
                  {hasCards
                    ? next
                      ? `Không có chữ nào cần ôn — quay lại lúc ${fmt(next)}`
                      : 'Không có chữ nào cần ôn.'
                    : "Thêm chữ bằng nút 'Thêm vào ôn tập' hoặc đánh dấu 'Đã thuộc'."}
                </p>
              </>
            ) : (
              <>
                <p className="rv-lead">Xong phiên ôn</p>
                <div className="rv-counts">
                  <div className="rv-count">
                    <span className="rv-count-n">{good}</span>
                    <span className="label">Nhớ</span>
                  </div>
                  <div className="rv-count">
                    <span className="rv-count-n">{bad}</span>
                    <span className="label">Quên</span>
                  </div>
                </div>
                <p className="rv-note">{next ? `Lượt ôn tiếp theo: ${fmt(next)}` : 'Chưa có lượt ôn tiếp theo.'}</p>
              </>
            )}
            <button type="button" className="rv-btn rv-btn-primary" onClick={onClose} autoFocus>
              Xong
            </button>
          </div>
        ) : (
          <>
            <div className="rv-body">
              <div className="rv-han" lang="zh">
                {hanzi}
              </div>

              {revealed && (
                <div className="rv-answer" aria-live="polite">
                  {reading?.hanViet && <div className="rv-hv">{reading.hanViet.toUpperCase()}</div>}
                  {reading?.pinyin && (
                    <div className="rv-py">
                      <TonePinyin pinyin={reading.pinyin} />
                      <button
                        type="button"
                        className="pm-icon-btn"
                        aria-label="Nghe phát âm"
                        onClick={() => speakChinese(hanzi!, 1, reading.pinyin)}
                      >
                        <Volume2 size={18} />
                      </button>
                    </div>
                  )}
                  {reading?.meaningVi && <div className="rv-mean">{reading.meaningVi}</div>}
                  {!reading && <div className="rv-mean">Chưa có dữ liệu cho chữ này.</div>}
                  {leech && (
                    <div className="rv-leech">
                      <span className="label">Chữ hay quên</span>
                      {leechChar?.mnemonicVi && <p>{leechChar.mnemonicVi}</p>}
                      {leechChar?.chietTu && <p>{leechChar.chietTu}</p>}
                    </div>
                  )}
                  {onOpenCharacter && (
                    <button type="button" className="rv-link" onClick={() => onOpenCharacter(hanzi!)}>
                      Xem chi tiết
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="rv-actions">
              {revealed ? (
                <>
                  <button type="button" className="rv-btn rv-btn-forget" onClick={() => answer(1)}>
                    Quên <kbd className="rv-kbd">1</kbd>
                  </button>
                  <button type="button" className="rv-btn rv-btn-primary" onClick={() => answer(2)}>
                    Nhớ <kbd className="rv-kbd">2</kbd>
                  </button>
                </>
              ) : (
                <button type="button" className="rv-btn rv-btn-primary rv-btn-wide" onClick={reveal} autoFocus>
                  Lật thẻ <kbd className="rv-kbd">Space</kbd>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
