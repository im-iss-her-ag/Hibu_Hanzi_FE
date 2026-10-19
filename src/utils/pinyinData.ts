// Pinyin linguistic knowledge base: Initials, Finals, Tones, and Articulation Guides

export interface InitialData {
  initial: string
  name: string
  group: 'bilabial' | 'labiodental' | 'alveolar' | 'velar' | 'palatal' | 'retroflex' | 'dental' | 'zero'
  groupNameVi: string
  soundType: string // e.g. "Âm tắc vô thanh, bật hơi"
  isAspirated: boolean // có bật hơi không
  tonguePosition: string // Vị trí lưỡi
  mouthShape: 'closed' | 'open_round' | 'round' | 'spread' | 'half_open' | 'touch_teeth' | 'curled' | 'open'
  guideVi: string
  vietnameseEquivalent: string
  commonMistakes: string
  articulationType: 'bilabial' | 'labiodental' | 'alveolar' | 'velar' | 'palatal' | 'retroflex' | 'dental'
}

export interface FinalData {
  final: string
  name: string
  group: 'simple' | 'compound' | 'front_nasal' | 'back_nasal' | 'er'
  groupNameVi: string
  mouthShape: 'round' | 'spread' | 'open' | 'semi_round' | 'unrounded' | 'curled' | 'closed'
  guideVi: string
  vietnameseEquivalent: string
  commonMistakes: string
}

export interface ToneData {
  tone: 1 | 2 | 3 | 4 | 0
  nameZh: string
  nameVi: string
  pitchNumber: string // e.g. "55", "35", "214", "51"
  symbol: string
  descriptionVi: string
  vietnameseToneCompare: string
  sampleToneText: string
}

export const INITIALS_DATA: Record<string, InitialData> = {
  b: {
    initial: 'b',
    name: 'Âm b (bô)',
    group: 'bilabial',
    groupNameVi: 'Âm hai môi',
    soundType: 'Tắc vô thanh, không bật hơi',
    isAspirated: false,
    tonguePosition: 'Lưỡi tự nhiên thả lỏng ở đáy miệng',
    mouthShape: 'closed',
    guideVi: 'Hai môi mím chặt nén luồng khí, sau đó mở nhanh hai môi để luồng khí bật nhẹ ra ngoài. Dây thanh không rung.',
    vietnameseEquivalent: 'Tương tự âm "p" nhẹ trong tiếng Việt (như trong "pin", "pa-pơ"), KHÔNG rung cổ họng như "b" tiếng Việt.',
    commonMistakes: 'Người Việt hay phát âm rung cổ họng giống chữ "b" tiếng Việt (ví dụ: "bā" đọc thành "ba" tiếng Việt là sai).',
    articulationType: 'bilabial',
  },
  p: {
    initial: 'p',
    name: 'Âm p (pô - bật hơi)',
    group: 'bilabial',
    groupNameVi: 'Âm hai môi',
    soundType: 'Tắc vô thanh, BẬT HƠI MẠNH',
    isAspirated: true,
    tonguePosition: 'Lưỡi thả lỏng, đáy miệng',
    mouthShape: 'closed',
    guideVi: 'Khẩu hình giống hệt âm "b", nhưng trước khi mở môi phải nén luồng khí thật mạnh trong khoang miệng rồi bung mạnh môi để luồng khí phụt ra.',
    vietnameseEquivalent: 'Âm "p" bật hơi mạnh (đặt tờ giấy trước miệng, phát âm tờ giấy phải bay phần phật).',
    commonMistakes: 'Không nén đủ hơi nên bị lẫn lộn giữa "b" và "p".',
    articulationType: 'bilabial',
  },
  m: {
    initial: 'm',
    name: 'Âm m (mô)',
    group: 'bilabial',
    groupNameVi: 'Âm hai môi',
    soundType: 'Âm mũi, hữu thanh',
    isAspirated: false,
    tonguePosition: 'Lưỡi thả lỏng tự nhiên',
    mouthShape: 'closed',
    guideVi: 'Hai môi mím chặt, ngạc mềm hạ xuống, luồng khí rung dây thanh và thoát hoàn toàn qua khoang mũi.',
    vietnameseEquivalent: 'Giống hệt âm "m" trong tiếng Việt (mẹ, má).',
    commonMistakes: 'Rất dễ, người Việt hầu như không phát âm sai âm này.',
    articulationType: 'bilabial',
  },
  f: {
    initial: 'f',
    name: 'Âm f (phô)',
    group: 'labiodental',
    groupNameVi: 'Âm môi - răng',
    soundType: 'Âm xát vô thanh',
    isAspirated: false,
    tonguePosition: 'Lưỡi thả lỏng',
    mouthShape: 'touch_teeth',
    guideVi: 'Răng cửa trên chạm nhẹ vào viền môi dưới, luồng khí cọ xát qua khe hở giữa răng và môi thoát ra ngoài.',
    vietnameseEquivalent: 'Giống âm "ph" trong tiếng Việt (phở, phát).',
    commonMistakes: 'Không cắn nhẹ môi dưới mà lại mím hai môi.',
    articulationType: 'labiodental',
  },
  d: {
    initial: 'd',
    name: 'Âm d (tơ)',
    group: 'alveolar',
    groupNameVi: 'Âm đầu lưỡi giữa',
    soundType: 'Tắc vô thanh, không bật hơi',
    isAspirated: false,
    tonguePosition: 'Đầu lưỡi chạm chặt vào chân răng trên / nướu',
    mouthShape: 'half_open',
    guideVi: 'Đầu lưỡi dính chặt vào nướu răng trên nén hơi, sau đó hạ đầu lưỡi nhanh chóng để luồng khí thoát nhẹ ra ngoài.',
    vietnameseEquivalent: 'Giống âm "t" trong tiếng Việt (tôi, ta), KHÔNG đọc là "đ" hay "d".',
    commonMistakes: 'Phát âm nhầm thành âm "đ" tiếng Việt (rung thanh đới) hoặc "d" (dờ).',
    articulationType: 'alveolar',
  },
  t: {
    initial: 't',
    name: 'Âm t (thơ - bật hơi)',
    group: 'alveolar',
    groupNameVi: 'Âm đầu lưỡi giữa',
    soundType: 'Tắc vô thanh, BẬT HƠI MẠNH',
    isAspirated: true,
    tonguePosition: 'Đầu lưỡi chạm chặt vào nướu răng trên',
    mouthShape: 'half_open',
    guideVi: 'Khẩu hình giống âm "d", nhưng nén hơi cực mạnh sau đầu lưỡi, khi hạ lưỡi luồng khí bật bung ra ngoài dứt khoát.',
    vietnameseEquivalent: 'Gần giống âm "th" tiếng Việt (thư, thôi) nhưng bật hơi mạnh mẽ và dứt khoát hơn.',
    commonMistakes: 'Đọc yếu như âm "th" tiếng Việt bình thường mà quên nén hơi bật mạnh.',
    articulationType: 'alveolar',
  },
  n: {
    initial: 'n',
    name: 'Âm n (nơ)',
    group: 'alveolar',
    groupNameVi: 'Âm đầu lưỡi giữa',
    soundType: 'Âm mũi, hữu thanh',
    isAspirated: false,
    tonguePosition: 'Đầu lưỡi áp chân răng trên',
    mouthShape: 'half_open',
    guideVi: 'Đầu lưỡi áp chặt vào nướu răng trên chặn khoang miệng, luồng khí thoát qua mũi tạo độ vang.',
    vietnameseEquivalent: 'Giống âm "n" trong tiếng Việt (nam, nón).',
    commonMistakes: 'Không bị sai, phát âm tự nhiên.',
    articulationType: 'alveolar',
  },
  l: {
    initial: 'l',
    name: 'Âm l (lơ)',
    group: 'alveolar',
    groupNameVi: 'Âm đầu lưỡi giữa',
    soundType: 'Âm bên, hữu thanh',
    isAspirated: false,
    tonguePosition: 'Đầu lưỡi áp chân răng trên, hai bên lưỡi mở',
    mouthShape: 'half_open',
    guideVi: 'Đầu lưỡi chạm nướu trên, luồng khí lách qua hai bên mép lưỡi thoát ra ngoài trong khi dây thanh rung.',
    vietnameseEquivalent: 'Giống âm "l" trong tiếng Việt (làng, làm).',
    commonMistakes: 'Người một số địa phương dễ nhầm "l" và "n".',
    articulationType: 'alveolar',
  },
  g: {
    initial: 'g',
    name: 'Âm g (cơ)',
    group: 'velar',
    groupNameVi: 'Âm gốc lưỡi (cuống lưỡi)',
    soundType: 'Tắc vô thanh, không bật hơi',
    isAspirated: false,
    tonguePosition: 'Gốc lưỡi (cuống lưỡi) nâng cao áp vào ngạc mềm',
    mouthShape: 'open_round',
    guideVi: 'Gốc lưỡi nâng áp chặt vào ngạc mềm (phía trong họng) để nén hơi, sau đó hạ đột ngột cuống lưỡi cho luồng hơi thoát ra.',
    vietnameseEquivalent: 'Giống âm "c / k" trong tiếng Việt (con, cá), TUYỆT ĐỐI KHÔNG đọc là "g" hay "gh".',
    commonMistakes: 'Người Việt hay đọc nhầm thành chữ "g" tiếng Việt (ví dụ: "gēge" đọc thành "gơ gơ" là sai, phải là "cơ cợ").',
    articulationType: 'velar',
  },
  k: {
    initial: 'k',
    name: 'Âm k (cơ - bật hơi)',
    group: 'velar',
    groupNameVi: 'Âm gốc lưỡi (cuống lưỡi)',
    soundType: 'Tắc vô thanh, BẬT HƠI MẠNH',
    isAspirated: true,
    tonguePosition: 'Gốc lưỡi nâng áp ngạc mềm',
    mouthShape: 'open_round',
    guideVi: 'Vị trí giống âm "g", nhưng nén luồng khí rất mạnh từ cổ họng rồi bật bung cuống lưỡi phụt luồng khí ra.',
    vietnameseEquivalent: 'Là âm "c / k" tiếng Việt (cá, kém) kèm một luồng hơi bật mạnh ra ngoài [kʰ]. KHÔNG phải "kh" tiếng Việt (kh là âm xát, không có độ tắc).',
    commonMistakes: 'Đọc thành "kh" tiếng Việt (chỉ xát, không tắc) hoặc đọc như "c" mà quên bật hơi.',
    articulationType: 'velar',
  },
  h: {
    initial: 'h',
    name: 'Âm h (hơ)',
    group: 'velar',
    groupNameVi: 'Âm gốc lưỡi (cuống lưỡi)',
    soundType: 'Âm xát vô thanh',
    isAspirated: false,
    tonguePosition: 'Gốc lưỡi nâng gần ngạc mềm tạo khe hẹp',
    mouthShape: 'open_round',
    guideVi: 'Gốc lưỡi nâng gần sát ngạc mềm nhưng không chạm hẳn, luồng khí cọ xát qua khe hẹp cổ họng đi ra ngoài.',
    vietnameseEquivalent: 'Gần nhất với âm "kh" tiếng Việt (khá, khó) [x], chỉ hơi lùi sâu và nhám hơn một chút. Ví dụ: "hǎo" đọc gần như "khảo", không phải "hảo".',
    commonMistakes: 'Đọc thành "h" tiếng Việt (chỉ là hơi thở từ thanh hầu, thiếu ma sát ở cuống lưỡi).',
    articulationType: 'velar',
  },
  j: {
    initial: 'j',
    name: 'Âm j (chi)',
    group: 'palatal',
    groupNameVi: 'Âm mặt lưỡi',
    soundType: 'Tắc xát vô thanh, không bật hơi',
    isAspirated: false,
    tonguePosition: 'Mặt lưỡi phẳng nâng áp sát ngạc cứng, đầu lưỡi hạ xuống chân răng dưới',
    mouthShape: 'spread',
    guideVi: 'Đầu lưỡi hạ tì vào mặt sau răng dưới. Mặt trước của lưỡi dính chặt lên ngạc cứng nén khí, sau đó hé mở một khe hẹp để luồng khí xát nhẹ ra.',
    vietnameseEquivalent: 'Gần giống âm "ch" tiếng Việt (cho, chị), nhưng hai khóe môi dẹt căng nhẹ sang hai bên.',
    commonMistakes: 'Đọc nhầm thành âm "gi" hoặc uốn cong lưỡi (âm này tuyệt đối không được uốn lưỡi).',
    articulationType: 'palatal',
  },
  q: {
    initial: 'q',
    name: 'Âm q (chi - bật hơi)',
    group: 'palatal',
    groupNameVi: 'Âm mặt lưỡi',
    soundType: 'Tắc xát vô thanh, BẬT HƠI CỰC MẠNH',
    isAspirated: true,
    tonguePosition: 'Mặt lưỡi áp sát ngạc cứng, đầu lưỡi tì chân răng dưới',
    mouthShape: 'spread',
    guideVi: 'Khẩu hình giống "j", nhưng nén khí cực mạnh. Khi mặt lưỡi tách khỏi ngạc cứng, luồng khí phụt ra dữ dội qua khe hẹp.',
    vietnameseEquivalent: 'Âm "ch" kèm theo luồng hơi bật bung mạnh mẽ (đặt bàn tay trước miệng cảm nhận rõ luồng gió mát).',
    commonMistakes: 'Đọc nhẹ giống âm "j", hoặc đọc nhầm sang "qu" tiếng Việt.',
    articulationType: 'palatal',
  },
  x: {
    initial: 'x',
    name: 'Âm x (xi)',
    group: 'palatal',
    groupNameVi: 'Âm mặt lưỡi',
    soundType: 'Âm xát vô thanh',
    isAspirated: false,
    tonguePosition: 'Mặt lưỡi nâng gần ngạc cứng, đầu lưỡi tì chân răng dưới',
    mouthShape: 'spread',
    guideVi: 'Đầu lưỡi tì răng dưới, mặt lưỡi nâng sát ngạc cứng tạo khe hẹp dài, luồng khí cọ xát liên tục qua khe hẹp thoát ra ngoài.',
    vietnameseEquivalent: 'Tương tự âm "x" tiếng Việt (xe, xanh) nhưng môi dẹt căng hơn và mặt lưỡi nâng cao hơn.',
    commonMistakes: 'Phát âm quá giống "s" nặng (uốn lưỡi) là sai; âm này mặt lưỡi phẳng.',
    articulationType: 'palatal',
  },
  zh: {
    initial: 'zh',
    name: 'Âm zh (trơ - uốn lưỡi)',
    group: 'retroflex',
    groupNameVi: 'Âm cuộn lưỡi (đầu lưỡi sau)',
    soundType: 'Tắc xát vô thanh, không bật hơi, cuộn lưỡi',
    isAspirated: false,
    tonguePosition: 'Đầu lưỡi uốn cong lên chạm vào phần trước ngạc cứng (sau nướu trên)',
    mouthShape: 'curled',
    guideVi: 'Uốn cong đầu lưỡi lên chạm vào vòm họng (ngạc cứng), chặn luồng khí lại. Sau đó hơi hé mở cho luồng khí cọ xát thoát ra từ từ. Không bật hơi.',
    vietnameseEquivalent: 'Tương tự âm "tr" trong tiếng Việt chuẩn miền Nam/Trung (trời, trăng) nhưng uốn lưỡi sâu hơn.',
    commonMistakes: 'Người miền Bắc hay đọc phẳng lưỡi thành "ch", làm mất hẳn tính chất uốn lưỡi đặc trưng.',
    articulationType: 'retroflex',
  },
  ch: {
    initial: 'ch',
    name: 'Âm ch (trơ - uốn lưỡi bật hơi)',
    group: 'retroflex',
    groupNameVi: 'Âm cuộn lưỡi (đầu lưỡi sau)',
    soundType: 'Tắc xát vô thanh, CUỘN LƯỠI + BẬT HƠI MẠNH',
    isAspirated: true,
    tonguePosition: 'Đầu lưỡi uốn cong chạm ngạc cứng',
    mouthShape: 'curled',
    guideVi: 'Vị trí lưỡi hệt như "zh" (uốn cong đầu lưỡi lên ngạc cứng), nén luồng khí dồi dào phía sau lưỡi rồi bật mạnh luồng khí ra ngoài.',
    vietnameseEquivalent: 'Âm "tr" cuộn lưỡi kèm bật luồng hơi cực mạnh.',
    commonMistakes: 'Rất dễ nhầm lẫn giữa "zh" (không bật hơi) và "ch" (bật hơi mạnh), hoặc nhầm với "q".',
    articulationType: 'retroflex',
  },
  sh: {
    initial: 'sh',
    name: 'Âm sh (sơ - uốn lưỡi)',
    group: 'retroflex',
    groupNameVi: 'Âm cuộn lưỡi (đầu lưỡi sau)',
    soundType: 'Âm xát vô thanh, cuộn lưỡi',
    isAspirated: false,
    tonguePosition: 'Đầu lưỡi uốn cong lại gần ngạc cứng (không chạm hẳn)',
    mouthShape: 'curled',
    guideVi: 'Đầu lưỡi uốn cong nâng sát ngạc cứng tạo một khe hở hẹp, luồng khí cọ xát qua khe hẹp đó đi ra tạo âm xát gió ấm.',
    vietnameseEquivalent: 'Giống âm "s" uốn lưỡi nặng trong tiếng Việt (sông, sâu, sương).',
    commonMistakes: 'Đọc dẹt lưỡi thành "x" nhẹ không uốn lưỡi.',
    articulationType: 'retroflex',
  },
  r: {
    initial: 'r',
    name: 'Âm r (rơ - uốn lưỡi rung nhẹ)',
    group: 'retroflex',
    groupNameVi: 'Âm cuộn lưỡi (đầu lưỡi sau)',
    soundType: 'Âm xát hữu thanh (rung thanh đới), cuộn lưỡi',
    isAspirated: false,
    tonguePosition: 'Đầu lưỡi uốn cong sát ngạc cứng, tương tự sh',
    mouthShape: 'curled',
    guideVi: 'Khẩu hình giống "sh", nhưng khi đẩy luồng khí ra thì đồng thời làm rung dây thanh quản (hữu thanh).',
    vietnameseEquivalent: 'Nằm giữa âm "r" nhẹ và âm "gi" tiếng Việt, lưỡi giữ uốn cong không rung đầu lưỡi.',
    commonMistakes: 'Rung đầu lưỡi như âm "r" tiếng Nga/Pháp hoặc đọc hẳn thành "d".',
    articulationType: 'retroflex',
  },
  z: {
    initial: 'z',
    name: 'Âm z (chơ - đầu lưỡi răng)',
    group: 'dental',
    groupNameVi: 'Âm đầu lưỡi trước (chân răng)',
    soundType: 'Tắc xát vô thanh, không bật hơi, răng khép hờ',
    isAspirated: false,
    tonguePosition: 'Đầu lưỡi duỗi thẳng chạm mặt sau chân răng trên',
    mouthShape: 'spread',
    guideVi: 'Đầu lưỡi duỗi thẳng tì chặt vào mặt sau răng cửa trên, hai hàm răng khép gần sát. Hạ nhẹ đầu lưỡi để luồng khí xát qua kẽ răng.',
    vietnameseEquivalent: 'Tương tự "ch" nhẹ nhưng đầu lưỡi chạm sát răng, môi hơi bè dẹt (như "ts" trong tiếng Anh "cats").',
    commonMistakes: 'Đọc nhầm thành "d" (dờ) hoặc "gi".',
    articulationType: 'dental',
  },
  c: {
    initial: 'c',
    name: 'Âm c (ts - đầu lưỡi răng bật hơi)',
    group: 'dental',
    groupNameVi: 'Âm đầu lưỡi trước (chân răng)',
    soundType: 'Tắc xát vô thanh, BẬT HƠI MẠNH',
    isAspirated: true,
    tonguePosition: 'Đầu lưỡi duỗi thẳng chạm chân răng trên',
    mouthShape: 'spread',
    guideVi: 'Vị trí hệt như "z", nhưng nén hơi cực mạnh sau răng cửa, rồi bung luồng khí phụt qua kẽ hai hàm răng tạo tiếng gió rít.',
    vietnameseEquivalent: 'Âm "x / ts" (như "ts" trong "cats") kèm bật hơi mạnh [tsʰ]. KHÔNG đọc là "th" tiếng Việt.',
    commonMistakes: 'Đọc thành "th" hoặc "x" nhẹ, hoặc không bật đủ luồng hơi.',
    articulationType: 'dental',
  },
  s: {
    initial: 's',
    name: 'Âm s (xơ - đầu lưỡi răng)',
    group: 'dental',
    groupNameVi: 'Âm đầu lưỡi trước (chân răng)',
    soundType: 'Âm xát vô thanh',
    isAspirated: false,
    tonguePosition: 'Đầu lưỡi duỗi thẳng gần sát chân răng trên',
    mouthShape: 'spread',
    guideVi: 'Đầu lưỡi duỗi thẳng tiếp cận mặt sau răng cửa trên tạo khe hở mảnh, luồng khí cọ xát liên tục qua kẽ răng.',
    vietnameseEquivalent: 'Tương tự âm "x" nhẹ trong tiếng Việt (xinh, xắn), đầu lưỡi phẳng hướng về chân răng.',
    commonMistakes: 'Uốn lưỡi thành âm "s" nặng (sâu, sương).',
    articulationType: 'dental',
  },
  y: {
    initial: 'y',
    name: 'Bán nguyên âm y (i)',
    group: 'zero',
    groupNameVi: 'Phụ âm zero (Khởi âm i)',
    soundType: 'Bán nguyên âm hữu thanh',
    isAspirated: false,
    tonguePosition: 'Thân lưỡi nâng cao về phía ngạc cứng',
    mouthShape: 'spread',
    guideVi: 'Được dùng khi âm tiết bắt đầu bằng vần i mà không có thanh mẫu. Phát âm như nguyên âm "i" kéo dài lướt nhẹ.',
    vietnameseEquivalent: 'Âm "y/i" tiếng Việt (yêu, yên).',
    commonMistakes: 'Phát âm thành "d/gi" tiếng Việt.',
    articulationType: 'palatal',
  },
  w: {
    initial: 'w',
    name: 'Bán nguyên âm w (u)',
    group: 'zero',
    groupNameVi: 'Phụ âm zero (Khởi âm u)',
    soundType: 'Bán nguyên âm tròn môi',
    isAspirated: false,
    tonguePosition: 'Gốc lưỡi nâng cao về phía ngạc mềm',
    mouthShape: 'round',
    guideVi: 'Được dùng khi âm tiết bắt đầu bằng vần u/o mà không có thanh mẫu. Môi chúm tròn như bắt đầu bằng "u".',
    vietnameseEquivalent: 'Âm "u/qu" tiếng Việt (qua, uể).',
    commonMistakes: 'Đọc thành âm "v" tiếng Việt.',
    articulationType: 'velar',
  },
}

export const FINALS_DATA: Record<string, FinalData> = {
  a: {
    final: 'a',
    name: 'Vận mẫu a',
    group: 'simple',
    groupNameVi: 'Vận mẫu đơn',
    mouthShape: 'open',
    guideVi: 'Miệng mở rộng tối đa, lưỡi hạ thấp phẳng ở đáy họng, luồng hơi tự nhiên thoát ra.',
    vietnameseEquivalent: 'Giống âm "a" trong tiếng Việt (ba, má).',
    commonMistakes: 'Mở miệng chưa đủ rộng.',
  },
  o: {
    final: 'o',
    name: 'Vận mẫu o',
    group: 'simple',
    groupNameVi: 'Vận mẫu đơn',
    mouthShape: 'round',
    guideVi: 'Môi chúm tròn nhô nhẹ về phía trước, gốc lưỡi nâng cao về ngạc mềm.',
    vietnameseEquivalent: 'Gần giống "ua / ô" trong tiếng Việt (như trong "bó", "mô").',
    commonMistakes: 'Đọc thành "o" bẹt tiếng Việt.',
  },
  e: {
    final: 'e',
    name: 'Vận mẫu e',
    group: 'simple',
    groupNameVi: 'Vận mẫu đơn',
    mouthShape: 'unrounded',
    guideVi: 'Miệng hé nửa mở, khóe môi hơi kéo sang hai bên, cuống lưỡi nâng cao.',
    vietnameseEquivalent: 'Nằm giữa âm "ưa" và "ơ" trong tiếng Việt (như "hưa" - hơ).',
    commonMistakes: 'Đọc thành "e" hoặc "ê" tiếng Việt.',
  },
  i: {
    final: 'i',
    name: 'Vận mẫu i',
    group: 'simple',
    groupNameVi: 'Vận mẫu đơn',
    mouthShape: 'spread',
    guideVi: 'Khóe môi dẹt căng kéo sang hai bên như đang cười mỉm, mặt lưỡi nâng sát ngạc cứng.',
    vietnameseEquivalent: 'Giống âm "i" trong tiếng Việt (đi, tí).',
    commonMistakes: 'Sau nhóm zh, ch, sh, r, z, c, s thì chữ "i" đọc thành nguyên âm đầu lưỡi (舌尖元音 [ɿ]/[ʅ]), nghe gần như "ư", người mới học hay quên.',
  },
  u: {
    final: 'u',
    name: 'Vận mẫu u',
    group: 'simple',
    groupNameVi: 'Vận mẫu đơn',
    mouthShape: 'round',
    guideVi: 'Hai môi chúm tròn lại thành một lỗ nhỏ nhô ra trước, cuống lưỡi nâng cao.',
    vietnameseEquivalent: 'Giống âm "u" tiếng Việt (thu, tu).',
    commonMistakes: 'Môi chưa đủ chúm tròn.',
  },
  ü: {
    final: 'ü',
    name: 'Vận mẫu ü (u hai chấm)',
    group: 'simple',
    groupNameVi: 'Vận mẫu đơn',
    mouthShape: 'round',
    guideVi: 'RẤT ĐẶC BIỆT: Vị trí lưỡi đặt giống hệt âm "i" (mặt lưỡi áp sát ngạc cứng), nhưng hai môi lại CHÚM TRÒN chặt chẽ như huýt sáo và cố định hình môi trong suốt quá trình phát âm.',
    vietnameseEquivalent: 'Tương tự âm "uy" trong tiếng Việt nhưng giữ tròn môi nguyên vẹn, không nhả môi thành "i".',
    commonMistakes: 'Đang đọc bị nhả môi dẹt ra thành "i", hoặc đọc thành "u" bình thường.',
  },
  ai: {
    final: 'ai',
    name: 'Vận mẫu ai',
    group: 'compound',
    groupNameVi: 'Vận mẫu kép',
    mouthShape: 'open',
    guideVi: 'Bắt đầu từ âm "a" mở rộng miệng, rồi lướt nhanh khóe môi dẹt về âm "i".',
    vietnameseEquivalent: 'Giống âm "ai" tiếng Việt (mai, hai).',
    commonMistakes: 'Dừng quá lâu ở âm "a".',
  },
  ei: {
    final: 'ei',
    name: 'Vận mẫu ei',
    group: 'compound',
    groupNameVi: 'Vận mẫu kép',
    mouthShape: 'spread',
    guideVi: 'Bắt đầu từ âm "e", lướt nhanh sang âm "i".',
    vietnameseEquivalent: 'Giống âm "ây / ê" trong tiếng Việt (mây, cây).',
    commonMistakes: 'Đọc thành "e-i" tách rời.',
  },
  ao: {
    final: 'ao',
    name: 'Vận mẫu ao',
    group: 'compound',
    groupNameVi: 'Vận mẫu kép',
    mouthShape: 'open',
    guideVi: 'Bắt đầu từ âm "a" mở miệng to, sau đó môi thu tròn nhanh về âm "o/u".',
    vietnameseEquivalent: 'Giống âm "ao" tiếng Việt (chao, bao).',
    commonMistakes: 'Thu môi chưa đủ tròn ở cuối âm.',
  },
  ou: {
    final: 'ou',
    name: 'Vận mẫu ou',
    group: 'compound',
    groupNameVi: 'Vận mẫu kép',
    mouthShape: 'round',
    guideVi: 'Bắt đầu từ âm "o", lướt nhanh về âm "u".',
    vietnameseEquivalent: 'Giống âm "âu / ô" tiếng Việt (câu, trâu).',
    commonMistakes: 'Đọc nhầm thành "u".',
  },
  ia: {
    final: 'ia',
    name: 'Vận mẫu ia',
    group: 'compound',
    groupNameVi: 'Vận mẫu kép',
    mouthShape: 'open',
    guideVi: 'Bắt đầu từ khóe môi dẹt "i", mở bung rộng miệng sang âm "a".',
    vietnameseEquivalent: 'Giống âm "ia / ya" tiếng Việt (tia, lia).',
    commonMistakes: 'Đọc âm "i" quá nặng.',
  },
  io: {
    final: 'io',
    name: 'Vận mẫu io',
    group: 'compound',
    groupNameVi: 'Vận mẫu kép',
    mouthShape: 'round',
    guideVi: 'Bắt đầu từ âm "i" môi dẹt, lướt nhanh sang âm "o" tròn môi. Chỉ gặp trong thán từ "yō / yo" (哟).',
    vietnameseEquivalent: 'Gần âm "iô / dô" đọc liền (như "yo" trong tiếng hô).',
    commonMistakes: 'Hiếm gặp; không dùng kết hợp với phụ âm đầu nào khác.',
  },
  ie: {
    final: 'ie',
    name: 'Vận mẫu ie',
    group: 'compound',
    groupNameVi: 'Vận mẫu kép',
    mouthShape: 'spread',
    guideVi: 'Bắt đầu từ âm "i", lướt nhanh chuyển môi sang âm "ê".',
    vietnameseEquivalent: 'Giống âm "iê / yê" tiếng Việt (tiên, hiền).',
    commonMistakes: 'Đọc thành "i-e" cụt.',
  },
  ua: {
    final: 'ua',
    name: 'Vận mẫu ua',
    group: 'compound',
    groupNameVi: 'Vận mẫu kép',
    mouthShape: 'open',
    guideVi: 'Bắt đầu từ môi tròn "u", mở nhanh rộng miệng sang "a".',
    vietnameseEquivalent: 'Giống âm "oa" tiếng Việt (hoa, xoa).',
    commonMistakes: 'Đọc thành "ua" (mùa).',
  },
  uo: {
    final: 'uo',
    name: 'Vận mẫu uo',
    group: 'compound',
    groupNameVi: 'Vận mẫu kép',
    mouthShape: 'round',
    guideVi: 'Bắt đầu từ môi tròn "u", chuyển nhẹ sang âm "o".',
    vietnameseEquivalent: 'Giống âm "ua / uô" tiếng Việt (mua, cua).',
    commonMistakes: 'Quên giữ tròn môi.',
  },
  üe: {
    final: 'üe',
    name: 'Vận mẫu üe',
    group: 'compound',
    groupNameVi: 'Vận mẫu kép',
    mouthShape: 'round',
    guideVi: 'Bắt đầu từ âm tròn môi "ü", rồi lướt sang âm "ê".',
    vietnameseEquivalent: 'Tương tự "uyê" tiếng Việt (nguyệt, khuyên).',
    commonMistakes: 'Không giữ tròn môi khi bắt đầu.',
  },
  iao: {
    final: 'iao',
    name: 'Vận mẫu iao',
    group: 'compound',
    groupNameVi: 'Vận mẫu kép',
    mouthShape: 'round',
    guideVi: 'Lướt nhanh liên tục từ "i" qua "a" rồi thu môi tròn về "o".',
    vietnameseEquivalent: 'Giống âm "ieo" tiếng Việt (tiêu, chiều).',
    commonMistakes: 'Bỏ quên âm đệm "i".',
  },
  iu: {
    final: 'iu',
    name: 'Vận mẫu iu (iou)',
    group: 'compound',
    groupNameVi: 'Vận mẫu kép',
    mouthShape: 'round',
    guideVi: 'Bắt đầu từ "i", lướt nhẹ qua "o" rồi thu về "u".',
    vietnameseEquivalent: 'Giống âm "iêu / iu" tiếng Việt (yêu, dịu).',
    commonMistakes: 'Đọc thành "i-u" quá phẳng.',
  },
  uai: {
    final: 'uai',
    name: 'Vận mẫu uai',
    group: 'compound',
    groupNameVi: 'Vận mẫu kép',
    mouthShape: 'open',
    guideVi: 'Bắt đầu từ "u" tròn môi, mở rộng "a" rồi dẹt môi về "i".',
    vietnameseEquivalent: 'Giống âm "oai" tiếng Việt (khoai, ngoan ngoãn).',
    commonMistakes: 'Bỏ mất âm đệm "u".',
  },
  ui: {
    final: 'ui',
    name: 'Vận mẫu ui (uei)',
    group: 'compound',
    groupNameVi: 'Vận mẫu kép',
    mouthShape: 'round',
    guideVi: 'Bắt đầu từ "u" tròn môi, lướt qua "e" rồi kết thúc ở "i".',
    vietnameseEquivalent: 'Giống âm "uây" tiếng Việt (quây quần, khuấy).',
    commonMistakes: 'Đọc thành "ui" (túi) tiếng Việt là sai.',
  },
  an: {
    final: 'an',
    name: 'Vận mẫu an',
    group: 'front_nasal',
    groupNameVi: 'Vận mẫu mũi trước',
    mouthShape: 'open',
    guideVi: 'Bắt đầu bằng "a" mở rộng, kết thúc bằng cách đưa đầu lưỡi chạm nướu trên chặn khí để hơi ra mũi.',
    vietnameseEquivalent: 'Giống âm "an" tiếng Việt (lan, can).',
    commonMistakes: 'Lưỡi không chạm chân răng trên ở cuối âm.',
  },
  en: {
    final: 'en',
    name: 'Vận mẫu en',
    group: 'front_nasal',
    groupNameVi: 'Vận mẫu mũi trước',
    mouthShape: 'unrounded',
    guideVi: 'Bắt đầu từ "e", kết thúc bằng đầu lưỡi chạm nướu răng trên tạo âm mũi.',
    vietnameseEquivalent: 'Giống âm "ân" tiếng Việt (thần, cân).',
    commonMistakes: 'Đọc thành "en" (khen) tiếng Việt.',
  },
  in: {
    final: 'in',
    name: 'Vận mẫu in',
    group: 'front_nasal',
    groupNameVi: 'Vận mẫu mũi trước',
    mouthShape: 'spread',
    guideVi: 'Bắt đầu từ khóe môi dẹt "i", kết thúc bằng đầu lưỡi chạm nướu răng trên.',
    vietnameseEquivalent: 'Giống âm "in" tiếng Việt (tin, mịn).',
    commonMistakes: 'Không có lỗi lớn.',
  },
  un: {
    final: 'un',
    name: 'Vận mẫu un (uen)',
    group: 'front_nasal',
    groupNameVi: 'Vận mẫu mũi trước',
    mouthShape: 'round',
    guideVi: 'Bắt đầu bằng "u", lướt qua "e" rồi kết thúc bằng âm mũi "n".',
    vietnameseEquivalent: 'Giống âm "uân" tiếng Việt (xuân, chuẩn).',
    commonMistakes: 'Đọc thành "un" (bún) tiếng Việt là sai.',
  },
  ün: {
    final: 'ün',
    name: 'Vận mẫu ün',
    group: 'front_nasal',
    groupNameVi: 'Vận mẫu mũi trước',
    mouthShape: 'round',
    guideVi: 'Bắt đầu bằng "ü" tròn môi, kết thúc bằng đầu lưỡi chạm nướu răng trên.',
    vietnameseEquivalent: 'Là [yn]: giữ nguyên âm "ü" tròn môi rồi thêm "n", KHÔNG có "ê" ở giữa (không đọc là "uyên").',
    commonMistakes: 'Bỏ mất trạng thái tròn môi.',
  },
  ang: {
    final: 'ang',
    name: 'Vận mẫu ang',
    group: 'back_nasal',
    groupNameVi: 'Vận mẫu mũi sau',
    mouthShape: 'open',
    guideVi: 'Bắt đầu bằng "a" mở to, kết thúc bằng nâng cuống lưỡi chạm ngạc mềm chặn khí (âm ng vang trong họng).',
    vietnameseEquivalent: 'Giống âm "ang" tiếng Việt (vàng, nàng).',
    commonMistakes: 'Âm kết thúc chưa đủ độ vang sau họng.',
  },
  eng: {
    final: 'eng',
    name: 'Vận mẫu eng',
    group: 'back_nasal',
    groupNameVi: 'Vận mẫu mũi sau',
    mouthShape: 'unrounded',
    guideVi: 'Bắt đầu bằng "e", kết thúc bằng gốc lưỡi chạm ngạc mềm tạo âm vang ng mũi sau.',
    vietnameseEquivalent: 'Giống âm "âng" tiếng Việt (vâng, tâng).',
    commonMistakes: 'Đọc nhầm thành "eng" (keng) tiếng Việt.',
  },
  ing: {
    final: 'ing',
    name: 'Vận mẫu ing',
    group: 'back_nasal',
    groupNameVi: 'Vận mẫu mũi sau',
    mouthShape: 'spread',
    guideVi: 'Bắt đầu từ "i", kết thúc bằng âm mũi sau ng ngạc mềm.',
    vietnameseEquivalent: 'Giống âm "inh" tiếng Việt (xinh, tình).',
    commonMistakes: 'Không có lỗi lớn.',
  },
  ong: {
    final: 'ong',
    name: 'Vận mẫu ong',
    group: 'back_nasal',
    groupNameVi: 'Vận mẫu mũi sau',
    mouthShape: 'round',
    guideVi: 'Môi chúm tròn "o", kết thúc bằng cuống lưỡi chạm ngạc mềm tạo âm ng vang.',
    vietnameseEquivalent: 'Gần giống âm "ung" tiếng Việt (cùng, bùng).',
    commonMistakes: 'Đọc thành "ong" (xoong chảo) tiếng Việt là sai.',
  },
  ian: {
    final: 'ian',
    name: 'Vận mẫu ian',
    group: 'front_nasal',
    groupNameVi: 'Vận mẫu mũi trước',
    mouthShape: 'spread',
    guideVi: 'Bắt đầu từ "i", chuyển qua âm "e" rồi kết thúc chạm đầu lưỡi "n".',
    vietnameseEquivalent: 'Giống âm "iên" tiếng Việt (tiền, biển), KHÔNG đọc là "i-an".',
    commonMistakes: 'Người Việt hay đọc nhầm thành "i-an" (ví dụ: "tiān" đọc thành "ti-an" là sai, phải là "thiên").',
  },
  iang: {
    final: 'iang',
    name: 'Vận mẫu iang',
    group: 'back_nasal',
    groupNameVi: 'Vận mẫu mũi sau',
    mouthShape: 'open',
    guideVi: 'Bắt đầu từ "i", lướt sang "a" rồi kết thúc âm mũi sau "ng".',
    vietnameseEquivalent: 'Đọc là "i + ang" lướt liền (gần như "i-ang" nói nhanh), KHÔNG đọc thành "giang" hay "iêng".',
    commonMistakes: 'Bỏ mất âm đệm "i".',
  },
  iong: {
    final: 'iong',
    name: 'Vận mẫu iong',
    group: 'back_nasal',
    groupNameVi: 'Vận mẫu mũi sau',
    mouthShape: 'round',
    guideVi: 'Bắt đầu từ "i", chuyển nhanh sang "ong" tròn môi mũi sau.',
    vietnameseEquivalent: 'Giống âm "iung" tiếng Việt (như trong "xi-ung").',
    commonMistakes: 'Đọc thành "i-ong".',
  },
  uan: {
    final: 'uan',
    name: 'Vận mẫu uan',
    group: 'front_nasal',
    groupNameVi: 'Vận mẫu mũi trước',
    mouthShape: 'open',
    guideVi: 'Bắt đầu bằng "u", mở "a" rồi kết thúc ở đầu lưỡi "n". (Lưu ý: sau j, q, x thì uan chính là üan đọc là "oen/uyên").',
    vietnameseEquivalent: 'Giống âm "oan" tiếng Việt (hoàn, toàn).',
    commonMistakes: 'Quên biến âm sau j, q, x.',
  },
  üan: {
    final: 'üan',
    name: 'Vận mẫu üan (viết juan, quan, xuan, yuan)',
    group: 'front_nasal',
    groupNameVi: 'Vận mẫu mũi trước',
    mouthShape: 'round',
    guideVi: 'Bắt đầu bằng "ü" tròn môi, lướt sang "a/e" rồi kết thúc ở đầu lưỡi "n". Chỉ xuất hiện sau j, q, x, y và được viết là "uan".',
    vietnameseEquivalent: 'Gần giống "uyên" tiếng Việt (xuyên, khuyên), mở miệng rộng hơn một chút.',
    commonMistakes: 'Đọc thành "oan" như uan sau các phụ âm khác.',
  },
  uang: {
    final: 'uang',
    name: 'Vận mẫu uang',
    group: 'back_nasal',
    groupNameVi: 'Vận mẫu mũi sau',
    mouthShape: 'open',
    guideVi: 'Bắt đầu bằng "u", mở to "a" rồi kết thúc ở cuống lưỡi "ng".',
    vietnameseEquivalent: 'Giống âm "oang" tiếng Việt (khoang, thoang thoảng).',
    commonMistakes: 'Không có lỗi lớn.',
  },
  ueng: {
    final: 'ueng',
    name: 'Vận mẫu ueng',
    group: 'back_nasal',
    groupNameVi: 'Vận mẫu mũi sau',
    mouthShape: 'round',
    guideVi: 'Bắt đầu bằng "u", lướt qua "eng" (chỉ đi độc lập thành weng).',
    vietnameseEquivalent: 'Giống âm "uâng" tiếng Việt.',
    commonMistakes: 'Âm này hiếm gặp.',
  },
  er: {
    final: 'er',
    name: 'Vận mẫu er (âm uốn lưỡi)',
    group: 'er',
    groupNameVi: 'Vận mẫu đặc biệt',
    mouthShape: 'curled',
    guideVi: 'Phát âm "e/ơ" đồng thời uốn cong đầu lưỡi lên ngạc cứng tạo âm cuộn lưỡi đặc trưng.',
    vietnameseEquivalent: 'Tương tự âm "ơ" đồng thời uốn đầu lưỡi cong về phía sau trong khoang miệng (như "er" giọng Mỹ), lưỡi không chạm vòm.',
    commonMistakes: 'Quên uốn lưỡi khiến âm bị cụt.',
  },
}

export const TONES_DATA: Record<number, ToneData> = {
  1: {
    tone: 1,
    nameZh: '第一声 · 阴平',
    nameVi: 'Thanh 1 (Âm Bình)',
    pitchNumber: '55',
    symbol: '¯ (mā)',
    descriptionVi: 'Cao độ ở mức 5 (mức cao nhất) và giữ nguyên phẳng đều từ đầu đến cuối âm. Cần giữ hơi dài và đều đặn, không hạ giọng.',
    vietnameseToneCompare: 'Tương tự thanh Không (thanh Ngang) trong tiếng Việt nhưng có cao độ cao hơn và kéo dài hơn một chút.',
    sampleToneText: 'mā, bā, tā, hē',
  },
  2: {
    tone: 2,
    nameZh: '第二声 · 阳平',
    nameVi: 'Thanh 2 (Dương Bình)',
    pitchNumber: '35',
    symbol: 'ˊ (má)',
    descriptionVi: 'Bắt đầu từ cao độ trung bình (mức 3) rồi vút mạnh và mượt mà lên mức cao nhất (mức 5). Luồng hơi bay lên dứt khoát.',
    vietnameseToneCompare: 'Gần giống dấu Sắc trong tiếng Việt, nhưng bắt đầu từ cao độ thấp hơn và vuốt dài hơn.',
    sampleToneText: 'má, bái, rén, lái',
  },
  3: {
    tone: 3,
    nameZh: '第三声 · 上声',
    nameVi: 'Thanh 3 (Thượng Thanh)',
    pitchNumber: '214',
    symbol: 'ˇ (mǎ)',
    descriptionVi: 'Bắt đầu ở mức 2, hạ sâu xuống mức đáy cổ họng 1, rồi vút nhẹ lên mức 4. Khi đi trước một thanh khác, thường đọc nửa thanh 3 (chỉ hạ từ 2 xuống 1).',
    vietnameseToneCompare: 'Thanh 3 đầy đủ (214) gần giống dấu Hỏi tiếng Việt (hạ xuống rồi lên). Nửa thanh 3 (21) chỉ trầm thấp, giống dấu Nặng nhưng không bị tắc họng đột ngột ở cuối.',
    sampleToneText: 'mǎ, hǎo, nǐ, wǒ',
  },
  4: {
    tone: 4,
    nameZh: '第四声 · 去声',
    nameVi: 'Thanh 4 (Khứ Thanh)',
    pitchNumber: '51',
    symbol: 'ˋ (mà)',
    descriptionVi: 'Bắt đầu từ đỉnh cao nhất (mức 5), rơi cực nhanh và dứt khoát xuống đáy (mức 1). Phát âm ngắn, mạnh, dứt khoát như một mệnh lệnh.',
    vietnameseToneCompare: 'Dốc hơn dấu Huyền và dấu Nặng tiếng Việt. Người Việt hay nhầm thành dấu Nặng hoặc dấu Huyền, bí quyết là phải bắt đầu thật cao rồi chém nhanh xuống.',
    sampleToneText: 'mà, dà, qù, bù',
  },
  0: {
    tone: 0,
    nameZh: '轻声 · Khinh thanh',
    nameVi: 'Thanh nhẹ (Neutral Tone)',
    pitchNumber: '--',
    symbol: '· (ma)',
    descriptionVi: 'Được phát âm thật ngắn, nhẹ, không nhấn trọng âm. Cao độ phụ thuộc vào thanh điệu của âm tiết đứng ngay trước nó.',
    vietnameseToneCompare: 'Ngắn và nhẹ như một tiếng đệm thì thầm (như "ma" trong "māma", "le" trong "chī le").',
    sampleToneText: 'ba, ma, ne, de',
  },
}

// Tone vowel mapping helper
const TONE_MARKS: Record<string, { 1: string; 2: string; 3: string; 4: string }> = {
  a: { 1: 'ā', 2: 'á', 3: 'ǎ', 4: 'à' },
  o: { 1: 'ō', 2: 'ó', 3: 'ǒ', 4: 'ò' },
  e: { 1: 'ē', 2: 'é', 3: 'ě', 4: 'è' },
  i: { 1: 'ī', 2: 'í', 3: 'ǐ', 4: 'ì' },
  u: { 1: 'ū', 2: 'ú', 3: 'ǔ', 4: 'ù' },
  ü: { 1: 'ǖ', 2: 'ǘ', 3: 'ǚ', 4: 'ǜ' },
  v: { 1: 'ǖ', 2: 'ǘ', 3: 'ǚ', 4: 'ǜ' },
}

// Reverse mapping to normalize tone
const REVERSE_TONE_MAP: Record<string, { char: string; tone: 1 | 2 | 3 | 4 }> = {
  ā: { char: 'a', tone: 1 }, á: { char: 'a', tone: 2 }, ǎ: { char: 'a', tone: 3 }, à: { char: 'a', tone: 4 },
  ō: { char: 'o', tone: 1 }, ó: { char: 'o', tone: 2 }, ǒ: { char: 'o', tone: 3 }, ò: { char: 'o', tone: 4 },
  ē: { char: 'e', tone: 1 }, é: { char: 'e', tone: 2 }, ě: { char: 'e', tone: 3 }, è: { char: 'e', tone: 4 },
  ī: { char: 'i', tone: 1 }, í: { char: 'i', tone: 2 }, ǐ: { char: 'i', tone: 3 }, ì: { char: 'i', tone: 4 },
  ū: { char: 'u', tone: 1 }, ú: { char: 'u', tone: 2 }, ǔ: { char: 'u', tone: 3 }, ù: { char: 'u', tone: 4 },
  ǖ: { char: 'ü', tone: 1 }, ǘ: { char: 'ü', tone: 2 }, ǚ: { char: 'ü', tone: 3 }, ǜ: { char: 'ü', tone: 4 },
}

export interface ParsedPinyin {
  raw: string
  normalized: string
  initial: string
  final: string // written spelling, e.g. "u" in "yu"
  phoneticFinal: string // underlying final, e.g. "ü" in "yu", "iou" in "you"
  tone: 1 | 2 | 3 | 4 | 0
  toneVariants: {
    tone: 1 | 2 | 3 | 4
    pinyin: string
  }[]
  initialInfo?: InitialData
  finalInfo?: FinalData
  toneInfo: ToneData
}

// Generate the 4 tone variations for a syllable
export function generateToneVariants(initial: string, rawFinal: string): { tone: 1 | 2 | 3 | 4; pinyin: string }[] {
  // Input "v" (e.g. lv, nv) stands for ü
  const final = rawFinal.replace(/v/g, 'ü')
  // Determine which vowel gets the tone mark in pinyin rules:
  // Rule: a, o, e get it first. If 'iu' or 'ui', the second vowel gets it. Otherwise whichever comes first.
  let targetVowel = ''
  if (final.includes('a')) targetVowel = 'a'
  else if (final.includes('o')) targetVowel = 'o'
  else if (final.includes('e')) targetVowel = 'e'
  else if (final.includes('iu')) targetVowel = 'u'
  else if (final.includes('ui')) targetVowel = 'i'
  else if (final.includes('i')) targetVowel = 'i'
  else if (final.includes('u')) targetVowel = 'u'
  else if (final.includes('ü')) targetVowel = 'ü'

  const tones: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4]

  return tones.map((t) => {
    if (!targetVowel || !TONE_MARKS[targetVowel]) {
      return { tone: t, pinyin: `${initial}${final}` }
    }
    const markedVowel = TONE_MARKS[targetVowel][t]
    const markedFinal = final.replace(targetVowel, markedVowel)
    return {
      tone: t,
      pinyin: `${initial}${markedFinal}`,
    }
  })
}

// Spelling abbreviations -> full finals that exist as keys in FINALS_DATA
const FINAL_LOOKUP_ALIASES: Record<string, string> = {
  iou: 'iu',
  uei: 'ui',
  uen: 'un',
}

// Convert the written final (after the initial) into the underlying phonetic final
// e.g. ju -> ü, xue -> üe, you -> iou, wei -> uei, yan -> ian, wu -> u
function toPhoneticFinal(initial: string, spelled: string): string {
  if (initial === 'j' || initial === 'q' || initial === 'x') {
    return spelled.startsWith('u') ? `ü${spelled.slice(1)}` : spelled
  }
  if (initial === 'y') {
    if (spelled.startsWith('u')) return `ü${spelled.slice(1)}` // yu, yue, yuan, yun
    if (spelled.startsWith('i')) return spelled // yi, yin, ying
    if (spelled === 'ou') return 'iou'
    return `i${spelled}` // ya, ye, yao, yan, yang, yong
  }
  if (initial === 'w') {
    if (spelled.startsWith('u')) return spelled // wu
    if (spelled === 'ei') return 'uei'
    if (spelled === 'en') return 'uen'
    return `u${spelled}` // wa, wo, wai, wan, wang, weng
  }
  return spelled
}

// Look up articulation guide data for a phonetic final (undefined if not covered)
export function lookupFinalInfo(phoneticFinal: string): FinalData | undefined {
  return FINALS_DATA[phoneticFinal] || FINALS_DATA[FINAL_LOOKUP_ALIASES[phoneticFinal] || '']
}

// Real syllables used to play a bare final (a final alone like "ing" or "ün" is not a valid audio syllable)
const FINAL_SAMPLE_SYLLABLES: Record<string, string> = {
  i: 'yi', u: 'wu', ü: 'yu',
  ia: 'ya', ie: 'ye', iao: 'yao', iu: 'you', iou: 'you',
  ian: 'yan', in: 'yin', iang: 'yang', ing: 'ying', iong: 'yong',
  ua: 'wa', uo: 'wo', uai: 'wai', ui: 'wei', uei: 'wei',
  uan: 'wan', un: 'wen', uen: 'wen', uang: 'wang', ueng: 'weng',
  üe: 'yue', üan: 'yuan', ün: 'yun',
  ong: 'hong',
}

// Get a toned, playable syllable demonstrating a final (e.g. "ing" -> "yīng")
export function getFinalSampleSyllable(final: string, tone: 1 | 2 | 3 | 4 = 1): string {
  const key = final.replace(/v/g, 'ü')
  const syllable = FINAL_SAMPLE_SYLLABLES[key] || key
  const parsed = parsePinyin(syllable)
  return parsed.toneVariants[tone - 1]?.pinyin || syllable
}

// Parse a pinyin string (e.g., "hǎo", "zhōng", "nǚ", "rén", "ài")
export function parsePinyin(pinyin: string): ParsedPinyin {
  const clean = pinyin.trim().toLowerCase()
  let tone: 1 | 2 | 3 | 4 | 0 = 0
  let normalized = ''

  // Strip tone and detect tone number
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    if (REVERSE_TONE_MAP[char]) {
      tone = REVERSE_TONE_MAP[char].tone
      normalized += REVERSE_TONE_MAP[char].char
    } else {
      normalized += char
    }
  }

  // Input "v" (lv, nv) stands for ü
  normalized = normalized.replace(/v/g, 'ü')

  // Common initials in descending order of length to match "zh", "ch", "sh" first
  const initialCandidates = [
    'zh', 'ch', 'sh',
    'b', 'p', 'm', 'f',
    'd', 't', 'n', 'l',
    'g', 'k', 'h',
    'j', 'q', 'x',
    'z', 'c', 's',
    'r', 'w', 'y',
  ]

  let initial = ''
  let final = normalized

  for (const candidate of initialCandidates) {
    if (normalized.startsWith(candidate)) {
      initial = candidate
      final = normalized.slice(candidate.length)
      break
    }
  }

  // "final" keeps the written spelling (e.g. "u" in "yu"); phoneticFinal is the real sound (e.g. "ü")
  const phoneticFinal = toPhoneticFinal(initial, final)

  const initialInfo = initial ? INITIALS_DATA[initial] : undefined
  const finalInfo = lookupFinalInfo(phoneticFinal)

  const toneInfo = TONES_DATA[tone] || TONES_DATA[0]
  const toneVariants = generateToneVariants(initial, final)

  return {
    raw: pinyin,
    normalized,
    initial,
    final,
    phoneticFinal,
    tone,
    toneVariants,
    initialInfo,
    finalInfo,
    toneInfo,
  }
}

// Standard Chinese Pinyin Syllables for Matrix Grid
export const PINYIN_INITIALS_LIST = [
  'b', 'p', 'm', 'f',
  'd', 't', 'n', 'l',
  'g', 'k', 'h',
  'j', 'q', 'x',
  'zh', 'ch', 'sh', 'r',
  'z', 'c', 's',
  'y', 'w',
] as const

export const PINYIN_FINALS_LIST = [
  'a', 'o', 'e', 'i', 'u', 'ü',
  'ai', 'ei', 'ao', 'ou',
  'ia', 'ie', 'ua', 'uo', 'üe',
  'iao', 'iu', 'uai', 'ui',
  'an', 'en', 'in', 'un', 'ün',
  'ang', 'eng', 'ing', 'ong',
  'ian', 'iang', 'iong',
  'uan', 'uang', 'ueng',
  'er',
] as const

// Commonly used authentic syllables matrix map (subset of ~400 standard valid mandarin syllables)
export const VALID_SYLLABLES: Set<string> = new Set([
  'ba', 'bo', 'bai', 'bei', 'bao', 'ban', 'ben', 'bang', 'beng', 'bi', 'bie', 'biao', 'bian', 'bin', 'bing', 'bu',
  'pa', 'po', 'pai', 'pei', 'pao', 'pou', 'pan', 'pen', 'pang', 'peng', 'pi', 'pie', 'piao', 'pian', 'pin', 'ping', 'pu',
  'ma', 'mo', 'me', 'mai', 'mei', 'mao', 'mou', 'man', 'men', 'mang', 'meng', 'mi', 'mie', 'miao', 'miu', 'mian', 'min', 'ming', 'mu',
  'fa', 'fo', 'fei', 'fou', 'fan', 'fen', 'fang', 'feng', 'fu',
  'da', 'de', 'dai', 'dei', 'dao', 'dou', 'dan', 'den', 'dang', 'deng', 'di', 'die', 'diao', 'diu', 'dian', 'ding', 'du', 'duo', 'dui', 'duan', 'dun', 'dong',
  'ta', 'te', 'tai', 'tao', 'tou', 'tan', 'tang', 'teng', 'ti', 'tie', 'tiao', 'tian', 'ting', 'tu', 'tuo', 'tui', 'tuan', 'tun', 'tong',
  'na', 'ne', 'nai', 'nei', 'nao', 'nou', 'nan', 'nen', 'nang', 'neng', 'ni', 'nie', 'niao', 'niu', 'nian', 'nin', 'niang', 'ning', 'nu', 'nuo', 'nuan', 'nong', 'nü', 'nüe',
  'la', 'le', 'lai', 'lei', 'lao', 'lou', 'lan', 'lang', 'leng', 'li', 'lia', 'lie', 'liao', 'liu', 'lian', 'lin', 'liang', 'ling', 'lu', 'luo', 'luan', 'lun', 'long', 'lü', 'lüe',
  'ga', 'ge', 'gai', 'gei', 'gao', 'gou', 'gan', 'gen', 'gang', 'geng', 'gu', 'gua', 'guo', 'guai', 'gui', 'guan', 'gun', 'gong', 'guang',
  'ka', 'ke', 'kai', 'kei', 'kao', 'kou', 'kan', 'ken', 'kang', 'keng', 'ku', 'kua', 'kuo', 'kuai', 'kui', 'kuan', 'kun', 'kong', 'kuang',
  'ha', 'he', 'hai', 'hei', 'hao', 'hou', 'han', 'hen', 'hang', 'heng', 'hu', 'hua', 'huo', 'huai', 'hui', 'huan', 'hun', 'hong', 'huang',
  'ji', 'jia', 'jie', 'jiao', 'jiu', 'jian', 'jin', 'jiang', 'jing', 'jiong', 'ju', 'jue', 'juan', 'jun',
  'qi', 'qia', 'qie', 'qiao', 'qiu', 'qian', 'qin', 'qiang', 'qing', 'qiong', 'qu', 'que', 'quan', 'qun',
  'xi', 'xia', 'xie', 'xiao', 'xiu', 'xian', 'xin', 'xiang', 'xing', 'xiong', 'xu', 'xue', 'xuan', 'xun',
  'zha', 'zhe', 'zhi', 'zhai', 'zhei', 'zhao', 'zhou', 'zhan', 'zhen', 'zhang', 'zheng', 'zhu', 'zhua', 'zhuo', 'zhuai', 'zhui', 'zhuan', 'zhun', 'zhong', 'zhuang',
  'cha', 'che', 'chi', 'chai', 'chao', 'chou', 'chan', 'chen', 'chang', 'cheng', 'chu', 'chua', 'chuo', 'chuai', 'chui', 'chuan', 'chun', 'chong', 'chuang',
  'sha', 'she', 'shi', 'shai', 'shei', 'shao', 'shou', 'shan', 'shen', 'shang', 'sheng', 'shu', 'shua', 'shuo', 'shuai', 'shui', 'shuan', 'shun', 'shuang',
  're', 'ri', 'rao', 'rou', 'ran', 'ren', 'rang', 'reng', 'ru', 'rua', 'ruo', 'rui', 'ruan', 'run', 'rong',
  'za', 'ze', 'zi', 'zai', 'zei', 'zao', 'zou', 'zan', 'zen', 'zang', 'zeng', 'zu', 'zuo', 'zui', 'zuan', 'zun', 'zong',
  'ca', 'ce', 'ci', 'cai', 'cao', 'cou', 'can', 'cen', 'cang', 'ceng', 'cu', 'cuo', 'cui', 'cuan', 'cun', 'cong',
  'sa', 'se', 'si', 'sai', 'sao', 'sou', 'san', 'sen', 'sang', 'seng', 'su', 'suo', 'sui', 'suan', 'sun', 'song',
  'ya', 'yo', 'ye', 'yi', 'yao', 'you', 'yan', 'yin', 'yang', 'ying', 'yong', 'yu', 'yue', 'yuan', 'yun',
  'wa', 'wo', 'wu', 'wai', 'wei', 'wan', 'wen', 'wang', 'weng',
  'a', 'o', 'e', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'er',
])
