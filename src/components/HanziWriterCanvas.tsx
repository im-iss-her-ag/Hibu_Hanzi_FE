import { useEffect, useRef, useState, useCallback } from 'react'
import HanziWriter from 'hanzi-writer'
import {
  Play,
  Pause,
  RotateCcw,
  PenTool,
  CheckCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
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
      setCurrentStrokeIndex(0)
      writer.animateCharacter({
        onComplete: () => {
          setIsPaused(false)
        },
      })
    } else if (mode === 'quiz') {
      writer.quiz({
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
      writerRef.current.showCharacter()
      writerRef.current.animateCharacter({
        onComplete: () => {
          setIsPaused(false)
        },
      })
    }
  }, [])

  const handleStartQuiz = useCallback(() => {
    setMode('quiz')
    setQuizResult(null)
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
    } else {
      writerRef.current.pauseAnimation()
      setIsPaused(true)
    }
  }, [isPaused])

  // Step-by-step: Play single stroke
  const handlePlayStroke = useCallback((index: number) => {
    if (!writerRef.current || !charData) return
    const max = charData.strokes.length
    const targetIdx = Math.max(0, Math.min(index, max - 1))
    setCurrentStrokeIndex(targetIdx)
    setIsPaused(false)
    writerRef.current.animateStroke(targetIdx)
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

      {/* Stroke step info: Compact 1-liner right under canvas */}
      {mode === 'animate' && strokeInfo && (
        <div className="stroke-step-inline-info">
          <span className="stroke-step-badge">Nét {currentStrokeIndex + 1}/{totalStrokes}</span>
          <span className="stroke-step-name">{strokeInfo.nameVi}</span>
          <span className="stroke-step-zh" lang="zh">{strokeInfo.nameZh}</span>
        </div>
      )}

      {/* Unified Minimal Toolbar: Exactly 1 clean bar */}
      <div className="canvas-unified-toolbar" role="toolbar" aria-label="Điều khiển chữ Hán">
        <div className="toolbar-segment-group">
          <button
            type="button"
            className={`toolbar-btn ${mode === 'display' ? 'active' : ''}`}
            onClick={() => setMode('display')}
            title="Chế độ chữ tĩnh chuẩn mực"
          >
            <Eye size={14} />
            <span>Chữ tĩnh</span>
          </button>

          <button
            type="button"
            className={`toolbar-btn ${mode === 'animate' ? 'active' : ''}`}
            onClick={handleStartAnimate}
            title="Xem hoạt họa thứ tự từng nét bút"
          >
            <Play size={14} />
            <span>Xem nét</span>
          </button>

          <button
            type="button"
            className={`toolbar-btn ${mode === 'quiz' ? 'active' : ''}`}
            onClick={handleStartQuiz}
            title="Tự tay vẽ nét chữ trực tiếp lên ô mễ tự"
          >
            <PenTool size={14} />
            <span>Tập viết</span>
          </button>
        </div>

        {/* Dynamic sub-controls integrated seamlessly on the right */}
        {mode === 'animate' && (
          <div className="toolbar-sub-controls">
            <button
              type="button"
              className="toolbar-sub-icon-btn"
              onClick={handlePrevStroke}
              title="Nét trước"
              aria-label="Nét trước"
            >
              <ChevronLeft size={15} />
            </button>

            <button
              type="button"
              className={`toolbar-sub-icon-btn ${isPaused ? 'paused' : ''}`}
              onClick={handleTogglePause}
              title={isPaused ? 'Tiếp tục vẽ' : 'Tạm dừng'}
              aria-label={isPaused ? 'Tiếp tục' : 'Tạm dừng'}
            >
              {isPaused ? <Play size={13} fill="currentColor" /> : <Pause size={13} fill="currentColor" />}
            </button>

            <button
              type="button"
              className="toolbar-sub-icon-btn"
              onClick={handleNextStroke}
              title="Nét tiếp"
              aria-label="Nét tiếp"
            >
              <ChevronRight size={15} />
            </button>

            <button
              type="button"
              className="toolbar-speed-badge"
              onClick={toggleSpeed}
              title="Tốc độ nét bút"
            >
              {speed}x
            </button>
          </div>
        )}

        {mode === 'quiz' && (
          <div className="toolbar-sub-controls">
            <button
              type="button"
              className="toolbar-sub-action-btn"
              onClick={handleStartQuiz}
              title="Xóa viết lại từ đầu"
            >
              <RotateCcw size={13} />
              <span>Viết lại</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
