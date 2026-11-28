import { useEffect, useId, useRef } from 'react'

/**
 * Shared modal behaviour for every dialog in the app.
 *
 *  - Module-level STACK: only the top-most dialog handles Esc / Tab. Esc closes it exactly once
 *    (held-down key repeats are ignored), and an inner widget that consumes Esc (preventDefault in a
 *    React handler, which runs before this window-level bubble listener) is respected.
 *  - Focus: the opener is captured during the first render (before autoFocus moves focus), initial focus
 *    goes to an autofocus target / first meaningful control / the container, Tab is trapped, and on close
 *    focus returns to the opener. If the opener is gone: the opener of the dialog that spawned this one,
 *    else the dialog now underneath. A dialog opened in the same tick (pronunciation -> tone trainer)
 *    is never robbed of focus.
 *  - Scroll lock: while any scroll-locking dialog is open every scrollable background element
 *    (.main-scroll, rail body, html/body when scrollable) gets overflow-y:hidden, with padding-right added
 *    only if the scrollbar's disappearance would shift layout. Released exactly when the stack empties.
 *
 * Backward compatible usage:  const ref = useModalA11y<HTMLDivElement>(onClose)
 * Full usage (role/aria-modal/aria-labelledby on the dialog element itself):
 *   const { ref, dialogProps, titleId } = useModalDialog<HTMLDivElement>(onClose)
 *   <div className="pm-dialog" ref={ref} {...dialogProps}> <h2 id={titleId}>…
 */

export interface ModalOptions {
  /** Register only while true (for dialogs that stay mounted, e.g. the list drawer). Default true. */
  enabled?: boolean
  /** Lock background scroll while open. Default true. */
  lockScroll?: boolean
  /** CSS selector (inside the dialog) or function choosing the initially focused element. */
  initialFocus?: string | ((dialog: HTMLElement) => HTMLElement | null)
}

interface Entry {
  seq: number
  el: HTMLElement
  close: () => void
  opener: HTMLElement | null
  /** Trigger of the menu the opener lived in (a menu item is gone/hidden once the menu closes). */
  openerAlt: HTMLElement | null
  parent: Entry | null
  lastFocus: HTMLElement | null
  lockScroll: boolean
}

const stack: Entry[] = []
let seqCounter = 0

/** True while at least one dialog registered with useModalDialog is open. */
export function isModalOpen(): boolean {
  return stack.length > 0
}

// ---------------------------------------------------------------------------------------------
// Focus helpers
// ---------------------------------------------------------------------------------------------
const TABBABLE =
  'a[href], area[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex], [contenteditable=""], [contenteditable="true"]'

function isTabbable(el: HTMLElement): boolean {
  if (el.tabIndex < 0) return false
  if ((el as HTMLButtonElement).disabled) return false
  if (el.closest('[inert], [hidden], fieldset:disabled')) return false
  if (el.getClientRects().length === 0) return false
  const cs = getComputedStyle(el)
  return cs.visibility !== 'hidden' && cs.display !== 'none'
}

function tabbables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TABBABLE)).filter(isTabbable)
}

function tryFocus(el: HTMLElement | null | undefined): boolean {
  if (!el || !el.isConnected) return false
  try {
    el.focus({ preventScroll: true })
  } catch {
    return false
  }
  return document.activeElement === el
}

function focusContainer(el: HTMLElement): boolean {
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
  if (el.style.outline === '') el.style.outline = 'none'
  return tryFocus(el)
}

function pickInitial(el: HTMLElement, opt: ModalOptions['initialFocus']): HTMLElement {
  if (opt) {
    const t = typeof opt === 'string' ? el.querySelector<HTMLElement>(opt) : opt(el)
    if (t && isTabbable(t)) return t
  }
  const auto = el.querySelector<HTMLElement>('[data-autofocus]')
  if (auto && isTabbable(auto)) return auto
  const items = tabbables(el)
  // Prefer the content over the header's close button.
  return items.find((i) => !i.closest('.pm-header, .hp-head, .rail-head')) ?? items[0] ?? el
}

/** Openers to try, in order: this dialog's own, then those of the dialogs that spawned it. */
function openerChain(entry: Entry | null): HTMLElement[] {
  const out: HTMLElement[] = []
  for (let e = entry, n = 0; e && n < 8; e = e.parent, n++) {
    if (e.opener) out.push(e.opener)
    if (e.openerAlt) out.push(e.openerAlt)
  }
  return out
}

function restoreFocus(closed: Entry) {
  // Something was opened on top of (or after) this dialog: it owns focus now.
  if (stack.some((e) => e.seq > closed.seq)) return
  for (const o of openerChain(closed)) if (tryFocus(o)) return
  const under = stack[stack.length - 1]
  if (!under) return
  if (tryFocus(under.lastFocus && under.el.contains(under.lastFocus) ? under.lastFocus : null)) return
  if (!tryFocus(pickInitial(under.el, undefined))) focusContainer(under.el)
}

// ---------------------------------------------------------------------------------------------
// Global key / focus handling (installed while the stack is non-empty)
// ---------------------------------------------------------------------------------------------
let tabPending = false

function onKeyDown(e: KeyboardEvent) {
  const top = stack[stack.length - 1]
  if (!top || e.defaultPrevented) return
  if (e.key === 'Escape') {
    if (e.isComposing || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
    e.preventDefault()
    top.close()
    return
  }
  if (e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return
  tabPending = true
  setTimeout(() => (tabPending = false), 0)
  const items = tabbables(top.el)
  const active = document.activeElement as HTMLElement | null
  if (items.length === 0) {
    e.preventDefault()
    focusContainer(top.el)
    return
  }
  const first = items[0]
  const last = items[items.length - 1]
  if (!active || !top.el.contains(active)) {
    e.preventDefault()
    tryFocus(e.shiftKey ? last : first)
    return
  }
  const idx = items.indexOf(active)
  if (idx === -1) {
    // Focus is on a non-tabbable element inside (the container, a tabindex=-1 node): step to the neighbour.
    const next = e.shiftKey
      ? [...items].reverse().find((i) => active.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_PRECEDING)
      : items.find((i) => active.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_FOLLOWING)
    e.preventDefault()
    tryFocus(next ?? (e.shiftKey ? last : first))
  } else if (e.shiftKey && active === first) {
    e.preventDefault()
    tryFocus(last)
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    tryFocus(first)
  }
}

function onFocusIn(e: FocusEvent) {
  const top = stack[stack.length - 1]
  const t = e.target as HTMLElement | null
  if (!top || !t || t === document.body) return
  if (top.el.contains(t)) {
    top.lastFocus = t
    return
  }
  // Keyboard focus escaped the top dialog (e.g. a tabbable the trap did not know about): pull it back.
  if (tabPending) {
    const items = tabbables(top.el)
    if (!tryFocus(top.lastFocus && top.el.contains(top.lastFocus) ? top.lastFocus : items[0] ?? null)) focusContainer(top.el)
  }
}

let listening = false
function syncListeners() {
  if (stack.length > 0 && !listening) {
    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn)
    listening = true
  } else if (stack.length === 0 && listening) {
    window.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('focusin', onFocusIn)
    listening = false
  }
}

// ---------------------------------------------------------------------------------------------
// Scroll lock (ref-counted by the entries that ask for it)
// ---------------------------------------------------------------------------------------------
interface Locked {
  el: HTMLElement
  overflowY: [string, string]
  paddingRight: [string, string]
}
let locked: Locked[] = []

function lockScroll(dialogs: HTMLElement[]) {
  const cands: HTMLElement[] = [document.documentElement, document.body]
  document.body.querySelectorAll<HTMLElement>('*').forEach((el) => cands.push(el))
  for (const el of cands) {
    if (dialogs.some((d) => d.contains(el) || d.parentElement === el)) continue
    const cs = getComputedStyle(el)
    const root = el === document.documentElement
    const scrollable = cs.overflowY === 'auto' || cs.overflowY === 'scroll' || cs.overflowY === 'overlay'
    // Lock every scroll container (even one that does not overflow yet: content may load while the dialog is open).
    if (!scrollable && !(root && cs.overflowY === 'visible' && el.scrollHeight > el.clientHeight + 1)) continue
    const rec: Locked = {
      el,
      overflowY: [el.style.getPropertyValue('overflow-y'), el.style.getPropertyPriority('overflow-y')],
      paddingRight: [el.style.getPropertyValue('padding-right'), el.style.getPropertyPriority('padding-right')],
    }
    const bar = () => (root ? window.innerWidth - document.documentElement.clientWidth : el.clientWidth)
    const before = bar()
    const pad = parseFloat(cs.paddingRight) || 0
    el.style.setProperty('overflow-y', 'hidden', 'important')
    // Only when the scrollbar was taking layout space (and no stable gutter keeps it) do we compensate.
    const gained = root ? before - bar() : bar() - before
    if (gained > 0) el.style.setProperty('padding-right', `${pad + gained}px`, 'important')
    locked.push(rec)
  }
}

function unlockScroll() {
  for (const r of locked) {
    const set = (prop: string, [v, p]: [string, string]) =>
      v ? r.el.style.setProperty(prop, v, p) : r.el.style.removeProperty(prop)
    set('overflow-y', r.overflowY)
    set('padding-right', r.paddingRight)
  }
  locked = []
}

// ---------------------------------------------------------------------------------------------
// The hook
// ---------------------------------------------------------------------------------------------
export function useModalDialog<T extends HTMLElement>(onClose: () => void, options: ModalOptions = {}) {
  const ref = useRef<T>(null)
  const titleId = useId()
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const optRef = useRef(options)
  optRef.current = options
  const enabled = options.enabled ?? true

  // Render phase = before the commit moves focus (autoFocus, our own effect): the only reliable place
  // to see the opener. Keeps updating while the dialog is not yet registered (enabled flips on later).
  const registered = useRef(false)
  const captured = useRef<{ opener: HTMLElement | null; openerAlt: HTMLElement | null; parent: Entry | null }>({ opener: null, openerAlt: null, parent: null })
  if (!registered.current) {
    const a = document.activeElement as HTMLElement | null
    const opener = a && a !== document.body && a !== document.documentElement ? a : null
    let parent: Entry | null = null
    if (opener) for (let i = stack.length - 1; i >= 0; i--) if (stack[i].el.contains(opener)) { parent = stack[i]; break }
    const menuId = opener?.closest('[role="menu"][id]')?.id
    const openerAlt = menuId ? document.querySelector<HTMLElement>(`[aria-controls="${CSS.escape(menuId)}"]`) : null
    captured.current = { opener, openerAlt, parent }
  }
  const alive = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!enabled || !el) return
    const entry: Entry = {
      seq: ++seqCounter,
      el,
      close: () => closeRef.current(),
      opener: captured.current.opener,
      openerAlt: captured.current.openerAlt,
      parent: captured.current.parent,
      lastFocus: null,
      lockScroll: optRef.current.lockScroll ?? true,
    }
    registered.current = true
    alive.current = true
    stack.push(entry)
    if (entry.lockScroll && stack.filter((s) => s.lockScroll).length === 1) lockScroll(stack.map((s) => s.el))
    syncListeners()

    // Initial focus. The drawer may still be transitioning from visibility:hidden, so retry briefly.
    let cancelled = false
    const timers: number[] = []
    const focusIn = () => {
      if (cancelled) return true
      if (el.contains(document.activeElement)) return true
      return tryFocus(pickInitial(el, optRef.current.initialFocus)) || (tabbables(el).length === 0 && focusContainer(el))
    }
    if (!focusIn()) for (const ms of [30, 120, 300]) timers.push(window.setTimeout(focusIn, ms))

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
      alive.current = false
      registered.current = false
      const i = stack.indexOf(entry)
      if (i >= 0) stack.splice(i, 1)
      if (entry.lockScroll && !stack.some((s) => s.lockScroll)) unlockScroll()
      syncListeners()
      // Deferred: lets StrictMode's simulated remount and same-tick replacement dialogs register first.
      queueMicrotask(() => {
        if (alive.current) return
        restoreFocus(entry)
      })
    }
  }, [enabled])

  const dialogProps = { role: 'dialog' as const, 'aria-modal': true as const, 'aria-labelledby': titleId }
  return { ref, titleId, dialogProps }
}

/** Backward-compatible form: just the ref (no role/aria wiring). */
export function useModalA11y<T extends HTMLElement>(onClose: () => void) {
  return useModalDialog<T>(onClose).ref
}
