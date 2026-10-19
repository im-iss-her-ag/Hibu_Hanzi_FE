import { useMemo } from 'react'
import type { InitialData, FinalData } from '../utils/pinyinData'

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

  return (
    <div className="phonetic-spec-layout">
      {/* 1. Hướng dẫn tổng quan */}
      {guideMain && (
        <div className="spec-primary-card">
          <span className="spec-card-kicker">Phương pháp phát âm</span>
          <p className="spec-primary-text">{guideMain}</p>
        </div>
      )}

      {/* 2. Bảng tham số cấu âm chi tiết */}
      <div className="spec-table-card">
        <div className="spec-row">
          <div className="spec-label-col">
            <span className="spec-label">Vị trí lưỡi</span>
          </div>
          <div className="spec-value-col">
            <p className="spec-value">{tongueText}</p>
          </div>
        </div>

        <div className="spec-row">
          <div className="spec-label-col">
            <span className="spec-label">Khẩu hình môi</span>
          </div>
          <div className="spec-value-col">
            <p className="spec-value">{lipsText}</p>
          </div>
        </div>

        <div className="spec-row">
          <div className="spec-label-col">
            <span className="spec-label">
              Luồng hơi {isAspirated && <strong className="spec-badge-inline">Bật hơi</strong>}
            </span>
          </div>
          <div className="spec-value-col">
            <p className="spec-value">{airflowText}</p>
          </div>
        </div>
      </div>

      {/* 3. Đối chiếu tiếng Việt */}
      {compareText && (
        <div className="spec-info-row compare">
          <span className="spec-tag-heading">So sánh tiếng Việt</span>
          <p className="spec-info-text">{compareText}</p>
        </div>
      )}

      {/* 4. Lưu ý lỗi thường gặp */}
      {mistakeText && (
        <div className="spec-info-row warning">
          <span className="spec-tag-heading alert">Lưu ý phát âm</span>
          <p className="spec-info-text">{mistakeText}</p>
        </div>
      )}
    </div>
  )
}
