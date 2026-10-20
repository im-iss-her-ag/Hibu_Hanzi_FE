import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@fontsource/noto-serif-sc/chinese-simplified-700.css'
import '../style.css'
import './widget.css'
import { DesktopWidget } from './DesktopWidget'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity, retry: 1 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <DesktopWidget />
    </QueryClientProvider>
  </StrictMode>,
)
