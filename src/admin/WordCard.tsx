import { useState } from 'react'
import { wordProblems, type AdminWord, type WordInput } from './api'
import { EditorFooter } from './EditorFooter'
import { Problems, ReviewToggle } from './ReviewToggle'

interface Props {
  item: AdminWord
  busy: boolean
  onReview: (status: 'draft' | 'reviewed') => void
  onSave: (input: WordInput, andReview: boolean) => Promise<void>
}

export function WordCard({ item, busy, onReview, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const problems = wordProblems(item)

  return (
    <article className={`adm-card adm-card-${item.status}`} aria-labelledby={`word-${item.id}`}>
      <div className="adm-glyph adm-glyph-word" lang="zh-Hans">
        <span id={`word-${item.id}`}>{item.word}</span>
        {item.traditional && <span className="adm-glyph-trad">{item.traditional}</span>}
      </div>

      {editing ? (
        <WordEditor
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
            <span className="adm-pinyin">{item.pinyin}</span>
            <span className="adm-hv">{item.hanViet ?? <em className="adm-missing">thiếu Hán Việt</em>}</span>
            <span className="adm-meaning">{item.meaningVi ?? <em className="adm-missing">thiếu nghĩa</em>}</span>
          </p>
          {/* The reading the app will pick for each character inside this word. */}
          <div className="adm-parts" aria-label="Từng chữ trong từ">
            {item.characters.map((c, i) => (
              <span key={i} className={`adm-part${c.pinyin ? '' : ' adm-part-bad'}`}>
                {i > 0 && <span className="adm-plus" aria-hidden>·</span>}
                <span lang="zh-Hans" className="adm-zh">{c.hanzi}</span> {c.pinyin ?? '?'} {c.hanViet ?? ''}
                {c.meaningVi && <span className="adm-muted"> ({c.meaningVi})</span>}
              </span>
            ))}
          </div>
          <p className="adm-muted adm-small">
            HSK 3.0: {item.hsk3Level ?? '—'} · HSK 2.0: {item.hsk2Level ?? '—'}
          </p>
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

function WordEditor({ item, onCancel, onSave }: { item: AdminWord } & Pick<Props, 'onSave'> & { onCancel: () => void }) {
  const [pinyin, setPinyin] = useState(item.pinyin)
  const [hanViet, setHanViet] = useState(item.hanViet ?? '')
  const [meaning, setMeaning] = useState(item.meaningVi ?? '')
  const [traditional, setTraditional] = useState(item.traditional ?? '')

  return (
    <form className="adm-editor" onSubmit={(e) => e.preventDefault()}>
      <div className="adm-fields">
        <label>
          Pinyin <span className="adm-hint">(mỗi chữ một âm tiết, cách nhau dấu cách)</span>
          <input value={pinyin} onChange={(e) => setPinyin(e.target.value)} />
        </label>
        <label>
          Hán Việt
          <input value={hanViet} onChange={(e) => setHanViet(e.target.value)} />
        </label>
        <label>
          Phồn thể
          <input value={traditional} onChange={(e) => setTraditional(e.target.value)} lang="zh-Hant" size={6} />
        </label>
      </div>
      <label className="adm-block">
        Nghĩa tiếng Việt
        <textarea value={meaning} onChange={(e) => setMeaning(e.target.value)} rows={2} />
      </label>
      <EditorFooter
        onCancel={onCancel}
        onSave={(andReview) =>
          onSave(
            {
              pinyin: pinyin.trim(),
              hanViet: hanViet.trim() || null,
              meaningVi: meaning.trim() || null,
              traditional: traditional.trim() || null,
            },
            andReview,
          )
        }
      />
    </form>
  )
}
