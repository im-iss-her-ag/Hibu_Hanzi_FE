import { useMemo } from 'react'
import type { InitialData, FinalData } from '../utils/pinyinData'
import { BookOpen, CheckCircle2, AlertTriangle } from 'lucide-react'

interface MouthShapeDiagramProps {
  initialInfo?: InitialData
  finalInfo?: FinalData
}

export function MouthShapeDiagram({ initialInfo, finalInfo }: MouthShapeDiagramProps) {
  const isAspirated = Boolean(initialInfo?.isAspirated)
  const isNasal =
    initialInfo?.soundType.includes('mũi') ||
    finalInfo?.group === 'front_nasal' ||
    finalInfo?.group === 'back_nasal'

  // Tongue descriptive posture
  const tongueDesc = useMemo(() => {
    if (initialInfo) {
      return {
        title: 'Vị trí & Trạng thái của Lưỡi',
        position: initialInfo.tonguePosition || 'Lưỡi thả lỏng tự nhiên ở đáy miệng.',
        keypoint:
          initialInfo.group === 'retroflex'
            ? 'Đầu lưỡi uốn cong lên chạm sát ngạc cứng, tuyệt đối không chạm vào răng.'
            : initialInfo.group === 'palatal'
              ? 'Mặt lưỡi nâng phẳng áp sát ngạc cứng, đầu lưỡi chúc xuống chân răng dưới.'
              : initialInfo.group === 'velar'
                ? 'Gốc lưỡi (cuống lưỡi) nâng cao chạm vào ngạc mềm (vòm họng mềm) để chặn hơi.'
                : initialInfo.group === 'dental'
                  ? 'Đầu lưỡi duỗi thẳng áp sát mặt sau răng cửa trên, tạo khe xát hẹp.'
                  : initialInfo.group === 'alveolar'
                    ? 'Đầu lưỡi chạm chặt vào nướu răng trên rồi bật dứt khoát ra.'
                    : 'Lưỡi giữ tự nhiên, lực nén tập trung ở hai môi.',
      }
    }

    if (finalInfo) {
      return {
        title: 'Vị trí của Lưỡi trong vần',
        position: finalInfo.guideVi.split('.')[0] + '.',
        keypoint:
          finalInfo.mouthShape === 'round'
            ? 'Cuống lưỡi nâng nhẹ, đầu lưỡi lùi về sau để hỗ trợ khoang miệng tròn.'
            : finalInfo.mouthShape === 'spread'
              ? 'Thân lưỡi nâng cao về phía ngạc cứng, khóe miệng dẹt.'
              : 'Lưỡi nằm thấp ở đáy miệng giúp âm thoát ra vang và rõ.',
      }
    }

    return {
      title: 'Vị trí Lưỡi',
      position: 'Lưỡi thả lỏng tự nhiên.',
      keypoint: 'Không gồng cứng cơ lưỡi.',
    }
  }, [initialInfo, finalInfo])

  // Mouth & Lips posture
  const lipsDesc = useMemo(() => {
    if (initialInfo) {
      let shapeTitle = 'Mở tự nhiên'
      let detail = 'Hai môi thả lỏng, hàm dưới hơi hạ nhẹ.'

      if (initialInfo.group === 'bilabial') {
        shapeTitle = 'Hai môi mím chặt'
        detail = 'Hai môi mím chặt lại hoàn toàn, nén chặt luồng khí không cho thoát ra trước khi bật.'
      } else if (initialInfo.group === 'labiodental') {
        shapeTitle = 'Răng trên cắn nhẹ môi dưới'
        detail = 'Răng cửa trên tiếp xúc nhẹ vào rìa trong của môi dưới, tạo khe hẹp để hơi xát qua.'
      } else if (initialInfo.group === 'palatal' || initialInfo.group === 'dental') {
        shapeTitle = 'Khóe môi căng dẹt sang hai bên'
        detail = 'Hai khóe miệng hơi kéo căng sang hai bên như đang cười mỉm, hàm răng hơi khép hờ.'
      } else if (initialInfo.group === 'retroflex') {
        shapeTitle = 'Môi hơi hé mở tròn tự nhiên'
        detail = 'Môi hơi mở tròn nhẹ để tạo không gian đủ rộng cho đầu lưỡi uốn cong bên trong.'
      }

      return { shapeTitle, detail }
    }

    if (finalInfo) {
      let shapeTitle = 'Khẩu hình mở rộng'
      let detail = 'Hạ hàm mở miệng to, phát âm tròn tiếng.'

      if (finalInfo.mouthShape === 'round') {
        shapeTitle = 'Môi tròn chúm chặt (u, ü)'
        detail = 'Chu tròn hai môi lại như đang huýt sáo, giữ NGUYÊN khẩu hình từ đầu đến cuối âm.'
      } else if (finalInfo.mouthShape === 'spread') {
        shapeTitle = 'Môi dẹt căng (i, ie...)'
        detail = 'Khóe môi kéo dẹt hết cỡ sang hai bên như đang cười tươi.'
      } else if (finalInfo.mouthShape === 'semi_round') {
        shapeTitle = 'Môi nửa tròn (o, ou...)'
        detail = 'Môi hơi chúm tròn vừa phải, không mở to như [a].'
      }

      return { shapeTitle, detail }
    }

    return { shapeTitle: 'Tự nhiên', detail: 'Thả lỏng cơ mặt và môi.' }
  }, [initialInfo, finalInfo])

  // Airflow dynamic
  const airflowDesc = useMemo(() => {
    if (initialInfo) {
      if (initialInfo.isAspirated) {
        return {
          title: 'Bật hơi cực mạnh (Aspirated)',
          status: 'aspirated',
          badge: 'BẬT HƠI MẠNH',
          detail:
            'Tích khí nén thật căng trong khoang miệng, sau đó bung mạnh hơi ra ngoài. Mẹo kiểm tra: Đặt tờ giấy A4 cách miệng 5cm, khi phát âm tờ giấy phải bay phần phật.',
        }
      }
      if (initialInfo.soundType.includes('vô thanh')) {
        return {
          title: 'Không bật hơi & Không rung thanh quản',
          status: 'unaspirated',
          badge: 'KHÔNG BẬT HƠI',
          detail:
            'Luồng khí thoát nhẹ nhàng, dây thanh không rung (khác hoàn toàn âm có rung cổ họng trong tiếng Việt). Đặt tay lên cổ họng thấy không có độ rung.',
        }
      }
      if (initialInfo.soundType.includes('mũi')) {
        return {
          title: 'Âm mũi (Nasal)',
          status: 'nasal',
          badge: 'ÂM MŨI',
          detail: 'Ngạc mềm hạ xuống, toàn bộ luồng âm thanh rung và thoát ra từ khoang mũi.',
        }
      }
      return {
        title: 'Hơi thoát êm nhẹ',
        status: 'gentle',
        badge: 'ÂM THƯỜNG',
        detail: 'Luồng khí đẩy đều qua khe hẹp, phát âm dứt khoát.',
      }
    }

    if (finalInfo) {
      if (isNasal) {
        return {
          title: 'Âm mũi kết thúc (Nasal Final)',
          status: 'nasal',
          badge: 'NGÂN VANG MŨI',
          detail:
            'Nguyên âm chuyển mượt mà về âm mũi cuối (-n hoặc -ng), rung ngân vang trong hốc mũi.',
        }
      }
      return {
        title: 'Thoát khí đều đặn qua vòm miệng',
        status: 'gentle',
        badge: 'NGUYÊN ÂM VANG',
        detail: 'Luồng hơi đẩy liên tục từ phổi lên, dây thanh rung tạo độ vang to, rõ ràng.',
      }
    }

    return {
      title: 'Luồng hơi tự nhiên',
      status: 'gentle',
      badge: 'TIÊU CHUẨN',
      detail: 'Thở đều và phát âm tự nhiên.',
    }
  }, [initialInfo, finalInfo, isNasal])

  // Practical 3-Step Execution
  const steps = useMemo(() => {
    if (initialInfo) {
      return [
        {
          num: '1',
          name: 'Chuẩn bị khẩu hình',
          text: lipsDesc.detail,
        },
        {
          num: '2',
          name: 'Tạo điểm chặn hơi',
          text: tongueDesc.keypoint,
        },
        {
          num: '3',
          name: 'Bật hơi & Giải phóng âm',
          text: airflowDesc.detail,
        },
      ]
    }

    if (finalInfo) {
      return [
        {
          num: '1',
          name: 'Định hình môi',
          text: lipsDesc.detail,
        },
        {
          num: '2',
          name: 'Cố định vòm lưỡi',
          text: tongueDesc.position,
        },
        {
          num: '3',
          name: 'Ngân vang & Kết thúc',
          text: finalInfo.guideVi,
        },
      ]
    }

    return []
  }, [initialInfo, finalInfo, lipsDesc, tongueDesc, airflowDesc])

  return (
    <div className="phonetic-text-guide-container">
      {/* SECTION 1: 3 TRỤ CỘT CƠ QUAN PHÁT ÂM */}
      <div className="guide-pillars-grid">
        {/* Pillar 1: Lưỡi */}
        <div className="guide-pillar-card">
          <div className="pillar-header">
            <span className="pillar-icon">👅</span>
            <div className="pillar-title-group">
              <span className="pillar-badge">Trụ cột 1</span>
              <h4 className="pillar-title">Vị trí Lưỡi</h4>
            </div>
          </div>
          <div className="pillar-body">
            <p className="pillar-main-text">{tongueDesc.position}</p>
            <div className="pillar-sub-note">
              <strong>Điểm mấu chốt:</strong> {tongueDesc.keypoint}
            </div>
          </div>
        </div>

        {/* Pillar 2: Môi & Răng */}
        <div className="guide-pillar-card">
          <div className="pillar-header">
            <span className="pillar-icon">👄</span>
            <div className="pillar-title-group">
              <span className="pillar-badge">Trụ cột 2</span>
              <h4 className="pillar-title">Hình dáng Môi & Răng</h4>
            </div>
          </div>
          <div className="pillar-body">
            <p className="pillar-main-text">
              <strong>{lipsDesc.shapeTitle}:</strong> {lipsDesc.detail}
            </p>
          </div>
        </div>

        {/* Pillar 3: Luồng Hơi & Dây Thanh */}
        <div className={`guide-pillar-card ${isAspirated ? 'highlight-aspirated' : ''}`}>
          <div className="pillar-header">
            <span className="pillar-icon">💨</span>
            <div className="pillar-title-group">
              <span className={`pillar-badge ${isAspirated ? 'badge-seal' : ''}`}>
                {airflowDesc.badge}
              </span>
              <h4 className="pillar-title">{airflowDesc.title}</h4>
            </div>
          </div>
          <div className="pillar-body">
            <p className="pillar-main-text">{airflowDesc.detail}</p>
          </div>
        </div>
      </div>

      {/* SECTION 2: QUY TRÌNH 3 BƯỚC THỰC HÀNH */}
      <div className="guide-steps-container">
        <h4 className="guide-section-heading">
          <CheckCircle2 size={17} className="heading-icon" />
          <span>Quy trình 3 bước thực hành phát âm chuẩn</span>
        </h4>

        <div className="guide-steps-timeline">
          {steps.map((st, idx) => (
            <div key={st.num} className="step-timeline-item">
              <div className="step-timeline-left">
                <span className="step-number-circle">{st.num}</span>
                {idx < steps.length - 1 && <span className="step-timeline-line" />}
              </div>
              <div className="step-timeline-content">
                <h5 className="step-title-text">{st.name}</h5>
                <p className="step-body-text">{st.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: ĐỐI CHIẾU TIẾNG VIỆT */}
      {(initialInfo?.vietnameseEquivalent || finalInfo?.vietnameseEquivalent) && (
        <div className="guide-vietnamese-compare-box">
          <div className="compare-header">
            <BookOpen size={17} className="compare-icon" />
            <span className="compare-title">Đối chiếu với phát âm tiếng Việt</span>
          </div>
          <p className="compare-content">
            {initialInfo?.vietnameseEquivalent || finalInfo?.vietnameseEquivalent}
          </p>
        </div>
      )}

      {/* SECTION 4: CẢNH BÁO LỖI SAI KINH ĐIỂN CỦA NGƯỜI VIỆT */}
      {(initialInfo?.commonMistakes || finalInfo?.commonMistakes) && (
        <div className="guide-mistake-warning-box">
          <div className="mistake-header">
            <AlertTriangle size={18} className="mistake-icon" />
            <span className="mistake-title">Lỗi sai phổ biến của người Việt & Cách sửa</span>
          </div>
          <p className="mistake-content">
            {initialInfo?.commonMistakes || finalInfo?.commonMistakes}
          </p>
        </div>
      )}
    </div>
  )
}
