import { useState, useMemo } from 'react'
import { Search, X, Volume2 } from 'lucide-react'
import type { BundleCharacter, Word } from '../core'
import { speakChinese } from '../utils/speech'

interface SearchModalProps {
  characters: readonly BundleCharacter[]
  words: readonly Word[]
  onSelectHanzi: (hanzi: string) => void
  onClose: () => void
}

export function SearchModal({
  characters,
  words,
  onSelectHanzi,
  onClose,
}: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [filterLevel, setFilterLevel] = useState<number | null>(null)
  const [tab, setTab] = useState<'chars' | 'words'>('chars')

  const filteredChars = useMemo(() => {
    const q = query.trim().toLowerCase()
    return characters.filter((c) => {
      if (filterLevel !== null && c.hsk2Level !== filterLevel && c.hsk3Level !== filterLevel) {
        return false
      }
      if (!q) return true
      return (
        c.hanzi.includes(q) ||
        (c.traditional && c.traditional.includes(q)) ||
        c.readings.some(
          (r) =>
            r.pinyin.toLowerCase().includes(q) ||
            (r.hanViet && r.hanViet.toLowerCase().includes(q)) ||
            r.meaningVi.toLowerCase().includes(q),
        )
      )
    })
  }, [characters, query, filterLevel])

  const filteredWords = useMemo(() => {
    const q = query.trim().toLowerCase()
    return words.filter((w) => {
      if (filterLevel !== null && w.hsk2Level !== filterLevel && w.hsk3Level !== filterLevel) {
        return false
      }
      if (!q) return true
      return (
        w.word.includes(q) ||
        (w.traditional && w.traditional.includes(q)) ||
        w.pinyin.toLowerCase().includes(q) ||
        (w.hanViet && w.hanViet.toLowerCase().includes(q)) ||
        w.meaningVi.toLowerCase().includes(q)
      )
    })
  }, [words, query, filterLevel])

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content search-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Search Input Bar */}
        <div className="search-bar-wrap">
          <Search size={18} className="search-icon-inside" />
          <input
            type="text"
            className="search-input-field"
            placeholder="Tra chữ Hán, Pinyin, Hán Việt hoặc nghĩa tiếng Việt..."
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

        {/* Level Filters & Tabs */}
        <div className="search-filter-row">
          <div className="tab-pill-group">
            <button
              type="button"
              className={`filter-pill ${tab === 'chars' ? 'active' : ''}`}
              onClick={() => setTab('chars')}
            >
              Chữ đơn ({filteredChars.length})
            </button>
            <button
              type="button"
              className={`filter-pill ${tab === 'words' ? 'active' : ''}`}
              onClick={() => setTab('words')}
            >
              Từ ghép ({filteredWords.length})
            </button>
          </div>

          <div className="level-pill-group">
            <button
              type="button"
              className={`level-pill ${filterLevel === null ? 'active' : ''}`}
              onClick={() => setFilterLevel(null)}
            >
              Tất cả
            </button>
            {[1, 2, 3].map((lvl) => (
              <button
                key={lvl}
                type="button"
                className={`level-pill ${filterLevel === lvl ? 'active' : ''}`}
                onClick={() => setFilterLevel(filterLevel === lvl ? null : lvl)}
              >
                HSK {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <div className="search-results-box">
          {tab === 'chars' ? (
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
                          {c.hsk2Level && <span className="hsk-tag">HSK {c.hsk2Level}</span>}
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
