import { useState, useMemo, useEffect } from 'react'
import { X, Volume2 } from 'lucide-react'
import { parsePinyin, getFinalSampleSyllable } from '../utils/pinyinData'
import { MouthShapeDiagram } from './MouthShapeDiagram'
import { ToneContourDiagram } from './ToneContourDiagram'
import { speakChinese } from '../utils/speech'

interface PronunciationModalProps {
  hanzi: string
  pinyin: string
  hanViet?: string | null
  meaningVi?: string | null
  onClose: () => void
}

export function PronunciationModal({
  hanzi,
  pinyin,
  hanViet,
  meaningVi,
  onClose,
}: PronunciationModalProps) {
  const [activeTab, setActiveTab] = useState<'initial' | 'final' | 'tone'>('initial')

  const parsed = useMemo(() => parsePinyin(pinyin), [pinyin])
  const [selectedTone, setSelectedTone] = useState<1 | 2 | 3 | 4 | 0>(parsed.tone)

  useEffect(() => {
    setSelectedTone(parsed.tone)
  }, [parsed])

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSpeak = (text: string) => {
    speakChinese(text)
  }

  const { initial, final, phoneticFinal, initialInfo, finalInfo, toneInfo, toneVariants } = parsed

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
        className="modal-content pronunciation-modal-content"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >

        {/* Header with Hero Character info */}
        <div className="pronounce-modal-header">
          <div className="pronounce-hero-profile">
            <div className="hero-hanzi-seal" title={hanzi === '拼' || hanzi === '音' ? 'Âm tiết Pinyin' : 'Chữ Hán'}>
              {hanzi === '拼' || hanzi === '音' ? '拼' : hanzi}
            </div>

            <div className="hero-meta-col">
              <div className="hero-pinyin-row">
                <span className="hero-pinyin-display">{pinyin}</span>
                <button
                  type="button"
                  className="hero-listen-btn"
                  onClick={() => handleSpeak(hanzi === '拼' || hanzi === '音' ? pinyin : hanzi)}
                  title="Nghe phát âm chuẩn"
                  aria-label="Phát âm"
                >
                  <Volume2 size={18} />
                  <span>Phát âm</span>
                </button>
              </div>

              <div className="hero-hanviet-sub">
                {hanViet && <span className="hero-hanviet-tag">HÁN VIỆT: {hanViet.toUpperCase()}</span>}
                {meaningVi && <span className="hero-meaning-text">“{meaningVi}”</span>}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="icon-btn close-btn"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </div>

        {/* 3 Main Tab Buttons: Thanh mẫu / Vận mẫu / Thanh điệu */}
        <div className="pronounce-tabs-nav">
          <button
            type="button"
            className={`pronounce-tab-btn ${activeTab === 'initial' ? 'active' : ''}`}
            onClick={() => setActiveTab('initial')}
          >
            <div className="tab-btn-text">
              <span className="tab-main-label">Thanh Mẫu</span>
              <span className="tab-sub-slug">
                {initial ? `Phụ âm [ ${initial} ]` : 'Khởi âm zero'}
              </span>
            </div>
          </button>

          <button
            type="button"
            className={`pronounce-tab-btn ${activeTab === 'final' ? 'active' : ''}`}
            onClick={() => setActiveTab('final')}
          >
            <div className="tab-btn-text">
              <span className="tab-main-label">Vận Mẫu</span>
              <span className="tab-sub-slug">
                Nguyên âm [ {final}{phoneticFinal !== final ? ` → ${phoneticFinal}` : ''} ]
              </span>
            </div>
          </button>

          <button
            type="button"
            className={`pronounce-tab-btn ${activeTab === 'tone' ? 'active' : ''}`}
            onClick={() => setActiveTab('tone')}
          >
            <div className="tab-btn-text">
              <span className="tab-main-label">Thanh Điệu</span>
              <span className="tab-sub-slug">{toneInfo.nameVi}</span>
            </div>
          </button>
        </div>

        {/* Modal Body: Switch between 3 views */}
        <div className="pronounce-modal-body">
          {/* TAB 1: THANH MẪU (INITIAL) */}
          {activeTab === 'initial' && (
            <div className="tab-pane-content">
              {initialInfo ? (
                <>
                  <div className="linguistic-summary-card">
                    <div className="summary-card-left">
                      <span className="big-phoneme-badge">{initial}</span>
                      <div className="phoneme-titles">
                        <h3 className="phoneme-name">{initialInfo.name}</h3>
                        <span className="phoneme-group-tag">
                          {initialInfo.groupNameVi} · {initialInfo.soundType}
                        </span>
                      </div>
                    </div>

                    <div className="summary-card-right">
                      {initialInfo.isAspirated && (
                        <span className="badge-aspirate-tag">Bật hơi mạnh</span>
                      )}
                      <button
                        type="button"
                        className="btn-hear-phoneme"
                        onClick={() => handleSpeak(initial)}
                        title="Nghe mẫu phụ âm này"
                      >
                        <Volume2 size={16} />
                        <span>Nghe mẫu</span>
                      </button>
                    </div>
                  </div>

                  {/* Comprehensive Text Articulation Guide */}
                  <MouthShapeDiagram initialInfo={initialInfo} />
                </>
              ) : (
                <div className="zero-initial-notice">
                  <h3>Âm tiết này không có phụ âm đầu (Khởi âm zero)</h3>
                  <p>
                    Âm tiết bắt đầu trực tiếp bằng nguyên âm <strong>{final}</strong>. Hãy chuyển
                    sang tab <strong>Vận Mẫu</strong> để xem chi tiết hướng dẫn phát âm.
                  </p>
                  <button
                    type="button"
                    className="pill-btn active"
                    onClick={() => setActiveTab('final')}
                  >
                    Xem Vận Mẫu [{final}]
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VẬN MẪU (FINAL) */}
          {activeTab === 'final' && (
            <div className="tab-pane-content">
              {finalInfo ? (
                <>
                  <div className="linguistic-summary-card">
                    <div className="summary-card-left">
                      <span className="big-phoneme-badge final-badge">{phoneticFinal}</span>
                      <div className="phoneme-titles">
                        <h3 className="phoneme-name">{finalInfo.name}</h3>
                        <span className="phoneme-group-tag">
                          {finalInfo.groupNameVi} · Khẩu hình{' '}
                          {finalInfo.mouthShape === 'round'
                            ? 'Tròn môi'
                            : finalInfo.mouthShape === 'spread'
                              ? 'Dẹt môi'
                              : finalInfo.mouthShape === 'unrounded'
                                ? 'Môi dẹt, không tròn'
                                : finalInfo.mouthShape === 'curled'
                                  ? 'Uốn lưỡi'
                                  : finalInfo.mouthShape === 'semi_round'
                                    ? 'Hơi tròn môi'
                                    : 'Mở rộng'}
                        </span>
                      </div>
                    </div>

                    <div className="summary-card-right">
                      <button
                        type="button"
                        className="btn-hear-phoneme"
                        onClick={() => handleSpeak(getFinalSampleSyllable(phoneticFinal, parsed.tone || 1))}
                        title="Nghe mẫu vần này"
                      >
                        <Volume2 size={16} />
                        <span>Nghe vần</span>
                      </button>
                    </div>
                  </div>

                  {/* Comprehensive Text Articulation Guide */}
                  <MouthShapeDiagram finalInfo={finalInfo} />
                </>
              ) : (
                <div className="zero-initial-notice">
                  <p>Vận mẫu <strong>{phoneticFinal}</strong> hiện đang dùng hướng dẫn tổng quát.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: THANH ĐIỆU (TONE) */}
          {activeTab === 'tone' && (
            <div className="tab-pane-content">
              <ToneContourDiagram
                activeTone={selectedTone}
                toneVariants={toneVariants}
                onSelectTone={(t) => setSelectedTone(t)}
              />
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="pronounce-modal-footer">
          <div className="pronounce-footer-tip">
            <span>
              Luyện phát âm theo thứ tự: <strong>Thanh mẫu</strong> → <strong>Vận mẫu</strong> → <strong>Thanh điệu</strong>.
            </span>
          </div>
          <button type="button" className="pill-btn primary" onClick={onClose}>
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  )
}
