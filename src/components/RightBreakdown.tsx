import { useState, useEffect, useRef } from 'react'
import { Volume2 } from 'lucide-react'
import HanziWriter from 'hanzi-writer'
import type { BundleCharacter, CharacterDetail, PartInfo, PartKind } from '../core'
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

const KIND_LABEL: Record<PartKind, string> = { radical: 'Bộ thủ', character: 'Chữ', component: 'Thành phần' }
const WORDS_PREVIEW = 12

interface RightBreakdownProps {
  detail: CharacterDetail | null
  isLoading: boolean
  onSelectHanzi: (hanzi: string) => void
  displayMode?: 'modern' | 'components'
  // Fallback pinyin lookup for parts the API sent without one (offline sample).
  characters?: readonly BundleCharacter[]
}

function PartRow({ part, pinyin, isComponents, onSelect }: {
  part: PartInfo
  pinyin: string | null
  isComponents: boolean
  onSelect: (hanzi: string) => void
}) {
  return (
    <button
      type="button"
      className={`part-row kind-${part.kind}`}
      onClick={() => onSelect(part.part)}
      title={`Bấm để tra "${part.part}"`}
    >
      <span className={`part-glyph ${isComponents ? 'font-calligraphy' : 'font-sans-sc'}`} lang="zh">
        {part.part}
      </span>
      <span className="part-info">
        <span className="part-head">
          <span className="part-hv">{part.hanViet ? part.hanViet.toUpperCase() : '—'}</span>
          {pinyin && <span className="part-py">{pinyin}</span>}
          <span className={`part-kind-tag kind-${part.kind}`}>{part.label ?? KIND_LABEL[part.kind]}</span>
        </span>
        <span className="part-mean">{part.meaningVi ?? '—'}</span>
      </span>
    </button>
  )
}

function SectionHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="bd-section-header">
      <h3 className="bd-section-title">{title}</h3>
      {badge && <span className="bd-section-sub">{badge}</span>}
    </div>
  )
}

export function RightBreakdown({
  detail,
  isLoading,
  onSelectHanzi,
  displayMode = 'modern',
  characters,
}: RightBreakdownProps) {
  const isComponents = displayMode === 'components'
  const [showAllWords, setShowAllWords] = useState(false)
  const hanzi = detail?.character.hanzi
  useEffect(() => setShowAllWords(false), [hanzi])

  const shell = (content: React.ReactNode) => (
    <aside className="studio-sidebar-right">
      <div className="right-panel-scroll">
        <div className="breakdown-panel-header">
          <h2 className="breakdown-title">Chiết Tự & Hán Việt</h2>
        </div>
        {content}
      </div>
    </aside>
  )

  if (isLoading) {
    return shell(
      <div className="breakdown-loading">
        <div className="spinner-ring-mini" />
        <span>Đang tải thông tin…</span>
      </div>,
    )
  }

  if (!detail) {
    return shell(
      <div className="breakdown-empty-placeholder">
        <div className="placeholder-watermark" aria-hidden="true">字</div>
        <p className="placeholder-title">Chưa chọn chữ Hán</p>
        <p className="placeholder-desc">
          Chọn một chữ từ danh mục bên trái hoặc đổi bộ lọc cấp độ để xem chiết tự và cầu nối Hán Việt.
        </p>
      </div>,
    )
  }

  const { character, radical, parts = [], words = [] } = detail
  const pinyinOf = (p: PartInfo) => p.pinyin ?? partPinyin(p.part, characters)
  // An undecomposed character still shows which radical it is filed under.
  const shownParts = parts.length > 0 ? parts : radical && radical.part !== character.hanzi ? [radical] : []
  const shownWords = showAllWords ? words : words.slice(0, WORDS_PREVIEW)
  const kinds = new Set(shownParts.map((p) => p.kind))

  return shell(
    <div className="bd-unified">
      <section className="bd-section">
        <SectionHeader
          title="Cấu tạo"
          badge={parts.length > 0 ? `${parts.length} thành phần` : 'chữ độc thể'}
        />
        <div className="breakdown-card decomposition-card">
          {parts.length === 0 && (
            <p className="bd-note">
              Chữ này là một khối, không tách nhỏ hơn
              {shownParts.length > 0 ? '; xếp vào bộ:' : '.'}
            </p>
          )}
          <div className="part-stack">
            {shownParts.map((p, idx) => (
              <div key={idx} className="part-step">
                {idx > 0 && <span className="part-plus" aria-hidden="true">+</span>}
                <PartRow part={p} pinyin={pinyinOf(p)} isComponents={isComponents} onSelect={onSelectHanzi} />
              </div>
            ))}
            {parts.length > 0 && (
              <div className="part-result-line">
                <span className="part-equals" aria-hidden="true">=</span>
                <div className="lego-result-chip" onClick={() => onSelectHanzi(character.hanzi)} title={`Chữ "${character.hanzi}"`}>
                  <LegoResultHanzi hanzi={character.hanzi} isComponents={isComponents} />
                </div>
              </div>
            )}
          </div>
          {kinds.size > 0 && (
            <div className="part-legend">
              {(['radical', 'character', 'component'] as const).filter((k) => kinds.has(k)).map((k) => (
                <span key={k} className={`part-legend-item kind-${k}`}>{KIND_LABEL[k]}</span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bd-section">
        <SectionHeader title="Nguồn gốc chữ Hán" />
        <div className="breakdown-card origin-card">
          {character.chietTu ? (
            <p className="mnemonic-narrative-text">{character.chietTu}</p>
          ) : (
            <p className="bd-note">Chưa có nguồn gốc cho chữ này.</p>
          )}
        </div>
      </section>

      <section className="bd-section">
        <SectionHeader title="Mẹo nhớ nhanh" />
        <div className="breakdown-card mnemonic-card">
          {character.mnemonicVi ? (
            <p className="mnemonic-narrative-text">{character.mnemonicVi}</p>
          ) : (
            <p className="bd-note">Chưa có mẹo nhớ cho chữ này.</p>
          )}
        </div>
      </section>

      {words.length > 0 && (
        <section className="bd-section">
          <SectionHeader title="Từ ghép" badge={`${words.length} từ`} />
          <div className="bd-words-flow">
            {shownWords.map((w) => (
              <div key={w.id} className="compound-word-row" title={w.meaningVi}>
                <div className="word-glyph-line">
                  <span className="word-chinese-text font-sans-sc" lang="zh" onClick={() => speakChinese(w.word)} title="Nghe phát âm từ">
                    {w.word}
                  </span>
                  <button type="button" className="word-audio-btn" onClick={() => speakChinese(w.word)} title="Phát âm tiếng Trung" aria-label="Phát âm">
                    <Volume2 size={14} />
                  </button>
                  <span className="word-pinyin-label">{w.pinyin}</span>
                  <span className="word-seal-hv">{w.hanViet ? w.hanViet.toUpperCase() : '—'}</span>
                </div>
                <div className="word-meaning-line">{w.meaningVi}</div>
              </div>
            ))}
          </div>
          {words.length > WORDS_PREVIEW && (
            <button type="button" className="bd-more-btn" onClick={() => setShowAllWords((v) => !v)}>
              {showAllWords ? 'Thu gọn' : `Xem thêm ${words.length - WORDS_PREVIEW} từ`}
            </button>
          )}
        </section>
      )}
    </div>,
  )
}
