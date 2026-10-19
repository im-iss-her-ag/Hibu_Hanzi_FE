import { X, Star, Trash2 } from 'lucide-react'
import type { BundleCharacter } from '../core'

interface FavoritesModalProps {
  favorites: string[]
  characters: readonly BundleCharacter[]
  onSelectHanzi: (hanzi: string) => void
  onRemoveFavorite: (hanzi: string) => void
  onClearAll: () => void
  onClose: () => void
}

export function FavoritesModal({
  favorites,
  characters,
  onSelectHanzi,
  onRemoveFavorite,
  onClearAll,
  onClose,
}: FavoritesModalProps) {
  const favoriteChars = favorites
    .map((f) => characters.find((c) => c.hanzi === f))
    .filter((c): c is BundleCharacter => Boolean(c))

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-content fav-modal-content"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >

        <div className="modal-header">
          <div className="header-info">
            <h3 className="modal-title">Sổ tay chữ đã lưu</h3>
            <span className="badge-tag">{favorites.length} chữ</span>
          </div>
          <div className="header-actions">
            {favorites.length > 0 && (
              <button
                type="button"
                className="clear-all-btn"
                onClick={onClearAll}
                title="Xóa toàn bộ sổ tay"
              >
                <Trash2 size={16} />
                <span>Xóa hết</span>
              </button>
            )}
            <button type="button" className="icon-btn close-btn" onClick={onClose} aria-label="Đóng">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="fav-list-body">
          {favoriteChars.length === 0 ? (
            <div className="empty-fav-state">
              <Star size={36} className="empty-star-icon" />
              <p>Bạn chưa lưu chữ Hán nào vào sổ tay.</p>
              <span className="sub-hint">
                Bấm vào biểu tượng ngôi sao trên thẻ chữ để lưu lại và ôn tập bất kỳ lúc nào!
              </span>
            </div>
          ) : (
            <div className="fav-grid">
              {favoriteChars.map((c) => {
                const primary = c.readings.find((r) => r.isPrimary) ?? c.readings[0]
                return (
                  <div key={c.hanzi} className="fav-card">
                    <div
                      className="fav-card-click"
                      onClick={() => {
                        onSelectHanzi(c.hanzi)
                        onClose()
                      }}
                    >
                      <div className="fav-glyph" lang="zh">
                        {c.hanzi}
                      </div>
                      <div className="fav-meta">
                        <div className="fav-pinyin">{primary?.pinyin}</div>
                        <div className="fav-hv">{primary?.hanViet?.toUpperCase()}</div>
                        <div className="fav-mean">{primary?.meaningVi}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="fav-remove-btn"
                      onClick={() => onRemoveFavorite(c.hanzi)}
                      title="Bỏ lưu chữ này"
                      aria-label="Bỏ lưu"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
