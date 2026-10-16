// Client for BE/src/admin.ts. Lives under src/admin so it is only in the lazily loaded chunk.

export type Std = 'hsk2' | 'hsk3'
export type Kind = 'characters' | 'words'
export type StatusFilter = 'draft' | 'reviewed' | 'all'
export type RowStatus = 'draft' | 'reviewed'
export type ChietTuType = 'mnemonic' | 'etymology'

export interface AdminReading {
  pinyin: string
  hanViet: string | null
  meaningVi: string | null
  isPrimary: boolean
}

export interface AdminPart {
  part: string
  hanViet: string | null
  meaningVi: string | null
  resolved: boolean
}

export interface AdminCharacter {
  id: number
  hanzi: string
  traditional: string | null
  radical: string | null
  chietTu: string | null
  chietTuType: ChietTuType | null
  strokeCount: number | null
  hsk2Level: number | null
  hsk3Level: number | null
  status: RowStatus
  radicalInfo: { nameVi: string | null; hanViet: string | null; meaningVi: string | null } | null
  readings: AdminReading[]
  parts: AdminPart[]
}

export interface AdminWord {
  id: number
  word: string
  traditional: string | null
  pinyin: string
  hanViet: string | null
  meaningVi: string | null
  hsk2Level: number | null
  hsk3Level: number | null
  status: RowStatus
  characters: { hanzi: string; pinyin: string | null; hanViet: string | null; meaningVi: string | null }[]
}

export interface CharacterInput {
  traditional: string | null
  radical: string | null
  strokeCount: number | null
  chietTu: string | null
  chietTuType: ChietTuType | null
  readings: AdminReading[]
  parts: string[]
}

export interface WordInput {
  traditional: string | null
  pinyin: string
  hanViet: string | null
  meaningVi: string | null
}

export interface LevelStat {
  level: number
  total: number
  reviewed: number
}

export interface Filters {
  kind: Kind
  std: Std
  level: number
  status: StatusFilter
  q: string
  page: number
}

export const PAGE_SIZE = 30

const BASE = import.meta.env.VITE_API_URL ?? '/api'
const TOKEN_KEY = 'hibu-admin-token'

// localStorage can throw (private mode, blocked storage); the page then just asks again.
export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      // keep working for this session only
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      // nothing stored
    }
  },
}

export class AdminError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function call<T>(path: string, init?: RequestInit, token = tokenStore.get()): Promise<T> {
  const res = await fetch(`${BASE}/admin${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token ?? ''}` },
  })
  const body = (await res.json().catch(() => null)) as { error?: string } | null
  if (!res.ok) throw new AdminError(res.status, body?.error ?? res.statusText)
  return body as T
}

export const adminApi = {
  stats: (std: Std, token?: string) =>
    call<{ characters: LevelStat[]; words: LevelStat[] }>(`/stats?std=${std}`, undefined, token),

  list: <T>(f: Filters) => {
    const params = new URLSearchParams({
      std: f.std,
      level: String(f.level),
      status: f.status,
      q: f.q,
      limit: String(PAGE_SIZE),
      offset: String(f.page * PAGE_SIZE),
    })
    return call<{ total: number; items: T[] }>(`/${f.kind}?${params}`)
  },

  saveCharacter: (id: number, input: CharacterInput) =>
    call<AdminCharacter>(`/characters/${id}`, { method: 'PUT', body: JSON.stringify(input) }),

  saveWord: (id: number, input: WordInput) =>
    call<AdminWord>(`/words/${id}`, { method: 'PUT', body: JSON.stringify(input) }),

  review: (kind: Kind, ids: number[], status: RowStatus) =>
    call<{ changed: number[]; refused: number[] }>(`/${kind}/review`, {
      method: 'POST',
      body: JSON.stringify({ ids, status }),
    }),
}

// Same rules the server applies before a row may become 'reviewed', so the page can say
// what is missing instead of failing silently.
export function characterProblems(c: AdminCharacter): string[] {
  const out: string[] = []
  const primary = c.readings.find((r) => r.isPrimary)
  if (!primary) out.push('Chưa có âm chính')
  else {
    if (!primary.hanViet) out.push('Âm chính thiếu Hán Việt')
    if (!primary.meaningVi) out.push('Âm chính thiếu nghĩa')
  }
  if (!c.radical) out.push('Thiếu bộ thủ')
  if (c.parts.some((p) => !p.resolved)) out.push('Có thành phần không tra được')
  return out
}

export function wordProblems(w: AdminWord): string[] {
  const out: string[] = []
  if (!w.meaningVi) out.push('Thiếu nghĩa')
  if (!w.hanViet) out.push('Thiếu Hán Việt')
  if (w.characters.some((c) => !c.pinyin)) out.push('Có chữ chưa có âm đọc')
  return out
}
