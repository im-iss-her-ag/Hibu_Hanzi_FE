import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { BundleCharacter } from '../core'
import { findHomophones, type HomophoneHit, type HomophoneMode } from '../utils/homophones'
import { TonePinyin } from './TonePinyin'
import { useModalDialog } from '../utils/useModalA11y'

interface Props {
  characters: BundleCharacter[]
  character: BundleCharacter
  onSelect: (hanzi: string) => void
  onClose: () => void
}

const MAX = 60

/** Compact list of characters that sound the same (Hán Việt or pinyin). Popover on desktop, bottom sheet on phones. */
export function HomophonePanel({ characters, character, onSelect, onClose }: Props) {
  // Open on the strictest view that has results: exact Hán Việt, then exact pinyin (same tone). Only when
  // neither has any does it open on other-tone readings (the trigger then says "Gần âm", not "Đồng âm").
  const [initial] = useState(() => {
    if (findHomophones(characters, character, 'hv').length) return { tab: 'hv' as const, loose: false }
    if (findHomophones(characters, character, 'py').length) return { tab: 'py' as const, loose: false }
    return { tab: 'hv' as const, loose: true }
  })
  const [tab, setTab] = useState<'hv' | 'py'>(initial.tab)
  const [loose, setLoose] = useState(initial.loose)
  // Phones and short (landscape) screens get a bottom sheet; portal it out so transformed ancestors can't trap position: fixed.
  const [isSheet] = useState(() => window.matchMedia('(max-width: 767px), (max-height: 500px)').matches)
  // Modal behaviour (Esc once, Tab trap, focus return) in both layouts; the page only scroll-locks as a sheet.
  const { ref, titleId, dialogProps } = useModalDialog<HTMLDivElement>(onClose, {
    lockScroll: isSheet,
    initialFocus: '[role="tab"][aria-selected="true"]',
  })
  const mode: HomophoneMode = tab === 'hv' ? (loose ? 'hvLoose' : 'hv') : loose ? 'pyLoose' : 'py'

  const counts = useMemo(
    () => ({
      hv: findHomophones(characters, character, loose ? 'hvLoose' : 'hv').length,
      py: findHomophones(characters, character, loose ? 'pyLoose' : 'py').length,
    }),
    [characters, character, loose],
  )
  // Grouped by the reading of this character they share (好: HẢO vs HIẾU), so readings never blur together.
  const groups = useMemo(() => {
    const seen = new Set<string>()
    const out: { key: string; pinyin: string; hanViet: string | null; hits: HomophoneHit[] }[] = []
    for (const r of character.readings) {
      const hs = findHomophones(characters, character, mode, { pinyin: r.pinyin, hanViet: r.hanViet }).filter((h) => !seen.has(h.c.hanzi))
      hs.forEach((h) => seen.add(h.c.hanzi))
      if (hs.length) out.push({ key: `${r.pinyin}|${r.hanViet ?? ''}`, pinyin: r.pinyin, hanViet: r.hanViet, hits: hs })
    }
    return out
  }, [characters, character, mode])
  const hits = useMemo(() => groups.flatMap((g) => g.hits), [groups])
  const main = character.readings.find((r) => r.isPrimary) ?? character.readings[0]
  const mainKey = main ? `${main.pinyin}|${main.hanViet ?? ''}` : ''

  useEffect(() => {
    // Arrow through rows and swallow app-wide letter shortcuts (D/K/arrows…). Esc and Tab (trap) are left to
    // useModalDialog, which handles them once for the top-most dialog.
    const onKey = (e: KeyboardEvent) => {
      const panel = ref.current
      if (!panel) return
      if (e.key === 'Escape' || e.key === 'Tab') return
      const rows = [...panel.querySelectorAll<HTMLElement>('.hp-row')]
      const active = document.activeElement as HTMLElement | null
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && rows.length) {
        e.preventDefault()
        const i = rows.indexOf(active as HTMLElement)
        const next = e.key === 'ArrowDown' ? (i < 0 ? 0 : Math.min(i + 1, rows.length - 1)) : i <= 0 ? 0 : i - 1
        rows[next].focus()
      } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && active?.getAttribute('role') === 'tab') {
        e.preventDefault()
        setTab((t) => (t === 'hv' ? 'py' : 'hv'))
      } else if (e.key === 'Home' || e.key === 'End') {
        if (rows.length) {
          e.preventDefault()
          rows[e.key === 'Home' ? 0 : rows.length - 1].focus()
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        return // native button activation
      }
      e.stopPropagation()
    }
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement
      if (ref.current && !ref.current.contains(t) && !t.closest('.hp-trigger')) onClose()
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [onClose, ref])

  const content = (
    <>
      <div className="hp-scrim" aria-hidden />
      <div className="hp-panel" ref={ref} {...dialogProps} tabIndex={-1}>
        <div className="pm-header hp-head">
          <h2 className="pm-title" id={titleId}>Đồng âm với {character.hanzi}</h2>
          <div className="pm-header-actions">
            <button type="button" className="pm-icon-btn pm-close" onClick={onClose} aria-label="Đóng">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="pm-tabs hp-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'hv'} className={`pm-tab${tab === 'hv' ? ' active' : ''}`} onClick={() => setTab('hv')}>
            Cùng âm Hán Việt <span className="hp-n">{counts.hv}</span>
          </button>
          <button type="button" role="tab" aria-selected={tab === 'py'} className={`pm-tab${tab === 'py' ? ' active' : ''}`} onClick={() => setTab('py')}>
            Cùng pinyin <span className="hp-n">{counts.py}</span>
          </button>
        </div>
        <label className="hp-toggle">
          <input type="checkbox" checked={loose} onChange={(e) => setLoose(e.target.checked)} />
          Cả thanh khác {tab === 'hv' ? '(bỏ dấu thanh tiếng Việt)' : '(cùng vần, khác thanh)'}
        </label>
        {hits.length >= 1 && (
          <div className="hp-diff" aria-label="Phân biệt nhanh">
            <span className="label">Phân biệt</span>
            <div className="hp-diff-grid">
              {[{ c: character, meaningVi: (character.readings.find((r) => r.isPrimary) ?? character.readings[0])?.meaningVi ?? '' }, ...hits.slice(0, 2)].map((h, i) => (
                <div key={h.c.hanzi} className={`hp-diff-cell${i === 0 ? ' self' : ''}`}>
                  <span className="hp-diff-han" lang="zh">{h.c.hanzi}</span>
                  {h.c.radical && h.c.radical !== h.c.hanzi && <span className="hp-diff-rad">bộ {h.c.radical}</span>}
                  <span className="hp-diff-mean">{h.meaningVi.split(/[;,]/)[0]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {hits.length === 0 ? (
          <p className="hp-empty">Không có chữ đồng âm trong dữ liệu.</p>
        ) : (
          <ul className="hp-list">
            {groups.flatMap((g) => [
              // Header whenever it is not obvious which reading is shared (several, or not the main one).
              groups.length > 1 || g.key !== mainKey ? (
                <li key={`g:${g.key}`} className="hp-group">
                  {g.hanViet ? g.hanViet.toUpperCase() : null} <TonePinyin pinyin={g.pinyin} className="hp-py" />
                </li>
              ) : null,
              ...g.hits,
            ]).filter((x) => x !== null).slice(0, MAX + groups.length).map((h) => {
              if (!('c' in h)) return h
              const lvl = h.c.hsk3Level ?? h.c.hsk2Level
              return (
                <li key={h.c.hanzi}>
                  <button type="button" className="hp-row" onClick={() => onSelect(h.c.hanzi)}>
                    <span className="hp-han">{h.c.hanzi}</span>
                    <span className="hp-mid">
                      <span className="hp-line">
                        {h.hanViet && <span className="hp-hv">{h.hanViet.toUpperCase()}</span>}
                        <TonePinyin pinyin={h.pinyin} className="hp-py" />
                        {h.c.radical && h.c.radical !== h.c.hanzi && (
                          <span className="hp-rad" title="Bộ thủ — phần phân biệt nghĩa">
                            bộ <span className="hp-rad-g">{h.c.radical}</span>
                          </span>
                        )}
                      </span>
                      <span className="hp-mean">{h.meaningVi}</span>
                    </span>
                    <span className="hp-lvl">{lvl ? (lvl === 7 ? 'HSK 7-9' : `HSK ${lvl}`) : 'Bộ'}</span>
                  </button>
                </li>
              )
            })}
            {hits.length > MAX && <li className="hp-more">+{hits.length - MAX} chữ khác</li>}
          </ul>
        )}
      </div>
    </>
  )
  return isSheet ? createPortal(content, document.body) : content
}
