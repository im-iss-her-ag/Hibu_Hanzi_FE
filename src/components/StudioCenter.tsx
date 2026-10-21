import { useState, useEffect, useRef } from 'react'
import HanziWriter from 'hanzi-writer'
import { useFitCount } from '../utils/useFitCount'
import {
  Volume2,
  Star,
  Play,
  PenTool,
} from 'lucide-react'
import type { BundleCharacter, CharacterDetail } from '../core'
import { HanziWriterCanvas } from './HanziWriterCanvas'
import { HanziWriterModal } from './HanziWriterModal'
import { speakChinese } from '../utils/speech'

function TurtleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <ellipse cx="12" cy="13" rx="6" ry="5" />
      <path d="M12 8v10" />
      <path d="M7 11h10" />
      <path d="M7 15h10" />
      <path d="M12 8V5a1.5 1.5 0 0 1 3 0v1" />
      <path d="m6.5 10.5-2.5-1.5" />
      <path d="m17.5 10.5 2.5-1.5" />
      <path d="m6.5 15.5-2.5 1.5" />
      <path d="m17.5 15.5 2.5 1.5" />
      <path d="M12 18v2" />
    </svg>
  )
}

interface StudioCenterProps {
  character: BundleCharacter
  detail: CharacterDetail | null
  currentIndex: number
  totalCount: number
  isFavorite: boolean
  displayMode: 'modern' | 'components'
  onToggleFavorite: () => void
  onRandom: () => void
  // Mobile drawer trigger
  onOpenMobileList?: () => void
}

export function StudioCenter({
  character,
  detail,
  totalCount,
  isFavorite,
  displayMode,
  onToggleFavorite,
  onRandom,
  onOpenMobileList,
}: StudioCenterProps) {
  const readings = character.readings || []
  const [selectedReadingIndex, setSelectedReadingIndex] = useState(0)
  const isComponents = displayMode === 'components'

  // Mobile detection
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 1024 : false,
  )

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Mobile Practice modal
  const [showPracticeModal, setShowPracticeModal] = useState(false)

  // Mobile inline stroke animation inside square box
  const [isAnimating, setIsAnimating] = useState(false)
  const [isWriterReady, setIsWriterReady] = useState(false)
  const mobileWriterContainerRef = useRef<HTMLDivElement>(null)
  const mobileWriterRef = useRef<HanziWriter | null>(null)

  // Reset reading index whenever character changes
  useEffect(() => {
    const primaryIdx = readings.findIndex((r) => r.isPrimary)
    setSelectedReadingIndex(primaryIdx >= 0 ? primaryIdx : 0)
    setIsAnimating(false)
    setIsWriterReady(false)
  }, [character.hanzi])

  // Initialize or update HanziWriter when character or displayMode changes
  useEffect(() => {
    setIsWriterReady(false)
    if (!mobileWriterContainerRef.current) return

    mobileWriterContainerRef.current.innerHTML = ''
    const isDark = document.documentElement.classList.contains('dark')
    let isSubscribed = true
    const writer = HanziWriter.create(mobileWriterContainerRef.current, character.hanzi, {
      width: 120,
      height: 120,
      padding: 10,
      showOutline: true,
      strokeAnimationSpeed: 1.2,
      delayBetweenStrokes: 150,
      strokeColor: isDark ? '#f87171' : '#dc2626',
      radicalColor: isDark ? '#38bdf8' : '#0284c7',
      outlineColor: isDark ? '#262c38' : '#e7e3da',
      showCharacter: isComponents,
      onLoadCharDataSuccess: () => {
        if (isSubscribed) {
          setIsWriterReady(true)
          if (isComponents) {
            writer.showCharacter()
          }
        }
      },
      onLoadCharDataError: () => {
        if (isSubscribed) {
          setIsWriterReady(false)
        }
      },
    })
    mobileWriterRef.current = writer

    return () => {
      isSubscribed = false
      mobileWriterRef.current = null
    }
  }, [character.hanzi, isComponents])

  const handlePlayAnimate = () => {
    if (isAnimating) return
    if (mobileWriterRef.current) {
      setIsAnimating(true)
      mobileWriterRef.current.animateCharacter({
        onComplete: () => {
          setIsAnimating(false)
          if (isComponents) {
            mobileWriterRef.current?.showCharacter()
          }
        },
      })
    }
  }


  // Scale the writing grid to the pane so nothing overflows on desktop
  const [paneRef, paneFit] = useFitCount<HTMLElement>(1, 1, 0)
  const isDesktop = typeof window !== 'undefined' && window.innerWidth > 1024
  const canvasSize = isDesktop
    ? Math.round(Math.max(150, Math.min(290, paneFit.rows - 250, paneFit.cols * 0.4)))
    : 290

  const activeReading = readings[selectedReadingIndex] ?? readings[0]
  const isPolyphonic = readings.length > 1

  const handleSpeak = (text: string, rate: number = 1.0) => {
    speakChinese(text, rate)
  }

  return (
    <section className="studio-canvas-pane" ref={paneRef}>
      {/* Top action row (Desktop only - Mobile has star directly inside hero card) */}
      {!isMobile && (
        <div className="canvas-header-bar">
          <div className="canvas-badges-left">
            {onOpenMobileList && (
              <button
                type="button"
                className="mobile-drawer-toggle-btn"
                onClick={onOpenMobileList}
                title="Mở danh sách Hán tự"
              >
                Kho chữ ({totalCount})
              </button>
            )}
          </div>

          <div className="canvas-actions-right">
            <button
              type="button"
              className={`fav-action-btn ${isFavorite ? 'starred' : ''}`}
              onClick={onToggleFavorite}
              title={isFavorite ? 'Bỏ lưu khỏi sổ tay' : 'Lưu chữ vào sổ tay'}
              aria-label="Lưu vào sổ tay"
            >
              <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      )}

      {isMobile ? (
        /* Mobile Hero: Left Square Mige Box + Right Linguistic Info & Actions */
        <div className="mobile-hero-container">
          <div className="mobile-hero-card">
            {/* Star Favorite Button placed directly inside the card */}
            <button
              type="button"
              className={`mobile-hero-star-btn ${isFavorite ? 'starred' : ''}`}
              onClick={onToggleFavorite}
              title={isFavorite ? 'Bỏ lưu khỏi sổ tay' : 'Lưu chữ vào sổ tay'}
              aria-label="Lưu vào sổ tay"
            >
              <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>

            {/* Left: Square Box Mễ Tự Cách (~125px) */}
            <div className="mobile-hero-left">
              <div
                className="mobile-mige-frame"
                onClick={handlePlayAnimate}
                title="Bấm vào để xem hoạt họa nét viết"
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

                {/* Surface for colored HanziWriter (active when isComponents or animating) */}
                <div
                  ref={mobileWriterContainerRef}
                  className="mobile-writer-surface"
                  style={{
                    opacity: (isComponents && isWriterReady) || isAnimating ? 1 : 0,
                    pointerEvents: (isComponents && isWriterReady) || isAnimating ? 'auto' : 'none',
                  }}
                />

                {/* Always-mounted modern font glyph as reliable baseline - never empty */}
                <div
                  className="mobile-hanzi-glyph font-sans-sc"
                  lang="zh"
                  style={{
                    opacity: (isComponents && isWriterReady) || isAnimating ? 0 : 1,
                  }}
                >
                  {character.hanzi}
                </div>
              </div>
            </div>

            {/* Right: Linguistic Identity, Meaning Box, and Action Toolbar */}
            <div className="mobile-hero-right">
              {/* Row 1: Pinyin, Loa & Chậm capsule, Hán Việt */}
              <div className="mobile-identity-row">
                <span className="mobile-pinyin-text">
                  {activeReading?.pinyin || (detail?.character?.strokeCount ? `${detail.character.strokeCount} nét` : '')}
                </span>

                <div className="mobile-audio-capsule">
                  <button
                    type="button"
                    className="mobile-sound-btn"
                    onClick={() => handleSpeak(activeReading?.pinyin || character.hanzi, 1.0)}
                    title="Phát âm chuẩn (1.0x)"
                    aria-label="Phát âm chuẩn"
                  >
                    <Volume2 size={13} />
                  </button>
                  <button
                    type="button"
                    className="mobile-sound-btn slow"
                    onClick={() => handleSpeak(activeReading?.pinyin || character.hanzi, 0.65)}
                    title="Đọc chậm (0.65x)"
                    aria-label="Đọc chậm"
                  >
                    <TurtleIcon size={13} />
                  </button>
                </div>

                <span className="mobile-hanviet-text" title="Âm Hán Việt">
                  {activeReading?.hanViet ? activeReading.hanViet.toUpperCase() : '—'}
                </span>
              </div>

              {/* Row 2: Vietnamese Definition Box (emphasized, high contrast) */}
              <div className="mobile-def-box">
                <p className="mobile-def-text">
                  {activeReading?.meaningVi || 'Chưa có định nghĩa tiếng Việt cho mục này.'}
                </p>
              </div>

              {/* Row 3: Balanced 2 Action Buttons (Thành phần is toggled in Navbar) */}
              <div className="mobile-actions-grid">
                {/* Nút 1: Xem nét */}
                <button
                  type="button"
                  className={`mobile-action-pill ${isAnimating ? 'playing' : ''}`}
                  onClick={handlePlayAnimate}
                  disabled={isAnimating}
                  title="Xem nét bút động"
                >
                  <Play size={13} fill={isAnimating ? 'currentColor' : 'none'} />
                  <span>{isAnimating ? 'Đang vẽ…' : 'Xem nét'}</span>
                </button>

                {/* Nút 2: Tập viết */}
                <button
                  type="button"
                  className="mobile-action-pill primary"
                  onClick={() => setShowPracticeModal(true)}
                  title="Mở bảng tập viết nổi lên màn hình"
                >
                  <PenTool size={13} />
                  <span>Tập viết</span>
                </button>
              </div>
            </div>
          </div>


          {/* Polyphonic readings list if character has >1 reading */}
          {isPolyphonic && (
            <div className="polyphonic-readings-card mobile-poly-card">
              <div className="polyphonic-header">
                <div className="poly-title-badge">
                  <span>Cách đọc ({readings.length})</span>
                </div>
              </div>
              <div className="polyphonic-grid">
                {readings.map((r, i) => {
                  const isActive = i === selectedReadingIndex
                  return (
                    <div
                      key={i}
                      className={`poly-item ${isActive ? 'active-reading' : ''}`}
                      onClick={() => setSelectedReadingIndex(i)}
                      title={`Chọn âm ${r.hanViet?.toUpperCase()} (${r.pinyin})`}
                    >
                      <div className="poly-top">
                        <span className="poly-pinyin">{r.pinyin}</span>
                        <button
                          type="button"
                          className="poly-speak"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSpeak(r.pinyin, 1.0)
                          }}
                          title="Phát âm chuẩn (1.0x)"
                        >
                          <Volume2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="poly-speak slow"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSpeak(r.pinyin, 0.65)
                          }}
                          title="Đọc chậm (0.65x)"
                        >
                          <TurtleIcon size={13} />
                        </button>
                        <span className="poly-hanviet">{r.hanViet?.toUpperCase()}</span>
                        {r.isPrimary ? (
                          <span className="primary-pill-tag">Âm chính</span>
                        ) : (
                          <span className="secondary-pill-tag">Âm phụ</span>
                        )}
                        {isActive && <span className="active-dot-indicator" title="Đang chọn" />}
                      </div>
                      <div className="poly-meaning">{r.meaningVi}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Main Interactive Canvas Area (Desktop) */
        <div className="canvas-hero-body">
          {/* Hanzi Writer on 米字格 (Mễ tự cách) */}
          <div className="canvas-glyph-stage">
            <HanziWriterCanvas
              hanzi={character.hanzi}
              size={canvasSize}
              displayMode={displayMode}
              defaultMode="display"
            />
          </div>

          {/* Structured Linguistic Info */}
          <div className="linguistic-identity-block">
            {/* Layer 1: Pinyin with Pronunciation audio & Polyphonic Badge */}
            <div className="pinyin-voice-cluster">
              <span className="pinyin-text-hero">{activeReading?.pinyin}</span>
              <button
                type="button"
                className="speak-hero-btn"
                onClick={() => handleSpeak(activeReading?.pinyin || character.hanzi, 1.0)}
                title="Phát âm chuẩn (1.0x)"
                aria-label="Phát âm chuẩn"
              >
                <Volume2 size={22} />
              </button>
              <button
                type="button"
                className="speak-hero-btn slow-speak-btn"
                onClick={() => handleSpeak(activeReading?.pinyin || character.hanzi, 0.65)}
                title="Đọc chậm (0.65x)"
                aria-label="Đọc chậm"
              >
                <TurtleIcon size={20} />
              </button>
              {isPolyphonic && (
                <span className="poly-indicator-badge">
                  Đa âm ({readings.length})
                </span>
              )}
            </div>

            {/* Layer 2: Âm Hán Việt - Con dấu Triện Son Đỏ */}
            <div className="hanviet-seal-wrapper">
              <div className="vermilion-seal-card" title="Con dấu Âm Hán Việt">
                <div className="seal-inner-frame">
                  <span className="seal-emblem" aria-hidden="true">印</span>
                  <div className="seal-text-group">
                    <span className="seal-label-sub">ÂM HÁN VIỆT</span>
                    <span className="seal-word-main">
                      {activeReading?.hanViet ? activeReading.hanViet.toUpperCase() : 'HÁN VIỆT'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Layer 3: Vietnamese Primary Definition */}
            <div className="vietnamese-definition-box">
              <div className="definition-card-inner">
                <span className="quote-mark-symbol" aria-hidden="true">“</span>
                <p className="vietnamese-def-text">{activeReading?.meaningVi}</p>
                <span className="quote-mark-symbol" aria-hidden="true">”</span>
              </div>
            </div>

            {/* Layer 4: Reading Variant Slot */}
            <div className="reading-variant-slot">
              {isPolyphonic ? (
                <div className="polyphonic-readings-card">
                  <div className="polyphonic-header">
                    <div className="poly-title-badge">
                      <span>Cách đọc & Âm Hán Việt ({readings.length})</span>
                    </div>
                    <span className="poly-hint-text">Bấm vào âm để đổi con dấu & nghĩa</span>
                  </div>
                  <div className="polyphonic-grid">
                    {readings.map((r, i) => {
                      const isActive = i === selectedReadingIndex
                      return (
                        <div
                          key={i}
                          className={`poly-item ${isActive ? 'active-reading' : ''}`}
                          onClick={() => setSelectedReadingIndex(i)}
                          title={`Chọn âm ${r.hanViet?.toUpperCase()} (${r.pinyin})`}
                        >
                          <div className="poly-top">
                            <span className="poly-pinyin">{r.pinyin}</span>
                            <button
                              type="button"
                              className="poly-speak"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSpeak(r.pinyin, 1.0)
                              }}
                              title="Phát âm chuẩn (1.0x)"
                            >
                              <Volume2 size={13} />
                            </button>
                            <button
                              type="button"
                              className="poly-speak slow"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSpeak(r.pinyin, 0.65)
                              }}
                              title="Đọc chậm (0.65x)"
                            >
                              <TurtleIcon size={13} />
                            </button>
                            <span className="poly-hanviet">{r.hanViet?.toUpperCase()}</span>
                            {r.isPrimary ? (
                              <span className="primary-pill-tag">Âm chính</span>
                            ) : (
                              <span className="secondary-pill-tag">Âm phụ</span>
                            )}
                            {isActive && <span className="active-dot-indicator" title="Đang chọn" />}
                          </div>
                          <div className="poly-meaning">{r.meaningVi}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="single-reading-status-card">
                  <div className="single-status-header">
                    <span className="single-status-label">Chữ đơn âm</span>
                  </div>
                  <p className="single-status-desc">
                    Chữ có 1 cách đọc Pinyin và 1 âm Hán Việt chuẩn duy nhất.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Canvas Footer for Desktop */}
      {!isMobile && (
        <div className="canvas-footer-bar">
          <div className="nav-btn-cluster">
            <button
              type="button"
              className="nav-random-btn"
              onClick={onRandom}
              title="Đổi chữ ngẫu nhiên (Phím Space)"
            >
              Ngẫu nhiên
            </button>
          </div>
        </div>
      )}

      {/* Practice Writing Full Modal Overlay */}
      {showPracticeModal && (
        <HanziWriterModal
          hanzi={character.hanzi}
          pinyin={activeReading?.pinyin}
          hanViet={activeReading?.hanViet ?? undefined}
          meaningVi={activeReading?.meaningVi ?? undefined}
          strokeCount={detail?.character.strokeCount}
          onClose={() => setShowPracticeModal(false)}
        />
      )}
    </section>
  )
}
