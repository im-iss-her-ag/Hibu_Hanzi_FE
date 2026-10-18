import { Volume2, Play } from 'lucide-react'
import type { ToneData } from '../utils/pinyinData'
import { TONES_DATA } from '../utils/pinyinData'
import { speakChinese } from '../utils/speech'

interface ToneContourDiagramProps {
  activeTone: 1 | 2 | 3 | 4 | 0
  toneVariants: {
    tone: 1 | 2 | 3 | 4
    pinyin: string
  }[]
  onSelectTone?: (tone: 1 | 2 | 3 | 4) => void
}

export function ToneContourDiagram({
  activeTone,
  toneVariants,
  onSelectTone,
}: ToneContourDiagramProps) {
  const currentToneInfo: ToneData = TONES_DATA[activeTone] || TONES_DATA[1]

  const handleSpeakTone = (pinyinText: string) => {
    speakChinese(pinyinText)
  }

  return (
    <div className="tone-contour-container">
      <div className="tone-contour-top">
        <div className="contour-graph-card">
          <div className="graph-card-header">
            <span className="graph-card-title">Hệ tọa độ cao độ 5 bậc (Tone Pitch Contour)</span>
            <span className="current-tone-badge">
              {currentToneInfo.nameVi} ({currentToneInfo.pitchNumber})
            </span>
          </div>

          <div className="svg-contour-wrapper">
            <svg
              viewBox="0 0 340 180"
              className="contour-svg"
              aria-label="Biểu đồ cao độ 5 bậc thanh điệu"
            >
              <defs>
                <linearGradient id="t1Grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#f87171" />
                </linearGradient>
                <linearGradient id="t2Grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
                <linearGradient id="t3Grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
                <linearGradient id="t4Grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
              </defs>

              {/* Pitch Axis Lines (Level 1 to 5) */}
              {[
                { y: 30, level: '5', label: 'Cao (5)' },
                { y: 60, level: '4', label: 'Nửa cao (4)' },
                { y: 90, level: '3', label: 'Trung bình (3)' },
                { y: 120, level: '2', label: 'Nửa thấp (2)' },
                { y: 150, level: '1', label: 'Thấp (1)' },
              ].map(({ y, level, label }) => (
                <g key={level} className="pitch-level-row">
                  <line
                    x1="60"
                    y1={y}
                    x2="320"
                    y2={y}
                    stroke="var(--border-line)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x="50"
                    y={y + 4}
                    textAnchor="end"
                    fontSize="9.5"
                    fill="var(--fg-muted)"
                    fontWeight="600"
                  >
                    {label}
                  </text>
                </g>
              ))}

              {/* Vertical Time Axis */}
              <line x1="60" y1="20" x2="60" y2="160" stroke="var(--border-line)" strokeWidth="1.5" />
              <line x1="60" y1="160" x2="320" y2="160" stroke="var(--border-line)" strokeWidth="1.5" />
              <text x="320" y="174" textAnchor="end" fontSize="9" fill="var(--fg-subtle)">
                Thời gian (Thời lượng phát âm) →
              </text>

              {/* Tone 1: High Level (55) -> y = 30 */}
              <g
                className={`tone-path-group tone-1 ${activeTone === 1 ? 'is-active-tone' : 'dimmed'}`}
                onClick={() => onSelectTone?.(1)}
              >
                <line
                  x1="80"
                  y1="30"
                  x2="280"
                  y2="30"
                  stroke={activeTone === 1 ? 'url(#t1Grad)' : '#cbd5e1'}
                  strokeWidth={activeTone === 1 ? 5 : 2}
                  strokeLinecap="round"
                />
                <circle cx="80" cy="30" r={activeTone === 1 ? 5 : 3} fill="#ef4444" />
                <circle cx="280" cy="30" r={activeTone === 1 ? 5 : 3} fill="#ef4444" />
                <text
                  x="288"
                  y="34"
                  fontSize="11"
                  fontWeight="bold"
                  fill={activeTone === 1 ? '#ef4444' : 'var(--fg-subtle)'}
                >
                  T1 (55)
                </text>
              </g>

              {/* Tone 2: High Rising (35) -> from (80, 90) to (270, 30) */}
              <g
                className={`tone-path-group tone-2 ${activeTone === 2 ? 'is-active-tone' : 'dimmed'}`}
                onClick={() => onSelectTone?.(2)}
              >
                <path
                  d="M 80 90 Q 170 65, 270 30"
                  fill="none"
                  stroke={activeTone === 2 ? 'url(#t2Grad)' : '#cbd5e1'}
                  strokeWidth={activeTone === 2 ? 5 : 2}
                  strokeLinecap="round"
                />
                <circle cx="80" cy="90" r={activeTone === 2 ? 5 : 3} fill="#10b981" />
                <circle cx="270" cy="30" r={activeTone === 2 ? 5 : 3} fill="#10b981" />
                <text
                  x="278"
                  y="36"
                  fontSize="11"
                  fontWeight="bold"
                  fill={activeTone === 2 ? '#10b981' : 'var(--fg-subtle)'}
                >
                  T2 (35)
                </text>
              </g>

              {/* Tone 3: Falling-Rising Dipped (214) -> (80, 120) to (170, 150) to (270, 60) */}
              <g
                className={`tone-path-group tone-3 ${activeTone === 3 ? 'is-active-tone' : 'dimmed'}`}
                onClick={() => onSelectTone?.(3)}
              >
                <path
                  d="M 80 120 Q 150 162, 180 150 T 270 60"
                  fill="none"
                  stroke={activeTone === 3 ? 'url(#t3Grad)' : '#cbd5e1'}
                  strokeWidth={activeTone === 3 ? 5 : 2}
                  strokeLinecap="round"
                />
                <circle cx="80" cy="120" r={activeTone === 3 ? 5 : 3} fill="#8b5cf6" />
                <circle cx="180" cy="150" r={activeTone === 3 ? 5 : 3} fill="#8b5cf6" />
                <circle cx="270" cy="60" r={activeTone === 3 ? 5 : 3} fill="#8b5cf6" />
                <text
                  x="278"
                  y="64"
                  fontSize="11"
                  fontWeight="bold"
                  fill={activeTone === 3 ? '#8b5cf6' : 'var(--fg-subtle)'}
                >
                  T3 (214)
                </text>
              </g>

              {/* Tone 4: High Falling (51) -> from (80, 30) down to (260, 150) */}
              <g
                className={`tone-path-group tone-4 ${activeTone === 4 ? 'is-active-tone' : 'dimmed'}`}
                onClick={() => onSelectTone?.(4)}
              >
                <path
                  d="M 80 30 Q 140 70, 260 150"
                  fill="none"
                  stroke={activeTone === 4 ? 'url(#t4Grad)' : '#cbd5e1'}
                  strokeWidth={activeTone === 4 ? 5 : 2}
                  strokeLinecap="round"
                />
                <circle cx="80" cy="30" r={activeTone === 4 ? 5 : 3} fill="#f59e0b" />
                <circle cx="260" cy="150" r={activeTone === 4 ? 5 : 3} fill="#f59e0b" />
                <text
                  x="268"
                  y="154"
                  fontSize="11"
                  fontWeight="bold"
                  fill={activeTone === 4 ? '#f59e0b' : 'var(--fg-subtle)'}
                >
                  T4 (51)
                </text>
              </g>
            </svg>
          </div>
        </div>

        {/* Tone Description & Vietnamese Compare */}
        <div className="tone-details-card">
          <div className="tone-card-heading">
            <span className="tone-symbol-large">{currentToneInfo.symbol}</span>
            <div className="tone-heading-text">
              <h4 className="tone-title-name">{currentToneInfo.nameVi}</h4>
              <span className="tone-title-zh">{currentToneInfo.nameZh}</span>
            </div>
          </div>

          <div className="tone-meta-stack">
            <div className="tone-meta-item">
              <span className="meta-label">Đặc trưng cao độ:</span>
              <p className="meta-value">{currentToneInfo.descriptionVi}</p>
            </div>

            <div className="tone-meta-item highlight-box">
              <span className="meta-label">So sánh với tiếng Việt:</span>
              <p className="meta-value">{currentToneInfo.vietnameseToneCompare}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Tone Selector Audio Tiles */}
      <div className="tone-variations-row">
        <span className="tone-row-label">Thử nghe 4 thanh điệu của âm tiết này:</span>
        <div className="tone-buttons-grid">
          {toneVariants.map((v) => {
            const isCurrent = v.tone === activeTone
            return (
              <button
                key={v.tone}
                type="button"
                className={`tone-variant-tile tone-${v.tone} ${isCurrent ? 'active-tile' : ''}`}
                onClick={() => {
                  onSelectTone?.(v.tone)
                  handleSpeakTone(v.pinyin)
                }}
                title={`Bấm để nghe thanh ${v.tone}: ${v.pinyin}`}
              >
                <div className="tile-top">
                  <span className="tile-tone-num">Thanh {v.tone}</span>
                  <div className="tile-play-icon">
                    {isCurrent ? <Volume2 size={15} /> : <Play size={13} />}
                  </div>
                </div>
                <div className="tile-pinyin">{v.pinyin}</div>
                <div className="tile-tone-name">
                  {v.tone === 1 && 'Cao phẳng (55)'}
                  {v.tone === 2 && 'Vút lên (35)'}
                  {v.tone === 3 && 'Võng sâu (214)'}
                  {v.tone === 4 && 'Rơi dứt (51)'}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
