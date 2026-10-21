import { useState, useMemo, useEffect } from 'react'
import { Search, X, Volume2 } from 'lucide-react'
import type { BundleCharacter, RadicalFamily, Word } from '../core'
import { matchesWord, searchCharacters, searchRadicals } from '../core'
import { speakChinese } from '../utils/speech'

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

  const filteredChars = useMemo(() => {
    if (!query.trim()) return []
    return searchCharacters(characters, query)
  }, [characters, query])

  const matchedFamilies = useMemo(() => searchRadicals(families, query), [families, query])

  const filteredWords = useMemo(() => {
    if (!query.trim()) return []
    return words.filter((w) => matchesWord(w, query))
  }, [words, query])

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
      className="modal-backdrop"
      onClick={onClose}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
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
            type="text"
            className="search-input-field"
            placeholder="Gõ chữ Hán, Hán Việt, pinyin, nghĩa hoặc tên bộ — không cần dấu"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setQuery('')}
              aria-label="Xóa tìm kiếm"
            >
              <X size={16} />
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
              Chữ đơn {query.trim() ? `(${filteredChars.length})` : ''}
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
                Gõ bất cứ thứ gì bạn biết về chữ. Không cần gõ dấu. Bấm vào ví dụ để thử:
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

                {filteredChars.map((c) => {
                  const primary = c.readings.find((r) => r.isPrimary) ?? c.readings[0]
                  return (
                    <div
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
                          {c.hsk3Level && <span className="hsk-tag">HSK {c.hsk3Level}</span>}
                        </div>
                        <div className="hanviet-line">
                          {primary?.hanViet ? primary.hanViet.toUpperCase() : '—'}
                        </div>
                        <div className="meaning-line">{primary?.meaningVi}</div>
                      </div>
                    </div>
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
              {filteredWords.map((w) => (
                <div
                  key={w.id}
                  className="word-result-card"
                  onClick={() => {
                    const firstChar = Array.from(w.word)[0]
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
                    >
                      <Volume2 size={14} />
                    </button>
                    <span className="word-pinyin">{w.pinyin}</span>
                  </div>
                  <div className="word-info-line">
                    <span className="word-hv">{w.hanViet?.toUpperCase()}</span>
                    <span className="word-mean">{w.meaningVi}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
