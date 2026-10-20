import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import HanziWriter from 'hanzi-writer'
import type { BundleCharacter, HskLevel } from '../core'
import { pickRandom } from '../core'
import { api } from '../api'

// Frameless, always-on-top widget page for the Electron shell in desktop/.
// There is no visible chrome: drag the card to move it, double-click for the next character,
// right-click for settings.

// Exposed by desktop/preload.cjs. Missing when the page is opened in a normal browser.
interface WidgetBridge {
  moveTo(x: number, y: number): void
  setSize(width: number, height: number): void
  close(): void
}
declare global {
  interface Window {
    hibuWidget?: WidgetBridge
  }
}

type Source = 'hsk' | 'favorites'
type Size = 's' | 'm' | 'l'
type Theme = 'auto' | 'light' | 'dark'

interface WidgetSettings {
  source: Source
  levels: HskLevel[]
  intervalSec: number
  size: Size
  theme: Theme
}

const SETTINGS_KEY = 'hibu_widget_settings'
const FAVORITES_KEY = 'hibu_hanzi_favs'
const LEVELS: HskLevel[] = [1, 2, 3, 4, 5, 6]
const INTERVALS = [10, 30, 60, 120, 300]
const SIZES: Record<Size, { label: string; width: number; height: number }> = {
  s: { label: 'Nhỏ', width: 200, height: 250 },
  m: { label: 'Vừa', width: 260, height: 320 },
  l: { label: 'Lớn', width: 340, height: 410 },
}
const THEMES: Record<Theme, string> = { auto: 'Theo máy', light: 'Sáng', dark: 'Tối' }

function loadSettings(): WidgetSettings {
  const fallback: WidgetSettings = { source: 'hsk', levels: [1], intervalSec: 30, size: 'm', theme: 'auto' }
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    return saved ? { ...fallback, ...JSON.parse(saved) } : fallback
  } catch {
    return fallback
  }
}

function loadFavorites(): string[] {
  try {
    const saved = localStorage.getItem(FAVORITES_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

export function DesktopWidget() {
  const bundle = useQuery({ queryKey: ['bundle'], queryFn: () => api.getBundle() })
  const characters = useMemo(() => bundle.data?.characters ?? [], [bundle.data?.characters])

  const [settings, setSettings] = useState<WidgetSettings>(loadSettings)
  const [favorites] = useState<string[]>(loadFavorites)
  const [showSettings, setShowSettings] = useState(false)
  const [current, setCurrent] = useState<BundleCharacter | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const currentRef = useRef(current)
  currentRef.current = current

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // ignore
    }
  }, [settings])

  useEffect(() => {
    const { width, height } = SIZES[settings.size]
    window.hibuWidget?.setSize(width, height)
  }, [settings.size])

  // Fixed light/dark, or follow the system theme.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () =>
      document.documentElement.classList.toggle('dark', settings.theme === 'auto' ? mq.matches : settings.theme === 'dark')
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings.theme])

  const pool = useMemo(() => {
    if (settings.source === 'favorites') {
      return characters.filter((c) => favorites.includes(c.hanzi))
    }
    return characters.filter((c) => c.hsk3Level !== null && settings.levels.includes(c.hsk3Level as HskLevel))
  }, [characters, favorites, settings.source, settings.levels])

  const next = useCallback(() => {
    const others = pool.filter((c) => c.hanzi !== currentRef.current?.hanzi)
    setCurrent(pickRandom(others.length > 0 ? others : pool) ?? null)
    setElapsed(0)
  }, [pool])

  // Re-pick whenever the pool changes.
  useEffect(() => {
    next()
  }, [next])

  useEffect(() => {
    if (showSettings) return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [showSettings])

  useEffect(() => {
    if (elapsed >= settings.intervalSec) next()
  }, [elapsed, settings.intervalSec, next])

  // Move the window by hand rather than with -webkit-app-region: drag regions swallow clicks and right-clicks.
  const drag = useRef<{ startX: number; startY: number; winX: number; winY: number } | null>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || showSettings) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { startX: e.screenX, startY: e.screenY, winX: window.screenX, winY: window.screenY }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    window.hibuWidget?.moveTo(d.winX + e.screenX - d.startX, d.winY + e.screenY - d.startY)
  }

  const onPointerUp = () => {
    drag.current = null
  }

  const toggleLevel = (lvl: HskLevel) => {
    setSettings((s) => {
      const levels = s.levels.includes(lvl) ? s.levels.filter((l) => l !== lvl) : [...s.levels, lvl]
      return { ...s, levels: levels.length > 0 ? levels : s.levels }
    })
  }

  const primary = current?.readings.find((r) => r.isPrimary) ?? current?.readings[0]
  const { width, height } = SIZES[settings.size]
  const glyphSize = Math.max(80, Math.min(width - 40, height - 120))

  return (
    <div
      className="dw-card"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={() => !showSettings && next()}
      onContextMenu={(e) => {
        e.preventDefault()
        setShowSettings((v) => !v)
      }}
    >
      {showSettings ? (
        <div className="dw-settings" onDoubleClick={(e) => e.stopPropagation()}>
          <span className="dw-label">Nguồn chữ</span>
          <div className="dw-row">
            <button
              type="button"
              className={`dw-chip ${settings.source === 'hsk' ? 'active' : ''}`}
              onClick={() => setSettings((s) => ({ ...s, source: 'hsk' }))}
            >
              HSK
            </button>
            <button
              type="button"
              className={`dw-chip ${settings.source === 'favorites' ? 'active' : ''}`}
              onClick={() => setSettings((s) => ({ ...s, source: 'favorites' }))}
            >
              Yêu thích ({favorites.length})
            </button>
          </div>

          {settings.source === 'hsk' && (
            <>
              <span className="dw-label">Cấp độ</span>
              <div className="dw-row">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    className={`dw-chip ${settings.levels.includes(lvl) ? 'active' : ''}`}
                    onClick={() => toggleLevel(lvl)}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </>
          )}

          <span className="dw-label">Đổi chữ sau</span>
          <div className="dw-row">
            {INTERVALS.map((sec) => (
              <button
                key={sec}
                type="button"
                className={`dw-chip ${settings.intervalSec === sec ? 'active' : ''}`}
                onClick={() => setSettings((s) => ({ ...s, intervalSec: sec }))}
              >
                {sec < 60 ? `${sec}s` : `${sec / 60}p`}
              </button>
            ))}
          </div>

          <span className="dw-label">Kích thước</span>
          <div className="dw-row">
            {(Object.keys(SIZES) as Size[]).map((size) => (
              <button
                key={size}
                type="button"
                className={`dw-chip ${settings.size === size ? 'active' : ''}`}
                onClick={() => setSettings((s) => ({ ...s, size }))}
              >
                {SIZES[size].label}
              </button>
            ))}
          </div>

          <span className="dw-label">Giao diện</span>
          <div className="dw-row">
            {(Object.keys(THEMES) as Theme[]).map((theme) => (
              <button
                key={theme}
                type="button"
                className={`dw-chip ${settings.theme === theme ? 'active' : ''}`}
                onClick={() => setSettings((s) => ({ ...s, theme }))}
              >
                {THEMES[theme]}
              </button>
            ))}
          </div>

          <div className="dw-row dw-footer">
            <button type="button" className="dw-chip active" onClick={() => setShowSettings(false)}>
              Xong
            </button>
            <button type="button" className="dw-chip" onClick={() => window.hibuWidget?.close()}>
              Thoát
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="dw-progress" style={{ width: `${(elapsed / settings.intervalSec) * 100}%` }} />
          {current ? (
            <div className="dw-content">
              <PartsGlyph hanzi={current.hanzi} size={glyphSize} />
              <div className="dw-pinyin">{primary?.pinyin}</div>
              {primary?.hanViet && <div className="dw-hanviet">{primary.hanViet}</div>}
              <div className="dw-meaning">{primary?.meaningVi}</div>
            </div>
          ) : (
            <div className="dw-content dw-empty">
              {bundle.isPending
                ? 'Đang tải…'
                : settings.source === 'favorites'
                  ? 'Chưa có chữ yêu thích'
                  : 'Không có chữ ở cấp này'}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Static glyph with the radical in blue and the other parts in red, same palette as the stroke-order canvas.
function PartsGlyph({ hanzi, size }: { hanzi: string; size: number }) {
  const [data, setData] = useState<{ hanzi: string; strokes: string[]; radStrokes: number[] } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    HanziWriter.loadCharacterData(hanzi)
      .then((d) => {
        if (!cancelled && d) setData({ hanzi, strokes: d.strokes, radStrokes: d.radStrokes ?? [] })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [hanzi])

  if (failed) {
    return (
      <div className="dw-glyph font-serif-sc" style={{ width: size, height: size, fontSize: size * 0.85 }}>
        {hanzi}
      </div>
    )
  }
  if (!data || data.hanzi !== hanzi) return <div className="dw-glyph" style={{ width: size, height: size }} />

  return (
    <svg className="dw-glyph" width={size} height={size} viewBox="0 0 1024 1024" aria-label={hanzi}>
      <g transform="translate(0, 900) scale(1, -1)">
        {data.strokes.map((d, i) => (
          <path key={i} d={d} className={data.radStrokes.includes(i) ? 'dw-stroke-radical' : 'dw-stroke'} />
        ))}
      </g>
    </svg>
  )
}
