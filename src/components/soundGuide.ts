// Beginner pronunciation guide for Vietnamese learners: one entry per pinyin initial and final.
// Written to answer "what do I DO with my mouth", leading with Vietnamese sounds the learner already has.
// Technical terms (IPA, manner of articulation) stay in pinyinData.ts and are shown only on demand.

/** Which single articulator the diagram highlights. */
export type Focus =
  | 'lips' // hai môi (b p m)
  | 'lipteeth' // răng trên + môi dưới (f)
  | 'ridge' // đầu lưỡi chạm lợi trên (d t n l, -n cuối)
  | 'teeth' // đầu lưỡi phẳng sau răng cửa trên (z c s, -i sau z c s)
  | 'curl' // đầu lưỡi cong lên (zh ch sh r, -i sau zh ch sh r)
  | 'rcolour' // lưỡi cong lơ lửng, không chạm (er)
  | 'blade' // đầu lưỡi tì răng dưới, mặt lưỡi nâng (j q x, i, ü)
  | 'back' // cuống lưỡi nâng (g k h, -ng cuối)
  | 'low' // lưỡi hạ thấp, miệng mở (a)
  | 'backvowel' // lưỡi lùi, nâng phía sau (u, o, e)

export type LipShape = 'closed' | 'teeth' | 'round' | 'spread' | 'open' | 'relaxed'

export interface Pair {
  /** Toned pinyin syllables that differ only in the sound being taught; each one is playable. */
  items: { py: string; hanzi: string; vi: string }[]
  note: string
}

export interface SoundGuideEntry {
  /** Symbol shown in the header (e.g. "-i" for zhi/zi). */
  symbol: string
  title: string
  /** Headline: the closest Vietnamese sound, in plain words. */
  like: string
  /** 2–3 concrete actions. */
  steps: string[]
  /** A way to check yourself (paper, hand, mirror). */
  tip?: string
  /** The typical Vietnamese-speaker mistake. */
  mistake?: string
  pairs?: Pair[]
  focus: Focus
  /** Short plain-word caption for the highlighted articulator. */
  focusLabel: string
  lips: LipShape
  aspirated?: boolean
  voiced?: boolean
  nasal?: boolean
  ipa: string
}

const P = (py: string, hanzi: string, vi: string) => ({ py, hanzi, vi })

// Reused contrast sets
const B_P: Pair = { items: [P('bà', '爸', 'bố'), P('pà', '怕', 'sợ')], note: 'Cùng mím môi. b: không có hơi. p: bật mạnh một luồng hơi.' }
const D_T: Pair = { items: [P('dā', '搭', 'dựng'), P('tā', '他', 'anh ấy')], note: 'Cùng chỗ đặt lưỡi. d: không có hơi. t: bật hơi.' }
const G_K_H: Pair = { items: [P('gē', '哥', 'anh trai'), P('kē', '科', 'khoa'), P('hē', '喝', 'uống')], note: 'g: "c" nhẹ. k: "c" + bật hơi. h: "kh" (xì ở họng, không chặn).' }
const N_L: Pair = { items: [P('nǐ', '你', 'bạn'), P('lǐ', '里', 'trong')], note: 'n: hơi đi ra mũi. l: hơi đi hai bên lưỡi.' }
const J_Q_X: Pair = { items: [P('jī', '鸡', 'gà'), P('qī', '七', 'bảy'), P('xī', '西', 'tây')], note: 'Cùng một chỗ lưỡi. j: không hơi. q: bật hơi. x: xì liên tục.' }
const Z_C_S: Pair = { items: [P('zī', '资', 'vốn'), P('cī', '疵', 'vết'), P('sī', '丝', 'tơ')], note: 'Lưỡi phẳng sau răng trên. z: "ts" nhẹ. c: "ts" + bật hơi. s: "x".' }
const ZH_CH_SH_R: Pair = { items: [P('zhī', '知', 'biết'), P('chī', '吃', 'ăn'), P('shī', '诗', 'thơ'), P('rì', '日', 'ngày')], note: 'Cùng cong đầu lưỡi. zh: không hơi. ch: bật hơi. sh: xì. r: như sh nhưng có tiếng, cổ rung.' }
const PLACE_Z: Pair = { items: [P('zī', '资', 'vốn'), P('zhī', '知', 'biết'), P('jī', '鸡', 'gà')], note: 'Ba chỗ lưỡi khác nhau: z lưỡi phẳng sau răng trên, zh lưỡi cong lên, j đầu lưỡi giấu sau răng dưới. Chỉ nghe phụ âm; phần "i" khác nhau là bình thường.' }
const PLACE_C: Pair = { items: [P('cí', '词', 'từ'), P('chí', '迟', 'muộn'), P('qí', '骑', 'cưỡi')], note: 'Cả ba đều bật hơi; chỉ khác chỗ đặt lưỡi: c phẳng, ch cong, q giấu sau răng dưới. Phần "i" khác nhau là bình thường.' }
const PLACE_S: Pair = { items: [P('sī', '丝', 'tơ'), P('shī', '诗', 'thơ'), P('xī', '西', 'tây')], note: 's ≈ "x" tiếng Việt. sh: lưỡi cong (giống "s" uốn lưỡi của giọng Trung/Nam). x: lưỡi giấu sau răng dưới, môi dẹt. Phần "i" khác nhau là bình thường.' }
const U_UE: Pair = { items: [P('nǔ', '努', 'cố gắng'), P('nǚ', '女', 'nữ')], note: 'u: lưỡi lùi sau. ü: lưỡi như "i", chỉ có môi tròn (tiếng Việt không có âm này).' }
const AN_ANG: Pair = { items: [P('bān', '班', 'lớp'), P('bāng', '帮', 'giúp')], note: '-n: kết thúc bằng đầu lưỡi. -ng: kết thúc bằng cuống lưỡi.' }
const EN_ENG: Pair = { items: [P('fēn', '分', 'phút'), P('fēng', '风', 'gió')], note: 'en ≈ "ân", eng ≈ "âng".' }
const IN_ING: Pair = { items: [P('xīn', '新', 'mới'), P('xīng', '星', 'sao')], note: 'in: kết thúc bằng đầu lưỡi. ing: đọc "i" rồi "ng" cuối lưỡi (giọng Bắc "inh" gần đúng; giọng Nam "inh" nghe như "in" nên dễ lẫn).' }
const IAN_IANG: Pair = { items: [P('xiān', '先', 'trước'), P('xiāng', '香', 'thơm')], note: 'ian ≈ "iên". iang = "i" + "ang", giữ rõ chữ a.' }
const UAN_UANG: Pair = { items: [P('chuán', '船', 'thuyền'), P('chuáng', '床', 'giường')], note: 'uan ≈ "oan", uang ≈ "oang".' }
const SHI_XI: Pair = { items: [P('shī', '诗', 'thơ'), P('xī', '西', 'tây')], note: 'shi: lưỡi cong, nghe "sư" với s uốn lưỡi. xi: lưỡi giấu sau răng dưới, nghe "xi" mỏng.' }
const ZI_JI: Pair = { items: [P('zì', '字', 'chữ'), P('jì', '记', 'nhớ')], note: 'zi nghe như "tsư", không phải "chi". ji mới là "chi".' }

const PAPER = 'Cầm một tờ giấy mỏng (hoặc đặt mu bàn tay) cách miệng khoảng một nắm tay. Âm bật hơi làm giấy rung rõ; âm không bật hơi thì giấy gần như đứng yên.'
const THROAT = 'Đặt ngón tay lên cổ họng: phụ âm này KHÔNG làm cổ rung. Nếu thấy rung là bạn đang đọc kiểu "b, đ, g, d" tiếng Việt.'
const NOSE = 'Bịt mũi lại rồi đọc: âm mũi sẽ bị nghẹt hẳn. Đó là dấu hiệu hơi đang đi đúng qua mũi.'

export const INITIAL_GUIDE: Record<string, SoundGuideEntry> = {
  b: {
    symbol: 'b', title: 'Phụ âm b', ipa: '[p]',
    like: 'Đọc như "p" tiếng Việt (như trong "pin", "pa-tê"), KHÔNG phải "b".',
    steps: ['Mím hai môi lại.', 'Mở môi ra nhẹ nhàng: không thổi hơi, không rung cổ.'],
    tip: THROAT,
    mistake: 'Đọc thành "b" tiếng Việt (rung cổ, hơi như nuốt vào). bà (爸) phải nghe như "pà" nhẹ.',
    pairs: [B_P], focus: 'lips', focusLabel: 'Hai môi', lips: 'closed', aspirated: false, voiced: false,
  },
  p: {
    symbol: 'p', title: 'Phụ âm p', ipa: '[pʰ]',
    like: '"p" kèm một luồng hơi: như nói "p" rồi thổi "hờ" ngay sau, dính liền.',
    steps: ['Mím hai môi, giữ hơi lại sau môi.', 'Bật môi ra cho hơi phụt mạnh ra ngoài, như thổi tắt nến.'],
    tip: PAPER,
    mistake: 'Đọc như "p" tiếng Việt (không có hơi): người Trung sẽ nghe thành b. pà (怕 sợ) thành bà (爸 bố).',
    pairs: [B_P], focus: 'lips', focusLabel: 'Hai môi', lips: 'closed', aspirated: true, voiced: false,
  },
  m: {
    symbol: 'm', title: 'Phụ âm m', ipa: '[m]',
    like: 'Giống hệt "m" tiếng Việt (mẹ, má).',
    steps: ['Mím hai môi.', 'Cho tiếng đi ra đằng mũi, cổ rung.'],
    tip: NOSE,
    focus: 'lips', focusLabel: 'Hai môi', lips: 'closed', aspirated: false, voiced: true, nasal: true,
  },
  f: {
    symbol: 'f', title: 'Phụ âm f', ipa: '[f]',
    like: 'Giống "ph" tiếng Việt (phở, phải).',
    steps: ['Đặt răng cửa trên chạm nhẹ lên môi dưới.', 'Thổi hơi qua khe giữa răng và môi.'],
    tip: 'Soi gương: phải thấy răng trên chạm môi dưới, hai môi không mím vào nhau.',
    mistake: 'Mím cả hai môi nên nghe thành "p/b". Một số người lẫn f với h: fēi (飞 bay) khác hēi (黑 đen).',
    pairs: [{ items: [P('fēi', '飞', 'bay'), P('hēi', '黑', 'đen')], note: 'f: răng chạm môi. h: xì ở cuống lưỡi, môi không làm gì.' }],
    focus: 'lipteeth', focusLabel: 'Răng trên + môi dưới', lips: 'teeth', aspirated: false, voiced: false,
  },
  d: {
    symbol: 'd', title: 'Phụ âm d', ipa: '[t]',
    like: 'Đọc như "t" tiếng Việt (tôi, ta), KHÔNG phải "đ" hay "d".',
    steps: ['Đầu lưỡi chạm phần lợi ngay sau răng cửa trên.', 'Bật lưỡi xuống nhẹ: không thổi hơi, không rung cổ.'],
    tip: THROAT,
    mistake: 'Đọc thành "đ" tiếng Việt (rung cổ) hoặc "d/z". dà (大) phải nghe như "tà" nhẹ, không phải "đà".',
    pairs: [D_T], focus: 'ridge', focusLabel: 'Đầu lưỡi chạm lợi trên', lips: 'relaxed', aspirated: false, voiced: false,
  },
  t: {
    symbol: 't', title: 'Phụ âm t', ipa: '[tʰ]',
    like: 'Gần "th" tiếng Việt (thơ, thầy): "t" kèm một luồng hơi, bật mạnh và rõ hơn "th" thường ngày.',
    steps: ['Đầu lưỡi chạm lợi ngay sau răng cửa trên.', 'Bật lưỡi xuống cho hơi phụt ra mạnh.'],
    tip: PAPER,
    mistake: 'Đọc thành "t" tiếng Việt (không có hơi): người Trung nghe thành d. tā (他) phải nghe như "tha".',
    pairs: [D_T], focus: 'ridge', focusLabel: 'Đầu lưỡi chạm lợi trên', lips: 'relaxed', aspirated: true, voiced: false,
  },
  n: {
    symbol: 'n', title: 'Phụ âm n', ipa: '[n]',
    like: 'Giống "n" tiếng Việt (nón, nam).',
    steps: ['Đầu lưỡi chạm lợi sau răng cửa trên.', 'Cho tiếng đi ra mũi, cổ rung.'],
    tip: NOSE,
    mistake: 'Ai hay lẫn "n/l" cần chú ý: nǐ (你 bạn) khác lǐ (里 trong).',
    pairs: [N_L], focus: 'ridge', focusLabel: 'Đầu lưỡi chạm lợi trên', lips: 'relaxed', aspirated: false, voiced: true, nasal: true,
  },
  l: {
    symbol: 'l', title: 'Phụ âm l', ipa: '[l]',
    like: 'Giống "l" tiếng Việt (làm, lá).',
    steps: ['Đầu lưỡi chạm lợi sau răng cửa trên.', 'Cho hơi đi ra hai bên lưỡi, cổ rung.'],
    tip: 'Bịt mũi lại vẫn đọc "l" bình thường được (khác "n" bị nghẹt).',
    mistake: 'Ai hay lẫn "n/l" cần chú ý: lán (蓝 xanh lam) khác nán (难 khó).',
    pairs: [N_L], focus: 'ridge', focusLabel: 'Đầu lưỡi chạm lợi trên', lips: 'relaxed', aspirated: false, voiced: true,
  },
  g: {
    symbol: 'g', title: 'Phụ âm g', ipa: '[k]',
    like: 'Đọc như "c/k" tiếng Việt (cá, kém), KHÔNG phải "g".',
    steps: ['Nâng cuống lưỡi (phần lưỡi phía trong) chặn lên vòm miệng phía trong.', 'Bật ra nhẹ: không thổi hơi, không rung cổ.'],
    tip: THROAT,
    mistake: 'Đọc thành "g" tiếng Việt (gà): rung cổ và có tiếng "gờ" xát. gē (哥) phải nghe như "cơ" nhẹ.',
    pairs: [G_K_H], focus: 'back', focusLabel: 'Cuống lưỡi chặn phía trong', lips: 'relaxed', aspirated: false, voiced: false,
  },
  k: {
    symbol: 'k', title: 'Phụ âm k', ipa: '[kʰ]',
    like: 'Như "c" tiếng Việt kèm một luồng hơi mạnh. KHÔNG phải "kh".',
    steps: ['Cuống lưỡi chặn lên vòm miệng phía trong, giống g.', 'Bật ra cho hơi phụt mạnh.'],
    tip: PAPER,
    mistake: 'Đọc thành "kh" tiếng Việt (khá): "kh" là tiếng xì không chặn, còn k là chặn rồi bật hơi. Hoặc đọc "c" mà quên hơi → nghe thành g.',
    pairs: [G_K_H], focus: 'back', focusLabel: 'Cuống lưỡi chặn phía trong', lips: 'relaxed', aspirated: true, voiced: false,
  },
  h: {
    symbol: 'h', title: 'Phụ âm h', ipa: '[x]',
    like: 'Gần như "kh" tiếng Việt (khá, khô): cùng là tiếng xì ở cuống lưỡi. KHÔNG phải "h".',
    steps: ['Nâng cuống lưỡi lại gần vòm phía trong, nhưng không chạm.', 'Thổi hơi qua khe hẹp đó, nghe tiếng xì ở họng.'],
    mistake: 'Đọc "h" tiếng Việt (chỉ là hơi thở). hǎo (好) nghe gần "khảo", không phải "hảo".',
    pairs: [G_K_H], focus: 'back', focusLabel: 'Cuống lưỡi (không chạm)', lips: 'relaxed', aspirated: false, voiced: false,
  },
  j: {
    symbol: 'j', title: 'Phụ âm j', ipa: '[tɕ]',
    like: 'Gần "ch" tiếng Việt (chị, chè; giọng Bắc gần trùng), môi kéo dẹt như đang cười.',
    steps: ['Đầu lưỡi tì vào chân răng dưới, KHÔNG cong lên.', 'Áp mặt lưỡi (phần giữa) lên vòm miệng trên.', 'Bật ra nhẹ, không thổi hơi.'],
    tip: 'Soi gương khi đọc "jī": thấy đầu lưỡi nấp sau răng dưới là đúng.',
    mistake: 'Đọc thành "gi/d" tiếng Việt (rung cổ), hoặc cong lưỡi lên như zh.',
    pairs: [J_Q_X, PLACE_Z], focus: 'blade', focusLabel: 'Mặt lưỡi áp vòm, đầu lưỡi sau răng dưới', lips: 'spread', aspirated: false, voiced: false,
  },
  q: {
    symbol: 'q', title: 'Phụ âm q', ipa: '[tɕʰ]',
    like: 'Như j ("ch" tiếng Việt) nhưng bật mạnh một luồng hơi; tiếng Việt không có "ch" bật hơi. KHÔNG đọc "qu/cu".',
    steps: ['Đặt lưỡi y như j: đầu lưỡi sau răng dưới, mặt lưỡi áp vòm.', 'Bật ra cho hơi phụt mạnh, môi dẹt.'],
    tip: PAPER,
    mistake: 'Đọc theo chữ Việt thành "qu/cu" (qù 去 đọc "quy" là sai), hoặc quên bật hơi nên nghe thành j.',
    pairs: [J_Q_X, PLACE_C], focus: 'blade', focusLabel: 'Mặt lưỡi áp vòm, đầu lưỡi sau răng dưới', lips: 'spread', aspirated: true, voiced: false,
  },
  x: {
    symbol: 'x', title: 'Phụ âm x', ipa: '[ɕ]',
    like: 'Gần "x" tiếng Việt khi nói "xi", nhưng mặt lưỡi nâng sát vòm miệng, môi dẹt, đầu lưỡi giấu sau răng dưới nên tiếng xì "mỏng" hơn. Không uốn lưỡi.',
    steps: ['Đầu lưỡi tì chân răng dưới.', 'Nâng mặt lưỡi sát vòm trên (không chạm) rồi thổi hơi qua.', 'Kéo hai khoé môi sang ngang như cười.'],
    tip: 'So sánh với s: đọc "sī" đầu lưỡi để sát sau răng trên, đọc "xī" lưỡi nấp sau răng dưới.',
    mistake: 'Uốn lưỡi thành sh, hoặc đặt đầu lưỡi ở răng trên thành s.',
    pairs: [J_Q_X, PLACE_S], focus: 'blade', focusLabel: 'Mặt lưỡi gần vòm, đầu lưỡi sau răng dưới', lips: 'spread', aspirated: false, voiced: false,
  },
  zh: {
    symbol: 'zh', title: 'Phụ âm zh', ipa: '[ʈʂ]',
    like: 'Gần "tr" uốn lưỡi (giọng Trung/Nam: trà, trăng) nhưng sau khi bật còn thêm tiếng xì ngắn ở đầu lưỡi. Không bật hơi.',
    steps: ['Cong đầu lưỡi lên, chạm vòm miệng ngay sau chỗ lợi gồ lên.', 'Bật ra nhẹ, không thổi hơi.'],
    tip: 'Dò bằng lưỡi: chạm sau răng cửa trên, lùi dần lên đến khi thấy vòm miệng bắt đầu cao lên. Đó là chỗ đặt đầu lưỡi.',
    mistake: 'Đọc phẳng thành "ch" (giọng Bắc đọc tr = ch, nên cần cố ý cong lưỡi): zhī (知 biết) bị nghe thành jī hoặc zī.',
    pairs: [ZH_CH_SH_R, PLACE_Z], focus: 'curl', focusLabel: 'Đầu lưỡi cong lên', lips: 'relaxed', aspirated: false, voiced: false,
  },
  ch: {
    symbol: 'ch', title: 'Phụ âm ch', ipa: '[ʈʂʰ]',
    like: 'Như zh (gần "tr" uốn lưỡi) nhưng bật mạnh một luồng hơi; tiếng Việt không có âm này. KHÔNG phải "ch" tiếng Việt.',
    steps: ['Cong đầu lưỡi lên như zh.', 'Bật ra cho hơi phụt mạnh.'],
    tip: PAPER,
    mistake: 'Đọc theo chữ Việt thành "ch": sai cả hai điểm (không uốn lưỡi, không bật hơi). chī (吃 ăn) ≠ "chi".',
    pairs: [ZH_CH_SH_R, PLACE_C], focus: 'curl', focusLabel: 'Đầu lưỡi cong lên', lips: 'relaxed', aspirated: true, voiced: false,
  },
  sh: {
    symbol: 'sh', title: 'Phụ âm sh', ipa: '[ʂ]',
    like: 'Gần "s" uốn lưỡi của giọng Trung/Nam (sông, sâu). Giọng Bắc đọc s = x nên cần cố ý cong lưỡi.',
    steps: ['Cong đầu lưỡi lên như zh nhưng không chạm hẳn.', 'Thổi hơi qua khe hẹp đó.'],
    mistake: 'Đọc thành "x" (giọng Bắc đọc s = x, không cong lưỡi): shī (诗 thơ) nghe thành sī (丝 tơ).',
    pairs: [ZH_CH_SH_R, PLACE_S], focus: 'curl', focusLabel: 'Đầu lưỡi cong lên (không chạm)', lips: 'relaxed', aspirated: false, voiced: false,
  },
  r: {
    symbol: 'r', title: 'Phụ âm r', ipa: '[ʐ ~ ɻ]',
    like: 'Lưỡi cong như sh nhưng có tiếng, cổ rung: gần "r" của một số giọng miền Nam (rồi, rau), nhưng không rung đầu lưỡi.',
    steps: ['Đặt lưỡi y như sh (cong lên, không chạm).', 'Phát ra tiếng cho cổ rung, xì nhẹ hơn sh. Không rung đầu lưỡi.'],
    mistake: 'Đọc "r" giọng Bắc (giống "d/gi": rén 人 thành "dân"), hoặc rung đầu lưỡi như "r" tiếng Nga.',
    pairs: [{ items: [P('shì', '是', 'là'), P('rì', '日', 'ngày')], note: 'Cùng chỗ lưỡi. sh: chỉ có hơi. r: có tiếng, cổ rung.' }, ZH_CH_SH_R],
    focus: 'curl', focusLabel: 'Đầu lưỡi cong lên (không chạm)', lips: 'relaxed', aspirated: false, voiced: true,
  },
  z: {
    symbol: 'z', title: 'Phụ âm z', ipa: '[ts]',
    like: 'Như "t" và "x" dính liền thành một tiếng "ts" (giống "ts" trong "pizza"). Tiếng Việt không có âm này.',
    steps: ['Đầu lưỡi phẳng, chạm mặt sau răng cửa trên.', 'Nhả ra thành tiếng "ts" ngắn: không thổi hơi, không rung cổ.'],
    tip: THROAT,
    mistake: 'Đọc theo chữ thành "d/z" tiếng Việt (rung cổ), hoặc thành "ch". zài (在) không đọc "dai".',
    pairs: [Z_C_S, PLACE_Z], focus: 'teeth', focusLabel: 'Đầu lưỡi phẳng sau răng trên', lips: 'relaxed', aspirated: false, voiced: false,
  },
  c: {
    symbol: 'c', title: 'Phụ âm c', ipa: '[tsʰ]',
    like: 'Tiếng "ts" (như z) nhưng bật mạnh một luồng hơi. KHÔNG đọc "c/k".',
    steps: ['Đầu lưỡi phẳng chạm sau răng cửa trên, như z.', 'Nhả ra cho hơi phụt mạnh qua kẽ răng.'],
    tip: PAPER,
    mistake: 'Đọc theo chữ Việt thành "c/k": cài (菜 món ăn) đọc "cài" là sai. Hoặc đọc thành "th", "x".',
    pairs: [Z_C_S, PLACE_C], focus: 'teeth', focusLabel: 'Đầu lưỡi phẳng sau răng trên', lips: 'relaxed', aspirated: true, voiced: false,
  },
  s: {
    symbol: 's', title: 'Phụ âm s', ipa: '[s]',
    like: 'Đọc như "x" tiếng Việt (xa, xinh), KHÔNG uốn lưỡi.',
    steps: ['Đầu lưỡi phẳng, để gần mặt sau răng cửa trên.', 'Thổi hơi qua kẽ răng, nghe tiếng xì.'],
    mistake: 'Đọc thành "s" uốn lưỡi theo chữ: sān (三 ba) phải nghe như "xan".',
    pairs: [Z_C_S, PLACE_S], focus: 'teeth', focusLabel: 'Đầu lưỡi phẳng sau răng trên', lips: 'relaxed', aspirated: false, voiced: false,
  },
  y: {
    symbol: 'y', title: 'Chữ y (đầu vần i, ü)', ipa: '[j], [ɥ]',
    like: 'Chỉ là cách viết khi vần bắt đầu bằng i hoặc ü: yī đọc "i", yě đọc "yể" (i + ê), yú đọc "ü".',
    steps: ['Đọc ngay nguyên âm i (hoặc ü) phía sau.', 'Không thêm phụ âm nào ở đầu.'],
    mistake: 'Đọc thành "d/gi" tiếng Việt: yě (也) không đọc "dể".',
    focus: 'blade', focusLabel: 'Lưỡi như âm "i"', lips: 'spread', aspirated: false, voiced: true,
  },
  w: {
    symbol: 'w', title: 'Chữ w (đầu vần u)', ipa: '[w]',
    like: 'Chỉ là cách viết khi vần bắt đầu bằng u: wǔ đọc "ủ", wǒ đọc "uổ", wài đọc "oai".',
    steps: ['Chu tròn môi như bắt đầu đọc "u".', 'Lướt ngay sang nguyên âm phía sau.'],
    mistake: 'Đọc thành "v" tiếng Việt: wǒ (我) không đọc "vổ".',
    focus: 'backvowel', focusLabel: 'Môi tròn như "u"', lips: 'round', aspirated: false, voiced: true,
  },
}

const FRONT_N = 'Kết thúc: đặt đầu lưỡi lên lợi trên, giống "n" cuối tiếng Việt.'
const BACK_NG = 'Kết thúc: rút lưỡi về sau, cuống lưỡi chặn phía trong, giống "ng" cuối tiếng Việt.'

export const FINAL_GUIDE: Record<string, SoundGuideEntry> = {
  a: {
    symbol: 'a', title: 'Vần a', ipa: '[a]',
    like: 'Giống "a" tiếng Việt (ba, má).',
    steps: ['Há miệng rộng, lưỡi nằm thấp.'],
    focus: 'low', focusLabel: 'Miệng mở, lưỡi hạ thấp', lips: 'open',
  },
  o: {
    symbol: 'o', title: 'Vần o', ipa: '[wo] (≈ [uo])',
    like: 'Sau b, p, m, f chữ o là uo viết tắt: bō (波) nghe gần "puô", không phải "bo".',
    steps: ['Chu tròn môi.', 'Lướt rất nhanh "u" rồi sang "ô", môi vẫn tròn.'],
    mistake: 'Đọc thành "o" tiếng Việt (bò): miệng mở quá rộng, môi không tròn.',
    focus: 'backvowel', focusLabel: 'Môi tròn, lưỡi lùi sau', lips: 'round',
  },
  e: {
    symbol: 'e', title: 'Vần e', ipa: '[ɤ]',
    like: 'Gần "ơ" tiếng Việt, hơi lùi về phía "ư": lưỡi lùi sau, môi không tròn, đọc MỘT âm: hē (喝) ≈ "khơ". KHÔNG đọc "e" hay "ê".',
    steps: ['Miệng hé vừa, môi không tròn.', 'Lưỡi lùi về sau như khi đọc "ư/ơ".'],
    tip: 'Chữ e trong ie, üe, ei đọc là "ê"; trong en, eng đọc là "â".',
    mistake: 'Đọc theo chữ thành "e" (xe) hoặc "ê": hē (喝) thành "hê" là sai.',
    focus: 'backvowel', focusLabel: 'Lưỡi lùi sau, môi không tròn', lips: 'relaxed',
  },
  i: {
    symbol: 'i', title: 'Vần i', ipa: '[i]',
    like: 'Giống "i" tiếng Việt (đi, tí).',
    steps: ['Kéo khoé môi sang ngang như cười.', 'Nâng lưỡi cao về phía trước.'],
    mistake: 'Sau z, c, s, zh, ch, sh, r thì chữ i KHÔNG đọc "i" mà đọc gần "ư" (xem zi, zhi).',
    focus: 'blade', focusLabel: 'Lưỡi nâng cao phía trước', lips: 'spread',
  },
  '-i1': {
    symbol: '-i', title: 'Vần -i sau z, c, s', ipa: '[ɹ̩] (ɿ)',
    like: 'Nghe gần "ư" (thực ra là tiếng kéo dài của chính z/c/s): zì ≈ "tsư", cí ≈ "tsư" bật hơi, sì ≈ "xư". Không đọc "i".',
    steps: ['Đọc z, c hoặc s.', 'Giữ nguyên lưỡi ở sau răng trên, chỉ cho thêm tiếng, môi hơi dẹt.'],
    mistake: 'Đọc thành "i": zì (字 chữ) thành "chi", sì (四 bốn) thành "xi" là sai.',
    pairs: [ZI_JI, { items: [P('sì', '四', 'bốn'), P('xì', '戏', 'kịch')], note: 'si ≈ "xư", xi ≈ "xi".' }],
    focus: 'teeth', focusLabel: 'Lưỡi giữ nguyên sau răng trên', lips: 'spread',
  },
  '-i2': {
    symbol: '-i', title: 'Vần -i sau zh, ch, sh, r', ipa: '[ɻ̩] (ʅ)',
    like: 'Nghe gần "ư" uốn lưỡi (thực ra là tiếng kéo dài của zh/ch/sh/r): zhī ≈ "trư", chī ≈ "trư" bật hơi, shì ≈ "sư" (s uốn lưỡi), rì ≈ "rư".',
    steps: ['Đọc zh, ch, sh hoặc r.', 'Giữ nguyên lưỡi cong, chỉ cho thêm tiếng.'],
    mistake: 'Đọc thành "i": chī (吃 ăn) thành "chi", shì (是 là) thành "si" là sai.',
    pairs: [SHI_XI, { items: [P('zhī', '知', 'biết'), P('jī', '鸡', 'gà')], note: 'zhi ≈ "trư" (lưỡi cong). ji ≈ "chi".' }],
    focus: 'curl', focusLabel: 'Lưỡi giữ nguyên tư thế cong', lips: 'relaxed',
  },
  u: {
    symbol: 'u', title: 'Vần u', ipa: '[u]',
    like: 'Giống "u" tiếng Việt (thu, tu).',
    steps: ['Chu tròn môi, nhô ra trước.', 'Lưỡi lùi về sau.'],
    mistake: 'Sau j, q, x, y thì chữ u là ü (môi tròn, lưỡi như "i"): qù (去) không đọc "cù".',
    pairs: [U_UE], focus: 'backvowel', focusLabel: 'Môi tròn, lưỡi lùi sau', lips: 'round',
  },
  'ü': {
    symbol: 'ü', title: 'Vần ü', ipa: '[y]',
    like: 'Tiếng Việt không có âm này. Nói "i" rồi chu tròn môi, giữ nguyên lưỡi. Gần "uy" nhưng đọc thành MỘT âm.',
    steps: ['Đọc "i" thật dài.', 'Giữ nguyên lưỡi, từ từ chu tròn môi như huýt sáo.', 'Giữ môi tròn đến hết âm.'],
    tip: 'Soi gương: môi tròn từ đầu đến cuối. Nếu cuối âm môi bè ra là bạn đang đọc "uy" (hai âm).',
    mistake: 'Đọc "u-i" tách hai âm, hoặc thành "u". Sau j, q, x, y chữ ü viết là u: jù, qù, xū, yú vẫn đọc ü.',
    pairs: [U_UE, { items: [P('yú', '鱼', 'cá'), P('yí', '移', 'dời')], note: 'Lưỡi giống nhau, chỉ khác môi: ü tròn, i dẹt.' }],
    focus: 'blade', focusLabel: 'Lưỡi như "i" + môi tròn', lips: 'round',
  },
  ai: { symbol: 'ai', title: 'Vần ai', ipa: '[ai]', like: 'Giống "ai" tiếng Việt (hai, mai).', steps: ['Mở "a" rồi lướt nhanh sang "i".'], focus: 'low', focusLabel: 'Bắt đầu miệng mở', lips: 'open' },
  ei: { symbol: 'ei', title: 'Vần ei', ipa: '[ei]', like: '"ê-i" lướt nhanh (gần "ây"): hēi (黑) ≈ "khê-i".', steps: ['Đọc "ê" rồi lướt sang "i".'], mistake: 'Đọc theo chữ thành "e-i" với "e" mở như "xe".', focus: 'blade', focusLabel: 'Lưỡi nâng phía trước', lips: 'spread' },
  ao: { symbol: 'ao', title: 'Vần ao', ipa: '[au]', like: 'Giống "ao" tiếng Việt (bao, cao).', steps: ['Mở "a" rồi thu môi tròn dần.'], focus: 'low', focusLabel: 'Bắt đầu miệng mở', lips: 'open' },
  ou: { symbol: 'ou', title: 'Vần ou', ipa: '[ou]', like: '"ô-u" lướt nhanh (gần "âu"): shǒu (手) ≈ "sẩu" với s uốn lưỡi.', steps: ['Đọc "ô" ngắn rồi thu môi về "u".'], mistake: 'Đọc theo chữ thành "o-u" với "o" mở rộng.', focus: 'backvowel', focusLabel: 'Môi tròn', lips: 'round' },
  ia: { symbol: 'ia', title: 'Vần ia', ipa: '[ja]', like: '"i" ngắn rồi "a" rõ như "a" trong "ba": jiā (家) ≈ "ch-i-a", không đọc "chia".', steps: ['Bắt đầu bằng "i" ngắn.', 'Mở miệng rộng sang "a" thật rõ.'], mistake: 'Đọc như "ia" tiếng Việt (chia, tia) – chữ a bị đọc thành "ơ" yếu.', focus: 'low', focusLabel: 'Kết thúc miệng mở', lips: 'open' },
  io: { symbol: 'io', title: 'Vần io', ipa: '[jɔ]', like: '"i" lướt sang "ô": chỉ có trong thán từ yō (哟).', steps: ['Đọc "i" ngắn rồi chu môi sang "ô".'], focus: 'backvowel', focusLabel: 'Kết thúc môi tròn', lips: 'round' },
  ie: { symbol: 'ie', title: 'Vần ie', ipa: '[jɛ]', like: '"i" + "ê" (như "ê" trong "xê"): xiè (谢) ≈ "xi-ê". Khác "iê" tiếng Việt (tiên), vì cuối vần giữ "ê" chứ không trượt về "ơ".', steps: ['Đọc "i" rồi lướt sang "ê".'], mistake: 'Đọc theo chữ thành "i-e" với "e" mở như "xe".', focus: 'blade', focusLabel: 'Lưỡi nâng phía trước', lips: 'spread' },
  ua: { symbol: 'ua', title: 'Vần ua', ipa: '[wa]', like: 'Giống "oa" tiếng Việt: huā (花) ≈ "khoa".', steps: ['Chu môi "u" rồi mở rộng sang "a".'], mistake: 'Đọc theo chữ thành "ua" như "mua" (chữ a bị yếu).', focus: 'low', focusLabel: 'Kết thúc miệng mở', lips: 'open' },
  uo: { symbol: 'uo', title: 'Vần uo', ipa: '[wo]', like: '"u" + "ô": duō (多) ≈ "tuô", giữ "ô" tròn môi đến hết, không trượt về "ơ".', steps: ['Chu môi "u" rồi lướt sang "ô", môi vẫn tròn.'], focus: 'backvowel', focusLabel: 'Môi tròn', lips: 'round' },
  'üe': {
    symbol: 'üe', title: 'Vần üe', ipa: '[ɥɛ]',
    like: 'ü + "ê", gần "uyê": xué (学) ≈ "xuế" với môi tròn ngay từ đầu.',
    steps: ['Bắt đầu bằng ü (lưỡi như "i", môi tròn).', 'Lướt sang "ê".'],
    mistake: 'Sau j, q, x, y viết là "ue" nhưng vẫn đọc ü: xué không đọc "xu-e".',
    focus: 'blade', focusLabel: 'Bắt đầu: lưỡi như "i" + môi tròn', lips: 'round',
  },
  iao: { symbol: 'iao', title: 'Vần iao', ipa: '[jau]', like: '"i" + "ao" đọc liền một hơi: xiǎo (小) ≈ "x-i-ảo" nói nhanh.', steps: ['Đọc "i" ngắn.', 'Lướt sang "ao", nghe rõ chữ a.'], mistake: 'Đọc thành "iêu" (xiǎo thành "xiểu"): phải nghe rõ "ao".', focus: 'low', focusLabel: 'Giữa vần: miệng mở', lips: 'open' },
  iu: { symbol: 'iu', title: 'Vần iu (iou)', ipa: '[jou]', like: 'Viết tắt của "iou": "i" + "ôu" (ô lướt về u, gần "i-âu"): liù (六) ≈ "li-ôu". Ở thanh 1, 2 chữ ô rất nhẹ, nghe gần "iu".', steps: ['Đọc "i" ngắn.', 'Lướt sang "ôu", môi thu tròn ở cuối.'], mistake: 'Đọc "iu" cụt như tiếng Việt (dịu), mất chữ o ẩn ở giữa.', focus: 'backvowel', focusLabel: 'Kết thúc môi tròn', lips: 'round' },
  uai: { symbol: 'uai', title: 'Vần uai', ipa: '[wai]', like: 'Giống "oai" tiếng Việt: kuài (快) ≈ "coai" với k bật hơi (không phải "khoai").', steps: ['Chu môi "u", mở sang "a", kết thúc ở "i".'], focus: 'low', focusLabel: 'Giữa vần: miệng mở', lips: 'open' },
  ui: { symbol: 'ui', title: 'Vần ui (uei)', ipa: '[wei]', like: 'Viết tắt của "uei": gần "uây" tiếng Việt: shuǐ (水) ≈ "suẩy" uốn lưỡi. Ở thanh 1, 2 chữ ê rất nhẹ, nghe gần "ui".', steps: ['Chu môi "u".', 'Lướt qua "ê" rồi kết thúc ở "i".'], mistake: 'Đọc như "ui" tiếng Việt (túi): thiếu chữ "ê" ở giữa.', focus: 'blade', focusLabel: 'Kết thúc lưỡi nâng trước', lips: 'round' },
  an: { symbol: 'an', title: 'Vần an', ipa: '[an]', like: 'Giống "an" tiếng Việt (lan, can).', steps: ['Mở "a".', FRONT_N], mistake: 'Lẫn với ang. Lưu ý: ian/yan đọc "iên" (tiān, yān), không đọc "an".', pairs: [AN_ANG], focus: 'ridge', focusLabel: 'Kết thúc: đầu lưỡi chạm lợi', lips: 'open', nasal: true },
  en: { symbol: 'en', title: 'Vần en', ipa: '[ən]', like: 'Giống "ân" tiếng Việt: rén (人) ≈ "rấn", fēn (分) ≈ "phân".', steps: ['Đọc "â" ngắn.', FRONT_N], mistake: 'Đọc theo chữ thành "en" (khen).', pairs: [EN_ENG], focus: 'ridge', focusLabel: 'Kết thúc: đầu lưỡi chạm lợi', lips: 'relaxed', nasal: true },
  in: { symbol: 'in', title: 'Vần in', ipa: '[in]', like: 'Giống "in" tiếng Việt (tin, xin).', steps: ['Đọc "i".', FRONT_N], mistake: 'Lẫn với ing.', pairs: [IN_ING], focus: 'ridge', focusLabel: 'Kết thúc: đầu lưỡi chạm lợi', lips: 'spread', nasal: true },
  un: { symbol: 'un', title: 'Vần un (uen)', ipa: '[wən]', like: 'Viết tắt của "uen": gần "uân" tiếng Việt: chūn (春) ≈ "truân". Ở thanh 1, 2 chữ â rất nhẹ, nghe gần "un".', steps: ['Chu môi "u", lướt qua "â".', FRONT_N], mistake: 'Đọc cụt hẳn như "un" tiếng Việt (bún), mất âm giữa. Sau j, q, x, y thì "un" là ün.', focus: 'ridge', focusLabel: 'Kết thúc: đầu lưỡi chạm lợi', lips: 'round', nasal: true },
  'ün': { symbol: 'ün', title: 'Vần ün', ipa: '[yn]', like: 'ü + n, gần "uyn" nhưng môi giữ tròn: yún (云) ≈ "uyn".', steps: ['Đọc ü (lưỡi như "i", môi tròn).', FRONT_N], mistake: 'Chen thêm "ê" thành "uyên": yún ≠ yuán.', focus: 'ridge', focusLabel: 'Kết thúc: đầu lưỡi chạm lợi', lips: 'round', nasal: true },
  ian: { symbol: 'ian', title: 'Vần ian', ipa: '[jɛn]', like: 'Giống "iên" tiếng Việt: tiān (天) ≈ "thiên", KHÔNG đọc "i-an".', steps: ['Đọc "i" rồi "ê".', FRONT_N], mistake: 'Đọc theo chữ thành "i-an": tiān thành "thi-an" là sai.', pairs: [IAN_IANG], focus: 'ridge', focusLabel: 'Kết thúc: đầu lưỡi chạm lợi', lips: 'spread', nasal: true },
  uan: { symbol: 'uan', title: 'Vần uan', ipa: '[wan]', like: 'Giống "oan" tiếng Việt: chuán (船) ≈ "troán".', steps: ['Chu môi "u", mở sang "a".', FRONT_N], mistake: 'Sau j, q, x, y thì "uan" là üan, đọc gần "uyên": quán (pinyin) khác chữ "quán" tiếng Việt.', pairs: [UAN_UANG], focus: 'ridge', focusLabel: 'Kết thúc: đầu lưỡi chạm lợi', lips: 'open', nasal: true },
  'üan': { symbol: 'üan', title: 'Vần üan', ipa: '[ɥɛn]', like: 'Gần "uyên" tiếng Việt, môi tròn ở đầu: yuán (元) ≈ "uyến", quán (全) ≈ "chuyến" bật hơi.', steps: ['Bắt đầu bằng ü (môi tròn).', 'Lướt sang "ê/a".', FRONT_N], mistake: 'Đọc như uan thành "oan": quán (全, pinyin) khác hẳn chữ "quán" tiếng Việt.', focus: 'ridge', focusLabel: 'Kết thúc: đầu lưỡi chạm lợi', lips: 'round', nasal: true },
  ang: { symbol: 'ang', title: 'Vần ang', ipa: '[ɑŋ]', like: 'Giống "ang" tiếng Việt (vàng, sang).', steps: ['Mở "a" rộng.', BACK_NG], mistake: 'Lẫn với an.', pairs: [AN_ANG], focus: 'back', focusLabel: 'Kết thúc: cuống lưỡi chặn', lips: 'open', nasal: true },
  eng: { symbol: 'eng', title: 'Vần eng', ipa: '[əŋ]', like: 'Giống "âng" tiếng Việt: lěng (冷) ≈ "lẩng", fēng (风) ≈ "phâng".', steps: ['Đọc "â" ngắn.', BACK_NG], mistake: 'Đọc theo chữ thành "eng" (xẻng, keng).', pairs: [EN_ENG], focus: 'back', focusLabel: 'Kết thúc: cuống lưỡi chặn', lips: 'relaxed', nasal: true },
  ing: { symbol: 'ing', title: 'Vần ing', ipa: '[iŋ]', like: 'Đọc "i" rồi "ng" cuối lưỡi. Gần "inh" giọng Bắc: xīng (星) ≈ "xinh"; giọng Nam "inh" nghe như "in" nên đừng bắt chước.', steps: ['Đọc "i".', BACK_NG + ' Không áp mặt lưỡi lên vòm như "nh".'], mistake: 'Lẫn với in (nhất là khi đọc "inh" kiểu miền Nam).', pairs: [IN_ING], focus: 'back', focusLabel: 'Kết thúc: cuống lưỡi chặn', lips: 'spread', nasal: true },
  ong: { symbol: 'ong', title: 'Vần ong', ipa: '[ʊŋ]', like: 'Gần "ung" tiếng Việt: zhōng (中) ≈ "trung", KHÔNG đọc "ong".', steps: ['Chu tròn môi như "u".', BACK_NG], mistake: 'Đọc theo chữ thành "ong" (cái xoong): miệng mở quá to.', focus: 'back', focusLabel: 'Kết thúc: cuống lưỡi chặn', lips: 'round', nasal: true },
  iang: { symbol: 'iang', title: 'Vần iang', ipa: '[jɑŋ]', like: '"i" + "ang" đọc liền: xiǎng (想) ≈ "x-i-ảng" nói nhanh.', steps: ['Đọc "i" ngắn, mở sang "a".', BACK_NG], mistake: 'Đọc thành "iêng" (xiǎng thành "xiểng"): phải nghe rõ chữ a.', pairs: [IAN_IANG], focus: 'back', focusLabel: 'Kết thúc: cuống lưỡi chặn', lips: 'open', nasal: true },
  iong: { symbol: 'iong', title: 'Vần iong', ipa: '[jʊŋ]', like: '"i" + "ung" đọc liền: qióng (穷) ≈ "ch" bật hơi + "i-úng", môi tròn ở phần "ung".', steps: ['Đọc "i" ngắn rồi chu môi sang "ung".', BACK_NG], mistake: 'Đọc theo chữ thành "i-ong" với miệng mở to.', focus: 'back', focusLabel: 'Kết thúc: cuống lưỡi chặn', lips: 'round', nasal: true },
  uang: { symbol: 'uang', title: 'Vần uang', ipa: '[wɑŋ]', like: 'Giống "oang" tiếng Việt: chuáng (床) ≈ "troáng" bật hơi.', steps: ['Chu môi "u", mở sang "a".', BACK_NG], pairs: [UAN_UANG], focus: 'back', focusLabel: 'Kết thúc: cuống lưỡi chặn', lips: 'open', nasal: true },
  ueng: { symbol: 'ueng', title: 'Vần ueng', ipa: '[wəŋ]', like: 'Gần "uâng": chỉ gặp ở âm tiết weng (wēng 翁).', steps: ['Chu môi "u", lướt sang "â".', BACK_NG], focus: 'back', focusLabel: 'Kết thúc: cuống lưỡi chặn', lips: 'round', nasal: true },
  er: {
    symbol: 'er', title: 'Vần er', ipa: '[ɚ] ~ [aɚ̯]',
    like: 'Tiếng Việt không có âm này. Đọc "ơ" rồi cong đầu lưỡi lên về sau (giống "er" giọng Mỹ). èr (二) ≈ "ơ" có uốn lưỡi.',
    steps: ['Bắt đầu đọc "ơ".', 'Cong đầu lưỡi lên và lùi về sau, KHÔNG chạm vòm miệng.'],
    mistake: 'Đọc "ơ" không uốn lưỡi, hoặc tách thành hai tiếng "ơ-rờ".',
    focus: 'rcolour', focusLabel: 'Đầu lưỡi cong lên (không chạm)', lips: 'relaxed',
  },
}

const DENTAL = new Set(['z', 'c', 's'])
const RETROFLEX = new Set(['zh', 'ch', 'sh', 'r'])
const ALIASES: Record<string, string> = { iou: 'iu', uei: 'ui', uen: 'un' }

/** Guide key for a final, accounting for the special "-i" after z c s / zh ch sh r. */
export function finalGuideKey(initial: string, phoneticFinal: string): string {
  if (phoneticFinal === 'i') {
    if (DENTAL.has(initial)) return '-i1'
    if (RETROFLEX.has(initial)) return '-i2'
  }
  return ALIASES[phoneticFinal] ?? phoneticFinal
}

export function finalGuide(initial: string, phoneticFinal: string): SoundGuideEntry | undefined {
  return FINAL_GUIDE[finalGuideKey(initial, phoneticFinal)]
}
