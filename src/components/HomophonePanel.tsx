import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { BundleCharacter } from '../core'
import { findHomophones, type HomophoneMode } from '../utils/homophones'
import { TonePinyin } from './TonePinyin'

interface Props {
  characters: BundleCharacter[]
  character: BundleCharacter
  onSelect: (hanzi: string) => void
  onClose: () => void
}

const MAX = 60

/** Compact list of characters that sound the same (Hán Việt or pinyin). Popover on desktop, bottom sheet on phones. */
export function HomophonePanel({ characters, character, onSelect, onClose }: Props) {
  // Open on the strictest view that has results: exact Hán Việt, then any-tone Hán Việt, then pinyin.
  const [initial] = useState(() => {
    if (findHomophones(characters, character, 'hv').length) return { tab: 'hv' as const, loose: false }
    if (findHomophones(characters, character, 'hvLoose').length) return { tab: 'hv' as const, loose: true }
    return { tab: 'py' as const, loose: false }
  })
  const [tab, setTab] = useState<'hv' | 'py'>(initial.tab)
  const [loose, setLoose] = useState(initial.loose)
  const ref = useRef<HTMLDivElement>(null)
  const mode: HomophoneMode = tab === 'hv' ? (loose ? 'hvLoose' : 'hv') : loose ? 'pyLoose' : 'py'

  const counts = useMemo(
    () => ({
      hv: findHomophones(characters, character, loose ? 'hvLoose' : 'hv').length,
      py: findHomophones(characters, character, loose ? 'pyLoose' : 'py').length,
    }),
    [characters, character, loose],
  )
  const hits = useMemo(() => findHomophones(characters, character, mode), [characters, character, mode])

  useEffect(() => {
    // Modal while open: trap Tab, arrow through rows, and swallow app-wide letter shortcuts (D/K/arrows…).
    const onKey = (e: KeyboardEvent) => {
      const panel = ref.current
      if (!panel) return
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
        return
      }
      const focusables = [...panel.querySelectorAll<HTMLElement>('button, input')]
      const rows = [...panel.querySelectorAll<HTMLElement>('.hp-row')]
      const active = document.activeElement as HTMLElement | null
      if (e.key === 'Tab' && focusables.length) {
        const i = focusables.indexOf(active as HTMLElement)
        const next = e.shiftKey ? (i <= 0 ? focusables.length - 1 : i - 1) : i === focusables.length - 1 ? 0 : i + 1
        e.preventDefault()
        focusables[next].focus()
      } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && rows.length) {
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
    const opener = document.activeElement as HTMLElement | null
    ref.current?.focus()
    return () => {
      if (opener?.isConnected) opener.focus()
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [onClose])

  // Phones get a bottom sheet; portal it out so transformed ancestors can't trap position: fixed.
  const [isSheet] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const content = (
    <>
      <div className="hp-scrim" aria-hidden />
      <div className="hp-panel" ref={ref} role="dialog" aria-label="Chữ đồng âm" tabIndex={-1}>
        <div className="hp-head">
          <span className="label">Đồng âm với {character.hanzi}</span>
          <button type="button" className="hp-close" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>
        <div className="hp-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'hv'} className={tab === 'hv' ? 'on' : ''} onClick={() => setTab('hv')}>
            Cùng âm Hán Việt <span className="hp-n">{counts.hv}</span>
          </button>
          <button type="button" role="tab" aria-selected={tab === 'py'} className={tab === 'py' ? 'on' : ''} onClick={() => setTab('py')}>
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
            {hits.slice(0, MAX).map((h) => {
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
