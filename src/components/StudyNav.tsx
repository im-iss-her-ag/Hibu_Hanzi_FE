import { ChevronLeft, ChevronRight, LayoutGrid, Shuffle } from 'lucide-react'

interface StudyNavProps {
  onPrev: () => void
  onNext: () => void
  onRandom: () => void
  onOpenList: () => void
  listOpen: boolean
  index: number
  total: number
  disabled?: boolean
}

// One navigation bar for every breakpoint. Desktop/tablet: quiet bar aligned to the sheet width.
// Mobile: four equal icon-over-label cells (CSS switches the layout).
export function StudyNav({ onPrev, onNext, onRandom, onOpenList, listOpen, index, total, disabled = false }: StudyNavProps) {
  return (
    <nav className="study-nav" aria-label="Điều hướng chữ">
      <div className="sn-in">
        <span className="sn-pos" aria-live="polite">
          {total > 0 && (
            <>
              <b>{index + 1}</b> / {total}
            </>
          )}
        </span>

        <button
          type="button"
          className="sn-btn sn-list"
          onClick={onOpenList}
          aria-haspopup="dialog"
          aria-expanded={listOpen}
          aria-controls="app-rail"
          title="Danh sách chữ (L)"
        >
          <LayoutGrid size={18} aria-hidden="true" />
          <span>Danh sách</span>
        </button>
        <button type="button" className="sn-btn sn-prev" onClick={onPrev} disabled={disabled} title="Chữ trước (←)">
          <ChevronLeft size={18} aria-hidden="true" />
          <span>Trước</span>
        </button>
        <button type="button" className="sn-btn sn-random" onClick={onRandom} disabled={disabled} title="Ngẫu nhiên (Space)">
          <Shuffle size={18} aria-hidden="true" />
          <span>Ngẫu nhiên</span>
          <kbd aria-hidden="true">Space</kbd>
        </button>
        <button type="button" className="sn-btn sn-next" onClick={onNext} disabled={disabled} title="Chữ tiếp theo (→)">
          <span>Tiếp</span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}
