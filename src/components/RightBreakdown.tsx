import { useState, useEffect } from 'react'
import { Volume2, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import type { CharacterDetail } from '../core'
import { speakChinese } from '../utils/speech'
import { useFitCount } from '../utils/useFitCount'

type BreakdownTab = 'radical' | 'parts' | 'origin' | 'words'
const WORD_ROW_H = 62
const WORD_GAP = 8

interface RightBreakdownProps {
  detail: CharacterDetail | null
  isLoading: boolean
  onSelectHanzi: (hanzi: string) => void
}

export function RightBreakdown({ detail, isLoading, onSelectHanzi }: RightBreakdownProps) {
  // Last chosen tab persists across characters (component stays mounted)
  const [tab, setTab] = useState<BreakdownTab>('radical')
  const [wordPage, setWordPage] = useState(0)
  const [wordsRef, wordFit] = useFitCount<HTMLDivElement>(1, WORD_ROW_H, WORD_GAP)
  const hanzi = detail?.character.hanzi
  useEffect(() => setWordPage(0), [hanzi])

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
        <div className="breakdown-panel-header">
          <h2 className="breakdown-title">Chiết Tự & Hán Việt</h2>
          <span className="panel-subtitle">Giải phẫu cấu trúc & nguồn gốc</span>
        </div>

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
      </div>
    </aside>
  )
}
