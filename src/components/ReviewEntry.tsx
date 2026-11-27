import { RotateCcw } from 'lucide-react'
import { dueCount, useLearnData } from '../learn/srs'

/** "Ôn tập (n)" entry button; n = cards due today (incl. today's new-card allowance). */
export function ReviewEntry({ onOpen, className = 'sh-icon-btn rv-entry', compact = false }: { onOpen: () => void; className?: string; compact?: boolean }) {
  const data = useLearnData()
  const n = dueCount(data)
  return (
    <button type="button" className={className} onClick={onOpen} title={n ? `Ôn tập: ${n} chữ đến hạn hôm nay (R)` : "Ôn tập (R)"} aria-label={`Ôn tập${n ? ` (${n} chữ đến hạn hôm nay)` : ''}`}>
      <RotateCcw size={16} aria-hidden="true" />
      {!compact && <span className="rv-entry-label">Ôn tập</span>}
      {n > 0 && <span className="rv-entry-count">{n > 99 ? '99+' : n}</span>}
    </button>
  )
}
