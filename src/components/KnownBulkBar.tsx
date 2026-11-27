import { useEffect, useRef, useState } from 'react'
import { isKnown, restoreSnapshot, setKnown, snapshotFor, useLearnData } from '../learn/srs'

interface Props {
  level: number
  hanzi: string[]
}

export function KnownBulkBar({ level, hanzi }: Props) {
  const data = useLearnData()
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState<{ n: number; snap: ReturnType<typeof snapshotFor> } | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    setConfirming(false)
    setDone(null)
  }, [level])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const pending = hanzi.filter((h) => !isKnown(h, data))

  const apply = () => {
    const snap = snapshotFor(pending)
    setKnown(pending, true)
    setConfirming(false)
    setDone({ n: pending.length, snap })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setDone(null), 8000)
  }
  const undo = () => {
    if (done) restoreSnapshot(done.snap)
    window.clearTimeout(timer.current)
    setDone(null)
  }

  if (hanzi.length === 0) return null
  if (done)
    return (
      <div className="kn-bulk" role="status">
        <span>Đã đánh dấu {done.n} chữ</span>
        <button type="button" className="kn-bulk-btn" onClick={undo}>Hoàn tác</button>
      </div>
    )
  if (pending.length === 0) return <div className="kn-bulk kn-bulk-done">Đã thuộc hết HSK {level}</div>
  if (confirming)
    return (
      <div className="kn-bulk" role="alertdialog" aria-label="Xác nhận đánh dấu đã thuộc">
        <span>Đánh dấu {pending.length} chữ HSK {level} là đã thuộc?</span>
        <button type="button" className="kn-bulk-btn kn-bulk-ok" onClick={apply}>Xác nhận</button>
        <button type="button" className="kn-bulk-btn" onClick={() => setConfirming(false)}>Huỷ</button>
      </div>
    )
  return (
    <div className="kn-bulk">
      <button type="button" className="kn-bulk-btn" onClick={() => setConfirming(true)}>
        Đánh dấu đã thuộc cả HSK {level}
      </button>
    </div>
  )
}
