import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent as RPointerEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { BundleCharacter } from '../core'
import { primaryReading } from '../core/lookup'
import { dayKey, useLearnData } from '../learn/srs'
import {
  activitySeries,
  addDays,
  computeStreak,
  hardest,
  isActive,
  levelProgress,
  retention,
  useDaily,
  useNow,
} from '../learn/daily'
import { TonePinyin } from '../components/TonePinyin'
import '../styles/stats.css'

interface StatsViewProps {
  characters: BundleCharacter[]
  onOpenCharacter: (h: string) => void
  onBack: () => void
}

const fmtDay = (k: string) => `${k.slice(8, 10)}/${k.slice(5, 7)}`
const dowMon = (k: string) => (new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10), 12).getDay() + 6) % 7
const DOW_LABEL = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

/** Width of an element, tracked with ResizeObserver (so SVG text is never stretched). */
function useWidth<T extends HTMLElement>(fallback = 320) {
  const ref = useRef<T>(null)
  const [w, setW] = useState(fallback)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const set = () => setW(Math.max(120, Math.round(el.getBoundingClientRect().width)))
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/** One tooltip per chart; bars/cells report their text + anchor point. Content is plain text. */
function useTip() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<{ x: number; y: number; text: string; sub?: string } | null>(null)
  const show = useCallback((el: Element, text: string, sub?: string) => {
    const wrap = wrapRef.current
    if (!wrap) return
    const a = el.getBoundingClientRect()
    const b = wrap.getBoundingClientRect()
    setTip({ x: a.left - b.left + a.width / 2, y: a.top - b.top, text, sub })
  }, [])
  const hide = useCallback(() => setTip(null), [])
  return { wrapRef, tip, show, hide }
}

function Tip({ tip, width }: { tip: { x: number; y: number; text: string; sub?: string } | null; width: number }) {
  if (!tip) return null
  const x = Math.min(Math.max(tip.x, 78), Math.max(78, width - 78))
  return (
    <div className="sv-tip" style={{ left: x, top: tip.y }} role="status">
      <b>{tip.text}</b>
      {tip.sub && <span>{tip.sub}</span>}
    </div>
  )
}

function niceMax(v: number) {
  if (v <= 5) return 5
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  for (const m of [1, 2, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p
  return 10 * p
}

// ---------- Reviews per day ----------

function ReviewsChart({ series }: { series: ReturnType<typeof activitySeries> }) {
  const [boxRef, W] = useWidth<HTMLDivElement>(320)
  const { wrapRef, tip, show, hide } = useTip()
  const [focusIdx, setFocusIdx] = useState(series.length - 1)
  const barRefs = useRef<(SVGGElement | null)[]>([])

  const H = 168
  const m = { l: 30, r: 4, t: 8, b: 22 }
  const iw = W - m.l - m.r
  const ih = H - m.t - m.b
  const slot = iw / series.length
  const bw = Math.max(3, Math.min(20, slot - 2))
  const max = niceMax(Math.max(0, ...series.map((d) => d.reviews + d.learned)))
  const y = (v: number) => m.t + ih - (v / max) * ih
  const total = series.reduce((s, d) => s + d.reviews, 0)
  const totalNew = series.reduce((s, d) => s + d.learned, 0)
  const empty = total + totalNew === 0
  const step = W < 460 ? 7 : 5
  const ticks = [0, max / 2, max].filter((t, i, a) => Number.isInteger(t) && a.indexOf(t) === i)
  const label = (d: (typeof series)[number]) => `${fmtDay(d.day)}: ${d.reviews} lượt ôn, ${d.learned} chữ mới`

  const onKey = (e: KeyboardEvent, i: number) => {
    let n = i
    if (e.key === 'ArrowRight') n = Math.min(series.length - 1, i + 1)
    else if (e.key === 'ArrowLeft') n = Math.max(0, i - 1)
    else if (e.key === 'Home') n = 0
    else if (e.key === 'End') n = series.length - 1
    else return
    e.preventDefault()
    setFocusIdx(n)
    barRefs.current[n]?.focus()
  }

  return (
    <div className="sv-chartwrap" ref={wrapRef}>
      <div className="sv-legend" aria-hidden="true">
        <span><i className="sv-key sv-key-rev" />Lượt ôn</span>
        <span><i className="sv-key sv-key-new" />Chữ mới</span>
      </div>
      <div ref={boxRef} className="sv-chartbox">
        <svg
          data-testid="stats-reviews-chart"
          className="sv-svg"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="group"
          aria-labelledby="sv-rev-title sv-rev-desc"
          onPointerLeave={hide}
        >
          <title id="sv-rev-title">Lượt ôn mỗi ngày trong 30 ngày qua</title>
          <desc id="sv-rev-desc">{`Tổng ${total} lượt ôn và ${totalNew} chữ mới. Dùng phím mũi tên để xem từng ngày.`}</desc>
          {ticks.map((t) => (
            <g key={t}>
              <line className="sv-grid" x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} />
              <text className="sv-tick" x={m.l - 6} y={y(t)} textAnchor="end" dominantBaseline="central">{t}</text>
            </g>
          ))}
          {series.map((d, i) => {
            const cx = m.l + slot * i + slot / 2
            const hRev = (d.reviews / max) * ih
            const hNew = (d.learned / max) * ih
            const gap = d.reviews > 0 && d.learned > 0 ? 2 : 0
            const showLabel = (series.length - 1 - i) % step === 0
            return (
              <g
                key={d.day}
                ref={(el) => {
                  barRefs.current[i] = el
                }}
                className="sv-col"
                tabIndex={i === focusIdx ? 0 : -1}
                role="img"
                aria-label={label(d)}
                onFocus={(e) => {
                  setFocusIdx(i)
                  show(e.currentTarget.querySelector('.sv-hit')!, fmtDay(d.day), `${d.reviews} lượt ôn · ${d.learned} chữ mới`)
                }}
                onBlur={hide}
                onKeyDown={(e) => onKey(e, i)}
                onPointerEnter={(e: RPointerEvent<SVGGElement>) =>
                  show(e.currentTarget.querySelector('.sv-hit')!, fmtDay(d.day), `${d.reviews} lượt ôn · ${d.learned} chữ mới`)
                }
              >
                <rect className="sv-hit" x={cx - slot / 2} y={m.t} width={slot} height={ih} fill="transparent" />
                {d.reviews > 0 && <rect className="sv-bar sv-bar-rev" x={cx - bw / 2} y={m.t + ih - hRev} width={bw} height={Math.max(1.5, hRev)} />}
                {d.learned > 0 && (
                  <rect
                    className="sv-bar sv-bar-new"
                    x={cx - bw / 2}
                    y={m.t + ih - hRev - hNew - gap}
                    width={bw}
                    height={Math.max(1.5, hNew)}
                  />
                )}
                {showLabel && (
                  <text className="sv-tick" x={cx} y={H - 6} textAnchor="middle">{fmtDay(d.day)}</text>
                )}
              </g>
            )
          })}
          <line className="sv-axis" x1={m.l} x2={W - m.r} y1={m.t + ih} y2={m.t + ih} />
        </svg>
        {empty && (
          <p className="sv-empty-chart">Chưa có lượt ôn nào trong 30 ngày qua. Học vài chữ ở trang Hôm nay, biểu đồ sẽ hiện ở đây.</p>
        )}
      </div>
      <Tip tip={tip} width={W} />
      <details className="sv-table">
        <summary>Xem dạng bảng</summary>
        <div className="sv-table-scroll">
          <table>
            <thead>
              <tr><th scope="col">Ngày</th><th scope="col">Lượt ôn</th><th scope="col">Chữ mới</th></tr>
            </thead>
            <tbody>
              {[...series].reverse().map((d) => (
                <tr key={d.day}><th scope="row">{fmtDay(d.day)}</th><td>{d.reviews}</td><td>{d.learned}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

// ---------- Streak calendar ----------

const WEEKS = 18

function StreakCalendar({ days, today }: { days: ReturnType<typeof useDaily>['days']; today: string }) {
  const [boxRef, W] = useWidth<HTMLDivElement>(320)
  const { wrapRef, tip, show, hide } = useTip()
  const labelW = 22
  const topH = 16
  const gap = 3
  const cell = Math.max(9, Math.min(18, Math.floor((W - labelW - gap * (WEEKS - 1)) / WEEKS)))
  const H = topH + 7 * cell + 6 * gap
  const start = addDays(today, -(dowMon(today) + (WEEKS - 1) * 7))
  const cells: { k: string; c: number; r: number }[] = []
  for (let c = 0; c < WEEKS; c++)
    for (let r = 0; r < 7; r++) {
      const k = addDays(start, c * 7 + r)
      if (k <= today) cells.push({ k, c, r })
    }
  const activeCount = cells.filter((x) => isActive(days[x.k])).length
  // Month labels: at the first column where the Monday's month changes.
  const months: { c: number; text: string }[] = []
  for (let c = 0; c < WEEKS; c++) {
    const k = addDays(start, c * 7)
    const mo = k.slice(5, 7)
    if (c === 0 || mo !== addDays(start, (c - 1) * 7).slice(5, 7)) months.push({ c, text: `Th${+mo}` })
  }
  const xOf = (c: number) => labelW + c * (cell + gap)
  const yOf = (r: number) => topH + r * (cell + gap)

  return (
    <div className="sv-chartwrap" ref={wrapRef}>
      <div ref={boxRef} className="sv-chartbox">
        <svg
          className="sv-svg sv-cal"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${activeCount} ngày có học trong ${WEEKS} tuần qua`}
          onPointerLeave={hide}
        >
          {months.map((mo, i) => (
            // skip a label that would collide with the next one
            i < months.length - 1 && months[i + 1].c - mo.c < 3 ? null : (
              <text key={mo.c} className="sv-tick" x={xOf(mo.c)} y={10}>{mo.text}</text>
            )
          ))}
          {[0, 2, 4, 6].map((r) => (
            <text key={r} className="sv-tick" x={0} y={yOf(r) + cell / 2} dominantBaseline="central">{DOW_LABEL[r]}</text>
          ))}
          {cells.map(({ k, c, r }) => {
            const a = days[k]
            const on = isActive(a)
            return (
              <rect
                key={k}
                className={`sv-cell${on ? ' on' : ''}${k === today ? ' today' : ''}`}
                x={xOf(c)}
                y={yOf(r)}
                width={cell}
                height={cell}
                onPointerEnter={(e) =>
                  show(
                    e.currentTarget,
                    fmtDay(k),
                    on ? `${a!.r} lượt ôn · ${a!.n} chữ mới · ${a!.k} đã thuộc` : 'Không học',
                  )
                }
                onPointerDown={(e) => show(e.currentTarget, fmtDay(k), on ? `${a!.r} lượt ôn · ${a!.n} chữ mới · ${a!.k} đã thuộc` : 'Không học')}
              />
            )
          })}
        </svg>
      </div>
      <Tip tip={tip} width={W} />
      <div className="sv-legend">
        <span><i className="sv-key sv-key-cal on" />Có học</span>
        <span><i className="sv-key sv-key-cal" />Chưa học</span>
      </div>
    </div>
  )
}

// ---------- Hardest ----------

function hanVietOf(key: string, byHanzi: Map<string, BundleCharacter>): string | null {
  const parts = Array.from(key).map((ch) => {
    const c = byHanzi.get(ch)
    return c ? primaryReading(c)?.hanViet ?? null : null
  })
  return parts.length && parts.every(Boolean) ? parts.join(' ') : null
}

// ---------- Page ----------

export function StatsView({ characters, onOpenCharacter, onBack }: StatsViewProps) {
  const learn = useLearnData()
  const daily = useDaily()
  const now = useNow()
  const today = dayKey(now)

  const streak = useMemo(() => computeStreak(daily.days, now), [daily.days, now])
  const ret = useMemo(() => retention(learn, 30, now), [learn, now])
  const series = useMemo(() => activitySeries(daily.days, 30, now), [daily.days, now])
  const levels = useMemo(() => levelProgress(learn, characters), [learn, characters])
  const hard = useMemo(() => hardest(learn, 10), [learn])
  const byHanzi = useMemo(() => new Map(characters.map((c) => [c.hanzi, c])), [characters])
  const learnedTotal = levels.reduce((s, l) => s + l.learned, 0)
  const retOk = ret.pct !== null && ret.total >= 10

  return (
    <section className="sv" data-testid="stats-view" aria-labelledby="sv-title">
      <header className="sv-head">
        <button type="button" className="pm-btn sv-back" onClick={onBack}>
          <ArrowLeft size={14} aria-hidden="true" /> Hôm nay
        </button>
        <h1 id="sv-title" className="sv-title">Thống kê học tập</h1>
      </header>

      <div className="sv-tiles">
        <div className="sv-tile">
          <span className="label">Chuỗi hiện tại</span>
          <span className="sv-num" data-testid="stats-streak">{streak.current}<small> ngày</small></span>
          <span className="sv-sub">{streak.todayActive ? 'Hôm nay đã học' : streak.atRisk ? 'Học hôm nay để giữ chuỗi' : 'Hôm nay chưa học'}</span>
        </div>
        <div className="sv-tile">
          <span className="label">Chuỗi dài nhất</span>
          <span className="sv-num" data-testid="stats-longest">{streak.longest}<small> ngày</small></span>
          <span className="sv-sub">Từ trước đến nay</span>
        </div>
        <div className="sv-tile">
          <span className="label">Tỉ lệ nhớ 30 ngày</span>
          <span className="sv-num" data-testid="stats-retention">{retOk ? `${Math.round(ret.pct! * 100)}%` : '—'}</span>
          <span className="sv-sub">
            {ret.total} lượt ôn{retOk ? '' : ' · cần ít nhất 10 lượt để tính'}
          </span>
        </div>
        <div className="sv-tile">
          <span className="label">Tổng chữ đã học</span>
          <span className="sv-num" data-testid="stats-learned">{learnedTotal}</span>
          <span className="sv-sub">Chữ HSK 1–6</span>
        </div>
      </div>

      <section className="sv-card" aria-labelledby="sv-h-rev">
        <h2 id="sv-h-rev" className="sv-h">Lượt ôn mỗi ngày <span>30 ngày qua</span></h2>
        <ReviewsChart series={series} />
      </section>

      <section className="sv-card" aria-labelledby="sv-h-lv">
        <h2 id="sv-h-lv" className="sv-h">Chữ đã học theo cấp HSK</h2>
        <div className="sv-legend" aria-hidden="true">
          <span><i className="sv-key sv-key-rev" />Đã học</span>
          <span><i className="sv-key sv-key-learning" />Đang học</span>
        </div>
        <ul className="sv-levels" data-testid="stats-levels">
          {levels.map((l) => (
            <li key={l.level} className="sv-level" data-level={l.level}>
              <span className="sv-level-name">HSK {l.level}</span>
              <span
                className="sv-meter"
                role="img"
                aria-label={`HSK ${l.level}: ${l.learned} trên ${l.total} chữ đã học, ${l.learning} đang học`}
              >
                <span className="sv-meter-fill sv-meter-learned" style={{ width: `${l.total ? (l.learned / l.total) * 100 : 0}%` }} />
                <span className="sv-meter-fill sv-meter-learning" style={{ width: `${l.total ? (l.learning / l.total) * 100 : 0}%` }} />
              </span>
              <span className="sv-level-fig">
                <b>{l.learned}</b>/{l.total}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="sv-card" aria-labelledby="sv-h-cal">
        <h2 id="sv-h-cal" className="sv-h">Lịch chuỗi ngày <span>{WEEKS} tuần qua</span></h2>
        <StreakCalendar days={daily.days} today={today} />
        <p className="sv-rule">Nghỉ 1 ngày không sao — nghỉ 2 ngày liền thì chuỗi bắt đầu lại.</p>
      </section>

      <section className="sv-card" aria-labelledby="sv-h-hard">
        <h2 id="sv-h-hard" className="sv-h">Chữ khó nhớ nhất</h2>
        {hard.length === 0 ? (
          <p className="sv-empty" data-testid="stats-hardest">Chưa có chữ nào khó — tốt lắm.</p>
        ) : (
          <ul className="sv-hard" data-testid="stats-hardest">
            {hard.map((h) => {
              const first = Array.from(h.hanzi)[0]
              const isWord = Array.from(h.hanzi).length > 1
              const c = isWord ? undefined : byHanzi.get(h.hanzi)
              const r = c ? primaryReading(c) : null
              const hv = isWord ? hanVietOf(h.hanzi, byHanzi) : r?.hanViet ?? null
              return (
                <li key={h.hanzi}>
                  <button type="button" className="sv-hard-item" onClick={() => onOpenCharacter(first)} data-hanzi={h.hanzi}>
                    <span className={`sv-hard-glyph${isWord ? ' word' : ''}`} lang="zh-Hans">{h.hanzi}</span>
                    <span className="sv-hard-main">
                      <span className="sv-hard-read">
                        {r?.pinyin && <TonePinyin pinyin={r.pinyin} />}
                        {hv && <span className="sv-hv">{hv}</span>}
                        {!r?.pinyin && !hv && <span className="sv-muted">{isWord ? 'Từ ghép' : '—'}</span>}
                      </span>
                      <span className="sv-hard-meta">
                        Quên lại {h.lapses} lần · chấm Quên {h.forgot} lần
                      </span>
                    </span>
                    {h.leech && <span className="pm-tag sv-leech">Khó nhớ</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </section>
  )
}
