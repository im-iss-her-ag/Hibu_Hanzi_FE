import { Fragment, useEffect, useMemo, useState } from 'react'
import { Volume2 } from 'lucide-react'
import type { BundleCharacter, CharacterDetail, PartInfo, RadicalFamily, Word } from '../core'
import { charactersWithRadical, findFamily, partPinyin } from '../core'
import { speakChinese } from '../utils/speech'
import { pinyinSyllables } from '../utils/tone'

const WORDS_PREVIEW = 8
const FAMILY_PREVIEW = 24
const HAN_RUN = /([㐀-鿿豈-﫿]+)/

interface RightBreakdownProps {
  detail: CharacterDetail | null
  isLoading: boolean
  onSelectHanzi: (hanzi: string) => void
  displayMode?: 'modern' | 'components'
  // Fallback pinyin lookup for parts the API sent without one (offline sample).
  characters?: readonly BundleCharacter[]
  families?: readonly RadicalFamily[]
  onBrowseRadical?: (form: string) => void
  // Every word in the bundle; the breakdown picks the ones containing this character (the API detail has none).
  allWords?: readonly Word[]
  // Called when a Từ ghép row is clicked (not on its character buttons or speaker).
  onSelectWord?: (word: string) => void
  // Opens the Hán Việt quiz on words containing this character.
  onQuizWords?: (hanzi: string) => void
}

function Py({ text }: { text: string }) {
  return (
    <span className="anat-py">
      {pinyinSyllables(text).map((s, i) => (
        <span key={i} className={`py t${s.tone}`}>{s.text}{' '}</span>
      ))}
    </span>
  )
}

// Han runs inside prose are set in the Han face so component glyphs read as glyphs.
function Prose({ text }: { text: string }) {
  return (
    <>
      {text.split(HAN_RUN).map((chunk, i) =>
        i % 2 === 1 ? <span key={i} className="anat-han" lang="zh">{chunk}</span> : <Fragment key={i}>{chunk}</Fragment>,
      )}
    </>
  )
}

function TileText({ hanViet, pinyin, meaning }: { hanViet: string | null; pinyin: string | null; meaning: string | null }) {
  return (
    <span className="anat-tile-text">
      <span className="anat-hv">{hanViet ?? '—'}</span>
      {pinyin ? <Py text={pinyin} /> : <span className="anat-py" />}
      <span className="anat-mean" title={meaning ?? undefined}>{meaning ?? ''}</span>
    </span>
  )
}

function Skeleton() {
  return (
    <div className="anat anat-skel" aria-busy="true" aria-label="Đang tải chiết tự">
      <section className="anat-sec">
        <div className="anat-head"><span className="label">Chiết tự</span></div>
        <div className="anat-skel-bars">
          <span className="skel-line" style={{ width: '60%', height: 14 }} />
          <span className="skel-line" style={{ width: '85%', height: 14 }} />
          <span className="skel-line" style={{ width: '40%', height: 14 }} />
        </div>
      </section>
      <div className="anat-cols">
        {[0, 1].map((i) => (
          <div key={i} className="anat-col">
            <span className="skel-line" style={{ width: 88 }} />
            <span className="skel-line" style={{ width: '100%', height: 14 }} />
            <span className="skel-line" style={{ width: '92%', height: 14 }} />
            <span className="skel-line" style={{ width: '60%', height: 14 }} />
          </div>
        ))}
      </div>
      <section className="anat-sec">
        <div className="anat-head"><span className="label">Từ ghép</span></div>
        <div className="anat-words">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="anat-word">
              <span className="skel-line" style={{ width: 56, height: 22 }} />
              <span className="anat-word-body">
                <span className="skel-line" style={{ width: '45%' }} />
                <span className="skel-line" style={{ width: '75%' }} />
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export function RightBreakdown({
  detail,
  isLoading,
  onSelectHanzi,
  displayMode = 'modern',
  characters,
  families = [],
  onBrowseRadical,
  allWords,
  onSelectWord,
  onQuizWords,
}: RightBreakdownProps) {
  const isComponents = displayMode === 'components'
  const [showAllWords, setShowAllWords] = useState(false)
  const [showAllFamily, setShowAllFamily] = useState(false)
  const hanzi = detail?.character.hanzi
  useEffect(() => { setShowAllWords(false); setShowAllFamily(false) }, [hanzi])

  const words = useMemo(() => {
    if (!hanzi) return []
    const own = detail?.words ?? []
    const pool = own.length > 0 ? own : (allWords ?? []).filter((w) => w.word.includes(hanzi))
    return pool
      .filter((w) => w.word !== hanzi).sort(
      (a, b) =>
        (a.hsk2Level ?? a.hsk3Level ?? 99) - (b.hsk2Level ?? b.hsk3Level ?? 99) ||
        a.word.length - b.word.length ||
        a.id - b.id,
    )
  }, [detail, allWords, hanzi])

  const ownFamily = useMemo(() => (hanzi ? findFamily(families, hanzi) : null), [families, hanzi])
  const familyChars = useMemo(
    () => (ownFamily && characters ? charactersWithRadical(characters, ownFamily) : []),
    [ownFamily, characters],
  )

  if (isLoading) return <Skeleton />
  if (!detail) return null

  const { character, radical, parts = [] } = detail
  const pinyinOf = (p: PartInfo) => p.pinyin ?? partPinyin(p.part, characters)
  const primary = character.readings.find((r) => r.isPrimary) ?? character.readings[0]
  const decomposed = parts.length > 0
  // An undecomposed character still shows which radical it is filed under.
  const shownParts = decomposed ? parts : radical && radical.part !== character.hanzi ? [radical] : []
  const many = parts.length >= 4
  const browsable = shownParts
    .filter((p) => p.kind === 'radical')
    .map((p) => findFamily(families, p.part))
    .filter((f, i, all): f is RadicalFamily => f !== null && f.count > 1 && all.findIndex((g) => g?.key === f.key) === i)

  // chietTuType says what the chietTu text is: a real origin, or a folk memory aid.
  const chietTuIsMnemonic = character.chietTuType === 'mnemonic'
  const origin = chietTuIsMnemonic ? null : character.chietTu
  const mnemonics = [character.mnemonicVi, chietTuIsMnemonic ? character.chietTu : null].filter(
    (t, i, all): t is string => !!t && all.indexOf(t) === i,
  )

  const shownWords = showAllWords ? words : words.slice(0, WORDS_PREVIEW)
  const glyphFont = isComponents ? 'font-calligraphy' : ''
  const shownFamily = showAllFamily ? familyChars : familyChars.slice(0, FAMILY_PREVIEW)

  return (
    <div className="anat" key={character.hanzi}>
      {shownParts.length > 0 && (
        <section className="anat-sec" aria-labelledby="anat-h-parts">
          <div className="anat-head">
            <h2 id="anat-h-parts" className="label">Chiết tự</h2>
          </div>
          {!decomposed && <p className="anat-note">Chữ độc thể, không tách nhỏ hơn. Thuộc bộ:</p>}
          <div className={`anat-eq${many ? ' many' : ''}`}>
            {shownParts.map((p, i) => (
              <span key={i} className="anat-step">
                {decomposed && i > 0 && <span className="anat-op" aria-hidden="true">+</span>}
                <button
                  type="button"
                  className={`anat-item anat-part kind-${p.kind}`}
                  onClick={() => onSelectHanzi(p.part)}
                  title={`Tra "${p.part}"`}
                >
                  <span className="anat-tile">
                    <span className={`anat-glyph ${glyphFont}`} lang="zh">{p.part}</span>
                    {p.kind === 'radical' && <span className="anat-tag">Bộ</span>}
                  </span>
                  <TileText hanViet={p.hanViet} pinyin={pinyinOf(p)} meaning={p.meaningVi} />
                </button>
              </span>
            ))}
            {decomposed && (
              <span className="anat-step">
                <span className="anat-op" aria-hidden="true">=</span>
                <span className="anat-item anat-result" aria-label={`Kết quả ${character.hanzi}`}>
                  <span className="anat-tile">
                    <span className={`anat-glyph ${glyphFont}`} lang="zh">{character.hanzi}</span>
                  </span>
                  <TileText hanViet={primary?.hanViet ?? null} pinyin={primary?.pinyin ?? null} meaning={primary?.meaningVi ?? null} />
                </span>
              </span>
            )}
          </div>
          {browsable.length > 0 && onBrowseRadical && (
            <div className="anat-browse">
              {browsable.map((f) => (
                <button key={f.key} type="button" className="anat-link" onClick={() => onBrowseRadical(f.key)}>
                  {f.count} chữ cùng bộ <span lang="zh" className="anat-han">{f.display}</span> ({f.info.hanViet ?? f.key})
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {ownFamily && familyChars.length > 0 && (
        <section className="anat-sec" aria-labelledby="anat-h-family">
          <div className="anat-head">
            <h2 id="anat-h-family" className="label">
              Chữ thuộc bộ <span className="anat-han" lang="zh">{ownFamily.key}</span>
            </h2>
            <span className="anat-count">{familyChars.length}</span>
          </div>
          <div className="anat-family">
            {shownFamily.map((c) => {
              const r = c.readings.find((x) => x.isPrimary) ?? c.readings[0]
              return (
                <button key={c.hanzi} type="button" className="anat-fcell" onClick={() => onSelectHanzi(c.hanzi)} title={r ? `${c.hanzi} · ${r.pinyin}` : c.hanzi}>
                  <span className="anat-fglyph" lang="zh">{c.hanzi}</span>
                  <span className="anat-fhv">{r?.hanViet ?? ''}</span>
                </button>
              )
            })}
          </div>
          {familyChars.length > FAMILY_PREVIEW && (
            <button type="button" className="anat-link anat-more" onClick={() => setShowAllFamily((v) => !v)}>
              {showAllFamily ? 'Thu gọn' : `Xem thêm ${familyChars.length - FAMILY_PREVIEW} chữ`}
            </button>
          )}
        </section>
      )}

      {(origin || mnemonics.length > 0) && (
        <div className="anat-cols">
          {origin && (
            <section className="anat-col" aria-labelledby="anat-h-origin">
              <h2 id="anat-h-origin" className="label anat-col-label">
                <i className="anat-dot" style={{ background: 'var(--etymology)' }} />Nguồn gốc
              </h2>
              <p className="anat-text"><Prose text={origin} /></p>
            </section>
          )}
          {mnemonics.length > 0 && (
            <section className="anat-col" aria-labelledby="anat-h-mnemonic">
              <h2 id="anat-h-mnemonic" className="label anat-col-label">
                <i className="anat-dot" style={{ background: 'var(--mnemonic)' }} />Mẹo nhớ
              </h2>
              {mnemonics.map((t, i) => (
                <p key={i} className="anat-text"><Prose text={t} /></p>
              ))}
            </section>
          )}
        </div>
      )}

      {words.length > 0 && (
        <section className="anat-sec" aria-labelledby="anat-h-words">
          <div className="anat-head">
            <h2 id="anat-h-words" className="label">Từ ghép</h2>
            <span className="anat-count">{words.length}</span>
            {onQuizWords && words.length >= 4 && (
              <button type="button" className="hq-entry" onClick={() => onQuizWords(character.hanzi)}>Đoán nghĩa</button>
            )}
          </div>
          <ul className="anat-words">
            {shownWords.map((w) => (
              <li key={w.id} className={`anat-word${onSelectWord ? ' is-link' : ''}`} title={w.meaningVi} onClick={onSelectWord ? () => onSelectWord(w.word) : undefined}>
                <span className="anat-word-zh" lang="zh">
                  {Array.from(w.word).map((ch, i) =>
                    ch === character.hanzi ? (
                      <span key={i} className="anat-wc is-current">{ch}</span>
                    ) : (
                      <button key={i} type="button" className="anat-wc" onClick={(e) => { e.stopPropagation(); onSelectHanzi(ch) }} aria-label={`Tra chữ ${ch}`}>
                        {ch}
                      </button>
                    ),
                  )}
                </span>
                <span className="anat-word-body">
                  <span className="anat-word-head">
                    <Py text={w.pinyin} />
                    {w.hanViet && <span className="anat-hv">{w.hanViet}</span>}
                  </span>
                  <span className="anat-word-mean">{w.meaningVi}</span>
                </span>
                <button type="button" className="anat-speak" onClick={(e) => { e.stopPropagation(); speakChinese(w.word, 1, w.pinyin) }} title="Nghe phát âm" aria-label={`Phát âm ${w.word}`}>
                  <Volume2 size={16} />
                </button>
              </li>
            ))}
          </ul>
          {words.length > WORDS_PREVIEW && (
            <button type="button" className="anat-link anat-more" onClick={() => setShowAllWords((v) => !v)}>
              {showAllWords ? 'Thu gọn' : `Xem thêm ${words.length - WORDS_PREVIEW} từ`}
            </button>
          )}
        </section>
      )}
    </div>
  )
}
