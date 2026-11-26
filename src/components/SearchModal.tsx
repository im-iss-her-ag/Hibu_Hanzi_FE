import { useState, useMemo, useEffect } from 'react'
import { Search, X, Volume2 } from 'lucide-react'
import type { BundleCharacter, RadicalFamily, Word } from '../core'
import { RADICAL_CHARACTERS } from '../core'
import { speakChinese } from '../utils/speech'
import { filterAndSortCharacters, filterAndSortWords } from '../utils/search'

interface SearchModalProps {
  characters: readonly BundleCharacter[]
  words: readonly Word[]
  onSelectHanzi: (hanzi: string) => void
  onClose: () => void
  families?: readonly RadicalFamily[]
  onBrowseRadical?: (form: string) => void
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
}: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'chars' | 'words'>('chars')

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

  return (
    <div
      className="modal-backdrop search-modal-backdrop"
      onClick={onClose}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Tra cứu Hán tự và Từ ghép"
    >
      <div
        className="modal-content search-modal-content"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="search-bar-wrap">
          <Search size={18} className="search-icon-inside" />
          <input
            id="global-hanzi-search"
            name="global-hanzi-search"
            type="text"
            className="search-input-field"
            placeholder="Tra chữ Hán, Pinyin (vd: hao), Hán Việt, nghĩa..."
            aria-label="Tra cứu chữ Hán, Pinyin, Hán Việt hoặc nghĩa tiếng Việt"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button
              type="button"
              className="search-clear-pill"
              onClick={() => setQuery('')}
              aria-label="Xóa từ khóa"
            >
              Xóa
            </button>
          )}
          <button type="button" className="icon-btn close-btn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Tabs: Chữ đơn & Từ ghép */}
        <div className="search-filter-row">
          <div className="tab-pill-group">
            <button
              type="button"
              className={`filter-pill ${tab === 'chars' ? 'active' : ''}`}
              onClick={() => setTab('chars')}
            >
              Chữ đơn & Bộ thủ {query.trim() ? `(${filteredChars.length})` : ''}
            </button>
            <button
              type="button"
              className={`filter-pill ${tab === 'words' ? 'active' : ''}`}
              onClick={() => setTab('words')}
            >
              Từ ghép {query.trim() ? `(${filteredWords.length})` : ''}
            </button>
          </div>
        </div>

        {matchedFamilies.length > 0 && onBrowseRadical && (
          <div className="radical-match-row search-radical-row">
            <span className="radical-match-label">Bộ thủ phù hợp:</span>
            {matchedFamilies.slice(0, 6).map((f) => (
              <button key={f.key} type="button" className="radical-chip" onClick={() => onBrowseRadical(f.key)}>
                <span lang="zh">{f.display}</span> {f.info.nameVi ?? f.info.hanViet} · {f.info.meaningVi} · xem {f.count} chữ →
              </button>
            ))}
          </div>
        )}
        {/* Results List */}
        <div className="search-results-box">
          {!query.trim() ? (
            <div className="search-empty-prompt">
              <div className="prompt-icon-circle">
                <Search size={28} />
              </div>
              <h4 className="prompt-title">Chưa biết gì cũng tra được</h4>
              <p className="prompt-desc">
                Gõ bất cứ thứ gì bạn biết về chữ (chữ Hán, Pinyin không dấu/có dấu, Hán Việt, nghĩa hoặc tên bộ). Bấm vào ví dụ để thử:
              </p>
              <ul className="search-example-list">
                {SEARCH_EXAMPLES.map(({ label, example }) => (
                  <li key={example}>
                    <span>{label}</span>
                    <button type="button" className="quick-tag-chip" onClick={() => setQuery(example)}>
                      {example}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : tab === 'chars' ? (
            filteredChars.length === 0 ? (
              <div className="empty-search-state">
                Không tìm thấy chữ Hán nào phù hợp với từ khóa &quot;{query}&quot;.
              </div>
            ) : (
              <div className="char-results-grid">
                {filteredChars.slice(0, 60).map((c) => {
                  const primary = c.readings.find((r) => r.isPrimary) ?? c.readings[0]
                  return (
                    <button
                      type="button"
                      key={c.hanzi}
                      className="char-result-card"
                      onClick={() => {
                        onSelectHanzi(c.hanzi)
                        onClose()
                      }}
                    >
                      <div className="char-badge-small" lang="zh">
                        {c.hanzi}
                      </div>
                      <div className="char-result-info">
                        <div className="pinyin-line">
                          <span className="pinyin">{primary?.pinyin}</span>
                          <span className="hsk-tag">
                            {c.hsk3Level ? `HSK ${c.hsk3Level}` : 'Bộ thủ'}
                          </span>
                        </div>
                        <div className="hanviet-line">
                          {primary?.hanViet ? primary.hanViet.toUpperCase() : '—'}
                        </div>
                        <div className="meaning-line">{primary?.meaningVi}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          ) : filteredWords.length === 0 ? (
            <div className="empty-search-state">
              Không tìm thấy từ ghép nào phù hợp với từ khóa &quot;{query}&quot;.
            </div>
          ) : (
            <div className="word-results-grid">
              {filteredWords.slice(0, 60).map((w) => {
                const chars = Array.from(w.word)
                return (
                  <div
                    key={w.id}
                    className="word-result-card"
                    onClick={() => {
                      const firstChar = chars[0]
                      if (firstChar) onSelectHanzi(firstChar)
                      onClose()
                    }}
                  >
                    <div className="word-glyph-line">
                      <span className="word-text" lang="zh">
                        {w.word}
                      </span>
                      <button
                        type="button"
                        className="word-speak-mini"
                        onClick={(e) => {
                          e.stopPropagation()
                          speakChinese(w.word)
                        }}
                        title="Phát âm"
                        aria-label={`Phát âm ${w.word}`}
                      >
                        <Volume2 size={14} />
                      </button>
                      <span className="word-pinyin">{w.pinyin}</span>
                    </div>
                    <div className="word-info-line">
                      <span className="word-hv">{w.hanViet?.toUpperCase()}</span>
                      <span className="word-mean">{w.meaningVi}</span>
                    </div>
                    {chars.length > 1 && (
                      <div className="word-char-jumps">
                        <span className="word-jump-label">Xem chữ:</span>
                        {chars.map((ch, idx) => (
                          <button
                            key={`${ch}-${idx}`}
                            type="button"
                            className="word-jump-chip"
                            lang="zh"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectHanzi(ch)
                              onClose()
                            }}
                            title={`Mở chữ ${ch}`}
                          >
                            {ch}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
