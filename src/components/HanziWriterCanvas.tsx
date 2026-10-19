import { useEffect, useRef, useState, useCallback } from 'react'
import HanziWriter from 'hanzi-writer'
import { Play, RotateCcw, PenTool, CheckCircle, Eye, Gauge } from 'lucide-react'

interface HanziWriterCanvasProps {
  hanzi: string
  size?: number
  fontStyle?: 'calligraphy' | 'sans'
  defaultMode?: 'display' | 'animate' | 'quiz'
  onCompleteQuiz?: (mistakes: number) => void
}

export function HanziWriterCanvas({
  hanzi,
  size = 220,
  fontStyle = 'calligraphy',
  defaultMode = 'display',
  onCompleteQuiz,
}: HanziWriterCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const writerRef = useRef<HanziWriter | null>(null)
  const [mode, setMode] = useState<'display' | 'animate' | 'quiz'>(defaultMode)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState<number>(1)
  const [quizResult, setQuizResult] = useState<{ mistakes: number } | null>(null)

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  // Initialize or destroy HanziWriter
  useEffect(() => {
    if (!containerRef.current) return

    // In display mode, show static font glyph instead of HanziWriter canvas
    if (mode === 'display') {
      if (writerRef.current) {
        writerRef.current = null
      }
      containerRef.current.innerHTML = ''
      return
    }

    containerRef.current.innerHTML = ''
    setQuizResult(null)

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
      showCharacter: mode === 'animate',
    })

    writerRef.current = writer

    if (mode === 'animate') {
      setIsPlaying(true)
      writer.animateCharacter({
        onComplete: () => setIsPlaying(false),
      })
    } else if (mode === 'quiz') {
      writer.quiz({
        onComplete: (summary) => {
          setQuizResult({ mistakes: summary.totalMistakes })
          if (onCompleteQuiz) onCompleteQuiz(summary.totalMistakes)
        },
      })
    }

    return () => {
      writerRef.current = null
    }
  }, [hanzi, mode, speed, size, isDark, onCompleteQuiz])

  const handleStartAnimate = useCallback(() => {
    setMode('animate')
    setQuizResult(null)
    if (writerRef.current) {
      setIsPlaying(true)
      writerRef.current.showCharacter()
      writerRef.current.animateCharacter({
        onComplete: () => setIsPlaying(false),
      })
    }
  }, [])

  const handleStartQuiz = useCallback(() => {
    setMode('quiz')
    setQuizResult(null)
    setIsPlaying(false)
    if (writerRef.current) {
      writerRef.current.quiz({
        onComplete: (summary) => {
          setQuizResult({ mistakes: summary.totalMistakes })
          if (onCompleteQuiz) onCompleteQuiz(summary.totalMistakes)
        },
      })
    }
  }, [onCompleteQuiz])

  const handleReset = useCallback(() => {
    if (mode === 'quiz') {
      handleStartQuiz()
    } else {
      handleStartAnimate()
    }
  }, [mode, handleStartQuiz, handleStartAnimate])

  const toggleSpeed = () => {
    const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 0.75 : 1
    setSpeed(nextSpeed)
  }

  const fontClass =
    fontStyle === 'calligraphy' ? 'font-calligraphy' : 'font-sans-sc'

  return (
    <div className="hanzi-writer-canvas-wrapper">
      {/* Traditional Calligraphy Practice Card with authentic vector 米字格 (Mễ tự cách) */}
      <div
        className="mige-canvas-frame"
        style={{ width: `${size + 28}px`, height: `${size + 28}px` }}
      >
        {/* Authentic SVG Grid with Corner Brackets & Dashed Guides */}
        <svg
          className="mige-svg-grid"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* Outer fine border */}
          <rect
            x="3"
            y="3"
            width="94"
            height="94"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeOpacity="0.22"
          />
          {/* Inner frame */}
          <rect
            x="6"
            y="6"
            width="88"
            height="88"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeOpacity="0.14"
          />
          {/* Corner traditional marks */}
          <path
            d="M 12 8 L 8 8 L 8 12 M 88 8 L 92 8 L 92 12 M 12 92 L 8 92 L 8 88 M 88 92 L 92 92 L 92 88"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeOpacity="0.3"
          />
          {/* Diagonal guides */}
          <line
            x1="6"
            y1="6"
            x2="94"
            y2="94"
            stroke="currentColor"
            strokeWidth="0.65"
            strokeDasharray="2,2"
            strokeOpacity="0.22"
          />
          <line
            x1="94"
            y1="6"
            x2="6"
            y2="94"
            stroke="currentColor"
            strokeWidth="0.65"
            strokeDasharray="2,2"
            strokeOpacity="0.22"
          />
          {/* Cross center guides */}
          <line
            x1="50"
            y1="6"
            x2="50"
            y2="94"
            stroke="currentColor"
            strokeWidth="0.75"
            strokeDasharray="2.5,2.5"
            strokeOpacity="0.24"
          />
          <line
            x1="6"
            y1="50"
            x2="94"
            y2="50"
            stroke="currentColor"
            strokeWidth="0.75"
            strokeDasharray="2.5,2.5"
            strokeOpacity="0.24"
          />
        </svg>

        {/* Display mode: Large typographic glyph */}
        {mode === 'display' ? (
          <div
            className={`hanzi-static-glyph ${fontClass}`}
            lang="zh"
            onClick={handleStartAnimate}
            title="Bấm vào chữ để xem hoạt họa nét viết"
          >
            {hanzi}
          </div>
        ) : (
          <div ref={containerRef} className="hanzi-writer-surface" />
        )}

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

      {/* Redesigned Segmented Control Action Bar */}
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
          disabled={isPlaying}
          title="Xem hoạt họa thứ tự từng nét bút"
        >
          <Play size={14} />
          <span>{isPlaying ? 'Đang vẽ…' : 'Xem nét'}</span>
        </button>

        <button
          type="button"
          className={`toolbar-seg-btn ${mode === 'quiz' ? 'active' : ''}`}
          onClick={handleStartQuiz}
          title="Tự tay vẽ nét chữ lên ô mễ tự"
        >
          <PenTool size={14} />
          <span>Tập viết</span>
        </button>

        {mode !== 'display' && (
          <>
            <div className="toolbar-divider" />
            <button
              type="button"
              className="toolbar-tool-icon"
              onClick={handleReset}
              title="Vẽ lại từ đầu"
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              className="toolbar-tool-speed"
              onClick={toggleSpeed}
              title="Tốc độ nét bút"
            >
              <Gauge size={13} />
              <span>{speed}x</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
