import HanziWriter from 'hanzi-writer'

/**
 * HanziWriter.create() registers document-level mouseup/touchend listeners in its constructor and
 * never removes them (hanzi-writer 3.x has no destroy()), so every writer — one per character
 * viewed in animate/quiz mode — stayed reachable forever. Capture those listeners while the
 * writer is constructed so the effect cleanup can remove them.
 */
export function createWriter(...args: Parameters<typeof HanziWriter.create>) {
  const captured: [string, EventListenerOrEventListenerObject][] = []
  const original = document.addEventListener
  document.addEventListener = function (this: Document, type: string, listener: EventListenerOrEventListenerObject | null, opts?: boolean | AddEventListenerOptions) {
    if (listener) captured.push([type, listener])
    return original.call(this, type, listener as EventListenerOrEventListenerObject, opts)
  } as typeof document.addEventListener
  let writer: HanziWriter
  try {
    writer = HanziWriter.create(...args)
  } finally {
    document.addEventListener = original
  }
  const release = () => {
    for (const [type, listener] of captured) document.removeEventListener(type, listener)
    try {
      writer.cancelQuiz()
      writer.pauseAnimation()
    } catch {
      // writer may not have loaded its data yet
    }
  }
  return { writer, release }
}
