import { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react'
import { Search, X, ArrowLeft, ArrowUpDown, Star, Check, Eraser } from 'lucide-react'
import type { BundleCharacter, LevelFilter, RadicalFamily } from '../core'
import { searchCharacters, searchRadicals } from '../core'
import { orderRadicalFamilies } from '../utils/radicalOrder'
import { isKnown, useLearnData } from '../learn/srs'
import { KnownBulkBar } from './KnownBulkBar'

interface LeftSidebarProps {
  characters: BundleCharacter[]
  activeHanzi: string | null
  onSelectHanzi: (hanzi: string) => void
  selectedLevel: LevelFilter
  onLevelChange: (lvl: LevelFilter) => void
  favorites: string[]
  /** Legacy: the container (rail / drawer / bottom sheet) is owned by the shell now. */
  isOpenMobile?: boolean
  /** Called after a character is picked so a drawer / sheet container can close itself. */
  onCloseMobile?: () => void
  families?: readonly RadicalFamily[]
  activeFamily?: RadicalFamily | null
  radicalCharacters?: readonly BundleCharacter[] | null
  onBrowseRadical?: (form: string | null) => void
  onGridChange?: (cols: number, perPage: number) => void
  /** The narrowed list (saved / known / text filter / sort) or null when the grid shows the plain pool. */
  onListChange?: (list: BundleCharacter[] | null) => void
}

const familyName = (f: RadicalFamily) => f.info.nameVi ?? `Bộ ${f.info.hanViet ?? f.key}`

/** Minimum cell width in px; columns = floor(width / MIN_CELL), so cells land between 56 and ~68px. */
const MIN_CELL = 56
const LEVELS = [1, 2, 3, 4, 5, 6] as const

type KnownFilter = 'all' | 'unknown' | 'known'
const KNOWN_OPTIONS: { id: KnownFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'unknown', label: 'Chưa thuộc' },
  { id: 'known', label: 'Đã thuộc' },
]

export type SortOrder = 'default' | 'strokeAsc' | 'strokeDesc' | 'pinyinAsc'

const SORT_OPTIONS: { id: SortOrder; label: string }[] = [
  { id: 'default', label: 'Mặc định (thông dụng trước)' },
  { id: 'strokeAsc', label: 'Số nét: ít → nhiều' },
  { id: 'strokeDesc', label: 'Số nét: nhiều → ít' },
  { id: 'pinyinAsc', label: 'Pinyin: A → Z' },
]

export function LeftSidebar({
  characters,
  activeHanzi,
  onSelectHanzi,
  selectedLevel,
  onLevelChange,
  favorites,
  onCloseMobile,
  families = [],
  activeFamily = null,
  radicalCharacters = null,
  onBrowseRadical,
  onGridChange,
  onListChange,
}: LeftSidebarProps) {
  const [query, setQuery] = useState('')
  const [savedOnly, setSavedOnly] = useState(false)
  const [knownFilter, setKnownFilter] = useState<KnownFilter>('all')
  const learn = useLearnData()
  const [sortOrder, setSortOrder] = useState<SortOrder>('default')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  const favSet = useMemo(() => new Set(favorites), [favorites])

  // "Bộ thủ" without a chosen radical lists radical families instead of characters.
  const listingRadicals = selectedLevel === 'radicals' && !activeFamily
  const q = query.trim()
  const matchedFamilies = useMemo(() => searchRadicals(families, query), [families, query])
  const familyList = useMemo(() => (q ? matchedFamilies : families), [families, matchedFamilies, q])

  // Radical families grouped by stroke count, like a printed radical index.
  const familyGroups = useMemo(() => {
    if (q) return [{ key: 'found', title: null as string | null, items: familyList }]
    const groups: { key: string; title: string | null; items: RadicalFamily[] }[] = []
    for (const f of orderRadicalFamilies(familyList)) {
      const n = f.info.strokeCount ?? 0
      const last = groups[groups.length - 1]
      if (last && last.key === String(n)) last.items.push(f)
      else groups.push({ key: String(n), title: n ? `${n} nét` : 'Khác', items: [f] })
    }
    return groups
  }, [familyList, q])

  const filteredList = useMemo(() => {
    let list: BundleCharacter[] =
      selectedLevel === 'radicals'
        ? radicalCharacters
          ? [...radicalCharacters]
          : []
        : characters.filter((c) => c.hsk3Level === selectedLevel)
    if (savedOnly) list = list.filter((c) => favSet.has(c.hanzi))
    if (knownFilter !== 'all') list = list.filter((c) => isKnown(c.hanzi, learn) === (knownFilter === 'known'))
    if (q) list = searchCharacters(list, query) as BundleCharacter[]
    if (sortOrder === 'strokeAsc') list = [...list].sort((a, b) => (a.strokeCount ?? 99) - (b.strokeCount ?? 99))
    else if (sortOrder === 'strokeDesc') list = [...list].sort((a, b) => (b.strokeCount ?? 0) - (a.strokeCount ?? 0))
    else if (sortOrder === 'pinyinAsc')
      list = [...list].sort((a, b) => (a.readings[0]?.pinyin ?? '').localeCompare(b.readings[0]?.pinyin ?? ''))
    return list
  }, [characters, radicalCharacters, savedOnly, favSet, knownFilter, learn, selectedLevel, q, query, sortOrder])

  const levelHanzi = useMemo(
    () => (typeof selectedLevel === 'number' ? characters.filter((c) => c.hsk3Level === selectedLevel).map((c) => c.hanzi) : []),
    [characters, selectedLevel],
  )
  const levelKnown = levelHanzi.filter((h) => isKnown(h, learn)).length

  // Prev / next / random / ↑↓ follow what the grid shows, not the whole level.
  const narrowed = !listingRadicals && (savedOnly || knownFilter !== 'all' || !!q || sortOrder !== 'default')
  useEffect(() => {
    onListChange?.(narrowed ? filteredList : null)
  }, [onListChange, narrowed, filteredList])
  useEffect(() => () => onListChange?.(null), [onListChange])

  const itemCount = listingRadicals ? familyList.length : filteredList.length
  const countLabel = listingRadicals ? `${itemCount} bộ (gộp biến thể)` : `${itemCount} chữ`

  // Measure the scroller so the grid uses whole columns; the app maps ↑/↓ to one row and PgUp/PgDn to one screen.
  const scrollRef = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(5)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      const c = Math.max(2, Math.floor(w / MIN_CELL))
      const cell = w / c
      const rows = Math.max(1, Math.floor(el.clientHeight / cell))
      setCols((prev) => (prev === c ? prev : c))
      onGridChange?.(c, c * rows)
      revealRef.current()
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [onGridChange])

  // Keep the selected cell visible inside the list's own scroller (never scrolls the page).
  const lastListRef = useRef<unknown>(null)
  const revealSelected = () => {
    const box = scrollRef.current
    const el = box?.querySelector<HTMLElement>('.lib-cell.is-selected')
    if (!box || !el) return
    const b = box.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    // Stepping one row past the edge: nudge just enough. A jump (load, random, search): centre it,
    // so the selection never lands half-hidden against the edge.
    const far = r.bottom < b.top - r.height || r.top > b.bottom + r.height
    if (far) box.scrollTop += r.top - b.top - (b.height - r.height) / 2
    else if (r.top < b.top) box.scrollTop += r.top - b.top
    else if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom
  }
  const revealRef = useRef(revealSelected)
  revealRef.current = revealSelected
  useLayoutEffect(() => {
    const box = scrollRef.current
    if (!box) return
    const curList = listingRadicals ? familyList : filteredList
    const listChanged = lastListRef.current !== curList
    lastListRef.current = curList
    if (!box.querySelector('.lib-cell.is-selected')) {
      if (listChanged) box.scrollTop = 0
      return
    }
    revealSelected()
  }, [activeHanzi, filteredList, familyList, listingRadicals, cols])

  const clearFilters = () => {
    setQuery('')
    setSavedOnly(false)
    setKnownFilter('all')
  }
  const gridStyle = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
  const sortActive = sortOrder !== 'default'

  const renderFamilyCell = (f: RadicalFamily) => {
    const selected = activeHanzi !== null && f.forms.includes(activeHanzi)
    return (
    <button
      type="button"
      key={f.key}
      role="listitem"
      aria-current={selected ? 'true' : undefined}
      aria-label={`${f.display} ${familyName(f)}, ${f.count} chữ chứa bộ này`}
      className={`lib-cell ${selected ? 'is-selected' : ''}`}
      title={`${familyName(f)} · ${f.info.meaningVi ?? ''} · ${f.count} chữ chứa bộ này`}
      onClick={() => onBrowseRadical?.(f.key)}
    >
      <span className="lib-glyph" lang="zh">{f.display}</span>
      <span className="lib-hv">{f.info.hanViet ?? '—'}</span>
      <span className="lib-badge" aria-hidden>{f.count}</span>
    </button>
    )
  }

  return (
    <div className="lib">
      <div className="lib-head">
        <div className="lib-levels">
          <span className="label">HSK</span>
          <div className="lib-seg" role="group" aria-label="Cấp độ HSK 3.0">
            {LEVELS.map((lvl) => (
              <button
                key={lvl}
                type="button"
                className={`lib-seg-btn ${selectedLevel === lvl ? 'active' : ''}`}
                onClick={() => onLevelChange(lvl)}
                title={`HSK 3.0 cấp ${lvl}`}
                aria-pressed={selectedLevel === lvl}
              >
                {lvl}
              </button>
            ))}
            <button
              type="button"
              className={`lib-seg-btn lib-seg-wide ${selectedLevel === 'radicals' ? 'active' : ''}`}
              onClick={() => onLevelChange('radicals')}
              title="214 bộ thủ và thành phần chữ Hán"
              aria-pressed={selectedLevel === 'radicals'}
            >
              Bộ thủ
            </button>
          </div>
        </div>

        <div className="lib-filter">
          <Search size={16} className="lib-filter-icon" aria-hidden />
          <input
            type="text"
            className="lib-filter-input"
            placeholder={listingRadicals ? 'Lọc bộ thủ…' : 'Lọc trong cấp này…'}
            aria-label="Lọc danh sách chữ"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button type="button" className="lib-filter-clear" onClick={() => setQuery('')} title="Xóa bộ lọc" aria-label="Xóa bộ lọc">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="lib-bar">
          <span className="lib-count" aria-live="polite">{countLabel}</span>
          {typeof selectedLevel === 'number' && levelHanzi.length > 0 && (
            <span className="kn-progress">{levelKnown}/{levelHanzi.length} đã thuộc</span>
          )}
          {!listingRadicals && (
            <div className="lib-tools">
              <button
                type="button"
                className={`lib-tool ${savedOnly ? 'on' : ''}`}
                onClick={() => setSavedOnly((v) => !v)}
                aria-pressed={savedOnly}
                title={savedOnly ? 'Đang chỉ hiện chữ trong sổ tay' : 'Chỉ hiện chữ trong sổ tay'}
              >
                <Star size={14} fill={savedOnly ? 'currentColor' : 'none'} />
                <span>Sổ tay</span>
              </button>
              <div className="lib-menu-wrap" ref={menuRef}>
                <button
                  ref={menuBtnRef}
                  type="button"
                  className={`lib-tool lib-tool-icon ${sortActive ? 'on' : ''}`}
                  onClick={() => setMenuOpen((v) => !v)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && menuOpen) {
                      e.stopPropagation()
                      setMenuOpen(false)
                    }
                  }}
                  title="Sắp xếp"
                  aria-label="Sắp xếp"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <ArrowUpDown size={14} />
                </button>
                {menuOpen && (
                  <div
                    className="lib-menu"
                    role="menu"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.stopPropagation()
                        setMenuOpen(false)
                        menuBtnRef.current?.focus()
                      }
                    }}
                  >
                    <div className="label lib-menu-label">Sắp xếp</div>
                    {SORT_OPTIONS.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={sortOrder === o.id}
                        className="lib-menu-item"
                        autoFocus={sortOrder === o.id}
                        onClick={() => {
                          setSortOrder(o.id)
                          setMenuOpen(false)
                        }}
                      >
                        <span className="lib-menu-check">{sortOrder === o.id && <Check size={14} />}</span>
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {typeof selectedLevel === 'number' && (
          <>
            <div className="kn-row">
              <div className="lib-seg" role="group" aria-label="Lọc theo đã thuộc">
                {KNOWN_OPTIONS.map((o) => (
                  <button key={o.id} type="button" className={`lib-seg-btn ${knownFilter === o.id ? 'active' : ''}`} aria-pressed={knownFilter === o.id} onClick={() => setKnownFilter(o.id)}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <KnownBulkBar level={selectedLevel} hanzi={levelHanzi} />
          </>
        )}

        {listingRadicals && !q && (
          <details className="lib-note">
            <summary>Bộ thủ là gì? Học thế nào?</summary>
            <p>
              Chữ Hán ghép từ những <strong>mảnh nhỏ</strong>. <strong>Bộ thủ</strong> là mảnh mang nghĩa chung: chữ có bộ{' '}
              <span lang="zh">氵</span> (thủy, nước) thường liên quan đến nước, như <span lang="zh">河</span> sông,{' '}
              <span lang="zh">海</span> biển. Bấm một bộ để xem mọi chữ có chứa nó.
            </p>
          </details>
        )}
        {listingRadicals && !q && (
          <p className="lib-legend" title="Các dạng biến thể (氵 và 水) được gộp chung một ô">Số nhỏ ở góc ô: số chữ chứa bộ đó</p>
        )}

        {activeFamily && selectedLevel === 'radicals' && (
          <div className="lib-focus">
            <button type="button" className="lib-back" onClick={() => onBrowseRadical?.(null)}>
              <ArrowLeft size={14} /> Tất cả bộ thủ
            </button>
            <div className="lib-focus-row">
              <span className="lib-focus-glyph" lang="zh">{activeFamily.display}</span>
              <div className="lib-focus-meta">
                <div className="lib-focus-name">
                  {familyName(activeFamily)}
                  {activeFamily.info.pinyin && <span className="lib-focus-py">{activeFamily.info.pinyin}</span>}
                </div>
                <div className="lib-focus-mean">{activeFamily.info.meaningVi ?? '—'}</div>
              </div>
            </div>
            <p className="lib-focus-hint">
              {activeFamily.count} chữ có bộ này
              {activeFamily.forms.length > 1 && (
                <>
                  {' · dạng: '}
                  <span lang="zh">{activeFamily.forms.join(' ')}</span>
                </>
              )}
            </p>
          </div>
        )}

        {!listingRadicals && q && matchedFamilies.length > 0 && (
          <div className="lib-radmatch">
            <span className="label">Bộ thủ</span>
            {matchedFamilies.slice(0, 3).map((f) => (
              <button key={f.key} type="button" className="lib-chip" onClick={() => onBrowseRadical?.(f.key)}>
                <span lang="zh">{f.display}</span> {familyName(f)} · {f.count}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="lib-scroll" ref={scrollRef}>
        {itemCount === 0 ? (
          <div className="lib-empty">
            {knownFilter !== 'all' && !q && !savedOnly ? (
              <>
                <p className="lib-empty-title">{knownFilter === 'known' ? 'Chưa có chữ nào đã thuộc ở cấp này' : 'Đã thuộc hết các chữ ở cấp này'}</p>
              </>
            ) : savedOnly && !q ? (
              <>
                <p className="lib-empty-title">Chưa lưu chữ nào ở cấp này</p>
                <p>Bấm ☆ hoặc phím G khi đang học một chữ để lưu lại.</p>
              </>
            ) : (
              <>
                <p className="lib-empty-title">Không có {listingRadicals ? 'bộ thủ' : 'chữ'} nào khớp “{q}”</p>
                <p>Thử gõ pinyin, Hán Việt hoặc nghĩa tiếng Việt, ví dụ “hao”, “tốt”.</p>
              </>
            )}
            {(q || savedOnly || knownFilter !== 'all') && (
              <button type="button" className="lib-empty-btn" onClick={clearFilters}>
                <Eraser size={14} /> Xóa bộ lọc
              </button>
            )}
          </div>
        ) : listingRadicals ? (
          <div className="lib-groups" role="list">
            {familyGroups.map((g) => (
              <section key={g.key} className="lib-group" role="presentation">
                {g.title && <h3 className="label lib-group-title">{g.title}</h3>}
                <div className="lib-grid" style={gridStyle}>
                  {g.items.map(renderFamilyCell)}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="lib-grid" role="list" style={gridStyle}>
            {filteredList.map((item) => {
              const selected = item.hanzi === activeHanzi
              const primary = item.readings[0]
              return (
                <button
                  type="button"
                  key={item.hanzi}
                  role="listitem"
                  aria-current={selected ? 'true' : undefined}
                  className={`lib-cell ${selected ? 'is-selected' : ''}`}
                  title={`${primary?.pinyin ?? ''} · ${primary?.meaningVi ?? ''}${item.strokeCount ? ` (${item.strokeCount} nét)` : ''}`}
                  onClick={() => {
                    onSelectHanzi(item.hanzi)
                    onCloseMobile?.()
                  }}
                >
                  {favSet.has(item.hanzi) && <span className="lib-saved" aria-label="Đã lưu" />}
                  {isKnown(item.hanzi, learn) && <span className="kn-mark" role="img" aria-label="Đã thuộc" />}
                  <span className="lib-glyph" lang="zh">{item.hanzi}</span>
                  <span className="lib-hv">{primary?.hanViet ?? '—'}</span>
                  {sortOrder.startsWith('stroke') && item.strokeCount ? <span className="lib-badge">{item.strokeCount}</span> : null}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
