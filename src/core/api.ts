import type { Bundle, CharacterDetail, WordDetail } from './types'
import { getLocalBundle, getLocalCharacterDetail, getLocalWordDetail } from './data/localStore'

// Client for the API in DESIGN.md §6.
// If backend is unavailable (or deployed on static hosts like Cloudflare Pages),
// it seamlessly falls back to the local bundled dataset.

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function createApi(baseUrl?: string) {
  const url = baseUrl?.trim()

  async function get<T>(path: string): Promise<T> {
    if (!url) {
      throw new Error('No base URL provided')
    }
    // A server that accepts the connection but never answers would otherwise leave the app on the
    // placeholder sample forever (no error -> no offline flag -> no retry). Time out waiting for the
    // response headers only, so a slow but progressing bundle download is never cut off.
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 12_000)
    let res: Response
    try {
      res = await fetch(`${url}${path}`, { signal: ctrl.signal })
    } finally {
      clearTimeout(timer)
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      throw new ApiError(res.status, body?.error ?? res.statusText)
    }
    return res.json() as Promise<T>
  }

  return {
    getVersion: async (): Promise<{ version: string }> => {
      try {
        if (url) return await get<{ version: string }>('/version')
      } catch {
        // ignore and fallback
      }
      return { version: '1.0.0-static' }
    },

    getBundle: async (since?: string): Promise<Bundle> => {
      try {
        if (url) return await get<Bundle>(since ? `/bundle?since=${since}` : '/bundle')
      } catch {
        // ignore and fallback
      }
      return { ...getLocalBundle(), offline: true }
    },

    getCharacter: async (hanzi: string): Promise<CharacterDetail> => {
      try {
        if (url) return await get<CharacterDetail>(`/characters/${encodeURIComponent(hanzi)}`)
      } catch {
        // ignore and fallback
      }
      const local = getLocalCharacterDetail(hanzi)
      if (!local) throw new ApiError(404, 'not_found')
      return local
    },

    getWord: async (word: string): Promise<WordDetail> => {
      try {
        if (url) return await get<WordDetail>(`/words/${encodeURIComponent(word)}`)
      } catch {
        // ignore and fallback
      }
      const local = getLocalWordDetail(word)
      if (!local) throw new ApiError(404, 'not_found')
      return local
    },
  }
}

export type Api = ReturnType<typeof createApi>
