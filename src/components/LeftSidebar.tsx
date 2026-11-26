import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Search,
  Star,
  BookOpen,
  Layers,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowUpDown,
  LayoutGrid,
  ScrollText,
} from 'lucide-react'
import { useFitCount } from '../utils/useFitCount'
import type { BundleCharacter, LevelFilter, RadicalFamily } from '../core'
import { searchCharacters, searchRadicals } from '../core'

interface LeftSidebarProps {
  characters: BundleCharacter[]
  activeHanzi: string | null
  onSelectHanzi: (hanzi: string) => void
  selectedLevel: LevelFilter
  onLevelChange: (lvl: LevelFilter) => void
  favorites: string[]
  isOpenMobile?: boolean
  onCloseMobile?: () => void
  families?: readonly RadicalFamily[]
  activeFamily?: RadicalFamily | null
  radicalCharacters?: readonly BundleCharacter[] | null
  onBrowseRadical?: (form: string | null) => void
  onGridChange?: (cols: number, perPage: number) => void
}

const familyName = (f: RadicalFamily) => f.info.nameVi ?? `Bộ ${f.info.hanViet ?? f.key}`

const TILE_W = 52
const TILE_H = 58
const TILE_GAP = 6

export type SortOrder = 'default' | 'strokeAsc' | 'strokeDesc' | 'pinyinAsc'

export function LeftSidebar({
  characters,
  activeHanzi,
  onSelectHanzi,
  selectedLevel,
  onLevelChange,
  favorites,
  isOpenMobile = false,
  onCloseMobile,
  families = [],
  activeFamily = null,
  radicalCharacters = null,
  onBrowseRadical,
  onGridChange,
}: LeftSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'favorites'>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('default')
  const [viewStyle, setViewStyle] = useState<'paged' | 'scroll'>('paged')

  // The radicals tab without a chosen radical lists radical families instead of characters.
  const listingRadicals = selectedLevel === 'radicals' && !activeFamily
  const matchedFamilies = useMemo(() => searchRadicals(families, searchQuery), [families, searchQuery])
  const familyList = useMemo(
    () => (searchQuery.trim() ? matchedFamilies : families),
    [families, matchedFamilies, searchQuery],
  )

  // Filter & Sort list
  const filteredList = useMemo(() => {
    let list: BundleCharacter[] =
      selectedLevel === 'radicals'
        ? (radicalCharacters ? [...radicalCharacters] : [])
        : characters.filter((c) => c.hsk3Level === selectedLevel)

    if (filterMode === 'favorites') {
      list = list.filter((c) => favorites.includes(c.hanzi))
    }
    if (searchQuery.trim()) {
      list = searchCharacters(list, searchQuery) as BundleCharacter[]
    }

    // Apply sorting
    if (sortOrder === 'strokeAsc') {
      list = [...list].sort((a, b) => (a.strokeCount ?? 99) - (b.strokeCount ?? 99))
    } else if (sortOrder === 'strokeDesc') {
      list = [...list].sort((a, b) => (b.strokeCount ?? 0) - (a.strokeCount ?? 0))
    } else if (sortOrder === 'pinyinAsc') {
      list = [...list].sort((a, b) => {
        const pyA = a.readings[0]?.pinyin ?? ''
        const pyB = b.readings[0]?.pinyin ?? ''
        return pyA.localeCompare(pyB)
      })
    }

    return list
  }, [characters, radicalCharacters, filterMode, favorites, selectedLevel, searchQuery, sortOrder])

  const itemCount = listingRadicals ? familyList.length : filteredList.length

  // Fit as many fixed-size tiles as the available area allows, then paginate
  const [gridRef, fit] = useFitCount<HTMLDivElement>(TILE_W, TILE_H, TILE_GAP)
  const perPage = Math.max(1, fit.cols * fit.rows)
  useEffect(() => {
    if (fit.cols > 0) onGridChange?.(fit.cols, perPage)
  }, [fit.cols, perPage, onGridChange])
  const pageCount = Math.max(1, Math.ceil(itemCount / perPage))
  const [page, setPage] = useState(0)
  const safePage = Math.min(page, pageCount - 1)

  // Jump to the page containing the active character when list / size / selection changes
  useEffect(() => {
    if (viewStyle === 'paged') {
      const idx = activeHanzi ? filteredList.findIndex((c) => c.hanzi === activeHanzi) : -1
      setPage(idx >= 0 ? Math.floor(idx / perPage) : 0)
    }
  }, [filteredList, perPage, activeHanzi, viewStyle])

  const pageItems = useMemo(() => {
    if (viewStyle === 'scroll') return filteredList
    return filteredList.slice(safePage * perPage, safePage * perPage + perPage)
  }, [filteredList, safePage, perPage, viewStyle])

  const pageFamilies = useMemo(() => {
    if (viewStyle === 'scroll') return familyList
    return familyList.slice(safePage * perPage, safePage * perPage + perPage)
  }, [familyList, safePage, perPage, viewStyle])

  useEffect(() => setPage(0), [listingRadicals, activeFamily, searchQuery, sortOrder])

  // Mouse wheel pagination support
  const handleWheel = (e: React.WheelEvent) => {
    if (viewStyle === 'scroll' || pageCount <= 1) return
    if (e.deltaY > 20) {
      setPage((p) => Math.min(pageCount - 1, p + 1))
    } else if (e.deltaY < -20) {
      setPage((p) => Math.max(0, p - 1))
    }
  }

  // Scroll to selected element in scroll mode
  const activeTileRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (viewStyle === 'scroll' && activeTileRef.current) {
      activeTileRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [activeHanzi, viewStyle])

  return (
    <aside className={`studio-sidebar-left ${isOpenMobile ? 'mobile-open' : ''}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <div className="sidebar-heading">
            <BookOpen size={18} className="sidebar-heading-icon" />
            <span>{listingRadicals ? 'Bộ thủ' : 'Kho Hán Tự'}</span>
            <span className="count-badge">{itemCount}</span>
          </div>

          <div className="sidebar-header-right-tools">
            {/* Toggle View: Phân trang vs Cuộn liên tục */}
            <button
              type="button"
              className={`view-toggle-btn ${viewStyle === 'scroll' ? 'active' : ''}`}
              onClick={() => setViewStyle((v) => (v === 'paged' ? 'scroll' : 'paged'))}
              title={viewStyle === 'paged' ? 'Chuyển sang chế độ cuộn tự do' : 'Chuyển sang chế độ phân trang'}
            >
              {viewStyle === 'paged' ? <ScrollText size={14} /> : <LayoutGrid size={14} />}
              <span>{viewStyle === 'paged' ? 'Cuộn' : 'Trang'}</span>
            </button>

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
        </div>

        {/* Search input */}
        <div className="sidebar-search-box">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="sidebar-search-input"
            placeholder={listingRadicals ? 'Tìm bộ: thủy, nước, 氵…' : 'Gõ 好, hảo, hao, tốt, bộ nữ…'}
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

        {/* Filter mode & Sort row */}
        <div className="sidebar-mode-tabs">
          <div className="sidebar-tab-pills">
            <button
              type="button"
              className={`mode-tab ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              <Layers size={13} />
              <span>Tất cả</span>
            </button>
            <button
              type="button"
              className={`mode-tab ${filterMode === 'favorites' ? 'active' : ''}`}
              onClick={() => setFilterMode('favorites')}
            >
              <Star size={13} fill={filterMode === 'favorites' ? 'currentColor' : 'none'} />
              <span>Sổ tay ({favorites.length})</span>
            </button>
          </div>

          {/* Sort selector dropdown */}
          {!listingRadicals && (
            <div className="sidebar-sort-control">
              <ArrowUpDown size={12} className="sort-icon" />
              <select
                className="sidebar-sort-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                title="Sắp xếp danh sách Hán tự"
                aria-label="Sắp xếp Hán tự"
              >
                <option value="default">Mặc định (HSK)</option>
                <option value="strokeAsc">Số nét: Ít ➔ Nhiều</option>
                <option value="strokeDesc">Số nét: Nhiều ➔ Ít</option>
                <option value="pinyinAsc">Pinyin: A ➔ Z</option>
              </select>
            </div>
          )}
        </div>

        {/* HSK Level Filter Row */}
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

        {listingRadicals && !searchQuery.trim() && (
          <details className="radical-intro">
            <summary>Bộ thủ là gì? Học thế nào?</summary>
            <p>
              Chữ Hán được ghép từ những <strong>mảnh nhỏ</strong>. <strong>Bộ thủ</strong> là mảnh mang nghĩa chung:
              chữ có bộ <span lang="zh">氵</span> (thủy, nước) thường liên quan đến nước —{' '}
              <span lang="zh">河</span> sông, <span lang="zh">海</span> biển, <span lang="zh">洗</span> rửa.
            </p>
            <p>
              Bấm một bộ để xem <strong>mọi chữ có chứa nó</strong>. Bộ ở trên cùng gặp nhiều nhất: thuộc khoảng
              20 bộ đầu là đã đoán được nghĩa của rất nhiều chữ.
            </p>
          </details>
        )}

        {activeFamily && selectedLevel === 'radicals' && (
          <div className="radical-focus-card">
            <button type="button" className="radical-back-btn" onClick={() => onBrowseRadical?.(null)}>
              <ArrowLeft size={14} /> Tất cả bộ thủ
            </button>
            <div className="radical-focus-row">
              <span className="radical-focus-glyph" lang="zh">{activeFamily.display}</span>
              <div className="radical-focus-meta">
                <div className="radical-focus-name">
                  {familyName(activeFamily)}
                  {activeFamily.info.pinyin && <span className="radical-focus-py">{activeFamily.info.pinyin}</span>}
                </div>
                <div className="radical-focus-mean">Nghĩa: {activeFamily.info.meaningVi ?? '—'}</div>
                {activeFamily.forms.length > 1 && (
                  <div className="radical-focus-forms">
                    Các dạng: <span lang="zh">{activeFamily.forms.join('  ')}</span>
                  </div>
                )}
              </div>
            </div>
            <p className="radical-focus-hint">
              {activeFamily.count} chữ có chứa bộ này. Chữ có nó thường mang nghĩa liên quan đến
              "{activeFamily.info.meaningVi ?? activeFamily.info.hanViet}". Bấm từng chữ để xem cách ghép.
            </p>
          </div>
        )}

        {!listingRadicals && searchQuery.trim() && matchedFamilies.length > 0 && (
          <div className="radical-match-row">
            <span className="radical-match-label">Bộ thủ:</span>
            {matchedFamilies.slice(0, 4).map((f) => (
              <button key={f.key} type="button" className="radical-chip" onClick={() => onBrowseRadical?.(f.key)}>
                <span lang="zh">{f.display}</span> {familyName(f)} · {f.count} chữ
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Character Tile Grid */}
      <div
        className={`sidebar-tile-area ${viewStyle === 'scroll' ? 'scroll-mode' : ''}`}
        ref={gridRef}
        onWheel={handleWheel}
      >
        {itemCount === 0 ? (
          <div className="sidebar-empty-state">
            <p>{listingRadicals ? 'Không có bộ thủ nào phù hợp.' : 'Không có chữ nào phù hợp.'}</p>
          </div>
        ) : listingRadicals ? (
          <div
            className="sidebar-tile-grid"
            role="list"
            style={{ gridTemplateColumns: `repeat(${fit.cols || 5}, 1fr)` }}
          >
            {pageFamilies.map((f) => (
              <button
                type="button"
                key={f.key}
                role="listitem"
                className="sidebar-char-tile radical-family-tile"
                title={`${familyName(f)} · ${f.info.meaningVi ?? ''} · ${f.count} chữ`}
                onClick={() => onBrowseRadical?.(f.key)}
              >
                <span className="tile-count">{f.count}</span>
                <span className="tile-glyph" lang="zh">{f.display}</span>
                <span className="tile-hv">{f.info.hanViet ?? '—'}</span>
              </button>
            ))}
          </div>
        ) : (
          <div
            className="sidebar-tile-grid"
            role="list"
            style={{ gridTemplateColumns: `repeat(${fit.cols || 5}, 1fr)` }}
          >
            {pageItems.map((item) => {
              const isSelected = item.hanzi === activeHanzi
              const isFav = favorites.includes(item.hanzi)
              const primary = item.readings[0]
              return (
                <button
                  type="button"
                  key={item.hanzi}
                  ref={isSelected ? activeTileRef : undefined}
                  role="listitem"
                  className={`sidebar-char-tile ${isSelected ? 'selected' : ''}`}
                  title={`${primary?.pinyin ?? ''} · ${primary?.meaningVi ?? ''} (${item.strokeCount ? `${item.strokeCount} nét` : ''})`}
                  onClick={() => {
                    onSelectHanzi(item.hanzi)
                    if (onCloseMobile) onCloseMobile()
                  }}
                >
                  {isFav && <Star size={9} className="tile-fav-star" fill="currentColor" />}
                  <span className="tile-glyph" lang="zh">{item.hanzi}</span>
                  <span className="tile-hv">{primary?.hanViet ?? '—'}</span>
                  {sortOrder.startsWith('stroke') && item.strokeCount && (
                    <span className="tile-sub-badge">{item.strokeCount}n</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {viewStyle === 'paged' && pageCount > 1 && (
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
