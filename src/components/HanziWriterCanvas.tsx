import { useEffect, useRef, useState, useCallback } from 'react'
import HanziWriter from 'hanzi-writer'
import {
  Play,
  Pause,
  RotateCcw,
  PenTool,
  CheckCircle,
  Eye,
  Gauge,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import { inferStrokeName, type StrokeNameInfo } from '../utils/strokeNames'

interface HanziWriterCanvasProps {
  hanzi: string
  size?: number
  displayMode?: 'modern' | 'components'
  defaultMode?: 'display' | 'animate' | 'quiz'
  onCompleteQuiz?: (mistakes: number) => void
}

export function HanziWriterCanvas({
  hanzi,
  size = 220,
  displayMode = 'modern',
  defaultMode = 'display',
  onCompleteQuiz,
}: HanziWriterCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const writerRef = useRef<HanziWriter | null>(null)
  const [mode, setMode] = useState<'display' | 'animate' | 'quiz'>(defaultMode)
  const [, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [speed, setSpeed] = useState<number>(1)
  const [quizResult, setQuizResult] = useState<{ mistakes: number } | null>(null)

  // Step-by-step stroke state
  const [charData, setCharData] = useState<{ strokes: string[]; medians: number[][][] } | null>(null)
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState<number>(0)
  const [strokeInfo, setStrokeInfo] = useState<StrokeNameInfo | null>(null)

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  // Update stroke naming whenever currentStrokeIndex or charData changes
  useEffect(() => {
    if (charData && charData.medians && charData.medians[currentStrokeIndex]) {
      const info = inferStrokeName(charData.medians[currentStrokeIndex])
      setStrokeInfo(info)
    } else {
      setStrokeInfo(null)
    }
  }, [charData, currentStrokeIndex])

  // Initialize or reload HanziWriter
  useEffect(() => {
    if (!containerRef.current) return

    if (mode === 'display' && displayMode !== 'components') {
      if (writerRef.current) {
        writerRef.current = null
      }
      containerRef.current.innerHTML = ''
      setCharData(null)
      return
    }

    containerRef.current.innerHTML = ''
    setQuizResult(null)
    setIsPaused(false)

    let isSubscribed = true

    const writer = HanziWriter.create(containerRef.current, hanzi, {
      width: size,
      height: size,
      padding: 16,
      showOutline: true,
      strokeAnimationSpeed: speed,
      delayBetweenStrokes: 180,
      strokeColor: isDark ? '#f87171' : '#b91c1c',
      radicalColor: '#0284c7',
      outlineColor: isDark ? '#262c38' : '#e7e3da',
      drawingColor: isDark ? '#38bdf8' : '#1d4ed8',
      highlightColor: '#10b981',
      showCharacter: mode === 'animate' || displayMode === 'components',
      onLoadCharDataSuccess: (data: any) => {
        if (!isSubscribed) return
        setCharData(data)
        if (data.medians && data.medians[0]) {
          setStrokeInfo(inferStrokeName(data.medians[0]))
        }
      },
    })

    writerRef.current = writer

    if (mode === 'animate') {
      setIsPlaying(true)
      setCurrentStrokeIndex(0)
      writer.animateCharacter({
        onComplete: () => {
          setIsPlaying(false)
          setIsPaused(false)
        },
      })
    } else if (mode === 'quiz') {
      writer.quiz({
        onMistake: (_strokeData) => {
          // Keep quiz state active
        },
        onCorrectStroke: (strokeData) => {
          setCurrentStrokeIndex(strokeData.strokeNum + 1)
        },
        onComplete: (summary) => {
          setQuizResult({ mistakes: summary.totalMistakes })
          if (onCompleteQuiz) onCompleteQuiz(summary.totalMistakes)
        },
      })
    }

    return () => {
      isSubscribed = false
      writerRef.current = null
    }
  }, [hanzi, mode, speed, size, isDark, onCompleteQuiz, displayMode])

  const handleStartAnimate = useCallback(() => {
    setMode('animate')
    setQuizResult(null)
    setIsPaused(false)
    setCurrentStrokeIndex(0)
    if (writerRef.current) {
      setIsPlaying(true)
      writerRef.current.showCharacter()
      writerRef.current.animateCharacter({
        onComplete: () => {
          setIsPlaying(false)
          setIsPaused(false)
        },
      })
    }
  }, [])

  const handleStartQuiz = useCallback(() => {
    setMode('quiz')
    setQuizResult(null)
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentStrokeIndex(0)
    if (writerRef.current) {
      writerRef.current.quiz({
        onCorrectStroke: (strokeData) => {
          setCurrentStrokeIndex(strokeData.strokeNum + 1)
        },
        onComplete: (summary) => {
          setQuizResult({ mistakes: summary.totalMistakes })
          if (onCompleteQuiz) onCompleteQuiz(summary.totalMistakes)
        },
      })
    }
  }, [onCompleteQuiz])

  const handleTogglePause = useCallback(() => {
    if (!writerRef.current) return
    if (isPaused) {
      writerRef.current.resumeAnimation()
      setIsPaused(false)
      setIsPlaying(true)
    } else {
      writerRef.current.pauseAnimation()
      setIsPaused(true)
      setIsPlaying(false)
    }
  }, [isPaused])

  const handleReset = useCallback(() => {
    setCurrentStrokeIndex(0)
    if (mode === 'quiz') {
      handleStartQuiz()
    } else {
      handleStartAnimate()
    }
  }, [mode, handleStartQuiz, handleStartAnimate])

  // Step-by-step: Play single stroke
  const handlePlayStroke = useCallback((index: number) => {
    if (!writerRef.current || !charData) return
    const max = charData.strokes.length
    const targetIdx = Math.max(0, Math.min(index, max - 1))
    setCurrentStrokeIndex(targetIdx)
    setIsPlaying(true)
    setIsPaused(false)
    writerRef.current.animateStroke(targetIdx, {
      onComplete: () => {
        setIsPlaying(false)
      },
    })
  }, [charData])

  const handleNextStroke = useCallback(() => {
    if (!charData) return
    if (currentStrokeIndex < charData.strokes.length - 1) {
      handlePlayStroke(currentStrokeIndex + 1)
    } else {
      handlePlayStroke(0)
    }
  }, [charData, currentStrokeIndex, handlePlayStroke])

  const handlePrevStroke = useCallback(() => {
    if (!charData) return
    if (currentStrokeIndex > 0) {
      handlePlayStroke(currentStrokeIndex - 1)
    } else {
      handlePlayStroke(charData.strokes.length - 1)
    }
  }, [charData, currentStrokeIndex, handlePlayStroke])

  const toggleSpeed = () => {
    const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 0.6 : 1
    setSpeed(nextSpeed)
  }

  const fontClass = 'font-sans-sc'
  const totalStrokes = charData?.strokes.length ?? 0

  return (
    <div className="hanzi-writer-canvas-wrapper">
      {/* Stroke Step & Name Banner */}
      {mode !== 'display' && (
        <div className="stroke-step-banner">
          <div className="stroke-counter-pill">
            <span className="stroke-num-label">Nét</span>
            <span className="stroke-num-val">
              {totalStrokes > 0 ? `${currentStrokeIndex + 1}/${totalStrokes}` : '—'}
            </span>
          </div>

          <div className="stroke-info-text">
            {strokeInfo ? (
              <>
                <span className="stroke-name-vi">{strokeInfo.nameVi}</span>
                <span className="stroke-name-zh" lang="zh">{strokeInfo.nameZh}</span>
                {strokeInfo.direction && (
                  <span className="stroke-direction">({strokeInfo.direction})</span>
                )}
              </>
            ) : (
              <span className="stroke-loading">Đang tải nét bút…</span>
            )}
          </div>
        </div>
      )}

      {/* Traditional Calligraphy Practice Card with authentic vector 米字格 (Mễ tự cách) */}
      <div
        className="mige-canvas-frame"
        style={{ width: `${size + 28}px`, height: `${size + 28}px` }}
      >
        <svg
          className="mige-svg-grid"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="94" height="94" fill="none" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.22" />
          <rect x="6" y="6" width="88" height="88" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.14" />
          <path d="M 12 8 L 8 8 L 8 12 M 88 8 L 92 8 L 92 12 M 12 92 L 8 92 L 8 88 M 88 92 L 92 92 L 92 88" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
          <line x1="6" y1="6" x2="94" y2="94" stroke="currentColor" strokeWidth="0.65" strokeDasharray="2,2" strokeOpacity="0.22" />
          <line x1="94" y1="6" x2="6" y2="94" stroke="currentColor" strokeWidth="0.65" strokeDasharray="2,2" strokeOpacity="0.22" />
          <line x1="50" y1="6" x2="50" y2="94" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2.5,2.5" strokeOpacity="0.24" />
          <line x1="6" y1="50" x2="94" y2="50" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2.5,2.5" strokeOpacity="0.24" />
        </svg>

        {/* Display mode: Large typographic glyph */}
        <div
          className={`hanzi-static-glyph ${fontClass}`}
          lang="zh"
          onClick={handleStartAnimate}
          title="Bấm vào chữ để xem hoạt họa nét viết"
          style={{ display: mode === 'display' && displayMode !== 'components' ? undefined : 'none' }}
        >
          {hanzi}
        </div>
        <div
          ref={containerRef}
          className="hanzi-writer-surface"
          style={{ display: mode === 'display' && displayMode !== 'components' ? 'none' : undefined }}
        />

        {/* Quiz result celebration banner */}
        {quizResult !== null && (
          <div className="quiz-result-overlay">
            <CheckCircle size={18} className="success-icon" />
            <span>
              {quizResult.mistakes === 0
                ? 'Tuyệt vời! Viết đúng 100%'
                : `Hoàn thành (sai ${quizResult.mistakes} nét)`}
            </span>
          </div>
        )}
      </div>

      {/* Main Mode Toolbar (Chữ tĩnh / Xem nét / Tập viết) */}
      <div className="canvas-segmented-toolbar" role="toolbar" aria-label="Điều khiển nét chữ">
        <button
          type="button"
          className={`toolbar-seg-btn ${mode === 'display' ? 'active' : ''}`}
          onClick={() => setMode('display')}
          title="Chế độ chữ tĩnh chuẩn mực"
        >
          <Eye size={14} />
          <span>Chữ tĩnh</span>
        </button>

        <button
          type="button"
          className={`toolbar-seg-btn ${mode === 'animate' ? 'active' : ''}`}
          onClick={handleStartAnimate}
          title="Xem hoạt họa thứ tự từng nét bút"
        >
          <Play size={14} />
          <span>Xem nét</span>
        </button>

        <button
          type="button"
          className={`toolbar-seg-btn ${mode === 'quiz' ? 'active' : ''}`}
          onClick={handleStartQuiz}
          title="Tự tay vẽ nét chữ trực tiếp lên ô mễ tự"
        >
          <PenTool size={14} />
          <span>Tập viết tại đây</span>
        </button>
      </div>

      {/* Auxiliary Animation Controls (Step-by-step, Pause/Resume, Speed) */}
      {mode === 'animate' && (
        <div className="stroke-control-strip">
          <button
            type="button"
            className="stroke-ctrl-btn"
            onClick={handlePrevStroke}
            title="Xem nét trước"
            aria-label="Nét trước"
          >
            <SkipBack size={14} />
            <span>Nét trước</span>
          </button>

          <button
            type="button"
            className={`stroke-ctrl-btn play-pause-btn ${isPaused ? 'paused' : ''}`}
            onClick={handleTogglePause}
            title={isPaused ? 'Tiếp tục vẽ' : 'Tạm dừng xem nét'}
            aria-label={isPaused ? 'Tiếp tục' : 'Tạm dừng'}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
            <span>{isPaused ? 'Tiếp tục' : 'Tạm dừng'}</span>
          </button>

          <button
            type="button"
            className="stroke-ctrl-btn"
            onClick={handleNextStroke}
            title="Xem nét tiếp theo"
            aria-label="Nét tiếp"
          >
            <span>Nét tiếp</span>
            <SkipForward size={14} />
          </button>

          <div className="strip-divider" />

          <button
            type="button"
            className="stroke-ctrl-btn small-btn"
            onClick={handleReset}
            title="Vẽ lại toàn bộ từ đầu"
            aria-label="Vẽ lại"
          >
            <RotateCcw size={14} />
          </button>

          <button
            type="button"
            className="stroke-ctrl-btn speed-btn"
            onClick={toggleSpeed}
            title="Đổi tốc độ nét vẽ (0.6x / 1.0x / 1.5x)"
            aria-label="Tốc độ"
          >
            <Gauge size={13} />
            <span>{speed}x</span>
          </button>
        </div>
      )}

      {mode === 'quiz' && (
        <div className="stroke-control-strip">
          <button
            type="button"
            className="stroke-ctrl-btn primary-reset"
            onClick={handleStartQuiz}
            title="Xóa viết lại từ đầu"
          >
            <RotateCcw size={14} />
            <span>Viết lại từ đầu</span>
          </button>

          <span className="quiz-instruction-hint">
            Dùng chuột hoặc ngón tay vẽ theo từng nét trong ô Mễ tự
          </span>
        </div>
      )}
    </div>
  )
}
