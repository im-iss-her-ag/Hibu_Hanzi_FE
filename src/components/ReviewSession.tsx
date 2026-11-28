import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X, Volume2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import type { BundleCharacter, Word } from '../core'
import { api } from '../api'
import { primaryReading } from '../core/lookup'
import { useModalDialog } from '../utils/useModalA11y'
import { speakChinese, prefetchChinese } from '../utils/speech'
import { buildQueue, dayKey, grade, getLearnData, isLeech, isWordKey, NEW_PER_DAY, nextDueAt, SESSION_SIZE, useLearnData } from '../learn/srs'
import { TonePinyin } from './TonePinyin'

interface ReviewSessionProps {
  characters: BundleCharacter[]
  onClose: () => void
  onOpenCharacter?: (hanzi: string) => void
  /** Word list: lets word cards (谢谢, 学生) show pinyin / Hán Việt / meaning. Missing keys fall back to api.getWord. */
  words?: readonly Word[]
  /** Opens the word view for a word card. */
  onOpenWord?: (word: string) => void
}

/** "sau 10 phút", "sau 3 giờ", "ngày mai, 08:30", "sau 5 ngày (03/12)": a date alone hid that it was minutes away. */
function relTime(t: number, now = Date.now()): string {
  const diff = t - now
  if (diff <= 60_000) return 'ngay bây giờ'
  const min = Math.round(diff / 60_000)
  if (min < 60) return `sau ${min} phút`
  const d = new Date(t)
  const hm = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86_400_000)
  if (days === 0) return `sau ${Math.round(min / 60)} giờ (lúc ${hm})`
  if (days === 1) return `ngày mai, lúc ${hm}`
  return `sau ${days} ngày (${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })})`
}

export function ReviewSession({ characters, onClose, onOpenCharacter, words, onOpenWord }: ReviewSessionProps) {
  const { ref: dialogRef, titleId, dialogProps } = useModalDialog<HTMLDivElement>(onClose)
  const learn = useLearnData()
  // A long backlog is served in chunks of SESSION_SIZE; the end screen offers the next chunk.
  const [queue, setQueue] = useState<string[]>(() => buildQueue().slice(0, SESSION_SIZE))
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [good, setGood] = useState(0)
  const [bad, setBad] = useState(0)
  const [forgotten, setForgotten] = useState<string[]>([])
  // "Ôn lại" replays this session's forgotten characters as practice: no grades, schedule untouched.
  const [practice, setPractice] = useState(false)
  const requeued = useRef(new Set<string>())
  const startRound = (next: string[], asPractice: boolean) => {
    requeued.current = new Set()
    setQueue(next)
    setIndex(0)
    setRevealed(false)
    setGood(0)
    setBad(0)
    setForgotten([])
    setPractice(asPractice)
  }

  const byHanzi = useMemo(() => new Map(characters.map((c) => [c.hanzi, c])), [characters])
  const done = index >= queue.length
  const hanzi = done ? null : queue[index]
  const isWord = !!hanzi && isWordKey(hanzi)
  const wordMap = useMemo(() => {
    const m = new Map<string, Word>()
    for (const w of words ?? []) {
      m.set(w.word, w)
      if (w.traditional && !m.has(w.traditional)) m.set(w.traditional, w)
    }
    return m
  }, [words])
  const listedWord = isWord ? wordMap.get(hanzi!) : undefined
  // A word that is not in the loaded list (older data, removed row): ask the API once.
  const wordFallback = useQuery({
    queryKey: ['word', hanzi],
    queryFn: () => api.getWord(hanzi!),
    enabled: isWord && !listedWord,
    retry: false,
  })
  const wordEntry = listedWord ?? wordFallback.data?.word
  const char = hanzi && !isWord ? byHanzi.get(hanzi) : undefined
  const reading: { pinyin: string; hanViet: string | null; meaningVi: string | null } | null = isWord
    ? wordEntry
      ? { pinyin: wordEntry.pinyin, hanViet: wordEntry.hanViet, meaningVi: wordEntry.meaningVi }
      : null
    : char
      ? primaryReading(char)
      : null
  useEffect(() => { prefetchChinese(reading?.pinyin) }, [reading?.pinyin])
  const card = hanzi ? learn.cards[hanzi] : undefined
  const leech = isLeech(card)
  // Mnemonic / etymology live in the detail endpoint; fetch only for leeches.
  const leechDetail = useQuery({
    queryKey: ['detail', hanzi],
    queryFn: () => api.getCharacter(hanzi!),
    enabled: Boolean(leech && hanzi && !isWord),
  })
  const leechChar = leechDetail.data?.character

  // Flipping the card also says the character or word: hearing it is half of remembering it.
  const reveal = useCallback(() => {
    setRevealed(true)
    if (hanzi && reading?.pinyin) speakChinese(hanzi, 1, reading.pinyin)
  }, [hanzi, reading?.pinyin])
  const answer = useCallback(
    (g: 1 | 2) => {
      if (!hanzi) return
      if (g === 1) setForgotten((f) => (f.includes(hanzi) ? f : [...f, hanzi]))
      if (practice) {
        if (g === 2) setGood((n) => n + 1)
        else setBad((n) => n + 1)
        setIndex((i) => i + 1)
        setRevealed(false)
        return
      }
      const c = getLearnData().cards[hanzi]
      // Card removed meanwhile (other tab, backup overwrite): skip it without counting a grade.
      if (!c) {
        setIndex((i) => i + 1)
        setRevealed(false)
        return
      }
      const wasNew = c.state === 'new'
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
    [hanzi, practice],
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
  const remaining = done ? buildQueue(learn) : []
  // New cards waiting behind today's limit (the queue is empty although cards exist).
  const waitingNew = Object.values(learn.cards).filter((c) => c.state === 'new' && c.reps === 0).length
  const newCapped = waitingNew > 0 && (learn.newIntroduced[dayKey()] ?? 0) >= NEW_PER_DAY

  return (
    <div className="pm-backdrop">
      <div ref={dialogRef} {...dialogProps} className="pm-dialog pm-sm rv-dialog">
        <div className="pm-header">
          <h2 id={titleId} className="pm-title">Ôn tập</h2>
          {!done && (
            <span className="pm-meta rv-progress" aria-live="polite">
              {practice && 'Ôn lại · '}
              {index + 1} / {queue.length}
            </span>
          )}
          <div className="pm-header-actions">
            <button type="button" className="pm-icon-btn pm-close" onClick={onClose} aria-label="Đóng" title="Đóng (Esc)">
              <X size={18} />
            </button>
          </div>
        </div>

        {done ? (
          <>
          <div className="pm-body rv-body rv-summary">
            {queue.length === 0 ? (
              hasCards ? (
                <>
                  <p className="rv-lead">Hôm nay đã ôn xong</p>
                  <p className="rv-note">
                    {next ? `Lượt ôn tiếp theo: ${relTime(next)}.` : 'Chưa có lượt ôn tiếp theo.'}
                    {newCapped
                      ? ` Bạn đã học đủ ${NEW_PER_DAY} thẻ mới hôm nay; ${waitingNew} thẻ còn lại sẽ vào ôn từ ngày mai.`
                      : ' Trong lúc chờ, hãy học thêm chữ hoặc từ mới và bấm “Ôn tập” cạnh đó để thêm vào đây.'}
                  </p>
                </>
              ) : (
                <>
                  <p className="rv-lead">Chưa có chữ hay từ nào để ôn</p>
                  <p className="rv-note">
                    Khi học một chữ hay một từ, bấm nút “Ôn tập” (biểu tượng lịch) cạnh đó để thêm vào đây. Ứng dụng sẽ nhắc bạn
                    ôn lại đúng lúc sắp quên. Chữ đã biết thì bấm “Đã thuộc” để chỉ kiểm tra lại sau 30 ngày.
                  </p>
                </>
              )
            ) : (
              <>
                <p className="rv-lead">{practice ? 'Xong lượt ôn lại' : 'Xong phiên ôn'}</p>
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
                {forgotten.length > 0 && (
                  <div className="rv-forgot">
                    <span className="label">Cần xem lại</span>
                    <div className="rv-forgot-list">
                      {forgotten.map((h) => (
                        <button
                          key={h}
                          type="button"
                          lang="zh"
                          className={`rv-forgot-chip${isWordKey(h) ? ' rv-forgot-chip-word' : ''}`}
                          onClick={() => (isWordKey(h) ? onOpenWord?.(h) : onOpenCharacter?.(h))}
                          disabled={isWordKey(h) ? !onOpenWord : !onOpenCharacter}
                          title={isWordKey(h) ? `Mở từ ${h}` : `Mở chữ ${h}`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {!practice && (
                  <p className="rv-note">
                    {remaining.length > 0
                      ? `Còn ${remaining.length} thẻ cần ôn hôm nay.`
                      : next
                        ? `Lượt ôn tiếp theo: ${relTime(next)}.`
                        : 'Chưa có lượt ôn tiếp theo.'}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="pm-foot pm-foot-answers rv-actions">
            {forgotten.length > 0 && (
              <button type="button" className="pm-btn" onClick={() => startRound(forgotten, true)}>
                Ôn lại {forgotten.length} thẻ quên
              </button>
            )}
            {remaining.length > 0 && queue.length > 0 ? (
              <button type="button" className="pm-btn pm-btn-primary" onClick={() => startRound(remaining.slice(0, SESSION_SIZE), false)} autoFocus>
                Tiếp {Math.min(SESSION_SIZE, remaining.length)} thẻ
              </button>
            ) : (
              <button type="button" className="pm-btn pm-btn-primary" onClick={onClose} autoFocus>
                Xong
              </button>
            )}
          </div>
          </>
        ) : (
          <>
            <div className="pm-body rv-body">
              <div className={`rv-han${isWord ? ` rv-han-word${Array.from(hanzi!).length > 3 ? ' rv-han-long' : ''}` : ''}`} lang="zh">
                {hanzi}
              </div>

              {revealed && (
                <div className="rv-answer" aria-live="polite">
                  {reading?.hanViet && <div className={`rv-hv${isWord ? ' rv-hv-word' : ''}`}>{reading.hanViet.toUpperCase()}</div>}
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
                  {!reading && (
                    <div className="rv-mean">
                      {isWord && wordFallback.isFetching ? 'Đang tải…' : isWord ? 'Chưa có dữ liệu cho từ này.' : 'Chưa có dữ liệu cho chữ này.'}
                    </div>
                  )}
                  {leech && (
                    <div className="rv-leech">
                      <span className="label">{isWord ? 'Từ hay quên' : 'Chữ hay quên'}</span>
                      {leechChar?.mnemonicVi && <p>{leechChar.mnemonicVi}</p>}
                      {leechChar?.chietTu && <p>{leechChar.chietTu}</p>}
                    </div>
                  )}
                  {(isWord ? onOpenWord : onOpenCharacter) && (
                    <button type="button" className="rv-link" onClick={() => (isWord ? onOpenWord!(hanzi!) : onOpenCharacter!(hanzi!))}>
                      Xem chi tiết
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="pm-foot pm-foot-answers rv-actions">
              {revealed ? (
                <>
                  <button type="button" className="pm-btn" onClick={() => answer(1)}>
                    Quên <kbd>1</kbd>
                  </button>
                  <button type="button" className="pm-btn pm-btn-primary" onClick={() => answer(2)}>
                    Nhớ <kbd>2</kbd>
                  </button>
                </>
              ) : (
                <button type="button" className="pm-btn pm-btn-primary" onClick={reveal} autoFocus>
                  Lật thẻ <kbd>Space</kbd>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
