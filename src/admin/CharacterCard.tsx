import { useState } from 'react'
import { characterProblems, type AdminCharacter, type CharacterInput } from './api'
import { CharacterEditor } from './CharacterEditor'
import { Problems, ReviewToggle } from './ReviewToggle'

interface Props {
  item: AdminCharacter
  busy: boolean
  onReview: (status: 'draft' | 'reviewed') => void
  onSave: (input: CharacterInput, andReview: boolean) => Promise<void>
}

const TYPE_LABEL = { etymology: 'Nguồn gốc', mnemonic: 'Mẹo nhớ' } as const

export function CharacterCard({ item, busy, onReview, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const problems = characterProblems(item)
  const primary = item.readings.find((r) => r.isPrimary)
  const others = item.readings.filter((r) => !r.isPrimary)

  return (
    <article className={`adm-card adm-card-${item.status}`} aria-labelledby={`char-${item.id}`}>
      <div className="adm-glyph" lang="zh-Hans">
        <span id={`char-${item.id}`}>{item.hanzi}</span>
        {item.traditional && (
          <span className="adm-glyph-trad" title="Phồn thể">
            {item.traditional}
          </span>
        )}
      </div>

      {editing ? (
        <CharacterEditor
          item={item}
          onCancel={() => setEditing(false)}
          onSave={async (input, andReview) => {
            await onSave(input, andReview)
            setEditing(false)
          }}
        />
      ) : (
        <div className="adm-body">
          <p className="adm-reading">
            <span className="adm-pinyin">{primary?.pinyin ?? '—'}</span>
            <span className="adm-hv">{primary?.hanViet ?? <em className="adm-missing">thiếu Hán Việt</em>}</span>
            <span className="adm-meaning">{primary?.meaningVi ?? <em className="adm-missing">thiếu nghĩa</em>}</span>
          </p>
          {others.length > 0 && (
            <ul className="adm-others" aria-label="Âm đọc khác">
              {others.map((r) => (
                <li key={r.pinyin}>
                  <span className="adm-pinyin">{r.pinyin}</span> <span className="adm-hv">{r.hanViet ?? '?'}</span>{' '}
                  {r.meaningVi}
                </li>
              ))}
            </ul>
          )}

          <dl className="adm-facts">
            <div>
              <dt>Bộ thủ</dt>
              <dd>
                <span lang="zh-Hans" className="adm-zh">{item.radical ?? '—'}</span>{' '}
                {item.radicalInfo?.hanViet} {item.radicalInfo?.meaningVi && `(${item.radicalInfo.meaningVi})`}
              </dd>
            </div>
            <div>
              <dt>Số nét</dt>
              <dd>{item.strokeCount ?? '—'}</dd>
            </div>
            <div>
              <dt>HSK</dt>
              <dd>
                3.0: {item.hsk3Level ?? '—'} · 2.0: {item.hsk2Level ?? '—'}
              </dd>
            </div>
          </dl>

          <div className="adm-parts" aria-label="Thành phần">
            {item.parts.length === 0 ? (
              <span className="adm-muted">Không tách thành phần</span>
            ) : (
              item.parts.map((p, i) => (
                <span key={i} className={`adm-part${p.resolved ? '' : ' adm-part-bad'}`}>
                  {i > 0 && <span className="adm-plus" aria-hidden>+</span>}
                  <span lang="zh-Hans" className="adm-zh">{p.part}</span> {p.hanViet ?? '?'}
                  {p.meaningVi && <span className="adm-muted"> ({p.meaningVi})</span>}
                  {!p.resolved && <span className="adm-missing"> không tra được</span>}
                </span>
              ))
            )}
          </div>

          {item.chietTu ? (
            <p className="adm-chiettu">
              <span className={`adm-tag adm-tag-${item.chietTuType}`}>{TYPE_LABEL[item.chietTuType ?? 'mnemonic']}</span>
              {item.chietTu}
            </p>
          ) : (
            <p className="adm-chiettu adm-muted">Chưa có chiết tự</p>
          )}
          {item.mnemonicVi ? (
            <p className="adm-chiettu">
              <span className="adm-tag adm-tag-mnemonic">Mẹo nhớ nhanh</span>
              {item.mnemonicVi}
            </p>
          ) : (
            <p className="adm-chiettu adm-muted">Chưa có mẹo nhớ</p>
          )}

          <Problems items={problems} />
        </div>
      )}

      {!editing && (
        <ReviewToggle
          status={item.status}
          problems={problems}
          busy={busy}
          onReview={() => onReview('reviewed')}
          onUnreview={() => onReview('draft')}
          onEdit={() => setEditing(true)}
        />
      )}
    </article>
  )
}
