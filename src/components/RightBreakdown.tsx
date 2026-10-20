import { useState, useEffect, useRef } from 'react'
import { Volume2, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import HanziWriter from 'hanzi-writer'
import type { CharacterDetail } from '../core'
import { speakChinese } from '../utils/speech'
import { useFitCount } from '../utils/useFitCount'

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

type BreakdownTab = 'radical' | 'parts' | 'origin' | 'words'
const WORD_ROW_H = 62
const WORD_GAP = 8

interface RightBreakdownProps {
  detail: CharacterDetail | null
  isLoading: boolean
  onSelectHanzi: (hanzi: string) => void
  displayMode?: 'modern' | 'components'
}

export function RightBreakdown({
  detail,
  isLoading,
  onSelectHanzi,
  displayMode = 'modern',
}: RightBreakdownProps) {
  const isComponents = displayMode === 'components'
  // Last chosen tab persists across characters (component stays mounted)
  const [tab, setTab] = useState<BreakdownTab>('radical')
  const [wordPage, setWordPage] = useState(0)
  const [wordsRef, wordFit] = useFitCount<HTMLDivElement>(1, WORD_ROW_H, WORD_GAP)
  const hanzi = detail?.character.hanzi
  useEffect(() => setWordPage(0), [hanzi])

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 1024 : false,
  )

  const isPartRadical = (partStr: string, label?: string | null, hanViet?: string | null) => {
    const rad = detail?.radical
    if (!rad) return false
    if (partStr === rad.part) return true
    if (rad.label && label && rad.label === label) return true
    if (rad.hanViet && hanViet && rad.hanViet.toLowerCase() === hanViet.toLowerCase()) return true
    return false
  }

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

  const handleSpeak = (text: string) => {
    speakChinese(text)
  }

  const perPage = Math.max(1, wordFit.rows)
  const wordPages = Math.max(1, Math.ceil(words.length / perPage))
  const safeWordPage = Math.min(wordPage, wordPages - 1)
  const pageWords = words.slice(safeWordPage * perPage, safeWordPage * perPage + perPage)
  const isEtymology = character.chietTuType === 'etymology'

  const tabs: { id: BreakdownTab; label: string; count?: number }[] = [
    { id: 'radical', label: 'Bộ thủ' },
    { id: 'parts', label: 'Cấu tạo' },
    { id: 'origin', label: 'Nguồn gốc' },
    { id: 'words', label: 'Từ ghép', count: words.length },
  ]

  return (
    <aside className="studio-sidebar-right">
      <div className="right-panel-scroll">
        {/* Panel Header */}
        {/* Panel Header */}
        <div className="breakdown-panel-header">
          <h2 className="breakdown-title">Chiết Tự & Hán Việt</h2>
        </div>

        {isMobile ? (
          /* Mobile: Clean, focused knowledge sections (only show when content exists) */
          <div className="mobile-unified-breakdown">
            {/* 1. BỘ THỦ */}
            {radical && (
              <section className="mobile-bd-section">
                <div className="mobile-bd-section-header">
                  <span className={`mobile-bd-badge ${isComponents ? 'badge-radical' : 'badge-modern'}`}>BỘ THỦ</span>
                </div>
                <div className="breakdown-card radical-highlight-card">
                  <div className="radical-content-row">
                    <div
                      className={`radical-box-glyph ${isComponents ? 'font-calligraphy mode-components' : 'font-sans-sc mode-modern'}`}
                      lang="zh"
                      onClick={() => onSelectHanzi(radical.part)}
                      title={`Bấm để tra bộ thủ "${radical.part}"`}
                    >
                      {radical.part}
                    </div>
                    <div className="radical-meta-group">
                      <div className="radical-name-title font-sans-sc">
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
                </div>
              </section>
            )}

            {/* 2. CẤU TẠO CHIẾT TỰ (Chỉ hiện khi có thành phần tách ghép) */}
            {parts.length > 0 && (
              <section className="mobile-bd-section">
                <div className="mobile-bd-section-header">
                  <span className={`mobile-bd-badge ${isComponents ? 'badge-decomposition' : 'badge-modern'}`}>CẤU TẠO CHIẾT TỰ</span>
                </div>
                <div className="breakdown-card decomposition-card">
                  <div className="lego-formula-container">
                    {parts.map((p, idx) => {
                      const isRad = isPartRadical(p.part, p.label, p.hanViet)
                      return (
                        <div key={idx} className="lego-step-group">
                          <div
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
                              <span className="lego-hv">{p.hanViet ? p.hanViet.toUpperCase() : '—'}</span>
                              <span className="lego-mean">{p.meaningVi ?? p.label ?? 'thành phần'}</span>
                            </div>
                          </div>
                          {idx < parts.length - 1 && <span className="lego-plus-symbol">+</span>}
                        </div>
                      )
                    })}
                    <ArrowRight size={15} className={`lego-arrow-symbol ${isComponents ? 'color-accent' : 'color-neutral'}`} />
                    <div
                      className="lego-result-chip"
                      onClick={() => onSelectHanzi(character.hanzi)}
                      title={`Chữ "${character.hanzi}"`}
                    >
                      <LegoResultHanzi hanzi={character.hanzi} isComponents={isComponents} />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 3. NGUỒN GỐC & CHIẾT TỰ (Chỉ hiện khi có dữ liệu) */}
            {character.chietTu && (
              <section className="mobile-bd-section">
                <div className="mobile-bd-section-header">
                  <span className="mobile-bd-badge">NGUỒN GỐC & CHIẾT TỰ</span>
                </div>
                <div className="breakdown-card mnemonic-card">
                  <p className="mnemonic-narrative-text">{character.chietTu}</p>
                </div>
              </section>
            )}

            {/* 4. TỪ GHÉP THƯỜNG GẶP (Chỉ hiện khi có từ ghép) */}
            {words.length > 0 && (
              <section className="mobile-bd-section">
                <div className="mobile-bd-section-header">
                  <span className="mobile-bd-badge">TỪ GHÉP THƯỜNG GẶP</span>
                </div>
                <div className="bd-words-pane">
                  <div className="mobile-words-flow">
                    {words.map((w) => (
                      <div key={w.id} className="compound-word-row" title={w.meaningVi}>
                        <div className="word-glyph-line">
                          <span
                            className="word-chinese-text font-sans-sc"
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
                          <span className="word-seal-hv">
                            {w.hanViet ? w.hanViet.toUpperCase() : '—'}
                          </span>
                        </div>
                        <div className="word-meaning-line">{w.meaningVi}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>

        ) : (
          /* Desktop keeps tabbed breakdown unchanged */
          <>
            <div className="bd-tabbar" role="tablist">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={`bd-tab ${tab === t.id ? 'active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                  {t.count !== undefined && <span className="bd-tab-count">{t.count}</span>}
                </button>
              ))}
            </div>

            <div className="bd-tab-body" role="tabpanel">
              {tab === 'radical' &&
                (radical ? (
                  <section className="breakdown-card radical-highlight-card">
                    <div className="radical-content-row">
                      <div
                        className={`radical-box-glyph ${isComponents ? 'font-calligraphy mode-components' : 'font-sans-sc mode-modern'}`}
                        lang="zh"
                        onClick={() => onSelectHanzi(radical.part)}
                        title={`Bấm để tra bộ thủ "${radical.part}"`}
                      >
                        {radical.part}
                      </div>
                      <div className="radical-meta-group">
                        <div className="radical-name-title font-sans-sc">
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
                ) : (
                  <p className="bd-empty">Chưa có dữ liệu bộ thủ cho chữ này.</p>
                ))}

              {tab === 'parts' &&
                (parts.length > 0 ? (
                  <section className="breakdown-card decomposition-card">
                    <div className="card-micro-label">
                      <span>CẤU THÀNH CHIẾT TỰ ({parts.length} THÀNH PHẦN)</span>
                    </div>
                    <div className="lego-formula-container">
                      {parts.map((p, idx) => {
                        const isRad = isPartRadical(p.part, p.label, p.hanViet)
                        return (
                          <div key={idx} className="lego-step-group">
                            <div
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
                                <span className="lego-hv">{p.hanViet ? p.hanViet.toUpperCase() : '—'}</span>
                                <span className="lego-mean">{p.meaningVi ?? p.label ?? 'thành phần'}</span>
                              </div>
                            </div>
                            {idx < parts.length - 1 && <span className="lego-plus-symbol">+</span>}
                          </div>
                        )
                      })}
                      <ArrowRight size={15} className={`lego-arrow-symbol ${isComponents ? 'color-accent' : 'color-neutral'}`} />
                      <div
                        className="lego-result-chip"
                        onClick={() => onSelectHanzi(character.hanzi)}
                        title={`Chữ "${character.hanzi}"`}
                      >
                        <LegoResultHanzi hanzi={character.hanzi} isComponents={isComponents} />
                      </div>
                    </div>
                  </section>
                ) : (
                  <p className="bd-empty">Chữ này không tách thêm thành phần.</p>
                ))}

              {tab === 'origin' &&
                (character.chietTu ? (
                  <section className="breakdown-card mnemonic-card">
                    <div className="card-micro-label">
                      <span>{isEtymology ? 'NGUỒN GỐC CHỮ HÁN' : 'MẸO NHỚ DÂN GIAN'}</span>
                      <span className={`tag-type-badge ${isEtymology ? 'etymology' : 'mnemonic'}`}>
                        {isEtymology ? 'Văn tự học' : 'Chiết tự mẹo'}
                      </span>
                    </div>
                    <p className="mnemonic-narrative-text">{character.chietTu}</p>
                  </section>
                ) : (
                  <p className="bd-empty">Chưa có chiết tự cho chữ này.</p>
                ))}

              {tab === 'words' &&
                (words.length > 0 ? (
                  <section className="bd-words-pane">
                    <p className="compound-helper-tip">
                      Người Việt hiểu nghĩa ngay bằng cách đọc âm Hán Việt:
                    </p>
                    <div className="bd-words-fit" ref={wordsRef}>
                      {pageWords.map((w) => (
                        <div key={w.id} className="compound-word-row" title={w.meaningVi}>
                          <div className="word-glyph-line">
                            <span
                              className="word-chinese-text font-sans-sc"
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
                            <span className="word-seal-hv">
                              {w.hanViet ? w.hanViet.toUpperCase() : '—'}
                            </span>
                          </div>
                          <div className="word-meaning-line">{w.meaningVi}</div>
                        </div>
                      ))}
                    </div>
                    {wordPages > 1 && (
                      <div className="sidebar-pager">
                        <button
                          type="button"
                          className="pager-btn"
                          onClick={() => setWordPage(Math.max(0, safeWordPage - 1))}
                          disabled={safeWordPage === 0}
                          aria-label="Trang trước"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="pager-label">
                          {safeWordPage + 1} / {wordPages}
                        </span>
                        <button
                          type="button"
                          className="pager-btn"
                          onClick={() => setWordPage(Math.min(wordPages - 1, safeWordPage + 1))}
                          disabled={safeWordPage >= wordPages - 1}
                          aria-label="Trang sau"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </section>
                ) : (
                  <p className="bd-empty">Chưa có từ ghép cho chữ này.</p>
                ))}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
