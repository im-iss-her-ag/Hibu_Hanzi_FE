import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Volume2, X } from 'lucide-react'
import type { BundleCharacter } from '../core'
import { primaryReading } from '../core/lookup'
import { useModalDialog } from '../utils/useModalA11y'
import { prefetchChinese, speakChinese, stopChinese } from '../utils/speech'
import { buildQueue, getLearnData, setKnown } from '../learn/srs'
import { getDaily, learnNewToday, newCandidates } from '../learn/daily'
import { TonePinyin } from '../components/TonePinyin'
import { HanziWriterCanvas } from '../components/HanziWriterCanvas'

export interface LearnStepProps {
  queue: string[]
  characters: BundleCharacter[]
  onClose: () => void
  onFinished: () => void
  onOpenCharacter: (h: string) => void
}

const GUARD_MS = 280

/** Short guided step per new character: see it, hear it, watch the strokes, then decide how to review it. */
export function LearnStep({ queue, characters, onClose, onFinished, onOpenCharacter }: LearnStepProps) {
  const { ref: dialogRef, titleId, dialogProps } = useModalDialog<HTMLDivElement>(onClose)
  const byHanzi = useMemo(() => new Map(characters.map((c) => [c.hanzi, c])), [characters])

  const [list, setList] = useState<string[]>(() => [...queue])
  const [index, setIndex] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const [learned, setLearned] = useState<string[]>([])
  const [knownCount, setKnownCount] = useState(0)

  const done = index >= list.length
  const hanzi = done ? null : list[index]
  const char = hanzi ? byHanzi.get(hanzi) : undefined
  const reading = char ? primaryReading(char) : null
  const nextReading = (() => {
    const n = list[index + 1]
    const c = n ? byHanzi.get(n) : undefined
    return c ? primaryReading(c) : null
  })()

  const shownAt = useRef(0)
  const addRef = useRef<HTMLButtonElement>(null)
  const finishRef = useRef<HTMLButtonElement>(null)

  const play = useCallback(() => {
    if (hanzi) speakChinese(hanzi, 1, reading?.pinyin)
  }, [hanzi, reading?.pinyin])

  // New character on screen: reset the double-press guard, say it once, warm the next one, keep focus on the primary answer.
  useEffect(() => {
    if (!hanzi) return
    shownAt.current = Date.now()
    prefetchChinese(reading?.pinyin, nextReading?.pinyin)
    const t = window.setTimeout(() => speakChinese(hanzi, 1, reading?.pinyin), 220)
    addRef.current?.focus({ preventScroll: true })
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hanzi])

  useEffect(() => {
    if (done) finishRef.current?.focus({ preventScroll: true })
  }, [done])
  useEffect(() => () => stopChinese(), [])

  const advance = () => setIndex((i) => i + 1)

  const answer = useCallback(
    (remembered: boolean) => {
      if (!hanzi || Date.now() - shownAt.current < GUARD_MS) return
      learnNewToday(hanzi, remembered)
      setLearned((l) => (l.includes(hanzi) ? l : [...l, hanzi]))
      setIndex((i) => i + 1)
    },
    [hanzi],
  )

  const markKnown = useCallback(() => {
    if (!hanzi || Date.now() - shownAt.current < GUARD_MS) return
    setKnown([hanzi], true)
    setKnownCount((n) => n + 1)
    // Marking "already known" does not count toward the goal: pull in the next candidate to keep the session's size.
    const have = new Set(list)
    const extra = newCandidates(getLearnData(), getDaily(), characters, list.length + 12).find((h) => !have.has(h))
    if (extra) setList((l) => [...l, extra])
    setSkipped((s) => s + 1)
    advance()
  }, [hanzi, list, characters])

  const state = useRef({ done, answer, markKnown })
  state.current = { done, answer, markKnown }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key
      if (k === 'Escape' || k === 'Tab') return
      const s = state.current
      const onButton = (e.target as HTMLElement | null)?.tagName === 'BUTTON'
      const swallow = () => {
        e.preventDefault()
        e.stopPropagation()
      }
      if (k === ' ' || k === 'Enter') {
        if (onButton) return // a focused button keeps its native Space / Enter behaviour
        swallow()
        if (e.repeat || s.done) return
        s.answer(false)
        return
      }
      if (k === '1' || k === '2') {
        swallow()
        if (e.repeat || s.done) return
        s.answer(k === '2')
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [])

  const position = Math.min(index + 1 - skipped, list.length - skipped)
  const totalShown = list.length - skipped
  const dueNow = done ? buildQueue(getLearnData()).length : 0

  return (
    <div className="pm-backdrop">
      <div ref={dialogRef} {...dialogProps} className="pm-dialog pm-md ls-dialog" data-testid="learn-step">
        <div className="pm-header">
          <h2 id={titleId} className="pm-title">{done ? 'Xong phần học mới' : 'Học chữ mới'}</h2>
          {!done && totalShown > 0 && (
            <span className="pm-meta ls-progress" aria-live="polite" data-testid="learn-progress">
              {position} / {totalShown}
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
          <div className="pm-body ls-body ls-summary">
            <p className="ls-lead">
              {learned.length > 0 ? `Bạn vừa học ${learned.length} chữ mới` : knownCount > 0 ? 'Đã ghi nhận các chữ bạn đã thuộc' : 'Chưa có chữ mới nào'}
            </p>
            {learned.length > 0 && (
              <ul className="ls-learned" aria-label="Các chữ vừa học">
                {learned.map((h) => {
                  const r = byHanzi.get(h) ? primaryReading(byHanzi.get(h)!) : null
                  return (
                    <li key={h}>
                      <button type="button" className="ls-chip" onClick={() => onOpenCharacter(h)} title={`Xem chi tiết chữ ${h}`}>
                        <span className="ls-chip-han" lang="zh">{h}</span>
                        <span className="ls-chip-hv">{r?.hanViet ? r.hanViet.toUpperCase() : r?.pinyin ?? ''}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            {knownCount > 0 && learned.length > 0 && <p className="ls-note">Thêm {knownCount} chữ bạn đã thuộc từ trước.</p>}
            <p className="ls-note">
              {dueNow > 0
                ? 'Ôn ngay khi còn nhớ sẽ giúp chữ ở lại lâu hơn.'
                : 'Những chữ bạn nhớ rồi sẽ được nhắc lại vào ngày mai.'}
            </p>
          </div>
          <div className="pm-foot pm-foot-answers">
            {dueNow > 0 ? (
              <button type="button" ref={finishRef} className="pm-btn pm-btn-primary" onClick={onFinished} data-testid="learn-finish">
                Ôn ngay ({dueNow})
              </button>
            ) : (
              <button type="button" ref={finishRef} className="pm-btn pm-btn-primary" onClick={onClose} data-testid="learn-finish">
                Xong
              </button>
            )}
          </div>
          </>
        ) : (
          <>
            <div className="pm-body ls-body">
              <div className="ls-info">
                <div className="ls-glyph" lang="zh" data-testid="learn-char">{hanzi}</div>
                <div className="ls-text">
                  {reading?.hanViet && <div className="ls-hv">{reading.hanViet.toUpperCase()}</div>}
                  {reading?.pinyin && (
                    <div className="ls-py">
                      <TonePinyin pinyin={reading.pinyin} />
                      <button type="button" className="pm-icon-btn ls-speak" onClick={play} aria-label="Nghe phát âm" title="Nghe phát âm">
                        <Volume2 size={18} />
                      </button>
                    </div>
                  )}
                  {reading?.meaningVi && <div className="ls-mean">{reading.meaningVi}</div>}
                  {!reading && <div className="ls-mean">Chưa có dữ liệu cho chữ này.</div>}
                  <button type="button" className="pm-btn pm-btn-ghost ls-known" onClick={markKnown} data-testid="learn-known">
                    Đã thuộc từ trước
                  </button>
                </div>
              </div>
              <div className="ls-stroke">
                <span className="label ls-stroke-label">Thứ tự nét</span>
                <HanziWriterCanvas key={hanzi} hanzi={hanzi!} defaultMode="animate" />
              </div>
            </div>

            <div className="pm-foot pm-foot-answers">
              <button type="button" ref={addRef} className="pm-btn pm-btn-primary ls-answer" onClick={() => answer(false)} data-testid="learn-add">
                <span className="ls-answer-main">
                  Thêm vào ôn <kbd>1</kbd>
                </span>
                <span className="ls-answer-sub">ôn lại ngay hôm nay</span>
              </button>
              <button type="button" className="pm-btn ls-answer" onClick={() => answer(true)} data-testid="learn-remembered">
                <span className="ls-answer-main">
                  Đã nhớ <kbd>2</kbd>
                </span>
                <span className="ls-answer-sub">ôn lại ngày mai</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
