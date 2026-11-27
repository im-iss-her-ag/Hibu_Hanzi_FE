import { AlertCircle } from 'lucide-react'

// Loading: a calm skeleton of the study sheet (tianzige + text bars), not a spinner.
export function SheetSkeleton() {
  return (
    <div className="sheet sheet-skeleton" role="status" aria-label="Đang tải dữ liệu">
      <div className="sk-hero">
        <div className="sk-tianzige" aria-hidden="true" />
        <div className="sk-lines" aria-hidden="true">
          <span className="sk-bar" style={{ width: '38%', height: 14 }} />
          <span className="sk-bar" style={{ width: '58%', height: 40 }} />
          <span className="sk-bar" style={{ width: '44%', height: 20 }} />
          <span className="sk-bar" style={{ width: '70%', height: 14 }} />
        </div>
      </div>
      <div className="sk-section" aria-hidden="true">
        <span className="sk-bar" style={{ width: 96, height: 12 }} />
        <div className="sk-row">
          <span className="sk-box" />
          <span className="sk-box" />
          <span className="sk-box" />
        </div>
      </div>
      <span className="sr-only">Đang tải dữ liệu…</span>
    </div>
  )
}

export function RailSkeleton() {
  return (
    <div className="rail-skeleton" aria-hidden="true">
      {Array.from({ length: 24 }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="sheet sheet-state" role="alert">
      <AlertCircle size={28} aria-hidden="true" />
      <h2>Không thể tải kho dữ liệu</h2>
      <p>{message}</p>
      <button type="button" className="sh-btn sh-btn-primary" onClick={onRetry}>
        Thử kết nối lại
      </button>
    </div>
  )
}

export function EmptyState({ message, actionLabel, onAction }: { message: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="sheet sheet-state">
      <span className="sheet-state-glyph" lang="zh" aria-hidden="true">空</span>
      <p>{message}</p>
      <button type="button" className="sh-btn sh-btn-secondary" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  )
}
