import { lazy, StrictMode, Suspense } from 'react'
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

// The review page is its own chunk, fetched only on /admin, so learners never download it.
const AdminApp = lazy(() => import('./admin/AdminApp'))
const isAdmin = window.location.pathname.replace(/\/+$/, '') === '/admin'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {isAdmin ? (
        <Suspense fallback={null}>
          <AdminApp />
        </Suspense>
      ) : (
        <App />
      )}
    </QueryClientProvider>
  </StrictMode>,
)
