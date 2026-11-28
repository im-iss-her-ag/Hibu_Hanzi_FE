import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { BookMarked, CalendarPlus, Check, Mic, RotateCcw, Star, Target, Volume2 } from 'lucide-react'
import type { HskLevel } from '../core'
import { useModalDialog } from '../utils/useModalA11y'
import { GOAL_FOR_MINUTES, MINUTES_OPTIONS, getDaily, updateDaily, type Minutes, type Track } from '../learn/daily'
import '../styles/onboarding.css'

/** Same icon the navbar uses for the "Hôm nay" entry. */
const TodayIcon = Target

interface OnboardingModalProps {
  onDone: (startLearning: boolean) => void
  /** Skipped / dismissed. The modal records `onboarded` itself so it never shows again. */
  onClose: () => void
}

type StepId = 'track' | 'minutes' | 'tour'

const TRACKS: { value: Track; title: string; hint: string }[] = [
  { value: 'hsk', title: 'Thi HSK', hint: 'Học từng cấp HSK 1–6, chữ hay gặp nhất học trước.' },
  { value: 'hanviet', title: 'Hiểu chữ qua Hán Việt', hint: 'Đoán nghĩa chữ mới nhờ âm Hán Việt bạn đã quen.' },
  { value: 'lookup', title: 'Chỉ tra cứu', hint: 'Tra chữ khi cần, không đặt mục tiêu mỗi ngày.' },
]
const LEVELS: HskLevel[] = [1, 2, 3, 4, 5, 6]

/** Roving-tabindex radio group: arrows move + select, Home/End jump. */
function RadioGroup<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
  optionClass,
  render,
}: {
  label: string
  value: T
  options: { value: T; testid: string; aria?: string }[]
  onChange: (v: T) => void
  className: string
  /** Replaces the default card class (used by the segmented HSK picker). */
  optionClass?: string
  render: (o: { value: T }, checked: boolean) => ReactNode
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const idx = Math.max(0, options.findIndex((o) => o.value === value))
  const move = (to: number) => {
    const n = (to + options.length) % options.length
    onChange(options[n].value)
    refs.current[n]?.focus()
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      move(idx + 1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      move(idx - 1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      move(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      move(options.length - 1)
    }
  }
  return (
    <div role="radiogroup" aria-label={label} className={className} onKeyDown={onKey}>
      {options.map((o, i) => {
        const checked = o.value === value
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={o.aria}
            tabIndex={checked ? 0 : -1}
            data-testid={o.testid}
            data-value={String(o.value)}
            className={optionClass ?? `ob-opt${checked ? ' on' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {render(o, checked)}
          </button>
        )
      })}
    </div>
  )
}

const LEGEND: { icon: ReactNode; name: string; text: string }[] = [
  { icon: <Star size={18} aria-hidden="true" />, name: 'Lưu', text: 'Ngôi sao trên trang chữ: cất chữ vào Sổ tay.' },
  { icon: <BookMarked size={18} aria-hidden="true" />, name: 'Sổ tay', text: 'Nút trên thanh đầu trang: xem lại các chữ đã lưu.' },
  { icon: <Check size={18} aria-hidden="true" />, name: 'Đã thuộc', text: 'Chữ bạn đã biết: chỉ kiểm tra lại sau 30 ngày.' },
  { icon: <CalendarPlus size={18} aria-hidden="true" />, name: 'Thêm vào ôn', text: 'Đưa chữ vào lịch ôn để nhớ lâu.' },
  { icon: <RotateCcw size={18} aria-hidden="true" />, name: 'Ôn tập', text: 'Ôn các thẻ chữ và từ đến hạn hôm nay.' },
  { icon: <Volume2 size={18} aria-hidden="true" />, name: 'Loa', text: 'Nghe phát âm của chữ.' },
  { icon: <Mic size={18} aria-hidden="true" />, name: 'Mic', text: 'Nói thử để luyện thanh điệu.' },
  { icon: <TodayIcon size={18} aria-hidden="true" />, name: 'Hôm nay', text: 'Việc cần học hôm nay và chuỗi ngày của bạn.' },
]

export function OnboardingModal({ onDone, onClose }: OnboardingModalProps) {
  const initial = useRef(getDaily()).current
  const [track, setTrack] = useState<Track>(initial.track)
  const [level, setLevel] = useState<HskLevel>(initial.level)
  const [minutes, setMinutes] = useState<Minutes>(initial.minutes ?? 10)
  const [step, setStep] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const skip = () => {
    updateDaily({ onboarded: Date.now() })
    onClose()
  }
  const { ref: dialogRef, titleId, dialogProps } = useModalDialog<HTMLDivElement>(skip)

  const steps: StepId[] = track === 'lookup' ? ['track', 'tour'] : ['track', 'minutes', 'tour']
  const id = steps[Math.min(step, steps.length - 1)]
  const last = step >= steps.length - 1
  const goal = GOAL_FOR_MINUTES[minutes]

  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1))
  const back = () => setStep((s) => Math.max(0, s - 1))
  const done = () => {
    updateDaily({ track, level, minutes, goal, onboarded: Date.now() })
    onDone(track !== 'lookup')
  }

  // Enter = next (or finish on the last step). Buttons that already own Enter (Back / Skip / Next) keep it.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.defaultPrevented || e.nativeEvent.isComposing) return
    const el = e.target as HTMLElement
    if (el.tagName === 'BUTTON' && el.getAttribute('role') !== 'radio') return
    e.preventDefault()
    if (last) done()
    else next()
  }

  const titles: Record<StepId, string> = {
    track: 'Bạn học chữ Hán để làm gì?',
    minutes: 'Mỗi ngày bạn có bao nhiêu phút?',
    tour: 'Vài biểu tượng cần biết',
  }

  return (
    <div
      className="pm-backdrop ob-backdrop"
      data-testid="onboarding"
      onKeyDown={onKeyDown}
    >
      <div ref={dialogRef} {...dialogProps} className="pm-dialog pm-sm ob-dialog">
        <div className="pm-header ob-header">
          <div className="ob-progress" role="group" aria-label={`Bước ${step + 1} trên ${steps.length}`}>
            <span className="ob-count" aria-hidden="true">
              {step + 1}/{steps.length}
            </span>
            <span className="ob-dots" aria-hidden="true">
              {steps.map((s, i) => (
                <span key={s} className={`ob-dot${i === step ? ' on' : i < step ? ' past' : ''}`} />
              ))}
            </span>
          </div>
          <div className="pm-header-actions">
            <button type="button" className="pm-btn pm-btn-ghost pm-close ob-skip" data-testid="onboarding-skip" onClick={skip} title="Bỏ qua (Esc)">
              Bỏ qua
            </button>
          </div>
        </div>

        <div className="pm-body ob-body">
          <h2 id={titleId} className="ob-title" tabIndex={-1} ref={headingRef}>
            {titles[id]}
          </h2>

          {id === 'track' && (
            <>
              <RadioGroup
                label="Mục đích học"
                className="ob-cards"
                value={track}
                onChange={setTrack}
                options={TRACKS.map((t) => ({ value: t.value, testid: `onboarding-track-${t.value}` }))}
                render={(o) => {
                  const t = TRACKS.find((x) => x.value === o.value)!
                  return (
                    <>
                      <span className="ob-radio" aria-hidden="true" />
                      <span className="ob-opt-text">
                        <span className="ob-opt-title">{t.title}</span>
                        <span className="ob-opt-hint">{t.hint}</span>
                      </span>
                    </>
                  )
                }}
              />
              {track === 'hsk' && (
                <div className="ob-level">
                  <span className="pm-section-title" id="ob-level-label">Bắt đầu từ cấp</span>
                  <RadioGroup
                    label="Cấp HSK bắt đầu"
                    className="pm-seg ob-seg"
                    optionClass="pm-seg-btn"
                    value={level}
                    onChange={setLevel}
                    options={LEVELS.map((l) => ({ value: l, testid: `onboarding-level-${l}`, aria: `HSK ${l}` }))}
                    render={(o) => <>HSK {o.value}</>}
                  />
                </div>
              )}
            </>
          )}

          {id === 'minutes' && (
            <>
              <RadioGroup
                label="Số phút mỗi ngày"
                className="ob-cards"
                value={minutes}
                onChange={setMinutes}
                options={MINUTES_OPTIONS.map((m) => ({ value: m, testid: `onboarding-minutes-${m}` }))}
                render={(o) => (
                  <>
                    <span className="ob-radio" aria-hidden="true" />
                    <span className="ob-opt-text">
                      <span className="ob-opt-title">{o.value} phút</span>
                      <span className="ob-opt-hint">≈ {GOAL_FOR_MINUTES[o.value as Minutes]} chữ mới mỗi ngày</span>
                    </span>
                  </>
                )}
              />
              <p className="ob-note">Bạn có thể đổi mục tiêu bất cứ lúc nào ở trang Hôm nay.</p>
            </>
          )}

          {id === 'tour' && (
            <ul className="ob-legend">
              {LEGEND.map((l) => (
                <li key={l.name} className="ob-legend-row">
                  <span className="ob-legend-icon">{l.icon}</span>
                  <span className="ob-legend-text">
                    <b>{l.name}</b>
                    <span>{l.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="pm-foot">
          <button type="button" className="pm-btn pm-btn-ghost pm-foot-start ob-back" data-testid="onboarding-back" onClick={back} disabled={step === 0}>
            Quay lại
          </button>
          {last ? (
            <button type="button" className="pm-btn pm-btn-primary" data-testid="onboarding-done" onClick={done}>
              {track === 'lookup' ? 'Bắt đầu tra chữ' : 'Bắt đầu học hôm nay'}
            </button>
          ) : (
            <button type="button" className="pm-btn pm-btn-primary" data-testid="onboarding-next" onClick={next}>
              Tiếp tục
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
