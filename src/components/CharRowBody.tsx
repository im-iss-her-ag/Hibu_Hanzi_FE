import type { ReactNode } from 'react'
import type { BundleCharacter } from '../core'
import { normalizeFolded } from '../utils/search'
import { pinyinSyllables } from '../utils/tone'

/** Wrap the part of `text` matching `query` (ignoring case, tone marks and Vietnamese diacritics) in <mark>. */
export function highlight(text: string, query: string): ReactNode {
  const q = normalizeFolded(query)
  if (!q || !text) return text
  const folded = Array.from(text, (ch) => {
    const f = /\s/.test(ch) ? ' ' : normalizeFolded(ch)
    return f.length === 1 ? f : ch.toLowerCase()
  }).join('')
  const chars = Array.from(text)
  if (folded.length !== chars.length) return text
  const at = folded.indexOf(q)
  if (at < 0) return text
  return (
    <>
      {chars.slice(0, at).join('')}
      <mark className="sm-mark">{chars.slice(at, at + q.length).join('')}</mark>
      {chars.slice(at + q.length).join('')}
    </>
  )
}

export function TonePinyin({ pinyin }: { pinyin: string }) {
  return (
    <span className="sm-py">
      {pinyinSyllables(pinyin).map((s, i) => (
        <span key={i} className={`py t${s.tone}`}>{i > 0 ? ' ' : ''}{s.text}</span>
      ))}
    </span>
  )
}

/** The shared result row content: glyph · pinyin · HÁN VIỆT · meaning (· tag is added by the caller). */
export function CharRowBody({ c, query = '' }: { c: BundleCharacter; query?: string }) {
  const primary = c.readings.find((r) => r.isPrimary) ?? c.readings[0]
  return (
    <>
      <span className="sm-glyph" lang="zh">{c.hanzi}</span>
      <span className="sm-py-col">{primary?.pinyin ? <TonePinyin pinyin={primary.pinyin} /> : null}</span>
      <span className="sm-hv">{primary?.hanViet ? highlight(primary.hanViet.toUpperCase(), query) : ''}</span>
      <span className="sm-mean">{primary?.meaningVi ? highlight(primary.meaningVi, query) : ''}</span>
    </>
  )
}
