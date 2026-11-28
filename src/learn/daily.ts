import { useEffect, useState, useSyncExternalStore } from 'react'
import type { BundleCharacter, HskLevel } from '../core'
import { frequencyRank } from '../core/data/charFrequency'
import { primaryReading } from '../core/lookup'
import {
  buildQueue,
  dayKey,
  getLearnData,
  introduceCard,
  isWordKey,
  LEECH_LAPSES,
  subscribeLearnData,
  type LearnData,
} from './srs'

/**
 * "Học hôm nay": daily goal, onboarding answers and a per-day activity log (streak, stats).
 * Stored in localStorage "hibu_daily_v1". Everything here is local time (dayKey), offline.
 *
 * Streak rule ("chuỗi ngày học"):
 *  - A day is ACTIVE when the learner graded ≥1 review, learned ≥1 new character in "Học hôm nay",
 *    or marked ≥1 character "Đã thuộc" that day (local calendar day).
 *  - The streak is the number of active days in the current chain. A chain survives ONE missed day
 *    between active days; two missed days in a row end it ("nghỉ 1 ngày không sao, nghỉ 2 ngày liền
 *    thì chuỗi về 0"). Missed days are never counted.
 *  - Today is "pending" until it becomes active: not learning yet today never breaks the streak.
 */

export const DAILY_KEY = 'hibu_daily_v1'
export const GOAL_OPTIONS = [5, 10, 20] as const
export type DailyGoal = (typeof GOAL_OPTIONS)[number]
export type Track = 'hsk' | 'hanviet' | 'lookup'
export const MINUTES_OPTIONS = [5, 10, 20] as const
export type Minutes = (typeof MINUTES_OPTIONS)[number]
/** Minutes per day -> new characters per day (≈1 minute per new character + its reviews). */
export const GOAL_FOR_MINUTES: Record<Minutes, DailyGoal> = { 5: 5, 10: 10, 20: 20 }
const DAYS_MAX = 800

export interface DayActivity {
  /** graded reviews (max of what the revlog has ever shown for that day) */
  r: number
  /** new characters learned through "Học hôm nay" */
  n: number
  /** characters marked "Đã thuộc" */
  k: number
}

export interface DailyData {
  version: 1
  goal: DailyGoal
  track: Track
  /** HSK level new characters are drawn from (track 'hsk' / 'lookup') */
  level: HskLevel
  minutes: Minutes | null
  /** epoch ms when onboarding was finished or skipped; null = never shown */
  onboarded: number | null
  days: Record<string, DayActivity>
  /**
   * epoch ms of the last settings change (goal/track/level/minutes/onboarded). Optional, additive:
   * cross-device sync and backup merge use it so the newest settings win (mergeDaily).
   */
  sm?: number
}

const isRec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const cnt = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(1e5, Math.trunc(v)) : 0)
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

function savedLevel(): HskLevel {
  try {
    const n = parseInt(localStorage.getItem('hibu_hsk_level') ?? '', 10)
    if (n >= 1 && n <= 6) return n as HskLevel
  } catch {
    /* ignore */
  }
  return 1
}

export function emptyDaily(): DailyData {
  return { version: 1, goal: 10, track: 'hsk', level: savedLevel(), minutes: null, onboarded: null, days: {} }
}

/** Repairs anything (old build, hand edit, corrupt JSON already parsed) into a valid DailyData. */
export function normalizeDaily(raw: unknown): DailyData {
  const d = emptyDaily()
  if (!isRec(raw)) return d
  if (GOAL_OPTIONS.includes(raw.goal as DailyGoal)) d.goal = raw.goal as DailyGoal
  if (raw.track === 'hsk' || raw.track === 'hanviet' || raw.track === 'lookup') d.track = raw.track
  if (typeof raw.level === 'number' && raw.level >= 1 && raw.level <= 6 && Number.isInteger(raw.level)) d.level = raw.level as HskLevel
  if (MINUTES_OPTIONS.includes(raw.minutes as Minutes)) d.minutes = raw.minutes as Minutes
  if (typeof raw.onboarded === 'number' && Number.isFinite(raw.onboarded) && raw.onboarded > 0) d.onboarded = raw.onboarded
  if (typeof raw.sm === 'number' && Number.isFinite(raw.sm) && raw.sm > 0 && raw.sm < 1e13) d.sm = raw.sm
  if (isRec(raw.days)) {
    const keys = Object.keys(raw.days).filter((k) => DAY_RE.test(k)).sort().slice(-DAYS_MAX)
    for (const k of keys) {
      const a = (raw.days as Record<string, unknown>)[k]
      if (!isRec(a)) continue
      const v = { r: cnt(a.r), n: cnt(a.n), k: cnt(a.k) }
      if (v.r || v.n || v.k) d.days[k] = v
    }
  }
  return d
}

function loadDaily(): DailyData {
  let s: string | null = null
  try {
    s = localStorage.getItem(DAILY_KEY)
    if (!s) return emptyDaily()
    return normalizeDaily(JSON.parse(s))
  } catch {
    try {
      if (s) localStorage.setItem(DAILY_KEY + '_corrupt', s)
    } catch {
      /* ignore */
    }
    return emptyDaily()
  }
}

let daily: DailyData = typeof window === 'undefined' ? emptyDaily() : loadDaily()
const listeners = new Set<() => void>()

function commitDaily(next: DailyData) {
  daily = next
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(next))
  } catch {
    /* quota / private mode: keep in memory */
  }
  listeners.forEach((l) => l())
}

/**
 * Fold what the SRS store knows (revlog per day, known-marks per day) into the activity log. The
 * revlog is capped (oldest entries dropped), so each day keeps the MAX count ever seen; the log
 * therefore outlives the revlog and the streak survives the cap.
 */
export function mergeActivity(d: DailyData, learn: LearnData): DailyData {
  const r: Record<string, number> = {}
  for (const e of learn.revlog) {
    const k = dayKey(e.t)
    r[k] = (r[k] ?? 0) + 1
  }
  const kn: Record<string, number> = {}
  for (const t of Object.values(learn.known)) {
    const k = dayKey(t)
    kn[k] = (kn[k] ?? 0) + 1
  }
  let changed = false
  const days = { ...d.days }
  for (const k of new Set([...Object.keys(r), ...Object.keys(kn)])) {
    const cur = days[k] ?? { r: 0, n: 0, k: 0 }
    const nr = Math.max(cur.r, r[k] ?? 0)
    const nk = Math.max(cur.k, kn[k] ?? 0)
    if (nr !== cur.r || nk !== cur.k) {
      days[k] = { ...cur, r: nr, k: nk }
      changed = true
    }
  }
  if (!changed) return d
  const keys = Object.keys(days).sort()
  for (const k of keys.slice(0, Math.max(0, keys.length - DAYS_MAX))) delete days[k]
  return { ...d, days }
}

if (typeof window !== 'undefined') {
  const sync = () => {
    const next = mergeActivity(daily, getLearnData())
    if (next !== daily) commitDaily(next)
  }
  sync()
  subscribeLearnData(sync)
  window.addEventListener('storage', (e) => {
    if (e.key === DAILY_KEY || e.key === null) {
      daily = loadDaily()
      listeners.forEach((l) => l())
    }
  })
}

export function getDaily(): DailyData {
  return daily
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}
export function useDaily(): DailyData {
  return useSyncExternalStore(subscribe, getDaily, getDaily)
}

export function updateDaily(patch: Partial<Pick<DailyData, 'goal' | 'track' | 'level' | 'minutes' | 'onboarded'>>) {
  commitDaily(normalizeDaily({ ...daily, ...patch, sm: Date.now() }))
}
/** Change listener (cross-device sync schedules an upload on settings / activity changes). */
export const subscribeDaily = subscribe

/**
 * Merge two devices' daily stores (sync, backup merge). Pure. Activity per day: max of each counter
 * (the counters only grow). Settings: the copy with the newer `sm` wins (tie → `a`, the local one).
 * Onboarding: done if done on either device (earliest time).
 */
export function mergeDaily(a: DailyData, b: DailyData): DailyData {
  const win = (b.sm ?? 0) > (a.sm ?? 0) ? b : a
  const days: Record<string, DayActivity> = { ...a.days }
  for (const [k, v] of Object.entries(b.days)) {
    const c = days[k]
    days[k] = c ? { r: Math.max(c.r, v.r), n: Math.max(c.n, v.n), k: Math.max(c.k, v.k) } : v
  }
  const ob = [a.onboarded, b.onboarded].filter((x): x is number => x !== null)
  const keys = Object.keys(days).sort()
  for (const k of keys.slice(0, Math.max(0, keys.length - DAYS_MAX))) delete days[k]
  const out: DailyData = { version: 1, goal: win.goal, track: win.track, level: win.level, minutes: win.minutes, onboarded: ob.length ? Math.min(...ob) : null, days }
  const sm = Math.max(a.sm ?? 0, b.sm ?? 0)
  if (sm > 0) out.sm = sm
  return out
}
/** Replace the whole store (backup restore). */
export function replaceDaily(raw: unknown) {
  commitDaily(mergeActivity(normalizeDaily(raw), getLearnData()))
}

/**
 * First visit = nothing stored by any build yet (no onboarding answer, no SRS data, no favourites,
 * no saved level). Deep links (?c=, ?mode=) are excluded by the caller.
 */
export function shouldOnboard(d = daily, learn = getLearnData()): boolean {
  if (d.onboarded !== null) return false
  if (Object.keys(learn.cards).length || Object.keys(learn.known).length || learn.revlog.length) return false
  try {
    const fav = localStorage.getItem('hibu_favorites')
    if (fav && fav !== '[]') return false
    if (localStorage.getItem('hibu_hsk_level') !== null) return false
  } catch {
    /* storage blocked: treat as first visit */
  }
  return true
}

/** Learn one new character in the guided step and log it for today's activity. */
export function learnNewToday(h: string, remembered: boolean, now = Date.now()) {
  introduceCard(h, remembered)
  const k = dayKey(now)
  const cur = daily.days[k] ?? { r: 0, n: 0, k: 0 }
  commitDaily({ ...daily, days: { ...daily.days, [k]: { ...cur, n: cur.n + 1 } } })
}

// ---------- calendar helpers (local time, DST-safe) ----------

function parseDay(k: string): Date {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}
export function addDays(k: string, n: number): string {
  const d = parseDay(k)
  d.setDate(d.getDate() + n)
  return dayKey(d.getTime())
}
export function isActive(a: DayActivity | undefined) {
  return !!a && a.r + a.n + a.k > 0
}

// ---------- streak ----------

export interface StreakInfo {
  /** active days in the current chain (today included if active) */
  current: number
  longest: number
  todayActive: boolean
  /** yesterday was missed and today is not active yet: one more missed day ends the chain */
  atRisk: boolean
}

export function computeStreak(days: Record<string, DayActivity>, now = Date.now()): StreakInfo {
  const today = dayKey(now)
  const active = new Set(Object.keys(days).filter((k) => k <= today && isActive(days[k])))
  const todayActive = active.has(today)
  // Current chain: walk back from today; today itself is never a miss.
  let current = 0
  let k = today
  let misses = 0
  const earliest = [...active].sort()[0]
  if (earliest) {
    while (k >= earliest) {
      if (active.has(k)) {
        current++
        misses = 0
      } else if (k !== today) {
        if (++misses >= 2) break
      }
      k = addDays(k, -1)
    }
  }
  // Longest chain anywhere in history, same rule.
  let longest = 0
  if (earliest) {
    let run = 0
    let miss = 0
    for (let d = earliest; d <= today; d = addDays(d, 1)) {
      if (active.has(d)) {
        run++
        miss = 0
      } else if (d !== today && ++miss >= 2) {
        run = 0
      }
      longest = Math.max(longest, run)
    }
  }
  const yesterday = addDays(today, -1)
  const atRisk = !todayActive && current > 0 && !active.has(yesterday)
  return { current, longest: Math.max(longest, current), todayActive, atRisk }
}

// ---------- today's plan ----------

export type NextStep = 'learn' | 'review' | 'done'

export interface TodayPlan {
  goal: DailyGoal
  /** new cards introduced today (guided step + first grades of manually added cards) */
  newDone: number
  /** characters the guided learn step will introduce next, in order */
  newQueue: string[]
  /** review cards still due today (what "Ôn tập" will show, minus newQueue) */
  dueLeft: number
  /** distinct cards graded today */
  reviewedToday: number
  /** 0..1 */
  progress: number
  next: NextStep
  /** the track ran out of new characters (whole level / list learned) */
  exhausted: boolean
}

function endOfDay(now: number) {
  const d = new Date(now)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}
function startOfDay(now: number) {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Candidate new characters for a track, most frequent first, skipping anything known or in review. */
export function newCandidates(learn: LearnData, d: DailyData, characters: BundleCharacter[], limit: number): string[] {
  if (limit <= 0) return []
  const out: string[] = []
  const seen = new Set<string>()
  const push = (h: string) => {
    if (out.length < limit && !seen.has(h)) {
      seen.add(h)
      out.push(h)
    }
  }
  // 1) Characters the learner added to review by hand but never studied (oldest first).
  Object.entries(learn.cards)
    .filter(([h, c]) => !isWordKey(h) && c.state === 'new' && c.reps === 0 && !Object.hasOwn(learn.known, h))
    .sort((a, b) => a[1].added - b[1].added)
    .forEach(([h]) => push(h))
  if (out.length >= limit) return out
  // 2) The track's list in frequency order.
  const free = (c: BundleCharacter) => !Object.hasOwn(learn.cards, c.hanzi) && !Object.hasOwn(learn.known, c.hanzi)
  const byFreq = (a: BundleCharacter, b: BundleCharacter) => frequencyRank(a.hanzi) - frequencyRank(b.hanzi)
  if (d.track === 'hanviet') {
    const pool = characters.filter((c) => c.hsk3Level !== null && free(c) && primaryReading(c)?.hanViet).sort(byFreq)
    for (const c of pool) push(c.hanzi)
    return out
  }
  for (let lvl = d.level; lvl <= 6 && out.length < limit; lvl++) {
    const pool = characters.filter((c) => c.hsk3Level === lvl && free(c)).sort(byFreq)
    for (const c of pool) push(c.hanzi)
  }
  return out
}

export function buildTodayPlan(learn: LearnData, d: DailyData, characters: BundleCharacter[], now = Date.now()): TodayPlan {
  const newDone = learn.newIntroduced[dayKey(now)] ?? 0
  const room = Math.max(0, d.goal - newDone)
  const newQueue = newCandidates(learn, d, characters, room)
  const inNew = new Set(newQueue)
  const dueLeft = buildQueue(learn, now).filter((k) => !inNew.has(k)).length
  const from = startOfDay(now)
  const to = endOfDay(now)
  const graded = new Set<string>()
  for (const e of learn.revlog) if (e.t >= from && e.t <= to) graded.add(e.h)
  const reviewedToday = graded.size
  const done = Math.min(newDone, d.goal) + reviewedToday
  const left = newQueue.length + dueLeft
  const progress = done + left === 0 ? 0 : done / (done + left)
  const next: NextStep = newQueue.length > 0 ? 'learn' : dueLeft > 0 ? 'review' : 'done'
  return { goal: d.goal, newDone, newQueue, dueLeft, reviewedToday, progress, next, exhausted: room > 0 && newQueue.length < room }
}

// ---------- stats ----------

export interface DayCount {
  day: string
  reviews: number
  learned: number
}

/** Last `n` local days (oldest first) with review / new-learned counts. */
export function activitySeries(days: Record<string, DayActivity>, n = 30, now = Date.now()): DayCount[] {
  const today = dayKey(now)
  const out: DayCount[] = []
  for (let i = n - 1; i >= 0; i--) {
    const k = addDays(today, -i)
    out.push({ day: k, reviews: days[k]?.r ?? 0, learned: days[k]?.n ?? 0 })
  }
  return out
}

/**
 * Retention = share of "Nhớ" among graded reviews in the last `days` days. A re-show of the same
 * card within an hour of its previous grade (same-session retry after "Quên") is not counted.
 */
export function retention(learn: LearnData, days = 30, now = Date.now()): { pct: number | null; total: number; good: number } {
  const from = now - days * 86_400_000
  const last = new Map<string, number>()
  let total = 0
  let good = 0
  for (const e of learn.revlog) {
    const prev = last.get(e.h)
    last.set(e.h, e.t)
    if (e.t < from || e.t > now) continue
    if (prev !== undefined && e.t - prev < 3_600_000) continue
    total++
    if (e.g === 2) good++
  }
  return { pct: total ? good / total : null, total, good }
}

export interface LevelProgress {
  level: HskLevel
  total: number
  /** known, or reviewed at least once successfully (step ≥ 0) */
  learned: number
  /** in review but not yet past the first step */
  learning: number
}

export function levelProgress(learn: LearnData, characters: BundleCharacter[]): LevelProgress[] {
  const out: LevelProgress[] = ([1, 2, 3, 4, 5, 6] as HskLevel[]).map((level) => ({ level, total: 0, learned: 0, learning: 0 }))
  for (const c of characters) {
    const l = c.hsk3Level
    if (!l || l < 1 || l > 6) continue
    const row = out[l - 1]
    row.total++
    const card = learn.cards[c.hanzi]
    if (Object.hasOwn(learn.known, c.hanzi) || (card && card.step >= 0)) row.learned++
    else if (card && card.reps > 0) row.learning++
  }
  return out
}

export interface HardChar {
  hanzi: string
  lapses: number
  /** "Quên" grades still in the revlog */
  forgot: number
  leech: boolean
}

/** Characters / words forgotten most often (lapses, then "Quên" count). */
export function hardest(learn: LearnData, limit = 10): HardChar[] {
  const forgot = new Map<string, number>()
  for (const e of learn.revlog) if (e.g === 1) forgot.set(e.h, (forgot.get(e.h) ?? 0) + 1)
  return Object.entries(learn.cards)
    .map(([hanzi, c]) => ({ hanzi, lapses: c.lapses, forgot: forgot.get(hanzi) ?? 0, leech: c.lapses >= LEECH_LAPSES }))
    .filter((x) => x.lapses > 0 || x.forgot > 0)
    .sort((a, b) => b.lapses - a.lapses || b.forgot - a.forgot || a.hanzi.localeCompare(b.hanzi))
    .slice(0, limit)
}

/** Current time that re-renders every minute and when the tab becomes visible (midnight rollover). */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const id = window.setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [intervalMs])
  return now
}
