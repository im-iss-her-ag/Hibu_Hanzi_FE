import { pinyinSyllables } from '../utils/tone'

/** Pinyin with each syllable coloured by its tone (see tokens.css `.py.t1..t5`). */
export function TonePinyin({ pinyin, className }: { pinyin: string; className?: string }) {
  const syllables = pinyinSyllables(pinyin)
  return (
    <span className={className}>
      {syllables.map((s, i) => (
        <span key={i} className={`py t${s.tone}`}>
          {i > 0 ? ' ' : ''}
          {s.text}
        </span>
      ))}
    </span>
  )
}
