import type { SyncSnapshot } from './merge'

/**
 * Crypto for cross-device sync ("mã đồng bộ"). Pure Web Crypto, no storage, no network.
 *
 *   code   16 random bytes -> Crockford base32 (26 chars) + 2 check chars = 28 chars, shown as
 *          "K7Q2-9MXA-…". 128 bits of entropy; it never leaves the device.
 *   id     hex(SHA-256("hibu-sync/id/v1:" + code))            what the server sees as the key
 *   key    AES-GCM-256 = SHA-256("hibu-sync/key/v1:" + code)  encrypts the snapshot in the browser
 *   blob   "v1.<b64 iv>.<b64 ciphertext>"  or "v1z.…" when the JSON was gzipped before encrypting
 *
 * The code has 128 bits of entropy, so a plain hash is enough (no password-stretching needed);
 * the id and the key are independent because of the different domain prefixes.
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ' // Crockford: no I, L, O, U
const CODE_BYTES = 16
const DATA_CHARS = 26 // ceil(128 / 5)
export const CODE_LENGTH = DATA_CHARS + 2
const MAX_PLAIN_BYTES = 20 * 1024 * 1024 // bound for decompression of an (authenticated) blob

const enc = new TextEncoder()
const dec = new TextDecoder()

export const cryptoAvailable = () =>
  typeof crypto !== 'undefined' && !!crypto.subtle && typeof crypto.getRandomValues === 'function'

// ---------- code ----------

/**
 * Two check characters: a position-weighted sum mod 1021 (prime). Any single wrong character and any
 * swap of two adjacent characters changes it, so a typo is reported instead of silently asking the
 * server for the wrong id.
 */
function checkChars(data: string): string {
  let sum = 0
  for (let i = 0; i < data.length; i++) sum += (ALPHABET.indexOf(data[i]) + 1) * (i + 1)
  const n = sum % 1021
  return ALPHABET[n >> 5] + ALPHABET[n & 31]
}

function encodeBase32(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const b of bytes) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]
  return out
}

/** A fresh canonical code (28 chars, no separators). */
export function generateCode(): string {
  const bytes = new Uint8Array(CODE_BYTES)
  crypto.getRandomValues(bytes)
  const data = encodeBase32(bytes)
  return data + checkChars(data)
}

/** "K7Q2-9MXA-…" for display (groups of 4). */
export function formatCode(code: string): string {
  return code.match(/.{1,4}/g)?.join('-') ?? code
}

export type ParsedCode = { ok: true; code: string } | { ok: false; reason: 'empty' | 'length' | 'chars' | 'check' }

/** Normalises what a person typed or pasted: case, spaces, dashes, O→0, I/L→1. */
export function parseCode(input: string): ParsedCode {
  const s = input
    .toUpperCase()
    .replace(/[\s\-_.]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
  if (!s) return { ok: false, reason: 'empty' }
  if ([...s].some((ch) => !ALPHABET.includes(ch))) return { ok: false, reason: 'chars' }
  if (s.length !== CODE_LENGTH) return { ok: false, reason: 'length' }
  if (checkChars(s.slice(0, DATA_CHARS)) !== s.slice(DATA_CHARS)) return { ok: false, reason: 'check' }
  return { ok: true, code: s }
}

export const maskCode = (code: string) => formatCode('•'.repeat(code.length))

// ---------- derivation ----------

async function sha256(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)))
}

const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')

export interface SyncKeys {
  id: string
  key: CryptoKey
}

export async function deriveKeys(code: string): Promise<SyncKeys> {
  const [idBytes, keyBytes] = await Promise.all([sha256('hibu-sync/id/v1:' + code), sha256('hibu-sync/key/v1:' + code)])
  const key = await crypto.subtle.importKey('raw', keyBytes as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt'])
  return { id: toHex(idBytes), key }
}

// ---------- base64 ----------

function b64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
function unb64(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// ---------- gzip (optional) ----------

const canGzip = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream, maxOut = Infinity): Promise<Uint8Array> {
  const writer = stream.writable.getWriter()
  void writer.write(bytes as BufferSource).then(() => writer.close()).catch(() => {})
  const reader = stream.readable.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > maxOut) {
      await reader.cancel().catch(() => {})
      throw new Error('too_large')
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let o = 0
  for (const c of chunks) {
    out.set(c, o)
    o += c.length
  }
  return out
}

// ---------- blob ----------

export interface SyncPayload {
  app: 'hibu-hanzi'
  v: 1
  /** epoch ms the blob was written */
  at: number
  data: SyncSnapshot
}

export async function encryptSnapshot(snapshot: SyncSnapshot, key: CryptoKey, at = Date.now()): Promise<string> {
  const payload: SyncPayload = { app: 'hibu-hanzi', v: 1, at, data: snapshot }
  let bytes: Uint8Array = enc.encode(JSON.stringify(payload))
  let prefix = 'v1'
  if (canGzip()) {
    try {
      bytes = await pipe(bytes, new CompressionStream('gzip'))
      prefix = 'v1z'
    } catch {
      bytes = enc.encode(JSON.stringify(payload))
    }
  }
  const iv = crypto.getRandomValues(new Uint8Array(12))
  // The prefix is authenticated, so the "was gzipped" flag cannot be flipped by whoever stores it.
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource, additionalData: enc.encode(prefix) as BufferSource }, key, bytes as BufferSource))
  return `${prefix}.${b64(iv)}.${b64(ct)}`
}

export class DecryptError extends Error {}

/** Throws DecryptError on a wrong code, tampering or a format we do not know. The result is untrusted: run sanitizeSnapshot on it. */
export async function decryptSnapshot(blob: string, key: CryptoKey): Promise<{ at: number; data: unknown }> {
  try {
    const m = /^(v1z?)\.([A-Za-z0-9+/]{16})\.([A-Za-z0-9+/]+={0,2})$/.exec(blob)
    if (!m) throw new Error('format')
    const [, prefix, ivText, ctText] = m
    if (prefix === 'v1z' && !canGzip()) throw new Error('gzip')
    let plain: Uint8Array = new Uint8Array(
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(ivText) as BufferSource, additionalData: enc.encode(prefix) as BufferSource }, key, unb64(ctText) as BufferSource),
    )
    if (prefix === 'v1z') plain = await pipe(plain, new DecompressionStream('gzip'), MAX_PLAIN_BYTES)
    const payload: unknown = JSON.parse(dec.decode(plain))
    if (!payload || typeof payload !== 'object') throw new Error('shape')
    const p = payload as Record<string, unknown>
    if (p.app !== 'hibu-hanzi' || p.v !== 1) throw new Error('version')
    return { at: typeof p.at === 'number' ? p.at : 0, data: p.data }
  } catch {
    throw new DecryptError('decrypt_failed')
  }
}
