import { Volume2, PenTool, BookOpen, Star, ChevronLeft, ChevronRight, Shuffle } from 'lucide-react'
import type { BundleCharacter } from '../core'
import { speakChinese } from '../utils/speech'

interface WidgetCardProps {
  character: BundleCharacter
  currentIndex: number
  totalCount: number
  isFavorite: boolean
  fontStyle: 'calligraphy' | 'serif' | 'sans'
  onToggleFavorite: () => void
  onOpenWriter: () => void
  onOpenDetail: () => void
  onNext: () => void
  onPrev: () => void
  onRandom: () => void
}

export function WidgetCard({
  character,
  currentIndex,
  totalCount,
  isFavorite,
  fontStyle,
  onToggleFavorite,
  onOpenWriter,
  onOpenDetail,
  onNext,
  onPrev,
  onRandom,
}: WidgetCardProps) {
  const primary = character.readings.find((r) => r.isPrimary) ?? character.readings[0]

  const handleSpeak = () => {
    speakChinese(character.hanzi)
  }

  const fontClass =
    fontStyle === 'calligraphy'
      ? 'font-calligraphy'
      : fontStyle === 'serif'
        ? 'font-serif-sc'
        : 'font-sans-sc'

  return (
    <article className="widget-card-container">
      <div className="card-outer-frame">
        {/* Top Badges */}
        <div className="card-top-bar">
          <div className="badges-left">
            <span className="level-badge">
              {character.hsk2Level ? `HSK ${character.hsk2Level}` : 'HSK'}
            </span>
            {character.traditional && character.traditional !== character.hanzi && (
              <span className="traditional-badge" title="Chữ phồn thể">
                Phồn thể: {character.traditional}
              </span>
            )}
          </div>

          <div className="card-top-actions">
            <button
              type="button"
              className={`fav-star-btn ${isFavorite ? 'starred' : ''}`}
              onClick={onToggleFavorite}
              title={isFavorite ? 'Bỏ lưu khỏi sổ tay' : 'Lưu vào sổ tay'}
              aria-label="Lưu chữ"
            >
              <Star size={20} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        {/* Center Hanzi Glyph */}
        <div className="hanzi-presentation-area">
          <div
            className={`hanzi-giant-glyph ${fontClass}`}
            lang="zh"
            onClick={onOpenWriter}
            title="Bấm vào chữ để xem nét bút hoặc tập viết"
          >
            {character.hanzi}
          </div>

          {/* Quick Pronounce Button */}
          <button
            type="button"
            className="speak-floating-btn"
            onClick={handleSpeak}
            title="Nghe phát âm chuẩn tiếng Trung"
            aria-label="Nghe phát âm"
          >
            <Volume2 size={20} />
          </button>
        </div>

        {/* Pinyin & Tones */}
        <div className="pinyin-display-row">
          <span className="pinyin-large">{primary?.pinyin}</span>
        </div>

        {/* Âm Hán Việt - Core Highlight */}
        <div className="hanviet-banner-container">
          <div className="hanviet-stamp-pill" onClick={onOpenDetail} title="Xem chiết tự của chữ này">
            <span className="hanviet-stamp-text">
              {primary?.hanViet ? primary.hanViet.toUpperCase() : 'HÁN VIỆT'}
            </span>
          </div>
        </div>

        {/* Vietnamese Meaning */}
        <div className="meaning-display-row">
          <p className="vietnamese-definition">{primary?.meaningVi}</p>
        </div>

        {/* Quick Action Buttons */}
        <div className="card-feature-actions">
          <button
            type="button"
            className="feature-action-btn writer-action"
            onClick={onOpenWriter}
            title="Xem hoạt họa thứ tự nét bút và tập vẽ"
          >
            <PenTool size={16} />
            <span>Nét viết</span>
          </button>

          <button
            type="button"
            className="feature-action-btn detail-action"
            onClick={onOpenDetail}
            title="Xem phân tích bộ thủ, chiết tự và từ ghép"
          >
            <BookOpen size={16} />
            <span>Chiết tự</span>
          </button>
        </div>

        {/* Navigation Toolbar */}
        <div className="card-nav-toolbar">
          <button
            type="button"
            className="nav-arrow-btn"
            onClick={onPrev}
            title="Chữ trước (Phím mũi tên Trái)"
            aria-label="Chữ trước"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            type="button"
            className="nav-random-btn"
            onClick={onRandom}
            title="Chữ ngẫu nhiên khác (Phím Space)"
          >
            <Shuffle size={16} />
            <span>Chữ khác</span>
          </button>

          <button
            type="button"
            className="nav-arrow-btn"
            onClick={onNext}
            title="Chữ tiếp theo (Phím mũi tên Phải)"
            aria-label="Chữ sau"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Counter index */}
        <div className="card-footer-index">
          <span>
            {currentIndex + 1} / {totalCount}
          </span>
        </div>
      </div>
    </article>
  )
}
