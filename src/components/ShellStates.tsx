import { AlertCircle } from 'lucide-react'

// Loading: a calm skeleton that mirrors the study sheet's real geometry (meta row, tianzige + switch,
// info column, one anatomy section), so the swap to real content does not move anything.
export function SheetSkeleton() {
  return (
    <div className="sheet sheet-skeleton" role="status" aria-label="Đang tải dữ liệu">
      <div className="sk-body" aria-hidden="true">
        <div className="sk-meta">
          <span className="sk-bar sk-meta-line" />
        </div>
        <div className="sk-hero">
          <div className="sk-stage">
            <div className="sk-tianzige" />
            <span className="sk-bar sk-switch" />
          </div>
          <div className="sk-info">
            <span className="sk-bar sk-label" />
            <span className="sk-bar sk-hv" />
            <span className="sk-bar sk-pinyin" />
            <span className="sk-bar sk-meaning" />
          </div>
        </div>
      </div>
      <div className="sk-section" aria-hidden="true">
        <div className="sk-head">
          <span className="sk-bar sk-label" />
          <span className="sk-rule" />
        </div>
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
      <AlertCircle size={32} aria-hidden="true" />
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
