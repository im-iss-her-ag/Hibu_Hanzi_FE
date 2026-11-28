import { getLearnData, markBackedUp, normalize, replaceLearnData } from './srs'
import type { LearnData, RevlogEntry, SrsCard } from './srs'
import { mergeSnapshots, snapshotOf } from './merge'
import { getDaily, mergeDaily, normalizeDaily, replaceDaily } from './daily'
import type { DailyData } from './daily'

export const SETTING_KEYS = ['hibu_theme', 'hibu_display_mode', 'hibu_rail_collapsed'] as const
export const SETTINGS_RESTORED_EVENT = 'hibu:settings-restored'

export interface BackupFile {
  app: 'hibu-hanzi'
  version: 1
  exportedAt: number
  srs: { cards: Record<string, SrsCard>; revlog: RevlogEntry[]; newIntroduced: Record<string, number> }
  known: Record<string, number>
  favorites: string[]
  settings: Record<string, string>
  /** "Học hôm nay" store (hibu_daily_v1). Optional: older files lack it and older builds ignore it. */
  daily?: DailyData
}

function readSettings(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of SETTING_KEYS) {
    try {
      const v = localStorage.getItem(k)
      if (v !== null) out[k] = v
    } catch {
      /* ignore */
    }
  }
  return out
}

export function buildBackup(favorites: string[]): BackupFile {
  const d = getLearnData()
  return {
    app: 'hibu-hanzi',
    version: 1,
    exportedAt: Date.now(),
    srs: { cards: d.cards, revlog: d.revlog, newIntroduced: d.newIntroduced },
    known: d.known,
    favorites: [...favorites],
    settings: readSettings(),
    daily: getDaily(),
  }
}

export function downloadBackup(favorites: string[]) {
  const file = buildBackup(favorites)
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const d = new Date()
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  a.href = url
  a.download = `hibu-hanzi-backup-${ymd}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  markBackedUp()
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

export const MAX_BACKUP_BYTES = 10 * 1024 * 1024
const MAX_T = 1e13
const okNum = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi
const badKey = (o: Record<string, unknown>) => Object.keys(o).includes('__proto__')
/** Card keys are one character or a short word: non-empty, at most 16 code points, no control characters. */
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/
const MAX_KEY_POINTS = 16
const okCardKey = (k: string) => k !== '' && k !== '__proto__' && Array.from(k).length <= MAX_KEY_POINTS && !CONTROL.test(k)

export function parseBackup(text: string): BackupFile {
  if (typeof text !== 'string' || text.length > MAX_BACKUP_BYTES) throw new Error('File sao lưu quá lớn.')
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('File không phải JSON hợp lệ.')
  }
  if (!isObj(raw) || raw.app !== 'hibu-hanzi') throw new Error('Đây không phải file sao lưu của Hibu Hanzi.')
  if (raw.version !== 1) throw new Error('Phiên bản file sao lưu không được hỗ trợ.')
  const srs = raw.srs
  if (!isObj(srs) || !isObj(srs.cards) || !Array.isArray(srs.revlog) || !isObj(srs.newIntroduced))
    throw new Error('Dữ liệu ôn tập trong file bị hỏng.')
  if (!isObj(raw.known)) throw new Error('Danh sách chữ đã thuộc trong file bị hỏng.')
  if (!Array.isArray(raw.favorites) || !raw.favorites.every((f) => typeof f === 'string'))
    throw new Error('Danh sách chữ đã lưu trong file bị hỏng.')
  if (badKey(srs.cards) || badKey(raw.known) || badKey(srs.newIntroduced)) throw new Error('File sao lưu chứa khóa không hợp lệ.')
  for (const [key, c] of Object.entries(srs.cards)) {
    if (
      !okCardKey(key) ||
      !isObj(c) ||
      (c.m != null && !okNum(c.m, 0, MAX_T)) ||
      !okNum(c.due, 0, MAX_T) ||
      !okNum(c.interval, 0, 3650) ||
      !okNum(c.step, -1, 6) || !Number.isInteger(c.step) ||
      (c.lastReview != null && !okNum(c.lastReview, 0, MAX_T)) ||
      (c.reps != null && !okNum(c.reps, 0, 1e6)) ||
      (c.lapses != null && !okNum(c.lapses, 0, 1e6))
    )
      throw new Error('Có thẻ ôn tập không hợp lệ trong file.')
  }
  if (!Object.values(raw.known).every((t) => okNum(t, 0, MAX_T))) throw new Error('Dữ liệu "đã thuộc" trong file bị hỏng.')
  if (!Object.values(srs.newIntroduced).every((n) => okNum(n, 0, 1e4))) throw new Error('Dữ liệu ôn tập trong file bị hỏng.')
  const revlog = (srs.revlog as unknown[]).filter(
    (e): e is RevlogEntry => isObj(e) && typeof e.h === 'string' && okNum(e.t, 0, MAX_T) && (e.g === 1 || e.g === 2),
  )
  if (raw.daily !== undefined && !isObj(raw.daily)) throw new Error('Dữ liệu "Học hôm nay" trong file bị hỏng.')
  const settings: Record<string, string> = {}
  // Only known keys with values the app understands (a stray "hibu_theme": "<script>" is dropped).
  const SETTING_VALUES: Record<string, readonly string[]> = {
    hibu_theme: ['light', 'dark'],
    hibu_display_mode: ['modern', 'components'],
    hibu_rail_collapsed: ['0', '1'],
  }
  if (isObj(raw.settings))
    for (const [k, v] of Object.entries(raw.settings))
      if (typeof v === 'string' && Object.hasOwn(SETTING_VALUES, k) && SETTING_VALUES[k].includes(v)) settings[k] = v
  return {
    app: 'hibu-hanzi',
    version: 1,
    exportedAt: typeof raw.exportedAt === 'number' ? raw.exportedAt : 0,
    srs: {
      cards: srs.cards as Record<string, SrsCard>,
      revlog,
      newIntroduced: srs.newIntroduced as Record<string, number>,
    },
    known: raw.known as Record<string, number>,
    favorites: raw.favorites as string[],
    settings,
    // normalizeDaily keeps only valid goal/track/level/minutes and yyyy-mm-dd counters.
    ...(isObj(raw.daily) ? { daily: normalizeDaily(raw.daily) } : {}),
  }
}

export function applyBackup(file: BackupFile, mode: 'merge' | 'overwrite', currentFavorites: string[]): string[] {
  const local = getLearnData()
  // Re-sanitize regardless of caller: only known fields, valid ranges, no __proto__.
  const keyed = Object.fromEntries(Object.entries(file.srs.cards ?? {}).filter(([k]) => okCardKey(k)))
  const f = normalize({ cards: keyed, known: file.known, revlog: file.srs.revlog, newIntroduced: file.srs.newIntroduced })
  file = { ...file, srs: { cards: f.cards, revlog: f.revlog, newIntroduced: f.newIntroduced }, known: f.known }
  const favs = [...new Set((file.favorites ?? []).filter((x): x is string => typeof x === 'string'))]
  if (mode === 'overwrite') {
    const next: LearnData = normalize({
      version: 1,
      cards: file.srs.cards,
      known: file.known,
      revlog: file.srs.revlog,
      newIntroduced: file.srs.newIntroduced,
      lastBackup: local.lastBackup,
    })
    replaceLearnData(next)
    if (file.daily) replaceDaily(file.daily)
    for (const [k, v] of Object.entries(file.settings)) {
      if ((SETTING_KEYS as readonly string[]).includes(k)) {
        try {
          localStorage.setItem(k, v)
        } catch {
          /* ignore */
        }
      }
    }
    // The open app holds these in React state: tell it to re-read them (theme, display, rail).
    window.dispatchEvent(new Event(SETTINGS_RESTORED_EVENT))
    return favs
  }

  // File merge and cross-device sync share one semantic (merge.ts): no base, so a union where the
  // newer card (by `m`) wins, known keeps the earliest time, revlog is unioned by (h, t).
  const merged = mergeSnapshots(
    snapshotOf(local, currentFavorites),
    { cards: file.srs.cards, known: file.known, revlog: file.srs.revlog, newIntroduced: file.srs.newIntroduced, favorites: favs },
    null,
  )
  replaceLearnData({
    version: 1,
    cards: merged.cards,
    known: merged.known,
    revlog: merged.revlog,
    newIntroduced: merged.newIntroduced,
    lastBackup: local.lastBackup,
  })
  if (file.daily) replaceDaily(mergeDaily(getDaily(), normalizeDaily(file.daily)))
  return merged.favorites
}

export async function requestPersist(): Promise<boolean | null> {
  try {
    const p = navigator.storage?.persist?.()
    return p ? await p : null
  } catch {
    return null
  }
}
