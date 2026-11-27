import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, X, Volume2, History } from 'lucide-react'
import type { BundleCharacter, RadicalFamily, Word } from '../core'
import { RADICAL_CHARACTERS } from '../core'
import { speakChinese } from '../utils/speech'
import { filterAndSortCharacters, filterAndSortWords } from '../utils/search'
import { charsByHanViet } from '../utils/homophones'
import { useModalA11y } from '../utils/useModalA11y'
import { CharRowBody, TonePinyin, highlight } from './CharRowBody'

interface SearchModalProps {
  characters: readonly BundleCharacter[]
  words: readonly Word[]
  onSelectHanzi: (hanzi: string) => void
  onClose: () => void
  families?: readonly RadicalFamily[]
  onBrowseRadical?: (form: string) => void
  /** Recently viewed characters (most recent first); shown when the query is empty. */
  recent?: readonly string[]
  /** When given, picking a word result calls this instead of opening its first character. */
  onSelectWord?: (word: string) => void
}

// What a beginner can type, each with a tappable example.
const SEARCH_EXAMPLES: { label: string; example: string }[] = [
  { label: 'Chữ Hán', example: '好' },
  { label: 'Âm Hán Việt (có dấu hay không đều được)', example: 'hao' },
  { label: 'Pinyin (không cần dấu thanh)', example: 'xiexie' },
  { label: 'Nghĩa tiếng Việt', example: 'nước' },
  { label: 'Tên bộ thủ', example: 'bộ nữ' },
]

export function SearchModal({
  characters,
  words,
  onSelectHanzi,
  onClose,
  families = [],
  onBrowseRadical,
  recent = [],
  onSelectWord,
}: SearchModalProps) {
  const dialogRef = useModalA11y<HTMLDivElement>(onClose)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'chars' | 'words'>('chars')
  const [cursor, setCursor] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // Merge HSK characters with standalone radicals so searching "mịch", "trảo", "氵" also works
  const searchableCharacters = useMemo(() => {
    const seen = new Set(characters.map((c) => c.hanzi))
    const uniqueRadicals = RADICAL_CHARACTERS.filter((r) => !seen.has(r.hanzi))
    return [...characters, ...uniqueRadicals]
  }, [characters])

  const filteredChars = useMemo(
    () => (query.trim() ? filterAndSortCharacters(searchableCharacters, query) : []),
    [searchableCharacters, query],
  )

  const matchedFamilies = useMemo(() => {
    if (!query.trim() || families.length === 0) return []
    const q = query.trim().toLowerCase()
    return families.filter((f) => {
      if (f.forms.some((form) => form.includes(query.trim()))) return true
      if (f.display.includes(query.trim())) return true
      if (f.info.hanViet && f.info.hanViet.toLowerCase().includes(q)) return true
      if (f.info.nameVi && f.info.nameVi.toLowerCase().includes(q)) return true
      if (f.info.meaningVi && f.info.meaningVi.toLowerCase().includes(q)) return true
      return false
    })
  }, [families, query])

  const filteredWords = useMemo(
    () => (query.trim() ? filterAndSortWords(words, query) : []),
    [words, query],
  )

  // Tự động chuyển sang tab có kết quả khi tìm kiếm (ví dụ gõ từ ghép "你好" sẽ tự chuyển sang tab Từ ghép)
  useEffect(() => {
    if (filteredChars.length === 0 && filteredWords.length > 0 && tab === 'chars') {
      setTab('words')
    } else if (filteredWords.length === 0 && filteredChars.length > 0 && tab === 'words') {
      setTab('chars')
    }
  }, [filteredChars.length, filteredWords.length, tab])

  const shownChars = filteredChars.slice(0, 60)
  const shownWords = filteredWords.slice(0, 60)
  const recentChars = useMemo(() => {
    const byHanzi = new Map(searchableCharacters.map((c) => [c.hanzi, c]))
    return recent.map((h) => byHanzi.get(h)).filter((c): c is BundleCharacter => Boolean(c)).slice(0, 8)
  }, [recent, searchableCharacters])
  const hasQuery = query.trim().length > 0
  // A bare Hán Việt syllable ("an", "hảo"): show every same-reading character at a glance.
  const homophones = useMemo(() => charsByHanViet(characters, query), [characters, query])
  const rowCount = !hasQuery ? 0 : tab === 'chars' ? shownChars.length : shownWords.length

  useEffect(() => setCursor(0), [query, tab])

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [cursor, query, tab])

  const pickChar = (hanzi: string) => {
    onSelectHanzi(hanzi)
    onClose()
  }
  const pickWord = (w: Word) => {
    if (onSelectWord) {
      onSelectWord(w.word)
      onClose()
      return
    }
    const first = Array.from(w.word)[0]
    if (first) onSelectHanzi(first)
    onClose()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown' && rowCount > 0) {
      e.preventDefault()
      setCursor((c) => Math.min(rowCount - 1, c + 1))
    } else if (e.key === 'ArrowUp' && rowCount > 0) {
      e.preventDefault()
      setCursor((c) => Math.max(0, c - 1))
    } else if (e.key === 'Enter' && rowCount > 0) {
      e.preventDefault()
      if (tab === 'chars') pickChar(shownChars[cursor].hanzi)
      else pickWord(shownWords[cursor])
    } else if (e.key === 'Tab' && query.trim() && filteredChars.length > 0 && filteredWords.length > 0) {
      e.preventDefault()
      setTab((t) => (t === 'chars' ? 'words' : 'chars'))
    }
  }

  const levelTag = (l: number | null | undefined) => (l ? `HSK ${l}` : null)

  return (
    <div
      className="pm-backdrop sm-backdrop"
      onClick={onClose}
      onKeyDown={onKeyDown}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Tra cứu chữ Hán và từ ghép"
    >
      <div
        ref={dialogRef}
        className="pm-dialog sm-dialog"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div className="sm-head">
          <Search size={20} className="sm-search-icon" aria-hidden />
          <input
            id="global-hanzi-search"
            name="global-hanzi-search"
            type="text"
            className="sm-input"
            placeholder="Tìm chữ, pinyin, Hán Việt, nghĩa…"
            aria-label="Tra cứu chữ Hán, pinyin, Hán Việt hoặc nghĩa tiếng Việt"
            role="combobox"
            aria-expanded={rowCount > 0}
            aria-controls="sm-listbox"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button type="button" className="pm-icon-btn sm-clear" tabIndex={-1} onClick={() => setQuery('')} aria-label="Xóa nội dung" title="Xóa">
              <X size={16} />
            </button>
          )}
          <kbd className="sm-esc">Esc</kbd>
          <button type="button" className="pm-icon-btn sm-close" onClick={onClose} aria-label="Đóng" title="Đóng (Esc)">
            <X size={18} />
          </button>
        </div>

        {hasQuery && (
          <div className="sm-tabs">
            <div className="sm-tablist" role="tablist">
              <button type="button" role="tab" tabIndex={-1} aria-selected={tab === 'chars'} className={`sm-tab ${tab === 'chars' ? 'active' : ''}`} onClick={() => setTab('chars')}>
                Chữ <span className="sm-tab-n">{filteredChars.length}</span>
              </button>
              <button type="button" role="tab" tabIndex={-1} aria-selected={tab === 'words'} className={`sm-tab ${tab === 'words' ? 'active' : ''}`} onClick={() => setTab('words')}>
                Từ ghép <span className="sm-tab-n">{filteredWords.length}</span>
              </button>
            </div>
            {tab === 'chars' && matchedFamilies.length > 0 && onBrowseRadical && (
              <div className="sm-radicals">
                <span className="label">Bộ thủ</span>
                {matchedFamilies.slice(0, 3).map((f) => (
                  <button key={f.key} type="button" tabIndex={-1} className="sm-chip" onClick={() => onBrowseRadical(f.key)} title={`Xem ${f.count} chữ`}>
                    <span lang="zh">{f.display}</span> {f.info.nameVi ?? f.info.hanViet}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {hasQuery && tab === 'chars' && homophones.length > 1 && (
          <div className="sm-homophone">
            <span>
              Đồng âm: <strong>{query.trim().toUpperCase()}</strong> ({homophones.length})
            </span>
            <span className="sm-homophone-glyphs">
              {homophones.slice(0, 40).map((c) => (
                <button key={c.hanzi} type="button" tabIndex={-1} lang="zh" onClick={() => pickChar(c.hanzi)} title={c.readings.map((r) => r.hanViet).filter(Boolean).join(', ') + ' — ' + (c.readings[0]?.meaningVi ?? '')}>
                  {c.hanzi}
                </button>
              ))}
            </span>
          </div>
        )}
        <div className="sm-results" ref={listRef} role="listbox" id="sm-listbox">
          {!hasQuery ? (
            <div className="sm-start">
              {recentChars.length > 0 && (
                <section>
                  <h3 className="label sm-start-title"><History size={12} aria-hidden /> Gần đây</h3>
                  <div className="sm-recent">
                    {recentChars.map((c) => (
                      <button key={c.hanzi} type="button" tabIndex={-1} className="sm-recent-cell" onClick={() => pickChar(c.hanzi)} title={c.readings[0]?.meaningVi}>
                        <span lang="zh">{c.hanzi}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <section>
                <h3 className="label sm-start-title">Bạn có thể gõ</h3>
                <ul className="sm-tips">
                  {SEARCH_EXAMPLES.map(({ label, example }) => (
                    <li key={example}>
                      <button type="button" tabIndex={-1} className="sm-example" onClick={() => setQuery(example)}>{example}</button>
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ) : tab === 'chars' ? (
            shownChars.length === 0 ? (
              <div className="sm-empty">
                <p className="sm-empty-title">Không có chữ nào khớp “{query.trim()}”</p>
                <p>Thử pinyin không dấu (“hao”), âm Hán Việt (“hảo”) hoặc nghĩa (“tốt”).</p>
              </div>
            ) : (
              shownChars.map((c, i) => {
                const active = i === cursor
                const tag = levelTag(c.hsk3Level)
                return (
                  <button
                    type="button"
                    key={c.hanzi}
                    role="option"
                    aria-selected={active}
                    data-active={active}
                    tabIndex={-1}
                    className={`sm-row ${active ? 'active' : ''}`}
                    onMouseMove={() => active || setCursor(i)}
                    onClick={() => pickChar(c.hanzi)}
                  >
                    <CharRowBody c={c} query={query} />
                    <span className="pm-tag sm-tag">{tag ?? 'Bộ'}</span>
                  </button>
                )
              })
            )
          ) : shownWords.length === 0 ? (
            <div className="sm-empty">
              <p className="sm-empty-title">Không có từ ghép nào khớp “{query.trim()}”</p>
              <p>Thử gõ cả từ (“你好”), pinyin liền (“nihao”), âm Hán Việt (“nhĩ hảo”) hoặc nghĩa (“xin chào”). Nếu từ chưa có trong dữ liệu, hãy tra từng chữ ở tab “Chữ”.</p>
            </div>
          ) : (
            shownWords.map((w, i) => {
              const active = i === cursor
              const tag = levelTag(w.hsk3Level)
              return (
                <div
                  key={w.id}
                  role="option"
                  aria-selected={active}
                  data-active={active}
                  className={`sm-row sm-row-word ${active ? 'active' : ''}`}
                  onMouseMove={() => active || setCursor(i)}
                  onClick={() => pickWord(w)}
                >
                  <span className={`sm-glyph ${Array.from(w.word).length > 2 ? 'sm-glyph-long' : ''}`} lang="zh">{w.word}</span>
                  <span className="sm-py-col"><TonePinyin pinyin={w.pinyin} /></span>
                  <span className="sm-hv" title={w.hanViet ?? undefined}>{w.hanViet ? highlight(w.hanViet.toUpperCase(), query) : ''}</span>
                  <span className="sm-mean" title={w.meaningVi}>{highlight(w.meaningVi, query)}</span>
                  <span className="sm-end">
                    {tag && <span className="pm-tag sm-tag">{tag}</span>}
                    <button
                      type="button"
                      className="pm-icon-btn sm-speak"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.stopPropagation()
                        speakChinese(w.word)
                      }}
                      title="Phát âm"
                      aria-label={`Phát âm ${w.word}`}
                    >
                      <Volume2 size={14} />
                    </button>
                  </span>
                </div>
              )
            })
          )}
        </div>
        <div className="sm-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> chọn</span>
          <span><kbd>Enter</kbd> mở</span>
          {hasQuery && <span><kbd>Tab</kbd> đổi loại</span>}
          <span><kbd>Esc</kbd> đóng</span>
        </div>
      </div>
    </div>
  )
}
