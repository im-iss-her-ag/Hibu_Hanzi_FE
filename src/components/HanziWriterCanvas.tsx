import { useEffect, useRef, useState, useCallback } from 'react'
import HanziWriter from 'hanzi-writer'
import { Play, Pause, RotateCcw, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { inferStrokeName, type StrokeNameInfo } from '../utils/strokeNames'

type Mode = 'display' | 'animate' | 'quiz'

interface HanziWriterCanvasProps {
  hanzi: string
  /** Optional fixed pixel size. By default the tianzige fills its parent (CSS var --box). */
  size?: number
  displayMode?: 'modern' | 'components'
  defaultMode?: Mode
  onCompleteQuiz?: (mistakes: number) => void
}

/** Re-renders when the <html class="dark"> flag flips so canvas colours follow the theme. */
function useDarkFlag() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const el = document.documentElement
    const obs = new MutationObserver(() => setDark(el.classList.contains('dark')))
    obs.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

function cssVar(el: HTMLElement, name: string, fallback: string) {
  const v = getComputedStyle(el).getPropertyValue(name).trim()
  return v || fallback
}

export function HanziWriterCanvas({
  hanzi,
  size,
  displayMode = 'modern',
  defaultMode = 'display',
  onCompleteQuiz,
}: HanziWriterCanvasProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const writerRef = useRef<HanziWriter | null>(null)
  const [mode, setMode] = useState<Mode>(defaultMode)
  const [isPaused, setIsPaused] = useState(false)
  const [speed, setSpeed] = useState<number>(1)
  const [quizResult, setQuizResult] = useState<{ mistakes: number } | null>(null)
  const [boxPx, setBoxPx] = useState(size ?? 0)

  const [charData, setCharData] = useState<{ strokes: string[]; medians: number[][][] } | null>(null)
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState<number>(0)
  const [strokeInfo, setStrokeInfo] = useState<StrokeNameInfo | null>(null)

  const dark = useDarkFlag()

  // Some characters (e.g. rare radicals) have no stroke data: probe once per character
  const [noData, setNoData] = useState(false)
  useEffect(() => {
    let alive = true
    setNoData(false)
    HanziWriter.loadCharacterData(hanzi)
      .then((d) => {
        if (alive && !d) setNoData(true)
      })
      .catch(() => {
        if (alive) {
          setNoData(true)
          setMode('display')
        }
      })
    return () => {
      alive = false
    }
  }, [hanzi])
  const showStatic = noData || (mode === 'display' && displayMode !== 'components')

  // Measure the box so the writer canvas fills it exactly
  useEffect(() => {
    if (size) {
      setBoxPx(size)
      return
    }
    const el = boxRef.current
    if (!el) return
    const measure = () => setBoxPx(Math.round(el.clientWidth))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [size])

  useEffect(() => {
    if (charData && charData.medians && charData.medians[currentStrokeIndex]) {
      setStrokeInfo(inferStrokeName(charData.medians[currentStrokeIndex]))
    } else {
      setStrokeInfo(null)
    }
  }, [charData, currentStrokeIndex])

  // Initialize or reload HanziWriter
  useEffect(() => {
    const host = containerRef.current
    if (!host || boxPx <= 0 || noData) return

    host.innerHTML = ''
    if (showStatic) {
      writerRef.current = null
      setCharData(null)
      return
    }
    setQuizResult(null)
    setIsPaused(false)
    setCurrentStrokeIndex(0)

    let isSubscribed = true
    const ink = cssVar(host, '--ink', '#1d1a16')

    const writer = HanziWriter.create(host, hanzi, {
      width: boxPx,
      height: boxPx,
      padding: Math.round(boxPx * 0.11),
      showOutline: true,
      strokeAnimationSpeed: speed,
      delayBetweenStrokes: 180,
      strokeColor: ink,
      radicalColor: displayMode === 'components' ? cssVar(host, '--etymology', ink) : ink,
      outlineColor: cssVar(host, '--rule-strong', '#cfc3ad'),
      drawingColor: ink,
      highlightColor: cssVar(host, '--seal', '#b8322a'),
      showCharacter: mode === 'animate' || displayMode === 'components',
      onLoadCharDataError: () => {
        if (!isSubscribed) return
        setNoData(true)
        setMode('display')
      },
      onLoadCharDataSuccess: (data: any) => {
        if (!isSubscribed) return
        setCharData(data)
        if (data.medians && data.medians[0]) setStrokeInfo(inferStrokeName(data.medians[0]))
      },
    })
    writerRef.current = writer

    if (mode === 'animate') {
      Promise.resolve(writer.animateCharacter({ onComplete: () => setIsPaused(false) })).catch(() => {})
    } else if (mode === 'quiz') {
      writer.quiz({
        showHintAfterMisses: 3,
        onCorrectStroke: (d) => setCurrentStrokeIndex(d.strokeNum + 1),
        onComplete: (summary) => {
          setQuizResult({ mistakes: summary.totalMistakes })
          onCompleteQuiz?.(summary.totalMistakes)
        },
      })
    }

    return () => {
      isSubscribed = false
      writerRef.current = null
    }
  }, [hanzi, mode, speed, boxPx, dark, onCompleteQuiz, displayMode, showStatic, noData])

  const handleStartAnimate = useCallback(() => {
    if (mode === 'animate' && writerRef.current) {
      setQuizResult(null)
      setIsPaused(false)
      setCurrentStrokeIndex(0)
      writerRef.current.showCharacter()
      writerRef.current.animateCharacter({ onComplete: () => setIsPaused(false) })
      return
    }
    setMode('animate')
  }, [mode])

  const handleStartQuiz = useCallback(() => {
    if (mode === 'quiz' && writerRef.current) {
      setQuizResult(null)
      setCurrentStrokeIndex(0)
      writerRef.current.quiz({
        showHintAfterMisses: 3,
        onCorrectStroke: (d) => setCurrentStrokeIndex(d.strokeNum + 1),
        onComplete: (summary) => {
          setQuizResult({ mistakes: summary.totalMistakes })
          onCompleteQuiz?.(summary.totalMistakes)
        },
      })
      return
    }
    setMode('quiz')
  }, [mode, onCompleteQuiz])

  const handleTogglePause = useCallback(() => {
    if (!writerRef.current) return
    if (isPaused) {
      writerRef.current.resumeAnimation()
      setIsPaused(false)
    } else {
      writerRef.current.pauseAnimation()
      setIsPaused(true)
    }
  }, [isPaused])

  const handlePlayStroke = useCallback(
    (index: number) => {
      if (!writerRef.current || !charData) return
      const target = Math.max(0, Math.min(index, charData.strokes.length - 1))
      setCurrentStrokeIndex(target)
      setIsPaused(false)
      writerRef.current.animateStroke(target)
    },
    [charData],
  )

  const handleNextStroke = useCallback(() => {
    if (!charData) return
    handlePlayStroke(currentStrokeIndex < charData.strokes.length - 1 ? currentStrokeIndex + 1 : 0)
  }, [charData, currentStrokeIndex, handlePlayStroke])

  const handlePrevStroke = useCallback(() => {
    if (!charData) return
    handlePlayStroke(currentStrokeIndex > 0 ? currentStrokeIndex - 1 : charData.strokes.length - 1)
  }, [charData, currentStrokeIndex, handlePlayStroke])

  const toggleSpeed = () => setSpeed(speed === 1 ? 1.5 : speed === 1.5 ? 0.6 : 1)

  const totalStrokes = charData?.strokes.length ?? 0
  const boxStyle = size ? ({ ['--box' as string]: `${size}px` } as React.CSSProperties) : undefined

  return (
    <div className="st-stage" style={boxStyle}>
      <div className="st-tianzige" ref={boxRef}>
        <svg className="st-tianzige-grid" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" y1="0" x2="100" y2="100" vectorEffect="non-scaling-stroke" />
          <line x1="100" y1="0" x2="0" y2="100" vectorEffect="non-scaling-stroke" />
          <line x1="50" y1="0" x2="50" y2="100" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1="50" x2="100" y2="50" vectorEffect="non-scaling-stroke" />
        </svg>

        <div
          key={hanzi}
          className="st-glyph"
          lang="zh"
          onClick={handleStartAnimate}
          title="Xem thứ tự nét"
          hidden={!showStatic}
        >
          {hanzi}
        </div>
        <div ref={containerRef} className={`st-writer${mode === 'animate' ? ' st-writer-align' : ''}`} hidden={showStatic} />
        <div className={`st-controls${mode !== 'display' || noData ? ' on' : ''}`} aria-live="polite">
          {noData && <span className="st-stroke-status st-nodata" title="Chưa có dữ liệu nét viết cho chữ này">Chưa có dữ liệu nét viết cho chữ này</span>}
          {!noData && mode === 'animate' && (
            <>
              <button type="button" className="st-ctl" onClick={handlePrevStroke} title="Nét trước" aria-label="Nét trước">
                <ChevronLeft size={16} />
              </button>
              <button type="button" className="st-ctl" onClick={handleTogglePause} title={isPaused ? 'Tiếp tục' : 'Tạm dừng'} aria-label={isPaused ? 'Tiếp tục' : 'Tạm dừng'}>
                {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
              </button>
              <button type="button" className="st-ctl" onClick={handleNextStroke} title="Nét tiếp" aria-label="Nét tiếp">
                <ChevronRight size={16} />
              </button>
              <button type="button" className="st-ctl st-ctl-text" onClick={toggleSpeed} title="Tốc độ nét bút" aria-label={`Tốc độ ${speed}x`}>
                {speed}x
              </button>
              <button type="button" className="st-ctl" onClick={handleStartAnimate} title="Phát lại" aria-label="Phát lại">
                <RotateCcw size={14} />
              </button>
              <span className="st-stroke-status">
                {totalStrokes > 0 && <b>{currentStrokeIndex + 1}/{totalStrokes}</b>}
                {strokeInfo && <> {strokeInfo.nameVi}</>}
              </span>
            </>
          )}
          {!noData && mode === 'quiz' && (
            <>
              {quizResult ? (
                <>
                  <span className="st-stroke-status st-done">
                    <CheckCircle size={13} className="st-ok" /> Hoàn thành
                    {quizResult.mistakes > 0 ? ` · sai ${quizResult.mistakes}` : ''}
                  </span>
                  <button type="button" className="st-ctl st-ctl-text" onClick={handleStartQuiz} title="Xóa và viết lại">
                    <RotateCcw size={13} />&nbsp;Viết lại
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="st-ctl" onClick={handleStartQuiz} title="Xóa và viết lại" aria-label="Viết lại">
                    <RotateCcw size={14} />
                  </button>
                  <button type="button" className="st-ctl st-ctl-text" onClick={() => writerRef.current?.highlightStroke(currentStrokeIndex)} title="Gợi ý nét tiếp theo">
                    Gợi ý
                  </button>
                  <span className="st-stroke-status">
                    {totalStrokes > 0 ? <><b>Nét {Math.min(currentStrokeIndex + 1, totalStrokes)}/{totalStrokes}</b></> : 'Vẽ từng nét'}
                  </span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="st-segmented" role="group" aria-label="Chế độ chữ Hán">
        <button type="button" className={mode === 'display' ? 'active' : ''} aria-pressed={mode === 'display'} onClick={() => setMode('display')} title="Xem chữ">
          Chữ
        </button>
        <button type="button" className={mode === 'animate' ? 'active' : ''} aria-pressed={mode === 'animate'} aria-disabled={noData || undefined} disabled={noData} onClick={() => (mode === 'animate' ? setMode('animate') : handleStartAnimate())} title={noData ? 'Chưa có dữ liệu nét viết cho chữ này' : 'Xem thứ tự nét'}>
          Nét
        </button>
        <button type="button" className={mode === 'quiz' ? 'active' : ''} aria-pressed={mode === 'quiz'} aria-disabled={noData || undefined} disabled={noData} onClick={() => (mode === 'quiz' ? setMode('quiz') : handleStartQuiz())} title={noData ? 'Chưa có dữ liệu nét viết cho chữ này' : 'Tập viết lên ô kẻ'}>
          Viết
        </button>
      </div>
    </div>
  )
}
