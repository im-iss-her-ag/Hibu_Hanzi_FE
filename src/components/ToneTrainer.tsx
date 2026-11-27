import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X, Mic, MicOff, Volume2, RotateCcw, ArrowRight, SlidersHorizontal, ShieldCheck } from 'lucide-react'
import type { EngineError, EngineState, PitchEngine, PitchFrame, SpeakerRange, ToneResult } from '../voice/types'
import { useModalA11y } from '../utils/useModalA11y'
import { pinyinSyllables } from '../utils/tone'
import { parsePinyin } from '../utils/pinyinData'
import { speakChinese } from '../utils/speech'
import { ToneTrainerCanvas, LIVE_WINDOW_MS, templateAt, type LiveTrace } from './ToneTrainerCanvas'
import { makeEngine, getRange, calibrate, observeUtterance, hzToChao, scoreTone, feedbackText, resultMessages, usingMock } from './ToneTrainerVoice'
import { mockPointer } from '../voice/mock'
import '../styles/tone-trainer.css'

type T4 = 1 | 2 | 3 | 4
type Mode = 'char' | 'free'
type Phase = 'intro' | 'calibrate' | 'practice'

const INTRO_KEY = 'hibu_tone_intro_ok'
const TONE_NAME: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'thanh 1 · cao đều',
  2: 'thanh 2 · đi lên',
  3: 'thanh 3 · xuống rồi lên',
  4: 'thanh 4 · rơi mạnh',
  5: 'thanh nhẹ',
}
const CALIB = ['mā', 'má', 'mǎ', 'mà']
const FREE_BASES = ['ma', 'ba', 'yi', 'shi']

const ERROR_TEXT: Record<EngineError, { title: string; body: string }> = {
  'permission-denied': {
    title: 'Micro đang bị chặn',
    body: 'Bấm biểu tượng ổ khoá (hoặc micro) cạnh thanh địa chỉ → Quyền trang web → Micro → Cho phép, rồi tải lại trang. Trên điện thoại: Cài đặt → trình duyệt → Micro.',
  },
  'no-microphone': {
    title: 'Không tìm thấy micro',
    body: 'Hãy cắm tai nghe có micro hoặc bật micro của máy, rồi thử lại.',
  },
  'insecure-context': {
    title: 'Cần kết nối bảo mật (HTTPS)',
    body: 'Trình duyệt chỉ cho dùng micro trên trang HTTPS hoặc localhost. Hãy mở ứng dụng qua địa chỉ https://.',
  },
  unsupported: {
    title: 'Trình duyệt chưa hỗ trợ',
    body: 'Trình duyệt này không có Web Audio / micro. Hãy dùng Chrome, Edge, Firefox hoặc Safari bản mới.',
  },
  unknown: {
    title: 'Không mở được micro',
    body: 'Có thể micro đang được ứng dụng khác dùng. Đóng ứng dụng đó rồi thử lại.',
  },
}

function precheck(): EngineError | null {
  if (typeof window === 'undefined') return 'unsupported'
  if (!window.isSecureContext) return 'insecure-context'
  if (!navigator.mediaDevices?.getUserMedia || !(window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext)) return 'unsupported'
  return null
}

function readLS(k: string) {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
function writeLS(k: string, v: string) {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* ignore */
  }
}

interface ToneTrainerProps {
  hanzi: string
  pinyin: string
  hanViet?: string | null
  initialMode?: Mode
  onNextChar?: () => void
  onClose: () => void
}

export function ToneTrainer({ hanzi, pinyin, hanViet, initialMode = 'char', onNextChar, onClose }: ToneTrainerProps) {
  const dialogRef = useModalA11y<HTMLDivElement>(onClose)
  const syllables = useMemo(() => pinyinSyllables(pinyin || ''), [pinyin])
  const chars = useMemo(() => Array.from(hanzi || ''), [hanzi])
  const [mode, setMode] = useState<Mode>(syllables.length ? initialMode : 'free')
  const [sylIdx, setSylIdx] = useState(0)
  const [freeBase, setFreeBase] = useState('ma')
  const [freeTone, setFreeTone] = useState<T4>(1)

  useEffect(() => setSylIdx(0), [pinyin])

  const freeVariants = useMemo(() => parsePinyin(freeBase).toneVariants, [freeBase])
  const target = useMemo(() => {
    if (mode === 'char' && syllables[sylIdx]) {
      const s = syllables[Math.min(sylIdx, syllables.length - 1)]
      return { text: s.text, tone: s.tone, hanzi: chars[sylIdx] ?? '' }
    }
    return { text: freeVariants[freeTone - 1]?.pinyin ?? freeBase, tone: freeTone as 1 | 2 | 3 | 4 | 5, hanzi: '' }
  }, [mode, syllables, sylIdx, chars, freeVariants, freeTone, freeBase])
  const tone4: T4 | null = target.tone === 5 ? null : (target.tone as T4)

  const pre = useMemo(precheck, [])
  const [phase, setPhase] = useState<Phase>(() => (readLS(INTRO_KEY) ? (getRange().source === 'default' ? 'calibrate' : 'practice') : 'intro'))
  const [engState, setEngState] = useState<EngineState>('idle')
  const [error, setError] = useState<EngineError | null>(usingMock() ? null : pre)
  const [result, setResult] = useState<ToneResult | null>(null)
  const [range, setRange] = useState<SpeakerRange>(getRange)
  const [calibStep, setCalibStep] = useState(0)
  const [hint, setHint] = useState<'quiet' | 'noisy' | null>(null)
  const [steer, setSteer] = useState<'up' | 'down' | 'ok' | null>(null)

  const live = useRef<LiveTrace>({ points: [], lastChao: null, lastAt: 0, level: 0 })
  const vuRef = useRef<HTMLSpanElement>(null)
  const engineRef = useRef<PitchEngine | null>(null)
  const ctx = useRef({ phase, tone4, range, resultShown: false, calibUtts: [] as PitchFrame[][], calibStep })
  ctx.current.phase = phase
  ctx.current.tone4 = tone4
  ctx.current.range = range
  ctx.current.resultShown = result !== null
  ctx.current.calibStep = calibStep
  const stats = useRef({ since: 0, maxLevel: 0, noisy: 0, total: 0 })

  // Engine lifecycle
  useEffect(() => {
    const eng = makeEngine(() => ctx.current.tone4 ?? 2)
    const isMock = usingMock()
    engineRef.current = eng
    let lastSteer: string | null = null
    const offState = eng.onState((s) => {
      setEngState(s)
      if (s === 'error') setError(eng.error ?? 'unknown')
      if (s === 'voiced' && !ctx.current.resultShown) {
        live.current.points = []
        setHint(null)
      }
      if (s === 'listening') stats.current = { since: performance.now(), maxLevel: 0, noisy: 0, total: 0 }
    })
    const offFrame = eng.onFrame((f) => {
      const L = live.current
      L.level = f.level
      if (vuRef.current) vuRef.current.style.transform = `scaleY(${Math.min(1, Math.sqrt(f.level) * 2.2).toFixed(3)})`
      const chao = f.hz != null ? hzToChao(f.hz, ctx.current.range) : null
      if (chao != null) {
        L.lastChao = chao
        L.lastAt = performance.now()
      }
      if (eng.state === 'voiced' && !ctx.current.resultShown) {
        L.points.push({ t: f.t, chao })
        const tt = ctx.current.tone4
        if (tt && chao != null && ctx.current.phase === 'practice') {
          const x = Math.min(1, f.t / (LIVE_WINDOW_MS * 0.58))
          const d = chao - templateAt(tt, x)
          const s = Math.abs(d) < 0.7 ? 'ok' : d > 0 ? 'down' : 'up'
          if (s !== lastSteer) {
            lastSteer = s
            setSteer(s)
          }
        }
      } else if (eng.state === 'listening') {
        const st = stats.current
        st.total++
        st.maxLevel = Math.max(st.maxLevel, f.level)
        if (f.level > 0.04 && f.clarity < 0.5) st.noisy++
        if (st.total % 25 === 0) {
          const el = performance.now() - st.since
          if (st.total > 100 && st.noisy / st.total > 0.6) setHint('noisy')
          else if (el > 4000 && st.maxLevel < 0.015) setHint('quiet')
          if (st.total > 150) stats.current = { since: st.since, maxLevel: 0, noisy: 0, total: 0 }
        }
      }
    })
    const offUtt = eng.onUtterance((frames) => {
      const c = ctx.current
      lastSteer = null
      setSteer(null)
      if (c.resultShown) return
      if (c.phase === 'calibrate') {
        if (import.meta.env.DEV) console.debug('[tt] calib utt', frames.length, frames.filter((f) => f.hz != null).length)
        if (frames.filter((f) => f.hz != null).length < 8) return
        c.calibUtts.push(frames)
        const next = c.calibStep + 1
        if (next >= CALIB.length) {
          const r = calibrate(c.calibUtts)
          c.calibUtts = []
          setRange(r)
          setCalibStep(0)
          setPhase('practice')
          live.current.points = []
        } else setCalibStep(next)
        return
      }
      if (c.phase !== 'practice' || !c.tone4) return
      const r = scoreTone(frames, c.tone4, c.range)
      setRange(isMock ? observeUtterance(frames) : getRange()) // real engine feeds the adaptive range itself
      setResult(r)
    })
    return () => {
      offState()
      offFrame()
      offUtt()
      eng.stop()
    }
  }, [])

  const listening = engState === 'listening' || engState === 'voiced'

  const start = useCallback(async () => {
    const eng = engineRef.current
    if (!eng) return
    setError(null)
    try {
      await eng.start()
    } catch {
      /* state handler reports */
    }
    if (eng.error) setError(eng.error)
  }, [])
  const stop = useCallback(() => engineRef.current?.stop(), [])
  const toggle = useCallback(() => (listening ? stop() : start()), [listening, start, stop])
  const retry = useCallback(() => {
    setResult(null)
    live.current.points = []
    if (!listening) start()
  }, [listening, start])

  const enable = () => {
    writeLS(INTRO_KEY, '1')
    setPhase(getRange().source === 'default' ? 'calibrate' : 'practice')
    start()
  }
  const recalibrate = () => {
    ctx.current.calibUtts = []
    setCalibStep(0)
    setResult(null)
    setPhase('calibrate')
    if (!listening) start()
  }
  const skipCalib = () => {
    setPhase('practice')
    if (!listening) start()
  }

  // Changing the target clears the old verdict and keeps listening.
  useEffect(() => {
    setResult(null)
    live.current.points = []
  }, [target.text, target.tone])

  const hasNext = mode === 'char' ? sylIdx < syllables.length - 1 || !!onNextChar : true
  const next = () => {
    if (mode === 'char') {
      if (sylIdx < syllables.length - 1) setSylIdx(sylIdx + 1)
      else onNextChar?.()
    } else setFreeTone((((freeTone % 4) + 1) as T4))
  }

  // Keyboard: Space toggle, R retry; swallow other keys so app shortcuts never fire.
  const keyRef = useRef({ toggle, retry, phase, error })
  keyRef.current = { toggle, retry, phase, error }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return
      const k = keyRef.current
      const focused = document.activeElement as HTMLElement | null
      const onOtherButton = focused?.closest('button') && !focused.closest('[data-tt="mic"]')
      if (e.key === ' ' && !onOtherButton && k.phase !== 'intro' && !k.error) {
        e.preventDefault()
        k.toggle()
      } else if (e.key.toLowerCase() === 'r' && k.phase === 'practice' && !e.repeat) {
        e.preventDefault()
        k.retry()
      }
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const onPointer = usingMock()
    ? (c: number | null) => {
        mockPointer.active = c != null
        if (c != null) mockPointer.chao = c
      }
    : undefined

  const statusText = error
    ? ''
    : engState === 'requesting-permission'
      ? 'Đang xin quyền micro…'
      : engState === 'voiced'
        ? 'Đang nghe giọng bạn…'
        : engState === 'listening'
          ? phase === 'calibrate'
            ? `Đọc “${CALIB[calibStep]}”`
            : result
              ? 'Micro đang mở — bấm Thử lại để đọc lần nữa'
              : `Đọc “${target.text}” khi sẵn sàng`
          : 'Micro đang tắt — bấm nút micro hoặc phím Space'

  const resultLine = (() => {
    if (!result) return null
    const msgs = resultMessages(result).filter((m) => result.detected === result.target || !m.startsWith('Đang giống'))
    if (result.detected == null) return { head: 'Chưa đo được', body: msgs[0] ?? feedbackText(result.feedback[0], result.target), more: msgs.slice(1, 3) }
    const head = result.detected === result.target ? `Đúng thanh ${result.target}` : `Bạn đọc giống thanh ${result.detected}`
    const body = msgs[0] ?? `Mẫu là ${TONE_NAME[result.target]}.`
    return { head, body, more: msgs.slice(1, 3) }
  })()

  const toneVar = (t: number) => ({ ['--tt-tone' as string]: `var(--tone-${t})` }) as React.CSSProperties

  return (
    <div className="pm-backdrop tt-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="pm-dialog tt-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tt-title"
        data-state={engState}
        data-phase={phase}
        style={toneVar(target.tone)}
      >
        <header className="pm-header tt-header">
          <h2 className="pm-title" id="tt-title">Nói thử thanh điệu</h2>
          {usingMock() && <span className="pm-tag" title="Đang dùng tín hiệu giả lập">mô phỏng</span>}
          <div className="pm-header-actions">
            {phase === 'practice' && !error && (
              <button type="button" className="pm-btn pm-btn-ghost tt-hide-sm" onClick={recalibrate} title="Đo lại quãng giọng">
                <SlidersHorizontal size={14} aria-hidden="true" /> Đo lại giọng
              </button>
            )}
            <button type="button" className="pm-icon-btn tt-close" onClick={onClose} aria-label="Đóng" title="Đóng (Esc)">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="pm-body tt-body">
          {error ? (
            <section className="tt-state" data-tt-error={error} role="alert">
              <MicOff size={28} aria-hidden="true" className="tt-state-icon" />
              <h3>{ERROR_TEXT[error].title}</h3>
              <p>{ERROR_TEXT[error].body}</p>
              {(error === 'permission-denied' || error === 'no-microphone' || error === 'unknown') && (
                <button type="button" className="tt-primary" onClick={start} data-tt="enable">
                  Thử lại
                </button>
              )}
            </section>
          ) : phase === 'intro' ? (
            <section className="tt-state tt-intro">
              <Mic size={28} aria-hidden="true" className="tt-state-icon" />
              <h3>Luyện thanh điệu bằng giọng của bạn</h3>
              <p>
                Bạn đọc một âm tiết, ứng dụng vẽ <b>đường cao độ</b> giọng bạn ngay khi nói, đặt cạnh <b>làn mẫu</b> của thanh điệu, rồi
                chỉ ra chỗ cần lên hay xuống.
              </p>
              <p>Trình duyệt sẽ hỏi quyền dùng micro. Hãy chọn <b>Cho phép</b>.</p>
              <button type="button" className="tt-primary" onClick={enable} data-tt="enable">
                <Mic size={18} aria-hidden="true" /> Bật micro
              </button>
            </section>
          ) : (
            <>
              {phase === 'calibrate' ? (
                <section className="tt-calib">
                  <p className="tt-label">Đo quãng giọng · bước {calibStep + 1}/{CALIB.length}</p>
                  <p className="tt-calib-text">
                    Mỗi giọng có độ cao riêng. Đọc lần lượt 4 âm dưới đây với giọng tự nhiên để thang 1–5 khớp với giọng bạn.
                  </p>
                  <div className="tt-calib-steps" aria-live="polite">
                    {CALIB.map((s, i) => (
                      <span key={s} className={`tt-calib-step ${i < calibStep ? 'is-done' : i === calibStep ? 'is-now' : ''}`} style={toneVar(i + 1)}>
                        {s}
                      </span>
                    ))}
                  </div>
                </section>
              ) : (
                <section className="tt-target">
                  <div className="tt-modes" role="tablist" aria-label="Chế độ luyện">
                    <button type="button" role="tab" aria-selected={mode === 'char'} disabled={!syllables.length} className={mode === 'char' ? 'is-on' : ''} onClick={() => setMode('char')}>
                      Chữ đang học
                    </button>
                    <button type="button" role="tab" aria-selected={mode === 'free'} className={mode === 'free' ? 'is-on' : ''} onClick={() => setMode('free')}>
                      Luyện tự do
                    </button>
                  </div>
                  {mode === 'char' ? (
                    <div className="tt-chips" role="group" aria-label="Chọn âm tiết">
                      {syllables.map((s, i) => (
                        <button key={i} type="button" className={`tt-chip ${i === sylIdx ? 'is-on' : ''}`} aria-pressed={i === sylIdx} style={toneVar(s.tone)} onClick={() => setSylIdx(i)}>
                          {chars[i] && <span className="tt-chip-han" lang="zh">{chars[i]}</span>}
                          <span className="tt-chip-py">{s.text}</span>
                        </button>
                      ))}
                      {hanViet && <span className="tt-hv" title="Hán Việt">{hanViet}</span>}
                    </div>
                  ) : (
                    <div className="tt-free">
                      <div className="tt-chips" role="group" aria-label="Âm tiết">
                        {Array.from(new Set([...(syllables[sylIdx] ? [parsePinyin(syllables[sylIdx].text).normalized] : []), ...FREE_BASES]))
                          .filter(Boolean)
                          .map((b) => (
                            <button key={b} type="button" className={`tt-chip tt-chip-base ${b === freeBase ? 'is-on' : ''}`} aria-pressed={b === freeBase} onClick={() => setFreeBase(b)}>
                              {b}
                            </button>
                          ))}
                      </div>
                      <div className="tt-chips" role="group" aria-label="Thanh điệu">
                        {([1, 2, 3, 4] as const).map((t) => (
                          <button key={t} type="button" className={`tt-chip tt-chip-tone ${t === freeTone ? 'is-on' : ''}`} aria-pressed={t === freeTone} style={toneVar(t)} onClick={() => setFreeTone(t)}>
                            <span className="tt-chip-py">{freeVariants[t - 1]?.pinyin ?? freeBase}</span>
                            <span className="tt-chip-sub">thanh {t}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="tt-goal">
                    <span className="tt-goal-py" lang="zh-Latn">{target.text}</span>
                    <span className="tt-goal-name">{TONE_NAME[target.tone]}</span>
                    <button type="button" className="tt-sq" onClick={() => speakChinese(target.hanzi || target.text, 0.8, target.text)} title="Nghe mẫu" aria-label="Nghe mẫu">
                      <Volume2 size={18} />
                    </button>
                  </div>
                </section>
              )}

              {tone4 === null && phase === 'practice' ? (
                <p className="tt-note">Âm “{target.text}” là thanh nhẹ, đọc ngắn và nhẹ, không có đường mẫu cố định. Hãy chọn âm khác hoặc chuyển sang Luyện tự do.</p>
              ) : (
                <div className="tt-stage">
                  <div className="tt-axis-label" aria-hidden="true">
                    <span>cao</span>
                    <span>thấp</span>
                  </div>
                  <ToneTrainerCanvas
                    live={live}
                    tone={phase === 'calibrate' ? (calibStep + 1) as T4 : tone4}
                    result={result?.contour.length ? result.contour : null}
                    listening={listening}
                    label={result ? `Đường giọng của bạn so với mẫu ${TONE_NAME[result.target]}` : 'Đường cao độ giọng nói theo thời gian, thang 1 thấp đến 5 cao'}
                    onPointer={onPointer}
                  />
                  <span className="tt-vu" aria-hidden="true" title="Âm lượng">
                    <span ref={vuRef} />
                  </span>
                  {!result && listening && phase === 'practice' && steer && steer !== 'ok' && (
                    <span className={`tt-steer is-${steer}`} aria-hidden="true">{steer === 'up' ? '↑ lên một chút' : '↓ hạ xuống một chút'}</span>
                  )}
                </div>
              )}

              <div className="tt-status" aria-live="polite">
                <span className={`tt-dot ${listening ? 'is-on' : ''} ${engState === 'voiced' ? 'is-voiced' : ''}`} aria-hidden="true" />
                <span>{statusText}</span>
                {hint === 'quiet' && !result && <span className="tt-hint">Chưa nghe rõ — nói to hơn hoặc đưa micro lại gần.</span>}
                {hint === 'noisy' && !result && <span className="tt-hint">Xung quanh hơi ồn — tìm chỗ yên tĩnh hơn.</span>}
              </div>

              {result && resultLine && (
                <section className="tt-result" aria-live="polite" style={toneVar(result.target)}>
                  <div className="tt-score">
                    <span className="tt-score-n">{result.score}</span>
                    <span className="tt-score-of">/100</span>
                  </div>
                  <div className="tt-verdict">
                    <p className="tt-verdict-head">{resultLine.head}</p>
                    <p className="tt-verdict-body">{resultLine.body}</p>
                    {resultLine.more.map((m) => (
                      <p key={m} className="tt-verdict-more">{m}</p>
                    ))}
                    <div className="tt-sim" aria-label="Độ giống từng thanh">
                      {([1, 2, 3, 4] as const).map((t) => (
                        <span key={t} className={t === result.target ? 'is-target' : ''} style={toneVar(t)}>
                          <i style={{ height: `${Math.round(result.similarity[t] * 100)}%` }} />
                          <b>{t}</b>
                        </span>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {!error && phase !== 'intro' && (
          <footer className="tt-actions">
            {phase === 'calibrate' ? (
              <>
                <button type="button" className="tt-btn" onClick={skipCalib} data-tt="calib-skip">Bỏ qua</button>
                <button type="button" className={`tt-mic ${listening ? 'is-on' : ''}`} onClick={toggle} data-tt="mic" aria-pressed={listening} aria-label={listening ? 'Tắt micro' : 'Bật micro'}>
                  {listening ? <Mic size={22} /> : <MicOff size={22} />}
                </button>
                <span className="tt-actions-gap" />
              </>
            ) : (
              <>
                <button type="button" className="tt-btn" onClick={() => speakChinese(target.hanzi || target.text, 0.8, target.text)}>
                  <Volume2 size={16} aria-hidden="true" /> Nghe mẫu
                </button>
                {result ? (
                  <button type="button" className="tt-btn tt-btn-strong" onClick={retry} data-tt="retry">
                    <RotateCcw size={16} aria-hidden="true" /> Thử lại <kbd>R</kbd>
                  </button>
                ) : (
                  <button type="button" className={`tt-mic ${listening ? 'is-on' : ''}`} onClick={toggle} data-tt="mic" aria-pressed={listening} aria-label={listening ? 'Tắt micro (Space)' : 'Bật micro (Space)'} title="Space">
                    {listening ? <Mic size={22} /> : <MicOff size={22} />}
                  </button>
                )}
                <button type="button" className="tt-btn" onClick={next} disabled={!hasNext}>
                  Tiếp <ArrowRight size={16} aria-hidden="true" />
                </button>
              </>
            )}
          </footer>
        )}
        <p className="tt-foot">
          <ShieldCheck size={12} aria-hidden="true" /> Âm thanh chỉ xử lý trên máy bạn, không gửi đi đâu.
          <span className="tt-keys tt-hide-sm"><kbd>Space</kbd> bật/tắt micro · <kbd>R</kbd> thử lại · <kbd>Esc</kbd> đóng</span>
          {phase === 'practice' && !error && (
            <button type="button" className="tt-link tt-only-sm" onClick={recalibrate}>Đo lại giọng</button>
          )}
        </p>
      </div>
    </div>
  )
}
