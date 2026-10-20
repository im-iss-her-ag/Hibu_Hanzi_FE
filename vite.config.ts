import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // widget.html is the desktop widget's page (see desktop/); it ships with the web build too.
      input: { main: 'index.html', widget: 'widget.html' },
    },
  },
  server: {
    // Dev only: /api/* goes to the local server, so no CORS setup is needed.
    proxy: {
      '/api': { target: 'http://localhost:3000', rewrite: (path) => path.replace(/^\/api/, '') },
    },
  },
})
