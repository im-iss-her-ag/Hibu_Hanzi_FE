import { useSyncExternalStore } from 'react'

/**
 * Local-only learning state: "đã thuộc" set + a tiny fixed-ladder SRS.
 * Stored in localStorage "hibu_srs_v1" (versioned). No account, no network.
 */

export const SRS_KEY = 'hibu_srs_v1'
export const LADDER_DAYS = [1, 3, 7, 14, 30, 90, 180] as const
export const NEW_PER_DAY = 10
export const LEECH_LAPSES = 8
/** Marking a character known schedules a long check instead of never reviewing it again. */
export const KNOWN_START_STEP = 4 // 30 days
const DAY = 86_400_000

export type CardState = 'new' | 'review'

export interface SrsCard {
  state: CardState
  /** epoch ms */
  due: number
  /** days */
  interval: number
  /** index into LADDER_DAYS (-1 = not reviewed yet) */
  step: number
  reps: number
  lapses: number
  /** epoch ms, null if never reviewed */
  lastReview: number | null
  added: number
}

export interface RevlogEntry {
  h: string
  t: number
  /** 1 = Quên, 2 = Nhớ */
  g: 1 | 2
  i: number
}

export interface LearnData {
  version: 1
  cards: Record<string, SrsCard>
  /** hanzi -> epoch ms when marked known */
  known: Record<string, number>
  revlog: RevlogEntry[]
  /** yyyy-mm-dd -> number of new cards introduced that day */
  newIntroduced: Record<string, number>
  lastBackup: number | null
}

const REVLOG_MAX = 2000

function empty(): LearnData {
  return { version: 1, cards: {}, known: {}, revlog: [], newIntroduced: {}, lastBackup: null }
}

const MAX_T = 1e13 // ~year 2286; rejects absurd timestamps
const isRec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const num = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null
const int = (v: unknown, lo: number, hi: number): number | null => {
  const n = num(v, lo, hi)
  return n === null ? null : Math.trunc(n)
}

/** Repair a possibly corrupt card; null if it is not an object. */
function sanitizeCard(c: unknown, now: number): SrsCard | null {
  if (!isRec(c)) return null
  const step = int(c.step, -1, LADDER_DAYS.length - 1) ?? -1
  const state: CardState = c.state === 'new' || c.state === 'review' ? c.state : step >= 0 ? 'review' : 'new'
  return {
    state,
    step,
    interval: num(c.interval, 0, 3650) ?? (step >= 0 ? LADDER_DAYS[step] : 0),
    due: num(c.due, 0, MAX_T) ?? now,
    reps: int(c.reps, 0, 1e6) ?? 0,
    lapses: int(c.lapses, 0, 1e6) ?? 0,
    lastReview: num(c.lastReview, 0, MAX_T),
    added: num(c.added, 0, MAX_T) ?? now,
  }
}

export function normalize(raw: unknown): LearnData {
  const d = empty()
  if (!isRec(raw)) return d
  const now = Date.now()
  if (isRec(raw.cards)) {
    for (const [h, c] of Object.entries(raw.cards)) {
      if (h === '__proto__') continue
      const sc = sanitizeCard(c, now)
      if (sc) d.cards[h] = sc
    }
  }
  if (isRec(raw.known)) {
    for (const [h, t] of Object.entries(raw.known)) {
      const n = num(t, 0, MAX_T)
      if (h !== '__proto__' && n !== null) d.known[h] = n
    }
  }
  if (Array.isArray(raw.revlog)) {
    d.revlog = raw.revlog
      .filter(
        (e): e is RevlogEntry =>
          isRec(e) && typeof e.h === 'string' && num(e.t, 0, MAX_T) !== null && (e.g === 1 || e.g === 2) && typeof e.i === 'number',
      )
      .slice(-REVLOG_MAX)
  }
  if (isRec(raw.newIntroduced)) {
    for (const [k, n] of Object.entries(raw.newIntroduced)) {
      const v = int(n, 0, 1e4)
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v !== null) d.newIntroduced[k] = v
    }
  }
  if (num(raw.lastBackup, 0, MAX_T) !== null) d.lastBackup = raw.lastBackup as number
  return d
}

function load(): LearnData {
  let s: string | null = null
  try {
    s = localStorage.getItem(SRS_KEY)
    if (!s) return empty()
    const parsed: unknown = JSON.parse(s)
    // Future/unknown schema: keep a copy so a later commit cannot silently destroy it.
    if (isRec(parsed) && parsed.version !== 1) stash(s, '_unsupported')
    return normalize(parsed)
  } catch {
    if (s) stash(s, '_corrupt')
    return empty()
  }
}
function stash(raw: string, suffix: string) {
  try {
    localStorage.setItem(SRS_KEY + suffix, raw)
  } catch {
    /* ignore */
  }
}

let data: LearnData = typeof window === 'undefined' ? empty() : load()
const listeners = new Set<() => void>()

function commit(next: LearnData) {
  data = next
  try {
    localStorage.setItem(SRS_KEY, JSON.stringify(next))
  } catch {
    /* quota / private mode: keep in memory */
  }
  listeners.forEach((l) => l())
}

if (typeof window !== 'undefined') {
  // Keep tabs in sync.
  window.addEventListener('storage', (e) => {
    if (e.key === SRS_KEY || e.key === null) {
      data = load()
      listeners.forEach((l) => l())
    }
  })
}

export function getLearnData(): LearnData {
  return data
}
export function replaceLearnData(next: LearnData) {
  commit(normalize(next))
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}
/** React hook: re-renders on any learn-state change. */
export function useLearnData(): LearnData {
  return useSyncExternalStore(subscribe, getLearnData, getLearnData)
}

export function dayKey(t = Date.now()): string {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function endOfToday(now = Date.now()): number {
  const d = new Date(now)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

// ---------- known ----------

export function isKnown(h: string, d = data) {
  return h in d.known
}

export function setKnown(hanzi: string[], known: boolean) {
  const now = Date.now()
  const next: LearnData = { ...data, known: { ...data.known }, cards: { ...data.cards } }
  for (const h of hanzi) {
    if (known) {
      if (h in next.known) continue
      next.known[h] = now
      const c = next.cards[h]
      // Schedule a long-interval check; never shorten an already longer interval.
      const step = Math.max(KNOWN_START_STEP, c?.step ?? -1)
      const interval = LADDER_DAYS[step]
      if (!c || c.state === 'new' || c.interval < interval) {
        next.cards[h] = {
          state: 'review',
          step,
          interval,
          due: now + interval * DAY,
          reps: c?.reps ?? 0,
          lapses: c?.lapses ?? 0,
          lastReview: c?.lastReview ?? null,
          added: c?.added ?? now,
        }
      }
    } else {
      delete next.known[h]
    }
  }
  commit(next)
}

export function toggleKnown(h: string) {
  setKnown([h], !isKnown(h))
}

/** Restore exact previous known/cards entries for undo of a bulk action. */
export function snapshotFor(hanzi: string[]) {
  const known: Record<string, number | undefined> = {}
  const cards: Record<string, SrsCard | undefined> = {}
  for (const h of hanzi) {
    known[h] = data.known[h]
    cards[h] = data.cards[h]
  }
  return { known, cards }
}
export function restoreSnapshot(s: ReturnType<typeof snapshotFor>) {
  const next: LearnData = { ...data, known: { ...data.known }, cards: { ...data.cards } }
  for (const h of Object.keys(s.known)) {
    if (s.known[h] === undefined) delete next.known[h]
    else next.known[h] = s.known[h]!
    if (s.cards[h] === undefined) delete next.cards[h]
    else next.cards[h] = s.cards[h]!
  }
  commit(next)
}

// ---------- srs ----------

export function isInReview(h: string, d = data) {
  return h in d.cards
}

export function addToReview(h: string) {
  if (data.cards[h]) return
  const now = Date.now()
  commit({
    ...data,
    cards: { ...data.cards, [h]: { state: 'new', due: now, interval: 0, step: -1, reps: 0, lapses: 0, lastReview: null, added: now } },
  })
}

export function removeFromReview(h: string) {
  if (!data.cards[h]) return
  const cards = { ...data.cards }
  delete cards[h]
  commit({ ...data, cards })
}

export function isLeech(c: SrsCard | undefined) {
  return !!c && c.lapses >= LEECH_LAPSES
}

/** Pure scheduler: next card state after a grade. */
export function schedule(c: SrsCard, grade: 1 | 2, now = Date.now()): SrsCard {
  const base = { ...c, reps: c.reps + 1, lastReview: now }
  if (grade === 2) {
    const step = Math.min(c.step + 1, LADDER_DAYS.length - 1)
    const interval = LADDER_DAYS[step]
    return { ...base, state: 'review', step, interval, due: now + interval * DAY }
  }
  if (c.state === 'new') {
    // Not learned yet: show again in this session/today.
    return { ...base, step: -1, interval: 0, due: now + 10 * 60_000 }
  }
  // Lapse: drop back two rungs and re-check tomorrow.
  return { ...base, step: Math.max(-1, c.step - 2), interval: 1, due: now + DAY, lapses: c.lapses + 1 }
}

export function grade(h: string, g: 1 | 2) {
  const c = data.cards[h]
  if (!c) return
  const now = Date.now()
  const wasNew = c.state === 'new' && c.reps === 0
  const next = schedule(c, g, now)
  const today = dayKey(now)
  const newIntroduced = wasNew ? { ...data.newIntroduced, [today]: (data.newIntroduced[today] ?? 0) + 1 } : data.newIntroduced
  // Keep only recent day counters.
  for (const k of Object.keys(newIntroduced)) if (k < dayKey(now - 7 * DAY)) delete newIntroduced[k]
  commit({
    ...data,
    cards: { ...data.cards, [h]: next },
    newIntroduced,
    revlog: [...data.revlog, { h, t: now, g, i: next.interval }].slice(-REVLOG_MAX),
  })
}

/**
 * Today's queue: overdue/due review cards first (most overdue first), then up to
 * NEW_PER_DAY - introducedToday brand-new cards (oldest added first).
 */
export function buildQueue(d = data, now = Date.now()): string[] {
  const cutoff = endOfToday(now)
  const due: [string, number][] = []
  const fresh: [string, number][] = []
  for (const [h, c] of Object.entries(d.cards)) {
    if (c.state === 'new' && c.reps === 0) fresh.push([h, c.added])
    else if (c.due <= cutoff) due.push([h, c.due])
  }
  due.sort((a, b) => a[1] - b[1])
  fresh.sort((a, b) => a[1] - b[1])
  const room = Math.max(0, NEW_PER_DAY - (d.newIntroduced[dayKey(now)] ?? 0))
  return [...due.map((x) => x[0]), ...fresh.slice(0, room).map((x) => x[0])]
}

/** Cards actually due right now (due <= now) plus today's remaining new-card allowance. */
export function dueCount(d = data, now = Date.now()) {
  let n = 0
  let fresh = 0
  for (const c of Object.values(d.cards)) {
    if (c.state === 'new' && c.reps === 0) fresh++
    else if (c.due <= now) n++
  }
  const room = Math.max(0, NEW_PER_DAY - (d.newIntroduced[dayKey(now)] ?? 0))
  return n + Math.min(fresh, room)
}

/** Next time something becomes due (for the empty state), or null. */
export function nextDueAt(d = data): number | null {
  let min: number | null = null
  for (const c of Object.values(d.cards)) {
    if (c.state === 'new' && c.reps === 0) continue
    if (!Number.isFinite(c.due)) continue
    if (min === null || c.due < min) min = c.due
  }
  return min
}

export function markBackedUp(t = Date.now()) {
  commit({ ...data, lastBackup: t })
}
