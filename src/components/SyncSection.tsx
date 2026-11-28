import { useState } from 'react'
import { Copy, Eye, EyeOff, RefreshCw } from 'lucide-react'
import {
  createSync,
  cryptoAvailable,
  disableSync,
  eraseServerCopy,
  formatCode,
  getSyncCode,
  joinSync,
  maskCode,
  reuploadAfterGone,
  syncNow,
  useSyncStatus,
} from '../learn/sync'
import '../styles/learn-sync.css'

type Confirm = 'off' | 'erase' | null

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Older browsers / permission denied: select a throwaway textarea and use execCommand.
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    ta.remove()
    return ok
  }
}

const PRIVACY = (
  <>
    <p className="bk-note">
      Dùng cùng một <b>mã đồng bộ</b> trên nhiều thiết bị để giữ chung thẻ ôn tập, chữ đã thuộc, lịch sử ôn và sổ tay (không gồm cài đặt giao diện). Không cần tài khoản.
    </p>
    <ul className="sy-points">
      <li>Dữ liệu được mã hoá ngay trên máy bạn trước khi gửi; máy chủ chỉ giữ bản đã mã hoá và không đọc được.</li>
      <li>Ai có mã này đều xem và sửa được dữ liệu học của bạn, vì vậy đừng chia sẻ.</li>
      <li>Mất mã thì không khôi phục được, kể cả khi dữ liệu còn trên máy chủ.</li>
    </ul>
  </>
)

export function SyncSection() {
  const st = useSyncStatus()
  const [joining, setJoining] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [reveal, setReveal] = useState(false)
  const [confirm, setConfirm] = useState<Confirm>(null)

  const secure = cryptoAvailable()
  const code = st.enabled ? getSyncCode() : null

  const run = async (fn: () => Promise<{ ok: boolean; message?: string } | unknown>) => {
    setBusy(true)
    setMsg(null)
    try {
      return await fn()
    } finally {
      setBusy(false)
    }
  }

  const onCreate = () =>
    run(async () => {
      const r = await createSync()
      if (r.ok) {
        setReveal(true)
        setMsg({ kind: 'ok', text: 'Đã bật đồng bộ. Hãy lưu mã ở trên ở nơi an toàn rồi nhập vào thiết bị khác.' })
      } else setMsg({ kind: 'err', text: r.message })
    })

  const onJoin = (e: React.FormEvent) => {
    e.preventDefault()
    return run(async () => {
      const r = await joinSync(input)
      if (r.ok) {
        setInput('')
        setJoining(false)
        setReveal(false)
        setMsg({ kind: 'ok', text: 'Đã kết nối. Dữ liệu của hai thiết bị đã được gộp.' })
      } else setMsg({ kind: 'err', text: r.message })
    })
  }

  const onCopy = async () => {
    if (!code) return
    const ok = await copyText(formatCode(code))
    setMsg(ok ? { kind: 'ok', text: 'Đã sao chép mã.' } : { kind: 'err', text: 'Không sao chép được. Hãy bấm "Hiện mã" và chép tay.' })
  }

  const onNow = () =>
    run(async () => {
      const out = await syncNow()
      if (out === 'ok') setMsg({ kind: 'ok', text: 'Đã đồng bộ.' })
    })

  const onOff = () => {
    disableSync()
    setConfirm(null)
    setReveal(false)
    setMsg({ kind: 'ok', text: 'Đã tắt đồng bộ trên máy này. Dữ liệu trên máy vẫn còn.' })
  }

  const onErase = () =>
    run(async () => {
      const r = await eraseServerCopy()
      setConfirm(null)
      setReveal(false)
      setMsg(r.ok ? { kind: 'ok', text: 'Đã xoá dữ liệu trên máy chủ và tắt đồng bộ. Dữ liệu trên máy này vẫn còn.' } : { kind: 'err', text: r.message })
    })

  const statusText =
    st.phase === 'syncing'
      ? 'Đang đồng bộ…'
      : st.lastSyncAt
        ? `Đồng bộ lần cuối: ${new Date(st.lastSyncAt).toLocaleString('vi-VN')}`
        : 'Chưa đồng bộ lần nào'

  return (
    <section className="bk-section sy-section" aria-label="Đồng bộ giữa các thiết bị">
      <h3 className="sy-title">Đồng bộ giữa các thiết bị</h3>

      {!st.enabled && (
        <>
          {PRIVACY}
          {!secure && <p className="bk-meta sy-warn">Đồng bộ cần kết nối an toàn (https hoặc localhost). Hãy mở ứng dụng bằng địa chỉ https để dùng tính năng này.</p>}
          {!joining ? (
            <span className="bk-actions">
              <button type="button" className="pm-btn bk-primary" disabled={busy || !secure} onClick={onCreate}>
                {busy ? 'Đang tạo…' : 'Tạo mã đồng bộ mới'}
              </button>
              <button type="button" className="pm-btn" disabled={busy || !secure} onClick={() => { setJoining(true); setMsg(null) }}>
                Nhập mã từ thiết bị khác
              </button>
            </span>
          ) : (
            <form className="sy-join" onSubmit={onJoin}>
              <label className="sy-label" htmlFor="sy-code-input">Mã đồng bộ</label>
              <input
                id="sy-code-input"
                className="sy-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                aria-describedby="sy-msg"
              />
              <span className="bk-actions">
                <button type="submit" className="pm-btn bk-primary" disabled={busy || !input.trim()}>
                  {busy ? 'Đang kết nối…' : 'Kết nối'}
                </button>
                <button type="button" className="pm-btn pm-btn-ghost" disabled={busy} onClick={() => { setJoining(false); setInput(''); setMsg(null) }}>
                  Huỷ
                </button>
              </span>
              <p className="bk-meta">Dữ liệu trên máy này sẽ được gộp với dữ liệu của thiết bị kia, không bên nào bị mất.</p>
            </form>
          )}
        </>
      )}

      {st.enabled && code && (
        <>
          <div className="sy-codebox">
            <span className="sy-label" id="sy-code-label">Mã đồng bộ của bạn</span>
            <div className="sy-coderow">
              <code className="sy-code" aria-labelledby="sy-code-label">{reveal ? formatCode(code) : maskCode(code)}</code>
              <span className="sy-code-actions">
                <button type="button" className="pm-btn" onClick={() => setReveal((v) => !v)} aria-pressed={reveal}>
                  {reveal ? <EyeOff size={14} /> : <Eye size={14} />} {reveal ? 'Ẩn mã' : 'Hiện mã'}
                </button>
                <button type="button" className="pm-btn" onClick={onCopy}>
                  <Copy size={14} /> Sao chép
                </button>
              </span>
            </div>
            <p className="bk-meta">Ai có mã này đều xem và sửa được dữ liệu học của bạn, đừng chia sẻ. Mất mã thì không khôi phục được.</p>
          </div>

          <p className={`sy-status${st.phase === 'error' || st.phase === 'gone' ? ' sy-status-err' : ''}`} role="status" aria-live="polite">
            {statusText}
            {st.message && st.phase !== 'syncing' && <span className="sy-status-msg"> {st.message}</span>}
          </p>

          {confirm === null && (
            <span className="bk-actions">
              <button type="button" className="pm-btn bk-primary" disabled={busy || st.phase === 'syncing'} onClick={onNow}>
                <RefreshCw size={14} className={st.phase === 'syncing' ? 'sy-spin' : undefined} /> Đồng bộ ngay
              </button>
              {st.phase === 'gone' && (
                <button type="button" className="pm-btn" disabled={busy} onClick={() => run(async () => void (await reuploadAfterGone()))}>
                  Tải lại dữ liệu máy này lên
                </button>
              )}
              <button type="button" className="pm-btn" disabled={busy} onClick={() => setConfirm('off')}>
                Tắt đồng bộ trên máy này
              </button>
              <button type="button" className="pm-btn" disabled={busy} onClick={() => setConfirm('erase')}>
                Xoá dữ liệu trên máy chủ
              </button>
            </span>
          )}

          {confirm === 'off' && (
            <div className="bk-confirm" role="alertdialog" aria-label="Xác nhận tắt đồng bộ">
              <span>Mã sẽ bị xoá khỏi máy này. Muốn bật lại, bạn cần nhập mã từ thiết bị khác, nên hãy chắc chắn đã lưu mã. Dữ liệu trên máy này và trên máy chủ vẫn giữ nguyên.</span>
              <span className="bk-actions">
                <button type="button" className="pm-btn" autoFocus onClick={() => setConfirm(null)}>Hủy</button>
                <button type="button" className="pm-btn pm-btn-danger" onClick={onOff}>Tắt đồng bộ</button>
              </span>
            </div>
          )}

          {confirm === 'erase' && (
            <div className="bk-confirm" role="alertdialog" aria-label="Xác nhận xoá dữ liệu trên máy chủ">
              <span>Bản đồng bộ trên máy chủ sẽ bị xoá vĩnh viễn và mọi thiết bị đang dùng mã này sẽ ngừng đồng bộ. Dữ liệu học ngay trên các thiết bị vẫn còn. Không hoàn tác được.</span>
              <span className="bk-actions">
                <button type="button" className="pm-btn" autoFocus onClick={() => setConfirm(null)}>Hủy</button>
                <button type="button" className="pm-btn pm-btn-danger" disabled={busy} onClick={onErase}>{busy ? 'Đang xoá…' : 'Xoá trên máy chủ'}</button>
              </span>
            </div>
          )}
        </>
      )}

      <div id="sy-msg" className={`bk-msg sy-msg${msg?.kind === 'err' ? ' bk-msg-err' : ''}`} role="status" aria-live="polite">
        {msg?.text}
      </div>
    </section>
  )
}
