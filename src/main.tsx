import { Component, lazy, StrictMode, Suspense, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
// Self-hosted Chinese fonts: Google Fonts may be blocked on some networks
import '@fontsource/ma-shan-zheng/chinese-simplified-400.css'
import '@fontsource/noto-serif-sc/chinese-simplified-400.css'
import '@fontsource/noto-serif-sc/chinese-simplified-700.css'
import '@fontsource/be-vietnam-pro/vietnamese-400.css'
import '@fontsource/be-vietnam-pro/vietnamese-500.css'
import '@fontsource/be-vietnam-pro/vietnamese-600.css'
import '@fontsource/be-vietnam-pro/latin-400.css'
import '@fontsource/be-vietnam-pro/latin-500.css'
import '@fontsource/be-vietnam-pro/latin-600.css'
import '@fontsource/noto-serif/vietnamese-500.css'
import '@fontsource/noto-serif/latin-500.css'
import '@fontsource/noto-serif/vietnamese-700.css'
import '@fontsource/noto-serif/latin-700.css'
import './style.css'
import './styles/tokens.css'
import './styles/shell.css'
import './styles/study.css'
import './styles/anatomy.css'
import './styles/library.css'
import './styles/reference.css'
import './styles/learn-known.css'
import './styles/learn-review.css'
import './styles/learn-backup.css'
import './styles/learn.css'
import './styles/homophones.css'

// Dictionary data changes rarely, so cached answers stay fresh for the whole session.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity, retry: 1 } },
})

// Last line of defence: a render crash (bad server payload, corrupt storage) shows a way out
// instead of a blank page.
class CrashBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error) {
    console.error('[Hibu] render crash', error)
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" style={{ minHeight: '100vh', display: 'grid', placeContent: 'center', gap: 12, padding: 16, textAlign: 'center', background: 'var(--paper)', color: 'var(--ink)' }}>
        <p style={{ margin: 0, fontSize: 16 }}>Đã có lỗi khi hiển thị trang.</p>
        <p style={{ margin: 0, fontSize: 12.5, opacity: 0.7 }}>{this.state.error.message}</p>
        <button type="button" style={{ minHeight: 44, padding: '0 20px', justifySelf: 'center' }} onClick={() => window.location.reload()}>
          Tải lại trang
        </button>
      </div>
    )
  }
}

// The review page is its own chunk, fetched only on /admin, so learners never download it.
const AdminApp = lazy(() => import('./admin/AdminApp'))
const isAdmin = window.location.pathname.replace(/\/+$/, '') === '/admin'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CrashBoundary>
      <QueryClientProvider client={queryClient}>
        {isAdmin ? (
          <Suspense fallback={null}>
            <AdminApp />
          </Suspense>
        ) : (
          <App />
        )}
      </QueryClientProvider>
    </CrashBoundary>
  </StrictMode>,
)
