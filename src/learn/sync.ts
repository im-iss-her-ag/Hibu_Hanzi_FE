import { useSyncExternalStore } from 'react'
import { mergeSnapshots, sanitizeSnapshot, snapshotOf, snapshotsEqual } from './merge'
import type { SyncSnapshot } from './merge'
import { getLearnData, replaceLearnData } from './srs'
import { getDaily, replaceDaily } from './daily'
import {
  DecryptError,
  cryptoAvailable,
  decryptSnapshot,
  deriveKeys,
  encryptSnapshot,
  generateCode,
  parseCode,
} from './syncCrypto'
import type { SyncKeys } from './syncCrypto'

/**
 * Cross-device sync without accounts. The "mã đồng bộ" (secret code) stays on the device; the server
 * only ever sees SHA-256(code) as a key and an AES-GCM blob it cannot read (see syncCrypto.ts, and
 * BE/src/sync.ts for the API). Merging is three-way (merge.ts): `base` is the server copy this
 * device last synced, so deletions propagate and nothing is lost to a stale overwrite.
 */

const KEY = 'hibu_sync_v1'
const API = import.meta.env?.VITE_API_URL ?? '/api'
const MAX_ATTEMPTS = 4
const REQUEST_TIMEOUT_MS = 15_000

export { cryptoAvailable }
export { formatCode, parseCode, maskCode } from './syncCrypto'

// ---------- persisted state ----------

interface StoredSync {
  code: string
  /** Server version at our last successful sync (0 = nothing uploaded yet). */
  version: number
  /** Server copy at that version; null before the first sync (first merge is a union). */
  base: SyncSnapshot | null
  lastSyncAt: number | null
  lastError: string | null
}

function readStored(): StoredSync | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const o: unknown = JSON.parse(raw)
    if (!o || typeof o !== 'object') return null
    const r = o as Record<string, unknown>
    const code = typeof r.code === 'string' ? parseCode(r.code) : null
    if (!code?.ok) return null
    const version = typeof r.version === 'number' && Number.isInteger(r.version) && r.version >= 0 ? r.version : 0
    return {
      code: code.code,
      version,
      base: r.base && version > 0 ? sanitizeSnapshot(r.base) : null,
      lastSyncAt: typeof r.lastSyncAt === 'number' ? r.lastSyncAt : null,
      lastError: typeof r.lastError === 'string' ? r.lastError : null,
    }
  } catch {
    return null
  }
}

/** Returns false when the browser refused to store (full / blocked). */
function writeStored(s: StoredSync | null): boolean {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s))
    else localStorage.removeItem(KEY)
    return true
  } catch {
    return false
  }
}

// ---------- status store (for the UI) ----------

export type SyncPhase = 'off' | 'idle' | 'syncing' | 'offline' | 'error' | 'gone'

export interface SyncStatus {
  /** Sync is set up on this device. */
  enabled: boolean
  phase: SyncPhase
  lastSyncAt: number | null
  /** Vietnamese message for the UI (offline / error / gone). */
  message: string | null
}

let stored: StoredSync | null = typeof window === 'undefined' ? null : readStored()
let transient: { phase: SyncPhase; message: string | null } = { phase: 'idle', message: null }
let status: SyncStatus = computeStatus()
const listeners = new Set<() => void>()

function computeStatus(): SyncStatus {
  if (!stored) return { enabled: false, phase: 'off', lastSyncAt: null, message: null }
  return { enabled: true, phase: transient.phase, lastSyncAt: stored.lastSyncAt, message: transient.message ?? stored.lastError }
}
function publish() {
  const next = computeStatus()
  if (next.enabled === status.enabled && next.phase === status.phase && next.lastSyncAt === status.lastSyncAt && next.message === status.message) return
  status = next
  listeners.forEach((l) => l())
}
function setTransient(phase: SyncPhase, message: string | null = null) {
  transient = { phase, message }
  publish()
}
function setStored(next: StoredSync | null) {
  stored = next
  writeStored(next)
  publish()
}

export const getSyncStatus = () => status
export const subscribeSync = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
export const useSyncStatus = () => useSyncExternalStore(subscribeSync, getSyncStatus, getSyncStatus)
/** The secret code (28 chars, canonical) or null. Only the sync UI should read it. */
export const getSyncCode = () => stored?.code ?? null
export const isSyncEnabled = () => stored !== null

if (typeof window !== 'undefined') {
  // Another tab turned sync on/off or synced.
  window.addEventListener('storage', (e) => {
    if (e.key === KEY || e.key === null) {
      stored = readStored()
      if (!stored) transient = { phase: 'idle', message: null }
      publish()
    }
  })
}

// ---------- favorites bridge (favorites live in App state) ----------

let favorites: { get: () => string[]; set: (next: string[]) => void } | null = null
export function bindFavorites(b: typeof favorites) {
  favorites = b
}
const currentFavorites = () => favorites?.get() ?? readFavoritesFromStorage()
function readFavoritesFromStorage(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem('hibu_favorites') ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Local data as a snapshot (what a sync would upload). */
export const localSnapshot = () => snapshotOf(getLearnData(), currentFavorites(), getDaily())

/** True when this device has changes the server copy does not have yet. */
export function hasUnsyncedChanges(): boolean {
  if (!stored) return false
  return !stored.base || !snapshotsEqual(localSnapshot(), stored.base)
}

/** Writes `snap` into the app. Returns the normalised result actually stored. */
function applyLocal(snap: SyncSnapshot): SyncSnapshot {
  const cur = getLearnData()
  replaceLearnData({ version: 1, cards: snap.cards, known: snap.known, revlog: snap.revlog, newIntroduced: snap.newIntroduced, lastBackup: cur.lastBackup })
  favorites?.set(snap.favorites)
  if (snap.daily && !snapshotsEqual({ ...snap, daily: getDaily() }, snap)) replaceDaily(snap.daily)
  return snapshotOf(getLearnData(), snap.favorites, getDaily())
}

// ---------- API ----------

class NetworkError extends Error {}
interface ApiResult {
  status: number
  body: { version?: number; data?: string; updatedAt?: string; error?: string } | null
}

async function call(method: 'GET' | 'PUT' | 'DELETE', id: string, body?: unknown): Promise<ApiResult> {
  let res: Response
  try {
    res = await fetch(`${API}/sync/${id}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      credentials: 'omit',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    throw new NetworkError('network')
  }
  let parsed: ApiResult['body'] = null
  try {
    const text = await res.text()
    parsed = text ? JSON.parse(text) : null
  } catch {
    // A proxy's HTML error page etc.: the status code alone decides.
  }
  return { status: res.status, body: parsed }
}

// ---------- messages ----------

export const MSG = {
  offline: 'Chưa kết nối được máy chủ. Sẽ thử lại sau.',
  busy: 'Máy chủ đang bận. Sẽ thử lại sau.',
  server: 'Máy chủ đang gặp sự cố. Sẽ thử lại sau.',
  decrypt: 'Không giải mã được dữ liệu trên máy chủ. Mã có thể sai, hoặc dữ liệu bị hỏng.',
  gone: 'Bản đồng bộ trên máy chủ đã bị xoá (có thể từ thiết bị khác).',
  notFound: 'Không tìm thấy dữ liệu đồng bộ cho mã này. Kiểm tra lại mã, hoặc bật đồng bộ trên thiết bị gốc trước.',
  secure: 'Đồng bộ cần kết nối an toàn (https). Hãy mở ứng dụng bằng địa chỉ https.',
  storage: 'Trình duyệt không cho lưu trạng thái đồng bộ (bộ nhớ đầy hoặc bị chặn).',
  unexpected: 'Đồng bộ không thành công. Thử lại sau.',
  parse: {
    empty: 'Hãy nhập mã đồng bộ.',
    chars: 'Mã có ký tự không hợp lệ. Mã chỉ gồm chữ số và chữ cái (không có U).',
    length: 'Mã chưa đúng độ dài. Kiểm tra xem có thiếu hoặc thừa ký tự không.',
    check: 'Mã không hợp lệ: có thể gõ nhầm một ký tự. Kiểm tra lại.',
  },
} as const

const fail = (status: number): { phase: SyncPhase; message: string } =>
  status === 429 ? { phase: 'offline', message: MSG.busy } : status >= 500 ? { phase: 'offline', message: MSG.server } : { phase: 'error', message: MSG.unexpected }

// ---------- the sync itself ----------

export type Outcome = 'ok' | 'offline' | 'error' | 'gone'
let running: Promise<Outcome> | null = null

/** Runs one sync round (GET, merge, apply, PUT). Never runs twice at once, in this tab or across tabs. */
export function syncNow(): Promise<Outcome> {
  if (running) return running
  const p = (async () => {
    setTransient('syncing')
    try {
      const run = () => runSync()
      // Web Locks serialise tabs of the same browser profile; without it a rare double sync is still
      // safe because the server's version check rejects the stale one (409) and we merge again.
      const outcome = navigator.locks ? await navigator.locks.request('hibu-sync', run) : await run()
      return outcome
    } finally {
      running = null
    }
  })()
  running = p
  return p
}

function finish(outcome: Outcome, message: string | null, patch?: Partial<StoredSync>): Outcome {
  if (stored) {
    const next = { ...stored, ...patch, lastError: outcome === 'ok' ? null : message }
    stored = next
    writeStored(next)
  }
  setTransient(outcome === 'ok' ? 'idle' : outcome, outcome === 'ok' ? null : message)
  return outcome
}

async function runSync(): Promise<Outcome> {
  const s = stored
  if (!s) return 'ok'
  if (!cryptoAvailable()) return finish('error', MSG.secure)
  try {
    const keys = await deriveKeys(s.code)
    let remote: ApiResult = await call('GET', keys.id)
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (remote.status === 404) {
        // Never uploaded (a code we just generated): create it. Otherwise it was erased elsewhere.
        if (s.version > 0 || attempt > 0) return finish('gone', MSG.gone)
        const out = await push(keys, localSnapshot(), 0)
        if (out.kind === 'saved') return finish('ok', null, { version: out.version, base: out.snap, lastSyncAt: Date.now() })
        remote = out.remote
        continue
      }
      if (remote.status !== 200 || !remote.body || typeof remote.body.data !== 'string' || typeof remote.body.version !== 'number') {
        const f = fail(remote.status)
        return finish(f.phase as Outcome, f.message)
      }
      const version = remote.body.version
      const remoteSnap = sanitizeSnapshot((await decryptSnapshot(remote.body.data, keys.key)).data)
      // Everything from here to the PUT is synchronous up to the await in push(), so a change the
      // user makes while we were on the network is merged in, not overwritten.
      const cur = stored ?? s
      const local = localSnapshot()
      const merged = mergeSnapshots(local, remoteSnap, cur.base)
      const applied = snapshotsEqual(merged, local) ? local : applyLocal(merged)
      if (snapshotsEqual(applied, remoteSnap)) return finish('ok', null, { version, base: applied, lastSyncAt: Date.now() })
      const out = await push(keys, applied, version)
      if (out.kind === 'saved') return finish('ok', null, { version: out.version, base: out.snap, lastSyncAt: Date.now() })
      remote = out.remote
    }
    return finish('offline', MSG.busy) // kept losing the race to other devices; try again later
  } catch (err) {
    if (err instanceof NetworkError) return finish('offline', MSG.offline)
    if (err instanceof DecryptError) return finish('error', MSG.decrypt)
    if (err instanceof HttpError) {
      const f = fail(err.status)
      return finish(f.phase as Outcome, f.message)
    }
    return finish('error', MSG.unexpected)
  }
}

type Push = { kind: 'saved'; version: number; snap: SyncSnapshot } | { kind: 'conflict'; remote: ApiResult }

/** Uploads `snap` on top of `base` (0 = create). A 409 hands back the server's current copy. */
async function push(keys: SyncKeys, snap: SyncSnapshot, base: number): Promise<Push> {
  const data = await encryptSnapshot(snap, keys.key)
  const res = await call('PUT', keys.id, { base, data })
  if (res.status === 200 && typeof res.body?.version === 'number') return { kind: 'saved', version: res.body.version, snap }
  if (res.status === 409) return { kind: 'conflict', remote: { status: 200, body: res.body } }
  if (res.status === 404) return { kind: 'conflict', remote: { status: 404, body: null } }
  throw new HttpError(res.status)
}
class HttpError extends Error {
  constructor(readonly status: number) {
    super('http')
  }
}

// ---------- turning sync on / off ----------

export type EnableResult = { ok: true } | { ok: false; message: string }

/**
 * First device: generate a code and upload this device's data. Nothing is stored (and no code is
 * shown) unless the upload succeeded, so there is never a code without a server copy.
 */
export async function createSync(): Promise<EnableResult> {
  if (!cryptoAvailable()) return { ok: false, message: MSG.secure }
  if (stored) return { ok: true }
  const code = generateCode()
  try {
    const keys = await deriveKeys(code)
    const snap = localSnapshot()
    const out = await push(keys, snap, 0)
    if (out.kind !== 'saved') return { ok: false, message: MSG.unexpected }
    const next: StoredSync = { code, version: out.version, base: snap, lastSyncAt: Date.now(), lastError: null }
    if (!writeStored(next)) {
      await call('DELETE', keys.id).catch(() => {}) // do not leave an orphan we can no longer reach
      return { ok: false, message: MSG.storage }
    }
    stored = next
    transient = { phase: 'idle', message: null }
    publish()
    return { ok: true }
  } catch (err) {
    if (err instanceof NetworkError) return { ok: false, message: MSG.offline }
    if (err instanceof HttpError) return { ok: false, message: fail(err.status).message }
    return { ok: false, message: MSG.unexpected }
  }
}

/** Another device: check the code exists on the server, then do the first (union) sync. */
export async function joinSync(input: string): Promise<EnableResult> {
  if (!cryptoAvailable()) return { ok: false, message: MSG.secure }
  const parsed = parseCode(input)
  if (!parsed.ok) return { ok: false, message: MSG.parse[parsed.reason] }
  try {
    const keys = await deriveKeys(parsed.code)
    const res = await call('GET', keys.id)
    if (res.status === 404) return { ok: false, message: MSG.notFound }
    if (res.status !== 200 || typeof res.body?.data !== 'string') return { ok: false, message: fail(res.status).message }
    await decryptSnapshot(res.body.data, keys.key)
  } catch (err) {
    if (err instanceof NetworkError) return { ok: false, message: MSG.offline }
    if (err instanceof DecryptError) return { ok: false, message: MSG.decrypt }
    return { ok: false, message: MSG.unexpected }
  }
  const next: StoredSync = { code: parsed.code, version: 0, base: null, lastSyncAt: null, lastError: null }
  if (!writeStored(next)) return { ok: false, message: MSG.storage }
  stored = next
  transient = { phase: 'idle', message: null }
  publish()
  // version 0 + a server copy that exists: runSync's first GET returns 200 and merges as a union.
  await syncNow() // enabled either way; the status line shows a problem if there was one
  return { ok: true }
}

/** Forget the code on this device. The server copy and other devices are untouched. */
export function disableSync() {
  transient = { phase: 'idle', message: null }
  setStored(null)
}

/** Erase the server copy (all devices stop syncing) and forget the code here. */
export async function eraseServerCopy(): Promise<EnableResult> {
  const s = stored
  if (!s) return { ok: true }
  try {
    const keys = await deriveKeys(s.code)
    const res = await call('DELETE', keys.id)
    if (res.status !== 204 && res.status !== 200) return { ok: false, message: fail(res.status).message }
  } catch (err) {
    return { ok: false, message: err instanceof NetworkError ? MSG.offline : MSG.unexpected }
  }
  disableSync()
  return { ok: true }
}

/** After "gone": upload this device's copy again under the same code. */
export async function reuploadAfterGone(): Promise<Outcome> {
  if (!stored) return 'ok'
  setStored({ ...stored, version: 0, base: null, lastError: null })
  transient = { phase: 'idle', message: null }
  publish()
  return syncNow()
}
