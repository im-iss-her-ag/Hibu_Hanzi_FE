import { useState, useMemo, useEffect, useRef, memo, useCallback } from 'react'
import { X, Search, Volume2 } from 'lucide-react'
import {
  INITIALS_DATA,
  FINALS_DATA,
  VALID_SYLLABLES,
  parsePinyin,
  getFinalSampleSyllable,
} from '../utils/pinyinData'
import { speakChinese, getInitialSamplePinyin } from '../utils/speech'
import { TonePinyin } from './TonePinyin'
import { ToneContourDiagram } from './ToneContourDiagram'
import { INITIAL_EXAMPLES, FINAL_EXAMPLES, MOUTH_LABEL } from './pinyinExamples'

interface PinyinChartModalProps {
  onClose: () => void
  onInspectPinyin: (pinyin: string) => void
}

type TabId = 'matrix' | 'initials' | 'finals' | 'tones' | 'rules'

const TABS: { id: TabId; label: string }[] = [
  { id: 'matrix', label: 'Bảng tổng hợp' },
  { id: 'initials', label: 'Thanh mẫu' },
  { id: 'finals', label: 'Vận mẫu' },
  { id: 'tones', label: 'Thanh điệu' },
  { id: 'rules', label: 'Quy tắc' },
]

const INITIAL_GROUPS = [
  { id: 'bilabial', short: 'Âm môi', title: 'Âm môi', sub: 'Hai môi / môi - răng (b, p, m, f)', initials: ['b', 'p', 'm', 'f'] },
  {
    id: 'alveolar',
    short: 'Đầu lưỡi giữa',
    title: 'Âm đầu lưỡi giữa',
    sub: 'Đầu lưỡi chạm nướu trên: d, t bật ra; n thoát hơi qua mũi; l thoát hơi hai bên lưỡi',
    initials: ['d', 't', 'n', 'l'],
  },
  { id: 'velar', short: 'Gốc lưỡi', title: 'Âm cuống lưỡi (gốc lưỡi)', sub: 'Gốc lưỡi nâng lên ngạc mềm (g, k, h)', initials: ['g', 'k', 'h'] },
  { id: 'palatal', short: 'Mặt lưỡi', title: 'Âm mặt lưỡi', sub: 'Mặt lưỡi áp sát ngạc cứng (j, q, x)', initials: ['j', 'q', 'x'] },
  {
    id: 'retroflex',
    short: 'Cuộn lưỡi',
    title: 'Âm đầu lưỡi sau (cuộn lưỡi)',
    sub: 'Đầu lưỡi uốn cong lên chạm ngạc cứng (zh, ch, sh, r)',
    initials: ['zh', 'ch', 'sh', 'r'],
  },
  {
    id: 'dental',
    short: 'Đầu lưỡi trước',
    title: 'Âm đầu lưỡi trước (âm răng)',
    sub: 'Đầu lưỡi phẳng chạm mặt sau răng trên (z, c, s)',
    initials: ['z', 'c', 's'],
  },
  { id: 'zero', short: 'Bán nguyên âm', title: 'Bán nguyên âm (zero initial)', sub: 'Khởi âm thay thế khi không có thanh mẫu (y, w)', initials: ['y', 'w'] },
]

const FINAL_GROUPS = [
  { id: 'simple', title: 'Vận mẫu đơn', sub: 'Một nguyên âm, giữ nguyên khẩu hình từ đầu đến cuối', finals: ['a', 'o', 'e', 'i', 'u', 'ü'] },
  {
    id: 'compound',
    title: 'Vận mẫu kép',
    sub: 'Hai hoặc ba nguyên âm trượt liền nhau',
    finals: ['ai', 'ei', 'ao', 'ou', 'ia', 'ie', 'ua', 'uo', 'üe', 'iao', 'iu', 'uai', 'ui'],
  },
  {
    id: 'front',
    title: 'Vận mẫu mũi trước',
    sub: 'Tận cùng bằng -n: đầu lưỡi chạm nướu trên',
    finals: ['an', 'en', 'in', 'un', 'ün', 'ian', 'uan', 'üan'],
  },
  {
    id: 'back',
    title: 'Vận mẫu mũi sau và âm uốn lưỡi',
    sub: 'Tận cùng bằng -ng: gốc lưỡi nâng lên ngạc mềm; er uốn lưỡi',
    finals: ['ang', 'eng', 'ing', 'ong', 'iang', 'iong', 'uang', 'ueng', 'er'],
  },
]
const SIMPLE_COUNT = FINAL_GROUPS[0].finals.length
const COMPOUND_COUNT = FINAL_GROUPS[1].finals.length
const NASAL_COUNT = FINAL_GROUPS[2].finals.length + FINAL_GROUPS[3].finals.length - 1
const TOTAL_FINALS = SIMPLE_COUNT + COMPOUND_COUNT + NASAL_COUNT + 1

// ---- Matrix model: initials (rows) x finals (columns) ----
const MATRIX_ROWS = ['', ...INITIAL_GROUPS.flatMap((g) => g.initials)]
const MATRIX_COLS = FINAL_GROUPS.flatMap((g) => g.finals)
const COL_GROUPS = FINAL_GROUPS.map((g) => ({ id: g.id, label: g.title.replace('Vận mẫu ', '').replace(' và âm uốn lưỡi', ' & er'), span: g.finals.length }))
const COL_GROUP_END = new Set(FINAL_GROUPS.map((g) => g.finals[g.finals.length - 1]))
const ROW_GROUP_END = new Set(['', ...INITIAL_GROUPS.map((g) => g.initials[g.initials.length - 1])])
const PHONETIC_TO_COLUMN: Record<string, string> = { iou: 'iu', uei: 'ui', uen: 'un', io: 'o' }

const CELL_MAP: Map<string, string> = (() => {
  const m = new Map<string, string>()
  for (const syl of VALID_SYLLABLES) {
    const p = parsePinyin(syl)
    const col = PHONETIC_TO_COLUMN[p.phoneticFinal] ?? p.phoneticFinal
    const key = `${p.initial}|${col}`
    if (!m.has(key)) m.set(key, syl)
  }
  return m
})()

const ROW_GROUP_OF: Record<string, string> = { '': 'zero' }
for (const g of INITIAL_GROUPS) for (const i of g.initials) ROW_GROUP_OF[i] = g.id

const FILTERS = [{ id: 'all', short: 'Tất cả' }, ...INITIAL_GROUPS.map((g) => ({ id: g.id, short: g.short }))]

interface RowProps {
  row: string
  hotCol: number
  isHotRow: boolean
  selected: string
  query: string
}

const MatrixRow = memo(function MatrixRow({ row, hotCol, isHotRow, selected, query }: RowProps) {
  return (
    <tr className={ROW_GROUP_END.has(row) ? 'rf-ge' : undefined}>
      <th scope="row" className={`rf-rowhead${isHotRow ? ' hot' : ''}`} data-r={row}>
        {row === '' ? '∅' : row}
      </th>
      {MATRIX_COLS.map((col, ci) => {
        const syl = CELL_MAP.get(`${row}|${col}`)
        const cls = ['rf-cell']
        if (COL_GROUP_END.has(col)) cls.push('rf-ge')
        if (!syl) cls.push('empty')
        else {
          if (syl === selected) cls.push('sel')
          if (query && !syl.includes(query)) cls.push('dim')
          if (query && syl.includes(query)) cls.push('hit')
        }
        if (isHotRow || ci === hotCol) cls.push('hot')
        return (
          <td key={col} className={cls.join(' ')} data-r={row} data-c={ci} data-s={syl}>
            {syl}
          </td>
        )
      })}
    </tr>
  )
})

function MatrixTab({ onInspectPinyin }: { onInspectPinyin: (p: string) => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState('hao')
  const [hot, setHot] = useState<{ r: string; c: number } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const q = query.trim().toLowerCase()
  const rows = useMemo(() => MATRIX_ROWS.filter((r) => filter === 'all' || ROW_GROUP_OF[r] === filter), [filter])
  const matchCount = useMemo(() => {
    let n = 0
    for (const syl of VALID_SYLLABLES) if (!q || syl.includes(q)) n++
    return n
  }, [q])
  const variants = useMemo(() => parsePinyin(selected).toneVariants, [selected])

  const pick = useCallback((syl: string) => {
    setSelected(syl)
    speakChinese(syl)
  }, [])

  const onPointerOver = (e: React.PointerEvent) => {
    const td = (e.target as HTMLElement).closest<HTMLElement>('td[data-c]')
    if (!td) return
    const next = { r: td.dataset.r ?? '', c: Number(td.dataset.c) }
    setHot((h) => (h && h.r === next.r && h.c === next.c ? h : next))
  }

  const onClick = (e: React.MouseEvent) => {
    const td = (e.target as HTMLElement).closest<HTMLElement>('td[data-s]')
    if (td?.dataset.s) pick(td.dataset.s)
  }

  // Arrow keys walk to the nearest filled cell in that direction; Enter plays the sound.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      speakChinese(selected)
      e.preventDefault()
      return
    }
    const d: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    const step = d[e.key]
    if (!step) return
    e.preventDefault()
    const p = parsePinyin(selected)
    const col0 = PHONETIC_TO_COLUMN[p.phoneticFinal] ?? p.phoneticFinal
    let r = rows.indexOf(p.initial)
    let c = MATRIX_COLS.indexOf(col0)
    if (r < 0 || c < 0) return
    for (;;) {
      r += step[0]
      c += step[1]
      if (r < 0 || r >= rows.length || c < 0 || c >= MATRIX_COLS.length) return
      const syl = CELL_MAP.get(`${rows[r]}|${MATRIX_COLS[c]}`)
      if (syl) {
        setSelected(syl)
        requestAnimationFrame(() => scrollRef.current?.querySelector('.rf-cell.sel')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }))
        return
      }
    }
  }

  const hotCol = hot ? hot.c : -1

  return (
    <div className="rf-matrix-tab">
      <div className="rf-toolbar">
        <label className="rf-search">
          <Search size={16} aria-hidden />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm âm tiết: hao, ni, zhong, xue"
            aria-label="Tìm âm tiết"
            spellCheck={false}
            autoCapitalize="none"
          />
          {query && (
            <button type="button" className="rf-search-clear" onClick={() => setQuery('')} aria-label="Xóa tìm kiếm">
              <X size={14} />
            </button>
          )}
        </label>
        <div className="rf-filters" role="group" aria-label="Nhóm thanh mẫu">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className={`rf-filter${filter === f.id ? ' active' : ''}`} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.short}
            </button>
          ))}
        </div>
      </div>

      <div className="rf-inspector">
        <span className="rf-inspector-syl">{selected}</span>
        <div className="rf-inspector-tones" role="group" aria-label={`Bốn thanh của ${selected}`}>
          {variants.map((v) => (
            <button key={v.tone} type="button" className={`rf-tone-chip t${v.tone}`} onClick={() => speakChinese(v.pinyin)} title={`Nghe thanh ${v.tone}: ${v.pinyin}`}>
              <TonePinyin pinyin={v.pinyin} />
              <span className="rf-tone-chip-n">{v.tone}</span>
            </button>
          ))}
        </div>
        <button type="button" className="rf-link" onClick={() => onInspectPinyin(variants[2]?.pinyin || selected)}>
          Xem hướng dẫn
        </button>
      </div>

      <p className="rf-count" aria-live="polite">
        {q ? `${matchCount} âm tiết chứa "${q}"` : `${VALID_SYLLABLES.size} âm tiết hợp lệ`}
        <span className="rf-count-hint">Bấm một ô để nghe. Phím mũi tên để di chuyển, Enter để nghe lại.</span>
      </p>

      <div
        className="rf-matrix-scroll"
        ref={scrollRef}
        tabIndex={0}
        role="region"
        aria-label="Bảng ghép thanh mẫu và vận mẫu"
        onKeyDown={onKeyDown}
        onPointerLeave={() => setHot(null)}
      >
        <table className="rf-matrix" onPointerOver={onPointerOver} onClick={onClick}>
          <thead>
            <tr>
              <th rowSpan={2} className="rf-corner" scope="col">
                <span className="rf-corner-b">Vận mẫu</span>
                <span className="rf-corner-l">Thanh mẫu</span>
              </th>
              {COL_GROUPS.map((g) => (
                <th key={g.id} colSpan={g.span} scope="colgroup" className="rf-colgroup">
                  {g.label}
                </th>
              ))}
            </tr>
            <tr>
              {MATRIX_COLS.map((c, ci) => (
                <th key={c} scope="col" className={`rf-colhead${COL_GROUP_END.has(c) ? ' rf-ge' : ''}${ci === hotCol ? ' hot' : ''}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <MatrixRow key={r || 'zero'} row={r} hotCol={hotCol} isHotRow={hot?.r === r} selected={selected} query={q} />
            ))}
          </tbody>
        </table>
        {q && matchCount === 0 && <p className="rf-empty">Không có âm tiết nào chứa "{q}". Thử một phần ngắn hơn, ví dụ "a" hoặc "ng".</p>}
      </div>
    </div>
  )
}

interface EntryProps {
  symbol: string
  reading?: string
  tags?: string[]
  type?: string
  note: string
  example?: { hanzi: string; pinyin: string; vi: string }
  onSpeak: () => void
  onGuide: () => void
  label: string
}

function Entry({ symbol, reading, tags, type, note, example, onSpeak, onGuide, label }: EntryProps) {
  return (
    <article className="rf-entry">
      <button type="button" className="rf-entry-sym" onClick={onSpeak} title={`Nghe ${label}`} aria-label={`Nghe ${label}`}>
        {symbol}
        <Volume2 size={13} aria-hidden />
      </button>
      <div className="rf-entry-main">
        <div className="rf-entry-head">
          {reading && <span className="rf-entry-reading">{reading}</span>}
          {type && <span className="rf-entry-type">{type}</span>}
          {tags?.map((t) => (
            <span key={t} className="rf-tag">
              {t}
            </span>
          ))}
        </div>
        <p className="rf-entry-note">{note}</p>
        {example && (
          <p className="rf-entry-ex">
            <span className="rf-han" lang="zh-Hans">
              {example.hanzi}
            </span>
            <TonePinyin pinyin={example.pinyin} className="rf-entry-py" />
            <span className="rf-entry-vi">{example.vi}</span>
          </p>
        )}
      </div>
      <button type="button" className="rf-link rf-entry-guide" onClick={onGuide}>
        Hướng dẫn
      </button>
    </article>
  )
}

function InitialsTab({ onInspectPinyin }: { onInspectPinyin: (p: string) => void }) {
  return (
    <div className="rf-prose-wrap">
      <p className="rf-intro">
        Tiếng Trung có <strong>21 thanh mẫu</strong> (cộng y, w) phân loại theo vị trí cấu âm. Các âm <strong>bật hơi</strong> và <strong>cuộn lưỡi</strong> là đặc trưng quan trọng nhất cần luyện tập.
      </p>
      {INITIAL_GROUPS.map((grp) => (
        <section key={grp.id} className="rf-group">
          <header className="rf-group-head">
            <h3 className="label">{grp.title}</h3>
            <p>{grp.sub}</p>
          </header>
          <div className="rf-entries">
            {grp.initials.map((k) => {
              const data = INITIALS_DATA[k]
              if (!data) return null
              const reading = data.name.match(/\(([^)]+)\)/)?.[1].replace(/\s*-\s*(bật hơi|cuộn lưỡi)/i, '').trim()
              const tags = [data.isAspirated ? 'Bật hơi' : '', data.group === 'retroflex' ? 'Cuộn lưỡi' : ''].filter(Boolean)
              return (
                <Entry
                  key={k}
                  symbol={data.initial}
                  reading={reading ? `đọc: ${reading}` : undefined}
                  type={data.soundType}
                  tags={tags}
                  note={data.vietnameseEquivalent}
                  example={INITIAL_EXAMPLES[k]}
                  label={`phụ âm ${data.initial}`}
                  onSpeak={() => speakChinese(data.initial)}
                  onGuide={() => onInspectPinyin(getInitialSamplePinyin(data.initial))}
                />
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function FinalsTab({ onInspectPinyin }: { onInspectPinyin: (p: string) => void }) {
  return (
    <div className="rf-prose-wrap">
      <p className="rf-intro">
        Gồm <strong>{SIMPLE_COUNT} vận mẫu đơn</strong>, <strong>{COMPOUND_COUNT} vận mẫu kép</strong>, <strong>{NASAL_COUNT} vận mẫu mũi</strong> (mũi trước tận cùng bằng <code>-n</code>, mũi sau tận cùng bằng <code>-ng</code>) và âm uốn lưỡi <code>er</code>.
      </p>
      {FINAL_GROUPS.map((grp) => (
        <section key={grp.id} className="rf-group">
          <header className="rf-group-head">
            <h3 className="label">
              {grp.title} · {grp.finals.length}
            </h3>
            <p>{grp.sub}</p>
          </header>
          <div className="rf-entries">
            {grp.finals.map((k) => {
              const data = FINALS_DATA[k]
              if (!data) return null
              return (
                <Entry
                  key={k}
                  symbol={data.final}
                  type={MOUTH_LABEL[data.mouthShape]}
                  note={data.vietnameseEquivalent}
                  example={FINAL_EXAMPLES[k]}
                  label={`vần ${data.final}`}
                  onSpeak={() => speakChinese(getFinalSampleSyllable(data.final))}
                  onGuide={() => onInspectPinyin(data.final)}
                />
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function TonesTab() {
  const [tone, setTone] = useState<1 | 2 | 3 | 4 | 0>(1)
  const variants = useMemo(() => parsePinyin('ma').toneVariants, [])
  return (
    <div className="rf-prose-wrap rf-wide">
      <p className="rf-intro">
        Tiếng Trung phổ thông có <strong>4 thanh điệu</strong> và thanh nhẹ. Cùng một âm tiết <TonePinyin pinyin="mā má mǎ mà" /> đổi nghĩa theo thanh: <span className="rf-han" lang="zh-Hans">妈</span> mẹ, <span className="rf-han" lang="zh-Hans">麻</span> gai, <span className="rf-han" lang="zh-Hans">马</span> ngựa, <span className="rf-han" lang="zh-Hans">骂</span> mắng.
      </p>
      <ToneContourDiagram activeTone={tone} toneVariants={variants} onSelectTone={setTone} />
    </div>
  )
}

function Say({ text, label = 'Nghe phát âm' }: { text: string; label?: string }) {
  return (
    <button type="button" className="rf-say" onClick={() => speakChinese(text)} title={label} aria-label={`${label}: ${text}`}>
      <Volume2 size={14} />
    </button>
  )
}

function Ex({ hanzi, pinyin, spoken }: { hanzi: string; pinyin: string; spoken?: string }) {
  return (
    <li className="rf-ex">
      <span className="rf-han" lang="zh-Hans">
        {hanzi}
      </span>
      <TonePinyin pinyin={pinyin} className="rf-ex-py" />
      {spoken && (
        <>
          <span className="rf-ex-arrow" aria-hidden>
            →
          </span>
          <span className="rf-ex-spoken">
            đọc thành <TonePinyin pinyin={spoken} className="rf-ex-py" />
          </span>
        </>
      )}
      <Say text={hanzi} />
    </li>
  )
}

function RulesTab() {
  return (
    <div className="rf-prose-wrap rf-rules">
      <section className="rf-rule">
        <h3 className="label">Quy tắc 1</h3>
        <h4>Biến điệu của hai thanh 3 (3 + 3 → 2 + 3)</h4>
        <p>
          Khi hai âm tiết mang thanh 3 đi liền nhau, âm tiết thứ nhất biến điệu thành <strong>thanh 2</strong>, âm tiết thứ hai giữ nguyên thanh 3.
        </p>
        <ul className="rf-exlist">
          <Ex hanzi="你好" pinyin="nǐ hǎo" spoken="ní hǎo" />
          <Ex hanzi="我也" pinyin="wǒ yě" spoken="wó yě" />
        </ul>
      </section>

      <section className="rf-rule">
        <h3 className="label">Quy tắc 2</h3>
        <h4>Biến điệu của chữ 一 (yī, nhất)</h4>
        <ul className="rf-bullets">
          <li>
            Đứng độc lập hoặc đếm số: đọc nguyên bản <strong>thanh 1 (yī)</strong>.
          </li>
          <li>
            Đứng trước âm mang <strong>thanh 4</strong>: đổi thành <strong>thanh 2 (yí)</strong>.
          </li>
        </ul>
        <ul className="rf-exlist">
          <Ex hanzi="一定" pinyin="yī dìng" spoken="yí dìng" />
        </ul>
        <ul className="rf-bullets">
          <li>
            Đứng trước âm mang <strong>thanh 1, 2, 3</strong>: đổi thành <strong>thanh 4 (yì)</strong>.
          </li>
        </ul>
        <ul className="rf-exlist">
          <Ex hanzi="一天" pinyin="yī tiān" spoken="yì tiān" />
          <Ex hanzi="一起" pinyin="yī qǐ" spoken="yì qǐ" />
        </ul>
      </section>

      <section className="rf-rule">
        <h3 className="label">Quy tắc 3</h3>
        <h4>Biến điệu của chữ 不 (bù, bất)</h4>
        <ul className="rf-bullets">
          <li>
            Bình thường hoặc đứng trước thanh 1, 2, 3: đọc là <strong>thanh 4 (bù)</strong>.
          </li>
          <li>
            Đứng trước âm mang <strong>thanh 4</strong>: đổi thành <strong>thanh 2 (bú)</strong>.
          </li>
        </ul>
        <ul className="rf-exlist">
          <Ex hanzi="不是" pinyin="bù shì" spoken="bú shì" />
          <Ex hanzi="不去" pinyin="bù qù" spoken="bú qù" />
        </ul>
      </section>

      <section className="rf-rule">
        <h3 className="label">Quy tắc 4</h3>
        <h4>Lược bỏ hai chấm của ü khi đi với j, q, x, y</h4>
        <p>
          Khi nguyên âm <code>ü</code> ghép với <code>j, q, x</code> hoặc bán nguyên âm <code>y</code>, ta <strong>bỏ hai dấu chấm trên đầu</strong> và viết thành <code>u</code>, nhưng <strong>vẫn phát âm là ü (tròn môi)</strong>.
        </p>
        <ul className="rf-formulas">
          <li>j + ü → <strong>ju</strong></li>
          <li>q + ü → <strong>qu</strong></li>
          <li>x + ü → <strong>xu</strong></li>
          <li>y + ü → <strong>yu</strong></li>
        </ul>
        <p className="rf-footnote">
          Riêng khi ghép với <code>n</code> và <code>l</code>, vẫn phải giữ hai chấm (<code>nǚ</code>, <code>lǜ</code>) để phân biệt với <code>nu</code> và <code>lu</code>.
        </p>
      </section>

      <section className="rf-rule">
        <h3 className="label">Quy tắc 5</h3>
        <h4>Cách đọc nguyên âm "i" sau 7 phụ âm răng và cuộn lưỡi</h4>
        <p>
          Sau 7 phụ âm <code>zh, ch, sh, r</code> và <code>z, c, s</code>, chữ cái <code>i</code> không đọc là "i" dẹt môi mà đọc thành <strong>nguyên âm đầu lưỡi</strong> (舌尖元音 [ɿ] sau z, c, s và [ʅ] sau zh, ch, sh, r; nghe gần như "ư", giữ nguyên vị trí lưỡi của phụ âm đó và phát âm thoát hơi).
        </p>
        <dl className="rf-deflist">
          <dt>
            <TonePinyin pinyin="zhī, chī, shī, rì" />
          </dt>
          <dd>đọc tựa như "trư", "trư" bật hơi mạnh, "sư" (uốn lưỡi), "rư"</dd>
          <dt>
            <TonePinyin pinyin="zī, cī, sī" />
          </dt>
          <dd>đọc tựa như "chư" nhẹ (ts), "ts" + bật hơi mạnh, "xư" (đầu lưỡi sát răng)</dd>
        </dl>
      </section>
    </div>
  )
}

export function PinyinChartModal({ onClose, onInspectPinyin }: PinyinChartModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('matrix')
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // ESC to close; give focus back to whatever opened the chart.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [onClose])

  const onTabKey = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === activeTab)
    let n = -1
    if (e.key === 'ArrowRight') n = (i + 1) % TABS.length
    else if (e.key === 'ArrowLeft') n = (i - 1 + TABS.length) % TABS.length
    if (n < 0) return
    e.preventDefault()
    setActiveTab(TABS[n].id)
    tabRefs.current[TABS[n].id]?.focus()
  }

  return (
    <div className="pm-backdrop" onClick={onClose} onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Bảng pinyin">
      <div className="pm-dialog pc-dialog rf-dialog" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
        <div className="pm-header">
          <h2 className="pm-title">Bảng pinyin</h2>
          <span className="pm-meta rf-head-meta">
            {TOTAL_FINALS} vận mẫu · 21 thanh mẫu · 4 thanh điệu
          </span>
          <div className="pm-header-actions">
            <button type="button" className="pm-icon-btn" onClick={onClose} aria-label="Đóng bảng pinyin" title="Đóng (Esc)">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="rf-tabs" role="tablist" aria-label="Nội dung bảng pinyin" onKeyDown={onTabKey}>
          {TABS.map((t) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el
              }}
              type="button"
              role="tab"
              id={`rf-tab-${t.id}`}
              aria-selected={activeTab === t.id}
              aria-controls="rf-panel"
              tabIndex={activeTab === t.id ? 0 : -1}
              className={`rf-tab${activeTab === t.id ? ' active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={`rf-body${activeTab === 'matrix' ? ' rf-body-fill' : ''}`} id="rf-panel" role="tabpanel" aria-labelledby={`rf-tab-${activeTab}`}>
          {activeTab === 'matrix' && <MatrixTab onInspectPinyin={onInspectPinyin} />}
          {activeTab === 'initials' && <InitialsTab onInspectPinyin={onInspectPinyin} />}
          {activeTab === 'finals' && <FinalsTab onInspectPinyin={onInspectPinyin} />}
          {activeTab === 'tones' && <TonesTab />}
          {activeTab === 'rules' && <RulesTab />}
        </div>
      </div>
    </div>
  )
}
