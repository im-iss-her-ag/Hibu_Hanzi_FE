import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import HanziWriter from 'hanzi-writer'
import type { BundleCharacter, HskLevel } from '../core'
import { pickRandom } from '../core'
import { Pin, PinOff, Minus, X, Volume2 } from 'lucide-react'
import { api } from '../api'
import { speakChinese } from '../utils/speech'

// Frameless, always-on-top widget page for the Electron shell in desktop/.
// There is no visible chrome: drag the card to move it, double-click for the next character,
// right-click for settings. Keys: → next, ← previous, Space random.

// Exposed by desktop/preload.cjs. Missing when the page is opened in a normal browser.
interface WidgetBridge {
  moveTo(x: number, y: number): void
  setSize(width: number, height: number): void
  close(): void
  minimize(): void
  setPinned(pinned: boolean): void
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
  pinned: boolean
  // Animate the strokes: show the glyph still, write it, hold, then move on (ignores intervalSec).
  write: boolean
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
// Writing mode: still glyph before the strokes are drawn, and after they finish.
const WRITE_HOLD_MS = 5000

function loadSettings(): WidgetSettings {
  const fallback: WidgetSettings = { source: 'hsk', levels: [1], intervalSec: 30, size: 'm', theme: 'auto', pinned: true, write: false }
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

  useEffect(() => {
    window.hibuWidget?.setPinned(settings.pinned)
  }, [settings.pinned])

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

  const show = useCallback((c: BundleCharacter | null) => {
    setCurrent(c)
    setElapsed(0)
  }, [])

  const random = useCallback(() => {
    const others = pool.filter((c) => c.hanzi !== currentRef.current?.hanzi)
    show(pickRandom(others.length > 0 ? others : pool) ?? null)
  }, [pool, show])

  // Step through the pool in order, wrapping around.
  const step = useCallback(
    (delta: number) => {
      if (pool.length === 0) return
      const idx = pool.findIndex((c) => c.hanzi === currentRef.current?.hanzi)
      show(pool[(idx + delta + pool.length) % pool.length])
    },
    [pool, show],
  )

  // Re-pick whenever the pool changes.
  useEffect(() => {
    random()
  }, [random])

  // Timed mode only: writing mode moves on when the animation cycle ends.
  useEffect(() => {
    if (showSettings || settings.write) return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [showSettings, settings.write])

  useEffect(() => {
    if (elapsed >= settings.intervalSec) random()
  }, [elapsed, settings.intervalSec, random])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showSettings) return
      if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === ' ') random()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showSettings, step, random])

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
      onDoubleClick={() => !showSettings && random()}
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

          <span className="dw-label">Viết chữ</span>
          <div className="dw-row">
            <button
              type="button"
              className={`dw-chip ${!settings.write ? 'active' : ''}`}
              onClick={() => setSettings((s) => ({ ...s, write: false }))}
            >
              Không viết
            </button>
            <button
              type="button"
              className={`dw-chip ${settings.write ? 'active' : ''}`}
              onClick={() => setSettings((s) => ({ ...s, write: true }))}
            >
              Có viết
            </button>
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
          <div className="dw-window-btns" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="dw-window-btn"
              onClick={() => current && speakChinese(primary?.pinyin || current.hanzi)}
              title="Phát âm"
            >
              <Volume2 size={13} />
            </button>
            <button
              type="button"
              className={`dw-window-btn ${settings.pinned ? 'active' : ''}`}
              onClick={() => setSettings((s) => ({ ...s, pinned: !s.pinned }))}
              title={settings.pinned ? 'Bỏ ghim (không luôn nổi trên cùng)' : 'Ghim luôn nổi trên cùng'}
            >
              {settings.pinned ? <Pin size={13} /> : <PinOff size={13} />}
            </button>
            <button type="button" className="dw-window-btn" onClick={() => window.hibuWidget?.minimize()} title="Ẩn xuống thanh tác vụ">
              <Minus size={13} />
            </button>
            <button type="button" className="dw-window-btn dw-close" onClick={() => window.hibuWidget?.close()} title="Tắt app">
              <X size={13} />
            </button>
          </div>
          {!settings.write && (
            <div className="dw-progress" style={{ width: `${(elapsed / settings.intervalSec) * 100}%` }} />
          )}
          {current ? (
            <div className="dw-content">
              {settings.write ? (
                <WritingGlyph
                  key={current.hanzi}
                  hanzi={current.hanzi}
                  size={glyphSize}
                  paused={showSettings}
                  onDone={random}
                />
              ) : (
                <PartsGlyph hanzi={current.hanzi} size={glyphSize} />
              )}
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

// Writing mode: hold the still glyph, animate its strokes, hold again, then call onDone.
// HanziWriter's own renderer is fine here (the clip-path issue was only in PiP documents).
function WritingGlyph({
  hanzi,
  size,
  paused,
  onDone,
}: {
  hanzi: string
  size: number
  paused: boolean
  onDone: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    const el = ref.current
    if (!el || paused) return
    el.innerHTML = ''
    const dark = document.documentElement.classList.contains('dark')
    let timer = 0
    let cancelled = false
    const writer = HanziWriter.create(el, hanzi, {
      width: size,
      height: size,
      padding: 4,
      showOutline: true,
      outlineColor: dark ? '#262c38' : '#e7e3da',
      strokeColor: dark ? '#f87171' : '#b91c1c',
      radicalColor: dark ? '#38bdf8' : '#0284c7',
      delayBetweenStrokes: 200,
      onLoadCharDataError: () => {
        if (!cancelled) timer = window.setTimeout(() => onDoneRef.current(), WRITE_HOLD_MS)
      },
    })
    timer = window.setTimeout(() => {
      writer.animateCharacter({
        onComplete: () => {
          if (!cancelled) timer = window.setTimeout(() => onDoneRef.current(), WRITE_HOLD_MS)
        },
      })
    }, WRITE_HOLD_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      el.innerHTML = ''
    }
  }, [hanzi, size, paused])

  return <div ref={ref} className="dw-glyph" style={{ width: size, height: size }} />
}
