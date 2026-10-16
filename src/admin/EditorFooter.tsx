import { useState } from 'react'

interface Props {
  onCancel: () => void
  onSave: (andReview: boolean) => Promise<void>
}

// Save / Save & review / Cancel, with the server's validation message shown in place.
export function EditorFooter({ onCancel, onSave }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(andReview: boolean) {
    setSaving(true)
    setError(null)
    try {
      await onSave(andReview)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adm-editor-footer">
      {error && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}
      <div className="adm-actions">
        <button type="button" className="adm-btn adm-btn-primary" onClick={() => run(true)} disabled={saving}>
          Lưu &amp; duyệt
        </button>
        <button type="button" className="adm-btn" onClick={() => run(false)} disabled={saving}>
          {saving ? 'Đang lưu…' : 'Lưu'}
        </button>
        <button type="button" className="adm-btn adm-btn-quiet" onClick={onCancel} disabled={saving}>
          Huỷ
        </button>
      </div>
    </div>
  )
}
