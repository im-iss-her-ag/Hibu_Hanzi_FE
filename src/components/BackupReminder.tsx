import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useLearnData } from '../learn/srs'
import { useSyncStatus } from '../learn/sync'
import '../styles/learn-sync.css'

/**
 * Gentle nudge to back up or turn on sync, for people who have real progress but no recent backup.
 * Quiet by design: appears once, 25 s after the app opens, never over a dialog, never when sync is on,
 * and dismissing it snoozes it for 7 days (localStorage).
 */

const SNOOZE_KEY = 'hibu_backup_nudge_until'
const DAY = 86_400_000
const STALE_AFTER = 14 * DAY
const MIN_ITEMS = 5
const DELAY_MS = 25_000

function snoozedUntil(): number {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY)) || 0
  } catch {
    return 0
  }
}

interface Props {
  /** True while any dialog is open: the hint stays out of the way. */
  hidden: boolean
  onOpenBackup: () => void
}

export function BackupReminder({ hidden, onOpenBackup }: Props) {
  const d = useLearnData()
  const sync = useSyncStatus()
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  const items = Object.keys(d.cards).length + Object.keys(d.known).length
  const stale = d.lastBackup === null || Date.now() - d.lastBackup > STALE_AFTER
  if (!ready || dismissed || hidden || sync.enabled || items < MIN_ITEMS || !stale || Date.now() < snoozedUntil()) return null

  const snooze = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + 7 * DAY))
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }
  const open = () => {
    snooze()
    onOpenBackup()
  }

  return (
    <div className="sy-nudge" role="region" aria-label="Nhắc sao lưu">
      <p className="sy-nudge-text">
        {d.lastBackup === null ? 'Bạn chưa sao lưu tiến độ học.' : 'Đã hơn 2 tuần bạn chưa sao lưu tiến độ học.'} Dữ liệu chỉ nằm trên thiết bị này.
      </p>
      <span className="sy-nudge-actions">
        <button type="button" className="pm-btn pm-btn-accent" onClick={open}>Sao lưu</button>
        <button type="button" className="pm-btn" onClick={open}>Bật đồng bộ</button>
        <button type="button" className="pm-icon-btn" onClick={snooze} aria-label="Để sau (nhắc lại sau 7 ngày)" title="Để sau">
          <X size={16} />
        </button>
      </span>
    </div>
  )
}
