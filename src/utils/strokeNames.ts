// Vietnamese & Chinese Stroke Name mapping for HanziWriter strokes
// In Chinese calligraphy, strokes are categorized into primary forms (点, 横, 竖, 撇, 捺, 提, 折, 钩) and compound forms.

export interface StrokeNameInfo {
  nameZh: string
  nameVi: string
  direction: string
}

// Map median vectors or standard fallback stroke order names
export function inferStrokeName(medianPoints: number[][]): StrokeNameInfo {
  if (!medianPoints || medianPoints.length < 2) {
    return { nameZh: '笔画', nameVi: 'Nét bút', direction: '' }
  }

  const pStart = medianPoints[0]
  const pEnd = medianPoints[medianPoints.length - 1]
  const dx = pEnd[0] - pStart[0]
  const dy = pEnd[1] - pStart[1] // In SVG coordinate, y increases downwards

  // Calculate direction angles and inflection turns
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
  const distance = Math.hypot(dx, dy)

  // Detect turns / inflections along medians
  let turns = 0
  for (let i = 1; i < medianPoints.length - 1; i++) {
    const v1x = medianPoints[i][0] - medianPoints[i - 1][0]
    const v1y = medianPoints[i][1] - medianPoints[i - 1][1]
    const v2x = medianPoints[i + 1][0] - medianPoints[i][0]
    const v2y = medianPoints[i + 1][1] - medianPoints[i][1]
    const dot = v1x * v2x + v1y * v2y
    const mag1 = Math.hypot(v1x, v1y)
    const mag2 = Math.hypot(v2x, v2y)
    if (mag1 > 8 && mag2 > 8) {
      const cosTheta = dot / (mag1 * mag2)
      if (cosTheta < 0.6) turns++
    }
  }

  // Hook or turn detection
  if (turns >= 2) {
    return { nameZh: '横折折/竖折折', nameVi: 'Hoành chiết chiết / Thụ chiết', direction: 'Gấp khúc nhiều đoạn' }
  }

  if (turns === 1) {
    if (Math.abs(dx) > Math.abs(dy) && pStart[0] < pEnd[0] && dy > 0) {
      return { nameZh: '横折 / 横钩', nameVi: 'Hoành chiết / Hoành câu', direction: 'Ngang gập xuống' }
    }
    if (dy > 0 && pEnd[0] < pStart[0]) {
      return { nameZh: '竖钩 / 竖弯', nameVi: 'Thụ câu / Thụ loan', direction: 'Sổ móc / Sổ cong' }
    }
    if (dy > 0 && dx > 0) {
      return { nameZh: '竖折 / 竖弯钩', nameVi: 'Thụ chiết / Thụ loan câu', direction: 'Sổ gập sang phải' }
    }
    return { nameZh: '折 / 钩', nameVi: 'Nét gập / Nét móc', direction: 'Đổi hướng' }
  }

  // Single straight/curved stroke classification by vector angle
  // Horizontal (-25° to 25°)
  if (Math.abs(angleDeg) <= 25) {
    return { nameZh: '横 (héng)', nameVi: 'Hoành (Ngang)', direction: 'Trái sang phải' }
  }

  // Vertical (65° to 115°)
  if (angleDeg >= 65 && angleDeg <= 115) {
    return { nameZh: '竖 (shù)', nameVi: 'Thụ (Sổ dọc)', direction: 'Trên xuống dưới' }
  }

  // Slash left / Pie (115° to 170°)
  if (angleDeg > 115 && angleDeg <= 170) {
    if (distance < 120) {
      return { nameZh: '短撇 (duǎn piě)', nameVi: 'Đoản phiệt (Phẩy ngắn)', direction: 'Phẩy chếch trái' }
    }
    return { nameZh: '撇 (piě)', nameVi: 'Phiệt (Phẩy nghiêng trái)', direction: 'Vuốt từ trên sang trái' }
  }

  // Fall right / Na (25° to 65°)
  if (angleDeg > 25 && angleDeg < 65) {
    if (distance < 110) {
      return { nameZh: '点 (diǎn)', nameVi: 'Điểm (Chấm)', direction: 'Chấm nhẹ từ trên xuống phải' }
    }
    return { nameZh: '捺 (nà)', nameVi: 'Nại (Nét mác)', direction: 'Vuốt từ trên sang phải' }
  }

  // Rise / Ti (-60° to -15°)
  if (angleDeg >= -60 && angleDeg < -15) {
    return { nameZh: '提 (tí)', nameVi: 'Hất (Nét hất)', direction: 'Hất chéo từ dưới lên trên' }
  }

  // Dot (very short)
  if (distance < 90) {
    return { nameZh: '点 (diǎn)', nameVi: 'Điểm (Chấm)', direction: 'Chấm nét nhỏ' }
  }

  return { nameZh: '撇 (piě)', nameVi: 'Phiệt (Phẩy)', direction: 'Trên xuống trái' }
}
