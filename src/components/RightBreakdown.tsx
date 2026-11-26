import { useEffect, useRef } from 'react'
import { Volume2, ArrowRight } from 'lucide-react'
import HanziWriter from 'hanzi-writer'
import type { BundleCharacter, CharacterDetail } from '../core'
import { partPinyin } from '../core'
import { speakChinese } from '../utils/speech'

function LegoResultHanzi({ hanzi, isComponents }: { hanzi: string; isComponents: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    if (!isComponents) {
      containerRef.current.innerHTML = `<span class="lego-glyph main-result font-sans-sc" lang="zh">${hanzi}</span>`
      return
    }

    const isDark = document.documentElement.classList.contains('dark')
    let isSubscribed = true

    HanziWriter.create(containerRef.current, hanzi, {
      width: 30,
      height: 30,
      padding: 1,
      showOutline: false,
      strokeColor: isDark ? '#f87171' : '#dc2626',
      radicalColor: isDark ? '#38bdf8' : '#0284c7',
      showCharacter: true,
      onLoadCharDataError: () => {
        if (isSubscribed && containerRef.current) {
          containerRef.current.innerHTML = `<span class="lego-glyph main-result font-sans-sc">${hanzi}</span>`
        }
      },
    })

    return () => {
      isSubscribed = false
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [hanzi, isComponents])

  return (
    <div
      ref={containerRef}
      className="lego-result-writer-box"
      style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    />
  )
}

interface RightBreakdownProps {
  detail: CharacterDetail | null
  isLoading: boolean
  onSelectHanzi: (hanzi: string) => void
  displayMode?: 'modern' | 'components'
  characters?: readonly BundleCharacter[]
}

export function RightBreakdown({
  detail,
  isLoading,
  onSelectHanzi,
  displayMode = 'modern',
  characters,
}: RightBreakdownProps) {
  const pinyinOf = (part: string) => partPinyin(part, characters)
  const isComponents = displayMode === 'components'

  const isPartRadical = (partStr: string, label?: string | null, hanViet?: string | null) => {
    const rad = detail?.radical
    if (!rad) return false
    if (partStr === rad.part) return true
    if (rad.label && label && rad.label === label) return true
    if (rad.hanViet && hanViet && rad.hanViet.toLowerCase() === hanViet.toLowerCase()) return true
    return false
  }

  if (isLoading) {
    return (
      <aside className="studio-sidebar-right">
        <div className="right-panel-scroll">
          <div className="breakdown-panel-header">
            <h2 className="breakdown-title">Chiết Tự & Hán Việt</h2>
          </div>
          <div className="breakdown-loading">
            <div className="spinner-ring-mini" />
            <span>Đang tải thông tin…</span>
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
  const isEtymology = character.chietTuType === 'etymology'
  const hasAnySection = Boolean(radical || parts.length > 0 || character.chietTu || words.length > 0)

  return (
    <aside className="studio-sidebar-right">
      <div className="right-panel-scroll">
        {/* Panel Header */}
        <div className="breakdown-panel-header">
          <h2 className="breakdown-title">Chiết Tự & Hán Việt</h2>
          <span className="panel-subtitle">Chạm vào bộ thủ hoặc thành phần để tra sâu hơn</span>
        </div>

        {!hasAnySection ? (
          <p className="bd-empty">Chưa có dữ liệu chiết tự cho chữ này.</p>
        ) : (
          <div className="mobile-unified-breakdown">
            {/* 1. BỘ THỦ */}
            {radical && (
              <section className="mobile-bd-section">
                <div className="mobile-bd-section-header">
                  <span className={`mobile-bd-badge ${isComponents ? 'badge-radical' : 'badge-modern'}`}>
                    BỘ THỦ
                  </span>
                </div>
                <div className="breakdown-card radical-highlight-card">
                  <div className="radical-content-row">
                    <button
                      type="button"
                      className={`radical-box-glyph ${isComponents ? 'font-calligraphy mode-components' : 'font-sans-sc mode-modern'}`}
                      lang="zh"
                      onClick={() => onSelectHanzi(radical.part)}
                      title={`Bấm để tra bộ thủ "${radical.part}"`}
                    >
                      {radical.part}
                    </button>
                    <div className="radical-meta-group">
                      <div className="radical-name-title font-sans-sc">
                        {radical.label ?? `Bộ ${radical.hanViet ?? radical.part}`}
                      </div>
                      <div className="radical-sino-badge">
                        Âm Hán Việt: <strong>{radical.hanViet?.toUpperCase() ?? '—'}</strong>
                        {pinyinOf(radical.part) && (
                          <span className="radical-pinyin"> · Pinyin: <strong>{pinyinOf(radical.part)}</strong></span>
                        )}
                      </div>
                      <div className="radical-meaning-text">
                        Ý nghĩa biểu trưng: {radical.meaningVi ?? 'Thành phần chỉ ý chính của chữ'}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 2. CẤU TẠO CHIẾT TỰ */}
            {parts.length > 0 && (
              <section className="mobile-bd-section">
                <div className="mobile-bd-section-header">
                  <span className={`mobile-bd-badge ${isComponents ? 'badge-decomposition' : 'badge-modern'}`}>
                    CẤU TẠO CHIẾT TỰ ({parts.length})
                  </span>
                </div>
                <div className="breakdown-card decomposition-card">
                  <div className="lego-formula-container">
                    {parts.map((p, idx) => {
                      const isRad = isPartRadical(p.part, p.label, p.hanViet)
                      return (
                        <div key={idx} className="lego-step-group">
                          <button
                            type="button"
                            className={`lego-part-chip ${
                              isComponents
                                ? isRad
                                  ? 'part-radical'
                                  : 'part-stroke'
                                : 'mode-modern'
                            }`}
                            onClick={() => onSelectHanzi(p.part)}
                            title={`Bấm để tra cứu "${p.part}"`}
                          >
                            <span
                              className={`lego-glyph ${isComponents ? 'font-calligraphy' : 'font-sans-sc'} ${
                                isComponents
                                  ? isRad
                                    ? 'color-radical'
                                    : 'color-stroke'
                                  : 'color-modern'
                              }`}
                              lang="zh"
                            >
                              {p.part}
                            </span>
                            <div className="lego-info">
                              <span className="lego-hv">
                                {p.hanViet ? p.hanViet.toUpperCase() : '—'}
                                {pinyinOf(p.part) && <span className="lego-py">{pinyinOf(p.part)}</span>}
                              </span>
                              <span className="lego-mean">{p.meaningVi ?? p.label ?? 'thành phần'}</span>
                            </div>
                          </button>
                          {idx < parts.length - 1 && <span className="lego-plus-symbol">+</span>}
                        </div>
                      )
                    })}
                    {/* Keep arrow and result chip grouped so arrow never sits orphaned at line end */}
                    <div className="lego-result-group">
                      <ArrowRight size={15} className={`lego-arrow-symbol ${isComponents ? 'color-accent' : 'color-neutral'}`} />
                      <div
                        className="lego-result-chip"
                        title={`Chữ "${character.hanzi}"`}
                      >
                        <LegoResultHanzi hanzi={character.hanzi} isComponents={isComponents} />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 3. NGUỒN GỐC & CHIẾT TỰ */}
            {character.chietTu && (
              <section className="mobile-bd-section">
                <div className="mobile-bd-section-header">
                  <span className="mobile-bd-badge">
                    {isEtymology ? 'NGUỒN GỐC CHỮ HÁN' : 'MẸO NHỚ & CHIẾT TỰ'}
                  </span>
                  <span className={`tag-type-badge ${isEtymology ? 'etymology' : 'mnemonic'}`}>
                    {isEtymology ? 'Văn tự học' : 'Chiết tự mẹo'}
                  </span>
                </div>
                <div className="breakdown-card mnemonic-card">
                  <p className="mnemonic-narrative-text">{character.chietTu}</p>
                </div>
              </section>
            )}

            {/* 4. TỪ GHÉP THƯỜNG GẶP */}
            {words.length > 0 && (
              <section className="mobile-bd-section">
                <div className="mobile-bd-section-header">
                  <span className="mobile-bd-badge">TỪ GHÉP THƯỜNG GẶP ({words.length})</span>
                </div>
                <div className="bd-words-pane">
                  <div className="mobile-words-flow">
                    {words.map((w) => {
                      const wordChars = Array.from(w.word)
                      const otherChars = wordChars.filter((ch) => ch !== character.hanzi)
                      return (
                        <div key={w.id} className="compound-word-row" title={w.meaningVi}>
                          <div className="word-glyph-line">
                            <span
                              className="word-chinese-text font-sans-sc"
                              lang="zh"
                              onClick={() => speakChinese(w.word)}
                              title="Nghe phát âm từ"
                            >
                              {w.word}
                            </span>
                            <button
                              type="button"
                              className="word-audio-btn"
                              onClick={() => speakChinese(w.word)}
                              title="Phát âm tiếng Trung"
                              aria-label={`Phát âm ${w.word}`}
                            >
                              <Volume2 size={14} />
                            </button>
                            <span className="word-pinyin-label">{w.pinyin}</span>
                            <span className="word-seal-hv">
                              {w.hanViet ? w.hanViet.toUpperCase() : '—'}
                            </span>
                          </div>
                          <div className="word-bottom-line">
                            <span className="word-meaning-line">{w.meaningVi}</span>
                            {otherChars.length > 0 && (
                              <span className="word-char-links">
                                {otherChars.map((ch, idx) => (
                                  <button
                                    key={`${ch}-${idx}`}
                                    type="button"
                                    className="word-char-link-chip"
                                    lang="zh"
                                    onClick={() => onSelectHanzi(ch)}
                                    title={`Tra chữ ${ch}`}
                                  >
                                    {ch}
                                  </button>
                                ))}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
