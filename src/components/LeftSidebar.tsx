import { useState, useMemo, useEffect } from 'react'
import { Search, Star, BookOpen, Layers, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useFitCount } from '../utils/useFitCount'
import type { BundleCharacter, LevelFilter } from '../core'
import { RADICAL_CHARACTERS } from '../core'
import { filterAndSortCharacters } from '../utils/search'

interface LeftSidebarProps {
  characters: BundleCharacter[]
  activeHanzi: string | null
  onSelectHanzi: (hanzi: string) => void
  selectedLevel: LevelFilter
  onLevelChange: (lvl: LevelFilter) => void
  favorites: string[]
  isOpenMobile?: boolean
  onCloseMobile?: () => void
  onOpenGlobalSearch?: () => void
}

const TILE_W = 52
const TILE_H = 58
const TILE_GAP = 6

export function LeftSidebar({
  characters,
  activeHanzi,
  onSelectHanzi,
  selectedLevel,
  onLevelChange,
  favorites,
  isOpenMobile = false,
  onCloseMobile,
  onOpenGlobalSearch,
}: LeftSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'favorites'>('all')

  // Filter list (favorites tab shows all saved characters across HSK & Radicals)
  const filteredList = useMemo(() => {
    let list: readonly BundleCharacter[]

    if (filterMode === 'favorites') {
      const seen = new Set(characters.map((c) => c.hanzi))
      const combined = [
        ...characters,
        ...RADICAL_CHARACTERS.filter((r) => !seen.has(r.hanzi)),
      ]
      list = combined.filter((c) => favorites.includes(c.hanzi))
    } else if (selectedLevel === 'radicals') {
      list = RADICAL_CHARACTERS
    } else {
      list = characters.filter((c) => c.hsk3Level === selectedLevel)
    }

    if (searchQuery.trim()) {
      return filterAndSortCharacters(list, searchQuery)
    }

    return list
  }, [characters, filterMode, favorites, selectedLevel, searchQuery])

  // Fit as many fixed-size tiles as the available area allows, then paginate
  const [gridRef, fit] = useFitCount<HTMLDivElement>(TILE_W, TILE_H, TILE_GAP)
  const perPage = Math.max(1, fit.cols * fit.rows)
  const pageCount = Math.max(1, Math.ceil(filteredList.length / perPage))
  const [page, setPage] = useState(0)
  const safePage = Math.min(page, pageCount - 1)

  // Jump to the page containing the active character when list / size / selection changes
  useEffect(() => {
    const idx = activeHanzi ? filteredList.findIndex((c) => c.hanzi === activeHanzi) : -1
    setPage(idx >= 0 ? Math.floor(idx / perPage) : 0)
  }, [filteredList, perPage, activeHanzi])

  const pageItems = filteredList.slice(safePage * perPage, safePage * perPage + perPage)

  const handleWheel = (e: React.WheelEvent) => {
    if (pageCount <= 1) return
    if (e.deltaY > 15) {
      setPage((p) => Math.min(pageCount - 1, p + 1))
    } else if (e.deltaY < -15) {
      setPage((p) => Math.max(0, p - 1))
    }
  }

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
            id="sidebar-hanzi-filter"
            name="sidebar-hanzi-filter"
            type="text"
            className="sidebar-search-input"
            placeholder="Lọc Hán tự, Pinyin (vd: hao)..."
            aria-label="Lọc nhanh chữ Hán trong danh sách"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              title="Xóa tìm kiếm"
              aria-label="Xóa bộ lọc"
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

        {/* HSK Level Filter Row (active in 'all' mode) */}
        {filterMode === 'all' && (
          <div className="sidebar-filter-cluster">
            <span className="hsk-standard-badge" title="Chuẩn HSK 3.0 (2021)">
              HSK 3.0
            </span>
            <div className="hsk-level-pills">
              {[1, 2, 3, 4, 5, 6].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  className={`lvl-pill ${selectedLevel === lvl ? 'active' : ''}`}
                  onClick={() => onLevelChange(lvl as LevelFilter)}
                  title={`HSK 3.0 Cấp ${lvl}`}
                >
                  {lvl}
                </button>
              ))}
              <button
                type="button"
                className={`lvl-pill radical-tab-pill ${selectedLevel === 'radicals' ? 'active' : ''}`}
                onClick={() => onLevelChange('radicals')}
                title="214 Bộ thủ & Thành phần chữ Hán"
              >
                Bộ thủ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Character Tile Grid (paginated to fit, wheel-friendly) */}
      <div className="sidebar-tile-area" ref={gridRef} onWheel={handleWheel}>
        {filteredList.length === 0 ? (
          <div className="sidebar-empty-state">
            <p>
              {filterMode === 'favorites' && favorites.length === 0
                ? 'Bạn chưa lưu chữ nào vào sổ tay.'
                : 'Không có chữ nào phù hợp trong mục này.'}
            </p>
            {searchQuery.trim() && onOpenGlobalSearch && (
              <button
                type="button"
                className="sidebar-global-search-btn"
                onClick={onOpenGlobalSearch}
              >
                Tìm toàn bộ kho (Ctrl+K)
              </button>
            )}
          </div>
        ) : (
          <div
            className="sidebar-tile-grid"
            role="list"
            style={{ gridTemplateColumns: `repeat(${fit.cols}, 1fr)` }}
          >
            {pageItems.map((item) => {
              const isSelected = item.hanzi === activeHanzi
              const isFav = favorites.includes(item.hanzi)
              const primary = item.readings[0]
              return (
                <button
                  type="button"
                  key={item.hanzi}
                  role="listitem"
                  className={`sidebar-char-tile ${isSelected ? 'selected' : ''}`}
                  title={`${primary?.pinyin ?? ''} · ${primary?.meaningVi ?? ''}`}
                  onClick={() => {
                    onSelectHanzi(item.hanzi)
                    if (onCloseMobile) onCloseMobile()
                  }}
                >
                  {isFav && <Star size={9} className="tile-fav-star" fill="currentColor" />}
                  <span className="tile-glyph" lang="zh">{item.hanzi}</span>
                  <span className="tile-hv">{primary?.hanViet ?? '—'}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {pageCount > 1 && (
        <div className="sidebar-pager">
          <button
            type="button"
            className="pager-btn"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            aria-label="Trang trước"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="pager-label">
            {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            className="pager-btn"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={safePage >= pageCount - 1}
            aria-label="Trang sau"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </aside>
  )
}
