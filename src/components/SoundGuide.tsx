import { Volume2 } from 'lucide-react'
import { speakChinese } from '../utils/speech'
import { TonePinyin } from './TonePinyin'
import type { Focus, LipShape, SoundGuideEntry } from './soundGuide'

// ---------------------------------------------------------------------------
// Simplified side-view diagram: a face in profile (looking left) with ONE part highlighted.
// Coordinates: x grows towards the back of the head, y downwards.
// ---------------------------------------------------------------------------

type Pt = [number, number]
interface TonguePose {
  tip: Pt
  blade: Pt
  dorsum: Pt
  /** control point for the underside from the mouth floor up to the tip (curled tongue shows its underside) */
  under?: Pt
  jaw: number
  /** where to put the marker dot */
  mark?: Pt
}

const TONGUE: Record<Focus, TonguePose> = {
  lips: { tip: [68, 96], blade: [96, 92], dorsum: [134, 90], jaw: 0 },
  lipteeth: { tip: [68, 96], blade: [96, 92], dorsum: [134, 90], jaw: 2 },
  ridge: { tip: [67, 74], blade: [92, 84], dorsum: [134, 88], jaw: 3, mark: [67, 72] },
  teeth: { tip: [63, 81], blade: [90, 86], dorsum: [134, 90], jaw: 3, mark: [62, 80] },
  curl: { tip: [84, 66], blade: [104, 90], dorsum: [136, 92], under: [72, 92], jaw: 4, mark: [84, 64] },
  rcolour: { tip: [86, 76], blade: [106, 92], dorsum: [138, 90], under: [74, 96], jaw: 6, mark: [86, 74] },
  blade: { tip: [64, 98], blade: [90, 68], dorsum: [130, 80], jaw: 2, mark: [92, 64] },
  back: { tip: [68, 98], blade: [100, 94], dorsum: [150, 70], jaw: 3, mark: [154, 68] },
  low: { tip: [68, 110], blade: [100, 110], dorsum: [140, 104], jaw: 16 },
  backvowel: { tip: [70, 100], blade: [104, 94], dorsum: [144, 76], jaw: 5 },
}

const LIP_JAW: Record<LipShape, number> = { closed: 0, teeth: 2, round: 4, spread: 2, open: 16, relaxed: 4 }

function tonguePath(p: TonguePose, jaw: number): string {
  const [tx, ty] = p.tip
  const [bx, by] = p.blade
  const [dx, dy] = p.dorsum
  const floorY = 108 + jaw
  const u = p.under ?? [tx - 4, ty + 8]
  const rootY = Math.max(dy + 34, 120)
  return [
    `M${tx} ${ty}`,
    `C ${tx + 10} ${ty - 4}, ${bx - 14} ${by - 2}, ${bx} ${by}`,
    `S ${dx - 20} ${dy}, ${dx} ${dy}`,
    `C ${dx + 16} ${dy}, 174 ${dy + 14}, 174 ${rootY}`,
    `L 173 150`,
    `C 150 142, 104 ${floorY + 8}, 72 ${floorY}`,
    `Q ${u[0]} ${u[1]}, ${tx} ${ty}`,
    'Z',
  ].join(' ')
}

function Lips({ shape, jaw, hot }: { shape: LipShape; jaw: number; hot: boolean }) {
  // front-most x of the lips: round lips protrude, spread lips pull back
  const fx = shape === 'round' ? 30 : shape === 'spread' ? 44 : 40
  const meetY = 86
  const gap = shape === 'closed' ? 0 : shape === 'round' ? 5 : shape === 'teeth' ? 0 : shape === 'open' ? 6 : 2
  const upperBottom = meetY - gap / 2
  const lowerTop = meetY + jaw + gap / 2
  const cls = `sg-lip${hot ? ' hot' : ''}`
  if (shape === 'teeth') {
    // lower lip tucked up under the upper teeth
    return (
      <>
        <path className="sg-lip" d={`M50 70 C 42 72, ${fx - 2} 78, ${fx} 84 C ${fx + 4} 87, 50 87, 54 86`} />
        <path className={cls} d={`M58 88 C 50 88, 44 92, 44 98 C 44 104, 48 108, 52 110`} />
      </>
    )
  }
  if (shape === 'round') {
    // pouted lips: pushed forward and rounded, with a small opening
    return (
      <>
        <path className={cls} d={`M50 70 C 42 70, 33 74, 32 79 C 31 ${upperBottom}, 37 ${upperBottom}, 46 ${upperBottom} L 56 ${upperBottom}`} />
        <path className={cls} d={`M56 ${lowerTop} L 46 ${lowerTop} C 37 ${lowerTop}, 31 ${lowerTop + 1}, 32 ${lowerTop + 6} C 33 ${lowerTop + 13}, 44 ${lowerTop + 18}, 52 ${lowerTop + 22}`} />
      </>
    )
  }
  return (
    <>
      <path className={cls} d={`M50 70 C 44 72, ${fx - 2} 78, ${fx} ${upperBottom - 3} C ${fx + 2} ${upperBottom}, 50 ${upperBottom}, 56 ${upperBottom}`} />
      <path className={cls} d={`M56 ${lowerTop} C 50 ${lowerTop}, ${fx + 2} ${lowerTop}, ${fx} ${lowerTop + 3} C ${fx - 2} ${lowerTop + 12}, 46 ${lowerTop + 18}, 52 ${lowerTop + 22}`} />
    </>
  )
}

export function ArticulationDiagram({ entry, title }: { entry: SoundGuideEntry; title: string }) {
  const pose = TONGUE[entry.focus]
  const jaw = Math.max(pose.jaw, LIP_JAW[entry.lips])
  // Rounded lips are always part of the instruction (u, o, ü...), so they are highlighted too.
  const lipsHot = entry.focus === 'lips' || entry.lips === 'round'
  const teethHot = entry.focus === 'lipteeth'
  const tongueHot = entry.focus !== 'lips' && !teethHot
  const chinY = 108 + jaw
  return (
    <svg className="sg-svg" viewBox="10 0 186 172" role="img" aria-label={title}>
      {/* face outline: forehead, nose, chin, neck */}
      <path className="sg-face" d="M74 2 C 70 16, 64 30, 54 42 L 36 60 C 32 65, 35 70, 42 70 L 50 70" />
      <path className="sg-face" d={`M52 ${chinY + 2} C 46 ${chinY + 10}, 48 ${chinY + 22}, 60 ${chinY + 28} C 80 ${chinY + 34}, 110 ${chinY + 38}, 128 ${Math.min(chinY + 42, 170)}`} />
      {/* roof of the mouth (hard then soft palate) and back of the throat */}
      <path className="sg-line" d="M62 82 C 63 74, 68 69, 78 66 C 96 60, 124 58, 146 63 C 158 67, 166 77, 166 90" />
      <path className="sg-line" d="M184 40 C 188 84, 188 128, 182 170" />
      {/* nasal passage, drawn only when air goes through the nose */}
      {entry.nasal && (
        <path className="sg-air" d="M162 84 C 160 62, 150 50, 120 48 C 90 46, 62 50, 40 62" markerEnd="url(#sg-arrow)" />
      )}
      {/* tongue */}
      <path className={`sg-tongue${tongueHot ? ' hot' : ''}`} d={tonguePath(pose, jaw)} />
      {/* teeth */}
      <path className={`sg-tooth${teethHot ? ' hot' : ''}`} d="M55 74 L62 74 L62 86 Q 58 88, 55 86 Z" />
      <path className="sg-tooth" d={`M55 ${92 + jaw} Q 58 ${90 + jaw}, 62 ${92 + jaw} L62 ${102 + jaw} L55 ${102 + jaw} Z`} />
      <Lips shape={entry.lips} jaw={jaw} hot={lipsHot || teethHot} />
      {/* a puff of air in front of the lips for aspirated sounds */}
      {entry.aspirated && (
        <g className="sg-puff">
          <path d="M28 80 q -6 6, 0 12" />
          <path d="M21 76 q -8 10, 0 20" />
          <path d="M14 72 q -10 14, 0 28" />
        </g>
      )}
      {pose.mark && tongueHot && (
        <g>
          <circle className="sg-mark-ring" cx={pose.mark[0]} cy={pose.mark[1]} r={7} />
          <circle className="sg-mark" cx={pose.mark[0]} cy={pose.mark[1]} r={3} />
        </g>
      )}
      <defs>
        <marker id="sg-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className="sg-arrowhead" />
        </marker>
      </defs>
    </svg>
  )
}

const LIP_WORD: Record<LipShape, string> = {
  closed: 'Môi mím',
  teeth: 'Răng trên chạm môi dưới',
  round: 'Môi chu tròn',
  spread: 'Môi kéo dẹt',
  open: 'Miệng mở to',
  relaxed: 'Môi tự nhiên',
}

/** Plain-language summary chips for the header. */
export function guideTraits(entry: SoundGuideEntry, kind: 'initial' | 'final'): string[] {
  const out: string[] = []
  if (kind === 'initial') {
    if (entry.aspirated !== undefined) out.push(entry.aspirated ? 'Bật hơi mạnh' : 'Không bật hơi')
    if (entry.voiced !== undefined) out.push(entry.voiced ? 'Cổ rung' : 'Cổ không rung')
  }
  if (entry.nasal) out.push('Hơi ra mũi')
  out.push(LIP_WORD[entry.lips])
  return out
}

interface SoundGuideProps {
  entry: SoundGuideEntry
  /** Extra technical description, hidden behind a disclosure. */
  technical?: string
}

export function SoundGuide({ entry, technical }: SoundGuideProps) {
  return (
    <div className="sg">
      <p className="sg-like">
        <span className="label">Đọc gần như</span>
        <span className="sg-like-text">{entry.like}</span>
      </p>

      <figure className="sg-fig">
        <ArticulationDiagram entry={entry} title={`Hình miệng nhìn nghiêng: ${entry.focusLabel}`} />
        <figcaption>
          <span className="sg-cap-dot" aria-hidden="true" />
          {entry.focusLabel}
          {entry.aspirated && <span className="sg-cap-sub">Nét cong trước miệng: luồng hơi bật ra</span>}
          {entry.nasal && <span className="sg-cap-sub">Mũi tên: hơi đi ra mũi</span>}
        </figcaption>
      </figure>

      <div className="sg-rest">
        <section className="sg-sec">
          <h4 className="label">Cách làm</h4>
          <ol className="sg-steps">
            {entry.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>

        {entry.pairs && entry.pairs.length > 0 && (
          <section className="sg-sec">
            <h4 className="label">Nghe và so sánh</h4>
            {entry.pairs.map((pair) => (
              <div key={pair.items.map((i) => i.py).join()} className="sg-pair">
                <div className="sg-pair-items">
                  {pair.items.map((it) => (
                    <button key={it.py} type="button" className="sg-pair-btn" onClick={() => speakChinese(it.py)} aria-label={`Nghe ${it.py}, ${it.vi}`}>
                      <span className="sg-pair-han" lang="zh-Hans">
                        {it.hanzi}
                      </span>
                      <TonePinyin pinyin={it.py} className="sg-pair-py" />
                      <span className="sg-pair-vi">{it.vi}</span>
                      <Volume2 size={14} aria-hidden="true" className="sg-pair-icon" />
                    </button>
                  ))}
                </div>
                <p className="sg-pair-note">{pair.note}</p>
              </div>
            ))}
          </section>
        )}

        {entry.tip && (
          <aside className="sg-note sg-tip">
            <span className="label">Tự kiểm tra</span>
            <p>{entry.tip}</p>
          </aside>
        )}

        {entry.mistake && (
          <aside className="sg-note sg-warn">
            <span className="label">Người Việt hay sai</span>
            <p>{entry.mistake}</p>
          </aside>
        )}

        <details className="sg-tech">
          <summary>Mô tả kỹ thuật</summary>
          <p>
            Ký hiệu IPA: <strong>{entry.ipa}</strong>
          </p>
          {technical && <p>{technical}</p>}
        </details>
      </div>
    </div>
  )
}
