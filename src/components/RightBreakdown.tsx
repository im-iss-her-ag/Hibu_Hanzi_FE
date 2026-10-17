import { Volume2, Compass, Layers, Sparkles, BookOpen, ArrowRight } from 'lucide-react'
import type { CharacterDetail } from '../core'
import { speakChinese } from '../utils/speech'

interface RightBreakdownProps {
  detail: CharacterDetail | null
  isLoading: boolean
  onSelectHanzi: (hanzi: string) => void
}

export function RightBreakdown({ detail, isLoading, onSelectHanzi }: RightBreakdownProps) {
  if (isLoading) {
    return (
      <aside className="studio-sidebar-right">
        <div className="right-panel-scroll">
          <div className="breakdown-panel-header">
            <h2 className="breakdown-title">Chiết Tự & Hán Việt</h2>
            <span className="panel-subtitle">Giải phẫu cấu trúc & nguồn gốc</span>
          </div>
          <div className="breakdown-loading">
            <div className="spinner-ring-mini" />
            <span>Đang giải phẫu chiết tự & Hán Việt…</span>
          </div>
        </div>
      </aside>
    )
  }

  if (!detail) {
    return (
      <aside className="studio-sidebar-right">
        <div className="right-panel-scroll">
          <div className="breakdown-panel-header">
            <h2 className="breakdown-title">Chiết Tự & Hán Việt</h2>
            <span className="panel-subtitle">Giải phẫu cấu trúc & nguồn gốc</span>
          </div>
          <div className="breakdown-empty-placeholder">
            <div className="placeholder-watermark" aria-hidden="true">字</div>
            <p className="placeholder-title">Chưa chọn chữ Hán</p>
            <p className="placeholder-desc">
              Chọn một chữ từ danh mục bên trái hoặc đổi bộ lọc cấp độ để xem chiết tự và cầu nối Hán Việt.
            </p>
          </div>
        </div>
      </aside>
    )
  }

  const { character, radical, parts = [], words = [] } = detail

  const handleSpeak = (text: string) => {
    speakChinese(text)
  }

  return (
    <aside className="studio-sidebar-right">
      <div className="right-panel-scroll">
        {/* Panel Header */}
        <div className="breakdown-panel-header">
          <h2 className="breakdown-title">Chiết Tự & Hán Việt</h2>
          <span className="panel-subtitle">Giải phẫu cấu trúc & nguồn gốc</span>
        </div>

        {/* 1. Radical Card (Bộ thủ chủ quản) */}
        {radical && (
          <section className="breakdown-card radical-highlight-card">
            <div className="card-micro-label">
              <Compass size={14} className="card-icon" />
              <span>BỘ THỦ CHỦ QUẢN</span>
            </div>

            <div className="radical-content-row">
              <div
                className="radical-box-glyph"
                lang="zh"
                onClick={() => onSelectHanzi(radical.part)}
                title={`Bấm để tra bộ thủ "${radical.part}"`}
              >
                {radical.part}
              </div>

              <div className="radical-meta-group">
                <div className="radical-name-title">
                  {radical.label ?? `Bộ ${radical.hanViet ?? radical.part}`}
                </div>

                <div className="radical-sino-badge">
                  Âm Hán Việt: <strong>{radical.hanViet?.toUpperCase() ?? '—'}</strong>
                </div>

                <div className="radical-meaning-text">
                  Ý nghĩa biểu trưng: {radical.meaningVi ?? 'Thành phần chỉ ý chính của chữ'}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 2. Visual Lego Decomposition (Cấu tạo chiết tự) */}
        {parts.length > 0 && (
          <section className="breakdown-card decomposition-card">
            <div className="card-micro-label">
              <Layers size={14} className="card-icon" />
              <span>CẤU THÀNH CHIẾT TỰ ({parts.length} THÀNH PHẦN)</span>
            </div>

            {/* Lego Scheme Formula */}
            <div className="lego-formula-container">
              {parts.map((p, idx) => (
                <div key={idx} className="lego-step-group">
                  <div
                    className="lego-part-chip"
                    onClick={() => onSelectHanzi(p.part)}
                    title={`Bấm để tra cứu "${p.part}"`}
                  >
                    <span className="lego-glyph" lang="zh">
                      {p.part}
                    </span>
                    <div className="lego-info">
                      <span className="lego-hv">{p.hanViet ? p.hanViet.toUpperCase() : '—'}</span>
                      <span className="lego-mean">{p.meaningVi ?? p.label ?? 'thành phần'}</span>
                    </div>
                  </div>

                  {idx < parts.length - 1 && <span className="lego-plus-symbol">+</span>}
                </div>
              ))}

              <ArrowRight size={15} className="lego-arrow-symbol" />

              <div className="lego-result-chip">
                <span className="lego-glyph main-result" lang="zh">
                  {character.hanzi}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* 3. Chiết tự & Mẹo nhớ (Mnemonics / Etymology) */}
        {character.chietTu && (
          <section className="breakdown-card mnemonic-card">
            <div className="card-micro-label">
              <Sparkles size={14} className="card-icon" />
              <span>
                {character.chietTuType === 'etymology'
                  ? 'NGUỒN GỐC CHỮ HÁN'
                  : 'MẸO NHỚ DÂN GIAN'}
              </span>
              <span
                className={`tag-type-badge ${character.chietTuType === 'etymology' ? 'etymology' : 'mnemonic'}`}
              >
                {character.chietTuType === 'etymology' ? 'Văn tự học' : 'Chiết tự mẹo'}
              </span>
            </div>

            <p className="mnemonic-narrative-text">{character.chietTu}</p>
          </section>
        )}

        {/* 4. Cầu nối Hán - Việt: Từ ghép thông dụng (Vietnamese Cognates Bridge) */}
        {words.length > 0 && (
          <section className="breakdown-card compound-words-card">
            <div className="card-micro-label">
              <BookOpen size={14} className="card-icon" />
              <span>CẦU NỐI TỪ GHÉP HÁN VIỆT ({words.length})</span>
            </div>
            <p className="compound-helper-tip">
              Người Việt hiểu nghĩa ngay bằng cách đọc âm Hán Việt:
            </p>

            <div className="compound-words-list">
              {words.map((w) => (
                <div key={w.id} className="compound-word-item">
                  {/* Top: Chinese Word + Pronounce Audio */}
                  <div className="word-glyph-line">
                    <span
                      className="word-chinese-text"
                      lang="zh"
                      onClick={() => handleSpeak(w.word)}
                      title="Nghe phát âm từ"
                    >
                      {w.word}
                    </span>
                    <button
                      type="button"
                      className="word-audio-btn"
                      onClick={() => handleSpeak(w.word)}
                      title="Phát âm tiếng Trung"
                      aria-label="Phát âm"
                    >
                      <Volume2 size={14} />
                    </button>
                    <span className="word-pinyin-label">{w.pinyin}</span>
                  </div>

                  {/* Middle: Vermilion Han-Viet Seal */}
                  <div className="word-hanviet-row">
                    <span className="word-seal-hv">
                      {w.hanViet ? w.hanViet.toUpperCase() : '—'}
                    </span>
                  </div>

                  {/* Bottom: Vietnamese Definition */}
                  <div className="word-meaning-box">{w.meaningVi}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  )
}
