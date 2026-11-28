import { useState, useMemo, useEffect } from 'react'
import { X, Volume2, Mic } from 'lucide-react'
import { parsePinyin, getFinalSampleSyllable } from '../utils/pinyinData'
import { SoundGuide, guideTraits } from './SoundGuide'
import { INITIAL_GUIDE, finalGuide } from './soundGuide'
import { ToneContourDiagram } from './ToneContourDiagram'
import { speakChinese, prefetchChinese } from '../utils/speech'
import { TonePinyin } from './TonePinyin'
import { useModalDialog } from '../utils/useModalA11y'

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

  // Esc, Tab trap, scroll lock and focus return (to the chart cell that opened it) come from the shared hook.
  const { ref: dialogRef, titleId, dialogProps } = useModalDialog<HTMLDivElement>(onClose)

  const handleSpeak = (text: string) => {
    speakChinese(text)
  }

  const { initial, final, phoneticFinal, initialInfo, finalInfo, toneVariants } = parsed

  const iGuide = initial ? INITIAL_GUIDE[initial] : undefined
  const fGuide = finalGuide(initial, phoneticFinal)
  const isApicalI = fGuide?.symbol === '-i'
  // The bare "-i" only exists after its consonant, so play the whole syllable for it.
  const finalSample = isApicalI ? (toneVariants[(parsed.tone || 1) - 1]?.pinyin ?? pinyin) : getFinalSampleSyllable(phoneticFinal, parsed.tone || 1)

  // Warm the audio cache for everything this modal can play, so the first tap sounds immediately.
  useEffect(() => {
    const pairs = [...(iGuide?.pairs ?? []), ...(fGuide?.pairs ?? [])].flatMap((p) => p.items.map((i) => i.py))
    prefetchChinese(pinyin, finalSample, ...toneVariants.map((v) => v.pinyin), ...pairs)
  }, [pinyin, finalSample, toneVariants, iGuide, fGuide])

  const tabs = [
    { id: 'initial' as const, label: `Thanh mẫu${initial ? ` ${initial}` : ''}` },
    { id: 'final' as const, label: `Vận mẫu ${fGuide?.symbol ?? phoneticFinal}` },
    { id: 'tone' as const, label: 'Thanh điệu' },
  ]
  const isSymbol = hanzi === '拼' || hanzi === '音'

  return (
    <div className="pm-backdrop" onClick={onClose} onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
      <div ref={dialogRef} {...dialogProps} className="pm-dialog pm-lg pn-dialog" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
        <div className="pm-header rf-pn-header">
          <span id={titleId} style={{ display: 'contents' }}>
            <span className="sr-only">Phát âm </span>
            <span className="rf-pn-han" lang="zh-Hans">{isSymbol ? '拼' : hanzi}</span>
            <TonePinyin pinyin={pinyin} className="rf-pn-py" />
          </span>
          <button type="button" className="pm-icon-btn" onClick={() => handleSpeak(isSymbol ? pinyin : hanzi || pinyin)} title="Nghe phát âm" aria-label="Phát âm">
            <Volume2 size={16} />
          </button>
          <span className="rf-pn-sub">
            {hanViet && <strong>{hanViet.toUpperCase()}</strong>}
            {meaningVi && <span>{meaningVi}</span>}
          </span>
          <div className="pm-header-actions">
            <button type="button" className="pm-icon-btn pm-close" onClick={onClose} aria-label="Đóng" title="Đóng (Esc)">
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          className="pm-tabs"
          role="tablist"
          aria-label="Phần phát âm"
          onKeyDown={(e) => {
            // Roving tabindex: inactive tabs are tabindex -1, so arrows are the only way to reach them.
            const i = tabs.findIndex((t) => t.id === activeTab)
            const n = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1
            if (n < 0) return
            e.preventDefault()
            const list = e.currentTarget
            setActiveTab(tabs[n].id)
            requestAnimationFrame(() => list.querySelectorAll<HTMLElement>('[role="tab"]')[n]?.focus())
          }}
        >
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={activeTab === t.id} tabIndex={activeTab === t.id ? 0 : -1} className={`pm-tab${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="pm-body rf-body" role="tabpanel">
          {activeTab === 'initial' &&
            (initialInfo && iGuide ? (
              <>
                <div className="rf-phoneme">
                  <span className="rf-phoneme-sym">{iGuide.symbol}</span>
                  <div className="rf-phoneme-titles">
                    <h3>{iGuide.title}</h3>
                    <p>{guideTraits(iGuide, 'initial').join(' · ')}</p>
                  </div>
                  <button type="button" className="pm-btn" onClick={() => handleSpeak(initial)} title="Nghe mẫu phụ âm này">
                    <Volume2 size={15} />
                    Nghe mẫu
                  </button>
                </div>
                <SoundGuide key={`i-${initial}`} entry={iGuide} technical={`${initialInfo.groupNameVi}, ${initialInfo.soundType.toLowerCase()}. ${initialInfo.guideVi}`} />
              </>
            ) : (
              <div className="rf-notice">
                <h3>Âm tiết này không có phụ âm đầu</h3>
                <p>
                  Âm tiết bắt đầu trực tiếp bằng nguyên âm <strong>{final}</strong>. Chuyển sang tab Vận mẫu để xem hướng dẫn phát âm chi tiết.
                </p>
                <button type="button" className="pm-btn" onClick={() => setActiveTab('final')}>
                  Xem vận mẫu {final}
                </button>
              </div>
            ))}

          {activeTab === 'final' &&
            (fGuide ? (
              <>
                <div className="rf-phoneme">
                  <span className="rf-phoneme-sym">{fGuide.symbol}</span>
                  <div className="rf-phoneme-titles">
                    <h3>{fGuide.title}</h3>
                    <p>{[isApicalI ? 'Vần đặc biệt' : finalInfo?.groupNameVi, ...guideTraits(fGuide, 'final')].filter(Boolean).join(' · ')}</p>
                  </div>
                  <button type="button" className="pm-btn" onClick={() => handleSpeak(finalSample)} title="Nghe mẫu vần này">
                    <Volume2 size={15} />
                    Nghe vần
                  </button>
                </div>
                <SoundGuide key={`f-${fGuide.title}`} entry={fGuide} technical={isApicalI ? undefined : finalInfo?.guideVi} />
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
