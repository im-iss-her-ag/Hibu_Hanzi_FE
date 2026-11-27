import { Volume2, Play } from 'lucide-react'
import type { ToneData } from '../utils/pinyinData'
import { TONES_DATA } from '../utils/pinyinData'
import { speakChinese } from '../utils/speech'
import { TonePinyin } from './TonePinyin'

// Neutral tone only occurs inside words, so it is demonstrated with whole words (TTS)
const NEUTRAL_TONE_SAMPLES = [
  { hanzi: '妈妈', pinyin: 'māma' },
  { hanzi: '朋友', pinyin: 'péngyou' },
  { hanzi: '谢谢', pinyin: 'xièxie' },
]

const TONE_MARK: Record<number, string> = { 0: 'a', 1: 'ā', 2: 'á', 3: 'ǎ', 4: 'à' }
const TONE_SHORT: Record<number, string> = { 1: 'Cao phẳng', 2: 'Vút lên', 3: 'Võng sâu', 4: 'Rơi dứt' }

// Five-level pitch scale (Chao tone letters): level 5 at the top, level 1 at the bottom.
const LEVEL_Y: Record<number, number> = { 5: 36, 4: 70, 3: 104, 2: 138, 1: 172 }
const X0 = 64
const X1 = 316

const CURVES: Record<1 | 2 | 3 | 4, { d: string; start: [number, number]; end: [number, number]; pitch: string }> = {
  1: { d: `M${X0} ${LEVEL_Y[5]} L${X1} ${LEVEL_Y[5]}`, start: [X0, LEVEL_Y[5]], end: [X1, LEVEL_Y[5]], pitch: '55' },
  2: { d: `M${X0} ${LEVEL_Y[3]} C 140 ${LEVEL_Y[3] - 6}, 230 ${LEVEL_Y[5] + 12}, ${X1} ${LEVEL_Y[5]}`, start: [X0, LEVEL_Y[3]], end: [X1, LEVEL_Y[5]], pitch: '35' },
  3: {
    d: `M${X0} ${LEVEL_Y[2]} C 100 ${LEVEL_Y[1] + 8}, 150 ${LEVEL_Y[1] + 8}, 190 ${LEVEL_Y[1]} C 240 ${LEVEL_Y[1] - 8}, 290 ${LEVEL_Y[4] + 20}, ${X1} ${LEVEL_Y[4]}`,
    start: [X0, LEVEL_Y[2]],
    end: [X1, LEVEL_Y[4]],
    pitch: '214',
  },
  4: { d: `M${X0} ${LEVEL_Y[5]} C 130 ${LEVEL_Y[5] + 8}, 250 ${LEVEL_Y[1] - 40}, ${X1} ${LEVEL_Y[1]}`, start: [X0, LEVEL_Y[5]], end: [X1, LEVEL_Y[1]], pitch: '51' },
}

interface ToneContourDiagramProps {
  activeTone: 1 | 2 | 3 | 4 | 0
  toneVariants: {
    tone: 1 | 2 | 3 | 4
    pinyin: string
  }[]
  onSelectTone?: (tone: 1 | 2 | 3 | 4) => void
}

export function ToneContourDiagram({ activeTone, toneVariants, onSelectTone }: ToneContourDiagramProps) {
  const info: ToneData = TONES_DATA[activeTone] || TONES_DATA[1]
  const samples = info.sampleToneText.split(',').map((s) => s.trim()).filter(Boolean)

  return (
    <div className="rf-tone">
      <div className="rf-tone-top">
        <figure className="rf-tone-chart">
          <figcaption className="label">Cao độ 5 bậc</figcaption>
          <svg viewBox="0 0 340 212" role="img" aria-label="Biểu đồ cao độ của bốn thanh điệu theo thang 5 bậc">
            {[5, 4, 3, 2, 1].map((lvl) => (
              <g key={lvl}>
                <line className={lvl === 1 ? 'rf-axis' : 'rf-grid'} x1={X0 - 8} x2={X1 + 12} y1={LEVEL_Y[lvl]} y2={LEVEL_Y[lvl]} />
                <text className="rf-axis-text" x={X0 - 18} y={LEVEL_Y[lvl] + 4} textAnchor="end">
                  {lvl}
                </text>
              </g>
            ))}
            <line className="rf-axis" x1={X0 - 8} x2={X0 - 8} y1={LEVEL_Y[5] - 10} y2={LEVEL_Y[1]} />
            <text className="rf-axis-text" x={X1 + 12} y={LEVEL_Y[1] + 20} textAnchor="end">
              Thời gian →
            </text>
            {([1, 2, 3, 4] as const).map((t) => {
              const c = CURVES[t]
              const on = activeTone === t
              return (
                <g key={t} className={`rf-curve t${t}${on ? ' on' : ' off'}`} onClick={() => onSelectTone?.(t)}>
                  <path className="rf-curve-hit" d={c.d} />
                  <path key={on ? 'on' : 'off'} className="rf-curve-line" d={c.d} pathLength={1} />
                  {on && (
                    <>
                      <circle className="rf-curve-dot" cx={c.start[0]} cy={c.start[1]} r={3.5} />
                      <circle className="rf-curve-dot" cx={c.end[0]} cy={c.end[1]} r={5} />
                      <text className="rf-curve-label" x={c.end[0] - 10} y={c.end[1] + (t === 4 ? -10 : -12)} textAnchor="end">
                        {c.pitch}
                      </text>
                    </>
                  )}
                </g>
              )
            })}
          </svg>
        </figure>

        <div className={`rf-tone-card t${activeTone === 0 ? 5 : activeTone}`}>
          <div className="rf-tone-card-head">
            <span className="rf-tone-mark" aria-hidden>
              {TONE_MARK[activeTone]}
            </span>
            <div>
              <h4 className="rf-tone-name">{info.nameVi}</h4>
              <span className="rf-tone-zh" lang="zh-Hans">
                {info.nameZh}
              </span>
            </div>
          </div>
          <dl className="rf-tone-dl">
            <dt className="label">Đặc trưng cao độ</dt>
            <dd>{info.descriptionVi}</dd>
            <dt className="label">So sánh với tiếng Việt</dt>
            <dd>{info.vietnameseToneCompare}</dd>
            {activeTone !== 0 && (
              <>
                <dt className="label">Âm mẫu</dt>
                <dd className="rf-tone-samples">
                  {samples.map((s) => (
                    <button key={s} type="button" className="rf-sample" onClick={() => speakChinese(s)} title={`Nghe ${s}`}>
                      <TonePinyin pinyin={s} />
                    </button>
                  ))}
                </dd>
              </>
            )}
            {activeTone === 0 && (
              <>
                <dt className="label">Nghe trong từ (thanh nhẹ không đọc tách riêng)</dt>
                <dd className="rf-tone-samples">
                  {NEUTRAL_TONE_SAMPLES.map((s) => (
                    <button key={s.hanzi} type="button" className="rf-sample" onClick={() => speakChinese(s.hanzi)}>
                      <Play size={11} aria-hidden />
                      <span className="rf-han" lang="zh-Hans">
                        {s.hanzi}
                      </span>
                      <TonePinyin pinyin={s.pinyin} />
                    </button>
                  ))}
                </dd>
              </>
            )}
          </dl>
        </div>
      </div>

      <div className="rf-tone-tiles-wrap">
        <span className="label">Nghe 4 thanh của âm tiết này</span>
        <div className="rf-tone-tiles">
          {toneVariants.map((v) => {
            const current = v.tone === activeTone
            return (
              <button
                key={v.tone}
                type="button"
                className={`rf-tile t${v.tone}${current ? ' active' : ''}`}
                aria-pressed={current}
                onClick={() => {
                  onSelectTone?.(v.tone)
                  speakChinese(v.pinyin)
                }}
                title={`Nghe thanh ${v.tone}: ${v.pinyin}`}
              >
                <span className="rf-tile-top">
                  <span className="rf-tile-n">Thanh {v.tone}</span>
                  {current ? <Volume2 size={14} aria-hidden /> : <Play size={12} aria-hidden />}
                </span>
                <TonePinyin pinyin={v.pinyin} className="rf-tile-py" />
                <span className="rf-tile-name">
                  {TONE_SHORT[v.tone]} · {CURVES[v.tone].pitch}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
