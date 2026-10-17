import { useState, useMemo } from 'react'
import { Search, Star, BookOpen, Layers, X } from 'lucide-react'
import type { BundleCharacter, HskLevel, HskStandard } from '../core'

interface LeftSidebarProps {
  characters: BundleCharacter[]
  activeHanzi: string | null
  onSelectHanzi: (hanzi: string) => void
  standard: HskStandard
  onStandardChange: (std: HskStandard) => void
  selectedLevel: HskLevel | null
  onLevelChange: (lvl: HskLevel | null) => void
  favorites: string[]
  isOpenMobile?: boolean
  onCloseMobile?: () => void
}

export function LeftSidebar({
  characters,
  activeHanzi,
  onSelectHanzi,
  standard,
  onStandardChange,
  selectedLevel,
  onLevelChange,
  favorites,
  isOpenMobile = false,
  onCloseMobile,
}: LeftSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'favorites'>('all')

  // Filter list
  const filteredList = useMemo(() => {
    let list = characters

    // Filter by favorites tab
    if (filterMode === 'favorites') {
      list = list.filter((c) => favorites.includes(c.hanzi))
    }

    // Filter by HSK Level
    if (selectedLevel !== null) {
      list = list.filter((c) => {
        const lvl = standard === '2.0' ? c.hsk2Level : c.hsk3Level
        return lvl === selectedLevel
      })
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter((c) => {
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
    }

    return list
  }, [characters, filterMode, favorites, selectedLevel, standard, searchQuery])

  return (
    <aside className={`studio-sidebar-left ${isOpenMobile ? 'mobile-open' : ''}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <div className="sidebar-heading">
            <BookOpen size={18} className="sidebar-heading-icon" />
            <span>Kho Hán Tự</span>
            <span className="count-badge">{filteredList.length}</span>
          </div>
          {onCloseMobile && (
            <button
              type="button"
              className="mobile-close-btn"
              onClick={onCloseMobile}
              aria-label="Đóng danh mục"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Search input */}
        <div className="sidebar-search-box">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Tra Hán tự, Hán Việt, Pinyin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              title="Xóa tìm kiếm"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* View mode toggle: Tất cả vs Sổ tay đã lưu */}
        <div className="sidebar-mode-tabs">
          <button
            type="button"
            className={`mode-tab-btn ${filterMode === 'all' ? 'active' : ''}`}
            onClick={() => setFilterMode('all')}
          >
            <Layers size={14} />
            <span>Tất cả</span>
          </button>
          <button
            type="button"
            className={`mode-tab-btn ${filterMode === 'favorites' ? 'active' : ''}`}
            onClick={() => setFilterMode('favorites')}
          >
            <Star size={14} />
            <span>Sổ tay ({favorites.length})</span>
          </button>
        </div>

        {/* HSK Level Filter Row */}
        <div className="sidebar-filter-cluster">
          <button
            type="button"
            className="hsk-standard-badge"
            onClick={() => onStandardChange(standard === '2.0' ? '3.0' : '2.0')}
            title="Đổi giữa HSK 2.0 và HSK 3.0"
          >
            HSK {standard}
          </button>
          <div className="hsk-level-pills">
            {[1, 2, 3, 4, 5, 6].map((lvl) => (
              <button
                key={lvl}
                type="button"
                className={`lvl-pill ${selectedLevel === lvl ? 'active' : ''}`}
                onClick={() => onLevelChange(selectedLevel === lvl ? null : (lvl as HskLevel))}
                title={`HSK Cấp ${lvl} (Bấm lại để xem tất cả)`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Character List Items */}
      <div className="sidebar-item-list" role="list">
        {filteredList.length === 0 ? (
          <div className="sidebar-empty-state">
            <p>Không có chữ nào phù hợp.</p>
          </div>
        ) : (
          filteredList.map((item) => {
            const isSelected = item.hanzi === activeHanzi
            const isFav = favorites.includes(item.hanzi)
            const primary = item.readings[0]

            return (
              <div
                key={item.hanzi}
                role="listitem"
                className={`sidebar-char-card ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onSelectHanzi(item.hanzi)
                  if (onCloseMobile) onCloseMobile()
                }}
              >
                {/* Hanzi Glyph Box */}
                <div className="char-card-glyph" lang="zh">
                  {item.hanzi}
                </div>

                {/* Information hierarchy - Structured, NO lazy dots */}
                <div className="char-card-info">
                  <div className="char-card-top">
                    {/* Prestigious Vermilion Seal Tag for Han Viet */}
                    <span className="seal-mini-tag">
                      {primary?.hanViet ? primary.hanViet.toUpperCase() : '—'}
                    </span>
                    <span className="pinyin-tag">{primary?.pinyin}</span>
                  </div>
                  <div className="char-card-mean">{primary?.meaningVi}</div>
                </div>

                {/* Right badges */}
                <div className="char-card-badges">
                  {isFav && <Star size={13} className="fav-star-icon" fill="currentColor" />}
                  <span className="lvl-mini-badge">
                    {item.hsk2Level ? `H${item.hsk2Level}` : ''}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}
