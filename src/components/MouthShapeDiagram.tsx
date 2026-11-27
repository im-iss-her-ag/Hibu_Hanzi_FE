import { useMemo } from 'react'
import type { InitialData, FinalData } from '../utils/pinyinData'

type Lips = 'closed' | 'neutral' | 'spread' | 'round' | 'open' | 'teeth'
interface Pose {
  jaw: number
  lips: Lips
  tip: [number, number]
  mid: [number, number]
  back: [number, number]
  contact?: [number, number]
  caption: string
}

// Side-view poses (x grows to the back of the mouth, y downward). Lips on the left.
const POSES: Record<string, Pose> = {
  rest: { jaw: 12, lips: 'neutral', tip: [64, 122], mid: [112, 124], back: [160, 120], caption: 'Lưỡi thả lỏng' },
  closed: { jaw: 2, lips: 'closed', tip: [64, 116], mid: [112, 122], back: [160, 120], contact: [38, 92], caption: 'Hai môi khép' },
  labiodental: { jaw: 8, lips: 'teeth', tip: [64, 120], mid: [112, 124], back: [160, 120], contact: [46, 94], caption: 'Răng trên chạm môi dưới' },
  dental: { jaw: 10, lips: 'neutral', tip: [56, 88], mid: [108, 112], back: [160, 118], contact: [52, 86], caption: 'Đầu lưỡi sau răng trên' },
  alveolar: { jaw: 10, lips: 'neutral', tip: [62, 78], mid: [108, 112], back: [160, 118], contact: [62, 72], caption: 'Đầu lưỡi chạm nướu trên' },
  velar: { jaw: 10, lips: 'neutral', tip: [64, 120], mid: [112, 100], back: [160, 70], contact: [164, 62], caption: 'Gốc lưỡi chạm ngạc mềm' },
  palatal: { jaw: 6, lips: 'spread', tip: [60, 112], mid: [104, 68], back: [152, 108], contact: [100, 58], caption: 'Mặt lưỡi áp ngạc cứng' },
  retroflex: { jaw: 10, lips: 'neutral', tip: [90, 66], mid: [118, 106], back: [160, 118], contact: [90, 58], caption: 'Đầu lưỡi uốn lên ngạc cứng' },
  open: { jaw: 28, lips: 'open', tip: [66, 144], mid: [112, 150], back: [160, 144], caption: 'Hàm hạ thấp, lưỡi nằm thấp' },
  round: { jaw: 8, lips: 'round', tip: [84, 120], mid: [124, 98], back: [160, 80], caption: 'Môi chu tròn, gốc lưỡi nâng' },
  spread: { jaw: 6, lips: 'spread', tip: [60, 108], mid: [100, 74], back: [150, 100], caption: 'Môi dẹt, lưỡi nâng cao phía trước' },
  semi_round: { jaw: 14, lips: 'round', tip: [80, 118], mid: [122, 106], back: [160, 94], caption: 'Môi hơi tròn' },
  unrounded: { jaw: 12, lips: 'neutral', tip: [76, 122], mid: [120, 108], back: [160, 92], caption: 'Môi tự nhiên, lưỡi lùi sau' },
  curled: { jaw: 12, lips: 'neutral', tip: [92, 74], mid: [120, 112], back: [160, 118], caption: 'Đầu lưỡi uốn về sau' },
}

function poseFor(initialInfo?: InitialData, finalInfo?: FinalData): Pose {
  if (initialInfo) {
    const g = initialInfo.group
    if (g === 'bilabial') return POSES.closed
    return POSES[g] ?? POSES.rest
  }
  if (finalInfo) {
    if (finalInfo.final.startsWith('ü') || finalInfo.final === 'i') return POSES.spread
    if (finalInfo.mouthShape === 'closed') return POSES.rest
    return POSES[finalInfo.mouthShape] ?? POSES.rest
  }
  return POSES.rest
}

function tonguePath({ tip, mid, back }: Pose) {
  const [tx, ty] = tip
  const [mx, my] = mid
  const [bx, by] = back
  return (
    `M${tx} ${ty} C ${tx + 22} ${ty - 6}, ${mx - 22} ${my - 4}, ${mx} ${my - 2} ` +
    `S ${bx - 16} ${by}, ${bx} ${by} C 176 ${by + 6}, 184 ${by + 24}, 184 172 ` +
    `Q 120 ${Math.max(by, my) + 16}, ${tx - 2} ${ty + 14} Z`
  )
}

function SideView({ pose }: { pose: Pose }) {
  const j = pose.jaw
  const rounded = pose.lips === 'round'
  const lx = rounded ? 24 : 36 // protrusion of the lips
  const upperTeethBottom = 96
  const lowerTeethTop = 96 + j + (pose.lips === 'closed' ? -2 : 0)
  const lipGap = pose.lips === 'closed' ? 0 : rounded ? 7 : 0
  return (
    <svg className="rf-mouth-svg" viewBox="12 22 204 168" role="img" aria-label={`Hình cắt ngang khoang miệng: ${pose.caption}`}>
      {/* palate, velum and back wall */}
      <path className="rf-ink" d="M54 82 C 62 68, 72 62, 88 58 C 114 48, 144 46, 164 56 C 176 62, 182 76, 178 92" />
      <path className="rf-ink" d="M200 36 C 206 84, 204 130, 194 186" />
      {/* tongue */}
      <path className="rf-tongue" d={tonguePath(pose)} />
      {/* upper lip and teeth */}
      <path className="rf-ink" d={`M50 50 C ${lx - 4} 56, ${lx - 6} 74, ${lx + 8 + (rounded ? 2 : 0)} ${90 - lipGap}`} />
      <path className="rf-ink rf-teeth" d={`M50 84 L58 84 L57 ${upperTeethBottom} L50 ${upperTeethBottom} Z`} />
      {/* lower lip, teeth and jaw */}
      <path className="rf-ink" d={`M${lx + 8 + (rounded ? 2 : 0)} ${92 + j + lipGap} C ${lx - 6} ${100 + j}, ${lx - 4} ${122 + j}, 52 ${126 + j}`} />
      <path className="rf-ink rf-teeth" d={`M50 ${lowerTeethTop} L58 ${lowerTeethTop} L57 ${lowerTeethTop + 12} L50 ${lowerTeethTop + 12} Z`} />
      <path className="rf-ink" d={`M52 ${126 + j} C 84 ${138 + j}, 140 ${150 + j * 0.4}, 176 ${176}`} />
      {/* point of articulation */}
      {pose.contact && (
        <g>
          <circle className="rf-contact-ring" cx={pose.contact[0]} cy={pose.contact[1]} r={8} />
          <circle className="rf-contact" cx={pose.contact[0]} cy={pose.contact[1]} r={3.5} />
        </g>
      )}
      <text className="rf-svg-text" x="108" y="38" textAnchor="middle">ngạc cứng</text>
      <text className="rf-svg-text" x="196" y="32" textAnchor="end">ngạc mềm</text>
      <text className="rf-svg-text" x="118" y="186" textAnchor="middle">lưỡi</text>
      <text className="rf-svg-text" x="22" y="44" textAnchor="start">môi</text>
    </svg>
  )
}

function FrontView({ lips }: { lips: Lips }) {
  // Opening (rx, ry) per lip posture, seen from the front.
  const o = { closed: [26, 0], neutral: [24, 8], spread: [30, 6], round: [10, 10], open: [22, 18], teeth: [24, 8] }[lips]
  const [rx, ry] = o
  return (
    <svg className="rf-mouth-svg rf-mouth-front" viewBox="0 0 100 100" role="img" aria-label="Khẩu hình môi nhìn thẳng">
      <ellipse className="rf-ink" cx="50" cy="50" rx={rx + 12} ry={ry + 12} />
      {ry > 0 ? (
        <>
          <ellipse className="rf-ink rf-opening" cx="50" cy="50" rx={rx} ry={ry} />
          {lips !== 'round' && lips !== 'open' && <path className="rf-ink rf-teeth" d={`M${50 - rx * 0.78} ${50 - ry * 0.6} Q 50 ${50 - ry * 0.9}, ${50 + rx * 0.78} ${50 - ry * 0.6} L${50 + rx * 0.78} ${50 - 1} L${50 - rx * 0.78} ${50 - 1} Z`} />}
        </>
      ) : (
        <path className="rf-ink" d={`M${50 - rx} 50 Q 50 53, ${50 + rx} 50`} />
      )}
    </svg>
  )
}


interface MouthShapeDiagramProps {
  initialInfo?: InitialData
  finalInfo?: FinalData
}

export function MouthShapeDiagram({ initialInfo, finalInfo }: MouthShapeDiagramProps) {
  const isAspirated = Boolean(initialInfo?.isAspirated)

  // Tongue description
  const tongueText = useMemo(() => {
    if (initialInfo) {
      if (initialInfo.group === 'retroflex') {
        return 'Đầu lưỡi uốn cong lên chạm sát ngạc cứng, không chạm vào răng.'
      }
      if (initialInfo.group === 'palatal') {
        return 'Mặt lưỡi nâng phẳng áp sát ngạc cứng, đầu lưỡi chúc xuống chân răng dưới.'
      }
      if (initialInfo.group === 'velar') {
        if (initialInfo.initial === 'h') {
          return 'Cuống lưỡi nâng lại gần ngạc mềm nhưng không chạm hẳn, để lại khe hẹp cho luồng hơi xát qua (không chặn hơi).'
        }
        return 'Cuống lưỡi nâng cao chạm vào ngạc mềm (vòm họng mềm) để chặn hơi.'
      }
      if (initialInfo.group === 'dental') {
        return 'Đầu lưỡi duỗi thẳng áp sát mặt sau răng cửa trên, tạo khe xát hẹp.'
      }
      if (initialInfo.group === 'alveolar') {
        if (initialInfo.initial === 'n') {
          return 'Đầu lưỡi áp vào nướu răng trên chặn khoang miệng, luồng hơi thoát ra qua mũi.'
        }
        if (initialInfo.initial === 'l') {
          return 'Đầu lưỡi chạm nướu răng trên, luồng hơi lách qua hai bên mép lưỡi.'
        }
        return 'Đầu lưỡi chạm chặt vào nướu răng trên rồi bật dứt khoát ra.'
      }
      return initialInfo.tonguePosition || 'Lưỡi thả lỏng tự nhiên ở đáy miệng.'
    }

    if (finalInfo) {
      if (finalInfo.final.startsWith('ü')) {
        return 'Lưỡi đặt giống hệt âm "i": mặt lưỡi nâng cao về phía ngạc cứng, đầu lưỡi tì chân răng dưới.'
      }
      if (finalInfo.mouthShape === 'unrounded') {
        return 'Cuống lưỡi nâng lên về phía ngạc mềm, lưỡi hơi lùi về sau (vị trí gần như âm "ơ/ư").'
      }
      if (finalInfo.mouthShape === 'curled') {
        return 'Đầu lưỡi uốn cong về phía sau trong khoang miệng, không chạm vào vòm miệng.'
      }
      if (finalInfo.mouthShape === 'round') {
        return 'Cuống lưỡi nâng nhẹ, đầu lưỡi lùi về sau để hỗ trợ khoang miệng tròn.'
      }
      if (finalInfo.mouthShape === 'spread') {
        return 'Thân lưỡi nâng cao về phía ngạc cứng, hai khóe miệng căng dẹt.'
      }
      return 'Lưỡi nằm thấp ở đáy miệng giúp âm thoát ra vang và rõ.'
    }

    return 'Lưỡi thả lỏng tự nhiên.'
  }, [initialInfo, finalInfo])

  // Lips description
  const lipsText = useMemo(() => {
    if (initialInfo) {
      if (initialInfo.group === 'bilabial') {
        return 'Hai môi mím chặt hoàn toàn, nén luồng khí trước khi mở bật ra.'
      }
      if (initialInfo.group === 'labiodental') {
        return 'Răng cửa trên tiếp xúc nhẹ vào rìa môi dưới, tạo khe hẹp để hơi xát qua.'
      }
      if (initialInfo.group === 'palatal' || initialInfo.group === 'dental') {
        return 'Hai khóe miệng hơi kéo căng sang hai bên như cười mỉm, hàm răng khép hờ.'
      }
      if (initialInfo.group === 'retroflex') {
        return 'Môi mở tròn nhẹ để tạo không gian đủ rộng cho đầu lưỡi uốn cong bên trong.'
      }
      return 'Hai môi thả lỏng tự nhiên, hàm dưới hạ nhẹ.'
    }

    if (finalInfo) {
      if (finalInfo.mouthShape === 'round') {
        return 'Chu tròn hai môi như huýt sáo, giữ cố định hình môi trong suốt âm.'
      }
      if (finalInfo.mouthShape === 'spread') {
        return 'Khóe môi kéo dẹt sang hai bên như đang cười tươi.'
      }
      if (finalInfo.mouthShape === 'unrounded') {
        return 'Môi không tròn, khóe môi hơi kéo ngang tự nhiên, miệng hé vừa (không chu môi).'
      }
      if (finalInfo.mouthShape === 'semi_round') {
        return 'Môi chúm tròn vừa phải, không mở to như âm a.'
      }
      return 'Hạ hàm mở rộng miệng tự nhiên, phát âm tròn tiếng.'
    }

    return 'Thả lỏng cơ miệng tự nhiên.'
  }, [initialInfo, finalInfo])

  // Airflow description
  const airflowText = useMemo(() => {
    if (initialInfo) {
      if (initialInfo.isAspirated) {
        return 'Bật hơi mạnh: Nén khí trong khoang miệng rồi bung mạnh hơi ra ngoài (đặt tờ giấy trước miệng sẽ bay phần phật).'
      }
      const soundType = initialInfo.soundType.toLowerCase()
      if (soundType.includes('xát') && !soundType.includes('tắc')) {
        return soundType.includes('hữu thanh')
          ? 'Âm xát hữu thanh: Luồng hơi cọ xát liên tục qua khe hẹp, đồng thời dây thanh rung.'
          : 'Âm xát: Luồng hơi cọ xát liên tục qua khe hẹp, dây thanh không rung.'
      }
      if (initialInfo.soundType.includes('vô thanh')) {
        return 'Không bật hơi: Luồng khí thoát nhẹ, dây thanh không rung (khác với âm rung cổ họng trong tiếng Việt).'
      }
      if (initialInfo.soundType.includes('mũi')) {
        return 'Âm mũi: Ngạc mềm hạ xuống, toàn bộ luồng âm thanh rung và thoát ra từ khoang mũi.'
      }
      return 'Luồng khí thoát êm và dứt khoát.'
    }

    if (finalInfo) {
      if (finalInfo.group === 'front_nasal' || finalInfo.group === 'back_nasal') {
        return 'Âm mũi: Nguyên âm chuyển mượt mà về âm mũi cuối (-n hoặc -ng), rung ngân vang trong khoang mũi.'
      }
      return 'Nguyên âm vang: Luồng hơi đẩy liên tục từ phổi lên, dây thanh rung tạo độ vang to, rõ ràng.'
    }

    return 'Thở đều và phát âm tự nhiên.'
  }, [initialInfo, finalInfo])

  const guideMain = initialInfo?.guideVi || finalInfo?.guideVi || ''
  const compareText = initialInfo?.vietnameseEquivalent || finalInfo?.vietnameseEquivalent || ''
  const mistakeText = initialInfo?.commonMistakes || finalInfo?.commonMistakes || ''

  const pose = poseFor(initialInfo, finalInfo)

  return (
    <div className="rf-mouth">
      <figure className="rf-mouth-fig">
        <div className="rf-mouth-views">
          <div>
            <SideView pose={pose} />
            <span className="label">Nhìn nghiêng</span>
          </div>
          <div className="rf-mouth-front-wrap">
            <FrontView lips={pose.lips} />
            <span className="label">Nhìn trước</span>
          </div>
        </div>
        <figcaption className="rf-mouth-cap">{pose.caption}</figcaption>
      </figure>

      <div className="rf-mouth-spec">
        {guideMain && (
          <div className="rf-spec-lead">
            <span className="label">Phương pháp phát âm</span>
            <p>{guideMain}</p>
          </div>
        )}

        <dl className="rf-spec-table">
          <div className="rf-spec-row">
            <dt className="label">Vị trí lưỡi</dt>
            <dd>{tongueText}</dd>
          </div>
          <div className="rf-spec-row">
            <dt className="label">Khẩu hình môi</dt>
            <dd>{lipsText}</dd>
          </div>
          <div className="rf-spec-row">
            <dt className="label">
              Luồng hơi {isAspirated && <span className="rf-tag">Bật hơi</span>}
            </dt>
            <dd>{airflowText}</dd>
          </div>
        </dl>

        {compareText && (
          <div className="rf-spec-note">
            <span className="label">So sánh tiếng Việt</span>
            <p>{compareText}</p>
          </div>
        )}

        {mistakeText && (
          <div className="rf-spec-note rf-spec-warn">
            <span className="label">Lưu ý phát âm</span>
            <p>{mistakeText}</p>
          </div>
        )}
      </div>
    </div>
  )
}
