import { useMemo } from 'react'
import type { InitialData, FinalData } from '../utils/pinyinData'
import { Wind, Volume2, ShieldAlert } from 'lucide-react'

interface MouthShapeDiagramProps {
  initialInfo?: InitialData
  finalInfo?: FinalData
}

export function MouthShapeDiagram({ initialInfo, finalInfo }: MouthShapeDiagramProps) {
  const artType = initialInfo?.articulationType || 'alveolar'
  const isAspirated = Boolean(initialInfo?.isAspirated)
  const mouthShape = initialInfo?.mouthShape || finalInfo?.mouthShape || 'open'

  // Dynamic SVG path for tongue based on articulation type
  const tonguePath = useMemo(() => {
    switch (artType) {
      case 'retroflex': // Uốn lưỡi: đầu lưỡi cong ngược lên vòm họng ngạc cứng
        return 'M 60 170 C 85 170, 95 150, 110 135 C 120 125, 130 95, 125 78 C 120 68, 108 72, 105 85 C 95 110, 80 145, 60 170 Z'
      case 'palatal': // Mặt lưỡi nâng phẳng áp ngạc cứng, đầu lưỡi hạ xuống răng dưới
        return 'M 60 170 C 80 155, 100 100, 128 85 C 138 80, 148 105, 145 125 C 143 140, 138 155, 135 160 C 130 165, 100 170, 60 170 Z'
      case 'alveolar': // Đầu lưỡi chạm nướu răng trên
        return 'M 60 170 C 85 165, 105 140, 120 120 C 130 105, 140 85, 146 75 C 149 70, 142 65, 136 72 C 120 95, 100 135, 60 170 Z'
      case 'velar': // Gốc lưỡi cuống lưỡi nâng áp ngạc mềm
        return 'M 60 170 C 70 140, 85 95, 100 90 C 110 88, 115 110, 125 140 C 130 155, 135 165, 60 170 Z'
      case 'dental': // Đầu lưỡi duỗi thẳng sát chân răng trên
        return 'M 60 170 C 85 165, 110 145, 130 120 C 140 105, 150 95, 155 88 C 158 84, 152 78, 145 82 C 125 105, 100 140, 60 170 Z'
      case 'bilabial': // Hai môi mím, lưỡi nằm nghỉ tự nhiên
      case 'labiodental':
      default:
        return 'M 60 170 C 80 160, 105 145, 125 135 C 135 130, 145 140, 140 155 C 130 165, 100 170, 60 170 Z'
    }
  }, [artType])

  // Focus contact point on cross-section
  const focusPoint = useMemo(() => {
    switch (artType) {
      case 'retroflex':
        return { cx: 122, cy: 75, label: 'Đầu lưỡi uốn cong ngạc cứng' }
      case 'palatal':
        return { cx: 128, cy: 82, label: 'Mặt lưỡi áp ngạc cứng' }
      case 'alveolar':
        return { cx: 145, cy: 72, label: 'Đầu lưỡi chạm nướu trên' }
      case 'velar':
        return { cx: 98, cy: 88, label: 'Gốc lưỡi áp ngạc mềm' }
      case 'dental':
        return { cx: 154, cy: 86, label: 'Đầu lưỡi sát răng cửa' }
      case 'bilabial':
        return { cx: 172, cy: 95, label: 'Hai môi mím chặt' }
      case 'labiodental':
        return { cx: 168, cy: 98, label: 'Răng trên cắn môi dưới' }
      default:
        return { cx: 130, cy: 110, label: 'Khẩu hình tự nhiên' }
    }
  }, [artType])

  return (
    <div className="mouth-diagram-container">
      <div className="diagrams-dual-stage">
        {/* Stage 1: Sagittal Vocal Tract Cross-Section */}
        <div className="diagram-box sagittal-box">
          <div className="diagram-header">
            <span className="diagram-title">Mặt cắt cơ quan phát âm (Sagittal)</span>
            {isAspirated ? (
              <span className="badge-aspirated-pill highlight">
                <Wind size={12} /> Bật hơi mạnh (Aspirated)
              </span>
            ) : (
              <span className="badge-aspirated-pill gentle">
                <Volume2 size={12} /> Không bật hơi (Unaspirated)
              </span>
            )}
          </div>

          <div className="svg-canvas-wrapper">
            <svg
              viewBox="0 0 220 200"
              className="vocal-tract-svg"
              aria-label="Sơ đồ mặt cắt vị trí lưỡi và vòm miệng"
            >
              <defs>
                <linearGradient id="palateGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--border-line)" />
                  <stop offset="100%" stopColor="var(--fg-subtle)" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="tongueGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f87171" />
                  <stop offset="100%" stopColor="#c2410c" />
                </linearGradient>
                <filter id="glowAir" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background Head Silhouette Outline */}
              <path
                d="M 50 180 C 40 120, 45 60, 90 30 C 130 10, 180 20, 190 60 C 195 75, 185 85, 175 88 C 182 92, 188 105, 180 115 C 172 125, 160 130, 155 140 C 145 165, 150 185, 155 195"
                fill="none"
                stroke="var(--border-line)"
                strokeWidth="2"
                strokeDasharray="4 3"
              />

              {/* Upper Wall: Nasal Cavity, Hard Palate, Soft Palate */}
              {/* Nasal cavity ceiling */}
              <path
                d="M 60 70 C 80 50, 120 40, 160 55"
                fill="none"
                stroke="var(--fg-subtle)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <text x="95" y="48" fontSize="9" fill="var(--fg-muted)" fontWeight="600">
                Khoang mũi
              </text>

              {/* Hard palate (Ngạc cứng) & Soft palate (Ngạc mềm) */}
              <path
                d="M 70 100 C 85 92, 115 80, 140 72 C 150 70, 158 75, 162 82"
                fill="none"
                stroke="var(--fg-main)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <text x="110" y="68" fontSize="8.5" fill="var(--accent-gold)" fontWeight="700">
                Ngạc cứng
              </text>
              <text x="68" y="92" fontSize="8.5" fill="var(--fg-muted)">
                Ngạc mềm
              </text>

              {/* Upper Teeth & Lip */}
              <path
                d="M 162 82 L 163 92 L 160 92 L 159 82"
                fill="var(--fg-main)"
                stroke="var(--fg-main)"
                strokeWidth="1.5"
              />
              <path
                d="M 163 80 C 172 82, 180 84, 178 92 C 175 97, 168 96, 165 96"
                fill="none"
                stroke="var(--fg-main)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Lower Teeth & Lip */}
              <path
                d="M 158 120 L 159 110 L 156 110 L 155 120"
                fill="var(--fg-main)"
                stroke="var(--fg-main)"
                strokeWidth="1.5"
              />
              <path
                d="M 155 122 C 170 120, 178 116, 174 108 C 170 102, 162 105, 158 106"
                fill="none"
                stroke="var(--fg-main)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Dynamic Tongue Body & Tip */}
              <path
                d={tonguePath}
                fill="url(#tongueGrad)"
                stroke="#b91c1c"
                strokeWidth="2.5"
                strokeLinejoin="round"
                className="animated-tongue-shape"
              />

              {/* Pharynx / Airway passage */}
              <path
                d="M 55 170 C 60 140, 65 110, 68 100"
                fill="none"
                stroke="var(--fg-subtle)"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Airflow Flow Vector Arrows */}
              {isAspirated ? (
                <g filter="url(#glowAir)" className="airflow-aspirated-group">
                  <path
                    d="M 90 145 Q 120 120, 160 95 T 195 90"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="6 4"
                    className="air-burst-stream"
                  />
                  <polygon points="195,85 208,90 195,95" fill="#0284c7" />
                  <text x="155" y="118" fontSize="8.5" fill="#0284c7" fontWeight="bold">
                    Luồng khí nén bùng nổ!
                  </text>
                </g>
              ) : (
                <g className="airflow-gentle-group">
                  <path
                    d="M 90 150 Q 120 130, 155 105 T 185 102"
                    fill="none"
                    stroke="var(--accent-jade)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray="4 4"
                  />
                  <polygon points="185,99 193,102 185,105" fill="var(--accent-jade)" />
                </g>
              )}

              {/* Active Articulation Contact Point Pulse */}
              <circle
                cx={focusPoint.cx}
                cy={focusPoint.cy}
                r="6"
                fill="#fbbf24"
                stroke="#b45309"
                strokeWidth="2"
                className="pulse-contact-point"
              />
              <circle
                cx={focusPoint.cx}
                cy={focusPoint.cy}
                r="12"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.5"
                opacity="0.6"
                className="pulse-contact-ripple"
              />
            </svg>
          </div>

          <div className="focus-contact-annotation">
            <span className="annotation-dot" />
            <span className="annotation-text">
              Điểm tiếp xúc chính: <strong>{focusPoint.label}</strong>
            </span>
          </div>
        </div>

        {/* Stage 2: Frontal Mouth & Lip Shape */}
        <div className="diagram-box frontal-lips-box">
          <div className="diagram-header">
            <span className="diagram-title">Hình dáng môi chính diện (Lips)</span>
            <span className="badge-lip-type">
              {mouthShape === 'closed' && 'Môi mím chặt'}
              {mouthShape === 'round' && 'Môi tròn chúm'}
              {mouthShape === 'open_round' && 'Môi mở tròn'}
              {mouthShape === 'spread' && 'Môi dẹt căng'}
              {mouthShape === 'half_open' && 'Môi nửa mở'}
              {mouthShape === 'open' && 'Môi mở to'}
              {mouthShape === 'touch_teeth' && 'Răng cắn môi'}
              {mouthShape === 'curled' && 'Khẩu hình cuộn lưỡi'}
            </span>
          </div>

          <div className="svg-canvas-wrapper frontal-svg-center">
            <svg
              viewBox="0 0 160 120"
              className="frontal-lips-svg"
              aria-label="Hình dáng môi chính diện"
            >
              <defs>
                <linearGradient id="lipGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#be123c" />
                </linearGradient>
              </defs>

              {/* Face silhouette oval */}
              <ellipse
                cx="80"
                cy="60"
                rx="68"
                ry="50"
                fill="var(--bg-main)"
                stroke="var(--border-line)"
                strokeWidth="1.5"
              />

              {/* Conditional Lips based on shape */}
              {mouthShape === 'closed' && (
                /* Closed mím môi (b, p, m) */
                <g>
                  {/* Upper lip */}
                  <path
                    d="M 45 60 Q 60 52, 75 55 Q 80 57, 85 55 Q 100 52, 115 60 Q 80 62, 45 60 Z"
                    fill="url(#lipGrad)"
                  />
                  {/* Lower lip */}
                  <path
                    d="M 45 60 Q 80 62, 115 60 Q 80 74, 45 60 Z"
                    fill="url(#lipGrad)"
                  />
                  {/* Sealed seam line */}
                  <path d="M 46 60 Q 80 61, 114 60" stroke="#881337" strokeWidth="2" fill="none" />
                </g>
              )}

              {(mouthShape === 'round' || mouthShape === 'open_round') && (
                /* Round / Chu môi (o, u, ü) */
                <g>
                  {/* Outer circle lip */}
                  <ellipse cx="80" cy="60" rx="24" ry="22" fill="url(#lipGrad)" />
                  {/* Inner dark opening */}
                  <ellipse cx="80" cy="60" rx="10" ry="11" fill="#1f1315" />
                  {/* Highlight */}
                  <ellipse cx="78" cy="54" rx="4" ry="2" fill="rgba(255,255,255,0.4)" />
                </g>
              )}

              {mouthShape === 'spread' && (
                /* Spread / Môi dẹt căng cười (i, j, q, x, z, c, s) */
                <g>
                  {/* Upper lip */}
                  <path
                    d="M 35 58 Q 55 50, 75 53 Q 80 55, 85 53 Q 105 50, 125 58 Q 80 61, 35 58 Z"
                    fill="url(#lipGrad)"
                  />
                  {/* Open teeth gap */}
                  <path d="M 40 59 Q 80 62, 120 59 Q 80 67, 40 59 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
                  {/* Lower lip */}
                  <path
                    d="M 35 58 Q 80 67, 125 58 Q 80 76, 35 58 Z"
                    fill="url(#lipGrad)"
                  />
                </g>
              )}

              {mouthShape === 'touch_teeth' && (
                /* Labiodental: Răng trên chạm môi dưới (f) */
                <g>
                  {/* Upper lip lifted */}
                  <path
                    d="M 45 54 Q 60 46, 75 49 Q 80 51, 85 49 Q 100 46, 115 54 Q 80 56, 45 54 Z"
                    fill="url(#lipGrad)"
                  />
                  {/* Visible upper incisors */}
                  <rect x="68" y="55" width="10" height="9" rx="1" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                  <rect x="82" y="55" width="10" height="9" rx="1" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                  {/* Lower lip pressed against upper teeth */}
                  <path
                    d="M 45 62 Q 80 63, 115 62 Q 80 76, 45 62 Z"
                    fill="url(#lipGrad)"
                  />
                </g>
              )}

              {(mouthShape === 'open' || mouthShape === 'half_open' || mouthShape === 'curled') && (
                /* Open mouth (a, ai, an, zh, ch, sh) */
                <g>
                  {/* Upper lip */}
                  <path
                    d="M 42 55 Q 60 45, 76 49 Q 80 51, 84 49 Q 100 45, 118 55 Q 80 58, 42 55 Z"
                    fill="url(#lipGrad)"
                  />
                  {/* Mouth cavity opening */}
                  <ellipse cx="80" cy="62" rx="28" ry="12" fill="#2d1317" />
                  {/* Tongue showing inside */}
                  <path d="M 62 67 Q 80 60, 98 67 Q 80 72, 62 67 Z" fill="#f87171" />
                  {/* Lower lip */}
                  <path
                    d="M 42 63 Q 80 69, 118 63 Q 80 82, 42 63 Z"
                    fill="url(#lipGrad)"
                  />
                </g>
              )}
            </svg>
          </div>

          <p className="frontal-instruction-text">
            {initialInfo?.guideVi || finalInfo?.guideVi || 'Mở tự nhiên theo hướng dẫn.'}
          </p>
        </div>
      </div>

      {/* Warning Box for Common Vietnamese Mistakes */}
      {(initialInfo?.commonMistakes || finalInfo?.commonMistakes) && (
        <div className="vietnamese-mistake-alert">
          <ShieldAlert size={18} className="mistake-icon" />
          <div className="mistake-content">
            <span className="mistake-title">Cảnh báo lỗi phát âm người Việt hay mắc:</span>
            <p className="mistake-desc">
              {initialInfo?.commonMistakes} {finalInfo?.commonMistakes ? `| ${finalInfo.commonMistakes}` : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
