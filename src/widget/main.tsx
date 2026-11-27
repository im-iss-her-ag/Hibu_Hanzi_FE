import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// Self-hosted fonts, same set as the main app
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
import '../styles/tokens.css'
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
