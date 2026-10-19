import { useEffect, useRef } from 'react'
import { Star } from 'lucide-react'
import type { BundleCharacter, LevelFilter } from '../core'

interface MobileBottomBarProps {
  characters: BundleCharacter[]
  activeHanzi: string | null
  onSelectHanzi: (hanzi: string) => void
  selectedLevel: LevelFilter
  onLevelChange: (lvl: LevelFilter) => void
  favorites: string[]
}

export function MobileBottomBar({
  characters,
  activeHanzi,
  onSelectHanzi,
  selectedLevel,
  onLevelChange,
  favorites,
}: MobileBottomBarProps) {
  const activeTileRef = useRef<HTMLButtonElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)

  // Auto center active tile when character or level changes
  useEffect(() => {
    if (activeTileRef.current) {
      activeTileRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      })
    }
  }, [activeHanzi, selectedLevel])

  return (
    <nav className="mobile-bottom-nav" aria-label="Thanh lướt chọn Hán tự">
      {/* Top Control Strip: Big Easy-to-Tap H1-H6 + Bộ thủ + Count */}
      <div className="mobile-bottom-controls">
        <div className="mobile-level-pills" role="group" aria-label="Cấp độ HSK hoặc Bộ thủ">
          {[1, 2, 3, 4, 5, 6].map((lvl) => (
            <button
              key={lvl}
              type="button"
              className={`mobile-lvl-pill ${selectedLevel === lvl ? 'active' : ''}`}
              onClick={() => onLevelChange(lvl as LevelFilter)}
              aria-label={`HSK Cấp ${lvl}`}
              aria-pressed={selectedLevel === lvl}
            >
              H{lvl}
            </button>
          ))}
          <button
            type="button"
            className={`mobile-lvl-pill radical-pill ${selectedLevel === 'radicals' ? 'active' : ''}`}
            onClick={() => onLevelChange('radicals')}
            aria-label="214 Bộ thủ"
            aria-pressed={selectedLevel === 'radicals'}
          >
            Bộ thủ
          </button>
        </div>
        <span className="mobile-char-count">
          {characters.length} {selectedLevel === 'radicals' ? 'bộ' : 'chữ'}
        </span>
      </div>



      {/* Horizontal Swipeable Character Tile Track */}
      <div className="mobile-tile-track" ref={trackRef} role="tablist" aria-label="Danh sách Hán tự">
        {characters.map((item) => {
          const isSelected = item.hanzi === activeHanzi
          const isFav = favorites.includes(item.hanzi)
          const primary = item.readings[0]

          return (
            <button
              key={item.hanzi}
              type="button"
              ref={isSelected ? activeTileRef : null}
              role="tab"
              aria-selected={isSelected}
              className={`mobile-char-tile ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectHanzi(item.hanzi)}
              title={`${item.hanzi} - ${primary?.hanViet ?? ''} (${primary?.pinyin ?? ''})`}
            >
              {isFav && <Star size={8} className="mobile-tile-star" fill="currentColor" />}
              <span className="mobile-tile-glyph" lang="zh">{item.hanzi}</span>
              <span className="mobile-tile-hv">{primary?.hanViet ? primary.hanViet.toUpperCase() : '—'}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
