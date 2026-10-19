import { useEffect, useState } from 'react'

/**
 * Measures a container with ResizeObserver and returns how many fixed-size
 * cells (columns x rows) fit inside it. Used to paginate instead of scrolling.
 * Returns a callback ref so it also works for conditionally mounted elements.
 */
export function useFitCount<T extends HTMLElement>(cellW: number, cellH: number, gap: number) {
  const [el, setEl] = useState<T | null>(null)
  const [fit, setFit] = useState({ cols: 1, rows: 1 })

  useEffect(() => {
    if (!el) return
    const measure = () => {
      const cols = Math.max(1, Math.floor((el.clientWidth + gap) / (cellW + gap)))
      const rows = Math.max(1, Math.floor((el.clientHeight + gap) / (cellH + gap)))
      setFit((prev) => (prev.cols === cols && prev.rows === rows ? prev : { cols, rows }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [el, cellW, cellH, gap])

  return [setEl, fit] as const
}
