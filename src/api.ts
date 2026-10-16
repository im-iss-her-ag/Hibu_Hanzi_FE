import { createApi } from './core'

// VITE_API_URL points at the deployed API; in dev the Vite proxy serves it under /api.
export const api = createApi(import.meta.env.VITE_API_URL ?? '/api')
