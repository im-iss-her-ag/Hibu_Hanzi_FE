import { LogOut } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AdminError, adminApi, tokenStore } from './api'
import { FilterBar } from './FilterBar'
import { ReviewList } from './ReviewList'
import { useFilters } from './useFilters'
import './admin.css'

// Entry for /admin, loaded lazily from main.tsx so learners never download it.
export default function AdminApp() {
  const [signedIn, setSignedIn] = useState(() => Boolean(tokenStore.get()))

  if (!signedIn) return <TokenGate onSignedIn={() => setSignedIn(true)} />
  return (
    <AdminShell
      onSignOut={() => {
        tokenStore.clear()
        setSignedIn(false)
      }}
    />
  )
}

function AdminShell({ onSignOut }: { onSignOut: () => void }) {
  const [filters, update] = useFilters()

  return (
    <div className="adm">
      <header className="adm-header">
        <div>
          <h1>Duyệt dữ liệu</h1>
          <p className="adm-muted adm-small">Đọc kỹ, đúng thì duyệt; sai thì sửa ngay tại chỗ. Chỉ dòng đã duyệt mới hiện trên app.</p>
        </div>
        <button type="button" className="adm-btn adm-btn-quiet" onClick={onSignOut}>
          <LogOut size={14} aria-hidden /> Thoát
        </button>
      </header>
      <FilterBar filters={filters} onChange={update} />
      <main>
        <ReviewList filters={filters} onPage={(page) => update({ page })} onUnauthorized={onSignOut} />
      </main>
    </div>
  )
}

function TokenGate({ onSignedIn }: { onSignedIn: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setChecking(true)
    setError(null)
    try {
      await adminApi.stats('hsk3', value.trim())
      tokenStore.set(value.trim())
      onSignedIn()
    } catch (err) {
      setError(
        err instanceof AdminError && err.status === 401
          ? 'Mã không đúng.'
          : err instanceof AdminError && err.status === 503
            ? 'Server chưa bật trang quản trị (thiếu ADMIN_TOKEN trong BE/.env).'
            : 'Không kết nối được server.',
      )
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="adm adm-gate">
      <form onSubmit={submit} className="adm-gate-form">
        <h1>Duyệt dữ liệu</h1>
        <label>
          Mã quản trị
          <input type="password" value={value} onChange={(e) => setValue(e.target.value)} autoFocus autoComplete="current-password" />
        </label>
        {error && (
          <p className="adm-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="adm-btn adm-btn-primary" disabled={!value.trim() || checking}>
          {checking ? 'Đang kiểm tra…' : 'Vào'}
        </button>
      </form>
    </div>
  )
}
