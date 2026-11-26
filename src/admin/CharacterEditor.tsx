import { Plus, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import type { AdminCharacter, AdminReading, CharacterInput, ChietTuType } from './api'
import { EditorFooter } from './EditorFooter'

interface Props {
  item: AdminCharacter
  onCancel: () => void
  onSave: (input: CharacterInput, andReview: boolean) => Promise<void>
}

const blankReading: AdminReading = { pinyin: '', hanViet: '', meaningVi: '', isPrimary: false }

export function CharacterEditor({ item, onCancel, onSave }: Props) {
  const id = useId()
  const [readings, setReadings] = useState<AdminReading[]>(() => item.readings.map((r) => ({ ...r })))
  const [radical, setRadical] = useState(item.radical ?? '')
  const [strokes, setStrokes] = useState(item.strokeCount ? String(item.strokeCount) : '')
  const [traditional, setTraditional] = useState(item.traditional ?? '')
  const [parts, setParts] = useState(item.parts.map((p) => p.part).join(' '))
  const [chietTu, setChietTu] = useState(item.chietTu ?? '')
  const [type, setType] = useState<ChietTuType>(item.chietTuType ?? 'mnemonic')
  const [mnemonic, setMnemonic] = useState(item.mnemonicVi ?? '')

  const setReading = (i: number, patch: Partial<AdminReading>) =>
    setReadings((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : patch.isPrimary ? { ...r, isPrimary: false } : r)))

  const input = (): CharacterInput => ({
    traditional: traditional.trim() || null,
    radical: radical.trim() || null,
    strokeCount: strokes ? Number(strokes) : null,
    chietTu: chietTu.trim() || null,
    chietTuType: type,
    mnemonicVi: mnemonic.trim() || null,
    readings: readings.map((r) => ({
      pinyin: r.pinyin.trim(),
      hanViet: r.hanViet?.trim() || null,
      meaningVi: r.meaningVi?.trim() || null,
      isPrimary: r.isPrimary,
    })),
    parts: parts.split(/\s+/).filter(Boolean),
  })

  return (
    <form className="adm-editor" onSubmit={(e) => e.preventDefault()}>
      <fieldset>
        <legend>Âm đọc</legend>
        <table className="adm-readings">
          <thead>
            <tr>
              <th scope="col">Chính</th>
              <th scope="col">Pinyin</th>
              <th scope="col">Hán Việt</th>
              <th scope="col">Nghĩa</th>
              <th scope="col"><span className="adm-sr">Xoá</span></th>
            </tr>
          </thead>
          <tbody>
            {readings.map((r, i) => (
              <tr key={i}>
                <td>
                  <input
                    type="radio"
                    name={`${id}-primary`}
                    checked={r.isPrimary}
                    onChange={() => setReading(i, { isPrimary: true })}
                    aria-label={`Đặt ${r.pinyin || 'âm này'} làm âm chính`}
                  />
                </td>
                <td>
                  <input value={r.pinyin} onChange={(e) => setReading(i, { pinyin: e.target.value })} aria-label="Pinyin" size={7} />
                </td>
                <td>
                  <input value={r.hanViet ?? ''} onChange={(e) => setReading(i, { hanViet: e.target.value })} aria-label="Hán Việt" size={8} />
                </td>
                <td className="adm-grow">
                  <input value={r.meaningVi ?? ''} onChange={(e) => setReading(i, { meaningVi: e.target.value })} aria-label="Nghĩa" />
                </td>
                <td>
                  <button
                    type="button"
                    className="adm-icon-btn"
                    onClick={() => setReadings((rs) => rs.filter((_, j) => j !== i))}
                    disabled={readings.length === 1}
                    aria-label={`Xoá âm ${r.pinyin}`}
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="adm-btn adm-btn-quiet" onClick={() => setReadings((rs) => [...rs, { ...blankReading }])}>
          <Plus size={14} aria-hidden /> Thêm âm đọc
        </button>
      </fieldset>

      <div className="adm-fields">
        <label>
          Bộ thủ
          <input value={radical} onChange={(e) => setRadical(e.target.value)} lang="zh-Hans" size={3} />
        </label>
        <label>
          Số nét
          <input type="number" min={1} max={64} value={strokes} onChange={(e) => setStrokes(e.target.value)} />
        </label>
        <label>
          Phồn thể
          <input value={traditional} onChange={(e) => setTraditional(e.target.value)} lang="zh-Hant" size={4} />
        </label>
        <label className="adm-grow">
          Thành phần <span className="adm-hint">(cách nhau bằng dấu cách, ví dụ: 氵 可)</span>
          <input value={parts} onChange={(e) => setParts(e.target.value)} lang="zh-Hans" />
        </label>
      </div>

      <fieldset className="adm-chiettu-edit">
        <legend>Chiết tự</legend>
        <div className="adm-radio-row" role="radiogroup" aria-label="Loại chiết tự">
          <label>
            <input type="radio" name={`${id}-type`} checked={type === 'etymology'} onChange={() => setType('etymology')} />
            Nguồn gốc thật
          </label>
          <label>
            <input type="radio" name={`${id}-type`} checked={type === 'mnemonic'} onChange={() => setType('mnemonic')} />
            Mẹo nhớ
          </label>
        </div>
        <textarea value={chietTu} onChange={(e) => setChietTu(e.target.value)} rows={2} aria-label="Nội dung chiết tự" />
      </fieldset>

      <fieldset className="adm-chiettu-edit">
        <legend>Mẹo nhớ nhanh</legend>
        <textarea value={mnemonic} onChange={(e) => setMnemonic(e.target.value)} rows={4} aria-label="Mẹo nhớ nhanh" />
      </fieldset>

      <EditorFooter onCancel={onCancel} onSave={(andReview) => onSave(input(), andReview)} />
    </form>
  )
}
