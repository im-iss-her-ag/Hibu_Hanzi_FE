import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X, Volume2 } from 'lucide-react'
import type { BundleCharacter, Word } from '../core'
import { useModalDialog } from '../utils/useModalA11y'
import { speakChinese } from '../utils/speech'
import { TonePinyin } from './TonePinyin'
import {
  buildSession,
  eligibleWords,
  recordAnswer,
  wordsForScope,
  type QuizQuestion,
  type QuizScope,
} from '../learn/hanVietQuiz'
import { useLearnData } from '../learn/srs'
import '../styles/quiz.css'

interface HanVietQuizProps {
  words: readonly Word[]
  characters: readonly BundleCharacter[]
  initialScope: QuizScope
  selectedLevel: number | null
  favorites: string[]
  onSelectWord: (word: string) => void
  onClose: () => void
}

type ScopeKey = 'char' | 'level' | 'learned' | 'favorites'

const CLASS_LABEL = { 'trong-suot': 'Trong suốt', 'mot-phan': 'Gợi ý một phần', 'can-nho': 'Cần nhớ nghĩa', lech: 'Lệch nghĩa', bay: 'Bẫy' } as const

function scopeKeyOf(s: QuizScope): ScopeKey {
  return s.kind
}

export function HanVietQuiz({
  words,
  characters,
  initialScope,
  selectedLevel,
  favorites,
  onSelectWord,
  onClose,
}: HanVietQuizProps) {
  const { ref: dialogRef, titleId, dialogProps } = useModalDialog<HTMLDivElement>(onClose)
  const [scopeKey, setScopeKey] = useState<ScopeKey>(() => {
    const k = scopeKeyOf(initialScope)
    if (k === 'level' && selectedLevel == null) return 'learned'
    return k
  })
  const [session, setSession] = useState<QuizQuestion[] | null>(null)
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [results, setResults] = useState<boolean[]>([])
  const [hint, setHint] = useState(false)

  const learnData = useLearnData()
  // Known chars only count when they yield enough words for a session; otherwise fall back to the HSK range.
  const knownList = useMemo(() => {
    const k = Object.keys(learnData.known)
    if (!k.length) return null
    const n = eligibleWords(wordsForScope(words, { kind: 'learned', maxLevel: 0, known: k })).length
    return n >= 4 ? k : null
  }, [learnData, words])

  const scope = useMemo<QuizScope | null>(() => {
    switch (scopeKey) {
      case 'char':
        return initialScope.kind === 'char' ? initialScope : null
      case 'level':
        return selectedLevel != null ? { kind: 'level', level: selectedLevel } : null
      case 'learned':
        return knownList ? { kind: 'learned', maxLevel: selectedLevel ?? 1, known: knownList } : { kind: 'learned', maxLevel: selectedLevel ?? 1 }
      case 'favorites':
        return { kind: 'favorites', hanzi: favorites }
    }
  }, [scopeKey, initialScope, selectedLevel, favorites, knownList])

  const count = useMemo(
    () => (scope ? eligibleWords(wordsForScope(words, scope)).length : 0),
    [words, scope],
  )

  const start = useCallback(() => {
    if (!scope) return
    const s = buildSession({ words, characters, scope })
    if (s.length === 0) return
    setSession(s)
    setIndex(0)
    setPicked(null)
    setResults([])
    setHint(false)
  }, [scope, words, characters])

  const q = session && index < session.length ? session[index] : null
  const done = session !== null && q === null
  const answered = picked !== null

  const choose = useCallback(
    (i: number) => {
      if (!q || picked !== null) return
      const correct = i === q.answerIndex
      setPicked(i)
      setResults((r) => [...r, correct])
      recordAnswer(q.word.word, correct)
    },
    [q, picked],
  )

  const next = useCallback(() => {
    if (!session || picked === null) return
    setIndex((i) => i + 1)
    setPicked(null)
  }, [session, picked])

  // Keep the latest handlers in a ref so the capture listener is attached once.
  const act = useRef({ start, choose, next, q, answered, session, done })
  act.current = { start, choose, next, q, answered, session, done }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const a = act.current
      const k = e.key
      const onButton = (e.target as HTMLElement | null)?.tagName === 'BUTTON'
      // Let a focused button keep native Space/Enter (scope radios, hint, mistakes, close).
      // Exception: the "start" screen's Enter, and Enter on the post-answer Next button (native click handles it).
      if ((k === ' ' || k === 'Enter') && onButton && (a.session || k === ' ')) {
        if (a.q && !a.answered) e.stopPropagation() // do not leak to App
        return
      }
      if ((k === ' ' || k === 'Enter') && e.repeat) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      let handled = false
      if (a.q && k >= '1' && k <= '4') {
        a.choose(Number(k) - 1)
        handled = true
      } else if (a.q && (k === 'h' || k === 'H')) {
        setHint((v) => !v)
        handled = true
      } else if (k === 'Enter' || k === ' ') {
        if (!a.session) a.start()
        else if (a.q && a.answered) a.next()
        handled = !!(!a.session || (a.q && a.answered) || k === ' ')
      } else if (k >= '1' && k <= '6') {
        handled = true // swallow App's HSK-level shortcuts while the quiz is open
      }
      if (handled) {
        e.stopPropagation()
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
    }
  }, [])

  // Move focus to the explanation's "next" button once answered so SR/keyboard users land there.
  const nextRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (answered) nextRef.current?.focus({ preventScroll: false })
  }, [answered])

  const correctCount = results.filter(Boolean).length
  const mistakes = session ? session.filter((_, i) => results[i] === false) : []
  const total = session?.length ?? 0

  const scopes: { key: ScopeKey; label: string; disabled?: boolean }[] = []
  if (initialScope.kind === 'char') scopes.push({ key: 'char', label: `Chữ ${initialScope.hanzi}` })
  if (selectedLevel != null) scopes.push({ key: 'level', label: `HSK ${selectedLevel}` })
  scopes.push({ key: 'learned', label: knownList ? `Đã thuộc (${knownList.length} chữ)` : `Đã học (HSK 1–${selectedLevel ?? 1})` })
  scopes.push({ key: 'favorites', label: 'Sổ tay', disabled: favorites.length === 0 })

  const liveText =
    q && picked !== null
      ? picked === q.answerIndex
        ? 'Đúng.'
        : `Chưa đúng. Đáp án: ${q.options[q.answerIndex]}.`
      : ''

  return (
    <div className="pm-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="pm-dialog hq-dialog"
        {...dialogProps}
        ref={dialogRef}
      >
        <div className="pm-header">
          <h2 className="pm-title" id={titleId}>Đoán nghĩa qua Hán Việt</h2>
          {q && (
            <span className="pm-meta hq-count">
              {index + 1}/{total}
            </span>
          )}
          <div className="pm-header-actions">
            <button type="button" className="pm-icon-btn" onClick={onClose} aria-label="Đóng" title="Đóng (Esc)">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="pm-body hq-body">
          <div className="hq-live" role="status" aria-live="polite">{liveText}</div>

          {!session && (
            <div className="hq-start">
              <p className="hq-desc">
                Nhìn âm Hán Việt của từng chữ rồi đoán nghĩa của cả từ. Có từ gần như đọc là hiểu, có từ nghĩa đã lệch đi, và vài từ dễ gây hiểu nhầm.
              </p>
              <div className="hq-label label" id="hq-scope-label">Phạm vi</div>
              <div className="hq-seg" role="radiogroup" aria-labelledby="hq-scope-label">
                {scopes.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    role="radio"
                    aria-checked={scopeKey === s.key}
                    disabled={s.disabled}
                    className={`hq-seg-btn${scopeKey === s.key ? ' is-active' : ''}`}
                    onClick={() => setScopeKey(s.key)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="hq-scope-count">
                {count > 0 ? `${count} từ trong phạm vi này.` : 'Chưa có từ nào phù hợp trong phạm vi này. Hãy thử phạm vi khác.'}
              </p>
              <button type="button" className="hq-btn hq-primary" onClick={start} disabled={count === 0}>
                Bắt đầu <span className="kbd">Enter</span>
              </button>
            </div>
          )}

          {q && (
            <div className="hq-question">
              <div className="hq-progress" aria-hidden="true">
                <div className="hq-progress-fill" style={{ width: `${(index / total) * 100}%` }} />
              </div>

              <div className="hq-word" lang="zh">
                {q.parts.map((p, i) => (
                  <div className="hq-char" key={i}>
                    <span className="hq-han">{p.hanzi}</span>
                    <span className="hq-hv" lang="vi">{p.hanViet ?? '—'}</span>
                    {hint && <span className="hq-gloss" lang="vi">{p.meaning ?? '—'}</span>}
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="hq-btn hq-hint"
                aria-pressed={hint}
                onClick={() => setHint((v) => !v)}
              >
                Gợi ý nghĩa từng chữ <span className="kbd">H</span>
              </button>

              <div className="hq-options" role="group" aria-label="Chọn nghĩa của từ">
                {q.options.map((opt, i) => {
                  const isAnswer = i === q.answerIndex
                  const state = !answered ? '' : isAnswer ? ' is-correct' : i === picked ? ' is-wrong' : ' is-dim'
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`hq-option${state}`}
                      disabled={answered}
                      aria-disabled={answered}
                      onClick={() => choose(i)}
                    >
                      <span className="hq-num">{i + 1}</span>
                      <span className="hq-opt-text" lang="vi">{opt}</span>
                      {answered && isAnswer && <span className="hq-mark">✓ Đúng</span>}
                      {answered && !isAnswer && i === picked && <span className="hq-mark">✗ Chưa đúng</span>}
                    </button>
                  )
                })}
              </div>

              {answered && (
                <div className="hq-reveal">
                  <div className="hq-reveal-head">
                    <TonePinyin pinyin={q.word.pinyin} className="hq-pinyin" />
                    <button
                      type="button"
                      className="pm-icon-btn"
                      aria-label="Nghe phát âm"
                      title="Nghe phát âm"
                      onClick={() => speakChinese(q.word.word, 0.9, q.word.pinyin)}
                    >
                      <Volume2 size={18} />
                    </button>
                    <span className={`hq-badge hq-badge-${q.cls}`}>{CLASS_LABEL[q.cls]}</span>
                  </div>
                  <div className="hq-meaning" lang="vi">{q.word.meaningVi}</div>

                  <ul className="hq-parts">
                    {q.parts.map((p, i) => (
                      <li key={i}>
                        <span className="hq-part-han" lang="zh">{p.hanzi}</span>
                        <span className="hq-part-hv" lang="vi">{p.hanViet ?? '—'}</span>
                        <span className="hq-part-mean" lang="vi">{p.meaning ?? ''}</span>
                      </li>
                    ))}
                  </ul>

                  {q.cls === 'bay' && q.trap ? (
                    <div className="hq-card hq-card-bay">
                      <div className="hq-card-title">Bẫy Hán Việt</div>
                      <div>Dễ hiểu nhầm là: <strong>{q.trap.literal}</strong></div>
                      <p>{q.trap.note}</p>
                    </div>
                  ) : q.cls === 'lech' ? (
                    <div className="hq-card hq-card-lech">
                      {q.trap ? (
                        <>
                          <div>Dễ hiểu theo nghĩa đen: <strong>{q.trap.literal}</strong></div>
                          <p>{q.trap.note}</p>
                        </>
                      ) : (
                        <p>Nghĩa của từ đã lệch đi so với nghĩa từng chữ ghép lại.</p>
                      )}
                    </div>
                  ) : q.cls === 'mot-phan' ? (
                    <p className="hq-note">Một phần âm Hán Việt gợi ra nghĩa; phần còn lại cần nhớ.</p>
                  ) : q.cls === 'can-nho' ? (
                    <p className="hq-note">Âm Hán Việt ít gợi ra nghĩa trong tiếng Việt hiện nay, nên hãy nhớ nghĩa của cả từ.</p>
                  ) : (
                    <p className="hq-note">Âm Hán Việt gần như chính là nghĩa.</p>
                  )}

                  <div className="hq-actions">
                    <button ref={nextRef} type="button" className="hq-btn hq-primary" onClick={next}>
                      {index + 1 >= total ? 'Xem kết quả' : 'Tiếp'} <span className="kbd">Enter</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {done && (
            <div className="hq-summary">
              <div className="hq-score">Đúng {correctCount}/{total}</div>
              {mistakes.length > 0 ? (
                <>
                  <div className="hq-label label">Các từ cần xem lại</div>
                  <ul className="hq-mistakes">
                    {mistakes.map((m) => (
                      <li key={m.word.id}>
                        <button
                          type="button"
                          className="hq-mistake"
                          onClick={() => {
                            onSelectWord(m.word.word)
                            onClose()
                          }}
                        >
                          <span className="hq-part-han" lang="zh">{m.word.word}</span>
                          <span className="hq-part-hv" lang="vi">{m.word.hanViet ?? m.parts.map((p) => p.hanViet ?? '—').join(' ')}</span>
                          <span className="hq-part-mean" lang="vi">{m.word.meaningVi}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="hq-note">Bạn đã nhớ hết các từ trong lượt này.</p>
              )}
              <div className="hq-actions">
                <button type="button" className="hq-btn hq-primary" onClick={start}>Làm lượt mới</button>
                <button type="button" className="hq-btn" onClick={onClose}>Đóng</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
