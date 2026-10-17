import { useState, useEffect } from 'react'
import {
  Volume2,
  Star,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Type,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import type { BundleCharacter, CharacterDetail } from '../core'
import { HanziWriterCanvas } from './HanziWriterCanvas'
import { speakChinese } from '../utils/speech'

interface StudioCenterProps {
  character: BundleCharacter
  detail: CharacterDetail | null
  currentIndex: number
  totalCount: number
  isFavorite: boolean
  fontStyle: 'calligraphy' | 'serif' | 'sans'
  onToggleFont: () => void
  onToggleFavorite: () => void
  onNext: () => void
  onPrev: () => void
  onRandom: () => void
  // Mobile drawer trigger
  onOpenMobileList?: () => void
}

export function StudioCenter({
  character,
  detail,
  currentIndex,
  totalCount,
  isFavorite,
  fontStyle,
  onToggleFont,
  onToggleFavorite,
  onNext,
  onPrev,
  onRandom,
  onOpenMobileList,
}: StudioCenterProps) {
  const readings = character.readings || []
  const [selectedReadingIndex, setSelectedReadingIndex] = useState(0)

  // Reset to primary reading whenever character changes
  useEffect(() => {
    const primaryIdx = readings.findIndex((r) => r.isPrimary)
    setSelectedReadingIndex(primaryIdx >= 0 ? primaryIdx : 0)
  }, [character.hanzi])

  const activeReading = readings[selectedReadingIndex] ?? readings[0]
  const isPolyphonic = readings.length > 1

  const handleSpeak = (text: string) => {
    speakChinese(text)
  }

  return (
    <section className="studio-canvas-pane">
      {/* Top action row */}
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

          <span className="badge-hsk-level">
            {character.hsk2Level ? `HSK ${character.hsk2Level}` : 'HSK Cơ Bản'}
          </span>

          <span className="badge-progress-count" title="Vị trí chữ hiện tại">
            {currentIndex + 1} / {totalCount}
          </span>

          {detail?.character.strokeCount && (
            <span className="badge-stroke-count">
              {detail.character.strokeCount} nét
            </span>
          )}

          {character.traditional && character.traditional !== character.hanzi && (
            <span className="badge-traditional" title="Chữ phồn thể">
              Phồn thể: {character.traditional}
            </span>
          )}
        </div>

        <div className="canvas-actions-right">
          <button
            type="button"
            className="font-switch-btn"
            onClick={onToggleFont}
            title={`Phông chữ: ${fontStyle === 'calligraphy' ? 'Thư pháp' : fontStyle === 'serif' ? 'Khải thư' : 'Không chân'}`}
          >
            <Type size={16} />
            <span className="font-name-label">
              {fontStyle === 'calligraphy' ? 'Thư pháp' : fontStyle === 'serif' ? 'Khải thư' : 'Hiện đại'}
            </span>
          </button>

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

      {/* Main Interactive Canvas Area */}
      <div className="canvas-hero-body">
        {/* Hanzi Writer on 米字格 (Mễ tự cách) */}
        <div className="canvas-glyph-stage">
          <HanziWriterCanvas
            hanzi={character.hanzi}
            size={290}
            fontStyle={fontStyle}
            defaultMode="display"
          />
        </div>

        {/* Structured Linguistic Info: NO mid-dot separation (好 · HẢO · hǎo) */}
        <div className="linguistic-identity-block">
          {/* Layer 1: Pinyin with Pronunciation audio & Polyphonic Badge */}
          <div className="pinyin-voice-cluster">
            <span className="pinyin-text-hero">{activeReading?.pinyin}</span>
            <button
              type="button"
              className="speak-hero-btn"
              onClick={() => handleSpeak(character.hanzi)}
              title="Phát âm tiếng Trung chuẩn Bắc Kinh"
              aria-label="Phát âm"
            >
              <Volume2 size={22} />
            </button>
            {isPolyphonic && (
              <span className="poly-indicator-badge">
                <Sparkles size={12} />
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

          {/* Layer 3: Vietnamese Primary Definition with elegant quote framing */}
          <div className="vietnamese-definition-box">
            <div className="definition-card-inner">
              <span className="quote-mark-symbol" aria-hidden="true">“</span>
              <p className="vietnamese-def-text">{activeReading?.meaningVi}</p>
              <span className="quote-mark-symbol" aria-hidden="true">”</span>
            </div>
          </div>

          {/* Layer 4: Reading Variant Slot - Always present to guarantee fixed layout */}
          <div className="reading-variant-slot">
            {isPolyphonic ? (
              <div className="polyphonic-readings-card">
                <div className="polyphonic-header">
                  <div className="poly-title-badge">
                    <Sparkles size={13} className="sparkle-poly" />
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
                              handleSpeak(character.hanzi)
                            }}
                            title="Phát âm"
                          >
                            <Volume2 size={13} />
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
                  <CheckCircle2 size={14} className="single-status-icon" />
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

      {/* Canvas Footer: Navigation & Auto-cycle Timer */}
      <div className="canvas-footer-bar">
        {/* Navigation Buttons */}
        <div className="nav-btn-cluster">
          <button
            type="button"
            className="nav-step-btn prev-btn"
            onClick={onPrev}
            title="Chữ trước đó (Phím ←)"
          >
            <ChevronLeft size={18} />
            <span>Trước</span>
          </button>

          <button
            type="button"
            className="nav-random-btn"
            onClick={onRandom}
            title="Đổi chữ ngẫu nhiên (Phím Space)"
          >
            <Shuffle size={16} />
            <span>Ngẫu nhiên</span>
          </button>

          <button
            type="button"
            className="nav-step-btn next-btn"
            onClick={onNext}
            title="Chữ tiếp theo (Phím →)"
          >
            <span>Tiếp</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  )
}
