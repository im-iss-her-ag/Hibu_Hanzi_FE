import type { HskLevel, LevelFilter } from '../core'

export interface RouteState {
  hanzi: string | null
  level: LevelFilter | null
  word: string | null
}

/**
 * Parse character and level from the current URL (?c=...&level=..., or /c/<hanzi> fallback).
 */
export function parseRouteFromUrl(): RouteState {
  if (typeof window === 'undefined') return { hanzi: null, level: null, word: null }

  const params = new URLSearchParams(window.location.search)
  let hanzi = params.get('c')?.trim() || params.get('hanzi')?.trim() || null

  // Support clean path fallback like /c/爱 or /hanzi/爱
  if (!hanzi) {
    const pathMatch = window.location.pathname.match(/^\/(?:c|hanzi)\/([^/]+)\/?$/)
    if (pathMatch?.[1]) {
      try {
        hanzi = decodeURIComponent(pathMatch[1]).trim() || null
      } catch {
        hanzi = null
      }
    }
  }

  const rawLevel = params.get('level')?.trim() ?? null
  let level: LevelFilter | null = null
  if (rawLevel === 'radicals') {
    level = 'radicals'
  } else if (rawLevel) {
    const parsed = parseInt(rawLevel, 10)
    if (parsed >= 1 && parsed <= 6) {
      level = parsed as HskLevel
    }
  }

  const word = params.get('w')?.trim() || null

  return { hanzi, level, word }
}

/**
 * Build a shareable relative URL preserving the current pathname root (works in dev, SPA, and Electron).
 */
export function buildCharacterUrl(hanzi: string | null, level: LevelFilter, word?: string | null): string {
  const params = new URLSearchParams()
  // Flags that are not part of the character route survive navigation: ?mode=review (an open
  // review session, so reload resumes it) and ?voicemock=1 (dev/QA voice mock).
  if (typeof window !== 'undefined') {
    const current = new URLSearchParams(window.location.search)
    for (const key of ['mode', 'view', 'voicemock', 'mocktone']) {
      const v = current.get(key)
      if (v !== null) params.set(key, v)
    }
  }
  if (hanzi) {
    params.set('c', hanzi)
  }
  params.set('level', String(level))
  if (word) params.set('w', word)

  const basePath =
    typeof window !== 'undefined' && /^\/(?:c|hanzi)\//.test(window.location.pathname)
      ? '/'
      : typeof window !== 'undefined'
        ? window.location.pathname
        : '/'

  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

export function getSavedLevelFallback(): LevelFilter {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('hibu_hsk_level')
    if (saved === 'radicals') return 'radicals'
    if (saved !== null) {
      const parsed = parseInt(saved, 10)
      if (parsed >= 1 && parsed <= 6) return parsed as HskLevel
    }
  }
  return 1
}
