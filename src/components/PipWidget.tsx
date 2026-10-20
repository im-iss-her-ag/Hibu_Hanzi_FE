import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import HanziWriter from 'hanzi-writer'
import { Settings, X, PictureInPicture2, Download } from 'lucide-react'
import type { BundleCharacter, HskLevel } from '../core'
import { pickRandom } from '../core'

// The widget is a canvas streamed into a <video> and shown with video Picture-in-Picture.
// Unlike Document PiP, Chrome only shows its title bar and buttons on hover, so the idle widget is just the card.

type Source = 'hsk' | 'favorites'

interface WidgetSettings {
  source: Source
  levels: HskLevel[]
  intervalSec: number
}

// Installers from desktop/, attached to GitHub Releases by .github/workflows/desktop-release.yml.
const RELEASES = 'https://github.com/im-iss-her-ag/Hibu_Hanzi_FE/releases'

function desktopDownloadUrl() {
  const ua = navigator.userAgent
  if (/Windows/i.test(ua)) return `${RELEASES}/latest/download/Hibu-Hanzi-Widget-Setup.exe`
  if (/Mac OS X/i.test(ua)) return `${RELEASES}/latest/download/Hibu-Hanzi-Widget.dmg`
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return `${RELEASES}/latest/download/Hibu-Hanzi-Widget.AppImage`
  return `${RELEASES}/latest`
}

const SETTINGS_KEY = 'hibu_pip_settings'
const LEVELS: HskLevel[] = [1, 2, 3, 4, 5, 6]
const INTERVALS = [10, 30, 60, 120, 300]

// Canvas size in CSS pixels; drawn at SCALE for a sharp picture when the PiP window is enlarged.
const WIDTH = 300
const HEIGHT = 340
const SCALE = 3

interface Glyph {
  strokes: Path2D[]
  radStrokes: number[]
}

function loadSettings(): WidgetSettings {
  const fallback: WidgetSettings = { source: 'hsk', levels: [1], intervalSec: 30 }
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    return saved ? { ...fallback, ...JSON.parse(saved) } : fallback
  } catch {
    return fallback
  }
}

// Timers on the main thread are throttled to once a minute in a hidden tab; a worker keeps ticking every second.
function createTicker(onTick: () => void) {
  const src = 'setInterval(() => postMessage(0), 1000)'
  const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))
  const worker = new Worker(url)
  worker.onmessage = onTick
  return () => {
    worker.terminate()
    URL.revokeObjectURL(url)
  }
}

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let cut = text
  while (cut.length > 1 && ctx.measureText(cut + '…').width > maxWidth) cut = cut.slice(0, -1)
  return cut + '…'
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  char: BundleCharacter | null,
  glyph: Glyph | null,
  progress: number,
  emptyText: string,
) {
  const dark = document.documentElement.classList.contains('dark')
  const font = cssVar('--font-ui') || 'system-ui, sans-serif'

  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0)
  ctx.fillStyle = cssVar('--bg-main') || '#f7f5f0'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  ctx.fillStyle = cssVar('--accent-seal') || '#c2410c'
  ctx.globalAlpha = 0.7
  ctx.fillRect(0, 0, WIDTH * progress, 3)
  ctx.globalAlpha = 1

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  if (!char) {
    ctx.fillStyle = cssVar('--fg-muted') || '#78716c'
    ctx.font = `500 15px ${font}`
    ctx.fillText(emptyText, WIDTH / 2, HEIGHT / 2)
    return
  }

  const primary = char.readings.find((r) => r.isPrimary) ?? char.readings[0]
  const glyphSize = 200
  const gx = (WIDTH - glyphSize) / 2
  const gy = 18

  if (glyph) {
    const red = dark ? '#f87171' : '#b91c1c'
    const blue = dark ? '#38bdf8' : '#0284c7'
    const s = glyphSize / 1024
    // Stroke data uses a 1024 box with the y axis pointing up and the baseline at 900.
    ctx.setTransform(SCALE * s, 0, 0, -SCALE * s, SCALE * gx, SCALE * (gy + 900 * s))
    glyph.strokes.forEach((path, i) => {
      ctx.fillStyle = glyph.radStrokes.includes(i) ? blue : red
      ctx.fill(path)
    })
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0)
  } else {
    ctx.fillStyle = cssVar('--fg-main') || '#1c1917'
    ctx.font = `700 160px 'Noto Serif SC', serif`
    ctx.fillText(char.hanzi, WIDTH / 2, gy + 170)
  }

  let y = gy + glyphSize + 34
  ctx.fillStyle = cssVar('--accent-blue') || '#0284c7'
  ctx.font = `700 24px ${font}`
  ctx.fillText(primary?.pinyin ?? '', WIDTH / 2, y)

  if (primary?.hanViet) {
    y += 24
    ctx.fillStyle = cssVar('--accent-seal') || '#c2410c'
    ctx.font = `800 15px ${font}`
    ctx.fillText(primary.hanViet.toUpperCase(), WIDTH / 2, y)
  }

  y += 24
  ctx.fillStyle = cssVar('--fg-muted') || '#78716c'
  ctx.font = `500 15px ${font}`
  ctx.fillText(fitText(ctx, primary?.meaningVi ?? '', WIDTH - 32), WIDTH / 2, y)
}

interface PipWidgetProps {
  characters: BundleCharacter[]
  favorites: string[]
  // Called with each new character so the main page can follow the widget.
  onCharacterChange: (hanzi: string) => void
}

export function PipWidget({ characters, favorites, onCharacterChange }: PipWidgetProps) {
  const [settings, setSettings] = useState<WidgetSettings>(loadSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [active, setActive] = useState(false)
  const [paused, setPaused] = useState(false)
  const [current, setCurrent] = useState<BundleCharacter | null>(null)
  const [glyph, setGlyph] = useState<Glyph | null>(null)
  const [elapsed, setElapsed] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const historyRef = useRef<BundleCharacter[]>([])
  const currentRef = useRef(current)
  currentRef.current = current
  const onChangeRef = useRef(onCharacterChange)
  onChangeRef.current = onCharacterChange

  const supported = typeof document !== 'undefined' && document.pictureInPictureEnabled

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // ignore
    }
  }, [settings])

  const pool = useMemo(() => {
    if (settings.source === 'favorites') {
      return characters.filter((c) => favorites.includes(c.hanzi))
    }
    return characters.filter((c) => c.hsk3Level !== null && settings.levels.includes(c.hsk3Level as HskLevel))
  }, [characters, favorites, settings.source, settings.levels])

  const next = useCallback(() => {
    if (currentRef.current) historyRef.current = [...historyRef.current.slice(-49), currentRef.current]
    const others = pool.filter((c) => c.hanzi !== currentRef.current?.hanzi)
    setCurrent(pickRandom(others.length > 0 ? others : pool) ?? null)
    setElapsed(0)
  }, [pool])

  const prev = useCallback(() => {
    const last = historyRef.current.pop()
    if (!last) return
    setCurrent(last)
    setElapsed(0)
  }, [])

  // Re-pick whenever the pool changes.
  useEffect(() => {
    next()
  }, [next])

  useEffect(() => {
    if (active && current) onChangeRef.current(current.hanzi)
  }, [active, current])

  useEffect(() => {
    if (!current) return
    let cancelled = false
    setGlyph(null)
    HanziWriter.loadCharacterData(current.hanzi)
      .then((d) => {
        if (!cancelled && d) setGlyph({ strokes: d.strokes.map((s) => new Path2D(s)), radStrokes: d.radStrokes ?? [] })
      })
      .catch(() => {
        // Leave glyph null: the card falls back to the font glyph.
      })
    return () => {
      cancelled = true
    }
  }, [current])

  useEffect(() => {
    if (!active || paused) return
    return createTicker(() => setElapsed((e) => e + 1))
  }, [active, paused])

  useEffect(() => {
    if (elapsed >= settings.intervalSec) next()
  }, [elapsed, settings.intervalSec, next])

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const emptyText = settings.source === 'favorites' ? 'Chưa có chữ yêu thích' : 'Không có chữ ở cấp này'
    drawCard(ctx, current, glyph, Math.min(1, elapsed / settings.intervalSec), emptyText)
  }, [current, glyph, elapsed, settings.intervalSec, settings.source])
  const drawRef = useRef(draw)
  drawRef.current = draw

  // Redraw on every tick too: captureStream only emits frames when the canvas changes.
  useEffect(draw, [draw])

  // Play/pause and next/previous buttons in the PiP window.
  useEffect(() => {
    if (!active || !('mediaSession' in navigator)) return
    const ms = navigator.mediaSession
    ms.metadata = new MediaMetadata({ title: 'Hibu Hanzi', artist: current?.hanzi ?? '' })
    ms.playbackState = paused ? 'paused' : 'playing'
    ms.setActionHandler('play', () => {
      setPaused(false)
      videoRef.current?.play()
    })
    ms.setActionHandler('pause', () => {
      setPaused(true)
      videoRef.current?.pause()
    })
    ms.setActionHandler('nexttrack', next)
    ms.setActionHandler('previoustrack', prev)
    return () => {
      for (const action of ['play', 'pause', 'nexttrack', 'previoustrack'] as const) {
        ms.setActionHandler(action, null)
      }
    }
  }, [active, paused, current, next, prev])

  const openPip = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture()
      return
    }
    if (!video.srcObject) video.srcObject = canvas.captureStream()
    // A fresh stream has no frame until the canvas is painted again, and play() waits for one.
    drawRef.current()
    await video.play()
    await video.requestPictureInPicture()
    setPaused(false)
    setActive(true)
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onLeave = () => {
      setActive(false)
      video.pause()
    }
    video.addEventListener('leavepictureinpicture', onLeave)
    return () => video.removeEventListener('leavepictureinpicture', onLeave)
  }, [])

  const toggleLevel = (lvl: HskLevel) => {
    setSettings((s) => {
      const levels = s.levels.includes(lvl) ? s.levels.filter((l) => l !== lvl) : [...s.levels, lvl]
      return { ...s, levels: levels.length > 0 ? levels : s.levels }
    })
  }

  return (
    <div className="pip-dock">
      <canvas ref={canvasRef} width={WIDTH * SCALE} height={HEIGHT * SCALE} className="pip-offscreen" />
      <video ref={videoRef} muted playsInline className="pip-offscreen" />

      {showSettings && (
        <div className="pip-settings" role="dialog" aria-label="Cài đặt widget">
          <div className="pip-settings-head">
            <span>Cài đặt widget</span>
            <button type="button" className="pip-icon-btn" onClick={() => setShowSettings(false)} aria-label="Đóng">
              <X size={15} />
            </button>
          </div>

          <span className="pip-field-label">Nguồn chữ</span>
          <div className="pip-chip-row">
            <button
              type="button"
              className={`pip-chip ${settings.source === 'hsk' ? 'active' : ''}`}
              onClick={() => setSettings((s) => ({ ...s, source: 'hsk' }))}
            >
              HSK
            </button>
            <button
              type="button"
              className={`pip-chip ${settings.source === 'favorites' ? 'active' : ''}`}
              onClick={() => setSettings((s) => ({ ...s, source: 'favorites' }))}
            >
              Yêu thích ({favorites.length})
            </button>
          </div>

          {settings.source === 'hsk' && (
            <>
              <span className="pip-field-label">Cấp độ</span>
              <div className="pip-chip-row">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    className={`pip-chip ${settings.levels.includes(lvl) ? 'active' : ''}`}
                    onClick={() => toggleLevel(lvl)}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </>
          )}

          <span className="pip-field-label">Đổi chữ sau</span>
          <div className="pip-chip-row">
            {INTERVALS.map((sec) => (
              <button
                key={sec}
                type="button"
                className={`pip-chip ${settings.intervalSec === sec ? 'active' : ''}`}
                onClick={() => setSettings((s) => ({ ...s, intervalSec: sec }))}
              >
                {sec < 60 ? `${sec}s` : `${sec / 60}p`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pip-launch-group">
        <a
          className="pip-launch-btn pip-download-btn"
          href={desktopDownloadUrl()}
          title="Tải app widget cho máy tính: không viền, luôn nổi trên màn hình"
        >
          <Download size={18} />
          <span>Tải app</span>
        </a>
        <button
          type="button"
          className="pip-launch-btn"
          onClick={openPip}
          disabled={!supported}
          title={supported ? 'Mở widget chữ Hán luôn nổi trên màn hình' : 'Trình duyệt chưa hỗ trợ Picture-in-Picture'}
        >
          <PictureInPicture2 size={18} />
          <span>{active ? 'Đóng widget' : 'Widget'}</span>
        </button>
        <button
          type="button"
          className="pip-launch-btn"
          onClick={() => setShowSettings((v) => !v)}
          aria-label="Cài đặt widget"
        >
          <Settings size={18} />
        </button>
      </div>
    </div>
  )
}
