import type { LearnData, RevlogEntry, SrsCard } from './srs'
import { normalize } from './srs'
import { mergeDaily, normalizeDaily } from './daily'
import type { DailyData } from './daily'

/**
 * Conflict-safe merge of learning data from two devices (cross-device sync) — pure, no storage.
 *
 * Three-way: `base` is the copy both sides last agreed on (the server state at this device's last
 * successful sync). With a base, a key that existed in base but is missing on one side was deleted
 * there, and the deletion propagates — unless the other side changed it after base (edit beats
 * delete, so no review progress is lost). Without a base (first sync, file import) it is a union.
 *
 *   cards          per key, newer `m` (last modified) wins; tie → more advanced card
 *   known          per key, earliest "marked known" time wins
 *   favorites      ordered set; local order first, then remote additions
 *   revlog         union by (h, t), sorted by time, capped like srs.ts
 *   newIntroduced  per day, max
 *   daily          hibu_daily_v1 (daily.ts mergeDaily): activity per day max, newest settings win
 */

export interface SyncSnapshot {
  cards: Record<string, SrsCard>
  known: Record<string, number>
  revlog: RevlogEntry[]
  newIntroduced: Record<string, number>
  favorites: string[]
  /** "Học hôm nay" store; absent in snapshots written before it existed. */
  daily?: DailyData
}

const REVLOG_MAX = 2000

export const cardTime = (c: SrsCard) => c.m ?? c.lastReview ?? c.added

/** True when `a` should replace `b`. */
function newer(a: SrsCard, b: SrsCard): boolean {
  const ta = cardTime(a)
  const tb = cardTime(b)
  if (ta !== tb) return ta > tb
  const ra = a.lastReview ?? -1
  const rb = b.lastReview ?? -1
  if (ra !== rb) return ra > rb
  return a.step > b.step || (a.step === b.step && a.reps > b.reps)
}

const same = (a: SrsCard, b: SrsCard) => cardTime(a) === cardTime(b) && a.reps === b.reps && a.step === b.step && a.due === b.due

function mergeMap<V>(
  local: Record<string, V>,
  remote: Record<string, V>,
  base: Record<string, V> | null,
  pick: (l: V, r: V) => V,
  changedSince: (v: V, b: V) => boolean,
): Record<string, V> {
  const out: Record<string, V> = {}
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)])
  for (const k of keys) {
    if (k === '__proto__') continue
    const inL = Object.hasOwn(local, k)
    const inR = Object.hasOwn(remote, k)
    const inB = !!base && Object.hasOwn(base, k)
    if (inL && inR) out[k] = pick(local[k], remote[k])
    else {
      const only = inL ? local[k] : remote[k]
      // Present in base but gone on one side = deleted there. Keep it only if the surviving side
      // changed it after base (edit beats delete).
      if (inB && !changedSince(only, base![k])) continue
      out[k] = only
    }
  }
  return out
}

export function mergeSnapshots(local: SyncSnapshot, remote: SyncSnapshot, base: SyncSnapshot | null): SyncSnapshot {
  const cards = mergeMap(
    local.cards,
    remote.cards,
    base?.cards ?? null,
    (l, r) => (newer(r, l) ? r : l),
    (v, b) => !same(v, b),
  )
  const known = mergeMap(
    local.known,
    remote.known,
    base?.known ?? null,
    (l, r) => Math.min(l, r),
    (v, b) => v !== b,
  )

  const baseFav = new Set(base?.favorites ?? [])
  const localFav = new Set(local.favorites)
  const remoteFav = new Set(remote.favorites)
  const favorites: string[] = []
  for (const f of [...local.favorites, ...remote.favorites]) {
    if (favorites.includes(f)) continue
    if (baseFav.has(f) && (!localFav.has(f) || !remoteFav.has(f))) continue // removed on one side
    favorites.push(f)
  }

  const seen = new Set<string>()
  const revlog: RevlogEntry[] = []
  for (const e of [...local.revlog, ...remote.revlog]) {
    const id = `${e.h}|${e.t}`
    if (seen.has(id)) continue
    seen.add(id)
    revlog.push(e)
  }
  revlog.sort((a, b) => a.t - b.t)

  const newIntroduced: Record<string, number> = { ...local.newIntroduced }
  for (const [d, n] of Object.entries(remote.newIntroduced)) newIntroduced[d] = Math.max(newIntroduced[d] ?? 0, n)

  const out: SyncSnapshot = { cards, known, revlog: revlog.slice(-REVLOG_MAX), newIntroduced, favorites }
  const daily = local.daily && remote.daily ? mergeDaily(local.daily, remote.daily) : (local.daily ?? remote.daily)
  if (daily) out.daily = daily
  return out
}

/** Sanitize an untrusted snapshot (decrypted sync blob, backup file) through srs.normalize. */
export function sanitizeSnapshot(raw: unknown): SyncSnapshot {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const d = normalize({ version: 1, cards: r.cards, known: r.known, revlog: r.revlog, newIntroduced: r.newIntroduced })
  const favorites = Array.isArray(r.favorites)
    ? [...new Set(r.favorites.filter((x): x is string => typeof x === 'string' && x !== '' && x.length <= 64))]
    : []
  const out: SyncSnapshot = { cards: d.cards, known: d.known, revlog: d.revlog, newIntroduced: d.newIntroduced, favorites }
  if (r.daily && typeof r.daily === 'object' && !Array.isArray(r.daily)) out.daily = normalizeDaily(r.daily)
  return out
}

export function snapshotOf(d: LearnData, favorites: string[], daily?: DailyData): SyncSnapshot {
  const out: SyncSnapshot = { cards: d.cards, known: d.known, revlog: d.revlog, newIntroduced: d.newIntroduced, favorites: [...favorites] }
  if (daily) out.daily = daily
  return out
}

/** Stable comparison, so an unchanged merge result does not trigger a write/upload. */
export function snapshotsEqual(a: SyncSnapshot, b: SyncSnapshot): boolean {
  return stableStringify(a) === stableStringify(b)
}
function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(v)
}
