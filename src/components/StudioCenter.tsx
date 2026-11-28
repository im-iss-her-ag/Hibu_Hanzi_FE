import { useEffect, useMemo, useState } from 'react'
import { Volume2, Star, ArrowLeft, X, Mic } from 'lucide-react'
import type { BundleCharacter, CharacterDetail, LevelFilter, Word } from '../core'
import type { HistoryEntry } from '../App'
import { HanziWriterCanvas } from './HanziWriterCanvas'
import { LearnActions } from './LearnActions'
import { speakChinese, prefetchChinese } from '../utils/speech'
import { pinyinSyllables } from '../utils/tone'
import { HomophonePanel } from './HomophonePanel'
import { findHomophones } from '../utils/homophones'

function TurtleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="13" rx="6" ry="5" />
      <path d="M12 8v10" />
      <path d="M7 11h10" />
      <path d="M7 15h10" />
      <path d="M12 8V5a1.5 1.5 0 0 1 3 0v1" />
      <path d="m6.5 10.5-2.5-1.5" />
      <path d="m17.5 10.5 2.5-1.5" />
      <path d="m6.5 15.5-2.5 1.5" />
      <path d="m17.5 15.5 2.5 1.5" />
      <path d="M12 18v2" />
    </svg>
  )
}

function Pinyin({ text }: { text: string }) {
  return (
    <>
      {pinyinSyllables(text).map((s, i) => (
        <span key={i} className={`py t${s.tone}`}>
          {i > 0 ? ' ' : ''}
          {s.text}
        </span>
      ))}
    </>
  )
}

interface StudioCenterProps {
  character: BundleCharacter
  detail: CharacterDetail | null
  currentIndex: number
  totalCount: number
  selectedLevel: LevelFilter
  isFavorite: boolean
  displayMode: 'modern' | 'components'
  onToggleFavorite: () => void
  /** Navigation lives in StudyNav now; kept optional for API compatibility. */
  onNext?: () => void
  onPrev?: () => void
  onRandom?: () => void
  previousEntry: HistoryEntry | null
  recentTrail: HistoryEntry[]
  onGoBack: () => void
  onSelectTrailEntry: (entry: HistoryEntry) => void
  onOpenMobileList?: () => void
  /** Word the user came from (search / Từ ghép); shown as a banner above the hero. */
  wordInfo?: { word: string; pinyin: string; hanViet: string | null; meaningVi: string } | null
  onSelectWordChar?: (hanzi: string) => void
  /** Full word list: powers "Từ HSK" (add this character's HSK words to review). */
  allWords?: readonly Word[]
  onDismissWord?: () => void
  /** Full character list + navigation, for the "Đồng âm" panel. */
  allCharacters?: BundleCharacter[]
  onSelectHomophone?: (hanzi: string) => void
  /** Opens the tone trainer ("Nói thử") for the current character / word. */
  onOpenToneTrainer?: () => void
}

const norm = (s?: string | null) => (s ?? '').trim().toLowerCase()

export function StudioCenter({
  character,
  detail,
  currentIndex,
  totalCount,
  selectedLevel,
  isFavorite,
  displayMode,
  onToggleFavorite,
  previousEntry,
  recentTrail,
  onGoBack,
  onSelectTrailEntry,
  wordInfo,
  onSelectWordChar,
  allWords,
  onDismissWord,
  allCharacters,
  onSelectHomophone,
  onOpenToneTrainer,
}: StudioCenterProps) {
  const readings = character.readings || []
  const primary = readings.find((r) => r.isPrimary) ?? readings[0]
  // Keyed by hanzi so the panel closes when the character changes.
  const [homophoneFor, setHomophoneFor] = useState<string | null>(null)
  const showHomophones = homophoneFor === character.hanzi
  const setShowHomophones = (f: boolean | ((v: boolean) => boolean)) => {
    const next = typeof f === 'function' ? f(showHomophones) : f
    setHomophoneFor(next ? character.hanzi : null)
  }
  // True homophones (same Hán Việt, else same pinyin incl. tone) first; when there are none, offer the
  // near-homophones (other tones) under an honest "Gần âm" label instead of inflating "Đồng âm".
  const homophones = useMemo(() => {
    if (!allCharacters || !onSelectHomophone) return { count: 0, exact: true }
    for (const m of ['hv', 'py'] as const) {
      const n = findHomophones(allCharacters, character, m).length
      if (n > 0) return { count: n, exact: true }
    }
    return { count: findHomophones(allCharacters, character, 'hvLoose').length, exact: false }
  }, [allCharacters, onSelectHomophone, character])
  const homophoneCount = homophones.count

  // Other readings: skip the primary and anything that would repeat what is already shown
  const others = useMemo(() => {
    const seen = new Set<string>()
    if (primary) seen.add(`${norm(primary.pinyin)}|${norm(primary.hanViet)}`)
    return readings.filter((r) => {
      if (r === primary) return false
      const key = `${norm(r.pinyin)}|${norm(r.hanViet)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [readings, primary])

  // Last 3 distinct previous characters, newest first, excluding the current one
  const trail = useMemo(() => {
    const out: HistoryEntry[] = []
    const seen = new Set([character.hanzi])
    for (let i = recentTrail.length - 1; i >= 0; i--) {
      const e = recentTrail[i]
      if (seen.has(e.hanzi)) continue
      seen.add(e.hanzi)
      out.push(e)
      if (out.length === 3) break
    }
    return out
  }, [recentTrail, character.hanzi])

  const levelLabel = selectedLevel === 'radicals' ? 'Bộ thủ' : `HSK ${selectedLevel}`
  const strokeCount = detail?.character?.strokeCount
  const traditionalForm = detail?.character?.traditional ?? character.traditional
  const showTraditional = !!traditionalForm && traditionalForm !== character.hanzi

  const canSpeak = !!primary?.pinyin
  const speakText = primary?.pinyin || character.hanzi
  // Warm the recordings for this character's readings so the speak buttons answer instantly.
  useEffect(() => { prefetchChinese(primary?.pinyin, ...others.map((r) => r.pinyin)) }, [primary?.pinyin, others])
  const meaning = primary?.meaningVi?.trim()
  // HSK words containing this character, easiest first (capped so one tap never floods the queue).
  const hskWords = useMemo(() => {
    if (!allWords) return []
    const lv = (w: Word) => w.hsk3Level ?? w.hsk2Level ?? 99
    return allWords
      .filter((w) => lv(w) < 99 && Array.from(w.word).length > 1 && w.word.includes(character.hanzi))
      .sort((a, b) => lv(a) - lv(b) || Array.from(a.word).length - Array.from(b.word).length)
      .slice(0, 30)
      .map((w) => w.word)
  }, [allWords, character.hanzi])

  return (
    <section className="st">
      {wordInfo && (
        <div className="st-word">
          <div className="st-word-han" lang="zh">
            {Array.from(wordInfo.word).map((ch, i) => (
              <button
                key={i}
                type="button"
                className={`st-word-ch${ch === character.hanzi ? ' current' : ''}`}
                aria-current={ch === character.hanzi ? 'true' : undefined}
                onClick={() => ch !== character.hanzi && onSelectWordChar?.(ch)}
                title={ch === character.hanzi ? 'Chữ đang xem' : `Xem chữ ${ch}`}
              >
                {ch}
              </button>
            ))}
          </div>
          <div className="st-word-info">
            {wordInfo.pinyin && (
              <span className="st-word-py"><Pinyin text={wordInfo.pinyin} /></span>
            )}
            {wordInfo.hanViet && <span className="st-word-hv">{wordInfo.hanViet.toUpperCase()}</span>}
            {wordInfo.meaningVi && <span className="st-word-mean">{wordInfo.meaningVi}</span>}
          </div>
          <div className="st-word-actions">
            <LearnActions hanzi={wordInfo.word} />
            <button type="button" className="st-tiny st-word-btn" onClick={() => speakChinese(wordInfo.word, 1.0)} title="Phát âm từ" aria-label="Phát âm từ">
              <Volume2 size={16} />
            </button>
            <button type="button" className="st-tiny st-word-btn" onClick={onDismissWord} title="Ẩn từ này" aria-label="Ẩn từ này">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      <div className="st-meta">
        <div className="st-meta-line">
          <span>{levelLabel}</span>
          {totalCount > 0 && (
            <>
              <span className="st-dot" aria-hidden="true">·</span>
              <span>{currentIndex + 1}/{totalCount}</span>
            </>
          )}
          {strokeCount ? (
            <>
              <span className="st-dot" aria-hidden="true">·</span>
              <span>{strokeCount} nét</span>
            </>
          ) : null}
          {showTraditional && (
            <>
              <span className="st-dot" aria-hidden="true">·</span>
              <span title="Chữ phồn thể">Phồn <span lang="zh" className="st-zh">{traditionalForm}</span></span>
            </>
          )}
        </div>
        <div className="st-meta-actions">
          {previousEntry && (
            <nav className="st-trail" aria-label="Lịch sử vừa xem">
              <button type="button" className="st-icon-btn" onClick={onGoBack} title={`Quay lại ${previousEntry.hanzi} (Backspace)`} aria-label={`Quay lại ${previousEntry.hanzi}`}>
                <ArrowLeft size={16} />
              </button>
              {trail.map((entry) => (
                <button key={entry.hanzi} type="button" lang="zh" className="st-chip" onClick={() => onSelectTrailEntry(entry)} title={`Mở lại ${entry.hanzi}`}>
                  {entry.hanzi}
                </button>
              ))}
            </nav>
          )}
          <button
            type="button"
            className={`st-icon-btn la-btn st-star${isFavorite ? ' saved' : ''}`}
            onClick={onToggleFavorite}
            title={isFavorite ? 'Bỏ lưu khỏi sổ tay (G)' : 'Lưu vào sổ tay (G)'}
            aria-label={isFavorite ? 'Bỏ lưu khỏi sổ tay' : 'Lưu vào sổ tay'}
            aria-pressed={isFavorite}
          >
            <Star size={17} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
            <span className="la-label" aria-hidden="true">{isFavorite ? 'Đã lưu' : 'Lưu'}</span>
          </button>
          <LearnActions hanzi={character.hanzi} hskWords={hskWords} />
        </div>
      </div>

      <div className="st-hero">
        <HanziWriterCanvas hanzi={character.hanzi} displayMode={displayMode} defaultMode="display" />

        <div className="st-info" key={character.hanzi}>
          {/* Hán Việt leads: it is what sets this app apart, so it is the first thing read after the glyph. */}
          <div className="st-hv-block">
            <span className="label">Hán Việt</span>
            <span className="st-hv">
              {primary?.hanViet ? primary.hanViet.toUpperCase() : <span className="st-muted">—</span>}
            </span>
            {homophoneCount > 0 && (
              <button
                type="button"
                className="hp-trigger"
                aria-expanded={showHomophones}
                aria-haspopup="dialog"
                onClick={() => setShowHomophones((v) => !v)}
                title={homophones.exact ? 'Chữ cùng âm Hán Việt / pinyin' : 'Chưa có chữ đồng âm — xem chữ gần âm (khác thanh)'}
              >
                {homophones.exact ? 'Đồng âm' : 'Gần âm'} ({homophoneCount})
              </button>
            )}
            {showHomophones && allCharacters && onSelectHomophone && (
              <HomophonePanel
                characters={allCharacters}
                character={character}
                onClose={() => setShowHomophones(false)}
                onSelect={(h) => {
                  setShowHomophones(false)
                  onSelectHomophone(h)
                }}
              />
            )}
          </div>

          <div className="st-pinyin-row">
            <span className="st-pinyin">
              {primary?.pinyin ? <Pinyin text={primary.pinyin} /> : <span className="st-muted">{strokeCount ? `${strokeCount} nét` : '—'}</span>}
            </span>
            <span className="st-audio">
              <button type="button" className="st-sq" disabled={!canSpeak} onClick={() => speakChinese(speakText, 1.0)} title={canSpeak ? 'Phát âm' : 'Chưa có phiên âm'} aria-label="Phát âm">
                <Volume2 size={18} />
              </button>
              <button type="button" className="st-sq st-sq-wide" disabled={!canSpeak} onClick={() => speakChinese(speakText, 0.65)} title={canSpeak ? 'Đọc chậm' : 'Chưa có phiên âm'} aria-label="Đọc chậm">
                <TurtleIcon size={18} />
                <span aria-hidden="true">Chậm</span>
              </button>
              {onOpenToneTrainer && (
                <button type="button" className="st-sq" disabled={!canSpeak} onClick={onOpenToneTrainer} title={canSpeak ? 'Nói thử: luyện thanh điệu (V)' : 'Chưa có phiên âm'} aria-label="Nói thử thanh điệu">
                  <Mic size={18} />
                </button>
              )}
            </span>
          </div>

          <p className="st-meaning">{meaning || <span className="st-muted">Chưa có nghĩa tiếng Việt.</span>}</p>

          {others.length > 0 && (
            <div className="st-others">
              <span className="label">Cách đọc khác</span>
              <ul>
                {others.map((r, i) => {
                  const m = r.meaningVi?.trim()
                  const showMeaning = m && norm(m) !== norm(meaning)
                  return (
                    <li key={i}>
                      <span className="st-o-py"><Pinyin text={r.pinyin} /></span>
                      {r.hanViet && <span className="st-o-hv">{r.hanViet.toUpperCase()}</span>}
                      <button type="button" className="st-tiny" onClick={() => speakChinese(r.pinyin, 1.0)} title={`Phát âm ${r.pinyin}`} aria-label={`Phát âm ${r.pinyin}`}>
                        <Volume2 size={14} />
                      </button>
                      {showMeaning && <span className="st-o-mean">{m}</span>}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
