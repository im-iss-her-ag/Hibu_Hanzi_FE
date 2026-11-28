import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, Check, Flame, Library } from 'lucide-react'
import type { BundleCharacter, HskLevel } from '../core'
import { nextDueAt, useLearnData } from '../learn/srs'
import {
  GOAL_OPTIONS,
  buildTodayPlan,
  computeStreak,
  newCandidates,
  updateDaily,
  useDaily,
  useNow,
  type DailyGoal,
} from '../learn/daily'
import { LearnStep } from './LearnStep'
import '../styles/today.css'

export interface TodayViewProps {
  characters: BundleCharacter[]
  onStartReview: () => void
  onOpenStats: () => void
  onOpenStudio: () => void
  onOpenCharacter: (h: string) => void
  /** Optional: tells the app shell when the guided learn dialog is open (so global shortcuts stay quiet). */
  onLearnOpenChange?: (open: boolean) => void
}

const RING_R = 52
const RING_C = 2 * Math.PI * RING_R
const LEVELS: HskLevel[] = [1, 2, 3, 4, 5, 6]

function relDue(t: number, now: number): string {
  const m = Math.round((t - now) / 60_000)
  if (m <= 1) return 'ngay bây giờ'
  if (m < 60) return `sau ${m} phút`
  const h = Math.round(m / 60)
  if (h < 24) return `sau ${h} giờ`
  const d = Math.round(h / 24)
  return d <= 1 ? 'ngày mai' : `sau ${d} ngày`
}

export function TodayView({ characters, onStartReview, onOpenStats, onOpenStudio, onOpenCharacter, onLearnOpenChange }: TodayViewProps) {
  const learn = useLearnData()
  const daily = useDaily()
  const now = useNow()
  const plan = useMemo(() => buildTodayPlan(learn, daily, characters, now), [learn, daily, characters, now])
  const streak = useMemo(() => computeStreak(daily.days, now), [daily.days, now])
  const [learnQueue, setLearnQueue] = useState<string[] | null>(null)
  const learnOpen = learnQueue !== null

  const cbRef = useRef(onLearnOpenChange)
  cbRef.current = onLearnOpenChange
  useEffect(() => {
    cbRef.current?.(learnOpen)
  }, [learnOpen])
  useEffect(() => () => cbRef.current?.(false), [])

  // Brand-new learner: no cards, no marks, no activity. Show an invitation, not a dashboard of zeros.
  const fresh = useMemo(
    () => Object.keys(learn.cards).length === 0 && Object.keys(learn.known).length === 0 && Object.keys(daily.days).length === 0,
    [learn.cards, learn.known, daily.days],
  )

  const more = useMemo(
    () => (plan.next === 'done' ? newCandidates(learn, daily, characters, 5) : []),
    [plan.next, learn, daily, characters],
  )
  const due = useMemo(() => nextDueAt(learn), [learn])

  const doneN = Math.min(plan.newDone, plan.goal) + plan.reviewedToday
  const total = doneN + plan.newQueue.length + plan.dueLeft
  const pct = Math.round(plan.progress * 100)
  const complete = plan.next === 'done' && doneN > 0

  const doneSummary = [plan.newDone > 0 && `học ${plan.newDone} chữ mới`, plan.reviewedToday > 0 && `ôn ${plan.reviewedToday} thẻ`]
    .filter(Boolean)
    .join(' và ')
  const dateLabel = new Date(now).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })

  const runNext = () => {
    if (plan.next === 'learn') setLearnQueue(plan.newQueue)
    else if (plan.next === 'review') onStartReview()
  }
  const ctaLabel =
    plan.next === 'learn'
      ? `${fresh ? 'Bắt đầu học' : 'Học tiếp'} · ${plan.newQueue.length} chữ mới`
      : `Học tiếp · ôn ${plan.dueLeft} thẻ`

  const sourceValue = daily.track === 'hanviet' ? 'hanviet' : `hsk-${daily.level}`
  const onSource = (v: string) => {
    if (v === 'hanviet') updateDaily({ track: 'hanviet' })
    else updateDaily({ track: 'hsk', level: Number(v.slice(4)) as HskLevel })
  }

  const goalRefs = useRef<(HTMLButtonElement | null)[]>([])
  const onGoalKey = (e: React.KeyboardEvent, i: number) => {
    let n = i
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % GOAL_OPTIONS.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + GOAL_OPTIONS.length) % GOAL_OPTIONS.length
    else return
    e.preventDefault()
    updateDaily({ goal: GOAL_OPTIONS[n] })
    goalRefs.current[n]?.focus()
  }

  // newCandidates draws from the chosen level UP to HSK 6, so "exhausted" means that whole range is learned:
  // a higher level cannot help, a lower one (or the Hán Việt list) can.
  const exhaustedNote = (() => {
    if (!plan.exhausted) return null
    const left = plan.newQueue.length
    const lead = (what: string) => (left > 0 ? `Chỉ còn ${left} chữ mới ${what}.` : `Bạn đã học hết chữ mới ${what}.`)
    if (daily.track === 'hanviet')
      return { text: lead('trong danh sách Hán Việt'), hint: 'Thử chọn một cấp HSK ở phần "Nguồn chữ mới".', prev: null as null | HskLevel }
    if (daily.level > 1)
      return {
        text: lead(`từ HSK ${daily.level} trở lên`),
        hint: `Thử lại HSK ${daily.level - 1} hoặc nguồn Hán Việt.`,
        prev: (daily.level - 1) as HskLevel,
      }
    return { text: lead('ở các cấp HSK'), hint: 'Thử nguồn Hán Việt, hoặc xem lại chữ hay quên trong Thống kê.', prev: null as null | HskLevel }
  })()

  const settings = (
    <section className="td-settings" aria-label="Cài đặt học hằng ngày">
      <div className="td-field">
        <span className="td-label" id="td-goal-label">Chữ mới mỗi ngày</span>
        <div className="td-seg" role="radiogroup" aria-labelledby="td-goal-label" data-testid="today-goal">
          {GOAL_OPTIONS.map((g, i) => {
            const on = daily.goal === g
            return (
              <button
                key={g}
                ref={(el) => {
                  goalRefs.current[i] = el
                }}
                type="button"
                role="radio"
                aria-checked={on}
                data-value={g}
                tabIndex={on ? 0 : -1}
                className={`td-seg-btn${on ? ' on' : ''}`}
                onClick={() => updateDaily({ goal: g as DailyGoal })}
                onKeyDown={(e) => onGoalKey(e, i)}
              >
                {g}
              </button>
            )
          })}
        </div>
      </div>
      <div className="td-field">
        <label className="td-label" htmlFor="td-source">Nguồn chữ mới</label>
        <select id="td-source" className="td-select" value={sourceValue} onChange={(e) => onSource(e.target.value)} data-testid="today-source">
          {LEVELS.map((l) => (
            <option key={l} value={`hsk-${l}`}>HSK {l}, theo tần suất</option>
          ))}
          <option value="hanviet">Hán Việt, chữ hay gặp trước</option>
        </select>
      </div>
    </section>
  )

  const links = (
    <nav className="td-links" aria-label="Lối tắt">
      <button type="button" className="td-link" onClick={onOpenStats}>
        <BarChart3 size={16} aria-hidden="true" />
        <span>Thống kê</span>
      </button>
      <button type="button" className="td-link" onClick={onOpenStudio}>
        <Library size={16} aria-hidden="true" />
        <span>Tra chữ / Thư viện</span>
      </button>
    </nav>
  )

  return (
    <div className="td" data-testid="today-view">
      <div className="td-page">
        <header className="td-head">
          <span className="td-label">Học hôm nay</span>
          <h1 className="td-title">{fresh ? 'Bắt đầu học chữ Hán' : complete ? 'Hôm nay xong rồi' : 'Hôm nay'}</h1>
          <p className="td-date">{dateLabel}</p>
        </header>

        {fresh ? (
          <p className="td-intro">
            Mỗi ngày một ít: học {plan.goal} chữ mới, nghe âm, xem nét viết và âm Hán Việt. Ứng dụng nhắc bạn ôn đúng lúc sắp quên.
          </p>
        ) : (
          <>
            <section className="td-hero" aria-label="Tiến độ hôm nay">
              <div
                className="td-ring"
                role="progressbar"
                aria-label="Tiến độ hôm nay"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-valuetext={total > 0 ? `Đã xong ${doneN} trên ${total} việc` : 'Chưa có việc nào'}
                data-testid="today-ring"
              >
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <circle className="td-ring-track" cx="60" cy="60" r={RING_R} />
                  <circle
                    className="td-ring-bar"
                    cx="60"
                    cy="60"
                    r={RING_R}
                    strokeDasharray={RING_C}
                    strokeDashoffset={RING_C * (1 - plan.progress)}
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="td-ring-text" aria-hidden="true">
                  {complete ? (
                    <Check size={32} strokeWidth={2.25} />
                  ) : total === 0 ? (
                    <span className="td-ring-n">–</span>
                  ) : (
                    <>
                      <span className="td-ring-n">{doneN}</span>
                      <span className="td-ring-of">/ {total}</span>
                    </>
                  )}
                </div>
              </div>

              <dl className="td-plan">
                <div className="td-row">
                  <dt className="td-label">Chữ mới</dt>
                  <dd className="td-count" data-testid="today-new-count">
                    <b>{plan.newQueue.length}</b> chữ mới
                  </dd>
                  <dd className="td-sub">
                    {plan.newDone > 0 ? `Đã học ${Math.min(plan.newDone, plan.goal)}/${plan.goal}` : `Mục tiêu ${plan.goal} chữ`}
                  </dd>
                </div>
                <div className="td-row">
                  <dt className="td-label">Cần ôn</dt>
                  <dd className="td-count" data-testid="today-due-count">
                    <b>{plan.dueLeft}</b> thẻ cần ôn
                  </dd>
                  <dd className="td-sub">{plan.reviewedToday > 0 ? `Đã ôn ${plan.reviewedToday} thẻ` : 'Đến hạn hôm nay'}</dd>
                </div>
              </dl>
            </section>

            <section className="td-streak" data-testid="today-streak" aria-label="Chuỗi ngày học">
              <Flame className="td-streak-icon" size={22} aria-hidden="true" />
              <div className="td-streak-body">
                {streak.current > 0 ? (
                  <p className="td-streak-line">
                    <b className="td-streak-n">{streak.current}</b> ngày học liên tiếp
                    {streak.todayActive && <span className="td-streak-ok"> · hôm nay đã tính</span>}
                  </p>
                ) : (
                  <p className="td-streak-line">Học hôm nay để bắt đầu chuỗi ngày học của bạn.</p>
                )}
                {streak.atRisk && (
                  <p className="td-warn" role="status">
                    Hôm qua bạn nghỉ — học hôm nay để giữ chuỗi.
                  </p>
                )}
                <p className="td-rule">Nghỉ 1 ngày không sao — nghỉ 2 ngày liền thì chuỗi bắt đầu lại.</p>
              </div>
            </section>
          </>
        )}

        {exhaustedNote && (
          <div className="td-note" role="status">
            <p className="td-note-text">
              <b>{exhaustedNote.text}</b> {exhaustedNote.hint}
            </p>
            {exhaustedNote.prev && (
              <button type="button" className="td-btn" onClick={() => updateDaily({ track: 'hsk', level: exhaustedNote.prev! })}>
                Về HSK {exhaustedNote.prev}
              </button>
            )}
          </div>
        )}

        {plan.next === 'done' ? (
          <section className="td-done" data-testid="today-done" aria-label="Đã xong hôm nay">
            <p className="td-done-text">
              {doneSummary ? `Hôm nay bạn đã ${doneSummary}.` : plan.exhausted ? 'Hiện chưa có chữ nào để học hoặc ôn.' : 'Hôm nay không có chữ nào cần học hoặc ôn.'}
              {due !== null && ` Lượt ôn kế tiếp: ${relDue(due, now)}.`}
            </p>
            <div className="td-done-actions">
              {more.length > 0 && (
                <button type="button" className="td-btn" onClick={() => setLearnQueue(more)} data-testid="today-more">
                  Học thêm {more.length} chữ
                </button>
              )}
              <button type="button" className="td-btn" onClick={onOpenStats}>
                Xem thống kê
              </button>
            </div>
          </section>
        ) : (
          <button type="button" className="td-cta" onClick={runNext} data-testid="today-next">
            {ctaLabel}
          </button>
        )}

        {settings}
        {links}
      </div>

      {learnQueue && (
        <LearnStep
          queue={learnQueue}
          characters={characters}
          onClose={() => setLearnQueue(null)}
          onFinished={() => {
            setLearnQueue(null)
            onStartReview()
          }}
          onOpenCharacter={(h) => {
            setLearnQueue(null)
            onOpenCharacter(h)
          }}
        />
      )}
    </div>
  )
}
