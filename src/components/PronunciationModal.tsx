import { useState, useMemo, useEffect } from 'react'
import { X, Volume2, Mic } from 'lucide-react'
import { parsePinyin, getFinalSampleSyllable } from '../utils/pinyinData'
import { MouthShapeDiagram } from './MouthShapeDiagram'
import { ToneContourDiagram } from './ToneContourDiagram'
import { speakChinese } from '../utils/speech'
import { TonePinyin } from './TonePinyin'
import { MOUTH_LABEL } from './pinyinExamples'

interface PronunciationModalProps {
  hanzi: string
  pinyin: string
  hanViet?: string | null
  meaningVi?: string | null
  onClose: () => void
  /** Opens the tone trainer for this syllable. */
  onPractice?: () => void
}

export function PronunciationModal({
  hanzi,
  pinyin,
  hanViet,
  meaningVi,
  onClose,
  onPractice,
}: PronunciationModalProps) {
  const [activeTab, setActiveTab] = useState<'initial' | 'final' | 'tone'>('initial')

  const parsed = useMemo(() => parsePinyin(pinyin), [pinyin])
  const [selectedTone, setSelectedTone] = useState<1 | 2 | 3 | 4 | 0>(parsed.tone)

  useEffect(() => {
    setSelectedTone(parsed.tone)
  }, [parsed])

  // ESC to close
  // Return focus to whatever opened the modal.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    return () => opener?.focus?.()
  }, [])

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

  const { initial, final, phoneticFinal, initialInfo, finalInfo, toneVariants } = parsed

  const tabs = [
    { id: 'initial' as const, label: `Thanh mẫu${initial ? ` ${initial}` : ''}` },
    { id: 'final' as const, label: `Vận mẫu ${phoneticFinal}` },
    { id: 'tone' as const, label: 'Thanh điệu' },
  ]
  const isSymbol = hanzi === '拼' || hanzi === '音'

  return (
    <div className="pm-backdrop" onClick={onClose} onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Phát âm ${pinyin}`}>
      <div className="pm-dialog pn-dialog rf-dialog rf-dialog-narrow" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
        <div className="pm-header rf-pn-header">
          <span className="rf-pn-han" lang="zh-Hans">{isSymbol ? '拼' : hanzi}</span>
          <TonePinyin pinyin={pinyin} className="rf-pn-py" />
          <button type="button" className="pm-icon-btn" onClick={() => handleSpeak(isSymbol ? pinyin : hanzi)} title="Nghe phát âm" aria-label="Phát âm">
            <Volume2 size={16} />
          </button>
          <span className="rf-pn-sub">
            {hanViet && <strong>{hanViet.toUpperCase()}</strong>}
            {meaningVi && <span>{meaningVi}</span>}
          </span>
          <div className="pm-header-actions">
            <button type="button" className="pm-icon-btn" onClick={onClose} aria-label="Đóng" title="Đóng (Esc)">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="rf-tabs" role="tablist" aria-label="Phần phát âm">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={activeTab === t.id} tabIndex={activeTab === t.id ? 0 : -1} className={`rf-tab${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="rf-body" role="tabpanel">
          {activeTab === 'initial' &&
            (initialInfo ? (
              <>
                <div className="rf-phoneme">
                  <span className="rf-phoneme-sym">{initial}</span>
                  <div className="rf-phoneme-titles">
                    <h3>{initialInfo.name}</h3>
                    <p>
                      {initialInfo.groupNameVi} · {initialInfo.soundType}
                    </p>
                  </div>
                  {initialInfo.isAspirated && <span className="rf-tag">Bật hơi mạnh</span>}
                  <button type="button" className="rf-btn" onClick={() => handleSpeak(initial)} title="Nghe mẫu phụ âm này">
                    <Volume2 size={15} />
                    Nghe mẫu
                  </button>
                </div>
                <MouthShapeDiagram initialInfo={initialInfo} />
              </>
            ) : (
              <div className="rf-notice">
                <h3>Âm tiết này không có phụ âm đầu</h3>
                <p>
                  Âm tiết bắt đầu trực tiếp bằng nguyên âm <strong>{final}</strong>. Chuyển sang tab Vận mẫu để xem hướng dẫn phát âm chi tiết.
                </p>
                <button type="button" className="rf-btn" onClick={() => setActiveTab('final')}>
                  Xem vận mẫu {final}
                </button>
              </div>
            ))}

          {activeTab === 'final' &&
            (finalInfo ? (
              <>
                <div className="rf-phoneme">
                  <span className="rf-phoneme-sym">{phoneticFinal}</span>
                  <div className="rf-phoneme-titles">
                    <h3>{finalInfo.name}</h3>
                    <p>
                      {finalInfo.groupNameVi} · Khẩu hình {(MOUTH_LABEL[finalInfo.mouthShape] ?? '').toLowerCase()}
                    </p>
                  </div>
                  <button type="button" className="rf-btn" onClick={() => handleSpeak(getFinalSampleSyllable(phoneticFinal, parsed.tone || 1))} title="Nghe mẫu vần này">
                    <Volume2 size={15} />
                    Nghe vần
                  </button>
                </div>
                <MouthShapeDiagram finalInfo={finalInfo} />
              </>
            ) : (
              <div className="rf-notice">
                <p>
                  Vận mẫu <strong>{phoneticFinal}</strong> hiện đang dùng hướng dẫn tổng quát.
                </p>
              </div>
            ))}

          {activeTab === 'tone' && <ToneContourDiagram activeTone={selectedTone} toneVariants={toneVariants} onSelectTone={(t) => setSelectedTone(t)} />}
          {activeTab === 'tone' && onPractice && (
            <button type="button" className="pm-btn" style={{ marginTop: 'var(--space-3)' }} onClick={onPractice}>
              <Mic size={14} aria-hidden="true" /> Nói thử thanh điệu
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
