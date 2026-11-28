import { useEffect, useState } from 'react'
import { X, Download, Upload } from 'lucide-react'
import { useModalDialog } from '../utils/useModalA11y'
import { useLearnData } from '../learn/srs'
import { MAX_BACKUP_BYTES, applyBackup, downloadBackup, parseBackup, requestPersist } from '../learn/backup'
import type { BackupFile } from '../learn/backup'
import { SyncSection } from './SyncSection'
import { useSyncStatus } from '../learn/sync'

interface BackupModalProps {
  favorites: string[]
  onFavoritesChange: (next: string[]) => void
  onClose: () => void
}

export function BackupModal({ favorites, onFavoritesChange, onClose }: BackupModalProps) {
  const { ref: dialogRef, titleId, dialogProps } = useModalDialog<HTMLDivElement>(onClose)
  const d = useLearnData()
  const syncOn = useSyncStatus().enabled
  const [persist, setPersist] = useState<boolean | null>(null)
  const [pending, setPending] = useState<BackupFile | null>(null)
  const [confirmOver, setConfirmOver] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    let alive = true
    requestPersist().then((r) => alive && setPersist(r))
    return () => {
      alive = false
    }
  }, [])

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    setConfirmOver(false)
    setPending(null)
    if (!f) return
    if (f.size > MAX_BACKUP_BYTES) {
      setMsg({ kind: 'err', text: 'File sao lưu quá lớn.' })
      return
    }
    try {
      setPending(parseBackup(await f.text()))
      setMsg(null)
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Không đọc được file.' })
    }
  }

  const apply = (mode: 'merge' | 'overwrite') => {
    if (!pending) return
    try {
      onFavoritesChange(applyBackup(pending, mode, favorites))
      setMsg({ kind: 'ok', text: mode === 'merge' ? 'Đã gộp dữ liệu từ file sao lưu.' : 'Đã ghi đè bằng dữ liệu từ file sao lưu.' })
    } catch {
      setMsg({ kind: 'err', text: 'Không áp dụng được file sao lưu.' })
    }
    setPending(null)
    setConfirmOver(false)
  }

  const nKnown = Object.keys(d.known).length
  const nReview = Object.keys(d.cards).length
  const stat = (known: number, review: number, fav: number) => (
    <span className="bk-counts">
      <span><b>{known}</b> đã thuộc</span>
      <span><b>{review}</b> trong ôn tập</span>
      <span><b>{fav}</b> đã lưu</span>
    </span>
  )

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
        className="pm-dialog pm-sm bk-dialog"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div className="pm-header">
          <h2 className="pm-title" id={titleId}>Sao lưu</h2>
          <div className="pm-header-actions">
            <button type="button" className="pm-icon-btn pm-close" onClick={onClose} aria-label="Đóng" title="Đóng (Esc)">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="pm-body pm-stack bk-body">
          <p className="pm-note">
            {syncOn
              ? 'Dữ liệu học được lưu trên máy này và đồng bộ (đã mã hoá) với các thiết bị dùng chung mã đồng bộ. Vẫn nên tải file sao lưu thỉnh thoảng phòng khi mất mã.'
              : 'Dữ liệu học của bạn chỉ nằm trên thiết bị này, không có tài khoản. Hãy tải file sao lưu định kỳ, hoặc bật đồng bộ, để không mất tiến độ khi đổi máy hoặc xoá dữ liệu trình duyệt.'}
          </p>
          <SyncSection />
          <section className="pm-section" aria-label="Dữ liệu hiện có">
            <h3 className="pm-section-title">Dữ liệu hiện có</h3>
            {stat(nKnown, nReview, favorites.length)}
            <p className="bk-meta">
              {d.lastBackup ? `Sao lưu lần cuối: ${new Date(d.lastBackup).toLocaleString('vi-VN')}` : 'Chưa sao lưu'}
            </p>
            <p className="bk-meta">
              {persist === true
                ? 'Trình duyệt đã cho phép lưu bền'
                : persist === false
                  ? 'Trình duyệt có thể xoá dữ liệu khi thiếu dung lượng'
                  : ''}
            </p>
            <button type="button" className="pm-btn pm-btn-accent" onClick={() => { downloadBackup(favorites); setMsg({ kind: 'ok', text: 'Đã tạo file sao lưu.' }) }}>
              <Download size={14} /> Tải file sao lưu
            </button>
          </section>

          <section className="pm-section" aria-label="Nhập file">
            <h3 className="pm-section-title">Nhập file</h3>
            <label className="pm-btn bk-file">
              <Upload size={14} /> Nhập file sao lưu
              <input type="file" accept="application/json,.json" onChange={onFile} className="bk-file-input" />
            </label>
            {pending && (
              <div className="bk-preview">
                <div className="bk-meta">File chứa:</div>
                {stat(Object.keys(pending.known).length, Object.keys(pending.srs.cards).length, pending.favorites.length)}
                {pending.exportedAt > 0 && <div className="bk-meta">Tạo lúc {new Date(pending.exportedAt).toLocaleString('vi-VN')}</div>}
                {confirmOver ? (
                  <div
                    className="pm-confirm"
                    role="alertdialog"
                    aria-label="Xác nhận ghi đè"
                    onKeyDown={(e) => {
                      // Esc backs out of the confirmation first; the dialog only closes on the next Esc.
                      if (e.key === 'Escape') {
                        e.preventDefault()
                        setConfirmOver(false)
                        requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>('[data-bk-over]')?.focus())
                      }
                    }}
                  >
                    <span>Ghi đè sẽ thay toàn bộ dữ liệu hiện có trên máy này. Không hoàn tác được.</span>
                    <span className="pm-confirm-actions">
                      <button type="button" className="pm-btn" autoFocus onClick={() => setConfirmOver(false)}>Hủy</button>
                      <button type="button" className="pm-btn pm-btn-danger" onClick={() => apply('overwrite')}>Ghi đè</button>
                    </span>
                  </div>
                ) : (
                  <span className="bk-actions">
                    <button type="button" className="pm-btn pm-btn-accent" onClick={() => apply('merge')}>Gộp (giữ lần ôn mới nhất)</button>
                    <button type="button" className="pm-btn" data-bk-over onClick={() => setConfirmOver(true)}>Ghi đè</button>
                  </span>
                )}
              </div>
            )}
          </section>

          <div className={`bk-msg${msg?.kind === 'err' ? ' bk-msg-err' : ''}`} role="status" aria-live="polite">
            {msg?.text}
          </div>
        </div>
      </div>
    </div>
  )
}
