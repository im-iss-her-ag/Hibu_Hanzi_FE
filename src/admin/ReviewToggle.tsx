import { Check, Pencil, Undo2 } from 'lucide-react'
import type { RowStatus } from './api'

interface Props {
  status: RowStatus
  problems: string[]
  busy: boolean
  onReview: () => void
  onUnreview: () => void
  onEdit: () => void
}

// The per-row actions. A row with problems cannot be approved; the reason is shown next to
// the disabled button, not only in a tooltip.
export function ReviewToggle({ status, problems, busy, onReview, onUnreview, onEdit }: Props) {
  return (
    <div className="adm-actions">
      {status === 'reviewed' ? (
        <>
          <span className="adm-badge adm-badge-ok">
            <Check size={14} aria-hidden /> Đã duyệt
          </span>
          <button type="button" className="adm-btn adm-btn-quiet" onClick={onUnreview} disabled={busy}>
            <Undo2 size={14} aria-hidden /> Bỏ duyệt
          </button>
        </>
      ) : (
        <button
          type="button"
          className="adm-btn adm-btn-primary"
          onClick={onReview}
          disabled={busy || problems.length > 0}
        >
          <Check size={14} aria-hidden /> Đúng, duyệt
        </button>
      )}
      <button type="button" className="adm-btn" onClick={onEdit} disabled={busy}>
        <Pencil size={14} aria-hidden /> Sửa
      </button>
    </div>
  )
}

export function Problems({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <ul className="adm-problems" aria-label="Chưa duyệt được vì">
      {items.map((p) => (
        <li key={p}>{p}</li>
      ))}
    </ul>
  )
}
