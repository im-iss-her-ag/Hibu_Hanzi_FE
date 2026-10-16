import { Search, Star, Moon, Sun, Type, Clock, Pause, Play } from 'lucide-react'
import type { HskLevel, HskStandard } from '../core'

interface NavbarProps {
  standard: HskStandard
  onStandardChange: (std: HskStandard) => void
  selectedLevel: HskLevel | null
  onLevelChange: (lvl: HskLevel | null) => void
  timerSeconds: number // 0 = off, 15, 30, 60, 300
  onTimerChange: (sec: number) => void
  isTimerPaused: boolean
  onToggleTimerPause: () => void
  timeRemaining: number
  fontStyle: 'calligraphy' | 'serif' | 'sans'
  onToggleFont: () => void
  isDarkMode: boolean
  onToggleDarkMode: () => void
  favoritesCount: number
  onOpenFavorites: () => void
  onOpenSearch: () => void
}

export function Navbar({
  standard,
  onStandardChange,
  selectedLevel,
  onLevelChange,
  timerSeconds,
  onTimerChange,
  isTimerPaused,
  onToggleTimerPause,
  timeRemaining,
  fontStyle,
  onToggleFont,
  isDarkMode,
  onToggleDarkMode,
  favoritesCount,
  onOpenFavorites,
  onOpenSearch,
}: NavbarProps) {
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

        {/* Center Controls: HSK and Timer */}
        <div className="center-controls">
          {/* HSK Standard & Level */}
          <div className="pill-group hsk-selector">
            <button
              type="button"
              className="std-toggle-btn"
              onClick={() => onStandardChange(standard === '2.0' ? '3.0' : '2.0')}
              title="Chuyển chuẩn HSK"
            >
              HSK {standard}
            </button>
            <div className="divider-vert" />
            <button
              type="button"
              className={`pill-btn ${selectedLevel === null ? 'active' : ''}`}
              onClick={() => onLevelChange(null)}
            >
              Tất cả
            </button>
            {[1, 2, 3].map((lvl) => (
              <button
                key={lvl}
                type="button"
                className={`pill-btn ${selectedLevel === lvl ? 'active' : ''}`}
                onClick={() => onLevelChange(selectedLevel === lvl ? null : (lvl as HskLevel))}
              >
                Cấp {lvl}
              </button>
            ))}
          </div>

          {/* Auto-cycle Timer */}
          <div className="pill-group timer-selector">
            <Clock size={15} className="timer-icon" />
            <select
              className="timer-dropdown"
              value={timerSeconds}
              onChange={(e) => onTimerChange(Number(e.target.value))}
              aria-label="Chu kỳ tự đổi chữ"
            >
              <option value={0}>Đổi: Tắt</option>
              <option value={15}>15 giây</option>
              <option value={30}>30 giây</option>
              <option value={60}>1 phút</option>
              <option value={300}>5 phút</option>
            </select>

            {timerSeconds > 0 && (
              <div className="timer-countdown-chip">
                <button
                  type="button"
                  className="timer-pause-btn"
                  onClick={onToggleTimerPause}
                  title={isTimerPaused ? 'Tiếp tục đếm' : 'Tạm dừng đếm'}
                >
                  {isTimerPaused ? <Play size={12} /> : <Pause size={12} />}
                </button>
                <span className="timer-sec">{timeRemaining}s</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Tools: Search, Favorites, Font, Dark Mode */}
        <div className="right-tools">
          <button
            type="button"
            className="tool-btn search-trigger-btn"
            onClick={onOpenSearch}
            title="Tìm kiếm chữ Hán, Pinyin, Hán Việt (Ctrl+K)"
          >
            <Search size={18} />
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

          <button
            type="button"
            className="tool-btn font-toggle-btn"
            onClick={onToggleFont}
            title={`Kiểu chữ: ${fontStyle === 'calligraphy' ? 'Thư pháp' : fontStyle === 'serif' ? 'Khải thư' : 'Không chân'}`}
          >
            <Type size={18} />
          </button>

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
