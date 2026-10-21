import { Volume2, X, BookOpen, Layers, Compass, Sparkles, PenTool } from 'lucide-react'
import type { CharacterDetail } from '../core'
import { speakChinese } from '../utils/speech'

interface DetailModalProps {
  detail: CharacterDetail
  onSelectHanzi: (hanzi: string) => void
  onOpenWriter: () => void
  onClose: () => void
}



export function DetailModal({
  detail,
  onSelectHanzi,
  onOpenWriter,
  onClose,
}: DetailModalProps) {
  const { character, radical, parts, words = [] } = detail

  const primary = character.readings.find((r) => r.isPrimary) ?? character.readings[0]
  const otherReadings = character.readings.filter((r) => r.pinyin !== primary?.pinyin)

  const handleSpeak = (text: string) => {
    speakChinese(text)
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content detail-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-info">
            <h3 className="modal-title">Chiết tự & Giải nghĩa chi tiết</h3>
            <span className="badge-tag">
              {character.hsk2Level ? `HSK ${character.hsk2Level}` : 'Cơ bản'}
            </span>
          </div>
          <button type="button" className="icon-btn close-btn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Character Hero in Modal */}
        <div className="detail-hero-card">
          <div className="hero-char-group">
            <div className="char-badge" lang="zh">
              {character.hanzi}
            </div>
            {character.traditional && character.traditional !== character.hanzi && (
              <span className="traditional-sub">Phồn thể: {character.traditional}</span>
            )}
          </div>

          <div className="hero-text-group">
            <div className="pinyin-row">
              <span className="pinyin-val">{primary?.pinyin}</span>
              <button
                type="button"
                className="speak-btn-mini"
                onClick={() => handleSpeak(character.hanzi)}
                title="Nghe phát âm"
              >
                <Volume2 size={16} />
              </button>
            </div>
            <div className="hanviet-val">
              Âm Hán Việt: <strong>{primary?.hanViet?.toUpperCase() ?? '—'}</strong>
            </div>
            <div className="meaning-val">{primary?.meaningVi}</div>
          </div>

          <button
            type="button"
            className="writer-launch-btn"
            onClick={onOpenWriter}
            title="Xem hoạt họa thứ tự nét bút"
          >
            <PenTool size={16} />
            <span>Tập viết</span>
          </button>
        </div>

        {/* Other Readings if polyphonic */}
        {otherReadings.length > 0 && (
          <div className="section-block">
            <h4 className="section-title">
              <Compass size={16} /> Cách đọc khác (Chữ đa âm)
            </h4>
            <div className="other-readings-list">
              {otherReadings.map((r, i) => (
                <div key={i} className="reading-chip">
                  <span className="pinyin-accent">{r.pinyin}</span>
                  <span className="hv-accent">[{r.hanViet?.toUpperCase()}]</span>
                  <span className="meaning-accent">{r.meaningVi}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chiết tự (Mnemonics & Etymology) */}
        {character.chietTu && (
          <div className="section-block chiet-tu-box">
            <div className="chiet-tu-header">
              <Sparkles size={16} className="sparkle-icon" />
              <h4>{character.chietTuType === 'etymology' ? 'Nguồn gốc chiết tự' : 'Mẹo nhớ chiết tự'}</h4>
            </div>
            <p className="chiet-tu-content">{character.chietTu}</p>
          </div>
        )}

        {character.mnemonicVi && (
          <div className="section-block chiet-tu-box">
            <div className="chiet-tu-header">
              <Sparkles size={16} className="sparkle-icon" />
              <h4>Mẹo nhớ nhanh</h4>
            </div>
            <p className="chiet-tu-content">{character.mnemonicVi}</p>
          </div>
        )}

        {/* Radical info */}
        {radical && (
          <div className="section-block">
            <h4 className="section-title">
              <Compass size={16} /> Bộ thủ chủ quản
            </h4>
            <div className="radical-card">
              <span className="radical-glyph" lang="zh">
                {radical.part}
              </span>
              <div className="radical-desc">
                <div className="radical-name">{radical.label ?? `Bộ ${radical.hanViet ?? radical.part}`}</div>
                <div className="radical-meaning">
                  Ý nghĩa: {radical.meaningVi ?? 'Thành phần biểu ý chính của chữ'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Components / Parts Breakdown */}
        {parts.length > 0 && (
          <div className="section-block">
            <h4 className="section-title">
              <Layers size={16} /> Các thành phần cấu tạo ({parts.length})
            </h4>
            <div className="parts-grid">
              {parts.map((p, idx) => (
                <div
                  key={idx}
                  className="part-card interactive"
                  onClick={() => onSelectHanzi(p.part)}
                  title={`Bấm để tra cứu "${p.part}"`}
                >
                  <span className="part-glyph" lang="zh">
                    {p.part}
                  </span>
                  <div className="part-info">
                    <span className="part-hv">{p.hanViet ? p.hanViet.toUpperCase() : '—'}</span>
                    <span className="part-mean">{p.meaningVi ?? p.label ?? 'thành phần'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compound Words */}
        {words.length > 0 && (
          <div className="section-block">
            <h4 className="section-title">
              <BookOpen size={16} /> Từ ghép thường dùng ({words.length})
            </h4>
            <div className="words-grid">
              {words.map((w) => (
                <div key={w.id} className="word-card">
                  <div className="word-header-row">
                    <span
                      className="word-glyph"
                      lang="zh"
                      onClick={() => handleSpeak(w.word)}
                      title="Bấm để nghe phát âm"
                    >
                      {w.word}
                    </span>
                    <button
                      type="button"
                      className="word-speak-btn"
                      onClick={() => handleSpeak(w.word)}
                      aria-label="Phát âm từ"
                    >
                      <Volume2 size={14} />
                    </button>
                    <span className="word-pinyin">{w.pinyin}</span>
                  </div>
                  <div className="word-body">
                    <span className="word-hv">{w.hanViet?.toUpperCase()}</span>
                    <span className="word-mean">{w.meaningVi}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
