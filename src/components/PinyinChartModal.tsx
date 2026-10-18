import { useState, useMemo, useEffect } from 'react'
import {
  X,
  Search,
  Volume2,
} from 'lucide-react'
import {
  INITIALS_DATA,
  FINALS_DATA,
  VALID_SYLLABLES,
  generateToneVariants,
} from '../utils/pinyinData'
import { speakChinese } from '../utils/speech'

interface PinyinChartModalProps {
  onClose: () => void
  onInspectPinyin: (pinyin: string) => void
}

const INITIAL_GROUPS = [
  {
    title: 'Âm môi',
    sub: 'Hai môi / Môi - Răng (b, p, m, f)',
    initials: ['b', 'p', 'm', 'f'],
  },
  {
    title: 'Âm đầu lưỡi giữa',
    sub: 'Đầu lưỡi chạm nướu trên rồi bật ra (d, t, n, l)',
    initials: ['d', 't', 'n', 'l'],
  },
  {
    title: 'Âm cuống lưỡi (Gốc lưỡi)',
    sub: 'Gốc lưỡi tiếp xúc nâng lên ngạc mềm (g, k, h)',
    initials: ['g', 'k', 'h'],
  },
  {
    title: 'Âm mặt lưỡi',
    sub: 'Mặt lưỡi áp sát ngạc cứng (j, q, x)',
    initials: ['j', 'q', 'x'],
  },
  {
    title: 'Âm đầu lưỡi trước (Âm răng)',
    sub: 'Đầu lưỡi phẳng chạm mặt sau răng trên (z, c, s)',
    initials: ['z', 'c', 's'],
  },
  {
    title: 'Âm đầu lưỡi sau (Cuộn lưỡi)',
    sub: 'Đầu lưỡi uốn cong lên chạm ngạc cứng (zh, ch, sh, r)',
    initials: ['zh', 'ch', 'sh', 'r'],
  },
  {
    title: 'Bán nguyên âm (Zero Initial)',
    sub: 'Khởi âm thay thế khi không có thanh mẫu (y, w)',
    initials: ['y', 'w'],
  },
]

export function PinyinChartModal({ onClose, onInspectPinyin }: PinyinChartModalProps) {
  const [activeTab, setActiveTab] = useState<'matrix' | 'initials' | 'finals' | 'rules'>('matrix')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedInitialGroup, setSelectedInitialGroup] = useState<string>('all')
  const [selectedSyllable, setSelectedSyllable] = useState<string>('hao')

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

  // Filter syllables
  const validSyllablesList = useMemo(() => Array.from(VALID_SYLLABLES), [])

  const filteredSyllables = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return validSyllablesList.filter((syl) => {
      if (q && !syl.includes(q)) return false

      if (selectedInitialGroup !== 'all') {
        const initData = Object.values(INITIALS_DATA).find((item) => item.group === selectedInitialGroup)
        if (initData) {
          // Check if syllable starts with any initial in this group
          const matches = Object.entries(INITIALS_DATA)
            .filter(([, v]) => v.group === selectedInitialGroup)
            .some(([k]) => syl.startsWith(k))
          if (!matches) return false
        }
      }
      return true
    })
  }, [validSyllablesList, searchQuery, selectedInitialGroup])

  // Tone variants for the currently selected syllable
  const activeSyllableVariants = useMemo(() => {
    return generateToneVariants(selectedSyllable, '')
  }, [selectedSyllable])

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content pinyin-chart-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="pinyin-chart-header">
          <div className="pinyin-chart-title-group">
            <div className="chart-icon-seal">拼</div>
            <div>
              <h2 className="chart-title">Bảng Pinyin Toàn Diện (Hanyu Pinyin Master)</h2>
              <span className="chart-sub">
                Tra cứu ma trận ghép âm, 21 Thanh mẫu, 36 Vận mẫu & Quy tắc biến điệu phát âm
              </span>
            </div>
          </div>

          <div className="pinyin-header-actions">
            <button
              type="button"
              className="icon-btn close-btn"
              onClick={onClose}
              aria-label="Đóng bảng Pinyin"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Text only, clean and uncluttered) */}
        <div className="pinyin-chart-tabbar">
          <button
            type="button"
            className={`chart-tab-btn ${activeTab === 'matrix' ? 'active' : ''}`}
            onClick={() => setActiveTab('matrix')}
          >
            Ma Trận Ghép Âm ({validSyllablesList.length})
          </button>
          <button
            type="button"
            className={`chart-tab-btn ${activeTab === 'initials' ? 'active' : ''}`}
            onClick={() => setActiveTab('initials')}
          >
            21 Thanh Mẫu
          </button>
          <button
            type="button"
            className={`chart-tab-btn ${activeTab === 'finals' ? 'active' : ''}`}
            onClick={() => setActiveTab('finals')}
          >
            36 Vận Mẫu
          </button>
          <button
            type="button"
            className={`chart-tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            Quy Tắc Biến Điệu
          </button>
        </div>

        {/* Modal Content */}
        <div className="pinyin-chart-body">
          {/* TAB 1: MA TRẬN GHÉP ÂM (SYLLABLE MATRIX) */}
          {activeTab === 'matrix' && (
            <div className="matrix-view-container">
              {/* Search & Initial Filter Bar */}
              <div className="matrix-toolbar">
                <div className="matrix-search-box">
                  <Search size={16} className="search-icon-dim" />
                  <input
                    type="text"
                    placeholder="Tìm âm tiết (vd: hao, ni, zhong, xue)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="matrix-search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="matrix-clear-btn"
                      onClick={() => setSearchQuery('')}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="initial-filter-pills">
                  <span className="filter-pill-label">Nhóm âm:</span>
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'bilabial', label: 'Âm môi (b, p, m, f)' },
                    { id: 'alveolar', label: 'Đầu lưỡi (d, t, n, l)' },
                    { id: 'velar', label: 'Gốc lưỡi (g, k, h)' },
                    { id: 'palatal', label: 'Mặt lưỡi (j, q, x)' },
                    { id: 'retroflex', label: 'Cuộn lưỡi (zh, ch, sh, r)' },
                    { id: 'dental', label: 'Răng (z, c, s)' },
                    { id: 'zero', label: 'Khởi âm (y, w)' },
                  ].map((grp) => (
                    <button
                      key={grp.id}
                      type="button"
                      className={`filter-pill-btn ${selectedInitialGroup === grp.id ? 'active' : ''}`}
                      onClick={() => setSelectedInitialGroup(grp.id)}
                    >
                      {grp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inspector Banner for Selected Syllable */}
              {selectedSyllable && (
                <div className="syllable-inspector-banner">
                  <div className="inspector-left">
                    <div className="inspector-hero-syllable">{selectedSyllable}</div>
                    <div className="inspector-meta-info">
                      <span className="inspector-title">Âm tiết đang chọn</span>
                      <span className="inspector-desc">
                        Bấm vào từng thanh điệu để nghe hoặc xem phân tích khẩu hình chi tiết:
                      </span>
                    </div>
                  </div>

                  <div className="inspector-tones-row">
                    {activeSyllableVariants.map((v) => (
                      <button
                        key={v.tone}
                        type="button"
                        className="inspector-tone-pill"
                        onClick={() => handleSpeak(v.pinyin)}
                        title={`Nghe thanh ${v.tone}: ${v.pinyin}`}
                      >
                        <span className="tone-pinyin-text">{v.pinyin}</span>
                        <span className="tone-sub-num">Thanh {v.tone}</span>
                      </button>
                    ))}

                    <button
                      type="button"
                      className="inspector-action-btn"
                      onClick={() => onInspectPinyin(activeSyllableVariants[2]?.pinyin || selectedSyllable)}
                    >
                      Xem khẩu hình
                    </button>
                  </div>
                </div>
              )}

              {/* Syllables Grid */}
              <div className="syllables-cards-grid">
                {filteredSyllables.length > 0 ? (
                  filteredSyllables.map((syl) => {
                    const isSelected = syl === selectedSyllable
                    return (
                      <button
                        key={syl}
                        type="button"
                        className={`syllable-grid-cell ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => {
                          setSelectedSyllable(syl)
                          handleSpeak(syl)
                        }}
                        title={`Bấm để chọn và nghe âm [ ${syl} ]`}
                      >
                        <span className="cell-syllable-name">{syl}</span>
                      </button>
                    )
                  })
                ) : (
                  <div className="grid-empty-state">
                    <p>Không tìm thấy âm tiết phù hợp với từ khóa "{searchQuery}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: 21 THANH MẪU (PHONETIC GROUPED TABLE) */}
          {activeTab === 'initials' && (
            <div className="initials-cards-list">
              <div className="chart-info-note">
                <span>
                  Tiếng Trung có <strong>21 thanh mẫu</strong> phân loại theo 6 vị trí cấu âm chuẩn. Các âm{' '}
                  <strong style={{ color: 'var(--accent-seal)' }}>BẬT HƠI</strong> và{' '}
                  <strong style={{ color: 'var(--accent-gold)' }}>CUỘN LƯỠI</strong> là đặc trưng quan trọng nhất cần luyện tập.
                </span>
              </div>

              <div className="phonetic-sections-wrapper">
                {INITIAL_GROUPS.map((grp) => (
                  <div key={grp.title} className="phonetic-group-section">
                    <div className="phonetic-group-header">
                      <h3 className="phonetic-group-title">{grp.title}</h3>
                      <span className="phonetic-group-sub">{grp.sub}</span>
                    </div>

                    <div className="phonetic-items-grid">
                      {grp.initials.map((initKey) => {
                        const data = INITIALS_DATA[initKey]
                        if (!data) return null
                        return (
                          <div key={initKey} className="phonetic-clean-card">
                            <div className="clean-card-header">
                              <div className="clean-card-header-left">
                                <span className="clean-initial-symbol">{data.initial}</span>
                                <div className="clean-name-group">
                                  <span className="clean-name-text">{data.name}</span>
                                  <div className="clean-badges-row">
                                    {data.isAspirated && (
                                      <span className="clean-badge aspirate">Bật hơi</span>
                                    )}
                                    {data.group === 'retroflex' && (
                                      <span className="clean-badge retroflex">Cuộn lưỡi</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="clean-card-actions">
                                <button
                                  type="button"
                                  className="clean-audio-btn"
                                  onClick={() => handleSpeak(`${data.initial}a`)}
                                  title={`Nghe phụ âm ${data.initial}`}
                                  aria-label={`Nghe phụ âm ${data.initial}`}
                                >
                                  <Volume2 size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="clean-detail-btn"
                                  onClick={() => onInspectPinyin(`${data.initial}a`)}
                                >
                                  Khẩu hình
                                </button>
                              </div>
                            </div>

                            <div className="clean-card-body">
                              <p className="clean-equiv-full">
                                {data.vietnameseEquivalent}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: 36 VẬN MẪU (FINALS TABLE) */}
          {activeTab === 'finals' && (
            <div className="finals-cards-list">
              <div className="chart-info-note">
                <span>
                  Gồm <strong>6 vận mẫu đơn</strong>, <strong>13 vận mẫu kép</strong>,{' '}
                  <strong>16 vận mẫu mũi</strong> (mũi trước tận cùng bằng <code>-n</code>, mũi sau
                  tận cùng bằng <code>-ng</code>) và âm uốn lưỡi <code>er</code>.
                </span>
              </div>

              <div className="finals-sections-container">
                {/* Section 1: Vận mẫu đơn */}
                <div className="final-group-block">
                  <h3 className="final-group-title">
                    <span>6 Vận Mẫu Đơn (Monophthongs)</span>
                  </h3>
                  <div className="finals-mini-grid">
                    {['a', 'o', 'e', 'i', 'u', 'ü'].map((fin) => {
                      const data = FINALS_DATA[fin]
                      if (!data) return null
                      return (
                        <div key={fin} className="final-card-item">
                          <div className="final-item-top">
                            <span className="final-vowel-char">{data.final}</span>
                            <button
                              type="button"
                              className="final-speak-btn"
                              onClick={() => handleSpeak(data.final)}
                              title={`Nghe vần ${data.final}`}
                              aria-label={`Nghe vần ${data.final}`}
                            >
                              <Volume2 size={15} />
                            </button>
                          </div>
                          <div className="final-item-desc">
                            <span className="final-name">{data.name}</span>
                            <p className="final-vi">{data.vietnameseEquivalent}</p>
                          </div>
                          <button
                            type="button"
                            className="final-action-inspect"
                            onClick={() => onInspectPinyin(data.final)}
                          >
                            Khẩu hình
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Section 2: Vận mẫu kép */}
                <div className="final-group-block">
                  <h3 className="final-group-title">
                    <span>13 Vận Mẫu Kép (Compound Finals)</span>
                  </h3>
                  <div className="finals-mini-grid">
                    {[
                      'ai', 'ei', 'ao', 'ou',
                      'ia', 'ie', 'ua', 'uo', 'üe',
                      'iao', 'iu', 'uai', 'ui',
                    ].map((fin) => {
                      const data = FINALS_DATA[fin]
                      if (!data) return null
                      return (
                        <div key={fin} className="final-card-item">
                          <div className="final-item-top">
                            <span className="final-vowel-char">{data.final}</span>
                            <button
                              type="button"
                              className="final-speak-btn"
                              onClick={() => handleSpeak(data.final)}
                              title={`Nghe vần ${data.final}`}
                              aria-label={`Nghe vần ${data.final}`}
                            >
                              <Volume2 size={15} />
                            </button>
                          </div>
                          <div className="final-item-desc">
                            <span className="final-name">{data.name}</span>
                            <p className="final-vi">{data.vietnameseEquivalent}</p>
                          </div>
                          <button
                            type="button"
                            className="final-action-inspect"
                            onClick={() => onInspectPinyin(data.final)}
                          >
                            Khẩu hình
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Section 3: Vận mẫu mũi */}
                <div className="final-group-block">
                  <h3 className="final-group-title">
                    <span>16 Vận Mẫu Mũi & Âm Uốn Lưỡi (Nasal Finals)</span>
                  </h3>
                  <div className="finals-mini-grid">
                    {[
                      'an', 'en', 'in', 'un', 'ün',
                      'ang', 'eng', 'ing', 'ong',
                      'ian', 'iang', 'iong',
                      'uan', 'uang', 'ueng', 'er',
                    ].map((fin) => {
                      const data = FINALS_DATA[fin]
                      if (!data) return null
                      return (
                        <div key={fin} className="final-card-item">
                          <div className="final-item-top">
                            <span className="final-vowel-char">{data.final}</span>
                            <button
                              type="button"
                              className="final-speak-btn"
                              onClick={() => handleSpeak(data.final)}
                              title={`Nghe vần ${data.final}`}
                              aria-label={`Nghe vần ${data.final}`}
                            >
                              <Volume2 size={15} />
                            </button>
                          </div>
                          <div className="final-item-desc">
                            <span className="final-name">{data.name}</span>
                            <p className="final-vi">{data.vietnameseEquivalent}</p>
                          </div>
                          <button
                            type="button"
                            className="final-action-inspect"
                            onClick={() => onInspectPinyin(data.final)}
                          >
                            Khẩu hình
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: QUY TẮC BIẾN ĐIỆU (TONE SANDHI & SPELLING RULES) */}
          {activeTab === 'rules' && (
            <div className="rules-view-container">
              <div className="rule-card">
                <div className="rule-badge">Quy tắc 1</div>
                <h3 className="rule-title">Biến điệu của hai Thanh 3 (3 + 3 → 2 + 3)</h3>
                <p className="rule-explanation">
                  Khi hai âm tiết mang thanh 3 đi liền nhau, âm tiết thứ nhất sẽ biến điệu thành{' '}
                  <strong>Thanh 2</strong>, âm tiết thứ hai giữ nguyên thanh 3.
                </p>
                <div className="rule-example-box">
                  <div className="example-item">
                    <span className="ex-pinyin">nǐ hǎo (你好)</span>
                    <span className="arrow-sym">→</span>
                    <span className="ex-spoken">
                      đọc thành <strong>ní hǎo</strong>
                      <button
                        type="button"
                        className="rule-audio-btn"
                        onClick={() => handleSpeak('你好')}
                        title="Nghe phát âm"
                        aria-label="Nghe phát âm"
                      >
                        <Volume2 size={13} />
                      </button>
                    </span>
                  </div>
                  <div className="example-item">
                    <span className="ex-pinyin">wǒ yě (我也)</span>
                    <span className="arrow-sym">→</span>
                    <span className="ex-spoken">
                      đọc thành <strong>wó yě</strong>
                      <button
                        type="button"
                        className="rule-audio-btn"
                        onClick={() => handleSpeak('我也')}
                        title="Nghe phát âm"
                        aria-label="Nghe phát âm"
                      >
                        <Volume2 size={13} />
                      </button>
                    </span>
                  </div>
                </div>
              </div>

              <div className="rule-card">
                <div className="rule-badge">Quy tắc 2</div>
                <h3 className="rule-title">Biến điệu của chữ 一 (yī - Nhất)</h3>
                <ul className="rule-bullet-list">
                  <li>
                    Đứng độc lập hoặc đếm số: Đọc nguyên bản <strong>thanh 1 (yī)</strong>.
                  </li>
                  <li>
                    Đứng trước âm mang <strong>Thanh 4</strong>: Đổi thành <strong>Thanh 2 (yí)</strong>.
                    <span className="inline-ex">
                      Ví dụ: yí dìng (一定)
                      <button
                        type="button"
                        className="rule-audio-btn"
                        onClick={() => handleSpeak('一定')}
                        title="Nghe phát âm"
                        aria-label="Nghe phát âm"
                      >
                        <Volume2 size={13} />
                      </button>
                    </span>
                  </li>
                  <li>
                    Đứng trước âm mang <strong>Thanh 1, 2, 3</strong>: Đổi thành <strong>Thanh 4 (yì)</strong>.
                    <span className="inline-ex">
                      Ví dụ: yì tiān (一天), yì qǐ (一起)
                      <button
                        type="button"
                        className="rule-audio-btn"
                        onClick={() => handleSpeak('一天')}
                        title="Nghe phát âm"
                        aria-label="Nghe phát âm"
                      >
                        <Volume2 size={13} />
                      </button>
                    </span>
                  </li>
                </ul>
              </div>

              <div className="rule-card">
                <div className="rule-badge">Quy tắc 3</div>
                <h3 className="rule-title">Biến điệu của chữ 不 (bù - Bất)</h3>
                <ul className="rule-bullet-list">
                  <li>
                    Bình thường hoặc đứng trước thanh 1, 2, 3: Đọc là <strong>Thanh 4 (bù)</strong>.
                  </li>
                  <li>
                    Đứng trước âm mang <strong>Thanh 4</strong>: Đổi thành <strong>Thanh 2 (bú)</strong>.
                    <span className="inline-ex">
                      Ví dụ: bú shì (不是), bú qù (不去)
                      <button
                        type="button"
                        className="rule-audio-btn"
                        onClick={() => handleSpeak('不是')}
                        title="Nghe phát âm"
                        aria-label="Nghe phát âm"
                      >
                        <Volume2 size={13} />
                      </button>
                    </span>
                  </li>
                </ul>
              </div>

              <div className="rule-card">
                <div className="rule-badge">Quy tắc 4</div>
                <h3 className="rule-title">Quy tắc lược bỏ hai chấm của ü khi đi với j, q, x, y</h3>
                <p className="rule-explanation">
                  Khi nguyên âm <code>ü</code> ghép với <code>j, q, x</code> hoặc bán nguyên âm <code>y</code>,
                  ta <strong>bỏ đi 2 dấu chấm trên đầu</strong> và viết thành <code>u</code>, nhưng{' '}
                  <strong>vẫn phát âm là ü (tròn môi)</strong>.
                </p>
                <div className="rule-example-box">
                  <div className="example-item">
                    <span className="ex-pinyin">j + ü → ju</span>
                    <span className="arrow-sym">|</span>
                    <span className="ex-pinyin">q + ü → qu</span>
                    <span className="arrow-sym">|</span>
                    <span className="ex-pinyin">x + ü → xu</span>
                    <span className="arrow-sym">|</span>
                    <span className="ex-pinyin">y + ü → yu</span>
                  </div>
                </div>
                <p className="rule-footnote">
                  * Riêng khi ghép với <code>n</code> và <code>l</code>, vẫn phải giữ 2 chấm (<code>nǚ</code>, <code>lǜ</code>) để phân biệt với <code>nu</code> và <code>lu</code>.
                </p>
              </div>

              <div className="rule-card">
                <div className="rule-badge">Quy tắc 5</div>
                <h3 className="rule-title">Cách đọc nguyên âm "i" sau 7 phụ âm răng và cuộn lưỡi</h3>
                <p className="rule-explanation">
                  Sau 7 phụ âm: <code>zh, ch, sh, r</code> và <code>z, c, s</code>, chữ cái <code>i</code> không đọc là "i" dẹt môi mà đọc thành âm <strong>"ư" ngạc</strong> (giữ nguyên vị trí lưỡi của phụ âm đó và phát âm thoát hơi).
                </p>
                <div className="rule-example-box">
                  <div className="example-item">
                    <span className="ex-pinyin">zhī, chī, shī, rì</span>
                    <span className="arrow-sym">→</span>
                    <span>đọc tựa như "trư", "chư", "sư", "rư"</span>
                  </div>
                  <div className="example-item">
                    <span className="ex-pinyin">zī, cī, sī</span>
                    <span className="arrow-sym">→</span>
                    <span>đọc tựa như "tư", "thư", "xư" (đầu lưỡi sát răng)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Bar */}
        <div className="pinyin-chart-footer">
          <span className="chart-footer-desc">
            Bấm vào bất kỳ âm tiết hoặc nút "Khẩu hình" nào để xem ảnh động mô phỏng cơ quan phát âm.
          </span>
          <button type="button" className="pill-btn primary" onClick={onClose}>
            Đóng bảng
          </button>
        </div>
      </div>
    </div>
  )
}
