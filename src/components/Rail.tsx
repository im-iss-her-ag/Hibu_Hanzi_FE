import { useRef, useState } from 'react'
import { PanelLeftClose, X } from 'lucide-react'
import type { ShellMode } from './useShellMode'
import { useModalDialog } from '../utils/useModalA11y'

interface RailProps {
  mode: ShellMode
  open: boolean // overlay modes (drawer / sheet)
  collapsed: boolean // rail mode
  onClose: () => void
  onCollapse: () => void
  children: React.ReactNode
  headExtra?: React.ReactNode
}

// The character list container. Same content everywhere; only the frame changes:
// permanent rail (>=1200), left drawer (768-1199), bottom sheet (<768).
export function Rail({ mode, open, collapsed, onClose, onCollapse, children, headExtra }: RailProps) {
  const overlay = mode !== 'rail'
  const hidden = overlay ? !open : collapsed
  const [drag, setDrag] = useState<number | null>(null)
  const dragStart = useRef(0)

  // Overlay modes (drawer / sheet) are modal dialogs while open: focus in/out, Esc, Tab trap, scroll lock.
  const { ref, titleId, dialogProps } = useModalDialog<HTMLElement>(onClose, { enabled: overlay && open, initialFocus: '.rail-close' })

  // Bottom sheet: drag the handle down to dismiss.
  const onPointerDown = (e: React.PointerEvent) => {
    if (mode !== 'sheet') return
    dragStart.current = e.clientY
    setDrag(0)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // synthetic or already-released pointer
    }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (drag === null) return
    setDrag(Math.max(0, e.clientY - dragStart.current))
  }
  const onPointerUp = () => {
    if (drag === null) return
    const shouldClose = drag > 90
    setDrag(null)
    if (shouldClose) onClose()
  }

  return (
    <>
      {overlay && <div className="scrim" data-open={open} onClick={onClose} aria-hidden="true" />}
      <aside
        id="app-rail"
        ref={ref}
        className="rail"
        data-mode={mode}
        data-open={open}
        data-collapsed={collapsed}
        data-dragging={drag !== null}
        style={drag ? { transform: `translateY(${drag}px)` } : undefined}
        aria-label={overlay ? undefined : 'Danh sách chữ'}
        aria-labelledby={overlay ? titleId : undefined}
        role={overlay ? dialogProps.role : undefined}
        aria-modal={overlay && open ? true : undefined}
        inert={hidden}
      >
        <div className="rail-inner">
          {mode === 'sheet' && (
            <div
              className="rail-grab"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <span aria-hidden="true" />
            </div>
          )}
          <div className="rail-head">
            <span className="label" id={titleId}>Danh sách chữ</span>
            {headExtra}
            {overlay ? (
              <button type="button" className="sh-icon-btn rail-close" onClick={onClose} aria-label="Đóng danh sách (Esc)" title="Đóng (Esc)">
                <X size={18} aria-hidden="true" />
              </button>
            ) : (
              <button type="button" className="sh-icon-btn" onClick={onCollapse} aria-label="Thu gọn danh sách (L)" title="Thu gọn (L)">
                <PanelLeftClose size={18} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="rail-body">{children}</div>
        </div>
      </aside>
    </>
  )
}
