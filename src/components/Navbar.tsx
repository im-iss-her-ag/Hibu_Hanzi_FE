import { useState, useRef, useEffect, useCallback } from 'react'
import { Star, Moon, Sun, Search, MoreHorizontal, Keyboard, ChevronDown, LayoutGrid } from 'lucide-react'

interface NavbarProps {
  displayMode: 'modern' | 'components'
  onToggleDisplayMode: () => void
  isDarkMode: boolean
  onToggleDarkMode: () => void
  favoritesCount: number
  onOpenFavorites: () => void
  onOpenSearch: () => void
  onOpenPinyinChart: () => void
  // "Danh sách" button: shown while the character list is not permanently visible (drawer / collapsed rail).
  showListButton?: boolean
  listOpen?: boolean
  onOpenList?: () => void
  // Widget launcher (PipWidget); rendered inside the overflow menu. It stays mounted while the menu is closed.
  widget?: React.ReactNode
}

const SHORTCUTS: { keys: string[]; desc: string }[] = [
  { keys: ['Space'], desc: 'Chữ ngẫu nhiên' },
  { keys: ['←', '→'], desc: 'Chữ trước / sau (hoặc A, D)' },
  { keys: ['↑', '↓'], desc: 'Lên / xuống một hàng (hoặc W, S)' },
  { keys: ['Ctrl+←', 'Ctrl+→'], desc: 'Trang trước / sau' },
  { keys: ['Backspace'], desc: 'Quay lại chữ vừa xem' },
  { keys: ['1', '–', '6'], desc: 'Chuyển cấp HSK' },
  { keys: ['L'], desc: 'Mở / đóng danh sách chữ' },
  { keys: ['B'], desc: 'Bộ thủ' },
  { keys: ['Tab'], desc: 'Đổi Hiện đại / Thành phần' },
  { keys: ['G'], desc: 'Lưu / bỏ lưu' },
  { keys: ['F', 'Ctrl+K'], desc: 'Tìm kiếm' },
  { keys: ['P'], desc: 'Bảng Pinyin' },
  { keys: ['Esc'], desc: 'Đóng cửa sổ' },
]

export function Navbar({
  displayMode,
  onToggleDisplayMode,
  isDarkMode,
  onToggleDarkMode,
  favoritesCount,
  onOpenFavorites,
  onOpenSearch,
  onOpenPinyinChart,
  showListButton = false,
  listOpen = false,
  onOpenList,
  widget,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const closeMenu = useCallback((returnFocus = false) => {
    setMenuOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }, [])

  // Outside click closes the menu.
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  // Move focus into the menu when it opens.
  useEffect(() => {
    if (!menuOpen) return
    popoverRef.current?.querySelector<HTMLElement>('button:not(:disabled), a[href]')?.focus()
  }, [menuOpen])

  const focusables = () =>
    Array.from(
      popoverRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]') ?? [],
    )

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeMenu(true)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const items = focusables()
      if (items.length === 0) return
      const i = items.indexOf(document.activeElement as HTMLElement)
      const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length
      items[next].focus()
    }
  }

  // Global shortcuts (Space, Tab...) must not hijack native button behaviour inside the header.
  const stopGlobalKeys = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Tab' || menuOpen) e.stopPropagation()
  }

  const tip = (label: string, key?: string) => (key ? `${label} (${key})` : label)

  return (
    <header className="sh-header" onKeyDown={stopGlobalKeys}>
      <div className="sh-left">
        {showListButton && (
          <button
            type="button"
            className="sh-list-btn"
            onClick={onOpenList}
            aria-haspopup="dialog"
            aria-expanded={listOpen}
            aria-controls="app-rail"
            title={tip('Danh sách chữ', 'L')}
          >
            <LayoutGrid size={16} aria-hidden="true" />
            <span>Danh sách</span>
          </button>
        )}
        <div className="sh-brand" title="Hibu Hanzi">
          <span className="sh-logo" lang="zh" aria-hidden="true">漢</span>
          <span className="sh-brand-name">Hibu Hanzi</span>
        </div>
      </div>

      <button
        type="button"
        className="sh-search"
        onClick={onOpenSearch}
        title={tip('Tìm chữ, pinyin, Hán Việt', 'F hoặc Ctrl+K')}
        aria-label="Tìm kiếm"
      >
        <Search size={16} aria-hidden="true" />
        <span className="sh-search-text">Tìm chữ, pinyin, Hán Việt…</span>
        <kbd className="sh-kbd">Ctrl K</kbd>
      </button>

      <div className="sh-actions">
        <button
          type="button"
          className="sh-icon-btn sh-only-sm"
          onClick={onOpenSearch}
          title={tip('Tìm kiếm', 'F')}
          aria-label="Tìm kiếm"
        >
          <Search size={18} aria-hidden="true" />
        </button>

        <button
          type="button"
          className="sh-icon-btn"
          onClick={onOpenFavorites}
          title="Sổ tay chữ đã lưu"
          aria-label={`Sổ tay chữ đã lưu${favoritesCount > 0 ? ` (${favoritesCount})` : ''}`}
        >
          <Star size={18} aria-hidden="true" />
          {favoritesCount > 0 && <span className="sh-badge">{favoritesCount > 99 ? '99+' : favoritesCount}</span>}
        </button>

        <button
          type="button"
          className="sh-icon-btn sh-pinyin-btn sh-hide-sm"
          onClick={onOpenPinyinChart}
          title={tip('Bảng Pinyin', 'P')}
          aria-label="Bảng Pinyin"
        >
          <span className="sh-glyph" lang="zh" aria-hidden="true">拼</span>
        </button>

        <div className="sh-menu" ref={menuRef} onKeyDown={onMenuKeyDown}>
          <button
            type="button"
            ref={triggerRef}
            className={`sh-icon-btn ${menuOpen ? 'is-open' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            title="Thêm"
            aria-label="Thêm"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls="sh-menu-popover"
          >
            <MoreHorizontal size={18} aria-hidden="true" />
          </button>

          {/* Always mounted (hidden when closed) so the PiP widget keeps running. */}
          <div
            id="sh-menu-popover"
            className="sh-popover"
            ref={popoverRef}
            role="menu"
            aria-label="Thêm"
            hidden={!menuOpen}
            onClick={(e) => {
              // Launching an item closes the menu; interactive settings keep it open.
              const el = (e.target as HTMLElement).closest<HTMLElement>('[data-menu-close]')
              if (el) closeMenu()
            }}
          >
            <div className="sh-menu-section">
              <span className="sh-menu-label">Chế độ hiển thị</span>
              <div className="sh-segmented" role="group" aria-label="Chế độ hiển thị chữ">
                <button
                  type="button"
                  title="Hiện đại: chữ in rõ nét, gọn gàng"
                  className={displayMode === 'modern' ? 'active' : ''}
                  aria-pressed={displayMode === 'modern'}
                  onClick={() => displayMode !== 'modern' && onToggleDisplayMode()}
                >
                  Hiện đại
                </button>
                <button
                  type="button"
                  title="Thành phần: tô màu bộ thủ trong chữ, chiết tự dùng nét bút lông"
                  className={displayMode === 'components' ? 'active' : ''}
                  aria-pressed={displayMode === 'components'}
                  onClick={() => displayMode !== 'components' && onToggleDisplayMode()}
                >
                  Thành phần
                </button>
              </div>
              <p className="sh-menu-hint">
                {displayMode === 'components'
                  ? 'Thành phần: tô màu bộ thủ trong chữ, chiết tự dùng nét bút lông.'
                  : 'Hiện đại: chữ in rõ nét. Chọn "Thành phần" để tô màu bộ thủ.'}
              </p>
            </div>

            <div className="sh-menu-section sh-only-sm">
              <button type="button" className="sh-menu-item" role="menuitem" data-menu-close onClick={onOpenPinyinChart}>
                <span className="sh-glyph" lang="zh" aria-hidden="true">拼</span>
                <span>Bảng Pinyin</span>
              </button>
              <button type="button" className="sh-menu-item" role="menuitem" data-menu-close onClick={onToggleDarkMode}>
                {isDarkMode ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
                <span>{isDarkMode ? 'Giao diện sáng' : 'Giao diện tối'}</span>
              </button>
            </div>

            {widget && <div className="sh-menu-section sh-menu-widget">{widget}</div>}

            <div className="sh-menu-section sh-menu-shortcuts">
              <button
                type="button"
                className="sh-menu-item"
                role="menuitem"
                aria-expanded={showShortcuts}
                onClick={() => setShowShortcuts((v) => !v)}
              >
                <Keyboard size={16} aria-hidden="true" />
                <span>Phím tắt</span>
                <ChevronDown size={14} className={`sh-chevron ${showShortcuts ? 'is-open' : ''}`} aria-hidden="true" />
              </button>
              {showShortcuts && (
                <ul className="sh-shortcuts">
                  {SHORTCUTS.map((s) => (
                    <li key={s.desc}>
                      <span className="sh-keys">
                        {s.keys.map((k) => (
                          <kbd key={k} className="sh-kbd">{k}</kbd>
                        ))}
                      </span>
                      <span className="sh-desc">{s.desc}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="sh-icon-btn sh-hide-sm"
          onClick={onToggleDarkMode}
          title={isDarkMode ? 'Giao diện sáng' : 'Giao diện tối'}
          aria-label="Đổi giao diện sáng/tối"
        >
          {isDarkMode ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        </button>
      </div>
    </header>
  )
}
