import { useState, useRef, useEffect } from 'react'
import { Star, Moon, Sun, Keyboard, Search } from 'lucide-react'

interface NavbarProps {
  displayMode: 'modern' | 'components'
  onToggleDisplayMode: () => void
  isDarkMode: boolean
  onToggleDarkMode: () => void
  favoritesCount: number
  onOpenFavorites: () => void
  onOpenSearch: () => void
  onOpenPinyinChart: () => void
}

export function Navbar({
  displayMode,
  onToggleDisplayMode,
  isDarkMode,
  onToggleDarkMode,
  favoritesCount,
  onOpenFavorites,
  onOpenSearch,
  onOpenPinyinChart,
}: NavbarProps) {
  const [showShortcutsPopover, setShowShortcutsPopover] = useState(false)
  const shortcutsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shortcutsRef.current && !shortcutsRef.current.contains(e.target as Node)) {
        setShowShortcutsPopover(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="app-header">
      <div className="header-container">
        {/* Brand Logo */}
        <div className="brand-group">
          <div className="seal-logo" title="Hibu Hanzi">
            <span>漢</span>
          </div>
          <div className="brand-text">
            <h1 className="brand-name">Hibu Hanzi</h1>
            <span className="brand-sub">Hán Việt & Chiết tự</span>
          </div>
        </div>

        {/* Right Tools: Pinyin Chart, Search, Favorites, Font, Dark Mode */}
        <div className="right-tools">
          <button
            type="button"
            className="tool-btn pinyin-chart-trigger-btn"
            onClick={onOpenPinyinChart}
            title="Mở Bảng Pinyin Toàn Diện & Quy tắc biến điệu (P)"
            aria-label="Bảng Pinyin"
          >
            <span className="pinyin-badge-glyph" aria-hidden="true">拼</span>
            <span className="pinyin-chart-label">Bảng Pinyin</span>
          </button>

          <button
            type="button"
            className="tool-btn search-trigger-btn"
            onClick={onOpenSearch}
            title="Tìm kiếm chữ Hán, Pinyin, Hán Việt (Ctrl+K)"
            aria-label="Tìm kiếm"
          >
            <Search size={16} />
            <span className="search-shortcut">Tìm kiếm</span>
          </button>

          <button
            type="button"
            className={`tool-btn fav-trigger-btn ${favoritesCount > 0 ? 'has-favs' : ''}`}
            onClick={onOpenFavorites}
            title="Sổ tay chữ đã lưu"
          >
            <Star size={18} />
            {favoritesCount > 0 && <span className="fav-badge">{favoritesCount}</span>}
          </button>

          {/* Toggle Chế độ hiển thị: Hiện đại ↔ Thành phần */}
          <button
            type="button"
            className={`tool-btn display-mode-toggle-btn ${displayMode === 'components' ? 'mode-components' : 'mode-modern'}`}
            onClick={onToggleDisplayMode}
            title={displayMode === 'modern' ? 'Chế độ: Hiện đại (Chạm để xem tách Thành phần)' : 'Chế độ: Thành phần (Chạm để xem Hiện đại)'}
            aria-label="Đổi chế độ hiển thị chữ"
          >
            {displayMode === 'components' ? (
              <span className="comp-dots-badge" aria-hidden="true">
                <span className="dot dot-blue" />
                <span className="dot dot-red" />
              </span>
            ) : (
              <span className="font-toggle-sample font-sans-sc" lang="zh" aria-hidden="true">
                字
              </span>
            )}
            <span className="pinyin-chart-label">
              {displayMode === 'components' ? 'Thành phần' : 'Hiện đại'}
            </span>
          </button>

          {/* Keyboard Shortcuts Helper */}
          <div className="shortcuts-trigger-wrapper" ref={shortcutsRef}>
            <button
              type="button"
              className={`tool-btn shortcuts-btn ${showShortcutsPopover ? 'active' : ''}`}
              onClick={() => setShowShortcutsPopover(!showShortcutsPopover)}
              title="Phím tắt thao tác nhanh"
              aria-label="Phím tắt"
            >
              <Keyboard size={18} />
            </button>

            {showShortcutsPopover && (
              <div className="shortcuts-popover-dropdown">
                <div className="shortcuts-popover-header">
                  <Keyboard size={15} />
                  <span>Phím tắt bàn phím</span>
                </div>
                <div className="shortcuts-list">
                  <div className="shortcut-row">
                    <kbd className="sc-kbd">Space</kbd>
                    <span className="sc-desc">Đổi chữ ngẫu nhiên</span>
                  </div>
                  <div className="shortcut-row">
                    <div className="sc-kbd-group">
                      <kbd className="sc-kbd">←</kbd>
                      <kbd className="sc-kbd">→</kbd>
                    </div>
                    <span className="sc-desc">Chữ trước / tiếp theo</span>
                  </div>
                  <div className="shortcut-row">
                    <kbd className="sc-kbd">F</kbd>
                    <span className="sc-desc">Lưu / Bỏ lưu sổ tay</span>
                  </div>
                  <div className="shortcut-row">
                    <kbd className="sc-kbd">P</kbd>
                    <span className="sc-desc">Mở Bảng Pinyin toàn diện</span>
                  </div>
                  <div className="shortcut-row">
                    <kbd className="sc-kbd">Ctrl+K</kbd>
                    <span className="sc-desc">Tra cứu nhanh</span>
                  </div>
                  <div className="shortcut-row">
                    <kbd className="sc-kbd">Esc</kbd>
                    <span className="sc-desc">Đóng cửa sổ bật lên</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="tool-btn theme-toggle-btn"
            onClick={onToggleDarkMode}
            title={isDarkMode ? 'Chuyển giao diện Sáng' : 'Chuyển giao diện Tối'}
            aria-label="Đổi giao diện sáng/tối"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  )
}
