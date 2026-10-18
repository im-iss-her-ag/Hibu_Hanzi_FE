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
  const isNasal = initialInfo?.soundType.includes('mũi') || finalInfo?.group === 'front_nasal' || finalInfo?.group === 'back_nasal'
  const mouthShape = initialInfo?.mouthShape || finalInfo?.mouthShape || 'open'

  // Dynamic anatomical tongue shape (bezier organic curve)
  const tongueShape = useMemo(() => {
    switch (artType) {
      case 'retroflex':
        // Uốn cong đầu lưỡi ngược lên chạm/gần ngạc cứng (zh, ch, sh, r)
        return {
          d: 'M 75 165 C 90 162, 105 148, 118 132 C 128 120, 138 98, 134 76 C 130 65, 116 66, 114 78 C 110 98, 100 125, 82 148 C 76 156, 72 163, 75 165 Z',
          tipCx: 125,
          tipCy: 72,
          focusLabel: 'Đầu lưỡi uốn cong lên vòm ngạc cứng',
          desc: 'Uốn cong đầu lưỡi sâu vào trong vòm miệng, không chạm răng.',
        }
      case 'palatal':
        // Thân mặt lưỡi nâng phẳng áp sát ngạc cứng, đầu lưỡi hạ xuống răng dưới (j, q, x)
        return {
          d: 'M 75 165 C 92 155, 110 115, 130 92 C 142 80, 155 88, 156 108 C 157 122, 150 142, 146 152 C 142 160, 105 166, 75 165 Z',
          tipCx: 142,
          tipCy: 86,
          focusLabel: 'Mặt lưỡi nâng phẳng áp sát ngạc cứng',
          desc: 'Đầu lưỡi chúc xuống chân răng dưới, thân lưỡi ép sát trần miệng.',
        }
      case 'alveolar':
        // Đầu lưỡi chạm nướu trên / sau răng cửa trên (d, t, n, l)
        return {
          d: 'M 75 165 C 95 160, 118 138, 135 118 C 145 102, 158 84, 162 76 C 165 70, 155 64, 148 74 C 132 96, 112 132, 75 165 Z',
          tipCx: 158,
          tipCy: 73,
          focusLabel: 'Đầu lưỡi chạm chặt vào nướu răng trên',
          desc: 'Đầu lưỡi áp chặt vào nướu trên nén luồng hơi lại.',
        }
      case 'velar':
        // Gốc lưỡi (cuống lưỡi) nâng cao áp ngạc mềm / lưỡi gà (g, k, h)
        return {
          d: 'M 75 165 C 80 142, 92 108, 108 92 C 118 80, 128 92, 130 115 C 132 135, 126 155, 75 165 Z',
          tipCx: 110,
          tipCy: 88,
          focusLabel: 'Gốc lưỡi (cuống lưỡi) nâng áp ngạc mềm',
          desc: 'Cuống lưỡi nâng cao chạm vòm họng mềm chặn hơi.',
        }
      case 'dental':
        // Đầu lưỡi duỗi thẳng sát mặt sau răng cửa trên (z, c, s)
        return {
          d: 'M 75 165 C 95 160, 122 142, 145 120 C 158 106, 168 96, 172 88 C 175 83, 168 76, 160 82 C 138 105, 112 138, 75 165 Z',
          tipCx: 169,
          tipCy: 85,
          focusLabel: 'Đầu lưỡi duỗi thẳng áp sát mặt sau răng cửa',
          desc: 'Đầu lưỡi phẳng sát kẽ răng trên, không uốn cong.',
        }
      case 'bilabial':
        // Hai môi mím chặt, lưỡi nằm nghỉ tự nhiên (b, p, m)
        return {
          d: 'M 75 165 C 95 158, 120 145, 140 135 C 150 130, 158 138, 150 152 C 140 162, 105 166, 75 165 Z',
          tipCx: 184,
          tipCy: 98,
          focusLabel: 'Hai môi mím chặt nén khí',
          desc: 'Lưỡi thả lỏng tự nhiên, lực nén tập trung hoàn toàn ở hai môi.',
        }
      case 'labiodental':
        // Răng trên cắn nhẹ môi dưới (f)
        return {
          d: 'M 75 165 C 95 158, 120 145, 140 135 C 150 130, 158 138, 150 152 C 140 162, 105 166, 75 165 Z',
          tipCx: 178,
          tipCy: 104,
          focusLabel: 'Răng cửa trên tiếp xúc nhẹ môi dưới',
          desc: 'Răng cửa trên chạm nhẹ viền môi dưới tạo khe xát gió.',
        }
      default:
        return {
          d: 'M 75 165 C 95 158, 120 145, 140 135 C 150 130, 158 138, 150 152 C 140 162, 105 166, 75 165 Z',
          tipCx: 135,
          tipCy: 115,
          focusLabel: 'Khẩu hình mở tự nhiên',
          desc: 'Lưỡi hạ thấp thả lỏng ở sàn miệng.',
        }
    }
  }, [artType])

  // Practical 3-step action points
  const steps = useMemo(() => {
    if (initialInfo) {
      let step1 = 'Hai môi thả lỏng tự nhiên.'
      if (initialInfo.group === 'bilabial') step1 = 'Hai môi mím chặt lại, nén không cho khí thoát ra.'
      else if (initialInfo.group === 'labiodental') step1 = 'Răng cửa trên cắn nhẹ vào phần thịt môi dưới.'
      else if (initialInfo.group === 'palatal' || initialInfo.group === 'dental') step1 = 'Khóe môi hơi dẹt căng sang 2 bên như đang cười mỉm.'
      else if (initialInfo.group === 'retroflex') step1 = 'Môi hơi hé mở tròn tự nhiên để đầu lưỡi có không gian uốn.'

      const step2 = initialInfo.tonguePosition || 'Đầu lưỡi thả lỏng ở đáy miệng.'

      let step3 = 'Thoát hơi nhẹ nhàng, dây thanh rung tự nhiên.'
      if (initialInfo.isAspirated) {
        step3 = 'BẬT HƠI CỰC MẠNH: Nén hơi thật căng rồi bung mạnh ra (đặt tờ giấy trước miệng phải bay phần phật).'
      } else if (initialInfo.soundType.includes('vô thanh')) {
        step3 = 'KHÔNG BẬT HƠI & KHÔNG RUNG CỔ HỌNG: Đẩy hơi nhẹ, thanh quản không rung (khác tiếng Việt).'
      } else if (initialInfo.soundType.includes('mũi')) {
        step3 = 'Ngạc mềm hạ xuống, cho toàn bộ luồng khí rung và vang qua khoang mũi.'
      }

      return { lips: step1, tongue: step2, airflow: step3 }
    }

    if (finalInfo) {
      let step1 = 'Miệng mở tự nhiên.'
      if (finalInfo.mouthShape === 'round') step1 = 'Môi chu tròn chúm chặt lại như huýt sáo và CỐ ĐỊNH hình môi.'
      else if (finalInfo.mouthShape === 'spread') step1 = 'Hai khóe miệng kéo căng dẹt sang hai bên.'
      else if (finalInfo.mouthShape === 'open') step1 = 'Hạ hàm mở rộng miệng tối đa.'

      const step2 = finalInfo.guideVi.split('.')[0] + '.'
      const step3 = finalInfo.group.includes('nasal')
        ? 'Kết thúc âm bằng cách đưa luồng hơi rung ngân vang trong khoang mũi.'
        : 'Phát âm rõ ràng, giữ trường độ hơi đầy đặn.'

      return { lips: step1, tongue: step2, airflow: step3 }
    }

    return {
      lips: 'Mở môi tự nhiên.',
      tongue: 'Lưỡi đặt thả lỏng.',
      airflow: 'Đẩy hơi đều đặn.',
    }
  }, [initialInfo, finalInfo])

  return (
    <div className="mouth-diagram-container">
      {/* 3-Step Action Summary Cards: Instant Practical Understanding */}
      <div className="action-steps-banner">
        <div className="action-step-card">
          <div className="step-badge-row">
            <span className="step-num-pill">Bước 1</span>
            <span className="step-title-icon">👄 Khẩu hình Môi</span>
          </div>
          <p className="step-instruction">{steps.lips}</p>
        </div>

        <div className="action-step-card">
          <div className="step-badge-row">
            <span className="step-num-pill">Bước 2</span>
            <span className="step-title-icon">👅 Vị trí Lưỡi</span>
          </div>
          <p className="step-instruction">{steps.tongue}</p>
        </div>

        <div className="action-step-card highlight">
          <div className="step-badge-row">
            <span className="step-num-pill">Bước 3</span>
            <span className="step-title-icon">💨 Luồng Hơi & Giọng</span>
          </div>
          <p className="step-instruction">{steps.airflow}</p>
        </div>
      </div>

      {/* High-Fidelity Anatomical Diagrams Dual Stage */}
      <div className="diagrams-dual-stage">
        {/* Stage 1: Stylized Medical Sagittal Vocal Tract */}
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

          <div className="svg-canvas-wrapper sagittal-canvas-bg">
            <svg
              viewBox="0 0 240 210"
              className="vocal-tract-svg"
              aria-label="Sơ đồ mặt cắt sinh học khoang miệng và vị trí lưỡi"
            >
              <defs>
                {/* Skin Profile Fill Gradient */}
                <linearGradient id="headSkinGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--bg-elevated)" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="var(--border-line)" stopOpacity="0.3" />
                </linearGradient>

                {/* Palate & Flesh Gradient */}
                <linearGradient id="palateFlesh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fecdd3" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>

                {/* Tongue Gradient (Realistic Pink/Red Flesh) */}
                <linearGradient id="tongueFleshGrad" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#be123c" />
                  <stop offset="60%" stopColor="#e11d48" />
                  <stop offset="100%" stopColor="#fb7185" />
                </linearGradient>

                {/* Glow Filter for Airflow */}
                <filter id="windBurstFilter" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Head Profile Outline: Forehead, Nose, Lips, Chin, Throat */}
              <path
                d="M 60 195 C 45 150, 42 70, 75 35 C 105 5, 175 10, 192 48 C 196 58, 192 68, 185 70 C 195 73, 202 85, 194 96 C 188 103, 178 103, 182 110 C 192 114, 194 126, 186 135 C 178 144, 168 142, 172 154 C 174 165, 165 185, 160 198"
                fill="url(#headSkinGrad)"
                stroke="var(--fg-subtle)"
                strokeWidth="1.75"
                strokeLinecap="round"
                opacity="0.85"
              />

              {/* Nasal Cavity (Khoang Mũi) */}
              <path
                d="M 85 75 C 105 52, 145 45, 180 58 C 175 70, 160 72, 145 74"
                fill="none"
                stroke="var(--fg-subtle)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="4 3"
              />
              <text x="110" y="52" fontSize="9" fill="var(--fg-muted)" fontWeight="600">
                Khoang mũi
              </text>

              {/* Upper Wall: Hard Palate (Ngạc cứng) -> Soft Palate (Ngạc mềm) -> Uvula (Lưỡi gà) */}
              {/* Hard Palate Bone */}
              <path
                d="M 85 108 C 100 100, 125 84, 155 76 C 168 73, 178 78, 181 85"
                fill="none"
                stroke="var(--fg-main)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Soft Palate & Uvula hanging down */}
              <path
                d="M 85 108 C 88 118, 92 128, 95 132 C 97 134, 100 132, 99 126 C 98 120, 96 112, 95 106"
                fill="#f43f5e"
                stroke="#e11d48"
                strokeWidth="1.5"
              />
              <text x="122" y="70" fontSize="8.5" fill="var(--accent-gold)" fontWeight="bold">
                Ngạc cứng
              </text>
              <text x="75" y="98" fontSize="8.5" fill="var(--fg-muted)">
                Ngạc mềm & Lưỡi gà
              </text>

              {/* Upper Incisor Tooth & Gum */}
              <path
                d="M 178 84 L 180 96 L 175 96 L 174 84 Z"
                fill="#ffffff"
                stroke="#64748b"
                strokeWidth="1.2"
              />
              <path d="M 173 84 C 176 81, 181 81, 184 84" stroke="#f43f5e" strokeWidth="2.5" fill="none" />

              {/* Lower Incisor Tooth & Gum */}
              <path
                d="M 172 124 L 174 112 L 169 112 L 168 124 Z"
                fill="#ffffff"
                stroke="#64748b"
                strokeWidth="1.2"
              />
              <path d="M 167 124 C 170 126, 175 126, 178 124" stroke="#f43f5e" strokeWidth="2.5" fill="none" />

              {/* Upper & Lower Lips */}
              {/* Upper lip fleshy contour */}
              <path
                d="M 181 83 C 190 85, 200 87, 196 95 C 192 101, 182 99, 179 98"
                fill="url(#palateFlesh)"
                stroke="#be123c"
                strokeWidth="1.5"
              />
              {/* Lower lip fleshy contour */}
              <path
                d="M 170 122 C 185 120, 196 117, 192 108 C 187 100, 176 106, 171 108"
                fill="url(#palateFlesh)"
                stroke="#be123c"
                strokeWidth="1.5"
              />

              {/* Realistic Tongue with Organic Bezier Curve */}
              <path
                d={tongueShape.d}
                fill="url(#tongueFleshGrad)"
                stroke="#9f1239"
                strokeWidth="2.5"
                strokeLinejoin="round"
                className="animated-tongue-shape"
              />

              {/* Tongue papillae texture detail lines */}
              <path
                d="M 98 145 Q 115 132, 130 115"
                fill="none"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              {/* Throat / Pharynx wall */}
              <path
                d="M 68 190 C 72 165, 78 135, 80 115"
                fill="none"
                stroke="var(--fg-subtle)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Airflow Visual Stream */}
              {isAspirated ? (
                /* Aspirated: Powerful cyan airflow bursting out */
                <g filter="url(#windBurstFilter)" className="airflow-burst-group">
                  <path
                    d="M 105 152 Q 135 125, 172 102 T 218 96"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="6 4"
                    className="air-burst-stream"
                  />
                  <polygon points="218,91 230,96 218,101" fill="#0284c7" />
                  <path
                    d="M 198 88 Q 208 85, 218 84"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 198 110 Q 208 114, 218 115"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </g>
              ) : isNasal ? (
                /* Nasal: Airflow through nasal cavity */
                <g className="airflow-nasal-group">
                  <path
                    d="M 92 145 Q 98 105, 115 72 T 180 58"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray="5 3"
                    className="air-burst-stream"
                  />
                  <polygon points="178,54 188,58 178,62" fill="#8b5cf6" />
                </g>
              ) : (
                /* Gentle unaspirated airflow */
                <g className="airflow-gentle-group">
                  <path
                    d="M 105 155 Q 135 132, 170 108 T 205 104"
                    fill="none"
                    stroke="var(--accent-jade)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray="4 4"
                  />
                  <polygon points="205,101 213,104 205,107" fill="var(--accent-jade)" />
                </g>
              )}

              {/* Pinpoint Highlight: Critical Contact Focal Point */}
              <circle
                cx={tongueShape.tipCx}
                cy={tongueShape.tipCy}
                r="6"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="2"
                className="pulse-contact-point"
              />
              <circle
                cx={tongueShape.tipCx}
                cy={tongueShape.tipCy}
                r="13"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                opacity="0.6"
                className="pulse-contact-ripple"
              />
            </svg>
          </div>

          <div className="focus-contact-annotation">
            <span className="annotation-dot" />
            <span className="annotation-text">
              Điểm mấu chốt: <strong>{tongueShape.focusLabel}</strong>
            </span>
          </div>
        </div>

        {/* Stage 2: Frontal Mouth & Realistic 3D Lip Shape */}
        <div className="diagram-box frontal-lips-box">
          <div className="diagram-header">
            <span className="diagram-title">Hình dáng môi chính diện (Lips)</span>
            <span className="badge-lip-type">
              {mouthShape === 'closed' && 'Môi mím chặt'}
              {mouthShape === 'round' && 'Môi tròn chúm (ü, u)'}
              {mouthShape === 'open_round' && 'Môi mở tròn (o)'}
              {mouthShape === 'spread' && 'Môi dẹt căng (i, j, q...)'}
              {mouthShape === 'half_open' && 'Môi nửa mở'}
              {mouthShape === 'open' && 'Môi mở to (a)'}
              {mouthShape === 'touch_teeth' && 'Răng cắn môi (f)'}
              {mouthShape === 'curled' && 'Khẩu hình cuộn lưỡi (zh...)'}
            </span>
          </div>

          <div className="svg-canvas-wrapper frontal-svg-center">
            <svg
              viewBox="0 0 180 140"
              className="frontal-lips-svg"
              aria-label="Hình dáng đôi môi chính diện có chiều sâu"
            >
              <defs>
                {/* Lip Flesh Gradient with 3D Depth */}
                <linearGradient id="upperLipGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#be123c" />
                  <stop offset="70%" stopColor="#e11d48" />
                  <stop offset="100%" stopColor="#9f1239" />
                </linearGradient>
                <linearGradient id="lowerLipGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="50%" stopColor="#e11d48" />
                  <stop offset="100%" stopColor="#881337" />
                </linearGradient>
                <linearGradient id="lipGlossHighlight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Lower Face Contour (Chin & Cheeks) */}
              <ellipse
                cx="90"
                cy="70"
                rx="76"
                ry="58"
                fill="var(--bg-main)"
                stroke="var(--border-line)"
                strokeWidth="1.5"
              />

              {/* Philtrum (Nhân trung dưới mũi) */}
              <path
                d="M 85 24 L 85 46 M 95 24 L 95 46"
                stroke="var(--border-line)"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />

              {/* 1. CLOSED LIPS (b, p, m) - Mím môi nén khí */}
              {mouthShape === 'closed' && (
                <g>
                  {/* Upper lip with Cupid's bow */}
                  <path
                    d="M 40 70 C 58 56, 76 60, 90 64 C 104 60, 122 56, 140 70 C 115 72, 90 71, 40 70 Z"
                    fill="url(#upperLipGrad)"
                  />
                  {/* Lower lip full curve */}
                  <path
                    d="M 40 70 C 65 72, 115 72, 140 70 C 125 86, 55 86, 40 70 Z"
                    fill="url(#lowerLipGrad)"
                  />
                  {/* Sealed seam line */}
                  <path
                    d="M 40 70 Q 90 72, 140 70"
                    stroke="#4c0519"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Subtle gloss highlight on lower lip */}
                  <ellipse cx="90" cy="77" rx="18" ry="3.5" fill="url(#lipGlossHighlight)" />
                </g>
              )}

              {/* 2. TIGHT ROUND LIPS (ü, u) - Môi tròn chúm huýt sáo */}
              {(mouthShape === 'round' || mouthShape === 'open_round') && (
                <g>
                  {/* Outer rounded puckered lips */}
                  <ellipse cx="90" cy="70" rx="32" ry="28" fill="url(#lowerLipGrad)" />
                  <ellipse cx="90" cy="65" rx="26" ry="16" fill="url(#upperLipGrad)" />
                  {/* Inner dark oral aperture hole */}
                  <ellipse cx="90" cy="70" rx="12" ry="12" fill="#18040a" />
                  {/* Tongue visible inside hole */}
                  <ellipse cx="90" cy="74" rx="7" ry="4" fill="#f43f5e" />
                  {/* Radiating puckering tension lines */}
                  <line x1="90" y1="46" x2="90" y2="52" stroke="#881337" strokeWidth="1.5" />
                  <line x1="72" y1="50" x2="76" y2="55" stroke="#881337" strokeWidth="1.5" />
                  <line x1="108" y1="50" x2="104" y2="55" stroke="#881337" strokeWidth="1.5" />
                  {/* Gloss */}
                  <ellipse cx="88" cy="62" rx="6" ry="2.5" fill="url(#lipGlossHighlight)" />
                </g>
              )}

              {/* 3. SPREAD SMILE LIPS (i, j, q, x, z, c, s) - Môi dẹt căng răng sát */}
              {mouthShape === 'spread' && (
                <g>
                  {/* Oral cavity dark background */}
                  <path d="M 32 68 Q 90 64, 148 68 Q 90 76, 32 68 Z" fill="#1e050c" />
                  {/* Upper front incisors showing */}
                  <rect x="74" y="66" width="14" height="8" rx="1.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                  <rect x="92" y="66" width="14" height="8" rx="1.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                  {/* Upper stretched lip */}
                  <path
                    d="M 28 68 C 50 56, 75 60, 90 62 C 105 60, 130 56, 152 68 C 125 70, 55 70, 28 68 Z"
                    fill="url(#upperLipGrad)"
                  />
                  {/* Lower stretched lip */}
                  <path
                    d="M 28 68 C 55 70, 125 70, 152 68 C 135 84, 45 84, 28 68 Z"
                    fill="url(#lowerLipGrad)"
                  />
                  <ellipse cx="90" cy="76" rx="22" ry="3" fill="url(#lipGlossHighlight)" />
                </g>
              )}

              {/* 4. LABIODENTAL (f) - Răng trên cắn nhẹ môi dưới */}
              {mouthShape === 'touch_teeth' && (
                <g>
                  {/* Raised upper lip */}
                  <path
                    d="M 38 64 C 58 50, 78 54, 90 56 C 102 54, 122 50, 142 64 C 120 66, 60 66, 38 64 Z"
                    fill="url(#upperLipGrad)"
                  />
                  {/* Upper prominent incisors resting ON lower lip */}
                  <rect x="76" y="62" width="12" height="12" rx="1.5" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.2" />
                  <rect x="92" y="62" width="12" height="12" rx="1.5" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.2" />
                  {/* Lower lip pressed against upper teeth */}
                  <path
                    d="M 38 72 C 60 74, 76 74, 90 74 C 104 74, 120 74, 142 72 C 125 90, 55 90, 38 72 Z"
                    fill="url(#lowerLipGrad)"
                  />
                  {/* Dent impression on lower lip */}
                  <path d="M 74 74 Q 90 76, 106 74" stroke="#4c0519" strokeWidth="2" fill="none" />
                </g>
              )}

              {/* 5. RETROFLEX CURLED TONGUE (zh, ch, sh, r) - Môi mở vừa thấy đầu lưỡi uốn cong */}
              {mouthShape === 'curled' && (
                <g>
                  {/* Dark cavity */}
                  <ellipse cx="90" cy="70" rx="34" ry="15" fill="#18040a" />
                  {/* Tongue visibly curled upward inside cavity */}
                  <path
                    d="M 68 76 C 75 64, 85 58, 90 58 C 95 58, 105 64, 112 76 Q 90 80, 68 76 Z"
                    fill="#fb7185"
                    stroke="#be123c"
                    strokeWidth="1.5"
                  />
                  {/* Upper Lip */}
                  <path
                    d="M 36 66 C 56 52, 76 56, 90 58 C 104 56, 124 52, 144 66 C 120 69, 60 69, 36 66 Z"
                    fill="url(#upperLipGrad)"
                  />
                  {/* Lower Lip */}
                  <path
                    d="M 36 74 C 60 77, 120 77, 144 74 C 126 92, 54 92, 36 74 Z"
                    fill="url(#lowerLipGrad)"
                  />
                  <ellipse cx="90" cy="83" rx="16" ry="3" fill="url(#lipGlossHighlight)" />
                </g>
              )}

              {/* 6. WIDE OPEN (a, ai, an, ao) / HALF OPEN */}
              {(mouthShape === 'open' || mouthShape === 'half_open') && (
                <g>
                  {/* Deep dark mouth cavity */}
                  <ellipse cx="90" cy="72" rx="36" ry={mouthShape === 'open' ? '18' : '13'} fill="#18040a" />
                  {/* Upper teeth edge */}
                  <path d="M 66 66 Q 90 68, 114 66 L 112 62 Q 90 64, 68 62 Z" fill="#ffffff" />
                  {/* Tongue flat on floor of mouth */}
                  <path
                    d="M 66 76 Q 90 68, 114 76 Q 90 84, 66 76 Z"
                    fill="#e11d48"
                    stroke="#be123c"
                    strokeWidth="1"
                  />
                  {/* Upper Lip */}
                  <path
                    d="M 34 64 C 55 48, 76 53, 90 55 C 104 53, 125 48, 146 64 C 120 68, 60 68, 34 64 Z"
                    fill="url(#upperLipGrad)"
                  />
                  {/* Lower Lip */}
                  <path
                    d="M 34 78 C 60 82, 120 82, 146 78 C 128 98, 52 98, 34 78 Z"
                    fill="url(#lowerLipGrad)"
                  />
                  <ellipse cx="90" cy="88" rx="18" ry="3" fill="url(#lipGlossHighlight)" />
                </g>
              )}
            </svg>
          </div>

          <p className="frontal-instruction-text">
            {tongueShape.desc}
          </p>
        </div>
      </div>

      {/* Warning Box for Common Vietnamese Mistakes */}
      {(initialInfo?.commonMistakes || finalInfo?.commonMistakes) && (
        <div className="vietnamese-mistake-alert">
          <ShieldAlert size={20} className="mistake-icon" />
          <div className="mistake-content">
            <span className="mistake-title">Lỗi phát âm người Việt hay mắc & Cách khắc phục:</span>
            <p className="mistake-desc">
              {initialInfo?.commonMistakes} {finalInfo?.commonMistakes ? `• ${finalInfo.commonMistakes}` : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
