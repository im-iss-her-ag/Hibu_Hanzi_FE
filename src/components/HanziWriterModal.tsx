import { useEffect, useRef, useState } from 'react'
import HanziWriter from 'hanzi-writer'
import { Play, RotateCcw, PenTool, Volume2, X, Sparkles, CheckCircle } from 'lucide-react'
import { speakChinese } from '../utils/speech'

interface HanziWriterModalProps {
  hanzi: string
  pinyin?: string
  hanViet?: string
  meaningVi?: string
  strokeCount?: number | null
  onClose: () => void
}

export function HanziWriterModal({
  hanzi,
  pinyin,
  hanViet,
  meaningVi,
  strokeCount,
  onClose,
}: HanziWriterModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const writerRef = useRef<HanziWriter | null>(null)
  const [mode, setMode] = useState<'animate' | 'quiz'>('animate')
  const [isPlaying, setIsPlaying] = useState(false)
  const [quizScore, setQuizScore] = useState<{ totalMistakes: number } | null>(null)
  const [speed, setSpeed] = useState<number>(1)

  useEffect(() => {
    if (!containerRef.current) return

    containerRef.current.innerHTML = ''
    setQuizScore(null)

    const isDark = document.documentElement.classList.contains('dark')

    const writer = HanziWriter.create(containerRef.current, hanzi, {
      width: 240,
      height: 240,
      padding: 15,
      showOutline: true,
      strokeAnimationSpeed: speed,
      delayBetweenStrokes: 180,
      strokeColor: isDark ? '#fb7185' : '#c2410c',
      radicalColor: '#0284c7',
      outlineColor: isDark ? '#334155' : '#e2e8f0',
      drawingColor: isDark ? '#38bdf8' : '#2563eb',
      highlightColor: '#10b981',
      showCharacter: true,
    })

    writerRef.current = writer

    if (mode === 'animate') {
      setIsPlaying(true)
      writer.animateCharacter({
        onComplete: () => setIsPlaying(false),
      })
    } else {
      startQuiz(writer)
    }

    return () => {
      writerRef.current = null
    }
  }, [hanzi, mode, speed])

  const startQuiz = (writerInstance?: HanziWriter) => {
    const writer = writerInstance ?? writerRef.current
    if (!writer) return
    setMode('quiz')
    setQuizScore(null)
    setIsPlaying(false)
    writer.quiz({
      onComplete: (summary) => {
        setQuizScore({ totalMistakes: summary.totalMistakes })
      },
    })
  }

  const handleReplay = () => {
    if (!writerRef.current) return
    setMode('animate')
    setQuizScore(null)
    setIsPlaying(true)
    writerRef.current.showCharacter()
    writerRef.current.animateCharacter({
      onComplete: () => setIsPlaying(false),
    })
  }

  const handleSpeak = () => {
    speakChinese(hanzi)
  }

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-content writer-modal"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >

        <div className="modal-header">
          <div className="header-info">
            <h3 className="modal-title">Tập viết & Nét bút</h3>
            <span className="badge-tag">{strokeCount ? `${strokeCount} nét` : 'Chữ Hán'}</span>
          </div>
          <button type="button" className="icon-btn close-btn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        <div className="writer-display">
          {/* Tianzige grid background styled canvas container */}
          <div className="tianzige-box">
            <div ref={containerRef} className="hanzi-writer-canvas" />
            <div className="tianzige-cross" />
          </div>

          <div className="char-summary-strip">
            <button
              type="button"
              className="speak-pill-btn"
              onClick={handleSpeak}
              title="Nghe phát âm"
            >
              <Volume2 size={16} />
              <span className="pinyin-text">{pinyin}</span>
            </button>
            {hanViet && <span className="hanviet-tag">{hanViet.toUpperCase()}</span>}
            {meaningVi && <span className="meaning-tag">{meaningVi}</span>}
          </div>

          {quizScore && (
            <div className="quiz-result-banner">
              <CheckCircle size={18} className="success-icon" />
              <span>
                {quizScore.totalMistakes === 0
                  ? 'Tuyệt vời! Bạn đã viết hoàn toàn chính xác mọi nét!'
                  : `Hoàn thành! Bạn đã viết đúng (sai ${quizScore.totalMistakes} lần thử).`}
              </span>
            </div>
          )}
        </div>

        <div className="writer-controls">
          <div className="button-group">
            <button
              type="button"
              className={`control-btn ${mode === 'animate' ? 'active' : ''}`}
              onClick={handleReplay}
              disabled={isPlaying && mode === 'animate'}
            >
              {mode === 'animate' && isPlaying ? <RotateCcw size={16} className="spin" /> : <Play size={16} />}
              <span>{isPlaying ? 'Đang viết…' : 'Chạy nét bút'}</span>
            </button>

            <button
              type="button"
              className={`control-btn ${mode === 'quiz' ? 'active' : ''}`}
              onClick={() => startQuiz()}
            >
              <PenTool size={16} />
              <span>Tập viết (Vẽ nét)</span>
            </button>
          </div>

          <div className="speed-selector">
            <span className="speed-label">Tốc độ:</span>
            {[0.75, 1, 1.5].map((s) => (
              <button
                key={s}
                type="button"
                className={`speed-pill ${speed === s ? 'active' : ''}`}
                onClick={() => setSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div className="writer-guide-tip">
          <Sparkles size={14} className="tip-icon" />
          <span>
            {mode === 'quiz'
              ? 'Dùng chuột hoặc ngón tay để vẽ từng nét vào ô kẻ mễ tự. Nếu vẽ sai 3 lần, nét chuẩn sẽ hiện lên nhấp nháy chỉ đường!'
              : 'Quy tắc bút thuận tiếng Trung: Từ trên xuống dưới, từ trái sang phải, ngang trước sổ sau, ngoài trước trong sau.'}
          </span>
        </div>
      </div>
    </div>
  )
}
