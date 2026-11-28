import { useState } from 'react'
import { X, Star, Trash2 } from 'lucide-react'
import type { BundleCharacter } from '../core'
import { RADICAL_CHARACTERS } from '../core'
import { useModalDialog } from '../utils/useModalA11y'
import { CharRowBody } from './CharRowBody'

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
  const [confirmClear, setConfirmClear] = useState(false)
  const { ref: dialogRef, titleId, dialogProps } = useModalDialog<HTMLDivElement>(onClose)

  const favoriteChars = favorites
    .map((f) => characters.find((c) => c.hanzi === f) ?? RADICAL_CHARACTERS.find((r) => r.hanzi === f))
    .filter((c): c is BundleCharacter => Boolean(c))

  // ↑/↓ move between rows; Enter/click on the row opens the character.
  const onListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const opens = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('.fm-open'))
    const i = opens.indexOf(document.activeElement as HTMLElement)
    const next = opens[e.key === 'ArrowDown' ? Math.min(opens.length - 1, i + 1) : Math.max(0, i - 1)]
    if (next) {
      e.preventDefault()
      next.focus()
    }
  }

  return (
    <div
      className="pm-backdrop"
      onClick={onClose}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div
        ref={dialogRef}
        {...dialogProps}
        className="pm-dialog fm-dialog"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div className="pm-header">
          <h2 className="pm-title" id={titleId}>Sổ tay</h2>
          <span className="pm-meta">{favoriteChars.length} chữ</span>
          <div className="pm-header-actions">
            {favorites.length > 0 && !confirmClear && (
              <button type="button" className="pm-btn pm-btn-ghost" data-fm-clear onClick={() => setConfirmClear(true)} title="Xóa toàn bộ sổ tay">
                <Trash2 size={14} /> Xóa hết
              </button>
            )}
            <button type="button" className="pm-icon-btn" onClick={onClose} aria-label="Đóng" title="Đóng (Esc)">
              <X size={18} />
            </button>
          </div>
        </div>

        {confirmClear && (
          <div
            className="fm-confirm"
            role="alertdialog"
            aria-label="Xác nhận xóa hết"
            onKeyDown={(e) => {
              // Esc backs out of the confirmation first; the dialog only closes on the next Esc.
              if (e.key === 'Escape') {
                e.preventDefault()
                setConfirmClear(false)
                requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>('[data-fm-clear]')?.focus())
              }
            }}
          >
            <span>Xóa hết {favorites.length} chữ đã lưu? Không hoàn tác được.</span>
            <span className="fm-confirm-actions">
              <button type="button" className="pm-btn" autoFocus onClick={() => setConfirmClear(false)}>Hủy</button>
              <button
                type="button"
                className="pm-btn pm-btn-danger"
                onClick={() => {
                  onClearAll()
                  setConfirmClear(false)
                }}
              >
                Xóa hết
              </button>
            </span>
          </div>
        )}

        <div className="pm-body fm-body">
          {favoriteChars.length === 0 ? (
            <div className="sm-empty">
              <Star size={24} className="fm-empty-star" />
              <p className="sm-empty-title">Chưa có chữ nào trong sổ tay</p>
              <p>Bấm ☆ ở chữ đang học, hoặc nhấn phím <kbd>G</kbd>, để lưu lại và ôn sau.</p>
            </div>
          ) : (
            <div className="fm-list" onKeyDown={onListKeyDown}>
              {favoriteChars.map((c) => (
                <div key={c.hanzi} className="fm-item">
                  <button
                    type="button"
                    className="sm-row fm-open"
                    onClick={() => {
                      onSelectHanzi(c.hanzi)
                      onClose()
                    }}
                  >
                    <CharRowBody c={c} />
                    <span className="pm-tag sm-tag">{c.hsk3Level ? `HSK ${c.hsk3Level}` : 'Bộ'}</span>
                  </button>
                  <button
                    type="button"
                    className="pm-icon-btn fm-remove"
                    onClick={() => onRemoveFavorite(c.hanzi)}
                    title="Bỏ lưu"
                    aria-label={`Bỏ lưu ${c.hanzi}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
