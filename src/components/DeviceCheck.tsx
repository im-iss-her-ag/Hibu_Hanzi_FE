import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, CircleDashed, Mic, Square, Volume2, Copy } from 'lucide-react'
import type { EngineError } from '../voice/types'
import { classifyMediaError as classify } from '../voice/engine'
import '../styles/device-check.css'

/** Inline diagnostic panel ("Kiểm tra thiết bị") rendered inside the tone trainer dialog. Self-contained: own mic stream + AudioContext. */

type DevErr = EngineError
type St = 'ok' | 'warn' | 'fail' | 'idle'
type Perm = 'granted' | 'prompt' | 'denied' | 'unknown'
type Plat = 'ios' | 'android' | 'mac' | 'win' | 'other'
type Br = 'chrome' | 'firefox' | 'safari'
interface Row { id: string; title: string; st: St; text: string; help?: string[]; more?: string[] }
type AC = typeof AudioContext

const ST_LABEL: Record<St, string> = { ok: 'Tốt', warn: 'Lưu ý', fail: 'Lỗi', idle: 'Chưa kiểm tra' }
const ST_ICON = { ok: CheckCircle2, warn: AlertTriangle, fail: XCircle, idle: CircleDashed }
const LEVEL_OK_DB = -40 // peak RMS above this = the mic hears something

function detectEnv() {
  const ua = navigator.userAgent
  const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext) as AC | undefined
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const plat: Plat = ios ? 'ios' : /Android/.test(ua) ? 'android' : /Mac/.test(ua) ? 'mac' : /Win/.test(ua) ? 'win' : 'other'
  const br: Br = /Firefox|FxiOS/.test(ua) ? 'firefox' : /Chrome|CriOS|Edg/.test(ua) ? 'chrome' : /Safari/.test(ua) ? 'safari' : 'chrome'
  return {
    ua, plat, br, Ctor, secure: window.isSecureContext, gum: !!navigator.mediaDevices?.getUserMedia,
    worklet: !!Ctor && 'audioWorklet' in Ctor.prototype && typeof AudioWorkletNode !== 'undefined',
  }
}
type Env = ReturnType<typeof detectEnv>

const PERM_LINES: Record<string, string> = {
  ios: 'iPhone/iPad: Cài đặt → Safari → Micro → Cho phép (hoặc chạm aA trên thanh địa chỉ → Cài đặt trang web → Micro). Chrome iOS: Cài đặt → Chrome → Micro.',
  android: 'Android Chrome: chạm ổ khoá (hoặc ⋮) → Cài đặt trang web → Micro → Cho phép. Vẫn bị chặn: Cài đặt Android → Ứng dụng → Chrome → Quyền → Micro.',
  chrome: 'Chrome/Edge: bấm ổ khoá cạnh địa chỉ → Micro → Cho phép, rồi tải lại trang.',
  firefox: 'Firefox: bấm biểu tượng micro gạch chéo ở thanh địa chỉ → bỏ chặn, rồi tải lại trang.',
  safari: 'Safari macOS: Safari → Cài đặt → Trang web → Micro → Cho phép trang này.',
  mac: 'macOS: Cài đặt hệ thống → Quyền riêng tư & Bảo mật → Micro → bật cho trình duyệt.',
  win: 'Windows: Cài đặt → Quyền riêng tư → Micro → cho phép ứng dụng truy cập micro.',
}
function permHelp(e: Env) {
  const rel = e.plat === 'ios' ? ['ios'] : e.plat === 'android' ? ['android'] : [e.br, ...(e.plat === 'mac' || e.plat === 'win' ? [e.plat] : [])]
  return { help: rel.map((k) => PERM_LINES[k]), more: Object.keys(PERM_LINES).filter((k) => !rel.includes(k)).map((k) => PERM_LINES[k]) }
}

const ERR_ROW: Record<Exclude<DevErr, 'insecure-context' | 'unsupported'>, { text: string; help: string }> = {
  'permission-denied': { text: 'Micro đang bị chặn cho trang này.', help: '' },
  'no-microphone': { text: 'Không tìm thấy micro.', help: 'Cắm tai nghe có micro hoặc bật micro của máy, rồi thử lại. Kiểm tra micro đã được chọn trong cài đặt âm thanh của hệ điều hành.' },
  'mic-busy': { text: 'Micro đang bận hoặc bị lỗi phần cứng.', help: 'Đóng Zoom, Meet, Teams, ứng dụng ghi âm hoặc tab khác đang dùng micro rồi thử lại. Vừa có cuộc gọi thì tắt cuộc gọi; vẫn lỗi thì cắm lại tai nghe hoặc khởi động lại trình duyệt.' },
  unknown: { text: 'Không mở được micro.', help: 'Tải lại trang, đóng ứng dụng khác đang dùng micro hoặc thử trình duyệt khác. Bấm “Sao chép thông tin” và gửi cho người hỗ trợ.' },
}

const ms = (s?: number) => (typeof s === 'number' && isFinite(s) && s > 0 ? `${Math.round(s * 1000)} ms` : 'không đo được')
const yn = (b: boolean) => (b ? 'có' : 'không')
const yb = (b?: boolean | string) => (b === undefined ? '?' : b && b !== 'false' ? 'bật' : 'tắt')

export function DeviceCheck({ onBack }: { onBack: () => void }) {
  const env = useMemo(detectEnv, [])
  const [perm, setPerm] = useState<Perm>('unknown')
  const [run, setRun] = useState<'idle' | 'starting' | 'on'>('idle')
  const [err, setErr] = useState<DevErr | null>(null)
  const [mic, setMic] = useState<{ label: string; s: MediaTrackSettings } | null>(null)
  const [au, setAu] = useState<{ rate: number; base?: number; out?: number; state: string } | null>(null)
  const [lvl, setLvl] = useState<'wait' | 'ok' | 'low'>('wait')
  const [spk, setSpk] = useState<'idle' | 'asking' | 'heard' | 'not'>('idle')
  const [copy, setCopy] = useState<{ st: 'idle' | 'ok' | 'fail'; text: string }>({ st: 'idle', text: '' })
  const R = useRef<{ stream?: MediaStream; ctx?: AudioContext; raf?: number; timer?: number }>({})
  const titleRef = useRef<HTMLHeadingElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const dbRef = useRef<HTMLSpanElement>(null)

  const stop = useCallback(() => {
    const r = R.current
    if (r.raf) cancelAnimationFrame(r.raf)
    if (r.timer) clearTimeout(r.timer)
    r.stream?.getTracks().forEach((t) => { t.onended = null; t.stop() })
    r.ctx?.close().catch(() => {})
    R.current = {}
    setRun('idle')
  }, [])
  useEffect(() => { titleRef.current?.focus(); return () => stop() }, [stop])

  // Permission state (Firefox / old Safari throw or lack navigator.permissions → stays "unknown").
  useEffect(() => {
    let ps: PermissionStatus | undefined
    let dead = false
    const read = () => ps && !dead && setPerm(ps.state === 'granted' ? 'granted' : ps.state === 'denied' ? 'denied' : 'prompt')
    try {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then((p) => { ps = p; read(); p.onchange = read }).catch(() => {})
    } catch { /* unsupported */ }
    return () => { dead = true; if (ps) ps.onchange = null }
  }, [])

  const readAu = (c: AudioContext) =>
    setAu({ rate: c.sampleRate, base: c.baseLatency, out: (c as AudioContext & { outputLatency?: number }).outputLatency, state: c.state })
  // Must be called synchronously inside a click handler (iOS only unlocks audio from a user gesture).
  const ensureCtx = () => {
    const r = R.current
    if (!r.ctx || r.ctx.state === 'closed') r.ctx = new env.Ctor!()
    r.ctx.resume().catch(() => {})
    readAu(r.ctx)
    return r.ctx
  }

  const start = async () => {
    if (run !== 'idle') return
    setErr(null); setMic(null); setLvl('wait'); setRun('starting')
    if (!env.secure || !env.gum || !env.Ctor) { setErr(env.secure ? 'unsupported' : 'insecure-context'); setRun('idle'); return }
    let ctx: AudioContext
    try { ctx = ensureCtx() } catch { setErr('unsupported'); setRun('idle'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      if (R.current.ctx !== ctx) { stream.getTracks().forEach((t) => t.stop()); return } // stopped / unmounted meanwhile
      await ctx.resume().catch(() => {})
      const track = stream.getAudioTracks()[0]
      track.onended = () => { stop(); setErr('mic-busy') }
      R.current.stream = stream
      setMic({ label: track.label, s: track.getSettings?.() ?? {} })
      setPerm('granted'); readAu(ctx); setRun('on')
      const src = ctx.createMediaStreamSource(stream)
      const an = ctx.createAnalyser()
      an.fftSize = 2048
      const mute = ctx.createGain()
      mute.gain.value = 0 // routed to the destination (some browsers only pull a graph that reaches it) but silent: no feedback
      src.connect(an); an.connect(mute); mute.connect(ctx.destination)
      const buf = new Float32Array(an.fftSize)
      const bytes = typeof an.getFloatTimeDomainData === 'function' ? null : new Uint8Array(an.fftSize) // Safari < 14.1
      const t0 = performance.now()
      let peak = -Infinity, lastTxt = 0, ok = false, low = false
      const tick = (now: number) => {
        if (bytes) { an.getByteTimeDomainData(bytes); for (let i = 0; i < bytes.length; i++) buf[i] = (bytes[i] - 128) / 128 }
        else an.getFloatTimeDomainData(buf)
        let s = 0
        for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]
        const db = 20 * Math.log10(Math.sqrt(s / buf.length) || 1e-6)
        peak = Math.max(peak, db)
        if (barRef.current) barRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0, (db + 60) / 60)).toFixed(3)})`
        if (dbRef.current && now - lastTxt > 200) { lastTxt = now; dbRef.current.textContent = `${Math.max(-60, Math.round(db))} dBFS` }
        if (!ok && peak > LEVEL_OK_DB) { ok = true; setLvl('ok') }
        else if (!ok && !low && now - t0 > 5000) { low = true; setLvl('low') }
        R.current.raf = requestAnimationFrame(tick)
      }
      R.current.raf = requestAnimationFrame(tick)
    } catch (e) {
      stop()
      setErr(classify(e))
    }
  }

  const playTone = () => {
    let ctx: AudioContext
    try { ctx = ensureCtx() } catch { setErr('unsupported'); return }
    const t = ctx.currentTime + 0.05
    const osc = ctx.createOscillator(), g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, t)
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.55)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.06)
    g.gain.setValueAtTime(0.25, t + 0.45)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
    osc.connect(g); g.connect(ctx.destination)
    osc.start(t); osc.stop(t + 0.65)
    setSpk('asking')
    window.setTimeout(() => R.current.ctx === ctx && readAu(ctx), 300) // outputLatency is more accurate once audio is playing
  }

  const permH = permHelp(env)
  const envBad = !env.secure ? 'insecure-context' : !env.gum || !env.Ctor ? 'unsupported' : null
  const rows: Row[] = []
  rows.push({
    id: 'env', title: 'Bảo mật & trình duyệt',
    ...(envBad === 'insecure-context'
      ? { st: 'fail', text: 'Trang không chạy trên HTTPS hoặc localhost nên trình duyệt chặn micro.', help: ['Hãy mở ứng dụng qua địa chỉ https:// (http:// với địa chỉ IP mạng nội bộ sẽ không dùng được micro).'] }
      : envBad
        ? { st: 'fail', text: 'Trình duyệt thiếu Web Audio hoặc getUserMedia.', help: ['Dùng Chrome, Edge, Firefox hoặc Safari bản mới (iPhone/iPad: cập nhật iOS).'] }
        : { st: env.worklet ? 'ok' : 'warn', text: `HTTPS ${yn(env.secure)} · Web Audio ${yn(!!env.Ctor)} · getUserMedia ${yn(env.gum)} · AudioWorklet ${yn(env.worklet)}${env.worklet ? '' : ' — app sẽ dùng chế độ dự phòng, có thể kém mượt.'}` }),
  } as Row)

  const errInfo = err && err !== 'insecure-context' && err !== 'unsupported' ? ERR_ROW[err] : null
  const permFail = err === 'permission-denied' || (perm === 'denied' && run !== 'on')
  rows.push(
    permFail
      ? { id: 'perm', title: 'Quyền micro', st: 'fail', text: ERR_ROW['permission-denied'].text, help: permH.help, more: permH.more }
      : errInfo
        ? { id: 'perm', title: 'Quyền micro & thiết bị', st: 'fail', text: errInfo.text, help: [errInfo.help] }
        : run === 'on' || perm === 'granted'
          ? { id: 'perm', title: 'Quyền micro', st: 'ok', text: run === 'on' ? 'Đã cho phép, micro đang mở.' : 'Đã cho phép.' }
          : { id: 'perm', title: 'Quyền micro', st: 'idle', text: perm === 'prompt' ? 'Chưa cấp. Trình duyệt sẽ hỏi khi bạn bấm “Bắt đầu kiểm tra”.' : 'Trình duyệt không cho tra cứu trước, hãy bấm “Bắt đầu kiểm tra”.' },
  )

  const s = mic?.s
  const stillProcessed = !!s && (s.echoCancellation || s.noiseSuppression || s.autoGainControl)
  rows.push(
    mic
      ? {
          id: 'mic', title: 'Micro', st: stillProcessed ? 'warn' : 'ok',
          text: `${mic.label || '(không rõ tên)'}${s?.sampleRate ? ` · ${s.sampleRate} Hz` : ''}${s?.channelCount ? ` · ${s.channelCount} kênh` : ''} · khử vọng ${yb(s?.echoCancellation)} · khử ồn ${yb(s?.noiseSuppression)} · tự chỉnh âm ${yb(s?.autoGainControl)}`,
          help: stillProcessed ? ['Trình duyệt vẫn bật xử lý giọng (khử ồn / tự chỉnh âm). Có thể làm lệch cao độ nhẹ; trình duyệt trên iPhone thường không cho tắt.'] : undefined,
        }
      : { id: 'mic', title: 'Micro', st: 'idle', text: 'Chưa mở micro.' },
    { id: 'level', title: 'Mức âm vào', st: run !== 'on' ? 'idle' : lvl === 'ok' ? 'ok' : lvl === 'low' ? 'warn' : 'idle',
      text: run !== 'on' ? 'Cần mở micro trước.' : lvl === 'ok' ? 'Micro nghe thấy bạn.' : lvl === 'low' ? 'Gần như không nghe thấy gì.' : 'Hãy nói “a…” vào micro.',
      help: lvl === 'low' && run === 'on' ? ['Đưa micro lại gần, tăng âm lượng thu trong cài đặt hệ thống, kiểm tra micro không bị tắt (nút mute trên tai nghe) và đã chọn đúng thiết bị.'] : undefined },
  )

  const lowRate = !!au && Math.min(au.rate, mic?.s.sampleRate ?? Infinity) <= 16000
  rows.push(
    !au ? { id: 'rate', title: 'Tần số lấy mẫu', st: 'idle', text: 'Chưa đo.' }
      : lowRate
        ? { id: 'rate', title: 'Tần số lấy mẫu', st: 'warn', text: `${au.rate} Hz${mic?.s.sampleRate ? ` (micro ${mic.s.sampleRate} Hz)` : ''}. Thấp hơn bình thường (44,1 / 48 kHz).`, help: ['Có thể đang dùng tai nghe Bluetooth ở chế độ đàm thoại (HFP): cao độ kém chính xác. Hãy dùng micro của máy hoặc tai nghe có dây.'] }
        : { id: 'rate', title: 'Tần số lấy mẫu', st: 'ok', text: `${au.rate} Hz (44,1 / 48 kHz là bình thường).` },
  )

  rows.push(
    spk === 'heard' ? { id: 'spk', title: 'Loa / tai nghe', st: 'ok', text: 'Bạn nghe thấy âm thử.' }
      : spk === 'not' ? { id: 'spk', title: 'Loa / tai nghe', st: 'fail', text: 'Bạn không nghe thấy âm thử.', help: [...(env.plat === 'ios' ? ['iPhone: gạt công tắc im lặng ở cạnh máy sang bên có tiếng và tăng âm lượng. Âm thanh trong trình duyệt bị tắt khi công tắc đang im lặng.'] : []), 'Tăng âm lượng, bỏ tắt tiếng. Nếu đang nối Bluetooth, thử tắt Bluetooth hoặc chọn lại loa/tai nghe.'] }
        : { id: 'spk', title: 'Loa / tai nghe', st: 'idle', text: spk === 'asking' ? 'Bạn có nghe thấy âm thanh vừa phát không?' : 'Bấm “Phát âm thử” để nghe âm thử.' },
  )

  const lat = au && (au.base ?? 0) + (au.out ?? 0)
  rows.push(
    !au ? { id: 'lat', title: 'Độ trễ âm thanh', st: 'idle', text: 'Chưa đo.' }
      : au.base == null && au.out == null ? { id: 'lat', title: 'Độ trễ âm thanh', st: 'idle', text: 'Trình duyệt không cho đo độ trễ.' }
        : { id: 'lat', title: 'Độ trễ âm thanh', st: (lat ?? 0) > 0.15 ? 'warn' : 'ok',
            text: `Vào ${ms(au.base)} · ra ${ms(au.out)}${(lat ?? 0) > 0.15 ? '. Cao (thường do Bluetooth). Chỉ ảnh hưởng độ khớp khi phát mẫu, không ảnh hưởng điểm chấm.' : ''}` },
  )

  const summary = () =>
    [
      `Hibu Hanzi · Kiểm tra thiết bị · ${new Date().toISOString()}`,
      `UA: ${env.ua}`,
      `Nền tảng: ${env.plat}/${env.br} · cảm ứng ${navigator.maxTouchPoints} · màn hình ${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}`,
      `Quyền micro (permissions API): ${perm}${err ? ` · lỗi: ${err}` : ''}`,
      ...rows.map((r) => `[${r.st.toUpperCase()}] ${r.title}: ${r.text}`),
      ...(mic ? [`Cài đặt track: ${JSON.stringify(mic.s)}`] : []),
      ...(au ? [`AudioContext: state=${au.state} sampleRate=${au.rate} baseLatency=${au.base} outputLatency=${au.out}`] : []),
    ].join('\n')
  const doCopy = async () => {
    const text = summary()
    try {
      await navigator.clipboard.writeText(text)
      setCopy({ st: 'ok', text })
    } catch {
      setCopy({ st: 'fail', text })
    }
  }

  const live = run === 'starting' ? 'Đang xin quyền micro…' : ''
  return (
    <section className="dc" aria-labelledby="dc-title">
      <div className="dc-head">
        <button type="button" className="pm-btn" onClick={() => { stop(); onBack() }}>
          <ArrowLeft size={16} aria-hidden="true" /> Quay lại
        </button>
        <h3 id="dc-title" className="dc-title" tabIndex={-1} ref={titleRef}>Kiểm tra thiết bị</h3>
      </div>
      <p className="dc-lead">Kiểm tra micro, loa và trình duyệt. Âm thanh chỉ xử lý trên máy bạn. Mọi thứ tự tắt khi bạn quay lại.</p>

      <div className="dc-actions">
        {run === 'on' ? (
          <button type="button" className="pm-btn pm-btn-primary" onClick={stop}><Square size={14} aria-hidden="true" /> Dừng</button>
        ) : (
          <button type="button" className="pm-btn pm-btn-primary" onClick={start} disabled={run === 'starting'} data-dc="start">
            <Mic size={16} aria-hidden="true" /> {err || mic ? 'Kiểm tra lại' : 'Bắt đầu kiểm tra'}
          </button>
        )}
        <button type="button" className="pm-btn" onClick={playTone} disabled={!env.Ctor} data-dc="tone"><Volume2 size={16} aria-hidden="true" /> Phát âm thử</button>
      </div>
      <p className="sr-only" role="status" aria-live="polite">{live}</p>

      <ul className="dc-list" aria-live="polite" aria-label="Kết quả kiểm tra">
        {rows.map((r) => {
          const Icon = ST_ICON[r.st]
          return (
            <li key={r.id} className="dc-row" data-st={r.st} data-id={r.id}>
              <Icon size={18} className="dc-ico" aria-hidden="true" />
              <div className="dc-main">
                <p className="dc-rt"><b>{r.title}</b> <span className="dc-st">{ST_LABEL[r.st]}</span></p>
                <p className="dc-tx">{r.text}</p>
                {r.id === 'level' && run === 'on' && (
                  <div className="dc-meter" aria-hidden="true"><span className="dc-track"><span ref={barRef} className={lvl === 'ok' ? 'is-ok' : ''} /></span><span ref={dbRef} className="dc-db" /></div>
                )}
                {r.id === 'spk' && spk === 'asking' && (
                  <div className="dc-actions">
                    <button type="button" className="pm-btn" onClick={() => setSpk('heard')}>Nghe thấy</button>
                    <button type="button" className="pm-btn" onClick={() => setSpk('not')}>Không nghe thấy</button>
                  </div>
                )}
                {r.help?.map((h) => <p key={h} className="dc-help">{h}</p>)}
                {r.more && (
                  <details className="dc-more"><summary>Cách làm trên thiết bị khác</summary>{r.more.map((h) => <p key={h} className="dc-help">{h}</p>)}</details>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <div className="dc-actions">
        <button type="button" className="pm-btn" onClick={doCopy} data-dc="copy"><Copy size={16} aria-hidden="true" /> Sao chép thông tin</button>
        <span className="dc-copied" role="status" aria-live="polite">{copy.st === 'ok' ? 'Đã sao chép.' : copy.st === 'fail' ? 'Không sao chép được. Hãy chọn và sao chép thủ công bên dưới.' : ''}</span>
      </div>
      {copy.st === 'fail' && <textarea className="dc-box" readOnly rows={6} value={copy.text} aria-label="Thông tin chẩn đoán" onFocus={(e) => e.currentTarget.select()} />}
    </section>
  )
}
