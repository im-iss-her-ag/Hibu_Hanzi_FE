import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Search,
  Star,
  BookOpen,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowUpDown,
} from 'lucide-react'
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

const SIZES = {
  TILE_W: 52,
  TILE_H: 58,
  TILE_GAP: 6,
}

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
  const [showSortMenu, setShowSortMenu] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)

  // Close sort menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  // Measure grid container dimensions
  const gridContainerRef = useRef<HTMLDivElement>(null)
  const [gridDim, setGridDim] = useState({ cols: 5, rows: 6 })

  useEffect(() => {
    const el = gridContainerRef.current
    if (!el) return

    const updateDim = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      const cols = Math.max(1, Math.floor((w + SIZES.TILE_GAP) / (SIZES.TILE_W + SIZES.TILE_GAP)))
      const rows = Math.max(1, Math.floor((h + SIZES.TILE_GAP) / (SIZES.TILE_H + SIZES.TILE_GAP)))
      setGridDim({ cols, rows })
      onGridChange?.(cols, cols * rows)
    }

    updateDim()
    const observer = new ResizeObserver(updateDim)
    observer.observe(el)
    return () => observer.disconnect()
  }, [onGridChange])

  const perPage = Math.max(1, gridDim.cols * gridDim.rows)
  const pageCount = Math.max(1, Math.ceil(itemCount / perPage))
  const [page, setPage] = useState(0)
  const safePage = Math.min(page, pageCount - 1)

  // Jump to the page containing the active character
  useEffect(() => {
    const idx = activeHanzi ? filteredList.findIndex((c) => c.hanzi === activeHanzi) : -1
    setPage(idx >= 0 ? Math.floor(idx / perPage) : 0)
  }, [filteredList, perPage, activeHanzi])

  const pageItems = useMemo(() => {
    return filteredList.slice(safePage * perPage, safePage * perPage + perPage)
  }, [filteredList, safePage, perPage])

  const pageFamilies = useMemo(() => {
    return familyList.slice(safePage * perPage, safePage * perPage + perPage)
  }, [familyList, safePage, perPage])

  useEffect(() => setPage(0), [listingRadicals, activeFamily, searchQuery, sortOrder])

  // Mouse wheel pagination support
  const handleWheel = (e: React.WheelEvent) => {
    if (pageCount <= 1) return
    if (e.deltaY > 20) {
      setPage((p) => Math.min(pageCount - 1, p + 1))
    } else if (e.deltaY < -20) {
      setPage((p) => Math.max(0, p - 1))
    }
  }

  const sortLabelMap: Record<SortOrder, string> = {
    default: 'Mặc định',
    strokeAsc: 'Nét: Ít → Nhiều',
    strokeDesc: 'Nét: Nhiều → Ít',
    pinyinAsc: 'Pinyin: A → Z',
  }

  return (
    <aside className={`studio-sidebar-left ${isOpenMobile ? 'mobile-open' : ''}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <div className="sidebar-heading">
            <BookOpen size={17} className="sidebar-heading-icon" />
            <span>{listingRadicals ? 'Bộ thủ' : 'Kho Hán Tự'}</span>
            <span className="count-badge">{itemCount}</span>
          </div>

          <div className="sidebar-header-right-tools">
            {/* Sort custom button & menu */}
            {!listingRadicals && (
              <div className="sidebar-sort-wrapper" ref={sortMenuRef}>
                <button
                  type="button"
                  className={`sidebar-sort-btn ${sortOrder !== 'default' ? 'active' : ''}`}
                  onClick={() => setShowSortMenu((v) => !v)}
                  title="Sắp xếp danh sách"
                >
                  <ArrowUpDown size={13} />
                  <span>{sortLabelMap[sortOrder]}</span>
                </button>

                {showSortMenu && (
                  <div className="sidebar-sort-menu">
                    <button
                      type="button"
                      className={`sort-menu-item ${sortOrder === 'default' ? 'selected' : ''}`}
                      onClick={() => {
                        setSortOrder('default')
                        setShowSortMenu(false)
                      }}
                    >
                      Mặc định (HSK)
                    </button>
                    <button
                      type="button"
                      className={`sort-menu-item ${sortOrder === 'strokeAsc' ? 'selected' : ''}`}
                      onClick={() => {
                        setSortOrder('strokeAsc')
                        setShowSortMenu(false)
                      }}
                    >
                      Số nét: Ít ➔ Nhiều
                    </button>
                    <button
                      type="button"
                      className={`sort-menu-item ${sortOrder === 'strokeDesc' ? 'selected' : ''}`}
                      onClick={() => {
                        setSortOrder('strokeDesc')
                        setShowSortMenu(false)
                      }}
                    >
                      Số nét: Nhiều ➔ Ít
                    </button>
                    <button
                      type="button"
                      className={`sort-menu-item ${sortOrder === 'pinyinAsc' ? 'selected' : ''}`}
                      onClick={() => {
                        setSortOrder('pinyinAsc')
                        setShowSortMenu(false)
                      }}
                    >
                      Pinyin: A ➔ Z
                    </button>
                  </div>
                )}
              </div>
            )}

            {onCloseMobile && (
              <button
                type="button"
                className="mobile-close-btn"
                onClick={onCloseMobile}
                aria-label="Đóng danh mục"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Search input with integrated Favorites Toggle */}
        <div className="sidebar-search-box">
          <Search size={14} className="search-icon" />
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
              <X size={13} />
            </button>
          )}

          {/* Quick toggle for Favorites inside search row */}
          <button
            type="button"
            className={`sidebar-fav-pill ${filterMode === 'favorites' ? 'active' : ''}`}
            onClick={() => setFilterMode((m) => (m === 'all' ? 'favorites' : 'all'))}
            title={filterMode === 'favorites' ? 'Xem tất cả chữ' : 'Chỉ xem chữ trong sổ tay'}
          >
            <Star size={12} fill={filterMode === 'favorites' ? 'currentColor' : 'none'} />
            <span>{favorites.length}</span>
          </button>
        </div>

        {/* HSK Level Filter Row */}
        <div className="sidebar-filter-cluster">
          <span className="hsk-standard-badge" title="Chuẩn HSK 3.0 (2021)">
            HSK
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
              Bấm một bộ để xem <strong>mọi chữ có chứa nó</strong>. Bộ ở trên cùng gặp nhiều nhất.
            </p>
          </details>
        )}

        {activeFamily && selectedLevel === 'radicals' && (
          <div className="radical-focus-card">
            <button type="button" className="radical-back-btn" onClick={() => onBrowseRadical?.(null)}>
              <ArrowLeft size={13} /> Tất cả bộ thủ
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
              {activeFamily.count} chữ có chứa bộ này. Bấm từng chữ để xem cách ghép.
            </p>
          </div>
        )}

        {!listingRadicals && searchQuery.trim() && matchedFamilies.length > 0 && (
          <div className="radical-match-row">
            <span className="radical-match-label">Bộ thủ:</span>
            {matchedFamilies.slice(0, 3).map((f) => (
              <button key={f.key} type="button" className="radical-chip" onClick={() => onBrowseRadical?.(f.key)}>
                <span lang="zh">{f.display}</span> {familyName(f)} · {f.count}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Character Tile Grid */}
      <div
        className="sidebar-tile-area"
        ref={gridContainerRef}
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
            style={{ gridTemplateColumns: `repeat(${gridDim.cols}, 1fr)` }}
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
            style={{ gridTemplateColumns: `repeat(${gridDim.cols}, 1fr)` }}
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
